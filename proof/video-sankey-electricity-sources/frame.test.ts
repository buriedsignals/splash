import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { SankeyFrame } from "./SankeyFrame.tsx";
import { ribbonAt, sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0; one bar whose height is the running total; the bar split into the nine sources
 * keeping their heights; the ribbons poured, each country's node the sum of the ribbons landed in it; the nuclear bar
 * carried to France's node keeping its height, its French part level with France's nuclear band, « 84 % »; the whole
 * sankey at the end, « 84 % » inside the accent ribbon.
 */

const beat = loadBeat();

describe("ribbonAt", () => {
  const f = { x0: 100, x1: 900, ay: 500, by: 200, h: 40 };
  it("should draw the whole ribbon at t = 1, a cubic with its controls at the middle", () => {
    expect(ribbonAt(f, 1)).toEqual({
      d: "M100 500 C500 500 500 200 900 200 L900 240 C500 240 500 540 100 540 Z",
      tipX: 900,
    });
  });
  it("should stop the ribbon where its own curve reaches at t, both edges at the same x", () => {
    const { tipX, d } = ribbonAt(f, 0.5);
    expect(tipX).toBeCloseTo(100 + 800 * (1.5 * 0.5 - 1.5 * 0.25 + 0.125), 9);
    expect(d).toContain(`L${tipX} `);
    expect(ribbonAt(f, 0).d).toBe("");
  });
});

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(createElement(SankeyFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const at = (event: string, p: number) =>
    props.timing[event].start + Math.round(props.timing[event].duration * p);
  const tracked = props.flows.find((f: any) => f.tracked);
  // Read off the drawn ribbon itself: the tip of the ribbon poured to t is its top and bottom edge at that x.
  const tips = Array.from({ length: 4001 }, (_, i) => {
    const { d, tipX } = ribbonAt(tracked, i / 4000);
    const [top, bottom] = [...(d.match(/C[^L]* ([\d.]+) ([\d.]+) L[\d.]+ ([\d.]+)/) ?? [])].slice(2).map(Number);
    return { tipX, top, bottom };
  }).slice(1);
  const expectInsideRibbon = (box: any) => {
    for (const x of [box.x0, box.x1]) {
      const { top, bottom } = tips.reduce((a, b) => (Math.abs(b.tipX - x) < Math.abs(a.tipX - x) ? b : a));
      expect([x, top <= box.y0, bottom >= box.y1]).toEqual([x, true, true]);
    }
  };
  const nuclear = props.sources.find(
    (s: any) => s.key === beat.subject.biggest.key,
  );

  describe(`${id}'s sankey video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should carry a measured width for every counter at every frame", () => {
      const unmeasured = [];
      for (let f = 0; f < props.timing.total; f += 3)
        if (/<text\b(?![^>]*data-width="\d)[^>]*>/.test(markupAt(f)))
          unmeasured.push(f);
      expect(unmeasured).toEqual([]);
    });

    it("should open on the title card, then grow one bar whose height is the running total, linearly", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const [a, b] = WINDOWS.reference.whole;
      const f = props.timing.reference.start + 24;
      const t = (24 / props.timing.reference.duration - a) / (b - a);
      const mid = sceneAt(props, f);
      expect(mid.whole.h).toBeCloseTo(props.whole.h * t, 6);
      expect(mid.whole.count).toBe(Math.round(props.whole.total * t));
      const end = sceneAt(props, last("reference"));
      expect([end.whole.h, end.whole.count, end.split]).toEqual([
        props.whole.h,
        props.whole.total,
        0,
      ]);
      expect(props.whole.h).toBeCloseTo(beat.subject.grand * props.scale, 6);
    });

    it("should split the bar into the nine sources, keeping every height on the one scale", () => {
      let cursor = props.whole.y;
      for (const s of props.sources) {
        expect([s.key, s.yWhole, s.h]).toEqual([
          s.key,
          expect.closeTo(cursor, 6),
          expect.closeTo(s.total * props.scale, 6),
        ] as any);
        cursor += s.h;
      }
      const start = sceneAt(props, props.timing.reveal.start);
      expect(start.sources.map((s: any) => s.y0)).toEqual(
        props.sources.map((s: any) => s.yWhole),
      );
      const end = sceneAt(props, last("reveal"));
      expect(end.sources.map((s: any) => s.y0)).toEqual(
        props.sources.map((s: any) => s.y0),
      );
      for (let i = 1; i < props.sources.length; i++)
        expect(
          props.sources[i].y0 -
            (props.sources[i - 1].y0 + props.sources[i - 1].h),
        ).toBeCloseTo(props.gap, 6);
    });

    it("should keep conservation on both rails: every node is the sum of its own ribbons, stacked edge to edge", () => {
      for (const [nodes, side, y] of [
        [props.sources, "from", "ay"],
        [props.countries, "to", "by"],
      ] as const)
        for (const n of nodes) {
          const own = props.flows.filter((f: any) => f[side] === n.key);
          expect([
            n.key,
            own.reduce((s: number, f: any) => s + f.hTrue, 0),
          ]).toEqual([n.key, expect.closeTo(n.h, 6)] as any);
          let cursor = n.y0;
          for (const f of own) {
            expect([n.key, f[y]]).toEqual([
              n.key,
              expect.closeTo(cursor, 6),
            ] as any);
            cursor += f.hTrue;
          }
        }
    });

    it("should fill each country's node by the ribbons landed in it, and full at the end of the pour", () => {
      const f = at("reveal", 0.7);
      const s = sceneAt(props, f);
      props.countries.forEach((c: any, i: number) => {
        const landed = props.flows
          .map((fl: any, j: number) => ({ fl, t: s.flows[j].t }))
          .filter(({ fl }: any) => fl.to === c.key)
          .reduce(
            (sum: number, { fl, t }: any) =>
              sum + fl.hTrue * Math.min(Math.max((t - 0.85) / 0.15, 0), 1),
            0,
          );
        expect([c.key, s.countries[i].fill]).toEqual([
          c.key,
          expect.closeTo(landed, 6),
        ] as any);
      });
      const end = sceneAt(props, last("reveal"));
      expect(end.flows.map((x: any) => x.t)).toEqual(props.flows.map(() => 1));
      props.countries.forEach((c: any, i: number) =>
        expect([c.key, end.countries[i].fill]).toEqual([
          c.key,
          expect.closeTo(c.h, 6),
        ] as any),
      );
    });

    it("should step every ribbon but nuclear's back, and fill nuclear → France with the accent", () => {
      const s = sceneAt(props, at("subject", WINDOWS.subject.slide[0]));
      props.flows.forEach((f: any, j: number) =>
        expect([f.from, f.to, s.flows[j].dim]).toEqual([
          f.from,
          f.to,
          f.from === nuclear.key ? 0 : 1,
        ]),
      );
      expect(s.flows[props.flows.indexOf(tracked)].accent).toBe(1);
    });

    it("should carry the nuclear bar to France's node keeping its height, its French part level with France's nuclear band", () => {
      for (
        let f = at("subject", WINDOWS.subject.slide[0]);
        f <= last("conclusion");
        f += 2
      ) {
        const c = sceneAt(props, f).copy;
        if (c)
          expect([f, c.rect.h]).toEqual([
            f,
            expect.closeTo(nuclear.h, 9),
          ] as any);
      }
      const s = sceneAt(props, last("subject"));
      expect(s.copy.rect).toEqual(props.copy.to);
      expect(props.copy.from).toEqual({
        x: nuclear.x,
        y: nuclear.y0,
        w: props.rail.w,
        h: nuclear.h,
      });
      expect(props.copy.part).toBeCloseTo(tracked.hTrue, 9);
      expect(props.copy.to.y).toBeCloseTo(tracked.by, 9);
      expect(props.copy.to.y + props.copy.part).toBeCloseTo(
        tracked.by + tracked.hTrue,
        9,
      );
      expect(props.copy.part / nuclear.h).toBeCloseTo(beat.subject.share, 9);
      expect(props.copy.to.x + props.copy.to.w).toBeLessThan(
        props.countries[0].x,
      );
      expect(props.share.text).toBe(`${Math.round(beat.subject.share * 100)}\u00A0%`);
      expect([s.share, s.label.x, s.label.y]).toEqual([1, props.share.x, props.share.y]);
      expect(props.share.box.x1).toBeLessThanOrEqual(props.copy.to.x);
      expectInsideRibbon(props.share.box);
    });

    it("should carry « 84 % » back inside the accent ribbon, its middle inside both edges at every frame", () => {
      const [a, b] = WINDOWS.conclusion.mark;
      for (let f = at("conclusion", a); f <= at("conclusion", b); f += 2) {
        const { label } = sceneAt(props, f);
        const cx = label.x + props.share.width / 2;
        const middle = label.y - props.baselineShift;
        const { top, bottom } = tips.reduce((p: any, q: any) => (Math.abs(q.tipX - cx) < Math.abs(p.tipX - cx) ? q : p));
        expect([f, top < middle - props.baselineShift, bottom > middle + props.baselineShift]).toEqual([f, true, true]);
      }
    });

    it("should end on the whole sankey — nothing stepped back, the copy home, « 84 % » carried inside the accent ribbon to its source", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect(end.copy).toBeNull();
      expect([
        end.flows.every((f: any) => f.dim === 0 && f.t === 1),
        end.flows[props.flows.indexOf(tracked)].accent,
      ]).toEqual([true, 1]);
      expect(
        [...end.sources, ...end.countries].every(
          (n: any) => n.dim === 0 && n.words === 1,
        ),
      ).toBe(true);
      expect([end.share, end.mark, end.source, end.label.x, end.label.y]).toEqual([1, 1, 1, props.mark.x, props.mark.y]);
      expect(props.mark.box.x0).toBeGreaterThan(tracked.x0);
      expectInsideRibbon(props.mark.box);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
