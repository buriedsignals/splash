import { afterEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  createOperationRunner,
  ENGINE_DEADLINE_MARGIN_MS,
  ENGINE_OPERATIONS,
  MAX_LINE_BYTES,
  operationDeadlineMs,
  runEngineOperation,
} from "../engine-operation.mjs";
import { createServer, productionDependencies, wireShutdown } from "../server.mjs";

// Engine's public Splash operation set: `splashOperations` in the Engine repository's
// bsig/internal/run/splash.go:48-58 (read 2026-09-28). `runtime-smoke` is not public.
const ENGINE_PUBLIC_OPERATIONS = [
  "cloudflare-deploy",
  "datawrapper-produce",
  "map-bake",
  "maptiler-delivery",
  "preflight",
  "provider-check-cloudflare",
  "provider-check-datawrapper",
  "provider-check-maptiler",
  "story-inspect",
];

const SECRET = "mt-secret-value-1234567890";
const NAV = "on_navigator-secret-abcdef";

const roots: string[] = [];
const close: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (close.length) await close.pop()!();
  while (roots.length) await rm(roots.pop()!, { recursive: true, force: true });
});

async function fakeEngine(body: string) {
  const root = await mkdtemp(join(tmpdir(), "splash-engine-operation-"));
  roots.push(root);
  const engine = join(root, "bsig");
  await writeFile(
    engine,
    `#!/bin/sh\nprintf '%s\\n' "$@" > "${root}/args"\ncat > "${root}/stdin"\nenv > "${root}/env"\n${body}\n`,
  );
  await chmod(engine, 0o755);
  return { root, engine };
}

function environment(root: string) {
  return {
    PATH: "/usr/bin:/bin",
    HOME: join(root, "scratch-home"),
    SPLASH_ENGINE_HOME: join(root, "journalist-home"),
    MAPTILER_KEY: SECRET,
    OSINT_NAV_API_KEY: NAV,
  };
}

const RESULT_EVENT = JSON.stringify({
  event: "result",
  message: "splash operation ended",
  data: { product: "splash", operation: "map-bake", exit_code: 0, stdout: '{"operation":"map-bake"}\n', stderr: "" },
});

async function connect(operations: any) {
  const server = createServer({
    statusProvider: { read: async () => ({}) },
    studio: { start: async () => ({}), openLocally: async () => ({ ok: true }), close() {} },
    operations,
  });
  const client = new Client({ name: "splash-operation-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  close.push(async () => client.close(), async () => server.close());
  return client;
}

async function gone(pid: number) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

describe("run_operation registration", () => {
  it("is not registered without an Engine operation runner (self-install)", async () => {
    const client = await connect(undefined);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(["open_splash"]);
  });

  it("is registered for a managed server, with exactly Engine's public operation set", async () => {
    const client = await connect(createOperationRunner({ executable: "/nonexistent/bsig" }));
    const { tools } = await client.listTools();
    const tool = tools.find((row) => row.name === "run_operation")!;
    expect(tool).toBeDefined();
    const schema = tool.inputSchema as any;
    expect([...schema.properties.operation.enum].sort()).toEqual(ENGINE_PUBLIC_OPERATIONS);
    expect(schema.properties.operation.enum).not.toContain("runtime-smoke");
    expect(schema.additionalProperties).toBe(false);
    expect(tool.description).toMatch(/never pass a credential/i);
  });

  it("wires the runner only when SPLASH_BSIG_PATH selects the Engine path", async () => {
    const checkout = join(import.meta.dirname, "..", "..", "..");
    const root = await mkdtemp(join(tmpdir(), "splash-deps-"));
    roots.push(root);
    const newsroomPath = join(root, "NEWSROOM.md");
    const self = await productionDependencies({ checkoutRoot: checkout, newsroomPath, bsigPath: undefined });
    expect(self.operations).toBeUndefined();
    const managed = await productionDependencies({ checkoutRoot: checkout, newsroomPath, bsigPath: "/opt/bsig/bsig" });
    expect(typeof managed.operations?.run).toBe("function");
  });

  it("matches the Engine table when the sibling Engine checkout is present", async () => {
    const source = join(import.meta.dirname, "..", "..", "..", "..", "engine", "bsig", "internal", "run", "splash.go");
    if (!existsSync(source)) {
      console.warn(`skipped: Engine source not present at ${source}`);
      return;
    }
    const text = await readFile(source, "utf8");
    const table = /var splashOperations = map\[string\]SplashOperationSpec\{([\s\S]*?)\n\}/.exec(text)![1];
    const ids = [...table.matchAll(/^\s*"([a-z0-9-]+)":/gm)].map((m) => m[1]).sort();
    expect(ids).toEqual(ENGINE_PUBLIC_OPERATIONS);
    expect([...ENGINE_OPERATIONS]).toEqual(ENGINE_PUBLIC_OPERATIONS);
  });
});

describe("operation deadlines", () => {
  it("gives production and deployment Engine's deadlines, well beyond the bridge's 90 s default", () => {
    expect(operationDeadlineMs("map-bake")).toBe(15 * 60_000 + ENGINE_DEADLINE_MARGIN_MS);
    expect(operationDeadlineMs("datawrapper-produce")).toBe(15 * 60_000 + ENGINE_DEADLINE_MARGIN_MS);
    expect(operationDeadlineMs("maptiler-delivery")).toBe(15 * 60_000 + ENGINE_DEADLINE_MARGIN_MS);
    expect(operationDeadlineMs("cloudflare-deploy")).toBe(30 * 60_000 + ENGINE_DEADLINE_MARGIN_MS);
    expect(operationDeadlineMs("preflight")).toBe(45_000 + ENGINE_DEADLINE_MARGIN_MS);
    expect(operationDeadlineMs("map-bake")).toBeGreaterThan(90_000);
    expect(() => operationDeadlineMs("runtime-smoke")).toThrow(/unknown Splash operation/);
  });
});

describe("runEngineOperation through the bridge", () => {
  it("pipes the request on stdin, not argv, with HOME restored and credentials stripped", async () => {
    const { root, engine } = await fakeEngine(`printf '%s\\n' '${RESULT_EVENT}'`);
    const request = { storyId: "swiss-co2", outputId: "1-map", parameters: { contractDigest: "sha256:abc" } };
    const data = await runEngineOperation({ executable: engine, operation: "map-bake", request, environment: environment(root) });
    expect(data).toMatchObject({ operation: "map-bake", exit_code: 0 });
    expect((await readFile(join(root, "args"), "utf8")).trim().split("\n")).toEqual(["--json", "run", "splash", "map-bake"]);
    expect(JSON.parse(await readFile(join(root, "stdin"), "utf8"))).toEqual(request);
    const env = await readFile(join(root, "env"), "utf8");
    expect(env).toContain(`HOME=${join(root, "journalist-home")}`);
    expect(env).not.toContain("scratch-home");
    expect(env).not.toContain(SECRET);
    expect(env).not.toContain(NAV);
    expect(env).not.toContain("SPLASH_ENGINE_HOME");
  });

  it("refuses an oversized NDJSON line and kills the Engine child", async () => {
    const { root, engine } = await fakeEngine(`head -c ${MAX_LINE_BYTES + 16} /dev/zero | tr '\\0' 'a'\nprintf '\\n%s\\n' '${RESULT_EVENT}'`);
    await expect(
      runEngineOperation({ executable: engine, operation: "map-bake", request: {}, environment: environment(root) }),
    ).rejects.toMatchObject({ code: "output-limit" });
  });

  it("refuses an oversized request before spawning Engine", async () => {
    const { root, engine } = await fakeEngine(`printf '%s\\n' '${RESULT_EVENT}'`);
    await expect(
      runEngineOperation({ executable: engine, operation: "map-bake", request: { path: "x".repeat(70_000) }, environment: environment(root) }),
    ).rejects.toMatchObject({ code: "invalid-request" });
    expect(existsSync(join(root, "args"))).toBe(false);
  });

  it("translates an Engine error event into a tool error without relaying held secrets", async () => {
    const progress = JSON.stringify({ event: "progress", message: `Splash operation stderr:\nprovider refused key ${NAV}` });
    const error = JSON.stringify({
      event: "error",
      message: `splash operation map-bake exited with code 1 (${NAV})`,
      data: { failure: { id: "unknown", title: "t", guidance: "Check the story.", technical: "x", retryable: false } },
    });
    const { root, engine } = await fakeEngine(`printf '%s\\n%s\\n' '${progress}' '${error}'\nexit 1`);
    const env = environment(root);
    const client = await connect(createOperationRunner({ executable: engine, environment: env }));
    const answer: any = await client.callTool({ name: "run_operation", arguments: { operation: "map-bake", request: { storyId: "s", outputId: "o" } } });
    expect(answer.isError).toBe(true);
    expect(answer.structuredContent.error.message).toContain("splash operation map-bake exited with code 1");
    expect(answer.structuredContent.error.detail).toMatchObject({ guidance: "Check the story.", exitCode: 1 });
    expect(answer.structuredContent.error.detail.stderr).toContain("provider refused key [redacted]");
    expect(JSON.stringify(answer)).not.toContain(NAV);
  });

  it("returns the final result event data through the MCP tool", async () => {
    const { root, engine } = await fakeEngine(`printf '%s\\n%s\\n' '{"event":"progress","message":"x"}' '${RESULT_EVENT}'`);
    const client = await connect(createOperationRunner({ executable: engine, environment: environment(root) }));
    const answer: any = await client.callTool({ name: "run_operation", arguments: { operation: "map-bake", request: { storyId: "s" } } });
    expect(answer.isError).not.toBe(true);
    expect(answer.structuredContent).toEqual({ operation: "map-bake", result: JSON.parse(RESULT_EVENT).data });
  });

  it("rejects an operation outside Engine's public set before spawning", async () => {
    const { root, engine } = await fakeEngine(`printf '%s\\n' '${RESULT_EVENT}'`);
    const client = await connect(createOperationRunner({ executable: engine, environment: environment(root) }));
    const answer: any = await client.callTool({ name: "run_operation", arguments: { operation: "runtime-smoke", request: {} } });
    expect(answer.isError).toBe(true);
    expect(existsSync(join(root, "args"))).toBe(false);
  });
});

describe("operation cancellation", () => {
  it("stops the Engine child when the MCP request is cancelled", async () => {
    const { root, engine } = await fakeEngine(`echo $$ > "$(dirname "$0")/pid"\nexec sleep 30`);
    const client = await connect(createOperationRunner({ executable: engine, environment: environment(root) }));
    const controller = new AbortController();
    const call = client.callTool({ name: "run_operation", arguments: { operation: "map-bake", request: {} } }, undefined, { signal: controller.signal });
    while (!existsSync(join(root, "pid"))) await new Promise((resolve) => setTimeout(resolve, 20));
    const pid = Number((await readFile(join(root, "pid"), "utf8")).trim());
    controller.abort();
    await expect(call).rejects.toThrow();
    expect(await gone(pid)).toBe(true);
  });

  it("stops every running Engine child when the server shuts down", async () => {
    const { EventEmitter } = await import("node:events");
    const { root, engine } = await fakeEngine(`echo $$ > "$(dirname "$0")/pid"\nexec sleep 30`);
    const operations = createOperationRunner({ executable: engine, environment: environment(root) });
    const running = operations.run("datawrapper-produce", {});
    while (!existsSync(join(root, "pid"))) await new Promise((resolve) => setTimeout(resolve, 20));
    const pid = Number((await readFile(join(root, "pid"), "utf8")).trim());
    const studio = { async start() {}, async openLocally() { return { ok: true }; }, close() {} };
    const server = createServer({ statusProvider: { read: async () => ({}) }, studio, operations });
    const stdin = new EventEmitter();
    wireShutdown(server, studio, { stdin: stdin as never, exit: () => {}, signals: new EventEmitter() as never, operations });
    stdin.emit("end");
    await expect(running).rejects.toMatchObject({ code: "cancelled" });
    expect(await gone(pid)).toBe(true);
    expect(operations.running).toBe(0);
  });
});

describe("stubborn Engine children", () => {
  // A child that ignores SIGTERM stands in for an Engine blocked in a synchronous keychain read.
  const STUBBORN = `echo $$ > "$(dirname "$0")/pid"\ntrap '' TERM\nwhile :; do sleep 1; done`;

  it("kills a SIGTERM-resistant child that overflows the output limit before rejecting", async () => {
    const { root, engine } = await fakeEngine(`echo $$ > "$(dirname "$0")/pid"\ntrap '' TERM\nhead -c ${MAX_LINE_BYTES + 16} /dev/zero | tr '\\0' 'a'\nwhile :; do sleep 1; done`);
    await expect(
      runEngineOperation({ executable: engine, operation: "map-bake", request: {}, environment: environment(root) }),
    ).rejects.toMatchObject({ code: "output-limit" });
    const pid = Number((await readFile(join(root, "pid"), "utf8")).trim());
    expect(await gone(pid)).toBe(true);
  }, 15_000);

  it("waits for a SIGTERM-resistant child to be killed before the server exits", async () => {
    const { EventEmitter } = await import("node:events");
    const { root, engine } = await fakeEngine(STUBBORN);
    const operations = createOperationRunner({ executable: engine, environment: environment(root) });
    const running = operations.run("datawrapper-produce", {});
    running.catch(() => {});
    while (!existsSync(join(root, "pid"))) await new Promise((resolve) => setTimeout(resolve, 20));
    const pid = Number((await readFile(join(root, "pid"), "utf8")).trim());
    const studio = { async start() {}, async openLocally() { return { ok: true }; }, close() {} };
    const server = createServer({ statusProvider: { read: async () => ({}) }, studio, operations });
    const stdin = new EventEmitter();
    let exited = false;
    const exitedAt = new Promise<void>((resolve) => {
      wireShutdown(server, studio, { stdin: stdin as never, exit: () => { exited = true; resolve(); }, signals: new EventEmitter() as never, operations });
    });
    stdin.emit("end");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(exited).toBe(false); // still waiting: the child ignored SIGTERM
    await exitedAt;
    let alive = true;
    try {
      process.kill(pid, 0);
    } catch {
      alive = false;
    }
    expect(alive).toBe(false);
  }, 15_000);
});
