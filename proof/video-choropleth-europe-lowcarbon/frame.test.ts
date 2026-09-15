import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { ChoroplethFrame } from "./ChoroplethFrame.tsx";

/**
 * The overlay the composition draws over the live map, rendered in Bun at the last frame of every event with no map
 * under it, held to the landscape type floor, and every word carrying the width Bun measured for the width
 * agreement. The map's own words are held to the floor on the plan (`map-plan.test.ts`).
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (p: any, frame: number) =>
    renderToStaticMarkup(createElement(ChoroplethFrame, { ...p, at: frame, liveMap: () => null }));

  describe(`${id}'s drawn markup`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(props, endOf(props.timing[event]) - 1);
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        // Every word the overlay carries is in the markup: the title card, the count, the key, the labels, the credit.
        const words = 1 + props.titleCard.title.length + 1 + props.panel.bornes.length + 1 + props.names.length + props.source.lines.length;
        expect(texts.length).toBe(words);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should be refused by the floor when a register is drawn under it", () => {
      const small = {
        ...props,
        registers: {
          ...props.registers,
          axis: { ...props.registers.axis, fontSize: 24 },
        },
      };
      expect(() =>
        assertTypeFloor(markupAt(small, props.timing.total - 1), "landscape"),
      ).toThrow(/below the 30px floor/);
    });
  });
}
