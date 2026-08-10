---
ground: "#FFFFFF"
accent: "#0B7A75"
accents: "#C1440E, #1F6FB2"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house palette in full, as it stands in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` — `brandColor: "#0B7A75"` plus
`accents: "#C1440E, #1F6FB2"`, on `ground: "#FFFFFF"`. `origin: newsroom` says who chose them. The
three measure 5.18:1, 5.12:1 and 5.28:1 against the ground, all clear of the 3:1 mark floor SC
1.4.11 sets, and each reads apart from the other two on both of `seriesInks`'s measures.

**This beat's render MOVES, and that is the point of recording it.** Until now
`StackedBarVideo.tsx` built its three band fills as `[accent, muted, muted]` — the house colour
once, and the FURNITURE grey twice, the second of the two at half opacity to tell it from the
first. `muted` is derived from the ground for axis labels and the source line; its whole job is to
recede. So two of the three bands of a stacked bar were drawn in a colour nobody chose, and a
newsroom that changed its accent would have watched exactly one third of the chart move. That is
the defect the owner reported, in its clearest form.

The three bands are three CATEGORIES — solar and wind, hydropower, nuclear and other — not three
steps of one ordered scale, so three distinct house hues encode them correctly where a single hue
shaded three ways would imply a ranking the data does not carry. `render.mjs` takes them through
`seriesInks(palette, 3)`, which returns the recorded accents first and in the recorded order, so
the mapping band→colour is the one written here and nothing is invented. The half opacity on the
third band went with the grey: it existed only to separate two identical fills, and three distinct
inks separate themselves.

`twin-palette`'s subject-fit branch was checked and correctly declines to decide this one:
`matchConvention` returns null on a multi-match, and a Swiss electricity mix hits `renewables` and
`water` at once. Which band carries the argument is the journalist's decision, not a lookup table's
— so the house palette wins, which is exactly this file.

The furniture (ink, muted, grid), the reference rule and the subject highlight all still derive
from `ground` and the primary accent by `deriveFurniture`. Delete this file and the render refuses,
naming every directory it searched.
