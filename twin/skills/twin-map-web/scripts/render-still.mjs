// twin/skills/twin-chart-beat/scripts/render-still.mjs
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

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The one font stack. The seed draws with it and `measureText` measures with it — if the two
 *  ever disagree, every gutter in the chart is measured against a font nobody is looking at. */
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** WCAG 2.x relative luminance. */
function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours, 1..21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(ground, toward, ratio) {
  const target = channels(toward);
  return (
    "#" +
    channels(ground)
      .map((v, i) => Math.round(v + (target[i] - v) * ratio).toString(16).padStart(2, "0"))
      .join("")
  );
}

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

const measured = new Map();

/**
 * The two colours a beat is drawn in — the ground and the one accent that carries the argument —
 * read back from the decision the journalist actually made.
 *
 * This lives HERE, beside `deriveFurniture`, rather than in `twin-palette` where it is proposed: a
 * beat already imports this module to render at all, and a second import path for two colours is
 * one more thing to get wrong. `twin-palette` owns the question; this owns the answer. The two
 * copies are the deliberate kind, guarded against drift by `helper-parity.test.ts`.
 *
 * Looks for `PALETTE.md` in `dir`, then in each ancestor up to `stopAt` — so one decision recorded
 * at the story root serves every beat under it, and a beat that genuinely needs its own can hold
 * one beside its data.
 *
 * This is a LOOKUP path, never a colour fallback. A search that finds nothing THROWS, naming every
 * directory it looked in. That is the point: a render that quietly defaulted to black-on-white
 * would publish a chart in a colour nobody chose, and it would look deliberate. Before this
 * existed, every beat named its colours as hex literals with a `// from NEWSROOM.md` comment
 * beside them — an instruction to copy by eye, which is exactly how a newsroom's identity gets
 * collected and then never used.
 */
export function readPalette(dir, { stopAt } = {}) {
  const start = resolve(dir);
  const limit = stopAt ? resolve(stopAt) : null;
  const searched = [];
  let current = start;
  for (;;) {
    const candidate = join(current, "PALETTE.md");
    searched.push(candidate);
    if (existsSync(candidate)) return parsePalette(readFileSync(candidate, "utf8"), candidate);
    if (limit && current === limit) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    `No PALETTE.md found for ${start}. Run twin-palette's proposal, let the journalist choose, ` +
      `and record the answer. Looked in:\n  ${searched.join("\n  ")}`,
  );
}

export function parsePalette(text, source = "PALETTE.md") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${source} has no front matter`);
  const record = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    record[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  for (const field of ["ground", "accent"]) {
    if (!record[field]) throw new Error(`${source} is missing ${field}`);
    if (!HEX.test(record[field])) {
      throw new Error(`${source}: ${field} must be #rrggbb, got ${JSON.stringify(record[field])}`);
    }
  }
  if (!["newsroom", "subject", "journalist"].includes(record.origin)) {
    throw new Error(
      `${source}: origin must be newsroom, subject or journalist — got ${JSON.stringify(record.origin)}. ` +
        `It records WHO chose these colours, and a render is allowed to say so.`,
    );
  }
  const further = String(record.accents ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  for (const hex of further) {
    if (!HEX.test(hex)) {
      throw new Error(
        `${source}: every entry in accents must be #rrggbb, got ${JSON.stringify(hex)}. ` +
          `accents lists the FURTHER house colours beside the primary one, comma-separated.`,
      );
    }
  }
  const all = [record.accent, ...further];
  const accents = all.filter((hex, index) => all.indexOf(hex) === index);
  for (const hex of accents) {
    assertLegible(hex, record.ground, {
      role: "mark",
      where: `${source}: the accent ${hex}`,
    });
  }
  return {
    ground: record.ground,
    accent: record.accent,
    accents,
    origin: record.origin,
    source,
  };
}

/**
 * THE TWO FLOORS, AND WHY THEY ARE NOT ONE NUMBER.
 *
 * WCAG sets two different minimums for two different things, and collapsing them is the mistake
 * that looks like rigour (`twin-palette/references/contrast-floors.md` argues it at length):
 *
 *   - `mark` — 3:1, SC 1.4.11 Non-text Contrast. The visual information a reader identifies a
 *     GRAPHICAL OBJECT by: the line, the bar, the circle, a choropleth class against the ground.
 *     An accent carries no text, and holding it to a text threshold rejects perfectly legible
 *     house colours for failing a criterion they were never subject to.
 *   - `text` — 4.5:1, SC 1.4.3 Contrast (Minimum). Words.
 *   - `largeText` — 3:1, the same criterion's own relaxation for 24px, or 18.66px bold, or larger.
 *     It is a relaxation of the TEXT rule, not the mark rule, and it exists here so a caller who
 *     needs it names it rather than reaching for `mark` because the number happens to match.
 */
export const NON_TEXT_CONTRAST_MIN = 3;
export const TEXT_CONTRAST_MIN = 4.5;
export const LARGE_TEXT_CONTRAST_MIN = 3;

/**
 * The nearest variant of `colour` that clears `min` against `ground`, found by walking it toward
 * whichever pole the ground is NOT — darkening on a light ground, lightening on a dark one — in 2%
 * steps and stopping at the first step that passes.
 *
 * It returns a REMEDY, never a replacement. Nothing in this file ever swaps it in: a render that
 * quietly substituted the nearest passing colour would put a hex nobody chose into a published
 * chart, and the journalist, seeing a colour that is not their brand, would have no way to learn
 * why. It is shown in the refusal so the answer is one edit away.
 *
 * A verbatim duplicate of `twin-palette/scripts/palette.mjs`'s, deliberately — that skill owns the
 * question and this file owns the answer, and neither imports the other. `helper-parity.test.ts`
 * compares them over a table of colours and grounds.
 *
 * Returns `null` when no step passes. Measured over 4352 grounds in `twin-palette`: zero nulls at
 * 3:1, zero at 4.5, the first at 5 — so the branch is for a caller who raises the floor, not for a
 * ground that defeats the default.
 */
export function adjustToContrast(colour, ground, min = NON_TEXT_CONTRAST_MIN) {
  if (!HEX.test(colour)) throw new Error(`colour must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const towards = luminance(ground) > 0.18 ? "#000000" : "#FFFFFF";
  for (let step = 1; step <= 50; step++) {
    const candidate = mix(colour, towards, step / 50);
    if (contrast(candidate, ground) >= min) return candidate;
  }
  return null;
}

/**
 * REFUSE A COLOUR A READER CANNOT SEE, AND SAY WHAT WAS MEASURED.
 *
 * `twin-palette`'s proposal measures every option it offers and never recommends one that fails.
 * That is the first line, and it is the only one that existed until now — measured on 2026-08-10,
 * a `PALETTE.md` recording `accent: "#FFFF00"` on `ground: "#FFFFFF"` (1.07:1) rendered a clean
 * PNG with no warning at all, the beat's whole number set in yellow on white.
 *
 * A `PALETTE.md` can be written by hand, copied from another story, or produced by a path that
 * never asked — `twin-newsroom-charter` proposes a `brandColor` and a `ground` off a newsroom's
 * own site. So the floor is measured HERE too, where the colour meets the render, and the refusal
 * names the ratio, the floor, the criterion it comes from and the nearest colour that clears it.
 *
 * It refuses rather than adjusts, for the reason `adjustToContrast` states above.
 */
export function assertLegible(colour, against, { role = "mark", where = "this colour" } = {}) {
  const floors = {
    mark: {
      min: NON_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.11 Non-text Contrast",
      governs: "a graphical object a reader identifies the data by",
    },
    text: {
      min: TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum)",
      governs: "text",
    },
    largeText: {
      min: LARGE_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum), large-text relaxation",
      governs: "text at 24px, or 18.66px bold, or larger",
    },
  };
  const floor = floors[role];
  if (!floor) {
    throw new Error(
      `assertLegible: role must be mark, text or largeText — got ${JSON.stringify(role)}. ` +
        `The floors differ by criterion, so the caller has to say which one it is asking about.`,
    );
  }
  if (!HEX.test(colour)) throw new Error(`${where} must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(against)) {
    throw new Error(
      `${where} is read against ${JSON.stringify(against)}, which is not #rrggbb`,
    );
  }
  const ratio = contrast(colour, against);
  if (ratio >= floor.min) return ratio;
  const remedy = adjustToContrast(colour, against, floor.min);
  throw new Error(
    `${where}: ${colour} on ${against} measures ${ratio.toFixed(2)}:1 — under the ${floor.min}:1 ` +
      `floor ${floor.criterion} sets for ${floor.governs}. A reader cannot see it. ` +
      (remedy
        ? `The nearest variant that clears the floor is ${remedy}, at ${contrast(remedy, against).toFixed(2)}:1 — ` +
          `record that, or another colour, or a ground it can be read on.`
        : `No variant of it clears that floor on this ground: choose another colour, or another ground.`),
  );
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
 * The rendered width of a string, in the font it will actually be drawn in — resvg lays the
 * text out and reports the ink box. This is what a measured gutter is measured with; a fixed
 * constant here is the defect this function exists to remove.
 *
 * The second argument is an OPTIONS OBJECT, `{ fontSize, fontWeight?, fontFamily? }` — never a
 * bare number. A caller that passes a number, or omits `fontSize` from the object, does not error
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
      `measureText's second argument must be an options object shaped { fontSize, fontWeight?, fontFamily? }, got ${JSON.stringify(options)} (${typeof options})`,
    );
  }
  const { fontSize, fontWeight = 400, fontFamily = FONT_FAMILY } = options;
  if (typeof fontSize !== "number" || !Number.isFinite(fontSize)) {
    throw new Error(
      `measureText's options.fontSize must be a finite number, got ${JSON.stringify(fontSize)} — a missing fontSize silently defaults to resvg's own size and under-measures`,
    );
  }
  const key = `${fontFamily}|${fontWeight}|${fontSize}|${text}`;
  if (measured.has(key)) return measured.get(key);
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="400">` +
    `<text x="0" y="300" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}">${escaped}</text>` +
    `</svg>`;
  const box = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
  const width = box ? box.x + box.width : 0;
  measured.set(key, width);
  return width;
}

/**
 * Render one React element to an SVG on disk and a PNG beside it. The PNG is the artifact the
 * checklist is applied to — the SVG is kept because a defect is easier to read in the markup.
 */
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
  // is held by `splash-twin/test/delivered-size-matches-the-pin.test.ts` as a number that may only
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
    font: { loadSystemFonts: true },
    fitTo: { mode: "width", value: width * scale },
  }).render();
  return image.asPng();
}
