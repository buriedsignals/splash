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
 * One beat of the corpus has not moved yet. A list of exemptions rots — somebody adds a name to it
 * and the guard stops describing the tree. A COUNT cannot be added to without being noticed, and it
 * may only go down, so the guard says exactly how much of the migration is left and refuses to let
 * it grow. When it reaches zero, `renderStill`'s `scale` default of 2 retires with it and the two
 * rasterisers in `chart-beat` become one. What that count is OVER is the question the corpus
 * reorganisation reopened — see `UNPINNED_BEATS`.
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
 *
 * Re-run 2026-09-17, in this tree and reverted each time, after the population was derived rather
 * than counted over every beat directory. Baseline 5 pass/0 fail.
 *
 *   a pinned beat's own `renders/creme.png` overwritten with   RED 4/1, naming the file, its
 *   its 2000x1520 plate                                            2000x1520 and its landscape pin
 *   the `size:` line deleted from one static BRIEF             RED 4/1 — two raster-delivering
 *                                                                  beats unpinned against a
 *                                                                  ratchet of one, both named
 *   `isBakedPlate` widened to match every path                 RED 4/1 on the population floor —
 *                                                                  the measurement went vacuously
 *                                                                  green and the floor is what
 *                                                                  caught it
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  SIZES,
  parseBriefFrontMatter,
  readPngSize,
} from "../../chart-beat/scripts/sizes.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");

/**
 * How many beats that DELIVER A FIXED-SIZE RASTER still carry no pinned size. MAY ONLY GO DOWN.
 *
 * WHAT THE POPULATION IS, AND WHY IT IS NO LONGER "every beat directory". Measured 2026-08-11 the
 * count was 43 of 76 beats, and by 2026-09-17 the same walk read 81 of 160 — a ratchet apparently
 * blown wide open. It was not: the corpus changed composition underneath it. Of those 81, **80
 * deliver no raster at all** — they are the 40 `web-*` and 40 `scrolly-*` beats, whose only
 * delivered artifacts are three fluid HTML pages each (`find <beat> -name '*.png' -o -name '*.mp4'`
 * → 0 on every one of the eighty). An export size is a claim about exported pixels, and those
 * beats export none: the web frame is fluid by doctrine (`web-frame-is-fluid.test.ts`) and a
 * scrolly fills the reader's window. Counting them as migration debt measures nothing and hides the
 * one beat that IS debt.
 *
 * So the population is now DERIVED from what a beat actually delivers — it owes a pin iff it ships
 * a raster whose pixel size is fixed at export — and the count is the honest remainder:
 *
 *   `proof/co2-suisse` — `format: static`, and its four PNGs measure 1800x1120, which is
 *   literally the defect this file's header opens with (a 900x560 element rasterised at
 *   `fitTo: width * 2`). It is the last unmigrated beat of the W4 audit. Recorded, with what it
 *   owes, in `docs/splash/2026-09-17-export-sizes-owed.md`; it leaves this count by being
 *   re-rendered at a size from the table and pinning it, never by this number moving.
 *
 * The number is still a count rather than a list, for the reason the original said: a list of
 * exempt names rots, a count cannot grow without this line appearing in the diff. And because the
 * population is derived, a `web-*` or `scrolly-*` beat that starts shipping a poster PNG walks
 * straight into it and must pin.
 */
const UNPINNED_BEATS = 1;

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

/** Every `.mp4` under a beat — the video export is a raster with a fixed frame too. */
function mp4sUnder(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) mp4sUnder(p, out);
    else if (e.name.endsWith(".mp4")) out.push(p);
  }
  return out;
}

/**
 * THE BAKED BASEMAP IS NOT A DELIVERABLE, and this is the only path shape excused here.
 *
 * A map beat's `plate/<direction>/plate.png` is what `map-beat/scripts/bake-plate.mjs` screenshots
 * at its own `--size`/`--height` — an INPUT the beat's component then draws into its frame, never
 * a file a reader opens. Twelve beats bake one, and the twenty that landed under a pinned beat
 * read 2000x1520 and smaller against a `landscape` pin, all while the beat's own three
 * `renders/*.png` measured exactly 1920x1080. Excused by its exact shape — the bake's own
 * directory AND the bake's own filename — so a deliverable cannot hide behind it: the only file
 * this skips is the one the baker writes.
 */
const isBakedPlate = (png: string, beatDir: string) =>
  /^plate\/[^/]+\/plate\.png$/.test(relative(beatDir, png));

/**
 * The PNGs a beat actually delivers: everything under it that is not one of the three things that
 * are not deliverables — the looking sizes, a probe, and the baked basemap. One list, read by both
 * the measurement below and the ratchet's own population, so the two can never disagree about what
 * a delivered file is.
 *
 * `sizes/` is a beat's LOOKING directory: the other two sizes rendered side by side so a person can
 * compare them. Those are named after the size they carry and are excluded by that name, not by a
 * path exemption, so a deliverable can never hide in one.
 */
function deliveredPngs(dir: string): string[] {
  return pngsUnder(dir).filter((png) => {
    const name = png.slice(png.lastIndexOf("/") + 1);
    if (Object.keys(SIZES).some((s) => name.includes(s))) return false;
    if (png.includes("/probe/")) return false;
    return !isBakedPlate(png, dir);
  });
}

const beats = beatDirs().map((dir) => ({
  dir,
  label: relative(TWIN, dir),
  pinned:
    parseBriefFrontMatter(readFileSync(join(dir, "BRIEF.md"), "utf8"))?.size ??
    null,
  /** Does this beat ship anything whose pixel size is fixed at export? See `UNPINNED_BEATS`. */
  deliversRaster: deliveredPngs(dir).length > 0 || mp4sUnder(dir).length > 0,
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
    // was twice the size of both. What counts as delivered is `deliveredPngs`' own question.
    const wrong: string[] = [];
    for (const beat of pinned) {
      const row = SIZES[beat.pinned as keyof typeof SIZES];
      for (const png of deliveredPngs(beat.dir)) {
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
    // beat; there is no way to raise it without this line appearing in the diff. The population is
    // the beats that DELIVER a fixed-size raster — see `UNPINNED_BEATS` for why the eighty that
    // deliver only fluid HTML are not debt.
    const unpinned = beats.filter((b) => b.pinned === null && b.deliversRaster);
    expect([
      unpinned.length <= UNPINNED_BEATS,
      unpinned.map((b) => b.label),
    ]).toEqual([true, unpinned.map((b) => b.label)]);
  });

  it("should keep the ratchet's own population from emptying out", () => {
    // A ratchet reads zero both when the migration is finished and when the walk stopped finding
    // anything. 70 is a floor the raster-delivering half of a 160-beat corpus (80 today) clears.
    expect(beats.filter((b) => b.deliversRaster).length).toBeGreaterThan(70);
  });
});
