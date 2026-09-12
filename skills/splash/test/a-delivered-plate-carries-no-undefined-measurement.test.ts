/**
 * NO DELIVERED PLATE CARRIES AN UNDEFINED MEASUREMENT.
 *
 * THE DEFECT THIS EXISTS FOR. Eight directed components read `direction.stroke.hairline`, and not
 * one of the three filed directions carried that key. `strokeWidth={undefined}` drops the attribute
 * and the browser's own 1px default draws the line, so `nocturne` — whose rule is 0.8 — got the same
 * weight as `creme`, whose rule is 1, and the direction had quietly stopped being the thing that set
 * the plate. Where the component did arithmetic on it (`hairline * 2`, `hairline * 4`) the result
 * was `NaN`, and two beats SHIPPED `stroke-width="NaN"` into their delivered SVGs. Everything looked
 * almost right, because an invalid stroke width also falls back to 1.
 *
 * Rémy found it by eye, on a frame that was drawn a hair too light — which is the wrong way round.
 * A number that does not exist should not survive as far as a plate a reader sees.
 *
 * The check is on the DELIVERED artefact rather than on the source, because that is where the
 * question is actually settled: any arithmetic on any missing field, in any component, present or
 * future, lands here as `NaN` in an attribute. `read-direction.mjs` now derives `hairline` from the
 * filed `rule`; this file is what keeps the next missing field from being invisible.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");

/** `NaN`, `undefined`, `null` and `Infinity` as an attribute VALUE — the four shapes a missing
 *  number takes once React has stringified it into the markup. */
const BROKEN = /\b[a-zA-Z-]+="(NaN|undefined|null|-?Infinity)"/g;

const plates = readdirSync(PROOF).flatMap((beat) => {
  const dir = join(PROOF, beat, "renders");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => ({ beat, file: f, path: join(dir, f) }));
});

describe("a delivered plate", () => {
  it("should have delivered plates to measure", () => {
    expect(plates.length).toBeGreaterThan(20);
  });

  for (const { beat, file, path } of plates)
    it(`should carry no undefined measurement — ${beat}/${file}`, () => {
      const broken = [...readFileSync(path, "utf8").matchAll(BROKEN)].map((m) => m[0]);
      expect(
        [...new Set(broken)],
        `${beat}/renders/${file} carries ${[...new Set(broken)].join(", ")}. A missing number ` +
          `reached the markup: something read a field its direction, palette or data does not ` +
          `carry. Find the field — do not clamp the symptom.`,
      ).toEqual([]);
    });
});
