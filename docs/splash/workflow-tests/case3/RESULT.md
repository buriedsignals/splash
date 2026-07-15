# Case 3 — Men's marathon world record progression: workflow result

Ran the full splash workflow end-to-end (suggest-article → suggest-chart → dw-chart) on
`article.md` + `data.csv`. No git branch switch, no commit. Datawrapper token stayed in `.env`.

## (a) ProposalSet — suggest-article

Segmented the article, extracted quantified claims, bound each to `data.csv`. Every plotted value
comes from the CSV — nothing invented (provenance tier: `table`).

```jsonc
{
  "proposals": [
    {
      "anchor": {
        "paragraphIndex": 5,
        "quote": "From Tergat's 2:04:55 to Sawe's 1:59:30, the world record has come down by five minutes and 25 seconds in a little over two decades"
      },
      "claim": "The men's marathon world record fell from 2:04:55 (7,495 s, 2003) to 1:59:30 (7,170 s, 2026) — a 5:25 drop, accelerating after 2018.",
      "intent": "How has the men's marathon world record fallen over time, and where did it break the two-hour barrier?",
      "data": "year,time_seconds\n2003,7495\n2007,7466\n2008,7439\n2011,7418\n2013,7403\n2014,7377\n2018,7299\n2022,7269\n2023,7235\n2026,7170",
      "dataSource": { "table": "data.csv", "columns": ["year", "time_seconds"] },
      "confidence": "high",
      "rationale": "A monotonic descent over 23 years with a named milestone (first sub-2:00) is the article's spine — a shape claim, the strongest single visual."
    }
  ],
  "notes": "Deliberately NOT proposed as separate visuals: the geographic claims (\"seven of the last ten Kenyan\", \"eight of those records in Berlin\") — these are counts over a 10-row categorical breakdown that read fine as prose and would fragment the one strong trend story. The 65-second Kiptum→Sawe drop and the 5:25 total are single deltas already captured as endpoints of the progression line. maxProposals respected: 1 proposal kept."
}
```

## (b) suggest-chart — decision + gate reasoning

**Profile:** 10 rows. `year` temporal; `time_seconds` numeric (the measure, LOWER = faster);
`athlete`/`nationality`/`location` categorical/geographic-ish.

**Geographic structure:** `location` is a city and `nationality` a country name, but the *intent* is
the temporal record progression, not a spatial distribution. There is **no region-value pairing to
map** (no rate per region). → **Gate 5 skipped** (no geographic story; the spatial claims were left
as prose upstream).

**Format gates (chart path):**
- **Gate 0** — change over a continuous period → **line** (`d3-lines`), FT "change over time".
- **Gate 1 (STATIC — default):** one key claim, annotatable directly on the chart, general audience,
  cross-channel. The record's fall is fully legible in a single static image → **STATIC wins.**
- **Gate 2 (interactive):** fails — 1 series (not >10), no personal-data hook, not web-only.
- **Gate 3 (scrolly):** fails — not irreducibly sequential; one static chart carries it.
- **Gate 4 (video):** fails — motion is not the only encoding; a static descending line already shows
  the fall. No social/vertical distribution requirement.

**y-axis direction:** kept natural ascending seconds so the line **descends** left→right, which reads
correctly as "record falling / getting faster." The `intro` states "lower is faster" to remove
ambiguity.

**Decision:** element = **line chart** · format = **static** · producer = **dw-chart** ·
why = a monotonic record-fall over 23 years is a textbook change-over-time trend that a single
annotated static line conveys in full — no gate fires to escalate past static.

## (c) Spec

Saved to `spec.json`. `type: d3-lines`, x = year, y = time_seconds (single series), baseColor
`#0072B2` (Okabe-Ito default), numberFormat `0,0`, WCAG `altInsight` states the insight, source cites
World Athletics / Wikipedia. Passed `validateChartSpec` with **zero warnings**. (`producer` key stored
alongside for routing; stripped before `produceChart`, which validates the pure ChartSpec.)

## (d) Produced files + what the render shows

- **Static PNG (owned):**
  `docs/splash/workflow-tests/case3/out/case3-record-progression.png` (1200×800).
- **Datawrapper embed:** chartId `439qV` — `https://datawrapper.dwcdn.net/439qV/1/` — data-space labels, responsive-clean at 340/600/1200px.

The render shows a single blue line descending from ~7,495 s (2003) to ~7,170 s (2026), y-axis in
seconds, x-axis 2003–2026. The steepening after 2014 (Kipchoge era) is visible as the trend's
acceleration. Title states the insight; intro flags "lower is faster" and the sub-2:00 milestone.
Render **succeeded** — every plotted point matches `data.csv`.

## (e) Pipeline friction

1. **Spec `producer` field vs ChartSpec contract.** suggest-chart's output carries a `producer`
   discriminator, but `dw-chart`'s `ChartSpec` / `validateChartSpec` has no such field and
   `produceChart` takes the pure spec. Had to strip `producer` before producing. Minor, but the seam
   between suggest-chart's routing envelope and dw-chart's spec isn't documented — a caller who passes
   the raw JSON straight in gets an extra unvalidated key (currently ignored, not rejected).
2. **Annotation clips at the right edge.** The `text-annotation` for "Sawe 1:59:30 — first sub-2:00"
   sits on the 2026 endpoint and collides with Datawrapper's default y-axis unit label
   ("record time (seconds)"), so the annotation text is clipped in the static PNG. The data/trend stay
   fully legible, but the milestone callout — the editorial payoff — is the casualty. A left-anchored
   annotation, a shorter axis label, or annotating an interior point would avoid the collision. This is
   a rendering/layout gap, not a data or routing error.
3. No blocker otherwise: env load, validation, DW create/publish/PNG-export all ran clean on first
   attempt.
