# The type × format matrix

**Generated — do not edit by hand.** `bun scripts/matrix.mjs` rewrites this file;
`bun scripts/matrix.mjs --check` fails if it has drifted from the tree.

A cell names the beat whose ARTIFACT EXISTS ON DISK. A brief that declares a format without a
rendered artifact counts for nothing here — five beats once did exactly that, and from the
outside nothing distinguished them. A video beat's final frame is not counted as static proof:
it is a by-product of that beat's reveal, not a chart framed to be read at rest.

This is a coverage map, never a quality one. Correctness is established separately by the
test suite and direct review of the rendered artifacts.

## Charts — 43 types, 118 beats

17 of 43 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **area** | static-area-swiss-co2<br>static-world-population | web-area-swiss-co2<br>webx-world-population | video-cumulative-co2-area | — |
| **bar and column** | static-bar-top-emitters-2024 | web-bar-top-emitters-2024<br>web-co2-ranking | vidz-bar-column-top-emitters | — |
| **beeswarm** | static-beeswarm-co2-per-person | web-beeswarm-co2-per-person | — | — |
| **box plot** | more-boxplot-france-co2-decades | web-boxplot-france-co2-decades<br>weby-boxplot-france-co2-decades | vidy-boxplot-co2-by-continent | — |
| **bullet** | static-bullet-low-carbon-share | web-bullet-low-carbon-share | — | — |
| **bump** | static-bump-emitter-rank | web-bump-emitter-rank<br>webz-bump-emitter-rank | vidz-bump-emitter-rank | — |
| **calendar heatmap** | static-calendar-heatmap-geneva | web-calendar-heatmap-geneva | — | — |
| **cartogram** | static-cartogram-europe-lowcarbon | — | — | — |
| **choropleth** | static-choropleth-europe-lowcarbon | — | — | — |
| **connected scatter** | static-connected-scatter-lowcarbon | web-connected-scatter-lowcarbon | — | — |
| **contour / isoline** | static-contour-europe-distance | — | — | — |
| **diverging bar** | static-diverging-bar-eu-per-capita | web-diverging-bar-eu-per-capita<br>webz-diverging-bar-eu-per-capita | vidz-diverging-bar-eu-per-capita | — |
| **diverging stacked bar** | static-diverging-stacked-electricity | web-diverging-stacked-electricity | — | — |
| **dot density** | static-dot-density-europe-stations | — | — | — |
| **dot strip** | static-dot-strip-lowcarbon-spread | web-dot-strip-lowcarbon-spread | — | — |
| **dumbbell** | more-dumbbell-life-expectancy-gains | web-dumbbell-life-expectancy-gains<br>weby-dumbbell-life-expectancy-gains | video-population-growth-dumbbell | — |
| **flow map** | static-flow-map-ukraine-protection | web-flow-map-ukraine-protection | — | — |
| **gantt** | static-gantt-top-ten-tenure | web-gantt-top-ten-tenure | — | — |
| **grouped bar** | static-wind-vs-solar | web-grouped-bar-wind-vs-solar<br>webx-wind-vs-solar | vidx-grouped-bar-co2-per-capita | — |
| **heatmap** | static-heatmap-coal-share-europe<br>static-heatmap-europe-electricity | more-heatmap-co2-per-capita-decades<br>web-heatmap-europe-electricity | vidy-heatmap-renewables-europe | — |
| **hex grid** | static-hex-grid-europe-protection | — | — | — |
| **histogram** | static-carbon-footprint-spread | web-histogram-carbon-footprint<br>webx-carbon-footprint | vidy-histogram-life-expectancy | — |
| **line** | more-line-swiss-life-expectancy | web-line-swiss-co2<br>webx-life-expectancy | life-expectancy<br>migration<br>vidx-line-life-expectancy | scrolly-chart-eu-carbon |
| **locator** | static-locator-zaporizhzhia | — | — | — |
| **lollipop** | more-lollipop-co2-per-capita<br>static-lollipop-co2-per-person | web-lollipop-co2-per-person<br>weby-lollipop-co2-per-capita | vidy-lollipop-renewables-share-europe | — |
| **marimekko** | static-marimekko-electricity-mix | web-marimekko-electricity-mix | — | — |
| **mixed scrolly** | — | — | — | scrolly-mixed-grinnell-ice |
| **parallel coordinates** | static-parallel-coordinates-electricity-mix | web-parallel-coordinates-electricity | — | — |
| **photograph sequence** | — | — | — | scrolly-image-grinnell-glacier |
| **pictogram** | static-pictogram-europe-lowcarbon | web-pictogram-europe-lowcarbon | — | — |
| **pie and donut** | static-donut-world-co2-share | web-donut-world-co2-share | — | — |
| **population pyramid** | static-swiss-age-pyramid | web-population-pyramid-switzerland<br>weby-population-pyramid-switzerland | vidy-pyramid-niger-population | — |
| **proportional symbol** | static-proportional-symbol-europe-capacity | — | — | — |
| **radar** | static-radar-electricity-mix | web-radar-electricity-mix | — | — |
| **sankey** | static-sankey-electricity-sources | web-sankey-electricity-sources | — | — |
| **scatter** | static-income-life-expectancy | web-income-life-expectancy<br>web-scatter-income-life-expectancy | vidx-scatter-income-life-expectancy | — |
| **slope** | static-renewables-shift | web-co2-decline-slope<br>web-slope-europe-lowcarbon | vidx-slope-child-mortality | — |
| **slope chart** | static-slope-europe-lowcarbon | — | — | — |
| **small multiples** | static-small-multiples-lowcarbon<br>static-small-multiples-solar-eu-six | web-small-multiples-solar-eu-six<br>weby-small-multiples-co2-per-capita | more-small-multiples-co2-per-capita | — |
| **stacked bar** | static-electricity-mix-source<br>static-stacked-bar-lowcarbon-growth | web-stacked-bar-lowcarbon-growth<br>webx-electricity-mix | vidx-stacked-bar-swiss-electricity | — |
| **streamgraph** | static-streamgraph-swiss-electricity | web-streamgraph-swiss-electricity | — | — |
| **treemap** | static-treemap-europe-capacity | web-treemap-europe-capacity | — | — |
| **waterfall** | static-germany-electricity-bridge | webx-germany-bridge | vidy-waterfall-germany-electricity-mix | web-waterfall-germany-bridge |

## Maps — 8 types, 25 beats

5 of 8 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **cartogram** | — | web-cartogram-europe-lowcarbon | — | — |
| **choropleth** | mapgen-choropleth-video | mapgen-choropleth-web<br>web-choropleth-europe-lowcarbon | mapgen-choropleth-video | mapscrolly-one-map-europe-carbon |
| **contour / isoline** | — | web-contour-europe-distance | — | — |
| **dot density** | mapmore-dot-population<br>mapvid-dot-population | mapgen-dot-web<br>web-dot-density-europe-stations | mapvid-dot-population | mapscrolly-quakes-three-ways |
| **flow / route map** | mapmore-flow-danube | — | mapgen-flowmap-video | mapmore-scrolly-danube |
| **hex grid** | map-quake-density<br>mapvid-hexgrid-quakes | mapgen-hexgrid-web<br>web-hex-grid-europe-protection | mapvid-hexgrid-quakes | — |
| **locator** | map-geneva-locator<br>mapvid-locator-geneva | mapgen-locator-web<br>web-locator-zaporizhzhia | mapvid-locator-geneva | — |
| **proportional symbol** | map-quake-symbol | mapgen-symbol-web<br>web-proportional-symbol-europe-capacity | map-quake-symbol | — |

## Beats with no `BRIEF.md`

`co2-suisse`, `portrait-aspect-probe`, `scrolly-one-chart-swiss-life-expectancy` — no declared type, so absent from the tables above. A beat without its editorial contract cannot be placed in a coverage map.

