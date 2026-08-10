# Beat — Life expectancy gains, ten countries, 2000-2023 (web)

**Medium/genre:** chart / web. **Type:** dumbbell (range plot). This is the WEB genre of the
same claim the STATIC beat (`proof/more-dumbbell-life-expectancy-gains/`) already draws — its own
fresh geometry and its own fresh component, not an import of that beat's files (a beat never
imports another beat's files; `chart-web/SKILL.md`'s "duplicate, do not link" ruling).

## Claim

Every one of these ten countries added years of life expectancy between 2000 and 2023 — Poland
gained the most, +5.0 years; the United States gained the least, +2.5 years. Verified fresh from
this beat's own `render-web.mjs` (not hardcoded, not assumed): every one of the 10 computed gaps
is positive, and sorting by gap descending puts Poland at the top and the United States at the
bottom.

## Data

- Source: UN, World Population Prospects (2024), via Our World in Data —
  `https://ourworldindata.org/grapher/life-expectancy.csv?country=~FRA~DEU~ITA~JPN~NLD~POL~ESP~CHE~GBR~USA&csvType=filtered`,
  ten countries (France, Germany, Italy, Japan, Netherlands, Poland, Spain, Switzerland, United
  Kingdom, United States), extracted 8 August 2026.
- `data.csv`: 1,418 rows fetched (every year 1816-2023 for the ten filtered countries), filtered
  in code (`render-web.mjs`'s own `rowsFromCsv`) to Year 2000 and Year 2023 — **20 rows used**,
  10 countries x 2 years, verified as exactly 20 before rendering.

## Subject and accent

No single "subject" hue — a dumbbell has two colour ROLES, one per series being compared, not
one accent plus neutrals. Two CVD-safe Okabe-Ito hues, capped at exactly two per
`references/types/dumbbell.md`: `#0072B2` (blue) for 2000, `#D55E00` (vermillion) for 2023 — the
same pair the static sibling uses. Because there is no positional convention telling a reader
which dot is which series (unlike a slope chart's left-is-earlier reading), the legend is
load-bearing, not decorative. Rows are sorted by gap size, descending: Poland's 5.0-year gain at
the top, the United States' 2.5-year gain at the bottom. The value scale is one shared linear
scale across all rows, fitted to the data's own extent and NOT anchored at zero — position
encoding, not length encoding.

## Source line

`Source: UN, World Population Prospects (2024), via Our World in Data · 2000 and 2023, extracted 8 August 2026`

## Interaction

The static frame prints both endpoint VALUES beside each dot — 2000 in blue ink, 2023 in
vermillion — but it never prints the GAP itself as a number, for any of the 10 rows, except the
two the title happens to name (Poland +5.0, United States +2.5 in prose). For the other 8 rows —
France, Germany, Italy, Japan, Netherlands, Spain, Switzerland, United Kingdom — a reader has to
eyeball the connector's pixel length and guess. That is exactly the honest gap this genre exists
to close, and exactly the anti-pattern `web-discipline.md` warns against inverted: hovering a row
should never just repeat the two values already printed beside its dots ("the same numbers
repeated on demand") — it should supply the ONE thing not already stated, the gap.

So `data-detail` LEADS with the gap: `"Poland: +5.0 years (73.6 → 78.6)"`,
`"Germany: +3.3 years (78.1 → 81.4)"` — the two already-visible endpoint values fold in afterward,
in parentheses, as confirmation, never as the headline.

The hit-test is per COUNTRY ROW, not per dot and not a shared nearest-point overlay: each of the
ten rows already owns one non-overlapping horizontal band (`scaleBand`'s own bandwidth), so one
invisible `.hit-row` rectangle per row — spanning the full plot width and that row's own band
height — is wired directly to its own pointer/focus events (`dumbbell-interaction.mjs`). There is
nothing to resolve "nearest" the way the line genre's shared `.hit-area` (nearest-by-x) or the
scatter beat's shared `.hit-area` (nearest-by-2D-distance) both have to — a pointer anywhere
inside the plot is inside exactly one row's band, unambiguous by construction. `tabIndex={0}`,
`aria-label` and `data-detail` are baked into every hit-rect at SSR time, so a keyboard user or
screen reader reaches every row's own gap with Tab alone, script absent entirely. Keyboard focus
adds `ArrowUp`/`ArrowDown`/`Home`/`End` to move between rows without leaving focus — rows stack
vertically here (unlike the line/scatter beats' horizontal `ArrowLeft`/`ArrowRight`), and DOM
order (top to bottom = gap-size descending) matches visual order top to bottom, so `ArrowDown`
moves visually down exactly as expected.

Everything the static genre already prints — title, source, legend, connectors, both dots, both
endpoint value labels — stays exactly as unconditional SSR'd SVG. `dumbbell-interaction.mjs` only
ever touches the `.hit-row` rectangles' own `class` and the shared `#tooltip`; it has no code path
that can hide or move anything else.

## Verification — driven in a real browser, 2026-08-08

Driven with Puppeteer (Chrome for Testing 147.0.7727.57) against the rendered
`dumbbell-life-expectancy-gains.html`, opened via `file://`. All five checks below were actually
run and observed, not assumed.

1. **Desktop load, 1000px viewport, before any interaction.** The title's first wrapped line read
   "Every one of these ten countries added years of life expectancy between 2000" (continues onto
   further lines); both legend labels "2000" and "2023" were present in the SVG text nodes; exactly
   10 `.hit-row` rectangles and exactly 22 circles (2 legend swatches + 20 value dots, 2 per row x
   10 rows) were present before any pointer event fired — the argument is fully stated on load,
   nothing waits for interaction. Row order top to bottom, read directly off the DOM: Poland,
   France, Spain, Switzerland, Italy, Netherlands, Japan, United Kingdom, Germany, United States —
   confirming the gap-descending sort landed Poland at the top and the United States at the bottom.

2. **Hover three rows — largest gap, one from the middle, smallest gap.** Row 0 (Poland, largest
   gap): tooltip read exactly `"Poland: +5.0 years (73.6 → 78.6)"` — 78.6 − 73.6 = 5.0, correct.
   Row 4 (Italy, a middle row): tooltip read exactly `"Italy: +4.1 years (79.6 → 83.7)"` — 83.7 −
   79.6 = 4.1, correct. Row 9 (United States, smallest gap): tooltip read exactly
   `"United States: +2.5 years (76.8 → 79.3)"` — 79.3 − 76.8 = 2.5, correct and matches the title's
   own claimed figure.

3. **Tab into the page, then keyboard-only.** Clicking the page body then pressing Tab repeatedly
   reached a `.hit-row` element after 9 presses (`data-country="Italy"`, `class="hit-row
   hit-row-active"` — the active class applied by the SAME `focus` handler hover uses), and the
   `#tooltip` text read `"Italy: +4.1 years (79.6 → 83.7)"` — the identical string the mouse hover
   on that same row produced in step 2, confirming keyboard focus and hover share one `show()`
   path, not a second, thinner keyboard-only answer. Pressing `ArrowDown` once moved focus to the
   next row down (`Netherlands`, the row immediately below Italy in the sorted order) and the
   tooltip updated to `"Netherlands: +4.0 years (78.1 → 82.2)"` — 82.1576 − 78.13 = 4.0276 on the
   raw (unrounded) source values, correctly rounding to "+4.0" even though the two DISPLAYED
   endpoint values round to 78.1 and 82.2 (a 4.1 difference at that rounded precision) — the gap
   is computed from the unrounded source numbers before either endpoint is separately rounded for
   display, exactly as intended, and this is the one place the two numbers can look
   arithmetically "off by 0.1" if a reader does the subtraction on the rounded labels themselves
   rather than trusting the stated gap.

4. **Resize to 375px wide.** The desktop SVG's computed `display` became `none` and the narrow
   SVG's became `block` — the `max-width: 480px` media query swapped layouts as designed. The
   narrow SVG's own bounding box was exactly `{x: 0, width: 375}`; every text node's bounding box
   (all 10 country-name labels plus both value-label columns) was checked against that box and
   none extended past either edge — nothing clipped, the two likeliest failure points
   (`references/types/dumbbell.md`'s own named failure mode) held.

5. **Reload with JavaScript disabled.** `page.setJavaScriptEnabled(false)` before navigation; the
   desktop SVG was still present in the DOM with all 10 `.hit-row` elements and all 22 circles —
   title, source, legend, connectors, both dots per row and both value labels are plain SSR'd SVG
   markup, none of it depends on the script executing. The first hit-row's `aria-label` read
   `"Poland: gained 5.0 years of life expectancy, from 73.6 years in 2000 to 78.6 years in 2023"`
   — reachable by a screen reader via plain Tab with the script entirely absent, per
   `web-discipline.md`'s "Keyboard and touch."

## Known gap, stated rather than hidden

Same known cost `web-discipline.md` names for the line genre's own seed: reaching a specific row
by Tab alone (script absent) still means stepping through however many rows precede it — fine at
10 rows, the same "slow but honest" tradeoff the seed's own doc names for its 75 points, not a
defect unique to this beat.
