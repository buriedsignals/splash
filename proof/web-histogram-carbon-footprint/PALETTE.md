---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; **the delivered page is drawn in
whichever direction governs it, never in this one**, so every ratio below is measured twice — once on
the recorded pair, and once on each direction's own ground and accent, which is what a reader
actually sees.

`palette`'s subject option was checked and does not apply, the same way it does not on the static
sibling: the subject is the distribution of CO₂ per person across 213 countries, and
`matchConvention` fires on none of the four grounded conventions (renewables, fossil, water, heat).
When no convention applies, the house theme wins.

## Where the accent lands, and why it is not where this type's sheet puts it

`references/types/histogram.md` asks for the accent on the **median rule**. The static sibling
refused it and took no accent at all, because its rule crosses a mid-grey bar. **This beat refuses it
the other way: the accent goes on the two bins the headline counts, and the median rule takes none.**
The claim is *127 of 213 countries under 4 t*, the bins `[0,2)` and `[2,4)` are exactly the countries
it counts, and `the-distribution-is-furniture-and-the-case-is-ink` says the shape is furniture and
the case is the ink. A hue spent on a reference line instead would leave the sentence the title makes
uncoloured on a plate of twenty-one identical bars.

Measured on what each direction actually paints:

| | ground | accent | accent ÷ ground | neutral bar ÷ ground | accent ÷ neutral bar |
| --- | --- | --- | --- | --- | --- |
| recorded | `#FFFFFF` | `#0B7A75` | 5,18:1 | 3,03:1 | 1,71:1 |
| creme | `#FFFCEE` | `#1757B6` | 6,64:1 | 3,03:1 | 2,19:1 |
| rapport | `#FFFFFF` | `#1F5C8B` | 7,09:1 | 3,03:1 | 2,34:1 |
| nocturne | `#111044` | `#4FE0C0` | 10,80:1 | 3,02:1 | 3,58:1 |

The accent clears the non-text floor against the ground everywhere, and it clears the **text** floor
too — 4,5:1 — which it has to, because the claim's own note (« 59,6 % des pays sous 4 t ») is set in
it. That is this type's own recorded failure, avoided by measurement rather than by luck: the sheet
records a vermillion chosen as a bar fill measuring 3,9:1 as text on white.

**The last column is not a failure and is recorded so it is not read as one.** Two adjacent bars are
told apart by the 1 px ground hairline drawn between them, not by their ratio against each other; an
accent bin and a neutral bin never touch anywhere else on this plate. Clamping the two fills apart
would spend a channel on a separation the geometry already makes — and two colours clamped
independently to the same floor on the same ground come out identical by construction, measured at
1,023:1 on the dumbbell.

## Every full-height rule is cased, and that is arithmetic rather than a look

This plate carries four rules that run the whole height of the plot: the median, drawn in every
state, and the reader's three coverage bands. A rule that long is measured against **what it
crosses**, not against the page — `references/types/histogram.md`'s own amendment, measured on the
static sibling on 2026-08-10.

This page reproduced that defect exactly and unmeasured. The median rule was `mix(ground, ink, 0.6)`,
which reads 5,68:1 against the creme ground and **1,17:1 against the accent bar it spends its length
inside** — 1,23:1 in rapport, 1,57:1 in nocturne. The static beat's answer was to ink its rule near
black, which works there because the bar it crosses is `#616161`. It does not work here: the median
falls inside an **accent** bin, and no ink reads at 3:1 over both a near-white page and this accent —
black reaches only 2,96:1 on rapport's `#1F5C8B` and 4,05:1 on the recorded `#0B7A75`.

So every rule is **cased**: a ground-coloured dash under the ink dash, same pattern, so the casing
shows only under the dashes and the rule is measured against its own casing wherever it crosses a
mark. The dash is the direction's ink clamped to the text floor — 20,41:1, 21,00:1 and 17,78:1
against the three grounds, and the same against the casing, which IS the ground. The component
asserts this over every fill on the plate (ground, neutral bar, accent bin, gridline) rather than
leaving it to a look.

## What the reader's control is drawn in, and what it is not

**The yardstick is not the accent.** The accent carries the page's own claim; a hue that also meant
"you pressed this" would leave the reader no way to tell the page's argument from their own question.
So the chosen bin takes an **ink ring** — 6,74:1, 6,92:1 and 5,89:1 against the neutral bar it rings,
20,41:1, 21,00:1 and 17,78:1 against the ground — and never a recolour.

**A bar beyond the chosen band steps back geometrically, not chromatically.** It loses its fill to
the ground and keeps its own outline in the neutral, which measures 3,03:1, 3,03:1 and 3,02:1 against
the three grounds — the non-text floor, because a bar that steps back still has to be seen. A second
muted tone was not introduced, for the reason the table above already gives.

Nothing else on the page is chromatic. The axis labels, the gridlines, the baseline and the control's
own chrome are steps off the direction's own ground, computed by `deriveFurniture` at render time and
never written here as a literal. `render-directions-web.mjs` reads both recorded values with
`readPalette` and names no hex of its own.
