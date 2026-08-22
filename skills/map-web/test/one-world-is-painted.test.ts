/**
 * AT PLANET EXTENT THE LIVE MAP PAINTED THREE WORLDS, AND NOTHING MEASURED IT.
 *
 * Measured with a real key on a 241-region world choropleth (`stories/real-owid-life-expectancy`,
 * 2026-08-22). At 1600x900 the live viewport took the whole stage — 2.58 aspect against the world's
 * 1.47 — so the runtime fit was height-bound and MapLibre filled ~800px of margin either side with a
 * second and a third painted world: three Africas, three Japans, one set of hit targets, at
 * `bounds [[-355.77, -68.88], [355.77, 85.05]]`.
 *
 * Holding the live viewport to the plate's own aspect took that to `±203.55°` — 407° of visible
 * longitude, still 104px of repeated world inside an 896px canvas — and the report that found it
 * called that fixed. It was not: the remainder is the FIT PADDING. `fitBounds` puts 360° inside
 * `896 - 2·48` px and then shows all 896, which is 403°.
 *
 * `renderWorldCopies: false` is not the answer either, and that is the other half of this: MapLibre
 * then clamps the camera so one world fills the width and the view CROPS — the same beat came back
 * cut at 20.8°S with Lesotho, one of the six countries its own title names, off the screen.
 *
 * So the padding is zero when the study set spans the world. The bake has refused the same thing in
 * the plate since it was written (`assertWorldFillsFrame`); this is that rule in the layer that fits
 * inside the reader's own container. `scripts/verify-live-map.mjs` measures the span the reader
 * actually gets and fails past 361°.
 */
import { describe, expect, it } from "bun:test";
import {
  FULL_TURN_DEG,
  MAX_FIT_PADDING_PX,
  fitPadding,
  spansTheWorld,
} from "../assets/live-map.mjs";
import { WORLD_SPAN_TOLERANCE_DEG } from "../scripts/verify-live-map.mjs";

/** A stand-in for the live map, which only ever gets asked for its canvas. */
const mapOf = (width: number, height: number) => ({
  getCanvas: () => ({ clientWidth: width, clientHeight: height }),
});

describe("a study set that spans the world", () => {
  it("recognises the world by its own longitude span, not by a beat saying so", () => {
    expect(
      spansTheWorld({
        studyBounds: { west: -180, east: 180, south: -60, north: 84 },
      }),
    ).toBe(true);
    // The real beat's own recorded bounds, which come back a hair under a full turn.
    expect(
      spansTheWorld({
        studyBounds: { west: -179.9, east: 179.9, south: -60, north: 84 },
      }),
    ).toBe(true);
  });

  it("does not mistake a continent for the world", () => {
    // `proof/mapgen-choropleth-web`'s own camera: Europe, 59° of longitude.
    expect(
      spansTheWorld({
        studyBounds: { west: -26, east: 33, south: 33.37, north: 68.22 },
      }),
    ).toBe(false);
    // The widest thing that is still not the world.
    expect(
      spansTheWorld({
        studyBounds: {
          west: 0,
          east: FULL_TURN_DEG - 1,
          south: -10,
          north: 10,
        },
      }),
    ).toBe(false);
  });

  it("says nothing when there is no plan to read", () => {
    expect(spansTheWorld(null)).toBe(false);
    expect(spansTheWorld({})).toBe(false);
    expect(spansTheWorld({ studyBounds: { west: NaN, east: 180 } })).toBe(
      false,
    );
  });
});

describe("the room the fit leaves around the study set", () => {
  const world = {
    studyBounds: { west: -180, east: 180, south: -60, north: 84 },
  };
  const europe = {
    studyBounds: { west: -26, east: 33, south: 33.37, north: 68.22 },
  };

  it("is nothing at planet extent, at every container this format is driven at", () => {
    // AT MORE THAN ONE CONTAINER SIZE, deliberately: the derived value is what a container-relative
    // constant has to be measured across, and 48px of padding shows a second world at all of them.
    for (const [width, height] of [
      [1600, 900],
      [1024, 768],
      [900, 1400],
      [375, 667],
    ])
      expect(fitPadding(mapOf(width, height), world)).toBe(0);
  });

  it("still leaves the room a smaller study set earns", () => {
    expect(fitPadding(mapOf(1600, 900), europe)).toBe(MAX_FIT_PADDING_PX);
    // `proof/mapgen-dot-web` at 375x667: the stage is 341 x 178, and 9% of the shorter side is what
    // stopped 96 of 178px going to padding.
    expect(
      fitPadding(
        { getCanvas: () => ({ clientWidth: 341, clientHeight: 178 }) },
        europe,
      ),
    ).toBe(16);
  });

  it("keeps behaving when no plan is handed to it at all", () => {
    expect(fitPadding(mapOf(1600, 900), undefined)).toBe(MAX_FIT_PADDING_PX);
  });
});

describe("what the fit means for the span the reader gets", () => {
  /** The visible longitude span when 360° is fitted inside `width - 2·padding` and all `width` is
   *  then shown. This is the arithmetic the live measurement confirmed: it is here so the unit
   *  suite states the consequence, and `verify-live-map.mjs` measures it in a real browser. */
  const spanShown = (width: number, padding: number) =>
    (360 * width) / (width - 2 * padding);

  it("is one world with no padding and more than one with the old padding", () => {
    expect(spanShown(896, 0)).toBe(360);
    expect(spanShown(896, MAX_FIT_PADDING_PX)).toBeGreaterThan(
      360 + WORLD_SPAN_TOLERANCE_DEG,
    );
    // The number the real beat came back with, to one decimal.
    expect(spanShown(896, MAX_FIT_PADDING_PX)).toBeCloseTo(403.0, 0);
  });
});
