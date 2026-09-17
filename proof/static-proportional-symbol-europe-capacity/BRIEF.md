---
size: landscape
type: proportional-symbol
format: static
medium: map
grounding: supported
derived: v1
---

# Beat — A hundredth of the sites carries a third of the power

**Type:** proportional symbol (map). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

The first `proportional symbol` beat in this tree, and the third map beat.

## It draws the same stations as the dot map, and the pair is the argument

`proof/static-dot-density-europe-stations` draws these 8,900 stations as equal dots. **A dot map
gives the COUNT of places and says nothing about their weight; sizing the mark gives the weight and
costs the count**, because a large circle covers the small ones near it. Neither is the better map.
They answer different questions, and having both in the tree is what makes that checkable rather than
asserted — which is the same reason the slope and the small multiples beats both exist.

## The claim

**The 193 European low-carbon power stations of 400 MW or more — 2.2 % of the sites — carry 54.5 %
of the installed capacity.** Nuclear is the heaviest part of it: 0.8 % of the sites, 34.4 % of the
capacity, and the highest capacity per site of any fuel.

That is the claim this encoding can make and the dot map could not, and every part of it is derived
before a mark is drawn.

## How many circles the plate draws, and why that is a measurement

The first version drew all 8,900. It obeyed `an-overlap-accumulates-rather-than-occluding` — the
circles were hollow, nothing occluded anything — and Rémy's read of it was one word: *illisible*. The
rule was kept and the plate was unreadable, which means the rule had a condition nobody had measured.

The condition is **density**, and an average hides it: the whole map was 13 % ink while western
Europe was solid. So the measure is the **worst cell** of a grid over the camera — the stroke length
of every circle whose centre falls in it, against the cell's own area. All 8,900 measured **302 %**:
three times the cell's area in outline. That is not a field a reader counts; it is a blot.

The beat now climbs a ladder of capacity thresholds until the field clears a 40 % floor at the
smallest camera any direction gives it, and the component enforces the floor again at the camera it
actually got. It settled at 400 MW — and the cut is printed on the plate, along with why: *sous
400 MW, non dessiné : à 8 900 cercles le champ se referme.*

## What the corpus decided

`an-overlap-accumulates-rather-than-occluding` (Carbon Brief, Buried Signals) — the circles are
**hollow**. Buried Signals' Yemen map states the reason: *"filled discs would have hidden each other
and lost exactly the information the piece is about."* On this plate, filled circles would let
Europe's largest sites erase the smaller ones beside them — the map would answer its own question by
hiding the evidence.

`a-radius-is-not-read-by-eye` — area is proportional to capacity, so the radius runs on a square
root, and the key carries **named circles at stated megawatts** rather than a sentence claiming the
area is proportional. The same function computes the marks and the key, or the key is a decoration
that happens to sit near the map.

`the-dots-resolution-is-what-the-data-supports`, `the-basemap-gives-up-its-contrast`,
`water-is-a-tint-not-a-grey`, `the-subject-is-ringed-not-recoloured` — as the sibling map beats.

## A note on this family's own evidence

The `map` family's two proportional-symbol references are **both Buried Signals** — one publication,
below this base's floor of two independent ones. The rule this beat leans on clears the floor only
because a sankey record from another desk says the same thing. Where a family's corpus is one
newsroom, a beat in it draws on the base's general rules and does not get family rules of its own
until a second desk is harvested. That is recorded here rather than quietly worked around.

## Source

WRI Global Power Plant Database v1.3.0, public domain, frozen beside this beat as `stations.csv` —
the same file the dot-density beat carries, duplicated rather than linked. Basemap: Natural Earth
50 m.


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

**Le coût, énoncé, et pourquoi il est petit ici.** Web Mercator gonfle le nord, et une carte à
symboles est la famille qui s'en moque : l'aire d'un cercle encode la DONNÉE, pas le sol sous lui,
donc une Norvège étirée laisse au cercle norvégien exactement la taille que ses mégawatts lui valent.
Ce qui bouge est le SIÈGE du symbole — toujours le centre pondéré des centrales du pays, projeté
comme la plaque sous lui.

## The choreography

Area is the quantity, so the eye goes to the biggest rings first — the scatter of wide circles
across France, the Rhine, the Baltic and the Volga — and that concentration IS the claim: the
power sits in very few places. Every circle is hollow, so where they pile up the overlap
accumulates instead of hiding one station behind another. The key's two circles are named at
stated megawatts and computed by the same function as the marks. The plate then says what it does
not draw: below 200 MW the field closes up at 8 900 circles, and the cut is printed with its
reason rather than left as a silent omission.

**The eye enters at** `the largest circles`. **The claim lands at** `establish`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the largest circles` | — |
| reference | `the hollow field` | `the largest circles` |
| reveal | `the named key circles` | `the largest circles` |
| conclusion | `the printed cut` | `the largest circles` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the largest circles",
  "stations": [
    {
      "station": "establish",
      "carries": "the largest circles",
      "subordinateTo": null
    },
    {
      "station": "reference",
      "carries": "the hollow field",
      "subordinateTo": "the largest circles"
    },
    {
      "station": "reveal",
      "carries": "the named key circles",
      "subordinateTo": "the largest circles"
    },
    {
      "station": "conclusion",
      "carries": "the printed cut",
      "subordinateTo": "the largest circles"
    }
  ],
  "claimLands": "establish"
}
```

## Precision

- **A hundredth and a third are computed** — the share of sites drawn and the share of installed power they carry are both derived from the frozen database, so a refresh that overturned either would change the sentence.
- **Area, never radius, is the value** — symbol area is proportional to the asserted megawatts, and the same function computes the marks and the key's two named circles.
- **The density floor is measured on the worst cell** — the floor is measured on the worst cell of a grid over the camera rather than on an average, and the component enforces it again at the camera it actually got.
- **The 200 MW cut is printed, with its reason** — the threshold that cut the field is on the plate, and so is why: at 8 900 circles the field closes up and stops being readable.
- **What is drawn and what is not** — the drawn count, the cut and its consequence are in the one frame, because a proportional-symbol map without its residue overstates what it shows.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "a-hundredth-and-a-third-are",
    "area-never-radius-is-the-value",
    "the-density-floor-is-measured-on",
    "the-200-mw-cut-is-printed",
    "what-is-drawn-and-what-is"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "a-hundredth-and-a-third-are",
    "symbol-area-never-radius-alone-is": "area-never-radius-is-the-value",
    "the-density-floor-is-measured-on": "the-density-floor-is-measured-on",
    "the-threshold-that-cut-the-field": "the-200-mw-cut-is-printed",
    "asserted-in-the-one-frame": "what-is-drawn-and-what-is"
  }
}
```
