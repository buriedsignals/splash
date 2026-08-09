// The orchestrator. `deriveCharter` fetches one page and a bounded handful of the stylesheets it
// links, reads what they declare, and returns a PROPOSAL — never a NEWSROOM.md, never written to
// disk. See SKILL.md rule 2: this function has no write path at all, not even a commented-out
// one. Its caller shows the proposal to the journalist; only after they confirm or correct each
// line does anything become `NEWSROOM.md` (that step lives outside this skill, in the same place
// `NEWSROOM.md` is authored today — see `splash-twin/scripts/newsroom.mjs`).

import { fetchWithTimeout } from "./fetch-document.mjs";
import {
  extractBackgroundDeclarations,
  extractFontFamilies,
  extractInlineStyleBlocks,
  extractLanguage,
  extractName,
  extractRootCustomProperties,
  extractStylesheetHrefs,
  extractThemeColor,
  isNeutralHex,
} from "./extract.mjs";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_STYLESHEETS = 4;

// Loose, case-insensitive hints in a custom-property NAME that suggest "this one is the brand
// colour", used only when no `theme-color` meta exists at all. A design system's `:root` block
// carries dozens to hundreds of colour tokens (status colours, borders, card backgrounds — see
// references/site-declarations.md); this is a heuristic over their names, not proof, which is why
// a value chosen this way still ships with its full declaration as evidence for the journalist to
// judge. Deliberately narrower than it looks: an earlier version also matched "theme" and
// "highlight", and on nzz.ch that picked `--swiper-theme-color` — the Swiper carousel library's
// own default blue, not the newsroom's brand at all (found running this against the real site;
// see references/site-declarations.md). "brand"/"primary"/"accent" are what a newsroom's own
// design tokens actually use for their house colour; "theme" and "highlight" are common enough in
// third-party widget CSS to cost more false positives than they're worth.
const BRAND_NAME_HINT = /(brand|primary|accent)/i;
const GROUND_NAME_HINT = /(background|ground|surface|page)/i;

// A selector counts as UNQUALIFIED — the newsroom's own default, not a conditional variant —
// only when one of its comma-separated parts is exactly `html`, `body`, or bare `:root`.
// `html.short-video` and `:root.dark` are real evidence of a declaration, but each names a
// component's or a theme-toggle's own override, not the page's plain default, so neither is
// picked over nothing at all. Shared by both colour fields: found running this against
// lemonde.fr (a qualified `html.short-video` background, no plain one) and nzz.ch (a
// `:root.dark`-scoped custom property, no bare `:root` one) — both real sites, both cases where
// the honest answer is "ask", not "pick whichever qualified rule came first."
function isUnqualifiedSelector(selector) {
  return selector.split(",").some((part) => /^(html|body|:root)$/.test(part.trim()));
}

function chooseBrandColor(themeColors, rootProps) {
  const meta = themeColors.find((c) => !isNeutralHex(c.value)) ?? themeColors[0];
  if (meta) return { value: meta.value, source: "meta[name=theme-color]", evidence: meta.evidence };
  const hinted = rootProps.find(
    (p) => BRAND_NAME_HINT.test(p.name) && !isNeutralHex(p.value) && isUnqualifiedSelector(p.selector),
  );
  if (hinted) return { value: hinted.value, source: `CSS custom property ${hinted.name}`, evidence: hinted.evidence };
  return null;
}

function chooseGround(backgroundDecls, rootProps) {
  // Deliberately narrower than `chooseBrandColor`'s theme-color path: there is no equivalent of
  // a single unambiguous meta tag for the ground, so picking "whichever qualified rule came
  // first" would be exactly the guessed-value-wearing-a-measurement's-authority failure rule 3
  // exists to refuse. Only an UNQUALIFIED `html`/`body` rule, or an unqualified custom property,
  // counts.
  const onGround = backgroundDecls.find((d) => isUnqualifiedSelector(d.selector));
  if (onGround) return { value: onGround.value, source: `${onGround.selector} background`, evidence: onGround.evidence };
  const hinted = rootProps.find((p) => GROUND_NAME_HINT.test(p.name) && isUnqualifiedSelector(p.selector));
  if (hinted) return { value: hinted.value, source: `CSS custom property ${hinted.name}`, evidence: hinted.evidence };
  return null;
}

function chooseTypefaces(fontStacks) {
  if (fontStacks.length === 0) return null;
  const top = fontStacks.slice(0, 2);
  return {
    value: top.map((f) => f.stack).join(", "),
    source: "font-family declarations",
    evidence: top.map((f) => f.evidence).join(" · "),
  };
}

const ASK_INSTEAD = [
  "What is your house accent colour, as a hex code?",
  "What is your house background colour, as a hex code?",
  "What typeface(s) does your newsroom use, in order of prominence?",
];

/**
 * Derive a charter proposal for `url`. Never throws — a network failure comes back as `{ok:
 * false, error, askInstead}`, the honest fallback rule 3 requires, not a guessed palette.
 *
 * On success, `fields.{name,language,brandColor,ground,typefaces}` is either `{value, source,
 * evidence}` or `null` when nothing was found — a `null` field is never filled with a default; it
 * is named in `unresolved` instead, so the caller asks the journalist for exactly that field and
 * nothing else.
 */
export async function deriveCharter({
  url,
  fetchFn = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxStylesheets = DEFAULT_MAX_STYLESHEETS,
} = {}) {
  const page = await fetchWithTimeout(url, { timeoutMs, fetchFn });
  if (!page.ok) {
    return {
      ok: false,
      url,
      error: page.error,
      askInstead: [`${url} could not be read (${page.error}).`, ...ASK_INSTEAD],
    };
  }

  const html = page.text;
  const inlineCss = extractInlineStyleBlocks(html);
  const stylesheetHrefs = extractStylesheetHrefs(html, url).slice(0, maxStylesheets);

  const sheets = await Promise.all(
    stylesheetHrefs.map(async (href) => ({ href, ...(await fetchWithTimeout(href, { timeoutMs, fetchFn })) })),
  );
  const stylesheetsRead = sheets.filter((s) => s.ok).map((s) => s.href);
  const stylesheetsFailed = sheets.filter((s) => !s.ok).map((s) => ({ href: s.href, error: s.error }));

  const css = [inlineCss, ...sheets.filter((s) => s.ok).map((s) => s.text)].join("\n");

  const themeColors = extractThemeColor(html);
  const rootProps = extractRootCustomProperties(css);
  const backgroundDecls = extractBackgroundDeclarations(css);
  const fontStacks = extractFontFamilies(css + "\n" + html);

  const fields = {
    name: extractName(html),
    language: extractLanguage(html),
    brandColor: chooseBrandColor(themeColors, rootProps),
    ground: chooseGround(backgroundDecls, rootProps),
    typefaces: chooseTypefaces(fontStacks),
  };

  const unresolved = Object.entries(fields)
    .filter(([, value]) => value === null)
    .map(([key]) => key);

  return {
    ok: true,
    url,
    fields,
    unresolved,
    candidates: { themeColors, rootProps, backgroundDecls, fontStacks },
    stylesheetsRead,
    stylesheetsFailed,
  };
}
