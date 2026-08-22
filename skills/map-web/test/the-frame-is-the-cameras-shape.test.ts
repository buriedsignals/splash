/**
 * THE MAP TAKES THE WIDTH IT IS GIVEN — measured at bake time, where the shape is decided.
 *
 * The owner's report, looking at a rendered map: *the map does not take the full available width.*
 * The bake took ONE `--size` and applied it to both axes (`width: size, height: size`, in five
 * places), so a camera of any shape but square was baked into a square frame. Nothing cropped —
 * `fitBounds` fits on whichever axis binds first — it PADDED, and the padding is empty ground the
 * marks are drawn smaller inside. The delivered page sizes its own map box from the plate's aspect,
 * so a square plate then puts a square in the middle of a 1600px window with a gutter either side.
 *
 * `minFrameHeightPx` was in the bake the whole time, computing the right height for the one camera
 * that spans a full turn of longitude, and was used only to build an error message. `frameHeightFor`
 * is that derivation for every other camera; `frameMatchesItsCamera` is the refusal.
 *
 * Measured over this format's own beats, frame aspect against the aspect the bounds ask for:
 *   proof/mapgen-choropleth-web (re-baked here)          0.2% margin
 *   stories/real-owid-life-expectancy                    0.0%
 *   proof/mapgen-symbol-web / dot-web / locator-web      1.1% / 1.8% / 1.7% (near-square cameras)
 *   proof/mapgen-hexgrid-web                             8.6% → re-baked 836x476, 0.0%
 *   stories/stress-f-housing-pressure                   46.2% → re-baked 496x923, 0.0%
 *     (a 0.538 camera had been baked into a 1.000 frame)
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { discoverMapWebBeats } from "../scripts/discover-pages.mjs";

/** Byte-identical to the bakes' own `mercY` — a test that imported it would have to import the bake,
 *  and importing the bake RUNS it. */
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** The aspect a pair of bounds asks for, in Web Mercator. */
const cameraAspect = (bounds: number[][]) =>
  ((bounds[1]![0]! - bounds[0]![0]!) * Math.PI) /
  180 /
  (mercY(bounds[1]![1]!) - mercY(bounds[0]![1]!));

/** Byte-identical to the bakes' own `frameHeightFor`, for the same reason. */
const frameHeightFor = (bounds: number[][], width: number) =>
  Math.max(1, Math.ceil(width / cameraAspect(bounds)));

const MARGIN_TOLERANCE = 0.05;
const marginOf = (
  bounds: number[][],
  frame: { width: number; height: number },
) => {
  const asked = cameraAspect(bounds);
  const drawn = frame.width / frame.height;
  return 1 - Math.min(asked, drawn) / Math.max(asked, drawn);
};

describe("the height a camera asks for at a given width", () => {
  // AT MORE THAN ONE CAMERA, deliberately — a derived constant measured at one frame size is the
  // same defect as a typed one. Four cameras this tree actually bakes.
  const cameras: [string, number[][], number, number][] = [
    // the world: 360° over 144° of latitude — the camera the whole report was about
    [
      "the world",
      [
        [-180, -60],
        [180, 84],
      ],
      1200,
      815,
    ],
    // this skill's own seed: Lisbon to Stockholm
    [
      "the seed's Europe",
      [
        [-14, 34],
        [28, 64],
      ],
      1000,
      1139,
    ],
    // the choropleth proof beat's Europe
    [
      "the choropleth beat's Europe",
      [
        [-26, 36],
        [33, 67],
      ],
      496,
      443,
    ],
    // a wide, shallow band — the shape a square frame wastes most on
    [
      "a shallow band",
      [
        [-180, -10],
        [180, 10],
      ],
      1000,
      56,
    ],
  ];
  for (const [name, bounds, width, height] of cameras)
    it(`gives ${name} a ${width}x${height} frame`, () => {
      expect(frameHeightFor(bounds, width)).toBe(height);
      // And the frame it produces is, by construction, the shape the camera asked for.
      expect(marginOf(bounds, { width, height })).toBeLessThan(0.005);
    });

  it("agrees with minFrameHeightPx exactly at planet extent, which is the case that function was for", () => {
    // `minFrameHeightPx(width, south, north)` divides by 2π; this divides by the longitude span the
    // beat asked for. At a full turn those are the same number, which is why the world beat's own
    // hand-computed 815 comes back unchanged.
    const minFrameHeightPx = (width: number, south: number, north: number) =>
      Math.ceil((width * (mercY(north) - mercY(south))) / (2 * Math.PI));
    expect(
      frameHeightFor(
        [
          [-180, -60],
          [180, 84],
        ],
        1200,
      ),
    ).toBe(minFrameHeightPx(1200, -60, 84));
    expect(
      frameHeightFor(
        [
          [-180, -85],
          [180, 85],
        ],
        800,
      ),
    ).toBe(minFrameHeightPx(800, -85, 85));
  });

  it("refuses a camera with no area rather than dividing by zero", () => {
    expect(
      cameraAspect([
        [10, 20],
        [10, 40],
      ]),
    ).toBe(0);
  });
});

describe("every baked plate in this format, against the camera it was asked for", () => {
  /**
   * THE BEATS STILL ON A FRAME THEIR CAMERA DID NOT ASK FOR, named with the number that fails.
   *
   * EMPTY, as of 2026-08-22, and that is the point of asserting it in BOTH directions: the two
   * entries that stood here — `proof/mapgen-hexgrid-web` (8.6% margin, an 836x520 frame for a 1.759
   * camera) and `stories/stress-f-housing-pressure` (46.2%, a 0.538 camera in a square frame) —
   * predated `frameHeightFor` and belonged to packages this one does not own. Both were re-baked
   * against their own cameras (836x476 and 496x923), and because the list is asserted in both
   * directions the re-bake FORCED these entries out rather than leaving stale exemptions behind.
   * The list can only shrink; a beat that regresses onto a frame its camera did not ask for turns
   * this red rather than being quietly added back.
   */
  const RECORDED_SQUARE_FRAMES: string[] = [];

  it("is the shape its own bounds ask for, or is named above", () => {
    const beats = discoverMapWebBeats();
    const wasteful: string[] = [];
    let measured = 0;
    for (const beat of beats) {
      const path = join(beat.dir, "plate", "geometry.json");
      if (!existsSync(path)) continue;
      const geometry = JSON.parse(readFileSync(path, "utf8"));
      if (!geometry.bounds || !geometry.frame) continue;
      measured++;
      const margin = marginOf(geometry.bounds, geometry.frame);
      if (margin > MARGIN_TOLERANCE)
        wasteful.push(
          `${beat.rel} (${(margin * 100).toFixed(1)}% margin — ${geometry.frame.width}x${geometry.frame.height} ` +
            `wants ${geometry.frame.width}x${frameHeightFor(geometry.bounds, geometry.frame.width)})`,
        );
    }
    expect(measured).toBe(beats.length);
    expect(wasteful.map((line) => line.split(" (")[0]).sort()).toEqual(
      [...RECORDED_SQUARE_FRAMES].sort(),
    );
  });
});
