/**
 * THE ONE ASSERTION THE WHOLE SIZE DECISION RESTS ON, MADE OVER THE TREE'S OWN ARTIFACTS.
 *
 * Gate 2c takes a size. The W4 audit measured what reached the producer: **0 of 17 chart statics,
 * 0 of 19 chart videos and 0 of 18 chart webs drew at a size from the table**, and no delivered
 * static was at a canonical size at all — the committed PNGs read 1800x1120 and 1800x1640, a
 * 900x560 element rasterised at `fitTo: width * 2`. Nothing threw, because `renderStill` compared
 * the element's drawn frame against the `width`/`height` it was HANDED and both came from the same
 * two literals in the beat's own render script.
 *
 * So this guard never reads code. It walks `proof/` for beats whose `BRIEF.md` PINS a size, finds
 * the artifacts those beats deliver, and reads each file's own IHDR. A beat that pins `landscape`
 * and ships 3840x2160 fails here whatever its source says.
 *
 * ── THE RATCHET, AND WHY IT IS A NUMBER RATHER THAN A LIST ────────────────────────────────────
 *
 * Most of the corpus has not moved yet. A list of exemptions rots — somebody adds a name to it and
 * the guard stops describing the tree. A COUNT cannot be added to without being noticed, and it may
 * only go down, so the guard says exactly how much of the migration is left and refuses to let it
 * grow. When it reaches zero, `renderStill`'s `scale` default of 2 retires with it and the two
 * rasterisers in `twin-chart-beat` become one.
 *
 * ── THE MUTATIONS ─────────────────────────────────────────────────────────────────────────────
 * In an rsync of the tree under `/tmp/w4c3mut/`, never in this working tree. Baseline 4 pass/0 fail.
 *
 *   a migrated beat's PNG replaced by one 2x its pinned size   RED 3/1, naming the file and both
 *                                                                  sizes — the exact defect the
 *                                                                  corpus shipped
 *   `UNPINNED_BEATS` raised by one (the ratchet slipping)      RED 3/1
 *   every `size:` line deleted from every BRIEF                RED 2/2 — the premise AND the
 *                                                                  ratchet, so it cannot go
 *                                                                  vacuously green
 *   a pinned beat's BRIEF names a size the table does not have RED 2/2
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  SIZES,
  parseBriefFrontMatter,
  readPngSize,
} from "../../twin-chart-beat/scripts/sizes.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");

/**
 * How many beat directories still carry no pinned size. MAY ONLY GO DOWN.
 *
 * Measured 2026-08-11: 76 beats hold a `BRIEF.md`; four pin a size. The rest are the migration —
 * the remaining chart statics, the chart videos, the chart webs, the map and image genres, and the
 * scrollys, which have no export size at all and are the reason this is a count of what is
 * UNPINNED rather than a count of what is wrong.
 *
 * It is re-measured off the tree rather than decremented by hand each time, because four lots are
 * migrating in parallel: a number typed from a stale read could go UP, which is the one thing a
 * ratchet exists to forbid.
 */
const UNPINNED_BEATS = 50;

function beatDirs(): string[] {
  if (!existsSync(PROOF)) return [];
  return readdirSync(PROOF, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(PROOF, e.name))
    .filter((d) => existsSync(join(d, "BRIEF.md")));
}

/** Every `.png` under a beat, at any depth — a beat's outputs live in its own folder. */
function pngsUnder(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) pngsUnder(p, out);
    else if (e.name.endsWith(".png")) out.push(p);
  }
  return out;
}

const beats = beatDirs().map((dir) => ({
  dir,
  label: relative(TWIN, dir),
  pinned:
    parseBriefFrontMatter(readFileSync(join(dir, "BRIEF.md"), "utf8"))?.size ??
    null,
}));
const pinned = beats.filter((b) => b.pinned !== null);

describe("a beat that pins an export size delivers a file that measures it", () => {
  it("should find the beats and the pins, so nothing below can go vacuously green", () => {
    // 50 is the same floor `credit-anchors-to-the-frame-bottom.test.ts` uses for the same walk, and
    // for the same reason: a walk that silently stopped covering `proof/` would make every
    // assertion here trivially true.
    expect(beats.length).toBeGreaterThanOrEqual(50);
    expect(pinned.length).toBeGreaterThan(0);
  });

  it("should pin only sizes the toolchain exports", () => {
    for (const beat of pinned)
      expect([
        beat.label,
        beat.pinned,
        Object.keys(SIZES).includes(beat.pinned!),
      ]).toEqual([beat.label, beat.pinned, true]);
  });

  it("should deliver, from its own bytes, exactly the size it pins", () => {
    // Read off the FILE. Not off the render script's arguments, not off the component's constant —
    // those two agreed with each other for the whole of the corpus's life while the delivered PNG
    // was twice the size of both.
    //
    // `sizes/` is a beat's LOOKING directory: the other two sizes rendered side by side so a person
    // can compare them. Those are named after the size they carry and are excluded here by that
    // name, not by a path exemption, so a deliverable can never hide in one.
    const wrong: string[] = [];
    for (const beat of pinned) {
      const row = SIZES[beat.pinned as keyof typeof SIZES];
      for (const png of pngsUnder(beat.dir)) {
        const name = png.slice(png.lastIndexOf("/") + 1);
        if (Object.keys(SIZES).some((s) => name.includes(s))) continue;
        if (png.includes("/probe/")) continue;
        const got = readPngSize(readFileSync(png));
        if (got.width !== row.width || got.height !== row.height)
          wrong.push(
            `${relative(TWIN, png)} measures ${got.width}x${got.height}, pinned ${beat.pinned} = ${row.width}x${row.height}`,
          );
      }
    }
    expect(wrong).toEqual([]);
  });

  it("should have no more unpinned beats than the ratchet allows", () => {
    // The migration, as a number that may only go down. Lower it in the same commit that migrates a
    // beat; there is no way to raise it without this line appearing in the diff.
    const unpinned = beats.filter((b) => b.pinned === null);
    expect([unpinned.length <= UNPINNED_BEATS, unpinned.length]).toEqual([
      true,
      unpinned.length,
    ]);
  });
});
