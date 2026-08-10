---
ground: "#FFFFFF"
accent: "#B4451F"
origin: subject
---

The answer recorded for this beat.

`palette`'s proposal was run for this beat's own subject line — *"life expectancy at birth in
Switzerland, 1876 to 2023, and the two years it fell"* — and returned the house theme plus **no**
grounded convention: `matchConvention` fires on `renewable`, `coal|fossil|oil`, `water` and
`heat|temperature|warming`, and none of those words is in a subject about mortality. So the choice
was made here, deliberately, and the reasoning is recorded because nobody else can reconstruct it
from the table.

**Why not the newsroom's own teal** (`#0B7A75`, the house accent the sibling chart beats take). The
accent on this beat is spent on exactly one thing across all four steps: **the years the line goes
DOWN**. A cool, institutional green-blue is the wrong signal for "this is the part where it got
worse" — it reads as the series' own brand colour, and the beat then has no way to say, in colour,
that the highlighted run is the exception rather than the subject. A warm dark red does say it, and
it says it in the direction every reader already has for a chart of a life measure.

**Why not a pure red.** `#D62728`-family reds sit near 4:1 against white and this accent has to be
readable as a 4px line at 375px, where the line is the only thing carrying the reading. `#B4451F` is
a dark warm red measured at **5.51:1** against this ground — clear of the 4.5:1 floor for body-size
text, and well clear of the 3:1 floor a graphical object has to hold (WCAG 2.2 SC 1.4.11). For
comparison, the house teal measures 5.18:1 on the same ground, so nothing is lost in contrast by
choosing the warm end.

The annotation labels are NOT drawn in the accent: they are `ink` (measured 21:1 on this ground) on
an opaque chip of the ground, so the one place a reader reads WORDS is never asked to read them in
the mark's own colour.

**What the accent is spent on, one state at a time — never a palette, one mark per reading.**

| Step | The accent marks | Everything else |
| --- | --- | --- |
| 1 the whole run | nothing — the accent is absent, and that is the point: this is the shape before any reading | the line in derived muted |
| 2 one year | the 1917→1918 segment and the dot on 1918 | the other 147 years in derived muted |
| 3 the recovery | the 1918→1921 run, and the band behind it | the rest of the line in derived muted |
| 4 the decade | the 2019→2020 segment and the dot on 2020 | the rest of the decade in derived muted |

`render.mjs` and `ChartFrame.tsx` name no hex of their own. Both colours arrive through
`readPalette`; `ink`, `muted` and `grid` are derived from the ground by `deriveFurniture` and handed
to the frame as props.
