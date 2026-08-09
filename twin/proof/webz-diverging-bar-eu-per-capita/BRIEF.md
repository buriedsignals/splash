# Beat — Croatia is the only EU country emitting more CO₂ per person than in 1990

**Proves:** of the 27 EU member states, exactly one emits more CO₂ per person in 2024 than it did in
1990 — Croatia, by 0.03 tonnes (4.73 → 4.76). The other 26 all emit less, by 4.93 tonnes per person
on average, and Luxembourg by 20.48, the largest fall in the union.

**Medium / genre:** chart / **web**. **Type:** diverging bar — one row per country, signed values
growing left and right out of a zero line, rows sorted from the largest rise to the largest fall.

**Its siblings.** `vidz-diverging-bar-eu-per-capita` is the VIDEO of this same claim and was built
first; `static-diverging-bar-eu-per-capita` is the STATIC one. The three together are the first
complete type × genre row for the deviation family, which no genre in this corpus carried at all
before the video landed. Each is written fresh — no file here is imported from either sibling, and
the frozen `data.csv` is a copy, so this beat can be rendered and audited on its own.

**Output:** `diverging-bar-eu-per-capita.html`, one self-contained file, written beside this brief.

## Data

- Source: Global Carbon Budget (2025); population based on various sources (2024) – with major
  processing by Our World in Data, indicator `co-emissions-per-capita`.
- `data.csv`: **4,357 data rows**, the full time series for the 27 EU member states, frozen unedited
  beside this beat. `render-web.mjs` reads the two years it needs out of it and asserts that all 27
  carry a reading in both.
- Unit: tonnes of CO₂ per person, fossil fuels and industry only.

## Exact values — computed from `data.csv` (change in tonnes per person, 1990 → 2024)

| | Country | 1990 | 2024 | Change |
| --- | --- | --- | --- | --- |
| ▲ | **Croatia** | 4.7331753 | 4.764723 | **+0.0315** |
| ▼ | Cyprus | 5.8955126 | 5.373922 | −0.5216 |
| ▼ | … 24 more … | | | |
| ▼ | Estonia | 23.5025 | 6.105464 | −17.3970 |
| ▼ | Luxembourg | 30.93778 | 10.459649 | −20.4781 |

Rose: 1. Fell: 26. Mean of the falls: −4.9281. Largest fall: Luxembourg, −20.4781. Smallest fall:
Cyprus, −0.5216.

**"The only" is the fragile kind of claim**, so `render-web.mjs` asserts every part of it and throws
rather than shipping it stale: that all 27 member states have a reading in both years (a partial
field cannot support "the only EU country"), that exactly one rose, and that the remaining 26 all
fell with none exactly flat. The title, the caveat, the rule's label, the subject's annotation, all
27 tooltips, all 27 `aria-label`s and the whole alt text are derived from that same computation —
nothing in the rendered page is typed.

## What the WEB genre owes here, and what it must not do

**The governing rule: the `<svg>` carries geometry only — zero `<text>` elements.** Every word is
HTML positioned in `%` over the same grid cell, at a fixed pixel font size. Geometry stretches; type
does not. Verified: the title measures 24px at 1600, 1024 and 375.

**What hover honestly adds, and what it must not repeat.** The static sibling already prints every
row's CHANGE beside its bar, so a tooltip restating "−20.48" would be `web-discipline.md`'s named
anti-pattern — the same number repeated on demand. What the static frame genuinely had to omit is
the PAIR of readings the change is made of: it has no room for 54 more numbers. So hover, tap and
keyboard focus reveal exactly that, unrounded, and nothing more dramatic —
`Malta · 1990: 6.5977826 · 2024: 3.2037206 · change −3.3941 t per person`. Every row also carries
that reading in its own `aria-label`, baked server-side, so a screen-reader user reaches it with
Tab alone and with the inline script absent entirely.

**No filter, and that is the outcome of the test, not an omission.** `SKILL.md`'s three-part test
fails at part 1: the only dimension a reader could narrow here is the sign, and one side holds a
single row — a control whose two options are "26 rows" and "1 row" is a control invented because
the mechanism exists. Thirteen of the corpus's shipped web beats reach the same answer.

**Nothing argument-bearing sits behind an interaction.** The title, the caveat, the source, all 27
bars, all 27 printed values, all 27 names, the zero line, the average rule and its label, and the
subject's own annotation are drawn unconditionally. `diverging-interaction.mjs` has no code path
that can reach any of them: it touches a `.row-hit`'s own class and the shared `#tooltip`, nothing
else.

**Four grid columns and three grid rows** — this beat's own departure from the seed's two-column
grid, and the fluid frame's version of the static sibling's two measured gutters. A diverging bar
prints its value label just outside its bar's growing END, which is LEFT for a fall and RIGHT for a
rise, and both extremes overflow the plot: the longest fall ends at ~2% of the plot and the only
rise starts at the zero line, which this domain puts at ~98%. So the plot sits between two
fixed-pixel gutter tracks measured in node from the widest label that will actually be drawn in
each, with the country names in a third track OUTSIDE the left one. Without the left one, "−20.48"
runs into "Luxembourg" — which is precisely the `Luxembo—20.48` the video sibling shipped on its
first render. The third grid ROW holds the average rule's label, which has to sit at the rule's own
`%` and cannot land on a data row.

## Anti-patterns for this case

- **The domain genuinely straddles zero**, and the component throws if it ever stops doing so.
- **The domain is not made symmetric.** Equal units per pixel either side of zero is what makes two
  bars comparable; the visible asymmetry is the data's.
- **The zero line is drawn on top of the bars**, so no fill can cover it.
- **Croatia's bar is not given a minimum visible width.** It is ~2px at 1600 and 0.4px at 375
  because it is 0.03 tonnes on a 21.3-tonne domain. Padding it up would be a false statement about
  length on a type whose entire encoding is length. Three motionless signals carry the subject
  instead: an accent-tinted band across its row, a bold name, and a direct annotation printed into
  the empty half of its own row — the span left of zero that this one row, uniquely, does not use.
- **Only rectangles and axis-parallel lines live in the stretched `viewBox`.** There is no round
  mark whose shape carries meaning, so `preserveAspectRatio="none"` says nothing false here
  (`web-discipline.md`, "What preserveAspectRatio='none' costs").
- **Every value label is signed explicitly**, with U+2212 rather than a hyphen, and stays in page
  ink on an opaque chip. A label in the bar's own fill is this family's named WCAG failure.
- **Two fills, one per sign — and the second is not an invented hue.** See `PALETTE.md`.

## The row-height floor, and why it is 13px

Height follows width through `aspect-ratio`, which is right for a line chart and wrong for 27
stacked rows: at 375px the frame's natural plot is ~250px and 27 rows inside it are 7px apart. So
`.chart-plot` carries an inline `min-height` of `27 × MIN_ROW_PX` plus the two fixed rows.

`MIN_ROW_PX` is set as high as the WINDOW FIT allows and no higher, because the fit is the rule that
wins: **measured at 375 × 812 the document is 812px in an 812px window — 0px of overflow**, with the
figure at 672px and the source line's bottom at 648px. One pixel more per row is 27 more pixels and
the source line starts leaving the screen. The cost is stated rather than hidden: at 375px the rows
are 13px apart under a 13px type, which is the tightest leading in this corpus.

## Verification — driven in a real browser, then looked at

`bun skills/twin-chart-web/scripts/verify-web.mjs --file diverging-bar-eu-per-capita.html --shots`
→ **54 checks passed, 0 failed, 7 skipped** (every skip is a filter check, and this beat ships no
filter). Then an independent probe at 1600 × 900, 1024 × 768 and 375 × 812, dispatching
`page.mouse.move` at **rounded integer** client coordinates — fractional ones silently do nothing,
which has already cost this project one wrong verification round.

| | 1600 × 900 | 1024 × 768 | 375 × 812 |
| --- | --- | --- | --- |
| document vs window | 900 / 900 | 768 / 768 | 812 / 812 |
| overflow | 0px | 0px | 0px |
| plot box | 1552 × 704 | 976 × 572 | 327 × 401 |
| hover: rows answering with their OWN detail | 27 / 27 | 27 / 27 | 27 / 27 |
| topmost element at a row's left edge | `rect.row-hit` | `rect.row-hit` | `rect.row-hit` |

Keyboard, at every width: one Tab reaches Croatia and opens its detail box; ArrowDown twice reaches
Portugal and reports `1990: 4.5358243 · 2024: 3.4089074 · change −1.1269`. The `aria-label` beneath
it reads `Croatia: 4.7331753 tonnes per person in 1990, 4.764723 in 2024, change +0.0315`.

**The overlay does not swallow the pointer.** A probe placed on the centre of the subject's own
annotation — an `.overlay` child, the exact pixel class where this genre once shipped a completely
dead hover while `.focus()` kept working — reports `rect.row-hit` as the topmost element and answers
with Croatia's own reading, at both 1600 and 375.

**No rule and no gridline crosses a minus sign — checked by looking, at 4×.** The dashed average
rule at −4.93 passes beside −3.39, −3.94, −4.01, −4.09, −4.55 and −4.80 with every minus intact:
where the rule's own path runs through a label it is interrupted by that label's opaque chip and
resumes above and below the row. This is the defect the video sibling shipped and had to fix — its
conclusion rule struck through four labels and turned "−3.39" into what reads as "+3.39", a reader
seeing a country RISE that fell — and here it is closed structurally rather than by draw order: the
words live in the HTML layer, which is painted above the whole `<svg>` by construction.

## Found and NOT fixed, stated rather than hidden

- **At 375px the value-label chips occlude most of the average rule and the inner gridlines.** With
  the plot 143px wide, 27 opaque chips form a near-continuous column and the rule survives only as
  disconnected dashes between rows. It is the right side of the trade — a chip that lets a rule
  through is a chip that lets a rule cross a minus sign, which is a claim defect rather than a
  legibility one — and the rule's position is still stated by its own label above the plot. Closing
  it properly means giving the phone case a different label placement, which is a decision about the
  frame, not a patch at the CSS.
- **Consecutive value-label chips overlap by 2.1px at 375px** (15px chip on a 13px row). Measured;
  the glyphs themselves do not touch, because a 13px digit is ~9px tall inside its own line box.
- **The subject's annotation chip extends ~11px left of the band it sits on**, at narrow widths, so
  its tint continues a few pixels past the `<svg>`'s own left edge. Same colour, so it reads as one
  band; it is a 1px step at the top and bottom edges, not a collision.

## A guard gap found while proving these beats can go red

`claims-grounded-in-data.test.ts` reads a reader-facing string either as `prop:` inside an object or
as a `const` whose own name is a reader-facing prop. Its expression reader does not treat `;` as a
terminator, so **a claim `const` declared immediately after another claim `const` is swallowed by
its predecessor's expression and never scanned** — the scan's own `lastIndex` is advanced past it.

Measured on a COPY of this tree (never the shared one — one agent's mutation here has already turned
the suite red for five other people): with `title` and the caveat/subtitle as consecutive `const`s,
replacing a figure inside the SECOND one with a value the frozen data cannot reproduce left the
guard **GREEN**. Both beats' claim strings now live in one `words` object instead, where every entry
ends at its own comma — which the reader does terminate on — and the same mutation turns the guard
**RED**, naming the line, the prop and the value. The tests themselves are untouched; this is a
change to the beats, not to the guard.

The guard's own limitation is worth recording separately, because it applies to every beat in the
corpus that declares two claim strings in a row and is not something these two beats can fix for
anyone else.

**And a second limitation, quantified on this beat's own data:** with 4,357 readings frozen beside
it, small values ground by accident. `0.05` and `4.71` — neither of them true of this chart — both
ground here (`0.053945992` and `4.712864` are real rows). The mutation proof above had to use
values no rounding of any reading can reach. This is the guard's own documented
grounds-by-coincidence hole, met in practice.

## Source line

`Source: Global Carbon Budget (2025); population based on various sources (2024) – with major processing by Our World in Data · fossil fuels and industry only`

## Alt text

Computed by `render-web.mjs` and shipped as the `<svg>`'s `<desc>`. `role="img"` is deliberately NOT
set on the root — it would flatten the 27 individually focusable, individually labelled row rects
into one opaque image, which is this genre's one documented departure from the static genre's
accessibility pattern.
