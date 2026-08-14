// The orchestrator. `deriveCharter` fetches one page and a bounded handful of the stylesheets it
// links, reads what they declare, and returns a PROPOSAL — never a NEWSROOM.md, never written to
// disk. See SKILL.md rule 2: this function has no write path at all, not even a commented-out
// one. Its caller shows the proposal to the journalist; only after they confirm or correct each
// line does anything become `NEWSROOM.md` (that step lives outside this skill, in the same place
// `NEWSROOM.md` is authored today — see `splash/scripts/newsroom.mjs`).

import { fetchWithTimeout } from "./fetch-document.mjs";
import {
  extractAlternateLanguages,
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

/**
 * Every language the site says it publishes in, the `<html lang>` one first. A newsroom is not
 * monolingual just because a form had one slot — this branch's own pilot is Swiss — and a
 * multilingual site has already written the list down in its own alternate links.
 *
 * Returns `null` only when nothing declares a language at all, which is exactly when `language`
 * itself is null: one missing fact, asked once. A site declaring one language resolves to that one
 * language, which is an ANSWER ("we publish in French") and not a gap.
 */
function chooseLanguages(html, primary) {
  const alternates = extractAlternateLanguages(html).filter((alt) => alt.value !== primary?.value);
  if (!primary && alternates.length === 0) return null;
  const values = [...(primary ? [primary.value] : []), ...alternates.map((a) => a.value)];
  return {
    value: values.join(", "),
    source: alternates.length === 0 ? primary.source : `${primary ? "<html lang> + " : ""}alternate-language declarations`,
    evidence: [...(primary ? [primary.evidence] : []), ...alternates.map((a) => a.evidence)].join(" · "),
  };
}

/**
 * The house accents BEYOND the primary one — a newsroom's identity is rarely one colour. Read from
 * the same two places `chooseBrandColor` reads and held to the same bar (non-neutral, and an
 * unqualified selector for a custom property), with whatever became `brandColor` removed so the
 * primary is never proposed twice.
 *
 * Returns `null` when a site declares exactly one accent, and that is NOT a question: "this
 * newsroom has one accent colour" is an answer. `deriveCharter` keeps it out of `unresolved` for
 * that reason and reports it separately, so a journalist is never asked to invent a second house
 * colour they do not have.
 */
function chooseAccents(themeColors, rootProps, brand) {
  const seen = new Set(brand ? [brand.value.toLowerCase()] : []);
  const found = [];
  const consider = (value, source, evidence) => {
    const key = value.toLowerCase();
    if (isNeutralHex(value) || seen.has(key)) return;
    seen.add(key);
    found.push({ value, source, evidence });
  };
  for (const meta of themeColors) consider(meta.value, "meta[name=theme-color]", meta.evidence);
  for (const prop of rootProps) {
    if (!BRAND_NAME_HINT.test(prop.name) || !isUnqualifiedSelector(prop.selector)) continue;
    consider(prop.value, `CSS custom property ${prop.name}`, prop.evidence);
  }
  if (found.length === 0) return null;
  return {
    value: found.map((f) => f.value).join(", "),
    source: found.map((f) => f.source).join(" · "),
    evidence: found.map((f) => f.evidence).join(" · "),
  };
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
  const resolvedPageURL = page.url ?? url;
  const inlineCss = extractInlineStyleBlocks(html);
  const stylesheetHrefs = extractStylesheetHrefs(html, resolvedPageURL).slice(0, maxStylesheets);

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

  const language = extractLanguage(html);
  const brandColor = chooseBrandColor(themeColors, rootProps);
  const fields = {
    name: extractName(html),
    language,
    languages: chooseLanguages(html, language),
    brandColor,
    accents: chooseAccents(themeColors, rootProps, brandColor),
    ground: chooseGround(backgroundDecls, rootProps),
    typefaces: chooseTypefaces(fontStacks),
  };

  // `accents` is the one field whose absence is an ANSWER rather than a gap — a newsroom with one
  // accent colour has one accent colour, and asking "what are your other house colours?" invents a
  // need. It is reported in `nothingFurther` instead, so the outcome is still NAMED and never
  // silently swallowed; every other null field becomes a question, exactly as before.
  const NEVER_A_QUESTION = new Set(["accents"]);
  const unresolved = Object.entries(fields)
    .filter(([key, value]) => value === null && !NEVER_A_QUESTION.has(key))
    .map(([key]) => key);
  const nothingFurther = Object.entries(fields)
    .filter(([key, value]) => value === null && NEVER_A_QUESTION.has(key))
    .map(([key]) => key);

  return {
    ok: true,
    url: resolvedPageURL,
    fields,
    unresolved,
    nothingFurther,
    legibility: measureLegibility(fields),
    candidates: { themeColors, rootProps, backgroundDecls, fontStacks },
    stylesheetsRead,
    stylesheetsFailed,
  };
}

/**
 * DOES THIS PAIR COME OUT LEGIBLE? Measured here, where the charter is PROPOSED, because this is
 * the skill a journalist with no profile is sent to and it had no contrast arithmetic at all
 * (`AUDIT-W2-palette-credits.md` H2: `grep -rn "contrast\\|luminance"` over the whole skill
 * returned nothing). It measured a newsroom's site, proposed a `brandColor` and a `ground`, and
 * never checked that the pair could be read together — and the render, until the same day, drew
 * whatever it was handed. A recorded `#FFFF00` on white produced a clean PNG with the beat's whole
 * number in it.
 *
 * A brand colour is a MARK on a chart — a line, a bar, a shaded region — so the floor is 3:1,
 * WCAG 2.2 SC 1.4.11, not the 4.5:1 that governs text. Words in a beat never take the brand colour:
 * they are drawn in ink derived from the ground and escalated until they clear 4.5:1. Holding a
 * newsroom's identity to a text floor it never carries text at would reject legible house colours,
 * and the newsroom would have no way to learn the wrong rule was applied.
 *
 * It measures and REPORTS. It does not adjust: `formatProposal` prints the failure, the nearest
 * passing variant beside it, and leaves the decision where every other decision in this skill
 * lives. A charter this skill quietly corrected would be a colour nobody chose wearing the
 * authority of a measurement.
 *
 * The maths is a duplicate of `palette/scripts/palette.mjs`'s, deliberately and by this
 * project's rule — a skill stays copy-pasteable on its own, so helpers are duplicated rather than
 * imported. `splash/test/helper-parity.test.ts` compares the copies.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;
export const NON_TEXT_CONTRAST_MIN = 3;

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHex(values) {
  return (
    "#" +
    values.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
  );
}

export function adjustToContrast(colour, ground, min = NON_TEXT_CONTRAST_MIN) {
  if (!HEX.test(colour)) throw new Error(`colour must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const towards = luminance(ground) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  const from = channels(colour);
  for (let step = 1; step <= 50; step++) {
    const candidate = toHex(from.map((v, i) => v + (towards[i] - v) * (step / 50)));
    if (contrast(candidate, ground) >= min) return candidate;
  }
  return null;
}

/**
 * Every accent this proposal found, measured against the ground it found — the primary and each
 * further one, because a longer palette must not become a way past the floor. Returns `null` when
 * there is nothing to measure (no ground, or no brand colour): a gap is already a question, and
 * reporting a contrast of nothing against nothing would be noise.
 */
export function measureLegibility(fields) {
  const ground = fields.ground?.value;
  const brand = fields.brandColor?.value;
  if (!ground || !brand || !HEX.test(ground) || !HEX.test(brand)) return null;
  const further = String(fields.accents?.value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => HEX.test(item));
  const all = [brand, ...further].filter((hex, index, list) => list.indexOf(hex) === index);
  const measured = all.map((accent) => {
    const ratio = Math.round(contrast(accent, ground) * 100) / 100;
    const passes = ratio >= NON_TEXT_CONTRAST_MIN;
    const remedy = passes ? null : adjustToContrast(accent, ground);
    return {
      accent,
      primary: accent === brand,
      ratio,
      min: NON_TEXT_CONTRAST_MIN,
      passes,
      remedy: remedy && {
        accent: remedy,
        ratio: Math.round(contrast(remedy, ground) * 100) / 100,
      },
    };
  });
  return { ground, accents: measured, allPass: measured.every((m) => m.passes) };
}
