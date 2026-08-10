# The type × genre matrix

**Generated — do not edit by hand.** `bun scripts/matrix.mjs` rewrites this file;
`bun scripts/matrix.mjs --check` fails if it has drifted from the tree.

A cell names the beat whose ARTIFACT EXISTS ON DISK. A brief that declares a genre without a
rendered artifact counts for nothing here — five beats once did exactly that, and from the
outside nothing distinguished them. A video beat's final frame is not counted as static proof:
it is a by-product of that beat's reveal, not a chart framed to be read at rest.

This is a coverage map, never a quality one. Whether these artifacts are CORRECT is what the
`AUDIT-*.md` files are for.

## Charts — 18 types, 55 beats

17 of 18 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **area** | static-world-population | webx-world-population | video-cumulative-co2-area | — |
| **bar and column** | static-bar-top-emitters-2024 | web-co2-ranking | vidz-bar-column-top-emitters | — |
| **box plot** | more-boxplot-france-co2-decades | weby-boxplot-france-co2-decades | vidy-boxplot-co2-by-continent | — |
| **bump** | static-bump-emitter-rank | webz-bump-emitter-rank | vidz-bump-emitter-rank | — |
| **diverging bar** | static-diverging-bar-eu-per-capita | webz-diverging-bar-eu-per-capita | vidz-diverging-bar-eu-per-capita | — |
| **dumbbell** | more-dumbbell-life-expectancy-gains | weby-dumbbell-life-expectancy-gains | video-population-growth-dumbbell | — |
| **grouped bar** | static-wind-vs-solar | webx-wind-vs-solar | vidx-grouped-bar-co2-per-capita | — |
| **heatmap** | static-heatmap-coal-share-europe | more-heatmap-co2-per-capita-decades | vidy-heatmap-renewables-europe | — |
| **histogram** | static-carbon-footprint-spread | webx-carbon-footprint | vidy-histogram-life-expectancy | — |
| **line** | more-line-swiss-life-expectancy | webx-life-expectancy | life-expectancy<br>migration<br>vidx-line-life-expectancy | scrolly-chart-eu-carbon |
| **lollipop** | more-lollipop-co2-per-capita | weby-lollipop-co2-per-capita | vidy-lollipop-renewables-share-europe | — |
| **photograph sequence** | — | — | — | scrolly-image-grinnell-glacier |
| **population pyramid** | static-swiss-age-pyramid | weby-population-pyramid-switzerland | vidy-pyramid-niger-population | — |
| **scatter** | static-income-life-expectancy | web-income-life-expectancy | vidx-scatter-income-life-expectancy | — |
| **slope** | static-renewables-shift | web-co2-decline-slope | vidx-slope-child-mortality | — |
| **small multiples** | static-small-multiples-solar-eu-six | weby-small-multiples-co2-per-capita | more-small-multiples-co2-per-capita | — |
| **stacked bar** | static-electricity-mix-source | webx-electricity-mix | vidx-stacked-bar-swiss-electricity | — |
| **waterfall** | static-germany-electricity-bridge | webx-germany-bridge | vidy-waterfall-germany-electricity-mix | — |

## Maps — 6 types, 18 beats

5 of 6 are proven in all three of static, web and video.

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **choropleth** | mapgen-choropleth-video | mapgen-choropleth-web | mapgen-choropleth-video | mapscrolly-one-map-europe-carbon |
| **dot density** | mapmore-dot-population<br>mapvid-dot-population | mapgen-dot-web | mapvid-dot-population | mapscrolly-quakes-three-ways |
| **flow / route map** | mapmore-flow-danube | — | mapgen-flowmap-video | mapmore-scrolly-danube |
| **hex grid** | map-quake-density<br>mapvid-hexgrid-quakes | mapgen-hexgrid-web | mapvid-hexgrid-quakes | — |
| **locator** | map-geneva-locator<br>mapvid-locator-geneva | mapgen-locator-web | mapvid-locator-geneva | — |
| **proportional symbol** | map-quake-symbol | mapgen-symbol-web | map-quake-symbol | — |

## Beats with no `BRIEF.md`

`portrait-aspect-probe`, `scrolly-mixed-grinnell-ice`, `co2-suisse`, `scrolly-one-chart-swiss-life-expectancy` — no declared type, so absent from the tables above. A beat without its editorial contract cannot be placed in a coverage map.

