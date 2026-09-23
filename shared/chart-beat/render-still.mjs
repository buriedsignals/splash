// twin/skills/chart-beat/scripts/render-still.mjs
//
// Runs inside a Splash root: uses `react-dom/server` and `@resvg/resvg-js` from the root's
// dependencies. Every other script in this twin is dependency-free; this one is not, and says so.
//
// RASTERISER: @resvg/resvg-js — decided on 2026-08-06 by running both candidates on the same
// SVG (a bold sans title, a muted sans source line, a serif label) and looking at the two PNGs.
// Both rendered the text correctly with this machine's fonts. resvg wins on prerequisites:
// a headless browser needs a Chrome that puppeteer could not find on a clean install
// ("Could not find Chrome (ver. 148...)"), and only worked once pointed at the system
// /Applications/Google Chrome.app — a prerequisite a journalist's laptop may not have, which
// the preflight would then have to ask for. resvg is a native module installed with the root,
// renders synchronously in milliseconds, and — the reason the seed can measure its gutters —
// exposes `getBBox()`, the real ink extent of rendered text.

import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
// THE FONT FILES, and they are the load-bearing half of every resvg call below. `typefaces.mjs` is
// carried beside this file (canonical: `shared/design-base/typefaces.mjs`) for the same reason
// `colour.mjs` is — a skill directory is copy-pasteable on its own and may import nothing outside
// itself.
import { fontFilesFor, fontFilesForSvg } from "./typefaces.mjs";
// THE COLOUR MATHS AND THE PALETTE READER live in `./colour.mjs`, carried beside every copy of this
// file and into `palette` and `newsroom-charter`, so the proposal, the charter and the render measure
// with one function. Re-exported here so nothing that imports them from this file changes.
import {
  HEX,
  channels,
  contrast,
  mix,
  readPalette,
  parsePalette,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
  LARGE_TEXT_CONTRAST_MIN,
  adjustToContrast,
  assertLegible,
} from "./colour.mjs";
export {
  contrast,
  readPalette,
  parsePalette,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
  LARGE_TEXT_CONTRAST_MIN,
  adjustToContrast,
  assertLegible,
};

/**
 * THE FONT STACK IN FORCE. The seed draws with it and `measureText` measures with it — if the two
 * ever disagree, every gutter in the chart is measured against a font nobody is looking at.
 *
 * It was a hard literal until 2026-08-10, in all 22 copies of this file, while
 * `newsroom-charter` MEASURED a newsroom's typefaces off its own site, `NEWSROOM.md` recorded
 * them and preflight read them back. That is exactly the failure `readPalette`'s own header names —
 * "an instruction to copy by eye, which is exactly how a newsroom's identity gets collected and
 * then never used" — left standing for type after it was removed for colour, in this same file.
 *
 * It is now a `let` that `useTypeface` reassigns from a recorded `TYPEFACE.md`, and ES module
 * exports are live bindings, so a component reading `FONT_FAMILY` inside its own render sees what
 * the runner resolved. Until a runner calls `useTypeface` this is the built-in default and
 * `activeTypeface().origin` says `default` — the honest word for "nobody chose this".
 *
 * EVERY RESVG CALL SITE BELOW NOW SAYS `loadSystemFonts: false` AND IS HANDED THE FILES. That is
 * the half of this that carries the weight, and it is worth saying why the opposite looks fine.
 * With `loadSystemFonts: true`, a face resvg cannot find is silently replaced by one the machine
 * happens to have: the PNG comes out looking right HERE and comes out in another typeface on a
 * newsroom's Linux box, with nothing anywhere going red. With it false, a face that was not handed
 * over draws NOTHING — which is loud, and which `a-render-without-its-files-draws-nothing.test.ts`
 * asserts directly, because a mechanism nobody can see fail is decoration.
 *
 * AND THE FILES ARE THE SAME ON BOTH SIDES. The measured defect this guards is not a missed COPY,
 * it is a missed CALL SITE inside one copy: the `measureText` probe and the rasteriser, and when
 * they disagree the paint gets one face while every gutter was measured in another — three static
 * beats clipped in ten places when that was simulated (`survey/typeface-feasibility.md` §4-B). So
 * `measureText`, `measureTextBand` and `rasterise` all resolve their files through the one function
 * (`fontFilesFor`/`fontFilesForSvg` in `typefaces.mjs`), off the family and weight actually asked
 * for. The face is fetched from Google Fonts on first use and cached outside the repository, so it
 * does not depend on what is installed here — the price `useTypeface` used to state is paid off.
 */
// Open Sans heads the stack because it is a Google Font — redistributable, fetchable, and one of
// the seventeen MapTiler serves as map glyphs — where Helvetica is a licensed face this render can
// no longer draw from. The rest of the stack is what a BROWSER falls back to in the web genre; the
// rasteriser reads only the first name.
const DEFAULT_FONT_FAMILY = "Open Sans, Helvetica, Arial, sans-serif";
export let FONT_FAMILY = DEFAULT_FONT_FAMILY;
let ACTIVE_TYPEFACE = {
  family: DEFAULT_FONT_FAMILY,
  origin: "default",
  source: "(the built-in default stack — nobody chose it)",
};


/**
 * Every colour in a beat except the accent comes from here, derived from the newsroom's own
 * ground. Nothing downstream is allowed to name a hex.
 *
 * `ink` is the pole — pure black or pure white — that MEASURES higher against this ground.
 * A luminance threshold (the obvious "> 0.5 means dark ink") is wrong on the mid-grey band:
 * on #808080 it chooses white at 3.95:1 over black at 5.32:1.
 *
 * `muted` starts at 62% of the way to the ink and escalates until it clears 4.5:1, so a
 * source line is readable on any ground. The escalation always terminates: the worse ground
 * for the better pole is L = 0.1791, where the pure pole still measures 4.58:1.
 *
 * `grid` is decoration, not text — it carries no contrast floor and must not shout.
 *
 * BOTH ARE DEFINED BY THEIR DIRECTION, WHICH IS THE GROUND'S — never by a lightness of their own.
 * `muted` and `grid` are steps from the ground TOWARD the ink pole, so on a light ground they come
 * out darker than the page and on a dark ground lighter than it. That is why the reserve — the
 * neutral a beat holds its non-subject material in — may not be described as "a lighter tone" or
 * "a grey": both name what happens on a white page, and on a dark ground the first is inverted and
 * the second is merely lucky. The dark-ground render is where that shows (`proof/palette-proof`:
 * the same script, one ground light and one `#12161C`, gives a grey source line in one and a
 * LIGHT-grey one in the other). Say "a step toward the ink", or say "recedes toward the ground" —
 * both hold on every ground a newsroom can record. `render-still.test.ts` asserts the direction on
 * both poles, so a change that always lightens goes red instead of shipping an inverted reserve.
 */
export function deriveFurniture(ground) {
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const ink = contrast("#000000", ground) >= contrast("#FFFFFF", ground) ? "#000000" : "#FFFFFF";
  let muted = ink;
  for (let step = 31; step <= 50; step++) {
    const candidate = mix(ground, ink, step / 50);
    if (contrast(candidate, ground) >= 4.5) {
      muted = candidate;
      break;
    }
  }
  return { ink, muted, grid: mix(ground, ink, 0.18) };
}

/**
 * CAN A READER TELL THESE TWO MARKS APART? Two measures, because one is not enough (the argument
 * and the measured numbers are in `seriesInks`'s own docblock, below).
 *
 * The hue measure is the "redmean" approximation — a weighted Euclidean distance in sRGB that
 * tracks perceived difference far better than a plain one and needs no colour-space conversion.
 * Its range is 0 to about 765.
 */
export function readApart(a, b) {
  const [r1, g1, b1] = channels(a);
  const [r2, g2, b2] = channels(b);
  const redmean = (r1 + r2) / 2;
  const distance = Math.sqrt(
    (2 + redmean / 256) * (r1 - r2) ** 2 +
      4 * (g1 - g2) ** 2 +
      (2 + (255 - redmean) / 256) * (b1 - b2) ** 2,
  );
  return contrast(a, b) >= 1.5 || distance >= 100;
}

/**
 * ONE INK PER SERIES, ALL OF THEM DERIVED FROM WHAT THE NEWSROOM RECORDED.
 *
 * Measured on 2026-08-10, before this existed: a multi-series beat built its fills as
 * `[accent, muted, muted]` — the house colour once and the furniture grey twice. A newsroom could
 * change its accent and two of three bands on a stacked bar would not move. `muted` is FURNITURE,
 * derived from the ground for axis labels and the source line; using it as a data ink means the
 * second and third series are drawn in a colour whose whole job is to recede.
 *
 * So: the recorded accents first, in the order the journalist recorded them — `accent` is the
 * primary and `accents` lists the rest, which is the same shape `NEWSROOM.md` uses. When a beat
 * needs more series than were recorded, further inks are DERIVED from those accents by walking
 * each a quarter, a half and three quarters of the way to the ink pole, and each derived one has
 * to earn its place twice: it clears the 3:1 mark floor against the ground, and it READS APART
 * from every ink already chosen.
 *
 * "Reads apart" is two measures, and it needs both. Measured on this tree's own accents:
 * `#0B7A75` and `#C1440E` sit at **1.01:1** against each other — a luminance test alone would
 * reject a newsroom's own two house colours as indistinguishable, which they plainly are not.
 * Conversely two shades of one hue differ only in lightness, and a hue test alone would let a
 * stacked bar ship two bands nobody can tell apart. So a candidate passes on EITHER a lightness
 * gap (1.5:1, which is what one quarter-step toward the ink measures — 1.51, 1.54, 1.55 across the
 * three rounds) or a hue gap (a redmean distance of 100 on a 0–765 scale; the teal/rust pair
 * measures 344, one quarter-step measures 62). Neither number is a WCAG floor and neither is
 * presented as one — the WCAG floor is the 3:1 against the GROUND, above.
 *
 * Three rounds means ONE recorded accent carries four series. When the walk cannot find enough it
 * THROWS and says how many were recorded against how many the beat asked for. It does not fall
 * back to grey. Recording a second accent in `PALETTE.md` is the answer, and that is a decision
 * for the newsroom rather than a default for this function.
 */
export function seriesInks(palette, count) {
  if (!palette || typeof palette !== "object" || !palette.ground || !palette.accent) {
    throw new Error(
      `seriesInks needs a parsed PALETTE record ({ground, accent, accents}), got ${JSON.stringify(palette)}`,
    );
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`seriesInks needs a positive series count, got ${JSON.stringify(count)}`);
  }
  const ground = palette.ground;
  const recorded =
    Array.isArray(palette.accents) && palette.accents.length > 0
      ? palette.accents
      : [palette.accent];
  const { ink } = deriveFurniture(ground);
  const chosen = recorded.slice(0, count);
  for (let round = 1; chosen.length < count && round <= 3; round++) {
    for (const accent of recorded) {
      if (chosen.length >= count) break;
      const candidate = mix(accent, ink, round / 4);
      const clearsTheFloor = contrast(candidate, ground) >= NON_TEXT_CONTRAST_MIN;
      const readsApart = chosen.every((taken) => readApart(taken, candidate));
      if (clearsTheFloor && readsApart) chosen.push(candidate);
    }
  }
  if (chosen.length < count) {
    throw new Error(
      `this beat draws ${count} series and ${palette.source || "the recorded palette"} holds ` +
        `${recorded.length} accent${recorded.length === 1 ? "" : "s"} (${recorded.join(", ")}). ` +
        `Shading them apart on ${ground} ran out at ${chosen.length}: the further shades either fell ` +
        `under the ${NON_TEXT_CONTRAST_MIN}:1 mark floor or read as one of the ones already chosen. ` +
        `Record more accents — accents: "#…, #…" beside accent: — rather than letting a series be ` +
        `drawn in a colour nobody chose.`,
    );
  }
  return chosen;
}

/**
 * THE RECORDED ANSWER FOR THE TYPEFACE — the same shape `PALETTE.md` has, for the same reason, and
 * read by the same kind of upward walk.
 *
 * `origin` records WHO chose, and it is the field that makes the collected-versus-imposed
 * distinction real. A newsroom's measured typefaces are collected in order to be PROPOSED to the
 * journalist, who chooses whether to use them; `newsroom` and `journalist` are choices, `default`
 * is the substrate's own stack, so "nobody chose this" is written down rather than looking like a
 * decision somebody made.
 */
export function readTypeface(dir, { stopAt } = {}) {
  const start = resolve(dir);
  const limit = stopAt ? resolve(stopAt) : null;
  const searched = [];
  let current = start;
  for (;;) {
    const candidate = join(current, "TYPEFACE.md");
    searched.push(candidate);
    if (existsSync(candidate)) return parseTypeface(readFileSync(candidate, "utf8"), candidate);
    if (limit && current === limit) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    `No TYPEFACE.md found for ${start}. Propose the newsroom's measured typefaces, let the ` +
      `journalist choose, and record the answer. Looked in:\n  ${searched.join("\n  ")}`,
  );
}

export function parseTypeface(text, source = "TYPEFACE.md") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${source} has no front matter`);
  const record = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    record[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  if (!record.family) throw new Error(`${source} is missing family`);
  if (!["newsroom", "journalist", "default"].includes(record.origin)) {
    throw new Error(
      `${source}: origin must be newsroom, journalist or default — got ${JSON.stringify(record.origin)}. ` +
        `It records WHO chose this typeface, and "default" is the honest word for nobody.`,
    );
  }
  return { family: record.family, origin: record.origin, source };
}

/** The first family in a stack — the one a render is actually asking for. */
export function requestedFamily(stack) {
  return stack.split(",")[0].replace(/^["']|["']$/g, "").trim();
}

/**
 * CAN THIS RENDER ACTUALLY SET THE FACE? The question changed with the answer, and the old one is
 * worth recording because it is the one everybody assumes.
 *
 * It used to be "does this MACHINE have the face", and it had to be measured obliquely
 * (`survey/typeface-feasibility.md` §1): resvg NEVER errors on a family it cannot find — it renders
 * happily in whatever it does have and there is no return value that says so. Chrome falls back
 * silently, Canvas `measureText` falls back silently, no substrate will ever tell us. So the probe
 * laid a string out in the requested family and in a family that exists nowhere and compared the
 * ink: identical ink meant both fell back.
 *
 * With `loadSystemFonts: false` the machine's own library is not in the picture at all, and the
 * question becomes a plain one with a plain answer: is there a FILE for this face. `typefaceFile`
 * either produces one — from the cache, or fetched from Google Fonts on first use — or refuses with
 * a sentence naming the family. Nothing is oblique and nothing is probabilistic.
 *
 * A newsroom's own licensed face, installed on this machine and nowhere else, no longer resolves
 * here. That is the deliberate trade: a beat that could only ever be rendered on one laptop was
 * never reproducible, and `skills/palette/scripts/typeface.mjs` still asks the machine question for
 * the PROPOSAL, where it is the right question.
 */
export function familyResolves(family) {
  try {
    return fontFilesFor(family).length > 0;
  } catch {
    return false;
  }
}

/**
 * Put a recorded typeface in force, or REFUSE. Nothing renders in a value nobody chose: a face
 * there is no file for is named, with where it was recorded, rather than silently substituted.
 *
 * THE OFFER CHANGED WITH THE MECHANISM, and the old wording would mislead. It used to be "we cannot
 * get Marr Sans on this machine; your charts will be set in the fallback — accept, or install it".
 * There is no fallback now (`loadSystemFonts` is off, so an unsupplied face draws nothing) and
 * installing it would not help (the render reads files this module fetches, not the font library).
 * The honest offer is: record a family Google serves, or record `origin: default` and accept the
 * substrate's own stack as a choice. Either way a journalist has CHOSEN. A silent stack has not.
 */
export function useTypeface(typeface) {
  if (!typeface || typeof typeface !== "object" || !typeface.family) {
    throw new Error(`useTypeface needs a parsed TYPEFACE record, got ${JSON.stringify(typeface)}`);
  }
  if (typeface.origin !== "default" && !familyResolves(typeface.family)) {
    throw new Error(
      `the typeface recorded in ${typeface.source} cannot be set by this render: there is no font ` +
        `file for ${JSON.stringify(requestedFamily(typeface.family))} — it is not a Google family, ` +
        `or the cache does not hold it and this machine has no network. With loadSystemFonts off, ` +
        `resvg would have drawn NOTHING rather than a fallback. Record a family Google serves ` +
        `(the design base's own ladders are seventeen of them), or record origin: default.`,
    );
  }
  ACTIVE_TYPEFACE = {
    family: typeface.family,
    origin: typeface.origin,
    source: typeface.source,
  };
  FONT_FAMILY = typeface.family;
  measured.clear();
  return ACTIVE_TYPEFACE;
}

export function activeTypeface() {
  return ACTIVE_TYPEFACE;
}

/** Every `font-family` an SVG declares. */
export function declaredFontFamilies(svg) {
  return [...new Set([...svg.matchAll(/font-family="([^"]*)"/g)].map((m) => m[1]))];
}

/**
 * REFUSE AN ELEMENT DRAWN IN A FAMILY THAT IS NOT THE ONE IN FORCE. The two resvg call sites in
 * this file cannot disagree with each other, but a COMPONENT can still disagree with both — by
 * snapshotting `FONT_FAMILY` into a module-level constant of its own, for instance, so that the
 * paint gets the old value while every gutter was measured in the new one. That is the §4-B defect
 * and it clips silently in the PNG, so it refuses here instead.
 *
 * It lives outside `renderStill` deliberately: `carried-copies.test.ts` holds every copy of
 * a SHARED function body across all 22 copies of this file, and a copy that gained a changed
 * `renderStill` while its siblings did not would be drift. A new function is a superset, which that
 * guard permits. `seed-reads-a-recorded-typeface.test.ts` is what makes sure the runners call it.
 */
export function assertDrawnInActiveTypeface(svg, { where = "the element" } = {}) {
  const wrong = declaredFontFamilies(svg).filter((f) => f !== ACTIVE_TYPEFACE.family);
  if (wrong.length > 0) {
    throw new Error(
      `${where} draws in ${JSON.stringify(wrong)} while the typeface in force is ` +
        `${JSON.stringify(ACTIVE_TYPEFACE.family)} (${ACTIVE_TYPEFACE.origin}, from ` +
        `${ACTIVE_TYPEFACE.source}). Every gutter in this frame was measured in the second, so the ` +
        `first would clip. Read FONT_FAMILY at render time rather than snapshotting it.`,
    );
  }
  return svg;
}

/**
 * AN ITALIC RUN IS MEASURED ON THE ITALIC FILE — the repair of a defect that was carried as a
 * deferral until 2026-09-13, and the reason both measuring functions take a `fontStyle`.
 *
 * THE DEFECT. Neither `measureText` nor `measureTextBand` used to take one, so the probe declared no
 * `font-style` and `fontFilesFor` was asked for the upright face only. An italic register was
 * measured in roman and drawn in italic, and every gutter sized from it was wrong by the difference
 * between the two faces' advances. Measured on the choropleth's own sea labels at 13px:
 * `Mer Méditerranée` is 7.15px narrower in Open Sans Italic than in the roman (−6.5%), 7.21px in
 * Merriweather (−6.4%) — and 1.69px WIDER in Montserrat Italic (+1.5%). The sign is what makes it
 * load-bearing: where the italic is wider, a box built from the roman measure UNDER-states the word
 * and an overlap guard built on it cannot see a collision that is really there.
 *
 * WHY IT COULD BE REPAIRED NOW WITHOUT TOUCHING 350 CALL SITES. `fontStyle` is an OPTIONAL key on an
 * options object that already existed, defaulting to `normal`, and the probe declares the attribute
 * only when it is `italic` — so every existing call measures exactly the bytes it measured before.
 * `fontFilesFor` has taken `styles` since the Google Fonts move; nothing new had to be fetched.
 *
 * It is validated rather than passed through: `oblique`, `Italic`, or a typo would otherwise reach
 * `fontFilesFor` as a style with no face and be silently dropped back to the upright — which is the
 * same silence, one layer down.
 */
function styleOf(value, who) {
  if (value === undefined || value === null) return "normal";
  if (value !== "normal" && value !== "italic")
    throw new Error(
      `${who}'s options.fontStyle must be "normal" or "italic", got ${JSON.stringify(value)} — an ` +
        `unknown style resolves to no font file and is drawn upright with nothing to say so`,
    );
  return value;
}

/** BELT, WITH THE BRACES BESIDE IT — and stated as such rather than left to look load-bearing.
 *  The face is really selected by `styles: [fontStyle]` in the `fontFilesFor` call below: with
 *  `loadSystemFonts: false` the italic file is the ONLY one in resvg's database, so it would be
 *  drawn even with no attribute (measured: removing this line alone changes no number today). What
 *  the attribute buys is that the probe MATCHES that face instead of FALLING BACK to it, which is
 *  the distinction this repository refuses to leave implicit anywhere else — and it is what keeps
 *  the measurement right the day the file set carries both cuts. */
const styleAttr = (fontStyle) => (fontStyle === "italic" ? ` font-style="italic"` : "");

const measured = new Map();

/**
 * The rendered width of a string, in the font it will actually be drawn in — resvg lays the
 * text out and reports the ink box. This is what a measured gutter is measured with; a fixed
 * constant here is the defect this function exists to remove.
 *
 * The second argument is an OPTIONS OBJECT, `{ fontSize, fontWeight?, fontFamily?, fontStyle? }` —
 * never a bare number. A caller that passes a number, or omits `fontSize` from the object, does not error
 * at the call site: destructuring a missing key just yields `undefined`, which resvg's own SVG
 * parser then defaults away silently, laying the text out at whatever size resvg picks rather
 * than the one the caller meant. Measured, not assumed: `measureText("Solar 7.2 %", 40)` and
 * `measureText("Solar 7.2 %", { fontSize: 40 })` used to return 61.58 and 205.27 respectively —
 * a 3.3x gap with no error anywhere between them. This function's entire purpose is that a gutter
 * is MEASURED, not guessed; a wrong measurement clips, silently, in the rendered PNG, so a
 * malformed call throws here rather than returning a plausible small number.
 */
export function measureText(text, options) {
  if (!text) return 0;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(
      `measureText's second argument must be an options object shaped { fontSize, fontWeight?, fontFamily?, fontStyle? }, got ${JSON.stringify(options)} (${typeof options})`,
    );
  }
  const { fontSize, fontWeight = 400, fontFamily = FONT_FAMILY } = options;
  const fontStyle = styleOf(options.fontStyle, "measureText");
  if (typeof fontSize !== "number" || !Number.isFinite(fontSize)) {
    throw new Error(
      `measureText's options.fontSize must be a finite number, got ${JSON.stringify(fontSize)} — a missing fontSize silently defaults to resvg's own size and under-measures`,
    );
  }
  const key = `${fontFamily}|${fontWeight}|${fontStyle}|${fontSize}|${text}`;
  if (measured.has(key)) return measured.get(key);
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="400">` +
    `<text x="0" y="300" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}"${styleAttr(fontStyle)}>${escaped}</text>` +
    `</svg>`;
  const box = new Resvg(probe, {
    font: { loadSystemFonts: false, fontFiles: fontFilesFor(fontFamily, { weights: [fontWeight], styles: [fontStyle] }) },
  }).getBBox();
  const width = box ? box.x + box.width : 0;
  measured.set(key, width);
  return width;
}

/**
 * The rendered VERTICAL extent of a string in the font it will really be drawn in: how far its
 * glyphs rise above the baseline and fall below it, measured by resvg's own ink box — the same
 * instrument, and the same probe, `measureText` uses for the horizontal answer.
 *
 * A centre-gutter label needs this axis because what has to be kept clear of it is vertical: the
 * age pyramid's zero spine ran straight through all 21 of its band labels, so "85-89" read
 * "85+89" (`proof/static-swiss-age-pyramid`, and the same defect repaired next door in
 * `proof/vidy-pyramid-niger-population/PyramidVideo.tsx`). A ratio-of-fontSize constant would be a
 * magic number standing where a measurement belongs: "0-4" and "100+" carry no descenders at all,
 * and a clearance sized for a hypothetical "g" is a gap nobody asked for.
 *
 * Same options object — `fontStyle` included, for the same reason — and the same throw on a bare
 * number. See `measureText`.
 */
export function measureTextBand(text, options) {
  if (!text) return { ascent: 0, descent: 0 };
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(
      `measureTextBand's second argument must be an options object shaped { fontSize, fontWeight?, fontFamily?, fontStyle? }, got ${JSON.stringify(options)} (${typeof options})`,
    );
  }
  const { fontSize, fontWeight = 400, fontFamily = FONT_FAMILY } = options;
  const fontStyle = styleOf(options.fontStyle, "measureTextBand");
  if (typeof fontSize !== "number" || !Number.isFinite(fontSize)) {
    throw new Error(
      `measureTextBand's options.fontSize must be a finite number, got ${JSON.stringify(fontSize)} — a missing fontSize silently defaults to resvg's own size and under-measures`,
    );
  }
  const key = `band|${fontFamily}|${fontWeight}|${fontStyle}|${fontSize}|${text}`;
  if (measured.has(key)) return measured.get(key);
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const baseline = 300;
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="600">` +
    `<text x="0" y="${baseline}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}"${styleAttr(fontStyle)}>${escaped}</text>` +
    `</svg>`;
  const box = new Resvg(probe, {
    font: { loadSystemFonts: false, fontFiles: fontFilesFor(fontFamily, { weights: [fontWeight], styles: [fontStyle] }) },
  }).getBBox();
  const band = box
    ? { ascent: baseline - box.y, descent: box.y + box.height - baseline }
    : { ascent: fontSize * 0.72, descent: fontSize * 0.08 };
  measured.set(key, band);
  return band;
}

/**
 * Render one React element to an SVG on disk and a PNG beside it. The PNG is the artifact the
 * checklist is applied to — the SVG is kept because a defect is easier to read in the markup.
 */
/**
 * NOTHING DRAWN IS CLIPPED BY ITS OWN FRAME.
 *
 * `sizes.mjs`'s `assertWithinStage` refuses a `<text>` baseline outside the band a portrait
 * reserves. That is one axis, mechanically checked; the other had nothing, and a beat shipped with
 * its title cut off at the right edge and its source line missing its year while this file happily
 * measured the contrast of both. A journalist opening the PNG was the only control there was.
 *
 * What is held here is the FRAME's invariant, not a design's. A gutter is a choice a beat makes and
 * this has no business having an opinion about it; a string running off the canvas is never a
 * choice. So the rule is only: the ink box of every drawn string lies inside [0, width].
 *
 * Skipped deliberately, in the same shape as the stage guard above: a `<text>` carrying a
 * `transform`, because a rotated string's box is not its advance width. `text-anchor` is read,
 * because an end-anchored label legitimately sits at an x its own width exceeds.
 */
/** The glyphs an XML text node stands for — entities decoded, so a width is measured on what a
 * reader sees rather than on the escape that encodes it. */
function unescapeXml(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * The offsets in this file's `x` attributes are the frame's own only while nothing above has moved
 * them. A `<g transform="translate(372,32)">` — which every baked map plate draws inside — puts its
 * children in a coordinate space this guard cannot reach with a regex, and measuring their raw `x`
 * reported labels running from −83 to −15 on a beat that draws them perfectly well. So the spans of
 * the document that sit under a transformed group are marked, and text inside them is left alone,
 * exactly as text carrying its own `transform` is.
 */
function transformedSpans(svg) {
  const spans = [];
  let depth = 0;
  let openedAt = -1;
  for (const m of svg.matchAll(/<(\/?)g\b([^>]*)>/g)) {
    const closing = m[1] === "/";
    if (closing) {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && openedAt >= 0) {
          spans.push([openedAt, m.index + m[0].length]);
          openedAt = -1;
        }
      }
      continue;
    }
    if (m[2].endsWith("/")) continue;
    if (depth > 0) depth += 1;
    else if (/transform="/.test(m[2])) {
      depth = 1;
      openedAt = m.index;
    }
  }
  return spans;
}

/**
 * THE VERTICAL SIBLING OF `assertWithinFrame`, and it did not exist.
 *
 * Measured 2026-09-23, rendering a real story's static beat at landscape and at square for the
 * first time: the source line's baseline landed at y = 1080 in a 1080-high frame, so the words were
 * cut through the middle and the credit was unreadable. Nothing refused it. `assertWithinStage`
 * covers this only for PORTRAIT, whose row reserves a safe band, and only for beats that call it
 * themselves — 30-odd catalogue beats do, and a journalist's new beat does not. So the one size a
 * story had exercised was guarded and the two it had not were not.
 *
 * A baseline sits at the FOOT of the glyphs: the ink runs from roughly one cap-height above it down
 * to its descender. 0.75 and 0.25 of the font size are the conventional ratios and are used rather
 * than measured, because being generous makes this refuse LESS, never more.
 *
 * SAME STATED LIMITS as its horizontal sibling: it reads `<text>` baselines, so it sees where WORDS
 * are and not where a MARK is; rotated runs and runs inside a transformed group are skipped, and a
 * beat that leans on them is told this guard went quiet rather than green.
 */
/**
 * TWO LINES THAT LAND ON EACH OTHER, and nothing in this tree looked for them.
 *
 * `assertWithinFrame` checks a run against the frame's sides and `assertWithinHeight` against its
 * top and foot. Neither asks whether two runs occupy the same pixels, and a plate whose closing
 * block is laid out in two halves — one positioned from the plot above it, one from the credit
 * below — will eventually put them in the same place. Measured 2026-09-23 on a real story's still:
 * "5.7× less than Romania alone" at y=1174.8 and "85% of the EU's 30,001 reported cases" at
 * y=1182.0, seven pixels apart at 36px, printed one through the other. The render reported success
 * and every other guard was green.
 *
 * TWO RUNS COLLIDE WHEN THEIR INK OVERLAPS ON BOTH AXES. The vertical band is the same cap-height
 * and descender the height guard uses; the horizontal one is measured, so two columns side by side
 * at the same height are not a collision and are not reported.
 *
 * ONE WORD DRAWN TWICE IS NOT TWO WORDS COLLIDING. The tree haloes a label by drawing it as a
 * stroke and again as a fill at the same coordinates. The first sweep reported 42 of 118 delivered
 * SVGs, and every pair at a perfect overlap was exactly that — a guard that refused the tree's own
 * halo would have been useless. A pair with the same words at the same place is one run.
 *
 * THE THRESHOLD IS MEASURED, NOT CHOSEN. Swept over the 118 delivered stills with haloes excluded,
 * the worst overlap anything already shipped carries is 0.27 — adjacent lines set tight, which is
 * typography and not a defect. The collision this guard was written from overlapped 0.80 of its own
 * type. A half is clear of the first by a wide margin and clear of the second by a wider one.
 *
 * SAME STATED LIMITS as its siblings: `<text>` baselines only, so it sees where WORDS are and not
 * where a MARK is, and rotated or transformed runs are skipped and counted in the refusal.
 */
/**
 * A PLATE THAT DRAWS MARKS NOBODY CAN SEE HAS TO SAY HOW MANY IT DREW.
 *
 * A still has no clock and no reader input, so everything it owes is on it at once — and the thing
 * that makes it the hardest of the four is that it must choose ONE scale. On a concentrated ranking
 * that choice turns most of the data into a hairline: this beat's first cut drew twenty-seven bars
 * of which twenty-five were three pixels, printed two country names, and left the rest to a phrase.
 * The owner's words for it were "trop condensé, pas expliqué, sans précision", and no guard in this
 * tree disagreed with the render.
 *
 * WHAT IS REFUSED IS NOT THE CONDENSATION. A concentration IS the claim on a beat like this one, and
 * a scale that flattens the tail is the honest way to draw it; a log scale would make the tail
 * readable and lie about the shape. What is refused is drawing marks a reader cannot see and saying
 * nothing about them. A plate that brackets them and prints their COUNT — "and 15 more, 271 between
 * them" — has told the reader exactly what it could not draw, and that sentence is what this looks
 * for: the number of invisible marks, as a numeral, in some run of the plate's own words.
 *
 * THE THRESHOLDS ARE MEASURED, AND THERE ARE TWO, because a share alone cannot tell a tail from a
 * small chart. Swept over the 68 delivered plates that draw four or more rect marks: the most any
 * of them hides is 50 %, and that is `static-carbon-footprint-spread` hiding four of eight — four
 * marks are not a tail anyone expects to read. Nothing else exceeds 37 %. So: MORE than half of the
 * marks, AND at least eight of them. The plate this guard was written from hid seventeen of
 * twenty-seven.
 *
 * STATED LIMITS, because a guard whose reach is unstated gets trusted past it: it measures `<rect>`
 * marks only, so a beat drawn with circles, paths or a map's own geometry is not seen here at all,
 * and a plate whose marks are all one size has no varying dimension and is skipped. Both are
 * reported as skips rather than passes.
 */
export function assertPlateSaysWhatItCannotDraw(svg, { what = "this render", most = 0.5, atLeast = 8 } = {}) {
  const frame = {
    width: Number(/width="([\d.]+)"/.exec(svg)?.[1] ?? 0),
    height: Number(/height="([\d.]+)"/.exec(svg)?.[1] ?? 0),
  };
  if (!(frame.width > 0 && frame.height > 0)) return { measured: false, why: "the frame has no size" };
  const rects = [...svg.matchAll(/<rect\b([^>]*)\/?>/g)]
    .map((m) => ({
      width: Number(/\bwidth="([\d.]+)"/.exec(m[1])?.[1] ?? 0),
      height: Number(/\bheight="([\d.]+)"/.exec(m[1])?.[1] ?? 0),
    }))
    .filter((r) => r.width > 0 && r.height > 0);
  // The ground is the rect that covers the frame; the marks are everything smaller.
  const marks = rects.filter(
    (r) => !(r.width >= frame.width * 0.99 && r.height >= frame.height * 0.99),
  );
  if (marks.length < 4) return { measured: false, why: `${marks.length} rect mark(s): too few to read a shape from` };

  const widths = marks.map((m) => m.width);
  const heights = marks.map((m) => m.height);
  const spread = (xs) => Math.max(...xs) - Math.min(...xs);
  const varying = spread(widths) >= spread(heights) ? widths : heights;
  if (spread(varying) <= 0) return { measured: false, why: "every mark is the same size: no varying dimension" };

  // Four pixels on a 1080-wide plate, scaled to whatever this one is.
  const floor = frame.width * 0.004;
  const invisible = varying.filter((v) => v <= floor).length;
  const share = invisible / marks.length;
  // TWO TESTS, AND BOTH HAVE TO HOLD, because a share alone cannot tell a tail from a small chart.
  // `proof/static-carbon-footprint-spread` hides four of its eight marks — half, and the most of
  // anything delivered — and four marks are not a tail a reader expects to read. The plate this
  // guard was written from hid seventeen of twenty-seven.
  if (share <= most || invisible < atLeast)
    return { measured: true, marks: marks.length, invisible, share };

  const words = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => unescapeXml(m[1].replace(/<[^>]*>/g, "")))
    .join(" ");
  // A PLATE WRITES A COUNT THE WAY A READER DOES, so the separators come out before the number is
  // looked for: "2,000" and "2 000" and "2\u202f000" are all the same count.
  const plain = words.replace(/[\u202f\u00a0,](?=\d)/g, "");
  const said = new RegExp(`\\b${invisible}\\b`).test(plain);
  if (said) return { measured: true, marks: marks.length, invisible, share, accountedFor: true };

  throw new Error(
    `${what} draws ${invisible} of its ${marks.length} marks at ${Math.round(floor)}px or less — ` +
      `${Math.round(share * 100)}% of the data is a hairline — and says nowhere how many that is. ` +
      "The concentration may well BE the claim, and flattening the tail may well be the honest way " +
      "to draw it; what a plate cannot do is draw marks a reader cannot see and leave them " +
      "unaccounted for. Bracket them and print their count — \"and 15 more, 271 between them\" — " +
      "or name and number the rows that fit and bracket only the rest. A still has no clock and no " +
      "reader to ask; everything it owes is on it at once.",
  );
}

export function assertNoOverlappingText(svg, { what = "this render", most = 0.5 } = {}) {
  const runs = [];
  let skipped = 0;
  const moved = transformedSpans(svg);
  const isMoved = (at) => moved.some(([from, to]) => at >= from && at < to);
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    if (/transform="/.test(attrs) || isMoved(m.index)) {
      skipped += 1;
      continue;
    }
    const x = Number(/\bx="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    const y = Number(/\by="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    const fontSize = Number(/font-size="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0);
    const words = unescapeXml(m[2].replace(/<[^>]*>/g, "")).trim();
    if (!Number.isFinite(x) || !Number.isFinite(y) || !fontSize || !words) continue;
    const fontWeight = Number(/font-weight="(\d+)"/.exec(attrs)?.[1] ?? 400);
    const drawn = measureText(words, { fontSize, fontWeight });
    const anchor = /text-anchor="(start|middle|end)"/.exec(attrs)?.[1] ?? "start";
    const left = anchor === "middle" ? x - drawn / 2 : anchor === "end" ? x - drawn : x;
    runs.push({
      words,
      fontSize,
      left,
      right: left + drawn,
      top: y - fontSize * 0.75,
      bottom: y + fontSize * 0.25,
      y,
    });
  }
  const hits = [];
  for (let i = 0; i < runs.length; i++)
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i];
      const b = runs[j];
      // One run haloed: the same words at the same place, drawn twice.
      if (a.words === b.words && Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1) continue;
      const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (across <= 0 || down <= 0) continue;
      const share = Math.min(
        across / Math.min(a.right - a.left, b.right - b.left),
        down / Math.min(a.fontSize, b.fontSize),
      );
      if (share > most)
        hits.push(
          `"${a.words.slice(0, 32)}" (baseline ${Math.round(a.y)}, ${a.fontSize}px) and ` +
            `"${b.words.slice(0, 32)}" (baseline ${Math.round(b.y)}) share ` +
            `${Math.round(across)}x${Math.round(down)}px of ink (${(share * 100).toFixed(0)}% of the smaller run)`,
        );
    }
  if (hits.length)
    throw new Error(
      `${what} prints ${hits.length} pair(s) of words through each other: ${hits.slice(0, 3).join("; ")}` +
        (hits.length > 3 ? `, and ${hits.length - 3} more` : "") +
        ". Lay the block out from ONE baseline and step by the register's own lead, so two lines " +
        "cannot land on each other rather than merely being unlikely to" +
        (skipped ? ` (${skipped} rotated or transformed run(s) were not measured)` : ""),
    );
}

export function assertWithinHeight(svg, height, { what = "this render" } = {}) {
  const outside = [];
  let skipped = 0;
  const moved = transformedSpans(svg);
  const isMoved = (at) => moved.some(([from, to]) => at >= from && at < to);
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    if (/transform="/.test(attrs) || isMoved(m.index)) {
      skipped += 1;
      continue;
    }
    const y = Number(/\by="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    const fontSize = Number(/font-size="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0);
    const words = unescapeXml(m[2].replace(/<[^>]*>/g, "")).trim();
    if (!Number.isFinite(y) || !fontSize || !words) continue;
    const top = y - fontSize * 0.75;
    const bottom = y + fontSize * 0.25;
    if (top < 0 || bottom > height)
      outside.push(
        `"${words.slice(0, 40)}" at ${fontSize}px runs from ${Math.round(top)} to ${Math.round(bottom)}`,
      );
  }
  if (outside.length)
    throw new Error(
      `${what} draws words outside its own ${height}px frame: ${outside.join("; ")}. A baseline at ` +
        "the frame's foot is a line cut through the middle, and a cut credit is an attribution " +
        "failure rather than a cosmetic one. Lay the block out from the height this size actually " +
        "has — `sizeFor(size)` — instead of from the one the beat was first drawn at" +
        (skipped ? ` (${skipped} rotated or transformed run(s) were not measured)` : ""),
    );
}

export function assertWithinFrame(svg, width, { what = "this render" } = {}) {
  const outside = [];
  const moved = transformedSpans(svg);
  const isMoved = (at) => moved.some(([from, to]) => at >= from && at < to);
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    if (/transform="/.test(attrs) || isMoved(m.index)) continue;
    const x = Number(/\bx="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    const fontSize = Number(/font-size="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0);
    // The MARKUP is not the string a reader sees. `&#x27;` is six characters here and one glyph on
    // the page, and measuring the escape rather than the apostrophe reported a title 125px wider
    // than it draws — which is how this guard's own first sweep produced false positives on beats
    // that fit perfectly well.
    const words = unescapeXml(m[2].replace(/<[^>]*>/g, "")).trim();
    if (!Number.isFinite(x) || !fontSize || !words) continue;
    const fontWeight = Number(/font-weight="(\d+)"/.exec(attrs)?.[1] ?? 400);
    const drawn = measureText(words, { fontSize, fontWeight });
    const anchor = /text-anchor="(start|middle|end)"/.exec(attrs)?.[1] ?? "start";
    const left = anchor === "middle" ? x - drawn / 2 : anchor === "end" ? x - drawn : x;
    const right = left + drawn;
    if (left < 0 || right > width) {
      outside.push(
        `"${words.slice(0, 40)}" at ${fontSize}px runs from ${Math.round(left)} to ${Math.round(right)}`,
      );
    }
  }
  if (outside.length > 0) {
    throw new Error(
      `${what} draws text past its own frame, which is ${width}px wide: ${outside.join("; ")}`,
    );
  }
  return svg;
}

export async function renderStill({
  element,
  width,
  height,
  outDir,
  name,
  // HOW MANY DEVICE PIXELS PER FRAME PIXEL, and it is a migration rather than a preference.
  //
  // The frame IS the export size and it should be rasterised 1:1. Task 0 of the export-size spec
  // measured that: resvg is a VECTOR rasteriser, so a 1920x1080 frame at 1x and a 960x540 frame at
  // 2x are indistinguishable in their TYPE, and what actually differs is that at 2x every
  // `strokeWidth` and `strokeDasharray` DOUBLES — a component asking for a 1px gridline is
  // delivered a 2px one, and a `"6 4"` dash arrives as `"12 8"`. The rasteriser was taking a design
  // decision the component believed it had taken.
  //
  // The default stays 2 because the un-migrated statics are still drawn at 900x560 and its
  // neighbours, and retiring it for them would ship 900px stills. A beat that pins an export size
  // passes 1, and its delivered PNG then measures exactly what gate 2c chose. The remaining count
  // is held by `splash/test/delivered-size-matches-the-pin.test.ts` as a number that may only
  // go down — an inconsistency with a ratchet on it rather than an inconsistency.
  scale = 2,
}) {
  const svg = renderToStaticMarkup(element);
  if (!svg.startsWith("<svg")) throw new Error(`renderStill expects an element whose root is <svg>, got ${svg.slice(0, 40)}`);

  // The element declares its own frame. Rasterising at another width would silently scale the
  // chart — every measured gutter would still be correct, and every font size would be a lie.
  const drawn = { width: Number(svg.match(/\bwidth="(\d+(?:\.\d+)?)"/)?.[1]), height: Number(svg.match(/\bheight="(\d+(?:\.\d+)?)"/)?.[1]) };
  if (drawn.width !== width || drawn.height !== height) {
    throw new Error(`asked to render at ${width}x${height}, but the element is drawn at ${drawn.width}x${drawn.height}`);
  }

  assertWithinFrame(svg, width, { what: `the render named ${JSON.stringify(name)}` });
  assertWithinHeight(svg, height, { what: `the render named ${JSON.stringify(name)}` });
  assertNoOverlappingText(svg, { what: `the render named ${JSON.stringify(name)}` });
  assertPlateSaysWhatItCannotDraw(svg, { what: `the render named ${JSON.stringify(name)}` });

  await mkdir(outDir, { recursive: true });
  const svgPath = join(outDir, `${name}.svg`);
  const pngPath = join(outDir, `${name}.png`);
  await writeFile(svgPath, svg);
  await writeFile(pngPath, rasterise(svg, width, scale));
  return { svgPath, pngPath };
}

/** `scale` device pixels per frame pixel — see `renderStill`, where the default is argued. */
function rasterise(svg, width, scale = 2) {
  const image = new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: fontFilesForSvg(svg) },
    fitTo: { mode: "width", value: width * scale },
  }).render();
  return image.asPng();
}
