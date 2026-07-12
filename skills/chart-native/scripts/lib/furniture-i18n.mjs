// scripts/lib/furniture-i18n.mjs
// The i18n FURNITURE GATE (quality audit P5) for the native chart renders: i18n used
// to be APPLIED (src/core/locale.ts) but never VERIFIED at render time — a whole FR
// chart rendering English furniture ("Source:", "1,900") passed every gate. This lib
// is the shared engine behind the check, wired into the two snaps that ALREADY load
// the rendered page (snap-contrast.mjs for the static dist, snap-interactive-
// contrast.mjs for the interactive dist) — no extra browser session per produce.
//
// SCOPE — furniture vs data. ChartFrame (src/core/ChartFrame.tsx) renders the
// furniture (title, subtitle, "Source" footer) as plain HTML divs; every data-driven
// glyph — axis ticks, value labels, direct/series labels, legend text — is an SVG
// <text> INSIDE the chart's <svg>. So the <svg> boundary IS the furniture/data
// boundary, and the English-caption blocklist applies only OUTSIDE it: a French
// chart can legitimately plot English category NAMES from the data (band names,
// country names), which live in the svg. Scrolly furniture is NOT checked here
// (chart-native never builds the scrolly format); the scrolly beats' language-
// consistency net lives harness-side in deep-verify.
//
// Mirrored in skills/map-native/scripts/lib/furniture-i18n.mjs (per-skill duplication,
// same deliberate pattern as src/core/locale.ts itself — each skill ships standalone).
import { sourceLabel } from "../../src/core/locale.ts";

// English caption/credit prefixes the PIPELINE itself can emit as furniture —
// ChartFrame's "Source:" label, Datawrapper's auto-captions ("Created with
// Datawrapper", the "Chart:"/"Map:" bylines), the "Note:" annotation prefix. Any of
// these in the rendered furniture of a non-English deliverable means localization
// was dropped somewhere; none of them is ever legitimate NON-data text there. (The
// French "Source :" spaces the colon, so it never substring-matches "Source:".)
export const ENGLISH_FURNITURE_BLOCKLIST = [
  "Source:",
  "Created with",
  "Note:",
  "Chart:",
  "Map:",
];

/** True when the locale table renders non-English furniture for `lang` — i.e. the
 *  gate has something to verify. English / absent / unknown tags fall back to the
 *  English furniture, which is correct by definition there. */
export function furnitureGateApplies(lang) {
  return sourceLabel(lang) !== sourceLabel("en");
}

// Unambiguous ENGLISH thousands-grouping patterns, for the number spot check:
//   1,234,567   (two+ comma groups)      — a comma can appear at most once as a
//   1,234.5     (comma group + dot decimal) fr/de/it DECIMAL, so both are impossible
//                                            in a correctly localized render.
// A SINGLE comma group ("3,456") is deliberately EXEMPT: formatLocaleNumber(3.456,
// "fr") legitimately renders "3,456" (comma decimal, three places) — byte-identical
// to English-grouped 3456. Flagging it would fail correct French renders (a flaky
// gate is worse than a narrower one), so the spot check covers only the two patterns
// that cannot be French/German/Italian.
const EN_GROUPED_NUMBER = /\d,\d{3}(?:,\d{3})+(?!\d)|\d,\d{3}\.\d/;

/**
 * Pure checker (node-side, unit-tested): violations of the furniture-i18n contract
 * for a rendered page collected by collectFurnitureI18n(). Empty array = pass.
 *  1. the localized source line: some furniture text must START WITH the exact
 *     source label the locale table emits (same import ChartFrame uses — single
 *     source of truth, never a re-typed literal);
 *  2. no ENGLISH_FURNITURE_BLOCKLIST match anywhere in the furniture;
 *  3. number spot check: no unambiguously English-grouped number anywhere in the
 *     rendered text (furniture AND svg data labels — a "1,234,567" is wrong in
 *     either place on a French deliverable; see EN_GROUPED_NUMBER for why a single
 *     comma group is exempt).
 */
export function checkFurnitureI18n({ furnitureTexts, svgTexts }, lang) {
  if (!furnitureGateApplies(lang)) return [];
  const violations = [];
  const label = sourceLabel(lang);

  if (!furnitureTexts.some((t) => t.startsWith(label))) {
    violations.push(
      `no furniture text carries the localized source label "${label}" (lang "${lang}") — ` +
        `the "Source" furniture was not localized (furniture seen: ${JSON.stringify(furnitureTexts)})`,
    );
  }

  for (const t of furnitureTexts) {
    for (const banned of ENGLISH_FURNITURE_BLOCKLIST) {
      if (t.includes(banned)) {
        violations.push(
          `English furniture "${banned}" rendered on a "${lang}" deliverable: "${t}"`,
        );
      }
    }
  }

  for (const t of [...furnitureTexts, ...svgTexts]) {
    const m = t.match(EN_GROUPED_NUMBER);
    if (m) {
      violations.push(
        `English-grouped number "${m[0]}" rendered on a "${lang}" deliverable: "${t}" ` +
          `(expected the locale's grouping separator)`,
      );
    }
  }

  return violations;
}

// Browser-side collector — MUST stay a closure-free, DOM-only function (same
// constraint as sample-text-contrast.mjs): Playwright's page.evaluate(fn) serialises
// it via fn.toString(), so it cannot reference any Node-side binding.
// Furniture = visible HTML text nodes OUTSIDE any <svg> (see the SCOPE note above),
// excluding <script>/<style>/<noscript> (the self-contained interactive dist inlines
// its whole JS bundle — which contains the locale table's English strings — as a
// <script> under <body>) and the hover-only ".tooltip" overlay (data content).
export function collectFurnitureI18n() {
  const furnitureTexts = [];
  const svgTexts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const s = (node.textContent || "").trim();
    if (!s) continue;
    const el = node.parentElement;
    if (!el) continue;
    if (el.closest("svg, script, style, noscript, .tooltip")) continue;
    furnitureTexts.push(s);
  }
  for (const t of Array.from(document.querySelectorAll("svg text"))) {
    const s = (t.textContent || "").trim();
    if (s) svgTexts.push(s);
  }
  return { furnitureTexts, svgTexts };
}
