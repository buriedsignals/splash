import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { DonutFrame } from "./DonutFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: one world ring in 2000 whose circumference is its tonnes, the six arcs end to end at their shares; the ring
 * growing to 2023 with every arc's length its tonnes on one scale at every frame; the split into six rings, every arc
 * keeping its angle in flight; the whole chart at the end, China ringed, the credit on one line.
 */

const beat = loadBeat();
const TURN = 2 * Math.PI;

describe("the donut's subject, asserted", () => {
  it("should find the United States above China in 2000 and China above the United States in 2023", () => {
    const { usa, chn } = beat.subject.byCode;
    expect([usa.share0 > chn.share0, chn.share1 > usa.share1]).toEqual([
      true,
      true,
    ]);
  });

  it("should find a quarter and a seventh in 2000, and the world up by half", () => {
    const { usa, chn } = beat.subject.byCode;
    expect([
      Math.round(100 / usa.share0),
      Math.round(100 / chn.share0),
      Math.round(beat.subject.growth),
    ]).toEqual([4, 7, 50]);
  });

  it("should find Russia's share fallen while its tonnes rose", () => {
    expect(beat.subject.fellButRose).toContain("RUS");
  });
});

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(DonutFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };
  const { world, countries, small } = props;
  const W0 = beat.subject.world0;
  const W1 = beat.subject.world1;

  describe(`${id}'s donut video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should trace the 2000 ring: six arcs end to end from twelve o'clock at their shares, the circumference the world's tonnes", () => {
      expect(TURN * world.r0).toBeCloseTo(world.pxPerGt * W0, 6);
      const s = sceneAt(props, last("reference"));
      let start = 0;
      countries.forEach((c: any, i: number) => {
        const a = s.arcs[i].before;
        expect([a.x, a.y, a.r]).toEqual([world.x, world.y, world.r0]);
        expect(a.start).toBeCloseTo(start, 9);
        expect(a.sweep).toBeCloseTo((c.share0 / 100) * TURN, 9);
        expect(a.drawn).toBeCloseTo(a.sweep, 9);
        start += a.sweep;
      });
      expect(s.copy).toBe(0);
    });

    it("should grow the 2023 ring with every arc's length its tonnes on one scale, at every frame", () => {
      for (const t of [0.3, 0.6]) {
        const s = sceneAt(props, within("reveal", "grow", t));
        const u = (s.worldR - world.r0) / (world.r1 - world.r0);
        expect(u > 0 && u < 1).toBe(true);
        expect(TURN * s.worldR).toBeCloseTo(
          world.pxPerGt * (W0 + (W1 - W0) * u),
          6,
        );
        let start = 0;
        countries.forEach((c: any, i: number) => {
          const a = s.arcs[i].after;
          expect(a.r).toBeCloseTo(s.worldR, 9);
          expect(a.sweep * a.r).toBeCloseTo(
            world.pxPerGt * (c.gt0 + (c.gt1 - c.gt0) * u),
            6,
          );
          expect(a.start).toBeCloseTo(start, 9);
          start += a.sweep;
        });
      }
      const end = sceneAt(props, last("reveal"));
      expect(end.worldR).toBe(world.r1);
      expect(world.r1 / world.r0).toBeCloseTo(W1 / W0, 9);
      countries.forEach((c: any, i: number) =>
        expect(end.arcs[i].after.sweep).toBeCloseTo((c.share1 / 100) * TURN, 9),
      );
    });

    it("should split the world into six rings, every arc keeping its angle in flight and landing on its seat", () => {
      const mid = sceneAt(props, within("subject", "split", 0.4));
      const flying = countries.filter((c: any, i: number) => {
        const a = mid.arcs[i].after;
        return a.x !== world.x && a.x !== c.seat.x;
      });
      expect(flying.length).toBeGreaterThan(0);
      countries.forEach((c: any, i: number) => {
        expect(mid.arcs[i].before.sweep).toBeCloseTo(
          (c.share0 / 100) * TURN,
          9,
        );
        expect(mid.arcs[i].after.sweep).toBeCloseTo((c.share1 / 100) * TURN, 9);
      });
      const end = sceneAt(props, last("subject"));
      countries.forEach((c: any, i: number) => {
        const { before, after } = end.arcs[i];
        expect([
          before.x,
          before.y,
          before.r,
          before.start,
          after.x,
          after.y,
          after.r,
          after.start,
          end.arcs[i].arrived,
        ]).toEqual([
          c.seat.x,
          c.seat.y,
          small.inner,
          0,
          c.seat.x,
          c.seat.y,
          small.outer,
          0,
          1,
        ]);
      });
    });

    it("should end on the whole chart: six rings, no world ring or word left, China ringed, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect([
        end.tracks,
        end.copy,
        end.labels.before,
        end.labels.after,
        end.centre.before,
        end.centre.after,
        end.ring,
        end.source,
      ]).toEqual([0, 0, 0, 0, 0, 0, 1, 1]);
      expect(
        end.arcs.every(
          (a: any) =>
            a.arrived === 1 &&
            a.before.drawn === a.before.sweep &&
            a.after.drawn === a.after.sweep,
        ),
      ).toBe(true);
      expect(
        countries.filter((c: any) => c.subject).map((c: any) => c.code),
      ).toEqual(["CHN"]);
      expect(props.credit.lines.length).toBe(1);
    });

    it("should hold each ring's number inside its hole, China's ring between the number and the inner arc", () => {
      const hole = small.inner - small.width / 2;
      for (const c of countries)
        expect(Math.hypot(c.hole.width / 2, props.valueBand / 2)).toBeLessThan(
          hole,
        );
      const chn = countries.find((c: any) => c.subject);
      expect(small.holeRing).toBeGreaterThan(
        Math.hypot(chn.hole.width / 2, props.valueBand / 2),
      );
      expect(small.holeRing).toBeLessThan(hole);
    });

    it("should draw no arc shorter than three pixels, in the world or on a ring", () => {
      for (const c of countries) {
        expect(
          (Math.min(c.share0, c.share1) / 100) * TURN * small.inner,
        ).toBeGreaterThanOrEqual(3);
        expect(
          (c.share0 / 100) * TURN * world.r0 - world.seam,
        ).toBeGreaterThanOrEqual(3);
      }
    });

    it("should seat the six rings in one row inside the frame's insets, every word under a ring inside its slot", () => {
      const ys = new Set(countries.map((c: any) => c.seat.y));
      expect(ys.size).toBe(1);
      for (const c of countries) {
        expect(c.seat.x - small.outer - small.width / 2).toBeGreaterThanOrEqual(
          props.inset,
        );
        expect(c.seat.x + small.outer + small.width / 2).toBeLessThanOrEqual(
          props.frame.width - props.inset,
        );
        for (const line of [c.name, ...c.tonnes])
          expect(line.width).toBeLessThan(props.slot);
      }
    });

    it("should seat the world's words clear of the ring they name and inside the frame", () => {
      for (const [labels, r] of [
        [world.labels.before, world.r0],
        [world.labels.after, world.r1],
      ] as const)
        for (const l of labels) {
          const box = l.box;
          const nx = Math.max(box.x0, Math.min(world.x, box.x1));
          const ny = Math.max(box.y0, Math.min(world.y, box.y1));
          expect(Math.hypot(nx - world.x, ny - world.y)).toBeGreaterThan(
            r + world.width / 2,
          );
          expect(box.x1).toBeLessThanOrEqual(props.frame.width - props.inset);
        }
    });
  });
}
