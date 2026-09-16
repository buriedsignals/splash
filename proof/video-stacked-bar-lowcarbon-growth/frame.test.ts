import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { StackedBarFrame } from "./StackedBarFrame.tsx";
import { sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0; the rows in their 2000 order until the subject and by gain after it; every added
 * part keeping its length from the moment it has stacked; five copies of Spain's level laid end to end along France's;
 * every added part at zero once detached and back on its level at the end; Spain and France ringed, the credit on one line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(StackedBarFrame, { ...props, at: frame }),
    );
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const at = (event: string, p: number) =>
    props.timing[event].start + Math.round(props.timing[event].duration * p);
  const orderAt = (frame: number) => {
    const s = sceneAt(props, frame);
    return props.rows
      .map((r: any, i: number) => ({ key: r.key, slot: s.rows[i].slot }))
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((r: any) => r.key);
  };
  const indexOf = (key: string) =>
    props.rows.findIndex((r: any) => r.key === key);

  describe(`${id}'s stacked bar video`, () => {
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

    it("should hold the 2000 order through the reveal and the order of gain after the subject", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      expect(orderAt(last("reveal"))).toEqual(props.before);
      expect(orderAt(last("reveal"))[0]).toBe(props.incumbent);
      expect(orderAt(props.timing.total - 1)).toEqual(props.byGain);
      expect(orderAt(props.timing.total - 1)[0]).toBe(props.adder);
    });

    it("should count each gain to its own rounded value by the end of the reveal", () => {
      const s = sceneAt(props, last("reveal"));
      expect(s.rows.map((r: any) => r.count)).toEqual(
        props.rows.map((r: any) => Math.round(r.growth)),
      );
    });

    it("should keep every added part's length, on one scale, from the end of the reveal to the last frame", () => {
      for (let f = last("reveal"); f < props.timing.total; f += 4) {
        const s = sceneAt(props, f);
        props.rows.forEach((r: any, i: number) => {
          expect([f, r.key, s.rows[i].gain.to - s.rows[i].gain.from]).toEqual([
            f,
            r.key,
            expect.closeTo(r.growth, 9),
          ] as any);
        });
      }
    });

    it("should lay the copies of Spain's level end to end along France's, counting to five", () => {
      const [, copiesEnd] = WINDOWS.subject.copies;
      const [detachStart] = WINDOWS.subject.detach;
      const s = sceneAt(props, at("subject", (copiesEnd + detachStart) / 2));
      const adder = props.rows[indexOf(props.adder)];
      const incumbent = props.rows[indexOf(props.incumbent)];
      const franceSlot = s.rows[indexOf(props.incumbent)].slot;
      expect(s.copies.length).toBe(props.copies);
      expect(props.copies).toBe(5);
      s.copies.forEach((c: any, k: number) => {
        expect([k, c.slot, c.from, c.to - c.from]).toEqual([
          k,
          franceSlot,
          expect.closeTo(k * adder.level, 9),
          expect.closeTo(adder.level, 9),
        ] as any);
      });
      expect(
        Math.abs(s.copies.at(-1).to - incumbent.level) / incumbent.level,
      ).toBeLessThan(0.01);
      expect([s.copyCount, s.copyOpacity]).toEqual([props.copies, 1]);
    });

    it("should start each copy on Spain's own bar", () => {
      const s = sceneAt(props, at("subject", WINDOWS.subject.copies[0]));
      const spain = s.rows[indexOf(props.adder)];
      expect(s.copies.map((c: any) => [c.slot, c.from])).toEqual(
        s.copies.map(() => [spain.slot, 0]),
      );
    });

    it("should slide every added part to zero at the subject, the levels stepping back, and back onto its level at the end", () => {
      const detached = sceneAt(props, last("subject"));
      expect(detached.rows.map((r: any) => r.gain.from)).toEqual(
        props.rows.map(() => 0),
      );
      expect(
        Math.max(...detached.rows.map((r: any) => r.level.opacity)),
      ).toBeLessThan(0.5);
      expect(detached.copyOpacity).toBe(0);
      const end = sceneAt(props, props.timing.total - 1);
      expect(
        end.rows.map((r: any) => [r.gain.from, r.level.w, r.level.opacity]),
      ).toEqual(props.rows.map((r: any) => [r.level, r.level, 1]));
    });

    it("should let the words give way while the rows cross, and bring them back at their new slots", () => {
      const [a, b] = WINDOWS.subject.reorder;
      expect(sceneAt(props, at("subject", WINDOWS.subject.detach[1])).words).toBe(1);
      expect(sceneAt(props, at("subject", (a + b) / 2)).words).toBeLessThan(0.05);
      expect(sceneAt(props, last("subject")).words).toBe(1);
    });

    it("should end on the whole chart with Spain and France ringed, France the longest, and the credit on one line", () => {
      const end = sceneAt(props, props.timing.total - 1);
      expect(end.ring).toBe(1);
      expect(props.rings).toEqual([props.adder, props.incumbent]);
      expect(
        props.rows.reduce((a: any, b: any) => (b.total > a.total ? b : a)).key,
      ).toBe(props.incumbent);
      expect(props.credit.lines.length).toBe(1);
    });
  });
}
