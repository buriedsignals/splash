# Stacked bar

**Argues:** Several series summed into one bar per category, so a single mark carries both the total (the bar's full length) and the composition (each segment's own length within it).

## What it's for

Several series summed into one bar per category, so a single mark carries both the total (the
bar's full length) and the composition (each segment's own length within it). It answers "what
makes up each total, and how do the totals compare" and, when the category axis runs across time,
"how the composition itself shifted" — renewables overtaking coal is this shape, not a grouped
comparison of the two.

## When not to reach for it

Precise comparison of an INNER segment across columns is exactly what this type can't give you:
only the bottom segment shares a genuine common baseline, so anything stacked above it starts from
a different, column-specific point and can't be measured accurately by eye from one column to the
next. If the middle or top segment is actually the story, this is the wrong type — a grouped bar
(every series gets its own shared baseline) or small multiples will answer the question this one
can't. It also stops working past roughly five series, where the stack turns into an unreadable
ribbon — group the smallest into "Other" rather than adding a sixth colour — and it isn't the right
tool for a part-to-whole breakdown of a SINGLE total, which is a pie's job, or a single bar's.

<!-- limit: series > 5 -->

## Where it goes wrong

Asking the chart to support a comparison it structurally can't make, and not saying so. A stack
gives a reader exactly one comparison for free — the total, or whichever series happens to sit on
the baseline — and readers will try to compare the floating middle bands across columns anyway,
because visually they look like they should be comparable the same way the bottoms are. The fix
isn't in the geometry; it's in the words around the chart: state plainly which one comparison this
particular chart supports, rather than letting the reader assume all of them are equally safe just
because they're all drawn the same way.

## What the drawing needs

One band per category, with value mapped to length via segments stacked bottom to top in a
stacking order that is IDENTICAL across every single column — reordering the series per column
breaks the "same colour, same series" contract even more badly than it would on a grouped bar,
because a reordered stack also shifts the position of every segment sitting above the swap. Put
the series a reader most needs to compare across columns on the baseline, since that's the only
band with a flat, shared reference line to measure against. The whole stack grows from a shared
zero, inherited unchanged from the single-bar rule, and the column's grand total is worth printing
on top of the finished stack whenever the total itself is part of the claim — which it usually is,
since the bar's length is half of what the chart is saying. Segments can't each carry a direct
label without crowding the frame, so — same as the grouped bar next door — a single legend in the
same top-to-bottom order as the stack is the type's one accepted exception to labelling marks
directly.

## The trap that's specific to this one

Any text that names or sits on a segment — a column total, an in-band value, a legend entry — needs
to be set in ink, never in that segment's own hue. This type's continuous sibling shipped exactly
this bug in production: its direct end-labels were painted in the band's own colour, a pale blue
measuring roughly 1.9:1 against the page, which fails text-contrast requirements outright even
though the fill itself was a perfectly legitimate, colourblind-safe choice for the MARK. The rule
that fixed it generalises cleanly to every stacked bar: the mark carries the hue, the label carries
the value, and the two are never allowed to be the same colour, no matter how well that colour
passed its own test as a fill.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the bar lengths, which are the totals and the only free comparison a stack gives
- **Then** the two segments of the row the claim names — stacked `[level, growth]`, not `[earlier, later]`, so no segment's number has to be subtracted from another
- **Then** every segment's own number, because a segment that does not start at zero cannot be measured by eye
- **Subordinate** — the zero-based scale, the row names, the two-swatch key, the unit said once
- **The claim lands on** the growth segment of the subject against the growth segment of the leader

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- stack `[earlier level, later level]` — that makes the reader subtract; the repair this type owes is that they do no arithmetic at all
- drop a number from a segment too narrow to hold one: that is a placement problem, never a licence — such a row prints both figures past the bar's end as one run, which keeps each number and shows the addition
- reach for a stack where a value FELL: a negative segment cannot be drawn, and the script says so in its own error message and names the forms that can

## Precision to assert
- one zero-based scale for every bar
- shares sum to the same asserted total, and every segment prints its own number — none silent
- all four parts of the claim are asserted: the largest adder, that it added more than the leader, that the leader started several times higher, and that the leader still holds the largest total

## Devices the worked example implements
- **`[level, growth]` stacking** — the choice that removes the reader's arithmetic, and the refusal it implies (`render-directions.mjs`)
- **Sub-pixel segments printed as one run past the bar's end** — `a-segment-not-starting-at-zero-carries-its-own-number` kept at any width (`DirectedStackedBar.tsx`)
- **A negative-segment refusal that names the right form** — a waterfall or a diverging bar (`render-directions.mjs`)

## Worked example

`proof/static-stacked-bar-lowcarbon-growth` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedStackedBar.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type stacked-bar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
