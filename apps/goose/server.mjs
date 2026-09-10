#!/usr/bin/env bun

import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  createEngineBridge,
  invokeEngine,
} from "../../installer/setup/engine-bridge.mjs";
import { runPreflight } from "../../skills/splash/scripts/preflight.mjs";
import {
  buildPublicStatus,
  ENGINE_SPLASH_CONTRACT_MIN,
  textSummary,
} from "./contract.mjs";
import { createRecommendationService } from "./recommendation.mjs";
import { renderAppHtml } from "./resources/render.mjs";
import {
  capabilitySnapshotFromStatus,
  createSelectionService,
} from "./selection.mjs";
import { createSetupSessionManager } from "./setup-session.mjs";
import { createStoryBinding } from "./story-binding.mjs";
import { createStudioSessionManager } from "./studio/session.mjs";
import { readCredentialStatuses } from "./studio/credential-status.mjs";
import { createSettingsService } from "../../installer/setup/settings-service.mjs";
import { readNewsroom } from "../../installer/setup/newsroom-store.mjs";

export { renderAppHtml };

function assertSelectionReadyStatus(status) {
  if (status?.runtime?.status === "ready" && status?.readiness?.ready === true) {
    return status;
  }
  const error = new Error(
    "Splash pre-flight must be complete before choosing a visual",
  );
  error.code = "PREFLIGHT_REQUIRED";
  throw error;
}

function exactObject(shape) {
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? "Unexpected fields are not allowed."
        : undefined,
  });
}

const NO_ARGUMENTS = exactObject({}).optional();

function textResult(text, structuredContent) {
  return { content: [{ type: "text", text }], structuredContent };
}

function terminalResult(result) {
  const event = result.events?.at(-1);
  if (result.exitCode !== 0 || event?.event !== "result")
    throw new Error("Engine operation failed");
  return event.data;
}

async function readStableProfile(story) {
  const path = join(story.canonicalPath, "source", "profile.json");
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > 2 << 20) {
    throw new Error(
      "the frozen story profile is missing, too large, or not a real file",
    );
  }
  const text = await readFile(path, "utf8");
  const after = await lstat(path);
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error(
      "the frozen story profile changed while the recommendation was loading",
    );
  }
  const profile = JSON.parse(text);
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("the frozen story profile is invalid");
  }
  return profile;
}

export function createServer({ statusProvider, studio, onToolCall = () => {} } = {}) {
  if (!statusProvider || typeof statusProvider.read !== "function")
    throw new Error("Splash MCP requires a status provider");
  if (
    !studio ||
    ["start", "openLocally", "close"].some((name) => typeof studio[name] !== "function")
  )
    throw new Error("Splash MCP requires a studio session");

  const server = new McpServer({ name: "splash", version: "0.1.0" });
  server.registerTool(
    "open_splash",
    {
      title: "Open Splash",
      description:
        "Open the local Splash studio in the journalist's browser for readiness and visual selection. Do not pass credentials.",
      inputSchema: NO_ARGUMENTS,
    },
    async () => {
      onToolCall("open_splash");
      try {
        await studio.start();
        const opened = await studio.openLocally();
        const status = await statusProvider.read();
        return textResult(
          opened.ok
            ? `${textSummary(status)} Splash studio opened in the local browser.`
            : `${textSummary(status)} Splash studio is ready but this computer could not open the browser.`,
          { ...status, studio: opened.ok ? "opened" : opened.status },
        );
      } catch {
        return {
          isError: true,
          ...textResult("Splash studio could not start. Nothing was changed.", {
            studio: "start-failed",
          }),
        };
      }
    },
  );
  return server;
}

export async function productionDependencies({
  checkoutRoot = process.env.SPLASH_CHECKOUT_ROOT ?? join(import.meta.dirname, "..", ".."),
  newsroomPath = process.env.SPLASH_NEWSROOM_PATH ?? join(homedir(), ".config", "splash", "NEWSROOM.md"),
  bsigPath = process.env.SPLASH_BSIG_PATH,
  legacyEnvPath = join(checkoutRoot, ".env"),
} = {}) {
  if (!bsigPath) {
    const { selfManagedDependencies } = await import("./self-managed.mjs");
    return selfManagedDependencies({ checkoutRoot, newsroomPath, profileProvider: readStableProfile });
  }
  const bridge = createEngineBridge({ executable: bsigPath });
  const statusProvider = {
    async read() {
      let preflight = null;
      try {
        preflight = await runPreflight({
          root: checkoutRoot,
          newsroomPath,
          env: {},
          fetchFn: async () => {
            throw new Error("credential probes are resolved by Engine status");
          },
          templateRoot: join(checkoutRoot, "skills", "splash", "assets", "root-template"),
        });
      } catch {
        preflight = {
          ready: false,
          checks: [
            {
              id: "runtime",
              status: "fail",
              detail: "The installed Splash runtime could not complete pre-flight.",
            },
          ],
          blockers: [
            {
              id: "runtime",
              status: "fail",
              detail: "The installed Splash runtime could not complete pre-flight.",
            },
          ],
        };
      }
      let keyList;
      let credentials = [];
      try {
        keyList = await bridge.list();
        if (keyList.ok && keyList.broker?.status !== "unavailable") {
          credentials = await readCredentialStatuses(bridge, keyList.keys);
        }
      } catch {
        keyList = {
          ok: false,
          broker: {
            status: "unavailable",
            reasonCode: "engine-unreachable",
            message: "Engine credential status is unavailable.",
          },
          credentialIndependentPathsAvailable: true,
          keys: [],
        };
      }
      const status = buildPublicStatus({ preflight, keyList, credentials });
      const saved = await readNewsroom(newsroomPath).catch(() => null);
      const account = saved?.profile?.cloudflareAccountId;
      if (/^[0-9a-f]{32}$/i.test(account ?? "")) status.newsroom.cloudflareAccountId = account.toLowerCase();
      return { ...status, installation: "engine" };
    },
  };
  const setupManager = createSetupSessionManager({
    controllerPath: join(checkoutRoot, "installer", "setup", "controller-child.mjs"),
    bsigPath,
    newsroomPath,
    legacyEnvPath,
  });
  const storyBinding = createStoryBinding({
    async inspect(path) {
      const result = await invokeEngine(
        bsigPath,
        ["run", "splash", "story-inspect"],
        `${JSON.stringify({ path })}\n`,
      );
      const data = terminalResult(result);
      return data?.story;
    },
  });
  const selection = createSelectionService({
    storyBinding,
    capabilityProvider: async () => {
      const status = assertSelectionReadyStatus(await statusProvider.read());
      return capabilitySnapshotFromStatus(status);
    },
  });
  const recommendation = createRecommendationService({
    selection,
    profileProvider: readStableProfile,
  });
  const studio = createStudioSessionManager({
    controllerPath: join(checkoutRoot, "apps", "goose", "studio", "controller-child.mjs"),
    bsigPath,
    newsroomPath,
    legacyEnvPath,
    checkoutRoot,
  });
  return {
    statusProvider,
    settings: createSettingsService({ newsroomPath }),
    setupManager,
    storyBinding,
    selection,
    recommendation,
    studio,
  };
}

/**
 * End the server when the agent is gone. The SDK's stdio transport only
 * closes on malformed input, and an open studio keeps the event loop alive,
 * so without this the MCP process (and the studio's loopback listener) would
 * outlive the agent until something killed the tree. Both the protocol close
 * and stdin EOF close the studio and exit; the studio child closes on its
 * own parent-EOF as well, so nothing listens after this returns.
 */
export function wireShutdown(server, studio, { stdin = process.stdin, exit = (code) => process.exit(code), signals = process } = {}) {
  let done = false;
  const shutdown = () => {
    if (done) return;
    done = true;
    try {
      studio.close();
    } catch {
      // closing is best effort; the process ends either way
    }
    setTimeout(() => exit(0), 250).unref?.();
  };
  stdin.on("end", shutdown);
  stdin.on("close", shutdown);
  const previous = server.server.onclose;
  server.server.onclose = () => {
    previous?.();
    shutdown();
  };
  signals.on("SIGTERM", shutdown);
  signals.on("SIGINT", shutdown);
  return shutdown;
}

export async function main() {
  const dependencies = await productionDependencies();
  const server = createServer({
    statusProvider: dependencies.statusProvider,
    studio: dependencies.studio,
  });
  await server.connect(new StdioServerTransport());
  wireShutdown(server, dependencies.studio);
  console.error(`Splash MCP server running on stdio (contract ${ENGINE_SPLASH_CONTRACT_MIN})`);
}

if (import.meta.main) {
  main().catch(() => {
    console.error("Splash MCP server failed closed");
    process.exitCode = 1;
  });
}
