import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { ParallelFrame } from "./ParallelFrame.tsx";
import { railXAt, sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0; Finland's whole bar at 100 × the scale; every piece keeping its length as it
 * stands, landing on its rail with its top on the line's vertex; all sixteen drawn and named; the gap opened with every
 * height kept; the count, at every frame of both sweeps, the lines at or above both floors — 5, then 2; the whole chart
 * at the end, nothing stepped back, the pair in the accent, the floors marked.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(ParallelFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.ceil(start + duration * (a + t * (b - a)));
  };
  const shownAt = props.lines.findIndex((l: any) => l.shown);
  const shown = props.lines[shownAt];

  describe(`${id}'s parallel coordinates video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title card at frame 0", () => {
      expect(sceneAt(props, 0).title).toBe(1);
    });

    it("should grow Finland's whole bar to 100 × the scale along the foot", () => {
      const extentOf = (s: any) =>
        s.pieces.reduce(
          (sum: number, p: any) => sum + Math.hypot(p.x2 - p.x1, p.y2 - p.y1),
          0,
        );
      const grown = sceneAt(props, within("reference", "bar", 1));
      expect([grown.bar, extentOf(grown)]).toEqual([
        1,
        expect.closeTo(100 * props.scale, 6),
      ]);
      const mid = sceneAt(props, within("reference", "bar", 0.5));
      expect(mid.bar > 0.3 && mid.bar < 0.7).toBe(true);
      expect(extentOf(mid)).toBeCloseTo(mid.bar * 100 * props.scale, 6);
      expect(
        mid.pieces.every(
          (p: any) => p.y1 === props.foot && p.y2 === props.foot,
        ),
      ).toBe(true);
    });

    it("should keep every piece's length while it stands, and land it on its rail with its top on the line's vertex", () => {
      for (const t of [0.3, 0.6]) {
        const s = sceneAt(props, within("reference", "stand", t));
        props.bar.pieces.forEach((piece: any, k: number) => {
          const p = s.pieces[k];
          expect(Math.hypot(p.x2 - p.x1, p.y2 - p.y1)).toBeCloseTo(
            piece.len,
            6,
          );
        });
      }
      const landed = sceneAt(props, within("reference", "stand", 1));
      props.bar.pieces.forEach((piece: any, k: number) => {
        const p = landed.pieces[k];
        if (piece.axis === null) return expect(p.opacity).toBe(0);
        expect(
          [p.x1, p.x2, p.y1, p.y2].map((v) => Math.round(v * 1e6) / 1e6),
        ).toEqual(
          [
            railXAt(props, piece.axis, 0),
            railXAt(props, piece.axis, 0),
            props.foot,
            shown.ys[piece.axis],
          ].map((v) => Math.round(v * 1e6) / 1e6),
        );
      });
    });

    it("should draw and name all sixteen by the end of reveal, no two names touching and none across another rail", () => {
      const s = sceneAt(props, last("reveal"));
      expect(s.lines.length).toBe(16);
      for (const l of s.lines)
        expect([l.points.length, l.name.opacity]).toEqual([7, 1]);
      const boxes = props.lines.map((l: any) => l.seat.box);
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, b] = [boxes[i], boxes[j]];
          expect([
            props.lines[i].code,
            props.lines[j].code,
            a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1,
          ]).toEqual([props.lines[i].code, props.lines[j].code, false]);
        }
      for (const l of props.lines)
        for (let j = 0; j < 7; j++)
          if (j !== l.seat.axis)
            expect([
              l.code,
              j,
              railXAt(props, j, 0) > l.seat.box.x0 &&
                railXAt(props, j, 0) < l.seat.box.x1,
            ]).toEqual([l.code, j, false]);
    });

    it("should open the gap between the nuclear and wind rails across the frame, every height kept", () => {
      const before = sceneAt(props, last("reveal"));
      const open = sceneAt(props, within("subject", "zoom", 1));
      expect(open.camera).toBe(1);
      expect(railXAt(props, 1, 1) - railXAt(props, 0, 1)).toBeGreaterThan(
        0.6 * props.frame.width,
      );
      expect(railXAt(props, 2, 1)).toBeGreaterThan(props.frame.width);
      open.lines.forEach((l: any, i: number) =>
        expect(l.points.map((p: number[]) => p[1])).toEqual(
          before.lines[i].points.map((p: number[]) => p[1]),
        ),
      );
      open.lines.forEach((l: any) =>
        expect(l.points[0][0]).toBeCloseTo(railXAt(props, 0, 1), 6),
      );
    });

    it("should count, at every frame of both sweeps, the lines at or above both floors — 5 at 25 %, then 2 at 20 %", () => {
      const values = props.lines.map((l: any) => l.values);
      for (
        let f = props.timing.subject.start;
        f < endOf(props.timing.subject);
        f += 3
      ) {
        const s = sceneAt(props, f);
        const [nf, wf] = s.floors.map((fl: any) => fl.value);
        expect([f, s.count]).toEqual([
          f,
          values.filter((v: number[]) => v[0] >= nf - 1e-9 && v[1] >= wf - 1e-9)
            .length,
        ]);
      }
      const nuclearDone = sceneAt(props, within("subject", "nuclear", 1));
      expect([nuclearDone.floors[0].value, nuclearDone.count]).toEqual([25, 5]);
      const end = sceneAt(props, last("subject"));
      expect([end.floors[1].value, end.count]).toEqual([20, 2]);
      expect(
        props.lines.filter((_: any, i: number) => end.lines[i].stepBack === 1)
          .length,
      ).toBe(14);
      expect(
        props.lines
          .filter((_: any, i: number) => end.lines[i].accent === 1)
          .map((l: any) => l.code)
          .sort(),
      ).toEqual(beat.subject.both.map((l: any) => l.code).sort());
    });

    it("should end on the whole chart: rails home, nothing stepped back, the pair in the accent, both floors marked, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect(end.camera).toBe(0);
      expect(
        end.lines.every(
          (l: any) =>
            l.stepBack === 0 && l.name.opacity === 1 && l.points.length === 7,
        ),
      ).toBe(true);
      expect(
        props.lines
          .filter((_: any, i: number) => end.lines[i].accent === 1)
          .map((l: any) => l.code)
          .sort(),
      ).toEqual(beat.subject.both.map((l: any) => l.code).sort());
      expect(end.floors.map((f: any) => [f.value, f.opacity])).toEqual([
        [25, 1],
        [20, 1],
      ]);
      expect(end.counter).toBe(0);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
