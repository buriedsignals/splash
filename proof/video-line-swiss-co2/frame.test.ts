import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { LineFrame } from "./LineFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the story in
 * order: the title at frame 0, no line before the reveal, the trace linear in years, 2024 reached and ringed at the end;
 * the rule's name clear of the line; the tip label inside the frame at the last year.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(LineFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s line video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title with no line, and reach 2024 at the end of reveal", () => {
      const first = sceneAt(props as any, 0);
      expect([first.title, first.path]).toEqual([1, ""]);
      const reveal = sceneAt(props as any, last("reveal"));
      expect([reveal.trace, reveal.tip.year]).toEqual([1, 2024]);
    });

    it("should trace linearly in years — equal frames, equal years", () => {
      const { start, duration } = props.timing.reveal;
      const yearAt = (t: number) => sceneAt(props as any, Math.round(start + duration * (0.02 + t * 0.92))).tip.year;
      const a = yearAt(0.25) - yearAt(0);
      const b = yearAt(0.75) - yearAt(0.5);
      expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
    });

    it("should set the rule's name clear of every reading of the line", () => {
      const l = props.referenceLabel;
      const box = { x0: l.x, x1: l.x + l.width, y0: l.y - props.registers.annot.fontSize, y1: l.y + 8 };
      for (const p of props.points) expect([p.year, p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1]).toEqual([p.year, false]);
    });

    it("should keep the tip label inside the frame at 2024, and ring 2024 at the end", () => {
      const t = props.tipTexts["2024"];
      expect(props.end.x + props.tipOffset + t.width * 1.02).toBeLessThanOrEqual(props.frame.width - props.layoutInset.x + 1);
      expect(sceneAt(props as any, props.timing.total - 1).subject).toBe(1);
    });
  });
}
