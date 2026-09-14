---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

## One hue at two chromas, on a form whose own sheet asks for two hues

`chart-beat/references/types/dumbbell.md` caps colour at "exactly two hues, one per series", and its
accessibility trap says why: "there is no positional convention (unlike a slope chart's consistent
left-is-earlier reading) once the two series aren't tied to a time order", so the two dot colours are
the only thing naming which end is which. The static sibling
(`proof/more-dumbbell-life-expectancy-gains`) spends exactly that: Okabe-Ito `#0072B2` for 2000 and
`#D55E00` for 2023.

**This beat does not, and the reason is the clause in the middle of that sentence.** The two ends here
ARE tied to a time order — 2000 and 2023, two dated readings of one measure — and the beat asserts
that every one of the ten gained, throwing if any did not. So the earlier head is to the left of the
later head on every row, without exception, and the positional convention the trap says is missing is
present and proven. What remains is two states of one quantity, which is word for word
`two-states-of-one-measure-are-one-hue-at-two-chromas`: Statista's "the tint of the same hue, not a
second hue, for the earlier state — two states of one measure should not read as two categories".
Both heads are the direction's own accent, the earlier one mixed toward the direction's ground as far
as the non-text floor against that ground allows. **No imported second hue.** The legend naming the
two years is kept anyway, and stays load-bearing: the trap's other half does not depend on the hue
count.

## What that costs, measured, and how it is paid

`adjustToContrast(…, NON_TEXT_CONTRAST_MIN)` pins whatever it touches to 3:1 against the ground. Both
the earlier head and the connector were put through it independently, and two different marks pinned
to the same floor on the same ground are the same value by construction. Measured on the page as it
shipped:

| direction | earlier head / ground | connector / ground | **earlier head / connector** |
|---|---|---|---|
| creme | 3,139:1 | 3,068:1 | **1,023:1** |
| rapport | 3,135:1 | 3,072:1 | **1,020:1** |
| nocturne | 3,055:1 | 3,011:1 | **1,015:1** |

The 2000 head was invisible against the bar it terminates: the row read as one bar with one head, a
lollipop, which is the one thing this type's own caveat says it is not.

**No colour fixes this, and the arithmetic says so rather than a preference.** Every mark that clears
3:1 against creme's ground has a relative luminance at or below 0,291; the connector sits at 0,283;
so a head both lighter than the later head and at least 3:1 from the connector would have to be
darker than the later head, which is the treatment applied backwards. The most an earlier head can
reach against this connector is 2,16:1 — which is exactly what the later head measures, because the
darkest an earlier head may be is the later head itself.

So the separation is geometric, in the general form the scatter's yardstick already states: **a mark
is legible over a fill when either the mark or its casing separates from that fill.** The connector is
thinned to the scaffolding this type's sheet asks for — "not a third mark competing with the two dots"
— and each head is drawn on a ground casing, which measures 3,068:1 / 3,072:1 / 3,011:1 against that
connector. The component asserts all of it and refuses rather than draws.

## The reader's yardstick is not the accent

The two upright references a reader lays across the plot are drawn in full ink, never in the accent:
the accent already carries the two states and the subject's own gain, and a hue meaning both would
leave the reader no way to tell the page's claim from their own question. Ink against the later head
measures 3,075:1 in creme, 2,962:1 in rapport and 1,646:1 in nocturne — under the floor twice — which
is why each reference is drawn twice, a wider ground casing under the dash on the same dash pattern,
and why the beat checks every fill a reference crosses rather than the ground alone.

Nothing else on the page is chromatic. The axis labels, the gridlines, the row names and the delta
column are steps off the direction's own ground, computed by `deriveFurniture` at render time and
never written here as a literal.
