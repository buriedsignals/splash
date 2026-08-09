# Lollipop

## What it is for

A lollipop chart is a bar chart's thin sibling: same job (rank or compare a magnitude per category),
same baseline-at-zero rule, same everything about the encoding — just a thin stem and a dot standing
in for the solid rectangle. It is worth its own name only because of that ink difference: on a
crowded ranking with many rows, or on a video reveal where a field of solid bars can feel heavy as it
grows in, a lollipop reads as lighter without giving up a single thing a bar chart tells you. Treat
it as "a bar, minus the fill" rather than as a different chart type with its own rules — because
that's exactly what it is.

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
