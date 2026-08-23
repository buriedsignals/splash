/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["everyPaintedWorldCarriesTheMarks"];

/**
 * A WORLD CAMERA FILLS ITS BOX BY REPEATING THE WORLD, AND THE MARKS REPEAT WITH IT — this
 * vehicle's own reading of the ruling `map-web` earned on 2026-08-23.
 *
 * The ruling is about the medium: a slippy map wraps, so a camera that already spans a full turn
 * fills a box wider than one world by painting the world again beside itself rather than by sitting
 * narrow in it. `map-web` answered it with a pointer census — every painted copy carries its own
 * hit targets, because the defect that ruling came with was ONE set of hit targets over three
 * painted worlds.
 *
 * THAT CENSUS DOES NOT TRANSPOSE HERE, and the number says why rather than a preference. This
 * vehicle draws no interactive marks at all: measured across every delivered scrolly beat, zero
 * marks on any of the four tracks carry `data-detail`, there is no hover reading, no Tab stop per
 * mark and no accessible table — which is exactly what `same-facts-without-the-picture` and
 * `reachable-by-keyboard` already record as this format's standing exceptions. A pointer census
 * carried here would report `{marks: 0}` on every page it ever ran on: a false confirmation, not a
 * check.
 *
 * What a reader of a scrolly gets from a copy is that they can SEE the beat's marks on it. So the
 * decision this format carries is the same rule measured on the channel this medium actually has:
 * a painted copy of the world must draw the marks the primary draws on the part of the world it
 * repeats. The defect it refuses is photographed in this tree — `proof/mapscrolly-quakes-three-
 * ways/drive/1600x900-worldcopies-bare.png`, Australia and New Zealand painted a second time in the
 * side band with not one of the beat's 14,057 dots on them, beside a paragraph counting every one.
 */

/**
 * HOW MANY COPIES OF THE WORLD SIT EACH SIDE OF THE PRIMARY to reach a span of `spanPx` given a
 * tile `tilePx` across. The copies are centred on the primary, so `n` copies each side reach
 * `(2n + 1) · tilePx`; odd by construction, because an even count would put a seam down the middle
 * of the picture.
 *
 * The same arithmetic `proof/mapscrolly-quakes-three-ways/live-scroll-map.mjs` runs as
 * `worldRepeats` for the LIVE substrate, where MapLibre paints the copies and the script only has
 * to follow them. That beat's own `live-map.test.ts` asserts the two agree over a range, so the
 * fallback and the live layer cannot start disagreeing about how many worlds are on screen.
 */
export function worldCopiesToCover(spanPx, tilePx) {
  if (!(tilePx > 0)) return 0;
  return Math.max(0, Math.ceil((spanPx / tilePx - 1) / 2));
}

/**
 * …AND HOW MANY A PAGE HAS TO SHIP, which is a different question, because the no-JavaScript
 * fallback cannot measure the reader's box: it is static markup, and the count is baked.
 *
 * The box width drops out. Under the contain fit this vehicle's map track uses
 * (`preserveAspectRatio="xMidYMid meet"`), a box wider than the plate is HEIGHT-bound, so one world
 * draws `boxHeight · worldWidthPx / frameHeight` across and the box is `boxAspect · boxHeight` —
 * the height cancels and the count depends only on the box's ASPECT. Which is why this can be
 * decided once, at render time, from a declared widest aspect rather than per reader.
 */
export function fallbackWorldCopies(widestBoxAspect, frameHeightPx, worldWidthPx) {
  return worldCopiesToCover(widestBoxAspect * frameHeightPx, worldWidthPx);
}

/** THE WIDEST BOX THIS VEHICLE HAS BEEN MEASURED IN, and a margin over it — the repository's own
 *  shape for a constant that must not be invented. `.scrolly-graphic` is the viewport minus the
 *  scaffold's own header and footer: measured 2026-08-23 on `proof/mapscrolly-quakes-three-ways`,
 *  1600x900 gives a 1600x816.5 box (1.960), 2990x1718 gives 2990x1649.5 (1.813), 1280x800 gives
 *  1280x701.5 (1.825), 768x1024 gives 768x910.5 (0.844) and 375x812 gives 375x583.5 (0.643). The
 *  margin doubles the widest of those, which reaches a 32:9 desktop (a 5120x1440 screen gives a
 *  3.74 box) with room over.
 *
 *  It buys ONE copy each side on the beat that has a world camera, and three tiles reach any box up
 *  to `3 · 836.5 / 520 = 4.83` — so the constant would have to be wrong by a factor of two and a
 *  half before a page banded again. */
export const MEASURED_WIDEST_BOX_ASPECT = 1.96;
export const MARGIN_BOX_ASPECT = 1.96;

/**
 * EVERY PAINTED COPY OF THE WORLD CARRIES THE BEAT'S OWN MARKS.
 *
 * `reading` is `{ boxWidthPx, tilePx, worlds }`; a world is
 * `{ index, role, offsetPx, visiblePx, owed, painted }`, `owed` and `painted` being arrays of the
 * marks' own keys. `index` is signed and 0 is the primary — the copy the picture is centred on,
 * and, on a page that has any, the only one in the accessibility tree.
 *
 * Three things can be wrong about a tiled world, and this asks all three:
 *
 * 1. **A copy paints the ground and not the marks** (`short`). Measured LIKE FOR LIKE: a copy is
 *    charged only for the marks the PRIMARY itself paints, because a mark nobody draws anywhere is
 *    a different defect with its own guard and must not be billed to the wrap.
 * 2. **A copy has drifted off the tile** (`adrift`). A repeat that does not sit a whole number of
 *    tiles from the primary is a second world painted in the wrong place — the marks are then on
 *    the wrong coast, which a settled screenshot reads as a perfectly good map.
 * 3. **The painted tiles never reach the box** (`uncoveredPx`). This is the ruling itself: a world
 *    camera that still leaves bare ground down the sides has not filled its box.
 *
 * A copy the box does not reach is PAINTED but not VISIBLE — a phone shows less than one world, so
 * both outer copies are entirely off screen. It is named rather than counted as a copy that passed,
 * because "every visible copy carries the marks" is a rule about what a reader can see and an empty
 * set would satisfy it silently.
 */
export function everyPaintedWorldCarriesTheMarks(reading) {
  const worlds = reading.worlds ?? [];
  const primary = worlds.find((world) => world.role === "primary");
  if (!primary)
    throw new Error(
      "no primary world in this reading — a wrapped page has exactly one copy the picture is " +
        "centred on, and every other copy is measured against it",
    );
  const paintedByPrimary = new Set(primary.painted);
  const short = [];
  const adrift = [];
  for (const world of worlds) {
    if (world === primary) continue;
    if ((world.visiblePx ?? 1) <= 0) continue;
    const tiles = (world.offsetPx - primary.offsetPx) / reading.tilePx;
    if (Math.abs(tiles - Math.round(tiles)) * reading.tilePx > 1)
      adrift.push({ copy: world.index, offsetPx: world.offsetPx, tiles });
    const painted = new Set(world.painted);
    const owed = world.owed.filter((key) => paintedByPrimary.has(key));
    const missing = owed.filter((key) => !painted.has(key));
    if (missing.length > 0) short.push({ copy: world.index, of: owed.length, missing });
  }
  const spanPx = worlds.length * reading.tilePx;
  return {
    copies: worlds.length,
    needed: worldCopiesToCover(reading.boxWidthPx, reading.tilePx),
    visible: worlds.filter((world) => (world.visiblePx ?? 1) > 0).length,
    uncoveredPx: Math.max(0, Math.round(reading.boxWidthPx - spanPx)),
    perCopy: worlds.map((world) => ({
      index: world.index,
      role: world.role,
      visiblePx: world.visiblePx ?? null,
      owed:
        world === primary
          ? world.owed.length
          : world.owed.filter((key) => paintedByPrimary.has(key)).length,
      painted: world.painted.length,
    })),
    short,
    adrift,
    offScreen: worlds.filter((world) => (world.visiblePx ?? 1) <= 0).map((world) => world.index),
  };
}
