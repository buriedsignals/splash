import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  type BeatTiming,
} from "../../chart-video/assets/timing";
import { MAP_TIMING } from "../assets/timing";
import { staggerLacksAnOrder } from "../scripts/detect-reveal-order.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The seed's own frozen regions — the population the reveal actually covers, read off disk rather
 *  than a count typed here. Every one of them is a 2023 reading, which is the whole point: one
 *  period, so no order exists across them. */
const REGIONS: { key: string }[] = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "assets", "sample-data", "regions.json"), "utf8"),
);
const SURVEY_PERIOD = "2023";

/**
 * The structural half of the motion grammar, for a map beat. The drawing itself is verified by
 * looking at four extracted frames — that is the discipline of the video format — and what a test
 * can carry is the arithmetic: the conclusion cannot precede its evidence, the subject is not the
 * tail of the reveal, and the video does not end on a transition.
 *
 * Every rule is asserted twice: green on the shipped timing, RED on a timing mutated to break
 * exactly that rule. A check that never fails is not a check.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...MAP_TIMING,
  ...patch,
});

describe("the shipped timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(MAP_TIMING)).toEqual([]);
  });

  it("should be eight seconds at thirty frames per second", () => {
    expect(MAP_TIMING.fps).toBe(30);
    expect(MAP_TIMING.total).toBe(240);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => MAP_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave the reader time to read the comparison before the data arrives", () => {
    // The pause IS the gap. Half a second at least, or the reader is still reading the level the
    // argument is measured against when the field starts filling in behind it.
    const pause = MAP_TIMING.reveal.start - endOf(MAP_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(MAP_TIMING.fps / 2);
  });
});

describe("checkTiming, on a timing mutated to break one rule", () => {
  it("should reject a conclusion that lands before its subject has finished", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: MAP_TIMING.subject.start, duration: 22 } }),
    );
    expect(errors.join(" ")).toContain("conclusion");
  });

  it("should reject a subject that is only the tail of the reveal", () => {
    const errors = checkTiming(
      broken({ subject: { start: MAP_TIMING.reveal.start + 4, duration: 20 } }),
    );
    expect(errors.join(" ")).toContain("subject");
  });

  it("should reject a video that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 202, duration: 10 } }));
    expect(errors.join(" ")).toContain("hold");
  });

  it("should reject a hold under the half-second floor", () => {
    const errors = checkTiming(
      broken({ total: 216, hold: { start: 202, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("half-second");
  });
});

describe("the reveal claims no order it cannot show", () => {
  // The seed used to export `arrivalProgress(index, count, reveal)` and hand each region its own
  // slice of the reveal window, sorted lowest value first. These regions were all measured in the
  // same year, so that order was the producer's and not the data's — `motion-grammar.md`, "the
  // order is chronological, or it is argumentative". The build now gives every value-bearing shape
  // ONE window, which is what these two assertions hold it to.
  const source = readFileSync(
    join(import.meta.dirname, "..", "assets", "Co2MapVideo.tsx"),
    "utf8",
  );

  it("should hand every mark one start rather than a rank", () => {
    expect(
      staggerLacksAnOrder(
        REGIONS.map((region) => ({
          key: region.key,
          start: MAP_TIMING.reveal.start,
          at: SURVEY_PERIOD,
        })),
      ).arbitrary,
    ).toBe(false);
  });

  it("should be refused the moment those same marks are staggered again", () => {
    const found = staggerLacksAnOrder(
      REGIONS.map((region, i) => ({
        key: region.key,
        start: MAP_TIMING.reveal.start + i,
        at: SURVEY_PERIOD,
      })),
    );
    expect(`${found.arbitrary}: ${found.why}`).toBe(
      `true: ${REGIONS.length} marks hold 1 position(s) between them, so the order across them is the producer's and not the data's`,
    );
  });

  it("should carry neither a per-region window nor the placeholder one needed", () => {
    expect([
      source.includes("arrivalProgress"),
      source.includes('id="pending"'),
    ]).toEqual([false, false]);
  });
});
