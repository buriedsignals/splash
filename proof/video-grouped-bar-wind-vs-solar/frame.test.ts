import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { GroupedBarFrame } from "./GroupedBarFrame.tsx";
import { moveOf, sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the comparison
 * told in order: the title at frame 0, wind across the six before any solar, the lead counting only the groups whose solar
 * has landed under wind, the exception kept alone at the focus.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(GroupedBarFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };

  describe(`${id}'s grouped bar video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should carry a measured width for every share at every frame", () => {
      const unmeasured = [];
      for (let f = 0; f < props.timing.total; f += 2) if (/<text\b(?![^>]*data-width="\d)[^>]*>/.test(markupAt(f))) unmeasured.push(f);
      expect(unmeasured).toEqual([]);
    });

    it("should open on the title and raise wind across the six before any solar", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const scene = sceneAt(props, within("reveal", "wind", 1));
      expect([scene.groups.every((g: any) => g.wind === 1), scene.groups.every((g: any) => g.solar === 0)]).toEqual([true, true]);
    });

    it("should count the lead only where solar has landed under wind", () => {
      for (const t of [0.3, 0.6, 0.9, 1]) {
        const scene = sceneAt(props, within("reveal", "solar", t));
        const solar = t;
        const expected = props.groups.filter((g: any, i: number) => moveOf(solar, i, props.groups.length) >= 1 && g.solar < g.wind).length;
        expect([t, scene.lead]).toEqual([t, expected]);
      }
      expect(sceneAt(props, props.timing.total - 1).lead).toBe(props.groups.length - 1);
    });

    it("should keep the exception alone at the focus, and step nothing back before it", () => {
      expect(sceneAt(props, last("reveal")).groups.every((g: any) => g.stepBack === 0)).toBe(true);
      const end = sceneAt(props, props.timing.total - 1);
      expect(props.groups.filter((g: any, i: number) => end.groups[i].stepBack === 0).map((g: any) => g.name)).toEqual([props.subject]);
    });
  });
}
