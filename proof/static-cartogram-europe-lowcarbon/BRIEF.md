---
size: landscape
type: cartogram
---

# Beat — Compté par pays 65,1 % ; compté au kilomètre carré 44,9 %

**Type:** cartogram (map). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

The first `cartogram` beat in this tree, and the fifth map beat.

## It draws the same data as the choropleth, and the pair is the argument

`proof/static-choropleth-europe-lowcarbon` inks each country over its own territory. Weighted by the
area each country occupies on that plate, Europe reads **44.9 %** low-carbon; weighted by country, it
reads **65.1 %**. **Both numbers are true, and a choropleth can only ever show one of them** — the
one nobody chose, because area is not a decision a mapmaker makes, it is a fact about the earth.
Russia alone takes 73 % of that drawing at 35.9 %, and drags the reading down.

A tile cartogram gives every country the same tile, so the second reading becomes visible. It keeps
the rough geography, which is what separates it from `proof/static-pictogram-europe-lowcarbon`, where
the same countries are sorted by value and the map is gone.

Both averages are computed in `render-directions.mjs` from the **same frozen shapes in the same LAEA
projection** the choropleth uses — so the comparison is between two drawings of one dataset, not
between a drawing and an idea of one. The headline asserts a twenty-point gap and the plate refuses
to render if the gap it measures is smaller.

## The layout is designed, not derived, and the plate says so

No algorithm placed these tiles. The 12 x 9 grid is hand-authored in `render-directions.mjs`, and
checked both ways against the data: every code in the grid has a row in `data.csv`, and every row in
`data.csv` has a tile. That is a claim about a **drawing**, not about the data, and it is the one
thing on this plate a reader cannot check against the source — so the reading form says it:
*la disposition est dessinée, pas mesurée.*

## The tile has to hold its own name

That is the whole difference between a cartogram and a pattern: a reader has to be able to say which
country a tile is, or the geography it preserves is decoration. Two floors, both measured on the
tile that is **drawn** rather than on the pitch it sits on — the gap between two tiles carries no
name, and measuring the pitch shipped a 15px tile against a 16.4px floor:

- **height** ≥ the axis register's own band plus breath;
- **width** ≥ the widest code the beat carries, plus breath.

The ladder spends rungs — a shorter standfirst, then the reading form dropped — until both are met,
and refuses rather than shipping forty anonymous squares.

The tile is also **as non-square as the grid requires and no more**. ProPublica's record is explicit
that *"a matrix is not a grid of squares; the row and column pitches answer to how many rows there
are and how far the eye must travel"* — that is a licence, not an obligation. Stretched to the full
column, twelve columns gave 69 x 17px tiles, and nine rows of 4:1 lozenges read as stacked bars, not
as a map. The width is capped at 2.5:1 against the height the rows afford, and the grid is centred in
what is left.

## A tile is a mark on the ground, not a patch in a mosaic

On the choropleth every country is bounded by its neighbours, so the palest class still reads as a
shape. Here each tile floats in a gap of bare ground, and a fill that does not clear the non-text
floor against that ground is not a pale class — it is an absent tile. The bottom of the ramp is
floored at 3:1 against the direction's own ground, and the plate refuses if the direction's colours
cannot reach it.

**Missing is drawn as missing, and that means outside the ramp — not merely beside it.** A flat
neutral floored the same way landed, on `nocturne`, on exactly the tone the lowest class already
owned, and Ukraine read as a *low* reading rather than as *no* reading. The missing tile has no fill
and a dashed edge: it cannot be mistaken for a class, because no class is hollow.

## What the corpus decided

`the-scale-is-stepped-not-continuous`, `the-key-prints-its-breaks-in-the-data-s-units`,
`the-key-names-its-classes-in-their-own-colours`, `a-missing-cell-is-drawn-as-missing` — as the
choropleth and the heatmap beats. One ramp between the direction's own poles, five classes, breaks
printed in %, and the country with no reading outside the ramp.

## Source

Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data, frozen
beside this beat as `data.csv`. Shapes: Natural Earth 50 m, frozen as `shapes.geojson` and used only
to compute the area weighting — nothing on this plate is projected.

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
