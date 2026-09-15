import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { DotStripFrame } from "./DotStripFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: sixteen chips on 2000, Poland the floor and Sweden the ceiling; floor first, every copy travelling right to its
 * 2024 seat; the 2000 span sliding onto 2024 keeping its length, pinned to Sweden, overhanging Poland's pin by the closure;
 * the whole chart at the end, nothing stepped back, the overhang gone, the credit on one line.
 */

const beat = loadBeat();
type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Does the segment cross the box? Sampled finely enough for a 1 px box edge. */
const crosses = (
  s: { x0: number; y0: number; x1: number; y1: number },
  b: Box,
) => {
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const x = s.x0 + (s.x1 - s.x0) * t;
    const y = s.y0 + (s.y1 - s.y0) * t;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
};

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(DotStripFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };
  const keys = props.marks.map((m: any) => m.code);
  const pol = props.marks[keys.indexOf("POL")];
  const swe = props.marks[keys.indexOf("SWE")];

  describe(`${id}'s dot strip video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should seat sixteen chips on 2000 at reference, Poland the floor and Sweden the ceiling, none travelled", () => {
      const s = sceneAt(props, last("reference"));
      expect(props.marks.length).toBe(16);
      const xs = props.marks.map((m: any) => m.a.x);
      expect([
        keys[xs.indexOf(Math.min(...xs))],
        keys[xs.indexOf(Math.max(...xs))],
      ]).toEqual(["POL", "SWE"]);
      expect(s.marks.every((m: any) => m.copy.on === 0)).toBe(true);
    });

    it("should travel floor first and land every copy on its 2024 seat, every one to the right", () => {
      for (const m of props.marks)
        expect([m.code, m.b.x > m.a.x]).toEqual([m.code, true]);
      const mid = sceneAt(props, within("reveal", "travel", 0.5));
      const landed = keys.filter(
        (_: string, i: number) => mid.marks[i].arrived === 1,
      );
      expect(landed.length > 0 && landed.length < 16).toBe(true);
      expect(
        [...landed].sort(
          (a, b) =>
            beat.subject.byBefore.indexOf(a) - beat.subject.byBefore.indexOf(b),
        ),
      ).toEqual(beat.subject.byBefore.slice(0, landed.length));
      const end = sceneAt(props, last("reveal"));
      expect(end.marks.map((m: any) => [m.copy.x, m.copy.y])).toEqual(
        props.marks.map((m: any) => [m.b.x, m.b.chipY]),
      );
    });

    it("should never let two chips of one strip touch", () => {
      for (const seat of ["a", "b"]) {
        const boxes = props.marks.map((m: any) => ({
          x: m[seat].x - m.width / 2,
          y: m[seat].chipY,
          w: m.width,
          h: props.chipH,
        }));
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++)
            expect([keys[i], keys[j], overlaps(boxes[i], boxes[j])]).toEqual([
              keys[i],
              keys[j],
              false,
            ]);
      }
    });

    it("should slide the 2000 span onto 2024 keeping its length, pinned to Sweden, overhanging Poland by the closure", () => {
      const length = props.spans.before.x1 - props.spans.before.x0;
      expect([props.spans.before.x0, props.spans.before.x1]).toEqual([
        pol.a.x,
        swe.a.x,
      ]);
      const mid = sceneAt(props, within("subject", "drop", 0.5));
      expect(mid.copy.x1 - mid.copy.x0).toBeCloseTo(length, 6);
      expect(
        mid.copy.y > props.strips[0].rail && mid.copy.y < props.strips[1].rail,
      ).toBe(true);
      const end = sceneAt(props, last("subject"));
      expect(end.copy.x1 - end.copy.x0).toBeCloseTo(length, 6);
      expect(end.copy.x1).toBeCloseTo(swe.b.x, 6);
      expect(end.copy.y).toBe(props.strips[1].rail);
      expect((pol.b.x - end.copy.x0) / props.pxPerPoint).toBeCloseTo(
        beat.subject.closed,
        6,
      );
      expect(props.changes.map((c: any) => c.line.text)).toEqual([
        "+29,5",
        "+2,1",
      ]);
      expect(props.cutLabel.text).toBe("−27,4");
    });

    it("should write the three figures clear of every leader and every chip", () => {
      const words = [...props.changes.map((c: any) => c.box), props.cutBox];
      for (const box of words) {
        for (const m of props.marks) {
          expect([m.code, crosses(m.leader, box)]).toEqual([m.code, false]);
          for (const seat of ["a", "b"])
            expect([
              m.code,
              seat,
              overlaps(box, {
                x: m[seat].x - m.width / 2,
                y: m[seat].chipY,
                w: m.width,
                h: props.chipH,
              }),
            ]).toEqual([m.code, seat, false]);
        }
      }
    });

    it("should end on the whole chart: nothing stepped back, the overhang gone, both spans on their rails, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect(end.marks.every((m: any) => m.dim === 0 && m.arrived === 1)).toBe(
        true,
      );
      expect([end.overhang, end.cutLabel, end.source, end.span]).toEqual([
        0, 0, 1, 1,
      ]);
      expect(end.copy.x0).toBeCloseTo(
        pol.b.x - beat.subject.closed * props.pxPerPoint,
        6,
      );
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
