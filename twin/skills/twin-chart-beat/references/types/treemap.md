# Treemap

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
