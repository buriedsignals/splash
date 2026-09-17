# The type × format matrix

**Generated — do not edit by hand.** `bun scripts/matrix.mjs` rewrites this file;
`bun scripts/matrix.mjs --check` fails if it has drifted from the tree.

A cell names the beat whose ARTIFACT EXISTS ON DISK. A brief that declares a format without a
rendered artifact counts for nothing here — five beats once did exactly that, and from the
outside nothing distinguished them. A video beat's final frame is not counted as static proof:
it is a by-product of that beat's reveal, not a chart framed to be read at rest.

This is a coverage map, never a quality one. Correctness is established separately by the
test suite and direct review of the rendered artifacts.

## Charts — 40 types, 138 beats

31 of 40 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **area** | static-area-swiss-co2 | web-area-swiss-co2 | video-area-swiss-co2 | scrolly-world-population |
| **bar and column** | static-bar-top-emitters-2024 | web-bar-top-emitters-2024 | video-bar-top-emitters-2024 | scrolly-bar-top-emitters-2024 |
| **beeswarm** | static-beeswarm-co2-per-person | web-beeswarm-co2-per-person | video-beeswarm-co2-per-person | scrolly-beeswarm-co2-per-person |
| **box plot** | more-boxplot-france-co2-decades | web-boxplot-france-co2-decades | video-box-plot-france-co2-decades | scrolly-boxplot-france-co2-decades |
| **bullet** | static-bullet-low-carbon-share | web-bullet-low-carbon-share | video-bullet-low-carbon-share | scrolly-bullet-low-carbon-share |
| **bump** | static-bump-emitter-rank | web-bump-emitter-rank | video-bump-emitter-rank | scrolly-bump-emitter-rank |
| **calendar heatmap** | static-calendar-heatmap-geneva | web-calendar-heatmap-geneva | video-calendar-heatmap-geneva | scrolly-calendar-heatmap-geneva |
| **cartogram** | static-cartogram-europe-lowcarbon | — | — | — |
| **choropleth** | static-choropleth-europe-lowcarbon | — | — | — |
| **connected scatter** | static-connected-scatter-lowcarbon | web-connected-scatter-lowcarbon | video-connected-scatter-lowcarbon | scrolly-connected-scatter-lowcarbon |
| **contour / isoline** | static-contour-europe-distance | — | — | — |
| **diverging bar** | static-diverging-bar-eu-per-capita | web-diverging-bar-eu-per-capita | video-diverging-bar-eu-per-capita | scrolly-diverging-bar-eu-per-capita |
| **diverging stacked bar** | static-diverging-stacked-electricity | web-diverging-stacked-electricity | video-diverging-stacked-electricity | scrolly-diverging-stacked-electricity |
| **dot density** | static-dot-density-europe-stations | — | — | — |
| **dot strip** | static-dot-strip-lowcarbon-spread | web-dot-strip-lowcarbon-spread | video-dot-strip-lowcarbon-spread | scrolly-dot-strip-lowcarbon-spread |
| **dumbbell** | more-dumbbell-life-expectancy-gains | web-dumbbell-life-expectancy-gains | video-dumbbell-life-expectancy-gains | scrolly-dumbbell-life-expectancy-gains |
| **flow map** | static-flow-map-ukraine-protection | web-flow-map-ukraine-protection | — | — |
| **gantt** | static-gantt-top-ten-tenure | web-gantt-top-ten-tenure | video-gantt-top-ten-tenure | scrolly-gantt-top-ten-tenure |
| **grouped bar** | static-wind-vs-solar | web-grouped-bar-wind-vs-solar | video-grouped-bar-wind-vs-solar | scrolly-wind-vs-solar |
| **heatmap** | static-heatmap-europe-electricity | web-heatmap-europe-electricity | video-heatmap-europe-electricity | scrolly-heatmap-coal-share-europe |
| **hex grid** | static-hex-grid-europe-protection | — | — | — |
| **histogram** | static-carbon-footprint-spread<br>static-histogram-europe-solar-spread | web-histogram-carbon-footprint | video-histogram-carbon-footprint-spread | scrolly-carbon-footprint-spread |
| **line** | — | web-line-swiss-co2 | video-line-swiss-co2 | scrolly-line-swiss-co2 |
| **locator** | static-locator-zaporizhzhia | — | — | — |
| **lollipop** | static-lollipop-co2-per-person | web-lollipop-co2-per-person | video-lollipop-co2-per-person | scrolly-lollipop-co2-per-person |
| **marimekko** | static-marimekko-electricity-mix | web-marimekko-electricity-mix | video-marimekko-electricity-mix | scrolly-marimekko-electricity-mix |
| **parallel coordinates** | static-parallel-coordinates-electricity-mix | web-parallel-coordinates-electricity | video-parallel-coordinates-electricity-mix | scrolly-parallel-coordinates-electricity-mix |
| **pictogram** | static-pictogram-europe-lowcarbon | web-pictogram-europe-lowcarbon | video-pictogram-europe-lowcarbon | scrolly-pictogram-europe-lowcarbon |
| **pie and donut** | static-donut-world-co2-share | web-donut-world-co2-share | video-donut-world-co2-share | scrolly-donut-world-co2-share |
| **population pyramid** | static-swiss-age-pyramid | web-population-pyramid-switzerland | video-population-pyramid-swiss-age | scrolly-swiss-age-pyramid |
| **proportional symbol** | static-proportional-symbol-europe-capacity | — | — | scrolly-proportional-symbol-europe-capacity |
| **radar** | static-radar-electricity-mix | web-radar-electricity-mix | video-radar-electricity-mix | scrolly-radar-electricity-mix |
| **sankey** | static-sankey-electricity-sources | web-sankey-electricity-sources | video-sankey-electricity-sources | scrolly-sankey-electricity-sources |
| **scatter** | static-income-life-expectancy | web-scatter-income-life-expectancy | video-scatter-income-life-expectancy | scrolly-scatter-income-life-expectancy |
| **slope** | static-slope-europe-lowcarbon | web-slope-europe-lowcarbon | video-slope-europe-lowcarbon | scrolly-slope-europe-lowcarbon |
| **small multiples** | static-small-multiples-lowcarbon | web-small-multiples-solar-eu-six | video-small-multiples-lowcarbon | scrolly-small-multiples-lowcarbon |
| **stacked bar** | static-stacked-bar-lowcarbon-growth | web-stacked-bar-lowcarbon-growth | video-stacked-bar-lowcarbon-growth | scrolly-stacked-bar-lowcarbon-growth |
| **streamgraph** | static-streamgraph-swiss-electricity | web-streamgraph-swiss-electricity | video-streamgraph-swiss-electricity | scrolly-streamgraph-swiss-electricity |
| **treemap** | static-treemap-europe-capacity | web-treemap-europe-capacity | video-treemap-europe-capacity | scrolly-treemap-europe-capacity |
| **waterfall** | static-germany-electricity-bridge | web-waterfall-germany-bridge | video-waterfall-germany-electricity-bridge | scrolly-germany-electricity-bridge |

## Maps — 8 types, 22 beats

0 of 8 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **cartogram** | — | web-cartogram-europe-lowcarbon | video-cartogram-europe-lowcarbon | scrolly-cartogram-europe-lowcarbon |
| **choropleth** | — | web-choropleth-europe-lowcarbon | video-choropleth-europe-lowcarbon | scrolly-choropleth-europe-lowcarbon |
| **contour / isoline** | — | web-contour-europe-distance | video-contour-europe-distance | scrolly-contour-europe-distance |
| **dot density** | — | web-dot-density-europe-stations | video-dot-density-europe-stations | scrolly-dot-density-europe-stations |
| **flow map** | — | — | video-flow-map-ukraine-protection | scrolly-flow-map-ukraine-protection |
| **hex grid** | — | web-hex-grid-europe-protection | video-hex-grid-europe-protection | scrolly-hex-grid-europe-protection |
| **locator** | — | web-locator-zaporizhzhia | video-locator-zaporizhzhia | scrolly-locator-zaporizhzhia |
| **proportional symbol** | — | web-proportional-symbol-europe-capacity | video-proportional-symbol-europe-capacity | — |

## Beats with no `BRIEF.md`

`co2-suisse` — no declared type, so absent from the tables above. A beat without its editorial contract cannot be placed in a coverage map.

