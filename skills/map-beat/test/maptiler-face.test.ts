import { describe, expect, it } from "bun:test";
import { maptilerFace } from "#shared/map-beat/glyphs.mjs";

describe("maptilerFace", () => {
  it("should name an upright regular face with its weight word", () => {
    expect(
      maptilerFace({
        fontFamily: "Open Sans",
        fontWeight: 400,
        fontStyle: "normal",
      }),
    ).toBe("Open Sans Regular");
  });
  it("should drop Regular from an italic regular face", () => {
    expect(
      maptilerFace({
        fontFamily: "Open Sans",
        fontWeight: 400,
        fontStyle: "italic",
      }),
    ).toBe("Open Sans Italic");
  });
  it("should keep the weight word on a bold italic face", () => {
    expect(
      maptilerFace({
        fontFamily: "Merriweather",
        fontWeight: 700,
        fontStyle: "italic",
      }),
    ).toBe("Merriweather Bold Italic");
  });
  it("should refuse a weight MapTiler serves no face name for", () => {
    expect(() =>
      maptilerFace({
        fontFamily: "Open Sans",
        fontWeight: 600,
        fontStyle: "normal",
      }),
    ).toThrow(/no MapTiler face name/);
  });
});
