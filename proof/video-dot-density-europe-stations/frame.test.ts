import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat, REFERENCE_MW, weightRadiusOf } from "./build.mjs";
import { DotFrame } from "./DotFrame.tsx";
import { radiusAt, sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the claim
 * told in order: the title at frame 0, every station in at the end of reference, the 72 named at reveal, every dot at
 * its weight at the end, area proportional to capacity. The map is not drawn here (`liveMap: () => null`): its layers
 * are held in `map-plan.test.ts`.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props, dots } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(DotFrame, { ...(props as any), at: frame, liveMap: () => null }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s dot density video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title, count every station in by the end of reference, and name the 72 by the end of reveal", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      const reference = sceneAt(props as any, last("reference"));
      expect([reference.stations, reference.named]).toEqual([8900, 0]);
      expect(Object.values(reference.shown).every((t) => t === 1)).toBe(true);
      expect(sceneAt(props as any, last("reveal")).named).toBe(1);
    });

    it("should have a measured text for every count the frames can show", () => {
      for (let f = 0; f < props.timing.total; f += 3) {
        const s = sceneAt(props as any, f);
        expect([f, String(s.stations) in props.legend.stationTexts, String(s.power) in props.legend.powerTexts]).toEqual([f, true, true]);
      }
    });

    it("should end with every dot at its weight — area proportional to capacity — and the power count exact", () => {
      const end = sceneAt(props as any, props.timing.total - 1);
      expect([end.weight, end.power, end.source]).toEqual([1, props.shareCapacity, 1]);
      const largest = Math.max(...beat.subject.stations.map((s) => weightRadiusOf(s.mw, beat.subject.maxMw)));
      expect(props.legend.referenceR / largest).toBeCloseTo(Math.sqrt(REFERENCE_MW / beat.subject.maxMw), 2);
    });

    it("should set the nuclear share on one bar: 0,8 % of the sites once named, growing with the dots to 34,4 % of the power", () => {
      const T = props.timing as any;
      const reveal = sceneAt(props as any, last("reveal"));
      expect(reveal.bar.shown).toBe(1);
      expect(reveal.bar.share).toBeCloseTo(beat.subject.shareSites, 9);
      expect(sceneAt(props as any, last("reference")).bar.shown).toBe(0);
      const [a, b] = (WINDOWS as any).subject.weight;
      const mid = sceneAt(props as any, Math.round(T.subject.start + T.subject.duration * (a + b) / 2));
      expect(mid.weight).toBeGreaterThan(0.3);
      expect(mid.weight).toBeLessThan(0.7);
      expect(mid.bar.share).toBeCloseTo(beat.subject.shareSites + (beat.subject.shareCapacity - beat.subject.shareSites) * mid.weight, 9);
      expect(sceneAt(props as any, T.total - 1).bar.share).toBeCloseTo(beat.subject.shareCapacity, 9);
      const bar = (props.legend as any).bar;
      expect(bar.width).toBeGreaterThan(8 * props.registers.axis.lead);
    });

    it("should grow every dot's area, not its radius, in proportion to the weight", () => {
      expect(radiusAt(2, 20, 0)).toBe(2);
      expect(radiusAt(2, 20, 1)).toBe(20);
      expect(radiusAt(2, 20, 0.5) ** 2).toBeCloseTo((4 + 400) / 2, 9);
    });

    it("should set the credit on one line, in an ink that reads on the sea", () => {
      expect(props.credit.lines.length).toBe(1);
      expect(contrast(props.colours.text.source, props.colours.sea)).toBeGreaterThanOrEqual(4.5);
    });

    it("should keep the key and the credit clear of every station", () => {
      const inside = (b: any) => (d: any) => d.x >= b.x && d.x <= b.x + b.w && d.y >= b.y && d.y <= b.y + b.h;
      const key = { x: props.legend.at.x, y: props.legend.at.y, w: props.legend.width, h: props.legend.height };
      const credit = { x: props.credit.at.x, y: props.credit.at.y, w: props.credit.width, h: props.credit.height };
      expect(dots.length).toBe(beat.subject.total);
      expect(dots.filter(inside(key))).toEqual([]);
      expect(dots.filter(inside(credit))).toEqual([]);
    });
  });
}
