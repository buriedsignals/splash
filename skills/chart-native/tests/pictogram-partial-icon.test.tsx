import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PictogramChart, type PictogramConfig } from "../src/PictogramChart";
import sample from "../assets/sample-data/pictogram.json";

// A pictogram's last icon is a FRACTION of a figure, and that fraction is the only part of
// the chart the reader cannot get by counting — so it has to be visible whenever the value
// is. The first render of the shipped sample showed it was not: Hillcrest's 22 000 (2.2
// icons, a 0.2 remainder) drew TWO icons and nothing else, because the clip window was the
// icon's CELL and the glyph's ink does not start until 25 % across it. Every remainder below
// 0.25 was silently rounded down on screen while the geometry said otherwise.
//
// The fix is to clip the glyph's INK, not its cell. This measures the rendered SVG rather
// than the intent: for each partial icon, the clip rect and the figure's body must overlap.
const config = sample as unknown as PictogramConfig;

/** Every `<rect>`'s x/width, keyed by the id of the clipPath it sits in. */
function clipRects(html: string): Map<string, { x: number; w: number }> {
  const out = new Map<string, { x: number; w: number }>();
  for (const m of html.matchAll(
    /<clipPath id="(pico-partial-\d+)"><rect x="([-\d.]+)" y="[-\d.]+" width="([\d.]+)"/g,
  ))
    out.set(m[1], { x: Number(m[2]), w: Number(m[3]) });
  return out;
}

/** The body rect of each clipped (partial) figure, keyed by the clipPath it references. */
function clippedBodies(html: string): Map<string, { x: number; w: number }> {
  const out = new Map<string, { x: number; w: number }>();
  for (const m of html.matchAll(
    /clip-path="url\(#(pico-partial-\d+)\)"[\s\S]*?<rect x="([-\d.]+)" y="[-\d.]+" width="([\d.]+)"/g,
  ))
    out.set(m[1], { x: Number(m[2]), w: Number(m[3]) });
  return out;
}

describe("a partial icon shows ink for every remainder the geometry keeps", () => {
  const rows = [
    { district: "Downtown", residents: 84000 }, // 0.4 remainder
    { district: "Hillcrest", residents: 22000 }, // 0.2 — the one that vanished
    { district: "Riverside", residents: 50500 }, // 0.05 — the smallest kept sliver
  ];
  const html = renderToStaticMarkup(
    createElement(PictogramChart, { config: { ...config, rows } }),
  );

  it("renders one clipped figure per remainder", () => {
    expect(clipRects(html).size).toBe(3);
    expect(clippedBodies(html).size).toBe(3);
  });

  it("every clip window overlaps the ink it is clipping", () => {
    const clips = clipRects(html);
    const bodies = clippedBodies(html);
    for (const [id, clip] of clips) {
      const body = bodies.get(id)!;
      const overlap =
        Math.min(clip.x + clip.w, body.x + body.w) - Math.max(clip.x, body.x);
      expect({ id, visible: overlap > 0 }).toEqual({ id, visible: true });
    }
  });

  it("the visible fraction still GROWS with the remainder (it is not clamped to a stub)", () => {
    // honesty check on the repair: making every remainder visible must not make them all
    // look the same, or the partial icon would stop encoding anything.
    const clips = [...clipRects(html).values()].map((c) => c.w);
    const sorted = [...clips].sort((a, b) => a - b);
    expect(sorted[0]).toBeLessThan(sorted[2]);
  });
});
