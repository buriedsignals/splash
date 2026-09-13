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
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

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

// ---------------------------------------------------------------------------------------------
// THE SAME FAMILY, FOR A READER'S OWN BROWSER — AS BYTES, NEVER AS A LINK.
//
// Everything above turns a family into a `.ttf` on disk for resvg. A web beat has the same problem
// and a different consumer: the page is set on the READER's machine, so the face has to travel with
// the page. It was not travelling at all. `web.mjs`'s `fontStack` emitted
// `"Merriweather", Georgia, serif` and `render-web.mjs` built a `<head>` with one inlined `<style>`
// and nothing else — no link, no `@font-face`, no bytes. Every shipped web beat therefore rendered
// in the BRIDGE (Georgia, Helvetica) or the reader's OS default, which is the exact silent
// substitution `loadSystemFonts: false` had just finished ending on the static side. On the static
// side a missing face now fails; on the web side it quietly drew the wrong typeface.
//
// EMBEDDED, NOT LINKED, FOR TWO REASONS ALREADY ESTABLISHED HERE.
//   1. A network stylesheet may not have arrived before the first paint, and a frame in the
//      fallback face is a frame in the wrong typeface with nothing to say so — the reason
//      `film/scripts/fetch-typefaces.mjs` already base64s its two faces rather than linking them,
//      written in that file's own header.
//   2. These pages ship to European newsrooms and get embedded in articles. A third-party request
//      to Google's CDN at read time is a privacy exposure a newsroom should not have to accept, and
//      a CSP may block it outright. A self-contained page has neither problem.
//
// WHY A DIFFERENT REQUEST FROM THE ONE ABOVE. `cssFor` asks css2 as `Mozilla/4.0` precisely to get
// TrueType, because resvg cannot read woff2. A browser wants the opposite: woff2 is a third the
// size and every engine this format targets reads it. So `webCssFor` asks as a MODERN agent, and
// what comes back is not one file per weight but one file per SUBSET, each with the
// `unicode-range` that says which code points it is for.
//
// AND THE SUBSETS ARE NOT ENOUGH ON THEIR OWN — MEASURED, NOT ASSUMED. Across the 153 committed
// pages the characters outside Google's `latin` and `latin-ext` subsets are U+2082 (187
// occurrences — the subscript of every CO2 in the corpus), U+2192, U+2190 and U+2265. Embedding
// latin and latin-ext alone would have left the subscript of every CO2 figure falling through to
// Georgia, one glyph at a time, which is the same defect one size smaller. So a face's leftovers
// are asked for by name through css2's own `text=` parameter — Google answers with a ~1.2 KB file
// and the exact `unicode-range` it subsetted — and `embeddedWebFaces` REFUSES if anything is still
// uncovered afterwards.
//
// ONLY WHAT THE PAGE USES. A subset is embedded only when the page's own text has a code point
// inside its range, and a face is embedded only for a (family, weight, style) the page actually
// declares. A French chart page that never types a Czech caron ships no latin-ext.

/** A user-agent css2 answers with woff2. Not a disguise: it is how that API is told which format
 *  the consumer can read, the same lever `LEGACY_AGENT` pulls in the other direction. */
const MODERN_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0.0.0 Safari/537.36";

/** `wOF2` — and nothing else gets written to the cache. An error page opens `<`, and a cached error
 *  page would set every later page in silence, which is the whole class of defect this ends. */
export function isWoff2(bytes) {
  if (!bytes || bytes.length < 4) return false;
  const [a, b, c, d] = bytes;
  return a === 0x77 && b === 0x4f && c === 0x46 && d === 0x32;
}

/** A subset name Google prints as a comment above each block — allowlisted before it reaches a
 *  filename, the same rule `FAMILY` applies to a family. */
const SUBSET = /^[a-z][a-z0-9-]*$/;

const webStylesheets = new Map();

/** Where a family's modern stylesheet is kept when the network answered once and may not next
 *  time. Beside the `.ttf` files, in the same cache, written the same staged way. */
function webCssPath(family) {
  return join(typefaceCacheDir(), `${family.replace(/\s+/g, "-")}-web.css`);
}

function writeCached(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  const staging = `${path}.${process.pid}.part`;
  writeFileSync(staging, bytes);
  renameSync(staging, path);
}

/**
 * The css2 stylesheet for one family as a BROWSER is served it: woff2, one block per subset, each
 * with its own `unicode-range`.
 *
 * `spec` is the axis fragment after the family — the whole weight grid when the question is "what
 * does Google HAVE" (`AXIS`), one exact weight when the question is "serve me that face". The
 * difference is not cosmetic and cost a rewrite to find: asked for a grid, Google answers with the
 * VARIABLE font, one 98 KB file per subset repeated under every weight block; asked for one weight
 * it answers with a 49 KB static instance. A page setting three weights of Open Sans embedded the
 * variable file three times — 269 KB where three static instances are 40 KB.
 *
 * `text` narrows the answer to exactly those characters (css2's own parameter). It goes through
 * `--data-urlencode` in its own argument, like the family: a page's words are read out of files and
 * are not something to interpolate into a URL.
 */
function webCssFor(family, { spec = AXIS, text = null } = {}) {
  const key = `${family}|${spec}|${text ?? ""}`;
  const held = webStylesheets.get(key);
  if (held) return held;

  const args = ["-A", MODERN_AGENT, "--get", "--data-urlencode", `family=${family}:${spec}`];
  if (text !== null) args.push("--data-urlencode", `text=${text}`);
  const answer = curl([...args, CSS_ENDPOINT]);
  const cacheable = spec === AXIS && text === null;
  if (!answer.ok) {
    // No network. A stylesheet cached from an earlier run is the only thing that can still say
    // which subsets exist and where they live; without one there is nothing to embed, and a page
    // with no faces in it is a page in the wrong typeface.
    const cached = cacheable && existsSync(webCssPath(family)) ? readFileSync(webCssPath(family), "utf8") : null;
    if (cached) {
      webStylesheets.set(key, cached);
      return cached;
    }
    throw new Error(
      `cannot fetch the web faces for "${family}" from Google Fonts, and ${typefaceCacheDir()} ` +
        `holds no stylesheet for it from an earlier run. A web page embeds its typeface as bytes — ` +
        `there is no link to fall back to and no system face this may quietly use instead. ` +
        `curl said: ${answer.err || `exit ${answer.code}`}`,
    );
  }
  const css = answer.out.toString("utf8");
  if (!/@font-face/.test(css))
    throw new Error(
      `Google Fonts answered for "${family}" with something that is not a stylesheet — ` +
        `${JSON.stringify(css.slice(0, 120))}. Nothing was cached.`,
    );
  if (cacheable) writeCached(webCssPath(family), Buffer.from(css, "utf8"));
  webStylesheets.set(key, css);
  return css;
}

/**
 * Every `@font-face` in a MODERN css2 answer, as `{subset, style, weight, stretch, unicodeRange, url}`.
 *
 * The subset name is read from the CSS comment Google prints above each block rather than inferred
 * from the range's first code point: the comment is what Google itself calls the subset, and
 * inferring would have to be re-derived every time Google adds one.
 */
export function parseWebFaces(css) {
  const text = String(css);
  const faces = [];
  const blocks = text.split("@font-face");
  for (let i = 1; i < blocks.length; i += 1) {
    const named = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*$/.exec(blocks[i - 1].trimEnd())?.[1] ?? null;
    const block = blocks[i];
    const style = /font-style:\s*([a-z]+)/.exec(block)?.[1] ?? "normal";
    // `font-weight: 200 800` is a RANGE — what css2 answers with when a weight AXIS was asked for,
    // one variable file covering all of it. Reading only the first number would file the variable
    // file under 200 and lose the other six hundred.
    const declared = /font-weight:\s*(\d+)(?:\s+(\d+))?/.exec(block);
    const weight = Number(declared?.[1] ?? NaN);
    const weightTo = declared?.[2] ? Number(declared[2]) : weight;
    const stretch = /font-stretch:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? null;
    const url = /url\((https:[^)]+)\)\s*format\('woff2'\)/.exec(block)?.[1];
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? null;
    if (!url || !Number.isFinite(weight)) continue;
    faces.push({ subset: named && SUBSET.test(named) ? named : "text", style, weight, weightTo, stretch, unicodeRange, url });
  }
  return faces;
}

/** `U+0100-02BA, U+2020, U+A720-A7FF` as `[[lo, hi], ...]`. A `?` wildcard (`U+04??`) is expanded to
 *  the range it stands for; Google emits them for some families. */
export function parseUnicodeRange(spec) {
  const ranges = [];
  for (const part of String(spec ?? "").split(",")) {
    const token = part.trim().replace(/^[uU]\+/, "");
    if (!token) continue;
    const dash = token.indexOf("-");
    if (dash > 0) {
      const lo = Number.parseInt(token.slice(0, dash), 16);
      const hi = Number.parseInt(token.slice(dash + 1), 16);
      if (Number.isFinite(lo) && Number.isFinite(hi)) ranges.push([lo, hi]);
      continue;
    }
    if (token.includes("?")) {
      const lo = Number.parseInt(token.replace(/\?/g, "0"), 16);
      const hi = Number.parseInt(token.replace(/\?/g, "F"), 16);
      if (Number.isFinite(lo) && Number.isFinite(hi)) ranges.push([lo, hi]);
      continue;
    }
    const one = Number.parseInt(token, 16);
    if (Number.isFinite(one)) ranges.push([one, one]);
  }
  return ranges;
}

/** Is this code point inside any of these ranges. */
export function rangesCover(ranges, cp) {
  for (const [lo, hi] of ranges) if (cp >= lo && cp <= hi) return true;
  return false;
}

/** The characters a page will actually SET, as code points — everything above the control range,
 *  deduplicated and ordered so a cache key built from them is stable. */
export function codePointsOf(text) {
  const seen = new Set();
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    if (cp < 0x21 || cp === 0x7f) continue;
    seen.add(cp);
  }
  return [...seen].sort((a, b) => a - b);
}

const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

/** The woff2 bytes for one served face, fetched on first use and reused afterwards. Same cache root
 *  as the `.ttf` path, one file per family/weight/style/subset, so ninety pages share twenty files. */
function woff2Bytes(url, path) {
  if (existsSync(path) && statSync(path).size > 0) {
    const held = readFileSync(path);
    if (isWoff2(held)) return held;
    unlinkSync(path); // a cache entry that is not a woff2 is a poisoned one
  }
  if (!url.startsWith(FONT_HOST))
    throw new Error(
      `a face was pointed at ${url}, which is not ${FONT_HOST}. A font file is only taken from ` +
        `Google's own host — a URL read out of a response is data, not trust.`,
    );
  const download = curl([url]);
  if (!download.ok)
    throw new Error(`cannot download ${url}: ${download.err || `curl exit ${download.code}`}`);
  const bytes = download.out;
  if (!isWoff2(bytes))
    throw new Error(
      `what Google served at ${url} is not a woff2 — it is ${describeBytes(bytes)}. Nothing was ` +
        `cached: a cached non-font would set every later page in silence.`,
    );
  writeCached(path, bytes);
  return bytes;
}

const STYLES = new Set(["normal", "italic"]);

/**
 * THE TWO SUBSETS THAT ARE A SAFETY NET, AND WHY EVERYTHING ELSE IS ASKED FOR BY CHARACTER.
 *
 * Google serves a family in up to nine subsets. Taking every one whose range the page touches is
 * how a page ends up 46 KB heavier for the single `−` that Open Sans's `math` subset happens to
 * also contain. Taking only what the page's exact characters need (`text=`) is smallest but brittle:
 * a character a script composes at run time — a digit, a separator, a letter in a value that is
 * formatted rather than written — was never in the scan and would fall through in silence.
 *
 * So `latin` and `latin-ext` are embedded whole, as the net under everything Latin a page can
 * generate at run time, and every code point outside them is asked for by name. Measured on the
 * corpus, that is four characters: U+2082, U+2192, U+2190, U+2265, and Google answers with ~1.4 KB.
 */
const BROAD_SUBSETS = new Set(["latin", "latin-ext"]);

/** The css2 axis fragment for exactly one face. */
const oneFace = (weight, style) => `ital,wght@${style === "italic" ? 1 : 0},${weight}`;

/**
 * EVERY FACE GOOGLE SERVES FOR ONE REQUEST, WITH ITS BYTES — THE ONE FETCHER BOTH CONSUMERS USE.
 *
 * The film had its own copy of this: `film/scripts/fetch-typefaces.mjs` parsed a hand-saved
 * stylesheet, pulled the URLs out with three regexes of its own and base64'd them, with no cache,
 * no host check and no `wOF2` check. The web path needed exactly the same four steps, and wiring
 * recopied per place drifts per place — so the steps live here once and each caller decides only
 * WHICH faces it wants.
 *
 * `keep` runs on the face's metadata BEFORE anything is downloaded, so a page that never types a
 * Cyrillic character never pays for the Cyrillic subset.
 *
 * @param {string} family
 * @param {{spec?: string, text?: string|null, keep?: (face: object) => boolean}} options
 *        `spec` is the css2 axis fragment — `ital,wght@0,400` for one static instance,
 *        `wght@200..800` for the variable file the film carries. `text` narrows the answer to
 *        exactly those characters.
 * @returns {Array<{family, subset, style, weight, unicodeRange, stretch, base64, bytes, url}>}
 */
export function fetchWebFaces(family, { spec = AXIS, text = null, keep = () => true } = {}) {
  const name = assertFamily(family);
  const css = webCssFor(name, { spec, text });
  // A cache file is named for the face it holds. Two different REQUESTS can serve the same family,
  // weight, style and subset as different files — the variable instance and the static one, or a
  // `text=` subset — so anything but the canonical one-face request carries a digest of what was
  // asked for. Without it a variable file would be handed out later as a static one.
  const canonical = text === null && /^ital,wght@[01],\d{3}$/.test(spec);
  const variant = canonical ? "" : `-${createHash("sha256").update(`${spec}|${text ?? ""}`).digest("hex").slice(0, 10)}`;

  const out = [];
  for (const face of parseWebFaces(css)) {
    if (!keep(face)) continue;
    // A face with no `unicode-range` claims U+0-10FFFF, and the LAST such rule wins every code
    // point in the family. A four-glyph extras face silently taking over the whole alphabet is one
    // dropped header away, so it is refused rather than trusted.
    if (!face.unicodeRange)
      throw new Error(
        `Google served a "${name}" ${face.subset} face with no unicode-range. Embedded after the ` +
          `latin subset it would claim every code point in the family and set a whole page in a ` +
          `handful of glyphs. Nothing was written.`,
      );
    const stem = `${name.replace(/\s+/g, "-")}-${face.weight}${face.style === "italic" ? "italic" : ""}`;
    const bytes = woff2Bytes(face.url, join(typefaceCacheDir(), `${stem}-${face.subset}${variant}.woff2`));
    out.push({
      family: name,
      subset: face.subset,
      style: face.style,
      weight: face.weight,
      weightTo: face.weightTo,
      unicodeRange: face.unicodeRange,
      stretch: face.stretch,
      base64: bytes.toString("base64"),
      bytes: bytes.length,
      url: face.url,
    });
  }
  return out;
}

/**
 * THE FACES ONE PAGE NEEDS, AS BYTES, AND NOTHING ELSE.
 *
 * Requested weights that resolve to the SAME served face are returned as one entry carrying a
 * weight RANGE, so a family that serves 400 and 700 and a page that asks for 500 and 600 embed one
 * file rather than two copies of it.
 *
 * @param {Array<{family: string, weight?: number, style?: "normal"|"italic"}>} wanted
 *        one entry per (family, weight, style) the page's own markup and stylesheet declare
 * @param {string} text  every character the page will set — the subsets are chosen against it
 * @returns {Array<{family, weight, weightTo, style, subset, unicodeRange, stretch, base64, bytes, served}>}
 */
export function embeddedWebFaces(wanted, text) {
  const points = codePointsOf(text);

  // Every requested weight, grouped by the face Google will actually serve for it.
  const groups = new Map();
  for (const request of wanted) {
    const family = assertFamily(request.family);
    const weight = assertWeight(request.weight ?? 400);
    const style = request.style ?? "normal";
    if (!STYLES.has(style))
      throw new Error(`a font style is "normal" or "italic", got ${JSON.stringify(style)}`);

    const grid = [
      ...new Map(
        parseWebFaces(webCssFor(family)).map((f) => [`${f.style}|${f.weight}`, { style: f.style, weight: f.weight }]),
      ).values(),
    ];
    if (grid.length === 0)
      throw new Error(
        `Google Fonts serves no web face for "${family}". A web beat embeds its typeface as bytes, ` +
          `so a family this catalogue does not carry is a family no reader can be shown — name one ` +
          `of the ladders' families in resolve-families.mjs instead.`,
      );
    const served = nearestFace(grid, weight, style === "italic");
    if (served.style !== style)
      throw new Error(
        `"${family}" has no ${style} face — Google serves only ` +
          `${[...new Set(grid.map((g) => g.style))].join(", ")}. Declaring the upright bytes as ` +
          `${style} would set the page in the wrong face with nothing to say so, and a browser does ` +
          `not synthesise an oblique from an embedded @font-face. File a family that has the style ` +
          `this beat's register asks for.`,
      );

    const key = `${family}|${served.style}|${served.weight}`;
    const group = groups.get(key) ?? { family, style, served, weights: [] };
    group.weights.push(weight);
    groups.set(key, group);
  }

  const out = [];
  for (const group of groups.values()) {
    const { family, style, served } = group;
    const from = Math.min(...group.weights);
    const to = Math.max(...group.weights);
    const spec = oneFace(served.weight, served.style);
    const covered = [];
    const carry = (face, subset) => {
      covered.push(parseUnicodeRange(face.unicodeRange));
      out.push({
        family,
        weight: from,
        weightTo: to,
        style,
        subset,
        unicodeRange: face.unicodeRange,
        stretch: face.stretch,
        base64: face.base64,
        bytes: face.bytes,
        served: { weight: served.weight, style: served.style },
      });
    };

    // The two broad subsets, and only the ones this page's own words type into.
    for (const face of fetchWebFaces(family, {
      spec,
      keep: (f) =>
        f.style === served.style &&
        BROAD_SUBSETS.has(f.subset) &&
        points.some((cp) => rangesCover(parseUnicodeRange(f.unicodeRange), cp)),
    }))
      carry(face, face.subset);

    // WHAT THE TWO BROAD SUBSETS DO NOT REACH, asked for by name — so CO2 is set in one face rather
    // than two: U+2082 lives in no Google subset of any family on these ladders.
    const leftover = points.filter((cp) => !covered.some((ranges) => rangesCover(ranges, cp)));
    if (leftover.length > 0) {
      const chars = leftover.map((cp) => String.fromCodePoint(cp)).join("");
      const extras = fetchWebFaces(family, { spec, text: chars, keep: (f) => f.style === served.style });
      if (extras.length === 0)
        throw new Error(
          `"${family}" cannot set ${leftover.map(hex).join(", ")} — Google Fonts served no subset ` +
            `for them. Those characters would fall through to whatever the reader's machine happens ` +
            `to have.`,
        );
      const digest = createHash("sha256").update(leftover.join(",")).digest("hex").slice(0, 12);
      for (const face of extras) carry(face, `extras-${digest}`);
      const still = leftover.filter((cp) => !covered.some((ranges) => rangesCover(ranges, cp)));
      if (still.length > 0)
        throw new Error(
          `"${family}" ${served.weight} ${served.style} still cannot set ` +
            `${still.map((cp) => `${hex(cp)} (${JSON.stringify(String.fromCodePoint(cp))})`).join(", ")} ` +
            `after asking Google for exactly those characters. The face has no glyph for them, so ` +
            `the page would draw them in a fallback with nothing to say so — change the character ` +
            `or change the family.`,
        );
    }
  }
  return out;
}

/**
 * The `@font-face` block a page carries at the top of its own stylesheet.
 *
 * `font-display: block` rather than `swap`: the bytes are already in the document, so there is no
 * network to wait for and nothing to gain by painting the fallback first — the same reasoning
 * `film/load-typefaces.ts` states for holding a render until every face reports loaded.
 */
export function fontFaceCss(faces) {
  return faces
    .map((f) => {
      const to = f.weightTo ?? f.weight;
      const note =
        f.served && (f.served.weight < f.weight || f.served.weight > to)
          ? `  /* nearest Google serves: ${f.served.weight} ${f.served.style} */\n`
          : "";
      return (
        `@font-face {\n` +
        `  font-family: "${f.family}";\n` +
        `  font-style: ${f.style};\n` +
        `  font-weight: ${f.weight === to ? f.weight : `${f.weight} ${to}`};\n` +
        note +
        (f.stretch ? `  font-stretch: ${f.stretch};\n` : "") +
        `  font-display: block;\n` +
        `  src: url(data:font/woff2;base64,${f.base64}) format("woff2");\n` +
        (f.unicodeRange ? `  unicode-range: ${f.unicodeRange};\n` : "") +
        `}`
      );
    })
    .join("\n");
}

// ---------------------------------------------------------------------------------------------
// WHAT ONE PAGE ASKS FOR, AND THE GUARD THAT MAKES THE ASKING AND THE CARRYING THE SAME SET.
//
// `fontFilesForSvg` above reads a static plate's own markup to decide which files resvg is handed,
// because a face resvg was not handed simply does not draw. A web page has the mirror problem and
// no such symptom: a face the page did not carry draws PERFECTLY, in the wrong typeface. So the
// same trick — derive from what the document actually declared, never from a module-level default —
// is applied here, and then asserted: `assertFontsEmbedded` refuses a page whose CSS names a family
// it does not carry. That is the web side of `loadSystemFonts: false`. Without it this whole
// mechanism rots the first time someone adds a register.
//
// INHERITANCE IS THE PART A NAIVE SCAN GETS WRONG. This format's own stylesheet names a family
// exactly once — on `body` — and then sets `font-weight: 600` on eight rules that name none. Those
// eight are the body family at 600, and a scan that only paired declarations found on the SAME
// element would carry the 400 and quietly let a browser fake the 600 out of it. So a weight or a
// style declared with no family of its own is attributed to the family `body` sets, and a
// `var(--…)` weight is resolved against the custom properties the document itself defines.

/** HTML entities the markup this reads actually carries. React's `renderToStaticMarkup` escapes
 *  `"` as `&quot;` inside attribute values, which is where every inline `font-family` lives. */
export function decodeEntities(text) {
  return String(text)
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#0*(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

/** The attributes whose value a reader can end up SEEING — a tooltip's own text, an accessible
 *  name, an image's alternative. Everything else in a tag is geometry, class names or a data URI,
 *  and folding those into the page's character set would pull in subsets nothing ever sets. */
const READABLE_ATTR = /\s(?:data-[a-z-]+|aria-label|aria-description|title|alt)="([^"]*)"/g;

/** EVERY CHARACTER THIS PAGE WILL SET — its text nodes plus the attribute values that become text.
 *  The subsets are chosen against this and the coverage guard is measured against it, so the two
 *  can never disagree about what the page says. */
export function pageTextOf(html) {
  const body = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const attrs = [...body.matchAll(READABLE_ATTR)].map((m) => m[1]).join(" ");
  const nodes = body.replace(/<[^>]*>/g, " ");
  return decodeEntities(`${nodes} ${attrs}`);
}

/** The innermost declaration runs of a stylesheet — the only blocks that carry declarations, so
 *  `@media`/`@supports` wrappers fall out for free rather than having to be understood. */
function declarationBlocks(css) {
  return [...String(css).matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
}

/** `700`, `bold`, `var(--title-weight)` — the number, or null when nothing here can say. */
function resolveWeight(raw, vars) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const asVar = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([^)]*))?\)$/.exec(value);
  if (asVar) {
    const held = vars.get(asVar[1]);
    if (held !== undefined) return resolveWeight(held, vars);
    return asVar[2] !== undefined ? resolveWeight(asVar[2], vars) : null;
  }
  if (/^\d{3,4}$/.test(value)) return Number(value);
  if (value === "bold") return 700;
  if (value === "normal") return 400;
  return null;
}

function readFont(source, vars) {
  const family = /font-family\s*[:=]\s*"?([^;"}]+?)"?\s*(?:[;"}]|$)/.exec(source)?.[1];
  const weight = /font-weight\s*[:=]\s*"?([^;"}]+?)"?\s*(?:[;"}]|$)/.exec(source)?.[1];
  const style = /font-style\s*[:=]\s*"?([a-z]+)"?/.exec(source)?.[1];
  return {
    family: family ? requestedFamily(family) : null,
    weight: weight === undefined ? null : resolveWeight(weight, vars),
    weightDeclared: weight ?? null,
    style: style === "italic" ? "italic" : style === "normal" ? "normal" : null,
  };
}

/** A CSS font stack is only ever written back out of this file when it is made of the characters a
 *  family name, a comma and a quote are made of. The stacks come out of a rendered document, and a
 *  document is data. */
const SAFE_STACK = /^[A-Za-z0-9 ,"'_-]+$/;

/**
 * THE STACK A PAGE THAT NAMES NOTHING STILL GETS.
 *
 * `resolve-families.mjs` heads its `sans` ladder with Open Sans, and MapTiler serves the same face
 * as map glyphs, so a panel label and a map label are one design. A page whose component styles no
 * text of its own — every map-web beat today — would otherwise be set in whatever the reader's
 * browser calls `sans-serif`, which is a different typeface on every machine and, like Helvetica
 * before it, a typeface nobody chose. Named here rather than resolved: the ladder's real answer
 * depends on the beat's own text (coverage), and nothing in a copied skill directory may import
 * `resolve-families.mjs` to ask.
 */
export const HOUSE_SANS_STACK = '"Open Sans", Helvetica, Arial, sans-serif';

/**
 * THE FAMILY UNSTYLED TEXT SHOULD FALL TO, READ OFF THE PAGE'S OWN WORDS.
 *
 * Both web formats' stylesheets set `font-family` exactly once, on `body`, and both had it
 * hard-coded to `Helvetica, Arial, sans-serif` — a face nothing embeds and nothing chose. Every
 * word the components do not style themselves (the tooltip above all, which is the beat's own
 * voice answering a hover) was therefore set in a different typeface from the chart it belongs to.
 *
 * Rather than add a parameter twenty-three story runners would have to pass, the stack is READ from
 * the markup the beat just drew: the one its own elements ask for most often.
 */
export function dominantFontStack(markup, fallback = HOUSE_SANS_STACK) {
  const counts = new Map();
  for (const m of String(markup).matchAll(/<[a-zA-Z][^>]*>/g)) {
    const tag = decodeEntities(m[0]);
    for (const d of tag.matchAll(/font-family\s*[:=]\s*"?([^;"}]+?)"?\s*(?:[;"}]|$)/g)) {
      const stack = d[1].trim();
      if (!stack || !SAFE_STACK.test(stack)) continue;
      if (GENERIC_KEYWORDS.has(requestedFamily(stack).toLowerCase())) continue;
      counts.set(stack, (counts.get(stack) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return fallback;
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * EVERY (family, weight, style) THIS DOCUMENT ASKS FOR.
 *
 * @returns {{requests: Array<{family, weight, style}>, inherited: string|null,
 *            unresolved: string[]}}
 *          `unresolved` names every weight this could not turn into a number — a `var()` with no
 *          definition in the document. It is reported rather than defaulted to 400, because a
 *          defaulted weight is exactly the silent wrong answer this file exists to stop.
 */
export function fontRequestsInHtml(html) {
  const text = String(html);
  const sheet = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n")
    .replace(/@font-face\s*\{[^{}]*\}/g, " ");
  // Tags come off the RAW markup and are decoded one at a time: decoding the whole document first
  // would turn a `&gt;` inside an attribute value into a `>` and split that tag in the middle.
  const markup = text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const tags = [...markup.matchAll(/<[a-zA-Z][^>]*>/g)].map((m) => decodeEntities(m[0]));

  const vars = new Map();
  for (const source of [sheet, ...tags])
    for (const m of source.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;"'{}]+)/g)) vars.set(m[1], m[2].trim());

  const units = [...declarationBlocks(sheet), ...tags];
  const read = units
    .map((unit) => readFont(unit, vars))
    // `weightDeclared` and not `weight`: a unit whose ONLY font declaration is a weight this
    // could not resolve has a null weight, and dropping it here would swallow the very case
    // `unresolved` exists to report.
    .filter((f) => f.family || f.weight || f.style || f.weightDeclared !== null);

  // The family unstyled text falls to. Named once, on `body`, by both web formats' stylesheets.
  const bodyFont = /(?:^|[\s,}])body\s*\{([^{}]*)\}/.exec(sheet)?.[1] ?? "";
  const inheritedRaw = /font-family\s*:\s*([^;}]+)/.exec(bodyFont)?.[1];
  const inherited = inheritedRaw ? requestedFamily(inheritedRaw) : null;

  const unresolved = [];
  const requests = new Map();
  for (const f of read) {
    const family = f.family ?? inherited;
    if (!family || GENERIC_KEYWORDS.has(family.toLowerCase())) continue;
    if (f.weightDeclared !== null && f.weight === null) {
      unresolved.push(`${family}: font-weight ${f.weightDeclared}`);
      continue;
    }
    const weight = f.weight ?? 400;
    const style = f.style ?? "normal";
    requests.set(`${family}|${weight}|${style}`, { family, weight, style });
  }
  return { requests: [...requests.values()], inherited, unresolved };
}

/** Every `@font-face` a document already carries, as `{family, weight, style, unicodeRange}`. */
export function embeddedFacesInHtml(html) {
  const faces = [];
  for (const m of String(html).matchAll(/@font-face\s*\{([^{}]*)\}/g)) {
    const block = m[1];
    const family = /font-family\s*:\s*["']?([^;"']+)["']?\s*;/.exec(block)?.[1]?.trim();
    if (!family) continue;
    // `font-weight: 400 600` is a RANGE — one file declared for every weight it answers, which is
    // how a face shared by three requested weights is carried once rather than three times.
    const declared = /font-weight\s*:\s*(\d+)(?:\s+(\d+))?/.exec(block);
    const weight = Number(declared?.[1] ?? 400);
    faces.push({
      family,
      weight,
      weightTo: declared?.[2] ? Number(declared[2]) : weight,
      style: /font-style\s*:\s*italic/.test(block) ? "italic" : "normal",
      unicodeRange: /unicode-range\s*:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? null,
    });
  }
  return faces;
}

/**
 * THE GUARD. A page whose CSS names a family it does not carry does not get written.
 *
 * Three ways to fail, each one a real reader seeing a typeface nobody chose:
 *   - a family named and not embedded at all — the defect this whole section exists to end;
 *   - a weight or style named and not embedded, which a browser answers by faking a bold or
 *     leaving an italic upright;
 *   - a character the embedded faces' own `unicode-range`s do not reach, which falls through one
 *     glyph at a time and is the hardest of the three to see.
 */
export function assertFontsEmbedded(html) {
  const { requests, unresolved } = fontRequestsInHtml(html);
  const faces = embeddedFacesInHtml(html);
  const problems = [];

  for (const line of unresolved)
    problems.push(
      `${line} — this page defines no value for that custom property, so nothing here can say ` +
        `which weight to carry. Set it on the figure, or name the weight literally.`,
    );

  const families = new Set(faces.map((f) => f.family));
  const named = new Set();
  for (const want of requests) {
    if (!families.has(want.family)) {
      if (named.has(want.family)) continue;
      named.add(want.family);
      problems.push(
        `"${want.family}" is named by this page's CSS and no @font-face carries it. A reader ` +
          `without it installed sees the bridge face — Georgia or Helvetica — and nothing says so.`,
      );
      continue;
    }
    const carried = faces.filter(
      (f) => f.family === want.family && f.style === want.style && want.weight >= f.weight && want.weight <= f.weightTo,
    );
    if (carried.length === 0)
      problems.push(
        `"${want.family}" ${want.weight} ${want.style} is named by this page's CSS and not carried; ` +
          `it carries ${faces
            .filter((f) => f.family === want.family)
            .map((f) => `${f.weight === f.weightTo ? f.weight : `${f.weight}-${f.weightTo}`} ${f.style}`)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(", ")}. A browser answers a missing weight by faking one out of the nearest, and ` +
          `an italic it was not given by leaving the words upright.`,
      );
  }

  if (faces.length > 0) {
    const ranges = faces.flatMap((f) => parseUnicodeRange(f.unicodeRange));
    const uncovered = codePointsOf(pageTextOf(html)).filter((cp) => !rangesCover(ranges, cp));
    if (uncovered.length > 0)
      problems.push(
        `this page sets ${uncovered
          .map((cp) => `${hex(cp)} (${JSON.stringify(String.fromCodePoint(cp))})`)
          .join(", ")} and no embedded face's unicode-range reaches ${uncovered.length === 1 ? "it" : "them"}.`,
      );
  }

  if (problems.length > 0)
    throw new Error(
      `this page would ship in a typeface nobody chose:\n  - ${problems.join("\n  - ")}\n` +
        `Every family a web page names travels with it as bytes (shared/design-base/typefaces.mjs, ` +
        `embeddedWebFaces) — there is no link and no system face to fall back to.`,
    );
}

/**
 * THE ONLY PLACE THAT CAN SAY THE READER REALLY SEES THE FACE — RUN INSIDE A REAL BROWSER.
 *
 * Everything above is a build-time argument about bytes. None of it can answer the question that
 * matters, which is what a browser DID with them: an `@font-face` with a corrupt `src`, a
 * `unicode-range` that excludes the character it was fetched for, a family name spelled one way in
 * the rule and another in the stack — every one of those ships a page that looks fine to a text
 * scan and renders in Georgia.
 *
 * This function is written to be handed to `page.evaluate` (puppeteer serialises it, so it closes
 * over nothing and calls nothing from this module). It MEASURES; the caller decides what is a
 * failure, because `chart-web` and `map-web` each own their own `check()`.
 *
 * Three independent measurements per (family, weight, style) the page actually sets, chosen so that
 * no single one of them can pass on a page with no faces in it:
 *
 *   - `hasFace`: is there a `FontFace` object for it in `document.fonts`. This set holds ONLY faces
 *     the document declared or a script added — a family merely installed on the machine running
 *     the test is not in it. That is what makes the mutation "delete the @font-face block" go red
 *     even on a laptop that happens to have Merriweather.
 *   - `covers` / `uncovered`: every distinct character this triple sets, tested against the
 *     `unicodeRange` of the `FontFace` objects the BROWSER parsed. `document.fonts.check(font, text)`
 *     is NOT enough on its own and the difference cost a mutation to find: its question is "are the
 *     fonts this text NEEDS loaded", and a character outside every declared range needs no custom
 *     font at all, so it answers true and the glyph quietly comes from the fallback. Deleting
 *     U+2082 from every `unicode-range` in a shipped page left `check()` green; reading the ranges
 *     back turns it red.
 *   - `widthWithFirst` / `widthWithoutFirst`: the same string measured in the element's own stack
 *     and in that stack with the intended family REMOVED, i.e. in the bridge the page falls to.
 *     Equal widths mean the browser is already drawing the bridge. This is the one measurement that
 *     survives every way of lying about a font being "available".
 */
export async function probeTypefaces() {
  const GENERIC = new Set([
    "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
    "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong",
  ]);
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, "").trim();

  await document.fonts.ready;

  const uses = new Map();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const text = node.nodeValue ?? "";
    if (!text.trim()) continue;
    const el = node.parentElement;
    if (!el) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const stack = style.fontFamily;
    const family = unquote(stack.split(",")[0]);
    if (!family || GENERIC.has(family.toLowerCase())) continue;
    const key = `${family}|${style.fontWeight}|${style.fontStyle}|${stack}`;
    const held = uses.get(key) ?? {
      family,
      stack,
      weight: style.fontWeight,
      style: style.fontStyle,
      nodes: 0,
      chars: new Set(),
    };
    held.nodes += 1;
    for (const ch of text) if (ch.trim()) held.chars.add(ch);
    uses.set(key, held);
  }

  // A `unicode-range` as the browser itself parsed it. Read off `FontFace.unicodeRange` rather
  // than off the source text, so what is measured is what the engine actually believes.
  const rangesOf = (spec) => {
    const out = [];
    for (const part of String(spec ?? "U+0-10FFFF").split(",")) {
      const token = part.trim().replace(/^[uU]\+/, "");
      if (!token) continue;
      if (token.includes("?")) {
        out.push([parseInt(token.replace(/\?/g, "0"), 16), parseInt(token.replace(/\?/g, "F"), 16)]);
        continue;
      }
      const dash = token.indexOf("-");
      if (dash > 0) out.push([parseInt(token.slice(0, dash), 16), parseInt(token.slice(dash + 1), 16)]);
      else out.push([parseInt(token, 16), parseInt(token, 16)]);
    }
    return out.filter(([lo, hi]) => Number.isFinite(lo) && Number.isFinite(hi));
  };
  const weightHolds = (declaredWeight, want) => {
    const bounds = String(declaredWeight).trim().split(/\s+/).map(Number);
    const lo = bounds[0];
    const hi = bounds.length > 1 ? bounds[1] : bounds[0];
    return Number.isFinite(want) && want >= lo && want <= hi;
  };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const out = [];
  for (const use of uses.values()) {
    const chars = [...use.chars].join("");
    const alone = `${use.style} ${use.weight} 16px "${use.family}"`;
    let loaded = false;
    try {
      await document.fonts.load(alone, chars);
      loaded = document.fonts.check(alone, chars);
    } catch {
      loaded = false;
    }
    // Which code points THIS triple's own faces claim. A character outside all of them is drawn by
    // the fallback, one glyph at a time, and `document.fonts.check` says nothing about it.
    const mine = [...document.fonts].filter(
      (f) =>
        unquote(f.family) === use.family && f.style === use.style && weightHolds(f.weight, Number(use.weight)),
    );
    const claimed = mine.flatMap((f) => rangesOf(f.unicodeRange));
    const uncovered = [...use.chars].filter((ch) => {
      const cp = ch.codePointAt(0);
      return !claimed.some(([lo, hi]) => cp >= lo && cp <= hi);
    });
    const covers = loaded && uncovered.length === 0;
    // The same stack minus its first entry: what this element falls to when the intended face is
    // not really there. A page with no @font-face measures identically in both.
    const without = use.stack.split(",").slice(1).join(",").trim() || "serif";
    const probe = chars.repeat(4).slice(0, 400) || "Hamburgefonstiv";
    ctx.font = `${use.style} ${use.weight} 16px ${use.stack}`;
    const widthWithFirst = ctx.measureText(probe).width;
    ctx.font = `${use.style} ${use.weight} 16px ${without}`;
    const widthWithoutFirst = ctx.measureText(probe).width;
    out.push({
      family: use.family,
      stack: use.stack,
      weight: use.weight,
      style: use.style,
      nodes: use.nodes,
      characters: use.chars.size,
      hasFace: [...document.fonts].some((f) => unquote(f.family) === use.family),
      hasExactFace: [...document.fonts].some((f) => {
        if (unquote(f.family) !== use.family || f.style !== use.style) return false;
        // A declared weight is either one number or a RANGE ("400 600") — one file carrying every
        // weight it answers for.
        const bounds = String(f.weight).trim().split(/\s+/).map(Number);
        const lo = bounds[0];
        const hi = bounds.length > 1 ? bounds[1] : bounds[0];
        const want = Number(use.weight);
        return Number.isFinite(want) && want >= lo && want <= hi;
      }),
      covers,
      loaded,
      uncovered: uncovered.map((ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} ${JSON.stringify(ch)}`),
      widthWithFirst,
      widthWithoutFirst,
      fallbackStack: without,
    });
  }

  const declared = [...document.fonts].map((f) => ({
    family: unquote(f.family),
    weight: String(f.weight),
    style: f.style,
    status: f.status,
  }));
  return { uses: out, declared };
}
