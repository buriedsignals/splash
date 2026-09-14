import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { CartogramFrame } from "./CartogramFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup the composition draws, rendered in Bun at the last frame of every event, held to the landscape type
 * floor, every settled word carrying the width Bun measured — and the shot rules: the title at frame 0, the video
 * ending on the cartogram.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(CartogramFrame, { ...(props as any), at: frame }));

  describe(`${id}'s drawn markup`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(endOf(props.timing[event]) - 1);
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title card and end on the cartogram, every tile landed and both counts counted", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      const last = sceneAt(props as any, props.timing.total - 1);
      expect([last.title, last.morph, last.codes, last.area, last.source]).toEqual([0, 1, 1, 1, 1]);
      expect(props.credit.lines.length).toBe(1);
    });

    const T = props.timing as any;
    const beam = (props as any).beam;
    const { subject } = beat;
    const valueAt = (x: number) => ((x - beam.x) / beam.width) * 100;
    /** The balance the columns strike: every column's height as its weight, at its share. */
    const balanceOf = (scene: any) => {
      let moment = 0;
      let weight = 0;
      for (const c of props.countries) {
        const col = scene.columns[c.iso];
        if (!col) continue;
        moment += col.h * subject.share.get(c.iso);
        weight += col.h;
      }
      return { mean: moment / weight, weight };
    };

    it("should weigh every country by its territory on the map: the columns fill the beam's height, Russia's about 73 %, the pivot under the area mean", () => {
      const s = sceneAt(props as any, endOf(T.reveal) - 1);
      const { mean, weight } = balanceOf(s);
      expect(weight).toBeCloseTo(beam.height, 3);
      expect(s.columns.RUS.h / beam.height).toBeCloseTo(subject.widestShare / 100, 3);
      expect(mean).toBeCloseTo(subject.byArea, 6);
      expect(valueAt(s.pivots.area.x)).toBeCloseTo(subject.byArea, 6);
      expect(s.pivots.area.opacity).toBe(1);
    });

    it("should slide the pivot with the morph, always under the balance the columns strike, from 44,9 to 65,1 %", () => {
      const [a, b] = (WINDOWS as any).subject.morph;
      for (const t of [0.25, 0.5, 0.75]) {
        const s = sceneAt(props as any, Math.round(T.subject.start + T.subject.duration * (a + t * (b - a))));
        const { mean, weight } = balanceOf(s);
        expect(weight).toBeCloseTo(beam.height, 3);
        expect(valueAt(s.pivots.live.x)).toBeCloseTo(mean, 6);
        expect(mean).toBeGreaterThan(subject.byArea);
        expect(mean).toBeLessThan(subject.byCountry);
      }
      const end = sceneAt(props as any, endOf(T.subject) - 1);
      for (const c of props.countries) if (end.columns[c.iso]) expect(end.columns[c.iso].h).toBeCloseTo(beam.height / [...subject.share.values()].filter((v) => v !== null).length, 6);
      expect(valueAt(end.pivots.live.x)).toBeCloseTo(subject.byCountry, 6);
      expect(valueAt(end.pivots.area.x)).toBeCloseTo(subject.byArea, 6);
      expect(end.pivots.live.text.replace(/\s/g, "")).toBe("parpays65,1%");
    });

    it("should have measured every text the live pivot can show", () => {
      for (let f = T.subject.start; f < T.total; f += 2) {
        const s = sceneAt(props as any, f);
        if (s.pivots.live.opacity > 0) expect([f, beam.liveTexts[s.pivots.live.text] !== undefined]).toEqual([f, true]);
      }
    });

    it("should set the balance under the key, inside the margins, clear of the key, the credit and every tile", () => {
      const apart = (p: any, q: any) => p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y;
      const block = { x: beam.block.x, y: beam.block.y, w: beam.block.width, h: beam.block.height };
      const { legend, credit } = props as any;
      expect(apart(block, { x: legend.at.x, y: legend.at.y, w: legend.width, h: legend.height })).toBe(true);
      expect(apart(block, { x: credit.at.x, y: credit.at.y, w: credit.width, h: credit.height })).toBe(true);
      for (const c of props.countries) expect([c.iso, apart(block, c.tile)]).toEqual([c.iso, true]);
      expect(block.x).toBeGreaterThanOrEqual(props.layoutInset.x);
      expect(block.y + block.h).toBeLessThanOrEqual(props.frame.height - props.layoutInset.y);
    });

    it("should keep the key clear of every tile, and the credit clear of the key and every tile", () => {
      const { legend, credit } = props as any;
      const box = (at: any, w: number, h: number) => ({ x: at.x, y: at.y, w, h });
      const apart = (a: any, b: any) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      const keyBox = box(legend.at, legend.width, legend.height);
      const creditBox = box(credit.at, credit.width, credit.height);
      expect(apart(keyBox, creditBox)).toBe(true);
      for (const c of props.countries) {
        expect([c.iso, apart(keyBox, c.tile)]).toEqual([c.iso, true]);
        expect([c.iso, apart(creditBox, c.tile)]).toEqual([c.iso, true]);
      }
    });

    it("should hold every tile's code inside its tile", () => {
      for (const c of props.countries) expect([c.iso, c.code.width * 1.02 <= c.tile.w]).toEqual([c.iso, true]);
    });
  });
}
