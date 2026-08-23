# Approved

**Output** `1-what-the-world-wrote-down` · **decided** 2026-08-23 by the journalist.

## What I was shown, and what I did before saying yes

The rendered page, opened in a real browser at **1600×900**, **2990×1718** and **375×812**, both as
it ships (the `__MAPTILER_KEY__` placeholder, so the baked plate is what draws) and with a real
MapTiler key in it (the live map, which is what a reader gets). Then driven, not described.

- **Hover, live.** A real pointer at Afghanistan's own position answers
  `Afghanistan : 641 human rabies deaths reported to WHO, 2024` at all three widths. The skill's own
  live probe drove 26 of 39 sampled marks at 1600×900 with **0 wrong**, and 24 of 39 at 900×1400
  with 1 wrong (Norway, no-data, returned a hidden tooltip).
- **Hover, fallback.** 93 of 194 buttons answer for themselves at 1600×900, 144 at 2990×1718, 24 at
  375×812. The rest are buried under a neighbour's 28px disc, which on a world camera is the norm
  and not a surprise — the production run printed 68 of 160 buried at 1600px before I ever opened
  the page.
- **Keyboard.** Tab reaches a mark and the same detail appears from focus alone, at all three
  widths, live and dead. 194 focusable marks, none skipped.
- **The numbers.** Every value on the page is `checkClaim`'s, and `checkClaim` reads the joined
  values rather than the title: it caught my own first draft claiming 3 021 drawn when 3 018 are.
  The 100 drawn readings sum to **3 018**; WHO's register holds **3 021**; the difference is French
  Guiana's 3, which has no shape. Both numbers are on the page, in the right places.
- **Colour, sampled from the DOM rather than judged by eye.** No-data `rgb(52,52,52)`, below class 1
  `rgb(72,68,57)` and above the ground `rgb(22,25,27)` — a silence reads as neither a value nor the
  page. India, China, Russia carry the no-data fill; the United States, Canada and Brazil carry
  class 2 (they reported 3, 1 and 2); Vietnam carries class 1 (it reported 0); Afghanistan, the
  Philippines and Ghana carry class 6. Every one of those is the right class.
- **JavaScript off.** The plate draws, all 194 shapes, all 194 `title` tooltips, all 194 table rows,
  the legend with its no-data swatch, both callouts and the caveat. Nothing the claim depends on
  needs the script.

## What I accepted knowingly

- **Afghanistan, the subject of this beat, cannot be hovered in the FALLBACK layer.** A real pointer
  at the centre of its own button opens Pakistan's tooltip at 1600×900 and Uzbekistan's at 375×812,
  because on a world camera the 28px buttons bury each other. I signed it because live — which is
  what a reader gets — Afghanistan answers correctly at every width, because its number is printed
  under the map in the accent, and because Tab and the table both reach it. It is written up for
  the maintainer as a defect of the format on a world camera, not of this story.
- **33 to 78 marks have no pointer path at all**, depending on width, and 50 measured live at
  1600×900. They are drawn smaller than a pixel. Nothing engineers a target for them. Their reading
  is the keyboard and the table, and `marksStrandedWithNoChannel` confirms both carry every one.
  Andorra, Bahrain, Barbados, Brunei and the small island states are the population.
- **The map does not fill its box on the width**: 66.6 % at 1600×900, 87.4 % at 2990×1718, 99.4 % at
  375×812, and the spare room is page ground rather than basemap. `verify-fills-the-box.mjs` exits
  non-zero on this page. I signed it because the gutters read as a margin rather than as a fault and
  the map is complete inside them — but it is a defect of the format and it is written up as one.
- **The page is 3 622 698 bytes**, 1.39× this format's own recorded ceiling of 2 605 355. 869 KB is
  the inlined maplibre-gl, 1 739 KB is this beat's own 194 shapes in lon/lat for the live layer, and
  the rest is the plate. Nothing refused it; I am recording it rather than discovering it later.
- **At 375×812 the map is 341×189 px.** That is a legible world map for the shape of the argument —
  a bright band across Africa and South and South-East Asia, grey over India and China — and it is
  not a legible map of any one country. The table is what a phone reader is actually served, and it
  is complete.

## What I would not have signed

An earlier render carried `641.0` in every label, tooltip and table cell — a count of people with a
decimal place, read aloud by a screen reader as "six hundred and forty-one point zero". Fixed here.

And I would not have signed a version that drew the 94 silent countries as zeros, or that drew
France with French Guiana's 3 in it, or that put a triangle on the legend scale for India. All three
were live possibilities in the machinery I started from; each one is refused explicitly now, in the
file that would otherwise have done it.

## Re-approved, 2026-08-23 17:05 — review-2

One change, and it is the reason the first review is superseded rather than amended. The legend now
names the two silences **in words**: the first class tick reads `0 — filed, reported none`, and the
no-data swatch reads `No return filed — 94 countries. Not a zero.`

I asked for that after measuring what the colour was doing. The derived no-data fill `#343434` sits
**1.28:1** from the ramp's own first class `#484439` — and **1.32:1** on the white ground the worked
beat ships on, and 1.27:1 and 1.31:1 on the two other grounds I tried, so it is not this palette. The
non-text floor is 3:1. The sea and a no-data country are **1.02:1** apart here and **1.00:1** on
white; they are told apart by hue alone. `assertSurfacesRead` passes all of it, because it measures a
luminance GAP against a 0.02 floor — 0.0237 here, 0.2075 on white — and never a contrast ratio.

The whole story turns on "filed nothing" and "filed a real zero" being opposite facts. On the colour
alone a reader could not have told them apart on any ground this format ships. They are separated by
text now, which is what `types/choropleth.md` asks for anyway. It is written up as a defect of the
format.
