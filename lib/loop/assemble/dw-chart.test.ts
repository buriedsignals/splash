import { test, expect } from "bun:test";
import { assembleDwChart, introWithUnit } from "./dw-chart";
import {
  CHART_TYPES,
  validateChartSpec,
  type ChartSpec,
} from "../../../skills/dw-chart/src/chart-spec";
import type { ProductionBrief } from "../../core/production-brief";

// column-chart, the vertical bar: a HIGHLIGHT_TYPE, so the emphasis has somewhere to go. The
// ASSEMBLER translates any of Datawrapper's types, row-driven ones included — the loop's table
// no longer refuses those (index.ts's dw-chart entry; their content-driven height is DECLARED to
// capture now instead of costing them the offer), it only declares the shape they will have.
const CHART_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "column-chart",
  format: "static",
  angle: {
    confirmedTakeaway:
      "Basel recycles more of its waste than any other Swiss city",
    altInsight:
      "A ranking of four Swiss cities, Basel highest at 54 percent recycled",
    unit: "%",
  },
  dataCsv: "city,rate\nBasel,54\nZurich,49\nGeneva,41\nBern,38",
  attribution: "Federal Statistical Office",
  sourceUrl:
    "https://www.bfs.admin.ch/bfs/en/home/statistics/territory-environment/waste-material-flows.html",
};

test("a dw chart spec clears the engine's own validator", () => {
  const r = assembleDwChart({ ...CHART_BRIEF, nativeType: "d3-bars" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const v = validateChartSpec(r.value);
  // The REAL return shape: { ok: true, spec, warnings } — errors only on the failure arm.
  expect(v.ok ? v.warnings : v.errors).toEqual([]);
});

test("carries the run's language onto the engine spec", () => {
  const r = assembleDwChart({ ...CHART_BRIEF, lang: "de" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as ChartSpec).lang).toBe("de");
});

test("omits lang entirely when the run has none — byte-identical to before", () => {
  const r = assembleDwChart(CHART_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect("lang" in (r.value as object)).toBe(false);
});

test("a type Datawrapper does not build is refused, listing what it does", () => {
  const r = assembleDwChart({ ...CHART_BRIEF, nativeType: "beeswarm" });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("beeswarm");
  expect(r.message).toContain("d3-bars");
});

test("emphasis becomes a highlight only where the engine supports one", () => {
  for (const nativeType of ["d3-bars", "column-chart"]) {
    const bars = assembleDwChart({
      ...CHART_BRIEF,
      nativeType,
      angle: { ...CHART_BRIEF.angle, emphasis: "Basel" },
    });
    expect(bars.ok && (bars.value as ChartSpec).highlight).toBe("Basel");
  }
  const lines = assembleDwChart({
    ...CHART_BRIEF,
    nativeType: "d3-lines",
    angle: { ...CHART_BRIEF.angle, emphasis: "Basel" },
  });
  expect(lines.ok && "highlight" in (lines.value as object)).toBe(false);
});

// A highlight the engine WOULD reject on a line chart is not merely dropped from the spec —
// the same spec has to clear validateChartSpec, which rejects `highlight` outside
// HIGHLIGHT_TYPES loudly. Dropping it silently and shipping an invalid spec would be two
// defects, not one.
test("the line-chart spec with an emphasis still clears the validator", () => {
  const r = assembleDwChart({
    ...CHART_BRIEF,
    nativeType: "d3-lines",
    angle: { ...CHART_BRIEF.angle, emphasis: "Basel" },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const v = validateChartSpec(r.value);
  expect(v.ok ? [] : v.errors).toEqual([]);
});

test("the credit travels — attribution and url become the spec's source", () => {
  const r = assembleDwChart(CHART_BRIEF);
  expect(r.ok && (r.value as ChartSpec).source).toEqual({
    name: "Federal Statistical Office",
    url: "https://www.bfs.admin.ch/bfs/en/home/statistics/territory-environment/waste-material-flows.html",
  });
});

test("no url — the source carries the name alone, never an empty url", () => {
  const r = assembleDwChart({ ...CHART_BRIEF, sourceUrl: undefined });
  expect(r.ok && (r.value as ChartSpec).source).toEqual({
    name: "Federal Statistical Office",
  });
});

// The channel is NOT the assembler's to write: the spine injects the canonical one before
// dispatch (withProposalChannel, skills/splash/src/adapters.ts). A second writer for one fact
// is the defect this tranche is removing, so the absence is asserted, not assumed.
test("the spec carries no channel — the spine owns that field", () => {
  const r = assembleDwChart(CHART_BRIEF);
  expect(r.ok && "channel" in (r.value as object)).toBe(false);
});

// Every field the assembler emits must be one the engine's own strict unknown-field check
// knows. A field nobody reads is exactly what validateChartSpec was hardened to refuse.
test("every emitted field is a real ChartSpec field, for every type", () => {
  const offenders: string[] = [];
  for (const type of CHART_TYPES) {
    const r = assembleDwChart({ ...CHART_BRIEF, nativeType: type });
    if (!r.ok) {
      offenders.push(`${type}: refused — ${r.message}`);
      continue;
    }
    const v = validateChartSpec(r.value);
    // Multi-series and part-to-whole types legitimately reject THIS fixture's two-column,
    // four-row data (a stacked chart needs three columns). Only an unknown FIELD is this
    // assembler's fault.
    if (!v.ok)
      offenders.push(
        ...v.errors
          .filter((e) => e.startsWith("unknown field"))
          .map((e) => `${type}: ${e}`),
      );
  }
  expect(offenders).toEqual([]);
});

// Invariant I1 — an assembler never throws. The blank angle produce() cannot actually hand it
// (it requires one) is still the shape a hand-authored manifest reaches this code with.
test("a brief with nothing in it comes back as a value, never as a throw", () => {
  const empty: ProductionBrief = {
    elementId: "e1",
    nativeType: "",
    format: "static",
    angle: { confirmedTakeaway: "", altInsight: "" },
    dataCsv: "",
    attribution: "",
  };
  expect(() => assembleDwChart(empty)).not.toThrow();
  expect(assembleDwChart(empty).ok).toBe(false);
});

// ChartSpec has no `unit` field and the unit cannot be smuggled in as `numberFormat` (a number
// FORMAT token, not a unit — "%" on 0-1 data is a hard error the engine raises by name). The
// reader-reaching path is the SUBTITLE — the same decision BarChart.tsx:98-101 made for the
// native standalone renders. Without it the unit reached nothing at all on a hosted chart.
test("states the unit once in the printed subtitle, the way the native engines do", () => {
  const r = assembleDwChart({
    ...CHART_BRIEF,
    nativeType: "d3-bars",
    angle: {
      confirmedTakeaway: "T",
      altInsight: "Cantons compared",
      unit: "€/m²",
    },
  });
  expect(r.ok).toBe(true);
  if (r.ok)
    expect((r.value as { intro?: string }).intro).toBe(
      "Cantons compared (€/m²)",
    );
});

test("does not repeat a unit the subtitle already states", () => {
  expect(introWithUnit("Rents in €/m²", "€/m²")).toBe("Rents in €/m²");
});

test("says the unit alone when there is no subtitle to hang it on", () => {
  expect(introWithUnit("", "km")).toBe("km");
});

test("changes nothing when there is no unit", () => {
  expect(introWithUnit("Cantons compared", undefined)).toBe("Cantons compared");
});

// Locale visibility (constraints: a fixture must make the locale VISIBLE). "%" is the exact
// unit lib/core/locale.ts spaces differently per language ("70 %" fr/de vs "70%" en) — chosen
// here, the way task 10's map-native fixture chose "%" for the same reason, to prove the
// de-dup guard that keeps the unit stated ONCE is not fooled by whichever spacing convention
// the journalist's own prose already used. introWithUnit takes no `lang`: it composes a
// PARENTHETICAL annotation onto a sentence, a different question from "how do I space a unit
// onto a numeric value" (labelWithUnit/unitSuffix's job) — there is no per-language spacing
// rule for "(unit)" to apply here in the first place, only a substring check, and these two
// tests are the evidence that the check holds under both spacing conventions.
test("a French-spaced unit already in the subtitle isn't handed a second, parenthetical one", () => {
  expect(introWithUnit("Le recyclage atteint 54 %", "%")).toBe(
    "Le recyclage atteint 54 %",
  );
});

test("an English-spaced unit already in the subtitle is caught the same way", () => {
  expect(introWithUnit("Recycling reaches 54%", "%")).toBe(
    "Recycling reaches 54%",
  );
});

// The composed subtitle must not silently start varying with the run's language — `intro` is
// prose, not a numeric label, so `lang` (emitted separately, :49) and the unit-in-parens
// composition are independent. This would fail if introWithUnit were rewritten to route
// through unitSuffix/labelWithUnit (which DO vary by lang) instead of staying a plain,
// language-invariant parenthetical.
test("the composed subtitle is identical with and without a French run language", () => {
  const angle = {
    ...CHART_BRIEF.angle,
    unit: "%",
    altInsight: "A ranking of four cities",
  };
  const withoutLang = assembleDwChart({ ...CHART_BRIEF, angle });
  const withFrLang = assembleDwChart({ ...CHART_BRIEF, lang: "fr", angle });
  expect(withoutLang.ok && withFrLang.ok).toBe(true);
  if (!withoutLang.ok || !withFrLang.ok) return;
  expect((withFrLang.value as { intro?: string }).intro).toBe(
    "A ranking of four cities (%)",
  );
  expect((withFrLang.value as { intro?: string }).intro).toBe(
    (withoutLang.value as { intro?: string }).intro,
  );
});
