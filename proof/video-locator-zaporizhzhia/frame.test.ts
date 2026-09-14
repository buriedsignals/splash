import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { LocatorFrame } from "./LocatorFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the story in
 * order: the title at frame 0, Europe at the end of reference, the close-up settled with its names at the end of reveal,
 * the station counted to its capacity at the end; the three classes of place in three treatments; nothing named while the
 * camera travels.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(LocatorFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s locator video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title, show Europe at the end of reference and the close-up with its names at the end of reveal", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      expect(sceneAt(props as any, last("reference")).viewBox).toEqual(props.cameras.overview);
      const reveal = sceneAt(props as any, last("reveal"));
      expect([reveal.viewBox, reveal.names]).toEqual([props.cameras.closeUp, 1]);
    });

    it("should draw the focus country's regional borders at the close-up, and not on the continent", () => {
      expect(props.regions.d.length).toBeGreaterThan(1000);
      expect(sceneAt(props as any, last("reference")).regions).toBe(0);
      expect(sceneAt(props as any, last("reveal")).regions).toBe(1);
      expect(markupAt(props.timing.total - 1)).toContain(props.regions.d.slice(0, 40));
      expect(contrast(props.colours.region, props.colours.story)).toBeGreaterThanOrEqual(1.6 - 0.01);
    });

    it("should name nothing of the close-up while the camera travels", () => {
      for (let f = props.timing.reveal.start; f < last("reveal"); f += 2) {
        const s = sceneAt(props as any, f);
        if (s.zoom > 0 && s.zoom < 1) expect([f, s.names]).toEqual([f, 0]);
      }
    });

    it("should end with the station counted to its capacity, from a measured text", () => {
      const end = sceneAt(props as any, props.timing.total - 1);
      expect([end.capacity, end.source]).toEqual([6000, 1]);
      for (let f = 0; f < props.timing.total; f += 3) expect([f, String(sceneAt(props as any, f).capacity) in props.station.capacityTexts]).toEqual([f, true]);
    });

    it("should set areas, settlements and waters in three treatments: uppercase, mixed case, italic", () => {
      const { area, settlement, water } = props.registers;
      expect(area.transform).toBe("uppercase");
      expect([settlement.fontStyle, water.fontStyle]).toEqual(["normal", "italic"]);
      for (const n of props.names.filter((x: any) => x.kind === "area")) expect(n.text).toBe(n.text.toUpperCase());
    });
  });
}
