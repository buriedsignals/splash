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
