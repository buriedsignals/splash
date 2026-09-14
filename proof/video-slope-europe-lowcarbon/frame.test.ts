import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat, PITCH } from "./build.mjs";
import { sceneAt } from "./scene.mjs";
import { SlopeFrame } from "./SlopeFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the claim told
 * in order: all sixteen lines drawn, every end label kept at a legible pitch and in the order of its values, every line
 * rising, the pair picked out at the end with its crossing between the rails.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(SlopeFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s slope video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should draw all sixteen, every one rising, with no line at 2024 before the reveal", () => {
      expect(props.lines.length).toBe(16);
      for (const d of props.lines) expect([d.key, d.b.y < d.a.y]).toEqual([d.key, true]);
      expect(sceneAt(props as any, last("reference")).travel).toBe(0);
      expect(sceneAt(props as any, last("reveal")).travel).toBe(1);
    });

    it("should keep every rail's labels apart at the pitch, in the order of their values", () => {
      for (const side of ["left", "right"] as const) {
        const ends = [...props.lines].sort((a: any, b: any) => (side === "left" ? a.a.y - b.a.y : a.b.y - b.b.y));
        for (let i = 1; i < ends.length; i++) expect(ends[i][side].cy - ends[i - 1][side].cy).toBeGreaterThanOrEqual(PITCH * props.registers.axis.fontSize * 0.9);
      }
    });

    it("should pick out the pair at the end and ring their crossing between the rails, near the right one", () => {
      const end = sceneAt(props as any, props.timing.total - 1);
      expect(end.focus).toBe(1);
      expect(props.lines.filter((d: any) => d.pair).map((d: any) => d.key).sort()).toEqual(["Finland", "France"]);
      expect(props.cross.x).toBeGreaterThan(props.rail.left);
      expect(props.cross.x).toBeLessThan(props.rail.right);
    });
  });
}
