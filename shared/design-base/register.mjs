// twin/shared/design-base/register.mjs
//
// A FILED REGISTER, RESOLVED FOR THE FACE THE RENDER DRAWS WITH: ITS SIZE BY CAP HEIGHT, ITS LINE BY
// THE FACE'S OWN DECLARED LINE.
//
// Lifted out of `proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`, where it was
// written first and where no other beat could inherit it. See
// `docs/splash/2026-09-13-adaptive-leading-spec.md`.
//
// NOT re-exported by `index.mjs`: it measures through resvg, and `index.mjs` is read by fast tests.

import { deriveFurniture, measureTextBand } from "#shared/chart-beat/render-still.mjs";
import { resolveRegister } from "#shared/chart-beat/registers.mjs";
import { LADDERS } from "./resolve-families.mjs";
import { naturalLineHeightOf } from "./vertical-metrics.mjs";

/**
 * A FILED SIZE NAMES A CAP HEIGHT, NOT A POINT SIZE — AND THE CAP HEIGHT IS MEASURED FROM THE FILE
 * THE RENDER WILL ACTUALLY DRAW WITH.
 *
 * THE DEFECT. A direction files `display: 32`. `resolve-families.mjs` turns the ROLE that row names
 * into a concrete family by asking each candidate on the role's ladder whether it covers this beat's
 * own text — so the family is a function of the COPY, and one missing code point moves it (Lato and
 * Roboto Slab have no U+2082, so a headline carrying `CO₂` resolves further down). The size did not
 * move with it. A `32` measured on the head of the ladder was spent unchanged on whatever face the
 * coverage question happened to land on, and two faces at 32px are not the same size on the page:
 * measured here on 2026-09-13, cap height per unit of nominal size runs from 0.693 (Ubuntu) to 0.770
 * (Libre Baskerville) — 11 % of optical size, silently, with nothing anywhere going red.
 *
 * THE RULE. A register's filed size is read as the cap height it produces ON THE HEAD OF ITS OWN
 * ROLE'S LADDER, and every other face is resolved to the size that reaches the same cap height. The
 * ladder may change the family; it may not change the size on the page. The reference is measured,
 * per weight, out of the `.ttf` `typefaces.mjs` fetched — never a table of per-family constants,
 * which is the next thing to go stale the day a newsroom files a family nobody anticipated.
 *
 * This is the discipline `shared/map-beat/tints.mjs` already applies to colour: *a fixed dose cannot
 * work across three grounds*, so the basemap targets a MEASURED gap and solves for the dose. A fixed
 * point size cannot work across three faces, so a register targets a measured cap height and solves
 * for the size.
 *
 * WHAT IT IS NOT. Cap height is the VERTICAL half only. At one cap height two faces still set at
 * different widths — that is what makes them different typefaces and normalising it away would be
 * wrong — so the horizontal half is `mapGeometryFor`'s size-for-lines ladder, below.
 */
const CAP_PROBE = "H";
/** Measured large, then divided: resvg reports an integer-ish ink box, so a 200px probe carries
 *  more significant figures than a 10px one. The ratio is linear in size and is asserted to be. */
const CAP_PROBE_SIZE = 200;
const capRatios = new Map();

/** @param {string} fontFamily @param {number} fontWeight @returns {number} */
export function capRatioOf(fontFamily, fontWeight) {
  const key = `${fontFamily}|${fontWeight}`;
  const held = capRatios.get(key);
  if (held !== undefined) return held;
  const ratio =
    measureTextBand(CAP_PROBE, { fontSize: CAP_PROBE_SIZE, fontWeight, fontFamily }).ascent /
    CAP_PROBE_SIZE;
  if (!(ratio > 0.4 && ratio < 1))
    throw new Error(
      `the cap height of ${fontFamily} at weight ${fontWeight} measured ${ratio.toFixed(4)} of its ` +
        `nominal size, which is not a cap height — a Latin face runs about 0.69 to 0.77. The face ` +
        `was probably not handed to the rasteriser at all, in which case nothing was drawn and the ` +
        `ink box is empty.`,
    );
  capRatios.set(key, ratio);
  return ratio;
}

/** The face a register's role resolves to FIRST — the reference its filed size and its leading were
 *  read against. A direction that never went through `resolveDirectionFamilies` has no role to
 *  reference, and then the face IS its own reference. */
function ladderHeadFor(direction, name) {
  const decision = direction?.decisions?.find((d) => d.register === name);
  return decision ? (LADDERS[decision.role]?.[0] ?? null) : null;
}

/** The two block gaps that are the same in every directed component of the corpus (measured
 *  2026-09-13: 38 of 38 and 9 of 9), as multiples of the lead of the register that carries them.
 *  Every other gap is a property of its own graphic's layout and stays with it (spec §2.3). */
export const EYEBROW_TO_DISPLAY = 0.75;
export const READING_TO_SOURCE = 0.4286;

/**
 * A register, resolved against the direction, sized to its role's own cap height, set on its face's
 * own line, and given the ink its row names.
 *
 * `filedSize` travels beside `fontSize`: `fontSize` is what the glyphs are DRAWN at, `filedSize` is
 * what the direction filed, and a layout that counts a line budget on the reference face needs both.
 * The LINE is the drawn one's — `leadOf` reads `fontSize` — so a headline the ladder shrinks
 * tightens its own leading instead of keeping the block it was given.
 *
 * `ctx` is `resolveRegister`'s, and it carries the FAMILY — which apparatus registers exist beside
 * the five core voices, not which font ladder a role walks. A chart derives `axis` out of `body`; a
 * map derives `place` out of `annot`; the ladders are per ROLE and `ladderHeadFor` reads them off
 * the direction's own decisions by register name, so nothing about a face needs threading here. A
 * caller that asks for a map's `place` without saying so is refused by `resolveRegister` — "no such
 * register for a chart" — rather than answered wrongly, which is why the default is safe.
 */
export function registerOf(direction, name, ctx = {}) {
  const { ink, muted } = deriveFurniture(direction.ground);
  const r = resolveRegister(direction, name, ctx);
  if (typeof r.leading !== "number")
    throw new Error(
      `direction ${direction?.id ?? "(unnamed)"} files no leading for its ${name} register, and a ` +
        `register cannot be set on a line nobody chose`,
    );
  const head = ladderHeadFor(direction, name);
  const scale = head ? capRatioOf(head, r.fontWeight) / capRatioOf(r.fontFamily, r.fontWeight) : 1;
  const fontSize = Math.round(r.fontSize * scale * 100) / 100;
  const naturalLineHeight = naturalLineHeightOf(r.fontFamily, r.fontWeight, {
    italic: r.fontStyle === "italic",
  });
  return {
    ...r,
    fontSize,
    filedSize: r.fontSize,
    referenceFamily: head ?? r.fontFamily,
    letterSpacing: (Number(r.letterSpacing ?? 0) * fontSize) / r.fontSize,
    naturalLineHeight,
    lineHeight: naturalLineHeight * r.leading,
    fill: { ink, muted, accent: direction.accent }[r.ink],
  };
}

/** The distance from one baseline to the next, at the size THIS object is drawn at — a function,
 *  not a field, because a layout copies a register at another size (`{ ...display, fontSize }`) and
 *  a field computed at resolution would carry the old size into the copy. The size, not the face: a
 *  copy that changes `fontFamily` keeps the old face's `lineHeight` — changing the face means calling
 *  `registerOf` again. */
export const leadOf = (r) => r.lineHeight * r.fontSize;

/** A gap between blocks, as a multiple of the lead of the register that carries it. */
export const gapOf = (r, n) => n * leadOf(r);
