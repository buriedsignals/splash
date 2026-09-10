import { afterEach, describe, expect, it } from "bun:test";
import { startStudioController } from "../studio/controller.mjs";
import { createStoryBinding } from "../story-binding.mjs";
import { buildPublicStatus } from "../contract.mjs";

const controllers: Array<{ close: (reason?: string) => void; closed: Promise<unknown> }> = [];
afterEach(async () => {
  while (controllers.length) {
    const controller = controllers.pop()!;
    controller.close("closed");
    await controller.closed;
  }
});

function statusFixture(ready = true) {
  return buildPublicStatus({
    preflight: {
      ready,
      checks: [
        { id: "dependencies", status: "pass", detail: "ok" },
        {
          id: "newsroom-profile",
          status: ready ? "pass" : "missing",
          detail: ready ? "ok" : "missing",
        },
      ],
      blockers: ready
        ? []
        : [{ id: "newsroom-profile", status: "missing", detail: "missing" }],
    },
    keyList: { ok: true, broker: { status: "available" }, keys: [] },
    credentials: [],
  });
}

async function start(ready = true) {
  const setupCalls: string[] = [];
  const settingsCalls: string[] = [];
  const storyBinding = createStoryBinding({
    inspect: async (path: string) => ({
      storyId: "story-one",
      canonicalPath: path,
      articlePath: `${path}/source/article.md`,
    }),
    random: () => "studio-challenge-1234567890ab",
  });
  const selectionModel = {
    schemaVersion: "splash-selection/v1",
    gate: { id: "G2b" },
    choices: [{ id: "format.web", enabled: true }],
  };
  const controller = await startStudioController({
    settings: { async request(path, body) { await body; settingsCalls.push(path); return { revision: "fixture", profile: {} }; } },
    folderPicker: async () => ({ status: "selected", path: "/stories/story-one" }),
    htmlProvider: async () =>
      `<!doctype html><html><head><style></style></head><body><script type="module"></script></body></html>`,
    statusProvider: { read: async () => structuredClone(statusFixture(ready)) },
    storyBinding,
    selection: {
      read: async () => selectionModel,
      confirm: async () => ({ ...selectionModel, phase: "production", gate: null }),
      reopenFormat: async () => selectionModel,
      reopenTreatment: async () => selectionModel,
    },
    recommendation: {
      read: async () => ({
        schemaVersion: "splash-storyboard-choice/v1",
        selection: selectionModel,
        recommendation: { revision: "rev-1", ranking: [] },
      }),
      confirm: async () => ({
        schemaVersion: "splash-storyboard-choice/v1",
        selection: selectionModel,
        recommendation: { revision: "rev-1", ranking: [] },
      }),
    },
    setupManager: {
      start: async () => {
        setupCalls.push("start");
        return { status: "ready", setupUrl: "http://127.0.0.1:43210/#setup-capability" };
      },
      openLocally: async () => ({ ok: true, status: "opened" }),
      close() {
        setupCalls.push("close");
      },
    },
  });
  controllers.push(controller);
  const parsed = new URL(controller.url);
  return { controller, origin: parsed.origin, capability: parsed.hash.slice(1), setupCalls, settingsCalls };
}

async function sessionHeaders(origin: string, capability: string) {
  const response = await fetch(`${origin}/session`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ capability }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("splash_studio_");
  return { origin, cookie: cookie.split(";")[0] };
}

describe("Splash localhost studio", () => {
  it("keeps settings inside the authenticated studio session", async () => {
    const { origin, capability, settingsCalls, setupCalls } = await start();
    const request = (headers) => fetch(`${origin}/api/settings/read`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: "{}" });
    expect((await request({ origin })).status).toBe(403);
    expect(settingsCalls).toHaveLength(0);
    const auth = await sessionHeaders(origin, capability);
    expect((await request({ ...auth, origin: "http://example.test" })).status).toBe(403);
    expect((await request(auth)).status).toBe(200);
    expect(settingsCalls).toEqual(["/api/settings/read"]);
    expect(setupCalls).toHaveLength(0);
  });

  it("resumes an authorized page without reusing its capability and isolates cookies between studios", async () => {
    const first = await start();
    const auth = await sessionHeaders(first.origin, first.capability);
    const second = await start();
    const secondAuth = await sessionHeaders(second.origin, second.capability);
    expect(auth.cookie.split("=")[0]).not.toBe(secondAuth.cookie.split("=")[0]);
    const resumed = await fetch(`${first.origin}/session`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ capability: first.capability }) });
    expect(resumed.status).toBe(200);
    const replayed = await fetch(`${first.origin}/session`, { method: "POST", headers: { origin: first.origin, "content-type": "application/json" }, body: JSON.stringify({ capability: first.capability }) });
    expect(replayed.status).toBe(403);
  });

  it("binds only to loopback and serves the studio page", async () => {
    const { controller, origin } = await start();
    expect(new URL(controller.url).hostname).toBe("127.0.0.1");
    const page = await fetch(`${origin}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("<!doctype html>");
  });

  it("refuses cross-origin mutation and expired capabilities", async () => {
    const { origin, capability } = await start();
    const forged = await fetch(`${origin}/session`, {
      method: "POST",
      headers: { origin: "http://example.test", "content-type": "application/json" },
      body: JSON.stringify({ capability }),
    });
    expect(forged.status).toBe(403);
    const expired = await fetch(`${origin}/session`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ capability: "not-the-capability" }),
    });
    expect(expired.status).toBe(403);
  });

  it("opens a folder picker only in an authorized session and never binds its result automatically", async () => {
    const { origin, capability } = await start();
    const denied = await fetch(`${origin}/api/story/browse`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
    expect(denied.status).toBe(403);
    const auth = await sessionHeaders(origin, capability);
    const headers = { origin, cookie: auth.cookie, "content-type": "application/json" };
    const picked = await fetch(`${origin}/api/story/browse`, { method: "POST", headers, body: "{}" });
    expect(await picked.json()).toEqual({ status: "selected", path: "/stories/story-one" });
    const status = await fetch(`${origin}/api/status`, { method: "POST", headers, body: "{}" });
    expect((await status.json()).story.status).toBe("unbound");
  });

  it("confirms a story in the browser session without putting the challenge on the status payload", async () => {
    const { origin, capability } = await start();
    const auth = await sessionHeaders(origin, capability);
    const headers = {
      origin: auth.origin,
      cookie: auth.cookie,
      "content-type": "application/json",
    };
    const nominated = await fetch(`${origin}/api/story/nominate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: "/stories/story-one" }),
    });
    expect(nominated.status).toBe(200);
    const pending = await fetch(`${origin}/api/story/pending`, {
      method: "POST",
      headers,
      body: "{}",
    });
    const pendingBody = await pending.json();
    expect(pendingBody.challenge).toBe("studio-challenge-1234567890ab");
    const confirmed = await fetch(`${origin}/api/story/confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({ challenge: pendingBody.challenge }),
    });
    expect((await confirmed.json()).confirmed).toBe(true);
    const status = await fetch(`${origin}/api/status`, {
      method: "POST",
      headers,
      body: "{}",
    });
    const body = await status.json();
    expect(body.story).toMatchObject({ status: "bound", descriptor: { storyId: "story-one" } });
    expect(JSON.stringify(body)).not.toContain("studio-challenge-1234567890ab");
  });

  it("returns setup URL only after studio authentication", async () => {
    const { origin, capability } = await start();
    const auth = await sessionHeaders(origin, capability);
    const started = await fetch(`${origin}/api/setup/start`, {
      method: "POST",
      headers: {
        origin: auth.origin,
        cookie: auth.cookie,
        "content-type": "application/json",
      },
      body: "{}",
    });
    const body = await started.json();
    expect(body.setupUrl).toBe("http://127.0.0.1:43210/#setup-capability");
  });
});
