// Pure text readers over an already-fetched document — no network anywhere in this file. Every
// function reads what the document (or a stylesheet already fetched on its behalf) actually
// DECLARES: a meta tag, a `:root` custom property, a `background` rule on `html`/`body`, a
// `font-family` stack. None of it renders anything, none of it clusters pixels, none of it
// guesses. If a value isn't spelled out in the text, these functions do not report one — that is
// the whole contract `derive-charter.mjs` is built on.

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/;

const NEUTRAL_HEX = new Set(["#ffffff", "#000000"]);

// Real markup wraps a tag's attributes across lines (heidi.news's own `<html>` tag does exactly
// this). Evidence is meant to be read on one line next to its value, not reproduce the source
// file's own line breaks, so every evidence string below is run through this before being
// reported.
function compact(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Kept lowercase; checked lowercase. Not exhaustive — a scoped list of the keywords real
// stylesheets use as the *last* link in a font-family chain, plus the two React/most-frameworks
// system-font idioms. See references/extraction-traps.md for what this excludes on purpose (an
// unresolved `var(--font-x)` with nothing readable behind it).
const GENERIC_FONT_KEYWORDS = new Set([
  "inherit", "initial", "unset", "revert",
  "serif", "sans-serif", "sans", "monospace", "cursive", "fantasy",
  "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded",
  "-apple-system", "blinkmacsystemfont", "emoji", "math", "fangsong",
]);

export function normalizeHex(hex) {
  const body = hex.replace("#", "");
  const expanded = body.length === 3 ? body.split("").map((c) => c + c).join("") : body;
  return `#${expanded.toLowerCase()}`;
}

export function isNeutralHex(hex) {
  return NEUTRAL_HEX.has(hex.toLowerCase());
}

/**
 * Every `<meta name="theme-color" content="#rrggbb">` (or `#rgb`) the document declares, in
 * document order. A site that ships separate light/dark variants (`media="(prefers-color-scheme:
 * dark)"`) emits more than one — both come back, each with its own `media` so the caller can
 * choose, never silently averaged or overwritten.
 */
export function extractThemeColor(html) {
  const results = [];
  const metaRe = /<meta\b[^>]*>/gi;
  let match;
  while ((match = metaRe.exec(html))) {
    const tag = match[0];
    if (!/\bname\s*=\s*["']theme-color["']/i.test(tag)) continue;
    const content = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!content) continue;
    const hex = HEX_RE.exec(content[1].trim());
    if (!hex) continue; // a named colour ("black") or a var() — outside what this reads, see references
    const media = /\bmedia\s*=\s*["']([^"']+)["']/i.exec(tag);
    results.push({ value: normalizeHex(hex[0]), media: media ? media[1] : null, evidence: compact(tag) });
  }
  return results;
}

/** The document's own declared name, `og:site_name` first, the `<title>` text otherwise. */
export function extractName(html) {
  const og = /<meta\b[^>]*\bproperty\s*=\s*["']og:site_name["'][^>]*>/i.exec(html);
  if (og) {
    const content = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(og[0]);
    if (content && content[1].trim()) {
      return { value: content[1].trim(), source: "meta[property=og:site_name]", evidence: compact(og[0]) };
    }
  }
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (title && title[1].trim()) {
    return { value: title[1].trim(), source: "<title>", evidence: compact(`<title>${title[1]}</title>`) };
  }
  return null;
}

/** The document's own declared language, from `<html lang="…">` — the base subtag only (`fr-CH` → `fr`). */
export function extractLanguage(html) {
  const match = /<html\b[^>]*\blang\s*=\s*["']([a-zA-Z-]+)["']/i.exec(html);
  if (!match) return null;
  return { value: match[1].split("-")[0].toLowerCase(), source: "<html lang>", evidence: compact(match[0]) };
}

/**
 * Every OTHER language the document says it also publishes in — the `hreflang` of its own
 * alternate links, and `og:locale:alternate`. Base subtag only, matching `extractLanguage`, and
 * `x-default` dropped (it names a fallback URL, not a language).
 *
 * This is a real declaration and not an inference: a multilingual newsroom publishes these tags so
 * that search engines can find its other editions, which means the newsroom itself has already
 * written down the list this skill would otherwise have to ask for. A monolingual site emits none,
 * and that absence is the honest answer "one language", not a gap — see `derive-charter.mjs`, which
 * is why `languages` is never on its own a question.
 */
export function extractAlternateLanguages(html) {
  const results = [];
  const seen = new Set();
  const add = (raw, evidence) => {
    const tag = raw.split("-")[0].toLowerCase();
    if (!/^[a-z]{2,3}$/.test(tag) || tag === "x" || seen.has(tag)) return;
    seen.add(tag);
    results.push({ value: tag, evidence: compact(evidence) });
  };

  const linkRe = /<link\b[^>]*>/gi;
  let match;
  while ((match = linkRe.exec(html))) {
    const tag = match[0];
    if (!/\brel\s*=\s*["'][^"']*\balternate\b[^"']*["']/i.test(tag)) continue;
    const hreflang = /\bhreflang\s*=\s*["']([a-zA-Z-]+)["']/i.exec(tag);
    if (hreflang) add(hreflang[1], tag);
  }

  const metaRe = /<meta\b[^>]*>/gi;
  while ((match = metaRe.exec(html))) {
    const tag = match[0];
    if (!/\bproperty\s*=\s*["']og:locale:alternate["']/i.test(tag)) continue;
    const content = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (content) add(content[1].replace("_", "-"), tag);
  }
  return results;
}

/** Every `<link rel="stylesheet" href="…">`, resolved against `baseUrl`, in document order, deduplicated. */
export function extractStylesheetHrefs(html, baseUrl) {
  const hrefs = [];
  const linkRe = /<link\b[^>]*>/gi;
  let match;
  while ((match = linkRe.exec(html))) {
    const tag = match[0];
    if (!/\brel\s*=\s*["'][^"']*\bstylesheet\b[^"']*["']/i.test(tag)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!href) continue;
    try {
      const absolute = new URL(href[1], baseUrl).toString();
      if (!hrefs.includes(absolute)) hrefs.push(absolute);
    } catch {
      // a malformed or protocol-relative-without-base href — never guess what it resolves to
    }
  }
  return hrefs;
}

/** The concatenated bodies of every `<style>…</style>` block the document itself carries. */
export function extractInlineStyleBlocks(html) {
  const blocks = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRe.exec(html))) blocks.push(match[1]);
  return blocks.join("\n");
}

// A single-pass `selector { body }` block scanner shared by the two rule-body readers below. Not
// a real CSS parser — nested at-rules (`@media { … }`) are walked over the same as any other
// block, which is a known, accepted gap: see references/site-declarations.md.
function* cssBlocks(css) {
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = blockRe.exec(css))) yield { selector: match[1].trim(), body: match[2] };
}

/**
 * Every `--custom-property: #hex;` declared inside a block whose selector mentions `:root`
 * (`:root`, `:root.dark`, `html:root`, `:root[data-theme="light"]`, …). Reports every match, not
 * just the ones that look like a brand colour — `derive-charter.mjs` does the naming heuristic;
 * this function only reads what's there.
 */
export function extractRootCustomProperties(css) {
  const props = [];
  for (const { selector, body } of cssBlocks(css)) {
    if (!/:root\b/.test(selector)) continue;
    const declRe = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);?/g;
    let decl;
    while ((decl = declRe.exec(body))) {
      const raw = decl[2].trim();
      const hex = HEX_RE.exec(raw);
      if (!hex) continue;
      props.push({
        name: decl[1],
        value: normalizeHex(hex[0]),
        selector,
        evidence: compact(`${selector} { ${decl[1]}: ${raw} }`),
      });
    }
  }
  return props;
}

// A selector counts as naming the page's own ground only when it names html/body/:root/#root/#app
// directly — `:root body { color: … }` is a descendant selector, not a declaration on the ground
// itself, and must not be read as one.
const GROUND_SELECTOR_RE = /(^|,)\s*(html|body|#root|#app|:root)\s*($|[,.:[])/;

/** Every `background`/`background-color: #hex` declared directly on `html`, `body`, `:root`, `#root` or `#app`. */
export function extractBackgroundDeclarations(css) {
  const results = [];
  for (const { selector, body } of cssBlocks(css)) {
    if (!GROUND_SELECTOR_RE.test(selector)) continue;
    // The lookbehind matters: without it this also fires inside `--articleBackground: …`, a
    // custom-property NAME that merely contains the word "background" — a real bug this
    // extractor's own tests pin (`extract.test.ts`, "should not mistake a custom property whose
    // name contains background for a background declaration"), found by running it against
    // nzz.ch's actual stylesheet.
    const declRe = /(?<![\w-])background(?:-color)?\s*:\s*([^;]+);?/gi;
    let decl;
    while ((decl = declRe.exec(body))) {
      const raw = decl[1].trim();
      const hex = HEX_RE.exec(raw);
      if (!hex) continue;
      results.push({ selector, value: normalizeHex(hex[0]), evidence: compact(`${selector} { background: ${raw} }`) });
    }
  }
  return results;
}

function isGenericFontToken(name) {
  const lower = name.toLowerCase();
  // A name still carrying a paren is a fragment of a `var(--x, Fallback)` split apart by the
  // naive comma-split above (`var(--lt-font-sans` / `Roboto)!important`) — neither half is a real
  // font name, so both are rejected rather than reported mangled.
  return GENERIC_FONT_KEYWORDS.has(lower) || lower.startsWith("var(") || /[()]/.test(lower);
}

/**
 * Every `font-family:` stack declared anywhere in `text` (CSS or raw HTML — a `style="…"`
 * attribute reads the same as a stylesheet rule). Each stack is reduced to its first
 * non-generic, resolved name — `'Sang Bleu Kingdom', arial, sans-serif` reports as `Sang Bleu
 * Kingdom`; a stack of nothing but generic keywords or an unresolved `var(--font-x)` reports
 * nothing at all, on purpose (see `isGenericFontToken`). Returned most-declared first, so the
 * house typeface — used everywhere — floats above a one-off embed's font.
 */
export function extractFontFamilies(text) {
  const stacks = new Map();
  const declRe = /font-family\s*:\s*([^;}]+)/gi;
  let match;
  while ((match = declRe.exec(text))) {
    const raw = match[1].trim();
    const names = raw
      .split(",")
      .map((n) => n.trim().replace(/!important\s*$/i, "").trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    const primary = names.find((n) => !isGenericFontToken(n));
    if (!primary) continue;
    const key = primary.toLowerCase();
    const existing = stacks.get(key);
    if (existing) existing.count += 1;
    else stacks.set(key, { stack: primary, count: 1, evidence: compact(`font-family: ${raw}`) });
  }
  return [...stacks.values()].sort((a, b) => b.count - a.count);
}
