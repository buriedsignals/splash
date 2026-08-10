---
ground: "#FFFFFF"
accent: "#C1440E"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours. `#C1440E` is the FIRST entry
of `accents` in `skills/splash-twin/assets/root-template/NEWSROOM.example.md`
(`accents: "#C1440E, #1F6FB2"`), drawn on the house `ground: "#FFFFFF"`. A house palette is rarely
one colour, and a beat reaching for the newsroom's second recorded accent instead of its primary is
still the newsroom choosing — hence `origin: newsroom`.

`twin-palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — income against
life expectancy across the world's economies — fires none of them. `#C1440E` is ALSO the value the
`heat` convention carries, and that coincidence is worth naming so nobody later reads this beat as
a subject-fit one: there is no heat in this beat, and the colour is here because the newsroom
recorded it, not because a convention proposed it.

One accent, because the beat draws one cloud and picks three points out of it. The unnamed points
are the furniture's `muted`, derived by `deriveFurniture` from `ground`; a second hue would encode a
grouping this scatter does not carry.

Measured against this ground: 5.12:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
