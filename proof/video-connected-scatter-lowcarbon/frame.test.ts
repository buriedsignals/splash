import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { ConnectedScatterFrame } from "./ConnectedScatterFrame.tsx";
import { journeyOf, sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the story told in
 * order: the title at frame 0, the count as many as the discs that have landed, the close-up, the five and France picked
 * out only at the conclusion, the video ending on the whole axis; and the names seated clear of every mark and each other.
 */

const beat = loadBeat();
type Box = { x0: number; y0: number; x1: number; y1: number };
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props, geometry } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(ConnectedScatterFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;

  describe(`${id}'s connected scatter video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title and end on the whole axis", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const end = sceneAt(props, props.timing.total - 1);
      expect([end.title, end.xMax]).toEqual([0, props.domain.whole]);
    });

    it("should count as many countries as have landed, each one higher than its ring", () => {
      const { start, duration } = props.timing.reveal;
      const [a, b] = WINDOWS.reveal.travel;
      const frame = Math.round(start + duration * (a + 0.5 * (b - a)));
      const scene = sceneAt(props, frame);
      const landed = props.entities.filter((e: any) => journeyOf(scene.travel, e.rank, props.entities.length) >= 1);
      expect(scene.cleaner).toBe(landed.length);
      expect(scene.cleaner > 0 && scene.cleaner < props.entities.length).toBe(true);
      expect(props.entities.filter((e: any) => !(e.y1 < e.y0))).toEqual([]);
    });

    it("should close onto the crowd at the end of the subject, France and Germany out of the frame", () => {
      const scene = sceneAt(props, last("subject"));
      expect(scene.xMax).toBe(props.domain.close);
      expect(props.entities.filter((e: any) => Math.max(e.from, e.to) > scene.xMax).map((e: any) => e.code).sort()).toEqual(["DEU", "FRA"]);
    });

    it("should not pick out the five or France before the conclusion", () => {
      const discFills = (svg: string) => new Set([...svg.matchAll(/<circle\b[^>]*fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]));
      const before = discFills(markupAt(last("subject")));
      expect([before.has(props.colours.subject), before.has(props.colours.picked)]).toEqual([false, false]);
      const end = discFills(markupAt(props.timing.total - 1));
      expect([end.has(props.colours.subject), end.has(props.colours.picked)]).toEqual([true, true]);
    });

    it("should name every country in the close-up, and France and the five on the whole axis", () => {
      expect(props.entities.filter((e: any) => Math.max(e.from, e.to) < props.domain.close && !e.names.close).map((e: any) => e.code)).toEqual([]);
      expect([props.subject, ...props.lighter].filter((c) => !props.entities.find((e: any) => e.code === c).names.whole)).toEqual([]);
    });

    for (const scale of ["whole", "close"] as const)
      it(`should seat the ${scale} names clear of each other, of every mark in view and of the panel`, () => {
        const seating = scale === "whole" ? geometry.wholeSeating : geometry.closeSeating;
        const marks = scale === "whole" ? geometry.wholeMarks : geometry.closeMarks;
        const boxes: Box[] = Object.values(seating.names).map((n: any) => n.box);
        const clashes = boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => overlaps(a, b)));
        expect(clashes).toEqual([]);
        expect(boxes.filter((b) => marks.some((m: Box) => overlaps(b, m)) || overlaps(b, geometry.panelBox))).toEqual([]);
      });

    it("should seat the counters and the key clear of every mark at both scales", () => {
      expect([...geometry.wholeMarks, ...geometry.closeMarks, ...geometry.legWords].filter((m: Box) => overlaps(m, geometry.panelBox))).toEqual([]);
    });
  });
}
