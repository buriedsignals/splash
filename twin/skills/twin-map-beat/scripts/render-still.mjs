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

/**
 * THE FONT STACK IN FORCE. The seed draws with it and `measureText` measures with it — if the two
 * ever disagree, every gutter in the chart is measured against a font nobody is looking at.
 *
 * It was a hard literal until 2026-08-10, in all 22 copies of this file, while
 * `twin-newsroom-charter` MEASURED a newsroom's typefaces off its own site, `NEWSROOM.md` recorded
 * them and preflight read them back. That is exactly the failure `readPalette`'s own header names —
 * "an instruction to copy by eye, which is exactly how a newsroom's identity gets collected and
 * then never used" — left standing for type after it was removed for colour, in this same file.
 *
 * It is now a `let` that `useTypeface` reassigns from a recorded `TYPEFACE.md`, and ES module
 * exports are live bindings, so a component reading `FONT_FAMILY` inside its own render sees what
 * the runner resolved. Until a runner calls `useTypeface` this is the built-in default and
 * `activeTypeface().origin` says `default` — the honest word for "nobody chose this".
 *
 * WHY BOTH RESVG CALL SITES BELOW STILL SAY `loadSystemFonts: true`, and why that is the safe
 * shape rather than an oversight. The measured defect is not a missed COPY, it is a missed CALL
 * SITE inside one copy: the `measureText` probe and the rasteriser, and when they disagree the
 * paint gets the house face while every gutter was measured in the fallback — three static beats
 * clipped in ten places when that was simulated (`survey/typeface-feasibility.md` §4-B). Neither
 * site is parameterised, so the two cannot disagree. The price is stated in `useTypeface`: this
 * version resolves a face that is INSTALLED on the rendering machine. Handing resvg a font FILE
 * (`fontFiles`, measured working in §1) needs both call sites parameterised, which means vendoring
 * a changed `measureText` and `rasterise` into all 22 copies, and that is the next step rather
 * than this one.
 */
const DEFAULT_FONT_FAMILY = "Helvetica, Arial, sans-serif";
export let FONT_FAMILY = DEFAULT_FONT_FAMILY;
let ACTIVE_TYPEFACE = {
  family: DEFAULT_FONT_FAMILY,
  origin: "default",
  source: "(the built-in default stack — nobody chose it)",
};

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
  return { ground: record.ground, accent: record.accent, origin: record.origin, source };
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
 * DOES THIS MACHINE ACTUALLY HAVE THE FACE? Measured, not assumed
 * (`survey/typeface-feasibility.md` §1): resvg NEVER errors on a family it cannot find. It renders
 * happily in whatever it does have and there is no return value that says so. Chrome falls back
 * silently, and Canvas `measureText` falls back silently. No substrate will ever tell us.
 *
 * So the resolution is measured the only way it can be: lay the same string out in the requested
 * family and in a family that certainly exists nowhere, and compare the ink. Identical ink means
 * the requested family resolved to the same fallback the nonsense one did — it did not resolve.
 *
 * Its blind spot, stated: a face whose metrics are IDENTICAL to the fallback's at every character
 * of the probe string would read as unresolved. The string below is long and mixed precisely to
 * make that improbable, and the failure direction is the safe one — a false refusal is loud, a
 * false acceptance is a PNG in a face nobody chose.
 */
const RESOLUTION_PROBE = "Handgloves 0123456789 — MWmw il1 %";
export function familyResolves(family) {
  const ink = (name) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="400">` +
      `<text x="0" y="300" font-family="${name}" font-size="120">${RESOLUTION_PROBE}</text></svg>`;
    const box = new Resvg(svg, { font: { loadSystemFonts: true } }).getBBox();
    return box ? `${box.x}|${box.y}|${box.width}|${box.height}` : "none";
  };
  return ink(requestedFamily(family)) !== ink("NoSuchFaceExistsAnywhere-ZZQX");
}

/**
 * Put a recorded typeface in force, or REFUSE. Nothing renders in a value nobody chose: a face
 * that does not resolve is named, with where it was recorded, rather than silently substituted.
 *
 * A journalist told "we cannot get Marr Sans on this machine; your charts will be set in the
 * fallback — accept, or install it" has CHOSEN. A silent stack has not.
 */
export function useTypeface(typeface) {
  if (!typeface || typeof typeface !== "object" || !typeface.family) {
    throw new Error(`useTypeface needs a parsed TYPEFACE record, got ${JSON.stringify(typeface)}`);
  }
  if (typeface.origin !== "default" && !familyResolves(typeface.family)) {
    throw new Error(
      `the typeface recorded in ${typeface.source} does not resolve on this machine: nothing here ` +
        `answers to ${JSON.stringify(requestedFamily(typeface.family))}, and resvg would have ` +
        `rendered the fallback and said nothing. Install the face, or record one this machine has, ` +
        `or record origin: default and accept the fallback as a choice.`,
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
 * It lives outside `renderStill` deliberately: `render-still-parity.test.ts` compares every copy of
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

const measured = new Map();

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
 * Same options object, same reasons, and the same throw on a bare number — see `measureText`.
 */
export function measureTextBand(text, options) {
  if (!text) return { ascent: 0, descent: 0 };
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(
      `measureTextBand's second argument must be an options object shaped { fontSize, fontWeight?, fontFamily? }, got ${JSON.stringify(options)} (${typeof options})`,
    );
  }
  const { fontSize, fontWeight = 400, fontFamily = FONT_FAMILY } = options;
  if (typeof fontSize !== "number" || !Number.isFinite(fontSize)) {
    throw new Error(
      `measureTextBand's options.fontSize must be a finite number, got ${JSON.stringify(fontSize)} — a missing fontSize silently defaults to resvg's own size and under-measures`,
    );
  }
  const key = `band|${fontFamily}|${fontWeight}|${fontSize}|${text}`;
  if (measured.has(key)) return measured.get(key);
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const baseline = 300;
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="600">` +
    `<text x="0" y="${baseline}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}">${escaped}</text>` +
    `</svg>`;
  const box = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
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
export async function renderStill({ element, width, height, outDir, name }) {
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
  await writeFile(pngPath, rasterise(svg, width));
  return { svgPath, pngPath };
}

/** 2× so the still survives being looked at closely, which is the whole point of looking. */
function rasterise(svg, width) {
  const image = new Resvg(svg, {
    font: { loadSystemFonts: true },
    fitTo: { mode: "width", value: width * 2 },
  }).render();
  return image.asPng();
}
