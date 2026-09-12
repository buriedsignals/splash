/**
 * EVERY COLOUR ON A DIRECTED PLATE COMES FROM THE DIRECTION.
 *
 * A filed direction carries three colours — a ground, an ink and an accent, each measured on a real
 * published graphic — and everything a beat draws is derived from those three: `deriveFurniture`
 * for the neutrals, `mix` for steps between them, `adjustToContrast` for the floors. That is the
 * whole point of composing a plate from a direction rather than styling one.
 *
 * THE DEFECT THIS EXISTS FOR, measured twice on one plate in one afternoon. The marimekko needed
 * nine fills. Its first version made them steps of one grey and the plate read as black and white;
 * its second imported the grounded subject conventions — `#1B7F4B` for renewables, `#3A3A3A` for
 * fossil — and set them beside whichever accent the direction had chosen. Three imported hexes and
 * a direction's own accent is not a palette, it is four palettes on one plate, and
 * `skills/palette/scripts/palette.mjs` says why in its own header: it returns exactly ONE
 * convention, as a chart's single accent, because "a story about coal-fired power replacing hydro
 * is not two accents, it is a choice the journalist makes".
 *
 * The rule that survived: order the categories where they can be ordered and ramp the DIRECTION's
 * own accent along them; where they cannot, one accent against one neutral. Either way, no beat
 * names a colour. This file is what makes that mechanical instead of remembered.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
const HEX = /#[0-9a-fA-F]{6}\b/g;

/** Comments are where this corpus records what it measured, and those records quote the hexes they
 *  are about — the IEA's `#A1A1A1`, a rejected `#1B7F4B`. A guard that could not tell a quotation
 *  from an instruction would push its own evidence out of the tree. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** The files that DRAW a directed plate: the component and the script that renders it. */
const files = readdirSync(PROOF)
  .flatMap((beat) => {
    const dir = join(PROOF, beat);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
    return readdirSync(dir)
      .filter((f) => /^Directed.*\.tsx$/.test(f) || f === "render-directions.mjs")
      .map((f) => ({ beat, file: f, path: join(dir, f) }));
  })
  .filter(({ path }) => existsSync(path));

describe("a directed plate", () => {
  it("should have directed components to measure", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const { beat, file, path } of files)
    it(`should name no colour of its own — ${beat}/${file}`, () => {
      const named = [...code(readFileSync(path, "utf8")).matchAll(HEX)].map((m) => m[0]);
      expect(
        named,
        `${beat}/${file} names ${named.join(", ")}. A directed plate's colours come from the ` +
          `direction — ground, ink, accent — through deriveFurniture, mix and adjustToContrast. ` +
          `An imported hex sits beside whatever accent the direction set, and the two were not ` +
          `chosen together.`,
      ).toEqual([]);
    });
});
