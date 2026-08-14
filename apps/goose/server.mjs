#!/usr/bin/env bun

import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  createEngineBridge,
  invokeEngine,
} from "../../installer/setup/engine-bridge.mjs";
import { runPreflight } from "../../skills/splash/scripts/preflight.mjs";
import {
  buildPublicStatus,
  ENGINE_SPLASH_CONTRACT_MIN,
  RESOURCE_URI,
  textSummary,
} from "./contract.mjs";
import { createSetupSessionManager } from "./setup-session.mjs";
import { createRecommendationService } from "./recommendation.mjs";
import {
  capabilitySnapshotFromStatus,
  createSelectionService,
} from "./selection.mjs";
import { createStoryBinding } from "./story-binding.mjs";

const APP_MARKER = "/*__SPLASH_APP__*/";
const CSS_MARKER = "/*__SPLASH_CSS__*/";

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
const CONFIRM_ARGUMENTS = exactObject({
  challenge: z.string().min(16).max(256),
});
const EXPECTED_SELECTION = exactObject({
  storyRevision: z.string().min(1).max(256),
  catalogRevision: z.string().min(1).max(256),
  capabilityGeneration: z.string().min(1).max(256),
});
const SELECTION_CONFIRM_ARGUMENTS = exactObject({
  optionId: z.string().min(1).max(256),
  expected: EXPECTED_SELECTION,
});
const SELECTION_REWIND_ARGUMENTS = exactObject({
  expected: EXPECTED_SELECTION,
});
const STORYBOARD_CONFIRM_ARGUMENTS = exactObject({
  optionId: z.string().min(1).max(256),
  expected: EXPECTED_SELECTION,
  recommendationRevision: z.string().min(1).max(256),
});

function appMeta(visibility) {
  return { ui: { resourceUri: RESOURCE_URI, visibility } };
}

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

export async function renderAppHtml() {
  const root = join(import.meta.dirname, "resources");
  const [template, css, build] = await Promise.all([
    readFile(join(root, "splash-app.html"), "utf8"),
    readFile(join(root, "splash-app.css"), "utf8"),
    Bun.build({
      entrypoints: [join(root, "splash-app.mjs")],
      format: "esm",
      minify: true,
      target: "browser",
    }),
  ]);
  if (!build.success || build.outputs.length !== 1)
    throw new Error("could not bundle the Splash app");
  if (!template.includes(APP_MARKER) || !template.includes(CSS_MARKER))
    throw new Error("Splash app template markers are missing");
  const bundled = await build.outputs[0].text();
  return template
    .replace(CSS_MARKER, () => css)
    .replace(APP_MARKER, () => bundled);
}

export function createServer({
  statusProvider,
  setupManager,
  storyBinding,
  selection,
  recommendation,
  appHtml = renderAppHtml,
  onToolCall = () => {},
} = {}) {
  if (!statusProvider || typeof statusProvider.read !== "function")
    throw new Error("Splash MCP requires a status provider");
  if (
    !setupManager ||
    ["start", "openLocally", "close"].some(
      (name) => typeof setupManager[name] !== "function",
    )
  )
    throw new Error("Splash MCP requires a setup manager");
  if (
    !storyBinding ||
    ["nominate", "pending", "confirm", "current", "context", "revalidate"].some(
      (name) => typeof storyBinding[name] !== "function",
    )
  )
    throw new Error("Splash MCP requires a story binding");
  if (
    !selection ||
    ["read", "confirm", "reopenFormat", "reopenTreatment"].some(
      (name) => typeof selection[name] !== "function",
    )
  )
    throw new Error("Splash MCP requires a selection service");
  if (
    !recommendation ||
    ["read", "confirm"].some(
      (name) => typeof recommendation[name] !== "function",
    )
  )
    throw new Error("Splash MCP requires a recommendation service");

  const server = new McpServer({ name: "splash", version: "0.1.0" });

  registerAppTool(
    server,
    "open_splash",
    {
      title: "Open Splash",
      description:
        "Open Splash readiness and visual-selection navigation without accepting credentials.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["model", "app"]),
    },
    async () => {
      onToolCall("open_splash");
      const status = await statusProvider.read();
      status.story = {
        status: storyBinding.current() ? "bound" : "unbound",
        descriptor: storyBinding.current(),
      };
      return textResult(
        `${textSummary(status)} The Splash view was requested; render acknowledgement is not inferred.`,
        status,
      );
    },
  );

  registerAppTool(
    server,
    "refresh_splash_status",
    {
      title: "Refresh Splash status",
      description: "Refresh non-secret Splash readiness from the rendered app.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async () => {
      onToolCall("refresh_splash_status");
      const status = await statusProvider.read();
      status.story = {
        status: storyBinding.current() ? "bound" : "unbound",
        descriptor: storyBinding.current(),
      };
      return textResult(textSummary(status), status);
    },
  );

  registerAppTool(
    server,
    "start_splash_setup",
    {
      title: "Start protected Splash setup",
      description:
        "Start a short-lived local credential and newsroom setup session after explicit app action.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async () => {
      onToolCall("start_splash_setup");
      try {
        const result = await setupManager.start();
        return textResult(
          "Protected local setup is ready for the app to open.",
          { status: result.status, setupUrl: result.setupUrl },
        );
      } catch {
        return {
          isError: true,
          ...textResult(
            "The protected setup controller could not start. Nothing was changed.",
            { status: "controller-start-failed" },
          ),
        };
      }
    },
  );

  registerAppTool(
    server,
    "open_splash_setup_locally",
    {
      title: "Open Splash setup with this computer",
      description:
        "Use the platform URL opener after the host cannot open the already-started local setup session.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async () => {
      onToolCall("open_splash_setup_locally");
      const result = await setupManager.openLocally();
      return {
        ...(result.ok ? {} : { isError: true }),
        ...textResult(
          result.ok
            ? "The platform opener accepted the local setup page."
            : "The platform opener could not open the active setup page.",
          result,
        ),
      };
    },
  );

  registerAppTool(
    server,
    "close_splash_setup",
    {
      title: "Close Splash setup",
      description:
        "Close the active local setup controller without undoing completed saves.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async () => {
      onToolCall("close_splash_setup");
      setupManager.close();
      return textResult(
        "The setup controller was asked to close. Completed saves remain committed.",
        { status: "closing" },
      );
    },
  );

  registerAppTool(
    server,
    "nominate_splash_story",
    {
      title: "Nominate a Splash story",
      description:
        "Ask Engine to inspect one story path. This does not bind or change the story.",
      inputSchema: STORY_ARGUMENTS,
      _meta: appMeta(["model", "app"]),
    },
    async ({ path }) => {
      onToolCall("nominate_splash_story");
      try {
        const descriptor = await storyBinding.nominate(path);
        return textResult(
          `Engine inspected story ${descriptor.storyId}. Open Splash to review and confirm it.`,
          { nominated: true, descriptor },
        );
      } catch {
        return {
          isError: true,
          ...textResult(
            "Engine refused that story nomination. No story was bound or changed.",
            { nominated: false },
          ),
        };
      }
    },
  );

  registerAppTool(
    server,
    "pending_splash_story",
    {
      title: "Read the pending Splash story",
      description: "Read the app-session-only story confirmation challenge.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async () => {
      onToolCall("pending_splash_story");
      const pending = storyBinding.pending();
      return textResult(
        pending
          ? "A nominated story is waiting for confirmation."
          : "No story is waiting for confirmation.",
        pending ?? { descriptor: null, challenge: null },
      );
    },
  );

  registerAppTool(
    server,
    "confirm_splash_story",
    {
      title: "Confirm the pending Splash story",
      description:
        "Bind the displayed story to this in-memory Splash app session only.",
      inputSchema: CONFIRM_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async ({ challenge }) => {
      onToolCall("confirm_splash_story");
      try {
        const descriptor = storyBinding.confirm(challenge);
        return textResult(
          `Story ${descriptor.storyId} is bound to this Splash session.`,
          { confirmed: true, descriptor },
        );
      } catch {
        return {
          isError: true,
          ...textResult(
            "The story confirmation expired. Nominate and review it again.",
            { confirmed: false },
          ),
        };
      }
    },
  );

  async function requireSelectionReadiness() {
    assertSelectionReadyStatus(await statusProvider.read());
  }

  async function runSelection(action, successText) {
    try {
      await requireSelectionReadiness();
      const bindingContext = storyBinding.context();
      if (!bindingContext)
        throw new Error("confirm a story before choosing a visual");
      const model = await action(bindingContext);
      return textResult(successText, model);
    } catch (error) {
      const status =
        error?.code === "PREFLIGHT_REQUIRED"
          ? "preflight-required"
          : error?.code === "RECOMMENDATION_CONFLICT"
            ? "recommendation-conflict"
            : error?.code === "REVISION_CONFLICT" ||
                error?.code === "SELECTION_CONFLICT"
              ? "selection-conflict"
              : error?.code === "OPTION_UNAVAILABLE"
                ? "option-unavailable"
                : storyBinding.current()
                  ? "selection-unavailable"
                  : "story-unbound";
      const message =
        status === "preflight-required"
          ? "Complete Splash readiness before choosing a visual. Nothing was changed."
          : status === "selection-conflict"
            ? "The story or available capabilities changed. Refresh before confirming again. Nothing was changed."
            : status === "recommendation-conflict"
              ? "The recommendation evidence changed. Refresh before confirming again. Nothing was changed."
              : status === "option-unavailable"
                ? "That option is no longer available. Refresh before choosing again. Nothing was changed."
                : status === "story-unbound"
                  ? "Confirm the exact story in this app session before choosing a visual."
                  : "The current storyboard decision could not be read. Nothing was changed.";
      return {
        isError: true,
        ...textResult(message, {
          schemaVersion: "splash-selection-error/v1",
          status,
        }),
      };
    }
  }

  registerAppTool(
    server,
    "read_splash_selection",
    {
      title: "Read the current Splash choice",
      description:
        "Read the active canonical storyboard gate for the confirmed app-session story.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async () => {
      onToolCall("read_splash_selection");
      return runSelection(
        (bindingContext) => selection.read({ bindingContext }),
        "The current storyboard decision is ready.",
      );
    },
  );

  registerAppTool(
    server,
    "confirm_splash_selection",
    {
      title: "Confirm the current Splash choice",
      description:
        "Confirm exactly one revision-current choice in the active storyboard gate.",
      inputSchema: SELECTION_CONFIRM_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async ({ optionId, expected }) => {
      onToolCall("confirm_splash_selection");
      return runSelection(
        (bindingContext) =>
          selection.confirm({ bindingContext, expected, optionId }),
        "The storyboard decision was confirmed.",
      );
    },
  );

  registerAppTool(
    server,
    "reopen_splash_format",
    {
      title: "Reopen the Splash publication format",
      description:
        "Explicitly clear the current format and its dependent decisions after a revision check.",
      inputSchema: SELECTION_REWIND_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async ({ expected }) => {
      onToolCall("reopen_splash_format");
      return runSelection(
        (bindingContext) =>
          selection.reopenFormat({ bindingContext, expected }),
        "The publication-format decision was reopened.",
      );
    },
  );

  registerAppTool(
    server,
    "reopen_splash_treatment",
    {
      title: "Reopen the Splash treatment",
      description:
        "Explicitly clear the current treatment and producer after a revision check.",
      inputSchema: SELECTION_REWIND_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async ({ expected }) => {
      onToolCall("reopen_splash_treatment");
      return runSelection(
        (bindingContext) =>
          selection.reopenTreatment({ bindingContext, expected }),
        "The treatment decision was reopened.",
      );
    },
  );

  registerAppTool(
    server,
    "read_splash_storyboard_recommendation",
    {
      title: "Read the current Splash recommendation",
      description:
        "Read one evidence-based advisory recommendation plus reachable alternatives for the confirmed story.",
      inputSchema: NO_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async () => {
      onToolCall("read_splash_storyboard_recommendation");
      return runSelection(
        (bindingContext) => recommendation.read({ bindingContext }),
        "The current advisory recommendation is ready.",
      );
    },
  );

  registerAppTool(
    server,
    "confirm_splash_storyboard_selection",
    {
      title: "Confirm a Splash Storyboard choice",
      description:
        "Confirm one reachable alternative only while its recommendation evidence and selection revisions remain current.",
      inputSchema: STORYBOARD_CONFIRM_ARGUMENTS,
      _meta: appMeta(["app"]),
    },
    async ({ optionId, expected, recommendationRevision }) => {
      onToolCall("confirm_splash_storyboard_selection");
      return runSelection(
        (bindingContext) =>
          recommendation.confirm({
            bindingContext,
            expected,
            recommendationRevision,
            optionId,
          }),
        "The Storyboard choice was confirmed.",
      );
    },
  );

  registerAppResource(
    server,
    "Splash",
    RESOURCE_URI,
    {
      description: "Splash readiness and visual-selection application.",
      mimeType: RESOURCE_MIME_TYPE,
      _meta: {
        ui: {
          csp: {
            connectDomains: [],
            resourceDomains: [],
            frameDomains: [],
            baseUriDomains: [],
          },
          prefersBorder: true,
        },
      },
    },
    async () => ({
      contents: [
        {
          uri: RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await appHtml(),
          _meta: {
            ui: {
              csp: {
                connectDomains: [],
                resourceDomains: [],
                frameDomains: [],
                baseUriDomains: [],
              },
              prefersBorder: true,
            },
          },
        },
      ],
    }),
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
  return {
    statusProvider,
    setupManager,
    storyBinding,
    selection,
    recommendation,
  };
}

export async function main() {
  const dependencies = await productionDependencies();
  const server = createServer(dependencies);
  await server.connect(new StdioServerTransport());
  console.error(
    `Splash MCP App server running on stdio (contract ${ENGINE_SPLASH_CONTRACT_MIN})`,
  );
}

if (import.meta.main) {
  main().catch(() => {
    console.error("Splash MCP App server failed closed");
    process.exitCode = 1;
  });
}
