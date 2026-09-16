---
format: web
type: diverging-bar
medium: chart
grounding: supported
---

# Beat — La Croatie est le seul pays de l'Union à émettre plus de CO₂ par personne qu'en 1990 (web)

**Type:** diverging bar. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Of the 27 EU member states, **exactly one** emits more CO₂ per person in 2024 than in 1990 —
**Croatia, by 0,03 t** (4,73 → 4,76). The other 26 all fall, by **4,93 t on average**, and Luxembourg
by **20,48 t**, the largest fall in the union.

The beat throws if the number of risers is not exactly one, and asserts every one of the 27 carries a
reading in both years before anything is drawn — a diverging bar with a country silently missing is a
ranking that is wrong and does not know it.

## The reader's question, and why no still can answer it

*Above what?*

A diverging bar is the only type in this family that puts a **baseline inside the data**. A plain
bar's zero is arithmetic — it is where the quantity stops existing. A diverging bar's zero is a
**choice someone made**: every bar is a signed distance from a reference, and the reference is not in
the numbers, it is in the editorial decision about what the numbers should be compared to. The
catalogue names the consequence as the type's one failure mode — *"the domain must genuinely straddle
zero, or the chart is lying about having two directions when it only has one"* — and this beat's
static sibling sits closer to that edge than any other page in the corpus: **26 bars on the left, one
bar 0,03 t long on the right.** Its own brief confesses it: *"the right half of the frame is almost
empty, and that **is** the finding."*

A still can do exactly one thing with that: pick the zero, print it in the caveat, ask to be trusted.
This page does the other thing. **The reader moves the zero and watches who is above.**

Measured on this beat's own frozen file, all three offered references drawn on one fixed axis:

| zero = | above it | on it | below it | who is at the right-hand extreme |
| --- | ---: | ---: | ---: | --- |
| **son niveau de 1990** (the plate) | 1 | 0 | 26 | Croatie, **+0,03 t** |
| la médiane de 1990 — 8,13 t, the level of the median member then | 1 | 0 | 26 | Luxembourg, **+2,33 t** |
| la médiane d'aujourd'hui — 5,28 t, the level of the median member now | 13 | 1 | 13 | Luxembourg, **+5,18 t** |

Two facts fall out of that table and neither is drawable on a plate:

- **Croatia changes sides.** The country the headline is about — the only one above its own 1990
  level — is **0,52 t BELOW** the median European today. It is on the right of the zero under the
  reference the story chose, and on the left under the reference a reader might have assumed.
- **The two ends swap.** Luxembourg is the far LEFT extreme of the plate (−20,48 t, the largest fall
  in the union) and the far RIGHT extreme of both other references (+2,33 t, +5,18 t). The country
  that moved furthest is still the one emitting most.

## The gesture — `datum.ts`, a new vocabulary: what the picture may be MEASURED **FROM**

The reader chooses the level every bar is measured from. Each bar re-aims — it shortens, lengthens,
or crosses the zero rule and comes out the other side in the other sign's colour — and **nothing else
on the page moves**: not one country name, not one axis graduation, not the zero rule, not the note on
the subject. The whole state change is one `transform` and one `fill` on twenty-seven rectangles,
interpolated, and a bar that changes sign is a bar the reader watches shrink to nothing at the rule
and grow out the far side.

### Why it is a new file and not one of the fourteen

`level.ts` is the near miss and the distinction is exact. A level **lays a reference ACROSS a picture
and moves nothing**: its own words are *"a level adds nothing and moves nothing: it lays a REFERENCE
ACROSS THE WHOLE PLOT at one datum's own value, so every other datum can be read against it"*, and it
says in the same breath that *"nothing here emits a `transform`"*, deliberately, to stay clear of the
hole `stack.ts` paid for. A datum is the other half of that sentence: the reference is **subtracted
from the data**, so there is no rule to lay anywhere — the reference is always at zero, by
construction, and what moves is every mark. A `LevelMark { series, y }` cannot express it: it names
one coordinate for a rule, and this control has no rule and twenty-seven coordinates.

`floor.ts` is the second near miss, and it fails the other way. A floor chooses which band of a stack
is laid flat — the picture is **re-placed**, every value preserved. A datum changes the values
themselves: Luxembourg is −20,48 under one option and +5,18 under another, and those are two
different numbers about the same country, not one number in two places.

`reorder.ts` is the third, and it is the one this file deliberately does NOT do. A reorder exists to
discredit a layout by rearranging it. This control would have been an obvious place to re-sort the
twenty-seven rows into each reference's own ranking — and it does not, for a reason argued below.

### Why the rows do not re-rank, and why that is the stronger picture

The rows are sorted **by each country's 2024 level**, descending, and they never move. Three reasons,
in the order of how much they cost:

1. **The readout would lie.** `interaction.mjs` resolves the pointer off `cx`/`cy` attributes read
   **once at initialisation**; a CSS transform never changes them. A re-ranked row would answer for
   the country whose slot it landed in — the worst answer an interactive chart can give, and the
   defect `stack.ts` and `floor.ts` both record paying for. Here the twenty-seven points sit on the
   zero rule at their own row's height, an x and a y **no option moves**, so any pointer anywhere in
   a row resolves to that row, in every state of the page.
2. **The owner's first ruling.** Labels that move under a control were refused twice on the radar
   beat. Twenty-seven country names re-sorting is that refusal at twenty-seven times the scale, and
   the only defence would have been "but they are re-ranking" — which is an explanation, and the
   ruling is precisely that an explanation does not buy the movement.
3. **It is the better argument.** A row order sorted by the chosen reference would hide the thing the
   control exists to show. Ordered by today's level — a property of the countries that **no zero can
   change** — the reader watches Luxembourg stay at the top of the list while its bar travels from
   the far left of the frame to the far right. That is the finding. A re-sorted list would have
   quietly put it at the end both times and shown nothing.

### Why the axis never rescales, and what that buys

One span, ±21 t, fixed for every option — chosen from the widest option (Luxembourg's −20,48) and
never recomputed. So no graduation ever moves, and the three states are **directly comparable to each
other**, which is where the third finding lives: the twenty-seven members differ from each other
today by **7,26 t** end to end, against **20,48 t** for the distance Luxembourg alone has travelled
since 1990. Chosen in the same frame, the "where they stand today" fan is visibly a fifth of the
"how far they have come" wedge. An axis that rescaled per option would have drawn both at the same
width and destroyed exactly that reading.

## The refusals `datum.ts` makes, and each is a picture that would lie

Three of them cannot be made by any other file in this family, because no other file knows that the
sign of a mark is the reading.

- **A reference the domain does not straddle.** The type sheet's own failure mode, made mechanical:
  if every value under an option lands on one side, the page draws a plain bar chart around a
  baseline nothing crosses. `le membre le moins émetteur d'aujourd'hui (Malte, 3,20 t)` puts 26
  countries above and none below, and is refused by name.
- **A reference whose picture the reader cannot tell from another's.** `la moyenne des Vingt-Sept en
  2024` (5,351 t) and `le niveau médian en 2024` (5,283 t) differ by 0,068 t, which on this frame is
  **1,17 geometry units** — under the measured floor of one CSS pixel at the narrowest verified
  width. Two pills, one picture.
- **A reference that leaves every country on the side the default put it on.** The control's question
  is *who is above*; an option that does not move a single country across the rule answers it with
  the plate again, at a different scale.

Plus the ordinary couture: every option values exactly the drawn rows and no others, no value outside
the frame, no slug collision, every accessible name containing its visible one.

## What changes in the image

The control reads **Mesurer chaque pays depuis · son niveau de 1990 / la médiane de 1990 / la médiane
d'aujourd'hui**. Choosing one:

- re-aims all twenty-seven bars, interpolated over 620 ms — one unit-wide rectangle standing on the
  zero rule per country, given a `transform: translateX(360px) scaleX(±n)` per option, so a bar that
  changes sign passes through `scaleX(0)` **at the rule itself** and the reader watches it collapse
  into the line and grow out the far side. Three plates revealed by `display` would have cut instead,
  and `display` is the one thing that cannot be interpolated;
- repaints each bar in its new sign's colour, interpolated in the same breath: accent above the
  datum, the neutral below it;
- carries each value label to its bar's new tip and swaps the figure printed in it. A label with no
  room outside its tip turns **inward** and is drawn on the bar, on the ground chip `.end-label`
  already carries — the threshold is the label's own measured width at the narrowest verified width,
  which is the worst case for type at a fixed size over a plot that stretches;
- reveals the sentence that reference owes the reader, under the pills, in a row reserved in every
  state so the plot never moves under the control.

What does **not** change: the twenty-seven names, the five graduations, the zero rule, the title, the
caveat, the source, and the note on Croatia — worded as the fact it is (*« Croatie : seule au-dessus
de son niveau de 1990 »*) rather than as a number belonging to one reference, so it is true in all
three states and is drawn unconditionally in every one of them. It sits on Croatia's own row, to the
right of the rule, which is the one strip of this frame no state ever draws into: its neighbours at
rows 15 and 17 reach −0,19 and −0,54 under the widest-right reference, and Croatia's own largest
right-hand excursion is +0,03 t.

## Treatments spent, and one refused by the type sheet's own words

- `sign-is-direction-and-hue-only-doubles-it` — spent, and held in **every** state rather than in the
  one that was rendered: the fill is generated per option from the sign that option gives the row, so
  the side of the rule and the colour cannot drift apart when the reader moves the zero.
- `the-neutral-straddles-the-centre` — the zero rule is ink over the bars. It is also the one piece of
  furniture this control cannot move, which is why the readings are anchored on it.
- `value-beyond-the-growing-tip-in-ink` — spent, and it corrects the first pass. That pass painted
  the subject's value label in the accent; the type sheet's accessibility trap names exactly that
  (*"a value label painted in the bar's own accent hue … is the specific mistake that has failed WCAG
  contrast here before: keep the label in ink, let the fill carry the sign"*). All twenty-seven are
  ink now, and Croatia is marked where marking costs nothing — its name in the gutter and the note.
- `the-subject-is-ringed-not-recoloured` — **refused**, and by a ruling rather than by a measurement:
  a ring plaqued over a mark is refused three times over in this tree. What answers a pointer here is
  the bar itself, lifted off its own fill.

## What the render taught, and every one of these was read in a capture

- **The value labels had no vertical place at all.** `datum.ts` generates `left` and `transform` per
  option and nothing else, so all twenty-seven printed on one line across the top of the plot. `top`
  is now written INLINE on the span, and that is the point: an inline style beats every generated
  rule, which is exactly what is wanted for the one coordinate no option may ever move.
- **Luxembourg's `−20,5` landed on the country names.** At −20,48 t of a ±21 t frame there is no room
  outside the tip, and the label ran into the gutter. It turns inward now, above a threshold measured
  from the label's own width at 375 px.
- **The answer covered the control that produced it.** Six lines of tooltip about the second row rose
  clean over the pills — read in the `nocturne` capture. The box is 360 px here and the answer is
  shorter; it is two or three lines now.
- **The gutter was 132 px holding 77 px of name.** The first pass cured two clipped names with
  `white-space: normal` plus `line-height: 1,15` on the label — a vertical-rhythm tool aimed at a
  horizontal-overflow problem, and one that beat the leading the axis register emits (this beat is on
  `KNOWN-STATE.md`'s list of ten). Driven in a real browser, the widest of the twenty-seven is
  "Luxembourg" at 70 px on creme and rapport, 77 px on nocturne. Both literals are gone, the names
  are back on one line under the shared `nowrap`, the register owns the leading again, and the gutter
  is 96 px — 77 + the shared 10 px offset + 9 px of slack.
- **The page did not fit a phone.** Adding a control, its reserved sentence and a longer reading line
  put `nocturne` 108 px past an 812 px window. Paid for by words, not by shrinking the chart: the
  caveat and the reading line are shorter, the "which side means what" sentence moved into the caveat
  instead of holding a paragraph of its own (which also retired `←`/`→`, two code points in no house
  family), and the control's own margins came down 6 px.

## Verification

`verify-web.mjs` per direction: **creme 105/0/5, nocturne 99/0/5, rapport 93/0/5.**

The control driven in a real browser at 1280 with real clicks and with the keyboard, once with the
script on and once with it off — byte-identical state in both, except the pointer readout, which is
the only thing a script is for here. Under every option: `none` 1 above / 26 below, `med1990` 1 / 26,
`med2024` 13 above / 13 below / 1 on the rule, the figures swapping with them, and the sentence under
the pills swapping too. `ArrowRight` from the first radio moves to the second in all three
directions. A real pointer over row 2 lights **the bar**, off its own fill (`#757493 → #9e9eb3` on
nocturne), and answers with Belgium's two levels and its distance from all three references.

**Four mutations held:**

- an option the domain does not straddle — *le membre le moins émetteur* (Malte, 3,20 t) — refused in
  all three directions, by name, with the count quoted: "26 above, 0 below";
- an option the reader cannot tell from another — *la moyenne des Vingt-Sept en 2024* (5,351 t) beside
  *la médiane* (5,283 t) — refused with the measurement: "nowhere differ by more than 1,165 geometry
  units (0,0680 data units), under the 3,692 one CSS pixel is worth at the narrowest verified width";
- the pointer dose raised from 0,3 to 0,6 — refused on creme (3,649:1 against 2,191) and rapport
  (3,693 against 2,337), and correctly **green** on nocturne, where lightening a mint on a dark ground
  moves the ratio less;
- the twenty-seven readings moved from the zero rule onto their own bar tips — refused by
  `assertDatumRest`, quoting the two x it found.

**A fifth went green, and that is itself the finding.** Swapping the two `display` rules in
`datumCss` so the blanket is emitted AFTER each state's own rule ships a page where **no bar carries
a figure at all** — driven and confirmed empty, `LUX=""`, `HRV=""`, in every state — and
`verify-web.mjs` reported **105 passed, 0 failed**. Two holes let it through and both are named
rather than papered over: nothing in the verifier looks at whether a generated rule's target is
actually on screen (the same shape as the sankey that rendered green with zero ribbons lit, and as
the streamgraph's own fourth mutation), and this beat's value labels sit **outside** `.overlay` — the
layer whose every word the "drawn unconditionally" check scans — because three quarters of them
belong to references nobody has chosen, which is the ownership `floor.ts` states when it puts an
option's earned axis in `.y-axis`. Not fixed here: `verify-web.mjs` is shared and sibling agents are
in this tree.

One gap named rather than papered over: `interaction-plan.ts`'s `shippedControls` discovers a control
by its radio-id prefix and knows `chart-filter-`, `chart-stack-`, `chart-level-` and `chart-cutoff-`
only, so a `chart-datum-` group is invisible to the format's mechanical "every control changes the
picture" refusal — as `fold`, `brush`, `trace`, `floor` and `reorder` already are. This beat therefore
ships no `interaction` plan (declaring a gesture the detector cannot see is refused), and the
refusals are made instead by `assertDatumDeclaration`, in the vocabulary's own terms.

And one narrow-width debt, stated: `.datum-notes` reserves 3 em so the plot does not move under the
control, which holds at 1280 (the longest sentence is 39 px there) and does not at 375, where the
default's own sentence runs to 72 px. Choosing an option at phone width moves the plot. `floor.ts`
records the same debt for the same reason, and this format pays it elsewhere too.

## A toolchain flake worth recording

On the first run in a cold process, `creme` was refused for a character it does carry: *"this page
sets U+2082 and the subset it carries for Merriweather does not reach it"*. Re-run with the typeface
cache warm, the same page builds and the emitted `@font-face` for Merriweather carries a second block
whose `unicode-range` is exactly `U+2082`. Nothing in the beat changed between the two runs. Observed
once; the extras subset that carries `₂` appears to be fetched lazily and the guard runs before it
lands. Recorded rather than chased: it is in `shared/design-base/typefaces.mjs`, which is shared, and
sibling agents are in this tree.

## Source

Global Carbon Budget (2025) · population with major processing by Our World in Data · 1990 and 2024.
`data.csv` is a byte-for-byte copy of `proof/static-diverging-bar-eu-per-capita/data.csv`. Every
number in this brief is computed from that file in the runner and asserted there; the two medians are
the median of the 27 members' own values, named as the level of the MEDIAN MEMBER rather than as
"the Union's", because an unweighted median of per-capita figures is not the Union's per-capita
figure and this page does not carry the populations that would make it one.
