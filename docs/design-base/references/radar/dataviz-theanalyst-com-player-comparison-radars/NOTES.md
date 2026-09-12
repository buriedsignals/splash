# Opta Analyst — Data Hub player comparison radars (bare SVG, Saël Kumbedi)

- url: https://dataviz.theanalyst.com/player-comparison-radars/
- archive: url-list
- type: radar, polar-area variant — nine wedges, live SVG, no card furniture
- export: web. `style.graphic.tag = "svg"`, 630 × 630, `documentTop 201`, `nearTheTop: true`.
- readAs: the graphic itself, at rest, with whatever player the hub loaded. `routes.pixel.
  measuredFrom = "graphic.png"`.

## What it is

The same Opta instrument served from its own host rather than embedded in an article, and harvested
as a bare **`<svg>`** rather than through a frame. Nine wedges with the percentile printed in each —
`61` Chances Created, `89` Dribbles Attempted, `84` Touches, `34` Defensive Actions, `78` Possession
Won, `3` Aerials Won, `91` Touches in Box, `65` Shots, `1` Goals. The page's own title names the
loaded player (`Saël Kumbedi this season`); the record's style tuples also caught `Kostas Tsimikas`
and a `78.46 %` similarity row, so the page cycles or re-renders between load and measurement.

This record is kept alongside the embedded one because it is the **only radar in this family
measured as live vector geometry**, and because it shows what the design looks like with every piece
of card furniture stripped away.

## What it does with information

**Two spokes at 1 and 3 are drawn, and they are almost nothing.** A one-percentile wedge is a sliver
a few pixels deep with its numeral floating outside it. Compare the Saka plate, where Aerials Won at
zero is simply absent. Between them the two records bracket the low end of this encoding: at 0 it
disappears cleanly, at 1–3 it is a stub that the number has to rescue. **The numeral is what makes
the bottom of the scale readable**, not the geometry.

**No ring, no ceiling, no card.** Stripped of the outer boundary circle the 2023 static version drew,
a wedge is read against nothing but its neighbours. The `89` and the `91` are visibly the two long
ones; whether `61` is near or far from the maximum is not on the plate. The bare version is measurably
weaker than the carded one, and the difference is one light circle.

**The spoke labels survive the stripping; everything else goes.** Nine curved uppercase labels around
the rim are all that remains of the furniture.

**The white hub is a hole, not a mark.** A blank disc at the centre keeps nine wedge apexes from
converging into one blot — the same reason a donut has a hole. It also means the radial scale
demonstrably does not start at the centre.

## What it does with style

Measured on `graphic.png`: ground **`#FFFFFF` at 63.69 %**. The three wedge families are
**`#B645C2` at 15.69 %** (hue 294.2°), **`#EB5863` at 10.51 %** (hue 355.5°) and **`#FBBB53` at
7.64 %** (hue 37.1°); `#DBA2E1`, `#F5ACB1` and `#C874D1` are their antialias neighbours. The
classifier reads the palette as `"categorical"`.

**A third of the plate is ink, and that is what a radar with no card looks like.** The same three
colours in the embedded record cover 4.26 / 2.85 / 2.22 % of a page-sized clip; here, cropped to the
630 px SVG, they cover 15.69 / 10.51 / 7.64 %. Same design, same day, same desk — the share depends
entirely on how much paper was in the frame, which is a warning about reading any of these
percentages as a property of a design rather than of a crop.

**Declared and rendered differ, again.** `style.marks` declares `fill rgb(158,7,174)` ×3,
`fill rgb(229,32,47)` ×3, `fill rgb(250,165,26)` ×3 and `fill rgb(0,0,0)` ×19. The saturated triad
is lightened at draw time to the three hexes above; the nineteen blacks are the numerals and the
label text.

**Here the type tuples ARE the graphic's**, because the graphic is an `svg` in this document rather
than a frame: **Big Shoulders Text 14/400 at 1.2 tracking, uppercase** for the spoke labels
(`goals`), 24/700 at 0.6 tracking for the player name, 16/400 at 0.6 for the template line, 16/800
uppercase for a compared player, 12/600 `rgb(128,128,128)` for the season, 12/800 uppercase for the
similarity figure, and **IBM Plex Mono 12/800 uppercase** for the table column heads. Ink
`rgb(29,10,48)`. `style.column` is `null` — there is no prose column on this page at all.

## What is transferable

- **Print the number in the mark, and it will carry the bottom of the scale.** A 1st-percentile
  wedge is invisible as geometry and legible as a numeral.
- **Keep the ceiling ring.** Removing it is the one difference between this plate and the carded
  one, and it costs the reader the ability to say how good `61` is.
- **Punch a hole at the hub** so the apexes do not converge, and so the scale's origin is visible.
- **Two type registers on one instrument**: a condensed grotesque, tracked and uppercase, for spoke
  labels; a mono for table column heads. The mono is doing "this is a machine-read table" and it
  reads that way at 12 px.

## What was not verified

- **Which player the plate belongs to.** The document title says Saël Kumbedi; the type tuples also
  hold `Kostas Tsimikas`. The record is a snapshot of a page that changes under the harvester, and
  the identity in the picture was not confirmed.
- Hover, focus and keyboard behaviour — not exercised.
- Whether the outer ring is genuinely absent in this deployment or fell outside the 630 px SVG.
- **Same publication as the two `theanalyst.com` records.** Three records, one desk; nothing here
  corroborates them.
