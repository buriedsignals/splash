import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { DivergingStackFrame } from "./DivergingStackFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the whole 100 % bars from one left edge; the slide that sets every nuclear astride the anchor, lengths kept;
 * France's two sides laid end to end from its nuclear's left edge, stopping short of its end; the whole chart at the end.
 */

const beat = loadBeat();
const close = (v: number) => expect.closeTo(v, 6);

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(DivergingStackFrame, { ...props, at: frame }),
    );
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const mid = (event: string, t: number) =>
    Math.round(props.timing[event].start + props.timing[event].duration * t);
  const subjectAt = props.rows.findIndex((r: any) => r.key === props.subject);
  const lengthsOf = (row: any) => row.segments.map((s: any) => s.w);
  const sharesOf = (r: any) =>
    r.segments.map((s: any) => close(s.share * props.unit));
  const nuclearOf = (row: any) =>
    row.segments.find((s: any) => s.group === "centre");

  describe(`${id}'s diverging stacked bar video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title and lay every whole bar from one left edge at the end of the reference", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      props.rows.forEach((r: any, i: number) => {
        const segs = s.rows[i].segments;
        expect(segs[0].x).toBeCloseTo(props.plotLeft, 6);
        segs
          .slice(1)
          .forEach((seg: any, j: number) =>
            expect(seg.x).toBeCloseTo(segs[j].x + segs[j].w, 6),
          );
        expect(lengthsOf(s.rows[i])).toEqual(sharesOf(r));
        expect(segs.at(-1).x + segs.at(-1).w - props.plotLeft).toBeCloseTo(
          100 * props.unit,
          6,
        );
      });
    });

    it("should keep every length while the bars slide, and set every nuclear's middle on the anchor at the end of the reveal", () => {
      for (const t of [0.3, 0.5, 0.7]) {
        const s = sceneAt(props, mid("reveal", t));
        props.rows.forEach((r: any, i: number) =>
          expect(lengthsOf(s.rows[i])).toEqual(sharesOf(r)),
        );
      }
      const s = sceneAt(props, last("reveal"));
      props.rows.forEach((r: any, i: number) => {
        const n = nuclearOf(s.rows[i]);
        expect(n.x + n.w / 2).toBeCloseTo(props.anchor, 6);
        expect(s.rows[i].segments[0].x).toBeCloseTo(
          props.anchor - (r.centre / 2 + r.fossil) * props.unit,
          6,
        );
      });
    });

    it("should lay France's fossil then renewables end to end from its nuclear's left edge, short of its end, on a track of their own", () => {
      const s = sceneAt(props, last("subject"));
      const row = props.rows[subjectAt];
      const segs = s.rows[subjectAt].segments;
      const n = nuclearOf(s.rows[subjectAt]);
      const pair = segs.filter((seg: any) => seg.group !== "centre");
      const fossilFirst = [...pair].sort((a: any, b: any) => a.x - b.x);
      expect(fossilFirst.map((seg: any) => seg.group)).toEqual([
        ...row.left.map(() => "left"),
        ...row.right.map(() => "right"),
      ]);
      expect(fossilFirst[0].x).toBeCloseTo(n.x, 6);
      fossilFirst
        .slice(1)
        .forEach((seg: any, j: number) =>
          expect(seg.x).toBeCloseTo(fossilFirst[j].x + fossilFirst[j].w, 6),
        );
      const end = fossilFirst.at(-1).x + fossilFirst.at(-1).w;
      expect(end - n.x).toBeCloseTo(
        (row.fossil + row.renewable) * props.unit,
        6,
      );
      expect(end).toBeLessThan(n.x + n.w);
      expect(n.y).toBeCloseTo(row.y - props.lift, 6);
      pair.forEach((seg: any) =>
        expect(seg.y).toBeCloseTo(row.y + props.lift, 6),
      );
      expect(pair[0].y).toBeGreaterThanOrEqual(n.y + props.barH);
      expect(s.sum.opacity).toBe(1);
      expect(s.sum.x).toBeGreaterThan(end);
      props.rows.forEach((r: any, i: number) =>
        expect([r.key, s.rows[i].dim]).toEqual([
          r.key,
          i === subjectAt ? 0 : 1,
        ]),
      );
    });

    it("should never let France's two sides overlap while they slide", () => {
      for (let t = 0.4; t <= 0.85; t += 0.05) {
        const segs = sceneAt(props, mid("subject", t)).rows[subjectAt].segments;
        const leftEnd = Math.max(
          ...segs
            .filter((x: any) => x.group === "left")
            .map((x: any) => x.x + x.w),
        );
        const rightStart = Math.min(
          ...segs.filter((x: any) => x.group === "right").map((x: any) => x.x),
        );
        expect(leftEnd).toBeLessThanOrEqual(rightStart + 1e-6);
      }
    });

    it("should print France's nuclear and the sum of its two sides, the sum smaller", () => {
      const row = props.rows[subjectAt];
      expect([row.centreValue.text, props.sum.text]).toEqual(["67,7", "32,3"]);
    });

    it("should end on the whole chart: every row where the reveal left it, nothing stepped back, France's nuclear ringed", () => {
      const settled = sceneAt(props, last("reveal"));
      const end = sceneAt(props, props.timing.total - 1);
      props.rows.forEach((_: any, i: number) => {
        expect(
          end.rows[i].segments.map((seg: any) => [seg.x, seg.y, seg.w]),
        ).toEqual(
          settled.rows[i].segments.map((seg: any) =>
            [seg.x, seg.y, seg.w].map(close),
          ) as any,
        );
        expect(end.rows[i].dim).toBe(0);
      });
      expect([end.ring, end.sum.opacity, end.source]).toEqual([1, 0, 1]);
    });

    it("should set the credit on one line", () => {
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
