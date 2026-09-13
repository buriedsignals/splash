// twin/shared/design-base/vertical-metrics.mjs
//
// THE LINE A FACE DECLARES FOR ITSELF, READ OUT OF THE FILE THE RENDER DRAWS WITH.
//
// A leading typed as `fontSize * 1.22` is the same number on every face, and faces do not share a
// line: across the design base's ladders the declared height runs from 1.149 em (Ubuntu) to
// 1.424 em (Source Sans 3). A direction files a coefficient ON this height instead, so the line
// follows the face the ladder actually picked.
//
// THE RULE IS THE BROWSERS'. `OS/2` typo metrics when `fsSelection` bit 7 (USE_TYPO_METRICS) is
// set, `hhea` otherwise, never `win`. That is what CSS `line-height: normal` resolves to, so a web
// beat that adopts this later sets on the same line without a conversion.
//
// See `docs/splash/2026-09-13-adaptive-leading-spec.md` §2.1.

import { readFileSync } from "node:fs";
import { typefaceFile } from "./typefaces.mjs";

const USE_TYPO_METRICS = 1 << 7;
const REQUIRED = ["head", "hhea", "OS/2"];
const held = new Map();

/** The sfnt table directory: tag → offset. */
function tablesOf(bytes, where) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4);
  const offsets = {};
  for (let i = 0; i < count; i++) {
    const record = 12 + i * 16;
    offsets[String.fromCharCode(...bytes.subarray(record, record + 4))] = view.getUint32(record + 8);
  }
  const missing = REQUIRED.filter((tag) => offsets[tag] === undefined);
  if (missing.length)
    throw new Error(
      `${where} has no ${missing.join(", ")} table, so it declares no line height this render can ` +
        `read — a leading computed without one would be a guess`,
    );
  return { view, offsets };
}

/**
 * The height of one line of this face, in em, as the face itself declares it.
 *
 * @param {string} family  a Google family, e.g. `Merriweather`
 * @param {number} weight  100..1000
 * @param {{italic?: boolean}} options
 * @returns {number}
 */
export function naturalLineHeightOf(family, weight = 400, { italic = false } = {}) {
  const key = `${family}|${weight}|${italic ? "italic" : "normal"}`;
  const hit = held.get(key);
  if (hit !== undefined) return hit;

  const where = `${family} ${weight}${italic ? " italic" : ""}`;
  const { view, offsets } = tablesOf(readFileSync(typefaceFile(family, weight, { italic })), where);
  const unitsPerEm = view.getUint16(offsets.head + 18);
  const os2 = offsets["OS/2"];
  const hhea = offsets.hhea;
  const typo = (view.getUint16(os2 + 62) & USE_TYPO_METRICS) !== 0;
  const units = typo
    ? view.getInt16(os2 + 68) - view.getInt16(os2 + 70) + view.getInt16(os2 + 72)
    : view.getInt16(hhea + 4) - view.getInt16(hhea + 6) + view.getInt16(hhea + 8);
  if (!(unitsPerEm > 0) || !(units > 0))
    throw new Error(
      `${where} declares a line of ${units} units on an em of ${unitsPerEm}, which is not a line ` +
        `height — the ${typo ? "OS/2 typo" : "hhea"} metrics of this file are empty or corrupt`,
    );

  const ratio = units / unitsPerEm;
  held.set(key, ratio);
  return ratio;
}
