/**
 * THE PIXEL ROUTE, AND THE TWO WAYS IT WAS WRONG BEFORE IT WAS RIGHT.
 *
 * The computed-style route (`harvest-styles.mjs`) reaches type everywhere and marks wherever they
 * are SVG. It reaches nothing on a poster, a canvas chart or a video frame — measured on
 * informationisbeautiful.net, where four pieces returned 17-23 type tuples and ZERO mark colours.
 * Those artifacts carry a full art direction and this is how it is taken.
 *
 * The two tests that name a defect are the point of this file. Both defects produced a confident,
 * green, wrong answer on a real published artifact, and both would be reintroduced by anyone who
 * reached for the obvious arithmetic.
 *
 * Fixtures are painted into a temp directory rather than committed: they are derived from the four
 * `paint` calls below, so committing them would be one decision in two places.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { readPixelPalette } from "../../../scripts/design-base/pixel-palette.mjs";

let DIR: string;
beforeAll(() => {
  DIR = mkdtempSync(join(tmpdir(), "splash-palette-"));
});
afterAll(() => {
  rmSync(DIR, { recursive: true, force: true });
});

/**
 * Paint a 100x100 image: a white ground, with `bands` as equal vertical stripes across the left
 * 40%. The ground stays the modal colour, which is what every real artifact looks like and what
 * makes the sparse-graphic case below a real case rather than a contrived one.
 */
function paint(name: string, bands: Array<[number, number, number]>): string {
  const png = new PNG({ width: 100, height: 100 });
  for (let y = 0; y < 100; y += 1)
    for (let x = 0; x < 100; x += 1) {
      const i = (100 * y + x) << 2;
      const band: [number, number, number] =
        x < 40
          ? bands[
              Math.min(bands.length - 1, Math.floor((x / 40) * bands.length))
            ]
          : [255, 255, 255];
      png.data[i] = band[0];
      png.data[i + 1] = band[1];
      png.data[i + 2] = band[2];
      png.data[i + 3] = 255;
    }
  const path = join(DIR, `${name}.png`);
  writeFileSync(path, PNG.sync.write(png));
  return path;
}

describe("the pixel route", () => {
  it("should report the modal colour as the ground", () => {
    const out = readPixelPalette(paint("one", [[228, 30, 38]]));
    expect(out.ground.hex).toBe("#FFFFFF");
  });

  it("should call two opposed hues diverging, not categorical", () => {
    // THE DEFECT THIS CLOSES. A first version used `max(hue) - min(hue)` and called the IIB
    // "Left vs. Right" poster CATEGORICAL at 207 degrees — a poster whose entire mechanism is two
    // opposed poles, each with its own tint ramp. Spread cannot tell two clusters from six: it
    // reports the same number either way. Cluster count decides.
    const out = readPixelPalette(
      paint("two", [
        [228, 30, 38],
        [17, 106, 181],
      ]),
    );
    expect(out.shape).toBe("diverging");
    expect(out.clusters).toHaveLength(2);
  });

  it("should call four separated hues categorical", () => {
    const out = readPixelPalette(
      paint("four", [
        [228, 30, 38],
        [17, 106, 181],
        [255, 228, 51],
        [89, 93, 156],
      ]),
    );
    expect(out.shape).toBe("categorical");
  });

  it("should treat hue as circular, so a red at 358 and a red at 2 are one pole", () => {
    // 358 and 2 are four degrees apart, not 356. Without this a single red pole splits in two and
    // a monochrome artifact reports as diverging.
    const out = readPixelPalette(
      paint("wrap", [
        [255, 0, 10],
        [255, 10, 0],
      ]),
    );
    expect(out.clusters).toHaveLength(1);
  });

  it("should read a near-white tinted ground as furniture, not as the palette", () => {
    // MEASURED ON A REAL ARTIFACT. ABC's cream ground #FFFCEE has an HSL saturation of 1.0 —
    // saturation runs away near white, where a two-percent warmth reads as fully saturated. Counted
    // as palette it outweighs the real accent by coverage and reports the piece as monochrome at
    // its own ground's hue. Colourfulness, not HSL saturation, is what separates a mark from a
    // tinted paper.
    const out = readPixelPalette(
      paint("cream", [
        [255, 252, 238],
        [23, 87, 182],
      ]),
    );
    expect(out.chromatic.map((c) => c.hex)).not.toContain("#FFFCEE");
    expect(out.neutral.map((c) => c.hex)).toContain("#FFFCEE");
    expect(out.chromatic[0].hex).toBe("#1757B6");
  });

  it("should read a near-black tinted ink as furniture too", () => {
    // The same failure at the other pole: a warm near-black is ink, not an accent.
    const out = readPixelPalette(
      paint("charcoal", [
        [20, 17, 12],
        [23, 87, 182],
      ]),
    );
    expect(out.chromatic.map((c) => c.hex)).not.toContain("#141110");
    expect(out.chromatic[0].hex).toBe("#1757B6");
  });

  it("should find every pole on a sparse graphic, where each covers under one percent", () => {
    // THE DEFECT THIS CLOSES. An absolute noise floor of 0.4% of all pixels called the IIB
    // "Who's Suing Whom in AI" network MONOCHROME — six hues from 5 to 331 degrees, each covering
    // ~0.3% of a page that is 90.9% white. On a sparse graphic every real pole sits under any
    // absolute floor. The floor is relative to the COLOURED INK, never to the image.
    const png = new PNG({ width: 200, height: 200 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 255;
      png.data[i + 1] = 255;
      png.data[i + 2] = 255;
      png.data[i + 3] = 255;
    }
    const poles: Array<[number, number, number]> = [
      [228, 30, 38],
      [17, 106, 181],
      [255, 228, 51],
    ];
    poles.forEach((c, k) => {
      for (let y = 0; y < 12; y += 1)
        for (let x = 0; x < 12; x += 1) {
          const i = (200 * (10 + y) + (10 + k * 20 + x)) << 2;
          png.data[i] = c[0];
          png.data[i + 1] = c[1];
          png.data[i + 2] = c[2];
        }
    });
    const path = join(DIR, "sparse.png");
    writeFileSync(path, PNG.sync.write(png));

    const out = readPixelPalette(path);
    expect(out.ground.hex).toBe("#FFFFFF");
    // Each pole is 144 of 40 000 pixels — 0.36%, under any absolute floor worth having.
    expect(out.chromatic.every((c) => c.share < 0.01)).toBe(true);
    expect(out.clusters).toHaveLength(3);
    expect(out.shape).toBe("categorical");
  });
});
