import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { SmallMultiplesFrame } from "./SmallMultiplesFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0; sixteen 2000 bars in one row on one baseline, each keeping its height as it is cut
 * into its panel; each 2024 bar sliding out of its 2000 bar and rising to its value, the gain counted; every added part at
 * the baseline once detached, keeping its length; the panels in alphabetical order until the subject and in the order of
 * the start after it; every part back on its level at the end, Denmark and Sweden ringed, the credit on one line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(SmallMultiplesFrame, { ...props, at: frame }),
    );
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const at = (event: string, p: number) =>
    props.timing[event].start + Math.round(props.timing[event].duration * p);
  const cellOf = (s: any) =>
    props.cells.findIndex(
      (c: any) => Math.abs(c.x - s.x) < 1e-6 && Math.abs(c.top - s.top) < 1e-6,
    );
  const orderAt = (frame: number) => {
    const s = sceneAt(props, frame);
    const keys: string[] = [];
    s.rows.forEach((r: any) => (keys[cellOf(r)] = r.key));
    return keys;
  };

  describe(`${id}'s small multiples video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should carry a measured width for every counter at every frame", () => {
      const unmeasured = [];
      for (let f = 0; f < props.timing.total; f += 3)
        if (/<text\b(?![^>]*data-width="\d)[^>]*>/.test(markupAt(f)))
          unmeasured.push(f);
      expect(unmeasured).toEqual([]);
    });

    it("should open on the title card", () => {
      expect(sceneAt(props, 0).title).toBe(1);
    });

    it("should stand the sixteen 2000 bars side by side in one row, on one baseline, each its share on the one scale", () => {
      const [, levelEnd] = WINDOWS.reference.level;
      const [cutStart] = WINDOWS.reference.cut;
      const s = sceneAt(props, at("reference", (levelEnd + cutStart) / 2));
      expect(new Set(s.rows.map((r: any) => r.top)).size).toBe(1);
      s.rows.forEach((r: any, i: number) => {
        expect([r.key, r.x, r.level, r.cut]).toEqual([
          props.rows[i].key,
          expect.closeTo(props.seats[i].x, 9),
          expect.closeTo(props.rows[i].from, 9),
          0,
        ] as any);
      });
      for (let i = 1; i < s.rows.length; i++)
        expect(s.rows[i].x - s.rows[i - 1].x).toBeCloseTo(props.slotW, 0);
    });

    it("should keep every 2000 bar's height while the row is cut, and seat each in its alphabetical panel", () => {
      const [a, b] = WINDOWS.reference.cut;
      const mid = sceneAt(props, at("reference", (a + b) / 2));
      mid.rows.forEach((r: any, i: number) =>
        expect(r.level).toBeCloseTo(props.rows[i].from, 9),
      );
      expect(mid.rows.some((r: any) => r.cut > 0 && r.cut < 1)).toBe(true);
      expect(orderAt(last("reference"))).toEqual(props.before);
    });

    it("should slide each 2024 copy out to its own column and raise it to its value, counting its rounded gain", () => {
      const s = sceneAt(props, last("reveal"));
      s.rows.forEach((r: any, i: number) => {
        const row = props.rows[i];
        expect([
          r.key,
          r.copy.slide,
          r.copy.lower.h,
          r.copy.gain.from,
          r.copy.gain.to,
          r.count,
        ]).toEqual([
          row.key,
          1,
          expect.closeTo(row.from, 9),
          expect.closeTo(row.from, 9),
          expect.closeTo(row.to, 9),
          Math.round(row.delta),
        ] as any);
      });
      expect(s.rows.every((r: any) => r.count > 0)).toBe(true);
    });

    it("should raise no copy before it has slid out beside its 2000 bar", () => {
      for (let f = props.timing.reveal.start; f <= last("reveal"); f += 2)
        for (const r of sceneAt(props, f).rows)
          if (r.copy && r.copy.slide < 1)
            expect([f, r.key, r.copy.gain.to - r.copy.gain.from]).toEqual([
              f,
              r.key,
              0,
            ]);
    });

    it("should keep every added part's length, on one scale, from the end of the reveal to the last frame", () => {
      for (let f = last("reveal"); f < props.timing.total; f += 4) {
        const s = sceneAt(props, f);
        props.rows.forEach((row: any, i: number) => {
          const g = s.rows[i].copy.gain;
          expect([f, row.key, g.to - g.from]).toEqual([
            f,
            row.key,
            expect.closeTo(row.delta, 9),
          ] as any);
        });
      }
    });

    it("should drop every added part to the baseline at the subject, the rest of the 2024 bar gone", () => {
      const s = sceneAt(props, last("subject"));
      expect(
        s.rows.map((r: any) => [r.copy.gain.from, r.copy.lower.opacity]),
      ).toEqual(props.rows.map(() => [0, 0]));
    });

    it("should hold the alphabetical order through the reveal and the order of the 2000 start after the subject", () => {
      expect(orderAt(last("reveal"))).toEqual(props.before);
      expect(orderAt(last("subject"))).toEqual(props.byStart);
      const starts = props.byStart.map(
        (key: string) => props.rows.find((r: any) => r.key === key).from,
      );
      expect(starts).toEqual([...starts].sort((x: number, y: number) => x - y));
    });

    it("should let each panel's words give way while it crosses, and bring them back at its new cell", () => {
      const T = props.timing.subject;
      props.rows.forEach((row: any, i: number) => {
        const during = [];
        for (let f = at("subject", WINDOWS.subject.reorder[0]); f <= at("subject", WINDOWS.subject.reorder[1]); f++)
          during.push(sceneAt(props, f).rows[i].words);
        expect([row.key, sceneAt(props, at("subject", WINDOWS.subject.detach[1])).rows[i].words]).toEqual([row.key, 1]);
        expect([row.key, Math.min(...during) < 0.05]).toEqual([row.key, true]);
        expect([row.key, sceneAt(props, T.start + T.duration - 1).rows[i].words]).toEqual([row.key, 1]);
      });
    });

    it("should end on the whole grid — every 2024 bar whole, nothing stepped back — Denmark and Sweden ringed, the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect(
        end.rows.map((r: any) => [
          r.level,
          r.copy.gain.from,
          r.copy.gain.to,
          r.copy.lower.opacity,
          r.name,
          r.words,
        ]),
      ).toEqual(
        props.rows.map((row: any) => [
          row.from,
          expect.closeTo(row.from, 9),
          expect.closeTo(row.to, 9),
          1,
          1,
          1,
        ]),
      );
      expect(orderAt(props.timing.total - 1)).toEqual(props.byStart);
      expect(end.ring).toBe(1);
      const byDelta = [...props.rows].sort(
        (a: any, b: any) => b.delta - a.delta,
      );
      expect(props.rings).toEqual([byDelta[0].key, byDelta.at(-1).key]);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
