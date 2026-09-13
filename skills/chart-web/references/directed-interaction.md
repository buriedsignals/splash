# A directed web beat is interrogated, not decorated

A web beat (`proof/web-<type>-…`, `proof/mapgen-<type>-web`) tells the same subject as its static
sibling, from the same frozen data and the same asserted claim. It is **not** that plate with a
tooltip bolted on. The static plate is the floor — data, claim, words, colour rules, the family's own
treatments — never the ceiling.

The owner's words, on the first beat built the other way (2026-09-13): « ça ne s'arrête pas à juste
reproduire un static, c'est le même sujet rendu sur des formats différents ».

## What this format's version of that sentence is, and why it is not the siblings' version

`scrolly/references/directed-type-choreography.md` and `chart-video/references/directed-type-choreography.md`
hold the same line for their genres, and both hold it the same way: a CHOREOGRAPHY is a sequence the
author controls, so a card or an event is refused when its state equals **the one before it**.

An interaction is not a sequence. It is a SPACE the reader explores. The author does not control the
order, does not know which control is touched, and cannot assume any of them is. Three consequences,
and they are the whole difference:

- **The unit is not an event on a timeline.** It is *a question the reader arrives with, and what the
  page does when they ask it.* A control described as a mechanism — "hover detail", "a filter" — has
  not been designed yet.
- **The comparison is against the DEFAULT state**, not against the state before. There is no state
  before. The only state every control is reached from is the picture a reader who touches nothing is
  looking at, which is also the picture a reader with no script never leaves.
- **Two controls may produce the same state, and that is not a defect.** `mapgen-symbol-web`'s table
  and its hover answer the same seventeen magnitudes; they answer *rank them all* and *what is THIS
  circle worth* on two different channels. The sibling rule that refuses a repeated state does not
  transfer, and transliterating it would delete the table.

## The rule

1. **Write the interaction before the code**, control by control, in the beat's `BRIEF.md`: for each
   one — **the reader's question** in the reader's own words, **the gesture** that asks it (one of
   the repertoire below), and **what changes in the picture** when they do. `mapgen-symbol-web`'s
   "The controls, and the tests they had to pass" is the worked example, including the two controls
   it decided NOT to ship and the measurement each decision rests on.
2. **Every control changes the picture.** `assertInteractionPlan` (`assets/interaction-plan.ts`,
   called by `renderWeb` and `renderMapWeb` on the page they are about to write) refuses a control
   whose state, once applied, equals the default state — an ask whose every answer is a string the
   plate already prints, a table whose every cell is, a filter option that keeps every mark. A
   control that needs no reading of its own belongs in the plate, not behind a gesture.
3. **The page's own claim about what it earns travels with it.** A declared plan carries `earns` —
   the `BRIEF.md` sentence saying what this page can do that a still and a video of the same claim
   cannot — so the prose and the render cannot drift apart. A beat that cannot finish that sentence
   is a beat that should ship as a still.
4. **A derived reading is allowed, and it is asserted.** A percentile, a rank, a share of the whole,
   the years since the series was last this low — computed from the frozen file in the runner, baked
   into the answer server-side, and refused there when the data stops supporting it. The browser
   never formats a number. This is the same rule the static plate's own claims are held to, and it is
   what most of this corpus's answers actually are: `web-beeswarm-co2-per-person` answers with the
   share of humanity that emits less, not with the value already encoded by the mark's position.
5. **Nothing argument-bearing sits behind a control.** Stated in full, with its own list of what that
   means concretely, in `web-discipline.md`, "What must not become interactive" — the takeaway, the
   reference rule and the accent on the subject are drawn unconditionally, and no control on the page
   can remove them.

## The repertoire

Pick what serves the claim; most beats need one, and a beat needing four should be checked for
whether it is still one thing a reader looks at. The right-hand column is what the committed corpus
actually shipped when this file was written (143 delivered pages, 154 controls).

| gesture | what the reader sees | reach for it when | in the corpus |
| --- | --- | --- | --- |
| **Ask a mark** | one mark answers with a reading printed nowhere — hover, tap, keyboard focus | the encoding ranks but cannot measure: an area, an angle, a colour bin, a circle, a band in a stack | 143 pages |
| **Ask a line** | the connector between two ends answers with what LINKS them, never with either end again | the claim is about the link — a slope, a crossing, a flow — and the ends already answer for themselves | 1 page (`web-co2-decline-slope`) |
| **Filter to a subset** | the marks outside a named set leave; the frame they were measured against does not move | the reader wants a part, and the part is ORTHOGONAL to the encoded variable, so narrowing can never hide the claim | 5 pages |
| **Toggle a comparison** | one named set is swapped for another on the same scale | the claim is "this, not that" and both halves need the same axis to be comparable | none |
| **Open the full table** | every reading at once, as text, in an order no eye can impose on the marks | the marks cannot be ranked by eye at all — `mapgen-symbol-web`'s circles differ by 2,87 % | 6 pages |
| **Zoom and pan** | the camera moves; marks too close to tell apart at this width come apart | and only when the arithmetic says it works: `map-web`'s `separationHeadroom` is what `mapgen-symbol-web` used to DECLINE one | none |
| **Find your own case** | the reader's own row is named and ringed among marks that are otherwise anonymous | the reader is in the data — a country, a canton, a year they lived through | none |
| **Sort or reorder** | the same marks move into the order that answers the question | the default order hides the answer. **Costs a script**: unlike a filter, no CSS expresses it, so the default order must be the complete argument | none |
| **Brush a range** | a span of one axis is chosen and everything outside it steps back | a long series where the interesting window is the reader's to pick. **Costs a script** for the same reason; named bands (`filter.ts`, "a threshold as named bands") give most of it with none | none |
| **Reveal on scroll** | the picture builds in the argument's order as the reader reaches it | the one gesture the reader does not ask for. It is motion, not a question, and it has its own guard — see `web-discipline.md`, "The entrance", and `splash/test/web-entrance-is-an-addition.test.ts` | declared per beat |

Four of these ship nowhere yet. That is recorded as a fact about the corpus, not as a backlog: a
gesture is reached for because a claim needs it, and a page that adds one to fill a row in this table
is exactly the reflex the rule above refuses.

## The mechanical refusal

**A state here is the set of readings the page puts in front of the reader**, derived from the
rendered markup rather than declared — for the same reason `renderWeb` reads its entrance off the
markup instead of taking it as a prop: a state an author types is a state an author can type wrongly,
and the thing being guarded is what the page actually ships.

- **the default state** — the text the page PRINTS with nothing touched. Not an SVG `<title>`/`<desc>`
  (a native tooltip, or an announcement — revealed, never printed), not a `<details>` body (opened by
  a control), not a filter's narrowing note (revealed by `:checked`).
- **a revealing control's state** — the default plus what it answers with. Equal to the default
  exactly when it answers with nothing the page had not already printed.
- **a narrowing control's state** — the default minus what it takes away. Equal to the default
  exactly when it takes nothing away. `assertFilterDeclaration` has refused this form since the
  vocabulary was written: an option keeping every drawn datum "is the unfiltered view under a second
  name". Two spellings are read, and reading one made the check vacuous once: `filter.ts` writes
  `data-filter`, the map beats rendered before it was vendored write `data-group`, and of the five
  committed pages that ship a filter ONE writes the first and FOUR write the second. A filter whose
  options tag no element at all is refused as the same fact — chips drawn over a picture they cannot
  reach.

It fires at render time, in `renderWeb` and `renderMapWeb`, so an author meets it while writing the
beat. `splash/test/web-interaction-changes-the-picture.test.ts` is the census over what is already
committed, with the exact list of every control that changes nothing — one beat, two controls, both
on `mapgen-locator-web`, whose eleven markers are each labelled on the map and each answer a hover
with that same label plus the category already printed on its own filter chip.

**What it cannot see, so it is not trusted past it.** Whether the question is the READER'S. It can
measure that hovering adds a reading the plate does not print; it cannot measure whether that reading
is the one a reader of this claim wants. That half is the `BRIEF.md`, read by a person before the
code is written — which is why rule 1 comes first rather than second.

## What the web adds that neither sibling has

**Every control is reachable by keyboard and announced.** A video has no controls and a scrolly has
one gesture the browser already handles; this format invents reader-facing UI, and inventing UI is
where accessibility is lost. The rules are already written and are not restated here:
`web-discipline.md`, "Keyboard and touch" — every reading `tabIndex={0}` at build time, one
`show(point, x, y)` shared by focus and pointer alike so there is no thinner "keyboard mode", native
form elements for the filter's own controls, and the segmented treatment layered ON TOP of working
radios (`opacity: 0`, never `display: none`, "the line between styling a control and destroying one").

**The reader without a script still gets the complete plate.** Also already written:
`web-discipline.md`, "What survives with JavaScript disabled" — every word the static format would
have shipped, the whole curve, the subject and its label, and a working filter, because the narrowing
is pure CSS. What does not survive is named there too. The entrance states the same rule in its
strongest form: "SSR ships the settled page and every keyframe runs *to* it."

**The page states what the format earns, and that statement is checked against the page.** A video's
claim to its format is the motion a viewer watches; this format's claim is a capability nobody sees
unless they reach for it. So the claim is written in the brief, carried into the render as `earns`,
and the controls it names are matched against the controls the markup ships — all of it or none of
it, the gate the filter vocabulary earned the hard way.

## Precision still applies

Every gesture lands on a composition measured in the reader's own pixels, at the standard
`web-discipline.md` already sets and this file does not repeat: the fluid frame (geometry stretches,
type stays a fixed CSS size), a de-collision retaken as a threshold rather than decided once at one
width, an annotation placed from the marks it annotates, nothing clipped, and the beat fitting inside
the window it opens in.

And it is verified by **driving a real browser at several widths** — `scripts/verify-web.mjs`, which
may only dispatch REAL input, because `element.focus()` does not hit-test and this format has already
shipped a build where hover was completely dead with every attribute a unit test could assert
present. A control that reads correctly in the markup and does nothing under a real pointer is
exactly the defect this file exists to make impossible, one layer up.
