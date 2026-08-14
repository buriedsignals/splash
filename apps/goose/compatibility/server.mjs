#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

export const RESOURCE_URI = "ui://splash/compatibility";
export const ENGINE_SPLASH_CONTRACT_MIN = 1;
const APP_MARKER = "/*__SPLASH_COMPATIBILITY_APP__*/";
// MCP permits omitting `arguments` for zero-argument tools. Optionality accepts
// that wire shape; the strict object still rejects every supplied property.
const NO_ARGUMENTS = z.strictObject({}).optional();

export async function renderAppHtml() {
  const [template, build] = await Promise.all([
    readFile(join(import.meta.dirname, "app.html"), "utf8"),
    Bun.build({
      entrypoints: [join(import.meta.dirname, "app-client.mjs")],
      format: "esm",
      minify: true,
      target: "browser",
    }),
  ]);
  if (!build.success || build.outputs.length !== 1) {
    throw new Error(`could not bundle the compatibility app: ${build.logs.join("\n")}`);
  }
  if (!template.includes(APP_MARKER)) throw new Error("compatibility app template has no script marker");
  const bundled = await build.outputs[0].text();
  // A JavaScript bundle legitimately contains replacement tokens such as `$&`.
  // Use a callback so String.replace cannot reinterpret bundle bytes.
  return template.replace(APP_MARKER, () => bundled);
}

export function createServer({ appHtml = renderAppHtml, onToolCall = () => {} } = {}) {
  const server = new McpServer({ name: "splash-compatibility", version: "0.1.0" });

  registerAppTool(
    server,
    "open_splash_compatibility",
    {
      title: "Open Splash compatibility",
      description: "Open the credential-independent Splash host compatibility view.",
      inputSchema: NO_ARGUMENTS,
      _meta: { ui: { resourceUri: RESOURCE_URI, visibility: ["model", "app"] } },
    },
    async () => {
      onToolCall("open_splash_compatibility");
      return {
        content: [{ type: "text", text: "Splash compatibility view requested; no render acknowledgement, credentials, or pairing material were returned." }],
        structuredContent: { broker: "not-tested", minimumEngineSplashContract: ENGINE_SPLASH_CONTRACT_MIN },
      };
    },
  );

  registerAppTool(
    server,
    "refresh_splash_compatibility",
    {
      title: "Refresh Splash compatibility",
      description: "Read fixture status from the rendered Splash app only.",
      inputSchema: NO_ARGUMENTS,
      _meta: { ui: { resourceUri: RESOURCE_URI, visibility: ["app"] } },
    },
    async () => {
      onToolCall("refresh_splash_compatibility");
      return {
        content: [{ type: "text", text: "App-only status read succeeded. The production credential broker is not part of this fixture." }],
        structuredContent: { ready: true, broker: "not-tested", minimumEngineSplashContract: ENGINE_SPLASH_CONTRACT_MIN },
      };
    },
  );

  registerAppResource(
    server,
    "Splash compatibility",
    RESOURCE_URI,
    {
      description: "Credential-independent MCP App host compatibility fixture.",
      mimeType: RESOURCE_MIME_TYPE,
      _meta: { ui: { csp: { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] }, prefersBorder: true } },
    },
    async () => ({
      contents: [{
        uri: RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: await appHtml(),
        _meta: { ui: { csp: { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] }, prefersBorder: true } },
      }],
    }),
  );

  return server;
}

export async function main() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  console.error("Splash compatibility MCP App server running on stdio");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
