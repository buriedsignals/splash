import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { ScatterFrame } from "./ScatterFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: one column of 165 dots, each at its own age; the column unfolding along income, no dot ever changing height,
 * the countries counted as they land; the cloud folded against the break into two columns, a bar over each side's span on
 * the age scale, three copies of the short bar stacked on the long one; the whole cloud at the end, the bars kept.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(ScatterFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };
  const members = props.members;
  const n = members.length;
  const ageAt = (y: number) =>
    props.age.lo +
    ((props.age.bottom - y) / (props.age.bottom - props.age.top)) *
      (props.age.hi - props.age.lo);
  const noOverlap = (xs: number[]) => {
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (
          Math.hypot(xs[i] - xs[j], members[i].y - members[j].y) <
          2 * props.radius
        )
          return false;
    return true;
  };

  describe(`${id}'s scatter video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should seat every country at its own age and its own income on the log scale", () => {
      const [a, b] = [props.xTicks[0], props.xTicks.at(-1)];
      for (const m of members) {
        expect(ageAt(m.y)).toBeCloseTo(m.age, 6);
        expect((m.x - a.at) / (b.at - a.at)).toBeCloseTo(
          Math.log(m.income / a.v) / Math.log(b.v / a.v),
          6,
        );
      }
    });

    it("should open on one column of every country, no two dots overlapping, before any has left", () => {
      expect(noOverlap(members.map((m: any) => m.column))).toBe(true);
      const s = sceneAt(props, last("reference"));
      expect(s.counted).toBe(0);
      s.members.forEach((d: any, i: number) =>
        expect(d.x).toBe(members[i].column),
      );
    });

    it("should unfold the column along income without a dot changing height, counting the countries as they land", () => {
      const s = sceneAt(props, within("reveal", "split", 0.4));
      s.members.forEach((d: any, i: number) => expect(d.y).toBe(members[i].y));
      expect(s.counted).toBe(
        s.members.filter((d: any) => d.landed === 1).length,
      );
      expect(s.counted > 0 && s.counted < n).toBe(true);
      const end = sceneAt(props, last("reveal"));
      expect(end.counted).toBe(n);
      end.members.forEach((d: any, i: number) =>
        expect(d.x).toBe(members[i].x),
      );
    });

    it("should fold each side against the break into a column of its own, no two dots overlapping", () => {
      const s = sceneAt(props, last("subject"));
      const below = members.filter((m: any) => m.income < props.breakAt);
      expect([below.length, n - below.length]).toEqual([
        beat.subject.below.count,
        beat.subject.above.count,
      ]);
      members.forEach((m: any, i: number) => {
        expect(s.members[i].x).toBe(m.strip);
        expect(s.members[i].y).toBe(m.y);
        if (m.income < props.breakAt)
          expect(m.strip + props.radius).toBeLessThan(props.break.x);
        else expect(m.strip - props.radius).toBeGreaterThan(props.break.x);
      });
      expect(noOverlap(members.map((m: any) => m.strip))).toBe(true);
    });

    it("should draw each side's bar over its span on the age scale", () => {
      const { long, short } = props.bars;
      expect(
        [ageAt(long.bottom), ageAt(long.top)].map((v) => v.toFixed(6)),
      ).toEqual(
        [beat.subject.below.lo, beat.subject.below.hi].map((v) => v.toFixed(6)),
      );
      expect(
        [ageAt(short.bottom), ageAt(short.top)].map((v) => v.toFixed(6)),
      ).toEqual(
        [beat.subject.above.lo, beat.subject.above.hi].map((v) => v.toFixed(6)),
      );
      expect(long.x + props.barWidth).toBeLessThan(props.break.x);
      expect(short.x).toBeGreaterThan(props.break.x);
    });

    it("should stack three copies of the short bar on the long one, end to end from its low end", () => {
      const mid = sceneAt(props, within("subject", "stack", 0.5));
      const down = mid.copies.filter((c: any) => c.landed === 1).length;
      expect(down > 0 && down < 3).toBe(true);
      const end = sceneAt(props, last("subject"));
      const h = props.bars.short.bottom - props.bars.short.top;
      expect(end.copies.length).toBe(Math.round(beat.subject.ratio));
      end.copies.forEach((c: any, k: number) => {
        expect(c.bottom - c.top).toBeCloseTo(h, 6);
        expect(c.bottom).toBeCloseTo(props.bars.long.bottom - k * h, 6);
        expect(c.x + props.barWidth).toBeLessThanOrEqual(props.bars.long.x);
      });
    });

    it("should end on the whole cloud: every dot on its seat, the bars grown, no copy, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      end.members.forEach((d: any, i: number) =>
        expect([d.x, d.y]).toEqual([members[i].x, members[i].y]),
      );
      expect([
        end.bars.long.top,
        end.bars.short.top,
        end.bars.values,
        end.rule,
        end.counter,
        end.times,
      ]).toEqual([props.bars.long.top, props.bars.short.top, 1, 1, 0, 0]);
      expect(end.copies.every((c: any) => c.on === 0)).toBe(true);
      expect(props.credit.lines.length).toBe(1);
    });

    it("should seat the values and « 3 fois » clear of every dot, on its seat and in its folded column", () => {
      const clear = (box: any, xs: number[]) =>
        xs.every((x, i) => {
          const nx = Math.max(box.x0, Math.min(x, box.x1));
          const ny = Math.max(box.y0, Math.min(members[i].y, box.y1));
          return Math.hypot(x - nx, members[i].y - ny) > props.radius;
        });
      for (const box of props.wordBoxes) {
        expect(
          clear(
            box,
            members.map((m: any) => m.x),
          ),
        ).toBe(true);
        expect(
          clear(
            box,
            members.map((m: any) => m.strip),
          ),
        ).toBe(true);
      }
    });
  });
}
