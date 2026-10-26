// The half every MAP scrolly zone kit shares, on top of ./scrolly.mjs — kept inside the choropleth
// scrolly kit (every other map scrolly kit carries a byte-identical copy) until it moves to _shared/.
//
// A map scrolly is a LIVE MapTiler map driven by a plan, over one frozen picture per card baked from
// that same map (skills/scrolly/scripts/live-map-cards-bake.mjs). The page in renders/ carries the
// `__MAPTILER_KEY__` placeholder; the skill writes a KEYED copy beside it (renders/<id>.local.html),
// which this file removes as soon as the page is written, so the key never stays in a story folder.
// The live guards (verify-live-map-scrolly.mjs) key their own temporary copy and remove it.
//
// What it gives:
//   maptilerKey(here)                      env first, then the root's private .env; refuses without. Never printed.
//   openCards(here, key)                   the skill's live-map context (one Chrome), keyed from `key`
//   renderCardsPage(cards, here, outDir, label, options)   renderWithCardImages + the keyed copy removed
//   liveGuard(here, outPath, key, { waive })               the skill's live guards; `waive` = { test, why } list
//   wordsOf(reading)                       say(field, fn) → paragraphs through plain(), non-empty
//   owes(text, wanted)                     the card states `wanted` (not inside a longer number)
//   figureCheck({ format, known })         every number in a text rounds to a known figure, at its precision
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { splashEnvPath } from "#shared/design-base/splash-root.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { plain } from "./web.mjs";
import { scrollySkill } from "./scrolly.mjs";

/** The MapTiler key: the process environment first, then the root's private .env. Never printed. */
export function maptilerKey(here) {
  const fromEnv = mapTilerKeyIn(process.env);
  if (fromEnv) return fromEnv;
  const path = splashEnvPath(here);
  if (existsSync(path))
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
      if (m && mapTilerKeyIn({ [m[1]]: m[2] })) return m[2];
    }
  throw new Error(
    "a map scrolly is a live MapTiler map whose frozen card images are baked from that live map, so the render needs MAPTILER_KEY in the environment (this is not something beat.mjs can fix)",
  );
}

/** The skill's live-map context: the key, the style, MapLibre, the faces MapTiler serves, one Chrome. */
export async function openCards(here, key) {
  const { openLiveMapCards } = await import(scrollySkill(here, "scripts", "live-map-cards-bake.mjs"));
  return openLiveMapCards({ env: { MAPTILER_KEY: key } });
}

/**
 * The page with its frozen card images (fallback/<label>-…, cached on the plan's hash), written to
 * renders/<label>.html. The skill's keyed copy beside it is removed however the call ends.
 */
export async function renderCardsPage(cards, here, outDir, label, options) {
  const { renderWithCardImages } = await import(scrollySkill(here, "scripts", "live-map-cards-bake.mjs"));
  let result;
  try {
    result = await renderWithCardImages(cards, { id: label, fallbackDir: join(here, "fallback"), ...options });
  } finally {
    rmSync(join(outDir, `${label}.local.html`), { force: true });
    if (result?.localPath) rmSync(result.localPath, { force: true });
  }
  return result;
}

/**
 * The skill's two live guards on a temporary keyed copy it removes (verify-live-map-scrolly.mjs): no
 * frame with a missing tile while scrubbing at 30, 120 and 400 px per frame, and no undrawn canvas at
 * any card, at 1280x800 and 375x812. A failure matching one of `waive` (an inherited failure the
 * worked example's own page shows, by exact shape) is printed with its reason; anything else throws.
 */
export function liveGuard(here, outPath, key, { waive = [] } = {}) {
  const live = Bun.spawnSync(["bun", scrollySkill(here, "scripts", "verify-live-map-scrolly.mjs"), outPath], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, MAPTILER_KEY: key },
  });
  const lines = `${live.stdout.toString()}${live.stderr.toString()}`.trim().split("\n").filter(Boolean);
  const failures = lines.filter((l) => /^\d+x\d+: /.test(l) && !/recorded a warning/.test(l));
  const waived = failures.map((l) => [l, waive.find((w) => w.test.test(l))]).filter(([, w]) => w);
  const failed = failures.filter((l) => !waived.some(([w]) => w === l));
  if (live.exitCode === 0) console.log(`\nverify-live-map-scrolly: ${lines.slice(-1)[0]}`);
  else console.log(`\nverify-live-map-scrolly: ${failed.length} failure(s), ${waived.length} waived`);
  for (const [l, w] of waived) console.log(`  waived: ${l} — ${w.why}`);
  for (const f of failed) console.log(`  FAIL ${f}`);
  if (live.exitCode !== 0 && (failed.length || !failures.length))
    throw new Error(`the live map guards failed (above): ${failed.length ? "a card leaves the live canvas undrawn, or a tile goes missing while scrolling" : lines.slice(-3).join(" ")}`);
}

/** say(field, fn): the words of one field — a string, or a function of the reading — as plain paragraphs. */
export const wordsOf = (reading) => (field, fn) => {
  const text = typeof fn === "function" ? fn(reading) : fn;
  const parts = [text].flat();
  if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
  return parts.map(plain);
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The text states `wanted` as written, not as part of a longer number. */
export const owes = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(plain(text));

/**
 * (where, text) => throws when a number in `text` rounds to no figure of `known` at the precision it
 * is written with (`2,5` matches 2.47 ± 0.05; `69 %` matches 68.9). The decimal mark is read off the
 * beat's own printers (`format`: one function or several; the first that prints 1.5 with a mark). Years 1900–2100 and figures glued to letters (CO2, 10e, 8 900e) pass.
 */
export function figureCheck({ format, known, hint = "" }) {
  // The decimal mark of the first printer that writes one (a printer that rounds to whole numbers says nothing).
  const marks = [format].flat().map((f) => String(f(1.5)).match(/1([.,])5/)?.[1]).filter(Boolean);
  const decimal = marks[0] ?? ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const number = `(?:\\d{1,3}(?:${group}\\d{3})+|\\d+)(?:${dec}\\d+)?`;
  const glued = new RegExp(`(?<![\\p{L}\\d.,])${number}(?=\\p{L})`, "gu");
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(${number})(?![\\p{L}\\d])`, "gu");
  const figures = known.filter((v) => Number.isFinite(v));
  return (where, text) => {
    for (const m of plain(text).replace(glued, " ").matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      const n = Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!figures.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of this map rounds to: every number in a card is computed — use the reading${hint ? ` (${hint})` : ""} through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
}
