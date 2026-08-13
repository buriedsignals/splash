# Choosing a visual form by editorial intent

Read this at movement ④, after the data profile, takeaway, subject, comparison and limits are known.
It is a ranked starting point for Splash's own editorial judgement. It does not dispatch work to a
chart type, and it does not replace the type sheets.

The broad intent vocabulary is informed by the Financial Times Visual Vocabulary and Data2Story's
chart chooser. The order, conditions and refusal rules below come from Splash's forty local type
sheets, its doctrine, its reference set and the failures recorded in its surveys and proofs.
Data2Story remains a cited design reference; this file has no external skill invocation or runtime
dependency.

## How the ranking works

1. Name the narrow intent expressed by the confirmed takeaway and the journalist's comparison.
   "Change" is too broad when the real claim is "who overtook whom" or "how two measures moved
   together."
2. Remove every type whose data requirement is absent. A hard refusal removes a candidate; its rank
   cannot rescue it.
3. Within the closest intent below, start with rank 1 and move down only for a stated reason. The
   number is local to that table, never a score across the whole document.
4. Prefer the form that makes the claim visible through the strongest suitable channel. Shared
   position or length leads when the reader needs precise comparison. Angle, area and colour lead
   only when composition, hierarchy, geography or pattern is the claim.
5. Reachability is checked after editorial fit. Check `references/type-survey.md` for proven formats
   and current reachability. A type being unproven in this repository does not make it a worse
   editorial fit. Say that the route is unproven, then either build it or state the compromise made
   by moving down the list.
6. Read the selected type sheet before proposing the candidate. If a lower-ranked form wins, state
   why the higher surviving form lost. Do not turn this into another question for the journalist.

The agent may choose a lower-ranked form when the subject, comparison, limits, article placement or
delivery context gives it a better reason. That judgement belongs in the candidate rationale. A
generic preference such as "more engaging" is not a reason.

## Rules that apply across every intent

- Use a map only when location, adjacency, route, region or spatial pattern contributes to the
  claim. If geography merely labels the rows, rank the equivalent chart first.
- Preserve raw observations when exceptions and spread matter. Aggregate when the claim is about
  shape, centre, rank, total or composition and disclose what the aggregation removes.
- Keep time, ordered bands, routes and causal steps in their real order. Sort by value only when
  ranking is the argument.
- A target must be real, a whole must be real, a midpoint must be real, and a flow must conserve.
  Never invent the structure a specialised form presumes.
- Use small multiples as a layout correction after one frame becomes crowded. They do not repair a
  weak underlying chart choice, and every panel must keep the same scale.
- The subject named by the journalist receives emphasis. The largest value does not become the
  subject by default.

## Intent: rank or compare one value per category

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Bar and column](../../chart-beat/references/types/bar-and-column.md) | The reader needs the clearest magnitude or rank comparison on a shared zero baseline. | A long time series is really a trend, or more than roughly 20–25 categories make the chart a comb. |
| 2 | [Lollipop](../../chart-beat/references/types/lollipop.md) | The same zero-based ranking is dense enough that solid bars feel heavy, especially in a long list or reveal. | There are only a few categories, values cross zero, or the lighter mark makes the value harder to read. |
| 3 | [Pictogram](../../chart-beat/references/types/pictogram.md) | A short, genuine count of concrete things gains meaning from countable equal-size icons. | The measure is continuous, the unit cannot be stated cleanly, or the row becomes slower to count than a bar is to read. |

## Intent: compare several series across categories

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Grouped bar](../../chart-beat/references/types/grouped-bar.md) | Exact within-category and across-category comparison matters, with no more than about three series and few categories. | The question is composition, a time trend, or the clusters have become a picket fence. |
| 2 | [Small multiples](../../chart-beat/references/types/small-multiples.md) | Crowding prevents a shared frame from being read and the same pattern must be compared across groups. | A few overlaid series remain legible and crossings or slopes need one shared visual field. |
| 3 | [Heatmap](../../chart-beat/references/types/heatmap.md) | Many row–column combinations form a pattern and approximate highs and lows matter more than exact pairwise values. | The task is one-dimensional or the reader must compare exact values. |
| 4 | [Parallel coordinates](../../chart-beat/references/types/parallel-coordinates.md) | Items must be compared across roughly three to eight independently scaled dimensions for trade-offs and profiles. | The reader needs precise values, there is only one dimension, or too many ordinary lines make a hairball. |
| 5 | [Radar](../../chart-beat/references/types/radar.md) | A few items share one genuinely comparable scale across at least three dimensions and overall shape is the intended read. | Units differ, precise axes matter, or more than about three overlapping polygons obscure one another. |

## Intent: show the gap between exactly two values

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Dumbbell](../../chart-beat/references/types/dumbbell.md) | Gap size is the claim and the two measures have no necessary temporal direction. | There are more than two measures, more than roughly 12–15 categories, or direction through time is the claim. |
| 2 | [Slope](../../chart-beat/references/types/slope.md) | The values are exactly two ordered moments and direction or a line bucking the trend matters. | A third moment exists, the sequence is not meaningful, or many crossings defeat direct labels. |
| 3 | [Grouped bar](../../chart-beat/references/types/grouped-bar.md) | Readers need the two absolute magnitudes more than the gap between them. | The gap or direction is the finding rather than the two levels. |
| 4 | [Bullet](../../chart-beat/references/types/bullet.md) | One of the two values is a declared target and the story is actual performance against it. | There is no real target, qualitative bands would have to be invented, or the two values are peers. |

## Intent: show a measured trend over time

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Line](../../chart-beat/references/types/line.md) | A continuous trend, turning point or crossing over an ordered axis is the claim. | There are only a few discrete periods with no trend, or more than four or five series crowd the frame. |
| 2 | [Bar and column](../../chart-beat/references/types/bar-and-column.md) | There are roughly eight or fewer discrete periods and the level at each period matters more than continuity. | The sequence is long enough that the overall shape is the read. |
| 3 | [Area and stacked area](../../chart-beat/references/types/area.md) | The series is a level, stock or cumulative quantity and the filled mass carries meaning. | The values are rates or ratios, or the fill would imply a quantity the data does not contain. |
| 4 | [Small multiples](../../chart-beat/references/types/small-multiples.md) | Many groups need the same trend form and an overlay has become illegible. | Independent panel scales would be needed to make the patterns visible. |

## Intent: compare before and after

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Slope](../../chart-beat/references/types/slope.md) | Direction and exceptions across many categories are the finding. | The endpoints are not ordered moments or there are more than two moments. |
| 2 | [Dumbbell](../../chart-beat/references/types/dumbbell.md) | The size of each change needs a quieter, sortable comparison. | The order of the endpoints is essential and a line's direction should lead. |
| 3 | [Grouped bar](../../chart-beat/references/types/grouped-bar.md) | Absolute before and after values must be read from zero. | The paired gap is the main fact. |

## Intent: show rank changing over time

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Bump](../../chart-beat/references/types/bump.md) | Overtakes and crossings among ranked entities over at least three periods are the claim. | Actual magnitude or the size of gaps matters, or only two periods exist. |
| 2 | [Line](../../chart-beat/references/types/line.md) | The measured values behind the ranks matter more than the rank positions themselves. | Readers only need the order and overtakes. |
| 3 | [Small multiples](../../chart-beat/references/types/small-multiples.md) | Too many rank paths prevent the important competitors from being followed in one frame. | Splitting the field would hide the crossings that make the story. |

## Intent: show two measures changing together

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Connected scatter](../../chart-beat/references/types/connected-scatter.md) | Two measures trace an ordered trajectory whose loops, reversals, start and end are the finding. | Order is irrelevant, there are too many points to follow, or the x-axis is simply time. |
| 2 | [Scatter and bubble](../../chart-beat/references/types/scatter.md) | The relationship across units matters and time order does not. | One variable is time or there are too few points for a cloud to have a shape. |
| 3 | [Line](../../chart-beat/references/types/line.md) | One measure is time and the two outcomes are best compared as aligned series. | The relationship between two non-time measures is the claim. |

## Intent: show daily cadence or seasonality

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Calendar heatmap](../../chart-beat/references/types/calendar-heatmap.md) | One value per day over at least several weeks should reveal weekday, weekly or seasonal rhythm. | Dates are sparse, several values occur per day, or exact trend reading matters more than cadence. |
| 2 | [Line](../../chart-beat/references/types/line.md) | The precise sequence and magnitude of changes matter more than weekday placement. | The repeated calendar pattern is the point. |
| 3 | [Heatmap](../../chart-beat/references/types/heatmap.md) | The calendar can be reduced to two meaningful dimensions such as weekday × week and the pattern is primary. | Real dates and their continuous order must stay visible. |

## Intent: show the shape of a continuous distribution

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Histogram](../../chart-beat/references/types/histogram.md) | Enough observations exist for bins to reveal skew, modes, gaps and tails. | The values are categories, the bin choice drives the claimed result, or exact observations must remain visible. |
| 2 | [Dot strip](../../chart-beat/references/types/dot-strip.md) | Every observation should remain visible and overlap can be controlled with a cheap deterministic jitter. | Collisions hide points or the count makes individual marks unhelpful. |
| 3 | [Beeswarm](../../chart-beat/references/types/beeswarm.md) | Every observation matters, collisions must be resolved, and the set stays below roughly 150 points. | The set is large enough that packing becomes slow or visually dense. |
| 4 | [Box plot](../../chart-beat/references/types/boxplot.md) | A compact five-number summary is more useful than the full shape. | The sample is small or multimodality and individual observations matter. |

## Intent: compare distributions across groups

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Box plot](../../chart-beat/references/types/boxplot.md) | Several groups need comparable centre, spread, skew and outliers, with sample size disclosed. | A group has too few observations or its multimodal shape is central to the story. |
| 2 | [Dot strip](../../chart-beat/references/types/dot-strip.md) | Raw observations and exceptions should stay visible across a modest number of groups. | Overlap conceals the distribution. |
| 3 | [Beeswarm](../../chart-beat/references/types/beeswarm.md) | Raw points need collision-free density and the observation count remains modest. | There are enough groups or points that the packed marks become a wall. |
| 4 | [Small multiples](../../chart-beat/references/types/small-multiples.md) | Each group needs a full histogram or other distribution view on the same scale. | The panels would use different domains or the comparison fits one shared frame. |
| 5 | [Population pyramid](../../chart-beat/references/types/population-pyramid.md) | Exactly two groups are distributed across naturally ordered bands and the mirrored silhouette is the finding. | Bands have no natural order, only one group exists, or more than two groups must be shown. |

## Intent: show association, correlation or a multivariate profile

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Scatter and bubble](../../chart-beat/references/types/scatter.md) | Two continuous variables across enough units form the relationship under discussion. | One axis is time, most points need labels, or a causal reading would exceed the stated limits. |
| 2 | [Heatmap](../../chart-beat/references/types/heatmap.md) | Two categorical dimensions and one value form a matrix whose pattern matters more than exact lookup. | The relationship is between two continuous variables. |
| 3 | [Parallel coordinates](../../chart-beat/references/types/parallel-coordinates.md) | Three to eight variables on independent scales reveal trade-offs and unusual profiles. | Precision is required or too many lines obscure every profile. |
| 4 | [Radar](../../chart-beat/references/types/radar.md) | A few same-scale dimensions and no more than about three items make overall shape useful. | Axes use different units, axis order changes the apparent claim, or the reader needs accurate values. |
| 5 | [Connected scatter](../../chart-beat/references/types/connected-scatter.md) | The association itself changes through an ordered sequence and that path is the finding. | The sequence does not add meaning. |

## Intent: show deviation from a reference or target

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Diverging bar](../../chart-beat/references/types/diverging-bar.md) | Signed values genuinely cross zero or a declared reference and direction is the first read. | Every value lies on one side of the reference, or time crossing is the story. |
| 2 | [Bullet](../../chart-beat/references/types/bullet.md) | Actual performance must be judged against a real target, one row at a time. | No target exists or qualitative performance bands would be invented. |
| 3 | [Dumbbell](../../chart-beat/references/types/dumbbell.md) | The reference is a second observed value and the size of each gap matters. | The comparison is signed around one common zero or target. |
| 4 | [Slope](../../chart-beat/references/types/slope.md) | The reference is an ordered earlier moment and direction matters. | The pair is not temporal or more than two moments exist. |
| 5 | [Waterfall](../../chart-beat/references/types/waterfall.md) | Signed components explain how a starting total reaches an ending total. | The values are independent deviations and do not form an exact running sum. |

## Intent: show ordered survey balance

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Diverging stacked bar](../../chart-beat/references/types/diverging-stacked-bar.md) | Ordered Likert responses split around a real neutral midpoint, with no more than about five levels. | Categories are unordered, rows do not sum to a whole, or no meaningful midpoint exists. |
| 2 | [Stacked bar](../../chart-beat/references/types/stacked-bar.md) | Composition matters but there is no neutral split to centre. | Precise comparison of floating middle segments is the claim. |
| 3 | [Grouped bar](../../chart-beat/references/types/grouped-bar.md) | Exact response-level comparison matters more than the balance of each whole. | Too many response levels turn the chart into a picket fence. |

## Intent: explain one whole at one moment

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Pie and donut](../../chart-beat/references/types/pie-and-donut.md) | One real whole has about five or fewer parts and approximate share is the question. | Parts do not sum to one whole, close slices need precise comparison, or change over time matters. |
| 2 | [Treemap](../../chart-beat/references/types/treemap.md) | Parts also belong to meaningful groups whose hierarchy must remain visible. | No hierarchy exists or precise ranking matters more than grouping. |
| 3 | [Stacked bar](../../chart-beat/references/types/stacked-bar.md) | A linear whole, its total and its baseline segment need to be read more precisely. | Several inner parts need accurate comparison. |
| 4 | [Bar and column](../../chart-beat/references/types/bar-and-column.md) | The real question is which part is largest rather than how the whole is composed. | Part-to-whole meaning would be lost by separating the parts. |

## Intent: compare composition across groups or time

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Stacked bar](../../chart-beat/references/types/stacked-bar.md) | Totals and composition across a few categories both matter, with no more than about five parts. | A floating middle segment needs precise comparison. |
| 2 | [Area and stacked area](../../chart-beat/references/types/area.md) | Composition changes continuously over time and the total or baseline band remains meaningful. | Values are rates or ratios, or individual middle bands need accurate reads. |
| 3 | [Marimekko](../../chart-beat/references/types/marimekko.md) | Unequal group sizes matter and each group's internal composition creates a meaningful joint share. | Group widths do not add information, values are non-positive, or more than about five series are required. |
| 4 | [Treemap](../../chart-beat/references/types/treemap.md) | Hierarchical grouping at one moment matters more than comparison on a shared baseline. | Change over time or precise values are the story. |
| 5 | [Streamgraph](../../chart-beat/references/types/streamgraph.md) | The overall rhythm and changing dominance of several series is enough; exact values are secondary. | Readers need accurate series values, a fixed baseline, or more than about seven bands. |

## Intent: explain a sequence, duration or flow

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Waterfall](../../chart-beat/references/types/waterfall.md) | Ordered signed steps bridge an opening total to an exact closing total. | The steps are simultaneous shares or independent values. |
| 2 | [Sankey](../../chart-beat/references/types/sankey.md) | A conserved quantity splits and rejoins through explicit categorical stages. | There is no stage order, conservation fails, or the story is a running total. |
| 3 | [Gantt](../../chart-beat/references/types/gantt.md) | Start, end, duration and overlap on a true time scale are the claim. | Items are point events or bar length should encode magnitude rather than elapsed time. |
| 4 | [Flow map](../../map-beat/references/types/flow-map.md) | One real geographic path and the places crossed in order are part of the evidence. | Geography is incidental, no path exists, or many origin–destination flows would create a tangle. |

## Intent: locate places

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Locator](../../map-beat/references/types/locator.md) | The map only needs to answer where named places are, with uniform markers and optional categories. | A marker carries magnitude, a continuous colour value, or hundreds of unprioritised points. |
| 2 | [Proportional symbol](../../map-beat/references/types/proportional-symbol.md) | Each place also carries a real quantity whose symbol area can encode magnitude. | There is no value or the data is a rate attached to an area. |
| 3 | [Hex grid](../../map-beat/references/types/hex-grid.md) | So many raw point events exist that individual locations must give way to a density pattern. | Only a handful of points exist or recognised administrative regions are the question. |

## Intent: compare named regions

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Choropleth](../../map-beat/references/types/choropleth.md) | A rate, share or intensity belongs to recognised regions and spatial pattern matters. | The value is a raw count, joins are incomplete, or geography adds nothing beyond row labels. |
| 2 | [Proportional symbol](../../map-beat/references/types/proportional-symbol.md) | The value is an absolute total at a point or region centroid and geography still matters. | The value is a regional rate or there is no magnitude. |
| 3 | [Cartogram](../../map-beat/references/types/cartogram.md) | Region magnitude and spatial relationships matter enough to justify deliberate geographic distortion. | Readers need recognisable shapes or a ranked bar would state the comparison better. |
| 4 | [Bar and column](../../chart-beat/references/types/bar-and-column.md) | Geography only supplies category names and precise ranking is the actual task. | Adjacency, clustering or location is part of the claim. |

## Intent: show spatial concentration or a continuous field

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Hex grid](../../map-beat/references/types/hex-grid.md) | Many real point events should be aggregated into comparable spatial cells. | Recognised boundaries matter, the point count is small, or aggregate mode cannot be stated. |
| 2 | [Dot density](../../map-beat/references/types/dot-density.md) | A quantity's within-region concentration and texture matter, with each dot representing a stated unit. | Individual dot locations would be mistaken for real addresses, or a single regional rate is the claim. |
| 3 | [Contour and isoline](../../map-beat/references/types/contour-isoline.md) | Dense samples support a continuous field and threshold lines or gradient shape are the claim. | Samples are sparse or the source values belong to discrete regions. This type has no shipped implementation here, so every render needs fresh verification. |
| 4 | [Choropleth](../../map-beat/references/types/choropleth.md) | The quantity is already a rate attached to named regions. | Interpolation or within-region variation is the finding. |

## Intent: show a geographic journey

| rank | candidate | move it up when | remove or move it down when |
|---:|---|---|---|
| 1 | [Flow map](../../map-beat/references/types/flow-map.md) | One path, its direction and the territories crossed in order form the claim. | Only endpoints are known, there is no real journey, or many routes compete. |
| 2 | [Locator](../../map-beat/references/types/locator.md) | The evidence supports only named stops or endpoints, without a defensible path between them. | The actual route and crossing order are known and material. |
| 3 | [Sankey](../../chart-beat/references/types/sankey.md) | The "journey" is an abstract conserved flow through stages rather than movement through geography. | Real location and route geometry matter. |

## What the recommendation must say

At movement ④ and again in each candidate's reason, keep the account short and concrete:

- the narrow intent;
- the first applicable type and the type-sheet condition it satisfies;
- any higher-ranked type removed by the data shape or displaced by a story-specific reason;
- whether the chosen medium and format are reachable now;
- the sheet that must govern production.

This account is enough for the journalist to correct the reasoning without making them operate the
chooser. The final selection remains editable in the normal storyboard proposal.
