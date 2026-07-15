# Flow test — round 10 (the splash orchestrator end-to-end, real articles, autonomous)

Four real articles run through the **splash flow** (`skills/splash/SKILL.md`) end to end, the system
driving all six phases by itself (each test agent played journalist + system so the gates were answered).
This validates the ORCHESTRATOR, not just routing — every branch and every export behaviour.

## Runs (all reached a real, verified deliverable)

| # | Real article | Flow branch | Format | Export | Result |
|---|--------------|-------------|--------|--------|--------|
| r10-minwage | [Minimum wage by country](https://en.wikipedia.org/wiki/List_of_countries_by_minimum_wage) | GUIDED | interactive chart | 3-form code source | ✓ interactive.html + static.html + EMBED.md |
| r10-popn | [World population](https://en.wikipedia.org/wiki/World_population) | DIRECT | chart-scrolly line | code source (embed pending) | ✓ scrolly.html; DIRECT skipped Q2–Q4 + PROPOSITION |
| r10-artists | [Best-selling music artists](https://en.wikipedia.org/wiki/List_of_best-selling_music_artists) | GUIDED | chart video | media direct (portrait) | ✓ portrait.mp4 handed over directly |
| r10-italy | [UNESCO sites in Italy](https://en.wikipedia.org/wiki/World_Heritage_Sites_in_Italy) | GUIDED | interactive map + category filter | 3-form code source | ✓ filter 8→3, occlusion ok, cluster auto-disabled |

**The flow holds:** guided/direct branch, chart/scrolly/video/map routing, and all three export behaviours
(three-form for interactive, media-direct for video with the right aspect, code+embed-pending fallback)
all executed correctly and produced a real deliverable, with the human gates stopping as designed.

## Findings (what the autonomous runs surfaced)

- **F-color (real gap, chart-native):** `NativeSpec` has no colour/subject field, so `specToNativeConfig`
  can't apply the subject-fit Okabe-Ito palette `suggest-chart` prescribes — every chart-native chart
  defaults to blue (dw-chart has `baseColor`; chart-native does not). The palette-freedom principle does
  not reach the native chart engine. Affects all chart-native output.
- **F-basemap-doc (recurring, doc):** `suggest-chart` documents only the choropleth map config; the
  LOCATOR/point path (`markers[]`) and the rule "use `basemap:"world"` for a regional/sub-national locator
  (fitBounds frames to the marker extent)" are undocumented, so an operator hits the validator error with
  no guidance (seen for UK/France/Italy across rounds 7/9/10).
- **F-scrolly-rendergate (minor):** no per-file render smoke exists for a chart-scrolly output, so GATE 3's
  "show the real render" can't be automated for that path (stays a visual check).
- **Minor friction:** Gate 2b (prose-data confirmation) reads more naturally BEFORE Gate 2 acceptance;
  the chart-native `static` produce flag still builds `interactive.html` (name implies static-only);
  `export-code` yields no `static.html` for a scrolly (no PNG to inline — expected); the orchestrator
  should run `validateChartSpec` and fix a title-that-reads-as-a-label before GATE 3.

## Verdict
The splash flow is usable end-to-end by the system itself on real articles. Round 10's value is the
two real system gaps (chart-native subject colour; the locator/basemap documentation) plus small
orchestration-ordering nits — each a system-layer fix.
