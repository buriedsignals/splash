# Map-web discipline

The rules this genre is written under. `twin-doctrine`'s cross-cutting references
(`editorial-standard.md`, `information-architecture.md`, `visual-system.md`) apply unchanged, and
`geo-discipline.md` — the map craft's own twelve rules — applies unchanged too: this genre draws
from the same baked plate a static or video map beat draws from, so the bake rules (1, 2, 4, 6, 7,
9, 12) all still bind. What this file adds is only what is true of a map that a reader can
**interrogate**, **narrow**, and now **fill the width of its own container with**, and nothing this
genre's first beat did not actually meet.

## Full width, genuinely

The defect this section closes: the first version of this genre baked TWO fixed-pixel layouts
(860px, 360px) and swapped between them with a CSS media query. That is not responsive — it is two
static posters with a light switch between them, and at any width other than 860 or 360 the beat
either sat in a gutter or (worse) never filled the space it was given at all.

**The mechanism now: one render, one fluid SVG plus an HTML overlay, no breakpoint.**
`MapWebSeed.tsx`'s own header note has the full reasoning; the shape of it —

- The SVG's `viewBox` is set to the baked plate's own frame (`geometry.frame`), and the SVG itself
  is drawn at `width: 100%` inside a wrapper (`.mw-viewport`) whose CSS `aspect-ratio` is locked to
  that SAME frame. **Width fills the container; height grows WITH the width**, because the aspect
  ratio — not a fixed height — is what is held constant. This is the fix for the specific failure
  the beat's own owner named while this was mid-build: setting `width: 100%` on an element that
  still has a FIXED height turns a wide container into a letterbox strip, stretching the plate's own
  pixels horizontally without ever growing them vertically to match — a real distortion of the
  basemap, the exact thing this project's whole geo discipline exists to prevent. `aspect-ratio`
  (not a max-width, not a fixed height) is the one CSS property doing that job.
- **No max-width anywhere in this genre's own CSS.** An earlier draft of this rewrite bounded the
  map's own display size with a `max-width`, reasoning that a raster plate should not be asked to
  cover more screen than it was baked for. That is real (see "The plate strategy" below), but a
  `max-width` is the WRONG place to put that reasoning: it leaves an empty gutter beside the map on
  a wide container, which is precisely the complaint this whole rework exists to fix (the beat is
  "size-limited", not filling). The right place for the resolution trade-off is the BAKE's own size,
  not a display-time cap — see below.
- Point-name labels and the per-point hit target are HTML, absolutely positioned over the SVG by
  **percentage** of the frame — not fixed pixels — so they track the geometry continuously as the
  container resizes, at every width, not just the two this genre used to ship. Their FONT SIZE stays
  a fixed CSS number regardless: see "Text is HTML, not SVG" below for why that is the one thing
  that must NOT scale with the container.

## The plate strategy

**The ground is a baked raster plate, not vector geometry.** Stretching it to an arbitrary width
either distorts the geography (a non-uniform scale — ruled out entirely, see above: `aspect-ratio`
guarantees the scale this genre ever applies is uniform) or, if the display width exceeds the plate's
own native resolution, softens it — the picture itself has fewer real pixels than the screen is
asking it to cover. Two strategies were on the table:

- bake at a generous width and let the plate scale UNIFORMLY (never distorted) up or down within
  that resolution, accepting mild softening past it;
- bake at a few discrete sizes and pick the nearest one at or above the container's actual width.

**This genre takes the first.** The self-contained HTML this genre ships embeds every asset as a
`data:` URI at build time — there is no request a browser could make at display time to fetch a
BIGGER asset for a wider container, the way a real `<img srcset>` fetching from a server could. A
multi-size strategy would therefore have to embed ALL of its candidate sizes in the one file
up front, multiplying the payload by the number of sizes for a benefit only the widest containers
would ever see — a worse trade than a single generous bake, for a self-contained artifact
specifically.

**The numbers, and what they trade off.** `PLATE_SIZE` (`render-web.mjs`) is `1000` logical px,
captured at the bake's own 2x device pixel ratio (`bake-plate.mjs`), giving a ~2000-physical-pixel
raster. Against the body's own 16px padding on each side, the widest tested viewport (1600px) draws
the plate at ~1568 CSS px — an upscale of ~1.57×, mild and not visually distracting for a basemap
(a photographic or vector-derived plate does not have the same hard edges a chart's own gridlines
do, where the same ratio would show). At 1024/768/375 the plate is at or BELOW its native
resolution (a downscale, strictly crisp). This was `496` before this rewrite — deliberately raised,
at the cost of a heavier bake and a larger embedded PNG, because the old size was tuned for an
860px-wide fixed layout and would have visibly softened at any width this genre now actually ships.

**Where the bound genuinely lives, if one is needed at all: the bake's own resolution, not the
display width.** If a future beat needs to look crisp at containers meaningfully wider than 1600px,
the fix is raising `PLATE_SIZE`, not adding a CSS `max-width` back — the display-time cap is exactly
the mistake this section's own first paragraph describes.

## Text is HTML, not SVG

**In a fluid SVG, text scales with the geometry.** A legend readable at 900px becomes oversized at
1600px, and illegibly small at 375px — an SVG `<text>` element sized in the SAME `viewBox` units the
plate and the marks are drawn in has no way to opt out of the transform the browser applies to the
whole document to make it fill the container. This genre's OLD two-layout version dodged the problem
by never actually being fluid (two fixed layouts, two fixed sets of hand-tuned font sizes) — the
problem re-appeared the moment the SVG itself was made to scale continuously.

**The fix: the SVG carries ONLY geometry — the baked plate `<image>` and the decorative,
value-sized `<circle>`s. Every piece of furniture (title, source, legend, point-name labels, the
subject note, the caveat) and every interactive control (the hit target, the filter, the zoom
toggle) is plain HTML**, layered over the SVG, positioned by percentage where it needs to track the
geometry (point labels, hit targets) but always sized with a fixed CSS `font-size` — a number that
never changes because the CSS mechanism that scales the SVG (`width: 100%` inside an
`aspect-ratio`-locked box) has no purchase on an HTML sibling laid out with normal document flow and
`position: absolute` percentages. This is the SAME split `twin-chart-web/references/web-discipline.md`
describes for the chart genre, applied to a genre where the "geometry" is a raster plate instead of
a vector path — the principle (SVG = geometry and marks, HTML = everything that reads as language)
does not change with the medium underneath it.

**One consequence worth naming: circle SIZE is allowed to scale with the container; circle LABEL
GAP is allowed to scale with it too (computed as a percentage of the frame, tracking the circle's
own radius); circle label TEXT is not.** A circle standing for a value is spatial encoding — it is
correct for it to grow as the map itself grows, the same way the plate's own coastline does. A
label's glyphs are language, not encoding — a reader's ability to read "Paris" does not improve by
drawing it bigger just because the map got wider, and a reader on a narrow phone must not lose the
ability to read it just because the map got smaller.

## The accessibility question

**A map is a spatial medium, and a screen-reader user has no spatial access to it.** A chart's own
web genre can lean on a linear reading order — a series of points along an x-axis has a natural
"first, then next" a screen reader's own navigation already matches. A map has no such order: two
regions are related by where they sit on a plane, and that relationship is not expressible as a
sequence of DOM nodes no matter how carefully `tabIndex` is assigned to them. Tabbing through
thirteen points in *some* order gives a screen-reader user thirteen numbers, but not the one thing
the map itself is for — the spatial pattern those thirteen numbers make.

Two answers were on the table for this beat, and only one of them is honest:

- **A hover tooltip, alone, is not an answer.** It requires knowing where on the canvas a value of
  interest sits *before* you can ask for it — exactly the spatial access the question starts by
  saying is absent. Treating "point your cursor at the right pixel" as an accessible affordance is
  the anti-pattern this section exists to name and reject, not merely to avoid by accident.
- **An ordered, readable list of the regions and their values, behind the same markup, is a
  legitimate answer** — not a consolation prize, a genuinely complete one. It does not restore
  spatial reasoning (nothing can, from inside a linear medium), but it restores what a map actually
  *claims*: thirteen facts, each attached to a name. A reader who cannot see the pattern can still
  read every fact the pattern is made of, in a stable order, with the same exactness a sighted
  reader gets from a hover.

This beat ships the second answer, as `RegionTable` in `assets/MapWebSeed.tsx`: the same thirteen
`(name, value)` pairs the map draws, rendered ONCE (not per responsive layout — the same facts do
not need saying twice, and there is no longer a second layout to duplicate it for regardless — see
"Full width, genuinely" above) as a real HTML `<table>`, captioned, with `<th scope="row">`/`<th
scope="col">` so a screen reader's own table navigation (row-by-row, column-by-column) actually
works on it, largest value first so "the first row" means something instead of being an accident of
data order. It is `readingOrder`, the exported function every consumer of the geometry uses, so the
table's order and a sighted keyboard user's Left/Right/Home/End order are the same order — nobody
gets a *different* map depending on how they read it, only a different medium for the same one.

Three choices this table deliberately makes, each closing a way the same idea goes wrong in
practice:

- **Always rendered, never behind a toggle or `sr-only` CSS.** A disclosure widget ("show data
  table") adds an extra interaction step for the one reader who most needs the fallback not to be
  optional, and screen-reader-only CSS has a well-known failure mode: a positioning bug, a CSS reset
  that strips it, an author who "cleans up" a rule they do not recognise the purpose of, and the
  content silently stops reaching anyone. Visible-to-everyone is what makes it un-losable.
- **A `<table>`, not an SVG text grid.** `role="table"`/`role="row"`/`role="cell"` on SVG nodes is
  unreliable across screen readers in exactly the way a real `<table>`, `<tr>`, `<th>`, `<td>` is
  not — this genre's own SVG carries no text at ALL now (see "Text is HTML, not SVG"), so this
  choice is not even a temptation any more; the table is HTML because the labels are HTML because
  everything that reads as language in this genre is HTML.
- **One value, one formatting, in one place.** `pointDetail` in `MapWebSeed.tsx` is the only
  function that turns a `{ name, value }` into the string a reader sees, called by the hit target's
  `aria-label`/`data-detail`/`title` AND by nothing else — the table calls `fr(point.value)`
  directly rather than re-deriving a second phrasing, so a hovering reader and a table-reading
  reader are never told two different numbers for the same city because someone edited one
  formatter and not the other.

## Two channels, not one

The map and the table are not a primary feature and its fallback — they are two channels carrying
the same thirteen facts, and a reader picks whichever one their situation makes usable. This is why
the map's own per-point `<button class="pt">` is STILL individually keyboard-reachable with its own
`aria-label`, exactly the way `twin-chart-web`'s points are: a sighted keyboard user who does not use
a screen reader still benefits from being able to tab the map itself and hear/read the value at
their own pace, without needing a mouse's fine motor precision to land on a small circle. Dropping
the table because the buttons are "already accessible" would be wrong (spatial access is not linear
access), and dropping the per-point `aria-label`s because the table exists would ALSO be wrong (a
keyboard user reading the map spatially, point by point, is a real and different reading strategy
from reading the table top to bottom). Ship both; neither substitutes for the other. **The filter
narrows both channels together, never one alone** — see "Filters" below.

## Touch and hover share one target

A decorative circle sized by its own value can be a few pixels across at the small end of the scale
(Dublin, here, well under half the linear radius of Paris) — too small to be a fair touch or mouse
target on its own, and now that the map is fluid across a much wider range of container widths
(375–1600px, not the old two fixed layouts) an SVG-scaled hit circle would ALSO shrink to a few
PHYSICAL pixels at the narrow end regardless of how generous its own frame-unit radius was tuned to
be (`HIT_TARGET_PX` in `MapWebSeed.tsx`'s own header note has the arithmetic). This is why the hit
target is now a real HTML `<button>`, `28px` fixed CSS diameter, laid over the SVG by percentage
position but NOT by percentage size — a legitimate touch/pointer target at every width this genre
ships, decoupled entirely from how big or small the decorative mark it sits on happens to be drawn.

## Progressive enhancement: a native tooltip before the script runs

Every `.pt` button carries a native HTML `title` attribute holding the exact same string its
`aria-label`/`data-detail` carry. `title` is a native browser affordance — most browsers show it as
a plain tooltip on hover, with zero script, the HTML equivalent of the nested SVG `<title>` this
genre used before its furniture moved out of the SVG. This means the ONE thing this genre's inline
script (`interaction.mjs`) actually adds on top of a no-JS page is positioning (a fixed,
always-visible tooltip near the pointer instead of the browser's own delayed native one) and
keyboard cycling (Arrow/Home/End between points) — not the base capability of "hover a point, learn
its value," which the markup alone already provides, and not the map, the legend or the table
themselves, all three of which are plain SSR'd HTML/SVG with no script-dependent step in producing
them.

## Filters

**A map beat may let a reader narrow what is shown** — this seed's own filter (`.mw-filter`, a
`<fieldset>` of radios) narrows by region group. The one non-negotiable rule governing it is the
same one that governs every other control this genre ships: **nothing argument-bearing may sit
behind a filter.** The default, unfiltered view — "All regions" checked, exactly the state this
beat renders with no interaction at all — must already show the whole claim the title makes; a
filter lets a reader explore PAST the claim, never INTO it. Concretely: the "All regions" radio
carries `defaultChecked` (SSR'd into the markup, not set by script), so a reader who never touches
the filter, and a no-JS reader who COULD NOT touch it meaningfully even if they tried, both see
every point, every label and every table row.

**The test for whether a beat needs a filter at all — most do not.** Add one only when the study
set has a natural, orthogonal subsetting dimension a reader would plausibly want to isolate — enough
distinct groups, and enough points per group, that narrowing to one is a genuinely different,
useful reading, not merely a smaller version of the same one. Do NOT add a filter to declutter a
busy map, to hide outliers, or to work around a legend/table that "has too many rows" — every one of
those is moving argument-bearing content behind an interaction under a different name, which this
genre forbids regardless of the motive. This seed's own thirteen points across three regions is
close to the honest floor for the test to pass at all (`MapWebSeed.tsx` skips rendering the
`<fieldset>` entirely when there is only one group, `groupsOf(points).length <= 1`) — it is included
here to prove the mechanism works end to end, not as evidence that every beat needs one.

**Mechanism: pure CSS, `:has()`, no JavaScript.** Each group gets one rule in `render-web.mjs`'s own
`buildCss` — `.map-web-page:has(#mw-filter-<slug>:checked) .pt:not([data-group="<slug>"])`, and the
matching rule for `.point-label` and for `.region-table tbody tr` — hiding everything NOT tagged
with the checked group. This means the filter (like the zoom toggle below it) works identically with
the page's own inline `<script>` running or absent: the ONLY modern-CSS assumption this genre now
makes is `:has()` (Chrome 105+/Safari 15.4+/Firefox 121+, long-shipped in every evergreen browser
this self-contained HTML targets) — accepted rather than hand-rolling a JS-only fallback for a
capability that, on anything older, degrades to exactly the guarantee this genre already makes for
JavaScript being off: the controls go inert, the default (unfiltered) view still renders complete.
Native `<fieldset>`/radio semantics mean the filter's own keyboard reachability needs no extra work
— Tab and Arrow keys already reach every option.

**The table is filtered too, on purpose.** `RegionTable`'s rows carry the SAME `data-group` the
map's points do, and the SAME CSS rule reaches both. This is not a second, weaker guarantee than
"the table always renders complete" — with the default "All regions" radio checked, every row IS
present, exactly as this genre has always required. A reader who narrows the filter gets the SAME
narrower reading on both channels, never a map that says one thing and a table that still says
another — "Two channels, not one" applied to filtering as much as to hover.

## Pan and zoom

**A map beat may, when the story needs it, offer bounded pan-and-zoom.** This collides directly with
this genre's own baked-plate approach, which is what makes the shipped HTML self-contained and free
of any external request. Two ways to reconcile them were on the table:

- reach for LIVE map tiles once a reader zooms past the baked plate's own resolution — rejected: it
  breaks self-containment (a request to a tile server at read time) and would ship a MapTiler key
  inside the delivered file, a real credential leak this project's own local-first, self-contained
  design exists to avoid;
- **a bounded pan-and-zoom over the SAME generously-baked plate this genre already ships, capped at
  a fixed multiplier a reader cannot exceed.**

**This genre takes the second — the honest answer, and the only one that keeps the file
self-contained.** `MapWebSeed`'s own `zoomable` prop (off by default) renders one checkbox
(`#mw-zoom-toggle`); unchecked, `.mw-viewport` clips its content and the `.mw-zoomable` inner layer
sits at exactly `100%`/`100%` — the SAME full-claim view every non-zoomable beat in this genre
renders. Checked, `.map-web-page:has(#mw-zoom-toggle:checked)` (the SAME `:has()` mechanism the
filter uses, no JavaScript) switches `.mw-viewport` to `overflow: auto` and grows `.mw-zoomable` to
a FIXED `ZOOM_SCALE` (`1.4`, `MapWebSeed.tsx`) — a reader cannot zoom further than that one step, so
the plate never degrades into unreadable blur past a bound the code itself enforces, not one a
reader could scroll or pinch their way out of. Panning inside that enlarged content is native
browser scroll — no script required for it either, and a focused, scrollable `.mw-viewport`
(`tabIndex={0}` only when `zoomable` is true) is already reachable with the arrow keys in every
evergreen browser without this genre writing a single line of pan-handling JavaScript.

**The rules that already govern interaction here apply, and matter more with a zoom control than
without:**

- **Nothing argument-bearing lives only behind zoom.** The unzoomed state is not a "preview" of the
  real view — it IS the full claim, at the same completeness every non-zoomable beat in this genre
  ships. A reader who never touches the toggle must still get the point.
- **Keyboard reaches the control** (the checkbox is a native, focusable form element) **and the
  accessible table is untouched by zoom** — `RegionTable` does not read `zoomable` at all, so panning
  (useless to a screen-reader user regardless of how it is implemented) never regresses the one
  channel that actually serves that reader.
- **With JavaScript disabled, the default (unzoomed) view still renders complete** — trivially true
  here, since the entire mechanism, default state included, is CSS and native scroll, not script.

**The test for whether a beat needs this at all — most do not, exactly as with filters.** Add
pan-and-zoom only when the points are dense enough that the OVERVIEW scale makes them illegible or
individually unreachable at the SMALLEST width this genre ships (375px) — an urban cluster, a metro
transit map, several markers close enough to overlap at map scale — or when the story deliberately
moves a reader's attention between distinct places at different scales. **This seed's own thirteen
points are spread across a continent and stay legible and individually reachable at every tested
width without zooming** (see the four screenshots in this skill's own verification proof) — so
`zoomable` stays `false` for this seed's own data (`render-web.mjs`'s `SEED.zoomable`), matching the
same "most beats do not need this" rule filters are held to. The mechanism itself is real and
exercised directly by `test/render-web.test.ts` (a fixture with `zoomable: true`) so a future beat
that DOES need it is not starting from nothing.

## What must not become interactive

The title, the source, the legend caption, the legend's own reference marks and their labels, the
subject's own note, and the caveat are all drawn unconditionally, exactly once, regardless of hover,
focus, filter or zoom state — none of it is assembled or revealed by `interaction.mjs`, and none of
it is hidden by any `:has()` rule this genre writes. The interaction layer's only job is the
PER-POINT exact figure the legend's own reference sizes can only approximate; the filter's only job
is narrowing which points are shown, never revealing new furniture; the zoom's only job is
letting a reader look closer at a claim already fully stated at the unzoomed size. Nothing a reader
needs to receive the beat's own argument lives only behind any of the three.

## Verification

The gotcha this skill's own `SKILL.md` names applies here in full: a static render can be checked
with a PNG; the thing unique to THIS genre — does the beat genuinely fill its container at every
width without distorting the plate, does the type stay one size while the geometry scales, does
hovering point X show point X's own value, does Tab reach every point AND every control (filter
radios, the zoom checkbox when present), does the accessible table read correctly and stay in step
with a narrowed filter, does the map/legend/table survive script-off — is a *behaviour*, provable
only by driving a real browser and using it, or by SCREENSHOTTING it at the actual widths a reader
will see it at. A computed style value that disagrees with a screenshot means the value is measuring
the wrong box, not that the screenshot is wrong — trust the picture.

A unit test (`test/render-web.test.ts`) covers what it honestly can: the SSR'd markup's structure
(one `<svg>`, no `<text>` inside it, one HTML button/label per point, the exact formatted value
baked into every `data-detail`, the filter fieldset present/absent matching the group count, the
zoom checkbox present/absent matching the `zoomable` prop, the palette). It stops there on purpose.
