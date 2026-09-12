---
size: landscape
type: contour
---

# Beat — La moitié de l'Europe est à moins de 132 km de la mer

**Type:** contour / isoline (map). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

The first `contour / isoline` beat in this tree, and the sixth map beat.

## What this form is for, and what it costs

Every other map beat here draws **things**: a country, a station, a tile. This one draws a
**quantity that exists everywhere**, and the line is the only mark it has. That buys a reading no
counting map can give — between two lines the value changes continuously, so a reader can put a
number on a place the data never names.

It costs **completeness**. A field with a hole in it does not degrade, it lies: the hole is filled by
whatever surrounds it, and the reader cannot see that anything is missing. That is the constraint
this form imposes on its source, and it is the reason this beat's data is not the tree's energy file.

## The field the beat refused, with the numbers that refused it

The obvious beat was **distance to the nearest low-carbon power station**, from the same frozen WRI
file `proof/static-dot-density-europe-stations` and
`proof/static-proportional-symbol-europe-capacity` both draw. It was built and measured, and the
field said: **54 % of Belarus, 49 % of Latvia and 35 % of Ukraine are more than 100 km from any
low-carbon station.** Those numbers are the **database's coverage**, not the world's — the same
under-recording of small hydro and small wind that the dot map already states as its own limit.

A density map degrades gracefully when a record is missing: one dot fewer in a field of thousands. A
distance field does not — **one missing station rewrites every cell around it, out to the next
station.** The rule is the form's, not the dataset's: *an isoline map needs a field its source
defines everywhere, and a field made of records is only as continuous as the records are complete.*

So the beat took the one thing in this tree that is complete by construction: **the coastline**.
Nothing is missing from a polygon.

## The claim

**Half of Europe's land is within 132 km of the sea, and no point of it is more than 682 km away** —
that point being in Belarus. 89 % of the land is within 400 km.

Measured over a stated study area: the forty countries the sibling beats carry, **minus Russia** —
the frame cuts Russian territory, and a distance measured to a coastline that stops at the edge of
the paper is not a distance. The plate says so in its own limit line.

The field is an **exact** Euclidean distance transform (Felzenszwalb's separable lower-envelope pass,
twice) on a 6 km grid in the same LAEA projection the choropleth and the cartogram use, seeded on
every sea cell. Exact rather than approximate: an isoline drawn from a rounded field wanders, and a
wandering line labelled `200 km` is a false precision the reader cannot see.

## Each line carries its own break, on itself

`the-key-prints-its-breaks-in-the-data-s-units` is met here in the strongest form the base has seen.
There is no key to look away to: the break is printed **on the line it belongs to**, which is the
whole argument for labelling a contour rather than legending it. Three measurements make that work:

- **A line its own label would cover is not drawn.** The floor is the label's own width, so it moves
  with the direction — a tracked capital face buys fewer lines than a compact one. That is a real
  cost of that face, and the ladder prints how many lines it cost.
- **A number is placed where it breaks its own line and crosses no other.** A label laid across the
  next line up reads as *that* line's value, and the map says something false. Every candidate seat
  is tested against the points of every line at a different level.
- **Among the clear seats, the one farthest from every number already placed.** Taking the first
  clear seat put a `500 km` beside a `100 km` from another family, and two numbers side by side on a
  contour map read as one ladder.

**The ladder is the level set.** More lines is more reading — until the lines are too close for their
own numbers, at which point it is less. The beat walks `100/200/300/400/500` down to `200/500` and
takes the first set in which every drawn line gets a seat; all three directions settled on
`100/200/400/500`.

## The summit carries its own number

The innermost contour a reader can be given is 500 km. The deepest point is 682, so without a mark
the headline's number would have nothing on the map to sit on. It is spot-marked the way a
topographic map spot-heights a peak, and it is **the one label on this plate that may not move**:
it is placed first and every contour label is placed around it.

## The palette declines a convention, and the reason is measured

`water-is-a-tint-not-a-grey` is offered and refused — the only beat in this tree to refuse it. On the
dot map a blue sea is admissible because *nothing there is measured in blue*. Here the measured
quantity **is distance from the water**, and on the `creme` direction the ramp and the sea would be
the same hue. So the sea is the bare ground, the land is one step off it, and **no border is stroked
at all, not even a coastline**: a border is not part of this measurement, and a line that is not part
of the measurement competes with the lines that are. The coast draws itself, as the edge between
ground and land — which is also this field's zero.

The contour tones are floored against **the land they sit on**, not against the plate's ground. Every
contrast guard this tree owns compares a mark to `direction.ground`, and every one of these lines
sits on a tint that is not it.

## What the corpus decided, and what it could not

`the-basemap-gives-up-its-contrast` (La Nación, ProPublica) — met. `three-classes-of-place-three-
treatments` is **not applicable and not faked**: this plate has one class of place.

The `map` family's single contour reference is **ProPublica's Toxmap** — one publication, below this
base's floor of two independent ones. So this beat files **no family rule of its own**; it draws on
the base's general rules and says so, as `proof/static-proportional-symbol-europe-capacity` does for
the same reason. A second desk has to be harvested before this form gets rules.

## Source

Natural Earth 50 m country polygons, frozen beside this beat as `shapes.geojson`; the study area's
country list frozen as `countries.csv`. Both are duplicates of files the sibling beats carry, copied
rather than linked — a beat that reads across a folder boundary cannot be re-rendered on its own.


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

**DEUX CAMÉRAS, et ce beat est le seul où la distinction n'est pas une élégance.** Le CHAMP est
mesuré dans la caméra équivalente et rien ne l'en bouge : une transformée de distance euclidienne sur
des pixels Mercator n'est pas une distance, puisque l'échelle métrique y varie en 1/cos(latitude) —
les mêmes 200 km vaudraient 200 près de Malte et 100 près de Tromsø — et la transformée n'est
séparable que si la métrique est uniforme. Chaque kilomètre imprimé vient de la grille LAEA.
L'IMAGE, elle, est dessinée sur la plaque : chaque sommet tracé est porté grille → LAEA → lon/lat →
MapTiler par une inverse LAEA écrite en toutes lettres, parce qu'une approximation linéaire dérive de
dizaines de kilomètres sur une fenêtre de 70°. La projection change où une ligne est dessinée ; elle
ne peut pas changer ce qu'elle veut dire, car le niveau qu'elle trace a été mesuré avant.
