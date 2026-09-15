import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { TreemapFrame } from "./TreemapFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0; one block whose width is the running total; the cells tiling it, each its share
 * of the box; wind and solar at their share in every cell; the ten past the middle flooded and counted; the flooded
 * cells keeping their areas all the way into France's cell and back; the whole treemap at the end, France ringed.
 */

const beat = loadBeat();
const areaOf = (r: any) => r.w * r.h;

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(TreemapFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const at = (event: string, p: number) => props.timing[event].start + Math.round(props.timing[event].duration * p);
  const thread = props.cells.filter((c: any) => c.tipped);
  const indexOf = (key: string) => props.cells.findIndex((c: any) => c.key === key);

  describe(`${id}'s treemap video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should carry a measured width for every counter at every frame", () => {
      const unmeasured = [];
      for (let f = 0; f < props.timing.total; f += 3) if (/<text\b(?![^>]*data-width="\d)[^>]*>/.test(markupAt(f))) unmeasured.push(f);
      expect(unmeasured).toEqual([]);
    });

    it("should open on the title card, then grow one block whose width is the running total", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const [a, b] = WINDOWS.reference.whole;
      const mid = sceneAt(props, at("reference", (a + b) / 2));
      expect(Math.abs(mid.whole.w / props.box.w - mid.whole.count / props.totalGw)).toBeLessThan(1 / props.totalGw);
      // Linear, not eased: a third of the way into the event, the window's own share of the total.
      const t = (20 / props.timing.reference.duration - a) / (b - a);
      expect(sceneAt(props, props.timing.reference.start + 20).whole.count).toBe(Math.round(props.totalGw * t));
      const end = sceneAt(props, last("reference"));
      expect([end.whole.w, end.whole.count, end.split]).toEqual([props.box.w, props.totalGw, 0]);
    });

    it("should split the block into cells that tile it, each its share of the box", () => {
      const total = props.cells.reduce((s: number, c: any) => s + c.mw, 0);
      expect(props.cells.reduce((s: number, c: any) => s + areaOf(c.rect), 0)).toBeCloseTo(areaOf(props.box), 3);
      for (const c of props.cells) expect([c.key, areaOf(c.rect)]).toEqual([c.key, expect.closeTo((c.mw / total) * areaOf(props.box), 3)] as any);
      const end = sceneAt(props, last("reveal"));
      expect(end.cells.map((c: any) => c.seam)).toEqual(props.cells.map(() => 1));
      expect(end.whole.opacity).toBe(0);
    });

    it("should raise wind and solar to each cell's share, and flood exactly the cells past the middle", () => {
      const [fa, fb] = WINDOWS.subject.fill;
      const t = (20 / props.timing.subject.duration - fa) / (fb - fa);
      const rising = sceneAt(props, props.timing.subject.start + 20);
      props.cells.forEach((c: any, i: number) => expect([c.key, rising.cells[i].level]).toEqual([c.key, expect.closeTo(c.share * t, 6)] as any));
      const filled = sceneAt(props, at("subject", WINDOWS.subject.fill[1]));
      props.cells.forEach((c: any, i: number) => expect([c.key, filled.cells[i].level]).toEqual([c.key, expect.closeTo(c.share, 2)] as any));
      expect(props.cells.filter((c: any) => c.share > 0.5).map((c: any) => c.key)).toEqual(thread.map((c: any) => c.key));
      const flooded = sceneAt(props, at("subject", WINDOWS.subject.flood[1]));
      expect(flooded.cells.map((c: any) => c.level)).toEqual(props.cells.map((c: any) => (c.tipped ? 1 : 0)));
      expect(flooded.tipped).toBe(beat.subject.tipped.length);
      expect(flooded.tipped).toBe(10);
    });

    it("should keep every flooded cell's area while it travels into France's cell and back", () => {
      for (let f = at("subject", WINDOWS.subject.gather[0]); f < props.timing.total; f += 2) {
        const s = sceneAt(props, f);
        for (const c of thread) expect([f, c.key, areaOf(s.cells[indexOf(c.key)].rect)]).toEqual([f, c.key, expect.closeTo(areaOf(c.rect), 6)] as any);
      }
    });

    it("should pack the flooded cells inside France's cell, under its words, filling its lower part by their sum", () => {
      const france = props.cells[indexOf(props.biggest)];
      expect(france.tipped).toBe(false);
      const s = sceneAt(props, last("subject"));
      for (const c of thread) {
        const r = s.cells[indexOf(c.key)].rect;
        expect([c.key, r.x, r.y, r.w, r.h]).toEqual([c.key, expect.closeTo(c.target.x, 6), expect.closeTo(c.target.y, 6), expect.closeTo(c.target.w, 6), expect.closeTo(c.target.h, 6)] as any);
        expect(r.x >= props.strip.x - 1e-6 && r.x + r.w <= props.strip.x + props.strip.w + 1e-6 && r.y >= props.strip.y - 1e-6 && r.y + r.h <= props.strip.y + props.strip.h + 1e-6).toBe(true);
      }
      expect(areaOf(props.strip)).toBeCloseTo(thread.reduce((a: number, c: any) => a + areaOf(c.rect), 0), 6);
      expect(areaOf(props.strip) / areaOf(france.rect)).toBeLessThan(1);
      expect(props.strip.y + props.strip.h).toBeCloseTo(france.rect.y + france.rect.h, 6);
      expect(france.rect.y + france.names.at(-1).dy).toBeLessThan(props.strip.y);
      expect(s.sum).toBe(1);
    });

    it("should end on the whole treemap, every cell home, the ten flooded, France ringed, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      props.cells.forEach((c: any, i: number) => expect([c.key, end.cells[i].rect, end.cells[i].level, end.cells[i].words]).toEqual([c.key, c.rect, c.tipped ? 1 : 0, 1]));
      expect([end.ring, end.sum, end.tipped]).toEqual([1, 0, 10]);
      props.cells.forEach((c: any, i: number) => expect([c.key, end.cells[i].covered]).toEqual([c.key, [...c.values, ...c.names].map(() => c.tipped)]));
      expect(props.cells[0].key).toBe(props.biggest);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
