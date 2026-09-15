import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { LocatorFrame } from "./LocatorFrame.tsx";
import { mapStateAt, sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the story in
 * order: the title at frame 0, Europe at the end of reference, the close-up settled with its names at the end of reveal,
 * the station counted to its capacity at the end; nothing named while the camera travels; the three classes of place in
 * three treatments. The map is not drawn here (`liveMap: () => null`): its layers are held in `map-plan.test.ts`.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const built = buildDirection(id, beat) as any;
  const { props } = built;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(LocatorFrame, { ...props, at: frame, liveMap: () => null }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const camera = (s: any) => [s.camX, s.camY, s.camZoom];

  describe(`${id}'s locator video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title, show Europe at the end of reference and the close-up with its names at the end of reveal", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      expect(camera(mapStateAt(props, last("reference")))).toEqual(camera(props.cameras.whole));
      const reveal = mapStateAt(props, last("reveal"));
      expect([...camera(reveal), reveal.names]).toEqual([...camera(props.cameras.closeUp), 1]);
    });

    it("should draw the focus country's regional borders at the close-up, and not on the continent", () => {
      expect(mapStateAt(props, last("reference")).regions).toBe(0);
      expect(mapStateAt(props, last("reveal")).regions).toBe(1);
    });

    it("should name nothing of the close-up while the camera travels", () => {
      for (let f = props.timing.reveal.start; f < last("reveal"); f += 2) {
        const s = mapStateAt(props, f);
        if (s.zoom > 0 && s.zoom < 1) expect([f, s.names]).toEqual([f, 0]);
      }
    });

    it("should end with the station counted to its capacity, from a measured text", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect([end.capacity, end.source]).toEqual([6000, 1]);
      for (let f = 0; f < props.timing.total; f += 3) expect([f, String(sceneAt(props, f).capacity) in props.station.capacityTexts]).toEqual([f, true]);
    });

    it("should set areas, settlements and waters in three treatments: uppercase, mixed case, italic", () => {
      const { area, settlement, water } = built.mapRegisters;
      expect(area.transform).toBe("uppercase");
      expect([settlement.fontStyle, water.fontStyle]).toEqual(["normal", "italic"]);
      for (const n of built.names.filter((x: any) => x.kind === "area")) expect(n.text).toBe(n.text.toUpperCase());
      const fontOf = (key: string) => props.mapPlan.layers.find((l: any) => l.id === `name-${key}`).layout["text-font"][0];
      for (const n of built.waters) expect(fontOf(n.key)).toContain("Italic");
      for (const n of built.names) expect(fontOf(n.key)).not.toContain("Italic");
    });
  });
}
