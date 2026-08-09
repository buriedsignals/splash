# Beat — France's per-capita CO₂ emissions peaked in the 1970s (web)

**Type:** box plot. **Medium/genre:** chart / web. **Channel:** article web — two responsive
rungs, 900px desktop and 360px narrow (`web-discipline.md`, "Responsive behaviour" — two
pre-rendered layouts, not a live reflow).

## Claim

France's annual per-capita CO₂ emissions peaked in the 1970s (median 9.96 t CO₂ per capita) and
have fallen in every decade since, down to a median of 4.27 t in the 2020s (n=5, a partial decade
covering 2020-2024 only; every other decade shown is a full n=10).

Verified against the computed medians, not assumed: 1950s 5.41 → 1960s 7.59 → **1970s 9.96 (peak)**
→ 1980s 7.43 → 1990s 6.92 → 2000s 6.75 → 2010s 5.17 → 2020s 4.27. `render-web.mjs` re-derives this
independently of the static beat's own `render.mjs` (a beat never imports another beat's files) and
throws rather than draw a claim its own numbers don't support. The numbers match the static sibling
beat's exactly — same source file, same bucketing, same Tukey rule, two independent
implementations.

## Subject and accent

One hue (`#0072B2`, Okabe-Ito blue) for every box — a single-group comparison across decades, not
two groups being compared, so `boxplot.md`'s "no more than two, and only if deliberately comparing
two groups" rule keeps it at one. Median line and outlier value labels are in ink (`#000000` on the
white ground), never the box's own fill or stroke colour. Decades keep their natural chronological
order left to right — never resorted by median, and never re-orderable by interaction — because
this is a time-ordered categorical axis where the order is itself part of the story.

The value axis is fitted to the data (`.nice()`d) and does **not** start at zero — a position
encoding, not a length one. The desktop layout's top tick carries the full unit
(`10 t CO₂ per capita`); the narrow layout's carries a short form (`10 t`) — see "What changed
between desktop and narrow," below.

## Source

Global Carbon Budget 2025, via Our World in Data ·
`co-emissions-per-capita.csv?country=~FRA&csvType=filtered` · France, 1950–2024 (75 annual
readings, verified `Entity` column contains only `France` after fetch), extracted 8 August 2026.
`data.csv` is a byte-for-byte copy of `proof/more-boxplot-france-co2-decades/data.csv` (the static
sibling beat's own frozen file) — same source, re-parsed independently per this genre's "duplicate,
do not link" rule.

## Outliers — what the Tukey rule found

One decade produced a Tukey outlier: **1980s**, where 1980's own reading (9.54 t) sits above the
decade's upper fence — the tail end of the 1970s oil-crisis-era highs carrying into the first year
of the next decade. It is drawn as an individual dot above the 1980s box, labelled `9.5` in ink
(three or fewer outliers still get a printed value, per `boxplot.md`), and the 1980s whisker is
clipped to 1981's reading (8.53 t), not stretched up to 1980's own value. No other decade produced
an outlier.

## Interaction

`boxplot.md`'s own line names the gap this genre exists to close: "once there are many [outliers],
drop the per-point labels and let hover or focus carry the value instead." Reading it against this
beat's own static frame surfaces a wider version of the same gap — the static frame never prints
Q1, the median, or Q3 as a number for ANY decade, only their positions as box edges and a median
line, and it only ever prints an outlier's value when a decade carries three or fewer of them. That
compression is exactly what a box plot is *for* (`boxplot.md`: "compresses a distribution into a
five-number summary"), but it means a reader who wants the actual figures — not just their relative
positions — has nowhere to look on the static frame.

So each of the eight decades gets its own hit rectangle spanning the full plot height and that
decade's own `scaleBand` bandwidth (`.cat`, `DecadeBoxplotWeb.tsx`), carrying its own `tabIndex`,
`aria-label` and `data-detail` baked in server-side. Hovering, tapping, or keyboard-focusing a
decade reveals its full five-number summary, its Tukey fence (the drawn whisker ends), its `n`, and
— regardless of how many there are — every outlier's own value and year, e.g.:

```
1970s (peak) · median 9.96 t · Q1 9.63 · Q3 9.99 · whisker 9.13–10.40 t · n=10, no Tukey outlier
1980s · median 7.43 t · Q1 7.06 · Q3 8.03 · whisker 6.88–8.53 t · n=10, 1 outlier: 9.54 t (1980)
```

**Why not the line genre's shared nearest-by-x hit area.** This beat's x-axis is categorical, not
continuous — there is no meaningful "nearest reading" between two decade columns, only "which
column is the pointer inside." Reusing `assets/interaction.mjs`'s `nearestIndex` (or the scatter
beat's 2D `nearestPointIndex`) would answer a strictly worse version of the same question a plain
per-category hit rectangle answers directly. `boxplot-interaction.mjs` is this beat's own script —
no distance math at all, just per-rectangle `pointerenter`/`pointerdown`/`focus`/`blur` wiring, plus
`ArrowLeft`/`ArrowRight`/`Home`/`End` to move focus between decades in DOM (chronological) order.

Everything the static beat already prints — title, source, gridlines and their unit, every
whisker/box/median line, every category label and its `n`, and the ≤3-outlier printed value labels
— stays unconditional SSR'd SVG. Hover/focus only ever toggles a `.cat` rectangle's own class and
the shared `#tooltip`; it cannot hide or move anything else.

## What changed between desktop and narrow (caught by actually rendering at 375px and looking)

The first render at 900px looked correct and passed every unit-testable check, but rendering the
narrow (360px) layout and opening it in a real browser at 375px showed the eight decade labels
("1950s1960s1970s…") smashed into each other, unreadable — `web-discipline.md`'s own gotcha about
this genre exactly: "a behaviour over time... not a frame," and the collision only showed up once
the file was actually looked at.

Root cause, found by measuring rather than guessing: the narrow layout's left gutter was sized
against the y-axis top tick's full unit string (`"10 t CO₂ per capita"`, ~84px at 10px font) — on a
360px-wide frame that alone consumed nearly a quarter of the total width, leaving too little room
for eight decade bands to hold their own 5-character labels. Fixed with two new layout knobs
(`WebLayout.axisUnit`, `WebLayout.outlierGutterPx`) so the narrow layout can use a short axis unit
(`"t"`) and a tighter outlier-label margin — both measured against the real width, not assumed —
plus `fitCategoryLabel`, which measures each decade's own label against its own band width and
falls back to a 2-digit abbreviated form (`"'50s"`) before throwing, rather than ever silently
overlapping. At the tuned narrow band padding all eight decades' full 5-character labels fit
without abbreviation — confirmed by reading the rendered narrow SVG's own text nodes, not assumed
from the fix alone.

## Verification — driven in a real browser, 2026-08-08

Driven with Puppeteer (real Chrome, not a headless stub with no rendering) against the built
`boxplot-france-co2-decades.html`, loaded via `file://`.

1. **Desktop load, 1000px viewport, before any interaction.** The first `<text>` node read back as
   the full title ("France's per-capita CO₂ emissions peaked in the 1970s and have fallen…"); the
   SVG's own text content contained "Global Carbon Budget"; all eight decade axis labels
   (`1950s`…`2020s`) were present as literal text nodes. A screenshot at this rung
   (`desktop-1000.png`) confirms the frame visually: title, source, y-axis with unit, eight clean
   boxes with visible whiskers, the 1980s outlier dot and its `9.5` label, and all eight category
   labels with their `n` readable with clear gaps — nothing overlapping.

2. **Hovering three decades and reading the tooltip.** Moved the pointer onto each decade's own
   `.cat` rectangle and read `#tooltip`'s live text:
   - **1970s** → `"1970s (peak) · median 9.96 t · Q1 9.63 · Q3 9.99 · whisker 9.13–10.40 t · n=10,
     no Tukey outlier"` — matches the computed summary table exactly (q1 9.63, median 9.96, q3
     9.99, whiskerLo 9.13, whiskerHi 10.40, n=10, 0 outliers).
   - **1980s** → `"1980s · median 7.43 t · Q1 7.06 · Q3 8.03 · whisker 6.88–8.53 t · n=10, 1
     outlier: 9.54 t (1980)"` — matches the summary table (q1 7.06, median 7.43, q3 8.03, whiskerLo
     6.88, whiskerHi 8.53) and the raw data (1980's own row is `9.538364`, rounds to 9.54). A
     screenshot of this hover (`hover-1980s.png`) shows a light grey wash over the full 1980s
     column and the tooltip box sitting above it with this exact text, legible over the plot's own
     gridlines.
   - **2020s** → `"2020s · median 4.27 t · Q1 4.07 · Q3 4.46 · whisker 3.97–4.65 t · n=5, no Tukey
     outlier"` — matches the summary table, including `n=5` for the partial decade.

   In all three cases `#tooltip[hidden]` was `false` while hovering and the text matched the
   summary table computed independently by `render-web.mjs` from the raw CSV — not just what the
   component intended to draw.

3. **Keyboard-only: click into the page body, then Tab repeatedly.** The 40th Tab landed on the
   first `.cat` rectangle in the DESKTOP svg (`data-decade="1950s"`), and `#tooltip` was
   simultaneously showing `"1950s · median 5.41 t · Q1 5.22 · Q3 5.82 · whisker 4.83–6.17 t · n=10,
   no Tukey outlier"` — the exact same string hover produces for that decade, confirming focus and
   hover share one `show()` path, not a degraded keyboard-only variant. Pressing `ArrowRight` moved
   focus to `data-decade="1960s"` and the tooltip updated to that decade's own detail
   (`"1960s · median 7.59 t · Q1 7.09 · Q3 8.11 · whisker 6.43–8.87 t · n=10, no Tukey outlier"`),
   confirming the arrow-key shortcut works without a second Tab press.

4. **Resized to 375px wide.** `getComputedStyle` on both SVGs confirmed the media query fired
   correctly (`desktopDisplay: "none"`, `narrowDisplay: "block"`); `document.documentElement`
   reported no horizontal overflow (`scrollWidth <= clientWidth`); all eight decade labels were
   present as literal, unabbreviated text nodes in the narrow SVG. The `narrow-375.png` screenshot
   confirms visually — after the fix described above, the eight decade labels read cleanly with
   visible gaps between them, the top tick reads `10 t` (the narrow layout's short unit), and
   nothing is clipped at the frame's right or bottom edge.

5. **Reloaded with `page.setJavaScriptEnabled(false)`.** The desktop SVG's text content still
   contained the title, the source line, and all eight decade labels; the SVG carried 17 `<rect>`
   elements (the ground rect, 8 drawn boxes, 8 hit rectangles — all present as plain markup even
   though none of them can be hovered without the script) and 39 `<line>` elements (whiskers, box
   caps, medians, gridlines). The `no-js.png` screenshot shows the identical static frame the JS-on
   render shows — title, source, all eight boxes with whiskers, the 1980s outlier and its printed
   `9.5` label, all category labels and their `n` — confirming the static argument survives
   untouched with the script absent, exactly `web-discipline.md`'s own invariant. What does NOT
   survive with JS off (not tested here beyond structural presence, per that same doctrine): the
   visual tooltip box and the Left/Right/Home/End shortcuts — a screen reader / keyboard user still
   reaches every decade's `aria-label` via plain Tab, since `tabIndex={0}` is a static SVG
   attribute independent of the script having run.

## Deviations from the task brief

None. The one thing not explicitly anticipated by the brief — the narrow-layout label collision —
was caught by the mandatory "drive a real browser and look" step the brief itself required, fixed
by measuring rather than guessing, and re-verified at the same 375px rung before being called done.
