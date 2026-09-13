import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { ChoroplethFrame } from "./ChoroplethFrame.tsx";

/**
 * The markup the composition draws, rendered in Bun at the last frame of every event, held to the landscape
 * type floor — map names included, since every word is an SVG `<text>` — and every word carrying the width
 * Bun measured for the width agreement.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (p: any, frame: number) =>
    renderToStaticMarkup(createElement(ChoroplethFrame, { ...p, at: frame }));

  describe(`${id}'s drawn markup`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(props, endOf(props.timing[event]) - 1);
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.length).toBeGreaterThan(20);
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
