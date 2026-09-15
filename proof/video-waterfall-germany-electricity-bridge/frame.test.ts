import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt } from "./scene.mjs";
import { WaterfallFrame } from "./WaterfallFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument told
 * in order: the title at frame 0; the 2015 total and its copy carried to 2024; the copy's members at their 2024 lengths,
 * the counter always the stack's own height; every gained or lost part keeping its length while it slides and landing on
 * its step; the whole chart at the end, seams closed, the net change bracketed; the credit on one line.
 */

const beat = loadBeat();
const oneDecimal = (v: number) =>
  `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(".", ",")}`;

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(WaterfallFrame, { ...props, at: frame }),
    );
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const yOf = (v: number) => props.baseline - v * props.unit;

  describe(`${id}'s waterfall video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title, and end the reference on the 2015 total with its copy at the 2024 slot", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      const s = sceneAt(props, last("reference"));
      expect(s.opening.h).toBeCloseTo(props.opening * props.unit, 6);
      expect([s.copy.x, s.copy.h]).toEqual([
        expect.closeTo(props.slots[4].x, 6),
        expect.closeTo(props.opening * props.unit, 6),
      ] as any);
    });

    it("should end the reveal on the copy's members at their 2024 lengths, stacked from zero, counting the closing total", () => {
      const s = sceneAt(props, last("reveal"));
      let base = 0;
      for (const key of props.stack) {
        const m = props.members.find((x: any) => x.key === key);
        const seg = s.copy.segments.find((x: any) => x.key === key);
        expect([seg.y, seg.h]).toEqual([
          expect.closeTo(yOf(base + m.to), 6),
          expect.closeTo(m.to * props.unit, 6),
        ] as any);
        base += m.to;
      }
      expect(props.counts[s.countKey].text).toBe(oneDecimal(props.closing));
    });

    it("should count, at every frame of the morph, the height of the stack it stands on", () => {
      const { start, duration } = props.timing.reveal;
      for (let f = start; f < start + duration; f += 7) {
        const s = sceneAt(props, f);
        const height =
          s.copy.segments.reduce((t: number, seg: any) => t + seg.h, 0) /
          props.unit;
        expect(props.counts[s.countKey].text).toBe(oneDecimal(height));
      }
    });

    it("should keep every part's length while it slides", () => {
      const { start, duration } = props.timing.subject;
      let sliding = 0;
      for (let f = start; f < start + duration; f += 5) {
        const s = sceneAt(props, f);
        props.members.forEach((m: any, k: number) => {
          const p = s.parts[k];
          if (!(p.light > 0)) return;
          if (p.slide > 0 && p.slide < 1) sliding += 1;
          expect(p.h).toBeCloseTo(Math.abs(m.change) * props.unit, 6);
        });
      }
      expect(sliding).toBeGreaterThan(0);
    });

    it("should carry no part through another part or a change already written", () => {
      const { start, duration } = props.timing.subject;
      const overlaps = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const valueH = props.registers.value.fontSize;
      for (let f = start; f < start + duration; f += 2) {
        const s = sceneAt(props, f);
        const boxes = s.parts.filter((p: any) => p.light > 0).map((p: any) => ({ key: p.key, x: p.x, y: p.y, w: props.barW, h: p.h }));
        boxes.forEach((a: any, i: number) => {
          for (const b of boxes.slice(i + 1)) expect([f, a.key, b.key, overlaps(a, b)]).toEqual([f, a.key, b.key, false]);
          props.stepLabels.forEach((l: any, k: number) => {
            if (!(s.labels[k] > 0) || props.steps[k].key === a.key) return;
            const box = { x: l.x, y: l.y - valueH, w: l.width, h: valueH };
            expect([f, a.key, k, overlaps(a, box)]).toEqual([f, a.key, k, false]);
          });
        });
      }
    });

    it("should land every part on its step, from the running total, in its slot", () => {
      const s = sceneAt(props, last("subject"));
      props.steps.forEach((step: any, k: number) => {
        const p = s.parts[k];
        expect([p.x, p.y, p.y + p.h]).toEqual(
          [
            props.slots[k + 1].x,
            yOf(Math.max(step.from, step.to)),
            yOf(Math.min(step.from, step.to)),
          ].map((v) => expect.closeTo(v, 6)) as any,
        );
      });
      expect(props.steps.at(-1).to).toBeCloseTo(props.closing, 6);
    });

    it("should detach the gain from the 2024 copy and the losses from the 2015 total", () => {
      const { start, duration } = props.timing.subject;
      const s = sceneAt(props, start + Math.round(duration * 0.15));
      const lit = props.members
        .map((_: any, k: number) => s.parts[k])
        .filter((p: any) => p.light > 0 && p.slide === 0);
      expect(lit.length).toBeGreaterThan(0);
      for (const p of lit) {
        const m = props.members.find((x: any) => x.key === p.key);
        expect(p.x).toBeCloseTo(
          m.change > 0 ? props.slots[4].x : props.slots[0].x,
          6,
        );
      }
    });

    it("should end on the whole chart: seams closed, every name seated, every change shown, the net change bracketed", () => {
      const s = sceneAt(props, props.timing.total - 1);
      expect(s.seams).toBe(0);
      expect(s.names.map((n: any) => [n.x, n.y])).toEqual(
        props.members.map((m: any) => [m.name.seat.x, m.name.seat.y]),
      );
      expect(s.labels).toEqual([1, 1, 1]);
      expect(s.bracket).toBe(1);
      expect(props.bracket.label.text).toBe(
        `${oneDecimal(props.closing - props.opening)}\u00A0TWh`,
      );
      expect([props.bracket.left, props.bracket.right]).toEqual([
        props.slots[0].x + props.barW,
        props.slots[4].x,
      ]);
    });

    it("should set the credit on one line", () => {
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
