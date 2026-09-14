import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { ContourFrame } from "./ContourFrame.tsx";
import { countAt, sceneAt } from "./scene.mjs";

/**
 * The markup the composition draws, at the last frame of every event: the type floor, every word with its measured
 * width — and the shot rules and the claim: the title at frame 0, the count landing on half the land at the median,
 * the video ending on every line with the farthest point marked.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(ContourFrame, { ...(props as any), at: frame }));

  describe(`${id}'s contour video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(endOf(props.timing[event]) - 1);
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title card and land the count on half the land at the end of reveal", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      const reveal = sceneAt(props as any, endOf(props.timing.reveal) - 1);
      expect(reveal.count).toEqual({ p: 50, km: props.medianLevel });
    });

    it("should end on the lines — the fill withdrawn, every line whole but the one that yields, the farthest point marked, the count at 100 %", () => {
      const last = sceneAt(props as any, props.timing.total - 1);
      expect([last.title, last.tint, last.summit, last.source]).toEqual([0, 0, 1, 1]);
      for (const { level } of props.levels) expect([level, last.lines[level]]).toEqual([level, props.yielding.includes(level) ? 0 : 1]);
      expect(last.count).toEqual(countAt(props.timing ? 10_000 : 0, props.within, props.deepest));
      expect(last.count.p).toBe(100);
    });

    it("should seat every number inside the margins, clear of the key and of every other number", () => {
      const boxes = Object.values(props.labels).map((l: any) => ({ x: l.x - l.width / 2, y: l.y - 40, w: l.width, h: 50 }));
      const key = { x: props.legend.at.x, y: props.legend.at.y, w: props.legend.width, h: props.legend.height };
      const apart = (a: any, b: any) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(props.layoutInset?.x ?? 0);
        expect(apart(b, key)).toBe(true);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(apart(boxes[i], boxes[j])).toBe(true);
    });
  });
}
