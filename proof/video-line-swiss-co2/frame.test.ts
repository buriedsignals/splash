import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { LineFrame } from "./LineFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the story in
 * order: the title at frame 0, no line before the reveal, the trace linear in years, 2024 reached and ringed at the end;
 * the rule's name clear of the line; the tip label inside the frame at the last year.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(LineFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s line video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title with no line, and reach 2024 at the end of reveal", () => {
      const first = sceneAt(props as any, 0);
      expect([first.title, first.path]).toEqual([1, ""]);
      const reveal = sceneAt(props as any, last("reveal"));
      expect([reveal.trace, reveal.tip.year]).toEqual([1, 2024]);
    });

    it("should trace linearly in years — equal frames, equal years", () => {
      const { start, duration } = props.timing.reveal;
      const yearAt = (t: number) => sceneAt(props as any, Math.round(start + duration * (0.02 + t * 0.92))).tip.year;
      const a = yearAt(0.25) - yearAt(0);
      const b = yearAt(0.75) - yearAt(0.5);
      expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
    });

    it("should land the level line where the rising line first reaches today's reading, before the peak", () => {
      const end = props.points.at(-1);
      const i = props.points.findIndex((p: any) => p.x >= props.landing.x);
      const [a, b] = [props.points[i - 1], props.points[i]];
      const yAt = a.y + ((b.y - a.y) * (props.landing.x - a.x)) / (b.x - a.x);
      expect(yAt).toBeCloseTo(end.y, 0);
      expect(props.landing.x).toBeLessThan(props.peak.x);
      expect(props.points.filter((p: any) => p.x < props.landing.x).every((p: any) => p.y >= end.y - 1)).toBe(true);
      expect(props.landing.year).toBe(1967);
    });

    it("should count the years back at the level line's head, and end on the landing ringed with the credit on one line", () => {
      const { start, duration } = props.timing.subject;
      const mid = sceneAt(props as any, Math.round(start + duration * 0.45));
      expect(mid.rewind.year > 1967 && mid.rewind.year < 2024).toBe(true);
      const endScene = sceneAt(props as any, props.timing.total - 1);
      expect([endScene.rewind.headX, endScene.rewind.year, endScene.rewind.landed]).toEqual([expect.closeTo(props.landing.x, 6), 1967, 1] as any);
      expect(props.credit.lines.length).toBe(1);
    });

    it("should keep the tip label inside the frame at 2024, and ring 2024 at the end", () => {
      const t = props.tipTexts["2024"];
      expect(props.end.x + props.tipOffset + t.width * 1.02).toBeLessThanOrEqual(props.frame.width - props.layoutInset.x + 1);
      expect(sceneAt(props as any, props.timing.total - 1).subject).toBe(1);
    });
  });
}
