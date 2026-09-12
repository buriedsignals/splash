/**
 * EVERY TEXT RUN CLEARS ITS FLOOR AGAINST WHAT IS ACTUALLY BEHIND IT.
 *
 * Not against the plate's ground — against the composited pixels the reader sees. The difference is
 * the whole point: a label's ink is chosen with `adjustToContrast(accent, ground)` and then drawn on
 * a BAND, whose fill is not the ground. Twice in this tree that produced an accent number over a
 * pale stream and a mint number over a mint band, and both cleared every floor the tree measured,
 * because the floor was measured against the wrong thing. Rémy read the render and said the text was
 * not legible; nothing red anywhere.
 *
 * `scripts/design-base/text-contrast.mjs` reads the delivered PNG rather than the markup, and its
 * header records why: an era band carrying `opacity="0.09"` and a streamgraph whose bands are paths
 * both defeated the markup reader, each producing a false 1.00.
 */
// LANE: heavy
import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync, statSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  runsUnderTheContrastFloor,
  contrastOf,
} from "../../../scripts/design-base/text-contrast.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");

const plates = readdirSync(PROOF)
  .map((beat) => ({ beat, dir: join(PROOF, beat, "renders") }))
  .filter(({ dir }) => existsSync(dir) && statSync(dir).isDirectory())
  .flatMap(({ beat, dir }) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".svg") && existsSync(join(dir, f.replace(".svg", ".png"))))
      .map((f) => ({
        name: `${beat}/${f}`,
        svg: join(dir, f),
        png: join(dir, f.replace(".svg", ".png")),
      })),
  );

describe("a delivered plate's text", () => {
  it("should have plates to measure", () => {
    expect(plates.length).toBeGreaterThan(10);
  });

  for (const plate of plates)
    it(
      `should clear its contrast floor against the pixels behind it — ${plate.name}`,
      () => {
        const findings = runsUnderTheContrastFloor(plate.svg, plate.png);
        expect(
          findings.map(
            (f) =>
              `"${f.text}" ${f.fill} on ${f.ground} = ${f.ratio.toFixed(2)} : 1, floor ${f.floor}`,
          ),
        ).toEqual([]);
      },
      30_000,
    );
});

describe("the contrast reader", () => {
  const probe = (fill: string, band: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80">` +
    `<rect x="0" y="0" width="200" height="80" fill="#FFFFFF"/>` +
    `<rect x="10" y="20" width="180" height="40" fill="${band}"/>` +
    // A Google family the ladders really hold — see the note in the ink reader's own probe.
    `<text x="20" y="46" font-family="Open Sans" font-size="14" font-weight="400" fill="${fill}">42 TWh</text>` +
    `</svg>`;

  const measure = (fill: string, band: string) => {
    const svg = probe(fill, band);
    // The probe is written OUTSIDE the repository: a guard that leaves artifacts in the tree it
    // guards is a guard that will one day be measuring its own droppings.
    const svgPath = join(tmpdir(), `contrast-probe-${fill.slice(1)}-${band.slice(1)}.svg`);
    const pngPath = svgPath.replace(".svg", ".png");
    writeFileSync(svgPath, svg);
    writeFileSync(pngPath, new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
    const findings = runsUnderTheContrastFloor(svgPath, pngPath);
    rmSync(svgPath, { force: true });
    rmSync(pngPath, { force: true });
    return findings;
  };

  it("should refuse ink that fails against the band it sits on, not against the page", () => {
    // Pale accent text on a pale band: fine against the white page, illegible where it actually is.
    const findings = measure("#8FB8E8", "#C9DDF3");
    expect(findings).toHaveLength(1);
    expect(findings[0].ratio).toBeLessThan(4.5);
  });

  it("should pass ink that clears the floor where it sits", () => {
    expect(measure("#10203A", "#C9DDF3")).toEqual([]);
  });

  it("should compute the WCAG ratio", () => {
    expect(contrastOf([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastOf([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
  });
});
