/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * A craft skill's SEED is what the next beat is copied from. Measured on 2026-08-10, before this
 * guard existed: **twelve seed runners, eleven of which named `#FFFFFF` / `#0B7A75` as hex
 * literals, and zero of which called `readPalette`.** The palette mechanism the twin documents at
 * length — a recorded answer, an origin, a loud refusal instead of a default — reached fifteen of
 * seventy beats and none of the files a new beat starts life as a copy of. Fix the beats and leave
 * the seeds, and beat seventy-one arrives with the hex literal already in it.
 *
 * So this file asserts three things about every seed runner, and it DISCOVERS them by walking
 * `skills/*&#47;scripts/` for `render-*.mjs` rather than naming them. A craft skill added tomorrow is
 * guarded the moment its runner lands, with nobody remembering to wire it up. That is the whole
 * reason it walks; `seed-renders-standalone.test.ts`'s hand-written four-skill list is the standing
 * counter-example in this repository, and it omitted exactly the three skills this guard's own
 * chantier had to fix.
 *
 * WHAT IS EXCLUDED, AND WHY IT IS NOT A LOOPHOLE.
 *
 *   - `render-still.mjs` is the vendored LIBRARY, not a runner. Its `#000000`/`#FFFFFF` are the
 *     contrast POLES `deriveFurniture` escalates to — assigned to `ink`, never to `ground` or
 *     `accent` — and they are physics (WCAG's own endpoints), not a colour anybody chooses.
 *   - Nothing outside `skills/*&#47;scripts/render-*.mjs` is scanned at all. `palette`'s own
 *     `SUBJECT_CONVENTIONS` table is legitimately a list of hexes — it is the PROPOSAL source, the
 *     thing a journalist chooses FROM. `bake-plate.mjs`'s basemap paint and the sample-photo
 *     generators are likewise out of scope by construction.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **The 54 beats under `proof/` that still name a hex.** Pointing check 1 at `proof/` would turn
 *    the suite red on beats that already shipped — that is a migration, not a guard. This stops the
 *    backlog GROWING (a new beat is copied from a seed that reads its answer); it does not shrink
 *    it.
 * 2. **A literal laundered through arithmetic.** `const g = "#FFF" + "FFF";` defeats check 1's
 *    pattern. Check 2 is the answer to the obvious version of that (moving the literal one line up,
 *    out of a `ground:`/`accent:` position) but a determined obfuscation is not reachable by a
 *    regex, and a determined obfuscation is not the failure mode this repository has actually had.
 * 3. **Whether the colour READ is the colour DRAWN.** This proves the runner asks for a recorded
 *    answer and that the answer parses. It cannot prove the value reaches a `<text fill=>`.
 *    `seed-renders-standalone.test.ts` does that for four skills, by byte-comparing a real render.
 * 4. **`dw-beat`.** Its colour arrives through a Datawrapper spec field, not a ground/accent
 *    pair, and it has no `render-*.mjs` runner at all. A DW palette path is its own chantier.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
// A test-only cross-skill import, permitted specifically for this purpose (see where.test.ts's own
// comment on the same pattern, and format-shippability.test.ts's): `parsePalette` is the REAL
// validator every runner will hit at run time, and check 3 is worth nothing if this file
// reimplements it. Runtime code in this branch never crosses a skill boundary; this does, once.
import { parsePalette } from "../../chart-beat/scripts/render-still.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = join(SKILLS, "..");

/** Every `skills/<skill>/scripts/render-*.mjs` except the vendored `render-still.mjs` library. */
function seedRunners(): { skill: string; path: string; label: string }[] {
  const found: { skill: string; path: string; label: string }[] = [];
  for (const entry of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const scripts = join(SKILLS, entry.name, "scripts");
    if (!existsSync(scripts)) continue;
    for (const file of readdirSync(scripts)) {
      if (!/^render-.*\.mjs$/.test(file)) continue;
      if (file === "render-still.mjs") continue;
      const path = join(scripts, file);
      found.push({ skill: entry.name, path, label: relative(TWIN, path) });
    }
  }
  return found.sort((a, b) => a.label.localeCompare(b.label));
}

/** Comments removed, so a hex quoted inside a paragraph explaining why it is no longer there does
 *  not read as a literal. Every runner edited by this chantier carries exactly such a paragraph. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

const RUNNERS = seedRunners();

describe("a craft skill's seed reads a recorded palette, discovered rather than listed", () => {
  it("should find at least one runner per craft skill that ships a seed", () => {
    // If the walk breaks — a renamed directory, a changed suffix — every assertion below goes
    // vacuously green. This pins the premise instead of assuming it. Measured 2026-08-10: twelve
    // runners across seven craft skills.
    expect(RUNNERS.length).toBeGreaterThanOrEqual(10);
    const skills = new Set(RUNNERS.map((r) => r.skill));
    for (const skill of [
      "chart-beat",
      "chart-video",
      "chart-web",
      "map-beat",
      "map-web",
      "scrolly",
      "image-beat",
    ]) {
      expect([skill, skills.has(skill)]).toEqual([skill, true]);
    }
  });

  for (const { skill, path, label } of RUNNERS) {
    // CHECK 1 — no hex in a palette position.
    it(`${label} should name no hex colour in a ground or accent position`, () => {
      const src = stripComments(readFileSync(path, "utf8"));
      const offenders = [
        ...src.matchAll(/(ground|accent)\s*[:=]\s*"(#[0-9A-Fa-f]{3,8})"/g),
      ].map((m) => `${m[1]} = ${m[2]}`);
      expect([label, offenders]).toEqual([label, []]);
    });

    // CHECK 2 — no evasion. Without this, moving the literal one line up (`const G = "#FFFFFF";`
    // then `ground: G`) defeats check 1 entirely while changing nothing about the defect.
    it(`${label} should call readPalette if it names ground or accent at all`, () => {
      const src = stripComments(readFileSync(path, "utf8"));
      const namesAPalettePosition = /\b(ground|accent)\b/.test(src);
      const readsOne = /\breadPalette\s*\(/.test(src);
      // A runner that names neither is fine and needs nothing: map-web's own
      // render-preview.mjs delegates entirely to render-web.mjs's `render()`.
      expect([label, namesAPalettePosition && !readsOne]).toEqual([
        label,
        false,
      ]);
    });

    // CHECK 3 — the recorded answer exists in the SKILL'S OWN DIRECTORY and parses. This is what
    // makes a copied skill directory self-contained: it carries its own answer, and renders alone.
    it(`${label}'s skill should hold a PALETTE.md that parsePalette accepts`, () => {
      const src = stripComments(readFileSync(path, "utf8"));
      if (!/\breadPalette\s*\(/.test(src)) return; // check 2 already covered this case
      const candidates = [
        join(SKILLS, skill, "PALETTE.md"),
        join(SKILLS, skill, "assets", "PALETTE.md"),
      ];
      const answer = candidates.find((p) => existsSync(p));
      expect([
        label,
        answer
          ? relative(TWIN, answer)
          : candidates.map((p) => relative(TWIN, p)),
      ]).toEqual([label, relative(TWIN, candidates[0])]);
      // Not "the file exists" — the file is VALID, judged by the same parser the render will use.
      // A malformed `origin:` throws here rather than at somebody's first render.
      expect(() =>
        parsePalette(readFileSync(answer!, "utf8"), answer!),
      ).not.toThrow();
    });
  }
});
