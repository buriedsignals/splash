import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { GanttFrame } from "./GanttFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the tenure told in
 * order: the title at frame 0, no bar past the clock, the count as many of the 1990 ten as still count, each one counted
 * out as the clock crosses the year it left, the six picked out only at the subject, every bar whole at the end.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(GanttFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const atYear = (year: number) => {
    const { start, duration } = props.timing.reveal;
    const [a, b] = WINDOWS.reveal.clock;
    return Math.floor(start + duration * (a + ((year - props.first) / (props.last + 1 - props.first)) * (b - a)));
  };

  describe(`${id}'s gantt video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title and end with every bar whole", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const end = sceneAt(props, props.timing.total - 1);
      expect(end.title).toBe(0);
      expect(end.bars.map((bars: any[]) => bars.map((b) => [b.from, b.to]))).toEqual(props.rows.map((r: any) => r.runs.map((run: any) => [run.from, run.to + 1])));
    });

    it("should draw no bar past the clock", () => {
      const scene = sceneAt(props, atYear(2005.5));
      expect(scene.bars.flat().filter((b: any) => b.to > scene.reach + 1e-9)).toEqual([]);
    });

    it("should count as many of the 1990 ten as have not yet been counted out", () => {
      for (const year of [1995, 2009, 2017, 2020]) {
        const scene = sceneAt(props, atYear(year + 0.5));
        const counted = props.rows.filter((r: any, i: number) => r.member && scene.out[i] < 1).length;
        expect([year, scene.neverLeft]).toEqual([year, counted]);
      }
    });

    it("should leave exactly the six who never left counted at the end of the clock", () => {
      const scene = sceneAt(props, last("reveal"));
      expect(props.rows.filter((r: any, i: number) => scene.out[i] < 1).map((r: any) => r.key)).toEqual(props.rows.filter((r: any) => r.throughout).map((r: any) => r.key));
    });

    it("should mark exactly ten seats on the year cursor at every year the clock crosses", () => {
      for (let year = 1990; year <= 2024; year += 3) {
        const scene = sceneAt(props, atYear(year + 0.5));
        expect([year, scene.cursor.year, scene.seated.filter(Boolean).length]).toEqual([year, year, 10]);
      }
    });

    it("should end on the whole chart: nothing stepped back, the six kept in the accent, no cursor, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect([end.focus, end.kept, end.cursor.shown]).toEqual([0, 1, 0]);
      expect(props.credit.lines.length).toBe(1);
    });

    it("should not pick out the six before the subject", () => {
      const fills = (svg: string) => new Set([...svg.matchAll(/<rect\b[^>]*fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]));
      expect(fills(markupAt(last("reveal"))).has(props.colours.kept)).toBe(false);
      expect(fills(markupAt(props.timing.total - 1)).has(props.colours.kept)).toBe(true);
    });
  });
}
