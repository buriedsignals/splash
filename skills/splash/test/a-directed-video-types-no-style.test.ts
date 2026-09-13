/**
 * A DIRECTED VIDEO TAKES ITS STYLE FROM ITS DIRECTION, OR IT IS NOT DIRECTED.
 *
 * The video beats that predate the design base type everything: `FONT_FAMILY = "Helvetica…"`,
 * `TITLE: { fontSize: 38, fontWeight: 700, lead: 48 }`, a hex per mark. A directed video receives
 * its registers (`videoRegistersOf`) and its direction's colours as props, so any of those literals
 * in its composition is a value the direction no longer controls — and the second direction is
 * where it shows. The static twin of this guard scans only `render-directions.mjs` beats.
 *
 * WHAT IT DOES NOT CATCH: a literal hidden behind a variable (`const s = 38; fontSize={s}`), or a
 * colour computed by `mix` from a typed hex. It reads source text.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");

const RULES: Array<[string, RegExp]> = [
  ["a typed font size", /fontSize\s*[:=]\s*\{?\s*\d/],
  ["a typed font weight", /fontWeight\s*[:=]\s*\{?\s*\d/],
  ["a typed lead", /\blead\s*:\s*\d/],
  ["a typed line height", /lineHeight\s*[:=]\s*\{?\s*\d/],
  ["a typed tracking", /letterSpacing\s*[:=]\s*\{?\s*-?\d*\.?\d*[1-9]/],
  ["a typed family", /(FONT_FAMILY|fontFamily)\s*[:=]\s*\{?\s*["'`][A-Z]/],
  ["a typed colour", /["'`]#[0-9a-fA-F]{3,8}["'`]/],
];

export function typedStylesIn(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return RULES.filter(([, re]) => re.test(code)).map(([name]) => name);
}

function directedVideos(): string[] {
  const proof = join(ROOT, "proof");
  const out: string[] = [];
  for (const dir of readdirSync(proof)) {
    const beat = join(proof, dir);
    if (!existsSync(join(beat, "render-directions-video.mjs"))) continue;
    for (const file of readdirSync(beat))
      if (/^Directed.*Video\.tsx$/.test(file)) out.push(join(beat, file));
  }
  return out;
}

describe("the scanner", () => {
  it("should find a typed size", () => {
    expect(typedStylesIn(`<text fontSize={38}>`)).toEqual([
      "a typed font size",
    ]);
  });
  it("should find a typed lead in a token table", () => {
    expect(typedStylesIn(`const T = { lead: 48 };`)).toEqual(["a typed lead"]);
  });
  it("should find a typed colour", () => {
    expect(typedStylesIn(`fill="#aac9e0"`)).toEqual(["a typed colour"]);
  });
  it("should find a typed family", () => {
    expect(
      typedStylesIn(`export let FONT_FAMILY = "Open Sans, Helvetica";`),
    ).toEqual(["a typed family"]);
  });
  it("should accept a composition that draws from its registers", () => {
    const source = `<text fontSize={r.display.fontSize} fontWeight={r.display.fontWeight} fill={ink}
      letterSpacing={0} fontFamily={r.display.fontFamily} y={top + r.display.lead}>`;
    expect(typedStylesIn(source)).toEqual([]);
  });
  it("should not read a size written in a comment", () => {
    expect(
      typedStylesIn(
        `// it used to say fontSize: 38\n<text fontSize={r.body.fontSize}>`,
      ),
    ).toEqual([]);
  });
});

describe("every directed video in the tree", () => {
  for (const path of directedVideos()) {
    it(`${path.slice(ROOT.length + 1)} should type no style`, () => {
      expect(typedStylesIn(readFileSync(path, "utf8"))).toEqual([]);
    });
  }
});
