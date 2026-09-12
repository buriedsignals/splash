// twin/shared/design-base/typefaces.mjs
//
// A FAMILY NAME BECOMES A FONT FILE, AND THE FILE IS THE ONE THE RENDER DRAWS WITH.
//
// THE PREMISE THIS REPLACES, AND WHY IT WAS BACKWARDS. `resolve-families.mjs` used to ladder only
// faces macOS ships — Superclarendon, Iowan Old Style, Avenir Next, Futura — under the reasoning
// that "a direction that needs a licensed font is a direction no reader outside that newsroom can
// be shown". That inverts itself the moment the reader is not on a Mac: Apple's system faces are
// not redistributable and exist on no Linux and no Windows machine, so a render that resolves one
// is a render that cannot be reproduced anywhere but here. Google Fonts are redistributable and
// fetchable, so the catalogue is wide AND a newsroom installs nothing.
//
// AND IT IS THE SAME CATALOGUE THE MAP DRAWS FROM. MapLibre does not read a system font; it reads
// signed distance fields served by the style host, and MapTiler Cloud serves eighteen families of
// which seventeen are Google Fonts (`shared/map-beat/glyphs.mjs` holds the probe that measured it).
// A beat whose panel is set in one of those seventeen needs no SDF baking at all: the map label and
// the panel label are the same design, one served as glyphs and one fetched as a file.
//
// WHAT GOOGLE SERVES, AND TO WHOM. `fonts.googleapis.com/css2` answers a MODERN user-agent with
// woff2, which resvg cannot read, and a LEGACY one with a plain TrueType file, which it can. So the
// request carries `Mozilla/4.0` deliberately — it is not a disguise, it is the documented way to
// ask that API for the format a rasteriser takes.
//
// WHAT IS CACHED, AND WHERE IT IS NOT. Nothing is vendored and nothing is committed: the cache
// lives outside every checkout (`~/.cache/splash/typefaces` by default), so a second clone on the
// same machine reuses it rather than re-downloading, and no `git add` can ever reach it.
//
// A CACHED ERROR PAGE WOULD POISON EVERY LATER RENDER SILENTLY, which is the exact class of defect
// this branch exists to end — a wrong answer that looks like a right one and never goes red. So the
// bytes are checked before they are cached: a TrueType file opens `00 01 00 00`, an OpenType one
// `OTTO`, a collection `ttcf`; a woff2 opens `wOF2` and an error page opens `<`. Only a font is
// kept, and anything else is named rather than stored.
//
// OFFLINE IN ONE DIRECTION ONLY. A cache hit needs no network at all. A cache MISS without network
// refuses, naming the family — it never falls back to a face this machine happens to have, because
// `useTypeface`'s own rule in the trunk is that a silent stack has not chosen.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The seventeen families MapTiler Cloud serves that are also Google Fonts — so a beat set in one
 *  of these can share its face with the map with no glyph baking. Metropolis, MapTiler's own
 *  eighteenth, is not a Google Font and is not here. */
export const SERVED_BY_MAPTILER = Object.freeze([
  "Open Sans", "Roboto", "Inter", "Lato", "Montserrat", "Nunito", "Rubik",
  "Source Sans 3", "PT Sans", "Ubuntu",
  "Merriweather", "PT Serif", "Libre Baskerville", "Noto Serif", "Roboto Slab",
  "Roboto Mono", "Source Code Pro",
]);

/** Google's css2 endpoint. Never string-built with a family name in it — see `cssFor`. */
const CSS_ENDPOINT = "https://fonts.googleapis.com/css2";

/** The only host a face may be downloaded from. A URL read out of a response is data, not trust. */
const FONT_HOST = "https://fonts.gstatic.com/";

/** The user-agent that gets TrueType rather than woff2 out of css2. */
const LEGACY_AGENT = "Mozilla/4.0";

/** A family name is a path component here, so it is allowlisted rather than escaped: letters,
 *  digits, spaces and the three separators real Google families use. Nothing else — no slash, no
 *  dot segment, no NUL — can reach the filesystem or an argument vector. */
const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 +_-]*$/;

/** The cache. Outside the repository by construction, and overridable so a test can use a temp
 *  directory without reaching for the machine's real one. */
export function typefaceCacheDir() {
  if (process.env.SPLASH_TYPEFACE_CACHE) return process.env.SPLASH_TYPEFACE_CACHE;
  const base = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
  return join(base, "splash", "typefaces");
}

/** `00 01 00 00`, `OTTO`, `true` or `ttcf` — a font. `wOF2` is a font this rasteriser cannot read;
 *  `<` is an error page. */
export function isFontFile(bytes) {
  if (!bytes || bytes.length < 4) return false;
  const [a, b, c, d] = bytes;
  if (a === 0x00 && b === 0x01 && c === 0x00 && d === 0x00) return true; // TrueType outlines
  const tag = String.fromCharCode(a, b, c, d);
  return tag === "OTTO" || tag === "true" || tag === "ttcf";
}

/** What the first four bytes SAY they are, for a refusal a person can act on. */
function describeBytes(bytes) {
  if (!bytes || bytes.length === 0) return "an empty response";
  const tag = String.fromCharCode(...bytes.slice(0, 4));
  if (tag === "wOF2") return "a woff2 file, which resvg cannot read";
  if (tag.startsWith("wOFF")) return "a woff file, which resvg cannot read";
  if (tag.trimStart().startsWith("<")) return "an HTML or XML document — almost certainly an error page";
  return `${bytes.length} bytes opening ${[...bytes.slice(0, 4)].map((n) => n.toString(16).padStart(2, "0")).join(" ")}`;
}

function assertFamily(family) {
  const name = String(family ?? "").replace(/^["']|["']$/g, "").trim();
  if (!FAMILY.test(name))
    throw new Error(
      `${JSON.stringify(family)} is not a family name this can fetch: a Google family is letters, ` +
        `digits, spaces and "+ - _" only, and this name reaches a filesystem path and an argument ` +
        `vector unquoted.`,
    );
  return name;
}

function assertWeight(weight) {
  const value = Number(weight);
  if (!Number.isInteger(value) || value < 100 || value > 1000)
    throw new Error(`a font weight is an integer from 100 to 1000, got ${JSON.stringify(weight)}`);
  return value;
}

/** `curl`, with every value in its own argument — never interpolated into a command line, and
 *  never into the URL. Returns `{ ok, status, out }`; `ok: false` with no status is "no network". */
function curl(args) {
  const run = spawnSync("curl", ["-sS", "--fail", "--max-time", "30", ...args], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error && run.error.code === "ENOENT")
    throw new Error("curl is not on PATH, and it is how a typeface is fetched on first use");
  return {
    ok: run.status === 0,
    code: run.status,
    out: run.stdout ?? Buffer.alloc(0),
    err: (run.stderr ?? Buffer.alloc(0)).toString("utf8").trim(),
  };
}

/** The weight grid asked for in one request, in both styles. Google serves what it has of it and
 *  silently omits the rest — Lato comes back 100/300/400/700/900 — so the whole grid is asked for
 *  ONCE per family and the nearest face is chosen here, where the choice can be seen, rather than
 *  guessed from a response that came back shorter than the request. A family with no italic at all
 *  (Roboto Slab) answers 200 with its uprights. */
const WEIGHT_GRID = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const AXIS = `ital,wght@${WEIGHT_GRID.map((w) => `0,${w}`).join(";")};${WEIGHT_GRID.map((w) => `1,${w}`).join(";")}`;

const stylesheets = new Map();

/**
 * The css2 stylesheet for one family, asked for as a legacy agent so the faces come back as `.ttf`.
 *
 * The family goes through `--data-urlencode`, in its own argument: family names carry spaces and
 * come out of files, and a name interpolated into a URL string is an injection with a font on the
 * end of it.
 */
function cssFor(family) {
  const held = stylesheets.get(family);
  if (held) return held;
  const full = curl(["-A", LEGACY_AGENT, "--get", "--data-urlencode", `family=${family}:${AXIS}`, CSS_ENDPOINT]);
  const answer = full.ok
    ? full
    : curl(["-A", LEGACY_AGENT, "--get", "--data-urlencode", `family=${family}`, CSS_ENDPOINT]);
  if (!answer.ok) {
    if (answer.code === null)
      throw new Error(
        `cannot fetch the typeface "${family}": curl could not be run at all. The cache ` +
          `(${typefaceCacheDir()}) has no copy, so there is nothing to draw with.`,
      );
    throw new Error(
      `cannot fetch the typeface "${family}" from Google Fonts — and the cache ` +
        `(${typefaceCacheDir()}) has no copy of it, so nothing here can set it. Either the name is ` +
        `not a Google family, or this machine has no network. curl said: ` +
        `${answer.err || `exit ${answer.code}`}`,
    );
  }
  const css = answer.out.toString("utf8");
  stylesheets.set(family, css);
  return css;
}

/** Every `@font-face` in a css2 answer, as `{style, weight, url}`. */
export function parseFaces(css) {
  const faces = [];
  for (const block of String(css).split("@font-face").slice(1)) {
    const style = /font-style:\s*([a-z]+)/.exec(block)?.[1] ?? "normal";
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1] ?? NaN);
    const url = /url\((https:[^)]+\.ttf)\)/.exec(block)?.[1];
    if (!url || !Number.isFinite(weight)) continue;
    faces.push({ style, weight, url });
  }
  return faces;
}

/**
 * The face closest to what was asked for: the requested style first, and within it the nearest
 * weight. A family with no italic (Roboto Slab) hands back its upright — the same thing a
 * rasteriser does with a system face, and it is reported by `servedFace` rather than hidden.
 */
export function nearestFace(faces, weight, italic) {
  if (faces.length === 0) return null;
  const wanted = italic ? "italic" : "normal";
  const preferred = faces.filter((f) => f.style === wanted);
  const pool = preferred.length > 0 ? preferred : faces;
  return pool.reduce((best, f) => (Math.abs(f.weight - weight) < Math.abs(best.weight - weight) ? f : best));
}

const resolved = new Map();

/**
 * A LOCAL `.ttf` FOR THIS FAMILY AT THIS WEIGHT, fetched on first use and reused afterwards.
 *
 * The cache key is what was ASKED FOR, not what came back, so a hit costs no network. Where Google
 * serves fewer weights than were asked for — Lato has 400 and 700 and nothing between — two keys
 * hold the same bytes, which is harmless: resvg reads the real weight out of the file's own `OS/2`
 * table and matches on that, exactly as a browser does.
 *
 * @param {string} family   a Google family, e.g. `Merriweather`
 * @param {number} weight   100..1000
 * @param {{italic?: boolean}} options
 * @returns {string} an absolute path to a file on disk
 */
export function typefaceFile(family, weight = 400, { italic = false } = {}) {
  const name = assertFamily(family);
  const value = assertWeight(weight);
  const key = `${name}|${value}|${italic ? "italic" : "normal"}`;
  const hit = resolved.get(key);
  if (hit) return hit;

  const dir = typefaceCacheDir();
  const path = join(dir, `${name.replace(/\s+/g, "-")}-${value}${italic ? "italic" : ""}.ttf`);
  if (existsSync(path) && statSync(path).size > 0) {
    const bytes = readFileSync(path);
    if (isFontFile(bytes)) {
      resolved.set(key, path);
      return path;
    }
    // A cache entry that is not a font is a poisoned one. Drop it and fetch again rather than
    // handing a rasteriser something it will quietly render nothing from.
    unlinkSync(path);
  }

  const faces = parseFaces(cssFor(name));
  const face = nearestFace(faces, value, italic);
  if (!face)
    throw new Error(
      `there is no font file for "${name}": Google Fonts answered with no TrueType face in the ` +
        `stylesheet, which is what a name it does not serve looks like. This render draws from ` +
        `files only — a licensed or system face installed on this machine is not one it can use — ` +
        `so name a Google family instead. The design base's own ladders hold seventeen, chosen ` +
        `because MapTiler serves the same seventeen as map glyphs.`,
    );
  if (!face.url.startsWith(FONT_HOST))
    throw new Error(
      `the stylesheet for "${name}" points its face at ${face.url}, which is not ${FONT_HOST}. ` +
        `A font file is only taken from Google's own host.`,
    );

  const download = curl([face.url]);
  if (!download.ok)
    throw new Error(
      `cannot download the "${name}" face at ${face.weight} ${face.style}: ${download.err || `curl exit ${download.code}`}`,
    );
  const bytes = new Uint8Array(download.out);
  if (!isFontFile(bytes))
    throw new Error(
      `what Google served for "${name}" ${face.weight} ${face.style} is not a font this can draw ` +
        `with — it is ${describeBytes(bytes)}. Nothing was cached: a cached non-font would set every ` +
        `later render in silence.`,
    );

  mkdirSync(dir, { recursive: true });
  const staging = `${path}.${process.pid}.part`;
  writeFileSync(staging, bytes);
  renameSync(staging, path);
  resolved.set(key, path);
  return path;
}

/** What was actually served for a request — the weight and style the file really carries, which is
 *  not always the one asked for. For a report, never for a decision made in silence. */
export function servedFace(family, weight = 400, { italic = false } = {}) {
  const name = assertFamily(family);
  const face = nearestFace(parseFaces(cssFor(name)), assertWeight(weight), italic);
  return face ? { family: name, weight: face.weight, style: face.style } : null;
}

/** The generic keywords a CSS stack may close with — never a file, never fetched. */
const GENERIC_KEYWORDS = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
  "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong",
]);

/** The face a stack is really asking for: the first item, unquoted. `Helvetica, Arial, sans-serif`
 *  asks for Helvetica; the rest is what a BROWSER falls back to, and a rasteriser drawing from
 *  files has no fallback at all. */
export function requestedFamily(stack) {
  return String(stack).split(",")[0].replace(/^["']|["']$/g, "").trim();
}

/**
 * The files resvg needs to set one family at the given weights and styles.
 *
 * @param {string} stack   a family or a CSS stack; the FIRST item is the face
 * @param {{weights?: number[], styles?: Array<"normal"|"italic">}} options
 */
export function fontFilesFor(stack, { weights = [400], styles = ["normal"] } = {}) {
  const family = requestedFamily(stack);
  if (!family || GENERIC_KEYWORDS.has(family.toLowerCase())) return [];
  const files = new Set();
  for (const weight of weights)
    for (const style of styles) files.add(typefaceFile(family, weight, { italic: style === "italic" }));
  return [...files];
}

/**
 * EVERY FILE THIS SVG NEEDS TO BE DRAWN AS WRITTEN — read off the markup itself.
 *
 * With `loadSystemFonts: false` a face resvg was not handed simply does not draw: no error, no
 * glyph, an empty PNG. So the files cannot be guessed from a module-level default — they are
 * derived from the families, weights and styles the element actually declared, which is the only
 * set that keeps what was MEASURED and what is DRAWN the same face.
 *
 * It refuses rather than skipping a family it cannot fetch: a skipped family is a blank word in the
 * delivered picture and nothing anywhere goes red.
 */
export function fontFilesForSvg(svg) {
  const text = String(svg);
  const families = new Set();
  for (const m of text.matchAll(/font-family\s*[=:]\s*"([^"]*)"/g)) families.add(requestedFamily(m[1]));
  for (const m of text.matchAll(/font-family\s*:\s*([^;"']+)[;"']/g)) families.add(requestedFamily(m[1]));
  const weights = new Set([400]);
  for (const m of text.matchAll(/font-weight\s*[=:]\s*"?(\d{3})"?/g)) weights.add(Number(m[1]));
  const styles = new Set(["normal"]);
  if (/font-style\s*[=:]\s*"?italic/.test(text)) styles.add("italic");

  const files = new Set();
  for (const family of families) {
    if (!family || GENERIC_KEYWORDS.has(family.toLowerCase())) continue;
    for (const path of fontFilesFor(family, { weights: [...weights], styles: [...styles] })) files.add(path);
  }
  return [...files];
}
