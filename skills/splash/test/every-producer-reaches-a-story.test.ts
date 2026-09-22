/**
 * A PRODUCER THAT ONLY WORKS IN THE CATALOGUE IS NOT A PRODUCER A JOURNALIST HAS.
 *
 * Measured 2026-09-23, trying to take the second export of a real story: four of the seven scaffolds
 * refused the location outright — `--beat must name a folder directly under proof/`. Static chart,
 * scrolly and static map already accepted a story's own `beats/`; web chart, video chart, map video
 * and web map did not. So a journalist could produce a static chart, a scrolly and a static map, and
 * nothing else, however many formats the storyboard offered them at gate 2b.
 *
 * It is not a small gap. A scaffold is the only thing that writes `BRIEF.md`, and without a brief
 * `OUTPUT-REVIEW.json` cannot bind, so gate G3 never closes and the beat never reaches delivery.
 * Four of the four exports the catalogue advertises were unreachable from a story for that reason.
 *
 * This walks the scaffolds themselves rather than a list, so a new producer is covered the day it
 * lands and a producer that regresses is named.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/** Every `scaffold-*.mjs` any skill ships — discovered, so the population cannot silently shrink. */
function scaffolds() {
  const found: { skill: string; file: string; path: string }[] = [];
  for (const skill of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const dir = join(SKILLS, skill.name, "scripts");
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of entries) {
      if (/^scaffold-.*\.mjs$/.test(file))
        found.push({ skill: skill.name, file, path: join(dir, file) });
    }
  }
  return found.sort((a, b) => a.file.localeCompare(b.file));
}

describe("every scaffold a journalist can be sent to", () => {
  it("finds the producers at all, so this file cannot pass by looking at nothing", () => {
    expect(scaffolds().length).toBeGreaterThanOrEqual(7);
  });

  it("accepts a beat under a story's own beats/, not only under proof/", () => {
    const catalogueOnly = scaffolds().filter(({ path }) => {
      const source = readFileSync(path, "utf8");
      // The refusal that matters, in the words each one uses: a location rule that admits `proof`
      // and nothing else. The three that were already right say "proof/ or a story's beats/".
      return /must name a folder directly under proof\/, got/.test(source);
    });
    expect(catalogueOnly.map(({ file }) => file)).toEqual([]);
  });
});
