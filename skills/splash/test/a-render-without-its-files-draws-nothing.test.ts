/**
 * THE CONTRE-ÉPREUVE: WITHOUT THE FILES, NOTHING IS DRAWN.
 *
 * `loadSystemFonts: false` is the load-bearing half of the typeface change, and it is the half
 * nobody can see working. With it left TRUE, a face resvg cannot find is silently replaced by one
 * the rendering machine happens to have: every PNG in this repository looks right on the laptop
 * that made it and arrives in another typeface on a newsroom's Linux box, with no error, no exit
 * code and no pixel difference anybody would notice HERE. That is the failure — a guard that is
 * satisfied by the machine it runs on.
 *
 * So this asserts the opposite property directly. Hand resvg the same markup with NO font files and
 * system fonts off, and it must produce nothing: no ink box, and a PNG that is the blank ground.
 * Hand it the files and the same markup must produce real ink. The gap between the two is the
 * mechanism; if it ever closes, `loadSystemFonts` has been turned back on somewhere and this goes
 * red rather than shipping a beat whose face depends on the machine.
 *
 * MUTATION THAT REDDENS IT: change `loadSystemFonts: false` to `true` in the "without" case below —
 * it starts drawing in a system face and the assertions fail. Change it in `render-still.mjs`'s
 * `rasterise` and the "every call site" case fails instead. Both directions are held.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { fontFilesForSvg } from "../../../shared/design-base/typefaces.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** French copy with the characters this repository's beats really set. */
const LINE = `Électricité bas-carbone — l’Albanie`;

/** TEXT AND NOTHING ELSE, so the ink box is the type's own. A background rectangle would give
 *  `getBBox()` something to measure whether or not a single letter was drawn, which is exactly the
 *  false green this test exists to avoid. */
const TEXT_ONLY =
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200">` +
  `<text x="20" y="120" font-family="Open Sans" font-size="48" font-weight="700">${LINE}</text></svg>`;

/** The same line on a ground — what a rasterised plate really looks like. */
const PLATE =
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200">` +
  `<rect width="900" height="200" fill="#FFFFFF"/>` +
  `<text x="20" y="120" font-family="Open Sans" font-size="48" font-weight="700">${LINE}</text></svg>`;

/** The weight of the rasterised plate. A flat white rectangle compresses to almost nothing; the
 *  same rectangle with a line of bold type on it does not. */
const pngBytes = (png: Uint8Array) => png.length;

describe("a render without its font files", () => {
  it("should produce no ink box at all, where the same markup with the files produces one", () => {
    const blind = new Resvg(TEXT_ONLY, {
      font: { loadSystemFonts: false, fontFiles: [] },
    }).getBBox();
    expect(blind).toBeUndefined();

    const files = fontFilesForSvg(TEXT_ONLY);
    expect(files.length).toBeGreaterThan(0);
    const seeing = new Resvg(TEXT_ONLY, {
      font: { loadSystemFonts: false, fontFiles: files },
    }).getBBox();
    expect(seeing).toBeDefined();
    expect(seeing!.width).toBeGreaterThan(400);
    expect(seeing!.height).toBeGreaterThan(20);
  });

  it("should rasterise to a blank plate, where the same markup with the files rasterises to ink", () => {
    const blind = new Resvg(PLATE, {
      font: { loadSystemFonts: false, fontFiles: [] },
    })
      .render()
      .asPng();
    const seeing = new Resvg(PLATE, {
      font: { loadSystemFonts: false, fontFiles: fontFilesForSvg(PLATE) },
    })
      .render()
      .asPng();
    // Measured on this markup: ~600 bytes blind against several thousand with the files.
    expect(pngBytes(blind)).toBeLessThan(2_000);
    expect(pngBytes(seeing)).toBeGreaterThan(4_000);
    expect(pngBytes(seeing)).toBeGreaterThan(pngBytes(blind) * 3);
  });

  it("should leave no resvg construction in the render path with system fonts switched on", () => {
    // The chokepoint, read as text. A call site that reverted would render correctly on this
    // machine and wrongly everywhere else, which no pixel assertion here could catch.
    for (const file of [
      "skills/chart-beat/scripts/render-still.mjs",
      "skills/chart-beat/scripts/inspect-render.mjs",
      "shared/chart-beat/render-still.mjs",
      "shared/chart-beat/inspect-render.mjs",
    ]) {
      const source = readFileSync(join(TWIN, file), "utf8");
      const constructions = [...source.matchAll(/new Resvg\(/g)];
      expect([file, constructions.length > 0]).toEqual([file, true]);
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect([file, code.includes("loadSystemFonts: true")]).toEqual([
        file,
        false,
      ]);
      // and every one of them is handed files
      expect([
        file,
        (code.match(/loadSystemFonts: false/g) ?? []).length,
      ]).toEqual([file, constructions.length]);
    }
  });
});
