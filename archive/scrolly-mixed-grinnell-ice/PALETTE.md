---
ground: "#FFFFFF"
accent: "#B4451F"
origin: subject
---

The answer recorded for this beat.

**Why the choice is made here rather than taken from the house theme.** `palette`'s
`matchConvention` fires on `renewable`, `coal|fossil|oil`, `water` and `heat|temperature|warming`.
This beat's subject line — *"four photographs of Grinnell Glacier, the park it sits in, and the
world's reference glaciers, 1938 to 2023"* — contains none of them, so there is no grounded
convention to inherit and the choice has to be argued.

**One accent, spent on one idea, across THREE media.** That is the constraint a mixed beat has that
a single-visual one does not: an accent that means "the highlighted run" on the chart and something
else on the map is two vocabularies in one piece, and a reader crossing a handover has no way to know
they changed. So the accent here marks exactly one thing wherever it appears — **the ice this story
is about, and the reader's own position in its record**:

| Layer | The accent marks | Everything else |
| --- | --- | --- |
| photographs | the cursor on the time rail — where in the 71 years the reader is | the rail, its four ticks and the year in derived ink and muted |
| map | the glacier's own outline, and the two marked places | the park's outline in ink at 0.85, the basemap as it comes |
| chart | the run of the record the step is reading, and the marked year | the other 60-odd years in derived muted |

**Why a warm dark red and not an ice blue.** A blue is the obvious first thought for a glacier and it
is wrong twice here. On the map it competes with the water the story is about — the lake that replaces
the ice in the fourth photograph is the subject, not the annotation. And on the chart the accent marks
loss, where a cool institutional hue reads as the series' own brand colour and takes away the beat's
ability to say, in colour, *this is the part that is going*.

**Why this particular red.** `#D62728`-family reds sit near 4:1 against white and this accent has to
survive as a 3px glacier outline over live basemap tiles and as a 4px line at 375px. `#B4451F` is
measured at **5.51:1** against this ground — clear of the 4.5:1 floor for body-size text and well
clear of the 3:1 floor a graphical object has to hold (WCAG 2.2 SC 1.4.11). The sibling beat
`scrolly-one-chart-swiss-life-expectancy` reached the same value from a different subject; that is a
coincidence of two arguments landing in the same place, not an inheritance, and if that beat's answer
changed this one would not.

**Where words are never in the accent.** Every label, annotation, tick, year, scale figure and credit
in this beat is `ink` (21:1 on this ground) on an OPAQUE chip of the ground. Over a photograph or a
basemap that is the only way a contrast figure means anything: a translucent scrim's effective colour
is a blend with whatever the picture shows behind it at a given scroll position, which is not a value
anybody can assert.

`render.mjs` and `MixedFrame.tsx` name no hex of their own. Both colours arrive through
`readPalette`; `ink`, `muted` and `grid` are derived from the ground by `deriveFurniture` and handed
to the frame as props.
