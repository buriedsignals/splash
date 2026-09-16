import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { BeeswarmFrame } from "./BeeswarmFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: one world disc at the population-weighted average whose area is every country's; the disc bursting, its area
 * always what has not left, the countries counted as they land on seats pushed only across the axis; the six beyond 20 t
 * ringed, the world outline back, the six copies merging into a disc whose area is their population; the whole swarm at
 * the end, no copy left, « 0,6 % » under « 6 pays ».
 */

const beat = loadBeat();
const area = (r: number) => r * r;

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(BeeswarmFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };
  const c = props.radiusPerRootPerson;
  const n = props.members.length;
  const high = props.members.filter((m: any) => m.high);

  describe(`${id}'s beeswarm video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should seat every country at its own tonnes, pushed only across the axis, no two circles overlapping", () => {
      const [t0, t10] = [props.ticks[0], props.ticks[1]];
      for (const m of props.members)
        expect((m.x - t0.at) / (t10.at - t0.at)).toBeCloseTo(m.tonnes / 10, 6);
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const a = props.members[i];
          const b = props.members[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r).toBe(true);
        }
    });

    it("should open on one world disc at the weighted average whose area is the sum of the countries' areas", () => {
      const [t0, t10] = [props.ticks[0], props.ticks[1]];
      expect((props.world.x - t0.at) / (t10.at - t0.at)).toBeCloseTo(
        beat.subject.mean / 10,
        6,
      );
      expect(area(props.world.r)).toBeCloseTo(c * c * beat.subject.world, 3);
      const s = sceneAt(props, last("reference"));
      expect([
        s.world.r,
        s.counted,
        s.members.every((m: any) => m.shown === 0),
      ]).toEqual([props.world.r, 0, true]);
    });

    it("should shrink the disc to the population not yet gone while the countries fly out, counting them as they land", () => {
      const s = sceneAt(props, within("reveal", "split", 0.4));
      const gone = props.members.reduce(
        (sum: number, m: any, i: number) =>
          sum + (s.members[i].shown ? m.people : 0),
        0,
      );
      expect(area(s.world.r)).toBeCloseTo(
        c * c * (beat.subject.world - gone),
        3,
      );
      expect(s.counted).toBe(
        s.members.filter((m: any) => m.landed === 1).length,
      );
      expect(s.counted > 0 && s.counted < n).toBe(true);
      const end = sceneAt(props, last("reveal"));
      expect([end.counted, end.world.r]).toEqual([n, 0]);
      props.members.forEach((m: any, i: number) =>
        expect([end.members[i].x, end.members[i].y]).toEqual([m.x, m.y]),
      );
    });

    it("should ring exactly the six beyond 20 t and merge their copies into a disc whose area is the people who have landed", () => {
      expect(high.map((m: any) => m.code).sort()).toEqual(
        [...beat.subject.high].sort(),
      );
      const mid = sceneAt(props, within("subject", "gather", 0.5));
      const landed = high.filter(
        (_: any, k: number) => mid.copies[k].landed === 1,
      );
      expect(landed.length > 0 && landed.length < high.length).toBe(true);
      expect(area(mid.merged.r)).toBeCloseTo(
        c * c * landed.reduce((s: number, m: any) => s + m.people, 0),
        3,
      );
      const end = sceneAt(props, last("subject"));
      expect([end.ring, end.ghost.x, end.ghost.y, end.ghost.r]).toEqual([
        1,
        props.compare.x,
        props.compare.y,
        props.world.r,
      ]);
      expect(area(end.merged.r) / area(end.ghost.r)).toBeCloseTo(
        beat.subject.share / 100,
        6,
      );
      expect(end.copies.every((k: any) => k.on === 0)).toBe(true);
    });

    it("should seat the outline clear of every circle", () => {
      for (const m of props.members)
        expect(
          Math.hypot(m.x - props.compare.x, m.y - props.compare.y) >
            props.world.r + m.r,
        ).toBe(true);
    });

    it("should end on the whole swarm: every country seated, no copy, no outline, the six ringed, « 0,6 % » under « 6 pays », the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      props.members.forEach((m: any, i: number) =>
        expect([
          end.members[i].x,
          end.members[i].y,
          end.members[i].shown,
        ]).toEqual([m.x, m.y, 1]),
      );
      expect([end.merged.r, end.ghost.opacity, end.ring, end.counter]).toEqual([
        0, 0, 1, 0,
      ]);
      expect(end.copies.every((k: any) => k.on === 0)).toBe(true);
      expect([end.share.x, end.share.y]).toEqual([
        props.bracket.share.x,
        props.bracket.share.y,
      ]);
      expect(props.bracket.share.y).toBeGreaterThan(props.bracket.label.y);
      expect(props.credit.lines.length).toBe(1);
    });

    it("should write India and China inside their own circles", () => {
      for (const m of props.members.filter((d: any) => d.name))
        expect(m.name.width).toBeLessThan(2 * m.r);
      expect(
        props.members
          .filter((d: any) => d.name)
          .map((d: any) => d.code)
          .sort(),
      ).toEqual(["CHN", "IND"]);
    });
  });
}
