// WHAT "THE FLOW'S PROSE" MEANS, now that it lives in six files.
//
// Before the phase split, a guard that asserted "the flow says X" read one file. After it, the
// same claim spans the root (what holds at every moment: voice, gates table, Never, recovery)
// plus the five phase skills. A test re-pointed at the ROOT alone would silently stop checking
// anything — the exact failure the import guard just came out of (registry E16: a green check
// that inspected nothing).
//
// So the concept is written once, here, and the guards read it. Two properties matter:
//
//  · ORDER. The files are concatenated in FLOW order, so a guard that asserts "X appears before
//    Y" still means what it meant — the reader meets these rules in this sequence.
//  · COMPLETENESS. The list is derived from the phase skills that exist on disk, not hand-typed,
//    so a sixth phase skill joins the guards by existing. A hand-list would quietly leave the
//    next phase unchecked.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIR = join(import.meta.dir, "..", "..");

/** The phase skills, in the order a run meets them. */
export const PHASE_SKILLS = [
  "splash-input",
  "splash-cadrage",
  "splash-proposition",
  "splash-production",
  "splash-export",
] as const;

/** Every file that carries a rule of the journey, root first, then the phases in flow order. */
export function flowProseFiles(): string[] {
  const files = [join(SKILLS_DIR, "splash", "SKILL.md")];
  for (const s of PHASE_SKILLS) {
    const p = join(SKILLS_DIR, s, "SKILL.md");
    if (existsSync(p)) files.push(p);
  }
  return files;
}

/** The journey's prose, as one text, in the order a run meets it. */
export function flowProse(): string {
  return flowProseFiles()
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
}
