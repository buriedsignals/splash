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
}

/** Throws before any spend when the plan would break a rule. */
export function assertPlan(plan: BatchPlan) {
  const held = plan.stories.filter((s) => HELDOUT.includes(s));
  if (held.length)
    throw new Error(
      `held-out stories never enter training data: ${held.join(", ")}`,
    );
  if (PAID_ARMS.has(plan.arm)) {
    if (plan.approvedBudget === undefined)
      throw new Error(
        `the ${plan.arm} arm is paid: pass --approved-budget <usd>, the amount Rémy approved`,
      );
    if (plan.batchCeiling > plan.approvedBudget)
      throw new Error(
        `batch ceiling $${plan.batchCeiling} exceeds the approved budget $${plan.approvedBudget}`,
      );
    if (!process.env.OPENROUTER_API_KEY)
      throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (!(plan.runCeiling > 0) || !(plan.batchCeiling >= plan.runCeiling))
    throw new Error(
      "ceilings must be positive, and the batch ceiling at least one run's",
    );
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

export async function runBatch(
  plan: BatchPlan,
  out = join(CHECKOUT, "training", "data"),
) {
  assertPlan(plan);
  mkdirSync(out, { recursive: true });
  let spent = 0;
  for (const story of plan.stories) {
    if (spent + plan.runCeiling > plan.batchCeiling) {
      appendFileSync(
        join(out, "runs.jsonl"),
        `${JSON.stringify({ story, arm: plan.arm, skipped: "batch ceiling", spent })}\n`,
      );
      break;
    }
    const root = join(
      homedir(),
      ".splash-harness",
      "teacher",
      `${story}-${Date.now()}`,
    );
    const sheet = join(
      CHECKOUT,
      "harness-pi",
      "eval",
      "sheets",
      `${story}.json`,
    );
    const child = Bun.spawn(
      [
        "bun",
        join(CHECKOUT, "harness-pi/src/cli.ts"),
        "run",
        "--slug",
        story,
        "--root",
        root,
        "--journalist",
        `scripted:${sheet}`,
        "--model",
        plan.arm,
      ],
      { stdout: "ignore", stderr: "ignore" },
    );
    let stop = "";
    const watch = setInterval(() => {
      if (sessionCost(root) > plan.runCeiling) {
        stop = "run ceiling";
        child.kill();
      }
    }, 10_000);
    await child.exited;
    clearInterval(watch);
    const cost = sessionCost(root);
    spent += cost;
    const score = await scoreRun(root, story);
    const kept = score.completed && !stop;
    appendFileSync(
      join(out, "runs.jsonl"),
      `${JSON.stringify({ story, arm: plan.arm, root, cost, kept, stop: stop || (score.completed ? "done" : `stalled at ${score.phase}`), score: { ...score, failures: score.failures.length } })}\n`,
    );
    if (kept)
      for (const session of sessionsOf(root, story))
        appendFileSync(
          join(out, "manifest.jsonl"),
          `${JSON.stringify({ session, meta: { story, arm: plan.arm, kind: "gold" }, roots: [root] })}\n`,
        );
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
    approvedBudget:
      flag("approved-budget") === undefined
        ? undefined
        : Number(flag("approved-budget")),
  };
  if (!plan.stories.length) {
    console.error(
      "usage: bun harness-pi/eval/teacher.ts --stories a,b [--arm teacher|teacher-free] --run-ceiling 1 --batch-ceiling 3 --approved-budget <usd>",
    );
    process.exit(2);
  }
  const spent = await runBatch(plan);
  console.log(`spent $${spent.toFixed(3)}`);
}
