// twin/skills/twin-scrolly/scripts/render-still.mjs
//
// A skill never imports another skill — this is this genre's OWN copy of `twin-chart-beat`'s
// rasteriser helper, byte-for-byte the same rule the other two chart genres already follow
// (`twin-chart-web/scripts/render-still.mjs` carries the identical copy for the identical reason).
// `deriveFurniture`/`measureText` are what `scripts/render-scrolly.mjs` calls, once per render, to
// hand `assets/ScrollySeed.tsx` its ink/muted/grid colours and its measured gutters as props — the
// component itself never imports this file.
//
// RASTERISER: @resvg/resvg-js — same choice, same reasoning as the other genres: a headless
// browser needs a system Chrome a journalist's laptop may not have; resvg is a native module
// installed with the root, renders synchronously, and exposes `getBBox()`, the real ink extent of
// rendered text, which is what makes a MEASURED gutter possible at all.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
      .map((v, i) =>
        Math.round(v + (target[i] - v) * ratio)
          .toString(16)
          .padStart(2, "0"),
      )
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
 * source line is readable on any ground. The escalation always terminates: the worst ground
 * for the better pole is L = 0.1791, where the pure pole still measures 4.58:1.
 *
 * `grid` is decoration, not text — it carries no contrast floor and must not shout.
 */
export function deriveFurniture(ground) {
  if (!HEX.test(ground))
    throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const ink =
    contrast("#000000", ground) >= contrast("#FFFFFF", ground)
      ? "#000000"
      : "#FFFFFF";
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
 * The rendered width of a string, in the font it will actually be drawn in — resvg lays the
 * text out and reports the ink box. This is what a measured gutter is measured with; a fixed
 * constant here is the defect this function exists to remove.
 *
 * The second argument is an OPTIONS OBJECT, `{ fontSize, fontWeight?, fontFamily? }` — never a
 * bare number. A caller that passes a number, or omits `fontSize` from the object, does not error
 * at the call site: destructuring a missing key just yields `undefined`, which resvg's own SVG
 * parser then defaults away silently, laying the text out at whatever size resvg picks rather
 * than the one the caller meant, so a malformed call throws here instead of under-measuring
 * silently.
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
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
 * Render one React element to an SVG on disk and a PNG beside it. Not called by
 * `render-scrolly.mjs` itself (that script inlines its own SSR'd SVGs straight into one HTML
 * file) — kept here anyway, unchanged from the other genres' copies, because
 * `scripts/render-preview.mjs` uses it to rasterise this skill's own preview, and because a
 * future beat's own still-frame proof (rendering one step in isolation to look at) reaches for
 * exactly this function, the same way every other genre in this twin does.
 */
export async function renderStill({ element, width, height, outDir, name }) {
  const svg = renderToStaticMarkup(element);
  if (!svg.startsWith("<svg"))
    throw new Error(`renderStill expects an element whose root is <svg>, got ${svg.slice(0, 40)}`);

  const drawn = {
    width: Number(svg.match(/\bwidth="(\d+(?:\.\d+)?)"/)?.[1]),
    height: Number(svg.match(/\bheight="(\d+(?:\.\d+)?)"/)?.[1]),
  };
  if (drawn.width !== width || drawn.height !== height) {
    throw new Error(
      `asked to render at ${width}x${height}, but the element is drawn at ${drawn.width}x${drawn.height}`,
    );
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
