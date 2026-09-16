import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { DumbbellFrame } from "./DumbbellFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: ten rows ranked by their 2000 level with Poland last; every dot travelling right, the rises counted only as
 * they land; the rows re-ranked by gain; every gain's copy landing on one start and keeping its length the whole way; the
 * whole chart at the end, the copies back on their dumbbells, nothing stepped back, Poland's row ringed.
 */

const beat = loadBeat();
const order = (ys: number[]) =>
  ys
    .map((y, i) => [y, i])
    .sort((a, b) => a[0] - b[0])
    .map(([, i]) => i);

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(DumbbellFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };
  const keys = props.rows.map((r: any) => r.key);
  const poland = keys.indexOf("Poland");
  const usa = keys.indexOf("United States");

  describe(`${id}'s dumbbell video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should rank the ten rows by their 2000 level at reference, Poland last", () => {
      const s = sceneAt(props, last("reference"));
      const top = order(s.rows.map((r: any) => r.y)).map((i) => keys[i]);
      expect(top).toEqual(beat.subject.byLevel);
      expect(top.at(-1)).toBe("Poland");
    });

    it("should travel every dot right to 2023 and count the rises only as they land", () => {
      for (const r of props.rows)
        expect([r.key, r.b.x > r.a.x]).toEqual([r.key, true]);
      const s = sceneAt(props, within("reveal", "travel", 0.5));
      expect(s.rose).toBe(s.rows.filter((r: any) => r.arrived >= 1).length);
      expect(s.rose > 0 && s.rose < 10).toBe(true);
      const end = sceneAt(props, last("reveal"));
      expect(end.rose).toBe(10);
      expect(end.rows.map((r: any) => r.dotX)).toEqual(
        props.rows.map((r: any) => r.b.x),
      );
    });

    it("should re-rank the rows by gain at subject, Poland from last to first", () => {
      const s = sceneAt(props, last("subject"));
      const top = order(s.rows.map((r: any) => r.y)).map((i) => keys[i]);
      expect(top).toEqual(beat.subject.byGain);
      expect([top[0], top.at(-1)]).toEqual(["Poland", "United States"]);
      const crossing = sceneAt(props, within("subject", "reorder", 0.5));
      expect(crossing.rows[poland].nameDim).toBe(0);
      expect(crossing.rows[usa].nameDim).toBeGreaterThan(0.5);
      expect(s.rows.every((r: any) => r.nameDim === 0)).toBe(true);
    });

    it("should slide every gain's copy onto one start without changing its length", () => {
      const mid = sceneAt(props, within("subject", "detach", 0.5));
      const end = sceneAt(props, last("subject"));
      props.rows.forEach((r: any, i: number) => {
        const length = r.b.x - r.a.x;
        expect(mid.rows[i].copy.x1 - mid.rows[i].copy.x0).toBeCloseTo(
          length,
          6,
        );
        expect(end.rows[i].copy.x0).toBeCloseTo(props.start, 6);
        expect(end.rows[i].copy.x1 - end.rows[i].copy.x0).toBeCloseTo(
          length,
          6,
        );
      });
      expect(props.start).toBe(props.rows[poland].a.x);
      const landed = mid.rows.filter((r: any) => r.gainShown === 1).length;
      expect(landed > 0 && landed < 10).toBe(true);
      expect(end.rows.every((r: any) => r.gainShown === 1)).toBe(true);
    });

    it("should make Poland's copy the longest and the United States' the shortest on the start line", () => {
      const lengths = props.rows.map((r: any) => r.b.x - r.a.x);
      expect(lengths.indexOf(Math.max(...lengths))).toBe(poland);
      expect(lengths.indexOf(Math.min(...lengths))).toBe(usa);
    });

    it("should end on the whole chart: copies back on their dumbbells, nothing stepped back, Poland ringed, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      props.rows.forEach((r: any, i: number) => {
        expect(end.rows[i].copy.x0).toBeCloseTo(r.a.x, 6);
        expect(end.rows[i].copy.on).toBe(0);
      });
      expect(end.rows.every((r: any) => r.stepBack === 0)).toBe(true);
      expect([end.ring, end.guide, end.rows[poland].y]).toEqual([
        1,
        0,
        props.slots[0],
      ]);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
