// THE OWNER'S RULING (2026-09-16): a newsroom face MapTiler does not serve is KEPT.
//
// It sets every word outside the map — the title, the key, the counters — and only the labels
// MapLibre draws from MapTiler's SDF glyphs stand in for it, in the first family on the register's
// own role ladder that MapTiler serves. Refusing the whole face over a dozen place names would
// throw away the newsroom's identity to save the smallest type on the frame.

import { describe, expect, it } from "bun:test";

import { LADDERS } from "../../../shared/design-base/resolve-families.mjs";
import { SERVED_BY_MAPTILER } from "../../../shared/design-base/typefaces.mjs";
import {
  mapLabelFamily,
  maptilerFace,
} from "../../../shared/map-beat/glyphs.mjs";

describe("mapLabelFamily", () => {
  it("should keep a family MapTiler serves, standing in for nothing", () => {
    expect(mapLabelFamily("Inter", { role: "sans" })).toEqual({
      family: "Inter",
      stoodInFor: null,
    });
  });

  it("should stand in for a house face MapTiler does not serve, and say what it stood in for", () => {
    const { family, stoodInFor } = mapLabelFamily("Futura", { role: "sans" });
    expect(stoodInFor).toBe("Futura");
    expect(SERVED_BY_MAPTILER).toContain(family);
  });

  it("should take the stand-in from the register's own role, so the labels keep the role's voice", () => {
    expect(mapLabelFamily("Futura", { role: "serif" }).family).toBe(
      LADDERS.serif[0],
    );
    expect(mapLabelFamily("Futura", { role: "geometric sans" }).family).toBe(
      LADDERS["geometric sans"][0],
    );
  });
});

describe("maptilerFace", () => {
  it("should ask MapTiler for the stand-in, not for the house face the panel is set in", () => {
    const register = {
      fontFamily: "Futura",
      mapFamily: "Inter",
      fontWeight: 700,
      fontStyle: "normal",
    };
    expect(maptilerFace(register)).toBe("Inter Bold");
  });

  it("should still ask for the register's own family when nothing stood in for it", () => {
    expect(
      maptilerFace({
        fontFamily: "Inter",
        fontWeight: 400,
        fontStyle: "normal",
      }),
    ).toBe("Inter Regular");
  });

  it("should name the family the map would have asked for when the weight has no served face", () => {
    expect(() =>
      maptilerFace({
        fontFamily: "Futura",
        mapFamily: "Inter",
        fontWeight: 300,
        fontStyle: "normal",
      }),
    ).toThrow(/no MapTiler face name for Inter/);
  });
});
