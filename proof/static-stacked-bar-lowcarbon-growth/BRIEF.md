---
size: landscape
type: stacked-bar
---

# Beat — Spain added more low-carbon electricity than France

**Type:** stacked bar. **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above, which is the statement that counts.

The first `stacked bar` beat in this tree.

## The claim

**Spain added more low-carbon electricity between 2000 and 2024 than France did — 119 TWh against
50 — having started five times lower. France is still, by a distance, the largest producer of it.**

All four parts are asserted: that Spain is the largest adder, that it added more than France, that
France's 2000 level was several times Spain's, and that France still holds the largest 2024 total.
The last is what makes the sentence interesting rather than merely arithmetic.

## What this beat stacks, and why not the obvious thing

`100.datavizproject.com`'s viz23 gives the rule: stack **`[level, growth]`**, not
`[earlier level, later level]`, *"so no segment's number has to be subtracted from another either."*
The reader gets the 2000 level, the increase since, and the 2024 total, and does no arithmetic at
all — which is the whole repair a stack owes.

That choice also decides what the beat cannot draw: a country whose low-carbon generation FELL has a
negative segment, and a stack cannot draw one. The script asserts none did, and says in its own error
message that a negative belongs to a different form — a waterfall, or a diverging bar.

## What the corpus decided

`a-segment-not-starting-at-zero-carries-its-own-number` — Information is Beautiful names the defect:
*a segment that does not start at zero cannot be measured by eye.* So every segment prints its own
number, and a segment too narrow to hold one is a placement problem, never a licence to drop it.
Ireland's 2000 level is 1 TWh against a 583 TWh scale — under a pixel — so such a row prints both its
figures past the bar's end as one run, `7 + 59`, which keeps each segment's number and shows the
addition the stack is asking for. **Twenty-four numbers, none silent.**

`the-stack-gives-back-the-total-it-hides` — the 2024 total is printed past the bar in the value
register, while the segments carry theirs in the annot register. Three facts, three places.

`two-states-of-one-measure-are-one-hue-at-two-chromas` — the two segments are one measure at two
moments, so one hue at two strengths. The key sits over the segments it names, each word in its own
segment's fill, and there is no swatch block.

## The cut

Twelve bars, not sixteen: a bar that must hold its own number is at least the annot register's band
thick, and sixteen missed by half a pixel in two directions of three. The rule is printed on the
plate — the twelve that added most, of sixteen studied, all of which rose.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data. The 2000
and 2024 rows for the sixteen countries are frozen beside this beat as `data.csv`, duplicated rather
than linked, so the beat renders and audits alone.
