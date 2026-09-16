# Beat — India has risen from eighth to third among the world's biggest CO₂ emitters

**Proves:** between 1990 and 2024 India moved from eighth to third in the world ranking of annual
CO₂ emissions from fossil fuels and industry, passing five countries on the way — Germany (1999),
Japan (2006) and Russia (2009), and earlier the United Kingdom (1991) and Ukraine (1992), neither of
which is still in the top ten.

**Medium / format:** chart / **web**. **Type:** bump (ranking-over-time) — one line per country, its
vertical position its RANK rather than its value, rank 1 at the top.

**Its siblings.** `proof/vidz-bump-emitter-rank/` is the same claim as a video and was written
first; `proof/static-bump-emitter-rank/` is the same claim as one still frame. All three read their
own frozen copy of the same file and derive every number in this document. **They are not one beat
rendered three ways** — see below.

## What this format owes that the others do not

`references/types/bump.md` names the ceiling this type runs into: past a handful of entities "the
tangle of crossing lines stops being readable as individual trajectories… reserve accent colour for
the two or three lines the story is actually about and render the rest as unlabelled background
context." The static frame answers that by labelling both ends of every line; the video answers it by
drawing them one clock at a time. **Neither can answer "which grey line is that one, all the way
across."** This format can, and that is the whole of what it adds:

- **Tracing.** Point anywhere in the plot and the nearest reading answers — its country's whole line
  comes forward, the other neutrals recede, and the tooltip names the country, the year and its rank
  that year. Following one line through a crossing IS the type, and here the reader performs it.
- **Every reading on demand.** 210 of them (six countries × 35 years). A still frame can print six
  end labels and three crossing captions; it cannot print a rank for every country in every year
  without becoming a table wearing a line chart's clothes. That is exactly the gap
  `web-discipline.md` says interaction is for: "detail the static frame had to omit, never the same
  numbers repeated on demand."
- **Keyboard parity, not a keyboard mode.** Every reading is `tabIndex=0` with its own `aria-label`
  baked in at build time, so all 210 are reachable by plain Tab with the inline script absent
  entirely. What the script adds is speed — ArrowLeft/ArrowRight walk a country's own years,
  ArrowUp/ArrowDown step to the neighbouring RANK in the same year, Home/End jump to that country's
  first and last — and the visual tooltip a sighted keyboard user needs. Known cost, stated rather
  than hidden: 210 Tab stops is a long way through if you use Tab alone.

**Nothing argument-bearing is behind any of it.** Before a pointer moves, the frame already carries
the title, the caveat (including the two crossings it cannot draw), the source, all six lines, every
country's name at its final rank, and all three crossings — ringed AND captioned. **And the accent
never dims:** tracing another country recedes the four other neutrals, and leaves India's line and
its crossing marks at full strength, because "the accent stays reserved for the subject, interaction
notwithstanding" (`web-discipline.md`). That exemption is a CSS selector, not a script branch, so no
code path can lose it.

**No filter, deliberately.** `chart-web/SKILL.md`'s three-part test: this series' only real
dimension to narrow is time, and dimming a period would hide crossings — the argument itself —
rather than let a reader explore past it. It fails part 2 outright. Most beats should not have one;
this is one of them.

## The two defects this beat shipped and then fixed, both found by looking

1. **The captions ran under the country names at 375px.** "passed Russia · 2009" measures ~110px
   against a 210px plot and fits on neither side of its ring at 47% and 56% across. Fixed by
   stacking the caption on two lines (country over year, ~88px) and flipping it to whichever side has
   room, both decided ONCE at the narrowest verified width, in CSS pixels, with a throw if neither
   side fits. Then the plot's own height floor had to be DERIVED rather than guessed: two 12px lines
   need ~38px of corridor, and at 375px the nine rank gaps were 26px each, so all three captions
   touched the lines either side of them.
2. **A flipped caption was struck through by the crossing's own diagonal at 1600px.** The two
   segments that swap occupy exactly the column BEFORE the ring, and a caption offset from the ring
   by a fixed 14px sits inside that column at a wide container (~42px per column) and outside it at
   a narrow one (~6px). A fixed pixel offset cannot straddle that, so the flipped caption's anchor is
   a COLUMN, not a pixel: it hangs off the year before the crossing, where both lines are flat.

A third, smaller one: the keyboard focus ring on the last column's readings was drawn as a bracket,
cut down its right side, because an SVG clips to its `viewBox` and an outline is a fixed number of
CSS pixels around a mark measured in stretched user units. `overflow: visible` was tried and
reverted — it clears the ring and costs the window fit, 767px of vertical overflow at 3440 × 900.
The inset is per-axis instead, derived from the smallest scale each axis takes across the seven
verified viewports (`MARK_INSET_X`/`MARK_INSET_Y`, `BumpWeb.tsx`).

## Data

- Source: Global Carbon Budget (2025) – with major processing by Our World in Data, indicator
  `annual-co2-emissions-per-country`. Citation string taken from the indicator's own metadata
  endpoint, not written from memory.
- `data.csv` is this beat's OWN frozen copy — byte-identical to the video sibling's
  (`sha1 67b394db148fec62aa5b175dd711fa9250b2dc69`), copied in rather than read across, because a
  beat that reads a file out of another beat's folder is a beat nothing can audit on its own.
- 8,617 data rows, 1990–2024, every entity OWID publishes. Rows with an empty `Code` are
  OWID-assembled regions and a `Code` beginning `OWID_` is an OWID-defined entity; `render-web.mjs`
  drops both, because a world ranking of countries that included "Asia" would be a ranking of
  nothing. Each of the 35 years carries more than 200 ranked countries — asserted at render time.
- What the figure covers, and does not: fossil fuels and industry. **Land-use change emissions are
  not included** — the indicator's own subtitle, carried into the rendered source line.

## Every rank here is computed, and that is this type's specific trap

`references/types/bump.md`: rank has no magnitude to sanity-check against, so "an invented rank slots
into the visual field exactly as plausibly as a real one." There is **no rank column in the data and
no rank typed anywhere in this workspace** — every one is the position of a country in a sort of
every ISO-coded entity's emissions for that year, and that includes every one of the 210 ranks the
tooltip can be asked for. So are the six countries drawn (those inside the top ten in every year of
the window), the subject (the largest climb, required to be unique and at least two places), the
ordinal words "eighth" and "third" (indexed out of a word table by the computed ranks), and each
crossing with its year (ranked above India in 1990, below it in 2024, the crossing year being the
first year of the unbroken lead that runs to 2024).

## Exact values — computed from `data.csv` (world rank by annual CO₂ emissions)

| Country | 1990 | 2024 |
| --- | --- | --- |
| China | 3 | **1** |
| United States | **1** | 2 |
| **India** | **8** | **3** |
| Russia | 2 | 4 |
| Japan | 4 | 5 |
| Germany | 5 | 10 |

India's crossings: United Kingdom 1991 · Ukraine 1992 · Germany 1999 · Japan 2006 · Russia 2009.

## Anti-patterns for this case

- **One accent line, not three**, because the recorded palette carries one accent.
- **Every label is in page ink or muted — never in a line's own hue.** This type's named,
  previously-shipped accessibility failure is a tooltip or an end label painted in the line's own
  accent on a dark ground; the tooltip here is the format's shared `#tooltip`, ink on ground, and the
  country names are ink at every rank.
- **Nothing whose SHAPE carries meaning is drawn inside the stretched `viewBox`.**
  `preserveAspectRatio="none"` is a non-uniform scale, so the crossing rings and the terminal dots
  are fixed-size HTML in the overlay, positioned in `%` over the same box. The only circles left in
  the `<svg>` are the invisible hit targets, whose shape says nothing to anyone.
- **Zero `<text>` in the `<svg>`.** Rank numbers, year ticks, country names and crossing captions
  are all HTML at a fixed pixel size. Geometry stretches; type does not.
- **Rank is not magnitude**, and the caveat says so in the frame.

## Verification

`bun proof/webz-bump-emitter-rank/render-web.mjs`, then:

1. `bun skills/chart-web/scripts/verify-web.mjs --file proof/webz-bump-emitter-rank/bump-emitter-rank.html --shots`
   — **56 checks passed, 0 failed, 5 skipped** (the five are the filter's, which this beat does not
   ship). It fits all seven viewports from 3440 × 900 down to 375 × 812 with no scroll in either
   axis; 38 of the sampled readings answer a real pointer on their own mark and 38 answer mid-plot;
   the default view dims nothing; a pointer on a crossing caption is not swallowed by the overlay.
2. Driven by hand at 1600 × 900, 1024 × 768 and 375 × 812, with `page.mouse.move` at **rounded
   integer coordinates** (fractional ones silently do nothing) — hovering Germany's 2015 reading
   answers `Germany · 2015 · world rank 6` and raises Germany's line while the four other neutrals
   go to 0.2 and India stays at 1; hovering the empty band at ranks 7–9 still resolves to the nearest
   real reading; the three crossing rings and captions measure opacity 1 in every state.
3. Driven by keyboard: three Tabs reach `China, 1992: world rank 2`; nine ArrowRights walk to
   `China, 2001`; ArrowDown moves to `Russia, 2001: world rank 3`; End jumps to `Russia, 2024: world
   rank 4`. The focus ring was then measured at the bottom-right-most reading — 3.5px of clearance
   inside the frame at 375px, 24.5px at 1600px — and looked at.
4. The screenshots were opened and looked at, at every width above. That is what found both caption
   defects; neither was visible to any check in step 1, which passed on the broken build.

## Source line

`Source: Global Carbon Budget (2025) – with major processing by Our World in Data · fossil fuels and industry only; land-use change is not included`

## Alt text

Computed by `render-web.mjs` and passed into the `<svg>`'s `<desc>`; echoed to the console on every
render so it can be read beside the frame it describes.
