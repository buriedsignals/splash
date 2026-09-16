import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { PopulationFrame } from "./PopulationFrame.tsx";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0; the surface filled from zero to 2023 with the population at 8,09 milliards; the
 * 1800 slice copied up its own column, the count only naming complete copies, until its top meets the 2023 reading at
 * ×8,2; the level run out to 2023; 2022's crossing ringed; the surface given back whole with the credit on one line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const T = props.timing as any;
  const P = props as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(PopulationFrame, { ...P, at: frame }));
  const last = (event: string) => endOf(T[event]) - 1;
  const inSubject = (t: number) => Math.round(T.subject.start + T.subject.duration * t);

  describe(`${id}'s population video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under the floor at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title with no surface, and fill to 2023 with 8,09 milliards at the end of reveal", () => {
      expect([sceneAt(P, 0).title, sceneAt(P, 0).surface]).toEqual([1, ""]);
      const reveal = sceneAt(P, last("reveal"));
      expect([reveal.fill, reveal.year, reveal.counterShown]).toEqual([1, 2023, 1]);
      expect(props.counter.texts["2023"].text.replace(/\s/g, "")).toBe("8,09milliards");
      expect(props.counter.texts["1800"].text.replace(/\s/g, "")).toBe("0,98milliard");
    });

    it("should close the surface on zero — a population is read from its base", () => {
      expect(sceneAt(P, last("reveal")).surface.endsWith(`${Math.round(props.plot.bottom * 100) / 100}Z`)).toBe(true);
    });

    it("should size the unit as the 1800 reading on the plot's own scale", () => {
      expect(props.unitHeight).toBeCloseTo(props.baseY - props.points[0].y, 0);
    });

    it("should stack the copies linearly in value, the count naming only complete copies", () => {
      const mid = sceneAt(P, inSubject(0.43));
      expect(mid.copies).toBeGreaterThan(3);
      expect(mid.copies).toBeLessThan(7);
      expect(mid.count).toBe(String(Math.floor(mid.copies)));
      expect(mid.blocks.length).toBe(Math.ceil(mid.copies));
      const heights = Array.from({ length: 30 }, (_, i) => sceneAt(P, inSubject(0.3) + i).stackTop);
      for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeLessThan(heights[i - 1]);
    });

    it("should land the stack's top on the 2023 reading at ×8,2, then run the level to 2023 and ring 2022's crossing", () => {
      const landed = sceneAt(P, last("subject"));
      expect(landed.stackTop).toBeCloseTo(props.points.at(-1).y, 0);
      expect(props.counter.counts[landed.count].text).toBe("×8,2");
      expect([landed.level, landed.named]).toEqual([1, 1]);
      expect(landed.levelX).toBeCloseTo(props.points.at(-1).x, 3);
      const x2021 = props.points.find((p: any) => p.year === 2021).x;
      const x2022 = props.points.find((p: any) => p.year === 2022).x;
      expect(props.ring.x).toBeGreaterThan(x2021);
      expect(props.ring.x).toBeLessThan(x2022);
      expect(props.crossingLabel.text).toBe("2022");
    });

    it("should close in until the crossing and the last reading stand well apart, the count and the ticks gone", () => {
      const close = sceneAt(P, last("subject"));
      expect(close.zoom).toBe(1);
      expect(Math.hypot(close.end.x - close.ring.x, close.end.y - close.ring.y)).toBeGreaterThan(300);
      for (const p of [close.ring, close.end]) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(props.frame.width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(props.frame.height);
      }
      const svg = markupAt(last("subject"));
      expect(svg).toMatch(/opacity="0"[^>]*>×8,2</);
      expect(svg).toContain(">2022<");
      expect(svg).toContain(">2023<");
    });

    it("should neither run the level nor ring the crossing before the stack has landed", () => {
      const beforeLevel = sceneAt(P, inSubject(0.5));
      expect([beforeLevel.level, beforeLevel.named]).toEqual([0, 0]);
    });

    it("should pull back to the whole surface at full strength, the stack and the level kept, the credit on one line", () => {
      const end = sceneAt(P, T.total - 1);
      expect([end.tint, end.unit, end.stack, end.level, end.zoom, end.named, end.source]).toEqual([0, 1, 1, 1, 0, 0, 1]);
      expect(end.surface).toBe(sceneAt(P, last("reveal")).surface);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
