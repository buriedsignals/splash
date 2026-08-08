// dw-chart is the HOSTED chart: Datawrapper builds it, so this assembler composes a ChartSpec
// (skills/dw-chart/src/chart-spec.ts) and nothing else — the engine's own validateChartSpec is
// the floor, and it is STRICT about unknown top-level fields, so a field invented here is not
// ignored, it is refused. That strictness is why this file emits a short, named list rather
// than forwarding whatever the brief happens to carry.
import { fail, ok, type VerbResult } from "../../core/verbs";
import { unitStatedIn } from "../../core/locale";
import type { ProductionBrief } from "../../core/production-brief";
import {
  CHART_TYPES,
  HIGHLIGHT_TYPES,
  type ChartType,
} from "../../../skills/dw-chart/src/chart-spec";

/** The category-accent affordance, and only where Datawrapper actually keys custom-colors by
 *  category value — HIGHLIGHT_TYPES (verified live; see its comment in chart-spec.ts). Emitting
 *  it on a line or a stacked chart is not a harmless extra: validateChartSpec REJECTS it there,
 *  so the whole chart would refuse to build over a decoration nobody asked for. */
function takesHighlight(nativeType: string): boolean {
  return HIGHLIGHT_TYPES.has(nativeType as ChartType);
}

/** The unit, stated ONCE, in the printed subtitle.
 *
 *  ChartSpec has no `unit` field and never will get one here: the strict validator refuses an
 *  unknown top-level key, and `numberFormat` is a number FORMAT token ("%" on 0-1 data is a
 *  hard error the engine raises by name). So the unit had exactly one reader-reaching path,
 *  and it is the one chart-native already chose for its standalone renders
 *  (skills/chart-native/src/BarChart.tsx:98-101): the frame states it once, in the subtitle.
 *
 *  No `lang` parameter, on purpose: this composes a PARENTHETICAL annotation onto a sentence,
 *  not a numeric value label, so there is no per-language spacing rule to apply (that is
 *  labelWithUnit/unitSuffix's job, lib/core/locale.ts, for a different call site). Never
 *  repeated: a subtitle the journalist already wrote with the unit in it stays as it is.
 *
 *  WHAT "ALREADY WROTE" MEANS is not this file's judgment to make alone, and that is why the
 *  test lives in `unitStatedIn` (lib/core/locale.ts) rather than here. Two callers need the
 *  same fact and must never disagree: this one decides whether to append, and the furniture
 *  expectation (lib/loop/verify.ts) tells capture which string to go looking for on the
 *  published page. When the append does not happen, the evidence a reader actually sees is
 *  the journalist's own wording — so a boolean shared between them would not have been
 *  enough, and capture would go hunting for a "%" the page correctly never prints.
 *
 *  It means the unit as its own TOKEN, or — for a typographic symbol unit — its SPELLED-OUT
 *  form in any of the four covered languages. Measured live on 2026-08-08: this function
 *  published "A ranking of four Swiss cities, Basel highest at 54 percent recycled (%)"
 *  (chart saWby) and "Bâle en tête à 54 pour cent recyclés (%)" (chart fi1UI). Both satisfied
 *  the token rule — "percent" is not the token "%" — and both are prose no journalist would
 *  sign. Both are quiet now, and the control case ("…Basel highest", no unit anywhere in the
 *  sentence) still gets its "(%)", which is the whole reason the append exists. */
export function introWithUnit(intro: string, unit: string | undefined): string {
  const u = unit?.trim();
  if (!u) return intro;
  const base = intro.trim();
  if (!base) return u;
  return unitStatedIn(base, u) ? base : `${base} (${u})`;
}

export function assembleDwChart(brief: ProductionBrief): VerbResult<unknown> {
  if (!(CHART_TYPES as readonly string[]).includes(brief.nativeType))
    return fail(
      "invalid-request",
      `Datawrapper does not build a "${brief.nativeType}" chart — it builds ` +
        `${CHART_TYPES.join(", ")}`,
    );

  const intro = introWithUnit(brief.angle.altInsight, brief.angle.unit);
  return ok({
    type: brief.nativeType,
    title: brief.angle.confirmedTakeaway,
    // TWO FIELDS, ONE SENTENCE, on purpose. `altInsight` is REQUIRED by validateChartSpec (WCAG:
    // the alt IS the insight) and `intro` is the printed subtitle; the loop's angle holds exactly
    // one elaboration of the takeaway, so the same sentence serves both rather than one of them
    // being invented. `intro` is omitted when there is none — a blank subtitle would print an
    // empty band; a blank altInsight, by contrast, is left to fail LOUD at the validator, the
    // same discipline assembleChartNative's header records.
    ...(intro ? { intro } : {}),
    altInsight: brief.angle.altInsight,
    data: brief.dataCsv,
    source: {
      name: brief.attribution,
      ...(brief.sourceUrl ? { url: brief.sourceUrl } : {}),
    },
    ...(brief.angle.emphasis && takesHighlight(brief.nativeType)
      ? { highlight: brief.angle.emphasis }
      : {}),
    ...(brief.lang ? { lang: brief.lang } : {}),
    // DELIBERATELY ABSENT, each one a fact with an owner elsewhere:
    //   channel — the spine injects the canonical one before dispatch (withProposalChannel,
    //     skills/splash/src/adapters.ts). A second writer here is the defect this tranche is
    //     removing.
    //   baseColor / subject — a subject-fit hue is the suggester's judgment, and chart-spec.ts's
    //     guardrail is written to fire when a DECLARED subject sits on the default blue. Naming a
    //     subject here without a colour to go with it would refuse every chart.
    //   unit — ChartSpec has no unit field, and it cannot be smuggled in as `numberFormat`.
    //     It reaches the reader through `intro` instead (introWithUnit above) — the same
    //     "state it once in the subtitle" decision the native engines made.
    //   sourceKind — chart-native's conformance belt reads it; ChartSpec has no such field and
    //     the strict check would refuse the spec outright.
  });
}
