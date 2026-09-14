import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { BarFrame } from "./BarFrame.tsx";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt, valueText } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; the ten inside the world bar end to end at the world's scale; every bar keeping its
 * length while it falls; the scale closing so the first bar fills the row; the five end to end exactly to their sum; the
 * tenth sliding into the gap, fitting before the first's end; the credit on one line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(BarFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;

  describe(`${id}'s bar video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should have measured the text of every value a count passes through", () => {
      const missing = new Set<string>();
      for (let v = 0; v <= props.bars[0].value; v += 0.0005) {
        const text = `${valueText(v)}\u00A0Gt`;
        if (!(text in props.countWidths)) missing.add(text);
      }
      expect([...missing]).toEqual([]);
    });

    it("should hold the ten end to end inside the world bar at the world's scale, at the end of the reference", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      props.bars.forEach((b: any, i: number) => {
        expect(s.bars[i].x - (i > 0 ? 0 : 0)).toBeCloseTo(props.left + b.inWorld * props.units.world, 6);
        expect(s.bars[i].w).toBeCloseTo(b.value * props.units.world, 6);
        expect(s.bars[i].y).toBe(props.worldY);
      });
    });

    it("should keep every bar's length while it falls, and close the scale onto the first bar by the end of the reveal", () => {
      const { start, duration } = props.timing.reveal;
      const falling = sceneAt(props, Math.round(start + duration * 0.3));
      props.bars.forEach((b: any, i: number) => {
        if (falling.bars[i].fall > 0 && falling.bars[i].fall < 1) expect(falling.bars[i].w).toBeCloseTo(b.value * props.units.world, 6);
      });
      expect(sceneAt(props, last("reveal")).unit).toBeCloseTo(props.units.ten, 9);
    });

    it("should line the five up exactly to their sum and slide the tenth into the gap before the first's end", () => {
      const { start, duration } = props.timing.conclusion;
      const s = sceneAt(props, Math.round(start + duration * 0.42));
      const unit = props.units.ten;
      const five = props.bars.map((b: any, i: number) => ({ b, s: s.bars[i] })).filter(({ b }: any) => b.stacked !== null);
      expect(Math.max(...five.map(({ s }: any) => s.x + s.w))).toBeCloseTo(props.left + props.combined * unit, 6);
      const tenth = s.bars[props.bars.findIndex((b: any) => b.tenth)];
      expect(tenth.y).toBeCloseTo(props.gapY, 6);
      expect(tenth.x).toBeGreaterThanOrEqual(props.left + props.combined * unit);
      expect(tenth.x + tenth.w).toBeLessThan(props.left + props.bars[0].value * unit);
    });

    it("should end on the whole ranking, every bar back in its row at its length, the five bracketed", () => {
      const s = sceneAt(props, props.timing.total - 1);
      props.bars.forEach((b: any, i: number) => {
        expect([i, s.bars[i].x, s.bars[i].y]).toEqual([i, expect.closeTo(props.left, 6), expect.closeTo(b.y, 6)] as any);
        expect(s.bars[i].w).toBeCloseTo(b.value * props.units.ten, 6);
      });
      expect(s.bracket).toBeCloseTo(1, 9);
    });

    it("should set the credit on one line", () => {
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
