import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { videoClassKey } from "../craft/_shared/gesture-geo-area-video.mjs";

// gx-choropleth video (Qwen3.5-9B, mvq69): the gesture kit's area-map frame drew the unit line and no class key, while
// the per-type kit it replaced drew one and the beat's reading line said the breaks were printed under the map. A
// colour class with no key cannot be read.

const width = (t: string) => t.length * 10;
const base = {
  breaks: [40, 55, 70, 85, 94],
  format: (v: number) => `${v} %`,
  missingLabel: "non rapporté",
  hasMissing: true,
  width,
  swatch: 20,
  gap: 30,
  x: 100,
  y: 200,
  maxWidth: 1700,
  lead: 40,
};

describe("the video area map's class key", () => {
  it("should label every class from below the first break to above the last", () => {
    expect(videoClassKey(base).items.filter((i: any) => i.kind === "class").map((i: any) => i.label.text)).toEqual([
      "< 40 %",
      "40 % – 55 %",
      "55 % – 70 %",
      "70 % – 85 %",
      "85 % – 94 %",
      "≥ 94 %",
    ]);
  });

  it("should end on the missing label when a place has no value", () => {
    expect(videoClassKey(base).items.at(-1).label.text).toBe("non rapporté");
  });

  it("should carry no missing swatch when every place has a value", () => {
    expect(videoClassKey({ ...base, hasMissing: false }).items.some((i: any) => i.kind === "missing")).toBe(false);
  });

  it("should wrap to a second line when the key is wider than the content", () => {
    expect(videoClassKey({ ...base, maxWidth: 600 }).lines).toBeGreaterThan(1);
  });

  it("should keep every item inside the content width", () => {
    const { items } = videoClassKey({ ...base, maxWidth: 600 });
    expect(Math.max(...items.map((i: any) => i.label.x + i.label.width))).toBeLessThanOrEqual(base.x + 600);
  });
});
