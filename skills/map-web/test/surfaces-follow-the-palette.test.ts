/**
 * THE OCEAN AND THE NO-DATA FILL FOLLOW THE PALETTE — the owner's instruction, in his words:
 * *"it has to adapt to the palette."*
 *
 * Both were fixed hexes with a docstring arguing that fixing them is what makes a no-data reading
 * "stay recognisable across every newsroom's own ground colour". Measured on this format's own two
 * shipped grounds, that claim is false in BOTH directions — this is the whole finding:
 *
 *   light ground #FFFFFF, accent #B2182B, ramp 0.815 0.598 0.421 0.283 0.177 0.101
 *     no-data #B9B9B9 at 0.485 → between class 2 and class 3
 *     water   #AAC9E0 at 0.557 → between class 2 and class 3
 *   dark ground #16191B, accent #D4A853, ramp 0.052 0.109 0.191 0.300 0.442 0.616
 *     no-data #B9B9B9 at 0.485 → between class 5 and class 6
 *     water   #AAC9E0 at 0.557 → brighter than five of the six classes, on a world map where the
 *             sea is most of the picture: the ocean was the loudest thing on a map about land
 *
 * So a country with NO READING was painted at the luminance of a real class on every beat this
 * format has shipped, and `assertRampReads` could not see it: it measures the ramp against the
 * GROUND and never these two against the RAMP.
 *
 * The derivation and its one refusal live in `proof/mapgen-choropleth-web/geo-choropleth.ts`
 * (`offRampLuminance`, `noDataFor`, `waterFor`, `assertSurfacesRead`) and in this skill's own copy,
 * `assets/geo-choropleth.ts`. This test measures them at BOTH grounds, because a colour rule
 * checked on one ground is the same defect it is replacing.
 */
import { describe, expect, it } from "bun:test";
import {
  MIN_CHROMA,
  SURFACE_CLEARANCE,
  assertSurfacesRead,
  blueAt,
  chromaOf,
  dataRampEnd,
  greyAt,
  luminanceOf,
  noDataFor,
  offRampLuminance,
  sequentialRamp,
  waterFor,
} from "../assets/geo-choropleth.ts";

const rampFor = (ground: string, accent: string, from: number, to: number) =>
  sequentialRamp(ground, dataRampEnd(accent, ground), 6, from, to);

const LIGHT = { ground: "#FFFFFF", accent: "#B2182B", from: 0.2, to: 0.78 };
const DARK = { ground: "#16191B", accent: "#D4A853", from: 0.22, to: 1 };

describe("the axis each surface travels", () => {
  it("passes through the two hexes this family used as constants, so nothing was thrown away", () => {
    // `#B9B9B9` and `#AAC9E0` are not deleted — they are the MIDPOINT of the axis each colour now
    // moves along, and the palette decides where on it the colour lands.
    expect(greyAt(luminanceOf("#B9B9B9"))).toBe("#b8b8b8");
    expect(blueAt(luminanceOf("#AAC9E0"))).toBe("#aac9df");
  });

  it("keeps a grey grey and a blue blue", () => {
    expect(chromaOf(greyAt(0.5))).toBe(0);
    expect(chromaOf(blueAt(0.5))).toBeGreaterThan(MIN_CHROMA);
  });

  it("hits the luminance it was asked for, at both ends of the range", () => {
    for (const target of [0.03, 0.2, 0.5, 0.9])
      for (const at of [greyAt(target), blueAt(target)])
        expect(luminanceOf(at)).toBeCloseTo(target, 2);
  });
});

describe("the two surfaces the palette leaves room for", () => {
  for (const [name, palette] of [
    ["a light ground", LIGHT],
    ["a dark ground", DARK],
  ] as const) {
    it(`sit outside the ramp on ${name}, and a reader can tell them apart`, () => {
      const ramp = rampFor(
        palette.ground,
        palette.accent,
        palette.from,
        palette.to,
      );
      const noData = noDataFor(ramp, palette.ground);
      const water = waterFor(ramp, palette.ground);
      const classes = ramp.map(luminanceOf);
      const low = Math.min(...classes);
      const high = Math.max(...classes);
      for (const surface of [noData, water]) {
        const value = luminanceOf(surface);
        // Outside the ramp's whole range, with the same clearance two adjacent classes get.
        expect(
          value < low - SURFACE_CLEARANCE || value > high + SURFACE_CLEARANCE,
        ).toBe(true);
        // And not the ground either — a surface indistinguishable from the page is not a surface.
        expect(
          Math.abs(value - luminanceOf(palette.ground)),
        ).toBeGreaterThanOrEqual(SURFACE_CLEARANCE);
      }
      // Water carries a hue; no-data does not. That is how they are told apart when the band
      // between the ground and the first class is too narrow for a luminance step.
      expect(chromaOf(noData)).toBe(0);
      expect(chromaOf(water)).toBeGreaterThan(MIN_CHROMA);
      expect(
        assertSurfacesRead(ramp, palette.ground, { noData, water }),
      ).toEqual({ noData, water });
    });
  }

  it("lands on the dark ground where the one beat that hit this put them by hand", () => {
    // `stories/real-owid-life-expectancy` chose #2B3236 (0.031) and #12293B (0.023) by measuring.
    // The derivation, which was not available to it, answers 0.031 for both — the same slot.
    const ramp = rampFor(DARK.ground, DARK.accent, DARK.from, DARK.to);
    expect(offRampLuminance(ramp, DARK.ground)).toBeCloseTo(0.0306, 3);
    expect(noDataFor(ramp, DARK.ground)).toBe("#313131");
  });
});

describe("what assertSurfacesRead refuses", () => {
  const ramp = rampFor(DARK.ground, DARK.accent, DARK.from, DARK.to);

  it("a no-data fill sitting inside the ramp — the defect itself, on the ground that made it visible", () => {
    expect(() =>
      assertSurfacesRead(ramp, DARK.ground, {
        noData: "#B9B9B9",
        water: waterFor(ramp, DARK.ground),
      }),
    ).toThrow(/inside this ramp's own range/);
  });

  it("the same fixed pair on the LIGHT ground, which nobody had measured", () => {
    const light = rampFor(LIGHT.ground, LIGHT.accent, 0.1, LIGHT.to);
    expect(() =>
      assertSurfacesRead(light, LIGHT.ground, {
        noData: "#B9B9B9",
        water: "#AAC9E0",
      }),
    ).toThrow(/inside this ramp's own range/);
  });

  it("a water tint a reader cannot tell from the no-data fill", () => {
    expect(() =>
      assertSurfacesRead(ramp, DARK.ground, {
        noData: "#313131",
        // A grey sea. Same slot, same luminance, no hue — the one case the band is too narrow to
        // separate any other way, which is why the hue clause exists.
        water: "#313131",
      }),
    ).toThrow(/cannot tell a country with no reading from the sea/);
  });

  it("a surface that is really the ground", () => {
    expect(() =>
      assertSurfacesRead(ramp, DARK.ground, {
        noData: "#171a1c",
        water: waterFor(ramp, DARK.ground),
      }),
    ).toThrow(/it is not a surface, it is the ground/);
  });

  it("a ramp that starts too close to its own ground to leave room for either", () => {
    // The light beat's original low end, 0.10: the band is 0.185 wide, and the blue that fits in it
    // carries 0.039 chroma against a 0.05 floor — a sea a reader would call grey.
    const tight = rampFor(LIGHT.ground, LIGHT.accent, 0.1, LIGHT.to);
    expect(() =>
      assertSurfacesRead(tight, LIGHT.ground, {
        noData: noDataFor(tight, LIGHT.ground),
        water: waterFor(tight, LIGHT.ground),
      }),
    ).toThrow(/cannot tell a country with no reading from the sea/);
  });
});
