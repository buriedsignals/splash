// L0 — the header/furniture conformance rules shared by EVERY engine (chart-native,
// map-native, ...): the title reads as an insight (not a bare year range, not ALL
// CAPS), a source is cited (name required, url optional — E2), alt text states the
// insight (WCAG 1.1.1, opt-in), and every rendered text colour clears WCAG contrast
// (opt-in). Per-type geometry/palette rules (bar baseline-0, choropleth legend, CVD
// palette, ...) are NOT here — they stay in each engine and call conformanceL0 first,
// then add their own.
//
// Extracted from chart-native's checkGlobalConformance (skills/chart-native/src/core/
// conformance.ts) and map-native's checkGlobalMapConformance (skills/map-native/src/
// conformance.ts), whose own header comment already declared "mirrors chart-native's
// checkGlobalConformance". One real divergence was found between the two and
// reconciled here (see below) — everything else was byte-identical.
//
// DIVERGENCE — ALL CAPS gate: chart-native flagged ALL CAPS with the unconditional
// `title.length > 0 && title === title.toUpperCase()`, which is trivially true for a
// digit-only title (e.g. "123456789012" — its own uppercase form), a latent false
// positive never hit by any real chart title or existing test. map-native guarded the
// same check on the title containing a letter (`/[A-Za-z]/.test(title)`), which is
// strictly more correct and a superset-safe relaxation (every title that used to fail
// still fails; only the never-real digit-only edge case stops false-flagging).
// Reconciled onto map-native's letters-gated form — zero observed behaviour change on
// any existing test or real title.
//
// scrolly's checkScrollyConformance (skills/scrolly/src/conformance.ts) is
// deliberately NOT wired to conformanceL0: it never declared an L0 mirror, and its
// title/source checks are genuinely looser (no min-length/year-range/ALL-CAPS on the
// title; a scrolly-specific source message) — merging it in would newly fail
// previously-valid short/ALL-CAPS scrolly titles, a real behaviour change this task
// does not authorize. See task-6-report.md for the full note.

import { contrastRatio, MIN_CONTRAST } from "./contrast";

export interface ConformanceL0Header {
  /** the chart/map's insight title */
  title: string;
  /** name required (anti-fabrication + attribution); url optional (E2 — an honest
   *  prose source or a newsroom's own reporting legitimately has none) */
  source: { name?: string; url?: string };
  /**
   * WCAG 1.1.1 — alt text must state the INSIGHT, not the structure. OPT-IN: only
   * enforced when the caller DECLARES the key (even with an undefined value) —
   * `"altInsight" in input`, mirroring chart-native's original gate — so a caller
   * with no altInsight concept (map-native, scrolly) is unaffected unless it
   * explicitly threads the field through.
   */
  altInsight?: string;
  /**
   * WCAG contrast — every rendered text colour vs the background. OPT-IN: only
   * checked when supplied.
   */
  textColors?: { text: string[]; bg: string };
}

const YEAR_RANGE = /^\d{4}(\s*[–-]\s*\d{4})?$/;

export function conformanceL0(input: ConformanceL0Header): string[] {
  const v: string[] = [];
  const title = input.title?.trim() ?? "";

  // 1. Title = the insight (not a bare year range, not ALL CAPS).
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (YEAR_RANGE.test(title))
    v.push(`title is a year range, not an insight: "${title}"`);
  if (/[A-Za-z]/.test(title) && title === title.toUpperCase())
    v.push("title is ALL CAPS (use sentence case)");

  // 2. Source cited: NAME required, URL optional.
  if (!input.source?.name?.trim()) v.push("missing source name");

  // 3. Alt text = the insight (WCAG 1.1.1), opt-in.
  if ("altInsight" in input) {
    const a = input.altInsight;
    if (!(typeof a === "string" && a.trim()))
      v.push(
        "missing altInsight (WCAG 1.1.1: alt text must state the insight, not the chart's structure)",
      );
  }

  // 4. Contrast ≥ 4.5:1 for every text colour, opt-in.
  if (input.textColors) {
    for (const t of input.textColors.text) {
      const r = contrastRatio(t, input.textColors.bg);
      if (r < MIN_CONTRAST)
        v.push(
          `text colour ${t} contrast ${r.toFixed(2)}:1 on ${input.textColors.bg} < 4.5:1`,
        );
    }
  }

  return v;
}
