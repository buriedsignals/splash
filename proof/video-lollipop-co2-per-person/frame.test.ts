import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { LollipopFrame } from "./LollipopFrame.tsx";
import { oneText, sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; copies of China's stem, each its length, stacked end to end and cut at the American head,
 * so the stack stands exactly as tall as the American stem and the ratio is the copies that fit; the stack re-forming at
 * 2023; the whole chart at the end, both dates for every pair, nothing stepped back, China ringed; the credit on one line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(LollipopFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const at = (code: string) => props.pairs.findIndex((p: any) => p.code === code);

  describe(`${id}'s lollipop video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should carry a measured width for every value and ratio at every frame", () => {
      const unmeasured = [];
      for (let f = 0; f < props.timing.total; f += 2) if (/<text\b(?![^>]*data-width="\d)[^>]*>/.test(markupAt(f))) unmeasured.push(f);
      expect(unmeasured).toEqual([]);
    });

    for (const [event, value, label] of [["reveal", "before", "2000"], ["subject", "after", "2023"]] as const)
      it(`should stack China's copies exactly to the American head at the end of the ${event} (${label}), the ratio the copies that fit`, () => {
        expect(sceneAt(props, 0).title).toBe(1);
        const s = sceneAt(props, last(event));
        const cn = props.pairs[at(props.subject)][value];
        const us = props.pairs[at(props.other)][value];
        const top = Math.max(...s.copies.filter((c: any) => c.h > 0).map((c: any) => c.low + c.h));
        expect(top).toBeCloseTo(Math.min(us, props.copies * cn) * props.unit, 6);
        s.copies.forEach((c: any) => expect(c.h).toBeLessThanOrEqual(cn * props.unit + 1e-6));
        expect(oneText(s.ratio)).toBe(oneText(us / cn));
        expect(s.ratioShown).toBe(1);
      });

    it("should end on the whole chart: both dates for every pair, nothing stepped back, China ringed, no copy left", () => {
      const s = sceneAt(props, props.timing.total - 1);
      expect(s.pairs.map((p: any) => [p.past, p.present])).toEqual(props.pairs.map((p: any) => [p.before, p.after]));
      expect([s.pairs.every((p: any) => p.stepBack === 0 && p.pastShown === 1), s.ring, s.copies.every((c: any) => c.opacity === 0)]).toEqual([true, 1, true]);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
