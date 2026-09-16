# Treemap

**Argues:** A treemap answers "how does a total break down, when the pieces ALSO belong to groups worth keeping together" — area encodes each item's value and items sharing a group are laid out as contiguous tiles.

## What it is for

A treemap answers "how does a total break down, when the pieces ALSO belong to groups worth keeping
together" — area encodes each item's value, and items sharing a group are laid out as contiguous
tiles, so the group itself reads as a visible region of the frame, not just a shared colour scattered
across the page. That's a second dimension a pie or a bar chart can't carry at once: a pie shows
part-to-whole but has no way to cluster related slices together spatially; a treemap can show "here's
the whole, here are its five groups, and here's how each group further breaks down internally," all in
one shape.

## When NOT to use it, and what to use instead

If there's no real grouping to preserve — every item is just its own independent category with no
meaningful cluster to keep contiguous — the nested layout buys nothing over a plain bar chart, and a
bar ranks items far more precisely than a grid of variously-shaped rectangles ever will; area
comparison between two tiles that aren't touching is a genuinely hard visual judgement, in a way length
comparison along a shared bar baseline isn't. Past about five groups the layout stops reading as
distinct clustered regions and starts reading as an unstructured mosaic — group the smallest into
"Other" or drop to the categories the story actually needs. And if precise value comparison matters
more than the grouping itself, this is the wrong trade to make at all; reach for a bar or lollipop
instead and give up the second dimension.

## The one thing that goes wrong

Two groups sharing the same colour is a real, silent failure mode once the group count runs past what
a small qualitative palette can keep distinct — which is the reasoning behind capping this type at
five groups rather than treating the cap as arbitrary. The second, sneakier failure lives in the
labels: a cell that's too small to hold its name and value cleanly doesn't get a shrunken or truncated
label here — it drops the label entirely, silently, which is the right failure mode (never mutilate a
name to force it to fit) but means small cells are easy to lose track of if nothing in the surrounding
layout compensates by grouping them visibly with their siblings.

## What the drawing actually needs

Layout is computed by area first splitting the frame by group total, then squarifying within each
group's allotted region — so tiles from the same group stay contiguous and same-coloured tiles are
never scattered across the frame the way an un-grouped treemap would scatter them. Sort within each
group by value so the biggest items in each cluster are easy to spot. Cap group colour at five distinct
hues, all colourblind-safe; within a group, individual cell shading can vary by lightness to distinguish
items without introducing a whole new hue per item. A cell only gets its name printed if it's wide and
tall enough to hold it cleanly, and only gets its value printed as a second line if there's room beyond
that — smaller cells simply go unlabelled rather than clipping text into illegibility.

## The accessibility trap

Area and colour are redundant by design here — both are meant to signal group membership — but that
redundancy only helps a colour-vision-deficient reader if the colour itself clears real contrast
against whatever's printed inside the cell. A specific, previously shipped failure: white text picked
by a naive brightness rule landed on a mid-toned green cell fill and measured under the WCAG 4.5:1 text
floor, even though the same white cleared comfortably on a darker cell in the same chart. The fix that
holds: pick each cell's label ink by the actual measured contrast against that exact fill, checking
both white and dark options and using whichever wins — never a single luminance threshold applied
uniformly across every hue in the palette.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the largest cell, then across the squarified rows in descending area
- **Then** each cell's own three registers — value, subject, basis — so a figure never appears without the kind of figure it is
- **Then** the accented thread running through the field, which is the argument and is deliberately NOT the maximum
- **Subordinate** — the two remainder cells (the thread's own and the field's), each carrying its number and its count; the key
- **The claim lands on** the thread's total area against the whole, with the largest cell visibly outside it

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- let the accent coincide with the maximum — the plate refuses to render if the largest cell ever joins the thread, because at that point a reader can no longer tell which of the two the colour means
- fold the thread into a neutral remainder: a remainder that mixes the thread with the field is not a remainder, it is a place the argument goes to hide, so the tail is split in two
- draw an accented cell with a number and no name — an assertion with nothing to attach it to; the ladder gives up a country before it gives up that name
- skip squarification: a treemap that is not squarified draws slivers, and a sliver is a shape whose area a reader cannot read at all

## Precision to assert
- tile area stays proportional to the asserted value, and the cells tile the box
- how many cells are drawn is a LADDER whose rung is chosen by whether every drawn cell can hold its own figure; what does not fit is folded into a remainder that carries its own number too
- a cell too small for all three registers drops the BASIS first and the SUBJECT second — the value is the last thing to go, and a cell that cannot hold the value does not exist

## Devices the worked example implements
- **The accent-is-not-the-maximum refusal** — a reference's rule turned into a check rather than an intention (`render-directions.mjs`)
- **A remainder split along the thread** — with each half carrying its number and its count (`render-directions.mjs`)
- **Three registers per label, dropped in a stated order, name wrapped to the cell** — because a treemap's cells are whatever shape the data makes them (`DirectedTreemap.tsx`)

## Worked example

`proof/static-treemap-europe-capacity` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedTreemap.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type treemap --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
