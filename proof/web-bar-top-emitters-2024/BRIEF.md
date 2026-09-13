---
format: web
type: column
---

# Beat — La Chine a émis plus de CO₂ en 2024 que les 5 pays suivants réunis (web)

**Type:** bar and column (ranking, vertical columns). **Medium/format:** chart / **web**.
**Frame:** fluid. **Static sibling:** `proof/static-bar-top-emitters-2024` — its frozen data, its
claim, its words and its colour rules are the floor this page starts from.

## Claim

Of the ten countries that emitted the most CO₂ in 2024, China's **12,29 Gt** exceeds the next
**five** added together (**11,65 Gt**), and is 2,5 times the United States' 4,90 Gt. The ten
together carry **68,9 %** of the world total.

Every figure is computed in the runner from the frozen file and printed before the render. The ten
members and their order are a ranking, not a list: 215 rows whose `Code` is a bare ISO-3166 alpha-3
are kept and 32 OWID aggregates dropped, both counts printed, which is what stops "Asia" from
topping a chart of countries. **"the next five" is a search**: countries below the subject are added
one at a time and the count stops at the last one still under its total. If the data moved so the
answer were three, the headline would say three; fewer than two and the beat throws rather than draw
the comparison.

## The interaction, written before the code

`chart-web/references/directed-interaction.md`, rule 1. The same declaration is carried into the
render as `props.interaction`, so `assertInteractionPlan` checks this promise against the markup the
page actually ships and the two cannot drift apart.

**What this page earns.** A still of this ranking prints ten numbers and a fixed bracket over five
of them. It cannot say what any one of those columns is worth *against the world* — the plate draws
only the ten, which are 68,9 % of the total, so a column's height is silent about the other 31,1 % —
and it can run the headline's own arithmetic **only on the subject the author chose**. The scrolly
sibling stacks the followers against China *for* the reader, as a sequence; the still asserts it with
a bracket. This page is the only one of the three where **the reader picks the reference and watches
the addition happen** — against any of the eight columns the plate can draw the answer for, not only
against China.

### Control 1 — ask a mark

- **The reader's question:** « Cette colonne, elle pèse combien dans le total mondial — et combien de
  pays faut-il additionner, plus bas dans le classement, pour l'égaler ? »
- **The gesture:** `ask-a-mark` — hover, tap or keyboard focus on a column.
- **What changes in the picture:** the column's own mark lights, and the answer box prints two
  readings the plate holds nowhere: **that country's share of the world total** (12,7 % for the
  United States, against China's 31,8 %) and **how many countries below it in the full 215-country
  ranking must be added together before they match it** (2 for the United States, 3 for India, 6 for
  China). The second is the headline's own arithmetic asked of every rank instead of only of the
  subject; it is computed over the whole ranking, not over the ten drawn, which is why the answers
  for the bottom ranks name countries that are not on the plate — the reading line says so.

Both readings are derived in the runner from the frozen file, asserted there, and baked into the
answer server-side. The browser never formats a number.

### Control 2 — stack the followers against any column

- **The reader's question:** « Et si je pose la question à un autre pays : à partir de combien de
  pays du dessous est-ce qu'on l'égale, et à quoi ça ressemble ? »
- **The gesture:** `toggle-a-comparison` — a radio group, « Empiler contre : », one option per
  column the plate can answer for, plus the option that is the plate itself.
- **What changes in the picture:** the columns below the chosen one **leave their bands and stack on
  each other**, one on top of the next, in the band immediately to the right of it, until the tower
  reaches or passes its height. The chosen column and the stacked ones take the accent; the other
  columns step back to the same neutral the nine non-subjects already wear. The stacked columns'
  own value labels go with them; the country names stay under their now-empty bands, in the accent,
  so the reader can see **which** countries went into the tower. One sentence appears under the
  control with the count and the running total — « les 6 pays suivants · 12,45 Gt réunis · la Chine :
  12,29 Gt ».

**The count is not re-derived.** `followersNeeded` already computes it, once, over the full
215-country ranking, for the hover answer control 1 gives. The same returned `{ n, sum }` is what
builds this control's options, its tower and its sentence: one arithmetic, three readers.

**No script.** The control is native radios in a `<fieldset>` plus CSS generated at build time —
`:checked` and `:has()`, exactly the mechanism `chart-web/assets/filter.ts` narrows with, and
nothing else. For each of the eight options the build emits the transform that carries each needed
follower onto the tower (its own `translate()` in `viewBox` units, so it tracks the geometry at every
width), the fills, the labels that go with the columns they belong to, and the sentence that appears.
Counted on the delivered file: **94 rules across the eight options, plus five in the base block** —
nine per option and one more per moved column, which is the only rule that cannot be grouped.
Driven with the script disabled entirely, in all three directions: clicking « Chine » checks the
radio, moves five columns (the sixth is the tower's own base and does not move), and reveals the
sentence; with nothing chosen the page is the complete ranking, which is the state it ships in.

**What the reader lights is a mark, never the frame.** The names under the ten bands, and the region
each band answers a pointer for, do not move under any option. This was measured rather than assumed:
the first build carried each column's own hit point with it onto the tower, and driving it produced
the one thing `interaction.mjs` calls the worst answer an interactive chart can give — the script
resolves a pointer to the nearest mark BY X, off the `cx` attributes it reads once at init, which a
CSS transform never changes, so hovering anywhere on China's six-column tower answered « États-Unis »
while the box anchored on whichever mark had moved there. A filter does not move the frame its marks
were measured against and neither does this: a reader hovers a BAND, the band's name is printed under
it, and the answer is that band's country. Verified in all three directions under a chosen option —
the Inde, Iran and États-Unis bands each answer with the name printed beneath them.

**The lit names take the accent and not a bold.** The plate may light ONE name with an accent and a
weight together — that is a single subject the author picked — but an option lights three to seven,
and doubling the accent across that many 11 px names thickens the tightest row on the page. Measured
while deciding it, and recorded so the number is not re-read as a defect: with those names bolded,
`verify-web`'s revealed-typeface probe reported « Open Sans 700 really DRAWS the words it reveals »
as failing at **0,3 px of 956 px**. That is a FALSE red. Probed directly on the delivered page,
« Chine » at 11 px/700 sets **31,32 px** in `"Open Sans", Helvetica, …` against **30,56 px** with Open
Sans taken out, and `document.fonts` holds the 700 face as `loaded`: the face draws. The probe
concatenates every character it has seen in one (stack, weight, style) into a single bag, and over a
bag the size of ten country names the per-character differences between Open Sans Bold and Helvetica
Bold cancel to 0,06 px. The rule shipped is the design's answer, not a way around the probe.

**Two of the ten ranks get no option, and that is a measurement, not an omission.** Corée du S. needs
Canada and the Allemagne needs le Canada and le Brésil — countries the plate does not draw. An option
whose tower is one column short of what its own sentence claims is a picture that lies, so the build
refuses to offer it: `render-directions-web.mjs` keeps only the ranks whose whole run of followers is
on the plate, prints the two it dropped and why, and throws if fewer than two survive. Both countries
still answer control 1 with their own `n` on hover, which is the channel that does not need the
columns to be drawn.

### What was considered and is not shipped, with the measurement

- **The cumulative share through this rank** ("les 2 premiers pèsent 44,5 % du total"). A genuine
  ranking reading, invisible in a bar chart, and it was refused on composition: the format's answer
  box is `max-width: 220px` and the two readings above already set **five lines** in the direction's
  own body size at 375 px. A third reading is a sixth and seventh line for a number the caveat
  already states at rank 10 (68,9 %).
- **"×2,5 les États-Unis", the ratio to the next column.** Refused as the weak form
  `directed-interaction.md` names outright: it is the ratio of two lengths both drawn, side by side,
  on a shared zero baseline — precisely the reading a bar chart's encoding is best at. The headline
  already states it once, in words, for the one pair it is about.
- **A filter.** This beat declares none and `verify-web.mjs` skips its five filter checks
  accordingly. A ranking of ten carries no dimension orthogonal to the encoded variable, so any
  narrowing would take marks out of the ranking the claim is made over. Control 2 is a radio group
  in the same idiom and it is **not** a filter: nothing leaves the page, the frame does not move, and
  the ten columns are all still drawn under every option.
- **The fixed bracket, which this page used to draw.** It spanned the five columns the headline adds
  up and captioned them with their sum — the answer, pre-made, in the one place the reader cannot ask
  it anywhere else. That is the still's job and the still still does it. Here it was also the thing
  standing where the reader's own comparison had to be built, so it is gone and control 2 is what
  replaced it. Its own clearance arithmetic went with it; what that arithmetic was for is recorded
  below.

Everything the plate states is drawn unconditionally and survives with JavaScript off: the ten
columns, their printed values, the caveat, the reading line and the source. The comparison the
headline makes is no longer *drawn* for the reader — it is the first option of control 2, one
keystroke away, and it works with the script absent.

## Treatments spent

- `every-bar-labelled-lets-the-axis-go` — each column prints its own number, so the page carries a
  **zero baseline and a stated unit instead of a value axis**. A length encoding still needs its
  zero and has one; what it does not need is a ruler nobody reads once every bar is written.
- `accent-marks-the-thread` — one column is the subject and carries the direction's accent; the
  other nine are one neutral step off the direction's own ground, taken to the non-text floor. A
  ranking where every bar shouts has no subject.

`accent-marks-the-thread` is spent **twice** here, and the second spending is the reader's. At rest
the accent is on the subject alone. Under a chosen option it is on the chosen column and on the
columns stacked against it — still one accent, still one thread, but the thread is now the comparison
the reader asked for rather than the one the author picked. Nothing else on the page changes colour,
and the nine-versus-one shape of the default is exactly the shape of every option.

## This type's own trap, and the form it takes here

`references/types/bar-and-column.md` names one trap: a value label printed inside or against a
coloured bar needs its contrast measured **against that exact fill**, and a naive luminance
threshold mis-picks white on a mid-toned hue.

**Its literal form is absent, and deliberately so.** Every value is printed *outside* its column, on
the ground, which is the same side-step the static sibling records. Nothing on this page sits on a
fill, so `inkOnFill` — the repertoire's own implementation of the trap's remedy, which measures both
poles against the fill and takes the higher — is not reached for and is not claimed.

**Its reason survives, and it was open.** The trap's reason is *a rule standing in for a
measurement*, and this page had three places where the accent was used as **type** on the strength of
the direction having chosen it: the eyebrow (crème's `eyebrow` register reads its ink from the
accent), the subject's value label, and the subject's own name on the x-axis. Control 2 takes that
from three places to twelve — under a chosen option the accent sets a value label and a name on the
reference and on every column stacked against it — which is nine more places one measurement now
covers, and the reason it was worth asserting rather than assuming. An accent is picked to
be legible as a mark — a 3 : 1 floor — and 11-px type is held to 4.5 : 1. Nothing measured the
difference. Measured now, at build time, against each direction's own ground: crème **6.64 : 1**,
nocturne **10.80 : 1**, rapport **7.09 : 1**. All three pass, so nothing on the page changes; what
changes is that a fourth direction whose accent does not pass stops the render instead of shipping
type a reader cannot read. The assertion is `assertLegible(accent, ground, { role: "text" })` and it
is measured, never adjusted: `adjustToContrast` walks a colour 2 % toward a pole even when it already
passes, so adjusting here would darken three accents that are correct.

## What the bracket's clearance arithmetic was for, and where it went

The bracket was **HTML in the overlay, not a path in the `viewBox`**, and that was not a style
choice. The `<svg>` carries `preserveAspectRatio="none"`, so a constant in geometry space is not a
constant in reader pixels: the 26 `viewBox` units the bracket first sat above its tallest column were
42 CSS px on a 682 px plot and **8.5 CSS px on the 137 px plot a 320 px window produces**. The
caption rode on the bracket and the value label it had to clear is a fixed CSS height the direction
decides, so the two collided at every width at or below 480 px — measured on the delivered files at
21.5 px of overlap on crème at 480, 28.7 px at 375, 27.1 px at 320. The remedy was to state the
clearance in the reader's own pixels (`leadOf(value) + 2 + 4 + 8`), and a second refusal held the
caption to one line inside the narrowest plot this format is verified at.

**All of it is gone with the bracket, and none of it was thrown away as wrong.** The rule it taught
is what decided where control 2's sentence goes: *a line of type anchored to geometry is a collision
waiting for a narrow window*. So the stack's own sentence is **not** anchored to the tower. It is a
paragraph in the figure's flex column, directly under the control that produces it — the same place
and the same mechanism `filter.ts` puts its narrowing note, where it cannot collide with a value
label at any width because it is not in the plot at all. Its row is reserved whether or not an option
is chosen (`min-height` on the container), so choosing one never moves the plot.

What is still stated in reader pixels, for the same reason the bracket had to be: nothing. The stack
is pure geometry — each follower's `translate()` is in `viewBox` units, which is exactly right,
because a column moving onto another column must scale with the columns and not with the type.

## What is still wrong at phone widths, and why it is not closed here

**The plate is a comb below roughly 500 px, and it is the type's own density limit, not a placement
bug.** At 320 px the plot is 272 px wide and ten bands are 27 px each, while one value label sets
46.4 px and one country name ("Corée du S.") sets 61 px in the direction's own registers. Measured
on the delivered files, counting only label-on-label overlaps:

| width | crème | nocturne | rapport |
| ---: | ---: | ---: | ---: |
| 320 | 17 | 19 | 17 |
| 375 | 16 | 17 | 16 |
| 480 | 3 | 5 | 3 |
| 768 and above | 0 | 0 | 0 |

Eight value labels overlapping their neighbours and eight or more country names overlapping theirs,
in every direction.

No arrangement of upright labels fits: ten labels at their real widths need ~400 px of a 272 px
plot. `references/types/bar-and-column.md` gives exactly three remedies for a comb — group the tail
into "Other", filter to what the headline is about, or transpose — and the first two would change
the claim, which rests on *the top ten* being 68,9 % of the world. So the remedy is the **transpose**
the static sibling has already designed and written up: rows down the frame, each country's name
horizontal in a gutter sized to the widest label present, the value to the right of its bar, and the
comparison redrawn as a **mark across the subject's own bar at the point the next five add up to**
(`static-bar-top-emitters-2024/BRIEF.md`, "What the other sizes do"). That beat refused it only
because a pinned 1080 px-tall portrait frame left 38,5 px per row against a 39 px floor — an
arithmetic a fluid web page does not have.

That is a second plate, not a placement fix, and it is a form decision this beat's siblings share.
It is named here with its numbers rather than half-solved.

**And the control is now the tightest thing in the vertical budget at 375 px, measured and only just
clear.** This format fits the whole figure in the window (`.chart-figure`'s `max-height: 100dvh`) by
letting the plot absorb the shortfall down to a 120 px floor and nothing else. Adding the control's
own rows spent that slack. The first build overflowed nocturne by **14 px at 375 × 812** — the source
line under the fold, `verify-web` red on two checks — and it was closed by paying for it rather than
by shrinking the plot further: the reading line was rewritten to the same two facts in two sentences
instead of three, the control's pills took 10 px of side padding instead of the filter's 12 (nine
options is more than a filter carries, and at 375 px two pixels a pill is a whole wrapped row), and
the two margins the control adds came down by 2 px each. Measured after, at 375 × 812:

| direction | header | control | sentence | plot | reading | source | document |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| crème | 264,6 | 79,2 | 19,5 | 165,0 | 113,1 | 37,7 | **812** |
| nocturne | 348,2 | 100,0 | 18,8 | 122,0 | 108,8 | 36,3 | **812** |
| rapport | 216,4 | 79,2 | 19,5 | 165,0 | 113,1 | 37,7 | **812** |

Nocturne's plot sits 2 px above its own floor: its uppercase display wraps to four lines at 375 px and
takes 348 px of the 812 before anything else is drawn. It fits, and it has no room to spare — so the
transpose named above is now load-bearing for a second reason, and a direction with a taller display
than nocturne's would overflow rather than shrink.

## Verification

`verify-web.mjs --file renders/<direction>.html` — crème **99 passed, 0 failed, 5 skipped**, nocturne
**99 / 0 / 5**, rapport **93 / 0 / 5**. Every skip is the filter's; this beat declares none, and
control 2 is not one (nothing leaves the page). The counts differ by direction because the typeface
probe runs once per face the page embeds.

**Control 1** was driven in every direction at 1400 × 900 before this pass and again after: a real
pointer over all ten columns answers ten distinct readings in each, Tab walks all ten in ranking
order, each `.pt` carries its own `aria-label`, and the answer box announces through
`aria-live="polite"`. A tap is verified as a real touch sequence rather than as a pointer
(`touchStart → 150 ms → touchEnd → 500 ms` at 390 × 844 through CDP) — see the patch in
`render-directions-web.mjs` and the measurement behind it.

**Control 2 was driven the same way, option by option, in all three directions** — 294 assertions,
all green, every one measured off the rendered rectangles rather than off the markup:

- with nothing chosen: the untouched option is checked, no sentence is revealed, the subject alone
  carries the accent, the ten columns stand in their own bands and every one sits on the zero
  baseline;
- for each of the eight options, clicked with a real pointer: exactly one sentence appears; the tower
  carries as many columns as that sentence counts; every stacked column stands in one band; each one
  sits on the one below it (bottom within 1,5 px of the previous top); the tower stands on the zero
  baseline; **its top reaches or passes the column it is stacked against**; the value labels that
  went are exactly the ones that moved; the names of the reference and of its run are the ones lit;
  the default subject steps back unless it IS the reference; and the plot does not move when the
  sentence appears;
- keyboard: Tab alone reaches the radio group (12 hops from the top of the document), and an arrow
  key moves the selection and the picture with it;
- under a chosen option, the hover answer still names the band it is over, in all three directions.

**With JavaScript disabled entirely**, in all three directions: the page prints 34 runs of words at
rest (title, caveat, reading line, source, the ten names, the ten values and the control's own
legend and nine labels), a real click on a pill checks it, five columns move onto the tower, and the
sentence appears. Nothing on this page needs the script except the hover/tap answer, which is
control 1's and was already so.

**Every guard this beat and its vocabulary ship was reddened by a named mutation**, run against the
real beat: offering the two ranks whose run leaves the plate (`KOR: 1 colonnes empilées pour un
compte de 2`); stacking one column twice; stacking a column that ranks above the reference; an option
with no sentence; an accessible name that does not contain its visible label; every sentence replaced
by a string the plate already prints (`assertControlsChangeSomething`); the sentences removed from the
markup altogether while the radios and all 94 rules stay; control 2 removed from the declared plan
while the page ships it; the fieldset removed while the plan still declares it; a grouped selector
that loses its own option scope; a scale with no headroom so the tallest tower leaves the frame; and
the last column offered as a reference with no band beside it. All twelve reddened.

Two findings from that battery, recorded rather than filed away:

- **Renaming the fieldset's class does not remove the control**, and the first attempt at the
  "declared but not shipped" mutation did exactly that and stayed green. Discovery keys on the radio
  ids, deliberately, the same way `filterOptionSlugs` does — the mutation had to remove the radios.
- **Deleting the selector-scope refusal from `stack.ts` reddens nothing on its own**, because it
  guards the call site rather than itself: the rules are still built correctly without it. It reddens
  — and so does `stack-vocabulary.test.ts`'s output-level check — the moment the call site is written
  the way that shipped the defect.

## Source

Global Carbon Budget 2025, via Our World in Data · 2024. `data.csv` is a byte-for-byte copy of
`proof/static-bar-top-emitters-2024/data.csv`, re-parsed independently here.
