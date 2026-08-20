# Map-web discipline

The rules this format is written under. `doctrine`'s cross-cutting references
(`editorial-standard.md`, `information-architecture.md`, `visual-system.md`) apply unchanged, and
`geo-discipline.md` — the map craft's own twelve rules — applies unchanged too: this format draws
from the same baked plate a static or video map beat draws from, so the bake rules (1, 2, 4, 6, 7,
9, 12) all still bind. What this file adds is only what is true of a map that a reader can
**interrogate**, **narrow**, and now **fill the width of its own container with**, and nothing this
format's first beat did not actually meet.

## Full width, genuinely

The defect this section closes: the first version of this format baked TWO fixed-pixel layouts
(860px, 360px) and swapped between them with a CSS media query. That is not responsive — it is two
static posters with a light switch between them, and at any width other than 860 or 360 the beat
either sat in a gutter or (worse) never filled the space it was given at all.

**The mechanism now: one render, one fluid SVG plus an HTML overlay, no breakpoint.**
`MapWebSeed.tsx`'s own header note has the full reasoning; the shape of it —

- The SVG's `viewBox` is set to the baked plate's own frame (`geometry.frame`), and the SVG itself
  is drawn at `width: 100%` inside a wrapper (`.mw-viewport`) whose CSS `aspect-ratio` is locked to
  that SAME frame. **The map's shape is held constant and its size is not** — the aspect ratio, not
  a fixed height, is what never changes. (Width alone used to decide the size; since "Fit the
  window" below, the smaller of the room's width and its remaining height does.) This is the fix for the specific failure
  the beat's own owner named while this was mid-build: setting `width: 100%` on an element that
  still has a FIXED height turns a wide container into a letterbox strip, stretching the plate's own
  pixels horizontally without ever growing them vertically to match — a real distortion of the
  basemap, the exact thing this project's whole geo discipline exists to prevent. `aspect-ratio`
  (not a max-width, not a fixed height) is the one CSS property doing that job.
- **No max-width anywhere in this format's own CSS** (the only bound on the map is the window's own
  remaining height — "Fit the window" below — which is a bound on the SCREEN, not a fixed number of
  pixels chosen at authoring time). An earlier draft of this rewrite bounded the
  map's own display size with a `max-width`, reasoning that a raster plate should not be asked to
  cover more screen than it was baked for. That is real (see "The plate strategy" below), but a
  `max-width` is the WRONG place to put that reasoning: it leaves an empty gutter beside the map on
  a wide container, which is precisely the complaint this whole rework exists to fix (the beat is
  "size-limited", not filling). The right place for the resolution trade-off is the BAKE's own size,
  not a display-time cap — see below.
- Point-name labels and the per-point hit target are HTML, absolutely positioned over the SVG by
  **percentage** of the frame — not fixed pixels — so they track the geometry continuously as the
  container resizes, at every width, not just the two this format used to ship. Their FONT SIZE stays
  a fixed CSS number regardless: see "Text is HTML, not SVG" below for why that is the one thing
  that must NOT scale with the container.

**One thing on this page is now bounded, and it is the height** — see "Fit the window" immediately
below, written after the owner looked at a real render and found the beat taller than the screen it
was on. The width still fills; what changed is that filling the width no longer buys an unbounded
height with it.

## Fit the window

**A beat that does not fit the window is not finished.** Measured on the shipped render before this
rule existed: at 1600×900 the page was **2275px tall** — the map alone was 1568px, because its
height was locked to the plate's aspect and its width filled the container. The claim the title
makes ("Paris draws the largest circle") sat **800px below the fold**, and a reader arriving at the
beat saw the Baltic and no Paris at all. That is the defect this section closes.

**The rule: the visual — title, source, controls, map, legend, subject note, caveat — occupies at
most one window, and nothing scrolls inside it.** The optional region table (see "The accessibility
question") sits below the beat and is normal document reading, not scrolling *inside* the visual.

**The mechanism** (`render-web.mjs`'s `buildCss`, and `.mw-stage` in `MapWebSeed.tsx`):

- `.map-web` is a flex column with a **definite** height of `calc(100svh - page padding)`. `svh`,
  not `vh`: on a phone with a retracting toolbar `vh` is the LARGE viewport, which is exactly the
  height the beat must not assume it has. A `vh` line precedes it as the fallback for a browser
  without `svh`, erring one toolbar too tall rather than clipping.
- Every piece of furniture takes the height it needs (`flex: 0 0 auto`); `.mw-stage` is handed
  whatever is left, with a `min-height` floor of `180px`. Below that floor — a very short window —
  the page scrolls again, deliberately: a 40px-tall map would be worse than a scrollbar.
- `.mw-stage` carries `container-type: size`, and the map box inside it is
  `width: min(100cqw, 100cqh × aspect)` with the bake's own `aspect-ratio`. That is the whole fit:
  **as wide as the room allows, never taller than the room left, and always the plate's own shape.**
  CSS has no other way to state "bounded by both axes at once" for a non-replaced box — `max-height`
  on an `aspect-ratio` box clamps the height WITHOUT re-deriving the width, which distorts.
- A plain `width: 100%` precedes the `min()` as the fallback for a browser with no container query
  units: it fills the width, exactly as this format did before, rather than collapsing.

**One measured trap, or this costs an evening.** The stage's height must be **definite** for `cqh`
to resolve. With `min-height` on `.map-web` instead of `height`, every `cqh` inside the stage
resolved to **zero** and the map collapsed to its 2px border — while `cqw` resolved correctly, and
nothing anywhere was red. If a map ever renders as a hairline, this is why.

**What the fit costs, and why it is the right trade.** This seed's plate is square (the study set's
own Mercator extent is near-square — a landscape bake would only add ocean). In a wide, short
window the height binds first, so the map is drawn smaller than the full width and the leftover room
becomes margin. **The map is flush LEFT, not centred**, so its edge lines up with the title, the
filter chips and the legend rather than floating away from them. The alternative — stretching the
plate to fill the width — is not on the table at all: a non-uniform scale is a lie about distance
and shape (`geo-discipline.md`), and this format would rather draw a smaller true map than a larger
false one.

**Point labels are allowed to spill past the frame.** `.mw-viewport` is `overflow: visible` when not
zoomed. The plate and its circles are already clipped by the SVG's own `clipPath`, so the only thing
that overflow would ever clip is a point NAME — which is data. A label's width is a fixed number of
CSS pixels while its position is a percentage of a shrinking frame, so at the narrow end the two
stop fitting no matter how the flip margin is tuned: measured at 375px, "Stockholm" and "Warsaw"
each lost 3-4px off their last letter. Spilling into the page's own gutter keeps the word whole.
Zoomed, the box must clip, and the zoom rule sets `overflow: auto`.

## The plate strategy

**Read this section knowing what the plate now IS.** Ruling R1 (2026-08-10) made the ground a live
MapTiler map; the baked plate became **layer 1, the fallback** — what a reader gets with JavaScript
off, offline, on a CMS whose Content-Security-Policy refuses `api.maptiler.com`, and on the day the
account's keys are invalidated. Everything below is still true of that layer and is why it is still
baked generously rather than cheaply; none of it decides the resolution a reader normally sees any
more, because normally the canvas is vector tiles at the device's own pixel ratio. `PLATE_SIZE` is
now a payload argument first and a sharpness argument second: it is inlined as a `data:` URI in
every delivered file, beside 803 KB of maplibre-gl.

**And this is where B5.1 stops being one question.** The owner's rule — *the map takes the full
available width and no more than the available height* — is now TRUE of the live layer and
STRUCTURALLY FALSE of the fallback, and that is a trade rather than an oversight. Measured on
`proof/mapgen-symbol-web/quake-symbol.html` at 1600×900: live, the canvas is 1568×593, **98 % of the
window's width**; unkeyed, the same page draws its square plate at 593×593, **37 %**. A square raster
cannot fill a 2.64:1 box without a non-uniform scale, and a non-uniform scale is a lie about distance
and shape — so the outcomes available for the fallback are "smaller and correct" or "full width and
false", and this format takes the first. The live layer has no plate aspect to preserve (the canvas IS
the container), which is why `html.mw-live .mw-viewport` sets `aspect-ratio: auto !important` and the
map takes the whole stage. What is common to both layers, and what B5.1 actually asked for, is that
**the beat is never taller than the window**: measured at 1600/1024/768/375, the symbol beat's own
column ends at 884/752/1008/796 px against windows of 900/768/1024/812.

**The ground is a baked raster plate, not vector geometry.** Stretching it to an arbitrary width
either distorts the geography (a non-uniform scale — ruled out entirely, see above: `aspect-ratio`
guarantees the scale this format ever applies is uniform) or, if the display width exceeds the plate's
own native resolution, softens it — the picture itself has fewer real pixels than the screen is
asking it to cover. Two strategies were on the table:

- bake at a generous width and let the plate scale UNIFORMLY (never distorted) up or down within
  that resolution, accepting mild softening past it;
- bake at a few discrete sizes and pick the nearest one at or above the container's actual width.

**This format takes the first.** The self-contained HTML this format ships embeds every asset as a
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
860px-wide fixed layout and would have visibly softened at any width this format now actually ships.

**Where the bound genuinely lives, if one is needed at all: the bake's own resolution, not the
display width.** If a future beat needs to look crisp at containers meaningfully wider than 1600px,
the fix is raising `PLATE_SIZE`, not adding a CSS `max-width` back — the display-time cap is exactly
the mistake this section's own first paragraph describes. **Since R1, the honest reason to raise it
is narrower than it was**: the reader who sees the plate at 1600px is the reader whose live layer did
not boot, and for them a slightly soft basemap is the smallest of the day's problems. The reason to
LOWER it is now real and was not before — every kilobyte of plate ships in a file that already
carries the library.

## Text is HTML, not SVG

**In a fluid SVG, text scales with the geometry.** A legend readable at 900px becomes oversized at
1600px, and illegibly small at 375px — an SVG `<text>` element sized in the SAME `viewBox` units the
plate and the marks are drawn in has no way to opt out of the transform the browser applies to the
whole document to make it fill the container. This format's OLD two-layout version dodged the problem
by never actually being fluid (two fixed layouts, two fixed sets of hand-tuned font sizes) — the
problem re-appeared the moment the SVG itself was made to scale continuously.

**The fix: the SVG carries ONLY geometry — the baked plate `<image>` and the decorative,
value-sized `<circle>`s. Every piece of furniture (title, source, legend, point-name labels, the
subject note, the caveat) and every interactive control (the hit target, the filter, the zoom
toggle) is plain HTML**, layered over the SVG, positioned by percentage where it needs to track the
geometry (point labels, hit targets) but always sized with a fixed CSS `font-size` — a number that
never changes because the CSS mechanism that scales the SVG (`width: 100%` inside an
`aspect-ratio`-locked box) has no purchase on an HTML sibling laid out with normal document flow and
`position: absolute` percentages. This is the SAME split `chart-web/references/web-discipline.md`
describes for the chart format, applied to a format where the "geometry" is a raster plate instead of
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
web format can lean on a linear reading order — a series of points along an x-axis has a natural
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

This format SHIPS the second answer, as `RegionTable` in `assets/MapWebSeed.tsx`: the same thirteen
`(name, value)` pairs the map draws, rendered as a real HTML `<table>`, captioned, with `<th
scope="row">`/`<th scope="col">` so a screen reader's own table navigation (row-by-row,
column-by-column) actually works on it, largest value first so "the first row" means something
instead of being an accident of data order. It is `readingOrder`, the exported function every
consumer of the geometry uses, so the table's order and a sighted keyboard user's
Left/Right/Home/End order are the same order — nobody gets a *different* map depending on how they
read it, only a different medium for the same one.

### The table is ON BY DEFAULT, and this is what opting out costs

**Reopened 2026-08-20: the catalogue's own `same-facts-without-the-picture` entry says this format
CARRIES the capability, and a default that ships it off unless a beat's author remembers to turn it
on is not carried — it is hoped for, which is exactly the failure this whole mechanism exists to
abolish.** `renderMapWeb`'s `regionTable` option now defaults to **true**, and this skill's own seed
carries it. A beat with a real reason to leave the table off writes one word to turn it off.

**State it plainly, because opting out is now a beat's own decision, not something a silent default
reaches for on its behalf.** A map is a spatial medium. A screen-reader user has no spatial access to
it. The table was the answer to that fact — the only one this format found that is honest — and **a
beat that opts out has no answer.** Concretely, that reader loses:

- **the complete set of readings.** With the table, they have all thirteen names and all thirteen
  values, in a stable order, exactly as exact as a sighted reader's hover. Without it, the values
  exist only on thirteen `.pt` buttons, reachable one Tab at a time in an order they cannot see and
  have no map of — the values survive, the ACCOUNT of them does not.
- **the comparison the beat is about.** "Paris is the largest" is a claim about thirteen numbers
  side by side. A table makes it checkable in one pass. Thirteen separate focus stops do not: by the
  eighth the reader is remembering, not reading.
- **any reading at all without a keyboard trap of patience.** The table is one element a screen
  reader announces as a table, with row and column navigation built in. The button sweep is thirteen
  interactions to obtain what the table gives in one.

The `.pt` buttons keep their own `aria-label`s either way, and the SVG keeps its `alt`. That is not
a substitute — see "Two channels, not one" below, which says exactly this in the other direction.
**Leave the table off when the beat genuinely does not need it; do not leave it off by not
deciding.**

Two choices the table still deliberately makes when a beat DOES turn it on, each closing a way the
same idea goes wrong in practice:

- **Collapsed by default, in a native disclosure — see "The table is collapsed" below, which
  OVERTURNS what stood here.** This bullet used to read *"Rendered plainly and visibly, never behind
  a toggle or `sr-only` CSS"*, on the reasoning that a disclosure widget adds an extra interaction
  step for the one reader who most needs the fallback not to be optional. That cost is real and is
  still the cost; the ruling below accepts it, and the mechanism it accepts is a NATIVE
  `<details>`/`<summary>`, which is not the same object the sentence above was warning about.
- **A `<table>`, not an SVG text grid.** `role="table"`/`role="row"`/`role="cell"` on SVG nodes is
  unreliable across screen readers in exactly the way a real `<table>`, `<tr>`, `<th>`, `<td>` is
  not — this format's own SVG carries no text at ALL now (see "Text is HTML, not SVG"), so this
  choice is not even a temptation any more; the table is HTML because the labels are HTML because
  everything that reads as language in this format is HTML.
- **One value, one formatting, in one place.** `pointDetail` in `MapWebSeed.tsx` is the only
  function that turns a `{ name, value }` into the string a reader sees, called by the hit target's
  `aria-label`/`data-detail`/`title` AND by nothing else — the table calls `fr(point.value)`
  directly rather than re-deriving a second phrasing, so a hovering reader and a table-reading
  reader are never told two different numbers for the same city because someone edited one
  formatter and not the other.

### The table is collapsed, and why it is not deleted — RULING B5.2, 2026-08-10

**The owner's words, verbatim:** *"Pour toutes les cartes on n'affiche pas le tableau de valeurs qui
se trouve en dessous, ou alors cache-les dans un accordéon, et pour tous."* The value table is
**collapsed by default on every map page, without exception**. He offered two ways — remove it, or
hide it in an accordion.

**This format takes the accordion, and the REASON is the load-bearing half of this section.** Read the
two sections above before touching it: the table is the map's own accessible alternative. A map is a
spatial medium; a screen-reader user has no spatial access to it; the ordered list of readings is the
only honest answer this format found, and "Two channels, not one" below says why the `.pt` buttons are
not a substitute for it. **Deleting the table would trade a page-height problem for an accessibility
regression.** Collapsing satisfies what was asked and keeps every reading one keystroke away. A later
reader who meets a collapsed table and "fixes" it back open is undoing a ruling; a later reader who
deletes it is undoing the accessibility answer.

**What it costs, stated rather than glossed.** The bullet above, now overturned, was right that a
disclosure adds an interaction step for the reader who most needs the fallback. That step is the
price of the ruling. What makes it payable is that a native `<details>` is *announced as a
disclosure* and opens from the keyboard — it is a step, not a barrier — where `display: none`,
`hidden` or `sr-only` CSS would be the silent-loss failure mode the old bullet warned about, and a
hand-built widget would be an invented control with none of that for free.

**The mechanism: `<details>`/`<summary>`, native, no JavaScript.** `discloseTable` in each beat's own
`render-web.mjs` wraps the SSR'd table; the summary reads `Table of values — <n> <noun>`, where the
count is read off the rendered table's own `<tbody>` (never passed in beside it, so the label cannot
disagree with the rows) and the noun is the beat's word — `discloseTable` throws rather than invent
one. Four properties this buys and a scripted accordion does not: it opens with the page's script
disabled; it is keyboard-operable and focus-visible with nothing authored; a screen reader announces
it as a disclosure and can open it; and the native marker already says open/closed, so no control had
to be drawn.

**What it did to the page, measured in a real browser on the delivered files** — the page below the
beat WAS the table, so this is the whole of the change:

| Beat | Rows | Page @1600×900 | Page @375×812 |
|---|---|---|---|
| `mapgen-symbol-web` | 17 earthquakes | 1417 → **944** px | 1936 → **856** px |
| `mapgen-choropleth-web` | 41 countries | 2085 → **944** px | 2044 → **856** px |
| `mapgen-dot-web` | 42 countries | 2092 → **944** px | 2051 → **856** px |
| `mapgen-hexgrid-web` | 156 cells | 5186 → **944** px | 12855 → **856** px |
| `mapgen-locator-web` | 11 organisations | 900 → **900** px | 812 → **812** px |
| `map-web` seed | none (`regionTable: false`) | 900 px, unchanged | 812 px, unchanged |

**And the composition consequence, because it is real and a reader meets it before anyone reads this
file.** Every one of these beats is already sized to fit one window ("Fit the window" above), so a
collapsed page is the beat plus one 34 px summary line — and below that, nothing. At 1600×900 that
lands at **944 px against a 900 px window**: the summary sits 44 px past the fold, so the page keeps
a scrollbar for a single line of text. At 375×812 it is **856 against 812**, the same 44 px. That is
the honest cost of the ruling on these four beats, and it is a smaller cost than four thousand pixels
of table.

`mapgen-locator-web` is the exception in both directions, and it is the one to copy: its table
already lived inside a bounded, internally-scrolling reading pane, so its page height does not change
at all — **its map takes the height that frees instead**. Measured at 1600×900, its live canvas goes
from 1566 × 428 to **1566 × 655**, and at 375×812 from 341 × 305 to **341 × 346**. A beat that wants
the freed height to reach the map, rather than to become white space under it, gives its reading
pane a bound the way this one does.

## Two channels, not one

The map and the table are not a primary feature and its fallback — they are two channels carrying
the same thirteen facts, and a reader picks whichever one their situation makes usable. This is why
the map's own per-point `<button class="pt">` is STILL individually keyboard-reachable with its own
`aria-label`, exactly the way `chart-web`'s points are: a sighted keyboard user who does not use
a screen reader still benefits from being able to tab the map itself and hear/read the value at
their own pace, without needing a mouse's fine motor precision to land on a small circle. Dropping
the table because the buttons are "already accessible" would be wrong (spatial access is not linear
access), and dropping the per-point `aria-label`s because the table exists would ALSO be wrong (a
keyboard user reading the map spatially, point by point, is a real and different reading strategy
from reading the table top to bottom). Neither substitutes for the other — which is the reason the
opt-out above is a real cost and not a tidy-up: **a beat that ships the table has two channels; a
beat that turns it off has one, and it is the spatial one.** **The filter narrows both channels
together, never one alone** — see "Filters" below.

## Touch and hover share one target

A decorative circle sized by its own value can be a few pixels across at the small end of the scale
(Dublin, here, well under half the linear radius of Paris) — too small to be a fair touch or mouse
target on its own, and now that the map is fluid across a much wider range of container widths
(375–1600px, not the old two fixed layouts) an SVG-scaled hit circle would ALSO shrink to a few
PHYSICAL pixels at the narrow end regardless of how generous its own frame-unit radius was tuned to
be (`HIT_TARGET_PX` in `MapWebSeed.tsx`'s own header note has the arithmetic). This is why the hit
target is now a real HTML `<button>`, `28px` fixed CSS diameter, laid over the SVG by percentage
position but NOT by percentage size — a legitimate touch/pointer target at every width this format
ships, decoupled entirely from how big or small the decorative mark it sits on happens to be drawn.

## Progressive enhancement: a native tooltip before the script runs

Every `.pt` button carries a native HTML `title` attribute holding the exact same string its
`aria-label`/`data-detail` carry. `title` is a native browser affordance — most browsers show it as
a plain tooltip on hover, with zero script, the HTML equivalent of the nested SVG `<title>` this
format used before its furniture moved out of the SVG. This means the ONE thing this format's inline
script (`interaction.mjs`) actually adds on top of a no-JS page is positioning (a fixed,
always-visible tooltip near the pointer instead of the browser's own delayed native one) and
keyboard cycling (Arrow/Home/End between points) — not the base capability of "hover a point, learn
its value," which the markup alone already provides, and not the map, the legend or the table
themselves, all three of which are plain SSR'd HTML/SVG with no script-dependent step in producing
them.

## Filters

**A map beat may let a reader narrow what is shown** — this seed's own filter (`.mw-filter`, a
`<fieldset>` of radios) narrows by region group. The one non-negotiable rule governing it is the
same one that governs every other control this format ships: **nothing argument-bearing may sit
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
format forbids regardless of the motive. This seed's own thirteen points across three regions is
close to the honest floor for the test to pass at all (`MapWebSeed.tsx` skips rendering the
`<fieldset>` entirely when there is only one group, `groupsOf(points).length <= 1`) — it is included
here to prove the mechanism works end to end, not as evidence that every beat needs one.

**The control is drawn, not defaulted.** Bare browser radios read as an unfinished form rather than
as an editorial control, and their label row measured **15px tall** — a poor pointer target beside
everything else on the page. The filter is now a row of chips (`.mw-chip`): 32px tall, rounded,
outlined when unselected, filled with the ink colour when selected. **Every input is still a real
radio inside a real `<fieldset>`** — moved out of sight by CSS (a 1px transparent box), never
replaced by a `<div>` wearing `role="radio"`. That distinction is the whole treatment: Tab still
reaches the group, Arrow keys still move within it, the native `<label>` association still makes the
whole chip clickable, the focus ring is drawn on the chip via `:has(input:focus-visible)`, and none
of it needs a line of JavaScript. Under `forced-colors: active` the CSS puts the native radio BACK,
because "the filled chip is the checked one" stops being visible once the system paints its own
colours — a substitute indicator would be an invention; the control the reader already knows is not.

**Mechanism: pure CSS, `:has()`, no JavaScript.** Each group gets one rule in `render-web.mjs`'s own
`buildCss` — `.map-web-page:has(#mw-filter-<slug>:checked) .pt:not([data-group="<slug>"])`, and the
matching rule for `.point-label`, for the decorative `<circle>` and for `.region-table tbody tr` —
hiding everything NOT tagged with the checked group.

**One vocabulary, because two of them shipped a broken filter.** Every mark, label, button and table
row carries its group as the SLUG (`slugOf`), the same string the radio's own `id` is built from,
and the slug is what the selector quotes. It used to carry the RAW group name, HTML-escaped into the
selector — so this seed's own `Central & Northern Europe` became
`[data-group="Central &amp; Northern Europe"]`, and inside a CSS string `&amp;` is five literal
characters matching no element, so `:not(...)` matched EVERY element: **one of this beat's three
filters hid all thirteen points, all thirteen circles and every table row, and left the reader an
empty map.** Nothing was red; the markup and the CSS each looked correct read on their own. It was
found by clicking the chip in a real browser and counting what remained. `slugOf` output is
`[a-z0-9-]+` by construction, so no escaping question survives, and `assertDistinctSlugs` refuses
the two collisions one vocabulary makes possible (two groups slugging alike, or a group slugging to
`all`, the reserved id of the unfiltered option).

This means the filter (like the zoom toggle below it) works identically with
the page's own inline `<script>` running or absent: the ONLY modern-CSS assumption this format now
makes is `:has()` (Chrome 105+/Safari 15.4+/Firefox 121+, long-shipped in every evergreen browser
this self-contained HTML targets) — accepted rather than hand-rolling a JS-only fallback for a
capability that, on anything older, degrades to exactly the guarantee this format already makes for
JavaScript being off: the controls go inert, the default (unfiltered) view still renders complete.
Native `<fieldset>`/radio semantics mean the filter's own keyboard reachability needs no extra work
— Tab and Arrow keys already reach every option.

**The table is filtered too, on purpose.** `RegionTable`'s rows carry the SAME `data-group` the
map's points do, and the SAME CSS rule reaches both. This is not a second, weaker guarantee than
"the table always renders complete" — with the default "All regions" radio checked, every row IS
present, exactly as this format has always required. A reader who narrows the filter gets the SAME
narrower reading on both channels, never a map that says one thing and a table that still says
another — "Two channels, not one" applied to filtering as much as to hover.

## Pan and zoom — OVERTURNED 2026-08-10 by ruling R1

**The map is a LIVE MapTiler map with its native zoom and pan, constrained to the subject's area.**
The plate is still baked and still shipped — as the FALLBACK layer, not as the display surface.

### The position that was overturned, kept verbatim

This section used to read as follows, and it is left standing rather than tidied away, because a
future reader should meet a decision with its cost attached rather than a page that never argued the
other way:

> **A map beat may, when the story needs it, offer bounded pan-and-zoom.** This collides directly
> with this format's own baked-plate approach, which is what makes the shipped HTML self-contained and
> free of any external request. Two ways to reconcile them were on the table:
>
> - reach for LIVE map tiles once a reader zooms past the baked plate's own resolution — rejected: it
>   breaks self-containment (a request to a tile server at read time) and would ship a MapTiler key
>   inside the delivered file, a real credential leak this project's own local-first, self-contained
>   design exists to avoid;
> - **a bounded pan-and-zoom over the SAME generously-baked plate this format already ships, capped at
>   a fixed multiplier a reader cannot exceed.**
>
> **This format takes the second — the honest answer, and the only one that keeps the file
> self-contained.** … `.map-web-page:has(#mw-zoom-toggle:checked)` … grows `.mw-zoomable` to a FIXED
> `ZOOM_SCALE` (`1.4`) — a reader cannot zoom further than that one step, so the plate never degrades
> into unreadable blur.

### The ruling

The owner was shown the cost explicitly — the key becomes visible to anyone who opens the article, on
an account billed by usage, and the file stops working without network or an active account — and
ruled, verbatim: *"la carte doit rester interactive tout le temps sinon il n'y a pas d'intérêt d'être
sur le web si on peut pas naviguer dedans. On a le droit d'utiliser pleinement MapTiler. Et garder
l'export du HTML pas grave pour la clé."*

The reasoning is editorial and it is right: **a web map you cannot move through is a picture.** If a
beat pays the cost of being web, it should give what web gives. The bounded `ZOOM_SCALE` step was
also, in the owner's own words, an out-of-map button that should not exist (B6.14b).

### How it is built, and what it does not cost

Two layers in one file (`assets/live-map.mjs`):

1. `#mw-fallback` — the SSR'd beat exactly as this format rendered it before: the baked plate as a
   `data:` URI, the circles, the legend. Complete, script-free, request-free.
2. `#mw-map` — an empty box filled with a live MapLibre map and swapped in **only** on
   `map.on("load")`. A style failure, a tile failure, a rotated key, no network or no JavaScript
   leaves layer 1 exactly where it is.

A third layer, `.mw-overlay`, carries the point labels and the per-point hit targets and is a
SIBLING of both, never a child of either. Its first draft lived inside the fallback, and hiding the
fallback took every label and every Tab stop with it — a total loss of keyboard reach on the exact
path the ruling was meant to improve, visible only by looking at the live page.

**The format's stated rule survives verbatim, read against the fallback**: the unzoomed state is not a
preview of the real view — it IS the full claim.

**What the live map fixes by construction rather than by tuning.** The hit area is the RENDERED
MARK, via `queryRenderedFeatures`, at every size and every zoom — so there is no fixed 28px button
under a 90px disc (B6.18a) and no country whose hover only fires over its capital (B6.14a). The
`.pt` buttons stay for keyboard reach and their `aria-label`; only their pointer-events go.

**Where the leash comes from.** Every number is read off the bake's own `geometry.json`, which has
recorded the camera's own facts since 2026-08-10: `minZoom` is the bake's zoom, so a reader can never
pull back past the frame the title makes its claim about; `maxBounds` is `frameCorners`, the extent
the camera actually showed; `maxZoom` is derived per type in the geometry core
(`maxZoomForStudySet`), never picked.

### Two numbers describing one circle, and the box that is not the container's

Found by the owner looking at the live map, then measured. **The mark radius and the camera were on
two different scales.** The marks carry their radius in the bake's own frame units and the first
live draft turned those into CSS pixels with `Math.min(w / frameW, h / frameH)` — correct for a
raster plate, which must not be distorted and so fits by its tighter axis. A live map is not a
plate: it has no aspect to preserve, and its camera is fitted to the study set at runtime. At
1600 x 900 the canvas is 1566 x 583, so that rule gave 0.583 and drew Paris at 36px on cartography
that had grown by more than half again — a small dark circle in the middle of the country it was
supposed to cover, and a hover that only fired on the small one.

**The rule, per mark type, because they are not the same:**

| Type | At the fit | As the reader zooms | Why |
|---|---|---|---|
| Proportional symbol | ground-derived: `bake °/px ÷ live °/px` | **constant screen pixels** | a circle encodes a VALUE; growing it with zoom would make one number mean two things |
| Choropleth | nothing to scale | — | the fill is the geometry and reprojects itself; only strokes and labels are screen-sized |
| Dot density | ground-derived | **constant GROUND area**, so the radius interpolates exponentially with zoom (base 2) | a dot stands for people in a place; a field that thins out as you zoom reports a change that did not happen. This is the OPPOSITE rule, and it is why dot density is not shipped live yet |
| Hex grid | nothing to scale | — | bins are emitted as geographic polygons and reproject correctly |

**The same box turned up again in the leash.** `maxBounds` does not only stop panning: MapLibre also
raises the minimum zoom so the viewport can never leave it. Set to the square plate's own
`frameCorners` (47.8° of longitude) it forced zoom 4.526 on a 1566px-wide canvas, and at that zoom
583px of height holds about 11° of latitude against the study set's 21 — **six of thirteen points
cropped out of a beat whose title claims all of them.** The pan bound is now taken from the view the
camera actually fitted to, after the fit, and released before any re-fit.

**Guarded by `scripts/verify-live-map.mjs`**, at two container aspects because the defect is
invisible when the container's aspect matches the plate's. It asserts three things that can come
apart: the drawn radius against one derived independently from `degreesPerPixel` and the live zoom;
every mark on screen; and how far a REAL pointer still reaches a mark, walked with `page.mouse.move`.

**Its own first version was vacuous and that is recorded rather than tidied away.** It compared the
drawn radius to where `queryRenderedFeatures` said the mark ended — the same number twice, because
MapLibre hit-tests the circle it painted — and it passed against a copy with the defect deliberately
put back.

### The class: one mark, two halves, two mechanisms

This has now happened three times, so it is written as a rule rather than as three incidents. **The
live swap split every mark in two** — a MapLibre layer for the circle, an HTML overlay for its label
and its hit target — and anything that governed the mark when both halves were SVG now has to govern
them BOTH, through two different mechanisms. Where it does not, nothing goes red and the map quietly
disagrees with itself.

| What governs a mark | The overlay half | The live half | Found by |
|---|---|---|---|
| size | CSS + the SVG viewBox | `circle-radius`, from the camera | the owner: a 36px circle on cartography 1.57× bigger |
| membership of a filter | CSS `:has()` + `:checked` | `map.setFilter` | the owner: 6 of 13 labels hidden, 13 of 13 circles painted |
| the PAINTED HIGHLIGHT's own size | two inline percentages on `.pt` | nothing at all, until B6.20 | the owner: *"le rond du hover est trop large, c'est chelou"* |

### The painted highlight is a circle in SCREEN pixels — B6.20, 2026-08-10

**What the owner saw:** hovering the M9.1 disc on `proof/mapgen-symbol-web` painted a wide flattened
grey ellipse far larger than the mark, extending well past it horizontally and barely past it
vertically.

**What it actually was, measured before anything was changed** — because the obvious diagnosis was
wrong, and this is worth recording. The natural reading is a radius expressed in DEGREES: a circle
defined in longitude/latitude renders as an ellipse, because at Japan's latitude a degree of
longitude is much shorter than a degree of latitude. That is a real class and it has appeared twice
elsewhere in this tree. **It is not what this was.** The `.pt` button's size was stated as TWO inline
percentages — `width: max(28px, w%)` and `height: max(28px, h%)`, both derived from the mark's own
diameter in frame units. A percentage width resolves against the container's WIDTH and a percentage
height against its HEIGHT, so the two are the same number only while the overlay keeps the plate's
own aspect. The fallback layer does keep it. **The live layer does not** — `html.mw-live
.mw-viewport` sets `aspect-ratio: auto`, so the overlay becomes the stage: 1566 × 591 at 1600×900, a
ratio of 2.65. Measured on the committed pages before the fix, at 1600×900:

| Beat | Container | Painted highlight | Ratio |
|---|---|---|---|
| `mapgen-symbol-web` (M9.1) | 1566 × 591 | 140.9 × 53.2 px | 2.65 |
| `map-web` seed (Paris) | 1566 × 583 | 194.2 × 72.3 px | 2.69 |
| `mapgen-hexgrid-web` | 1566 × 715 | 86.8 × 73.6 px | 1.18 |
| `mapgen-choropleth-web` / `-dot-` / `-locator-` | — | 28 × 28 px | 1.00 |

The three unaffected beats are unaffected only because their marks are small enough that the 28 px
floor wins on both axes — not because they were built differently. The hexgrid's 1.18 is the same
defect at a milder ratio, and it was elliptical in the FALLBACK too, since its plate is 836 × 520.

**The rule, in two parts, because they come apart independently.**

1. **A `.pt` states ONE dimension; the other comes from `.pt { aspect-ratio: 1 }`.** Never two
   percentages, in any beat, in either layer. This is what makes the highlight round at every
   container shape, and it is the part that also fixes the fallback.
2. **Where a mark is camera-scaled, the highlight is the MARK's own drawn size plus a small
   constant.** The `.pt` carries `data-r`, the mark's radius in the bake's frame units — the same
   number `livePlan` puts on the circle layer's features — and `live-map.mjs`'s `reposition` sets its
   screen diameter to `max(28, 2·r·cameraScale + 10)` on every camera move. One number seen once,
   which is what the row added to the table above asks for.

**What this is NOT.** The painted highlight is not the hit region. Live, `.pt` has
`pointer-events: none` and the pointer is answered by `queryRenderedFeatures` on the rendered mark
itself — which may legitimately be generous, and on a choropleth is the whole country. The halo is
what a reader sees; the hit area is what answers them; conflating them is how a 28 px button came to
sit under a 90 px disc (B6.18a).

**The residue, named rather than left to be discovered.** A beat whose marks are not camera-scaled
circles — the hex grid's bins, a choropleth's fills — has no `data-r`, so its highlight is round but
does NOT track the camera: the SSR'd percentage is a percentage of a box the live layer has changed
the shape of. It is a bounded wrongness (one size, not an ellipse) where it used to be an unbounded
one, and closing it properly means giving those types a live-side size the way the symbol types have.

**Guarded by `scripts/verify-live-map.mjs`**, which now measures the `.pt` box on screen at both
container aspects and asserts two things separately: `|width − height| ≤ 1 px`, and — where the beat
declares `data-r` — that the diameter equals `max(28, 2·r + 10)` with `r` derived independently from
the plan's own `degreesPerPixel` and the live zoom, never read back from the page's own style.

**So: anything the CSS filter governs today needs a live counterpart, and the two are asserted equal
rather than each asserted to have changed.** "The filter did something" passes while only one half
moves — which is exactly the state this rule was written after.

**The filter stays pure CSS and is not replaced.** That is what makes it work with JavaScript off.
The live layer *additionally* listens for `change` on the radio group and calls `setFilter` with the
same slug the CSS selector quotes — one vocabulary (`slugOf`), three readers (the radio's id, the
selector, the layer filter), which is what `assertDistinctSlugs` already exists to keep true.

**With JavaScript off, the degraded state is chosen rather than inherited**, and it is coherent: the
CSS still narrows the labels, the hit targets and the accessible table, while the fallback plate
shows every circle, because a baked raster cannot be filtered. A static picture under a filtered
label set tells the reader about a subset of the marks it draws. That is defensible; it is stated
here so that a future reader meets a decision rather than an accident.

**What is NOT governed by the selection, established by measurement rather than by reading the
code** — clicking every chip in a real browser at 1600 × 900:

- **The size legend does not change, and that is deliberate.** The reference circles stay 3,7 / 7,3 /
  11,0 M in every filter state, because the RADIUS SCALE does not change under a filter. A legend
  that shrank with the selection would tell a reader the circles had been resized, and comparing two
  filter states would become impossible. The residue is real and is a cost, not a bug: under
  "Central & Northern Europe", whose largest value is 3.9 M, the legend's biggest key names a circle
  that is not on the page.
- **The subject sentence survives every filter state**, including the two that exclude the subject:
  "Paris — the largest metro area in this sample" is still printed under "Southern Europe". This is
  B6.18b's furniture half, and it is deliberately NOT fixed here. Hiding it with one more CSS rule
  would make the page consistent and the editorial problem invisible; the honest answer is that a
  filter must not offer an option that excludes the subject, which is a decision about the beat, not
  about this format's code.
- **The accessible region table's own filter interaction is unverified live.** The CSS rule that
  narrows it exists and is the same shape as the others, but the measurement above was taken while
  the seed still shipped `regionTable: false` and counted zero rows in every state. The seed now
  ships `regionTable: true` (2026-08-20, `same-facts-without-the-picture`), so it does render a
  table — this specific filter-times-table measurement has not been re-driven since, and should be
  before anyone claims the filter reaches its rows.

### The price, measured

- **Payload.** `maplibre-gl@4.7.1` inlined is 803 KB of JS and 65.5 KB of CSS. Committed pages ran
  186–642 KB, almost all of it the plate; keeping the fallback AND adding the library roughly doubles
  the file. Inlined rather than loaded from a CDN, because a `<script src>` would trade payload for a
  SECOND third-party host — inlining keeps the count at one, `api.maptiler.com`, which is the honest
  reading of the ruling.
- **The archive stops being frozen.** The bakes say in their own headers why the plate is committed
  beside the beat: *"MapTiler restyles, so a re-bake months later is a different picture under the
  same marks."* A live map has no frozen ground. A published article's map can change appearance
  years after publication with nobody touching the file, and the same beat's static and video
  formats — which keep their plate — will drift away from their own web sibling. This is not
  recoverable by engineering. It is a property of the ruling.
- **Reader IP addresses reach MapTiler on every article view**, and a newsroom CMS with a strict
  `Content-Security-Policy` may refuse `api.maptiler.com` outright. That newsroom sees the fallback.
- **Quota.** MapTiler invalidates ALL of an account's keys at 100% of its spending limit
  (documented). Tiles stop; the map goes blank. The fallback layer is what stands between that and
  an article with a hole in it — which is the strongest argument for keeping it, independent of
  accessibility.
- **A leash derived is a leash that can be short.** Measured on this skill's own seed: the camera
  already sits tight on its thirteen points, so `maxZoomForStudySet` yields 4.419 against a
  `minZoom` of 3.879 — barely half a zoom level. That is honest rather than generous, and the
  alternative is a free parameter, which rule 7a's spirit refuses. A beat whose camera holds more
  room than its study set needs gets a correspondingly longer leash, automatically.

### The key (ruling R1b)

The rendered HTML carries a documented placeholder, never a key. `deliver` substitutes at
delivery (`substituteKeys`) and `splash/test/no-key-in-the-repository.test.ts` reddens if a real
key ever reaches a tracked file. Every map × web beat commits its own HTML and the FJM deliverable is
an MIT open-source release: a key pushed to a public repository is found by scanners within minutes
and survives in the history after any later removal.

**The delivered key IS `MAPTILER_DELIVERY_KEY`, a SECOND, origin-restricted key — never the
development one, and there is no fallback to it.** MapTiler's documented mitigation for a
client-side key is Allowed HTTP origins, enforced server-side — copied elsewhere it does not work —
and **an account's default key cannot be restricted**, so a dedicated one has to be created
(<https://docs.maptiler.com/cloud/api/authentication-key/>).

This paragraph used to say "should", while the code read `MAPTILER_DELIVERY_KEY || MAPTILER_KEY`,
and that is the difference between a rule and advice. Measured: this tree's `.env` holds only
`MAPTILER_KEY`, so **every delivery substituted the unrestricted development key** and nothing
refused, warned or recorded it. `substituteKeys` now has three states and no fourth — the delivery
key is substituted; with neither key set the placeholder travels through and the page ships its
complete fallback layer; **with only `MAPTILER_KEY` set it throws**, naming both ways forward.
Falling silently back to the placeholder there would ship a dead map to someone who believes they
configured one, which is why the third state is loud rather than lenient.

**The guard's three holes, closed 2026-08-10.** A regression exercise wrote a real key into three
tracked files and watched the guard pass on all three: a tracked `.html` over 8 MB (skipped by
size), a tracked file named `.png` (skipped by extension), and **a key other than the one in
`.env`** — which is precisely the key clause 4 says will be delivered. The scan is now chunked over
BYTES with no size ceiling and no extension list, it looks for the delivery key by name as well, and
it carries a value-INDEPENDENT check: every `api.maptiler.com/…?key=` in a tracked file must be the
placeholder, where "a key" is matched by SHAPE (16+ alphanumerics) rather than by value. That last
one needs no key at all to be looking, which is what makes it the real close — and it is pinned by
an anti-vacuity assertion, because it passes trivially in a tree with no live map in it, which is
exactly the tree the audit found.

**The rules that already govern interaction here apply, and matter more with a zoom control than
without:**

- **Nothing argument-bearing lives only behind zoom.** The FITTED state is not a "preview" of the
  real view — it IS the full claim, and `minZoom` is set to the zoom the camera actually fitted at,
  so a reader can never pull back past it. A reader who never touches the control must still get
  the point.
- **Keyboard reaches the map** — MapLibre's own `NavigationControl` is a pair of real buttons, and
  every `.pt` hit target stays in the tab order in both states — **and the accessible table is
  untouched by the camera**: `RegionTable` reads no camera state at all, so panning (useless to a
  screen-reader user regardless of how it is implemented) never regresses the one channel that
  actually serves that reader.
- **With JavaScript disabled, the default (unzoomed) view still renders complete** — trivially true
  here, since the entire mechanism, default state included, is CSS and native scroll, not script.

**Pan and zoom are no longer a per-beat decision.** The paragraph that stood here asked each beat
to earn a zoom control and concluded that this seed had not — `zoomable` stayed `false`, and
`render-web.mjs` had a `SEED.zoomable` key. Ruling R1 removed the question: *a web map you cannot
move through is a picture*, so every map × web beat is live and every one gets MapTiler's own
control. There is no `zoomable` prop, no `mw-zoom-toggle`, and no out-of-map "Zoom in (2.2×,
bounded)" button anywhere in this format — B6.14b asked for that button's removal by name, and
`test/render-web.test.ts` pins its absence rather than its default.

**What IS per beat is `SEED.live`.** Set it `false` for a beat that must stay request-free — an
offline archive, a CMS whose Content-Security-Policy refuses `api.maptiler.com` — and the page ships
as the fallback layer alone, exactly as this format worked before the ruling.

**And what is per beat, and derived rather than picked, is HOW FAR IN.** `leash()` bounds the reader
at the zoom where the study set stops filling the frame, which is right for someone looking at the
whole claim and useless for someone trying to pull two overlapping marks apart. Measured on
`proof/mapgen-symbol-web` before its floor existed: **1.58 zoom levels of headroom at 1600×900 and
0.33 at 768×1024** — a factor of 1.26, which is not a map you can move through in any sense the
ruling meant. So a plan may carry `minZoomHeadroom`, a FLOOR, and it must be derived from the beat's
own data: for that beat it is the zoom at which the closest pair of events stops overlapping
(`separationHeadroom` — a camera-scaled circle holds its screen size as the reader zooms, so each
doubling doubles the distance between two centres while the radii stay put), which comes out at
4.58 levels and is the same number at every container shape.

**Three more things the leash and the fit got wrong, each found by looking at a delivered page
rather than by reading code, each fixed in the shared `live-map.mjs` and re-vendored to all five
beats:**

- **A leash that clamps is a leash that crops.** `leash()` ended with `setMaxBounds(getBounds())`.
  When the whole world fits inside the canvas, `getBounds()` returns MORE than 360° — the empty
  margin either side of the world counts — and MapLibre's own constraint clamps a longitude range to
  one world width by RAISING the zoom. Traced on `proof/mapgen-hexgrid-web`: that one call took the
  fitted zoom from **0.960 to 2.417**, so a beat titled *"not spread evenly across the globe"* opened
  on eight hexagons over the Great Lakes while its own fallback drew the planet. Two claims, one swap
  apart. There is nothing to leash a reader to when the world is already on screen, so at
  `visibleLonSpan >= 360` nothing is set.
- **`fitToStudy` floored the world at zoom 0.** It called `setMinZoom(0)` before fitting; a planet
  needs zoom −1.06 in a 341 px box, and MapLibre's own floor is −2 (`setMinZoom` refuses less). Now
  −2, and the fit reaches −0.16 on a phone instead of being pinned.
- **The fit padding was a flat 48 px.** At 375×667 the stage is 341 × 178, so 48 px each side takes
  **96 of 178 px — 54 % of the height** — and `fitBounds` answered by dropping to zoom 0 with Europe
  a blob and five labels stacked. It is now 9 % of the shorter side, capped at 48: every container
  from 1600 down to 768 keeps the old number exactly, and a phone gets a padding proportional to
  what it has. The constructor still uses the ceiling because it has no canvas to measure yet, and
  `map.on("load")` re-fits with the padding the container earns.

**One limit that is MapLibre's, not ours, and that a planet-extent beat runs into on a phone.**
`proof/mapgen-hexgrid-web` at 375×812 shows **266° of its 359.8°** — a quarter of the world missing,
and `maxBounds` then stops a reader panning to it. It is not the fit's arithmetic: for that canvas
(343 × 461, padding 31) the two axes want `z_lon = −0.865` and `z_lat = +0.326`, so `fitBounds`
should choose **−0.865**. The map sits at **−0.16**, and `log2(461 / 512) = −0.151` — MapLibre
refuses to zoom out past the point where the world still fills the canvas VERTICALLY, and a tall
narrow canvas hits that before it has room for 360° of longitude. The fallback plate has no such
constraint and draws the whole planet.

**DECIDED 2026-08-11, under B4.1 — the design decision this paragraph deferred has been taken, and it
is `geo-discipline.md` rule 12's third clause:** *a map is never given more stage height than its own
geography can fill; where a frame is taller than the geography admits, the map takes the height the
geography demands and the leftover goes to FURNITURE — never to a wider camera, and never to a crop.*
The general form of the arithmetic above, with the canvas as the only input:
`maxStageHeightPx = width × 360 / lonSpan`, because Web Mercator's world is a square. Driven at the
portrait export size both ways: a planet camera handed the whole 1080×1920 frame shows **202.5°** and
the model predicts **202.5°**; letterboxed to the 1080×1080 stage its geography can fill it shows
**359.8°** and hands **840 px** back to furniture — `map-beat/output-proof/extent-range/`, both
captures committed and looked at. It bites only above 202.5° of longitude at that frame, so no beat
in this tree except the four planet ones is affected at any export size.

**What that leaves for THIS format, and it is not free.** On the web there is no export size: the
container is whatever a CMS gives, so the letterbox has to be applied at runtime — `#mw-map` capped
to `min(containerWidth × 360 / lonSpan, containerHeight)` for a world-extent beat, with the freed
height going to the beat's own furniture rather than to the canvas. That is a change to the live
layer's box, in this skill, and it has NOT been made: the code that would carry it is under active
work by another chantier as this is written, and a doctrine file asserting a layout the components do
not have is the exact failure this project has already been burnt by. So: **the decision is taken and
recorded, the derivation is implemented and guarded in `map-beat/assets/geo.ts`
(`maxStageHeightPx` / `stageBoxFor` / `assertStageServesGeography`), and the web format's own
application of it is open.**

**And one rule per mark type that only shows up at the bottom end.** A `radius: "ground"` layer — a
dot standing for a fixed number of people in a fixed piece of ground — must keep its GROUND area, so
its screen radius halves for every zoom level the reader pulls back. Below some radius a circle stops
being drawn at all and the encoding is simply gone: measured on `proof/mapgen-dot-web` at 375×812,
the live field deposited **6 % of the ink the baked plate deposits over the same ground** (0.0119
against 0.1856) under a caption reading *"2,996 dots drawn for 596,770,599 people"*. So a ground
layer may declare `radiusFloorPx`, derived as the radius at which the live field deposits what the
plate's field deposits, and the beat's own caveat states what it costs (where the floor binds, a dot
covers more ground than it stands for). **The trap, because it will catch the next person:**
`["max", <the zoom expression>, floor]` is SILENTLY REJECTED — MapLibre refuses a `["zoom"]`
expression nested inside another, `setPaintProperty` becomes a no-op, and five different floors
render identically. The floor has to be stops of one top-level interpolation, which needs the zoom
where the rule crosses it (`bakeZoom + log2(floor / r)`) — a number that exists only when every mark
in the layer shares one radius. `groundRadiusExpression` therefore refuses a floor without a declared
`uniformRadius`, naming why.

## What must not become interactive

The title, the source, the legend caption, the legend's own reference marks and their labels, the
subject's own note, and the caveat are all drawn unconditionally, exactly once, regardless of hover,
focus, filter or zoom state — none of it is assembled or revealed by `interaction.mjs`, and none of
it is hidden by any `:has()` rule this format writes. The interaction layer's only job is the
PER-POINT exact figure the legend's own reference sizes can only approximate; the filter's only job
is narrowing which points are shown, never revealing new furniture; the zoom's only job is
letting a reader look closer at a claim already fully stated at the unzoomed size. Nothing a reader
needs to receive the beat's own argument lives only behind any of the three.

## Verification

The gotcha this skill's own `SKILL.md` names applies here in full: a static render can be checked
with a PNG; the thing unique to THIS format — does the beat genuinely fill its container at every
width without distorting the plate, does the type stay one size while the geometry scales, does
hovering point X show point X's own value, does Tab reach every point AND every control (the filter
radios, MapLibre's own NavigationControl), does the accessible table read correctly and stay in step
with a narrowed filter, does the map/legend/table survive script-off — is a *behaviour*, provable
only by driving a real browser and using it, or by SCREENSHOTTING it at the actual widths a reader
will see it at. A computed style value that disagrees with a screenshot means the value is measuring
the wrong box, not that the screenshot is wrong — trust the picture.

A unit test (`test/render-web.test.ts`) covers what it honestly can: the SSR'd markup's structure
(one `<svg>`, no `<text>` inside it, one HTML button/label per point, the exact formatted value
baked into every `data-detail`, the filter fieldset present/absent matching the group count, the
absence of any out-of-map zoom control, the palette). It stops there on purpose.
`test/the-live-layer-is-in-the-artifact.test.ts` covers the one thing neither of those reached: that
the renderer PUTS the live layer into the file it writes, and that every committed map-web page
carries it. Before it existed, stripping the live block left 354 tests passing.

**`scripts/verify-interaction.mjs` is the part a unit test cannot reach** — and `test/canon.test.ts`
runs it, so it is part of `bun test` rather than a script someone has to remember, and it is the reason this
section is no longer only prose. It drives the rendered beat in a real browser and asserts, at real
viewport sizes: the beat fits the window and the plate is not stretched; every point's hit target is
**the topmost thing at its own centre** (`document.elementFromPoint`); a real `page.mouse.move` at
that centre shows **that point's** value, compared against `assets/sample-data/regions.json` rather
than against the page's own markup; a real click on each filter chip narrows the map to exactly that
group and **changes the picture** (compared pixel to pixel); the default state shows all thirteen;
Tab and Arrow reach and operate the chips; and the filter still narrows with **JavaScript disabled**.

**Why it insists on real input.** This format already shipped a defect of exactly the shape it exists
to catch: an HTML overlay with no `pointer-events: none` swallowed every hover while keyboard focus
kept working, because `.focus()` does not hit-test. A check written with `dispatchEvent`, `.focus()`
or a read of `data-detail` PASSES in that broken world. This one was proven to fail in it: four
mutated copies of the rendered HTML (the overlay put back; the `&amp;` selector put back; the fit
removed; the plate stretched) each turned the matching checks red, and only those.

**What it does not catch, stated so it is not trusted past its reach:** it is a behaviour check, not
a picture check. Label collisions, camera choice, colour legibility and whether the numbers are true
are all invisible to it — those still need `render-preview.mjs` and a person looking.
