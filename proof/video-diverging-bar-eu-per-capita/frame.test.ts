import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { DivergingBarFrame } from "./DivergingBarFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; the 1990 levels; at 2024 each part lost exactly the change, pale past the level's end;
 * the flip keeping every part's length while it moves to the zero line; the camera closing so the one rise becomes a
 * length inside its column; the pull back to the whole scale at the end; the credit on one line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(DivergingBarFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const riseAt = props.rows.findIndex((r: any) => r.change > 0);

  describe(`${id}'s diverging bar video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title and draw the 1990 levels at the end of the reference", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      props.rows.forEach((r: any, i: number) => expect([r.key, s.rows[i].level.w]).toEqual([r.key, (r.change < 0 ? r.from : r.from) * props.unit]));
    });

    it("should leave, at 2024, each fall's lost part exactly its change, past the 2024 end", () => {
      const s = sceneAt(props, last("reveal"));
      expect(s.landed).toBe(props.rows.length - 1);
      props.rows.forEach((r: any, i: number) => {
        if (r.change > 0) return;
        const c = props.columns[r.column];
        expect(s.rows[i].level.w).toBeCloseTo(r.to * props.unit, 6);
        expect([s.rows[i].part.x, s.rows[i].part.w]).toEqual([c.start + r.to * props.unit, -r.change * props.unit].map((v) => expect.closeTo(v, 6)) as any);
      });
    });

    it("should keep the lost part between the shrinking end and the 1990 end while it shrinks", () => {
      const { start, duration } = props.timing.reveal;
      const s = sceneAt(props, Math.round(start + duration * 0.5));
      let mid = 0;
      props.rows.forEach((r: any, i: number) => {
        const { level, part } = s.rows[i];
        if (r.change > 0 || !(level.w > r.to * props.unit + 1 && level.w < r.from * props.unit - 1)) return;
        mid += 1;
        expect(part.x).toBeCloseTo(level.x + level.w, 6);
        expect(part.x + part.w).toBeCloseTo(props.columns[r.column].start + r.from * props.unit, 6);
      });
      expect(mid).toBeGreaterThan(0);
    });

    it("should keep every part's length through the flip", () => {
      const { start, duration } = props.timing.subject;
      for (const t of [0.05, 0.15, 0.3]) {
        const s = sceneAt(props, Math.round(start + duration * t));
        expect(s.camera).toBe(0);
        props.rows.forEach((r: any, i: number) => expect(s.rows[i].part.w).toBeCloseTo(Math.abs(r.change) * props.unit, 6));
      }
    });

    it("should make the one rise a length inside its column at the camera's closest, and pull back by the end", () => {
      const close = sceneAt(props, last("subject"));
      const c = props.columns[props.rows[riseAt].column];
      expect(close.scale).toBe(props.zoomBy);
      const rise = close.rows[riseAt].part;
      expect(rise.w).toBeGreaterThan(props.barH);
      expect(rise.x + rise.w).toBeLessThan(c.end);
      const end = sceneAt(props, props.timing.total - 1);
      expect([end.camera, end.scale]).toEqual([0, 1]);
    });

    it("should set the credit on one line", () => {
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
