---
format: web
type: bump
medium: chart
grounding: supported
---

# Beat — L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂ (web)

**Type:** bump (ranking-over-time). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 1990 and 2024 India moved from **8th to 3rd** in the world ranking of annual CO₂ emissions,
passing five countries: the United Kingdom (1991), Ukraine (1992), Germany (1999), Japan (2006) and
Russia (2009).

**Every rank is computed over the whole file (209–215 countries, depending on the year), not over the
six lines drawn** — a rank read off a subset is not a world rank. The crossings are **found**, by
walking a country's own rank series and asking who left the set above it, never listed by hand; the
beat throws if the subject did not rise or if it passed fewer than three.

The six lines are those in the top five in 1990 or in 2024, plus the subject.

## The interaction, written before the code

### What the plate cannot say, and it is not "the value"

A bump's ten rows are ten *places in the world*, and this plate draws six lines on them. **Four of
those rows are held, at any moment, by countries the plate does not draw.** So a line that falls is a
line falling past nobody the reader can name: Germany goes 5th → 10th through five empty rows, and
the picture never says who pushed it down. It was Iran (2019), Saudi Arabia (2020 and again 2023),
Indonesia (2022) and South Korea (2024) — and it passed Saudi Arabia back in 2022 on the way. None of
those five countries has a line on this chart. **That is the reading a still, a video and a scrolly
of this claim all have to leave out**, and it is not a magnitude: it is the identity of the field.

### Why this is not the slope beat's gesture

`proof/web-slope-europe-lowcarbon` (commit `7fb0ec9a`) gave the reader the **pivot**: any of sixteen
lines becomes the thing the other fifteen are measured against. That reading exists because a slope
has exactly **two** instants, so "follow a line through the chart" and "measure the others against
it" are the same sentence.

A bump has thirty-five. Here **nothing is measured against the chosen line** — every other line keeps
its own rank, unmoved and unrecoloured. What the reader gets is the chosen line's **own history
through all thirty-five steps**: where it sat in each of them, and every event *between* two of them.
A slope has no events; it has one gap that changed sign. The two gestures produce different objects —
a comparison there, a trajectory here — and the object is what made this a new vocabulary rather than
a second use of `level.ts`.

### The two controls

| the reader's question | the gesture | what changes in the picture |
| --- | --- | --- |
| *« Cette année-là, l'Inde était où — et ça pesait combien ? »* | **ask a mark** | One mark per YEAR (never one per country per year: six lines stack in one column and a pointer resolving by x would answer at random) gives India's rank that year, its emissions in Gt, and the two countries immediately above and below it in the world ranking. |
| *« Cette ligne grise qui tombe à travers les rangs vides, c'est qui — et qui l'a doublée ? »* | **find your own case** | The chosen line comes forward in full ink at series weight and its two names take full ink; the four other context lines step back to the non-text floor. Every step where it crossed somebody is **ringed on its own line**, each ring naming the crossing. The sentence under the control gives its whole trajectory: its rank run by run across the thirty-five years, its net displacement, and every country it passed or was passed by **with the year** — including the ones this chart does not draw. |

**India is not among the options, and that is rule 5 rather than an oversight.**
`directed-interaction.md`: *nothing argument-bearing sits behind a control.* India's line is the
claim; it is drawn in the accent, with its three ringed crossings and their captions, in **every**
state this page can be put into, and no control can dim it, unring it or take its labels. The
vocabulary enforces that rather than trusting it — `assertFollowDeclaration` is handed the protected
key and refuses an option that names it. And India's own thirty-five readings are already on the
marks, which is the other half of the answer: the two controls do not overlap anywhere.

### The vocabulary is new, and here is what would not carry it

`skills/chart-web/assets/follow.ts` — **native radios plus CSS generated at build time, no listener,
no script, the complete control with JavaScript off**, the same mechanism as its seven siblings.

- `filter.ts` hides what is not in a named set. Nothing may leave this picture: the tangle a reader
  is following a line *through* is the comparison.
- `stack.ts` needs an arrangement; nothing moves here.
- `level.ts` is **one** reference per series laid flat across the plot. A trajectory is thirty-five
  positions whose meaning is the walk they make — declared as levels it would be thirty-five
  full-width rules, which is true of every number and false of the thing. (`fold.ts` makes the same
  argument for a silhouette; the object here is different and so is the arithmetic below.)
- `fold.ts` lays one half of a picture over the other and its product is **one** crossing at a band.
- `withdraw.ts` is an arithmetic of subtraction; `trace.ts` an arithmetic of partition, and a rank
  conserves nothing — there is no total to split.
- `brush.ts` chooses a span of an axis; this chooses an entity, and every step stays on the plot.

**The arithmetic this file owns is the one an ordering has, and it closes.** A rank is a position in
a bijection, so between two steps

> `position[i] − position[i−1]  =  (how many passed it)  −  (how many it passed)`

and an option whose declared crossings do not satisfy that at **every** step is refused, with both
numbers printed. Measured on this beat's frozen file: the law holds at all 34 transitions for all six
drawn countries, including 2022, where Germany passed Saudi Arabia and was passed by Indonesia in the
same step and its rank did not move. This is the type sheet's own named trap turned into a refusal —
`types/bump.md`: *"an invented rank slots into the visual field exactly as plausibly as a real one"* —
because a fabricated crossing, a dropped one, or a rank bridged across a gap all break the equality.
A missing step is declared `null` and drawn as a **break**; the vocabulary refuses a crossing on
either side of one rather than letting the beat bridge it.

`followRuns` computes the run-length partition of the rank series (`5e de 1990 à 1998, 6e de 1999 à
2018 …`) rather than letting the beat type it, and refuses a partition that does not cover every step
exactly once, contiguously, in order.

## Drawn at rest, because a page has no reveal to lean on

Both ends carry a name **and its rank in words** (`rank-is-printed-on-the-entry`), and that is
collision-free **by construction**: in any one year the drawn countries hold distinct ranks, so no two
labels in one column can share a row — asserted on the real ranks at both ends, and the component
throws otherwise. Each crossing the argument rests on is ringed on India's line and captioned where
it happens.

## The catalogue's accessibility trap, found live on this page

`types/bump.md` names it for this exact type: *"End labels … always neutral ink, never the line's own
hue"*, after a shipped failure measured under the 4.5:1 floor. **The committed render did exactly
that**: `l.code === subject ? accent : ink` on both the start label and the end label, so "8e Inde"
and "3e Inde" were painted in the line's own accent in all three directions. Both are in the page's
own text ink now; the subject is told apart by **weight** and by a small accent **swatch**, which is
the fix the sheet itself prescribes — a decorative mark is exempt from the text-contrast rule in a way
a name never is.

## The two hard-coded `lineHeight` literals, and what they were actually patching

`KNOWN-STATE.md` lists this beat twice. Both literals (`lineHeight: 1.15`) sat in the same style
object that spreads `regs.axis` / `regs.value`, so both **beat the leading the register emits**, and
both arrived with a comment about a long label overflowing at 375 px.

Measured on the committed render at 375 × 812 before anything was changed, they were not fixing it:

| | committed | with the literals doing their work |
| --- | --- | --- |
| end labels | wrapped to **three lines** (53,8 px tall) | still wrapped |
| worst end-label overlap | **36,0 px** | still 36,0 px |
| worst start-label overlap | **3,4 px** | still 3,4 px |

The literal was tightening a block that was colliding by three times its own height. The real
constraint has nothing to do with leading and two things to do with room:

1. **The labels had no column of their own.** The end labels were absolutely positioned inside the
   plot cell at `left: 75 %` with `max-width: 25 %` *of the plot*, which is 310 px at 1400 and 54 px
   at 375 — so they wrapped. They now sit in a **third grid column, measured** in the direction's own
   `value` register from the widest real string, and they never wrap. The left gutter is measured the
   same way in the `axis` register instead of being the literal `112px` it was.
2. **The rank rows had no floor.** Ten rows inside an aspect-ratio box are 7,7 px apart at 375 px,
   against a label 12,6 px tall — labels collide however tightly they are led. The plot now carries a
   **measured minimum height**: `maxRank × max(leadOf(axis), leadOf(value))`, which is the register's
   own leading doing the job the literal was borrowed for.

Both literals are gone and the leading is the register's in all three directions.

**A third literal fell out of the same measurement.** `FRAME.xAxisRowPx` was `28` — two lines of
nocturne's 10 px axis register and one and a half of creme's, height taken off the plot in every
direction to hold a row that carries one line of years. It is `leadOf(axis) + 6` now (the 6 is the
shared stylesheet's own `.axis-label.x { top: 6px }`), which is **20 / 20 / 18 px**. That is what
finally let nocturne fit: at 375 px its display register sets the title in six lines of tracked
uppercase — **366 px of header before the chart starts** — and with the plot on its measured floor the
figure was overflowing its own window by 25 px, which `verify-web.mjs` reports as two failures of its
own ("no vertical scroll inside the visual", "the source line is on screen"). The caveat and the
reading line were also cut back to what they have to say, because the format's rule is that words are
never squeezed to make the chart fit — so the sentences that are there had better be sentences that
earn their lines.

## What this framing still cannot do, stated rather than left

Two measured gutters plus a phone do not leave much plot: at 375 px the two label columns take
**86 px + 116 px of the 327 px** inside the frame, so thirty-five steps are drawn across **125 px** —
3,6 px per year. Every reading is still reachable (the control, the marks and the rings do not depend
on the width) and nothing overlaps, but a crossing cannot be told apart from its neighbour by eye at
that size. Naming both ends and drawing thirty-five steps on a phone is a fact about the data and the
viewport, not about this composition — the same limit `proof/web-slope-europe-lowcarbon` records for
sixteen named ends.

The crossing captions are the visible consequence, and what happens to them is the one thing this
pass got wrong twice before getting right:

1. Anchored beside their rings, they were unreadable at 375 px. `noteAnchor` gives a caption
   `max-width: min(46%, 24em)` — **58 px of a 125 px plot** — so all three wrapped to two lines in a
   **19 px** rank pitch and printed through each other and through the lines. That is what the
   committed render shipped.
2. The first fix HID them below a measured threshold and printed the same crossings as a sentence
   under the plot. **All three directions failed `verify-web.mjs` for it** — "phone: every
   argument-bearing word is drawn unconditionally", which walks `.chart-plot .overlay` and requires
   opacity 1 and no `display: none` at every viewport it drives. The guard was right and the fix was
   wrong: these captions name the countries the claim is about.
3. They MOVE instead. Below the threshold the overlay becomes a bottom-aligned column and the
   captions flow in it, in the order they happen, on the opaque chip `.note` already carries. Seated
   at typed offsets first, one line each, **140 px of nocturne's tracked uppercase ran straight
   through "10e Allemagne"**; flowing, they wrap inside the plot and cannot leave it. They cover part
   of a very small plot, which is the trade this width forces — and the words are drawn.

The threshold is measured, not typed: the plot must be at least as wide as the three captions laid
end to end in the direction's own annot register, and it is asked of the FIGURE with `@container`
rather than of the window, because this figure is embedded as often as it is opened alone.

## What the mechanical refusal can and cannot see here

`assertInteractionPlan` measures the marks' answers against what the page prints, and it refuses the
plan if a declared gesture ships no control. It **cannot** see the follow control: `shippedControls`
knows five kinds (`ask`, `table`, `filter`, `stack`, `level`) and reads them off their own attribute
spellings, and this vocabulary writes `chart-follow` / `data-follow-note`. Rather than borrow another
vocabulary's spelling so the census would count it — which would make the measurement true of a
control that is not there — the refusal ships **with the vocabulary**:
`assertFollowChangesThePicture` runs in the runner against the delivered file and refuses any option
whose sentence the page already prints. That is the same place `fold.ts`, `trace.ts`, `withdraw.ts`
and `brush.ts` each put theirs, for the same reason.

## Verification

`verify-web.mjs` per delivered direction, in a real browser: **creme 105 / 0 / 5, nocturne 99 / 0 / 5,
rapport 93 / 0 / 5**. Every skip is the filter's; this beat declares none, because nothing may leave
this picture.

Driven again directly, once per direction with scripting ON and once with it OFF, clicking the
Allemagne pill at its own centre so the click is hit-tested like a reader's: **7 rings revealed, the
trajectory sentence shown, the followed line at the page's ink and 2,6 px, the other four at the
stepped-back neutral** — byte-identical in both, which is what "no listener, no state, not one byte
of JavaScript" is supposed to mean.

Measured at 375 × 812 after the fix, all three directions: **0 label overlaps, 0 px of horizontal
document scroll, 0 px of vertical overflow, the source line on screen.** Before it, on the committed
render: 36,0 px of end-label overlap, 3,4 px of start-label overlap, end labels wrapped to three
lines.

Captures, each with the control actually operated: `/tmp/web-bump-{creme,nocturne,rapport}.png`.

**Mutations, all four red, none of them a hollow guard:**

| what was broken | what refused it |
| --- | --- |
| one crossing dropped from every option | the ordering law, by name: *"USA moves from position 1 to 2 at 2006 — a change of 1 — while declaring 0 competitor(s) that passed it and 0 it passed"* |
| the subject offered as a follow option | `protect`, quoting rule 5 back |
| a step made absent and the crossings left standing | *"crosses at 1997, which is beside a step it is absent from … let the line break there"* |
| every option's sentence replaced by a string the page prints | `assertFollowChangesThePicture`, on the delivered file: 5 of 5 options inert |

**Targeted suites:** `chart-web/test` plus the six `splash/test` suites that touch a directed web
plate's leading, its colours, its typeface, its filter declaration and its interaction census — **665
pass**. Five failures are in the tree and none of them names this beat: `web-treemap-europe-capacity`
naming a colour of its own and `chart-web`'s stale `preview.png` are a sibling's in-flight work, and
the three `annotation-reads-over-what-it-crosses` findings name `static-bar-top-emitters-2024`,
`static-treemap-europe-capacity`, `more-boxplot-france-co2-decades`,
`static-connected-scatter-lowcarbon` and `static-diverging-stacked-electricity`.

## Source

Global Carbon Budget 2025, via Our World in Data · 1990–2024. `data.csv` is a byte-for-byte copy of
`proof/static-bump-emitter-rank/data.csv`.
