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
// The consequences table of the declared source class, and the URL specificity rule that goes
// with it. Both are leaf modules (they import nothing from lib/core), so reading them from here
// closes no cycle — only lib/source/furniture.ts points back at lib/core, and it is not on this
// path.
import { requirementsFor } from "../source/requirements";
import { sourceUrlVerdict } from "../source/url";
import type { SourceKind } from "../source/kinds";

export interface ConformanceL0Header {
  /** the chart/map's insight title */
  title: string;
  /** name required (anti-fabrication + attribution); url optional (E2 — an honest
   *  prose source or a newsroom's own reporting legitimately has none) */
  source: { name?: string; url?: string };
  /**
   * The DECLARED class of that source (lib/source). OPT-IN, same convention as altInsight and
   * textColors below: absent, the flat historical rule above applies unchanged.
   *
   * Present, the rules come from the one consequences table every gate reads — which is how the
   * contradiction issue #7 opens with stops existing. This module said "url optional" for every
   * source while the render-review called a named dataset without a public URL incomplete;
   * neither could express the difference between "no URL exists" and "the URL was not
   * collected". With the class declared, incomplete means exactly
   * `requirementsFor(kind).url === "required"` — nothing else.
   */
  sourceKind?: SourceKind;
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

  // 2. Source cited. Without a declared class: NAME required, URL optional (the historical
  //    rule, kept byte-identical for every caller that has no class to give). With one: the
  //    requirements row decides, field by field.
  const name = input.source?.name?.trim() ?? "";
  const url = input.source?.url?.trim() ?? "";
  if (input.sourceKind === undefined) {
    if (!name) v.push("missing source name");
  } else {
    const rules = requirementsFor(input.sourceKind);
    if (rules.label === "required" && !name) v.push("missing source name");
    if (rules.label === "forbidden" && name)
      v.push(
        `a "none" source names no origin ("${name}") — a visual with a source to cite is not "none"`,
      );
    if (rules.url === "required" && !url)
      v.push(
        `missing source URL — a ${input.sourceKind} source must cite the specific dataset or page`,
      );
    if (rules.url === "forbidden" && url)
      v.push(
        `a ${input.sourceKind} source publishes no URL ("${url}") — an internal address is never rendered`,
      );
    if (url && sourceUrlVerdict(url) !== "specific")
      v.push(
        `source URL "${url}" does not point at a dataset or a page — cite the exact document, or omit it`,
      );
  }

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
