import { describe, expect, it } from "bun:test";
import { EVENT_ORDER, checkTiming, endOf } from "../assets/timing-contract";
import { MAP_TIMING } from "../assets/timing";
import { arrivalProgress } from "../assets/Co2MapVideo";

/**
 * The structural half of the motion grammar, for a map beat. The drawing itself is verified by
 * looking at four extracted frames — that is the discipline of the video format — and what a test
 * can carry is the arithmetic: the conclusion cannot precede its evidence, the subject is not the
 * tail of the reveal, and the video does not end on a transition.
 *
 * The rules themselves (`checkTiming` red on a timing mutated to break each one) are proven once,
 * by their owner `chart-video/test/timing.test.ts`; `../assets/timing-contract.ts` is carried from
 * that file byte for byte, so this asserts only that THIS beat's edit passes them.
 */

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

describe("arrivalProgress — the reveal's own order", () => {
  const count = 10;

  it("should hand the first region its window before the last one", () => {
    expect(arrivalProgress(0, count, 0.5)).toBeGreaterThan(
      arrivalProgress(9, count, 0.5),
    );
  });

  it("should show nothing at all before the reveal starts", () => {
    for (let i = 0; i < count; i++)
      expect(arrivalProgress(i, count, 0)).toBe(0);
  });

  it("should have every region fully arrived by the end of the reveal", () => {
    for (let i = 0; i < count; i++)
      expect(arrivalProgress(i, count, 1)).toBe(1);
  });

  it("should never run outside 0..1, so nothing keeps fading during the hold", () => {
    for (const p of [-1, 0.3, 0.77, 2])
      for (let i = 0; i < count; i++) {
        expect(arrivalProgress(i, count, p)).toBeGreaterThanOrEqual(0);
        expect(arrivalProgress(i, count, p)).toBeLessThanOrEqual(1);
      }
  });
});
