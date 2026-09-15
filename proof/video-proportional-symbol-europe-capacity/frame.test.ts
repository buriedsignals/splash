import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, KEY_MW, loadBeat, R_MAX } from "./build.mjs";
import { sceneAt } from "./scene.mjs";
import { SymbolFrame } from "./SymbolFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the claim told
 * in order: the title at frame 0, the hundred circles arrived largest first with the count at 43,0 % at the end of reveal,
 * the rest at the end; area proportional to capacity in the marks and in the key alike; the key's words apart. The map is
 * not drawn here (`liveMap: () => null`): its layers are held in `map-plan.test.ts`.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(SymbolFrame, { ...(props as any), at: frame, liveMap: () => null }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s proportional symbol video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title, and have all hundred circles in, largest first, at 43,0 % at the end of reveal", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      const reveal = sceneAt(props as any, last("reveal"));
      expect(reveal.arrived).toBe(100);
      expect(reveal.circles.filter((t: number) => t < 1)).toEqual([]);
      expect(props.legend.topTexts["100"].text.replace(/\\s/g, "")).toContain("43,0");
      for (let k = 1; k < props.top.length; k++) expect(props.top[k].r).toBeLessThanOrEqual(props.top[k - 1].r);
      const mid = sceneAt(props as any, Math.round(props.timing.reveal.start + props.timing.reveal.duration * 0.4));
      for (let k = 1; k < mid.circles.length; k++) expect(mid.circles[k]).toBeLessThanOrEqual(mid.circles[k - 1]);
    });

    it("should draw the marks and the key on one scale — area proportional to capacity", () => {
      const largest = props.top[0].r;
      expect(largest).toBeCloseTo(R_MAX, 0);
      props.legend.named.forEach((n: any, i: number) => expect(n.r).toBeCloseTo(R_MAX * Math.sqrt(KEY_MW[i] / beat.subject.maxMw), 0));
    });

    it("should keep the key's labels apart", () => {
      const [a, b] = props.legend.named.map((n: any) => ({ x0: n.label.x, x1: n.label.x + n.label.width, y0: n.label.y - 40, y1: n.label.y + 8 }));
      const apart = a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;
      expect(apart).toBe(true);
    });

    it("should end with the rest drawn and the credit set", () => {
      const end = sceneAt(props as any, props.timing.total - 1);
      expect([end.rest, end.source]).toEqual([1, 1]);
    });
  });
}
