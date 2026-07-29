// dw-chart is the HOSTED chart: Datawrapper builds it, so this assembler composes a ChartSpec
// (skills/dw-chart/src/chart-spec.ts) and nothing else — the engine's own validateChartSpec is
// the floor, and it is STRICT about unknown top-level fields, so a field invented here is not
// ignored, it is refused. That strictness is why this file emits a short, named list rather
// than forwarding whatever the brief happens to carry.
import { fail, ok, type VerbResult } from "../../core/verbs";
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

export function assembleDwChart(brief: ProductionBrief): VerbResult<unknown> {
  if (!(CHART_TYPES as readonly string[]).includes(brief.nativeType))
    return fail(
      "invalid-request",
      `Datawrapper does not build a "${brief.nativeType}" chart — it builds ` +
        `${CHART_TYPES.join(", ")}`,
    );

  return ok({
    type: brief.nativeType,
    title: brief.angle.confirmedTakeaway,
    // TWO FIELDS, ONE SENTENCE, on purpose. `altInsight` is REQUIRED by validateChartSpec (WCAG:
    // the alt IS the insight) and `intro` is the printed subtitle; the loop's angle holds exactly
    // one elaboration of the takeaway, so the same sentence serves both rather than one of them
    // being invented. `intro` is omitted when there is none — a blank subtitle would print an
    // empty band; a blank altInsight, by contrast, is left to fail LOUD at the validator, the
    // same discipline assembleChartNative's header records.
    ...(brief.angle.altInsight ? { intro: brief.angle.altInsight } : {}),
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
    //   unit — ChartSpec has no unit field. It cannot be smuggled in as `numberFormat`: that token
    //     is a number FORMAT, and "%" on 0-1 data is a hard error the engine raises by name.
    //   sourceKind — chart-native's conformance belt reads it; ChartSpec has no such field and
    //     the strict check would refuse the spec outright.
  });
}
