import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertTypeFloor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { Cold2CoalShareEuropeFrame } from "./Cold2CoalShareEuropeFrame.tsx";
import { buildDirection, directionsFor, loadBeat, MEASURED, parseDirectionArgs, SCAFFOLD_MARK, SIZE } from "./build.mjs";
import { mapStateAt, sceneAt } from "./scene.mjs";
import { touches } from "../../skills/map-beat/scripts/video-placement.mjs";
import { assertClaim } from "./subject.mjs";

/**
 * What every directed map video owes, at the direction the runner renders by default — ONE, the composer's best
 * candidate for the newsroom — on the map `measure.mjs` measured (offline): no word under the type floor and every word
 * with its measured width at the last frame of every event, the title card at frame 0, the credit on one line on the
 * open sea at the end. The argument told in order is this beat's own test, below.
 */

const beat = loadBeat();
const { directions } = directionsFor(beat);
const measured = existsSync(MEASURED);

describe("the directions video-cold2-coal-share-europe renders", () => {
  it("should render exactly one composed direction by default, the demo set only on --filed", () => {
    expect(directions.length).toBe(1);
    expect(parseDirectionArgs([])).toMatchObject({ candidates: 1, filed: false });
    expect(parseDirectionArgs(["--filed"]).filed).toBe(true);
  });

  it("should have measured the live map — run measure.mjs with the worktree's .env loaded (SCAFFOLD until measured)", () => {
    expect(measured).toBe(true);
  });
});

for (const entry of measured ? directions : []) {
  const { props } = buildDirection(entry, beat);
  const T = props.timing as any;
  const P = props as any;
  const markupAt = (frame: number) => renderToStaticMarkup(createElement(Cold2CoalShareEuropeFrame, { ...P, at: frame, liveMap: () => null }));
  const last = (event: string) => endOf(T[event]) - 1;

  describe(`video-cold2-coal-share-europe in ${entry.label}`, () => {
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

    it("should end on the map with the credit on one line", () => {
      expect([sceneAt(P, T.total - 1).title, sceneAt(P, T.total - 1).source, props.credit.lines.length]).toEqual([0, 1, 1]);
    });

    it("should tell BRIEF.md's argument in order: 2010 classes, 2024 on the whole map, rewound on the close-up, 2024 at the end", () => {
      const pl = beat.subject.countries.find((c: any) => c.code === "POL")!;
      const endReveal = mapStateAt(P, last("reveal")) as any;
      const rewound = mapStateAt(P, T.subject.start + Math.round(0.3 * T.subject.duration)) as any;
      expect([sceneAt(P, last("reference")).year, endReveal.k_PL, rewound.k_PL, sceneAt(P, last("subject")).year]).toEqual([0, pl.classes.at(-1), pl.classes[0], 14]);
    });

    it("should count three above half in 2010 and one in 2024 in the key", () => {
      expect([P.legend.counters[1][0].text, P.legend.counters[1][14].text]).toEqual([beat.copy.counts[0], beat.copy.counts[14]]);
    });

    it("should keep every close-up name inside the stage and clear of the others", () => {
      const boxes = P.names.map((n: any) => n.box);
      const clash = boxes.flatMap((a: any, i: number) => boxes.slice(i + 1).filter((b: any) => touches(a, b)));
      expect([clash.length, boxes.every((b: any) => b.x >= 0 && b.y >= 0 && b.x + b.width <= 1920 && b.y + b.height <= 1080)]).toEqual([0, true]);
    });
  });
}

describe("video-cold2-coal-share-europe is written, not scaffolded", () => {
  it("should carry no SCAFFOLD placeholder in its copy", () => {
    expect(JSON.stringify(beat.copy)).not.toContain(SCAFFOLD_MARK);
  });

  it("should assert its claim from the frozen rows (subject.mjs, assertClaim — SCAFFOLD until written)", () => {
    expect(() => assertClaim(beat.subject)).not.toThrow();
  });
});
