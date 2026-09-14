import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, CODE_SHARE, loadBeat } from "./build.mjs";
import { HexFrame } from "./HexFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the claim told
 * in order: the title at frame 0, every cell in its count class at the end of reveal, every cell in its rate class at the
 * end, every code readable on its cell at the end of every event, every code inside its hexagon.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(HexFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;
  const hosts = props.cells.filter((c: any) => !c.origin);

  describe(`${id}'s hex grid video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, every word with its measured width, every code readable on its cell`, () => {
        const frame = last(event);
        const svg = markupAt(frame);
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
        const scene = sceneAt(props as any, frame);
        for (const c of props.cells) {
          const ink = c.label.inks[scene.inkStage[c.code] as "neutral" | "count" | "rate"];
          expect([c.code, contrast(ink, scene.fills[c.code]) >= 4.45]).toEqual([c.code, true]);
        }
      });

    it("should open on the title, and hold every host in its count class at the end of reveal", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      const reveal = sceneAt(props as any, last("reveal"));
      for (const c of hosts) expect([c.code, reveal.fills[c.code]]).toEqual([c.code, props.colours.classFills[c.countClass]]);
    });

    it("should end with every host in its rate class, the leader in the top class and the largest host not", () => {
      const end = sceneAt(props as any, props.timing.total - 1);
      for (const c of hosts) expect([c.code, end.fills[c.code]]).toEqual([c.code, props.colours.classFills[c.rateClass]]);
      const top = props.colours.classFills.length - 1;
      expect(props.cells.find((c: any) => c.code === props.leader).rateClass).toBe(top);
      expect(props.cells.find((c: any) => c.code === props.largest).countClass).toBe(top);
      expect(props.cells.find((c: any) => c.code === props.largest).rateClass).toBeLessThan(top);
    });

    it("should hold every code inside its hexagon's usable width", () => {
      for (const c of props.cells) expect([c.code, c.label.width * 1.02 <= CODE_SHARE * props.hex.W + 0.01]).toEqual([c.code, true]);
    });
  });
}
