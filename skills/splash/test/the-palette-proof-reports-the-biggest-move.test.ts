/**
 * THE ROW'S IMAGE IS THE BIGGEST MOVE, NOT THE BIGGEST FRACTION.
 *
 * `two-palette-proof.mjs` reads its verdict off an ABSOLUTE pixel count — 200 px, chosen after a
 * frame-relative denominator hid a dumbbell whose twenty endpoints had all changed colour, and an
 * ink-relative one hid seven maps inside their own frozen basemap. But when a beat wrote several
 * comparable images the script picked WHICH image to report by the highest FRACTION, and then
 * compared that image's `moved` against the floor. Two different questions, one row.
 *
 * Latent while every beat wrote a single image. Not latent any more: photographing a scrolly at
 * each of its readings is exactly what makes several images per beat ordinary, and a four-step
 * scrolly is four chances for a small image to win the row.
 *
 * THE FIXTURE, and it is the ledger's own scenario built out of real pixels rather than a stub —
 * these two pairs go through the script's own `movedFraction`, so the defect is exposed through the
 * path the script actually walks:
 *
 *   a tiny reading   90 px of ink, ALL of it changed   -> moved     90, fraction 1.00
 *   a wide reading  160,000 px of ink, 40,000 changed  -> moved 40,000, fraction 0.25
 *
 * Picked by fraction, the beat reports 90 px and reads STILL — a beat whose whole data channel moved
 * on another reading, certified as never having taken the recorded colour. Picked by the move, it
 * reports 40,000 px and reads moved.
 *
 * THE MUTATION, run in a copy under /tmp and never in this tree: put the defect back —
 *
 *   rm -rf /tmp/mut-best && mkdir -p /tmp/mut-best && git archive HEAD | tar -x -C /tmp/mut-best
 *   # in /tmp/mut-best/scripts/two-palette-proof.mjs, replace inside `pickBest`
 *   #   if (!best || one.moved > best.moved) best = one;
 *   # with
 *   #   if (!best || one.fraction > best.fraction) best = one;
 *   cd /tmp/mut-best && bun test skills/splash/test/the-palette-proof-reports-the-biggest-move.test.ts
 *
 * Measured 2026-08-10: green in this tree, and in the mutated copy 1 fail — "the row must report
 * the biggest move", 90 instead of 40000.
 */
import { describe, it, expect } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  movedFraction,
  pickBest,
} from "../../../scripts/two-palette-proof.mjs";

const GROUND = "#FFFFFF";

/** A square of ink on the beat's ground, written as SVG because the script's own decoder rasterises
 *  one — no PNG encoder is needed to make a picture that differs from another picture by a known
 *  number of pixels. */
function plate(
  path: string,
  size: number,
  blocks: { x: number; y: number; w: number; h: number; fill: string }[],
) {
  writeFileSync(
    path,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" fill="${GROUND}"/>` +
      blocks
        .map(
          (b) =>
            `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${b.fill}"/>`,
        )
        .join("") +
      `</svg>`,
  );
}

describe("the palette proof reports the biggest move among a beat's images", () => {
  it("should report the image whose ink moved most, not the image with the highest fraction", () => {
    const work = mkdtempSync(join(tmpdir(), "pick-best-"));
    try {
      // A tiny reading: 90 px of ink, every pixel of it a different colour between the two runs.
      plate(join(work, "tiny-a.svg"), 64, [
        { x: 0, y: 0, w: 10, h: 9, fill: "#0B7A75" },
      ]);
      plate(join(work, "tiny-b.svg"), 64, [
        { x: 0, y: 0, w: 10, h: 9, fill: "#B4451F" },
      ]);
      // A wide reading: 160,000 px of ink, 40,000 of them changed.
      plate(join(work, "wide-a.svg"), 600, [
        { x: 0, y: 0, w: 400, h: 400, fill: "#333333" },
        { x: 0, y: 0, w: 200, h: 200, fill: "#0B7A75" },
      ]);
      plate(join(work, "wide-b.svg"), 600, [
        { x: 0, y: 0, w: 400, h: 400, fill: "#333333" },
        { x: 0, y: 0, w: 200, h: 200, fill: "#B4451F" },
      ]);

      const tiny = {
        name: "tiny",
        ...movedFraction(
          join(work, "tiny-a.svg"),
          join(work, "tiny-b.svg"),
          GROUND,
        ),
      };
      const wide = {
        name: "wide",
        ...movedFraction(
          join(work, "wide-a.svg"),
          join(work, "wide-b.svg"),
          GROUND,
        ),
      };

      // The premise, pinned — a fixture that measured two equal images would pass either rule.
      expect(["tiny moved", tiny.moved]).toEqual(["tiny moved", 90]);
      expect(["wide moved", wide.moved]).toEqual(["wide moved", 40_000]);
      expect(tiny.fraction).toBeGreaterThan(wide.fraction);

      const best = pickBest([tiny, wide]);
      expect(["the row must report the biggest move", best?.moved]).toEqual([
        "the row must report the biggest move",
        40_000,
      ]);
      // And the consequence the row is read for: 200 px is the verdict floor, so picking by
      // fraction does not merely mislabel the image — it turns the beat's verdict to STILL.
      expect([
        "the verdict follows the biggest move",
        (best?.moved ?? 0) >= 200,
      ]).toEqual(["the verdict follows the biggest move", true]);
      expect([
        "picking by fraction would have read STILL",
        tiny.moved >= 200,
      ]).toEqual(["picking by fraction would have read STILL", false]);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
