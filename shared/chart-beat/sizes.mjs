// twin/skills/chart-beat/scripts/sizes.mjs
//
// The three export sizes ruling R2 names, and nothing else. Landscape for YouTube and article web,
// portrait for stories, square for social posts.
//
// WHY THIS IS ITS OWN FILE. `SIZES` could have gone into `render-still.mjs`, which every beat
// already imports. It must not: `splash/test/render-still-parity.test.ts` states in its own
// header, item 2, that "a drift in module-level CONSTANTS … are not compared". Putting the table
// there would put it in the one place the tree's existing walker provably cannot see. Its own file,
// its own walker (`splash/test/size-table-parity.test.ts`).
//
// WHY IT IS CARRIED AND NOT SHARED. `no-cross-skill-imports.test.ts`: a skill directory is
// copy-pasteable on its own. This is the same kind and size of fact as `GENRE_CATALOG` — three
// declarative rows — which this project already duplicates deliberately between `storyboard`
// and `deliver` and cross-checks by test in both directions. And `typeScale` is SUPPOSED to
// differ per craft skill (see below), which a shared module could only express by being
// parameterised by its caller, at which point it is no longer a table.
//
// WHAT IS NOT HERE, deliberately: which genres exist (that is `genre-catalog.mjs`'s question), and
// which chart TYPES may enter which size (that is `type-at-size.mjs`'s question, in this same
// skill). A size table that also gated would be the original Splash's one-table-two-jobs defect.
// There is no `print` row either — the original carries a fourth channel (2480x1748); R2 named
// three, and a fourth row is a decision nobody has taken.

// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY EACH ROW CARRIES A `minTypePx`, AND WHERE THE NUMBER COMES FROM
//
// A frame pixel is not a pixel a reader sees. A 1080x1920 story image is displayed FULL-BLEED on a
// phone, so on the narrowest phone Android's own window-size classes call "compact" — 360 dp, the
// figure the mobile-first probe uses because a floor derived from the widest phone is not a floor —
//
//     1 frame px = 360 / 1080 = 1/3 CSS px,
//
// and every legibility figure multiplies by three. That single line is the whole reason the shipped
// table was wrong: `typeScale` was `width / 900` in all three rows, so portrait and square landed at
// exactly the same APPARENT size as landscape, and the seed's axis labels measured 5.3 CSS px on the
// phone they are read on.
//
// The floor itself is not ours. Three independent sources converge on 11-12 CSS px, with 16 as the
// target — Datawrapper's own "everything below 12px will likely be too small", the U.S. federal Data
// Visualization Standards' 9 pt (~12 px) screen minimum, and Apple's 11 pt as weak second-hand
// corroboration. Sources, standing and the arithmetic:
// `proof/portrait-aspect-probe/MOBILE-FIRST-WIREFRAME.md` §1.1 and §2.
//
//     minTypePx = ceil( 12 CSS px  x  frame width / the width the frame is READ at )
//
//   portrait  1080 read full-bleed at 360 dp  ->  12 x 3.000 = 36
//   square    1080 read full-bleed at 360 dp  ->  12 x 3.000 = 36   (a feed post is full-width too)
//   landscape 1920 read in a 900 px article column -> 12 x 2.133 = 25.6 -> 26
//
// NAMED AND NOT ANSWERED: landscape is R2's YouTube row as well as its article row, and a landscape
// video watched full-screen on a phone held upright is ~360 dp wide, which would put the floor at
// 64 px. Nobody has looked at that, so nothing here pretends to. The 26 is the ARTICLE reference,
// which is the reference this project has already accepted and rendered.
//
// `typeScale` is the row's DEFAULT multiplier over a beat's 900x560 base tokens, and it is chosen so
// the smallest base token a beat draws clears `minTypePx`. It is a default and not a guarantee: a
// beat whose smallest token is smaller than the seed's is refused loudly by `assertTypeFloor`, which
// measures the RENDERED markup rather than trusting the multiplier.
//
//     seed base tokens: TITLE 26 / LABEL 15 / SOURCE 14 / AXIS 13 / GAP_NOTE 12  <- smallest is 12
//     portrait & square  36 / 12 = 3.0
//     landscape          26 / 12 = 2.17 -> 2.2
//
// The previous landscape value of 2.1 put the gap note at 25.2 px, a fifth of a pixel under its own
// floor. It is raised rather than waived, because a floor with an exception in it is a preference.
//
// WHY EACH ROW CARRIES A `stage`, AND WHY ONLY ONE ROW HAS ONE
//
// Meta publishes one safe zone for Stories and Reels — 14% top, 35% bottom, 6% each side — which on
// 1080x1920 is 269 px / 672 px / 65 px, leaving a band from 269 to 1248: 979 px, 51% of the frame.
// <https://www.facebook.com/business/help/980593475366490/>. TikTok publishes no pixels and says its
// zone shrinks as the caption grows; Meta's band sits inside the figures third-party guides cite for
// TikTok, so satisfying Meta satisfies both. Content outside the band is AT RISK OF BEING COVERED,
// not clipped — which is exactly why no counter in this project ever saw it.
//
// The band is therefore both a placement rule and a SIZE BUDGET: at a 36 px floor there are 979 px
// to spend, and a beat can genuinely exceed them. `type-at-size.mjs` owns what a beat removes, in
// what order, and when it refuses.
//
// `square` has NO stage: a feed post is not overlaid by the platform's chrome — the caption and the
// buttons sit BELOW the image, not on it — so its budget is the whole frame. `landscape` has none
// for the same reason. Recording `null` rather than omitting the field is deliberate: the parity
// guard can then tell "this row has no reserve" from "somebody forgot".
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
  landscape: { width: 1920, height: 1080, typeScale: 2.2, minTypePx: 26, stage: null },
  square: { width: 1080, height: 1080, typeScale: 3.0, minTypePx: 36, stage: null },
  portrait: {
    width: 1080,
    height: 1920,
    typeScale: 3.0,
    minTypePx: 36,
    stage: { top: 269, bottom: 1248 },
  },
};

/** The size names this toolchain exports, in the order R2 names them. */
export const EXPORT_SIZE_NAMES = Object.keys(SIZES);

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
        `${EXPORT_SIZE_NAMES.join(", ")} — landscape for YouTube and article web, portrait for ` +
        `stories, square for social posts. The size is chosen at gate 2c and recorded on the ` +
        `slot in STORYBOARD.md; it is not a default anything may fall back to.`,
    );
  return { ...row, stage: row.stage ? { ...row.stage } : null };
}

/**
 * The band a beat may draw in, at this size. `{ top, bottom, height }` where the platform reserves
 * part of the frame, and the whole frame otherwise — so a caller lays out against `stage` without
 * branching, and a row that grows a reserve later needs no new call site.
 */
export function stageFor(name) {
  const row = sizeFor(name);
  const top = row.stage ? row.stage.top : 0;
  const bottom = row.stage ? row.stage.bottom : row.height;
  return { top, bottom, height: bottom - top, reserved: Boolean(row.stage) };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// MEASURING WHAT WAS ACTUALLY DELIVERED
//
// The defect this half of the file exists to close, stated plainly, because it is subtle and it was
// live for the whole of W4: `renderStill` DID assert a size — it compared the element's drawn frame
// against the `width`/`height` it was handed, and both came from the same two literals in the beat's
// own `render.mjs`. They agreed by construction. A journalist could pin `size: portrait` at gate 2c
// and receive an 1800x1120 PNG with nothing anywhere throwing.
//
// So the load-bearing assertion is not about the element and not about the arguments. It is about
// THE FILE ON DISK, read back from its own bytes after it is written. That is the only reading the
// code which wrote it cannot make agree with itself — and it is what catches the `x 2` rasteriser,
// a `fitTo` mode changing under the skill, and a producer that honours width and quietly drops
// height (which is `dw-beat`'s own live risk against Datawrapper's export endpoint).

/**
 * `{ width, height }` read out of a PNG's IHDR chunk. Pure, and deliberately not a decoder: the
 * first 8 bytes are the signature, then a 4-byte length, `IHDR`, and two big-endian uint32s. Throws
 * on anything that is not a PNG, so a truncated or half-written file cannot read as a passing size.
 */
export function readPngSize(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 33 || SIGNATURE.some((b, i) => buf[i] !== b))
    throw new Error(
      `not a PNG: expected the 8-byte signature and an IHDR chunk, got ${buf.length} bytes ` +
        `beginning ${[...buf.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join(" ")}`,
    );
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * THE ASSERTION THE WHOLE SIZE DECISION RESTS ON. Reads the delivered file's own dimensions and
 * refuses anything but the row's. `got` is passed by callers whose artifact is not a PNG (an mp4's
 * dimensions come from `ffprobe`), so one refusal serves every genre and reads the same way.
 *
 * It holds for ALL THREE sizes. The original Splash exempts landscape from its own equivalent
 * (`skills/chart-native/scripts/produce.mjs:352-368`), which leaves the contract enforced for two
 * cases out of three and unenforced for the default one — the mistake being avoided here, not the
 * model being copied.
 */
export function assertDeliveredSize(got, name, { what = "the delivered file" } = {}) {
  const row = sizeFor(name);
  if (got.width !== row.width || got.height !== row.height)
    throw new Error(
      `${what} measures ${got.width}x${got.height}, but the pinned size ${JSON.stringify(name)} ` +
        `is ${row.width}x${row.height}. This is read from the artifact's own bytes, not from the ` +
        `numbers that drew it — so a rasteriser scaling the frame, or a producer honouring width ` +
        `and dropping height, arrives here rather than in the newsroom.`,
    );
  return row;
}

/**
 * REFUSE TYPE THE READER CANNOT READ AT THE SIZE IT SHIPS AT.
 *
 * Measured off the RENDERED markup — every `font-size` the SVG actually carries — and not off the
 * scale that was meant to produce it, for the same reason `assertDeliveredSize` reads the file: a
 * multiplier can be right and a token can still have been left bare. The seed's `GAP_NOTE` is the
 * worked example: `fontSize={12}` written at the mark itself, unscaled, and at 1920x1080 it read as
 * a caption printed by mistake. No assertion saw it — it collided with nothing and was clipped by
 * nothing. This is the assertion that sees it.
 *
 * It closes blind spot 4 of `three-sizes-no-collision.test.ts` in its own words: "a 9px label inside
 * the frame passes. Legibility floors are the type scale's job."
 */
export function assertTypeFloor(svg, name, { what = "this render" } = {}) {
  const row = sizeFor(name);
  const found = new Map();
  for (const m of svg.matchAll(/font-size="(\d+(?:\.\d+)?)"/g)) {
    const px = Number(m[1]);
    if (px < row.minTypePx) found.set(px, (found.get(px) ?? 0) + 1);
  }
  if (found.size === 0) return row;
  const listed = [...found.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([px, n]) => `${px}px x${n} (${(px / (row.width / viewedAtCssPx(name))).toFixed(1)} CSS px)`)
    .join(", ");
  throw new Error(
    `${what} draws type below the ${row.minTypePx}px floor for ${JSON.stringify(name)}: ${listed}. ` +
      `A ${row.width}px-wide frame is read at ${viewedAtCssPx(name)} CSS px, so ${row.minTypePx}px ` +
      `is the 12 CSS px practical floor three independent sources converge on ` +
      `(MOBILE-FIRST-WIREFRAME.md §1.1). Scale the token — the floor is never lowered, and nothing ` +
      `in the removal ladder makes type smaller.`,
  );
}

/**
 * THE FRAME'S OWN MARGIN — the one spacing number that must NOT scale with the type.
 *
 * Everything a beat's `sp()` touches is a gap BETWEEN WORDS: leading, the air under the header, the
 * drop to a tick baseline. Those are proportional to the type by definition. A frame's margin is
 * proportional to the CANVAS, and the difference is invisible for exactly as long as `typeScale`
 * happens to equal `width / 900` — which is what the shipped table carried, so nothing separated
 * them. The moment portrait's scale rose to 3.0 to clear the phone's floor, a 40px margin became
 * 120px on a 1080px frame: a quarter of the width spent on air before a word was drawn.
 *
 * `40 / 900` is this corpus's own accepted margin, read off the frame every static beat was tuned
 * at. The floor under it is the mobile-first wireframe's, with its own reason: Meta reserves 6% =
 * 65px each side of a 1080 story, and 2 x the smallest type is the next value up, "so the margin
 * can never be thinner than the smallest word is tall."
 *
 * It lives here rather than in a component because every craft skill needs it and none of them may
 * import another's — the same argument that carries the table itself.
 */
export const MARGIN_RATIO = 40 / 900;

export function frameInsetFor(name) {
  const row = sizeFor(name);
  return Math.max(Math.round(MARGIN_RATIO * row.width), row.minTypePx * 2);
}

/** The width, in CSS px, the frame is read at — the divisor behind `minTypePx`. See the header. */
export function viewedAtCssPx(name) {
  sizeFor(name); // validates the name, so this never answers for a size nobody exports
  return name === "landscape" ? 900 : 360;
}

/**
 * REFUSE A BLOCK THAT FALLS OUTSIDE THE PLATFORM'S SAFE BAND.
 *
 * Only fires where the row HAS a stage, which today is portrait alone. Measured off the rendered
 * markup's `<text>` baselines, because the failure mode is a caption the platform's own progress bar
 * covers — and a covered credit is an attribution failure, not a cosmetic one, which is why the
 * credit moves inside the stage rather than staying pinned to the frame's bottom margin.
 *
 * STATED LIMITATION, because a guard whose reach is unstated gets trusted past it: this reads
 * `<text y="…">` baselines and the run's own `font-size`, so it sees where WORDS are. A mark drawn
 * outside the band — a bar running to the frame's foot — is not measured here. Rotated runs
 * (`transform="rotate(…)"`) are skipped and counted in the refusal, so a beat that leans on them
 * knows this guard went quiet rather than green.
 */
export function assertWithinStage(svg, name, { what = "this render" } = {}) {
  const stage = stageFor(name);
  if (!stage.reserved) return stage;
  const outside = [];
  let skipped = 0;
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    if (/transform="/.test(attrs)) {
      skipped += 1;
      continue;
    }
    const y = Number(/\by="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    if (!Number.isFinite(y)) continue;
    const size = Number(/font-size="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0);
    const words = m[2].replace(/<[^>]*>/g, "").trim().slice(0, 40);
    // A baseline sits at the FOOT of the glyphs, so the run's ink starts roughly one cap-height
    // above it. 0.75 of the font size is the conventional cap-height ratio and is used as the
    // ascent here rather than measured, because being generous makes this refuse LESS, never more.
    if (y - size * 0.75 < stage.top || y > stage.bottom)
      outside.push(`"${words}" baseline ${y}, ${size}px`);
  }
  if (outside.length)
    throw new Error(
      `${what} draws outside the ${stage.height}px safe band (${stage.top}-${stage.bottom}) that ` +
        `${JSON.stringify(name)} reserves: ${outside.join("; ")}. The platform's profile row, ` +
        `caption, buttons and progress bar sit over the rest of the frame — content there is at ` +
        `risk of being COVERED, which no clipping counter can see. Fit the block to the band, or ` +
        `run the removal ladder in type-at-size.mjs; the last rung is a stated refusal.` +
        (skipped ? ` (${skipped} rotated run(s) were not measured.)` : ""),
    );
  return stage;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE DECISION REACHING THE PRODUCER
//
// Gate 2c takes a size. Until this function existed, nothing downstream read it: the size lived in
// prose in the beat's `BRIEF.md` ("Channel: article web, 900 x 560"), checked by nothing, while the
// component carried its own `const FRAME` and the render script repeated the same two literals.
//
// `readPinnedSize` is the seam. It reads the beat's own record, in the beat's own folder
// (invariant 3), and throws naming every path it looked at rather than defaulting — the `readPalette`
// precedent again, and for the same reason.

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** The front-matter record of a BRIEF, or `null` when it has none. Pure. */
export function parseBriefFrontMatter(text) {
  const match = FRONT_MATTER.exec(text);
  if (!match) return null;
  const record = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line.trim());
    if (pair) record[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  return record;
}

/**
 * The size pinned for this beat, read from `BRIEF.md`'s front matter and validated against the three
 * rows. Searches the beat's own directory and then upward, so a beat nested under a story finds its
 * own brief first.
 *
 * `fs` and `path` are injected so this stays testable without touching a disk, and so the copy in
 * each craft skill has no import beyond node builtins.
 */
export async function readPinnedSize(startDir, { readFile, dirname, join } = {}) {
  if (!readFile || !dirname || !join)
    throw new Error(
      `readPinnedSize needs { readFile, dirname, join } injected — the craft skills carry this ` +
        `file verbatim and none of them may reach across a skill boundary for a filesystem.`,
    );
  const searched = [];
  let dir = startDir;
  for (let up = 0; up < 6; up++) {
    const path = join(dir, "BRIEF.md");
    searched.push(path);
    let text = null;
    try {
      text = await readFile(path, "utf8");
    } catch {
      text = null;
    }
    if (text !== null) {
      const record = parseBriefFrontMatter(text);
      if (!record || !record.size)
        throw new Error(
          `${path} pins no size. Gate 2c chose one; the beat has to record it where the producer ` +
            `reads it, or the choice reaches nothing. Add front matter:\n\n` +
            `---\nsize: landscape\n---\n\nOne of ${EXPORT_SIZE_NAMES.join(", ")}.`,
        );
      sizeFor(record.size); // throws, naming the three, on anything else
      return record.size;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `No BRIEF.md found for ${startDir}, so there is no record of the size gate 2c pinned. ` +
      `Looked in:\n  ${searched.join("\n  ")}`,
  );
}
