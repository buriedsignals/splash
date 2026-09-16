import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat, PITCH } from "./build.mjs";
import { moveOf, sceneAt, TEST, WINDOWS } from "./scene.mjs";
import { SlopeFrame } from "./SlopeFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: all sixteen lines, every one rising, every end label at a legible pitch in the order of its values; the rises
 * counted only as lines land; every line that started under France tested, the one that ends above it tested last and
 * the only one counted; the whole chart at the end, nothing stepped back, the pair in the accent, the crossing ringed.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(SlopeFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const within = (event: string, field: string, t: number) => {
    const { start, duration } = props.timing[event];
    const [a, b] = (WINDOWS as any)[event][field];
    return Math.round(start + duration * (a + t * (b - a)));
  };

  describe(`${id}'s slope video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should draw all sixteen, every one rising, and count the rises only as the lines land", () => {
      expect(props.lines.length).toBe(16);
      for (const d of props.lines) expect([d.key, d.b.y < d.a.y]).toEqual([d.key, true]);
      const s = sceneAt(props, within("reveal", "travel", 0.5));
      expect(s.rose).toBe(s.lines.filter((l: any) => l.arrived >= 1).length);
      expect(s.rose > 0 && s.rose < 16).toBe(true);
      expect(sceneAt(props, last("reveal")).rose).toBe(16);
    });

    it("should keep every rail's labels apart at the pitch, in the order of their values", () => {
      for (const side of ["left", "right"] as const) {
        const ends = [...props.lines].sort((a: any, b: any) => (side === "left" ? a.a.y - b.a.y : a.b.y - b.b.y));
        for (let i = 1; i < ends.length; i++) expect(ends[i][side].cy - ends[i - 1][side].cy).toBeGreaterThanOrEqual(PITCH * props.registers.axis.fontSize * 0.9);
      }
    });

    it("should test every line that started under France, the one that passes it last, and count only that one", () => {
      const tested = props.lines.filter((d: any) => d.testRank !== null);
      const france = props.lines.find((d: any) => d.key === props.held);
      expect(tested.map((d: any) => d.key).sort()).toEqual(props.lines.filter((d: any) => d.key !== props.held && d.a.y > france.a.y).map((d: any) => d.key).sort());
      const lastTested = tested.find((d: any) => d.testRank === tested.length - 1);
      expect([lastTested.key, tested.filter((d: any) => d.passes).map((d: any) => d.key)]).toEqual([props.climber, [props.climber]]);
      const mid = sceneAt(props, within("subject", "check", 0.5));
      expect(mid.passed).toBe(0);
      expect(sceneAt(props, last("subject")).passed).toBe(1);
      expect(moveOf(1, tested.length - 1, tested.length, TEST)).toBeCloseTo(1, 9);
    });

    it("should end on the whole chart: nothing stepped back, the pair in the accent, the crossing ringed, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect(end.lines.every((l: any) => l.stepBack === 0)).toBe(true);
      expect(props.lines.filter((d: any, i: number) => end.lines[i].accent === 1).map((d: any) => d.key).sort()).toEqual([props.climber, props.held].sort());
      expect([end.ring, end.passed]).toEqual([1, 1]);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
