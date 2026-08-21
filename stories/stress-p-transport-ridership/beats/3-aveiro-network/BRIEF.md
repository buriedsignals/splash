---
size: landscape
type: lollipop
---

# Beat 3 — Aveiro's line is 12 km, the second shortest of the six

**Type:** lollipop (ranking, horizontal rows). **Medium/format:** chart / static.
**Channel:** article web — **size: landscape (1920 x 1080)**. Slot 3 of `STORYBOARD.md`.

## What the journalist asked for, and what the data can give

The article's last line asks for "one that shows the Aveiro line itself". **The frozen data cannot
show the line.** `source/data.csv` carries one row per city for 2025: a name, a trip count, a
population, a network length and a year. There is no route, no coordinates, no stop list, no
opening date, and no second moment to compare against. So:

- a **flow/route map** has no geometry to draw;
- a **locator map** has no position for any of the six cities, and geocoding them would be adding
  data the journalist never froze;
- an **image beat** has no photograph in `source/`;
- a **before/after** has one year.

`network_km` is the only column in the frozen table that is about the line at all. This beat draws
that column, with Aveiro as the subject, and says in its own standfirst what it is standing in for.
The refusal is recorded in `STORYBOARD.md`'s slot 3 prose as well, so it is part of the editorial
contract rather than a note discovered at render time.

## Claim

Aveiro's network is 12 km — fifth of the six, ahead only of Faro's 9 km — and it carries 14 million
trips a year. Every figure is computed by `render.mjs` from `source/data.csv`.

## Evidence hierarchy

1. The length of Aveiro's stem against the other five, from a shared zero.
2. Its own value, printed at the dot, in ink.
3. One annotation on the subject's row carrying the trips figure, because network length alone does
   not say what the line does.

## Single accent

`#D4A853` on Aveiro's stem and dot only — the subject, not the maximum (the maximum is Lisboa, and
it stays furniture here). The value labels stay in ink: this type's own recorded failure is an
accent hue used as running text, which measures under 4.5:1 while reading fine as a thin mark.

## Why lollipop rather than a second bar chart

`references/types/lollipop.md` says a lollipop earns its name on ink, and that under five categories
a plain bar is the more familiar shape. Six rows is only just past that line, and the honest reason
here is register rather than density: beat 1 is already a bar chart of these same six cities, and
drawing beat 3 as a second bar chart would read as a variant of beat 1 rather than as a portrait of
one network. The lighter mark keeps the emphasis on the one accented row.

## Source

`source/data.csv`, frozen. Six city networks, 2025 only.
