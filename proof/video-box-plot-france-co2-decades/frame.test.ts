import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { DRAWN_WIDER } from "../../skills/chart-video/scripts/shots.mjs";
import { BoxplotFrame } from "./BoxplotFrame.tsx";
import { buildDirection, loadBeat } from "./build.mjs";
import { MOVE, sceneAt, SLIDE, STEPS_OF, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; every reading at its year and value at the end of the reference; the readings keeping
 * their heights as they gather into a column; each box drawn out of its column on the decade's own statistics, the ring
 * on the one reading past a whisker; the box lifted beside its readings; one median walking the decades, landing on each
 * median, climbing to the peak and dropping after it, never under the peak's value; the whole box plot at the end.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(BoxplotFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return start + duration * (a + t * (b - a));
  };
  const steps = STEPS_OF(props.decades.length);
  /** The frame at which the walk stands at step position `s` (−0.5 before the first slide, `steps` on the last median). */
  const walkAt = (s: number) =>
    within("subject", "walk", (s + 0.5) / (steps + 1));
  const peak = props.peak;

  describe(`${id}'s box plot video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title and lay every reading at its year inside its decade's slot, at its value, by the end of the reference", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      props.readings.forEach((r: any, i: number) => {
        const d = props.decades[r.decade];
        expect([s.dots[i].x, s.dots[i].y, s.dots[i].opacity]).toEqual([
          expect.closeTo(
            d.slotLeft + (d.slot * (r.year - d.start + 0.5)) / 10,
            6,
          ),
          expect.closeTo(r.y, 6),
          1,
        ] as any);
      });
      expect(s.boxes.every((b: any) => b.opacity === 0)).toBe(true);
    });

    it("should keep every reading's height while the decades gather, and end each column on its decade's sample line", () => {
      for (const t of [0.3, 0.7]) {
        const s = sceneAt(props, within("reveal", "gather", t));
        props.readings.forEach((r: any, i: number) =>
          expect(s.dots[i].y).toBeCloseTo(r.y, 6),
        );
      }
      const s = sceneAt(props, within("reveal", "gather", 1));
      props.readings.forEach((r: any, i: number) =>
        expect(s.dots[i].x).toBeCloseTo(props.decades[r.decade].sampleX, 6),
      );
    });

    it("should draw each box out of its column on the decade's own median, quartiles and whiskers, ringing exactly the readings past a whisker", () => {
      const n = props.decades.length;
      props.decades.forEach((d: any, k: number) => {
        // The frame this decade's own build completes; its own lift has not started.
        const b = sceneAt(
          props,
          within("reveal", "box", (k / (n - 1)) * (1 - MOVE) + MOVE),
        ).boxes[k];
        expect([b.x, b.yMedian, b.yQ3, b.yQ1, b.yHi, b.yLo, b.opacity]).toEqual(
          [
            expect.closeTo(d.sampleX, 6),
            expect.closeTo(d.yMedian, 6),
            expect.closeTo(d.yQ3, 6),
            expect.closeTo(d.yQ1, 6),
            expect.closeTo(d.yHi, 6),
            expect.closeTo(d.yLo, 6),
            1,
          ] as any,
        );
        const beyond = props.readings
          .filter(
            (r: any) =>
              r.decade === k && (r.y < d.yHi - 1e-6 || r.y > d.yLo + 1e-6),
          )
          .map((r: any) => r.year);
        expect(d.outliers.map((o: any) => o.year)).toEqual(beyond);
        d.outliers.forEach((o: any, j: number) =>
          expect([b.rings[j].x, b.rings[j].y, b.rings[j].opacity]).toEqual([
            expect.closeTo(d.sampleX, 6),
            expect.closeTo(o.y, 6),
            1,
          ] as any),
        );
      });
      expect(
        props.decades.flatMap((d: any) => d.outliers.map((o: any) => o.year)),
      ).toEqual([1980]);
    });

    it("should lift every box out beside its readings by the end of the reveal", () => {
      const s = sceneAt(props, last("reveal"));
      props.decades.forEach((d: any, k: number) =>
        expect([
          s.boxes[k].x,
          s.boxes[k].rings.every((r: any) => Math.abs(r.x - d.cx) < 1e-6),
        ]).toEqual([expect.closeTo(d.cx, 6), true] as any),
      );
      props.readings.forEach((r: any, i: number) =>
        expect(s.dots[i].x).toBeCloseTo(props.decades[r.decade].sampleX, 6),
      );
    });

    it("should walk one median from box to box, sliding at its own height and landing on each next median — up to the peak, down at every step after", () => {
      const w = props.decades[0].boxWidth;
      for (let k = 0; k < steps; k++) {
        const from = props.decades[k];
        const to = props.decades[k + 1];
        const sliding = sceneAt(props, walkAt(k + SLIDE / 2)).walker;
        expect(sliding.y).toBeCloseTo(from.yMedian, 6);
        const landed = sceneAt(props, walkAt(k + 1)).walker;
        expect([landed.x, landed.y, landed.w]).toEqual([
          expect.closeTo(to.cx - w / 2, 6),
          expect.closeTo(to.yMedian, 6),
          expect.closeTo(w, 6),
        ] as any);
        // In pixels a climb is a smaller y: every step to the peak climbs, every step after it drops.
        expect([to.label, to.yMedian < from.yMedian]).toEqual([
          to.label,
          k + 1 <= peak,
        ]);
      }
      expect(
        props.decades.every(
          (d: any) => d.yMedian >= props.decades[peak].yMedian,
        ),
      ).toBe(true);
    });

    it("should light the peak only once the walk has landed on it, and print its median only where the walker no longer passes", () => {
      expect(sceneAt(props, walkAt(peak - 0.05)).boxes[peak].accent).toBe(0);
      const label = props.values[0];
      const right = label.x + label.width * (1 + DRAWN_WIDER);
      for (let f = props.timing.subject.start; f < props.timing.total; f++) {
        const s = sceneAt(props, f);
        if (s.values[0].opacity > 0 && s.walker.opacity > 0)
          expect(s.walker.x > right || s.walker.x + s.walker.w < label.x).toBe(
            true,
          );
      }
    });

    it("should end on the whole box plot, every box beside its readings, the peak in the accent, both medians printed, the walker gone, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      props.readings.forEach((r: any, i: number) =>
        expect([end.dots[i].x, end.dots[i].opacity]).toEqual([
          expect.closeTo(props.decades[r.decade].sampleX, 6),
          1,
        ] as any),
      );
      expect(
        end.boxes.map((b: any, k: number) => [b.x, b.opacity, b.accent]),
      ).toEqual(
        props.decades.map((d: any, k: number) => [
          expect.closeTo(d.cx, 6),
          1,
          k === peak ? 1 : 0,
        ]),
      );
      expect([
        end.walker.opacity,
        end.values.map((v: any) => v.opacity),
        end.source,
        props.credit.lines.length,
      ]).toEqual([0, [1, 1], 1, 1]);
    });
  });
}
