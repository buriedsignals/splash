// THE ONE GUARD THAT SURVIVES DELEGATION, and the reason the rest of the catalogue is blank here.
//
// Every other producing skill writes the geometry it verifies. This one sends a spec to Datawrapper
// and takes back an artefact, so most of the catalogue is not WEAK here — it is unreachable, and
// `doctrine/references/guard-catalogue.json` records each of those with its reason so a later reader
// does not re-litigate it. There are no marks of ours to carry a dash, no reveal to arrive anywhere,
// no plate baked beside a geometry file.
//
// WHAT IS STILL OURS IS THE ARTEFACT. The PNG comes back, is written into the beat directory, and is
// delivered from there — on whatever surface Datawrapper decided to paint. This producer never asks
// for one: `spec` REQUIRES an accent (`color`) and has no field for a ground. So a story whose
// `PALETTE.md` records `ground: "#16191B"` gets a white chart delivered into a dark article, which
// is the defect `plate-follows-theme` was earned by, reached by this format's own mechanism: not a
// plate baked on the wrong side, but an export rendered on a side nobody was asked about.
//
// The decision below is `scrolly`'s, `map-beat`'s and `map-web`'s, byte for byte —
// `splash/test/guard-copies-parity.test.ts` holds the four copies to the same text, comments and
// tuning constants included. Only the MEASUREMENT is this skill's own: the surface is an exported
// PNG rather than a baked plate, and the decision cannot tell the difference between them. That is
// what copying it buys.

import { join, dirname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { decodePng } from "./compare-png.mjs";

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["plateFollowsGround", "csvSplitByHand", "pageLanguageMatchesStory"];

/** Does the delivered page's own `<html lang>` agree with the language recorded for its story?
 *
 *  Reads the ARTEFACT, never re-derives it: `recorded` is the story's own answer (`STORYBOARD.md`'s
 *  `language:` field, or a beat's own recorded equivalent), handed in by the caller — this function
 *  never detects a language from prose and never assumes English. `renderWeb`'s own HTML shell used
 *  to hard-code `lang="fr"` regardless of what a beat actually said, discovered when an English beat
 *  had to patch its own runner to fix it after the fact; this is the guard that would have caught it
 *  on the delivered file, not just at render time. */
export function pageLanguageMatchesStory(html, recorded) {
  const found = /<html[^>]*\slang="([^"]*)"/i.exec(html);
  if (!found) return false;
  return found[1] === String(recorded ?? "").trim();
}

/** The relative luminance of a CSS colour, or `null` when the string is not a painted colour.
 *
 *  THE `null` IS THE POINT. This guard failed three correct beats by reading
 *  `getComputedStyle(".scrolly").backgroundColor` — which is `rgba(0, 0, 0, 0)` on an element that
 *  sets no background — and taking its zeros for black. A transparent surface has not been measured;
 *  it has been missed. Returning a number there is how a broken instrument reports confidently.
 *
 *  Translucent is NOT transparent: `rgba(255,255,255,0.5)` is paint, and its own colour is the best
 *  reading available without compositing the whole stack. */
export function surfaceLuminance(css) {
  if (typeof css !== "string") return null;
  const value = css.trim();
  if (!value || value === "transparent" || value === "none") return null;
  let channels = null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    channels = [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16));
  } else if (/^rgba?\(/i.test(value)) {
    const parts = value.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return null;
    if (parts.length >= 4 && Number(parts[3]) === 0) return null;
    channels = parts.slice(0, 3).map(Number);
  }
  if (!channels || channels.some((c) => !Number.isFinite(c))) return null;
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(channels[0]) +
    0.7152 * channel(channels[1]) +
    0.0722 * channel(channels[2])
  );
}
/** The two sides a mid-grey band apart: below this a surface is DARK, above it LIGHT, and in
 *  between it belongs to neither and this guard says nothing. */
const DARK_SIDE = 0.25;
const LIGHT_SIDE = 0.6;
/** Whether a baked plate is on the same side as the ground its beat declared.
 *
 *  The delivered route beat declared `--ground: #16191B` and painted every label white on a dark
 *  halo — right for that ground — over a basemap baked in `dataviz-light`. The furniture was correct
 *  and unreadable, which is what correct furniture looks like over the wrong ground. Both sides are
 *  numbers, so a machine can settle it; what it must not do is prescribe a direction, since a dark
 *  beat and a light one are equally legitimate. Only the two-sided disagreement is refused. */

export function plateFollowsGround({ ground, plate }) {
  if (plate == null || ground == null) return true;
  const side = (value) => (value < DARK_SIDE ? "dark" : value > LIGHT_SIDE ? "light" : "middle");
  const one = side(ground);
  const two = side(plate);
  if (one === "middle" || two === "middle") return true;
  return one === two;
}
/** The ground a beat declares, out of its own `PALETTE.md` frontmatter, or `null`.
 *
 *  `null` and never a default: the guard that read a transparent box as black failed three correct
 *  beats for eight days, and the lesson it left is that a value which was not read must not be able
 *  to travel as a value that was. */
export function groundFromPalette(source) {
  if (typeof source !== "string") return null;
  const found = /^ground:\s*"?(#[0-9a-fA-F]{3,8})"?\s*$/m.exec(source);
  return found ? found[1] : null;
}
/** The mean relative luminance of a decoded plate, sampled on a 64x32 grid.
 *
 *  The same grid `verify-scrolly.mjs` samples through an `OffscreenCanvas`, computed here from
 *  `decodePng`'s own bytes — no browser, and no screenshot, which is the reading this tree stopped
 *  trusting. A grid rather than every pixel because a 4000x4000 plate is 64 million channels and the
 *  question is which SIDE of the theme it is on, not its exact mean. */
export function plateLuminance(image) {
  const stepX = Math.max(1, Math.floor(image.width / 64));
  const stepY = Math.max(1, Math.floor(image.height / 32));
  let sum = 0;
  let seen = 0;
  for (let y = 0; y < image.height; y += stepY)
    for (let x = 0; x < image.width; x += stepX) {
      const at = (y * image.width + x) * 4;
      sum += surfaceLuminance(`rgb(${image.data[at]},${image.data[at + 1]},${image.data[at + 2]})`);
      seen++;
    }
  return sum / seen;
}

/** The ground in force for a beat, and the file it was read from — or `null`.
 *
 *  Looks in the beat's own directory, then in each ancestor, so one `PALETTE.md` recorded at a story
 *  root serves every beat under it exactly as it does for every other format. This is the LOOKUP
 *  `map-beat`'s `readPalette` performs, with one difference that matters: finding nothing here is
 *  not an error. A render that cannot read its colours must refuse, because it would otherwise paint
 *  in a colour nobody chose; this guard reads a colour it did not choose in order to CHECK it, and a
 *  beat produced outside a story has simply declared nothing to check against.
 *
 *  `null` and never a default: the guard that read a transparent box as black failed three correct
 *  beats for eight days, and a value that was not read must not travel as a value that was. */
export function groundForBeat(dir) {
  if (typeof dir !== "string" || dir === "") return null;
  let current = resolve(dir);
  for (;;) {
    const candidate = join(current, "PALETTE.md");
    if (existsSync(candidate)) {
      const ground = groundFromPalette(readFileSync(candidate, "utf8"));
      return ground ? { ground, source: candidate } : null;
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** The exported PNG's own surface, against the ground the beat's story declared. THROWS when they
 *  are on opposite sides; returns `null` when there was no ground to compare with.
 *
 *  This is `assertExportedSize`'s twin and sits beside it for the same reason: Datawrapper renders
 *  server-side, and everything this skill knows about what came back, it has to READ off the bytes.
 *  A size that was not honoured is loud — the file is the wrong shape. A surface on the wrong side is
 *  silent: the PNG is valid, the chart is correct, the accent is the house one, and it lands in the
 *  article as a white rectangle in a dark column. Nothing fails; the delivery is simply wrong, which
 *  is the shape of every defect this catalogue exists to catch.
 *
 *  It does not prescribe a direction — a dark newsroom and a light one are equally legitimate — and
 *  it decodes nothing when no ground was declared, so a beat produced outside a story pays nothing. */
export function assertExportedSurface(bytes, beatDir) {
  const declared = groundForBeat(beatDir);
  if (!declared) return null;
  const ground = surfaceLuminance(declared.ground);
  const exported = plateLuminance(decodePng(bytes));
  if (!plateFollowsGround({ ground, plate: exported })) {
    throw new Error(
      `the delegated export came back on the opposite side from the ground this story declared: ` +
        `ground ${declared.ground} (luminance ${ground.toFixed(3)}), export luminance ` +
        `${exported.toFixed(3)}. Read from ${declared.source}. Datawrapper renders on its own ` +
        `surface and this producer never asks for one, so the fix is a Datawrapper theme or a ` +
        `published background that matches the story — not a wider check here.`,
    );
  }
  const side = exported < DARK_SIDE ? "dark" : exported > LIGHT_SIDE ? "light" : "middle";
  return { ground, exported, side };
}

/** A `.csv` this script reads whose own row is cut on every literal comma instead of a parser that
 *  understands a quoted field — the pattern beat `proof/more-line-swiss-life-expectancy/render.mjs`
 *  shipped for months and every author since copied: `"1,234.5"` (a thousands separator) and
 *  `"Netherlands, the"` (a name carrying its own comma) both tear in two under a bare
 *  `row.split(",")`, silently — an extra field, every column after it one off, and nothing throws.
 *
 *  Reads SOURCE TEXT, not a delivered artifact: the defect lives in how a beat is WRITTEN, not in
 *  what it renders, so there is no rendered signal to inspect after the fact.
 *
 *  Two shapes have to appear TOGETHER for a match. A newline split that tokenises rows by hand
 *  (`.split(/\r?\n/)`, or the quoted `"\n"` / `"\r\n"` forms) is proof the source is walking a csv's
 *  own rows itself; paired with a bare single-comma split (`.split(",")`, either quote style) that
 *  cuts each one into fields. Either alone proves nothing — a comma split with no row split nearby
 *  is cutting something else (`place.split(" of ").pop().split(",")[0]`, a sentence, not a row: the
 *  false positive measured against `proof/mapgen-symbol-web/render-web.mjs`, which mentions "csv"
 *  repeatedly and reads a real one through a proper parser elsewhere), and a row split with no
 *  comma split nearby means the
 *  fields are read some other, safe way. Returns every offending `.split(",")` snippet found; empty
 *  means this source does not hand-cut a comma on its own csv rows. */
export function csvSplitByHand(source) {
  if (!/\bcsv\b/i.test(source)) return [];
  const rowSplitByHand =
    /\.split\(\s*(\/\\r\?\\n\/|["'`]\\r\\n["'`]|["'`]\\n["'`])\s*\)/.test(source);
  if (!rowSplitByHand) return [];
  return [...source.matchAll(/\.split\(\s*(["'`]),\1\s*\)/g)].map((m) => m[0]);
}
