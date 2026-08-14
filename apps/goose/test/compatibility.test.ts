import { afterEach, describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import {
  createServer,
  ENGINE_SPLASH_CONTRACT_MIN,
  renderAppHtml,
  RESOURCE_URI,
} from "../compatibility/server.mjs";

const close = [] as Array<() => Promise<void>>;
afterEach(async () => {
  while (close.length) await close.pop()!();
});

async function fixture(options = {}) {
  const server = createServer(options);
  const client = new Client({ name: "splash-compatibility-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  close.push(async () => client.close(), async () => server.close());
  return client;
}

describe("Goose MCP App compatibility fixture", () => {
  it("publishes the required MCP App resource contract", async () => {
    const client = await fixture();
    const listed = await client.listResources();
    expect(listed.resources).toContainEqual(expect.objectContaining({ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE }));

    const read = await client.readResource({ uri: RESOURCE_URI });
    expect(read.contents).toHaveLength(1);
    expect(read.contents[0]).toMatchObject({ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE });
    expect(read.contents[0].text).toContain("Splash host compatibility");
    expect(read.contents[0].text).not.toContain("__SPLASH_COMPATIBILITY_APP__");
  });

  it("marks status refresh app-only and keeps the opening tool model-visible", async () => {
    const client = await fixture();
    const { tools } = await client.listTools();
    expect(tools.find((tool) => tool.name === "open_splash_compatibility")?._meta?.ui).toMatchObject({
      resourceUri: RESOURCE_URI,
      visibility: ["model", "app"],
    });
    expect(tools.find((tool) => tool.name === "refresh_splash_compatibility")?._meta?.ui).toMatchObject({
      resourceUri: RESOURCE_URI,
      visibility: ["app"],
    });

    const opened = await client.callTool({ name: "open_splash_compatibility" });
    expect(opened.content).toContainEqual(expect.objectContaining({ type: "text", text: expect.stringContaining("view requested") }));
    expect(opened.content).not.toContainEqual(expect.objectContaining({ text: expect.stringContaining("view opened") }));

    const result = await client.callTool({ name: "refresh_splash_compatibility" });
    expect(result.structuredContent).toEqual({
      ready: true,
      broker: "not-tested",
      minimumEngineSplashContract: ENGINE_SPLASH_CONTRACT_MIN,
    });
  });

  it("rejects unknown or credential-like tool arguments before handlers run", async () => {
    const calls: string[] = [];
    const client = await fixture({ onToolCall: (name: string) => calls.push(name) });
    const opened = await client.callTool({
      name: "open_splash_compatibility",
      arguments: { apiKey: "not-a-real-key" },
    });
    const refreshed = await client.callTool({
      name: "refresh_splash_compatibility",
      arguments: { unexpected: true },
    });
    expect(opened.isError).toBe(true);
    expect(refreshed.isError).toBe(true);
    expect(calls).toEqual([]);

    const explicitOpen = await client.callTool({ name: "open_splash_compatibility", arguments: {} });
    const explicitRefresh = await client.callTool({ name: "refresh_splash_compatibility", arguments: {} });
    expect(explicitOpen.isError).not.toBe(true);
    expect(explicitRefresh.isError).not.toBe(true);
    expect(calls).toEqual(["open_splash_compatibility", "refresh_splash_compatibility"]);
  });

  it("bundles explicit result refresh, manual refresh, and distinct open-link failures", async () => {
    const html = await renderAppHtml();
    expect(html).toContain("Refresh status");
    expect(html).toContain("ui/open-link");
    expect(html).toContain("host denied the link request");
    expect(html).toContain("host returned an open-link error");
    expect(html).toContain("callServerTool");
    const source = await Promise.all([
      readFile(new URL("../compatibility/app.html", import.meta.url), "utf8"),
      readFile(new URL("../compatibility/app-client.mjs", import.meta.url), "utf8"),
    ]).then((parts) => parts.join("\n"));
    expect(source).not.toMatch(/API[_ -]?KEY|access token|type=["']password/i);
  });

  it("writes raw MCP JSON-RPC to stdout and diagnostics only to stderr", async () => {
    const child = Bun.spawn(
      [process.execPath, "--no-env-file", new URL("../compatibility/server.mjs", import.meta.url).pathname],
      { stdin: "pipe", stdout: "pipe", stderr: "pipe", env: { PATH: "" } },
    );
    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "raw-test", version: "0.1.0" },
      },
    })}\n`);
    child.stdin.end();
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.trim())).toMatchObject({ jsonrpc: "2.0", id: 1, result: { serverInfo: { name: "splash-compatibility" } } });
    expect(stdout).not.toContain("running on stdio");
    expect(stderr).toContain("running on stdio");
  });
});
