# Workflow end-to-end test — round 4 (usability + remaining producers)

Goal: prove the whole workflow is usable by future users, across the three data levels
(with-data / article-only / nothing) and the producers rounds 1–3 didn't reach.

## Cases + deliverables

| # | Article / topic | Data level | Routing | Producer / format | Deliverable |
|---|-----------------|-----------|---------|-------------------|-------------|
| 13 | Life expectancy across Europe | with data | Gate 5 map (W→E gradient) + Gate 1 static | **map-dw** (Datawrapper choropleth) | `case13/out/life-expectancy-mapdw.png` + https://datawrapper.dwcdn.net/kZQnf/1/ |
| 14 | Health spending vs longevity | with data | correlation family (two numeric) | **chart-native scatter** | `case14/out/health-longevity-scatter.png` |
| 15 | The return to the office | **article only** (prose, no table) | extract quantified claims → single-series temporal → static line | **dw-chart d3-lines** | `case15/out/office-occupancy.png` + https://datawrapper.dwcdn.net/wFrlm/1/ |
| 16 | "Is inflation coming down?" | **nothing** (bare topic) | name the data need → fetch the REAL public series → produce | **dw-chart d3-lines** (real FRED CPI) | `case16/out/inflation.png` + https://datawrapper.dwcdn.net/stJ2Y/1/ |

New producers/types exercised this round: **map-dw** (the default static Datawrapper map,
never run before) and **chart-native scatter** (correlation family, first time). All four
rendered cleanly and were verified visually; the dw-chart cases passed the responsive
guardrail at 340/600/1200 px.

Highlights:
- **Article-only (15) works end-to-end.** Five occupancy figures woven through prose
  (30→43→50→54→58 %) were pulled into a clean annotated line — no data table, nothing
  invented.
- **"Sans rien" (16) is honest AND capable.** The bare topic's literal story needs a real
  price series, which the system NAMED (BLS CPI-U / FRED `CPIAUCSL`) and then FETCHED from
  that public source rather than fabricating — producing the true arc (1.5% → 8.5% peak in
  2022 → ~3–4%, stalled above the 2% target). A bare topic never licensed invented numbers.

## No new system defects

Every producer worked first- or second-try; the responsive-label + narrative + framing
fixes from rounds 1–3 held. Only minor USABILITY notes (not defects), for future polish:

- **map-dw needs basemap knowledge.** A correct spec requires the Datawrapper basemap id
  (`europe-sovereign-states`) and its join attribute (`ISO_3_SOV`) — opaque to a user.
  The suggester (②) must resolve these from the DW basemaps API so the user never sees them.
- **chart-native scatter labels only one point.** It auto-labelled Japan, not the STORY
  point (the US outlier). A scatter that carries a highlight/outlier callout would let the
  author point the reader at the actual finding.
- **Article-only relies on clean prose numbers.** Extraction succeeded because the figures
  were explicit and formed one series; ambiguous or mixed-unit prose would need ② to ask a
  clarifying question rather than guess.
