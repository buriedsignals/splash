# Lollipop

**Argues:** A lollipop chart is a bar chart's thin sibling: same job, same baseline-at-zero rule, same encoding — just a thin stem and a dot standing in for the solid rectangle.

## What it is for

A lollipop chart is a bar chart's thin sibling: same job (rank or compare a magnitude per category),
same baseline-at-zero rule, same everything about the encoding — just a thin stem and a dot standing
in for the solid rectangle. It is worth its own name only because of that ink difference: on a
crowded ranking with many rows, or on a video reveal where a field of solid bars can feel heavy as it
grows in, a lollipop reads as lighter without giving up a single thing a bar chart tells you. Treat
it as "a bar, minus the fill" rather than as a different chart type with its own rules — because
that's exactly what it is.

<!-- same idea as: Bar and column -->

## When NOT to use it, and what to use instead

If the categories are few (say, under five) and the point is simple magnitude comparison, a plain
bar is the more familiar shape and there's no real ink saved by thinning it — reach for lollipop when
row count is high enough that the ink reduction actually matters, or when the visual register (a
video reveal, a dense ranking) calls for something lighter. If the values cross zero — some
categories positive, some negative — a plain lollipop's single stem-from-zero doesn't read the sign
change as clearly as a diverging bar with a colour split at the zero line does; use that instead. And
if two values per category matter (not one magnitude but a comparison of two), this is a dumbbell's
job, not a lollipop's — don't try to force two dots onto one stem.

## The one thing that goes wrong

Because a lollipop is a bar underneath, it inherits the bar's non-negotiable rule: the value axis
must include zero, full stop, because the stem's LENGTH is what a reader measures and a floor that
doesn't start at zero silently changes what that length claims. The failure specific to this type's
thinner mark is contrast: a lollipop's accent colour lives on a thin stem and a small dot rather than
a wide bar fill, and it's tempting to carry that same accent colour into the VALUE LABEL sitting next
to the dot for visual consistency — that has previously failed WCAG text contrast in exactly this
codebase (a saturated accent hue measured well under 4.5:1 as running text, despite reading fine as
a thin mark). The rule this type needs stated plainly: the label carries the value, the mark carries
the hue, and the two are never the same colour.

## What the drawing actually needs

One category axis (a band per row) and one linear value axis running from zero to the data's own
max — the stem runs from the zero baseline to the value, capped with a dot at the value end, and
that's the entire mark. Sort rows by value (descending is the default reading order for a ranking;
ascending or an explicit external order — geography, chronology — are the deliberate exceptions).
Rows should be spaced with enough band padding that the stems don't read as a solid mass, which is
part of why this type exists as distinct from a bar in the first place. Reserve room on the value
side of the plot for the label sitting next to the rightmost (or largest) dot before it clips the
frame edge, and size the category-label gutter to the widest category name you're about to draw
rather than a constant — this type has previously truncated category labels because a fixed gutter
was too narrow, the same failure class as slope and dumbbell's label gutters. If one row is the
story's subject, it's allowed exactly one accent stem-and-dot; every other row stays a neutral,
undifferentiated colour.

## The accessibility trap

Value labels riding on the accent colour rather than the page's ink is the specific, previously-shipped
failure for this type — not a general reminder, an actual bug: an Okabe-Ito accent hue used as
running text measured under WCAG's 4.5:1 floor even though the same hue was perfectly fine as a mark
colour on a stem or a dot. The fix is structural, not cosmetic — keep every label in ink, keep every
accent on the mark, and treat "which element is text and which is a mark" as the thing that decides
its colour, not "which elements are near each other."

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the heads, whose HEIGHTS FROM ZERO are the first reading — that is what separates this from the dumbbell, where the gap is the first reading
- **Then** the paired stems, the earlier state a lighter TINT of the later state's own hue, so a pair reads as one subject in two states rather than as two subjects
- **Then** the change glyph — the direction gets a glyph before it gets a number, so the sign survives a glance, and the triangle is drawn as a PATH rather than set as a character no face guarantees
- **Subordinate** — the value above each head, the unit said once, the dates said once, and the four reserved rows under the baseline (dates, change, name, and the selection rule)
- **The claim lands on** the two levels the ratio is taken between

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-draw-earlier-state` — draw the earlier state in grey or in a second hue — the same hue, lighter, taken as far toward the ground as it can go while still clearing the non-text floor, because a past nobody can see is not a state but an absent mark
- `no-lift-stems-zero` — lift the stems off zero: a lollipop is read as a height from zero, and a height a reader cannot compare is a dot on a line
- `no-print-value-label-accent` — print a value label in the accent, or reserve only three rows under the baseline when the plate also has to say which cases it chose

## Precision to assert
- one zero-based value scale for every stem
- the cases are a computed rule, and the plate refuses if the subject did not move as claimed, if the ratio did not fall into the stated band, or if the set does not carry most of the whole
- the stems owe six value-bands of room — the tallest stem, the number above its head, and enough between pairs to rank them by eye — and the copy ladder spends until that is met

## Devices the worked example implements
- **One hue at two chromas** — `two-states-of-one-measure-are-one-hue-at-two-chromas`, with the tint floored against the ground (`DirectedLollipops.tsx`)
- **A change triangle drawn as a path** — no dependence on a glyph the face may not carry (`DirectedLollipops.tsx`)
- **Four reserved rows under the baseline** — including the line that states the selection rule (`render-directions.mjs`)

## Worked example

`proof/static-lollipop-co2-per-person` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedLollipops.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type lollipop --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
