import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { AreaFrame } from "./AreaFrame.tsx";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0, the surface filled from zero with the stock at 3 158 Mt; the rule swept back from
 * 2024 with the gauge filling from its right until it lands on 1986 at half; both halves flattened into blocks of the
 * same surface; the curve given back whole at the end, the names inside their halves, the credit on one line.
 */

const beat = loadBeat();

/** The surface of a closed path's polygon, by the shoelace formula. */
function areaOf(d: string) {
  const pts = [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    s += x0 * y1 - x1 * y0;
  }
  return Math.abs(s) / 2;
}

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const T = props.timing as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(AreaFrame, { ...(props as any), at: frame }),
    );
  const last = (event: string) => endOf(T[event]) - 1;
  const inSubject = (t: number) =>
    Math.round(T.subject.start + T.subject.duration * t);

  describe(`${id}'s area video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title with no surface, and fill to 2024 with the whole stock at the end of reveal", () => {
      const first = sceneAt(props as any, 0);
      expect([first.title, first.surface]).toEqual([1, ""]);
      const reveal = sceneAt(props as any, last("reveal"));
      expect([reveal.fill, reveal.year]).toEqual([1, 2024]);
      expect(props.stock.texts["2024"].text.replace(/\s/g, "")).toBe(
        "3158Mtdepuis1858",
      );
    });

    it("should close the surface on zero — an area is read from its base", () => {
      expect(props.baseY).toBe(props.plot.bottom);
      expect(
        sceneAt(props as any, last("reveal")).surface.endsWith(
          `${Math.round(props.plot.bottom * 10) / 10}Z`,
        ),
      ).toBe(true);
    });

    it("should sweep the rule back from 2024, the gauge's recent share growing, and land on 1986 just short of half", () => {
      const start = sceneAt(props as any, T.subject.start);
      expect([start.ruleYear, start.share]).toEqual([2024, 0]);
      const mid = sceneAt(props as any, inSubject(0.3));
      expect(mid.ruleYear).toBeLessThan(2024);
      expect(mid.ruleYear).toBeGreaterThan(1986);
      expect(mid.share).toBeGreaterThan(0);
      expect(mid.share).toBeLessThan(0.5);
      const landed = sceneAt(props as any, last("subject"));
      expect(landed.ruleYear).toBe(1986);
      expect(landed.ruleX).toBeCloseTo(props.ruleX, 3);
      expect(landed.share).toBeCloseTo(49.9 / 100, 3);
    });

    it("should grow the gauge's share on every frame of the sweep, slice by slice, never in whole-year steps", () => {
      const shares = Array.from(
        { length: 40 },
        (_, i) => sceneAt(props as any, inSubject(0.2) + i).share,
      );
      for (let i = 1; i < shares.length; i++)
        expect(shares[i]).toBeGreaterThan(shares[i - 1]);
    });

    it("should flatten each half into a block of the same surface, the recent one about 3,4 times as tall", () => {
      const curve = sceneAt(props as any, last("reveal"));
      const flat = sceneAt(props as any, last("subject"));
      expect(flat.flatten).toBe(1);
      expect(
        Math.abs(areaOf(flat.surface) / areaOf(curve.surface) - 1),
      ).toBeLessThan(0.002);
      const heights = props.means.map((m: number) => props.baseY - m);
      expect(heights[1] / heights[0]).toBeCloseTo(129 / 38, 0);
      const leftOfRule = (d: string) =>
        areaOf(
          `M${props.plot.left} ${props.baseY}${[
            ...d.matchAll(/L([\d.-]+) ([\d.-]+)/g),
          ]
            .filter((m) => Number(m[1]) <= props.ruleX + 0.1)
            .map((m) => `L${m[1]} ${m[2]}`)
            .join("")}L${props.ruleX} ${props.baseY}Z`,
        );
      expect(
        Math.abs(leftOfRule(flat.surface) / leftOfRule(curve.surface) - 1),
      ).toBeLessThan(0.002);
    });

    it("should seat each half's name inside its own side of the rule, in the block and on the curve", () => {
      for (const seat of ["block", "curve"] as const) {
        for (const l of props.beforeLabel[seat])
          expect(l.x + l.width * 1.02).toBeLessThanOrEqual(props.ruleX);
        for (const l of props.afterLabel[seat]) {
          expect(l.x).toBeGreaterThanOrEqual(props.ruleX);
          expect(l.x + l.width * 1.02).toBeLessThanOrEqual(props.plot.right);
        }
      }
      expect(
        props.afterLabel.curve.map((l: any) =>
          l.text.replace(/\s/g, "").toLowerCase(),
        ),
      ).toEqual(["1987–2024", "38ans"]);
    });

    it("should end on the whole curve, the halves named, the gauge at half, the credit on one line", () => {
      const end = sceneAt(props as any, T.total - 1);
      expect([end.flatten, end.named, end.gauge, end.ruleYear]).toEqual([
        0, 1, 1, 1986,
      ]);
      expect(end.surface).toBe(sceneAt(props as any, last("reveal")).surface);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
