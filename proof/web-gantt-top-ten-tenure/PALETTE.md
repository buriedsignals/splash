---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; **the delivered page is drawn in
whichever direction governs it, never in this one**, so every number below is measured on what the
three rendered files actually paint, read back out of `renders/*.html` and out of the DOM with a
real browser.

## What this page has to colour, and why it is exactly two fills

A gantt's colour is the one channel the type sheet caps rather than prescribes — *"category or
status colour is capped near six distinct hues"* — and this page spends **two**, because it has two
categories and not sixteen: the six countries that never left the top ten, and the ten that arrived,
left, or both.

That split is also the claim, so the accent carries the argument and nothing else on the plate is
chromatic. It is `accent-marks-the-thread` on a group rather than on a line.

**And colour is the third channel to say it, not the first.** The six are also the six bars that run
the full width of the frame under the calendar, the six longest bars under either of the other two
origins, and the six names printed in the accent in the row gutter. A reader who separates neither
hue reads this plate correctly, which is why two fills is enough and why neither of them has to
survive a hue test it would fail.

Measured on the three files, against the ground each one paints:

| direction | ground | never left (accent) | came and went (neutral) | accent : ground | neutral : ground | the two fills apart |
| --- | --- | --- | --- | ---: | ---: | ---: |
| creme | `#FFFCEE` | `#1757B6` | `#94928a` | 6,637:1 | 3,029:1 | 2,191:1 |
| nocturne | `#111044` | `#4FE0C0` | `#757493` | 10,797:1 | 3,958:1 | 2,728:1 |
| rapport | `#FFFFFF` | `#1F5C8B` | `#949494` | 7,090:1 | 3,033:1 | 2,337:1 |

The neutral is `mix(ground, ink, 0.42)` lifted to the 3:1 non-text floor against that direction's own
ground — it lands on 3,03 twice, which is the lift doing its job rather than a coincidence. The
accent is the direction's own, asserted against the ground with `assertLegible` before anything is
drawn.

## The measurement this beat needs, and where it differs from its siblings'

Each fill also has a pointed-at state, darkened (lightened, on `nocturne`) off **its own fill** — no
ring, no dot, no fixed dose, because a ring plaqued over a mark is refused three times in this tree
and a fixed dose was refused elsewhere at 1,104:1. Two floors hold it, and this beat asserts both in
the component rather than assuming either: the lifted colour must still read against the ground, and
the step must clear 1,12:1, `proof/web-bar-top-emitters-2024`'s searched floor.

| direction | accent → pointed | neutral → pointed | pointed accent : ground | pointed neutral : ground |
| --- | ---: | ---: | ---: | ---: |
| creme | 1,541:1 | 1,840:1 | 10,226:1 | 5,574:1 |
| nocturne | **1,143:1** | 1,710:1 | 12,339:1 | 6,768:1 |
| rapport | 1,527:1 | 1,837:1 | 10,824:1 | 5,572:1 |

Nocturne's 1,143 is the narrowest step on the page and it is why the floor is asserted rather than
assumed: lightening a mint on a dark ground moves the ratio far less than darkening a blue on a pale
one, and a fixed dose would have shipped a hover nobody could see on exactly one of the three.

**The diverging bar's third measurement — "the pointer must not speak louder than the sign" — was
declined here, and then put back by a mutation.** The argument for declining was sound and is still
true for the reader: there colour *is* the reading, so a bar repainted past the distance between the
two signs reads as a bar on the other side of the rule; here colour carries a GROUP that the bar's
own length and the accented name in the gutter already say, and a darkened grey cannot be mistaken
for a blue.

What that argument did not cover is the author. Mutating the dose from 0,3 to 0,6 rendered **green in
all three directions** — the two floors above are minima, and nothing capped them from the other
side — and at 0,6 the neutral's own pointer step measures **3,649:1 on creme against the 2,191:1
that separates the two fills**. So the guard is shipped, in this page's own terms rather than the
diverging bar's: this plate spends colour on exactly one thing, and a pointer that repaints a bar by
more than the distance between the two groups is spending more colour on a transient state than on
the beat's own claim.

| direction | two groups apart | loudest pointer step | margin |
| --- | ---: | ---: | ---: |
| creme | 2,191:1 | 1,840:1 | 16 % |
| nocturne | 2,728:1 | 1,710:1 | 37 % |
| rapport | 2,337:1 | 1,837:1 | 21 % |

Creme's 16 % is the narrowest margin on the page. **Re-mutated:** the dose at 0,6 now refuses `creme`
(3,649:1 against 2,191) and `rapport` (3,693 against 2,337) and stays correctly green on `nocturne`,
where lightening a mint on a dark ground moves the ratio far less. The guard measures the pair, not
the dose. **Mutated the other way:** the dose at 0,05 refuses all three, naming the step it found
(1,070 / 1,026 / 1,078 against the 1,12 floor).

## What a pointer lights, and what it does NOT

One `data-mark-ref` per **row**, and the shape it names is the row's whole interval set: an
interrupted row lights both of its spans at once, verified in the browser (`KOR-0`, `KOR-1` both
take `.mark-active`; creme `#94928a → #686661`, nocturne `#757493 → #9e9eb3`, rapport
`#949494 → #686868`). That is the point of naming the ROW rather than the span — the reader is
asking about a country, and a country with a gap is still one country. `WEB-TYPE-BRIEF.md` names the
opposite failure: a key that lights half the plate to designate one thing. Sixteen keys for sixteen
rows is the smallest set that answers the question asked.

## The figures, the words, the graduations — none of them chromatic

Every tenure figure is the direction's own ink taken to the 4,5:1 text floor: `#000000` at 20,411:1
on creme, `#FFFFFF` at 17,775:1 on nocturne, `#000000` at 21,000:1 on rapport. They are ink
**including the six the accent marks**, which is the type sheet's own accessibility note — *"if a
value or duration label is ever added inside the bar itself, the same real-contrast-against-the-
actual-fill discipline applies"* — and this page adds one and turns it inward onto the bar on nine
rows of sixteen under the calendar. There it faces two fills at once, so it is not solved with a
second ink: `.end-label` already ships a ground chip (`background: var(--ground)`, the format's own
sheet) and this beat does not take it away — `proof/web-streamgraph-swiss-electricity` overrode it to
`transparent` and paid for it in the owner's own reading. One pair to measure, ink against ground,
and it is the row above.

The seven gridlines are steps off each direction's own ground, computed by `deriveFurniture` at
render time and never written here as a literal: 1,520:1 on creme, 1,701:1 on nocturne, 1,527:1 on
rapport — under a mark floor on purpose, because a graduation a reader can count against without
seeing it first is furniture doing its job.

Nothing else on the page is chromatic, and the newsroom's `#0B7A75` is painted nowhere: it is the
colour the three directions are reconciled AGAINST, not a colour this page draws.
