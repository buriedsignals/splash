/**
 * A SLOT RECORDS ONE SIZE AND THE VIDEO SCAFFOLD ONLY EVER WROTE LANDSCAPE.
 *
 * `SIZES` draws three — landscape for YouTube and an article's column, portrait for stories, square
 * for a feed post — and the size is chosen at gate 2c and recorded on the slot. The video scaffolds
 * wrote `landscape` into four places and accepted no flag: the composition's own id, `Root.tsx`,
 * `build.mjs`'s `SIZE`, and the BRIEF's front matter. A journalist whose slot says `portrait` — the
 * whole reason portrait exists — received a landscape beat and had to hand-edit four files, in a
 * toolchain whose own rule is that a size is never a default anything falls back to.
 *
 * Measured 2026-09-23 producing a real story's video export at all three sizes: landscape rendered,
 * and the other two were refused by the pinned-size guard reading the artifact's own bytes — which
 * is the guard working, on a beat that could not have been produced any other way.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — the repository's own tooling is ESM JavaScript.
import { EXPORT_SIZE_NAMES } from "#shared/chart-video/sizes.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

/** The two scaffolds that write a Remotion composition: chart-video's and map-beat's. */
function videoScaffolds(): { name: string; source: string; templates: string }[] {
  const out: { name: string; source: string; templates: string }[] = [];
  for (const skill of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const scripts = join(SKILLS, skill.name, "scripts");
    let files: string[];
    try {
      files = readdirSync(scripts);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/^scaffold-.*video-beat\.mjs$/.test(file)) continue;
      const assets = join(SKILLS, skill.name, "assets", "video-beat-scaffold");
      let templates = "";
      try {
        templates = readdirSync(assets)
          .map((f) => readFileSync(join(assets, f), "utf8"))
          .join("\n");
      } catch {
        continue;
      }
      out.push({ name: `${skill.name}/${file}`, source: readFileSync(join(scripts, file), "utf8"), templates });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

describe("a video beat is scaffolded at its slot's size", () => {
  it("finds both video scaffolds, so this file cannot pass by looking at nothing", () => {
    expect(videoScaffolds().map((s) => s.name)).toEqual([
      "chart-video/scaffold-video-beat.mjs",
      "map-beat/scaffold-map-video-beat.mjs",
    ]);
  });

  it("takes --size, and refuses one the table does not draw", () => {
    const without = videoScaffolds()
      .filter(({ source }) => !/"--size"/.test(source))
      .map(({ name }) => name);
    expect(without).toEqual([]);
  });

  it("names every size the table draws in its own refusal, so an author is told the three", () => {
    for (const { name, source } of videoScaffolds())
      for (const size of EXPORT_SIZE_NAMES)
        expect({ name, size, named: source.includes(size) }).toEqual({ name, size, named: true });
  });

  it("writes the size into its templates through a token rather than as a literal", () => {
    const literal = videoScaffolds()
      .filter(({ templates }) => /\blandscape\b/.test(templates.replace(/^\s*(\/\/|\*|#).*$/gm, "")))
      .map(({ name }) => name);
    expect(literal).toEqual([]);
  });
});
