# Beat — Switzerland's population bulges at ages 55-59 (web)

**Type:** population pyramid. **Medium/genre:** chart / web. **Channel:** article web, two
pre-rendered layouts — 900px desktop, 360px narrow (`web-discipline.md`, "Responsive behaviour").

## Claim

Switzerland's widest age band in 2023 is 55-59 (669,962 people combined — men 337,549, women
332,413), not the youngest band: 0-4 year-olds total 434,030, well under the peak — the mark of an
aging population, not an expanding one. Verified by the render script itself (`render-web.mjs`
reduces the 21 bands to find the true maximum by total; the peak band is never hardcoded), not
asserted.

## Subject and accent

Two CVD-safe hues, checked as a pair, one per sex (`references/types/population-pyramid.md`) — the
mirrored position already carries the group distinction, colour reinforces it. Age bands keep their
natural sequence, oldest at the top, never sorted by value. One ink annotation names the peak band
on the same shared, mirrored, zero-anchored magnitude scale as every other band — unconditional,
same as the static beat.

## Source

UN, World Population Prospects (2024), via Our World in Data · `male-population-by-age-group.csv`
and `female-population-by-age-group.csv`, Switzerland, 2023 (the latest year both files carry), 21
five-year bands from 0-4 to 100+. `data.csv` copied verbatim from
`proof/static-swiss-age-pyramid/data.csv` (not imported — a beat never imports another beat's
files). The 21 bands sum to 8,870,560, four people off from OWID's own standalone `population.csv`
total for Switzerland 2023 (8,870,564) — a rounding artifact across two independently-modelled
series, close enough to trust, logged again by this beat's own render script.

## Interaction

The static frame's bars carry the argument entirely through length: a reader can see which band is
widest, but the only numbers printed anywhere are the axis's rounded-thousands ticks ("330k",
"660k") and one dashed annotation naming the peak band by name, never by its exact figure. Every one
of the 21 bands × 2 sexes = 42 individual readings has a real, exact integer the static frame has no
room to print without turning the chart into a table — that is exactly the gap this genre exists to
close.

The interactive unit chosen here is not a point (as in the line beat) and not a single dot (as in
the scatter beat) — it is a whole ROW. One invisible hit-rect per AGE BAND, spanning the full plot
width (crossing the central label gutter, covering both the male side and the female side) and that
band's own full row slot, reveals BOTH sexes' exact figures for that band in one string, e.g.
`"55-59 (widest band): men 337,549 · women 332,413"` or, for a non-peak band,
`"0-4: men 222,640 · women 211,390"`. This is a deliberate reading of "one hit-test per band, not
per side": the pyramid's own claim ("which age is widest") is a per-row question about a combined
total, so answering it per-side (hover the male bar, get only the male figure) would force the
reader to hover twice and do the addition themselves — the exact redundant decoding work
interaction in this genre is supposed to spare them (`web-discipline.md`, "What hover reveals").

This also changed the interaction MECHANIC from every other web beat built under this skill so far.
The line genre's own `assets/interaction.mjs` resolves hover/tap by NEAREST-X over one shared
`.hit-area` overlay (correct when every reading has a distinct x and y carries the value); the
scatter beat's own `scatter-interaction.mjs` resolves by nearest-2D-point over a shared overlay
(needed because ~164 points scatter freely in both dimensions). Neither generalises here: the 21
row-rects, sized to `scaleBand`'s own row slot (bar height plus half the inter-row padding on each
side — `pyramid-geometry.ts`'s `hitY`/`hitHeight`), already TILE the plot rectangle exactly, edge to
edge, with no gaps and no overlaps. That makes each row's own native `pointerenter`/`pointerleave`
sufficient on its own — no shared overlay, no distance math, a genuinely simpler mechanic than
either prior beat, because the geometry itself removed the ambiguity a nearest-neighbour resolver
exists to solve. `pyramid-interaction.mjs` is written fresh for this reason (not a reuse of either
prior script), though it keeps the same tooltip element, the same hover/tap/keyboard parity, and the
same `data-detail`/`aria-label` discipline every other beat's script keeps.

Keyboard: rows are rendered in visual top-to-bottom order (oldest band at the top —
`SwissAgePyramidWeb.tsx`'s `rowsTopToBottom`, sorted by each row's own pixel `y`, not assumed from
the data's own order), so DOM/tab order already matches the vertical axis a sighted reader would
expect. `ArrowUp`/`ArrowDown` move focus between adjacent rows (rows stack vertically, so
Up/Down — not Left/Right — is this type's own natural axis, unlike the line/scatter beats' own
horizontal `ArrowLeft`/`ArrowRight`); `Home`/`End` jump to the oldest/youngest band.

Nothing the static frame already states is gated behind interaction: the title, the caveat, the
source, the legend, both mirrored magnitude axes (rounded thousands), all 21 mirrored bar pairs, the
central band labels, and the peak annotation are all drawn unconditionally in the SSR'd SVG — the
row-hit rects only ever toggle their own class and the shared `#tooltip`.

## Verification — driven in a real browser, 2026-08-08

Driven with Puppeteer (`node_modules/puppeteer`, already installed at `twin/node_modules`), launched
against the system's own installed Chrome (`/Applications/Google Chrome.app` — the same prerequisite
gap `chart-beat/scripts/render-still.mjs`'s own header comment names for `@resvg/resvg-js`'s
rejected alternative; puppeteer's own bundled Chrome was not present in this sandbox's cache and had
to be pointed at the system install instead) against the actual rendered
`population-pyramid-switzerland.html`, `file://` protocol, headless.

**1. Desktop load (1000px viewport), before any interaction.** Title "Switzerland's population
bulges at ages 55-59, not among the youngest" visible. Legend swatches for "Men" and "Women" both
present. All 21 row-hit rects present (one per age band). The peak annotation's label
"55-59: the widest band (669,962)" was in the rendered text, visible unconditionally, with no
interaction yet performed. Confirmed via `getComputedStyle`: the desktop SVG
(`data-layout="desktop"`) computed `display: block`, the narrow one (`data-layout="narrow"`)
computed `display: none` at this width — both are in the DOM at once, the media query alone decides
which paints.

**2. Hovered three different bands (moved the real mouse pointer to each row's own centre), read the
tooltip, cross-checked against `data.csv`'s own integers.**

- Hovered the 55-59 row (the peak): tooltip read exactly
  `"55-59 (widest band): men 337,549 · women 332,413"`. `data.csv` row `55-59,337549,332413` —
  matches exactly.
- Hovered the 0-4 row (youngest): tooltip read exactly `"0-4: men 222,640 · women 211,390"`.
  `data.csv` row `0-4,222640,211390` — matches exactly.
- Hovered the 100+ row (oldest, top of the frame): tooltip read exactly
  `"100+: men 385 · women 1,586"`. `data.csv` row `100+,385,1586` — matches exactly.

`tooltip.hidden` was `false` in all three cases, confirming the tooltip was actually visible, not
just populated with text while still hidden.

**3. Keyboard.** First attempt used `page.click("body")` to reset focus before tabbing, and produced
a misleading result worth recording: the very first Tab landed on "55-59" with `row-active` already
set — because `body`'s own bounding-box centre, which Puppeteer's `click("body")` targets, happens
to fall inside the chart figure itself, so that "reset" click was actually a real pointer click on a
row. Corrected by clicking a point clearly outside the figure (`page.mouse.click(2, 2)`, the page's
top-left corner) before tabbing. With that fix: **the very first `Tab` press landed directly on the
100+ row-hit rect** (no other focusable element precedes it in this component's markup), and the
SAME tooltip text seen on hover, `"100+: men 385 · women 1,586"`, appeared from keyboard focus alone,
with no pointer event involved — confirming `show()` really is one function shared by both paths, not
a thinner keyboard-only readout. Pressing `ArrowDown` three times in sequence moved focus
100+ → 95-99 → 90-94 → 85-89, each stop's tooltip matching that row exactly — the same visual
top-to-bottom order the frame draws in. `Home` from partway through the list jumped straight back to
100+; `End` jumped straight to 0-4 (the bottom, youngest row) — both single-press, not a walk.

**4. 375px viewport (narrow layout).** After resizing, `getComputedStyle` confirmed the swap:
`data-layout="desktop"` now `display: none`, `data-layout="narrow"` now `display: block` — the
480px media query firing as designed. All 21 row-hit rects still present in the narrow SVG. Checked
every `<text>` element's real `getBBox()` against the narrow SVG's own `viewBox` width (360) for the
specific failure this beat's own doctrine warns is the likeliest one — a clipped central band
label: **zero elements overflowed the viewBox**, left or right, including the age-band labels in
the central gutter (the gutter's width is measured at build time from the actual widest label string
plus padding, not a fixed guess — see `SwissAgePyramidWeb.tsx`'s own `bandGutter`). The narrow SVG's
own rendered CSS width was 375px (the full viewport, via `width: 100%; height: auto`), confirming it
was genuinely the frame on screen, not a stale desktop one just resized.

**5. JavaScript disabled** (`page.setJavaScriptEnabled(false)`, then reload). The static frame
survived: title and the peak annotation label ("55-59: the widest band (669,962)") both still
present in the rendered text, all 21 row-hit rects still exist as plain SSR'd `<rect>` elements (none
of them are assembled by the script — they are markup, not DOM built at runtime), and a sampled
`aria-label` (`"Age 55-59, the widest band: 337,549 men, 332,413 women"`) was still readable straight
off the element. `#tooltip.hidden` stayed `true` throughout, confirming the interaction layer really
did nothing — no stray visible tooltip, no partially-wired state — because the inlined `<script>`
never ran at all. A keyboard/screen-reader user still reaches every row's `aria-label` via plain
`Tab` with the script entirely absent, because `tabIndex={0}` and `aria-label` are static SVG
attributes baked in at SSR time, not assembled by the script
(`web-discipline.md`, "What survives with JavaScript disabled").

**One real bug caught by driving the browser, not by reading the markup**: the first keyboard check
(step 3, first attempt) gave a wrong-looking result purely because of how the *test harness* reset
focus (`page.click("body")` landing on the chart itself), not a defect in the beat. Recorded here
per this genre's own "what went wrong, caught by looking" convention — a false alarm is still worth
naming, because it is exactly the class of thing a screenshot alone would not have caught either way,
and re-driving with a corrected click target is what actually settled it (100+ first, confirmed).

No deviations from the build plan itself. One honest gap, the same class `web-discipline.md` already
names for the line genre's own seed: 21 Tab stops with the script absent is slow for a keyboard user
who wants to reach a specific band quickly — a roving-tabindex version that collapses this to fewer
stops is the natural next iteration and is not built here.
