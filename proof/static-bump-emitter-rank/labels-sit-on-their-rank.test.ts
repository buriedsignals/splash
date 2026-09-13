/**
 * A RANK LABEL SITS ON ITS OWN RANK, READ OFF THE DELIVERED SVG.
 *
 * MEASURED on the rapport render after the design base moved to Google Fonts: "2 Russia" came out
 * 11.5px ABOVE row 2, half-way to row 1, and the exits' names landed mid-plot on the lines. The
 * component declared `anchor: "end"` / `"start"` on each request but handed the arbiter `anchors`,
 * which was undefined — so every label accepted all four positions, `above` first. Under the old
 * system sans a label was too tall to fit between two rows, `above` collided, and the arbiter fell
 * back to the side by luck. Open Sans is shorter, `above` fit, and the luck ran out in one direction
 * of three.
 *
 * Read off the file, in every direction, because the defect only showed in the one whose metrics
 * happened to let it through.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RENDERS = join(import.meta.dirname, "renders");
const DIRECTIONS = ["creme", "rapport", "nocturne"];

function readPlate(svg: string) {
  const rows = [
    ...svg.matchAll(
      /<line x1="([\d.]+)" x2="([\d.]+)" y1="([\d.]+)" y2="([\d.]+)"/g,
    ),
  ]
    .filter((m) => m[1] !== m[2] && m[3] === m[4])
    .map((m) => Number(m[3]))
    .sort((a, b) => a - b);
  const labels = [
    ...svg.matchAll(
      /<text[^>]* y="([\d.]+)"[^>]* font-size="([\d.]+)"[^>]*>(\d+) ([^<]+)<\/text>/g,
    ),
  ].map((m) => ({
    baseline: Number(m[1]),
    fontSize: Number(m[2]),
    rank: Number(m[3]),
    text: `${m[3]} ${m[4]}`,
  }));
  return { rows, labels };
}

describe("a bump chart's rank labels", () => {
  for (const id of DIRECTIONS) {
    const file = join(RENDERS, `${id}.svg`);
    if (!existsSync(file)) continue;
    const { rows, labels } = readPlate(readFileSync(file, "utf8"));

    it(`should find its ten rows and its labels in ${id}, so nothing below goes vacuously green`, () => {
      expect([rows.length, labels.length >= 10]).toEqual([10, true]);
    });

    it(`should set every label on the row its rank names in ${id}`, () => {
      // A side-anchored label is centred on its row, so its baseline sits a little BELOW the row
      // line and well within half a font size of it. `above` puts the baseline over the line.
      const astray = labels
        .filter((l) => {
          const offset = l.baseline - rows[l.rank - 1];
          return offset <= 0 || offset >= l.fontSize / 2;
        })
        .map(
          (l) =>
            `${l.text} baseline ${l.baseline.toFixed(1)}, row ${rows[l.rank - 1].toFixed(1)}`,
        );
      expect(astray).toEqual([]);
    });
  }
});
