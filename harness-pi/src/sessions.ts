// One Pi session per (story, owner, slot, attempt), persisted as Pi JSONL under the run root.
// A gate pause resumes the same session; a beat's second review or a routed-back revision gets a
// fresh one, so no session carries another beat's context. The directory is the index: the newest
// session file in a key's directory is that key's session.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  type AgentSession,
  createAgentSession,
  SessionManager,
  SettingsManager,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { SLOT } from "./budget.ts";
import { fixedResources, loadModel } from "./pi.ts";
import type { OwnerId } from "./profiles.ts";

export interface SessionKey {
  story: string;
  owner: OwnerId;
  /** The storyboard slot a beat-scoped owner works on; "story" for story-scoped owners. */
  slot: string;
  attempt: number;
}

export function sessionDir(runRoot: string, key: SessionKey): string {
  return join(
    runRoot,
    ".splash-harness",
    "sessions",
    key.story,
    key.owner.replace(":", "-"),
    `${key.slot}-${key.attempt}`,
  );
}

export function hasSession(runRoot: string, key: SessionKey): boolean {
  const dir = sessionDir(runRoot, key);
  return existsSync(dir) && readdirSync(dir).some((f) => f.endsWith(".jsonl"));
}

export interface OpenOptions {
  runRoot: string;
  key: SessionKey;
  systemPrompt: string;
  tools: ToolDefinition[];
  keepRecentTokens: number;
  provider?: string;
  modelId?: string;
}

export async function openSession(opts: OpenOptions): Promise<AgentSession> {
  const { modelRuntime, model } = await loadModel({
    provider: opts.provider,
    id: opts.modelId,
  });
  const { session } = await createAgentSession({
    cwd: opts.runRoot,
    model,
    modelRuntime,
    thinkingLevel: "off",
    resourceLoader: fixedResources(opts.systemPrompt),
    sessionManager: SessionManager.continueRecent(
      opts.runRoot,
      sessionDir(opts.runRoot, opts.key),
    ),
    settingsManager: SettingsManager.inMemory({
      compaction: {
        enabled: true,
        reserveTokens: SLOT.reserveTokens,
        keepRecentTokens: opts.keepRecentTokens,
      },
      retry: { enabled: true, maxRetries: 2 },
    }),
    noTools: "builtin",
    customTools: opts.tools,
  });
  return session;
}

export interface TurnOutcome {
  text: string;
  toolErrors: string[];
  looked: boolean;
}

/** Run one prompt to the point where Pi will not continue on its own, and report what happened. */
export async function runTurn(
  session: AgentSession,
  prompt: string,
): Promise<TurnOutcome> {
  const toolErrors: string[] = [];
  let looked = false;
  const off = session.subscribe((event) => {
    if (event.type === "tool_execution_end") {
      if (event.isError) toolErrors.push(event.toolName);
      if (event.toolName === "look" && !event.isError) looked = true;
    }
  });
  try {
    await session.prompt(prompt);
    await session.waitForIdle();
  } finally {
    off();
  }
  return { text: session.getLastAssistantText() ?? "", toolErrors, looked };
}
