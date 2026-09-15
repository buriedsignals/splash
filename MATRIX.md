# The type × format matrix

**Generated — do not edit by hand.** `bun scripts/matrix.mjs` rewrites this file;
`bun scripts/matrix.mjs --check` fails if it has drifted from the tree.

A cell names the beat whose ARTIFACT EXISTS ON DISK. A brief that declares a format without a
rendered artifact counts for nothing here — five beats once did exactly that, and from the
outside nothing distinguished them. A video beat's final frame is not counted as static proof:
it is a by-product of that beat's reveal, not a chart framed to be read at rest.

This is a coverage map, never a quality one. Correctness is established separately by the
test suite and direct review of the rendered artifacts.

## Charts — 43 types, 155 beats

17 of 43 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **area** | static-area-swiss-co2<br>static-world-population | web-area-swiss-co2<br>webx-world-population | video-cumulative-co2-area | scrolly-area-swiss-co2<br>scrolly-world-population |
| **bar and column** | static-bar-top-emitters-2024 | web-bar-top-emitters-2024<br>web-co2-ranking | vidz-bar-column-top-emitters | scrolly-bar-top-emitters-2024 |
| **beeswarm** | static-beeswarm-co2-per-person | web-beeswarm-co2-per-person | — | scrolly-beeswarm-co2-per-person |
| **box plot** | more-boxplot-france-co2-decades | web-boxplot-france-co2-decades<br>weby-boxplot-france-co2-decades | vidy-boxplot-co2-by-continent | scrolly-boxplot-france-co2-decades |
| **bullet** | static-bullet-low-carbon-share | web-bullet-low-carbon-share | — | scrolly-bullet-low-carbon-share |
| **bump** | static-bump-emitter-rank | web-bump-emitter-rank<br>webz-bump-emitter-rank | vidz-bump-emitter-rank | scrolly-bump-emitter-rank |
| **calendar heatmap** | static-calendar-heatmap-geneva | web-calendar-heatmap-geneva | — | scrolly-calendar-heatmap-geneva |
| **cartogram** | static-cartogram-europe-lowcarbon | — | — | — |
| **choropleth** | static-choropleth-europe-lowcarbon | — | — | — |
| **connected scatter** | static-connected-scatter-lowcarbon | web-connected-scatter-lowcarbon | — | scrolly-connected-scatter-lowcarbon |
| **contour / isoline** | static-contour-europe-distance | — | — | — |
| **diverging bar** | static-diverging-bar-eu-per-capita | web-diverging-bar-eu-per-capita<br>webz-diverging-bar-eu-per-capita | vidz-diverging-bar-eu-per-capita | scrolly-diverging-bar-eu-per-capita |
| **diverging stacked bar** | static-diverging-stacked-electricity | web-diverging-stacked-electricity | — | scrolly-diverging-stacked-electricity |
| **dot density** | static-dot-density-europe-stations | — | — | — |
| **dot strip** | static-dot-strip-lowcarbon-spread | web-dot-strip-lowcarbon-spread | — | scrolly-dot-strip-lowcarbon-spread |
| **dumbbell** | more-dumbbell-life-expectancy-gains | web-dumbbell-life-expectancy-gains<br>weby-dumbbell-life-expectancy-gains | video-population-growth-dumbbell | scrolly-dumbbell-life-expectancy-gains |
| **flow map** | static-flow-map-ukraine-protection | — | — | — |
| **gantt** | static-gantt-top-ten-tenure | web-gantt-top-ten-tenure | — | scrolly-gantt-top-ten-tenure |
| **grouped bar** | static-wind-vs-solar | web-grouped-bar-wind-vs-solar<br>webx-wind-vs-solar | vidx-grouped-bar-co2-per-capita | scrolly-wind-vs-solar |
| **heatmap** | static-heatmap-coal-share-europe<br>static-heatmap-europe-electricity | more-heatmap-co2-per-capita-decades<br>web-heatmap-europe-electricity | vidy-heatmap-renewables-europe | scrolly-heatmap-coal-share-europe<br>scrolly-heatmap-europe-electricity |
| **hex grid** | static-hex-grid-europe-protection | — | — | — |
| **histogram** | static-carbon-footprint-spread | web-histogram-carbon-footprint<br>webx-carbon-footprint | vidy-histogram-life-expectancy | scrolly-carbon-footprint-spread |
| **line** | more-line-swiss-life-expectancy | web-line-swiss-co2<br>webx-life-expectancy | life-expectancy<br>migration<br>vidx-line-life-expectancy | scrolly-chart-eu-carbon<br>scrolly-line-swiss-co2 |
| **locator** | static-locator-zaporizhzhia | — | — | — |
| **lollipop** | more-lollipop-co2-per-capita<br>static-lollipop-co2-per-person | web-lollipop-co2-per-person<br>weby-lollipop-co2-per-capita | vidy-lollipop-renewables-share-europe | scrolly-lollipop-co2-per-person |
| **marimekko** | static-marimekko-electricity-mix | web-marimekko-electricity-mix | — | scrolly-marimekko-electricity-mix |
| **mixed scrolly** | — | — | — | scrolly-mixed-grinnell-ice |
| **parallel coordinates** | static-parallel-coordinates-electricity-mix | web-parallel-coordinates-electricity | — | scrolly-parallel-coordinates-electricity-mix |
| **photograph sequence** | — | — | — | scrolly-image-grinnell-glacier |
| **pictogram** | static-pictogram-europe-lowcarbon | web-pictogram-europe-lowcarbon | — | scrolly-pictogram-europe-lowcarbon |
| **pie and donut** | static-donut-world-co2-share | web-donut-world-co2-share | — | scrolly-donut-world-co2-share |
| **population pyramid** | static-swiss-age-pyramid | web-population-pyramid-switzerland<br>weby-population-pyramid-switzerland | vidy-pyramid-niger-population | scrolly-swiss-age-pyramid |
| **proportional symbol** | static-proportional-symbol-europe-capacity | — | — | scrolly-proportional-symbol-europe-capacity |
| **radar** | static-radar-electricity-mix | web-radar-electricity-mix | — | scrolly-radar-electricity-mix |
| **sankey** | static-sankey-electricity-sources | web-sankey-electricity-sources | — | scrolly-sankey-electricity-sources |
| **scatter** | static-income-life-expectancy | web-income-life-expectancy<br>web-scatter-income-life-expectancy | vidx-scatter-income-life-expectancy | scrolly-scatter-income-life-expectancy |
| **slope** | static-renewables-shift | web-co2-decline-slope<br>web-slope-europe-lowcarbon | vidx-slope-child-mortality | scrolly-renewables-shift |
| **slope chart** | static-slope-europe-lowcarbon | — | — | scrolly-slope-europe-lowcarbon |
| **small multiples** | static-small-multiples-lowcarbon<br>static-small-multiples-solar-eu-six | web-small-multiples-solar-eu-six<br>weby-small-multiples-co2-per-capita | more-small-multiples-co2-per-capita | scrolly-small-multiples-lowcarbon<br>scrolly-small-multiples-solar-eu-six |
| **stacked bar** | static-electricity-mix-source<br>static-stacked-bar-lowcarbon-growth | web-stacked-bar-lowcarbon-growth<br>webx-electricity-mix | vidx-stacked-bar-swiss-electricity | scrolly-electricity-mix-source<br>scrolly-stacked-bar-lowcarbon-growth |
| **streamgraph** | static-streamgraph-swiss-electricity | web-streamgraph-swiss-electricity | — | scrolly-streamgraph-swiss-electricity |
| **treemap** | static-treemap-europe-capacity | web-treemap-europe-capacity | — | scrolly-treemap-europe-capacity |
| **waterfall** | static-germany-electricity-bridge | web-waterfall-germany-bridge<br>webx-germany-bridge | vidy-waterfall-germany-electricity-mix | scrolly-germany-electricity-bridge |

## Maps — 9 types, 30 beats

5 of 9 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **cartogram** | — | — | — | scrolly-cartogram-europe-lowcarbon |
| **choropleth** | mapgen-choropleth-video | mapgen-choropleth-web<br>web-choropleth-europe-lowcarbon | mapgen-choropleth-video | mapscrolly-one-map-europe-carbon<br>scrolly-choropleth-europe-lowcarbon |
| **contour / isoline** | — | web-contour-europe-distance | — | scrolly-contour-europe-distance |
| **dot density** | mapmore-dot-population<br>mapvid-dot-population | mapgen-dot-web<br>web-dot-density-europe-stations | mapvid-dot-population | mapscrolly-quakes-three-ways<br>scrolly-dot-density-europe-stations |
| **flow / route map** | mapmore-flow-danube | — | mapgen-flowmap-video | mapmore-scrolly-danube |
| **flow map** | — | web-flow-map-ukraine-protection | — | scrolly-flow-map-ukraine-protection |
| **hex grid** | map-quake-density<br>mapvid-hexgrid-quakes | mapgen-hexgrid-web | mapvid-hexgrid-quakes | scrolly-hex-grid-europe-protection |
| **locator** | map-geneva-locator<br>mapvid-locator-geneva | mapgen-locator-web | mapvid-locator-geneva | scrolly-locator-zaporizhzhia |
| **proportional symbol** | map-quake-symbol | mapgen-symbol-web<br>web-proportional-symbol-europe-capacity | map-quake-symbol | — |

## Beats with no `BRIEF.md`

`co2-suisse`, `portrait-aspect-probe`, `scrolly-one-chart-swiss-life-expectancy`, `web-cartogram-europe-lowcarbon`, `web-hex-grid-europe-protection`, `web-locator-zaporizhzhia` — no declared type, so absent from the tables above. A beat without its editorial contract cannot be placed in a coverage map.

