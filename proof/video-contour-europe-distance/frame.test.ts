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

    const chart = (props as any).chart;
    const xOf = (km: number) => chart.plot.left + ((chart.plot.right - chart.plot.left) * km) / chart.maxKm;
    const yOf = (p: number) => chart.plot.bottom - ((chart.plot.bottom - chart.plot.top) * p) / 100;

    it("should trace the share of the land within each distance as the sweep advances: the head at 50 % and the median at the end of reveal, 100 % at the farthest point by the end", () => {
      const reveal = sceneAt(props as any, endOf(props.timing.reveal) - 1);
      expect(reveal.chart.head.x).toBeCloseTo(xOf(props.medianLevel), 6);
      expect(reveal.chart.head.y).toBeCloseTo(yOf(props.within[props.medianLevel]), 6);
      expect(props.within[props.medianLevel]).toBeCloseTo(50, 0);
      expect(reveal.chart.guides).toBe(1);
      const sweeping = sceneAt(props as any, Math.round(props.timing.reveal.start + props.timing.reveal.duration * 0.5));
      expect(sweeping.level).toBeLessThan(props.medianLevel);
      expect(sweeping.chart.guides).toBe(0);
      const last = sceneAt(props as any, props.timing.total - 1);
      expect(last.chart.head.x).toBeCloseTo(xOf(chart.maxKm), 6);
      expect(last.chart.head.y).toBeCloseTo(yOf(100), 6);
      const mid = sceneAt(props as any, Math.round(props.timing.subject.start + props.timing.subject.duration * 0.4));
      expect(mid.chart.head.x).toBeCloseTo(xOf(mid.level), 6);
    });

    it("should draw the curve through every kilometre's share, rising, on one scale", () => {
      const pts = [...chart.path.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m: any) => [Number(m[1]), Number(m[2])]);
      expect(pts.length).toBeGreaterThan(100);
      for (let i = 1; i < pts.length; i++) expect(pts[i][1]).toBeLessThanOrEqual(pts[i - 1][1] + 1e-9);
      for (const km of [100, props.medianLevel, 400]) {
        const p = pts.find(([x]) => Math.abs(x - Math.round(xOf(km) * 10) / 10) < 0.051);
        expect([km, p && Math.abs(p[1] - yOf(props.within[km])) < 0.11]).toEqual([km, true]);
      }
    });

    it("should set the chart and the one-line credit inside the margins, clear of the key, the numbers, the farthest point and each other", () => {
      const apart = (a: any, b: any) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      const box = { x: chart.x, y: chart.y, w: chart.width, h: chart.height };
      const key = { x: props.legend.at.x, y: props.legend.at.y, w: props.legend.width, h: props.legend.height };
      const credit = { x: props.credit.at.x, y: props.credit.at.y, w: props.credit.width, h: props.credit.height };
      expect(props.credit.lines.length).toBe(1);
      expect([apart(box, key), apart(box, credit), apart(key, credit)]).toEqual([true, true, true]);
      for (const l of Object.values(props.labels) as any[]) expect(apart(box, { x: l.x - l.width / 2, y: l.y - 40, w: l.width, h: 50 })).toBe(true);
      expect(box.x).toBeGreaterThanOrEqual(props.layoutInset.x);
      expect(box.y + box.h).toBeLessThanOrEqual(props.frame.height - props.layoutInset.y);
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
