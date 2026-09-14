import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { BarFrame } from "./BarFrame.tsx";
import { buildDirection, loadBeat } from "./build.mjs";
import { moveOf, sceneAt, valueText, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the ranking told
 * in order: the title at frame 0, the bars growing from the tenth with the first last, every count text measured, the next
 * five lined up end to end exactly to their sum and short of the first, the sum counting the blocks landed, nothing
 * stepped back before the pile starts.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(BarFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };

  describe(`${id}'s bar video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should carry a measured width for every count at every frame", () => {
      const unmeasured = [];
      for (let f = 0; f < props.timing.total; f += 3) {
        const svg = markupAt(f);
        if (/<text\b(?![^>]*data-width="\d)[^>]*>/.test(svg)) unmeasured.push(f);
      }
      expect(unmeasured).toEqual([]);
    });

    it("should have measured the text of every value a count passes through", () => {
      const missing = new Set<string>();
      for (let v = 0; v <= props.bars[0].value; v += 0.0005) {
        const text = `${valueText(v)}\u00A0Gt`;
        if (!(text in props.countWidths)) missing.add(text);
      }
      expect([...missing]).toEqual([]);
    });

    it("should open on the title and grow the bars from the tenth, the first last", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const scene = sceneAt(props, within("reveal", "rise", 0.5));
      const ups = scene.bars.map((b: any) => b.up);
      expect(ups[0]).toBe(0);
      expect(ups.slice(1).every((u: number, i: number, all: number[]) => i === 0 || u >= all[i - 1])).toBe(true);
      expect(ups[ups.length - 1] > ups[1]).toBe(true);
    });

    it("should line the next five up end to end, exactly to their sum and short of the first", () => {
      const scene = sceneAt(props, props.timing.total - 1);
      const piled = props.bars.map((b: any, i: number) => ({ b, s: scene.bars[i] })).filter(({ b }: any) => b.stacked !== null);
      const end = Math.max(...piled.map(({ s }: any) => s.x + s.w));
      expect(end).toBeCloseTo(props.left + props.combined * props.unit, 6);
      expect(piled.filter(({ s }: any) => Math.abs(s.y - props.pileY) > 1e-9)).toEqual([]);
      expect(end < props.firstEnd).toBe(true);
    });

    it("should sum only the blocks that have landed", () => {
      const scene = sceneAt(props, within("subject", "stack", 0.5));
      const stack = 0.5;
      const landed = props.bars.filter((b: any) => b.stacked !== null && moveOf(stack, b.stacked, 5) >= 1);
      expect(scene.sum).toBeCloseTo(landed.reduce((s: number, b: any) => s + b.value, 0), 9);
      expect(scene.landed > 0 && scene.landed < 5).toBe(true);
    });

    it("should step nothing back before the pile starts", () => {
      const fills = (svg: string) => new Set([...svg.matchAll(/<rect\b[^>]*fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]));
      expect(fills(markupAt(last("reveal"))).has(props.colours.faded)).toBe(false);
      expect(fills(markupAt(props.timing.total - 1)).has(props.colours.faded)).toBe(true);
    });
  });
}
