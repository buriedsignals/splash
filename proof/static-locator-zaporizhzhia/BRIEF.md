---
size: landscape
type: locator
format: static
medium: map
grounding: supported
derived: v1
---

# Beat — Where Europe's largest low-carbon power station is

**Type:** locator (map). **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above.

The first `locator` beat in this tree, and the fourth map beat.

## Why this beat matters to the base and not only to the story

`three-classes-of-place-three-treatments` was filed against a choropleth — a form that names
administrative areas and water and **has no settlements to name**. The rule's whole return is that a
reader separates the three classes from typography alone, and that has never been testable in this
tree until now. A locator has all three, and this plate draws all three:

- **administrative area** — the axis register, uppercased and tracked, in the muted ink
- **settlement** — the annot register, mixed case, a step darker, each on its own open dot
- **water** — the annot register in italic, in the water tint
- and the **feature the story is about** — the accent, ringed — which is not a place class at all but
  the beat's subject wearing the clothes it wears on every other form in this base

## The claim

**Zaporizhzhia, 6,000 MW of installed capacity, is the largest low-carbon power station the database
records in Europe — and Ukraine is the only country on the continent whose 2024 electricity
generation this corpus's own source does not report.**

Both halves are asserted against frozen data: the first against the station file, the second against
the electricity file the choropleth, heatmap and pictogram beats already carry. The absence those
three beats each drew — a grey country, a country left out of a unit grid — is the same absence, and
here it has a place.

## The limit the plate states because the source invites the wrong reading

The database records **installed capacity, never output**. A plate that said "produces" would be
false. The reading line says so in the reader's words: *la base enregistre une puissance installée,
jamais une production — la centrale est dessinée là où elle est, pas là où elle produit.*

## What the plate refuses to carry

SCMP's record: *"no borders, no cities, no graticule … a locator map that named provinces would have
made the reader look for one."* So this plate names the countries the story touches, the six largest
settlements in frame, three bodies of water, and nothing else. Both cuts are rules, and both are
printed.

## Two measurements

**A label may be pushed, never dropped, never laid on another.** Each label takes the first of six
offsets — right of its dot, left, above, below — that clears every box already placed and stays
inside the camera. The subject is placed first, because it is the one label that may not move. The
plate reports what it could not place.

**And an area's seat is the centre of the part IN FRAME, not of the country.** Russia's own centroid
is in Siberia, so a seat taken from the whole polygon put its name outside the camera and reported
"no room" — while a third of the plate was Russia, unnamed. A locator names what a reader can see.

## Source

WRI Global Power Plant Database v1.3.0 and Natural Earth 50 m (countries and populated places), both
public domain, frozen beside this beat.


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

**Le coût, énoncé, et pourquoi il ne se pose pas.** À cette échelle — 18° de large — le gonflement de
Mercator est une fraction de pour cent d'un bord à l'autre du cadre, donc l'argument de projection
que les cartes continentales doivent tenir ne se pose pas ici. Ce que la plaque apporte, en revanche,
est exactement ce dont un locator vit : un lecteur qui ne reconnaît pas la côte n'a rien appris, et
les bornes de la caméra viennent toujours du sujet — la plus grosse centrale du fichier gelé — et
sont passées au bake plutôt qu'à une projection écrite ici.

## The choreography

A locator has one job and this one does it with a single ring. The three classes of place are
separated by typography alone — countries uppercased and tracked in muted ink, settlements mixed
case on their own open dots, water in italic in the water tint — so the map can be read without a
key. The Black Sea and the Sea of Azov are what make the frame recognisable at a glance, and the
Dnipro is what puts the subject somewhere rather than anywhere. The ring is placed first and every
other label is seated around it; the figure sits directly under the name, in the accent, so the
what and the how-much arrive together.

**The eye enters at** `the ringed subject`. **The claim lands at** `conclusion`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the three place classes` | `the ringed subject` |
| reference | `the water names` | `the ringed subject` |
| subject | `the ringed subject` | — |
| conclusion | `the capacity label` | `the ringed subject` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the ringed subject",
  "stations": [
    {
      "station": "establish",
      "carries": "the three place classes",
      "subordinateTo": "the ringed subject"
    },
    {
      "station": "reference",
      "carries": "the water names",
      "subordinateTo": "the ringed subject"
    },
    {
      "station": "subject",
      "carries": "the ringed subject",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the capacity label",
      "subordinateTo": "the ringed subject"
    }
  ],
  "claimLands": "conclusion"
}
```

## Precision

- **The largest is a search over the base** — which low-carbon station is Europe's biggest is a search in the frozen database; Zaporizhzhia is its answer, and the standfirst states the one caveat the source carries.
- **A label is pushed, never dropped** — each label takes the first of six offsets that clears every box already placed and stays inside the camera; the subject is placed first because it may not move, and the plate reports anything it could not seat.
- **The camera is framed on the subject** — the bounds come from the subject's own position, so the ring can never be the thing a crop cuts.
- **The projection's cost is measured** — the distortion at this scale is measured and shown to be a fraction of a per cent across the frame, rather than assumed negligible.
- **Place and figure in the one frame** — the ring, the name and the 6 000 MW are read together; a locator that made the reader look elsewhere for the number would be a decoration.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-largest-is-a-search-over",
    "a-label-is-pushed-never-dropped",
    "the-camera-is-framed-on-the",
    "the-projection-cost-is-measured",
    "place-and-figure-in-the-one"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-largest-is-a-search-over",
    "a-label-may-be-pushed-never": "a-label-is-pushed-never-dropped",
    "the-camera-bounds-always-come-from": "the-camera-is-framed-on-the",
    "the-projection-cost-is-stated-and": "the-projection-cost-is-measured",
    "asserted-in-the-one-frame": "place-and-figure-in-the-one"
  }
}
```
