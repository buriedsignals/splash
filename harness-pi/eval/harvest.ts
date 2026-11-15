// Gold harvest from kept runs (free, no model call): which craft legs the students already got right, so the
// tune list's gold examples start from their own sessions before any teacher run. A leg is a candidate when its
// last render passed, the storyboard's takeaway is drawn, and neither a repair nor the fallback carried it — the
// craft half of teacher.ts goldGates. Candidates still need a look against data.json: the gates do not read alt
// text or hand-typed mark lists (TUNE.md H3, T8).
// Usage: bun harness-pi/eval/harvest.ts [--root <kept-runs>] [--since 2026-11-14] [--json <out>]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseStoryboard } from "../../skills/splash/scripts/gate-contract.mjs";
import { svgFacts } from "../src/tools/review.ts";

const ARMS = ["osaurus-qwen", "osaurus", "local26", "stock", "e4b", "teacher31", "teacher"];

export function armOf(dir: string): string {
  const base = dir.replace(/-\d{13}$/, "");
  return ARMS.find((a) => base.endsWith(`-${a}`)) ?? "other";
}

export function formatOf(transcript: string[]): string {
  const kit = transcript.find((l) => l.startsWith("CRAFT kit:"));
  return kit?.match(/^CRAFT kit: (\w+)\//)?.[1] ?? "none";
}

export function craftVerdict(transcript: string[], headline: boolean) {
  const renders = transcript.filter((l) => l.startsWith("CRAFT final render:"));
  const gates: [string, boolean][] = [
    ["render", renders.length > 0 && /exit 0\b/.test(renders.at(-1) ?? "")],
    ["headline", headline],
    ["repair", !transcript.some((l) => l.startsWith("CRAFT repaired"))],
    ["fallback", !transcript.some((l) => l.startsWith("CRAFT fallback"))],
  ];
  const rejected = gates.filter(([, ok]) => !ok).map(([g]) => g);
  return { gold: rejected.length === 0, rejected };
}

/** The kept layout: STORYBOARD.md at the root, renders/<beat>/ beside beats/<beat>/. */
function headlineDrawn(run: string): boolean {
  const sb = join(run, "STORYBOARD.md");
  const renders = join(run, "renders");
  if (!existsSync(sb) || !existsSync(renders)) return false;
  const takeaway = String((parseStoryboard(readFileSync(sb, "utf8")).meta as Record<string, unknown>).takeaway ?? "");
  const beat = readdirSync(renders).filter((d) => !d.startsWith(".")).sort()[0];
  if (!takeaway || !beat) return false;
  const dir = join(renders, beat);
  const file = readdirSync(dir)
    .filter((f) => f.endsWith(".svg") || f.endsWith(".html"))
    .sort((a, b) => statSync(join(dir, b)).mtimeMs - statSync(join(dir, a)).mtimeMs)[0];
  if (!file) return false;
  const norm = (t: string) => t.replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
  return norm(svgFacts(readFileSync(join(dir, file), "utf8")).texts.join(" ")).includes(norm(takeaway));
}

if (import.meta.main) {
  const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  const root = arg("--root") ?? join(homedir(), ".splash-harness", "kept-runs");
  const since = Date.parse(arg("--since") ?? "2026-11-14");
  const heldout: string[] = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../training/heldout.json"), "utf8"));
  const rows = [];
  for (const dir of readdirSync(root)) {
    const run = join(root, dir);
    const report = join(run, "report.json");
    if (!existsSync(report) || statSync(report).mtimeMs < since) continue;
    const transcript: string[] = JSON.parse(readFileSync(report, "utf8")).transcript ?? [];
    const format = formatOf(transcript);
    if (format === "none") continue;
    const story = dir.replace(/-\d{13}$/, "").replace(/-seeded-.*$|-(osaurus-qwen|osaurus|local26|stock|e4b)$/, "");
    const v = craftVerdict(transcript, headlineDrawn(run));
    rows.push({ dir, story, arm: armOf(dir), format, heldout: heldout.some((h) => story.startsWith(h)), ...v });
  }
  const gold = rows.filter((r) => r.gold && !r.heldout);
  const tally = (xs: typeof rows, k: "arm" | "format") => Object.fromEntries([...new Set(xs.map((r) => r[k]))].map((v) => [v, xs.filter((r) => r[k] === v).length]));
  console.log(`craft legs since ${new Date(since).toISOString().slice(0, 10)}: ${rows.length}; gold candidates (held-out excluded): ${gold.length}; distinct stories: ${new Set(gold.map((r) => r.story)).size}`);
  console.log("by arm", tally(gold, "arm"), "by format", tally(gold, "format"));
  const why: Record<string, number> = {};
  for (const r of rows.filter((r) => !r.gold)) for (const g of r.rejected) why[g] = (why[g] ?? 0) + 1;
  console.log("rejections", why);
  const out = arg("--json");
  if (out) writeFileSync(out, JSON.stringify(gold, null, 1));
}
