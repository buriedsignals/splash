---
size: landscape
type: population-pyramid
---

# Beat — Switzerland's population bulges at ages 55-59

**Type:** population pyramid. **Medium/format:** chart / static. **Channel:** article web, 900 x
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

**Square and portrait are refused by `type-at-size.mjs`.** A pyramid is a strong candidate for a
tall frame — the C6 case in the spec's own proof table — and it is refused all the same, because
nobody has measured an aspect range for it and `BAND_SCALE_TYPES` does not contain it. That is a
gap worth naming rather than working around: the type sheet's vocabulary is
`population-pyramid`, its category axis IS ordinal age bands and it is ALREADY row-driven, so it is
arguably a band-scale type whose twin form is the form it is in. Adding it to that list is a change
to a carried file that other lots hold, so it is reported, not made.

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
