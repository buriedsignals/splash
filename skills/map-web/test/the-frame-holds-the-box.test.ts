/**
 * THE PLATE IS BAKED TO THE SHAPE OF THE BOX, NOT TO THE SHAPE OF ITS CAMERA.
 *
 * This file replaces `the-frame-is-the-cameras-shape.test.ts`, whose premise the owner overruled on
 * 2026-08-23: *the map must take all the available width, every time*, and then *the height is not
 * an editorial choice either — like the scrolly, it must take all the space available.*
 *
 * The retired premise was sound about the defect it fixed. A bake that took one `--size` and used
 * it on both axes put a square plate in a wide window, and `frameHeightFor` — the camera's own
 * Mercator aspect — corrected it. But a plate the camera's own shape and a BOX the container's own
 * shape are two different shapes, and the delivered page sized the box from the plate: Japan's
 * 1000x1089 plate is a correct bake of its camera, and it is exactly why the delivered page put a
 * 520.1px box in a 1568px container (33.2% of the width at 1600x900, 34.3% at 1280x800, 39.7% at
 * 2990x1600 — measured on the committed page before any of this was written).
 *
 * So the frame is now derived from BOTH: the camera decides where the study set is and how big, the
 * measured box range decides how much ocean has to sit around it, and `deliveryFrame` solves the two
 * inequalities that make every crop the delivery can ask for land on basemap.
 *
 * `frameHeightFor` is NOT removed from the bakes — it is one of nineteen byte-identical copies
 * (`splash/test/bake-parity.test.ts`) and `one-world-is-painted.test.ts` pins it against
 * `minFrameHeightPx` at planet extent. What changed is that this format's own bake no longer sizes
 * its frame with it.
 */
import { describe, expect, it } from "bun:test";
import {
  coversTo,
  deliveryFrame,
  frameCoversTheBoxRange,
  readBoxAspects,
  studyAspect,
  visibleBand,
} from "../scripts/delivery-frame.mjs";

/** The two cameras the report is about, with the box range each page actually delivers into,
 *  measured off the rendered page rather than chosen. */
const JAPAN = [
  [127.5, 29.5],
  [147.5, 46.5],
];
const SEED_EUROPE = [
  [-14, 34],
  [28, 64],
];

describe("studyAspect — the shape the geography asks for", () => {
  it("reads Japan's own bounds as portrait-ish", () => {
    expect(studyAspect(JAPAN)).toBeCloseTo(0.919, 3);
  });

  it("refuses a camera with no area rather than dividing by zero", () => {
    expect(() =>
      studyAspect([
        [10, 20],
        [10, 40],
      ]),
    ).toThrow(/no area/);
  });
});

describe("readBoxAspects — a range nobody measured is refused, never defaulted", () => {
  it("takes the pair a producer measured on the page", () => {
    expect(readBoxAspects([1.398, 2.768])).toEqual({
      narrowest: 1.398,
      widest: 2.768,
    });
    expect(readBoxAspects("1.398,2.768")).toEqual({
      narrowest: 1.398,
      widest: 2.768,
    });
  });

  it("refuses a side that is not a measurement", () => {
    expect(() => readBoxAspects([Number.NaN, 2.768])).toThrow(
      /narrowest is NaN/,
    );
    expect(() => readBoxAspects([1.398])).toThrow(/widest is undefined/);
    expect(() => readBoxAspects([0, 2])).toThrow(/narrowest is 0/);
  });

  it("refuses a range that runs backwards", () => {
    expect(() => readBoxAspects([2.768, 1.398])).toThrow(
      /narrower than narrowest/,
    );
  });
});

describe("deliveryFrame — the frame the delivered box actually needs", () => {
  it("gives Japan the ocean its own measured box range asks for", () => {
    // The page's own stage, measured at 1600x900, 1280x800, 375x812 and 2990x1600:
    // 2.768 / 2.676 / 1.398 / 2.310. The extremes are what the plate has to survive.
    const { frame, padding, studySet } = deliveryFrame(
      JAPAN,
      1600,
      [1.398, 2.768],
    );
    expect(frame).toEqual({ width: 1600, height: 578 });
    // Japan is drawn 532x578 in the middle of it, and the 1068px it does not use is sea and the
    // Asian and Pacific coasts either side — the picture a newsroom map of Japan actually is.
    expect(studySet).toEqual({ x: 534, y: 0, width: 532, height: 578 });
    expect(padding).toEqual({ top: 0, right: 534, bottom: 0, left: 534 });
  });

  it("asks for NO vertical margin when the narrowest box is still wider than the study set", () => {
    // Japan's narrowest box is 1.398:1 and Japan is 0.919:1, so a crop to 1.398 takes width, never
    // height. Margin on an axis nothing will ever crop is ocean nobody asked for, paid for in plate
    // pixels and in bytes.
    expect(deliveryFrame(JAPAN, 1600, [1.398, 2.768]).padding.top).toBe(0);
    // Widen the delivery to a phone-shaped box and the same camera does need vertical margin.
    expect(
      deliveryFrame(JAPAN, 1600, [0.617, 2.768]).padding.top,
    ).toBeGreaterThan(100);
  });

  it("keeps the study set at the size its own camera and width give it, whatever the range", () => {
    // The margin moves the frame around the study set; it never shrinks the study set inside a
    // fixed frame. Two ranges, same width: the drawn Japan is the same shape either way.
    const tight = deliveryFrame(JAPAN, 1600, [1.398, 2.768]).studySet;
    const wide = deliveryFrame(JAPAN, 1600, [0.617, 2.768]).studySet;
    expect(tight.width / tight.height).toBeCloseTo(wide.width / wide.height, 2);
    expect(tight.width).toBe(wide.width);
  });

  it("refuses a width that is not a measurement", () => {
    expect(() => deliveryFrame(JAPAN, Number.NaN, [1.4, 2.8])).toThrow(
      /nothing to bake into/,
    );
  });
});

describe("visibleBand — what a box of a given shape sees of a plate filled by cover", () => {
  it("is the whole frame when the box is exactly the plate's shape", () => {
    const frame = { width: 1600, height: 578 };
    const band = visibleBand(frame, 1600 / 578);
    expect(band.width).toBeCloseTo(1600, 6);
    expect(band.height).toBeCloseTo(578, 6);
  });

  it("takes height from a box wider than the plate and width from a box taller than it", () => {
    const frame = { width: 1600, height: 800 };
    expect(visibleBand(frame, 4).height).toBe(400);
    expect(visibleBand(frame, 4).width).toBe(1600);
    expect(visibleBand(frame, 1).width).toBe(800);
    expect(visibleBand(frame, 1).height).toBe(800);
  });
});

describe("frameCoversTheBoxRange — the refusal at bake time of a crop at delivery time", () => {
  it("passes the frame deliveryFrame just solved for, at both ends of the range", () => {
    const { frame, studySet } = deliveryFrame(JAPAN, 1600, [1.398, 2.768]);
    expect(() =>
      frameCoversTheBoxRange(frame, studySet, [1.398, 2.768]),
    ).not.toThrow();
    const seed = deliveryFrame(SEED_EUROPE, 1000, [0.817, 2.68]);
    expect(() =>
      frameCoversTheBoxRange(seed.frame, seed.studySet, [0.817, 2.68]),
    ).not.toThrow();
  });

  it("names the fraction of the SUBJECT a too-tall plate loses in a wide box", () => {
    // The Japan page exactly as it shipped: a 1000x1089 plate — the camera's own shape, no ocean
    // margin at all — in the 2.768:1 box the delivered page actually gives it.
    const shipped = { width: 1000, height: 1089 };
    const noMargin = { x: 0, y: 0, width: 1000, height: 1089 };
    expect(() =>
      frameCoversTheBoxRange(shipped, noMargin, [1.398, 2.768]),
    ).toThrow(/66\.8% of its height is cropped/);
  });

  it("names the fraction lost the other way, in a box narrower than the plate", () => {
    const wide = { width: 2000, height: 500 };
    const study = { x: 0, y: 0, width: 2000, height: 500 };
    expect(() => frameCoversTheBoxRange(wide, study, [0.5, 4])).toThrow(
      /of its width is cropped/,
    );
  });

  it("refuses a range nobody measured rather than answering about it", () => {
    const { frame, studySet } = deliveryFrame(JAPAN, 1600, [1.398, 2.768]);
    expect(() =>
      frameCoversTheBoxRange(frame, studySet, [Number.NaN, 2.768]),
    ).toThrow(/narrowest is NaN/);
  });
});

describe("coversTo — what a plate covers, which is not always what was asked for", () => {
  it("reports the range the solved frame was built for", () => {
    const { frame, studySet } = deliveryFrame(JAPAN, 1600, [1.398, 2.768]);
    const covered = coversTo(frame, studySet);
    expect(covered.widest).toBeCloseTo(2.768, 2);
    expect(covered.narrowest).toBeCloseTo(0.92, 2);
  });

  it("says a full-turn camera covers only its own aspect, because there is no more world", () => {
    // A world plate cannot be given margin to its east or west: past the world's own width MapLibre
    // draws a repeat continent carrying none of the beat's marks, which is what
    // `assertWorldFillsFrame` refuses. So the widest box such a plate covers IS its own aspect, and
    // every box wider than that crops latitude off the subject.
    const world = { width: 1200, height: 815 };
    const study = { x: 0, y: 0, width: 1200, height: 815 };
    expect(coversTo(world, study).widest).toBeCloseTo(1200 / 815, 6);
  });
});

describe("readBoxAspects — the three shapes a measured range travels in", () => {
  it("reads the flag's own string, an array, and the object geometry.json records", () => {
    // One decision, three callers: the CLI hands it a string, a test hands it a pair, and the bake
    // hands `frameCoversTheBoxRange` back the object `deliveryFrame` returned. A reader that took
    // only two of the three answered `narrowest is undefined` on a range that had been measured —
    // which is the silent direction wearing a loud costume: the refusal fires on a correct input.
    expect(readBoxAspects({ narrowest: 1.398, widest: 2.768 })).toEqual({
      narrowest: 1.398,
      widest: 2.768,
    });
  });
});

describe("the one study set this cannot be solved for, named rather than approximated", () => {
  const WORLD = [
    [-180, -60],
    [180, 84],
  ];

  it("says a full-turn camera cannot be given the margin a wide box needs", () => {
    // `stories/real-owid-life-expectancy` delivers into boxes from 1.317:1 to 2.572:1, and its
    // camera is the whole world at 1.472:1. Covering a 2.572:1 box needs a frame 629° of longitude
    // wide, and there are only 360.
    const solved = deliveryFrame(WORLD, 1200, [1.317, 2.572]);
    expect(solved.cannotCover).not.toBeNull();
    expect(solved.cannotCover.axis).toBe("longitude");
    expect(solved.cannotCover.frameLon).toBeGreaterThan(360);
    // And it falls back to the camera's own shape — the frame this beat already ships — rather than
    // to a frame with a repeat continent in it.
    expect(solved.frame).toEqual({ width: 1200, height: 815 });
    expect(solved.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("does not silence the refusal for a camera that CAN be given the margin", () => {
    // The same test the other way round, because an escape hatch that fires too easily is the
    // defect, not the hatch. Japan spans 20° and its frame asks for 60.2° — well inside a turn.
    const solved = deliveryFrame(JAPAN, 1600, [1.398, 2.768]);
    expect(solved.cannotCover).toBeNull();
  });

  it("lets the bake-time refusal stand down ONLY on a derived impossibility", () => {
    // `frameCoversTheBoxRange` returns early when handed `cannotCover`, and `deliveryFrame` is the
    // only thing that produces one. A shipped-as-is Japan plate with no such finding is still red.
    const shipped = { width: 1000, height: 1089 };
    const noMargin = { x: 0, y: 0, width: 1000, height: 1089 };
    expect(() => frameCoversTheBoxRange(shipped, noMargin, [1.398, 2.768], null)).toThrow();
    expect(() =>
      frameCoversTheBoxRange(shipped, noMargin, [1.398, 2.768], { axis: "longitude" }),
    ).not.toThrow();
  });
});
