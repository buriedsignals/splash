// scripts/lib/furniture-i18n.mjs
// The i18n FURNITURE GATE (quality audit P5) for the native map renders, MIRRORED
// from chart-native's scripts/lib/furniture-i18n.mjs (per-skill duplication, the
// same deliberate pattern as src/core/locale.ts — each skill ships standalone).
// i18n used to be APPLIED (src/core/locale.ts: legend numbers, the "Source" label)
// but never VERIFIED at render time — a whole FR map rendering English furniture
// passed every gate. Wired into the two snaps that ALREADY load the rendered page
// (snap-a11y.mjs for the interactive dist, snap-static.mjs for the static dist) —
// no extra browser session per produce.
//
// SCOPE — furniture vs data vs GL. The map's FURNITURE is DOM-reachable HTML:
// MapFrame's title/description/source bands, the HTML legend (innerHTML overlay),
// the filter bar. GL-internal text — basemap place labels, canvas-drawn symbol
// labels — is painted INTO the WebGL canvas and is NOT DOM-reachable, so it stays
// out of scope (documented, consistent with the contrast-check asymmetry: map-native
// has no rendered-contrast snap either). Excluded DOM subtrees:
//   - .maplibregl-control-container — MapLibre's own chrome: zoom/reset buttons and
//     the ATTRIBUTION line ("MapTiler", "OpenStreetMap contributors"), which is a
//     vendor credit in the vendors' own names, not deliverable furniture;
//   - .maplibregl-popup — the hover tooltip (data content, only present mid-hover);
//   - svg / script / style / noscript — data marks and the inlined JS bundle (the
//     self-contained interactive dist carries the locale table's English strings
//     inside its <script>).
import { sourceLabel } from "../../src/core/locale.ts";

// English caption/credit prefixes the PIPELINE itself can emit as furniture —
// MapFrame's "Source:" label, Datawrapper's auto-captions ("Created with
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
//   1,234.5     (comma group + dot decimal) French DECIMAL, so both are impossible
//                                            in a correctly localized render.
// A SINGLE comma group ("3,456") is deliberately EXEMPT: formatLocaleNumber(3.456,
// "fr") legitimately renders "3,456" (comma decimal, three places) — byte-identical
// to English-grouped 3456. Flagging it would fail correct French renders (a flaky
// gate is worse than a narrower one), so the spot check covers only the two patterns
// that cannot be a correctly localized number.
const EN_GROUPED_NUMBER = /\d,\d{3}(?:,\d{3})+(?!\d)|\d,\d{3}\.\d/;

/**
 * Pure checker (node-side, unit-tested): violations of the furniture-i18n contract
 * for a rendered page collected by collectFurnitureI18n(). Empty array = pass.
 *  1. the localized source line: some furniture text must START WITH the exact
 *     source label the locale table emits (same import MapFrame uses — single
 *     source of truth, never a re-typed literal);
 *  2. no ENGLISH_FURNITURE_BLOCKLIST match anywhere in the furniture;
 *  3. number spot check: no unambiguously English-grouped number in the rendered
 *     text (furniture — incl. the HTML legend — and any svg text; see
 *     EN_GROUPED_NUMBER for why a single comma group is exempt).
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

// Browser-side collector — MUST stay a closure-free, DOM-only function (the
// page.evaluate(fn) constraint: serialised via fn.toString(), no Node-side
// bindings). Furniture = visible HTML text nodes outside the excluded subtrees
// listed in the SCOPE note above.
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
    if (
      el.closest(
        "svg, script, style, noscript, .maplibregl-control-container, .maplibregl-popup",
      )
    )
      continue;
    furnitureTexts.push(s);
  }
  for (const t of Array.from(document.querySelectorAll("svg text"))) {
    const s = (t.textContent || "").trim();
    if (s) svgTexts.push(s);
  }
  return { furnitureTexts, svgTexts };
}
