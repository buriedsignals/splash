import { describe, expect, it } from "bun:test";
import { uncoveredText } from "../assets/face-coverage";
import { videoFaces } from "../scripts/video-faces.mjs";

/**
 * The node-side half: the faces a video render hands its composition, as bytes, cut from the
 * family its TYPEFACE.md records. Real Google Fonts bytes through the shared fetcher and its cache —
 * nothing here is mocked, because the defect this closes is exactly a face that was assumed
 * rather than carried.
 */

const STACK = '"Open Sans", Helvetica, Arial, sans-serif';

describe("videoFaces", () => {
  it("should hand the composition the recorded stack it must draw in", async () => {
    const { fontFamily } = await videoFaces({
      stack: STACK,
      weights: [400],
      props: { title: "a" },
    });
    expect(fontFamily).toBe(STACK);
  });

  it("should embed faces that cover every word of the props at every weight asked for", async () => {
    const props = {
      title: "Émissions de CO₂",
      source: { lines: ["Zürich · 1967"] },
    };
    const { faces } = await videoFaces({
      stack: STACK,
      weights: [400, 700],
      props,
    });
    const runs = [400, 700].flatMap((weight) => [
      { text: "Émissions de CO₂", family: "Open Sans", weight },
      { text: "Zürich · 1967", family: "Open Sans", weight },
    ]);
    expect(uncoveredText(runs, faces)).toEqual([]);
  });

  it("should carry the digits and separators a composition formats at render time", async () => {
    const { faces } = await videoFaces({
      stack: STACK,
      weights: [400],
      props: { title: "Pluie" },
    });
    const runs = [
      { text: "12 345,6 % − 0.5", family: "Open Sans", weight: 400 },
    ];
    expect(uncoveredText(runs, faces)).toEqual([]);
  });

  it("should not embed a weight nobody asked for", async () => {
    const { faces } = await videoFaces({
      stack: STACK,
      weights: [400],
      props: { title: "a" },
    });
    const runs = [{ text: "a", family: "Open Sans", weight: 700 }];
    expect(uncoveredText(runs, faces)).toEqual([
      { codePoint: 0x61, family: "Open Sans", weight: 700 },
    ]);
  });

  it("should refuse props carrying a character the family cannot set", async () => {
    await expect(
      videoFaces({ stack: STACK, weights: [400], props: { title: "東京" } }),
      // Google answers a `text=` request for glyphs the family lacks with a URL that returns 400,
      // so the shared fetcher refuses with "cannot download" before its own "cannot set" is reached.
    ).rejects.toThrow(/cannot (set|download)/);
  });
});
