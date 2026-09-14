import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { GroupedBarFrame } from "./GroupedBarFrame.tsx";
import { moveOf, sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; each whole mix to 100 % at the end of the reference, every source at its share; wind and
 * solar keeping their heights while they leave it, never crossing; the scale closing onto them; the lead counted only
 * where solar ended under wind's level; the exception alone kept; the credit on one line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(GroupedBarFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };

  describe(`${id}'s grouped bar video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title and stand every whole mix at 100 %, each source at its share", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      props.groups.forEach((g: any, i: number) => {
        const total = s.groups[i].segments.reduce((t: number, seg: any) => t + seg.h, 0);
        expect(total).toBeCloseTo(100 * props.units.whole, 6);
        s.groups[i].segments.forEach((seg: any, j: number) => expect(seg.h).toBeCloseTo(g.mix[j].share * props.units.whole, 6));
      });
    });

    it("should keep wind's and solar's heights while they leave the mix, and never let them overlap", () => {
      for (const t of [0.2, 0.5, 0.8]) {
        const s = sceneAt(props, within("reveal", "split", t));
        props.groups.forEach((g: any, i: number) => {
          const { wind, solar } = s.groups[i];
          expect([wind.h, solar.h]).toEqual([expect.closeTo(g.wind * s.unit, 6), expect.closeTo(g.solar * s.unit, 6)] as any);
          const sideBySide = wind.x + wind.w <= solar.x + 1e-6;
          const stacked = wind.y >= solar.y + solar.h - 1e-6 || solar.y >= wind.y + wind.h - 1e-6;
          expect([t, g.name, sideBySide || stacked]).toEqual([t, g.name, true]);
        });
      }
      expect(sceneAt(props, last("reveal")).unit).toBeCloseTo(props.units.close, 9);
    });

    it("should count the lead only where solar ended under wind's level", () => {
      for (const t of [0.3, 0.7, 1]) {
        const s = sceneAt(props, within("subject", "compare", t));
        const expected = props.groups.filter((g: any, i: number) => moveOf(t, i, props.groups.length) >= 1 && g.solar < g.wind).length;
        expect([t, s.lead]).toEqual([t, expected]);
      }
      expect(sceneAt(props, props.timing.total - 1).lead).toBe(props.groups.length - 1);
    });

    it("should keep the exception alone at the end of the subject", () => {
      const s = sceneAt(props, last("subject"));
      expect(props.groups.filter((g: any, i: number) => s.groups[i].stepBack === 0).map((g: any) => g.name)).toEqual([props.subject]);
    });

    it("should end on the whole chart, nothing stepped back, the exception ringed, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect([end.groups.every((g: any) => g.stepBack === 0), end.ring]).toEqual([true, 1]);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
