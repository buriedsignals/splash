import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { CartogramFrame } from "./CartogramFrame.tsx";
import { sceneAt } from "./scene.mjs";

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
      expect([last.title, last.morph, last.codes, last.area, last.country, last.source]).toEqual([0, 1, 1, 1, 1, 1]);
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
