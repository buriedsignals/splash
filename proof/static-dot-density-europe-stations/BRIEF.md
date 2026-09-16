---
size: landscape
type: dot-density
format: static
medium: map
grounding: supported
---

# Beat — 72 reactors among 8,900 low-carbon power stations

**Type:** dot density (map). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above, which is the statement that counts.

The first `dot density` beat in this tree, and the second map beat.

## Why this beat fetched new data instead of using the file every other beat here uses

`the-dots-resolution-is-what-the-data-supports` refuses a dot map made by scattering national totals
inside national polygons: **the pattern a reader would see is the random number generator's, not the
world's** — every cluster an artefact, every hole one too. La Nación states the reasoning on its own
piece: the dots sit on the streets rather than in polygons *"since a crime has a street address and
not an area."*

So a source that records a latitude and a longitude for every thing it counts was fetched instead.
One dot is one station, where the station is.

## The claim

**Of the 8,900 low-carbon power stations the database lists in Europe, 72 are nuclear — 0.8 % of the
sites — and they carry 34.4 % of the combined capacity.** Nuclear is also the most concentrated fuel
by capacity per site, and that ranking is derived rather than asserted, so a data refresh that
overturned it would change the sentence.

That is the pair of readings this form gives and a bar chart cannot: the **count of places** and the
**weight of each**, in one picture.

## What the plate says about its own source

The WRI database lists the stations it knows, and its coverage of small solar and small wind is
uneven. The plate says so, in the axis register, beside the key — a limit a reader cannot infer from
a field of dots, and one that changes what the field means.

## What the corpus decided

`a-quantity-is-made-countable-by-drawing-its-units` — one dot, one station, a real thing.

`the-basemap-gives-up-its-contrast` — against 8,900 points that is the only way the points stay
countable. The land is a small step off the ground; the coastline barely more.

`water-is-a-tint-not-a-grey` — taken from `palette`'s own grounded conventions, mixed toward the
direction's ground and checked against it.

`the-subject-is-ringed-not-recoloured` — the 72 nuclear sites are ringed. Recolouring them would put
a second hue on a plate whose whole reading is one field's density.

## The defect the guards could not see, again

Three panel runs — the key's two lines and the source-limit note — were drawn unwrapped and ran under
the map. Every guard was green, because the overlap and frame guards measure the **plate's** frame
and the text was well inside that. A panel is a frame too, and there is no such thing as a line short
enough to skip the measurement: how wide a string is depends on the direction, and the direction is
exactly what changes between plates.

## Source

WRI Global Power Plant Database v1.3.0, public domain. Fetched 2026-09-09:

```
curl -sSL https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv
```

Frozen beside this beat as `stations.csv`: the 8,900 hydro, wind, solar, biomass, geothermal, wave
and nuclear stations inside the camera's window (25° W – 45° E, 34° N – 72° N), with country, fuel,
capacity and coordinates. Basemap: Natural Earth 50 m, as the sibling map beats.


## Le fond de carte est MapTiler, et ce que la projection change

**Passe du 10 septembre 2026.** Le fond n'est plus un tracé Natural Earth projeté ici : c'est une
plaque **MapTiler** cuite par `bake.mjs`, et chaque marque est placée par la caméra enregistrée de
cette plaque — `frameCorners`, mesuré avec `map.unproject()` après stabilisation, jamais les `bounds`
nominales que `fitBounds` élargit pour préserver le format du cadre.

**Une plaque par direction filée, teintée par la direction.** `the-basemap-gives-up-its-contrast` ne
peut pas être satisfait en choisissant entre deux styles publiés : `dataviz-dark` peint une terre
sombre sous une mer BLEU CLAIR, ce qui, sur le navy de `nocturne`, fait de l'eau l'objet le plus
contrasté de la page. Le bake reçoit donc les deux teintes que la direction lui donne — l'eau prend
un peu de l'accent (`water-is-a-tint-not-a-grey`), la terre un pas du fond vers l'encre — et repeint
la géométrie de MapTiler avant la prise. Les couches de texture (couverture du sol, ombrage, routes,
étiquettes, frontières) sont éteintes : un fond tacheté de forêts a plus de contraste contre la page
que les marques posées dessus. Les trois plaques sont vérifiées identiques en caméra avant le rendu.

**Le coût, énoncé.** Web Mercator gonfle le nord. Ce beat COMPTE des lieux et compare une puissance
par site ; aucune de ces deux lectures n'est une surface, donc aucune n'est touchée. Ce qui bouge est
l'endroit où un point est dessiné — et il est désormais dessiné là où la plaque met sa propre côte.
