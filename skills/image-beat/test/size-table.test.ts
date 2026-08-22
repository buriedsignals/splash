/**
 * ROUND-FIVE W3, ROUND-SIX TIER 1 — the size gate 2c pinned reached nothing in this format.
 *
 * `SIZED_FORMATS` says a static takes a size, so an image beat can be pinned `landscape`, `square`
 * or `portrait`. Until this table landed, this skill held no row for any of them, and
 * `stories/stress-w-quay-photographs` says so in its own maintainer notes: "This beat had to vendor
 * chart-beat/scripts/sizes.mjs into its own directory to learn that landscape is 1920x1080."
 * Vendoring another format's table into a story is the defect, not the workaround.
 *
 * THE MEASUREMENT THAT DECIDED THE SHAPE OF THE FIX. The alternative was to withdraw the size from
 * gate 2c for this medium. It was refused because the tree refutes it: `stress-w` is an image beat
 * that pins `landscape` and DELIVERS 1920x1080, asserted below off the file's own bytes.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT: that the seed honours a stage band. `stress-w`'s own probe
 * measured three letterboxed photographs at portrait and the band refused them — correctly, and at
 * render time. A refusal a beat meets while drawing is `assertWithinStage`'s job, not the gate's.
 *
 * THE MUTATIONS THAT REDDEN IT — run in this working tree, reverted immediately:
 *
 *   delete skills/image-beat/scripts/sizes.mjs         RED — every test here, on the import
 *   SIZES.landscape.width 1920 -> 1922                 RED — "measures 1920x1080, but the pinned
 *                                                            size "landscape" is 1922x1080"
 *   assertDeliveredSize stops comparing height         RED — the wrong-row assertion
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EXPORT_SIZE_NAMES,
  SIZES,
  assertDeliveredSize,
  parseBriefFrontMatter,
  readPngSize,
  sizeFor,
} from "../scripts/sizes.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const STORY = join(TWIN, "stories", "stress-w-quay-photographs");
const BRIEF = join(STORY, "beats", "1-quay-sequence", "BRIEF.md");
const DELIVERED = join(STORY, "export", "1-quay-sequence", "still.png");

const pinned = parseBriefFrontMatter(readFileSync(BRIEF, "utf8"))?.size ?? null;

describe("an image beat draws at the size gate 2c pinned", () => {
  it("should carry the three rows ruling R2 names, in this skill's own directory", () => {
    expect(Object.keys(SIZES).sort()).toEqual(["landscape", "portrait", "square"]);
    expect(EXPORT_SIZE_NAMES).toEqual(["landscape", "square", "portrait"]);
  });

  it("should read a real image beat's pin, and know the size it names", () => {
    expect(pinned).toBe("landscape");
    expect(sizeFor(pinned!)).toEqual(SIZES.landscape);
  });

  it("should accept the frame that beat actually delivered, read off its own bytes", () => {
    const measured = readPngSize(readFileSync(DELIVERED));
    expect(measured).toEqual({ width: 1920, height: 1080 });
    expect(assertDeliveredSize(measured, pinned!)).toEqual(sizeFor(pinned!));
  });

  it("should refuse that same frame against either other row, naming both sizes", () => {
    const measured = readPngSize(readFileSync(DELIVERED));
    for (const other of ["square", "portrait"]) {
      let message = "";
      try {
        assertDeliveredSize(measured, other);
      } catch (error) {
        message = (error as Error).message;
      }
      expect([other, message.includes("1920x1080")]).toEqual([other, true]);
      expect([
        other,
        message.includes(`${SIZES[other].width}x${SIZES[other].height}`),
      ]).toEqual([other, true]);
    }
  });
  it("should refuse a frame that carries the right width and the wrong height", () => {
    // The narrowest mutation this decision has: `assertDeliveredSize` comparing width alone. It
    // survives every row-name assertion above whenever the two rows differ in width as well, which
    // is why the failing case is stated here directly, in the pinned row's own width.
    const row = sizeFor(pinned!);
    let message = "";
    try {
      assertDeliveredSize({ width: row.width, height: row.height + 2 }, pinned!);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain(`${row.width}x${row.height + 2}`);
    expect(message).toContain(`${row.width}x${row.height}`);
  });
});
