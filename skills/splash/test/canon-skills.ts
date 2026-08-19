/**
 * THE SUBJECT OF THE CANON GUARDS, discovered rather than typed.
 *
 * A skill "has a canon" when it carries all four canon assets: a seed's sample data, a preview
 * rendered from that seed, the script that renders it, and the output-proof a reader opens. Every
 * guard that checks a canon reads its subject from here, so a skill that grows one is walked from
 * that moment, and a skill that is left out has to say why in `EXCLUDED` — see
 * `canon-skills.test.ts`, which is the guard on this file.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/** All four, or the skill does not have a canon. */
export const CANON_ASSETS = [
  "scripts/render-preview.mjs",
  "assets/preview.png",
  "assets/sample-data",
  "output-proof",
] as const;

/**
 * A skill that carries all four and is still not walked, with the reason, in prose a reader can
 * disagree with. Empty is the correct state: an entry here is debt, and `canon-skills.test.ts`
 * refuses one whose reason is too short to be a reason.
 */
export const EXCLUDED: Record<string, string> = {};

export function canonSkills(): string[] {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((skill) =>
      CANON_ASSETS.every((asset) => existsSync(join(SKILLS, skill, asset))),
    )
    .filter((skill) => !(skill in EXCLUDED))
    .sort();
}
