import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { HeatmapFrame } from "./HeatmapFrame.tsx";
import { sceneAt } from "./scene.mjs";
import { BREAKS, FLOOR } from "./subject.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told in
 * order: every country's bar of 100 % grown across the grid in rank order, the count as many as the bars past the 94 % line;
 * every segment folded onto its cell in its class's colour; the seven regrouped by route with one pair of rows moved, the
 * routes parted and bracketed, only the others stepped back; the whole matrix in rank order at the end.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(HeatmapFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const mid = (event: string, t: number) =>
    Math.round(props.timing[event].start + props.timing[event].duration * t);
  const W = props.grid.right - props.grid.left;
  const rankTop = (r: number) =>
    props.grid.top + props.grid.gapH + r * props.grid.pitch;

  describe(`${id}'s heatmap video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should grow every bar to the grid's whole width at the end of the reference, its segments abutting in column order", () => {
      const s = sceneAt(props, last("reference"));
      s.rows.forEach((row: any, r: number) => {
        let x = props.grid.left;
        row.cells.forEach((c: any, j: number) => {
          expect([r, j, c.x, c.visible]).toEqual([
            r,
            j,
            expect.closeTo(x, 6),
            expect.closeTo((props.rows[r].shares[j] / 100) * W, 6),
          ] as any);
          x += c.visible;
        });
        expect(x - props.grid.left).toBeCloseTo(W, 6);
        expect(row.y).toBeCloseTo(rankTop(r), 6);
      });
    });

    it("should grow the bars in rank order, counting exactly the bars whose low-carbon part has passed the 94 % line", () => {
      const s = sceneAt(props, mid("reference", 0.4));
      const grown = s.rows.map((row: any) => row.grown);
      expect(
        grown.every((g: number, i: number) => i === 0 || g <= grown[i - 1]),
      ).toBe(true);
      const past = s.rows.filter((row: any, r: number) => {
        const low = row.cells.reduce(
          (sum: number, c: any, j: number) =>
            sum + (props.sources[j].lowCarbon ? c.visible : 0),
          0,
        );
        return low >= (FLOOR / 100) * W - 1e-6;
      }).length;
      expect([s.count, s.count > 0 && s.count < 7]).toEqual([past, true]);
      expect(sceneAt(props, last("reference")).count).toBe(7);
    });

    it("should fold every segment onto its cell, in the colour of its share's class, at the end of the reveal", () => {
      const s = sceneAt(props, last("reveal"));
      s.rows.forEach((row: any, r: number) =>
        row.cells.forEach((c: any, j: number) => {
          expect([r, j, c.x, c.w, c.folded]).toEqual([
            r,
            j,
            expect.closeTo(props.grid.left + j * props.grid.cellW, 6),
            expect.closeTo(props.grid.cellW, 6),
            1,
          ] as any);
          expect(props.rows[r].cells[j].bin).toBe(
            BREAKS.filter((b) => props.rows[r].shares[j] >= b).length,
          );
        }),
      );
    });

    it("should regroup the seven by route with a single pair of rows moved, part the routes and step back only the others", () => {
      const s = sceneAt(props, last("subject"));
      const order = s.rows
        .map((row: any, r: number) => [row.y, r])
        .sort((a: number[], b: number[]) => a[0] - b[0])
        .map(([, r]: number[]) => r);
      const routes = order.slice(0, 7).map((r: number) => props.rows[r].route);
      expect(routes).toEqual([...routes].sort((a: number, b: number) => a - b));
      expect(order.filter((r: number, slot: number) => r !== slot).length).toBe(
        2,
      );
      const bottomOf = (g: number) =>
        Math.max(
          ...s.rows
            .filter((_: any, r: number) => props.rows[r].route === g)
            .map((row: any) => row.y),
        ) + props.grid.pitch;
      const topOf = (g: number) =>
        Math.min(
          ...s.rows
            .filter((_: any, r: number) => props.rows[r].route === g)
            .map((row: any) => row.y),
        );
      expect(topOf(1) - bottomOf(0)).toBeCloseTo(props.grid.gapH, 6);
      expect(topOf(2) - bottomOf(1)).toBeCloseTo(props.grid.gapH, 6);
      expect(topOf(0)).toBeCloseTo(props.grid.top, 6);
      expect(
        Math.max(...s.rows.map((row: any) => row.y)) + props.grid.pitch,
      ).toBeCloseTo(
        props.grid.top + (12 + 2 * props.gapRows) * props.grid.pitch,
        6,
      );
      expect(
        s.rows.filter(
          (row: any, r: number) =>
            row.stepped > 0 !== (props.rows[r].route === null),
        ),
      ).toEqual([]);
      s.brackets.forEach((b: any, g: number) =>
        expect([b.top, b.bottom, b.opacity]).toEqual([
          expect.closeTo(topOf(g), 6),
          expect.closeTo(bottomOf(g) - props.grid.gap, 6),
          1,
        ] as any),
      );
      expect(s.whole.opacity).toBe(0);
    });

    it("should open on the title and end on the whole matrix in rank order, the seven bracketed, the credit on one line", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const end = sceneAt(props, props.timing.total - 1);
      expect([end.title, end.whole.opacity, end.count, end.routes]).toEqual([
        0, 1, 7, 0,
      ]);
      end.rows.forEach((row: any, r: number) => {
        expect([r, row.y, row.stepped]).toEqual([
          r,
          expect.closeTo(rankTop(r), 6),
          0,
        ] as any);
        row.cells.forEach((c: any, j: number) =>
          expect([c.x, c.folded]).toEqual([
            expect.closeTo(props.grid.left + j * props.grid.cellW, 6),
            1,
          ] as any),
        );
      });
      expect([end.whole.top, end.whole.bottom]).toEqual([
        expect.closeTo(rankTop(0), 6),
        expect.closeTo(rankTop(7) - props.grid.gap, 6),
      ] as any);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
