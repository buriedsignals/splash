import { afterEach, describe, expect, it } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildPublicStatus } from "../contract.mjs";
import { createServer } from "../server.mjs";
import { createStoryBinding } from "../story-binding.mjs";

const cleanup: Array<() => Promise<void>> = [];
const roots: string[] = [];
afterEach(async () => {
  while (cleanup.length) await cleanup.pop()!();
  while (roots.length) await rm(roots.pop()!, { recursive: true, force: true });
});

function statusFixture(ready = true) {
  return buildPublicStatus({
    preflight: {
      ready,
      checks: [
        { id: "dependencies", status: "pass", detail: "installed" },
        { id: "newsroom-profile", status: ready ? "pass" : "missing", detail: ready ? "ready" : "NEWSROOM.md is absent" },
      ],
      blockers: ready ? [] : [{ id: "newsroom-profile", status: "missing", detail: "NEWSROOM.md is absent" }],
    },
    keyList: { ok: true, broker: { status: "available" }, credentialIndependentPathsAvailable: true, keys: [] },
    credentials: [],
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

async function fixture({ ready = true, setupReason = "done", setupCompletion = Promise.resolve({ reason: setupReason }), interfaceError = null } = {}) {
  const calls: string[] = [];
  const opened: string[] = [];
  let statusReads = 0;
  const setupManager = {
    async start() { return { status: "ready", setupUrl: "http://127.0.0.1:43210/#secret-capability", completion: setupCompletion }; },
    async openLocally() { opened.push("readiness"); return { ok: true, status: "opened" }; },
    close() {},
  };
  const interfaceManager = {
    async open({ mode, path }: { mode: string; path: string }) {
      opened.push(mode);
      if (interfaceError) throw interfaceError;
      return { ok: true, status: "confirmed", mode, optionId: "chart.slope", phase: "production", descriptor: { storyId: "story-one", canonicalPath: path } };
    },
    close() {},
  };
  const workspace = {
    async createStory({ title }: { title: string }) { return { slug: "story-one", dir: "/stories/story-one", title }; },
  };
  const storyBinding = createStoryBinding({
    random: () => "browser-only-story-challenge-123456",
    async inspect(path: string) {
      if (path !== "/stories/story-one") throw new Error("refused");
      return { storyId: "story-one", canonicalPath: path, articlePath: `${path}/source/article.md`, hasStoryboard: true };
    },
  });
  const server = createServer({
    statusProvider: { async read() { statusReads += 1; return structuredClone(statusFixture(ready)); } },
    setupManager,
    interfaceManager,
    workspace,
    storyBinding,
    onToolCall: (name: string) => calls.push(name),
  });
  const client = new Client({ name: "splash-browser-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  cleanup.push(async () => client.close(), async () => server.close());
  return { client, calls, opened, get statusReads() { return statusReads; } };
}

describe("Splash MCP app browser launch bridge", () => {
  it("publishes model tools without an embedded MCP App resource", async () => {
    const { client } = await fixture();
    await expect(client.listResources()).rejects.toThrow("Method not found");
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toEqual([
      "create_splash_story",
      "open_splash_readiness",
      "open_splash_a_la_carte",
      "open_splash_storyboard",
    ]);
    for (const tool of (await client.listTools()).tools) {
      expect(tool._meta?.ui?.visibility).toEqual(["model"]);
    }
  });

  it("opens protected preflight without returning its capability URL", async () => {
    const { client, opened } = await fixture({ ready: false });
    const result = await client.callTool({ name: "open_splash_readiness", arguments: {} });
    expect(result.structuredContent).toMatchObject({ view: "readiness", status: "done" });
    expect(JSON.stringify(result)).not.toContain("secret-capability");
    expect(opened).toEqual(["readiness"]);
  });

  it("keeps preflight pending through the browser session and reports a non-Done close", async () => {
    const { client } = await fixture({ ready: false, setupReason: "closed" });
    const result = await client.callTool({ name: "open_splash_readiness", arguments: {} });
    expect(result).toMatchObject({ isError: true, structuredContent: { view: "readiness", status: "closed" } });
  });

  it("waits for Done before returning a freshly read preflight status", async () => {
    const completion = deferred<{ reason: string }>();
    const test = await fixture({ ready: true, setupCompletion: completion.promise });
    let settled = false;
    const pending = test.client.callTool({ name: "open_splash_readiness", arguments: {} }).then((value) => { settled = true; return value; });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);
    expect(test.statusReads).toBe(0);
    completion.resolve({ reason: "done" });
    const result = await pending;
    expect(result.structuredContent).toMatchObject({ status: "done", readiness: { ready: true } });
    expect(test.statusReads).toBe(1);
  });

  it("waits for confirmation in only the chat-selected browser interface", async () => {
    const { client, opened } = await fixture();
    const result = await client.callTool({ name: "open_splash_storyboard", arguments: { path: "/stories/story-one" } });
    expect(result.structuredContent).toEqual({
      schemaVersion: "splash-browser-launch/v1",
      view: "storyboard",
      status: "confirmed",
      optionId: "chart.slope",
      phase: "production",
      story: { storyId: "story-one", canonicalPath: "/stories/story-one" },
    });
    expect(JSON.stringify(result)).not.toContain("browser-only-story-challenge");
    expect(opened).toEqual(["storyboard"]);
  });

  it("fails closed before launching selection when preflight is incomplete", async () => {
    const { client, opened } = await fixture({ ready: false });
    const result = await client.callTool({ name: "open_splash_a_la_carte", arguments: { path: "/stories/story-one" } });
    expect(result).toMatchObject({ isError: true, structuredContent: { status: "preflight-required" } });
    expect(opened).toEqual([]);
  });

  it("does not claim a generic browser failure left the canonical story unchanged", async () => {
    const { client } = await fixture({ interfaceError: new Error("indeterminate completion") });
    const result = await client.callTool({ name: "open_splash_storyboard", arguments: { path: "/stories/story-one" } });
    expect(result).toMatchObject({ isError: true, structuredContent: { status: "open-failed" } });
    expect(JSON.stringify(result)).not.toContain("No story was changed");
    expect(JSON.stringify(result)).toContain("Inspect the canonical story state");
  });

  it("rejects unknown and credential-like fields before handlers run", async () => {
    const { client, calls } = await fixture();
    const secret = "candidate-secret-12345";
    const result = await client.callTool({ name: "open_splash_storyboard", arguments: { path: "/stories/story-one", token: secret } });
    expect(result.isError).toBe(true);
    expect(calls).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("creates a story only through the Engine-adopted workspace", async () => {
    const { client } = await fixture();
    const result = await client.callTool({ name: "create_splash_story", arguments: { title: "Story one" } });
    expect(result.structuredContent).toEqual({ schemaVersion: "splash-story-workspace/v1", storyId: "story-one", canonicalPath: "/stories/story-one" });
  });

  it("keeps raw production stdio initialization free of lifecycle envelopes", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-production-stdio-"));
    roots.push(root);
    const engine = join(root, "bsig");
    const storiesRoot = join(root, "stories");
    await Bun.write(join(storiesRoot, ".keep"), "");
    await writeFile(engine, "#!/bin/sh\nexit 0\n");
    await chmod(engine, 0o755);
    const checkout = join(import.meta.dirname, "..", "..", "..");
    const child = Bun.spawn([process.execPath, "--no-env-file", join(checkout, "apps", "goose", "server.mjs")], {
      cwd: checkout,
      env: {
        PATH: "/usr/bin:/bin",
        HOME: root,
        SPLASH_CHECKOUT_ROOT: checkout,
        SPLASH_STORIES_ROOT: storiesRoot,
        SPLASH_NEWSROOM_PATH: join(checkout, "NEWSROOM.md"),
        SPLASH_BSIG_PATH: engine,
      },
      stdin: "pipe", stdout: "pipe", stderr: "pipe",
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "raw-production-test", version: "0.1.0" } } })}\n`);
    child.stdin.end();
    const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.trim())).toMatchObject({ jsonrpc: "2.0", id: 1, result: { serverInfo: { name: "splash" } } });
    expect(stdout).not.toContain("running on stdio");
    expect(stderr).toContain("running on stdio");
  });
});
