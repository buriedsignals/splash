import { afterEach, describe, expect, it } from "bun:test";
import { createBrowserInterfaceManager, renderBrowserInterfaceHtml, startBrowserInterface } from "../browser-interface.mjs";

const close: Array<() => void> = [];
afterEach(() => { while (close.length) close.pop()!(); });

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function services({ confirmImpl, gate = { id: "G2-treatment", awaiting: "treatment" } }: { confirmImpl?: (value: any) => Promise<any>; gate?: { id: string; awaiting: string } } = {}) {
  let confirmed = false;
  const confirms: any[] = [];
  let pendingCalls = 0;
  const descriptor = { storyId: "story-one", canonicalPath: "/stories/story-one" };
  const selectionModel = {
    schemaVersion: "splash-selection/v1",
    story: descriptor,
    phase: "storyboard",
    gate,
    revisions: { story: "sha256:story", catalogue: "sha256:catalogue", capabilities: "sha256:capabilities" },
    choices: [
      { id: "chart.slope", label: "Slope", description: "Two moments.", enabled: true },
      { id: "chart.bump", label: "Bump", description: "Rank over time.", enabled: true },
      { id: "chart.bar", label: "Bar", description: "Category comparison.", enabled: true },
    ],
  };
  const recommendationModel = {
    schemaVersion: "splash-storyboard-choice/v1",
    selection: selectionModel,
    recommendation: {
      schemaVersion: "splash-recommendation/v1",
      revision: "sha256:recommendation",
      recommendedOptionId: "chart.slope",
      ranking: [
        { optionId: "chart.slope", rank: 1, matchedEvidence: [{ fact: "two moments", source: "STORYBOARD.md" }] },
        { optionId: "chart.bump", rank: 2, matchedEvidence: [] },
      ],
    },
  };
  return {
    confirms,
    get pendingCalls() { return pendingCalls; },
    storyBinding: {
      pending() { pendingCalls += 1; return confirmed ? null : { descriptor, challenge: "browser-only-challenge-123456" }; },
      confirm(challenge: string) { if (challenge !== "browser-only-challenge-123456") throw new Error("wrong"); confirmed = true; return descriptor; },
      context() { return confirmed ? { story: descriptor, token: "bound" } : null; },
    },
    selection: {
      async read() { return structuredClone(selectionModel); },
      async confirm(value: any) { confirms.push(value); return confirmImpl ? confirmImpl(value) : { ...selectionModel, phase: "production", gate: null }; },
    },
    recommendation: {
      async read() { return structuredClone(recommendationModel); },
      async confirm(value: any) { confirms.push(value); return confirmImpl ? confirmImpl(value) : { ...recommendationModel, selection: { ...selectionModel, phase: "production", gate: null } }; },
    },
  };
}

async function session(mode: "storyboard" | "a-la-carte", fixture = services()) {
  const controller = await startBrowserInterface({ mode, ...fixture, idleMs: 5_000, overallMs: 10_000 });
  close.push(() => controller.close("test"));
  const url = new URL(controller.url);
  const capability = url.hash.slice(1);
  url.hash = "";
  const page = await fetch(url);
  const cookieOrigin = controller.origin;
  const opened = await fetch(new URL("/session", cookieOrigin), {
    method: "POST",
    headers: { "content-type": "application/json", origin: cookieOrigin },
    body: JSON.stringify({ capability }),
  });
  const cookie = opened.headers.get("set-cookie")!.split(";", 1)[0];
  const post = (path: string, body: any = {}) => fetch(new URL(path, cookieOrigin), {
    method: "POST",
    headers: { "content-type": "application/json", origin: cookieOrigin, cookie },
    body: JSON.stringify(body),
  });
  return { fixture, controller, page, opened, post, capability };
}

describe("Splash MCP app localhost interface", () => {
  it("ships a visual responsive browser UI with no embedded MCP App client", async () => {
    const html = await renderBrowserInterfaceHtml();
    expect(html).toContain("choice-grid");
    expect(html).toContain("Search treatments");
    expect(html).toContain("Recommended");
    expect(html).toContain("@media (max-width: 720px)");
    expect(html).not.toContain("@modelcontextprotocol/ext-apps");
    expect(html).not.toContain("sendMessage");
    expect(html).not.toContain("__SPLASH_BROWSER_APP__");
    expect(html).toContain("Goose is continuing from disk");
    expect(html).toContain("window.close()");
  });

  it("uses a one-time fragment capability, strict origin, and HttpOnly session cookie", async () => {
    const { fixture, controller, page, opened, post, capability } = await session("storyboard");
    expect(page.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(opened.status).toBe(200);
    expect(opened.headers.get("set-cookie")).toContain("HttpOnly");
    const hostile = await fetch(new URL("/api/pending", opened.url), {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.com" },
      body: "{}",
    });
    expect(hostile.status).toBe(403);
    expect((await post("/api/pending")).status).toBe(200);
    const pendingCalls = fixture.pendingCalls;
    const replay = await fetch(new URL("/session", controller.origin), {
      method: "POST",
      headers: { "content-type": "application/json", origin: controller.origin },
      body: JSON.stringify({ capability }),
    });
    expect(replay.status).toBe(403);
    const wrongHost = await fetch(new URL("/api/pending", controller.origin), {
      method: "POST",
      headers: { "content-type": "application/json", origin: controller.origin, cookie: opened.headers.get("set-cookie")!.split(";", 1)[0], host: "127.0.0.1:1" },
      body: "{}",
    });
    expect(wrongHost.status).toBe(421);
    expect(fixture.pendingCalls).toBe(pendingCalls);
  });

  it("returns exactly two Storyboard treatments and confirms through the recommendation service", async () => {
    const { fixture, controller, post } = await session("storyboard");
    const pending = await (await post("/api/pending")).json();
    await post("/api/story/confirm", { challenge: pending.challenge });
    const model = await (await post("/api/model")).json();
    expect(model.recommendation.ranking.map((row: any) => row.optionId)).toEqual(["chart.slope", "chart.bump"]);
    const response = await post("/api/confirm", {
      optionId: "chart.slope",
      expected: { storyRevision: "sha256:story", catalogRevision: "sha256:catalogue", capabilityGeneration: "sha256:capabilities" },
      recommendationRevision: "sha256:recommendation",
    });
    expect(response.status).toBe(200);
    expect(fixture.confirms[0]).toMatchObject({ optionId: "chart.slope", recommendationRevision: "sha256:recommendation" });
    await expect(controller.closed).resolves.toMatchObject({ reason: "confirmed", result: { optionId: "chart.slope", phase: "production" } });
  });

  it("returns the full reachable À-la-carte catalogue and confirms through the shared selection service", async () => {
    const { fixture, post } = await session("a-la-carte");
    const pending = await (await post("/api/pending")).json();
    await post("/api/story/confirm", { challenge: pending.challenge });
    const model = await (await post("/api/model")).json();
    expect(model.choices).toHaveLength(3);
    const response = await post("/api/confirm", {
      optionId: "chart.bar",
      expected: { storyRevision: "sha256:story", catalogRevision: "sha256:catalogue", capabilityGeneration: "sha256:capabilities" },
    });
    expect(response.status).toBe(200);
    expect(fixture.confirms[0]).toMatchObject({ optionId: "chart.bar" });
  });

  it("refuses to render or confirm treatments outside G2-treatment", async () => {
    const fixture = services({ gate: { id: "G2-producer", awaiting: "producer" } });
    const { post } = await session("a-la-carte", fixture);
    const pending = await (await post("/api/pending")).json();
    await post("/api/story/confirm", { challenge: pending.challenge });
    expect((await post("/api/model")).status).toBe(409);
    const response = await post("/api/confirm", {
      optionId: "chart.bar",
      expected: { storyRevision: "sha256:story", catalogRevision: "sha256:catalogue", capabilityGeneration: "sha256:capabilities" },
    });
    expect(response.status).toBe(409);
    expect(fixture.confirms).toHaveLength(0);
  });

  it("lets a successful in-flight confirmation win over close and rejects duplicate confirmation", async () => {
    const commit = deferred<any>();
    const entered = deferred();
    const fixture = services({ confirmImpl: async () => { entered.resolve(); return commit.promise; } });
    const { controller, post } = await session("a-la-carte", fixture);
    const pending = await (await post("/api/pending")).json();
    await post("/api/story/confirm", { challenge: pending.challenge });
    const model = await (await post("/api/model")).json();
    const body = { optionId: "chart.bar", expected: { storyRevision: model.revisions.story, catalogRevision: model.revisions.catalogue, capabilityGeneration: model.revisions.capabilities } };
    const confirming = post("/api/confirm", body);
    await entered.promise;
    expect((await post("/api/close")).status).toBe(200);
    expect((await post("/api/confirm", body)).status).toBe(409);
    commit.resolve({ ...model, phase: "production", gate: null });
    expect((await confirming).status).toBe(200);
    await expect(controller.closed).resolves.toMatchObject({ reason: "confirmed", result: { optionId: "chart.bar" } });
    expect(fixture.confirms).toHaveLength(1);
  });

  it("applies a deferred close if the in-flight confirmation fails", async () => {
    const release = deferred();
    const entered = deferred();
    const fixture = services({ confirmImpl: async () => { entered.resolve(); await release.promise; throw new Error("write refused"); } });
    const { controller, post } = await session("a-la-carte", fixture);
    const pending = await (await post("/api/pending")).json();
    await post("/api/story/confirm", { challenge: pending.challenge });
    const model = await (await post("/api/model")).json();
    const confirming = post("/api/confirm", { optionId: "chart.bar", expected: { storyRevision: model.revisions.story, catalogRevision: model.revisions.catalogue, capabilityGeneration: model.revisions.capabilities } });
    await entered.promise;
    await post("/api/close");
    release.resolve();
    expect((await confirming).status).toBe(400);
    await expect(controller.closed).resolves.toMatchObject({ reason: "closed", result: null });
  });
});

describe("Splash browser interface manager", () => {
  const descriptor = (path: string) => ({ storyId: path.split("/").at(-1), canonicalPath: path });
  const opener = { exited: Promise.resolve(0) };

  it("reserves nomination synchronously and returns the exact descriptor with confirmed completion", async () => {
    const startEntered = deferred();
    const startGate = deferred();
    const completed = deferred<any>();
    const nominated: string[] = [];
    const manager = createBrowserInterfaceManager({
      storyBinding: { async nominate(path: string) { nominated.push(path); return descriptor(path); } },
      selection: {}, recommendation: {}, platform: "darwin", which: () => process.execPath,
      spawn: () => opener,
      start: async () => { startEntered.resolve(); await startGate.promise; return { url: "http://127.0.0.1:1/#capability", closed: completed.promise, close() {} }; },
    });
    const first = manager.open({ mode: "storyboard", path: "/stories/one" });
    await startEntered.promise;
    await expect(manager.open({ mode: "storyboard", path: "/stories/two" })).rejects.toMatchObject({ code: "INTERACTION_ACTIVE" });
    startGate.resolve();
    completed.resolve({ reason: "confirmed", result: { optionId: "chart.slope", phase: "production" } });
    await expect(first).resolves.toMatchObject({ status: "confirmed", descriptor: descriptor("/stories/one"), optionId: "chart.slope" });
    expect(nominated).toEqual(["/stories/one"]);
  });

  it("reports close and expiry as explicit non-confirmed outcomes", async () => {
    for (const reason of ["closed", "expired"]) {
      const manager = createBrowserInterfaceManager({
        storyBinding: { async nominate(path: string) { return descriptor(path); } },
        selection: {}, recommendation: {}, platform: "darwin", which: () => process.execPath,
        spawn: () => opener,
        start: async () => ({ url: "http://127.0.0.1:1/#capability", closed: Promise.resolve({ reason, result: null }), close() {} }),
      });
      await expect(manager.open({ mode: "storyboard", path: "/stories/one" })).rejects.toThrow(`without confirmation (${reason})`);
    }
  });

  it("cleans up an opener failure so a later interaction can start", async () => {
    let exitCode = 1;
    const manager = createBrowserInterfaceManager({
      storyBinding: { async nominate(path: string) { return descriptor(path); } },
      selection: {}, recommendation: {}, platform: "darwin", which: () => process.execPath,
      spawn: () => ({ exited: Promise.resolve(exitCode) }),
      start: async () => ({ url: "http://127.0.0.1:1/#capability", closed: Promise.resolve({ reason: "confirmed", result: { optionId: "chart.slope" } }), close() {} }),
    });
    await expect(manager.open({ mode: "storyboard", path: "/stories/one" })).rejects.toThrow("opener failed");
    exitCode = 0;
    await expect(manager.open({ mode: "storyboard", path: "/stories/two" })).resolves.toMatchObject({ descriptor: descriptor("/stories/two") });
  });
});
