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

**The subject carries no convention a reader already holds.** Income against life expectancy has no
inherited colour the way a political map or an energy mix does, and there is no second series to
name. So the newsroom's own accent is the right answer, and there is exactly one thing on this page
for it to carry.

## One accent, spent once

This page has **no series**. A scatter spends both axes on a measured value, and this beat's claim
is about the SHAPE of the whole cloud — `the-distribution-is-furniture-and-the-case-is-ink`. So the
165 marks are not a palette decision at all: they are furniture, one neutral step off whatever
ground the direction brings.

The accent carries the one argument the page asserts and nothing else: **the 30 000 $ threshold, and
the band of life expectancy the 41 countries above it fit inside.** The dashed rule and the band are
one spend, not two — they are the same sentence drawn twice, a line saying *here* and a band saying
*this wide*.

**The reader's yardstick is deliberately NOT in the accent.** When a reader parks the control on a
country, two references cross the plot at that country's own income and its own life expectancy.
Painting those in the accent would make one hue mean both "the claim this page makes" and "the place
you asked about" — the accent spent twice, on two arguments that are not the same argument. They are
drawn in the direction's full ink instead, which is also what `level.ts` requires of its own control
chrome for the same reason: on a plate that needs a yardstick, colour is already carrying something.

## Measured, on the colours this beat actually ships

`deriveFurniture` computes the ink, the muted and the grid off each direction's ground at render
time; nothing below is written into the component as a literal.

| | creme `#FFFCEE` | nocturne `#111044` | rapport `#FFFFFF` |
| --- | --- | --- | --- |
| accent, lifted to the non-text floor | `#1755b2` — **6,852:1** | `#53e1c1` — **10,926:1** | `#1e5a88` — **7,309:1** |
| the mark, **as composited at its own opacity** | `#3b3936` → `#939189`, **3,068:1** | `#bebfcc` → `#70708f`, **3,727:1** | `#3b3b3b` → `#939393`, **3,072:1** |
| the yardstick's ink | 20,411:1 | 17,775:1 | 21,000:1 |
| the yardstick's ink against the accent rule it crosses | **2,979:1** | **1,627:1** | **2,873:1** |
| the yardstick's ground casing against that same accent rule | **6,852:1** | **10,926:1** | **7,309:1** |

Two of those rows are the reason this file is not a paragraph of intent:

- **The mark is measured as painted, not as declared.** The build this replaced lifted the dot fill
  to 3,068:1 and then drew it at `fillOpacity 0,6`, so the mark a reader actually saw measured
  1,752:1 in creme, 1,968 in nocturne and 1,744 in rapport — every one of them under the floor the
  code believed it had cleared. The fill is now solved backwards from the composite, and the
  component refuses the direction outright if no in-gamut fill composites onto the floor.
- **Ink over the accent is under the floor in all three directions**, and the flat yardstick crosses
  the accent rule every single time, at the one landmark the comparison is about. Each reference is
  drawn twice — a wider ground casing, then the dash on top, both on the same dash pattern — and the
  guard measures the dash *and* the casing against every fill the rule crosses, not against the
  ground.

Nothing else on the page is chromatic. The axis labels, the gridlines, the notes and the
yardstick are steps off the direction's own ground, computed by `deriveFurniture` at render time and
never written here as a literal.
