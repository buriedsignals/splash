// THE MEASUREMENT THE REFUSAL RESTS ON.
//
// A newsroom's own ground was refused at produce over a backdrop the run cannot render: the pill
// was composited over BOTH absolute poles and judged on the worse one, and for a saturated ground
// the worse one is always the pole its own basemap rules out (a dark ground pins dataviz-dark, so
// the pill never sits on white). The numbers in this file are the ones the defect note recorded,
// before and after — they are the whole point, so they are asserted, not described.
import { describe, expect, it } from "bun:test";
import {
  BASEMAP_PILL_BACKDROP,
  darkBasemapForGround,
  groundChoices,
  groundLegibility,
  mapPillGround,
  nearestLegibleGround,
} from "./ground";
import { contrastRatio } from "./contrast";
import { resolveFrameColors } from "./theme";

// The palette the defect's Decor carried — the muted furniture is TINTED toward it, so the
// measurement is only the render's if the hue is threaded exactly as the engine threads it.
const HOUSE_HUE = "#d5121e";

const SATURATED_GREEN = "#0A5C36";
const SATURATED_PINK = "#F2C6D6";
const ILLEGIBLE_GREY = "#717171";

function furnitureRatios(ground: string) {
  const fc = resolveFrameColors(ground, HOUSE_HUE);
  const bg = mapPillGround(ground, HOUSE_HUE, darkBasemapForGround(ground));
  return {
    bg,
    ink: contrastRatio(fc.ink, bg),
    muted: contrastRatio(fc.muted, bg),
  };
}

describe("the backdrop a map pill is actually composited over", () => {
  it("is the pinned basemap's own harshest area colour, read off the shipped styles", () => {
    // Fetched 2026-08-07 from api.maptiler.com/maps/<style>/style.json: the dataviz-dark area
    // layers run #000000 (Water shadow) … #4D4D4D (Disputed border); dataviz-light's run
    // #C1C2C2 (Water shadow) … #FFFFFF (Road network). The pill is opaque enough that only the
    // extreme in the HARMFUL direction can move the answer — lighter under a dark ground, darker
    // under a light one — so those two are the constants.
    expect(BASEMAP_PILL_BACKDROP.dark).toBe("#4D4D4D");
    expect(BASEMAP_PILL_BACKDROP.light).toBe("#C1C2C2");
  });

  it("follows the basemap the ground's own luminance pins, never the opposite pole", () => {
    expect(darkBasemapForGround(SATURATED_GREEN)).toBe(true);
    expect(darkBasemapForGround(SATURATED_PINK)).toBe(false);
    // A dark ground composited over the LIGHT pole is the defect itself: #36795a, the value the
    // old guard measured against. Nothing may resolve to it any more.
    expect(mapPillGround(SATURATED_GREEN, HOUSE_HUE, true)).not.toBe("#36795a");
    expect(mapPillGround(SATURATED_GREEN, HOUSE_HUE, true)).toBe("#16593a");
    expect(mapPillGround(SATURATED_PINK, HOUSE_HUE, false)).toBe("#e9c5d2");
  });
});

describe("a compliant house ground is simply allowed", () => {
  it("clears the text floor for the saturated green that used to be refused at 3.26:1", () => {
    const r = furnitureRatios(SATURATED_GREEN);
    expect(r.bg).toBe("#16593a");
    expect(r.muted).toBeGreaterThanOrEqual(4.5);
    expect(r.muted).toBeCloseTo(5.22, 1);
    expect(r.ink).toBeCloseTo(7.57, 1);
    expect(groundLegibility(SATURATED_GREEN, HOUSE_HUE).ok).toBe(true);
  });

  it("clears it for the saturated pink that used to be refused at 4.40:1", () => {
    const r = furnitureRatios(SATURATED_PINK);
    expect(r.muted).toBeCloseTo(6.4, 1);
    expect(groundLegibility(SATURATED_PINK, HOUSE_HUE).ok).toBe(true);
  });

  it("keeps the presets and the untouched light default legible", () => {
    for (const g of ["#18181B", "#F7D9E3", "#FFFFFF", "dark", "light"])
      expect(groundLegibility(g, HOUSE_HUE).ok).toBe(true);
    expect(groundLegibility(undefined, HOUSE_HUE).ok).toBe(true);
  });
});

describe("a ground that genuinely cannot carry text still fails", () => {
  it("refuses the mid-grey, on the basemap it does pin", () => {
    const r = furnitureRatios(ILLEGIBLE_GREY);
    // It moved — 2.55 was measured against a white backdrop this config cannot render, and the
    // secondary text is now softened only as far as a ground allows — but the verdict did not:
    // even at the least-softened value the derivation will produce, nothing clears 4.5:1 on a
    // mid-grey, which is physics, not policy.
    expect(r.muted).toBeCloseTo(4.38, 1);
    expect(r.muted).toBeLessThan(4.5);
    const verdict = groundLegibility(ILLEGIBLE_GREY, HOUSE_HUE);
    expect(verdict.ok).toBe(false);
    expect(verdict.failures.length).toBeGreaterThan(0);
    expect(verdict.failures.some((f) => f.surface === "map")).toBe(true);
  });

  it("names the surface and the measured ratio, so the offer can be built from it", () => {
    const f = groundLegibility(ILLEGIBLE_GREY, HOUSE_HUE).failures[0]!;
    expect(f.ratio).toBeLessThan(4.5);
    expect(f.ground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(f.text).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("the alternatives offered when a ground fails", () => {
  it("proposes the nearest legible variant of the SAME hue", () => {
    const near = nearestLegibleGround(ILLEGIBLE_GREY)!;
    expect(near).toBeDefined();
    expect(groundLegibility(near).ok).toBe(true);
    // Same hue: the grey is neutral, so "same hue" means it stays a grey — it must not have been
    // swapped for a colour. What moves is lightness.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(near.slice(i, i + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(6);
  });

  it("proposes a legible variant of a saturated hue without turning it grey", () => {
    // A saturated mid-luminance colour: legible nowhere, and the proposal must keep its identity.
    const failing = "#8A6D3B";
    expect(groundLegibility(failing).ok).toBe(false);
    const near = nearestLegibleGround(failing)!;
    expect(groundLegibility(near).ok).toBe(true);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(near.slice(i, i + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(20);
  });

  it("returns nothing to change for a ground that already works", () => {
    expect(nearestLegibleGround(SATURATED_GREEN)).toBeUndefined();
    expect(groundChoices(SATURATED_GREEN)).toBeUndefined();
  });

  it("offers both a near variant and Splash's own ground, and both are legible", () => {
    const choices = groundChoices(ILLEGIBLE_GREY)!;
    expect(choices.declared).toBe(ILLEGIBLE_GREY);
    expect(groundLegibility(choices.nearest).ok).toBe(true);
    expect(groundLegibility(choices.subject).ok).toBe(true);
    expect(choices.nearest).not.toBe(choices.subject);
  });
});
