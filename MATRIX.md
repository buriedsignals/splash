# The type × format matrix

**Generated — do not edit by hand.** `bun scripts/matrix.mjs` rewrites this file;
`bun scripts/matrix.mjs --check` fails if it has drifted from the tree.

A cell names the beat whose ARTIFACT EXISTS ON DISK. A brief that declares a format without a
rendered artifact counts for nothing here — five beats once did exactly that, and from the
outside nothing distinguished them. A video beat's final frame is not counted as static proof:
it is a by-product of that beat's reveal, not a chart framed to be read at rest.

This is a coverage map, never a quality one. Correctness is established separately by the
test suite and direct review of the rendered artifacts.

## Charts — 43 types, 190 beats

32 of 43 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **area** | static-area-swiss-co2<br>static-world-population | web-area-swiss-co2<br>webx-world-population | video-area-swiss-co2<br>video-cold-world-population<br>video-cold2-world-population<br>video-cumulative-co2-area | scrolly-area-swiss-co2<br>scrolly-world-population |
| **bar and column** | static-bar-top-emitters-2024 | web-bar-top-emitters-2024<br>web-co2-ranking | video-bar-top-emitters-2024<br>vidz-bar-column-top-emitters | scrolly-bar-top-emitters-2024 |
| **beeswarm** | static-beeswarm-co2-per-person | web-beeswarm-co2-per-person | video-beeswarm-co2-per-person | scrolly-beeswarm-co2-per-person |
| **box plot** | more-boxplot-france-co2-decades | web-boxplot-france-co2-decades<br>weby-boxplot-france-co2-decades | video-box-plot-france-co2-decades<br>vidy-boxplot-co2-by-continent | scrolly-boxplot-france-co2-decades |
| **bullet** | static-bullet-low-carbon-share | web-bullet-low-carbon-share | video-bullet-low-carbon-share | scrolly-bullet-low-carbon-share |
| **bump** | static-bump-emitter-rank | web-bump-emitter-rank<br>webz-bump-emitter-rank | video-bump-emitter-rank<br>vidz-bump-emitter-rank | scrolly-bump-emitter-rank |
| **calendar heatmap** | static-calendar-heatmap-geneva | web-calendar-heatmap-geneva | video-calendar-heatmap-geneva | scrolly-calendar-heatmap-geneva |
| **cartogram** | static-cartogram-europe-lowcarbon | — | — | — |
| **choropleth** | static-choropleth-europe-lowcarbon | — | — | — |
| **connected scatter** | static-connected-scatter-lowcarbon | web-connected-scatter-lowcarbon | video-connected-scatter-lowcarbon | scrolly-connected-scatter-lowcarbon |
| **contour / isoline** | static-contour-europe-distance | — | — | — |
| **diverging bar** | static-diverging-bar-eu-per-capita | web-diverging-bar-eu-per-capita<br>webz-diverging-bar-eu-per-capita | video-diverging-bar-eu-per-capita<br>vidz-diverging-bar-eu-per-capita | scrolly-diverging-bar-eu-per-capita |
| **diverging stacked bar** | static-diverging-stacked-electricity | web-diverging-stacked-electricity | video-diverging-stacked-electricity | scrolly-diverging-stacked-electricity |
| **dot density** | static-dot-density-europe-stations | — | — | — |
| **dot strip** | static-dot-strip-lowcarbon-spread | web-dot-strip-lowcarbon-spread | video-dot-strip-lowcarbon-spread | scrolly-dot-strip-lowcarbon-spread |
| **dumbbell** | more-dumbbell-life-expectancy-gains | web-dumbbell-life-expectancy-gains<br>weby-dumbbell-life-expectancy-gains | video-dumbbell-life-expectancy-gains<br>video-population-growth-dumbbell | scrolly-dumbbell-life-expectancy-gains |
| **flow map** | static-flow-map-ukraine-protection | web-flow-map-ukraine-protection | — | — |
| **gantt** | static-gantt-top-ten-tenure | web-gantt-top-ten-tenure | video-gantt-top-ten-tenure | scrolly-gantt-top-ten-tenure |
| **grouped bar** | static-wind-vs-solar | web-grouped-bar-wind-vs-solar<br>webx-wind-vs-solar | video-grouped-bar-wind-vs-solar<br>vidx-grouped-bar-co2-per-capita | scrolly-wind-vs-solar |
| **heatmap** | static-heatmap-coal-share-europe<br>static-heatmap-europe-electricity | more-heatmap-co2-per-capita-decades<br>web-heatmap-europe-electricity | video-heatmap-europe-electricity<br>vidy-heatmap-renewables-europe | scrolly-heatmap-coal-share-europe<br>scrolly-heatmap-europe-electricity |
| **hex grid** | static-hex-grid-europe-protection | — | — | — |
| **histogram** | static-carbon-footprint-spread | web-histogram-carbon-footprint<br>webx-carbon-footprint | video-histogram-carbon-footprint-spread<br>vidy-histogram-life-expectancy | scrolly-carbon-footprint-spread |
| **line** | more-line-swiss-life-expectancy | web-line-swiss-co2<br>webx-life-expectancy | life-expectancy<br>migration<br>video-line-swiss-co2<br>vidx-line-life-expectancy | scrolly-chart-eu-carbon<br>scrolly-line-swiss-co2 |
| **locator** | static-locator-zaporizhzhia | — | — | — |
| **lollipop** | more-lollipop-co2-per-capita<br>static-lollipop-co2-per-person | web-lollipop-co2-per-person<br>weby-lollipop-co2-per-capita | video-lollipop-co2-per-person<br>vidy-lollipop-renewables-share-europe | scrolly-lollipop-co2-per-person |
| **marimekko** | static-marimekko-electricity-mix | web-marimekko-electricity-mix | video-marimekko-electricity-mix | scrolly-marimekko-electricity-mix |
| **mixed scrolly** | — | — | — | scrolly-mixed-grinnell-ice |
| **parallel coordinates** | static-parallel-coordinates-electricity-mix | web-parallel-coordinates-electricity | video-parallel-coordinates-electricity-mix | scrolly-parallel-coordinates-electricity-mix |
| **photograph sequence** | — | — | — | scrolly-image-grinnell-glacier |
| **pictogram** | static-pictogram-europe-lowcarbon | web-pictogram-europe-lowcarbon | video-pictogram-europe-lowcarbon | scrolly-pictogram-europe-lowcarbon |
| **pie and donut** | static-donut-world-co2-share | web-donut-world-co2-share | video-donut-world-co2-share | scrolly-donut-world-co2-share |
| **population pyramid** | static-swiss-age-pyramid | web-population-pyramid-switzerland<br>weby-population-pyramid-switzerland | video-population-pyramid-swiss-age<br>vidy-pyramid-niger-population | scrolly-swiss-age-pyramid |
| **proportional symbol** | static-proportional-symbol-europe-capacity | — | — | scrolly-proportional-symbol-europe-capacity |
| **radar** | static-radar-electricity-mix | web-radar-electricity-mix | video-radar-electricity-mix | scrolly-radar-electricity-mix |
| **sankey** | static-sankey-electricity-sources | web-sankey-electricity-sources | video-sankey-electricity-sources | scrolly-sankey-electricity-sources |
| **scatter** | static-income-life-expectancy | web-income-life-expectancy<br>web-scatter-income-life-expectancy | video-scatter-income-life-expectancy<br>vidx-scatter-income-life-expectancy | scrolly-scatter-income-life-expectancy |
| **slope** | static-renewables-shift | web-co2-decline-slope<br>web-slope-europe-lowcarbon | vidx-slope-child-mortality | scrolly-renewables-shift |
| **slope chart** | static-slope-europe-lowcarbon | — | video-slope-europe-lowcarbon | scrolly-slope-europe-lowcarbon |
| **small multiples** | static-small-multiples-lowcarbon<br>static-small-multiples-solar-eu-six | web-small-multiples-solar-eu-six<br>weby-small-multiples-co2-per-capita | more-small-multiples-co2-per-capita<br>video-small-multiples-lowcarbon | scrolly-small-multiples-lowcarbon<br>scrolly-small-multiples-solar-eu-six |
| **stacked bar** | static-electricity-mix-source<br>static-stacked-bar-lowcarbon-growth | web-stacked-bar-lowcarbon-growth<br>webx-electricity-mix | video-stacked-bar-lowcarbon-growth<br>vidx-stacked-bar-swiss-electricity | scrolly-electricity-mix-source<br>scrolly-stacked-bar-lowcarbon-growth |
| **streamgraph** | static-streamgraph-swiss-electricity | web-streamgraph-swiss-electricity | video-streamgraph-swiss-electricity | scrolly-streamgraph-swiss-electricity |
| **treemap** | static-treemap-europe-capacity | web-treemap-europe-capacity | video-treemap-europe-capacity | scrolly-treemap-europe-capacity |
| **waterfall** | static-germany-electricity-bridge | webx-germany-bridge | video-waterfall-germany-electricity-bridge<br>vidy-waterfall-germany-electricity-mix | scrolly-germany-electricity-bridge<br>web-waterfall-germany-bridge |

## Maps — 9 types, 44 beats

5 of 9 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **cartogram** | — | web-cartogram-europe-lowcarbon | video-cartogram-europe-lowcarbon | scrolly-cartogram-europe-lowcarbon |
| **choropleth** | mapgen-choropleth-video | mapgen-choropleth-web<br>web-choropleth-europe-lowcarbon | mapgen-choropleth-video<br>video-choropleth-europe-lowcarbon<br>video-cold-coal-share-europe<br>video-cold2-coal-share-europe | mapscrolly-one-map-europe-carbon<br>scrolly-choropleth-europe-lowcarbon<br>scrolly-choropleth-europe-nuclear |
| **contour / isoline** | — | web-contour-europe-distance | video-contour-europe-distance | scrolly-contour-europe-distance |
| **dot density** | mapmore-dot-population<br>mapvid-dot-population | mapgen-dot-web<br>web-dot-density-europe-stations | mapvid-dot-population<br>video-dot-density-europe-stations | mapscrolly-quakes-three-ways<br>scrolly-dot-density-europe-stations |
| **flow / route map** | mapmore-flow-danube | — | mapgen-flowmap-video | mapmore-scrolly-danube |
| **flow map** | — | — | video-flow-map-ukraine-protection | scrolly-flow-map-ukraine-protection |
| **hex grid** | map-quake-density<br>mapvid-hexgrid-quakes | mapgen-hexgrid-web<br>web-hex-grid-europe-protection | mapvid-hexgrid-quakes<br>video-hex-grid-europe-protection | scrolly-hex-grid-europe-protection<br>scrolly-hex-grid-europe-wind-2024 |
| **locator** | map-geneva-locator<br>mapvid-locator-geneva | mapgen-locator-web<br>web-locator-zaporizhzhia | mapvid-locator-geneva<br>video-locator-zaporizhzhia | scrolly-locator-zaporizhzhia |
| **proportional symbol** | map-quake-symbol | mapgen-symbol-web<br>web-proportional-symbol-europe-capacity | map-quake-symbol<br>video-proportional-symbol-europe-capacity | — |

## Beats with no `BRIEF.md`

`co2-suisse`, `portrait-aspect-probe`, `scrolly-one-chart-swiss-life-expectancy`, `web-flow-map-danube`, `web-heatmap-coal-share-europe` — no declared type, so absent from the tables above. A beat without its editorial contract cannot be placed in a coverage map.

