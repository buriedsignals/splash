import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";
import { HistogramFrame } from "./HistogramFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; every country a tick inside its bin; every tick a cell of its bin, the bins rising at one
 * pace, each ending at its count; the tail's bins keeping their lengths as they stack onto the 4–8 bin, the counter the
 * column's own landed height, nothing crossing anything; tenths of the 213, six against four; the whole histogram at the end.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(HistogramFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const yOf = (v: number) => props.baseline - v * props.unit;
  const E = 1e-6;
  const overlaps = (a: any, b: any) => a.x + E < b.x + b.w && b.x + E < a.x + a.w && a.y + E < b.y + b.h && b.y + E < a.y + a.h;

  describe(`${id}'s histogram video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title, and end the reference on every country as a tick inside its own bin", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      expect(s.cells.length).toBe(213);
      s.cells.forEach((c: any, i: number) => {
        const bin = props.bins[props.countries[i].bin];
        expect([c.opacity, c.x >= bin.x, c.x + c.w <= bin.x + props.barW, c.y + c.h]).toEqual([1, true, true, expect.closeTo(props.baseline, 6)] as any);
      });
    });

    it("should end the reveal on every bin at its count, the cells summing to 213", () => {
      const s = sceneAt(props, last("reveal"));
      expect(s.cells.length).toBe(0);
      s.bars.forEach((b: any, i: number) => {
        expect([b.x, b.y, b.h]).toEqual([props.bins[i].x, yOf(props.bins[i].count), props.bins[i].count * props.unit].map((v) => expect.closeTo(v, 6)) as any);
      });
      expect(props.bins.reduce((t: number, b: any) => t + b.count, 0)).toBe(213);
    });

    it("should raise every bin at one pace while the cells fall, a bin's landed cells a solid bar", () => {
      const { start, duration } = props.timing.reveal;
      let growing = 0;
      for (let f = start; f < start + duration; f += 9) {
        const s = sceneAt(props, f);
        const landed = s.bars.map((b: any) => Math.round(b.h / props.unit));
        const most = Math.max(...landed);
        if (most > 0 && most < props.bins[0].count) growing += 1;
        expect(landed).toEqual(props.bins.map((b: any) => Math.min(b.count, most)));
        expect(s.cells.length + landed.reduce((t: number, n: number) => t + n, 0)).toBe(213);
      }
      expect(growing).toBeGreaterThan(0);
    });

    it("should keep every tail bin's length while it moves, and carry none through another bar or the column's count", () => {
      const { start, duration } = props.timing.subject;
      const valueH = props.registers.value.fontSize;
      let moving = 0;
      for (let f = start; f < start + duration; f += 2) {
        const s = sceneAt(props, f);
        const boxes = s.bars.map((b: any, i: number) => ({ i, x: b.x, y: b.y, w: props.barW, h: b.h })).filter((b: any) => b.h > 0);
        boxes.forEach((a: any, n: number) => {
          expect(a.h).toBeCloseTo(props.bins[a.i].count * props.unit, 6);
          if (a.x !== props.bins[a.i].x && a.i > 1) moving += 1;
          for (const b of boxes.slice(n + 1)) expect([f, a.i, b.i, overlaps(a, b)]).toEqual([f, a.i, b.i, false]);
          if (s.tail.opacity > 0) {
            const word = props.tailCounts[s.tail.key];
            const box = { x: props.bins[1].centre - word.width / 2, y: yOf(s.tail.top) - props.labelGap - valueH, w: word.width, h: valueH };
            expect([f, a.i, overlaps(a, box)]).toEqual([f, a.i, false]);
          }
        });
      }
      expect(moving).toBeGreaterThan(0);
    });

    it("should count, at every frame of the stacking, the height of the column its bins have landed on", () => {
      const { start, duration } = props.timing.subject;
      for (let f = start; f < start + duration; f += 3) {
        const s = sceneAt(props, f);
        const landed = s.bars.reduce((t: number, b: any, i: number) => (i >= 1 && Math.abs(b.x - props.bins[1].x) < 1e-6 && Math.abs(b.y + b.h - yOf(props.tail.base[i])) < 1e-6 ? t + props.bins[i].count : t), 0);
        expect(props.tailCounts[s.tail.key].text).toBe(String(landed));
      }
    });

    it("should end the subject on the tail stacked onto the 4–8 bin, 86 against 127, cut into six tenths and four", () => {
      const s = sceneAt(props, last("subject"));
      let base = 0;
      props.bins.forEach((bin: any, i: number) => {
        if (i === 0 || bin.count === 0) return;
        const b = s.bars[i];
        expect([b.x, b.y + b.h]).toEqual([props.bins[1].x, yOf(base)].map((v) => expect.closeTo(v, 6)) as any);
        base += bin.count;
      });
      expect([props.tailCounts[s.tail.key].text, props.share.label.text]).toEqual(["86", "127"]);
      expect([props.seams.left.length + 1, props.seams.right.length + 1]).toEqual([6, 4]);
      for (const v of [...props.seams.left, ...props.seams.right]) expect(Math.abs(v / props.tenth - Math.round(v / props.tenth))).toBeLessThan(1e-9);
      expect(props.tenth).toBeCloseTo(21.3, 9);
      expect(s.tenths).toBe(1);
    });

    it("should end on the whole histogram: every bin in its slot at its count, the cut ruled, 127 kept, the tenths closed", () => {
      const s = sceneAt(props, props.timing.total - 1);
      s.bars.forEach((b: any, i: number) => {
        expect([b.x, b.y]).toEqual([props.bins[i].x, yOf(props.bins[i].count)].map((v) => expect.closeTo(v, 6)) as any);
      });
      expect([s.tenths, s.tail.opacity, s.rule, s.share, s.source]).toEqual([0, 0, 1, 1, 1]);
    });

    it("should set the credit on one line", () => {
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
