---
size: landscape
type: small-multiples
---

# Beat — All sixteen rose, and the lowest starters rose fastest

**Type:** small multiples. **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above, which is the statement that counts.

The first `small multiples` beat in this tree.

## Why this beat draws the same data as the slope, deliberately

`proof/static-slope-europe-lowcarbon` draws the same sixteen countries on the same two dates and can
carry **six** of them. A slope has no value axis, so it owes every end value it prints, and sixteen
labels on one rail push each other off their own lines — the component measures that and refuses.

Split into panels, each pair gets its own space and its own number, and **all sixteen fit**. The cut
bought the count. That is the argument for this family, and having the two beats side by side is what
makes it checkable rather than asserted.

## The claim

**All sixteen countries raised their low-carbon share between 2000 and 2024, and the ones that
started lowest rose most.** Denmark, second-lowest in 2000, gained 74 points; Sweden, already at
96.7 %, gained 2.

The second half is a claim about a *pattern*, so it is derived rather than eyeballed: the correlation
between the 2000 level and the gain is computed and asserted to be clearly negative (it is −0.76). A
grid of panels is exactly the form that makes such a pattern visible, and exactly the form in which
it would be easy to believe one that was not there.

## What the corpus decided

`panels-share-one-scale-or-they-are-not-multiples` — one scale, 0 to 100 %, governs all sixteen.
Ferdio's words: that is what separates this from sixteen unrelated charts in a grid.

`the-cut-replaces-the-boundary` — no rules between panels, no alternating tint, no grid. The gap is
the boundary. Each panel draws its own short baseline, exactly as wide as its own pair, because a gap
that means "new axis" has to look like one.

`what-is-shared-is-stated-once-and-what-varies-is-repeated` — the two dates and the shared ceiling
are common to every panel and are stated once, in the key. The country's name and its delta belong to
the panel and are drawn in it. The test the treatment sets: a reader looking at one panel can read it.

## The defect that was invisible to every guard

The first render reserved the panel's block and let the grid divide what was left. That put each
name 7px under its own bars and 12px under the **previous** panel's delta. Nothing collided, every
guard was green, and `Grèce` read as though it belonged to Denmark's block. On a grid, **proximity is
the grouping** — it is the only thing saying which name goes with which pair — so the gap between
panels is now part of what a panel owes, and the plate checks that it is at least twice the gaps
inside one before it draws.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data. The 2000
and 2024 rows for the sixteen countries are frozen beside this beat as `data.csv`, duplicated rather
than linked, so the beat renders and audits alone.
