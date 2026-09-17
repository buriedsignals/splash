---
size: landscape
type: hex-grid
format: static
medium: map
grounding: supported
derived: v1
---

# Beat — Par habitant, ce n'est pas l'Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants

**Type:** hex grid (map). **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above.

The first `hex grid` beat in this tree — and **the last of the catalogue's forty forms to get one**.

## It is the flow map's pair, and the ranking turns over

`proof/static-flow-map-ukraine-protection` draws the **counts**: Germany's ribbon is the widest on the
plate, Poland's second. Divide by the population and the order inverts — **Czechia first at 36.1 per
1 000, Germany eleventh at 14.8, France last at 0.7.** Neither number is the truer one; they answer
different questions, and two plates are how a reader can *see* that rather than be told it.

The beat refuses to render if the same country leads both rankings: at that point the pair would have
nothing to show.

## What the hexagon buys over the square

Read off the reference's own drawing rather than argued from it: **six neighbours, every one of them
edge-sharing.** A square grid touches diagonally, so a reader has to decide whether corner contact
counts as adjacency; a hex grid has no corners to argue about. That is the whole geometric difference
between this beat and `proof/static-cartogram-europe-lowcarbon`, whose cells are squares — and it is
why the rows here are offset by half a cell.

**One unit, one cell, all cells equal.** The map gives up area and buys the thing a choropleth of the
same data cannot give: every unit equally visible. On a subject that is countries rather than
territory, that is the honest geometry.

**The layout is designed, not derived**, and checked both ways: every code in the grid has a reading,
every reading has a cell. The plate says so in its reading line.

## What the references gave

Two pages from **Open Innovations** (formerly ODI Leeds) — one publisher, so **one publication** for
the evidence floor, and the form files no family rules of its own. Both were reached properly: the
constituencies page is an inline `<svg>`, so the style route counted its marks and read the type
*inside* the hexes at 6.4px.

- **The cells are separated by a stroke in the ground's own colour** — measured: 652 white-stroked
  marks on a `#EFEFEF` page — so the grid reads as a tiled surface rather than as scattered marks.
- **The unit's code sits inside its own cell.** At 650 cells they set it at 6.4px, below anything
  this base files; at 32 cells this plate can afford the axis register, and it **refuses a hexagon
  too narrow to hold its own code** — the tile cartogram's floor, measured on the drawn cell rather
  than on the pitch.
- **A unit that is not in the measure keeps its cell and loses its fill.** Their election map draws
  the seven undeclared seats as empty hexes and prints *"643 of 650 results returned"*. Here that
  unit is **Ukraine**: on the plate, outside the count, in the neutral that sits outside the ramp,
  with a line saying why.

What is **not** taken is the colour: they fill by region and by winning party — eleven named hues,
which is right when the quantity *is* a category. Here the quantity is a rate, so the fills are one
stepped ramp between the direction's own poles. `PALETTE.md` records it.

## Two defects the eye caught, and what they have in common

The key's five breaks printed **into one another** — `5,012,018,025,0` — because the swatch was sized
off the hexagon rather than off the widest number that sits under it. And the key was budgeted as
**one row** when it draws two, so the breaks landed on the line explaining the pale cell.

Both are the same mistake in two places: **a row that is drawn has to be a row that is budgeted, and
a box that carries a label has to be sized by that label.** The lollipop beat learned the first one
line too late; this one learned it twice more.

## Source

Eurostat `migr_asytpsm` (beneficiaries of temporary protection, Ukrainian citizens, June 2026) frozen
as `protection.csv`, joined on the ISO code to Our World in Data's 2023 population series frozen as
`population.csv`. Both are duplicates of files sibling beats carry, copied rather than linked.

## Pourquoi ce beat ne prend pas de fond MapTiler

**Passe du 10 septembre 2026.** Les six cartes de cette famille qui reposent sur une géographie réelle
— choroplèthe, densité de points, symboles proportionnels, flux, locator, isolignes — ont été
rebasculées sur une plaque **MapTiler**, cuite une fois par direction filée et teintée par elle. Ce
beat-ci n'en prend pas, et c'est un refus raisonné plutôt qu'un oubli.

Une grille de tuiles **abandonne la position**. C'est son achat : chaque pays reçoit exactement la
même case, et le lecteur y gagne que le plus petit soit aussi visible que le plus grand. Poser des
tuiles cartographiques sous cette grille affirmerait une correspondance entre la case et le sol —
que la case est *là* — précisément là où la forme vient de dire qu'elle ne l'est pas. Le fond
raconterait alors une géographie que les marques contredisent, et c'est le lecteur qui paierait la
différence.

Ce que la grille garde de la géographie est la disposition APPROXIMATIVE, dessinée à la main et
déclarée comme telle. C'est exactement ce qui la sépare du pictogramme, où les mêmes pays sont triés
par valeur et la carte a disparu. Un fond réel sous une disposition approximative n'est ni l'un ni
l'autre.

## The choreography

The cells are separated by a stroke in the ground's own colour, so the grid reads as one surface
rather than as thirty scattered marks — and that surface, classed, is what the eye takes in first.
One cell is darker than every other and carries its code in bold: Czechia, which is not the answer
a reader arrives with. Germany is on the same surface, mid-ramp, which is the whole point of
drawing per-capita rather than totals. Ukraine sits in the grid and outside the count, in a
neutral off the ramp, and the note under the plate says why.

**The eye enters at** `the tiled surface`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the tiled surface` | `the Czech cell` |
| reference | `the key's two rows` | `the Czech cell` |
| reveal | `the Ukraine cell` | `the tiled surface` |
| subject | `the Czech cell` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the tiled surface",
  "stations": [
    {
      "station": "establish",
      "carries": "the tiled surface",
      "subordinateTo": "the Czech cell"
    },
    {
      "station": "reference",
      "carries": "the key's two rows",
      "subordinateTo": "the Czech cell"
    },
    {
      "station": "reveal",
      "carries": "the Ukraine cell",
      "subordinateTo": "the tiled surface"
    },
    {
      "station": "subject",
      "carries": "the Czech cell",
      "subordinateTo": null
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **36,1 per thousand is computed** — the headline's rate is the protection count over the 2023 population, computed per country, and Czechia is the maximum of that computation.
- **The hand-drawn grid is checked both ways** — every code in the designed layout has a reading and every reading has a cell; a country added to the source without a cell fails the build.
- **The beat refuses a shared leader** — if the same country led both this per-capita ranking and the sibling flow map's absolute one, the pair would have nothing to show, and the beat refuses.
- **The code floor is measured on the drawn cell** — the three-letter code is sized against the hexagon as drawn, and a hexagon too narrow to hold it fails rather than clipping the code.
- **Every country's rate in one frame** — the leader, the country a reader expected and the origin are all on the same surface at once; a ranked list would lose the last of those.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "36-1-per-thousand-is-computed",
    "the-hand-drawn-grid-is-checked",
    "the-beat-refuses-a-shared-leader",
    "the-code-floor-is-measured-on",
    "every-country-rate-in-one-frame"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "36-1-per-thousand-is-computed",
    "the-designed-grid-is-checked-both": "the-hand-drawn-grid-is-checked",
    "the-beat-refuses-to-render-if": "the-beat-refuses-a-shared-leader",
    "the-code-floor-is-measured-on": "the-code-floor-is-measured-on",
    "asserted-in-the-one-frame": "every-country-rate-in-one-frame"
  }
}
```
