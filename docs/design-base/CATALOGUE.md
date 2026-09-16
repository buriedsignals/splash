# Catalogue — 32 charts, 8 maps, 4 exports

The reference list is the owner's. Everything else in this file is **measured off the tree** on each
update, never remembered: `refs` counts harvested references whose own `type:` line names the form,
and a tick means a **directed** beat exists — one that goes through the design base (a direction,
its six registers, the arbiter's treatments). Beats that predate the design base are not ticked here;
they are listed at the foot.

Last measured: 2026-09-17 · 179 references · 40 directed static beats · 40 directed video beats
· 40 directed scrolly beats · 40 directed web beats. The scrolly column was filled on 2026-09-15
(branch `quality/scrolly`), the video column on 2026-09-16, and the web column on 2026-09-15 —
each the directed beats the owner validated in that pass. `proof/` was pruned to exactly these 160
beats on 2026-09-17; everything it does not cite moved to `archive/`, names kept.

- ✅ a directed beat exists
- ◦ references are harvested, no beat yet
- — nothing harvested for this form

## Charts

| # | form | refs | static | web | video | scrolly |
| ---: | --- | ---: | :---: | :---: | :---: | :---: |
| 01 | Area | 1 | ✅ | ✅ | ✅ | ✅ |
| 02 | Bar and column | 2 | ✅ | ✅ | ✅ | ✅ |
| 03 | Beeswarm | 1 | ✅ | ✅ | ✅ | ✅ |
| 04 | Box plot | 1 | ✅ | ✅ | ✅ | ✅ |
| 05 | Bullet | 6 | ✅ | ✅ | ✅ | ✅ |
| 06 | Bump | 2 | ✅ | ✅ | ✅ | ✅ |
| 07 | Calendar heatmap | 5 | ✅ | ✅ | ✅ | ✅ |
| 08 | Connected scatter | 1 | ✅ | ✅ | ✅ | ✅ |
| 09 | Diverging bar | 7 | ✅ | ✅ | ✅ | ✅ |
| 10 | Diverging stacked bar | 3 | ✅ | ✅ | ✅ | ✅ |
| 11 | Dot strip | 1 | ✅ | ✅ | ✅ | ✅ |
| 12 | Dumbbell | 2 | ✅ | ✅ | ✅ | ✅ |
| 13 | Gantt | 2 | ✅ | ✅ | ✅ | ✅ |
| 14 | Grouped bar | 9 | ✅ | ✅ | ✅ | ✅ |
| 15 | Heatmap | 3 | ✅ | ✅ | ✅ | ✅ |
| 16 | Histogram | 6 | ✅ | ✅ | ✅ | ✅ |
| 17 | Line | 2 | ✅ | ✅ | ✅ | ✅ |
| 18 | Lollipop | 1 | ✅ | ✅ | ✅ | ✅ |
| 19 | Marimekko | 7 | ✅ | ✅ | ✅ | ✅ |
| 20 | Parallel coordinates | 1 | ✅ | ✅ | ✅ | ✅ |
| 21 | Pictogram | 4 | ✅ | ✅ | ✅ | ✅ |
| 22 | Pie and donut | 1 | ✅ | ✅ | ✅ | ✅ |
| 23 | Population pyramid | 7 | ✅ | ✅ | ✅ | ✅ |
| 24 | Radar | 6 | ✅ | ✅ | ✅ | ✅ |
| 25 | Sankey | 7 | ✅ | ✅ | ✅ | ✅ |
| 26 | Scatter | 7 | ✅ | ✅ | ✅ | ✅ |
| 27 | Slope | 3 | ✅ | ✅ | ✅ | ✅ |
| 28 | Small multiples | 4 | ✅ | ✅ | ✅ | ✅ |
| 29 | Stacked bar | 5 | ✅ | ✅ | ✅ | ✅ |
| 30 | Streamgraph | 5 | ✅ | ✅ | ✅ | ✅ |
| 31 | Treemap | 1 | ✅ | ✅ | ✅ | ✅ |
| 32 | Waterfall | 12 | ✅ | ✅ | ✅ | ✅ |

**Charts: 32 of 32 done in static, in video, in scrolly and in web. None left.**

## Maps

| # | form | refs | static | web | video | scrolly |
| ---: | --- | ---: | :---: | :---: | :---: | :---: |
| 01 | Cartogram | 1 | ✅ | ✅ | ✅ | ✅ |
| 02 | Choropleth | 1 | ✅ | ✅ | ✅ | ✅ |
| 03 | Contour / isoline | 1 | ✅ | ✅ | ✅ | ✅ |
| 04 | Dot density | 3 | ✅ | ✅ | ✅ | ✅ |
| 05 | Flow map | 1 | ✅ | ✅ | ✅ | ✅ |
| 06 | Hex grid | 2 | ✅ | ✅ | ✅ | ✅ |
| 07 | Locator | 1 | ✅ | ✅ | ✅ | ✅ |
| 08 | Proportional symbol | 2 | ✅ | ✅ | ✅ | ✅ |

**Maps: 8 of 8 done in static, 8 of 8 in video, 8 of 8 in scrolly and 8 of 8 in web.** In
video, in scrolly and in web alike, seven of them are on the live MapTiler map with its own
zoom, pan and hover; the cartogram is without one, because it has no basemap and no
geography to tile. **None left.**

The eight map scrolly beats were first drawn in SVG from a Natural Earth extract clipped to a fixed window, so
countries outside it went missing as soon as the view left it. The owner ruled on 2026-09-15 that they be redone
through MapTiler end to end (`docs/splash/2026-09-12-maps-through-maptiler-spec.md` and its 2026-09-15 addendum).
All eight are now live MapTiler on a flat Web Mercator map, baked in the three directions, guards clean.

## What is done, beat by beat

| form | export | beat |
| --- | --- | --- |
| Area | static | `proof/static-area-swiss-co2` |
| Area | video | `proof/video-area-swiss-co2` — validated by the owner 2026-09-14 |
| Area | web | `proof/web-area-swiss-co2` — built 2026-09-15 |
| Bar and column | static | `proof/static-bar-top-emitters-2024` |
| Bar and column | video | `proof/video-bar-top-emitters-2024` — validated by the owner 2026-09-14 |
| Bar and column | web | `proof/web-bar-top-emitters-2024` — built 2026-09-15 |
| Beeswarm | static | `proof/static-beeswarm-co2-per-person` |
| Beeswarm | video | `proof/video-beeswarm-co2-per-person` — validated by the owner 2026-09-16 |
| Beeswarm | web | `proof/web-beeswarm-co2-per-person` — built 2026-09-15 |
| Box plot | static | `proof/more-boxplot-france-co2-decades` |
| Box plot | video | `proof/video-box-plot-france-co2-decades` — validated by the owner 2026-09-16 |
| Box plot | web | `proof/web-boxplot-france-co2-decades` — built 2026-09-15 |
| Bullet | static | `proof/static-bullet-low-carbon-share` |
| Bullet | video | `proof/video-bullet-low-carbon-share` — validated by the owner 2026-09-14 |
| Bullet | web | `proof/web-bullet-low-carbon-share` — built 2026-09-15 |
| Bump | static | `proof/static-bump-emitter-rank` |
| Bump | video | `proof/video-bump-emitter-rank` — validated by the owner 2026-09-14 |
| Bump | web | `proof/web-bump-emitter-rank` — built 2026-09-15 |
| Calendar heatmap | static | `proof/static-calendar-heatmap-geneva` |
| Calendar heatmap | video | `proof/video-calendar-heatmap-geneva` — validated by the owner 2026-09-14 |
| Calendar heatmap | web | `proof/web-calendar-heatmap-geneva` — built 2026-09-15 |
| Connected scatter | static | `proof/static-connected-scatter-lowcarbon` |
| Connected scatter | video | `proof/video-connected-scatter-lowcarbon` — validated by the owner 2026-09-14 |
| Connected scatter | web | `proof/web-connected-scatter-lowcarbon` — built 2026-09-15 |
| Dot strip | static | `proof/static-dot-strip-lowcarbon-spread` |
| Dot strip | video | `proof/video-dot-strip-lowcarbon-spread` — validated by the owner 2026-09-16 |
| Dot strip | web | `proof/web-dot-strip-lowcarbon-spread` — built 2026-09-15 |
| Diverging bar | static | `proof/static-diverging-bar-eu-per-capita` |
| Diverging bar | video | `proof/video-diverging-bar-eu-per-capita` — validated by the owner 2026-09-14 |
| Diverging bar | web | `proof/web-diverging-bar-eu-per-capita` — built 2026-09-15 |
| Diverging stacked bar | static | `proof/static-diverging-stacked-electricity` |
| Diverging stacked bar | video | `proof/video-diverging-stacked-electricity` — validated by the owner 2026-09-16 |
| Diverging stacked bar | web | `proof/web-diverging-stacked-electricity` — built 2026-09-15 |
| Dumbbell | static | `proof/more-dumbbell-life-expectancy-gains` |
| Dumbbell | video | `proof/video-dumbbell-life-expectancy-gains` — validated by the owner 2026-09-16 |
| Dumbbell | web | `proof/web-dumbbell-life-expectancy-gains` — built 2026-09-15 |
| Gantt | static | `proof/static-gantt-top-ten-tenure` |
| Gantt | video | `proof/video-gantt-top-ten-tenure` — validated by the owner 2026-09-14 |
| Gantt | web | `proof/web-gantt-top-ten-tenure` — built 2026-09-15 |
| Grouped bar | static | `proof/static-wind-vs-solar` |
| Grouped bar | video | `proof/video-grouped-bar-wind-vs-solar` — validated by the owner 2026-09-14 |
| Grouped bar | web | `proof/web-grouped-bar-wind-vs-solar` — built 2026-09-15 |
| Heatmap | static | `proof/static-heatmap-europe-electricity` |
| Heatmap | video | `proof/video-heatmap-europe-electricity` — validated by the owner 2026-09-16 |
| Heatmap | web | `proof/web-heatmap-europe-electricity` — built 2026-09-15 |
| Histogram | static | `proof/static-carbon-footprint-spread` |
| Histogram | video | `proof/video-histogram-carbon-footprint-spread` — validated by the owner 2026-09-16 |
| Histogram | web | `proof/web-histogram-carbon-footprint` — built 2026-09-15 |
| Line | static | `proof/co2-suisse` |
| Line | video | `proof/video-line-swiss-co2` — validated by the owner 2026-09-14 |
| Line | web | `proof/web-line-swiss-co2` — built 2026-09-15 |
| Lollipop | static | `proof/static-lollipop-co2-per-person` |
| Lollipop | video | `proof/video-lollipop-co2-per-person` — validated by the owner 2026-09-14 |
| Lollipop | web | `proof/web-lollipop-co2-per-person` — built 2026-09-15 |
| Marimekko | static | `proof/static-marimekko-electricity-mix` |
| Marimekko | video | `proof/video-marimekko-electricity-mix` — validated by the owner 2026-09-16 |
| Marimekko | web | `proof/web-marimekko-electricity-mix` — built 2026-09-15 |
| Pie and donut | static | `proof/static-donut-world-co2-share` |
| Pie and donut | video | `proof/video-donut-world-co2-share` — validated by the owner 2026-09-16 |
| Pie and donut | web | `proof/web-donut-world-co2-share` — built 2026-09-15 |
| Population pyramid | static | `proof/static-swiss-age-pyramid` |
| Population pyramid | video | `proof/video-population-pyramid-swiss-age` — validated by the owner 2026-09-16 |
| Population pyramid | web | `proof/web-population-pyramid-switzerland` — built 2026-09-15 |
| Radar | static | `proof/static-radar-electricity-mix` |
| Radar | video | `proof/video-radar-electricity-mix` — validated by the owner 2026-09-16 |
| Radar | web | `proof/web-radar-electricity-mix` — built 2026-09-15 |
| Sankey | static | `proof/static-sankey-electricity-sources` |
| Sankey | video | `proof/video-sankey-electricity-sources` — validated by the owner 2026-09-16 |
| Sankey | web | `proof/web-sankey-electricity-sources` — built 2026-09-15 |
| Scatter | static | `proof/static-income-life-expectancy` |
| Scatter | video | `proof/video-scatter-income-life-expectancy` — validated by the owner 2026-09-16 |
| Scatter | web | `proof/web-scatter-income-life-expectancy` — built 2026-09-15 |
| Streamgraph | static | `proof/static-streamgraph-swiss-electricity` |
| Streamgraph | video | `proof/video-streamgraph-swiss-electricity` — validated by the owner 2026-09-14 |
| Streamgraph | web | `proof/web-streamgraph-swiss-electricity` — built 2026-09-15 |
| Treemap | static | `proof/static-treemap-europe-capacity` |
| Treemap | video | `proof/video-treemap-europe-capacity` — validated by the owner 2026-09-16 |
| Treemap | web | `proof/web-treemap-europe-capacity` — built 2026-09-15 |
| Waterfall | static | `proof/static-germany-electricity-bridge` |
| Waterfall | video | `proof/video-waterfall-germany-electricity-bridge` — validated by the owner 2026-09-16 |
| Waterfall | web | `proof/web-waterfall-germany-bridge` — built 2026-09-15 |
| Slope | static | `proof/static-slope-europe-lowcarbon` |
| Slope | video | `proof/video-slope-europe-lowcarbon` — validated by the owner 2026-09-14 |
| Slope | web | `proof/web-slope-europe-lowcarbon` — built 2026-09-15 |
| Stacked bar | static | `proof/static-stacked-bar-lowcarbon-growth` |
| Stacked bar | video | `proof/video-stacked-bar-lowcarbon-growth` — validated by the owner 2026-09-16 |
| Stacked bar | web | `proof/web-stacked-bar-lowcarbon-growth` — built 2026-09-15 |
| Small multiples | static | `proof/static-small-multiples-lowcarbon` |
| Small multiples | video | `proof/video-small-multiples-lowcarbon` — validated by the owner 2026-09-16 |
| Small multiples | web | `proof/web-small-multiples-solar-eu-six` — built 2026-09-15 |
| Parallel coordinates | static | `proof/static-parallel-coordinates-electricity-mix` |
| Parallel coordinates | video | `proof/video-parallel-coordinates-electricity-mix` — validated by the owner 2026-09-16 |
| Parallel coordinates | web | `proof/web-parallel-coordinates-electricity` — built 2026-09-15 |
| Pictogram | static | `proof/static-pictogram-europe-lowcarbon` |
| Pictogram | video | `proof/video-pictogram-europe-lowcarbon` — validated by the owner 2026-09-16 |
| Pictogram | web | `proof/web-pictogram-europe-lowcarbon` — built 2026-09-15 |
| Choropleth | static | `proof/static-choropleth-europe-lowcarbon` |
| Choropleth | video | `proof/video-choropleth-europe-lowcarbon` — live MapTiler map (pilot), validated by the owner 2026-09-16 |
| Choropleth | web | `proof/web-choropleth-europe-lowcarbon` — built 2026-09-15 |
| Dot density | static | `proof/static-dot-density-europe-stations` |
| Dot density | video | `proof/video-dot-density-europe-stations` — live MapTiler map, validated by the owner 2026-09-16 |
| Dot density | web | `proof/web-dot-density-europe-stations` — built 2026-09-15 |
| Flow map | static | `proof/static-flow-map-ukraine-protection` |
| Flow map | video | `proof/video-flow-map-ukraine-protection` — live MapTiler map, validated by the owner 2026-09-16 |
| Flow map | web | `proof/web-flow-map-ukraine-protection` — built 2026-09-15 |
| Hex grid | static | `proof/static-hex-grid-europe-protection` |
| Hex grid | video | `proof/video-hex-grid-europe-protection` — live MapTiler map, validated by the owner 2026-09-16 |
| Hex grid | web | `proof/web-hex-grid-europe-protection` — built 2026-09-15 |
| Proportional symbol | static | `proof/static-proportional-symbol-europe-capacity` |
| Proportional symbol | video | `proof/video-proportional-symbol-europe-capacity` — live MapTiler map, validated by the owner 2026-09-16 |
| Proportional symbol | web | `proof/web-proportional-symbol-europe-capacity` — built 2026-09-15 |
| Locator | static | `proof/static-locator-zaporizhzhia` |
| Locator | video | `proof/video-locator-zaporizhzhia` — live MapTiler map, validated by the owner 2026-09-16 |
| Locator | web | `proof/web-locator-zaporizhzhia` — built 2026-09-15 |
| Cartogram | static | `proof/static-cartogram-europe-lowcarbon` |
| Cartogram | video | `proof/video-cartogram-europe-lowcarbon` — live MapTiler map, validated by the owner 2026-09-16 |
| Cartogram | web | `proof/web-cartogram-europe-lowcarbon` — built 2026-09-15 |
| Contour / isoline | static | `proof/static-contour-europe-distance` |
| Contour / isoline | video | `proof/video-contour-europe-distance` — live MapTiler map, validated by the owner 2026-09-16 |
| Contour / isoline | web | `proof/web-contour-europe-distance` — built 2026-09-15 |
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
| Heatmap | scrolly | `proof/scrolly-heatmap-coal-share-europe` |
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
| Slope | scrolly | `proof/scrolly-slope-europe-lowcarbon` |
| Small multiples | scrolly | `proof/scrolly-small-multiples-lowcarbon` |
| Stacked bar | scrolly | `proof/scrolly-stacked-bar-lowcarbon-growth` |
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
> `the-one-interaction-sits-on-the-plate`, `the-state-you-are-in-is-louder-than-the-controls`) are no
> longer filed against nothing: 27 of the 40 directed web beats declare an `interaction` in their own
> runner. The other 13 carry a page the reader can read but nothing they declare a gesture for.

## Beats that predate the design base

Not ticked above, because they do not go through a direction. Archived 2026-09-17, alongside every
`proof/` folder this table does not cite: working proof of the export machinery and the place a
directed beat of that export started from, now under `archive/` with their names kept —
`vidx-*`, `vidy-*`, `vidz-*` (video), `webx-*`, `weby-*`, `webz-*` (web), `mapmore-scrolly-danube`,
`mapscrolly-*` (scrolly), `mapgen-*`, `map-*`, `mapmore-*`, `mapvid-*` (maps, on a tile basemap
rather than on frozen shapes).

## Beats archived 2026-09-17

`proof/` held 245 folders against the 160 this catalogue names (40 types × static/web/video/scrolly);
85 moved to `archive/`, keeping their names, plus three `stories/` workspaces to `archive/stories/`.
Besides the legacy prefixes above, this swept: the `more-*`/`static-*`/`video-*`/`web-*`/`scrolly-*`
beats this table superseded and stopped citing (`static-world-population`, `static-renewables-shift`,
`static-heatmap-coal-share-europe`, `static-small-multiples-solar-eu-six`,
`static-electricity-mix-source`, and their video/web/scrolly counterparts); one-off probes and
dossiers (`comparison`, `trial`, `seance`, `palette-proof`, `portrait-aspect-probe`, `migration`,
`life-expectancy`, `RankBars.tsx`, `stamp-superseded.mjs`); two web beats the merge brought in but
never entered into this table (`web-flow-map-danube`, `web-heatmap-coal-share-europe` — superseded by
`web-flow-map-ukraine-protection` and `web-heatmap-europe-electricity`, the cited beats for those
pairs); and seven duplicate citations resolved per form — the beat NOT kept in each pair moved to
`archive/`:

- scrolly Heatmap: kept `scrolly-heatmap-coal-share-europe` (the type sheet's own worked example),
  archived `scrolly-heatmap-europe-electricity`.
- scrolly Slope: kept `scrolly-slope-europe-lowcarbon` (the type sheet's own worked example),
  archived `scrolly-renewables-shift`.
- scrolly Small multiples: kept `scrolly-small-multiples-lowcarbon` (the type sheet's own worked
  example), archived `scrolly-small-multiples-solar-eu-six`.
- scrolly Stacked bar: kept `scrolly-stacked-bar-lowcarbon-growth` (the type sheet's own worked
  example), archived `scrolly-electricity-mix-source`.
- web Bar and column: kept `web-bar-top-emitters-2024` (2026-09-12, the subject-naming convention
  shared with the other three exports), archived the older `web-co2-ranking` (2026-08-13).
- web Slope: kept `web-slope-europe-lowcarbon` (2026-09-12, same convention), archived the older
  `web-co2-decline-slope` (2026-08-13).
- web Scatter: kept `web-scatter-income-life-expectancy` (2026-09-12, same convention), archived the
  older `web-income-life-expectancy` (2026-08-13).

Also archived, from earlier cold-run exercises and never cited above:
`scrolly-choropleth-europe-nuclear`, `scrolly-hex-grid-europe-wind-2024`, and
`stories/europe-low-carbon-electricity-leaders-2024`, `stories/europe-hydropower-2024`,
`stories/europe-coal-electricity-2024` (each now under `archive/stories/`).
