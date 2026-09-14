import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat, WIDEST } from "./build.mjs";
import { FlowFrame } from "./FlowFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the claim told
 * in order: the title at frame 0, every band drawn and the total counted at the end of reveal, the top two's exact share
 * at the end, every name against its own band's end, the widths the key's scale.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(FlowFrame, { ...(props as any), at: frame }));
  const last = (event: string) => endOf((props.timing as any)[event]) - 1;

  describe(`${id}'s flow map video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title, and have every band drawn and all 4 504 080 people counted at the end of reveal", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      const reveal = sceneAt(props as any, last("reveal"));
      expect([reveal.arrived, reveal.people]).toEqual([props.bands.length, 4504080]);
      expect(props.legend.peopleTexts[String(reveal.arrived)].text.replace(/\s/g, "")).toBe("4504080personnes");
    });

    it("should end on every band with the top two's exact share", () => {
      const end = sceneAt(props as any, props.timing.total - 1);
      expect([end.share, end.source]).toEqual([props.topTwoShare, 1]);
      for (const b of props.bands) expect([b.code, end.bands[b.code].opacity]).toEqual([b.code, 1]);
    });

    it("should draw every band's width to the key's scale — the largest host at the widest, the scale's million in proportion", () => {
      const largest = props.bands[0];
      expect(largest.width).toBe(WIDEST);
      expect(props.legend.scale[0].width / largest.width).toBeCloseTo(1e6 / largest.people, 3);
    });

    it("should seat every name within three of its heights of its own band's end", () => {
      for (const b of props.bands.filter((x: any) => props.names[x.code])) {
        const n = props.names[b.code];
        const end = b.d.split(/[QM ]/).filter(Boolean).slice(-2).map(Number);
        const cx = n.x + n.width / 2;
        const dist = Math.hypot(Math.max(n.x - end[0], 0, end[0] - n.x - n.width), Math.max(n.y - 40 - end[1], 0, end[1] - n.y));
        expect([b.code, dist <= 3 * 50, Number.isFinite(cx)]).toEqual([b.code, true, true]);
      }
    });
  });
}
