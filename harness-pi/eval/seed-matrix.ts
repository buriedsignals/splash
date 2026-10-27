// The phase-2 measurement matrix from the families' static seeds (eval/seeds/gx-<slug>/): one seed per further
// format (STORYBOARD.md and data.json told the format), one scripted-journalist sheet per story and format, and the
// list of runs — every type in static, one type per family in web, video and scrolly — for run-eval.ts --seeds.
// Usage: bun harness-pi/eval/seed-matrix.ts [--run] [--only <family,…>]   (writes the derived seeds and sheets, prints
// the run list; --run then runs it one at a time through run-eval's evaluate, stopped at the craft render)
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { familyOf } from "../src/adapters.ts";
import { evaluate } from "./run-eval.ts";

const EVAL = resolve(import.meta.dirname);
const SEEDS = join(EVAL, "seeds");
const SHEETS = join(EVAL, "sheets");
const FURTHER = ["web", "video", "scrolly"] as const;
const PUBLICATION: Record<string, string> = {
  static: "Static.",
  web: "Interactive web.",
  video: "Video.",
  scrolly: "Scrollytelling.",
};

/** STORYBOARD.md front matter as flat key → value (the fields a sheet answers with). */
function front(text: string): Record<string, string> {
  const block = text.split("---")[1] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/^(\w+):\s*"?(.*?)"?\s*$/gm)].map((m) => [
      m[1],
      m[2].replace(/\\"/g, '"'),
    ]),
  );
}

/** A seed told another format: its slot's format in STORYBOARD.md and data.json; a static size does not travel. */
export function deriveSeed(from: string, to: string, format: string) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  const storyboard = join(to, "STORYBOARD.md");
  writeFileSync(
    storyboard,
    readFileSync(storyboard, "utf8")
      .replace(/^(\s*)format:\s*static\s*$/m, `$1format: ${format}`)
      .replace(/^\s*size:.*\n/m, format === "static" ? "$&" : ""),
  );
  const data = join(to, "beats", "1", "data.json");
  const table = JSON.parse(readFileSync(data, "utf8"));
  table.slot = { ...table.slot, format };
  writeFileSync(data, JSON.stringify(table));
}

/** The scripted journalist's sheet for a seeded run: the storyboard's own answers (craft-only runs barely ask). */
export function sheetOf(storyboard: string, format: string) {
  const f = front(storyboard);
  return {
    takeaway: f.takeaway,
    subject: f.subject,
    comparison: f.comparison,
    limits: f.limits,
    placement: f.placement,
    credit: f.credit,
    language: f.language,
    medium: "A chart.",
    publication: PUBLICATION[format],
    reference: "No reference, thank you.",
  };
}

if (import.meta.main) {
  const statics = existsSync(SEEDS)
    ? readdirSync(SEEDS).filter((d) => /^gx-[^.]+$/.test(d))
    : [];
  const runs: { story: string; variant: string; seed: string }[] = [];
  const firstOfFamily = new Map<string, string>();
  for (const dir of statics.sort()) {
    const slug = dir.slice(3);
    const seed = join(SEEDS, dir);
    const storyboard = readFileSync(join(seed, "STORYBOARD.md"), "utf8");
    writeFileSync(
      join(SHEETS, `${dir}.json`),
      `${JSON.stringify(sheetOf(storyboard, "static"), null, 2)}\n`,
    );
    runs.push({ story: dir, variant: "", seed });
    const family = familyOf(slug) ?? slug;
    if (!firstOfFamily.has(family)) firstOfFamily.set(family, dir);
  }
  for (const dir of firstOfFamily.values())
    for (const format of FURTHER) {
      const seed = join(SEEDS, `${dir}.${format}`);
      deriveSeed(join(SEEDS, dir), seed, format);
      writeFileSync(
        join(SHEETS, `${dir}.${format}.json`),
        `${JSON.stringify(sheetOf(readFileSync(join(seed, "STORYBOARD.md"), "utf8"), format), null, 2)}\n`,
      );
      runs.push({ story: dir, variant: format, seed });
    }
  mkdirSync(SHEETS, { recursive: true });
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
  const chosen = runs.filter((r) => !only || only.includes(familyOf(r.story.slice(3)) ?? ""));
  for (const r of chosen) console.log(`${r.story}\t${r.variant || "static"}\t${r.seed}`);
  if (args.includes("--run")) {
    process.env.SPLASH_STOP_AFTER_CRAFT = "1";
    const out = join(EVAL, "results", `${new Date().toISOString().slice(0, 10)}-phase2.jsonl`);
    mkdirSync(join(EVAL, "results"), { recursive: true });
    for (const r of chosen) {
      const line = await evaluate(r.story, "stock", out, r.variant, r.seed);
      console.log(`${r.story} ${r.variant || "static"}: ${line.phase} ${line.wallSeconds}s`);
    }
  }
}
