---
ground: "#16191B"
accent: "#D4A853"
origin: newsroom
---

The answer recorded for this story. `proposePalette` was run against `NEWSROOM.md` and the beat's own
subject line; `matchConvention` returns nothing for "life expectancy at birth, by country" -- the
grounded conventions are renewables, fossil, water and heat, and none of them fires on this phrase --
so the newsroom's own colours lead, which is what the proposal recommended.

Option 1, recorded exactly as proposed: Buried Signals's `brandColor: #D4A853` on its
`ground: #16191B`, measured at **8.01:1**, clear of the 3:1 non-text floor. The house's second
accent `#5B8A8A` also passed, at 4.58:1, and was not the recommended one.

`origin: newsroom` names where these came from. No journalist answered in this run; the proposal's
own recommended option is what was recorded, and nothing was invented.

**This is the colour the DATA is drawn in, not only an outline.** The class shading is the only
thing on this map a reader reads a quantity off, so the accent reaches it through `dataRampEnd`,
and both the baked plate and the live MapLibre layer come through that one function.

**Two constants this format holds fixed are wrong on this ground, and this beat overrides them in
its own copy rather than in the shared core.** `NO_DATA_FILL` (`#B9B9B9`) and `WATER_FILL`
(`#AAC9E0`) are both LIGHT-ground values: measured here, `#B9B9B9` has relative luminance 0.485,
which on this ground lands between the fourth and fifth class of the ramp, and `#AAC9E0` at 0.557
is brighter than four of the five classes -- an ocean that outshines the data and a no-data country
that reads as a high reading. See `NOTES-FOR-MAINTAINER.md`.
