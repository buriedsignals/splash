---
size: landscape
type: population-pyramid
---

# Beat — Switzerland's population bulges at ages 55-59

**Type:** population pyramid. **Medium/genre:** chart / static. **Channel:** article web, 900 x
820 (taller than the 900x560 default — a per-story FRAME choice, 21 age bands need more vertical
room than the default gives).

## Claim

Switzerland's widest age band in 2023 is 55-59 (669,962 people), not the youngest band: 0-4
year-olds total 434,030, well under the peak — the mark of an aging population, not an expanding
one.

## Subject and accent

Two CVD-safe hues, checked as a pair, one per sex (`references/types/population-pyramid.md`) — the
mirrored position already carries the group distinction, colour reinforces it. Age bands keep
their natural sequence, oldest at the top, never sorted by value. One ink annotation names the
peak band, found by the render script (not asserted), on the same shared, mirrored, zero-anchored
magnitude scale as every other band.

## Source

UN, World Population Prospects (2024), via Our World in Data · `male-population-by-age-group.csv`
and `female-population-by-age-group.csv`, Switzerland, 2023 (the latest year both files carry),
21 five-year bands from 0-4 to 100+.

## What went wrong, caught by looking

Checked the two source files summed to the same total population OWID's own `population.csv`
reports for Switzerland 2023 (8,870,564): the 21 age bands sum to 8,870,560, four people off from
rounding across two independently-modelled series — close enough to trust, and printed in the
render script's own console output rather than asserted silently.

## Size — 2026-08-11

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize`, verified from the
delivered PNG's own IHDR. It shipped 1800 x 1640 before, a frame stated twice as literals that
agreed with each other. This beat's own prose used to argue for a per-story 900 x 820 frame chosen
FOR 21 bands; both dimensions are pinned now, so the 21 bands get what is left of 1080 instead.

**Square and portrait are refused — and since 2026-08-11 the refusal comes from a MEASUREMENT of
this beat rather than from an absence in a table.** It used to read: `type-at-size.mjs` refuses the
type because nobody had measured an aspect range for it and `BAND_SCALE_TYPES` did not contain it,
which was a gap worth naming rather than working around. `proof/aspect-range-probe/` closed it by
rendering: swept across aspects, a pyramid reads best at the tall frames (85.7px of band pitch at
0.5:1, a textbook silhouette) and fails at the flat ones by **running out of rows** — 28.6px pitch
at 1.5:1 and the band labels touch, 17.9px at 2.4:1 and "95-99" prints through "90-94". Nothing
about a shape is distorted; a count of bands stops fitting, which is the bar family's own failure
mode and no other kind's. So `population-pyramid` is now in `BAND_SCALE_TYPES`, its verdict at a
tall frame is `transpose` with `alreadyInIt: true` (its twin form is the form it is in — nothing is
asked to be redrawn), and no aspect range clamps it.

**What that changed here, and the guard it required.** Square and portrait became REACHABLE, and
reachable is not legible: the first square render made after the list changed measured exactly the
pinned 1080x1080, cleared `assertTypeFloor`, drew 21 age bands into about 90px of plot with the
whole band-label column collapsed into one black smudge, and **nothing threw** — `assertPlotAspect`
correctly declines to clamp a row-driven type and nothing else here read a row pitch. This beat now
carries `assertRowsFit` (`@parity` with `more-lollipop-co2-per-capita` and
`more-dumbbell-life-expectancy-gains`, where it was first written), and it refuses both loudly with
the measurement: **3.5px of pitch at square and 5.5px at portrait, against the 26.0px of ink "65-69"
actually draws at a 36px floor.** Landscape is byte-identical.

**Four things the pinned frame changed, every one found by looking:**

1. **The peak callout no longer fits inside its own bar, and the throw that said so was right.** At
   a 2.2x type scale the note's ink band is 24.3px and the bar it must sit inside is 19.3px. The
   original repair put the callout inside the bar because a callout overhanging it lies partly on
   `#0072B2` and partly on the page, where black measures 4.05:1 and white 1.00:1 — no ink reads on
   both. That reasoning is unchanged; what changed is the height per band. Throwing would mean the
   beat ships nothing at any size, and no rung on the ladder makes type smaller, so **rung R4 fires**:
   the sentence goes, the SIGNAL stays as a mark (an ink outline on the peak band's two bars, its
   label in bold), and the fact it stated is already the title.
2. **The band label was 11px.** `sizes.mjs` picks landscape's 2.2 so that the seed's smallest base
   token — 12 — clears the 26px floor; an 11 lands at 24px, 11.3 CSS px in a 900px column, and
   `assertTypeFloor` refused the render by name. That is the guard's own documented case, and its
   answer is to scale the token, never to lower the floor. It is 12 now.
3. **`BAND_GUTTER = 64` was a reserve that did not grow with its contents.** The centre channel is
   measured off the widest band label at the size it is drawn at — a fixed reserve is how a spine
   ends up drawn through the words it exists to make room for.
4. **The zero spine has vanished, and that is now recorded rather than absent.** 21 labels at 26px in
   a 477px gutter leave label gaps that touch, so every segment of the spine is a gap and none is
   drawn. The chart still reads — the label column IS the axis — but a rule this component's own
   comment calls "a continuous zero" disappearing without a word is the silent loss this project
   keeps finding, so it goes into the artifact's `data-ladder` beside R4.
