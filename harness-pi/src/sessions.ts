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
import { estimateTokens, foldAt, HARNESS_OVERHEAD_TOKENS, TIER_FOLD } from "./budget.ts";
import { ARMS, fixedResources, loadModel } from "./pi.ts";
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

const LEVELS = ["off", "minimal", "low", "medium", "high"] as const;
export type Thinking = (typeof LEVELS)[number];

/**
 * One thinking setting for every arm (plan KTD4): SPLASH_THINKING, default off. Teacher, student and the dataset
 * must agree on it; on the local 12B llama-server caps it with --reasoning-budget 400.
 */
export function thinkingLevel(env = process.env): Thinking {
  const raw = (env.SPLASH_THINKING ?? "off").trim().toLowerCase();
  const level = raw === "on" ? "medium" : raw;
  if (!(LEVELS as readonly string[]).includes(level))
    throw new Error(`SPLASH_THINKING is "${env.SPLASH_THINKING}": use off, on, ${LEVELS.slice(1).join(", ")}`);
  return level as Thinking;
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
  const arm = ARMS[opts.modelId ?? "stock"];
  const { modelRuntime, model } = await loadModel(arm ?? { provider: opts.provider, id: opts.modelId });
  const tier = arm?.tier ?? "12b";
  model.maxTokens = outputCap(opts.key.owner, model.maxTokens);
  const { session } = await createAgentSession({
    cwd: opts.runRoot,
    model,
    modelRuntime,
    thinkingLevel: thinkingLevel(),
    resourceLoader: fixedResources(opts.systemPrompt),
    sessionManager: SessionManager.continueRecent(
      opts.runRoot,
      sessionDir(opts.runRoot, opts.key),
    ),
    settingsManager: SettingsManager.inMemory({
      compaction: {
        enabled: true,
        // Pi compacts past contextWindow - reserveTokens: reserve what lies above this session's fold point.
        reserveTokens:
          model.contextWindow -
          foldAt(estimateTokens(opts.systemPrompt) + HARNESS_OVERHEAD_TOKENS, tier, model.contextWindow),
        keepRecentTokens: Math.max(opts.keepRecentTokens, TIER_FOLD[tier].keep),
      },
      // A long prompt on a laptop can take many minutes before the first byte comes back.
      httpIdleTimeoutMs: 30 * 60_000,
      retry: { enabled: true, maxRetries: 2 },
    }),
    noTools: "builtin",
    customTools: opts.tools,
  });
  return session;
}

/** Owners whose turns only talk and record: none writes a file. */
const TALK: readonly OwnerId[] = ["persona:editor", "skill:storyboard", "persona:designer", "skill:deliver"];

/**
 * A talk turn's output cap. A cut turn is only cut on our side: Osaurus generates on to the request's cap and
 * the next turn waits behind it (storyboard runs 4 and 5, 2026-11-11, ten minutes per loop). Talk turns wrote
 * 695 tokens at most over 879 turns; craft keeps the model's cap, since it writes whole files.
 */
export function outputCap(owner: OwnerId, modelMax: number): number {
  return TALK.includes(owner) ? Math.min(2_048, modelMax) : modelMax;
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
  // A provider failure (server down, context overflow) still resolves prompt(); surface it.
  const last = [...session.messages].reverse().find((m) => m.role === "assistant");
  if (last && "stopReason" in last && last.stopReason === "error") {
    throw new Error(`model turn failed: ${last.errorMessage ?? "unknown provider error"}`);
  }
  return { text: session.getLastAssistantText() ?? "", toolErrors, looked };
}
