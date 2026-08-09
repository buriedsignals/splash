// twin/skills/twin-dw-beat/scripts/sizes.mjs
//
// The three export sizes ruling R2 names, and nothing else. Landscape for YouTube and article web,
// portrait for stories, square for social posts.
//
// WHY THIS IS ITS OWN FILE. `SIZES` could have gone into `render-still.mjs`, which every beat
// already imports. It must not: `splash-twin/test/render-still-parity.test.ts` states in its own
// header, item 2, that "a drift in module-level CONSTANTS … are not compared". Putting the table
// there would put it in the one place the tree's existing walker provably cannot see. Its own file,
// its own walker (`splash-twin/test/size-table-parity.test.ts`).
//
// WHY IT IS CARRIED AND NOT SHARED. `no-cross-skill-imports.test.ts`: a skill directory is
// copy-pasteable on its own. This is the same kind and size of fact as `GENRE_CATALOG` — three
// declarative rows — which this project already duplicates deliberately between `twin-storyboard`
// and `twin-deliver` and cross-checks by test in both directions. And `typeScale` is SUPPOSED to
// differ per craft skill (see below), which a shared module could only express by being
// parameterised by its caller, at which point it is no longer a table.
//
// WHAT IS NOT HERE, deliberately: which genres exist. That is `genre-catalog.mjs`'s question, and a
// size table that also gated would be the original Splash's one-table-two-jobs defect. There is no
// `print` row either — the original carries a fourth channel (2480x1748); R2 named three, and a
// fourth row is a decision nobody has taken.

// NO `typeScale` IN THIS COPY, and its absence is the whole reason this skill's copy differs.
// Datawrapper lays out its own type SERVER-SIDE: nothing in this skill measures a gutter, wraps a
// title or picks a font size, so there is no local number for a scale to multiply. The parity guard
// (`splash-twin/test/size-table-parity.test.ts`) is written as present-and-valid-or-absent for
// exactly this row, not as required — and it does not compare the field's VALUE across copies
// either, so `twin-chart-beat` carrying 2.1 where this file carries nothing is not drift.
//
// WHAT IS DELIBERATELY NOT ASSUMED. Datawrapper's export endpoint takes `width`, `height` and
// `zoom`, and this skill has never verified that it HONOURS the height it is given — a chart whose
// content is short may come back shorter than the frame asked for. Rather than pin a measured
// constant this branch has no token to measure (`DATAWRAPPER_TOKEN` is unset here), `produce.mjs`
// reads the returned PNG's own IHDR and THROWS when it disagrees with the row. The first real run
// against the API is therefore the measurement, and it cannot come back wrong quietly. See
// `produce.mjs`'s `assertExportedSize`.
//
// EVERY DIMENSION IS EVEN. Same rule as every other copy: Datawrapper's `zoom` is a multiplier, and
// an odd dimension against a multiplier is where the original Splash needed its `tolerancePx`
// (`skills/splash/src/channel.ts:53-61`).
export const SIZES = {
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

/**
 * The row for one size name. THROWS on anything else, naming the three it knows — the `readPalette`
 * precedent in `twin-chart-beat` (`render-still.mjs`, which throws naming every directory it
 * searched rather than defaulting to black-on-white). The failure mode is identical: a chart produced at a
 * size nobody chose looks every bit as deliberate as one produced in a colour nobody chose.
 */
export function sizeFor(name) {
  const row = SIZES[name];
  if (!row)
    throw new Error(
      `Unknown export size ${JSON.stringify(name)}. This skill exports at exactly three: ` +
        `${Object.keys(SIZES).join(", ")} — landscape for YouTube and article web, portrait for ` +
        `stories, square for social posts. The size is chosen at gate 2c and recorded on the ` +
        `slot in STORYBOARD.md; it is not a default anything may fall back to.`,
    );
  return { ...row };
}
