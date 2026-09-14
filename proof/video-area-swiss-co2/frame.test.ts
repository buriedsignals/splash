import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { AreaFrame } from "./AreaFrame.tsx";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the claim told
 * in order: the title at frame 0, the surface filled from zero with the stock at 3 158 Mt at the end of reveal, the split
 * at 1986 at the end; each half's name inside its own span, on its own side of the rule.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(AreaFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s area video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title with no surface, and fill to 2024 with the whole stock at the end of reveal", () => {
      const first = sceneAt(props as any, 0);
      expect([first.title, first.surface]).toEqual([1, ""]);
      const reveal = sceneAt(props as any, last("reveal"));
      expect([reveal.fill, reveal.year]).toEqual([1, 2024]);
      expect(props.stock.texts["2024"].text.replace(/\s/g, "")).toBe("3158Mtdepuis1858");
    });

    it("should close the surface on zero — an area is read from its base", () => {
      expect(props.baseY).toBe(props.plot.bottom);
      expect(sceneAt(props as any, last("reveal")).surface.endsWith(`${Math.round(props.plot.bottom * 10) / 10}Z`)).toBe(true);
    });

    it("should seat each half's name inside its own side of the rule", () => {
      for (const l of props.beforeLabel) expect(l.x + l.width * 1.02).toBeLessThanOrEqual(props.ruleX);
      for (const l of props.afterLabel) {
        expect(l.x).toBeGreaterThanOrEqual(props.ruleX);
        expect(l.x + l.width * 1.02).toBeLessThanOrEqual(props.plot.right);
      }
    });

    it("should split at the end", () => {
      expect(sceneAt(props as any, props.timing.total - 1).split).toBe(1);
    });
  });
}
