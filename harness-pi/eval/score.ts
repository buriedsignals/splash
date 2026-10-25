// A run scored from what it left on disk: the story directory (where whereIs says it got to) and
// the owner sessions (what the model did on the way). Nothing here trusts the model's own account.
// Metrics are KTD11's; the release rule is R20/AE4: completions first, then gate refusals, and a
// tie ships the stock model.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { whereIs } from "../../skills/splash/scripts/where.mjs";

/** Tools whose refusal is a gate holding: the journalist-owned records and the delivery steps. */
const GATE_TOOLS =
  /^(record_takeaway|record_claim|record_hand|record_language|record_slot|show_candidates|record_subject|propose_palette|record_palette|materialise|record_closing)$/;
const WRITE_TOOLS = /^(write_file|edit_file)$/;

export interface FailurePoint {
  owner: string;
  turn: number;
  tool: string;
  error: string;
}

export interface RunScore {
  story: string;
  phase: string;
  completed: boolean;
  gateRefusals: number;
  toolErrors: number;
  turns: number;
  seconds: number;
  /** Craft sessions whose last write is not followed by a look (AE5). */
  craftWithoutLook: string[];
  failures: FailurePoint[];
}

interface Entry {
  type: string;
  timestamp?: string;
  message?: {
    role: string;
    toolName?: string;
    isError?: boolean;
    content?: unknown;
  };
}

function sessionFiles(dir: string): { owner: string; path: string }[] {
  if (!existsSync(dir)) return [];
  const out: { owner: string; path: string }[] = [];
  for (const owner of readdirSync(dir)) {
    for (const slot of readdirSync(join(dir, owner))) {
      const slotDir = join(dir, owner, slot);
      if (!statSync(slotDir).isDirectory()) continue;
      for (const f of readdirSync(slotDir)
        .filter((f) => f.endsWith(".jsonl"))
        .sort())
        out.push({ owner, path: join(slotDir, f) });
    }
  }
  return out;
}

const textOf = (content: unknown) =>
  Array.isArray(content)
    ? content.map((c: { text?: string }) => c.text ?? "").join("")
    : String(content ?? "");

const toolCallsOf = (content: unknown): string[] =>
  Array.isArray(content)
    ? content
        .filter((c: { type?: string }) => c.type === "toolCall")
        .map((c: { name?: string }) => String(c.name))
    : [];

export async function scoreRun(root: string, story: string): Promise<RunScore> {
  const storyDir = join(root, "stories", story);
  const state = await whereIs(storyDir);
  const files = sessionFiles(join(root, ".splash-harness", "sessions", story));
  let gateRefusals = 0;
  let toolErrors = 0;
  let turns = 0;
  let first = Infinity;
  let last = -Infinity;
  const craftWithoutLook: string[] = [];
  const failures: FailurePoint[] = [];

  for (const { owner, path } of files) {
    const entries: Entry[] = readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    let lastWrite = -1;
    let lastLook = -1;
    let turn = 0;
    entries.forEach((e, i) => {
      if (e.timestamp) {
        const t = Date.parse(e.timestamp);
        if (Number.isFinite(t)) {
          first = Math.min(first, t);
          last = Math.max(last, t);
        }
      }
      const m = e.message;
      if (e.type !== "message" || !m) return;
      if (m.role === "assistant") {
        turns++;
        turn++;
        for (const name of toolCallsOf(m.content)) {
          if (WRITE_TOOLS.test(name)) lastWrite = i;
          if (name === "look") lastLook = i;
        }
      }
      if (m.role === "toolResult" && m.isError) {
        toolErrors++;
        const tool = String(m.toolName);
        if (GATE_TOOLS.test(tool)) gateRefusals++;
        failures.push({
          owner,
          turn,
          tool,
          error: textOf(m.content).slice(0, 300),
        });
      }
    });
    if (owner === "skill-chart-beat" && lastWrite > lastLook)
      craftWithoutLook.push(path);
  }

  return {
    story,
    phase: state.phase,
    completed: state.phase === "done",
    gateRefusals,
    toolErrors,
    turns,
    seconds: Number.isFinite(first) ? Math.round((last - first) / 1000) : 0,
    craftWithoutLook,
    failures,
  };
}

/** R20: the tune ships only if it completes more runs, or as many with fewer gate refusals. */
export function releaseDecision(
  stock: RunScore[],
  tuned: RunScore[],
): "ship tuned" | "ship stock" {
  const done = (rs: RunScore[]) => rs.filter((r) => r.completed).length;
  const refusals = (rs: RunScore[]) =>
    rs.reduce((n, r) => n + r.gateRefusals, 0);
  if (done(tuned) !== done(stock))
    return done(tuned) > done(stock) ? "ship tuned" : "ship stock";
  return refusals(tuned) < refusals(stock) ? "ship tuned" : "ship stock";
}

if (import.meta.main) {
  const [root, story] = process.argv.slice(2);
  if (!root || !story) {
    console.error("usage: bun harness-pi/eval/score.ts <run-root> <story>");
    process.exit(2);
  }
  const score = await scoreRun(root, story);
  console.log(
    JSON.stringify({ ...score, failures: score.failures.length }, null, 2),
  );
}
