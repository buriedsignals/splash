import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { sceneAt, WINDOWS } from "./scene.mjs";
import { StreamFrame } from "./StreamFrame.tsx";

/**
 * The markup at the last frame of every event — the type floor, every word with its measured width — and the argument
 * told in order: the title at frame 0, the whole stream at the end of reveal; the two giants set aside while the small
 * sources close in on one scale and are magnified; the small stream turned into lines from zero, solar crossing oil in
 * 2016; a cursor racing the years with solar's rank; the whole stream back at the end, 2016 marked, the credit on one line.
 */

const beat = loadBeat();
const GIANTS = ["Hydropower", "Nuclear"];
const thick = ([y0, y1]: number[]) => y0 - y1;

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const T = props.timing as any;
  const markupAt = (frame: number) =>
    renderToStaticMarkup(
      createElement(StreamFrame, { ...(props as any), at: frame }),
    );
  const last = (event: string) => endOf(T[event]) - 1;
  const inSubject = (t: number) =>
    Math.round(T.subject.start + T.subject.duration * t);
  const small = props.keys.filter((k: string) => !GIANTS.includes(k));
  const index = (year: number) =>
    props.years.findIndex((y: any) => y.year === year);
  const value = (key: string, year: number) =>
    beat.subject.readings[index(year)][key];
  const raceFrame = (year: number) => {
    const [a, b] = WINDOWS.subject.race;
    return Math.ceil(
      T.subject.start +
        T.subject.duration * (a + ((year - 2000) / 24) * (b - a)),
    );
  };

  describe(`${id}'s streamgraph video`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under 30 px at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, "landscape")).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual(
          [],
        );
      });

    it("should open on the title, and flow the whole stream by the end of reveal", () => {
      expect(sceneAt(props as any, 0).title).toBe(1);
      const reveal = sceneAt(props as any, last("reveal"));
      expect(reveal.flow).toBe(1);
      expect(reveal.bands).toEqual(props.geometry.stream);
    });

    it("should close the small sources in on the stream's own scale before magnifying them", () => {
      for (const key of small)
        props.geometry.stream[key].forEach((band: number[], i: number) =>
          expect(thick(props.geometry.aside[key][i])).toBeCloseTo(
            thick(band),
            0,
          ),
        );
      for (const key of GIANTS)
        for (const band of props.geometry.aside[key])
          expect(thick(band)).toBe(0);
    });

    it("should magnify the small sources about seven times, the giants gone", () => {
      const s = sceneAt(props as any, inSubject(WINDOWS.subject.magnify[1]));
      expect(props.magnify).toBeGreaterThan(5);
      for (const key of small)
        props.geometry.stream[key].forEach((band: number[], i: number) =>
          expect(thick(s.bands[key][i])).toBeCloseTo(
            thick(band) * props.magnify,
            -0.5,
          ),
        );
      for (const key of GIANTS) expect(s.opacity[key]).toBe(0);
    });

    it("should turn the small stream into lines from zero, solar under oil in 2015 and over it in 2016", () => {
      const s = sceneAt(props as any, inSubject(WINDOWS.subject.lines[1]));
      for (const key of small)
        s.bands[key].forEach(([y0, y1]: number[], i: number) => {
          expect(y0).toBeCloseTo(props.baseline, 0);
          expect(y0 - y1).toBeCloseTo(
            beat.subject.readings[i][key] * props.lineScale,
            -0.5,
          );
        });
      expect(value("Solar", 2015)).toBeLessThan(value("Oil", 2015));
      expect(s.bands.Solar[index(2015)][1]).toBeGreaterThan(
        s.bands.Oil[index(2015)][1],
      );
      expect(s.bands.Solar[index(2016)][1]).toBeLessThan(
        s.bands.Oil[index(2016)][1],
      );
    });

    it("should show a giant's name only on its band nearly whole", () => {
      for (let frame = T.subject.start; frame < T.total; frame += 3) {
        const s = sceneAt(props as any, frame);
        for (const n of props.bandNames) if (s.names[n.key] > 0) expect(s.opacity[n.key]).toBeGreaterThanOrEqual(0.75);
      }
    });

    it("should race a cursor through the years with solar's rank — 7e in 2010, 3e from 2016 — and mark 2016 once passed", () => {
      expect(sceneAt(props as any, raceFrame(2010)).rank).toBe(7);
      expect(sceneAt(props as any, raceFrame(2015) - 2).mark).toBe(0);
      expect(sceneAt(props as any, raceFrame(2016) + 1).rank).toBe(3);
      expect(sceneAt(props as any, raceFrame(2017)).mark).toBe(1);
    });

    it("should end on the whole stream, 2016 marked, solar's rank at 2024 inside the frame, the credit on one line", () => {
      const end = sceneAt(props as any, T.total - 1);
      expect([
        end.flow,
        end.aside,
        end.magnify,
        end.lines,
        end.mark,
        end.rank,
        end.source,
      ]).toEqual([1, 0, 0, 0, 1, 3, 1]);
      expect(end.bands).toEqual(props.geometry.stream);
      for (const key of GIANTS) expect(end.opacity[key]).toBe(1);
      expect(end.cursor.year).toBe(2024);
      expect(end.anchor.y).toBeCloseTo(
        (props.geometry.stream.Solar.at(-1)[0] +
          props.geometry.stream.Solar.at(-1)[1]) /
          2,
        0,
      );
      expect(
        end.anchor.x + props.rankOffset + props.rankTexts["3"].width * 1.02,
      ).toBeLessThanOrEqual(props.frame.width - props.layoutInset.x + 1);
      expect(props.credit.lines.length).toBe(1);
      for (const n of props.bandNames)
        expect([
          n.key,
          n.x + n.width < props.mark.x || n.x > props.mark.x,
        ]).toEqual([n.key, true]);
    });
  });
}
