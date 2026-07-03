# Workflow test — Case 2: US median home sale price (2014–2026)

End-to-end run of the atelier workflow: suggest-article → suggest-chart → dw-chart.
No data invented; every plotted value traces to `data.csv` / FRED MSPUS. No commit.

## (a) suggest-article — ProposalSet

The article's spine is one quantified arc: a decade-long climb, a Q4 2022 peak, and a
three-year cooldown that has barely dented the pandemic run-up. Every figure in the text
maps to a row in `data.csv` (table provenance — no prose reconstruction needed).

```jsonc
{
  "proposals": [
    {
      "anchor": {
        "paragraphIndex": 3,
        "quote": "the median has now slipped for three consecutive years from its 2022 high ... still costing well over $400,000 — far above pre-pandemic levels"
      },
      "claim": "US median home price climbed from $275,200 (2014-Q1) to a $442,600 peak (2022-Q4), then eased three straight years to $403,200 (2026-Q1) — still ~a quarter above the $322,600 of 2020-Q1.",
      "intent": "How has the US median home sale price moved from 2014 through 2026 — the pre-pandemic base, the surge, the 2022 peak, and the cooldown?",
      "data": "period,median_home_price_usd\n2014-Q1,275200\n2020-Q1,322600\n2021-Q1,355000\n2022-Q1,433100\n2022-Q4,442600\n2023-Q1,429000\n2024-Q1,420800\n2026-Q1,403200",
      "dataSource": { "table": "data.csv", "columns": ["period", "median_home_price_usd"] },
      "confidence": "high",
      "rationale": "A single continuous series that carries the surge → peak → cooldown shape is the whole article; the strongest and only opportunity that earns a visual."
    }
  ],
  "notes": "Did not split the '-9% from peak', '+34% 2020→2022', '+47% since 2014' derived percentages into separate visuals — they are readouts of the same one series and are better as prose/annotation than as their own charts (avoids over-proposing; maxProposals respected). Single proposal kept."
}
```

## (b) suggest-chart — decision + gate reasoning

**Profile:** columns `period` (temporal, quarter-anchor, cardinality 8), `year` (redundant
temporal), `median_home_price_usd` (numeric, single measure). Shape = **single-series time
series**, 8 rows.

**Gate 5 (geographic):** SKIPPED — no region identifiers (no country/ISO/NUTS/FIPS column).
"United States" is the whole dataset scope, not a per-row spatial dimension. Not a map.

**Gate 0 (chart family):** claim is change-over-time → line/area (FT Visual Vocabulary).
8 continuous points over a period → `d3-lines` (many-point trend, one series). Not a
two-point comparison (that would force slope/dumbbell), so a continuous line is honest here.

**Gates 1–4 (format):**
- Gate 1 (STATIC, default): the insight — surge, peak, cooldown — is one shape readable in a
  single annotated static image, general audience, cross-channel. **Match → static wins.**
- Gate 2 (interactive): fails — not large/multi-series (1 series, 8 points), no personal-data
  hook ("find your X"), not web-only.
- Gate 3 (scrolly): fails — not irreducibly sequential; one static chart carries it.
- Gate 4 (video): fails — motion is not the only encoding; a static line shows the arc.

**Route:** static chart → **dw-chart** (default producer). Not chart-native: no motion or
rich-interactivity ask in the intent.

## (c) Spec

Emitted `ChartSpec` at `spec.json`: `type: d3-lines`, insight-led sentence-case title,
`baseColor #0072B2` (Okabe-Ito default single-series), `numberFormat "$0,0"`, honest FRED
MSPUS source, WCAG `altInsight` stating the insight, two `text-annotation`s (peak turning
point + pre-pandemic baseline). `validateChartSpec` → **valid, 0 warnings**.

## (d) Produced files + what the render shows

- Spec: `docs/atelier/workflow-tests/case2/spec.json`
- Static PNG: `/tmp/wf-case2/case2-home-prices.png` (1200×800, 102 KB)
- DW embed / public URL: `https://datawrapper.dwcdn.net/3owan/1/` (chart id `3owan`) — data-space labels, responsive-clean at 340/600/1200px

The render shows the full arc: a steady 2014→2020 climb from ~$275K to $322K, a steep
2020→2022 surge to the $442,600 peak, then a three-year decline to $403,200 by 2026 — visibly
still well above the 2020 base. Title and subtitle carry the insight; y-axis in $K; source line
credits Census/HUD via FRED. Value fidelity: all 8 points match `data.csv` exactly.

## (e) Pipeline friction

1. **Annotations not painted on the DW export.** The spec's two `text-annotation`s (peak,
   pre-pandemic baseline) validated but did not appear as callouts on the exported PNG. The
   key numbers survive in the subtitle, so the chart is not misleading, but the annotation
   layer the design-conformance guidance asks for ("annotations explain WHY") is not visible.
   Worth checking `spec-to-metadata.ts` annotation mapping against DW's `text-annotations`
   metadata shape.
2. **Direct series label shows the raw column name** (`median_home_price_usd`) at the line
   end, rather than a human label. Minor, but a viz should not leak a snake_case column name.
   A `directLabel`/series-rename knob (like chart-native has) would fix it.
3. **Redundant `year` column** in the source CSV is ignored cleanly by the single-series
   binding — no friction, noted for completeness.
