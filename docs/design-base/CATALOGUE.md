# Catalogue — 32 charts, 8 maps, 4 exports

The reference list is the owner's. Everything else in this file is **measured off the tree** on each
update, never remembered: `refs` counts harvested references whose own `type:` line names the form,
and a tick means a **directed** beat exists — one that goes through the design base (a direction,
its six registers, the arbiter's treatments). Beats that predate the design base are not ticked here;
they are listed at the foot.

Last measured: 2026-09-09 · 179 references · 40 directed static beats. Scrolly column updated 2026-09-15 on
branch `quality/scrolly` and video column updated 2026-09-16 on `main`: the directed beats the owner validated in
each of those two passes.

- ✅ a directed beat exists
- ◦ references are harvested, no beat yet
- — nothing harvested for this form

## Charts

| # | form | refs | static | web | video | scrolly |
| ---: | --- | ---: | :---: | :---: | :---: | :---: |
| 01 | Area | 1 | ✅ | ◦ | ✅ | ✅ |
| 02 | Bar and column | 2 | ✅ | ◦ | ✅ | ✅ |
| 03 | Beeswarm | 1 | ✅ | ◦ | ✅ | ✅ |
| 04 | Box plot | 1 | ✅ | ◦ | ✅ | ✅ |
| 05 | Bullet | 6 | ✅ | ◦ | ✅ | ✅ |
| 06 | Bump | 2 | ✅ | ◦ | ✅ | ✅ |
| 07 | Calendar heatmap | 5 | ✅ | ◦ | ✅ | ✅ |
| 08 | Connected scatter | 1 | ✅ | ◦ | ✅ | ✅ |
| 09 | Diverging bar | 7 | ✅ | ◦ | ✅ | ✅ |
| 10 | Diverging stacked bar | 3 | ✅ | ◦ | ✅ | ✅ |
| 11 | Dot strip | 1 | ✅ | ◦ | ✅ | ✅ |
| 12 | Dumbbell | 2 | ✅ | ◦ | ✅ | ✅ |
| 13 | Gantt | 2 | ✅ | ◦ | ✅ | ✅ |
| 14 | Grouped bar | 9 | ✅ | ◦ | ✅ | ✅ |
| 15 | Heatmap | 3 | ✅ | ◦ | ✅ | ✅ |
| 16 | Histogram | 6 | ✅ | ◦ | ✅ | ✅ |
| 17 | Line | 2 | ✅ | ◦ | ✅ | ✅ |
| 18 | Lollipop | 1 | ✅ | ◦ | ✅ | ✅ |
| 19 | Marimekko | 7 | ✅ | ◦ | ✅ | ✅ |
| 20 | Parallel coordinates | 1 | ✅ | ◦ | ✅ | ✅ |
| 21 | Pictogram | 4 | ✅ | ◦ | ✅ | ✅ |
| 22 | Pie and donut | 1 | ✅ | ◦ | ✅ | ✅ |
| 23 | Population pyramid | 7 | ✅ | ◦ | ✅ | ✅ |
| 24 | Radar | 6 | ✅ | ◦ | ✅ | ✅ |
| 25 | Sankey | 7 | ✅ | ◦ | ✅ | ✅ |
| 26 | Scatter | 7 | ✅ | ◦ | ✅ | ✅ |
| 27 | Slope | 3 | ✅ | ◦ | ✅ | ✅ |
| 28 | Small multiples | 4 | ✅ | ◦ | ✅ | ✅ |
| 29 | Stacked bar | 5 | ✅ | ◦ | ✅ | ✅ |
| 30 | Streamgraph | 5 | ✅ | ◦ | ✅ | ✅ |
| 31 | Treemap | 1 | ✅ | ◦ | ✅ | ✅ |
| 32 | Waterfall | 12 | ✅ | ◦ | ✅ | ✅ |

**Charts: 32 of 32 done in static, 32 of 32 in video, 32 of 32 in scrolly, 0 of 32 in web.**

## Maps

| # | form | refs | static | web | video | scrolly |
| ---: | --- | ---: | :---: | :---: | :---: | :---: |
| 01 | Cartogram | 1 | ✅ | ◦ | ✅ | ✅ |
| 02 | Choropleth | 1 | ✅ | ◦ | ✅ | ✅ |
| 03 | Contour / isoline | 1 | ✅ | ◦ | ✅ | ✅ |
| 04 | Dot density | 3 | ✅ | ◦ | ✅ | ✅ |
| 05 | Flow map | 1 | ✅ | ◦ | ✅ | ✅ |
| 06 | Hex grid | 2 | ✅ | ◦ | ✅ | ✅ |
| 07 | Locator | 1 | ✅ | ◦ | ✅ | ✅ |
| 08 | Proportional symbol | 2 | ✅ | ◦ | ✅ | ✅ |

**Maps: 8 of 8 done in static, 8 of 8 in video and 8 of 8 in scrolly (both on the live MapTiler map), 0 of 8 in web.**

The eight map scrolly beats were first drawn in SVG from a Natural Earth extract clipped to a fixed window, so
countries outside it went missing as soon as the view left it. The owner ruled on 2026-09-15 that they be redone
through MapTiler end to end (`docs/splash/2026-09-12-maps-through-maptiler-spec.md` and its 2026-09-15 addendum).
All eight are now live MapTiler on a flat Web Mercator map, baked in the three directions, guards clean.

## What is done, beat by beat

| form | export | beat |
| --- | --- | --- |
| Area | static | `proof/static-area-swiss-co2` |
| Area | video | `proof/video-area-swiss-co2` — validated by the owner 2026-09-14 |
| Bar and column | static | `proof/static-bar-top-emitters-2024` |
| Bar and column | video | `proof/video-bar-top-emitters-2024` — validated by the owner 2026-09-14 |
| Beeswarm | static | `proof/static-beeswarm-co2-per-person` |
| Beeswarm | video | `proof/video-beeswarm-co2-per-person` — validated by the owner 2026-09-16 |
| Box plot | static | `proof/more-boxplot-france-co2-decades` |
| Box plot | video | `proof/video-box-plot-france-co2-decades` — validated by the owner 2026-09-16 |
| Bullet | static | `proof/static-bullet-low-carbon-share` |
| Bullet | video | `proof/video-bullet-low-carbon-share` — validated by the owner 2026-09-14 |
| Bump | static | `proof/static-bump-emitter-rank` |
| Bump | video | `proof/video-bump-emitter-rank` — validated by the owner 2026-09-14 |
| Calendar heatmap | static | `proof/static-calendar-heatmap-geneva` |
| Calendar heatmap | video | `proof/video-calendar-heatmap-geneva` — validated by the owner 2026-09-14 |
| Connected scatter | static | `proof/static-connected-scatter-lowcarbon` |
| Connected scatter | video | `proof/video-connected-scatter-lowcarbon` — validated by the owner 2026-09-14 |
| Dot strip | static | `proof/static-dot-strip-lowcarbon-spread` |
| Dot strip | video | `proof/video-dot-strip-lowcarbon-spread` — validated by the owner 2026-09-16 |
| Diverging bar | static | `proof/static-diverging-bar-eu-per-capita` |
| Diverging bar | video | `proof/video-diverging-bar-eu-per-capita` — validated by the owner 2026-09-14 |
| Diverging stacked bar | static | `proof/static-diverging-stacked-electricity` |
| Diverging stacked bar | video | `proof/video-diverging-stacked-electricity` — validated by the owner 2026-09-16 |
| Dumbbell | static | `proof/more-dumbbell-life-expectancy-gains` |
| Dumbbell | video | `proof/video-dumbbell-life-expectancy-gains` — validated by the owner 2026-09-16 |
| Gantt | static | `proof/static-gantt-top-ten-tenure` |
| Gantt | video | `proof/video-gantt-top-ten-tenure` — validated by the owner 2026-09-14 |
| Grouped bar | static | `proof/static-wind-vs-solar` |
| Grouped bar | video | `proof/video-grouped-bar-wind-vs-solar` — validated by the owner 2026-09-14 |
| Heatmap | static | `proof/static-heatmap-europe-electricity` |
| Heatmap | video | `proof/video-heatmap-europe-electricity` — validated by the owner 2026-09-16 |
| Histogram | static | `proof/static-carbon-footprint-spread` |
| Histogram | video | `proof/video-histogram-carbon-footprint-spread` — validated by the owner 2026-09-16 |
| Line | static | `proof/co2-suisse` |
| Line | video | `proof/video-line-swiss-co2` — validated by the owner 2026-09-14 |
| Lollipop | static | `proof/static-lollipop-co2-per-person` |
| Lollipop | video | `proof/video-lollipop-co2-per-person` — validated by the owner 2026-09-14 |
| Marimekko | static | `proof/static-marimekko-electricity-mix` |
| Marimekko | video | `proof/video-marimekko-electricity-mix` — validated by the owner 2026-09-16 |
| Pie and donut | static | `proof/static-donut-world-co2-share` |
| Pie and donut | video | `proof/video-donut-world-co2-share` — validated by the owner 2026-09-16 |
| Population pyramid | static | `proof/static-swiss-age-pyramid` |
| Population pyramid | video | `proof/video-population-pyramid-swiss-age` — validated by the owner 2026-09-16 |
| Radar | static | `proof/static-radar-electricity-mix` |
| Radar | video | `proof/video-radar-electricity-mix` — validated by the owner 2026-09-16 |
| Sankey | static | `proof/static-sankey-electricity-sources` |
| Sankey | video | `proof/video-sankey-electricity-sources` — validated by the owner 2026-09-16 |
| Scatter | static | `proof/static-income-life-expectancy` |
| Scatter | video | `proof/video-scatter-income-life-expectancy` — validated by the owner 2026-09-16 |
| Streamgraph | static | `proof/static-streamgraph-swiss-electricity` |
| Streamgraph | video | `proof/video-streamgraph-swiss-electricity` — validated by the owner 2026-09-14 |
| Treemap | static | `proof/static-treemap-europe-capacity` |
| Treemap | video | `proof/video-treemap-europe-capacity` — validated by the owner 2026-09-16 |
| Waterfall | static | `proof/static-germany-electricity-bridge` |
| Waterfall | video | `proof/video-waterfall-germany-electricity-bridge` — validated by the owner 2026-09-16 |
| Slope | static | `proof/static-slope-europe-lowcarbon` |
| Slope | video | `proof/video-slope-europe-lowcarbon` — validated by the owner 2026-09-14 |
| Stacked bar | static | `proof/static-stacked-bar-lowcarbon-growth` |
| Stacked bar | video | `proof/video-stacked-bar-lowcarbon-growth` — validated by the owner 2026-09-16 |
| Small multiples | static | `proof/static-small-multiples-lowcarbon` |
| Small multiples | video | `proof/video-small-multiples-lowcarbon` — validated by the owner 2026-09-16 |
| Parallel coordinates | static | `proof/static-parallel-coordinates-electricity-mix` |
| Parallel coordinates | video | `proof/video-parallel-coordinates-electricity-mix` — validated by the owner 2026-09-16 |
| Pictogram | static | `proof/static-pictogram-europe-lowcarbon` |
| Pictogram | video | `proof/video-pictogram-europe-lowcarbon` — validated by the owner 2026-09-16 |
| Choropleth | static | `proof/static-choropleth-europe-lowcarbon` |
| Choropleth | video | `proof/video-choropleth-europe-lowcarbon` — live MapTiler map (pilot), validated by the owner 2026-09-16 |
| Dot density | static | `proof/static-dot-density-europe-stations` |
| Dot density | video | `proof/video-dot-density-europe-stations` — live MapTiler map, validated by the owner 2026-09-16 |
| Flow map | static | `proof/static-flow-map-ukraine-protection` |
| Flow map | video | `proof/video-flow-map-ukraine-protection` — live MapTiler map, validated by the owner 2026-09-16 |
| Hex grid | static | `proof/static-hex-grid-europe-protection` |
| Hex grid | video | `proof/video-hex-grid-europe-protection` — live MapTiler map, validated by the owner 2026-09-16 |
| Proportional symbol | static | `proof/static-proportional-symbol-europe-capacity` |
| Proportional symbol | video | `proof/video-proportional-symbol-europe-capacity` — live MapTiler map, validated by the owner 2026-09-16 |
| Locator | static | `proof/static-locator-zaporizhzhia` |
| Locator | video | `proof/video-locator-zaporizhzhia` — live MapTiler map, validated by the owner 2026-09-16 |
| Cartogram | static | `proof/static-cartogram-europe-lowcarbon` |
| Cartogram | video | `proof/video-cartogram-europe-lowcarbon` — live MapTiler map, validated by the owner 2026-09-16 |
| Contour / isoline | static | `proof/static-contour-europe-distance` |
| Contour / isoline | video | `proof/video-contour-europe-distance` — live MapTiler map, validated by the owner 2026-09-16 |
| Area | scrolly | `proof/scrolly-world-population` |
| Bar and column | scrolly | `proof/scrolly-bar-top-emitters-2024` |
| Beeswarm | scrolly | `proof/scrolly-beeswarm-co2-per-person` |
| Box plot | scrolly | `proof/scrolly-boxplot-france-co2-decades` |
| Bullet | scrolly | `proof/scrolly-bullet-low-carbon-share` |
| Bump | scrolly | `proof/scrolly-bump-emitter-rank` |
| Calendar heatmap | scrolly | `proof/scrolly-calendar-heatmap-geneva` |
| Connected scatter | scrolly | `proof/scrolly-connected-scatter-lowcarbon` |
| Diverging bar | scrolly | `proof/scrolly-diverging-bar-eu-per-capita` |
| Diverging stacked bar | scrolly | `proof/scrolly-diverging-stacked-electricity` |
| Dot strip | scrolly | `proof/scrolly-dot-strip-lowcarbon-spread` |
| Dumbbell | scrolly | `proof/scrolly-dumbbell-life-expectancy-gains` |
| Gantt | scrolly | `proof/scrolly-gantt-top-ten-tenure` |
| Grouped bar | scrolly | `proof/scrolly-wind-vs-solar` |
| Heatmap | scrolly | `proof/scrolly-heatmap-europe-electricity`, `proof/scrolly-heatmap-coal-share-europe` |
| Histogram | scrolly | `proof/scrolly-carbon-footprint-spread` |
| Line | scrolly | `proof/scrolly-line-swiss-co2` |
| Lollipop | scrolly | `proof/scrolly-lollipop-co2-per-person` |
| Marimekko | scrolly | `proof/scrolly-marimekko-electricity-mix` |
| Parallel coordinates | scrolly | `proof/scrolly-parallel-coordinates-electricity-mix` |
| Pictogram | scrolly | `proof/scrolly-pictogram-europe-lowcarbon` |
| Pie and donut | scrolly | `proof/scrolly-donut-world-co2-share` |
| Population pyramid | scrolly | `proof/scrolly-swiss-age-pyramid` |
| Radar | scrolly | `proof/scrolly-radar-electricity-mix` |
| Sankey | scrolly | `proof/scrolly-sankey-electricity-sources` |
| Scatter | scrolly | `proof/scrolly-scatter-income-life-expectancy` |
| Slope | scrolly | `proof/scrolly-slope-europe-lowcarbon`, `proof/scrolly-renewables-shift` |
| Small multiples | scrolly | `proof/scrolly-small-multiples-lowcarbon`, `proof/scrolly-small-multiples-solar-eu-six` |
| Stacked bar | scrolly | `proof/scrolly-stacked-bar-lowcarbon-growth`, `proof/scrolly-electricity-mix-source` |
| Streamgraph | scrolly | `proof/scrolly-streamgraph-swiss-electricity` |
| Treemap | scrolly | `proof/scrolly-treemap-europe-capacity` |
| Waterfall | scrolly | `proof/scrolly-germany-electricity-bridge` |
| Cartogram | scrolly | `proof/scrolly-cartogram-europe-lowcarbon` — live MapTiler, flat map (validated 2026-09-16; baked, three directions, guards clean) |
| Choropleth | scrolly | `proof/scrolly-choropleth-europe-lowcarbon` — live MapTiler, flat map (pilot, validated 2026-09-15) |
| Contour / isoline | scrolly | `proof/scrolly-contour-europe-distance` — live MapTiler, flat map (validated 2026-09-16; baked, three directions, guards clean) |
| Dot density | scrolly | `proof/scrolly-dot-density-europe-stations` — live MapTiler, flat map (validated 2026-09-15; baked, three directions, guards clean) |
| Flow map | scrolly | `proof/scrolly-flow-map-ukraine-protection` — live MapTiler, flat map (validated 2026-09-16; baked, three directions, guards clean) |
| Hex grid | scrolly | `proof/scrolly-hex-grid-europe-protection` — live MapTiler, flat map (validated 2026-09-16; baked, three directions, guards clean) |
| Locator | scrolly | `proof/scrolly-locator-zaporizhzhia` — live MapTiler, flat map (validated 2026-09-15; baked, three directions, guards clean) |
| Proportional symbol | scrolly | `proof/scrolly-proportional-symbol-europe-capacity` — live MapTiler, flat map (validated 2026-09-15) |

## What is next, by how much evidence backs it

**Charts** — none left with references harvested.

**Maps** — none left with references harvested.

**Nothing left unharvested.** Every form in this catalogue now holds at least one reference and one
directed static beat.

> The four interaction treatments harvested for the web export
> (`the-default-state-carries-the-whole-reading`, `the-readers-own-input-is-restated-in-words`,
> `the-one-interaction-sits-on-the-plate`, `the-state-you-are-in-is-louder-than-the-controls`) stay
> filed: they are evidence, and evidence does not depend on a beat existing to spend it. They simply
> never fire, because no beat declares an `interaction`.

## Beats that predate the design base

Not ticked above, because they do not go through a direction. They are working proof of the export
machinery and the place a directed beat of that export starts from: `proof/vidx-*`, `proof/vidy-*`
(video), `proof/webx-*`, `proof/weby-*`, `proof/webz-*` (web), `proof/mapmore-scrolly-danube`
(scrolly), `proof/mapgen-*`, `proof/map-*`, `proof/mapmore-*` (maps, on a tile basemap rather than on
frozen shapes).
