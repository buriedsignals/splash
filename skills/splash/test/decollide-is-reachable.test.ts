/**
 * ROUND-FIVE FINDING T4: THE DE-COLLISION NO VIDEO COMPONENT COULD CALL.
 *
 * `decollide` was declared only in `render-still.mjs`, which imports `@resvg/resvg-js` at module
 * load. A Remotion component is bundled for a browser and cannot resolve a native addon, so the one
 * de-collision this toolchain offers was present in every video format's file tree and impossible
 * to call from any of them — `stress-t-europe-recycling` placed its two map labels by hand and said
 * so in its own maintainer notes.
 *
 * `scripts/decollide.mjs` is the same function (held byte-identical to every `render-still.mjs`
 * copy by `guard-copies-parity.test.ts`) in a module that imports NOTHING. This file is what holds
 * it to that, by READING the modules rather than trusting a sentence in a header — and it pins the
 * premise as well as the fix, because a walk that only checked the new files would go green on the
 * day `render-still.mjs` stopped importing a rasteriser and the whole finding evaporated.
 *
 * The population is walked, never listed: every `scripts/decollide.mjs` under `skills/`.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/** Every skill that carries a standalone de-collision module, found rather than named. */
function browserSideCopies(): { skill: string; file: string }[] {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ skill: entry.name, file: join(SKILLS, entry.name, "scripts", "decollide.mjs") }))
    .filter((one) => existsSync(one.file));
}

/** Every `import`/`require` a module states, static or dynamic. A module that names none of them
 *  cannot drag a native addon into a bundle, whatever the bundler does. */
function importsOf(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/^\s*import\s.*?from\s*["'`]([^"'`]+)["'`]/gm))
    found.push(match[1]!);
  for (const match of source.matchAll(/\b(?:await\s+)?import\s*\(\s*["'`]([^"'`]+)["'`]/g))
    found.push(match[1]!);
  for (const match of source.matchAll(/\brequire\s*\(\s*["'`]([^"'`]+)["'`]/g))
    found.push(match[1]!);
  return found;
}

describe("decollide is reachable from a component a browser bundles", () => {
  const copies = browserSideCopies();

  it("finds one standalone copy per skill that draws its own geometry", () => {
    // Seven skills carry `render-still.mjs` and its `decollide`; every one of them needs the
    // browser-side module, because every one of them can be asked for a web or video beat.
    expect(copies.map((one) => one.skill).sort()).toEqual([
      "chart-beat",
      "chart-video",
      "chart-web",
      "image-beat",
      "map-beat",
      "map-web",
      "scrolly",
    ]);
  });

  for (const { skill, file } of copies)
    it(`${skill}'s standalone copy imports nothing at all`, () => {
      expect([skill, importsOf(readFileSync(file, "utf8"))]).toEqual([skill, []]);
    });

  // THE PREMISE, PINNED. Without this the walk above would stay green on a tree where the whole
  // finding had gone away, and nobody would know which of the two had happened.
  for (const { skill } of copies)
    it(`${skill}'s render-still.mjs still imports the rasteriser this exists to escape`, () => {
      const rendered = join(SKILLS, skill, "scripts", "render-still.mjs");
      expect([skill, importsOf(readFileSync(rendered, "utf8")).some((one) => one.includes("resvg"))]).toEqual([
        skill,
        true,
      ]);
    });
});
