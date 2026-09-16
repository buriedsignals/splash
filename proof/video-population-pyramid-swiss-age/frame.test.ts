import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { PyramidFrame } from "./PyramidFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; the pyramid on one scale at the end of the reference; the men's bars keeping their
 * lengths as they fold onto the women's; only the difference left, on its leader's side, at the end of the reveal; the
 * difference magnified around the spine, changing side at the crossing; the shared part growing back without changing the
 * difference; the whole pyramid at the end, the credit on one line.
 */

const beat = loadBeat();
const visible = (bars: any[]) =>
  bars.filter((b) => b.opacity > 0 && b.w > 1e-9);

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(PyramidFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };
  const { left: sL, right: sR } = props.spine;
  const diff = (r: any) => Math.abs(r.female - r.male);

  describe(`${id}'s population pyramid video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title and stand the pyramid on one scale out of the spine at the end of the reference", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      props.rows.forEach((r: any, i: number) => {
        const [women, men] = s.rows[i].bars;
        expect([men.w, men.x + men.w, women.w, women.x]).toEqual([
          expect.closeTo(r.male * props.unit, 6),
          expect.closeTo(sL, 6),
          expect.closeTo(r.female * props.unit, 6),
          expect.closeTo(sR, 6),
        ] as any);
      });
    });

    it("should keep every men's bar's length while it folds, and land it on the women's", () => {
      for (const t of [0.3, 0.6]) {
        const s = sceneAt(props, within("reveal", "fold", t));
        props.rows.forEach((r: any, i: number) =>
          expect(s.rows[i].bars[1].w).toBeCloseTo(r.male * props.unit, 6),
        );
      }
      const s = sceneAt(props, within("reveal", "fold", 1));
      props.rows.forEach((_: any, i: number) =>
        expect(s.rows[i].bars[1].x).toBeCloseTo(sR, 6),
      );
    });

    it("should leave only the difference at the end of the reveal, its length |women − men| against the spine on the leader's side", () => {
      const s = sceneAt(props, last("reveal"));
      props.rows.forEach((r: any, i: number) => {
        const bars = visible(s.rows[i].bars);
        expect(bars.length).toBe(1);
        const [b] = bars;
        expect(b.w).toBeCloseTo(diff(r) * props.unit, 6);
        if (r.female > r.male)
          expect([b.fill, b.x]).toEqual([
            "women",
            expect.closeTo(sR, 6),
          ] as any);
        else
          expect([b.fill, b.x + b.w]).toEqual([
            "men",
            expect.closeTo(sL, 6),
          ] as any);
      });
    });

    it("should magnify the difference by the zoom around the spine, men's to the left below the crossing and women's to the right from it", () => {
      const s = sceneAt(props, last("subject"));
      expect(s.zoom).toBeCloseTo(props.zoomBy, 9);
      props.rows.forEach((r: any, i: number) => {
        const [b] = visible(s.rows[i].bars);
        expect([r.band, b.fill, b.w]).toEqual([
          r.band,
          i < props.crossing ? "men" : "women",
          expect.closeTo(diff(r) * props.unit * props.zoomBy, 6),
        ] as any);
        expect(
          b.x >= props.inset - 1e-6 &&
            b.x + b.w <= props.frame.width - props.inset + 1e-6,
        ).toBe(true);
      });
      // The magnified scale's ticks stand exactly where the whole scale's stood.
      const shown = s.ticks
        .filter((t: any) => t.opacity > 0)
        .map((t: any) => Math.round(t.x * 1000));
      const before = sceneAt(props, last("reveal"))
        .ticks.filter((t: any) => t.opacity > 0)
        .map((t: any) => Math.round(t.x * 1000));
      expect(shown).toEqual(before);
    });

    it("should grow the shared part back equally on both sides without changing the difference", () => {
      for (const t of [0.3, 0.7]) {
        const s = sceneAt(props, within("conclusion", "rebuild", t));
        expect(s.zoom).toBeCloseTo(1, 9);
        props.rows.forEach((r: any, i: number) => {
          const [left, right] = s.rows[i].bars;
          expect([left.x + left.w, right.x]).toEqual([
            expect.closeTo(sL, 6),
            expect.closeTo(sR, 6),
          ] as any);
          expect(Math.abs(right.w - left.w)).toBeCloseTo(
            diff(r) * props.unit,
            6,
          );
        });
      }
    });

    it("should end on the whole pyramid, every band at its two lengths, the rule kept, the zoom's words gone, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      props.rows.forEach((r: any, i: number) => {
        const [left, right] = end.rows[i].bars;
        expect([
          left.fill,
          left.w,
          left.opacity,
          right.fill,
          right.w,
          right.opacity,
        ]).toEqual([
          "men",
          expect.closeTo(r.male * props.unit, 6),
          1,
          "women",
          expect.closeTo(r.female * props.unit, 6),
          1,
        ] as any);
      });
      expect([
        end.rule,
        end.zoomWord,
        end.values.every((v: any) => v.opacity === 0),
        end.source,
      ]).toEqual([1, 0, true, 1]);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
