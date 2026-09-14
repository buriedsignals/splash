import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { LollipopFrame } from "./LollipopFrame.tsx";
import { oneText, sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the change told
 * in order: the title at frame 0, both stems at 2000 before any travel, the ratio shown only once its two heads have
 * landed and always the American head over the Chinese one, every second stem at 2023 by the end, the 2000 stem never
 * moving, the four others stepped back only at the conclusion.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(LollipopFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const byCode = (code: string) => props.pairs.findIndex((p: any) => p.code === code);

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

    it("should hold both stems at 2000 at the end of the reveal, and every second stem at 2023 by the end", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const risen = sceneAt(props, last("reveal"));
      expect(risen.pairs.map((s: any) => [s.past, s.present])).toEqual(props.pairs.map((p: any) => [p.before, p.before]));
      const end = sceneAt(props, props.timing.total - 1);
      expect(end.pairs.map((s: any) => [s.past, s.present])).toEqual(props.pairs.map((p: any) => [p.before, p.after]));
    });

    it("should show the ratio only once both heads have landed, the American head over the Chinese", () => {
      for (let f = 0; f < props.timing.total; f += 5) {
        const s = sceneAt(props, f);
        const us = s.pairs[byCode(props.other)];
        const cn = s.pairs[byCode(props.subject)];
        if (s.ratioShown) {
          expect([f, us.up, cn.up]).toEqual([f, 1, 1]);
          expect(s.ratio).toBeCloseTo(us.present / cn.present, 9);
        }
      }
      expect(oneText(sceneAt(props, last("reveal")).ratio)).toBe(oneText(beat.subject.ratio.before));
      expect(oneText(sceneAt(props, props.timing.total - 1).ratio)).toBe(oneText(beat.subject.ratio.after));
    });

    it("should step back the four others only at the conclusion, and never China or the United States", () => {
      expect(sceneAt(props, last("subject")).pairs.every((s: any) => s.stepBack === 0)).toBe(true);
      const end = sceneAt(props, props.timing.total - 1);
      expect(props.pairs.filter((p: any, i: number) => end.pairs[i].stepBack === 0).map((p: any) => p.code).sort()).toEqual([props.other, props.subject].sort());
    });
  });
}
