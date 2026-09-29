// Test support: finding the beats under `proof/` (and the archived ones under tests/fixtures/beats).
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { filesUnder } from "./tree.ts";

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const PROOF = join(ROOT, "proof");
export const ARCHIVE = join(ROOT, "tests", "fixtures", "beats");

/** Directory names under proof/ that are working material, not beats. None exists today. */
export const NOT_A_BEAT = new Set(["comparison", "seance", "trial"]);

/** Every beat directory directly under `root`, by name, in readdir order — `[]` when `root` is absent. */
export function beatsUnder(root: string = PROOF): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !NOT_A_BEAT.has(e.name))
    .map((e) => e.name);
}

/** The beats under `root` whose own directory holds `file` (a marker such as `BRIEF.md`). */
export function beatsWith(file: string, root: string = PROOF): string[] {
  return beatsUnder(root).filter((beat) => existsSync(join(root, beat, file)));
}

/** Every delivered web page: each `.html` anywhere under proof/ (dot-entries and node_modules skipped), sorted. */
export function deliveredPages(): string[] {
  return filesUnder(PROOF, (e) => e.name.endsWith(".html")).sort();
}

/** Every delivered plate: each `.svg` in a proof beat's own `renders/` folder. */
export function renderedPlates(): { beat: string; file: string; path: string }[] {
  return beatsUnder().flatMap((beat) => {
    const dir = join(PROOF, beat, "renders");
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".svg"))
      .map((f) => ({ beat, file: f, path: join(dir, f) }));
  });
}
