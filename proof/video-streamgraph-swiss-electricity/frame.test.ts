import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";
import { StreamFrame } from "./StreamFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the claim told
 * in order: the title at frame 0, solar's rank riding its band (7e before 2014, 3e from 2016), the stream whole at the end
 * of reveal, 2016 marked at the end; the band names clear of the mark's rule; the rank label inside the frame at 2024.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(StreamFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;
  const frameAtYear = (year: number) => {
    const { start, duration } = props.timing.reveal;
    const t = (year - 2000) / 24;
    return Math.ceil(start + duration * (0.02 + t * 0.92));
  };

  describe(`${id}'s streamgraph video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should carry solar's rank along the flow: 7e in 2010, 3e from 2016", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      expect(sceneAt(props as any, frameAtYear(2010)).rank).toBe(7);
      expect(sceneAt(props as any, frameAtYear(2016) + 1).rank).toBe(3);
      expect(sceneAt(props as any, last("reveal")).rank).toBe(3);
    });

    it("should mark 2016 at the end with every band back", () => {
      const end = sceneAt(props as any, props.timing.total - 1);
      expect([end.flow, end.mark, end.focus, end.source]).toEqual([1, 1, 0, 1]);
    });

    it("should keep the band names clear of the mark's rule, and the rank label inside the frame", () => {
      for (const n of props.bandNames) expect([n.key, n.x + n.width < props.mark.x || n.x > props.mark.x]).toEqual([n.key, true]);
      const w = props.rankTexts["3"].width * 1.02;
      expect(props.years.at(-1).x + props.rankOffset + w).toBeLessThanOrEqual(props.frame.width - props.layoutInset.x + 1);
    });
  });
}
