import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { RadarFrame } from "./RadarFrame.tsx";
import { sceneAt, spokeAngle, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: two bars on one TWh scale; Germany's stretched to France's length and both cut into nine sources, every part
 * its share on the wheel's px-per-% scale; source after source both parts carried onto their spoke keeping their length,
 * tips joined only once both have landed; the whole radar at the end, nuclear ringed, the credit on one line.
 */

const beat = loadBeat();

describe("the radar's subject, asserted", () => {
  it("should find France and Germany within 25 % of each other, France the larger", () => {
    const [fr, de] = beat.subject.countries;
    expect([
      Math.round(fr.total * 10) / 10,
      Math.round(de.total * 10) / 10,
      beat.subject.ratio < 1.25,
    ]).toEqual([561.8, 496, true]);
  });

  it("should find nuclear most of France's mix and none of Germany's, Germany ahead on wind and solar", () => {
    const [fr, de] = beat.subject.countries;
    const j = beat.subject.named;
    expect([
      fr.shares[j] > 50,
      de.shares[j],
      beat.subject.windSolar[1] > beat.subject.windSolar[0],
    ]).toEqual([true, 0, true]);
  });

  it("should give each country nine shares summing to 100 and a ceiling of 70 %", () => {
    for (const c of beat.subject.countries)
      expect(c.shares.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(
        100,
        9,
      );
    expect(beat.subject.ceiling).toBe(70);
  });
});

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(RadarFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };
  const { wheel, bars, countries } = props;
  const n = countries[0].shares.length;
  const lengthOf = (p: any) => Math.hypot(p.x2 - p.x1, p.y2 - p.y1);

  describe(`${id}'s radar video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should grow both bars at one TWh speed, each stopping at its total, France's 100 % long on the wheel's scale", () => {
      const mid = sceneAt(props, within("reference", "bars", 0.5));
      const drawnLength = (c: any) =>
        c.parts.reduce((s: number, p: any) => s + lengthOf(p), 0);
      expect(drawnLength(mid.countries[0])).toBeCloseTo(
        drawnLength(mid.countries[1]),
        6,
      );
      const end = sceneAt(props, last("reference"));
      countries.forEach((c: any, i: number) =>
        expect(drawnLength(end.countries[i])).toBeCloseTo(
          bars.pxPerTwh * c.total * bars.zoom,
          6,
        ),
      );
      expect(bars.pxPerTwh * countries[0].total).toBeCloseTo(
        100 * wheel.pxPerPct,
        9,
      );
    });

    it("should stretch Germany's bar to France's length and cut both into parts of share × the wheel's px per %", () => {
      const end = sceneAt(props, last("reveal"));
      const z = bars.zoom;
      expect(end.z).toBe(z);
      const sx = (x: number) => wheel.x + (x - wheel.x) * z;
      countries.forEach((c: any, i: number) => {
        let x = sx(bars.x0);
        const y = wheel.y + (c.bar.y - wheel.y) * z;
        end.countries[i].parts.forEach((p: any, j: number) => {
          expect(p.x1).toBeCloseTo(x, 6);
          expect([p.y1, p.y2]).toEqual([y, y]);
          expect(p.x2 - p.x1).toBeCloseTo(c.shares[j] * wheel.pxPerPct * z, 6);
          x = p.x2 + bars.gap * z;
        });
        expect(end.countries[i].totals.x).toBeCloseTo(
          sx(bars.x0 + 100 * wheel.pxPerPct + (n - 1) * bars.gap) + bars.labelGap,
          6,
        );
      });
    });

    it("should carry every part onto its spoke keeping its length, its tip landing at the share's radius", () => {
      for (const t of [0.04, 0.3, 0.55]) {
        const s = sceneAt(props, within("subject", "fly", t));
        countries.forEach((c: any, i: number) =>
          s.countries[i].parts.forEach((p: any, j: number) =>
            expect(lengthOf(p)).toBeCloseTo(c.shares[j] * wheel.pxPerPct * s.z, 6),
          ),
        );
      }
      expect(sceneAt(props, within("subject", "fly", 0.04)).z).toBeGreaterThan(1);
      const end = sceneAt(props, last("subject"));
      expect(end.z).toBe(1);
      countries.forEach((c: any, i: number) =>
        end.countries[i].parts.forEach((p: any, j: number) => {
          const theta = spokeAngle(j, n);
          const o = c.side * bars.landed.offset;
          const along = (x: number, y: number) =>
            (x - wheel.x) * Math.cos(theta) + (y - wheel.y) * Math.sin(theta);
          const across = (x: number, y: number) =>
            -(x - wheel.x) * Math.sin(theta) + (y - wheel.y) * Math.cos(theta);
          expect(along(p.x1, p.y1)).toBeCloseTo(0, 6);
          expect(along(p.x2, p.y2)).toBeCloseTo(
            c.shares[j] * wheel.pxPerPct,
            6,
          );
          expect(across(p.x2, p.y2)).toBeCloseTo(o, 6);
          expect(p.width).toBe(bars.landed.width);
        }),
      );
    });

    it("should draw an edge only once both of its tips have landed", () => {
      const { start, duration } = props.timing.subject;
      for (let f = start; f < start + duration; f += 3) {
        const s = sceneAt(props, f);
        for (let j = 1; j < n; j++)
          if (s.countries[0].edges[j] > 0)
            expect([
              s.moves[j - 1],
              s.moves[j] > 0.7,
            ]).toEqual([1, true]);
      }
      expect(sceneAt(props, last("subject")).countries[0].edges[0]).toBe(0);
    });

    it("should end on the whole radar: no part or bar word left, both outlines closed and filled, every spoke labelled, nuclear ringed", () => {
      const end = sceneAt(props, props.timing.total - 1);
      for (const c of end.countries) {
        expect([
          c.parts.every((p: any) => p.opacity === 0),
          c.edges.every((e: number) => e === 1),
          c.fill,
          c.totals.twh,
          c.totals.full,
        ]).toEqual([true, true, 1, 0, 0]);
      }
      expect([
        end.grid,
        end.ring,
        end.source,
        end.labels.every((l: number) => l === 1),
      ]).toEqual([1, 1, 1, true]);
      countries.forEach((c: any, i: number) =>
        expect([end.countries[i].name.x, end.countries[i].name.y]).toEqual([
          c.key.x,
          c.key.y,
        ]),
      );
      expect(props.credit.lines.length).toBe(1);
    });

    it("should seat every spoke's words inside the frame, clear of each other, the key and the credit", () => {
      const boxes = wheel.labels.map((l: any) => l.box);
      const overlap = (a: any, b: any) =>
        a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
      const creditBox = {
        x0: props.credit.at.x,
        x1: props.credit.at.x + props.credit.width,
        y0: props.credit.at.y,
        y1: props.credit.at.y + props.credit.height,
      };
      for (const [i, b] of boxes.entries()) {
        expect(
          b.x0 >= props.inset &&
            b.x1 <= props.frame.width - props.inset &&
            b.y0 >= 0 &&
            b.y1 <= props.credit.at.y,
        ).toBe(true);
        expect(
          boxes.some((o: any, j: number) => j !== i && overlap(b, o)),
        ).toBe(false);
        expect(overlap(b, creditBox)).toBe(false);
      }
      const ring = {
        x0: wheel.ring.x,
        x1: wheel.ring.x + wheel.ring.width,
        y0: wheel.ring.y,
        y1: wheel.ring.y + wheel.ring.height,
      };
      expect(
        boxes.filter(
          (b: any, j: number) => j !== beat.subject.named && overlap(b, ring),
        ),
      ).toEqual([]);
    });
  });
}
