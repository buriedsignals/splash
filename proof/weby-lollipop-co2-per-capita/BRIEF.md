# Beat — Switzerland's per-capita CO2 emissions, 3rd-lowest of 15 European peers (web)

**Type:** lollipop. **Medium/format:** chart / web. **Channel:** article web, two responsive
rungs — desktop 900px wide, narrow 360px wide (`web-discipline.md`, "Responsive behaviour": two
pre-rendered layouts, no live reflow), each with a derived (not fixed) frame height so a wrapped
title can never silently clip the plot below it.

This is the web sibling of `proof/more-lollipop-co2-per-capita/`'s static beat — same claim, same
frozen data, freshly re-implemented (not imported — a beat never imports another beat's files).

## Claim

Switzerland's 2024 per-capita CO2 emissions were the 3rd-lowest of these 15 European countries, at
3.6 tonnes — less than half of Belgium's 7.3 tonnes.

Computed from the frozen data, not assumed: `render-web.mjs` sorts all 15 countries' 2024 readings
descending, finds Switzerland at rank 13 of 15 (3.5946856 t at full precision), i.e. 3rd-lowest, and
throws if that rank ever changes against a re-run of the frozen CSV. Belgium is highest at
7.2798314 t. Switzerland's value is 49.4% of Belgium's — under half.

## Subject and accent

One accent, `#0B7A75` (this codebase's house teal), reserved for Switzerland's stem-and-dot only —
the newsroom's own country, not the highest or lowest value in the set. Every other row is `muted`,
derived from the ground. Rows are sorted by value, descending, drawn in that order by the
component rather than re-sorted inside it.

## Data

Global Carbon Budget 2025, via Our World in Data · `co-emissions-per-capita.csv`, 15 European
countries (Austria, Belgium, Denmark, France, Germany, Greece, Italy, Netherlands, Norway, Poland,
Portugal, Spain, Sweden, Switzerland, United Kingdom — confirmed against `data.csv`'s own distinct
`Entity` values, not assumed), 2024 — the latest year every one of the 15 countries actually carries
a reading for in this dataset, verified per-country by `render-web.mjs` before drawing (it throws if
any country is missing a 2024 row). Source URL:
`https://ourworldindata.org/grapher/co-emissions-per-capita.csv?country=~CHE~FRA~DEU~ITA~ESP~POL~GBR~NLD~BEL~AUT~SWE~NOR~DNK~PRT~GRC&csvType=filtered`.
Row count actually drawn: **15** (one per country's 2024 reading).

## Interaction

This type's interaction had to be judged honestly rather than forced. At 900px wide with only 15
rows, the STATIC sibling of this exact claim already has room to print a rounded value label beside
every single dot — there is no omitted detail the way a 75-point line series or a 21-band population
pyramid omits detail, and `web-discipline.md`'s own rule is explicit: the honest use of interaction
here is detail the static frame had to omit, never the same numbers repeated on demand. So this beat
does not bolt on a tooltip that just restates "3.6 t" a reader can already see printed in ink next to
Switzerland's dot — that would be exactly the anti-pattern the doctrine warns against.

What genuinely IS omitted: the printed label rounds to one decimal, and at one decimal Switzerland
and Sweden are the same number — both print "3.6 t", and the title calls one of them third-lowest. So
hover, tap or keyboard focus on any row reveals that row's reading to THREE decimals (e.g.
`"Switzerland · 3.595 t (2024)"` against Sweden's `3.592`), and nothing more. Three is derived, not
picked: rounding all fifteen frozen readings gives 14 distinct values at one decimal and still 14 at
two — Sweden and Switzerland tie in both — and 15 at three. Three decimals is therefore the fewest at
which every row is its own number, and the fewest at which "3rd-lowest" is checkable. It formerly
revealed the CSV's own literal, which gave five decimals on one row, six on seven and seven on seven
— the float's digit count, not a decision. With every row
already labelled, this type gains comparatively little from interaction at this row count — the one
honest thing hover adds is the precision rounding necessarily dropped, not a redundant restatement of
what is already on screen. Design: one invisible hit-rect per row, spanning the plot's full width and
that row's own `scaleBand` height, `tabIndex`/`aria-label`/`data-detail` baked in at build time
(`lollipop-interaction.mjs`, this beat's own script — a lollipop's disjoint row bands need no
"nearest" resolution the way a line or a scatter does). Keyboard: `ArrowUp`/`ArrowDown`/`Home`/`End`
step between rows.

## Verification — driven in a real browser, 2026-08-08

Driven with Puppeteer (system Chrome, `/Applications/Google Chrome.app`) against the rendered
`lollipop-co2-per-capita.html`, opened via `file://`, per `web-discipline.md`'s own rule that an
interactive claim cannot be checked from a screenshot alone.

1. **Desktop load, 1000px wide, before any interaction.** The desktop SVG (`data-layout="desktop"`)
   was `display: block`, the narrow one `display: none`. The title text
   ("Switzerland's 2024 per-capita CO₂ emissions were the 3rd-lowest of…"), the source line
   ("Source: Global Carbon Budget 2025, via Our World in Data · 2024 data"), all 15 `.row-hit`
   rects, and all 15 dot circles were present in the DOM before any pointer or keyboard event fired.
   All 15 rounded value labels were readable ("7.3 t", "7.1 t", …, "3.6 t" ×2 for Switzerland/Sweden,
   "3.4 t") plus the top axis tick's own "8 t" label — nothing was gated behind interaction.
2. **Hover three rows, including Switzerland.** Hovering Switzerland's row showed tooltip text
   `"Switzerland · 3.5946856 t (2024)"` — more decimal precision than the printed "3.6 t" beside the
   same dot, and matching `data.csv`'s own Switzerland/2024 row exactly. Hovering Belgium showed
   `"Belgium · 7.2798314 t (2024)"` (printed label: "7.3 t") and hovering Poland showed
   `"Poland · 7.0801096 t (2024)"` (printed label: "7.1 t") — both cross-checked against the frozen
   CSV and both correct. Moving the pointer off the plot hid the tooltip (`#tooltip[hidden]` became
   true).
3. **Keyboard only.** Clicking into the page body then pressing Tab repeatedly reached the row
   hit-rects directly (the first three focus stops landed on Greece, Italy and Denmark's own rects in
   their printed DOM order), and each focus event showed the identical tooltip text hover shows for
   that same row (e.g. focusing Greece's rect showed `"Greece · 5.310692 t (2024)"`) — no second,
   thinner "keyboard mode." Pressing `ArrowDown` from a focused row (Denmark) moved focus to the next
   row in ranked order (Spain), confirming the arrow-key shortcut works independent of Tab.
4. **Resized to 375px wide.** The desktop SVG switched to `display: none` and the narrow SVG to
   `display: block` exactly at the documented 480px media-query breakpoint. `document.documentElement`
   reported `scrollWidth === clientWidth` (375 === 375) — no horizontal overflow. A programmatic
   collision check (every value-axis gridline segment's x-position against every value label's
   measured bounding box, the exact class of defect the static sibling's own `BRIEF.md` documents —
   a gridline bisecting the "3.6 t" label) found zero collisions at the narrow width. A second check
   for any category label whose bounding box started left of x=0 (clipped off the frame edge) also
   found none.
5. **Reloaded with JavaScript disabled** (`page.setJavaScriptEnabled(false)`). The static frame
   survived intact: the title text, all 15 dot circles, 16 " t"-suffixed labels (15 rounded row
   values + the top axis tick), and 23 `<line>` elements (15 stems + the zero baseline + the
   gridline segments) were all still present and readable. All 15 `.row-hit` rects still carried
   their own `aria-label` (e.g. `"Belgium: 7.2798314 t, 2024"`) — a screen reader or keyboard user
   reaches every row's exact reading via plain Tab even with the interaction script entirely absent,
   the same invariant `web-discipline.md` states for the line format.

## Source line

`Source: Global Carbon Budget 2025, via Our World in Data · 2024 data`
