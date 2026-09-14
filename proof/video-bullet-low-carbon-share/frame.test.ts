import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { BulletFrame } from "./BulletFrame.tsx";
import { sceneAt } from "./scene.mjs";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the ranking told
 * in order: the title at frame 0, the 2024 bar never shorter than 2015 once shown, the rows in their 2015 order until the
 * subject and in the order of gain after it, one row moving past others at a time, every slot held by exactly one row
 * between steps, the one that moved furthest the only row kept, under the half line.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(BulletFrame, { ...props, at: frame }));
  const last = (event: string) => endOf(props.timing[event]) - 1;
  const orderAt = (frame: number) => {
    const s = sceneAt(props, frame);
    return props.rows.map((r: any, i: number) => ({ key: r.key, slot: s.rows[i].slot })).sort((a: any, b: any) => a.slot - b.slot).map((r: any) => r.key);
  };

  describe(`${id}'s bullet video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should carry a measured width for every gain at every frame", () => {
      const unmeasured = [];
      for (let f = 0; f < props.timing.total; f += 2) if (/<text\b(?![^>]*data-width="\d)[^>]*>/.test(markupAt(f))) unmeasured.push(f);
      expect(unmeasured).toEqual([]);
    });

    it("should hold the 2015 order through the reveal and the order of gain after the subject", () => {
      expect(sceneAt(props, 0).title).toBe(1);
      expect(orderAt(last("reveal"))).toEqual(props.steps[0]);
      expect(orderAt(props.timing.total - 1)).toEqual(props.steps.at(-1));
      expect(orderAt(props.timing.total - 1)[0]).toBe(props.moved);
    });

    it("should never draw a 2024 bar shorter than its 2015 bar once it shows", () => {
      for (let f = 0; f < props.timing.total; f += 3) {
        const s = sceneAt(props, f);
        props.rows.forEach((r: any, i: number) => {
          if (s.rows[i].thin > 0) expect([f, r.key, s.rows[i].thin >= r.before - 1e-9]).toEqual([f, r.key, true]);
        });
      }
    });

    it("should move one row past others at a time, and draw it over them", () => {
      const { start, duration } = props.timing.subject;
      for (let f = start; f < start + duration; f += 2) {
        const s = sceneAt(props, f);
        const climbing = s.rows.filter((r: any) => r.climbing).length;
        expect([f, climbing <= 1]).toEqual([f, true]);
        const svg = markupAt(f);
        if (climbing) {
          const key = props.rows[s.rows.findIndex((r: any) => r.climbing)].name.text;
          expect(svg.lastIndexOf(`>${key}</text>`)).toBeGreaterThan(Math.max(...props.rows.filter((r: any) => r.name.text !== key).map((r: any) => svg.lastIndexOf(`>${r.name.text}</text>`))));
        }
      }
    });

    it("should keep only the one that moved furthest at the end, and it alone under the half line", () => {
      expect(sceneAt(props, last("subject")).rows.every((r: any) => r.stepBack === 0)).toBe(true);
      const end = sceneAt(props, props.timing.total - 1);
      expect(props.rows.filter((r: any, i: number) => end.rows[i].stepBack === 0).map((r: any) => r.key)).toEqual([props.moved]);
      expect(props.rows.filter((r: any) => r.after < 50).map((r: any) => r.key)).toEqual([props.moved]);
    });
  });
}
