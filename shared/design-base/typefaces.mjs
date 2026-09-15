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
import fontverter from "fontverter";
import subsetFont from "subset-font";

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
  // DECODED FIRST, because a stack read off a document can still be carrying its entities: an SVG
  // attribute holding `&quot;Open Sans&quot;, Helvetica` would otherwise answer `&quot;Open Sans&quot;`,
  // which is not a family anybody can fetch and not a name any error message would make sense of.
  return decodeEntities(stack).split(",")[0].replace(/^["']|["']$/g, "").trim();
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

/**
 * A code point that carries no ink — every Unicode space separator and the format characters that
 * travel with text. Excluded from "what this page sets" on both sides: the subset is not asked to
 * carry them, and the coverage guard does not demand them.
 *
 * NOT a convenience. Google's own `unicode-range` for the `latin` subset claims `U+2000-206F`
 * wholesale, and the file it serves does not have half of it — measured on the real bytes, Open
 * Sans latin and Merriweather latin both carry U+00A0 and U+2009 and NEITHER carries U+202F, the
 * narrow no-break space that `Intl.NumberFormat("fr-FR")` puts between a number's thousands. Once
 * coverage is measured off the font's own cmap rather than off Google's claim, a French figure
 * would fail a build that no upstream can fix. A space nobody has a glyph for draws nothing either
 * way; a LETTER nobody has a glyph for is the defect this file exists to catch, and it is still
 * caught. `probeTypefaces` in the browser already skips the same characters (`ch.trim()`), so the
 * two sides measure one set.
 */
function inkless(cp) {
  return (
    cp < 0x21 ||
    cp === 0x7f ||
    cp === 0xa0 ||
    cp === 0xad || // soft hyphen — drawn only where a line breaks, and never by a chosen face
    (cp >= 0x2000 && cp <= 0x200f) || // the en/em space family, the zero-widths, the bidi marks
    (cp >= 0x2028 && cp <= 0x202f) || // the separators and the bidi embedding controls
    (cp >= 0x205f && cp <= 0x2064) ||
    cp === 0x3000 ||
    cp === 0xfeff
  );
}

/** The characters a page will actually SET, as code points — everything that carries ink,
 *  deduplicated and ordered so a cache key built from them is stable. */
export function codePointsOf(text) {
  const seen = new Set();
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    if (inkless(cp)) continue;
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

// ---------------------------------------------------------------------------------------------
// THE SUBSET, AND WHY ITS COVERAGE IS READ BACK OUT OF THE BYTES RATHER THAN CLAIMED.
//
// Embedding Google's whole `latin` subset costs a page 13 KB for Open Sans and 49 KB for
// Merriweather, before base64 adds a third — for ~231 glyphs where a chart page sets eighty. So
// each face is cut down to the characters the page can actually display, with `subset-font`
// (harfbuzz's own `hb-subset`, compiled to wasm).
//
// The part that is not obvious: hb-subset SILENTLY DROPS a character the source font has no glyph
// for. Ask Open Sans's latin file for `₂` and it hands back a font without it and says nothing —
// which is exactly the shape of defect this whole file exists to end. And Google's declared
// `unicode-range` cannot be used to tell, because it OVERCLAIMS: `latin` says `U+2000-206F` and
// the file carries maybe a third of it (measured above, `inkless`).
//
// So the emitted `unicode-range` is a MEASUREMENT of the shipped bytes: the subset is converted
// back to TrueType and its `cmap` is read. What the rule claims and what the file can set are then
// the same thing by construction, which is what makes `assertFontsEmbedded`'s coverage check — and
// the browser's own reading of `FontFace.unicodeRange` — worth anything at all.

/**
 * Every code point a font can set, read off its own `cmap`. Takes TrueType/OpenType bytes.
 *
 * Formats 4 and 12 only, and deliberately: those are the two a Google Fonts file and an hb-subset
 * output actually carry. A subtable in any other format is skipped rather than guessed at, and a
 * font with no readable subtable comes back empty — which fails the caller loudly rather than
 * quietly claiming coverage.
 */
export function fontCodePoints(bytes) {
  const buf = Buffer.from(bytes);
  if (buf.length < 12) throw new Error(`not a font: ${describeBytes(buf)}`);
  if (buf.readUInt32BE(0) === 0x74746366)
    throw new Error("this is a font COLLECTION; one face at a time is the only thing embedded");
  const count = buf.readUInt16BE(4);
  let cmapOff = null;
  for (let i = 0; i < count; i += 1) {
    const rec = 12 + i * 16;
    if (rec + 16 > buf.length) break;
    if (buf.toString("latin1", rec, rec + 4) === "cmap") cmapOff = buf.readUInt32BE(rec + 8);
  }
  if (cmapOff === null || cmapOff + 4 > buf.length)
    throw new Error("this font carries no cmap, so nothing can say which characters it sets");

  const subtables = [];
  const n = buf.readUInt16BE(cmapOff + 2);
  for (let i = 0; i < n; i += 1) {
    const rec = cmapOff + 4 + i * 8;
    if (rec + 8 > buf.length) break;
    subtables.push({
      platform: buf.readUInt16BE(rec),
      encoding: buf.readUInt16BE(rec + 2),
      off: cmapOff + buf.readUInt32BE(rec + 4),
    });
  }
  // A full-repertoire Unicode subtable first (3/10 or 0/4+), then the BMP one. Reading the MacRoman
  // table by accident would report a hundred code points that are not the ones anybody asked for.
  const rank = (s) =>
    (s.platform === 3 && s.encoding === 10) || (s.platform === 0 && s.encoding >= 4)
      ? 2
      : (s.platform === 3 && s.encoding === 1) || s.platform === 0
        ? 1
        : 0;
  subtables.sort((a, b) => rank(b) - rank(a));

  const out = new Set();
  for (const s of subtables) {
    if (s.off + 4 > buf.length) continue;
    const format = buf.readUInt16BE(s.off);
    if (format === 4) {
      const segX2 = buf.readUInt16BE(s.off + 6);
      const segs = segX2 / 2;
      const ends = s.off + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const rangeOffsets = deltas + segX2;
      for (let i = 0; i < segs; i += 1) {
        const end = buf.readUInt16BE(ends + i * 2);
        const start = buf.readUInt16BE(starts + i * 2);
        if (start > end) continue;
        const delta = buf.readInt16BE(deltas + i * 2);
        const ro = buf.readUInt16BE(rangeOffsets + i * 2);
        for (let cp = start; cp <= end && cp !== 0x10000; cp += 1) {
          let gid;
          if (ro === 0) gid = (cp + delta) & 0xffff;
          else {
            const at = rangeOffsets + i * 2 + ro + (cp - start) * 2;
            if (at + 2 > buf.length) continue;
            gid = buf.readUInt16BE(at);
            if (gid !== 0) gid = (gid + delta) & 0xffff;
          }
          if (gid !== 0) out.add(cp);
        }
      }
      break;
    }
    if (format === 12) {
      const groups = buf.readUInt32BE(s.off + 12);
      for (let i = 0; i < groups; i += 1) {
        const g = s.off + 16 + i * 12;
        if (g + 12 > buf.length) break;
        const start = buf.readUInt32BE(g);
        const end = buf.readUInt32BE(g + 4);
        if (buf.readUInt32BE(g + 8) === 0) continue;
        for (let cp = start; cp <= end; cp += 1) out.add(cp);
      }
      break;
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** `[0x41, 0x42, 0x43, 0x2082]` as `U+41-43, U+2082` — consecutive runs collapsed, because a face
 *  carrying two hundred characters would otherwise write two hundred separate tokens into every
 *  page that embeds it. */
export function rangeSpec(codePoints) {
  const sorted = [...new Set(codePoints)].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1;
    parts.push(i === j ? hexOf(sorted[i]) : `${hexOf(sorted[i])}-${sorted[j].toString(16).toUpperCase()}`);
    i = j + 1;
  }
  return parts.join(", ");
}

const hexOf = (cp) => `U+${cp.toString(16).toUpperCase()}`;

/** Subsets already cut this run, and the ones an earlier run left on disk. Keyed by the source
 *  bytes and the exact characters asked for, so two pages that set the same words share one cut. */
const subsetsInMemory = new Map();

/**
 * ONE FACE, CUT DOWN TO THE CHARACTERS IT IS ASKED FOR, AND WHAT IT REALLY ENDED UP CARRYING.
 *
 * @param {Buffer} bytes  the woff2 Google served
 * @param {number[]} codePoints  what to keep
 * @returns {Promise<{bytes: Buffer, codePoints: number[]}>} `codePoints` is read back off the
 *          result's own `cmap`, so it is what the file CAN set — never what was asked for.
 */
export async function subsetWebFace(bytes, codePoints) {
  const wanted = [...new Set(codePoints)].sort((a, b) => a - b);
  if (wanted.length === 0) return { bytes: Buffer.alloc(0), codePoints: [] };
  const key = createHash("sha256")
    .update(bytes)
    .update("|")
    .update(wanted.join(","))
    .digest("hex")
    .slice(0, 32);
  const held = subsetsInMemory.get(key);
  if (held) return held;

  const path = join(typefaceCacheDir(), `subset-${key}.woff2`);
  let cut = null;
  if (existsSync(path) && statSync(path).size > 0) {
    const cached = readFileSync(path);
    if (isWoff2(cached)) cut = cached;
    else unlinkSync(path); // a cache entry that is not a woff2 is a poisoned one
  }
  if (!cut) {
    cut = Buffer.from(
      await subsetFont(Buffer.from(bytes), wanted.map((cp) => String.fromCodePoint(cp)).join(""), {
        targetFormat: "woff2",
      }),
    );
    if (!isWoff2(cut))
      throw new Error(`subsetting produced ${describeBytes(cut)} rather than a woff2. Nothing was cached.`);
    writeCached(path, cut);
  }
  // READ BACK, not claimed. hb-subset drops a character the source has no glyph for and says
  // nothing; converting the RESULT to TrueType and reading its cmap is the only thing that knows.
  const answer = { bytes: cut, codePoints: fontCodePoints(await fontverter.convert(cut, "truetype")) };
  subsetsInMemory.set(key, answer);
  return answer;
}

const STYLES = new Set(["normal", "italic"]);

const familyCoverage = new Map();

/**
 * EVERY CODE POINT A FAMILY CAN SET, read off the family's own `cmap` — the table the browser and
 * the rasteriser both consult, and the only answer that is not somebody's claim.
 *
 * It reads the UPRIGHT 400, on the same premise `glyph-coverage.mjs` states beside this file: a
 * family's character set is a property of its design, and Google serves the same set across a
 * family's weights. The file is the one `typefaceFile` already fetched for the static side, so on
 * any machine that has rendered this family once the question costs no network at all. It is the
 * WHOLE family, which is why it is read rather than the woff2 subsets the web path embeds: a subset
 * can only say what is in that subset, and every character that reaches this question is by
 * definition outside the two the page already carries.
 *
 * `null` when the family has no fetchable file — Google serves `Helvetica` to a browser as woff2
 * and to a rasteriser as a kit URL with no `.ttf` on it, so the question genuinely has no answer
 * here. A caller that cannot know must not claim; it falls through and lets the fetch say.
 */
function familyCodePoints(family) {
  if (familyCoverage.has(family)) return familyCoverage.get(family);
  let covered = null;
  try {
    covered = new Set(fontCodePoints(readFileSync(typefaceFile(family, 400))));
  } catch {
    covered = null;
  }
  familyCoverage.set(family, covered);
  return covered;
}

/**
 * THE ONE REFUSAL FOR "THIS FAMILY CANNOT SET THIS CHARACTER", whatever found it out.
 *
 * It names the character twice — as a code point somebody can look up and as the character itself —
 * and the family and the face, because the two honest fixes are editorial and they are the two it
 * names: set the character from a face that has it, or change the word. Nothing is written, so a
 * page never ships a glyph it cannot draw.
 */
function cannotSet(family, served, points, because) {
  return new Error(
    `"${family}" ${served.weight} ${served.style} cannot set ` +
      `${points.map((cp) => `${hex(cp)} (${JSON.stringify(String.fromCodePoint(cp))})`).join(", ")} — ` +
      `${because}. The page would draw them in a fallback with nothing to say so, so nothing was ` +
      `written: change the character or change the family.`,
  );
}

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
      // The raw file, for a caller that cuts it down before embedding it. `base64` above stays the
      // WHOLE face, because the film embeds exactly what Google served.
      buffer: bytes,
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
 * EACH FACE IS CUT DOWN TO THE CHARACTERS THE PAGE CAN DISPLAY. `text` is the whole displayable
 * surface, not the words in the initial markup — see `displayableTextOf`, which is what the two
 * renderers hand in. Every family gets every one of those characters rather than the ones the page
 * happens to set in THAT family: a build-time scan cannot attribute a tooltip's words to a family
 * (the tooltip is one element and its text arrives on hover), and the conservative direction here
 * is carrying a glyph nobody reads, never omitting one somebody does.
 *
 * @param {Array<{family: string, weight?: number, style?: "normal"|"italic"}>} wanted
 *        one entry per (family, weight, style) the page's own markup and stylesheet declare
 * @param {string} text  every character the page can display — the subsets are cut against it
 * @returns {Promise<Array<{family, weight, weightTo, style, subset, unicodeRange, stretch, base64,
 *          bytes, served, servedBytes}>>}
 */
export async function embeddedWebFaces(wanted, text) {
  // REQUIRED is what the page can be READ saying; DESIRED adds the digits and signs a value could
  // be formatted with (`RUNTIME_NUMBER_CHARACTERS`). The two are separate because they fail
  // differently: a required character no face can set stops the build, and a desired one the family
  // simply does not have (`‰` in both house families' latin files) is dropped without a word.
  const required = codePointsOf(text);
  const points = codePointsOf(`${text}${RUNTIME_NUMBER_CHARACTERS}`);

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
    // What the faces carried so far CAN SET — read off each cut file's own cmap, never off the
    // `unicode-range` Google declares for it, because that range overclaims (see `subsetWebFace`).
    const settable = new Set();
    const carry = async (face, subset) => {
      const asked = points.filter((cp) => rangesCover(parseUnicodeRange(face.unicodeRange), cp));
      if (asked.length === 0) return;
      const cut = await subsetWebFace(face.buffer, asked);
      // A face whose every asked-for character turned out not to be in it is not embedded at all.
      // Declaring it would put an empty `unicode-range` and 800 bytes into the page for nothing.
      if (cut.codePoints.length === 0) return;
      for (const cp of cut.codePoints) settable.add(cp);
      out.push({
        family,
        weight: from,
        weightTo: to,
        style,
        subset,
        // THE MEASUREMENT, not the claim: exactly what this file's cmap holds.
        unicodeRange: rangeSpec(cut.codePoints),
        stretch: face.stretch,
        base64: cut.bytes.toString("base64"),
        bytes: cut.bytes.length,
        servedBytes: face.bytes,
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
      await carry(face, face.subset);

    // WHAT THE TWO BROAD SUBSETS DO NOT REACH, asked for by name — so CO2 is set in one face rather
    // than two: U+2082 lives in no Google subset of any family on these ladders. "Do not reach" is
    // now measured on the cut bytes, so a character Google's `latin` range CLAIMS and its latin file
    // does not have (U+2191 is one) reaches this branch instead of shipping as a silent fallback.
    const leftover = required.filter((cp) => !settable.has(cp));
    if (leftover.length > 0) {
      // THE FAMILY'S OWN cmap IS ASKED BEFORE GOOGLE IS — because Google answers the question with a
      // TRANSPORT ERROR and this file is supposed to answer it with an editorial fact.
      //
      // Measured 2026-09-15, one character at a time, against every family on the ladders: css2
      // answers `text=→` for Open Sans with HTTP 200 and a perfectly formed stylesheet, one
      // `@font-face`, a `unicode-range`, a kit URL — and Open Sans's cmap has no U+2192. The kit URL
      // that stylesheet points at then returns **400** with a 1664-byte error page. Same for `ᵉ`,
      // `ʳ` and `←` on Open Sans, `ʳ` on Montserrat and on Merriweather; `₂` on Open Sans, which the
      // face DOES carry, returns 200 and 804 bytes. So the 400 is Google's way of saying "this face
      // has no glyph for what you asked for" — it is not a malformed request, not an encoding fault
      // and not a length limit.
      //
      // Downloaded first, that 400 surfaced as `cannot download …/l/font?kit=… 400` out of
      // `woff2Bytes`, which names neither the character nor the family and reads like a network
      // fault. It is the exact class of opaque answer this file exists to end, and it stopped seven
      // beats from rendering at all. The cmap is ground truth and is already on disk, so it is read
      // here and the refusal below is the one the design base always meant to raise.
      const covered = familyCodePoints(family);
      const absent = covered ? leftover.filter((cp) => !covered.has(cp)) : [];
      if (absent.length > 0) throw cannotSet(family, served, absent, "the face has no glyph for them");

      const chars = leftover.map((cp) => String.fromCodePoint(cp)).join("");
      // AND ANY OTHER UNSATISFIABLE KIT REQUEST IS NAMED TOO. The cmap covers the cause that was
      // measured; a fetch that fails for a reason nobody has measured yet must still say which
      // characters and which family were being asked for, rather than hand up a bare curl exit.
      let extras;
      try {
        extras = fetchWebFaces(family, { spec, text: chars, keep: (f) => f.style === served.style });
      } catch (cause) {
        throw cannotSet(family, served, leftover, `Google Fonts refused the request for them: ${cause.message}`);
      }
      if (extras.length === 0)
        throw cannotSet(family, served, leftover, "Google Fonts served no subset for them");
      const digest = createHash("sha256").update(leftover.join(",")).digest("hex").slice(0, 12);
      for (const face of extras) await carry(face, `extras-${digest}`);
      const still = leftover.filter((cp) => !settable.has(cp));
      if (still.length > 0)
        throw cannotSet(
          family,
          served,
          still,
          "the face still has no glyph for them after asking Google for exactly those characters",
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

/**
 * EVERY STRING INSIDE THIS PAGE'S JSON PAYLOADS — `<script type="application/json">` and nothing
 * else, so the inlined MapLibre library (a `<script>` with no type) is not mistaken for text.
 *
 * A map-web beat carries its live plan in one of these, and `live-map.mjs` puts
 * `properties.detail || properties.name` straight into the tooltip for a feature that has no button
 * of its own. Those words are in NO text node and in no attribute: with the whole `latin` subset
 * embedded they simply drew, and the moment a face is cut to the markup's own characters they are
 * exactly the glyph that goes missing only when a reader hovers a hex bin.
 *
 * Keys are folded in with values. A key never reaches a reader, but it costs a handful of ASCII
 * characters the page already sets, and telling them apart would mean knowing this plan's shape.
 */
export function jsonPayloadText(html) {
  const out = [];
  for (const m of String(html).matchAll(
    /<script\b[^>]*\btype\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = m[1].replace(/\\u003c/gi, "<");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Not parseable here — then nothing can say which of its characters are text, so ALL of them
      // are. Widening, in the one direction this file is ever allowed to be wrong in.
      out.push(raw);
      continue;
    }
    const walk = (node) => {
      if (typeof node === "string") out.push(node);
      else if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object")
        for (const [k, v] of Object.entries(node)) {
          out.push(k);
          walk(v);
        }
    };
    walk(parsed);
  }
  return out.join(" ");
}

/** Text a stylesheet GENERATES — `content: "…"`. Nothing in either web format writes one today, and
 *  that is exactly why it is read: `pageTextOf` throws `<style>` away, so the day someone adds a
 *  `::after { content: "→" }` the arrow would be in no text node, in no attribute, and in no
 *  subset. Counter and attr() forms are ignored on purpose — neither can name a character here. */
export function cssContentText(html) {
  const out = [];
  for (const sheet of String(html).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    for (const decl of sheet[1].matchAll(/content\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g))
      out.push(
        decl[1]
          .slice(1, -1)
          .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
          .replace(/\\(.)/g, "$1"),
      );
  return out.join(" ");
}

/**
 * EVERYTHING THIS PAGE CAN DISPLAY — the one set both the cutting and the guard are measured
 * against.
 *
 * `pageTextOf` above is what the page says WHEN IT LOADS. That was enough while the whole `latin`
 * subset travelled with every page, because anything a reader could ever provoke was Latin and the
 * net was under it. It is not enough once a face is cut to a list of characters: a glyph missing
 * only on hover looks perfect in every screenshot, which is the defect this function exists to
 * prevent. So:
 *
 *   - the text nodes and the readable attributes — `pageTextOf`. Every word the interaction can put
 *     on screen is ALREADY one of these: `interaction.mjs` in both formats does
 *     `tooltip.textContent = el.getAttribute("data-detail")` and nothing else. Neither script
 *     formats a number, concatenates a string or holds a template — measured by reading them, and
 *     it is the reason a runtime formatter needs no separate scan here. The day one appears, its
 *     output has to be written into this page before it can be read out of it.
 *   - the JSON payloads — `jsonPayloadText`, the one runtime string source that is in no attribute.
 *   - generated content — `cssContentText`.
 *
 * `RUNTIME_NUMBER_CHARACTERS` is deliberately NOT in here: this is the set the coverage guard
 * REQUIRES, and those are carried on a best-effort basis. `embeddedWebFaces` adds them itself.
 */
export function displayableTextOf(html) {
  return `${pageTextOf(html)} ${jsonPayloadText(html)} ${cssContentText(html)}`;
}

/**
 * THE CHARACTERS A FORMATTED NUMBER IS MADE OF, carried whether this page happens to print them or
 * not — and the only part of the cut that is not derived from the document.
 *
 * A beat's own words are fixed the moment it is rendered, and so are its `data-detail` strings. A
 * DIGIT is the one thing that is not: a series whose readings all start with 1 and 2 types no `7`,
 * and the cost of being wrong about that is a tooltip with a hole in it. Ten digits, the separators
 * and signs a number can be written with, and the units that follow one — about thirty characters,
 * almost all of which a chart page sets anyway.
 *
 * Best-effort, deliberately: a face that turns out not to have one of these (`‰` is missing from
 * Google's own latin file for both house families) simply does not carry it. These are insurance
 * against a character the page could print, not a claim that it does print it — so they are cut
 * FOR and never REQUIRED, which is what keeps a missing per-mille from failing an honest build.
 */
export const RUNTIME_NUMBER_CHARACTERS = "0123456789.,'’·:/()+-−–—%‰°";

/** The innermost declaration runs of a stylesheet — the only blocks that carry declarations, so
 *  `@media`/`@supports` wrappers fall out for free rather than having to be understood. */
function declarationBlocks(css) {
  return [...String(css).matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
}

/** `700`, `bold`, `var(--title-weight)` — the number, or null when nothing here can say. */
/**
 * A DECLARED VALUE WITH ITS `var()` FOLLOWED — for any font property, not just the weight.
 *
 * The weight has always been resolved this way; the FAMILY and the SLOPE were read raw, so a
 * stylesheet that took them from a custom property handed this file the literal string
 * `var(--title-family)` as a family name and `var(--subtitle-style)` as a slope. The first is
 * refused by `assertFamily` (it is not a fetchable Google family, and rightly so); the second falls
 * through every branch and comes back `null`, which means an italic register asks for an UPRIGHT
 * face, gets one embedded, and the browser fakes the slope — a substitution with no error at all.
 *
 * Measured on `proof/mapgen-locator-web` the moment `figureVars` began carrying families: the page
 * sets its title from `--title-family` and its source line from `--source-family` plus
 * `--subtitle-style`, which is exactly how a filed direction reaches a stylesheet that does not
 * know which direction it is being rendered in.
 *
 * `depth` stops a `--a: var(--b); --b: var(--a)` pair from recursing; a cycle resolves to nothing,
 * which is what an unresolvable value already means here.
 */
function resolveVar(raw, vars, depth = 0) {
  const value = String(raw ?? "").trim();
  const asVar = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([^)]*))?\)$/.exec(value);
  if (!asVar) return value;
  if (depth > 8) return "";
  const held = vars.get(asVar[1]);
  if (held !== undefined) return resolveVar(held, vars, depth + 1);
  return asVar[2] !== undefined ? resolveVar(asVar[2], vars, depth + 1) : "";
}

function resolveWeight(raw, vars) {
  const value = resolveVar(raw, vars);
  if (!value) return null;
  if (/^\d{3,4}$/.test(value)) return Number(value);
  if (value === "bold") return 700;
  if (value === "normal") return 400;
  return null;
}

/**
 * EVERY `font-family` A SOURCE WRITES, IN THE ORDER IT WRITES THEM.
 *
 * Two shapes, and one pattern could never read both:
 *
 *   - a DECLARATION (`font-family: "Open Sans", Helvetica`) — it ends at `;`, `}` or the end of the
 *     block, and a quote inside it is part of the value;
 *   - a PRESENTATION ATTRIBUTE (`font-family="…"`) — it ends at its own closing delimiter, and a
 *     quote inside it is ALSO part of the value.
 *
 * The second is what this file was blind to, and the blindness was silent. A tag reaches the
 * readers below already decoded (see `fontRequestsInHtml`), so an attribute holding a stack whose
 * first family is quoted — which is every stack `figureVars` emits — arrives as
 * `font-family=""Open Sans", Helvetica, Arial, sans-serif"`. The old single pattern stopped at the
 * first quote, matched NOTHING at all, and the request fell through to the page's inherited body
 * family: `assertFontsEmbedded` was then told about a face the page does carry, and went green over
 * text drawn in one it does not. Measured on `proof/web-small-multiples-solar-eu-six` before that
 * beat worked around it locally: forty `<text>` elements set in Open Sans 400 on a `rapport` page
 * that embedded Open Sans 700 and Merriweather, with every guard green.
 *
 * The attribute patterns close on a quote FOLLOWED BY whitespace, `/` or `>` — the only place an
 * attribute value can end inside a tag — so a quote belonging to the stack cannot end it early.
 * The declaration pattern is the one this file has always used, kept byte for byte and tried last,
 * so a `style="…"` attribute and a stylesheet block still read exactly as before.
 */
const FONT_FAMILY_WRITTEN = new RegExp(
  [
    'font-family\\s*=\\s*"([\\s\\S]*?)"(?=[\\s/>]|$)',
    "font-family\\s*=\\s*'([\\s\\S]*?)'(?=[\\s/>]|$)",
    'font-family\\s*[:=]\\s*"?([^;"}]+?)"?\\s*(?:[;"}]|$)',
  ].join("|"),
  "g",
);

/**
 * THE VALUE OF EVERY `style="…"` ON A DECODED TAG.
 *
 * Bounded by the delimiter that is FOLLOWED BY whitespace, `/` or `>` — the only place an attribute
 * value can end inside a tag — so a quote belonging to a font stack inside it does not end it early.
 * That boundary is what makes a quoted custom property readable off a tag at all.
 */
function styleAttributeValues(tag) {
  const values = [];
  for (const m of String(tag).matchAll(/\bstyle\s*=\s*(?:"([\s\S]*?)"|'([\s\S]*?)')(?=[\s/>]|$)/g))
    values.push(m[1] ?? m[2] ?? "");
  return values;
}

/** @returns {string[]} every stack `source` writes, trimmed, as written. */
function fontFamiliesWritten(source) {
  const stacks = [];
  for (const m of String(source).matchAll(FONT_FAMILY_WRITTEN)) {
    const written = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (written) stacks.push(written);
  }
  return stacks;
}

function readFont(source, vars) {
  const family = fontFamiliesWritten(source)[0];
  const weight = /font-weight\s*[:=]\s*"?([^;"}]+?)"?\s*(?:[;"}]|$)/.exec(source)?.[1];
  // Widened from `[a-z]+` so a `var(--…)` slope is captured and can be followed; the branch below
  // still only ever answers `italic`, `normal` or nothing.
  const style = resolveVar(/font-style\s*[:=]\s*"?([^;"}]+?)"?\s*(?:[;"}]|$)/.exec(source)?.[1], vars).toLowerCase();
  const resolvedFamily = family ? resolveVar(family, vars) : "";
  return {
    family: resolvedFamily ? requestedFamily(resolvedFamily) : null,
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
    for (const stack of fontFamiliesWritten(tag)) {
      if (!SAFE_STACK.test(stack)) continue;
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

  // QUOTES ARE PART OF A VALUE IN A STYLESHEET, AND A BOUNDARY IN AN ATTRIBUTE — so the two are read
  // by two patterns rather than one.
  //
  // The single pattern excluded quotes, which was harmless while custom properties only ever carried
  // numbers, and silently dropped every FAMILY property the moment `figureVars` started emitting one:
  // a font stack opens with a quote (`--title-family: "Merriweather", Georgia, serif`), so the value
  // was captured as the empty string and the `var()` that reads it could never be followed.
  //
  // A TAG KEEPS THE NARROW PATTERN, and that is not an oversight. These tags have already been
  // through `decodeEntities`, so a `&quot;` inside a style attribute is now a plain `"` and the
  // attribute's own closing quote is no longer distinguishable from a quote in its value. Stopping
  // at the first quote is the conservative reading, and it is what this has always done.
  const vars = new Map();
  for (const m of sheet.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+)/g)) vars.set(m[1], m[2].trim());
  for (const source of tags) {
    for (const m of source.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;"'{}]+)/g)) vars.set(m[1], m[2].trim());
    // AND THEN THE SAME PROPERTIES READ OUT OF THE ATTRIBUTE'S OWN VALUE, quotes and all, which
    // overwrites the narrow reading above wherever the narrow reading gave up. The narrow pass is
    // kept and runs FIRST so nothing this ever resolved stops resolving; this pass is what makes a
    // `--title-family: "Open Sans", …` written on the figure — the shape `figureVars` emits, and
    // the shape whose leading quote made the narrow pattern match the empty string — reachable by
    // the `var()` in the stylesheet that reads it. Without it a titled page attributes its title to
    // the page's INHERITED body family, which is a face the page does carry, and the guard goes
    // green over a title drawn in one it does not.
    for (const value of styleAttributeValues(source))
      for (const m of value.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+)/g)) vars.set(m[1], m[2].trim());
  }

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
 *   - a character the family's own cut does not reach, which falls through one glyph at a time and
 *     is the hardest of the three to see — and the one this change made possible, since a face is
 *     no longer a whole subset but a list of characters somebody derived.
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

  // COVERAGE, PER FAMILY — and per family is the whole point since the faces became subsets.
  //
  // This used to pool every family's ranges into one set and ask whether SOMETHING reached each
  // character. That was defensible while each face carried Google's whole `latin` subset, because
  // every family carried the same 231 code points anyway. It is a hole the moment each face is cut
  // to a list: a page whose serif title face was cut without `’` and whose sans was cut with it
  // would pass, and the apostrophe in the title would be drawn by Georgia.
  //
  // So each family the page names must reach every character the page can display, on its own. That
  // is what `embeddedWebFaces` cuts for, so the two agree by construction on a page it built — and
  // disagree, loudly, on a page whose text moved after the cut or whose subset was tampered with.
  if (faces.length > 0) {
    const points = codePointsOf(displayableTextOf(html));
    for (const family of [...new Set(faces.map((f) => f.family))].sort()) {
      const ranges = faces.filter((f) => f.family === family).flatMap((f) => parseUnicodeRange(f.unicodeRange));
      const uncovered = points.filter((cp) => !rangesCover(ranges, cp));
      if (uncovered.length === 0) continue;
      problems.push(
        `this page sets ${uncovered
          .map((cp) => `${hex(cp)} (${JSON.stringify(String.fromCodePoint(cp))})`)
          .join(", ")} and the subset it carries for "${family}" does not reach ` +
          `${uncovered.length === 1 ? "it" : "them"}. Each face is cut down to the characters this ` +
          `page can display (embeddedWebFaces), so a character outside the cut is a glyph drawn by ` +
          `the bridge — and one that can be invisible until a reader hovers.`,
      );
    }
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

/**
 * THE INTERACTIVE SURFACE, DRIVEN AND THEN MEASURED — the check the cut made necessary.
 *
 * `probeTypefaces` above walks the text nodes that are on the page WHEN IT LOADS. That was enough
 * while every face carried Google's whole `latin` subset, because a tooltip's words were Latin and
 * the subset was under them either way. Cut each face down to a list of characters and the failure
 * becomes: a glyph that is missing only when a reader hovers. It is in no screenshot. Nothing in a
 * build-time scan can see it, and `document.fonts.check()` answers `true` about it, because a
 * character outside every declared range needs no custom font at all.
 *
 * So this DRIVES the page — focuses every element that carries a `data-detail`, which is the real
 * handler in both formats' `interaction.mjs` (`tooltip.textContent = el.getAttribute("data-detail")`),
 * and clicks every filter control there is — and after each step reads what is now on screen. Every
 * character revealed that way is measured the same three ways the load-time probe uses, against the
 * stack the element it appeared in actually computes to.
 *
 * Written to be handed to `page.evaluate`: it closes over nothing and calls nothing from this
 * module. It MEASURES; the caller decides what is a failure.
 */
export async function probeRevealedText() {
  const GENERIC = new Set([
    "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
    "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong",
  ]);
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, "").trim();
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

  await document.fonts.ready;

  // (stack, weight, style) -> the characters seen set in it, and where they came from.
  const seen = new Map();
  const note = (el, text, where) => {
    if (!text || !text.trim()) return;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return;
    const stack = style.fontFamily;
    const family = unquote(stack.split(",")[0]);
    if (!family || GENERIC.has(family.toLowerCase())) return;
    const key = `${stack}|${style.fontWeight}|${style.fontStyle}`;
    const held = seen.get(key) ?? {
      family, stack, weight: style.fontWeight, style: style.fontStyle, chars: new Set(), from: new Set(),
    };
    for (const ch of text) if (ch.trim()) held.chars.add(ch);
    held.from.add(where);
    seen.set(key, held);
  };
  const sweep = (where) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode())
      if (n.parentElement) note(n.parentElement, n.nodeValue ?? "", where);
  };

  sweep("on load");

  // EVERY FILTER STATE. A control that narrows the page can reveal a label, a count or a row that
  // the unfiltered view never showed.
  const controls = [...document.querySelectorAll("input[type=radio], input[type=checkbox], [role=tab], .mw-filter-chip")];
  for (const control of controls) {
    try {
      control.click();
    } catch {
      continue;
    }
    await frame();
    sweep("a filter state");
  }
  if (controls.length > 0) {
    try {
      controls[0].click();
    } catch { /* back to the first state; a page with one control is already there */ }
    await frame();
  }

  // EVERY HOVER STRING, through the page's own handler. `focus()` is the path both formats wire to
  // the same `show()` that a pointer goes through, and it is deterministic — a synthesised pointer
  // event at a guessed coordinate resolves to whichever mark is nearest, which is not every mark.
  const tooltip = document.getElementById("tooltip");
  const targets = [...document.querySelectorAll("[data-detail]")];
  let revealed = 0;
  const unshown = [];
  for (const target of targets) {
    const want = target.getAttribute("data-detail") ?? "";
    if (typeof target.focus !== "function") continue;
    target.focus();
    await frame();
    if (tooltip && !tooltip.hidden && (tooltip.textContent ?? "").trim()) {
      note(tooltip, tooltip.textContent, "a tooltip");
      revealed += 1;
    } else if (want.trim()) {
      // The string never reached the screen through the page's own handler. Measured anyway,
      // against the tooltip's own stack, because it is still a thing this page can display.
      if (tooltip) note(tooltip, want, "a data-detail the handler did not show");
      unshown.push(want.slice(0, 40));
    }
    if (typeof target.blur === "function") target.blur();
  }

  // An `alt`, against the image that carries it — the one readable attribute a BROWSER draws in the
  // page's own font, when the picture does not arrive. `aria-label` and `title` are deliberately
  // not swept: the first is announced and never drawn, the second is painted by the operating
  // system in a font the page has no say over. Sweeping them measured a `<button>`'s UA-default
  // Arial and called a subset that reaches every letter of "Paris" incomplete — a check that fails
  // on something no reader can see is worse than no check. Both are still CUT for at build time
  // (`pageTextOf`'s own readable-attribute list), which is where they belong.
  for (const el of document.querySelectorAll("img[alt]")) note(el, el.getAttribute("alt"), "an alt");

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
  const weightHolds = (declared, want) => {
    const bounds = String(declared).trim().split(/\s+/).map(Number);
    return Number.isFinite(want) && want >= bounds[0] && want <= (bounds.length > 1 ? bounds[1] : bounds[0]);
  };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const out = [];
  for (const use of seen.values()) {
    const chars = [...use.chars].join("");
    const mine = [...document.fonts].filter(
      (f) => unquote(f.family) === use.family && f.style === use.style && weightHolds(f.weight, Number(use.weight)),
    );
    const claimed = mine.flatMap((f) => rangesOf(f.unicodeRange));
    const uncovered = [...use.chars].filter((ch) => {
      const cp = ch.codePointAt(0);
      return !claimed.some(([lo, hi]) => cp >= lo && cp <= hi);
    });
    // THE MEASUREMENT NO WAY OF LYING ABOUT A FONT SURVIVES: the same string in the element's own
    // stack and in that stack with the intended family taken out.
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
      characters: use.chars.size,
      from: [...use.from],
      hasFace: mine.length > 0,
      uncovered: uncovered.map(
        (ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} ${JSON.stringify(ch)}`,
      ),
      widthWithFirst,
      widthWithoutFirst,
      fallbackStack: without,
    });
  }
  return { uses: out, controls: controls.length, targets: targets.length, revealed, unshown };
}
