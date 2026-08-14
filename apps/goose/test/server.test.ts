import { afterEach, describe, expect, it } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { buildPublicStatus, RESOURCE_URI } from "../contract.mjs";
import { createServer, renderAppHtml } from "../server.mjs";
import { createStoryBinding } from "../story-binding.mjs";

const close: Array<() => Promise<void>> = [];
const roots: string[] = [];
afterEach(async () => {
  while (close.length) await close.pop()!();
  while (roots.length) await rm(roots.pop()!, { recursive: true, force: true });
});

function statusFixture({ ready = false } = {}) {
  return buildPublicStatus({
    preflight: {
      ready,
      checks: [
        { id: "dependencies", status: "pass", detail: "installed" },
        {
          id: "newsroom-profile",
          status: "missing",
          detail: "NEWSROOM.md is absent",
        },
      ],
      blockers: ready
        ? []
        : [
            {
              id: "newsroom-profile",
              status: "missing",
              detail: "NEWSROOM.md is absent",
            },
          ],
    },
    keyList: {
      ok: true,
      broker: { status: "available" },
      credentialIndependentPathsAvailable: true,
      keys: [
        {
          id: "MAPTILER_KEY",
          metadata: {
            name: "MapTiler",
            purpose: "Maps",
            acquisitionUrl: "https://cloud.maptiler.com/account/keys/",
          },
        },
        {
          id: "MAPTILER_DELIVERY_KEY",
          metadata: { name: "Map delivery", purpose: "Delivered maps" },
        },
        {
          id: "DATAWRAPPER_TOKEN",
          metadata: { name: "Datawrapper", purpose: "Charts" },
        },
        {
          id: "CLOUDFLARE_API_TOKEN",
          metadata: { name: "Cloudflare", purpose: "Hosted embeds" },
        },
      ],
    },
    credentials: [
      {
        ok: true,
        id: "MAPTILER_KEY",
        stored: true,
        generation: 2,
        validation: { status: "verified" },
        metadata: {
          name: "MapTiler",
          purpose: "Maps",
          acquisitionUrl: "https://cloud.maptiler.com/account/keys/",
        },
      },
    ],
  });
}

async function fixture({ selectionReady = false } = {}) {
  const calls: string[] = [];
  const selectionCalls: Array<{ name: string; value: any }> = [];
  const recommendationCalls: Array<{ name: string; value: any }> = [];
  const setupManager = {
    async start() {
      return {
        status: "ready",
        setupUrl: "http://127.0.0.1:43210/#app-only-capability",
      };
    },
    async openLocally() {
      return { ok: true, status: "opened" };
    },
    close() {},
  };
  const storyBinding = createStoryBinding({
    random: () => "app-only-story-challenge-123456",
    async inspect(path: string) {
      if (!path.endsWith("/story-one")) throw new Error("refused");
      return {
        storyId: "story-one",
        canonicalPath: "/stories/story-one",
        articlePath: "/stories/story-one/source/article.md",
        hasStoryboard: false,
      };
    },
  });
  const selectionModel = {
    schemaVersion: "splash-selection/v1",
    story: { storyId: "story-one", canonicalPath: "/stories/story-one" },
    phase: "storyboard",
    gate: { id: "G2b", awaiting: "format" },
    slot: { id: "1", proves: "A test claim", medium: "chart" },
    revisions: {
      story: "sha256:story",
      catalogue: "sha256:catalogue",
      capabilities: "sha256:capabilities",
    },
    choices: [
      {
        id: "format.web",
        kind: "format",
        value: "web",
        label: "Interactive web",
        description: "Explore values.",
        enabled: true,
        reason: null,
        repairAction: null,
      },
    ],
  };
  const selection = {
    async read(value: any) {
      selectionCalls.push({ name: "read", value });
      return structuredClone(selectionModel);
    },
    async confirm(value: any) {
      selectionCalls.push({ name: "confirm", value });
      return {
        ...structuredClone(selectionModel),
        gate: null,
        phase: "production",
        choices: [],
      };
    },
    async reopenFormat(value: any) {
      selectionCalls.push({ name: "reopenFormat", value });
      return structuredClone(selectionModel);
    },
    async reopenTreatment(value: any) {
      selectionCalls.push({ name: "reopenTreatment", value });
      return structuredClone(selectionModel);
    },
  };
  const recommendation = {
    async read(value: any) {
      recommendationCalls.push({ name: "read", value });
      return {
        schemaVersion: "splash-storyboard-choice/v1",
        selection: structuredClone(selectionModel),
        recommendation: {
          schemaVersion: "splash-recommendation/v1",
          revision: "sha256:recommendation",
          selectionRevisions: {
            storyRevision: "sha256:story",
            catalogRevision: "sha256:catalogue",
            capabilityGeneration: "sha256:capabilities",
          },
          profileRevision: "sha256:profile",
          recommendedOptionId: "format.web",
          tied: false,
          ranking: [{ optionId: "format.web", rank: 1, score: 2 }],
        },
      };
    },
    async confirm(value: any) {
      recommendationCalls.push({ name: "confirm", value });
      return {
        schemaVersion: "splash-storyboard-choice/v1",
        selection: {
          ...structuredClone(selectionModel),
          gate: null,
          phase: "production",
          choices: [],
        },
        recommendation: {
          schemaVersion: "splash-recommendation/v1",
          revision: "sha256:next-recommendation",
          selectionRevisions: {
            storyRevision: "sha256:story",
            catalogRevision: "sha256:catalogue",
            capabilityGeneration: "sha256:capabilities",
          },
          profileRevision: "sha256:profile",
          recommendedOptionId: null,
          tied: false,
          ranking: [],
        },
      };
    },
  };
  const server = createServer({
    statusProvider: {
      async read() {
        return structuredClone(statusFixture({ ready: selectionReady }));
      },
    },
    setupManager,
    storyBinding,
    selection,
    recommendation,
    onToolCall: (name: string) => calls.push(name),
  });
  const client = new Client({ name: "splash-app-test", version: "0.1.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  close.push(
    async () => client.close(),
    async () => server.close(),
  );
  return { client, calls, selectionCalls, recommendationCalls };
}

describe("production Splash MCP App shell", () => {
  it("publishes one bundled app resource with an empty network allowlist", async () => {
    const { client } = await fixture();
    const listed = await client.listResources();
    expect(listed.resources).toContainEqual(
      expect.objectContaining({
        uri: RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
      }),
    );
    const read = await client.readResource({ uri: RESOURCE_URI });
    expect(read.contents[0]._meta?.ui?.csp).toEqual({
      connectDomains: [],
      resourceDomains: [],
      frameDomains: [],
      baseUriDomains: [],
    });
    expect(read.contents[0].text).toContain("Choose visual");
    expect(read.contents[0].text).not.toContain("__SPLASH_APP__");
  });

  it("keeps setup and confirmation app-only while opening and nomination remain model-visible", async () => {
    const { client } = await fixture();
    const { tools } = await client.listTools();
    const visibility = (name: string) =>
      tools.find((tool) => tool.name === name)?._meta?.ui?.visibility;
    expect(visibility("open_splash")).toEqual(["model", "app"]);
    expect(visibility("nominate_splash_story")).toEqual(["model", "app"]);
    expect(visibility("start_splash_setup")).toEqual(["app"]);
    expect(visibility("pending_splash_story")).toEqual(["app"]);
    expect(visibility("confirm_splash_story")).toEqual(["app"]);
    expect(visibility("read_splash_selection")).toEqual(["app"]);
    expect(visibility("confirm_splash_selection")).toEqual(["app"]);
    expect(visibility("reopen_splash_format")).toEqual(["app"]);
    expect(visibility("reopen_splash_treatment")).toEqual(["app"]);
    expect(visibility("read_splash_storyboard_recommendation")).toEqual([
      "app",
    ]);
    expect(visibility("confirm_splash_storyboard_selection")).toEqual(["app"]);
    expect(
      tools.find((tool) => tool.name === "confirm_splash_selection")
        ?.inputSchema.additionalProperties,
    ).toBe(false);
  });

  it("returns readiness without claiming a render or leaking the setup capability", async () => {
    const { client } = await fixture();
    const opened = await client.callTool({
      name: "open_splash",
      arguments: {},
    });
    const wire = JSON.stringify(opened);
    expect(opened.structuredContent).toMatchObject({
      schemaVersion: "splash-app/v1",
      runtime: { status: "repair-required" },
    });
    expect(wire).not.toContain("app-only-capability");
    expect(wire).toContain("view was requested");
    expect(wire).not.toContain("view opened");

    const setup = await client.callTool({
      name: "start_splash_setup",
      arguments: {},
    });
    expect(setup.structuredContent).toEqual({
      status: "ready",
      setupUrl: "http://127.0.0.1:43210/#app-only-capability",
    });
    expect(setup.content).not.toContainEqual(
      expect.objectContaining({
        text: expect.stringContaining("app-only-capability"),
      }),
    );
  });

  it("keeps the story challenge out of model-visible nomination and binds only after app confirmation", async () => {
    const { client } = await fixture();
    const nominated = await client.callTool({
      name: "nominate_splash_story",
      arguments: { path: "/stories/story-one" },
    });
    expect(nominated.structuredContent).toMatchObject({
      nominated: true,
      descriptor: { storyId: "story-one" },
    });
    expect(JSON.stringify(nominated)).not.toContain("app-only-story-challenge");

    const pending = await client.callTool({
      name: "pending_splash_story",
      arguments: {},
    });
    expect(pending.structuredContent).toMatchObject({
      challenge: "app-only-story-challenge-123456",
      descriptor: { canonicalPath: "/stories/story-one" },
    });
    const wrong = await client.callTool({
      name: "confirm_splash_story",
      arguments: { challenge: "wrong-challenge-123456" },
    });
    expect(wrong.isError).toBe(true);
    const confirmed = await client.callTool({
      name: "confirm_splash_story",
      arguments: { challenge: "app-only-story-challenge-123456" },
    });
    expect(confirmed.structuredContent).toMatchObject({
      confirmed: true,
      descriptor: { storyId: "story-one" },
    });
    const refreshed = await client.callTool({
      name: "refresh_splash_status",
      arguments: {},
    });
    expect(refreshed.structuredContent).toMatchObject({
      story: { status: "bound", descriptor: { storyId: "story-one" } },
    });
  });

  it("keeps selection app-only, bound to the confirmed story, and revision checked", async () => {
    const { client, selectionCalls } = await fixture({ selectionReady: true });
    const unbound = await client.callTool({
      name: "read_splash_selection",
      arguments: {},
    });
    expect(unbound).toMatchObject({
      isError: true,
      structuredContent: { status: "story-unbound" },
    });

    await client.callTool({
      name: "nominate_splash_story",
      arguments: { path: "/stories/story-one" },
    });
    await client.callTool({
      name: "confirm_splash_story",
      arguments: { challenge: "app-only-story-challenge-123456" },
    });
    const current = await client.callTool({
      name: "read_splash_selection",
      arguments: {},
    });
    expect(current.structuredContent).toMatchObject({
      schemaVersion: "splash-selection/v1",
      gate: { id: "G2b" },
    });
    const expected = {
      storyRevision: "sha256:story",
      catalogRevision: "sha256:catalogue",
      capabilityGeneration: "sha256:capabilities",
    };
    const confirmed = await client.callTool({
      name: "confirm_splash_selection",
      arguments: { optionId: "format.web", expected },
    });
    expect(confirmed.structuredContent).toMatchObject({
      phase: "production",
      gate: null,
    });
    expect(selectionCalls.map((row) => row.name)).toEqual(["read", "confirm"]);
    expect(selectionCalls[1].value).toMatchObject({
      optionId: "format.web",
      expected,
    });
    expect(JSON.stringify([current, confirmed])).not.toContain(
      "app-only-story-challenge",
    );
  });

  it("keeps Storyboard advice separate from its app-only confirmation", async () => {
    const { client, recommendationCalls } = await fixture({
      selectionReady: true,
    });
    await client.callTool({
      name: "nominate_splash_story",
      arguments: { path: "/stories/story-one" },
    });
    await client.callTool({
      name: "confirm_splash_story",
      arguments: { challenge: "app-only-story-challenge-123456" },
    });
    const advised = await client.callTool({
      name: "read_splash_storyboard_recommendation",
      arguments: {},
    });
    expect(advised.structuredContent).toMatchObject({
      schemaVersion: "splash-storyboard-choice/v1",
      recommendation: {
        recommendedOptionId: "format.web",
        revision: "sha256:recommendation",
      },
    });
    expect(recommendationCalls.map((row) => row.name)).toEqual(["read"]);

    const expected = {
      storyRevision: "sha256:story",
      catalogRevision: "sha256:catalogue",
      capabilityGeneration: "sha256:capabilities",
    };
    const confirmed = await client.callTool({
      name: "confirm_splash_storyboard_selection",
      arguments: {
        optionId: "format.web",
        expected,
        recommendationRevision: "sha256:recommendation",
      },
    });
    expect(confirmed.structuredContent).toMatchObject({
      schemaVersion: "splash-storyboard-choice/v1",
      selection: { phase: "production", gate: null },
    });
    expect(recommendationCalls.map((row) => row.name)).toEqual([
      "read",
      "confirm",
    ]);
  });

  it("rejects unknown and credential-like fields before handlers run", async () => {
    const { client, calls } = await fixture();
    const candidate = "candidate-secret-12345";
    const open = await client.callTool({
      name: "open_splash",
      arguments: { apiKey: candidate },
    });
    const nominate = await client.callTool({
      name: "nominate_splash_story",
      arguments: {
        path: "/stories/story-one",
        token: candidate,
      },
    });
    const hostileName = await client.callTool({
      name: "read_splash_selection",
      arguments: { [candidate]: "x" },
    });
    expect(open.isError).toBe(true);
    expect(nominate.isError).toBe(true);
    expect(hostileName.isError).toBe(true);
    expect(calls).toEqual([]);
    expect(JSON.stringify([open, nominate, hostileName])).not.toContain(
      candidate,
    );
  });

  it("bundles no credential input and includes deterministic navigation and setup fallback calls", async () => {
    const html = await renderAppHtml();
    expect(html).toContain("Readiness");
    expect(html).toContain("Choose visual");
    expect(html).toContain("start_splash_setup");
    expect(html).toContain("open_splash_setup_locally");
    expect(html).toContain("hashchange");
    expect(html).toContain("Show unavailable");
    expect(html).toContain("Clear filters");
    expect(html).toContain("Confirm this decision");
    expect(html).toContain("Configure optional");
    expect(html).toContain("Storyboard recommendation");
    expect(html).toContain("read_splash_storyboard_recommendation");
    expect(html).toContain("Recommended");
    expect(html).not.toMatch(/type=["']password|API[_ -]?key input/i);
    const css = await readFile(
      join(import.meta.dirname, "..", "resources", "splash-app.css"),
      "utf8",
    );
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("@media (max-width: 320px)");
  });

  it("keeps raw production stdio initialization free of lifecycle envelopes", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-production-stdio-"));
    roots.push(root);
    const engine = join(root, "bsig");
    await writeFile(engine, "#!/bin/sh\nexit 0\n");
    await chmod(engine, 0o755);
    const checkout = join(import.meta.dirname, "..", "..", "..");
    const child = Bun.spawn(
      [
        process.execPath,
        "--no-env-file",
        join(checkout, "apps", "goose", "server.mjs"),
      ],
      {
        cwd: checkout,
        env: {
          PATH: "/usr/bin:/bin",
          HOME: root,
          SPLASH_CHECKOUT_ROOT: checkout,
          SPLASH_NEWSROOM_PATH: join(checkout, "NEWSROOM.md"),
          SPLASH_BSIG_PATH: engine,
        },
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "raw-production-test", version: "0.1.0" },
        },
      })}\n`,
    );
    child.stdin.end();
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.trim())).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { serverInfo: { name: "splash" } },
    });
    expect(stdout).not.toContain("running on stdio");
    expect(stderr).toContain("running on stdio");
  });
});
