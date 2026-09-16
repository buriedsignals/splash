import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { WorldPopulationFrame } from "./WorldPopulationFrame.tsx";
import { buildDirection, directionsFor, loadBeat, parseDirectionArgs, SCAFFOLD_MARK, SIZE } from "./build.mjs";
import { sceneAt } from "./scene.mjs";
import { assertClaim } from "./subject.mjs";

/**
 * What every directed video owes, at the direction the runner renders by default — ONE, the composer's best candidate
 * for the newsroom: no word under the type floor and every word with its measured width at the last frame of every
 * event, the title card at frame 0, the credit on one line at the end. The argument told in order is this beat's own
 * test, below.
 */

const beat = loadBeat();
const { directions } = directionsFor(beat);

describe("the directions video-cold2-world-population renders", () => {
  it("should render exactly one composed direction by default, the demo set only on --filed", () => {
    expect(directions.length).toBe(1);
    expect(parseDirectionArgs([])).toMatchObject({ candidates: 1, filed: false });
    expect(parseDirectionArgs(["--filed"]).filed).toBe(true);
  });
});

for (const entry of directions) {
  const { props } = buildDirection(entry, beat);
  const T = props.timing as any;
  const P = props as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(WorldPopulationFrame, { ...P, at: frame }));
  const last = (event: string) => endOf(T[event]) - 1;

  describe(`video-cold2-world-population in ${entry.label}`, () => {
    for (const event of EVENT_ORDER)
      it(`should draw no word under the floor at the end of ${event}, and every word with its measured width`, () => {
        const svg = markupAt(last(event));
        expect(() => assertTypeFloor(svg, SIZE)).not.toThrow();
        const texts = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1]);
        expect(texts.filter((attrs) => !/data-width="\d/.test(attrs))).toEqual([]);
      });

    it("should open on the title card at frame 0", () => {
      expect([sceneAt(P, 0).title, props.titleCard.title.length > 0]).toEqual([1, true]);
    });

    it("should end on the picture with the credit on one line", () => {
      expect([sceneAt(P, T.total - 1).title, sceneAt(P, T.total - 1).source, props.credit.lines.length]).toEqual([0, 1, 1]);
    });

    it("should fill to 2023 with the last level counted at the end of reveal", () => {
      const s = sceneAt(P, last("reveal"));
      expect([s.fill, s.year, s.surface.length > 0]).toEqual([1, 2023, true]);
    });

    it("should stack eight 1800 levels beside 2023, all arrived, at the end of subject", () => {
      const s = sceneAt(P, last("subject"));
      expect([s.blocks.length, s.blocks.every((b: { p: number }) => b.p === 1), s.count]).toEqual([8, true, 8]);
    });

    it("should keep the stack under the curve's end on the same scale", () => {
      const s = sceneAt(P, last("subject"));
      expect(Math.min(...s.blocks.map((b: { y: number }) => b.y))).toBeGreaterThan(P.points.at(-1).y);
    });

    it("should have no block arrived and the count at zero as subject opens", () => {
      expect(sceneAt(P, T.subject.start).count).toBe(0);
    });

    it("should end with the surface untinted, the counter gone and the 2022 crossing named", () => {
      const s = sceneAt(P, T.total - 1);
      expect([s.tint, s.counter, s.named, P.crossing.year]).toEqual([0, 0, 1, 2022]);
    });
  });
}

describe("video-cold2-world-population is written, not scaffolded", () => {
  it("should carry no SCAFFOLD placeholder in its copy", () => {
    expect(JSON.stringify(beat.copy)).not.toContain(SCAFFOLD_MARK);
  });

  it("should assert its claim from the frozen rows (subject.mjs, assertClaim — SCAFFOLD until written)", () => {
    expect(() => assertClaim(beat.subject)).not.toThrow();
  });
});
