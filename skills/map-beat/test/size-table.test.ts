/**
 * ROUND-FIVE T3, ROUND-SIX TIER 1 — the size gate 2c pinned reached nothing in this format.
 *
 * `EXPORT_SIZES` is chosen at gate 2c and `SIZED_FORMATS` says a static and a video both take one,
 * so a map beat can be pinned `landscape`, `square` or `portrait`. Until this table landed, this
 * skill held no row for any of them: `stories/stress-t-europe-recycling` pinned `portrait` and
 * reached a size only by carrying `#shared/chart-video/sizes.mjs` — another format's table — by
 * hand, which is the defect, not the workaround.
 *
 * THE MEASUREMENT THAT DECIDED THE SHAPE OF THE FIX. The alternative on the table was to withdraw
 * the size from the gate for this medium, the way `treatmentFormatGap` withdraws one treatment from
 * one format. It was refused because the tree refutes it: `stress-t` is a map beat that pins
 * `portrait` and DELIVERS 1080x1920, asserted below off the file's own bytes. A gate row saying
 * "map cannot do portrait" would have been false against a beat already on disk.
 *
 * THE MUTATIONS THAT REDDEN IT — run in this working tree, reverted immediately:
 *
 *   delete skills/map-beat/scripts/sizes.mjs            RED — every test here, on the import
 *   SIZES.portrait.height 1920 -> 1922                  RED — "measures 1080x1920, but the pinned
 *                                                             size "portrait" is 1080x1922"
 *   assertDeliveredSize stops comparing height          RED — the wrong-row assertion
 *
 * REAL MATERIAL, NOT A FIXTURE: the beat and the delivered frame below are the ones this defect was
 * reported on. A fixture built to fail would prove the assertion runs; this proves it reaches.
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
const STORY = join(TWIN, "stories", "stress-t-europe-recycling");
const BRIEF = join(STORY, "beats", "europe-recycling-map", "BRIEF.md");
const DELIVERED = join(
  STORY,
  "export",
  "europe-recycling-map",
  "europe-recycling-final-frame.png",
);

const pinned = parseBriefFrontMatter(readFileSync(BRIEF, "utf8"))?.size ?? null;

describe("a map beat draws at the size gate 2c pinned", () => {
  it("should carry the three rows ruling R2 names, in this skill's own directory", () => {
    // The premise. Without it every assertion below can go vacuously green on an empty table, and
    // the whole point of this file is that this skill used to have no table at all.
    expect(Object.keys(SIZES).sort()).toEqual(["landscape", "portrait", "square"]);
    expect(EXPORT_SIZE_NAMES).toEqual(["landscape", "square", "portrait"]);
  });

  it("should read a real map beat's pin, and know the size it names", () => {
    expect(pinned).toBe("portrait");
    expect(sizeFor(pinned!)).toEqual(SIZES.portrait);
  });

  it("should accept the frame that beat actually delivered, read off its own bytes", () => {
    // Not off the render script's arguments and not off the component's constant — those two agreed
    // with each other for the whole of W4 while the delivered PNG was twice the size of both.
    const measured = readPngSize(readFileSync(DELIVERED));
    expect(measured).toEqual({ width: 1080, height: 1920 });
    expect(assertDeliveredSize(measured, pinned!)).toEqual(sizeFor(pinned!));
  });

  it("should refuse that same frame against either other row, naming both sizes", () => {
    const measured = readPngSize(readFileSync(DELIVERED));
    for (const other of ["landscape", "square"]) {
      let message = "";
      try {
        assertDeliveredSize(measured, other);
      } catch (error) {
        message = (error as Error).message;
      }
      expect([other, message.includes("1080x1920")]).toEqual([other, true]);
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
