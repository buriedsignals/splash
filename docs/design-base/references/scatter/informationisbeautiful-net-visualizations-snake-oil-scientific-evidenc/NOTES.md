# Information is Beautiful — "Snake Oil Supplements?"

- url: https://informationisbeautiful.net/visualizations/snake-oil-scientific-evidence-for-health-supplements/
- archive: informationisbeautiful
- type: bubble chart — one positional axis (ordinal, verbal), area and colour channels
- export: web
- readAs: the interactive as the page serves it, in the page screenshot, at rest

## What it is

Every popular nutritional supplement as a circle: **y = strength of scientific evidence** (an
ordinal scale whose levels are words, `STRONG` downward), **area = popularity in Google hits**,
**fill = a two-value category** (`One to Watch` in orange, everything else in blue). Horizontal
position is packing, not an axis.

Half of this family: two quantitative variables are encoded, but only one by position.

## What it does with information

**The axis is verbal, and its name and its levels are two different chips.** The axis name sits in a
**filled black chip with white capitals** — `EVIDENCE` — at the head of a dotted vertical rule; each
level on that rule sits in an **outlined white chip** — `STRONG`. Filled for the name, outlined for
the values: the same distinction OWID and ABC make with weight, made here with fill.

**The mark carries its own label, at three tiers, inside the circle.** The subject in bold
(`garlic`, `niacin (vitamin B3)`, `anti-oxidants`), the claim under it in regular
(`blood pressure`, `heart disease`, `infertility in men`), and both **scaling down with the
circle** until the smallest bubbles carry four-point type (`rhodiola rosea L. / fatigue`). Nothing
is dropped as the mark shrinks — the type shrinks with it, and legibility is spent rather than
information.

**The two keys sit on one line, top right, each stating its variable and its qualification.**
A size key of three outlined circles of increasing radius, captioned `Popularity` in bold with
`(google hits)` in regular beneath it; beside it a colour key of one filled orange disc, captioned
`One to Watch` in bold with `(few studies but promising results)` in regular beneath it. Bold name,
regular parenthetical qualifier — the same construction as Our World in Data's axis titles.

**Only the exceptional category is keyed.** Blue is the default and is never named; orange is the
exception and gets a sentence explaining what it means. A key that names only what departs from the
norm is shorter and reads faster than one that names everything.

## What it does with style

**Contaminated `measured.json` palette** — same mechanism as the sibling IIB records. Re-measured on
the plate alone (`crop 0,160,1440,740`):

- ground **`#FFFFFF` at 76.9 %**.
- chromatic **`#004D91` at 15.6 %** (208°) and **`#F47B20` at 1.3 %** (26°) — a deep blue carrying
  the whole field and one orange carrying the exception. Ink `#231F20` at 0.43 %.
- the route calls the palette **`diverging`, 2 clusters** (208° with 23 buckets, 26° with 1).
  **The eye disagrees**: this is not a ramp with two poles, it is **two categories**, one of which
  covers twelve times the area of the other. The route separates hue clusters correctly and then
  names the arrangement wrongly, because two clusters look the same to it whether they are the ends
  of a scale or two unrelated classes.
- labels are set **inside** the marks in white, so the type's colour is the ground's job and never
  the palette's.

## What is transferable

- **A verbal ordinal axis with its name in a filled chip and its levels in outlined chips.**
- **Scale the in-mark label with the mark** rather than dropping it, so a small bubble is still
  identified.
- **Key only the exception**; leave the default category unnamed.
- **Legend caption = bold variable + regular parenthetical qualifier**, on both the size key and the
  colour key.
- **A size key of nested/adjacent outlined circles** — the ordinary convention, here without values.

## What is this piece's own

The blue/orange pair, the packing layout, and the supplement names.

## What was not verified

- **Below the fold.** The plate continues past the 1440 × 900 capture; the lower evidence levels
  (`SOME`, `SLIGHT`, `NONE` or whatever they are called here) were not read, nor any source line.
- **Whether horizontal position means anything.** It is read as packing because the piece names no x
  axis in the captured region; that was not confirmed.
- **The size key's circles carry no numbers**, so nothing above claims the size channel is readable
  quantitatively.
- A second capture of the same chart engine with a different palette
  (`snake-oil-superfoods`) was harvested and **discarded** rather than filed: same desk, same
  component, and `METHOD.md` correction 4 is clear that a second record from one desk is not a
  second use.
- No type measurement: raster plate, style route reached only the site's own type.
