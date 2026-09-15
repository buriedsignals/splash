import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { MarimekkoFrame } from "./MarimekkoFrame.tsx";
import { sceneAt } from "./scene.mjs";
import { verticalInsetFor } from "../../skills/chart-video/scripts/shots.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told in
 * order: one whole block parting into six columns, widths kept; the mixes filling each column to 100 %; every coal cell poured,
 * area kept, into one strip across the whole width, 12,3 % high, Germany and Poland 99,5 % of it; the whole chart at the end.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(MarimekkoFrame, { ...props, at: frame }),
    );
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const mid = (event: string, t: number) =>
    Math.round(props.timing[event].start + props.timing[event].duration * t);
  const coalOf = (col: any) => col.cells.find((c: any) => c.key === "Coal");
  const cols = props.columns;

  describe(`${id}'s marimekko video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title, then show one whole block that parts into six columns with every width kept", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const whole = sceneAt(props, props.timing.reference.start);
      whole.columns
        .slice(1)
        .forEach((c: any, i: number) =>
          expect(c.x).toBeCloseTo(whole.columns[i].x + whole.columns[i].w, 6),
        );
      expect(
        whole.columns.at(-1).x + whole.columns.at(-1).w - props.plotLeft,
      ).toBeCloseTo(props.room, 6);
      for (const t of [0.5, 0.7])
        sceneAt(props, mid("reference", t)).columns.forEach(
          (c: any, i: number) =>
            expect(c.w).toBeCloseTo(cols[i].total * props.u, 6),
        );
      const parted = sceneAt(props, last("reference"));
      parted.columns.forEach((c: any, i: number) =>
        expect(c.x).toBeCloseTo(
          props.plotLeft + cols[i].cum * props.u + i * props.colGap,
          6,
        ),
      );
      expect(cols.reduce((s: number, c: any) => s + c.w, 0)).toBeCloseTo(
        props.room,
        6,
      );
    });

    it("should stack every column's nine bands from the foot to the top of the plot at the end of the reveal", () => {
      const s = sceneAt(props, last("reveal"));
      s.columns.forEach((c: any, i: number) => {
        let foot = props.plotBottom;
        c.cells.forEach((cell: any, j: number) => {
          expect(cell.h).toBeCloseTo(cols[i].bands[j].share * props.H, 6);
          expect(cell.y + cell.h).toBeCloseTo(foot, 6);
          foot = cell.y;
        });
        expect(foot).toBeCloseTo(props.plotTop, 6);
      });
    });

    it("should keep every coal cell's area while it pours", () => {
      const settled = sceneAt(props, last("reveal"));
      for (const t of [0.25, 0.4, 0.55, 0.7]) {
        const s = sceneAt(props, mid("subject", t));
        s.columns.forEach((c: any, i: number) =>
          expect(coalOf(c).w * coalOf(c).h).toBeCloseTo(
            coalOf(settled.columns[i]).w * coalOf(settled.columns[i]).h,
            4,
          ),
        );
      }
    });

    it("should tile the coal end to end across the whole width in one strip 12,3 % high, Germany and Poland 99,5 % of it", () => {
      const s = sceneAt(props, last("subject"));
      const pieces = s.columns.map(coalOf);
      let cursor = props.plotLeft;
      pieces.forEach((p: any) => {
        expect(p.x).toBeCloseTo(cursor, 6);
        expect(p.y).toBeCloseTo(props.strip.top, 6);
        if (p.w > 0) expect(p.h).toBeCloseTo(props.strip.h, 6);
        cursor = p.x + p.w;
      });
      expect(cursor - props.plotLeft).toBeCloseTo(props.room, 6);
      expect(props.strip.h / props.H).toBeCloseTo(beat.subject.coal.share, 9);
      const held = s.columns
        .filter((_: any, i: number) =>
          ["Germany", "Poland"].includes(cols[i].key),
        )
        .map(coalOf);
      expect((((held[0].w + held[1].w) / props.room) * 100).toFixed(1)).toBe(        "99.5",
      );
      expect(props.strip.label.text).toBe("12,3\u00A0%");
      s.columns.forEach((c: any) =>
        c.cells.forEach((cell: any) =>
          expect([cell.key, cell.dim]).toEqual([
            cell.key,
            cell.key === "Coal" ? 0 : 1,
          ]),
        ),
      );
    });

    it("should never let two coal pieces overlap while they pour", () => {
      for (let t = 0.1; t <= 0.9; t += 0.02) {
        const pieces = sceneAt(props, mid("subject", t))
          .columns.map(coalOf)
          .filter((p: any) => p.w > 0.5)
          .sort((a: any, b: any) => a.x - b.x);
        pieces
          .slice(1)
          .forEach((p: any, j: number) =>
            expect(pieces[j].x + pieces[j].w).toBeLessThanOrEqual(p.x + 1e-6),
          );
      }
    });

    it("should seat the strip under the plot and inside the frame's bottom inset", () => {
      expect(props.strip.top).toBeGreaterThan(props.plotBottom);
      expect(props.strip.top + props.strip.h).toBeLessThanOrEqual(
        sizeFor("landscape").height - verticalInsetFor("landscape"),
      );
    });

    it("should end on the whole chart: every cell where the reveal left it, nothing stepped back, the two coal cells ringed", () => {
      const settled = sceneAt(props, last("reveal"));
      const end = sceneAt(props, props.timing.total - 1);
      end.columns.forEach((c: any, i: number) => {
        c.cells.forEach((cell: any, j: number) => {
          const was = settled.columns[i].cells[j];
          [cell.x, cell.y, cell.w, cell.h].forEach((v, k) =>
            expect(v).toBeCloseTo([was.x, was.y, was.w, was.h][k], 6),
          );
          expect(cell.dim).toBe(0);
        });
        expect(c.totals).toBe(1);
      });
      expect([end.ring, end.label, end.source]).toEqual([1, 0, 1]);
      expect(props.rings).toEqual(["Germany", "Poland"]);
    });

    it("should set the credit on one line", () => {
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
