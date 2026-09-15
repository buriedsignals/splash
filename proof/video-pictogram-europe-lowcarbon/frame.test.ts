import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";
import { PictogramFrame } from "./PictogramFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; every country a square in the 5-point column of its share, dropped as the front passes it;
 * the axis parted at the cuts, every square carried with its part; each part settled into columns of six from its anchor,
 * the j-th square of every block landing at one moment and every count its landed squares, no square ever set down on
 * another; the whole pictogram at the end, « 6 pays » ringed.
 */

const beat = loadBeat();
const E = 1e-6;
const overlaps = (a: any, b: any) =>
  a.x + E < b.x + b.w &&
  b.x + E < a.x + a.w &&
  a.y + E < b.y + b.h &&
  b.y + E < a.y + a.h;

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(PictogramFrame, { ...props, at: frame }),
    );
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const box = (s: any) => ({ x: s.x, y: s.y, w: s.side, h: s.side });
  const stackOf = (c: any) => ({
    x: props.axisLeft + c.column * props.cell + props.inner,
    y: props.baseline - (c.row + 1) * props.cell + props.inner,
  });

  describe(`${id}'s pictogram video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title, and end the reference on every country standing in the column of its share", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      expect(s.squares.length).toBe(40);
      beat.subject.countries.forEach((c: any, i: number) => {
        const at = stackOf(c);
        expect([s.squares[i].opacity, s.squares[i].x, s.squares[i].y]).toEqual([
          1,
          expect.closeTo(at.x, 6),
          expect.closeTo(at.y, 6),
        ] as any);
        expect(c.column).toBe(Math.min(19, Math.floor(c.share / 5)));
      });
    });

    it("should drop the squares in the order of their shares, the front sweeping the axis", () => {
      const { start, duration } = props.timing.reference;
      let partial = 0;
      for (let f = start; f < start + duration; f += 4) {
        const s = sceneAt(props, f);
        const seen = beat.subject.countries.map(
          (_: any, i: number) => s.squares[i].opacity,
        );
        for (let i = 1; i < seen.length; i++)
          expect(seen[i]).toBeLessThanOrEqual(seen[i - 1] + E);
        if (seen[0] === 1 && seen[39] === 0) partial += 1;
      }
      expect(partial).toBeGreaterThan(0);
    });

    it("should end the reveal on the axis parted at both cuts, every square carried with its part", () => {
      const s = sceneAt(props, last("reveal"));
      beat.subject.countries.forEach((c: any, i: number) => {
        const at = stackOf(c);
        expect([s.squares[i].x, s.squares[i].y]).toEqual([
          expect.closeTo(at.x + props.shift[c.block], 6),
          expect.closeTo(at.y, 6),
        ] as any);
      });
      expect(props.shift).toEqual([-props.gap, 0, props.gap]);
      const xs = (b: number) =>
        beat.subject.countries
          .map((c: any, i: number) => (c.block === b ? s.squares[i].x : NaN))
          .filter((x: number) => !Number.isNaN(x));
      const [cut60, cut75] = s.cuts.map((c: any) => c.x);
      expect([
        Math.max(...xs(0)) + props.side < cut60,
        cut60 < Math.min(...xs(1)),
        Math.max(...xs(1)) + props.side < cut75,
        cut75 < Math.min(...xs(2)),
      ]).toEqual([true, true, true, true]);
      expect(cut75 - cut60).toBeCloseTo(3 * props.cell + props.gap, 6);
    });

    it("should land the j-th square of every block at one moment, every count its block's landed squares", () => {
      const { start, duration } = props.timing.subject;
      let climbing = 0;
      for (let f = start; f < start + duration + 2; f += 3) {
        const s = sceneAt(props, f);
        const landed = [0, 1, 2].map(
          (b) =>
            s.squares.filter(
              (q: any, i: number) =>
                beat.subject.countries[i].block === b && q.landed,
            ).length,
        );
        const most = Math.max(...landed);
        expect(landed).toEqual(
          beat.subject.counts.map((n: number) => Math.min(n, most)),
        );
        expect(
          s.counters.map((c: any) => props.layout.counters[c.block].words[c.key].text),
        ).toEqual(landed.map((n) => `${n}\u00A0pays`));
        if (landed[1] === 6 && landed[0] < 18) climbing += 1;
      }
      expect(climbing).toBeGreaterThan(0);
    });

    it("should never set a square down on another: no two squares at rest overlap at any frame", () => {
      for (
        let f = props.timing.reference.start;
        f < props.timing.total;
        f += 2
      ) {
        const s = sceneAt(props, f);
        const resting = s.squares
          .map((q: any, i: number) => ({ i, ...box(q), q }))
          .filter((b: any) => b.q.resting && b.q.opacity > 0);
        resting.forEach((a: any, n: number) => {
          for (const b of resting.slice(n + 1))
            expect([f, a.i, b.i, overlaps(a, b)]).toEqual([f, a.i, b.i, false]);
        });
      }
    });

    it("should end the subject on columns of six from each block's anchor, each block inside its cuts", () => {
      const s = sceneAt(props, last("subject"));
      const [cut60, cut75] = s.cuts.map((c: any) => c.x);
      const rows = beat.subject.tallest;
      beat.subject.countries.forEach((c: any, i: number) => {
        const q = s.squares[i];
        const slot = props.slots[i];
        expect([q.x, q.y, q.landed]).toEqual([
          expect.closeTo(slot.x, 6),
          expect.closeTo(slot.y, 6),
          true,
        ] as any);
        const inside =
          c.block === 0
            ? q.x >= props.axisLeft - props.gap && q.x + props.side < cut60
            : c.block === 1
              ? q.x > cut60 && q.x + props.side < cut75
              : q.x > cut75 && q.x + props.side <= props.axisRight + props.gap;
        expect([c.name, inside]).toEqual([c.name, true]);
      });
      const inBlock = (b: number) =>
        props.slots.filter(
          (_: any, i: number) => beat.subject.countries[i].block === b,
        );
      for (const b of [0, 1, 2]) {
        const slots = inBlock(b);
        const columns = new Set(slots.map((q: any) => Math.round(q.x)));
        expect(columns.size).toBe(Math.ceil(beat.subject.counts[b] / rows));
        expect(
          Math.max(
            ...slots.map((q: any) => props.baseline - q.y + props.inner),
          ),
        ).toBeCloseTo(Math.min(beat.subject.counts[b], rows) * props.cell, 6);
      }
      expect(Math.min(...inBlock(0).map((q: any) => q.x))).toBeCloseTo(
        props.axisLeft - props.gap + props.inner,
        6,
      );
      expect(
        Math.max(...inBlock(2).map((q: any) => q.x + props.side)),
      ).toBeCloseTo(props.axisRight + props.gap - props.inner, 6);
      expect(
        beat.subject.counts.reduce((t: number, n: number) => t + n, 0),
      ).toBe(40);
    });

    it("should close the parts into the pictogram, every block keeping its shape magnified by one factor, the cuts in the middle of the gaps", () => {
      const L = props.layout;
      const scale = L.cellF / L.cell;
      expect(scale).toBeGreaterThan(1);
      const s = sceneAt(props, last("conclusion"));
      for (const b of [0, 1, 2]) {
        const members = beat.subject.countries.map((c: any, i: number) => ({ c, i })).filter(({ c }: any) => c.block === b);
        const corner = (at: any[]) => Math.min(...members.map(({ i }: any) => at[i].x));
        const cornerNow = Math.min(...members.map(({ i }: any) => s.squares[i].x));
        for (const { i } of members) {
          expect(s.squares[i].x - cornerNow).toBeCloseTo((props.slots[i].x - corner(props.slots)) * scale, 6);
          expect(L.baselineF - s.squares[i].y + (L.cellF - L.sideF) / 2).toBeCloseTo((L.baseline - props.slots[i].y + props.inner) * scale, 6);
          expect([s.squares[i].x, s.squares[i].y, s.squares[i].side]).toEqual([expect.closeTo(props.finals[i].x, 6), expect.closeTo(props.finals[i].y, 6), expect.closeTo(L.sideF, 6)] as any);
        }
      }
      const edges = [0, 1, 2].map((b) => {
        const xs = beat.subject.countries.map((c: any, i: number) => (c.block === b ? s.squares[i].x : NaN)).filter((x: number) => !Number.isNaN(x));
        return [Math.min(...xs) - (L.cellF - L.sideF) / 2, Math.max(...xs) + L.sideF + (L.cellF - L.sideF) / 2];
      });
      s.cuts.forEach((cut: any, n: number) => expect(cut.x).toBeCloseTo((edges[n][1] + edges[n + 1][0]) / 2, 6));
      expect(edges[1][0] - edges[0][1]).toBeCloseTo(edges[2][0] - edges[1][1], 6);
    });

    it("should end on the whole pictogram: every block counted, « 6 pays » ringed clear of every square, the credit on one line", () => {
      const s = sceneAt(props, props.timing.total - 1);
      expect(s.counters.map((c: any) => [props.layout.counters[c.block].words[c.key].text, c.opacity])).toEqual([
        ["18\u00A0pays", 1],
        ["6\u00A0pays", 1],
        ["16\u00A0pays", 1],
      ]);
      expect([s.ring, s.source, s.cutsOpacity, s.furniture, s.close]).toEqual([1, 1, 1, 1, 1]);
      for (const q of s.squares) expect(overlaps(props.ring, box(q))).toBe(false);
      const ringed = props.layout.counters[1].words["6"];
      const c = s.counters[1];
      expect([props.ring.x < c.x - ringed.width / 2, props.ring.x + props.ring.w > c.x + ringed.width / 2]).toEqual([true, true]);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
