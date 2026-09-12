---
size: landscape
type: flow-map
---

# Beat — 4,5 millions d'Ukrainiens sous protection temporaire ; l'Allemagne et la Pologne en accueillent la moitié

**Type:** flow map (map). **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above.

The first `flow map` beat in this tree, and the second beat drawn from a reference harvested for it.

## Minard, reversed — and one idea of mine that had to be thrown away

The reference is Minard's 1862 plate: many origins, one destination, band width in tonnes, **conserved
along the network**. This beat is the same form with the arrow turned round — one origin,
thirty-one destinations.

**The first version made the bands tile the node's circumference**, so that the sum of the widths was
literally the ring and the total was never asserted anywhere. Rémy's read of it was four words:
*c'est pas du tout lisible*. He was right, and the reason is structural rather than a matter of
degree: **an arc of the rim is a direction, and spending the rim on widths spends the directions.**
Germany's band alone needed a hundred degrees of rim, so it left wherever the walk put it and swept
back across the map; twenty-five ribbons crossed each other over the countries they were about.

The deeper mistake was upstream of the drawing. **Conservation belongs to a network** — a band that
splits at a junction splits its width — and a fan out of one origin has no junctions, so there was
nothing for the rule to hold. I invented a geometry to make it *look* like there was, and it cost the
plate its legibility. The total is printed instead, with the share the drawn bands carry.

So every band now leaves at **its own bearing**, straight to its destination with a slight bow, and
the widths come from a scale the key draws.

## The claim

**4.5 million Ukrainians held temporary protection in Europe in June 2026, and Germany and Poland
account for 49.1 % of them.** Germany 1 250 825, Poland 958 885.

The plate refuses to render if the subject is not the largest host, if the two largest do not take
about half, or if the total falls under four million.

## The rules the reference gave, all four kept

- **Width is the quantity.** Conservation is not exercised: see above.
- **State the width scale in the key, in the data's units.** Minard's plate says *"un millimètre pour
  mille tonnes"*; this one prints how many people one pixel of width is worth, **measured at the size
  the plate actually drew** rather than declared in advance.
- **The route is schematic and the basemap is furniture.** The bands are not itineraries — nobody
  travelled along these curves — and the reading line says so. Under them the map is land in one
  faint step off the ground, no borders and no water tint; `PALETTE.md` records why the water
  convention is declined on a plate whose ink belongs to the flow.
- **Every other place is a name at the end of its own band**, with its number.

## The second redraw: everything was piled into a corner

The first redraw fixed the loops and Rémy's next read was *c'est toujours pas très lisible, tout est
entassé*. Three defaults were doing it, and all three were **inherited from the sibling map beats
without being re-taken**:

- **The camera was the continent.** Those beats frame all of Europe because their subject is all of
  Europe. This one draws bands to the largest hosts, and framing Iceland and Cyprus to hold them
  spends four fifths of the plate on empty sea while the bands pile into a thumbnail. The camera is
  now **the box the flows need** — the origin plus the ten largest hosts, padded — computed in
  `render-directions.mjs` and printed as the rule that picks the ten.
- **The fit was `cover`, not `contain`.** Filling the box and cropping the rest is right when the map
  is the subject; here it pushed the node every band leaves from off the right edge. The focus box is
  the thing that must be whole.
- **The bands were slabs.** The widest was capped at a share of the *map*, which on a small map is a
  large share of a country. It is now capped against the map box and at 17px absolute.

And one rule the redraw added: **a band whose destination is outside the frame is not drawn, it is
counted.** A ribbon running off the edge cannot be named, and an unnamed ribbon leaving the plate is
a quantity going nowhere. Ten bands carry 81 % of the people; the other twenty-one countries are
counted under the key, with a dot where they are in frame.

## Three measurements the redraw forced

**The widest band is capped at a share of the map**, and every other width follows from it, so the
plate stays a map rather than becoming a ribbon diagram over a faint basemap. Fourteen of the
thirty-one hosts clear the floor at that scale and carry 88 % of the people.

**The crop keeps the origin.** The sibling map beats anchor west, because what they give up is the
far east; this plate's node is *in* the east, and a west-anchored crop cut it in half — every band
on the plate leaving from a disc the reader cannot see. The map now slides until the origin sits
inside the box with room for its own label.

**The headline is spent last, not first.** With the panel's share outermost in the ladder — again
what the sibling map beats do, because there the map is the whole subject — this plate gave up its
claim to keep the narrowest panel and shipped a title that said only what it was about. A wider panel
costs the map some ground; a shorter headline costs the beat its sentence.

## A band too thin to see is not drawn, and is counted

Below the floor a band is thinner than a hairline and reads as a scratch. Those six countries keep a
dot at their seat and counted under the key — **seventeen countries, 12 % of the people**. Dropping
them silently would let the plate read as the whole of the thing while drawing seven eighths of it.

## What the harvest cost, and what it says about the pool

**Eight pieces were drawn for this form and one survived reading.** Six news pieces from the url
list — Globe and Mail, Reuters ×2, Kontinentalist, NPR, National Geographic — all harvested with both
routes green, and **not one reached a flow map**: five returned the piece's opening (a title card, a
photo-illustration, a bird photograph) and the sixth returned a scrollytelling map's first step,
before any route is drawn. That is METHOD correction 1 again, sharpened: on a scrolly piece the
harvester reaches step one, and **a flow map is almost always what a scroller builds to.**

A second draw from `search` returned two guide pages; Datawrapper's was a promotional header card and
was rejected under the standing rule that a lesson from a promo card is not a lesson. The EU
data-visualisation guide's page served Minard's plate at the top, and that is the record.

**One publication**, so the form files no family rules of its own.

## Source

Eurostat, `migr_asytpsm` — beneficiaries of temporary protection at the end of the month, Ukrainian
citizens, all ages, both sexes, June 2026 — fetched from Eurostat's own dissemination API and frozen
beside this beat as `data.csv`. Basemap: Natural Earth 50 m, frozen as `shapes.geojson`.


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

**Le coût, énoncé, et pourquoi ce beat peut le payer.** La LARGEUR d'un ruban est la quantité, et une
largeur est fixée par la donnée, pas par le sol : le gonflement de Mercator déplace l'endroit où un
ruban ARRIVE, jamais son épaisseur. Ce qu'il change est le cap sur lequel un ruban quitte l'origine,
puisque le siège de chaque destination est désormais un siège Mercator — et ce siège reste le centre
de la partie du pays réellement DANS LE CADRE, la correction que ce beat portait déjà. Le cadre a été
élargi à 48°E dans la même passe : chaque ruban part d'un seul point, et une caméra qui s'arrête
juste après lui écrase l'éventail contre la marge et pose le nom de l'origine sur celui de la
destination la plus proche.
