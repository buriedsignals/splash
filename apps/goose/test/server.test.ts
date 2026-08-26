import { afterEach, describe, expect, it } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildPublicStatus } from "../contract.mjs";
import { createServer, renderAppHtml } from "../server.mjs";

const close: Array<() => Promise<void>> = [];
const roots: string[] = [];
afterEach(async () => {
  while (close.length) await close.pop()!();
  while (roots.length) await rm(roots.pop()!, { recursive: true, force: true });
});

function statusFixture() {
  return buildPublicStatus({
    preflight: {
      ready: false,
      checks: [
        { id: "dependencies", status: "pass", detail: "ok" },
        { id: "newsroom-profile", status: "missing", detail: "missing" },
      ],
      blockers: [{ id: "newsroom-profile", status: "missing", detail: "missing" }],
    },
    keyList: {
      ok: true,
      broker: { status: "available" },
      keys: [],
    },
    credentials: [],
  });
}

async function fixture(studio = {
  async start() {
    return { status: "ready", studioUrl: "http://127.0.0.1:9/#secret-studio" };
  },
  async openLocally() {
    return { ok: true, status: "opened" };
  },
  close() {},
}) {
  const calls: string[] = [];
  const server = createServer({
    statusProvider: { read: async () => structuredClone(statusFixture()) },
    studio: {
      start: async () => {
        calls.push("start");
        return studio.start();
      },
      openLocally: async () => {
        calls.push("openLocally");
        return studio.openLocally();
      },
      close: () => studio.close(),
    },
    onToolCall(name: string) {
      calls.push(name);
    },
  });
  const client = new Client({ name: "splash-studio-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  close.push(
    async () => client.close(),
    async () => server.close(),
  );
  return { client, calls };
}

describe("production Splash MCP studio opener", () => {
  it("exposes only open_splash and no MCP App resource", async () => {
    const { client } = await fixture();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(["open_splash"]);
    expect(tools[0]._meta?.ui).toBeUndefined();
    await expect(client.listResources()).rejects.toThrow(/Method not found/);
  });

  it("opens the studio in the browser without leaking the capability URL", async () => {
    const { client, calls } = await fixture();
    const opened = await client.callTool({ name: "open_splash", arguments: {} });
    const wire = JSON.stringify(opened);
    expect(opened.isError).not.toBe(true);
    expect(opened.structuredContent).toMatchObject({
      schemaVersion: "splash-app/v2",
      studio: "opened",
    });
    expect(wire).toContain("opened in the local browser");
    expect(wire).not.toContain("secret-studio");
    expect(wire).not.toContain("127.0.0.1:9");
    expect(calls).toEqual(["open_splash", "start", "openLocally"]);
  });

  it("rejects unknown fields before opening the studio", async () => {
    const { client, calls } = await fixture();
    const candidate = "candidate-secret-12345";
    const open = await client.callTool({
      name: "open_splash",
      arguments: { apiKey: candidate },
    });
    expect(open.isError).toBe(true);
    expect(calls).toEqual([]);
    expect(JSON.stringify(open)).not.toContain(candidate);
  });

  it("bundles the localhost studio without credential inputs or MCP tool names", async () => {
    const html = await renderAppHtml();
    expect(html).toContain("Readiness");
    expect(html).toContain("Choose visual");
    expect(html).toContain("Inspect this story");
    expect(html).toContain("/api/status");
    expect(html).not.toContain("start_splash_setup");
    expect(html).not.toContain("open_splash_setup_locally");
    expect(html).not.toMatch(/type=["']password|API[_ -]?key input/i);
  });

  it("keeps raw production stdio initialization free of lifecycle envelopes", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-production-stdio-"));
    roots.push(root);
    const engine = join(root, "bsig");
    await writeFile(engine, "#!/bin/sh\nexit 0\n");
    await chmod(engine, 0o755);
    const checkout = join(import.meta.dirname, "..", "..", "..");
    const child = Bun.spawn(
      [process.execPath, "--no-env-file", join(checkout, "apps", "goose", "server.mjs")],
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
