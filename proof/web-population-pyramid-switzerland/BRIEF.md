---
format: web
type: population-pyramid
medium: chart
grounding: supported
---

# Beat — La tranche la plus large de la Suisse est celle des 55-59 ans (web)

**Type:** population pyramid. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Switzerland's widest age band in 2023 is **55-59 (669 962 people)**, not the youngest: 0-4 year-olds
total **434 030**, well under the peak — the mark of an ageing population, not an expanding one. The
widest band is **found, not typed**, and the beat throws if it turns out to be the youngest.

## The gesture, declared before the code

**The reader's question.** A pyramid's subject is a *silhouette* — a shape read whole. But the shape
is made of two half-shapes drawn back to back, and the one comparison the geometry makes hardest is
the one between them: at a given band, is the left half longer or the right? Two lengths measured in
opposite directions from a shared centre is the worst possible arrangement for a difference, and it
is the arrangement this type is defined by. A reader looking at the 2023 Swiss pyramid can see it is
top-heavy. They cannot see **where the sexes swap places**, and nothing on the still says.

**The gesture: the fold.** A control above the plot lays one half's silhouette **over** the other,
drawn at its own measured values as a continuous staircase. The difference stops being an inference
and becomes a shape: wherever the folded profile juts **past** the bar it lies on, the folded sex is
the more numerous one at that band; wherever it falls **inside** the bar, the host sex is. The
staircase crosses the bar ends exactly once, at **60-64**, and that crossing is the reading — men
lead in all twelve bands from 0-4 to 55-59, women in all nine from 60-64 to 100+, and the gap runs
from 841 at the crossing to **35 351 at 85-89**.

**Why this is not the owner's first suggestion.** Laying a *second year's* or a *second country's*
outline over the drawn one is the same gesture and would be the stronger one — a pyramid's natural
comparison is across time. The frozen file holds one year and one country (`data.csv`, 2023,
Switzerland, 21 bands), and a second silhouette would have to be invented. It would not be
transported; it would be made up. So the fold uses the second silhouette this beat **actually has**:
its own other half.

**What changes in the picture.** Nothing moves and nothing is re-ordered. The 21 bands stay in their
sequence, both halves stay drawn at full length on their own side, and the fold **adds** one
staircase over one half plus one sentence naming the crossing band. The page ships in the untouched
state, which is the complete plate a reader with no script gets.

**It holds for both sides.** The control offers the fold in **both** directions — men laid over the
women's side, women laid over the men's — and `assertFoldDeclaration` refuses a declaration that
offers only one, because on a mirrored type a one-way fold privileges a side. Neither option is the
default; the untouched pyramid is.

**Dashes were available here and were refused.** The folded profile is drawn **solid**. A dash is the
right costume for a *rule* — a reference the reader reads a value off. This mark is a *shape*, and
its whole job is to be read whole; fragmenting it into dashes would break the one thing it exists to
deliver. The refusal is a choice about what the mark is, not a rule against the instrument.

**Why a still, a video or a scrolly cannot do this.** A still draws one state: either the pyramid or
the fold, never both, and the fold without the pyramid is no longer this type. A video or a scrolly
can step between them — on the author's clock. What the reader needs here is to hold one state, go
back, and run the fold **the other way** to check the crossing is not an artefact of which half was
laid over which. That is a comparison whose direction the reader chooses, and it is reader-paced by
definition.

## The named trap, and this beat against it

`chart-beat/references/types/population-pyramid.md` names one failure: **sorting the bands by size**.
Its literal form is absent here — `render-directions-web.mjs` reads the frozen file in file order and
never sorts — but the sheet's *reason* is the one the fold had to be designed against: "the
silhouette is only visible when the age sequence stays intact top to bottom". The fold moves nothing
vertically, re-orders nothing, and the band sequence is identical in all three states of the page.
The staircase is built by walking the bands in their drawn order, and `assertFoldDeclaration` refuses
a profile that does not name **every** drawn band **exactly once, in the drawn order** — a silhouette
with a hole in it, or one whose steps are shuffled, is the same lie the sorted pyramid tells.

## Treatments spent

- `mirrored-halves-cross-at-a-named-band` — the band where the shape stops widening is **named**,
  because that band is the whole reading.
- `name-each-half-in-words` — left and right are named above the halves. A mirrored chart with two
  unlabelled sides is a Rorschach test.
- `the-neutral-straddles-the-centre` is **refused**, and the refusal is worth stating: the centre here
  is a boundary between two populations, not a category belonging to neither. There is nothing to
  straddle it with.

## What the web adds

Two readings, on two channels. The **fold** is the one above — a difference given as a shape and a
named crossing band. The **answer per band** is the one a pyramid's lengths cannot give: hover, tap or
tab a band and it returns both counts, the total, the difference between the sexes and the band's
share of the whole population — the share is what turns a silhouette into a claim about how many
people are where.

## The vocabulary

A new file, `skills/chart-web/assets/fold.ts` — the fifth in the family, and it owns **what may be
laid OVER what is drawn**. `filter.ts` names a set, `stack.ts` an arrangement, `level.ts` a rule
across the whole plot, `withdraw.ts` an arithmetic. None of them can express a profile: a
per-band sequence of edges that has to become **one continuous outline**, whose shape is the reading.
`foldPath` is the arithmetic the file owns — it turns that sequence plus the bands' own rows into a
staircase, in the geometry's own units and with no transform anywhere, so nothing re-opens the hole
`stack.ts` paid for.

## Colour

Both halves are drawn so the fold's own line can be laid over **either** of them: each fill is taken
as far from the ground as the line's 3:1 floor against **that fill** allows, and never nearer than
its own 3:1 floor against the ground. The component searches for that tint and **throws** if the
window is empty — on `nocturne` the untouched right-hand fill sat at 6.46:1 on the ground, which
leaves the white line only 2.75:1 over it, and the search is what closes that gap instead of shipping
a line a reader cannot follow across a bar.

## Verification

`verify-web.mjs --file renders/creme.html` — **103 passed, 2 failed, 5 skipped**.

The two reds are **not this beat's geometry and not the fold**. Both are the same check —
*"Open Sans 600 normal really DRAWS, not its fallback"* — and both measure the eyebrow's own glyph
set, `Démographie · Suisse`, which comes out 543.9 px in Open Sans against 544.1 px in Helvetica: the
width probe cannot tell the two faces apart on those particular letters. The face itself is carried
and complete — *"Open Sans 600 normal is carried at that weight and style"* and *"covers all the
characters this beat sets in it"* both pass. Changing only the eyebrow's words takes the run to
**105 passed, 0 failed** with nothing else touched, which is how the cause was isolated; the eyebrow
was put back, because rewording a page's own words to widen a probe is gaming the check rather than
answering it.

The control itself is driven rather than inferred: a real browser, each of the three directions,
once with JavaScript on and once with it **off**, clicking each pill and reading the computed style
back — at rest neither profile is drawn and no crossing is printed; choosing a pill draws its own
profile, prints its own crossing and reveals its own sentence, and takes the other one away. All of
it holds identically with the script disabled, which is the whole claim of the mechanism.

## Source

Office fédéral de la statistique · permanent resident population, 2023, 21 five-year bands.
`data.csv` is a byte-for-byte copy of `proof/static-swiss-age-pyramid/data.csv`.
