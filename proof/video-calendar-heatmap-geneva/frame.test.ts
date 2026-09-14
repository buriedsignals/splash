import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { CalendarFrame } from "./CalendarFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the year told in
 * order: the title at frame 0, the year filling in calendar order with the warm count as many as the warm days filled, the
 * run outlined only at the subject and counted as it is outlined, the colours back and the whole run marked at the end.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(CalendarFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };

  describe(`${id}'s calendar heatmap video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title and end with every day in its colour", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const end = sceneAt(props, props.timing.total - 1);
      expect([end.title, end.cells.every((c: any) => c.shown === 1 && c.stepped === 0)]).toEqual([0, true]);
    });

    it("should fill the year in calendar order, the warm count as many as the warm days filled", () => {
      const scene = sceneAt(props, within("reveal", "fill", 0.6));
      const shown = scene.cells.map((c: any) => c.shown);
      expect(shown.every((v: number, i: number) => i === 0 || v <= shown[i - 1])).toBe(true);
      const warmFilled = props.days.filter((d: any, i: number) => shown[i] >= 1 && d.value >= props.threshold).length;
      expect([scene.warm, scene.warm > 0 && scene.warm < 59]).toEqual([warmFilled, true]);
    });

    it("should outline the run only at the subject, its count the days outlined", () => {
      expect(sceneAt(props, last("reveal")).reach).toBe(0);
      const scene = sceneAt(props, within("subject", "trace", 0.5));
      expect(scene.run).toBe(Math.floor(scene.reach));
      expect(scene.run > 0 && scene.run < props.streakLength).toBe(true);
      expect(sceneAt(props, props.timing.total - 1).run).toBe(props.streakLength);
    });

    it("should step back only the days under the threshold", () => {
      const scene = sceneAt(props, last("subject"));
      expect(props.days.filter((d: any, i: number) => (scene.cells[i].stepped > 0) !== d.value < props.threshold)).toEqual([]);
    });

    it("should outline exactly the run's days, month by month", () => {
      const days = props.runs.reduce((s: number, r: any) => s + r.to - r.from + 1, 0);
      expect(days).toBe(props.streakLength);
    });
  });
}
