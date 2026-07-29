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

/** Whether the unit's own edge character is alphanumeric at all — the question of whether a
 *  boundary assertion is needed there in the first place. A symbol edge ("€/m²"'s "€", "%")
 *  can never run on into an adjacent word, so it needs no assertion. */
const EDGE_ALNUM = /[\p{L}\p{N}]/u;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
 *  repeated: a subtitle the journalist already wrote with the unit in it stays as it is —
 *  but "already wrote" means the unit appears as its own TOKEN, not merely as a run of
 *  characters somewhere inside another word. A naked substring test is wrong for any unit
 *  that is a single ordinary letter ("m", "t", "h", "g"): almost every sentence contains that
 *  letter buried in some unrelated word, and the old check silently swallowed the unit every
 *  time, never appending it.
 *
 *  The boundary excludes LETTERS only (`\p{L}`), not digits, on both edges — a deliberate,
 *  explicit choice, not an accident of the character class: a number glued directly onto the
 *  unit ("12km", "500g", "3h30") is the ordinary, no-space value+unit convention, and IS the
 *  unit already stated, on either side ("3h30" states "h" with a digit touching it on both
 *  edges, and it still counts). Only an adjacent LETTER means the run continues into an
 *  unrelated word ("moyen", "logements"), so only letters block a match. The unit's own edge
 *  still only gets an assertion at all when it is itself alphanumeric (`EDGE_ALNUM`) — a
 *  symbol like "€" or "%" can't run on into a neighbouring word in the first place, so no
 *  boundary is added there. The unit string is untrusted (comes from a brief) and is escaped
 *  before it is ever interpolated into a pattern.
 *
 *  Matching stays case-insensitive, including for a single-letter unit — so "M." at the start
 *  of an abbreviated name ("selon M. Dupont") can, in principle, be misread as the unit "m"
 *  already stated. Accepted: case-insensitivity was this function's original, explicit
 *  requirement, the false-positive needs a standalone capital letter immediately followed by a
 *  non-letter (rare in practice, and no report of it firing), and narrowing it correctly would
 *  mean matching case-sensitively only for length-1 units — a second special case on top of the
 *  boundary logic above, for a residual with no observed instance. */
export function introWithUnit(intro: string, unit: string | undefined): string {
  const u = unit?.trim();
  if (!u) return intro;
  const base = intro.trim();
  if (!base) return u;
  const escaped = escapeRegExp(u);
  // Unicode-aware edge chars — u[0]/u[u.length - 1] index UTF-16 code units and would slice an
  // astral character in half; no unit under test is astral, but the spread form costs nothing.
  const chars = [...u];
  const first = chars[0]!;
  const last = chars[chars.length - 1]!;
  const left = EDGE_ALNUM.test(first) ? String.raw`(?<!\p{L})` : "";
  const right = EDGE_ALNUM.test(last) ? String.raw`(?!\p{L})` : "";
  const alreadyStated = new RegExp(`${left}${escaped}${right}`, "iu");
  if (alreadyStated.test(base)) return base;
  return `${base} (${u})`;
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
