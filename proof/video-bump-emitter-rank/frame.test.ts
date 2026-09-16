import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { BumpFrame } from "./BumpFrame.tsx";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the ranking told
 * in order: the title at frame 0, India's rank riding its tip (8e in 1990, 3e by 2009), each pass ringed only once the clock
 * reaches its year, the passed countries drawn like any other until the focus, the focus at the end.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(BumpFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;
  const frameAtYear = (year: number) => {
    const { start, duration } = props.timing.reveal;
    return Math.ceil(start + duration * (0.04 + ((year - 1990) / 34) * 0.92)) + 1;
  };

  describe(`${id}'s bump video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should carry India's rank at its tip: 8th in 1990, 3rd from 2009", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      expect(props.tipRanks[0]).toBe(8);
      expect(props.tipRanks[sceneAt(props as any, frameAtYear(2010)).tipIndex]).toBe(3);
    });

    it("should ring each pass only once the clock has reached its year", () => {
      const s = sceneAt(props as any, frameAtYear(2000));
      props.passes.forEach((p: any, i: number) => expect([p.entity, s.passes[i] > 0]).toEqual([p.entity, p.index <= 10]));
    });

    it("should track India close up while the clock runs, and end on the whole chart with nothing stepped back", () => {
      const mid = sceneAt(props as any, frameAtYear(2005));
      expect(mid.camera).toBe(1);
      const t = mid.tip!;
      const m = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(mid.transform)!;
      const [ox, oy, sc] = m.slice(1).map(Number);
      expect(ox + t.x * sc).toBeCloseTo(0.58 * props.frame.width, 0);
      expect(oy + t.y * sc).toBeCloseTo(0.5 * props.frame.height, 0);
      const end = sceneAt(props as any, props.timing.total - 1);
      expect([end.camera, end.focus, end.transform]).toEqual([0, 0, "translate(0 0) scale(1)"]);
      expect(props.credit.lines.length).toBe(1);
    });

    it("should not pick out the passed countries before the focus", () => {
      const svg = markupAt(last("reveal"));
      expect(svg).not.toContain(`stroke="${props.colours.passed}"`);
      expect(markupAt(props.timing.subject.start + props.timing.subject.duration - 1)).toContain(`stroke="${props.colours.passed}"`);
    });
  });
}
