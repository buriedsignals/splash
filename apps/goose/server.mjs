#!/usr/bin/env bun

import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  createEngineBridge,
  invokeEngine,
} from "../../installer/setup/engine-bridge.mjs";
import { runPreflight } from "../../skills/splash/scripts/preflight.mjs";
import { createStory } from "../../skills/splash/scripts/new-story.mjs";
import {
  buildPublicStatus,
  ENGINE_SPLASH_CONTRACT_MIN,
  textSummary,
} from "./contract.mjs";
import { createSetupSessionManager } from "./setup-session.mjs";
import { createBrowserInterfaceManager } from "./browser-interface.mjs";
import { createRecommendationService } from "./recommendation.mjs";
import {
  capabilitySnapshotFromStatus,
  createSelectionService,
} from "./selection.mjs";
import { createStoryBinding } from "./story-binding.mjs";

function exactObject(shape) {
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? "Unexpected fields are not allowed."
        : undefined,
  });
}

const NO_ARGUMENTS = exactObject({}).optional();
const STORY_ARGUMENTS = exactObject({
  path: z
    .string()
    .min(1)
    .max(16 << 10),
});
const CREATE_STORY_ARGUMENTS = exactObject({
  title: z.string().trim().min(1).max(512),
});
function textResult(text, structuredContent) {
  return { content: [{ type: "text", text }], structuredContent };
}

function assertSelectionReadyStatus(status) {
  if (
    status?.runtime?.status === "ready" &&
    status?.readiness?.ready === true
  ) {
    return status;
  }
  const error = new Error(
    "Splash pre-flight must be complete before choosing a visual",
  );
  error.code = "PREFLIGHT_REQUIRED";
  throw error;
}

export function createServer({
  statusProvider,
  setupManager,
  interfaceManager,
  workspace,
  storyBinding,
  onToolCall = () => {},
} = {}) {
  if (!statusProvider || typeof statusProvider.read !== "function")
    throw new Error("Splash MCP requires a status provider");
  if (
    !workspace ||
    typeof workspace.createStory !== "function"
  )
    throw new Error("Splash MCP requires an Engine-bound story workspace");
  if (
    !setupManager ||
    ["start", "openLocally", "close"].some(
      (name) => typeof setupManager[name] !== "function",
    )
  )
    throw new Error("Splash MCP requires a setup manager");
  if (!interfaceManager || ["open", "close"].some((name) => typeof interfaceManager[name] !== "function"))
    throw new Error("Splash MCP requires a local browser interface manager");
  if (!storyBinding || typeof storyBinding.nominate !== "function")
    throw new Error("Splash MCP requires a story binding");

  const server = new McpServer({ name: "splash", version: "0.1.0" });

  server.registerTool(
    "create_splash_story",
    {
      title: "Create canonical Splash story",
      description:
        "Create a new story workspace beneath Engine's adopted Splash stories root before intake. Use this instead of deriving a story directory from the shell working directory or checkout.",
      inputSchema: CREATE_STORY_ARGUMENTS,
      _meta: { ui: { visibility: ["model"] } },
    },
    async ({ title }) => {
      onToolCall("create_splash_story");
      try {
        const created = await workspace.createStory({ title });
        const state = {
          schemaVersion: "splash-story-workspace/v1",
          storyId: created.slug,
          canonicalPath: created.dir,
        };
        return textResult(
          `Canonical Splash story ${created.slug} was created. Freeze source material there, then recover the phase from disk.`,
          state,
        );
      } catch {
        return {
          isError: true,
          ...textResult(
            "Splash could not create that canonical story workspace. Nothing was overwritten.",
            { schemaVersion: "splash-story-workspace-error/v1" },
          ),
        };
      }
    },
  );

  server.registerTool(
    "open_splash_readiness",
    {
      title: "Open Splash readiness",
      description:
        "Open the protected localhost Splash preflight interface for credentials, newsroom branding, and capability status. Do not use this to choose a visual.",
      inputSchema: NO_ARGUMENTS,
      _meta: { ui: { visibility: ["model"] } },
    },
    async () => {
      onToolCall("open_splash_readiness");
      try {
        const started = await setupManager.start();
        const opened = await setupManager.openLocally();
        if (!opened.ok && opened.status !== "already-open") throw new Error("local opener failed");
        const completion = await started.completion;
        if (completion.reason !== "done") {
          return {
            isError: true,
            ...textResult(
              `Splash preflight ended without Done (${completion.reason}). Saved values remain stored; reopen readiness to finish.`,
              { schemaVersion: "splash-browser-launch/v1", view: "readiness", status: completion.reason },
            ),
          };
        }
        const status = await statusProvider.read();
        return textResult(`${textSummary(status)} Preflight was completed in the Splash MCP app. Resume from this fresh status now; do not ask the journalist to type Continue.`, {
          schemaVersion: "splash-browser-launch/v1",
          view: "readiness",
          status: "done",
          readiness: status.readiness,
          runtime: status.runtime,
        });
      } catch {
        return { isError: true, ...textResult("Splash could not complete the local preflight interaction. Saved setup values may remain stored; reopen readiness and inspect the fresh status before retrying.", { schemaVersion: "splash-browser-launch/v1", view: "readiness", status: "open-failed" }) };
      }
    },
  );

  function registerSelectionOpener(name, view, title, description) {
    server.registerTool(
      name,
      {
        title,
        description,
        inputSchema: STORY_ARGUMENTS,
        _meta: { ui: { visibility: ["model"] } },
      },
      async ({ path }) => {
        onToolCall(name);
        try {
          assertSelectionReadyStatus(await statusProvider.read());
          const completion = await interfaceManager.open({ mode: view, path });
          const descriptor = completion.descriptor;
          return textResult(
            `${completion.optionId} was confirmed for story ${descriptor.storyId} in the Splash MCP app. Resume from disk now; do not ask the journalist to type Continue.`,
            { schemaVersion: "splash-browser-launch/v1", view, status: "confirmed", optionId: completion.optionId, phase: completion.phase, story: { storyId: descriptor.storyId, canonicalPath: descriptor.canonicalPath } },
          );
        } catch (error) {
          return {
            isError: true,
            ...textResult(
              error?.code === "PREFLIGHT_REQUIRED"
                ? "Complete Splash preflight before choosing a treatment. No story was changed."
                : "Splash could not complete that story interaction in the local browser interface. Inspect the canonical story state before retrying.",
              { schemaVersion: "splash-browser-launch/v1", view, status: error?.code === "PREFLIGHT_REQUIRED" ? "preflight-required" : "open-failed" },
            ),
          };
        }
      },
    );
  }

  registerSelectionOpener(
    "open_splash_a_la_carte",
    "a-la-carte",
    "Open Splash À-la-carte",
    "Explicit override only: open every reachable treatment only when the journalist directly asks in chat for À-la-carte or all treatments. Never use this as the default continuation.",
  );

  registerSelectionOpener(
    "open_splash_storyboard",
    "storyboard",
    "Open Splash Storyboard recommendations",
    "Default treatment continuation: open the localhost Storyboard automatically with exactly one recommendation and one alternative. No interface-choice question is required.",
  );

  return server;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Splash MCP environment is missing ${name}`);
  return value;
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

export async function productionDependencies() {
  const checkoutRoot = requiredEnvironment("SPLASH_CHECKOUT_ROOT");
  const storiesRoot = requiredEnvironment("SPLASH_STORIES_ROOT");
  const newsroomPath = requiredEnvironment("SPLASH_NEWSROOM_PATH");
  const bsigPath = requiredEnvironment("SPLASH_BSIG_PATH");
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
          templateRoot: join(
            checkoutRoot,
            "skills",
            "splash",
            "assets",
            "root-template",
          ),
        });
      } catch {
        preflight = {
          ready: false,
          checks: [
            {
              id: "runtime",
              status: "fail",
              detail:
                "The installed Splash runtime could not complete pre-flight.",
            },
          ],
          blockers: [
            {
              id: "runtime",
              status: "fail",
              detail:
                "The installed Splash runtime could not complete pre-flight.",
            },
          ],
        };
      }
      let keyList;
      let credentials = [];
      try {
        keyList = await bridge.list();
        if (keyList.ok && keyList.broker?.status !== "unavailable") {
          credentials = await Promise.all(
            keyList.keys.map(async (row) => {
              const status = await bridge.status(row.id);
              return {
                ...row,
                ...status,
                metadata: status.metadata ?? row.metadata,
              };
            }),
          );
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
      return buildPublicStatus({ preflight, keyList, credentials });
    },
  };
  const setupManager = createSetupSessionManager({
    controllerPath: join(
      checkoutRoot,
      "installer",
      "setup",
      "controller-child.mjs",
    ),
    bsigPath,
    newsroomPath,
    legacyEnvPath: join(checkoutRoot, ".env"),
  });
  const workspace = {
    async createStory({ title }) {
      return createStory({ storiesRoot, title });
    },
  };
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
  const interfaceManager = createBrowserInterfaceManager({
    storyBinding,
    selection,
    recommendation,
  });
  return {
    statusProvider,
    setupManager,
    interfaceManager,
    workspace,
    storyBinding,
  };
}

export async function main() {
  const dependencies = await productionDependencies();
  const server = createServer(dependencies);
  await server.connect(new StdioServerTransport());
  console.error(
    `Splash MCP app server running on stdio (contract ${ENGINE_SPLASH_CONTRACT_MIN})`,
  );
}

if (import.meta.main) {
  main().catch(() => {
    console.error("Splash MCP app server failed closed");
    process.exitCode = 1;
  });
}
