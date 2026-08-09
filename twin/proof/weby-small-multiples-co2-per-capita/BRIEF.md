# Beat — Poland's per-capita emissions have overtaken Germany's (WEB)

**Type:** small multiples (four line panels). **Medium/genre:** chart / web. **Channel:** a
self-contained interactive HTML page, two responsive rungs (900px desktop, 360px narrow).

This is the FIRST web-genre small-multiples beat. The only existing beat of this claim/data is a
VIDEO build (`../more-small-multiples-co2-per-capita/`, a Remotion mp4) — read for its verified
numbers and its panel-order reasoning, never imported (a beat never imports another beat's files,
doubly so across genres; `twin-chart-web/SKILL.md`, "duplicate, do not link"). Everything here is
written fresh, in this genre's own shape (`ChartWebSeed.tsx`'s `WebLayout`/two-layouts/SSR'd
interaction pattern), generalised from one panel to four.

## Claim

In 2024, Poland's per-capita CO2 emissions overtook Germany's — a gap that did not exist a decade
ago. All four countries shown (Switzerland, France, Germany, Poland) have fallen sharply from
their own 1973-1980-era peaks, but Poland's fall has been shallower, so it now sits above Germany.

## Data

Global Carbon Budget 2025, via Our World in Data ·
`https://ourworldindata.org/grapher/co-emissions-per-capita.csv?country=~CHE~FRA~DEU~POL&csvType=filtered`,
extracted 8 August 2026. `data.csv` is copied verbatim from the video beat's own frozen file (the
same source, same extraction). `render-web.mjs` re-parses it from scratch and verifies, before
trusting anything: the entity set found is EXACTLY the four expected countries (throws on any
extra or missing entity — the `ourworldindata-csv-filter-trap` this project's intake reference
names, where a grapher URL's own filter cannot be assumed to have actually filtered), and each of
the four countries has exactly 75 annual readings across 1950-2024 inclusive (throws otherwise).
All four checks passed on this run: **300 total readings** (75 × 4).

## Claim verification — recomputed, not assumed

`render-web.mjs`'s own `verifyClaim` recomputes both halves of the claim from the readings it
actually parsed, never from the video beat's own `BRIEF.md` numbers:

- **2024 ranking:** Poland 7.08 t > Germany 6.77 t (`console.log` at render time; rounds to the
  video beat's own "7.1 vs 6.8"). Held.
- **"Did not exist a decade earlier":** at 2014 (`polandLast.year - 10`), Poland was 8.09 t against
  Germany's 9.74 t — Poland was NOT above Germany, confirming the gap is new. Held.
- **Each country below its own historical peak:** Switzerland peaked 7.33 t (1973) → 3.59 t (2024);
  France 10.40 t (1973) → 3.97 t (2024); Germany 14.30 t (1979) → 6.77 t (2024); Poland 13.02 t
  (1980) → 7.08 t (2024). Held for all four.

**No discrepancy of substance against the video beat's own numbers** — the exact decimal readings
differ in the second decimal (this file's own CSV read rounds 7.08/6.77 where the video's `en1()`
also rounds to 7.1/6.8), which is floating-point display precision, not a different underlying
number; both files read the same `data.csv`.

## Subject and accent

No single subject LINE overlaid with others — the doctrine's own rule for this type ("same domain,
same axis, same units, on every single panel, full stop") governs the geometry: one shared,
zero-based y-domain (0 to the round ceiling above the single highest reading across all four
countries and all years) and one shared 1950-2024 x-domain, on every panel, so the four countries'
shapes AND their relative heights both stay honestly comparable — this is exactly the case
`small-multiples.md` describes as the RIGHT read for faceting (crossing/near-crossing absolute
levels, not a single trend that would read better overlaid). Poland is the one panel accented: its
line, its end-dot and its end-label are drawn in the house teal (`#0B7A75`) unconditionally; the
other three are drawn in `ink`. A reader can tell which panel is the subject at a glance, no
interaction required — the static/web analogue of the video beat's own "reveal in ascending order,
land the colour change as its own event" device, minus the motion (there is no time axis in a
still SSR'd frame to stage an event on).

Panel order (ascending 2024 value: Switzerland, France, Germany, Poland) matches the video beat's
own order — a reader who has seen either beat meets the same left-to-right, top-to-bottom build
toward the subject.

## Source

Global Carbon Budget 2025, via Our World in Data · Switzerland, France, Germany, Poland,
1950-2024, extracted 8 August 2026.

## Interaction

Small multiples are, by construction, MANY SMALL panels — a small-multiples panel is categorically
smaller than a single full-width chart, because the same frame width that would hold one chart now
holds `cols` of them side by side. That means there is categorically LESS room per panel to print a
label than a single-panel beat has, on top of the usual problem every web beat in this genre
solves (a 75-point annual series has no room to label more than a couple of years without turning
into a table). Four panels × 75 readings = 300 individual numbers; the static/video genre can print
at most one end-label and rely on the shared axis's gridlines for the rest, per panel — every OTHER
one of the 300 readings, in every panel, is undiscoverable without this genre. That is the specific
argument for interaction earning its place here, more than anywhere else in this twin: not "more
detail is nice," but "this is the only genre in which most of this data is reachable at all."

**Design.** ONE `<svg class="chart">` per layout (matching `ChartWebSeed.tsx`'s own one-svg-per-
layout shape, and `render-web.mjs`'s existing `svg.chart[data-layout=...]` CSS toggle), holding
FOUR independent panels, each wrapped in its own `<g class="panel" data-panel="Poland">` (etc.) —
not four separate `<svg>` elements. Chosen over four SVGs because the shared axis/gridlines/unit
already have to be reasoned about at the GRID level (`small-multiples.md`'s "repetition trap": the
unit is stated once, in the caption, not per panel), and one SVG keeps that grid-level furniture
(the header block above the grid) in the same coordinate space as the panels below it, rather than
splitting header and panels across a mix of HTML and four separate SVG viewBoxes.

Each panel carries its OWN `.hit-area` rect (that panel's own plot rectangle only) and its OWN 75
`.pt` circles, each `tabIndex={0}` with its own `aria-label`/`data-detail` baked in at SSR time —
`"Poland, 1973: 10.1 t CO2/capita"`-shaped, country name included because there are four panels
sharing one tooltip and a bare `"1973: 10.1 t"` would be ambiguous about which country it belongs
to. `small-multiples-interaction.mjs` wires each panel's own `.hit-area`/`.pt` set inside its own
closure in a `panels.forEach` loop — `points`/`cxs`/`fromPointer` are all declared INSIDE that
loop body, so cross-panel bleed (the scatter beat's own documented bug class, where a shared
resolver silently picks the wrong series' point) is not merely avoided by convention here, it is
structurally impossible: there is no svg-wide points array anywhere in the file for a resolver to
reach across into. Keyboard: `ArrowRight`/`ArrowLeft`/`Home`/`End` are wired per panel (clamped
against that panel's own `points.length`), so stepping can never walk off one country's line into
another's; `Tab`, never intercepted, moves through the DOM in document order — panel 1's 75 points,
then panel 2's, then panel 3's, then panel 4's — so it naturally carries focus between panels once
one panel's own points are exhausted, with no extra code needed for that transition.

Everything the static frame already draws — title, source, the caption (unit + shared-scale
caveat, stated ONCE at grid level per `small-multiples.md`'s repetition-trap rule), each panel's
own country-name label, the shared gridlines/axis values (y-values on the left column only,
x-tick years on the bottom row only — again per doctrine, not repeated in every panel), Poland's
accent, and each panel's own end-label — stays exactly as unconditional SSR'd SVG, verified in
Step 5 below with JavaScript off. The hover layer only ever touches `.pt`/`.hit-area`/`pt-active`
classes and the shared `#tooltip`, never anything argument-bearing.

**One polish fix made while looking at the rendered frame** (not part of the original plan, caught
by the "verify the LIVED" rule this twin states everywhere): each panel's end-label first rendered
with a plain fill, and on Germany's and Poland's panels — where the line dips right before its
final point — the label's own text visually crossed the line and the end-dot, illegible where they
overlapped. Fixed with a stroke halo (`stroke={ground}`, `paintOrder="stroke"`) behind the label
text, the same "opaque backing so text stays legible over what's under it" reasoning
`web-discipline.md` already grants the `#tooltip` box, applied to a label instead of a box, baked
in at SSR time rather than as an added interactive layer. Re-rendered and re-looked before moving
on — see the screenshots taken during verification below.

## Verification — driven in a real browser, 2026-08-09

Puppeteer (`twin/node_modules`), pointed at the system Chrome install
(`/Applications/Google Chrome.app`, since Puppeteer's own bundled Chrome was not installed in this
environment). File opened directly via `file://`.

**1. Desktop, 1000px viewport, before any interaction.** Title
("Poland's per-capita CO2 emissions have overtaken Germany's, even as both have fallen sharply
since their 1979-80 peaks.") present. Desktop SVG's computed `display: block`, narrow SVG's
`display: none` — the right layout is showing at this width. All four panel labels
("Switzerland"/"France"/"Germany"/"Poland") and both end-labels sampled ("3.6 t CO2/capita" for
Switzerland, "4.0 t CO2/capita" for France) were present in the DOM text content before any pointer
event fired — nothing gated behind interaction. Screenshot confirmed all four panels, their shared
gridlines/axis, and Poland's teal accent (line, dot, panel label) visible at a glance.

**2. Hover across different panels, cross-panel correctness.** Hovered a point in Switzerland's
panel (1973), a point in Poland's panel (1973), and a point in Germany's panel (near 2024, plus
Germany/Poland 2000 and 1965 as an ADJACENT-panel stress case — Germany and Poland sit side by side
on the bottom row, the geometry where a naive svg-wide resolver would be most likely to bleed).
Every tooltip read back exactly matched the panel/country actually hovered, cross-checked against
`data.csv` directly:
- Switzerland 1973 → `"Switzerland, 1973: 7.3 t CO2/capita"` (CSV: 7.3255005 → 7.3 ✓)
- Poland 1973 → `"Poland, 1973: 10.1 t CO2/capita"` (CSV: 10.067933 → 10.1 ✓)
- Germany 2024 → `"Germany, 2024: 6.8 t CO2/capita"` (CSV: 6.7688236 → 6.8 ✓)
- Germany 2000 → `"Germany, 2000: 11.0 t CO2/capita"` (CSV: 10.990293 → 11.0 ✓), Poland 2000 →
  `"Poland, 2000: 8.3 t CO2/capita"` (CSV: 8.293836 ✓) — adjacent panels, no bleed.
- Germany 1965 → `"Germany, 1965: 12.6 t CO2/capita"` (CSV: 12.634993 ✓), Poland 1965 →
  `"Poland, 1965: 7.9 t CO2/capita"` (CSV: 7.8935866 ✓) — again no bleed.
- Switzerland 2024 (last year) → `"Switzerland, 2024: 3.6 t CO2/capita"` (CSV: 3.5946856 ✓);
  France 1950 (first year) → `"France, 1950: 4.8 t CO2/capita"` (CSV: 4.833711 ✓) — domain
  boundaries resolve correctly too.

Every one of these correctly resolved to the panel actually under the pointer, never to another
panel's reading at a similar year — confirming the per-panel closure scoping holds in a real
browser, not only in the code's own reasoning.

**3. Keyboard.** Clicked a neutral point (top-left margin, not on any interactive element — a
click landing on the page's own content, e.g. mid-body over a panel, sets Chromium's own
"sequential focus navigation starting point" to that coordinate rather than the top of the
document, an observed browser behaviour worth naming since it changed which panel the first Tab
press landed in during an earlier run of this same check; not a bug in the page). From that
neutral start, 8 successive `Tab` presses landed on Switzerland's own first 8 points in order
(1950 through 1957), confirming Tab starts at the DOM's own first panel and walks it in year order.
Two `ArrowRight` presses from the 1957 point moved to 1959 (skipping 1958, i.e. two steps forward),
staying inside Switzerland's own panel; the tooltip text after those two presses
(`"Switzerland, 1959: 3.2 t CO2/capita"`) exactly matched `document.activeElement`'s own
`data-detail`, confirming focus and the visible detail box agree.

**4. 375px viewport.** The narrow layout's SVG (`data-layout="narrow"`) swapped in (`display:
block`, desktop's `display: none`) at the 480px media-query breakpoint. All four panels rendered
stacked one-per-row, in the same order (Switzerland, France, Germany, Poland). The rendered SVG's
own bounding box was exactly 375px wide with no horizontal page overflow
(`document.documentElement.scrollWidth <= clientWidth`, checked directly). Screenshot confirmed all
four country labels legible, Poland's accent still visible, nothing clipped.

**5. JavaScript disabled** (`page.setJavaScriptEnabled(false)`, fresh reload). Title still present;
all four `<g class="panel">` elements present; all four `<path>` elements (one line per country)
present — every country's full curve draws with the script never having run. Spot-checked each
panel's own first `<text>` child to confirm the conditional axis-text rule survives SSR
independent of JS: Switzerland's (left column) first text was its own y-tick `"0"`; France's
(right column, not bottom row) first text was its own country label `"France"` (no y-tick or
x-tick text emitted for it at all, confirming those really are OMITTED from the markup, not merely
hidden by CSS); Germany's (left column, bottom row) first text was its own y-tick `"0"`; Poland's
(right column, bottom row) first text was its own x-tick year `"1950"`. This is exactly the
doctrine's own "shared axis stated once" rule holding under SSR with no script at all — the static
frame the doctrine requires survives fully.

## What was NOT built, and why

A roving-tabindex keyboard mode (one Tab stop per panel instead of 75) is the natural next
iteration, not built here — same known-cost-not-hidden call `web-discipline.md` makes for the
single-panel seed. With 300 points across four panels instead of 75 in one, this cost is four times
larger in the worst case (300 Tab presses to reach Poland's last point from a cold document start);
`ArrowRight`/`End` inside a panel and ordinary Tab-past-a-panel-you're-not-interested-in both
mitigate it in practice, but a reader relying on Tab alone to reach, say, Poland's own 2024 reading
from a cold start does have to pass through 225 other points first. Named here rather than hidden.
