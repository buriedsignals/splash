// twin/skills/twin-chart-beat/scripts/sizes.mjs
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

// WHY `typeScale` IS PER SIZE **AND** PER CRAFT SKILL, and why the parity guard must never compare
// it. This project draws one chart type twice, at two sizes, and nothing scales at the frame's own
// ratio: `static-diverging-bar…` at 900 wide against `vidz-diverging-bar…` at 1080 is a 1.20x frame
// carrying a 1.58x title and a 1.80x pad. A video types larger because it is watched small on a
// phone; a static types smaller because it sits in an article at reading distance. One number
// cannot express both — which is exactly what the original Splash tries, sharing `scale: 1.7`
// between square and portrait (`skills/chart-native/remotion/src/Root.tsx:50-74`), where it cannot
// be right for both. So `twin-chart-beat`'s `square` row and `twin-chart-video`'s `square` row
// carry the SAME width and height and DIFFERENT `typeScale`, on purpose.
//
// The numbers below were looked at, not reasoned about, and the looking is
// `proof/static-carbon-footprint-spread/probe/` (five measurements in `MEASUREMENTS.md`, what a
// person saw in `VERDICT.md`). Their starting point was `width / 900` — apparent-size-preserving,
// since a 900-wide frame carrying a 25px title in a 900px article column is the type size this
// project has already accepted — and the probe's job was to say whether that reads. It does at
// landscape and portrait.
//
// KNOWN OPEN, recorded rather than guessed: `square` is a SOCIAL POST, seen in a phone feed at
// maybe 400 CSS px, where 1.2 puts the title at ~11px on screen. `width / 900` preserves apparent
// size in an ARTICLE COLUMN, which is the wrong reference for a feed. Fixing it needs a
// phone-sized look nobody has taken; it is named in the spec's residue.
//
// A SPACING SCALE, NOT A TYPE SCALE. The probe's sharpest finding: the named font constants are not
// a beat's whole 900x560 tuning. The simplest static in this corpus carries eleven further bare
// literals inside its layout arithmetic (gaps between header blocks, insets in `padding`, offsets
// at the marks), and scaling the type while leaving those at their literal value collided the title
// into the subtitle at 1920x1080 by 1634x4.5px. A beat applies this number to EVERY spacing number
// it holds, through one integer-rounding helper — integers, so `measureText`'s cache keys stay
// stable.
//
// EVERY DIMENSION IS EVEN. The original's `assertRenderedSize` carries a `tolerancePx` (2px) it
// needs because article-web's 675 is odd against a 2x rasteriser
// (`skills/splash/src/channel.ts:53-61`). An even table never needs the tolerance, so the guard
// asserts the property instead of a comment recording it.
export const SIZES = {
  landscape: { width: 1920, height: 1080, typeScale: 2.1 },
  square: { width: 1080, height: 1080, typeScale: 1.2 },
  portrait: { width: 1080, height: 1920, typeScale: 1.2 },
};

/**
 * The row for one size name. THROWS on anything else, naming the three it knows — the `readPalette`
 * precedent in this same skill (`render-still.mjs`, which throws naming every directory it searched
 * rather than defaulting to black-on-white). The failure mode is identical: a chart produced at a
 * size nobody chose looks every bit as deliberate as one produced in a colour nobody chose.
 */
export function sizeFor(name) {
  const row = SIZES[name];
  if (!row)
    throw new Error(
      `Unknown export size ${JSON.stringify(name)}. This skill draws at exactly three: ` +
        `${Object.keys(SIZES).join(", ")} — landscape for YouTube and article web, portrait for ` +
        `stories, square for social posts. The size is chosen at gate 2c and recorded on the ` +
        `slot in STORYBOARD.md; it is not a default anything may fall back to.`,
    );
  return { ...row };
}
