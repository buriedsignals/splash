// Gold generation (U10): the production harness run with the 31B teacher on training stories, a
// scripted journalist on the other end. Spend-gated: the paid arm refuses to start without the
// budget Rémy approved, every run is killed at its own ceiling, and the batch stops at its ceiling.
// Cost is read from what Pi recorded in the sessions (usage.cost, priced by models.teacher.json),
// never estimated. Only runs whose story reached `done` enter the training manifest; held-out
// stories are refused before anything runs.
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { scoreRun } from "./score.ts";
import { assertWithinCap, record } from "./spend.ts";

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const HELDOUT: string[] = JSON.parse(
  readFileSync(join(CHECKOUT, "training", "heldout.json"), "utf8"),
);
const PAID_ARMS = new Set(["teacher"]);

export interface BatchPlan {
  arm: string;
  stories: string[];
  runCeiling: number;
  batchCeiling: number;
  approvedBudget?: number;
  /** Samples per story (Tom's k), run one at a time. */
  k?: number;
  /** On the free arm, resume a run that hit a 429 on the paid arm (KTD9); needs the paid arm's budget. */
  paidFallback?: boolean;
}

/** Throws before any spend when the plan would break a rule. */
export function assertPlan(plan: BatchPlan) {
  const held = plan.stories.filter((s) => HELDOUT.includes(s));
  if (held.length)
    throw new Error(
      `held-out stories never enter training data: ${held.join(", ")}`,
    );
  if (PAID_ARMS.has(plan.arm) || plan.paidFallback) {
    if (plan.approvedBudget === undefined)
      throw new Error(
        `the ${plan.paidFallback ? "paid fallback" : `${plan.arm} arm`} is paid: pass --approved-budget <usd>, the amount Rémy approved`,
      );
    if (plan.batchCeiling > plan.approvedBudget)
      throw new Error(
        `batch ceiling $${plan.batchCeiling} exceeds the approved budget $${plan.approvedBudget}`,
      );
    // The whole batch may spend its ceiling: the ledger's OpenRouter total plus it must stay under the cap.
    assertWithinCap("OpenRouter", plan.batchCeiling);
    if (!process.env.OPENROUTER_API_KEY)
      throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (!(plan.runCeiling > 0) || !(plan.batchCeiling >= plan.runCeiling))
    throw new Error(
      "ceilings must be positive, and the batch ceiling at least one run's",
    );
}

/** Tokens Pi recorded across every session of a run root (cache reads are billed, KTD6). */
export function sessionUsage(root: string) {
  const usage = { input: 0, output: 0, cacheRead: 0 };
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".jsonl"))
        for (const line of readFileSync(p, "utf8").split("\n")) {
          if (!line.includes('"usage"')) continue;
          const u = JSON.parse(line).message?.usage ?? {};
          usage.input += u.input ?? 0;
          usage.output += u.output ?? 0;
          usage.cacheRead += u.cacheRead ?? 0;
        }
    }
  };
  walk(join(root, ".splash-harness", "sessions"));
  return usage;
}

/** Dollars Pi recorded across every session of a run root. */
export function sessionCost(root: string): number {
  const dir = join(root, ".splash-harness", "sessions");
  let total = 0;
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".jsonl"))
        for (const line of readFileSync(p, "utf8").split("\n")) {
          if (!line.includes('"usage"')) continue;
          total += JSON.parse(line).message?.usage?.cost?.total ?? 0;
        }
    }
  };
  walk(dir);
  return total;
}

function sessionsOf(root: string, story: string): string[] {
  const out: string[] = [];
  const base = join(root, ".splash-harness", "sessions", story);
  if (!existsSync(base)) return out;
  for (const owner of readdirSync(base))
    for (const slot of readdirSync(join(base, owner)))
      for (const f of readdirSync(join(base, owner, slot)).filter((f) =>
        f.endsWith(".jsonl"),
      ))
        out.push(join(base, owner, slot, f));
  return out;
}

export interface GoldVerdict {
  gold: boolean;
  /** The gates the run passed (recorded as meta.gold_reasons). */
  reasons: string[];
  /** The gates it failed: incomplete, headline, render, repair, fallback. */
  rejected: string[];
}

/**
 * Tom's gold gates for Splash (plan KTD3), computed: the story reached done, its headline is faithful, the last craft
 * render passed, and neither a repair nor a fallback carried it. Repair and fallback are only in the driver's
 * transcript (report.json) and in a beat's .harness/fallback.json.
 */
export function goldGates(storyDir: string, score: { completed: boolean; faithful: { headline: boolean } }, transcript: string[]): GoldVerdict {
  const renders = transcript.filter((l) => l.startsWith("CRAFT final render:"));
  const beats = join(storyDir, "beats");
  const fellBack = existsSync(beats) && readdirSync(beats).some((b) => existsSync(join(beats, b, ".harness", "fallback.json")));
  const gates: [string, boolean][] = [
    ["done", score.completed],
    ["headline", score.faithful.headline],
    ["render", renders.length > 0 && /exit 0\b/.test(renders.at(-1) ?? "")],
    ["repair", !transcript.some((l) => l.startsWith("CRAFT repaired"))],
    ["fallback", !fellBack && !transcript.some((l) => l.startsWith("CRAFT fallback"))],
  ];
  const rejected = gates.filter(([, ok]) => !ok).map(([g]) => (g === "done" ? "incomplete" : g));
  return { gold: rejected.length === 0, reasons: gates.filter(([, ok]) => ok).map(([g]) => (g === "repair" || g === "fallback" ? `no-${g}` : g)), rejected };
}

/** One manifest line, in the existing {session, meta, roots} format build_from_pi.py reads (KTD2). */
export function manifestLine(session: string, root: string, m: { story: string; arm: string; sample: number; reasons: string[] }) {
  return `${JSON.stringify({ session, meta: { story: m.story, arm: m.arm, kind: "gold", sample: m.sample, gold_reasons: m.reasons }, roots: [root] })}\n`;
}

/** A rate limit in the run's own log (the free tier has one provider; KTD9). */
export const rateLimited = (log: string) => /\b429\b|rate[- ]?limit/i.test(log);

function transcriptOf(root: string): string[] {
  const file = join(root, ".splash-harness", "report.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")).transcript ?? []) : [];
}

function spawnRun(story: string, root: string, arm: string, log: string) {
  const sheet = join(CHECKOUT, "harness-pi", "eval", "sheets", `${story}.json`);
  return Bun.spawn(
    ["bun", join(CHECKOUT, "harness-pi/src/cli.ts"), "run", "--slug", story, "--root", root, "--journalist", `scripted:${sheet}`, "--model", arm],
    { stdout: "pipe", stderr: Bun.file(log), env: { ...process.env } },
  );
}

export async function runBatch(
  plan: BatchPlan,
  out = join(CHECKOUT, "training", "data"),
) {
  assertPlan(plan);
  mkdirSync(out, { recursive: true });
  const k = Math.max(1, plan.k ?? 2);
  let spent = 0;
  for (const story of plan.stories)
    for (let sample = 1; sample <= k; sample++) {
      if (spent + plan.runCeiling > plan.batchCeiling) {
        appendFileSync(join(out, "runs.jsonl"), `${JSON.stringify({ story, sample, arm: plan.arm, skipped: "batch ceiling", spent })}\n`);
        return spent;
      }
      const root = join(homedir(), ".splash-harness", "teacher", `${story}-${sample}-${Date.now()}`);
      const log = `${root}.log`;
      mkdirSync(join(homedir(), ".splash-harness", "teacher"), { recursive: true });
      let stop = "";
      const arms = [plan.arm];
      for (let a = 0; a < arms.length; a++) {
        const child = spawnRun(story, root, arms[a], a ? `${log}.${arms[a]}` : log);
        const watch = setInterval(() => {
          if (sessionCost(root) > plan.runCeiling) {
            stop = "run ceiling";
            child.kill();
          }
        }, 10_000);
        await new Response(child.stdout).text();
        await child.exited;
        clearInterval(watch);
        // The free tier answered 429: the same run resumes on the paid arm, whose routing falls back between providers.
        const score = await scoreRun(root, story);
        if (!stop && !score.completed && plan.paidFallback && arms.length === 1 && rateLimited(readFileSync(log, "utf8"))) arms.push("teacher");
      }
      const cost = sessionCost(root);
      spent += cost;
      if (cost > 0) {
        const u = sessionUsage(root);
        record({ step: `gold ${story} #${sample} (${arms.join(" → ")})`, service: "OpenRouter", quantity: `${u.input} in / ${u.output} out / ${u.cacheRead} cache-read tokens`, usd: cost });
      }
      const score = await scoreRun(root, story);
      const verdict = goldGates(join(root, "stories", story), score, transcriptOf(root));
      const kept = verdict.gold && !stop;
      appendFileSync(
        join(out, "runs.jsonl"),
        `${JSON.stringify({ story, sample, arms, root, cost, kept, rejected: stop ? [stop, ...verdict.rejected] : verdict.rejected, score: { ...score, failures: score.failures.length } })}\n`,
      );
      if (kept)
        for (const session of sessionsOf(root, story))
          appendFileSync(join(out, "manifest.jsonl"), manifestLine(session, root, { story, arm: arms.at(-1) ?? plan.arm, sample, reasons: verdict.reasons }));
    }
  return spent;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? undefined : args[i + 1];
  };
  const plan: BatchPlan = {
    arm: flag("arm") ?? "teacher",
    stories: (flag("stories") ?? "").split(",").filter(Boolean),
    runCeiling: Number(flag("run-ceiling") ?? 1),
    batchCeiling: Number(flag("batch-ceiling") ?? 3),
    approvedBudget: flag("approved-budget") === undefined ? undefined : Number(flag("approved-budget")),
    k: Number(flag("k") ?? 2),
    paidFallback: args.includes("--paid-fallback"),
  };
  if (!plan.stories.length) {
    console.error(
      "usage: bun harness-pi/eval/teacher.ts --stories a,b [--arm teacher|teacher-free] [--paid-fallback] [--k 2] --run-ceiling 1 --batch-ceiling 3 --approved-budget <usd> [--dry]",
    );
    process.exit(2);
  }
  if (args.includes("--dry")) {
    assertPlan(plan);
    const runs = plan.stories.length * (plan.k ?? 2);
    console.log(`stories: ${plan.stories.join(", ")}\nk: ${plan.k}\nruns: ${runs}\nprojected: at most $${Math.min(runs * plan.runCeiling, plan.batchCeiling).toFixed(2)} (run ceiling $${plan.runCeiling}, batch ceiling $${plan.batchCeiling}); nothing spent`);
    process.exit(0);
  }
  const spent = await runBatch(plan);
  console.log(`spent $${spent.toFixed(3)}`);
}
