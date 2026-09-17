---
size: landscape
type: choropleth
format: static
medium: map
grounding: supported
derived: v1
---

# Beat — The low-carbon block is the north-west, and Albania

**Type:** choropleth (map). **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above, which is the statement that counts.

The first `map` beat in this tree, and the last of the harvest's families to get a directed
component.

## The claim

**Seven European countries drew more than 94 % of their 2024 electricity from low-carbon sources.
Six of them are north or west of the seventh — and the seventh is Albania, whose every neighbour is
under 60 %.**

The count, the routes and the geography are all asserted. The geography especially: **Albania's
neighbours are derived from the frozen rings**, by testing whether a vertex of one country lands
within a tenth of a degree of a vertex of another. That test is coarse in the safe direction — it can
only ever find MORE neighbours than exist — so a claim that every neighbour is under a floor cannot
pass by missing one. "North or west" is likewise a measurement on the projected anchors, not a
sentiment.

## Why this form, when the matrix already drew this data

The heatmap beat drew twelve countries and could not draw more: a landscape plate holds about a dozen
labelled rows. **The map draws forty.** And it answers a question the matrix cannot form at all —
*where* — which is how the exception became visible. Albania at 100 % is invisible in a ranked list
of twelve because it is simply the second row; on a map it is a bright cell surrounded by dark ones,
and that adjacency is the finding.

## The absence

Ukraine has a shape and no 2024 data — its row in the frozen file carries a single `0` for bioenergy
and nothing else. It is drawn in a neutral **outside the ramp** and named in the key, because a
country left in the lowest class would be a country reported as 10 % low-carbon.

The countries in the frame that are not in the study set at all — Morocco, Algeria, Syria — are a
third thing again: context, drawn in the faintest land step, never in the absence's neutral. Three
states, three fills, and the key names the two that mean something.

## What the frame does not show, and says so

Russia and Turkey are coloured on their **national** share; the camera reaches only their western
ends. The reading line says so, on the plate, in the directions whose ladder can afford it.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh. The same frozen European slice the heatmap beat carries,
duplicated rather than linked, per this corpus's own ruling, so this beat renders and audits alone.

Shapes: **Natural Earth 50 m admin-0 countries**, public domain. Fetched on 2026-09-09, and the fetch
is the provenance:

```
curl -sS -L "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"
```

242 features returned. Frozen beside this beat as `shapes.geojson`: the 64 features that intersect
the camera's window (25° W – 45° E, 34° N – 72° N), with vertices outside a generous margin around
that window dropped and coordinates rounded to three decimals — 303 KB rather than 3 MB, and the same
coastline at this camera.

## Le fond de carte est MapTiler, et ce que la projection change

**Passe du 10 septembre 2026.** Le fond n'est plus un tracé Natural Earth projeté ici : c'est une
plaque **MapTiler** cuite par `bake.mjs`, et tout ce que la carte dessine est placé par la caméra
enregistrée de cette plaque — `frameCorners`, mesuré avec `map.unproject()` après stabilisation de la
caméra, jamais les `bounds` nominales, que `fitBounds` élargit pour préserver le format du cadre.

**Une plaque par direction filée, teintée par la direction.** `the-basemap-gives-up-its-contrast` ne
peut pas être satisfait en choisissant entre deux styles publiés : `dataviz-dark` peint une terre
sombre sous une mer BLEU CLAIR, ce qui, sur le navy de `nocturne`, fait de l'eau l'objet le plus
contrasté de la page. Le bake reçoit donc les deux teintes que la direction lui donne — l'eau prend
un peu de l'accent (`water-is-a-tint-not-a-grey`), la terre un pas du fond vers l'encre — et repeint
la géométrie de MapTiler avant la prise. La géographie est celle de MapTiler ; la palette est celle du
beat. Les couches de texture (couverture du sol, ombrage, routes, étiquettes, frontières) sont
éteintes : une plaque dirigée est un FOND, et un fond tacheté de forêts a plus de contraste contre la
page que les marques posées dessus.

**Le coût, énoncé.** Web Mercator gonfle le nord : à 60° une forme dessine deux fois la surface
qu'elle occupe. Le titre de ce beat est un COMPTE de pays, pas une surface, donc il survit intact.
La moyenne pondérée par la surface que le cartogramme voisin compare, elle, ne survivrait pas — et ce
beat garde donc la caméra équivalente (LAEA, EPSG:3035) pour MESURER, tout en dessinant sur la
plaque. Là où les deux divergent, le nombre est celui de la projection équivalente et l'image est
celle de la plaque. Les trois plaques sont vérifiées identiques en caméra avant le rendu : trois
plaques en désaccord sur l'emplacement d'un degré placeraient le même pays à trois endroits sans que
rien ne rougisse.

### Deux défauts que le changement de caméra a révélés (11 septembre 2026)

**Un nom de mer pouvait sortir du cadre.** `visible` — la boîte de ce que la caméra montre
réellement — était calculée et appliquée aux noms de PAYS, quelques centaines de lignes plus bas.
Les noms d'eau ne la rencontraient jamais. Rien n'a rougi pendant que « Mer Méditerranée » avait sa
ligne de base sous le bord inférieur et s'imprimait en demi-mot. Une garde qui tient une classe de
marque et pas l'autre est la forme que prennent presque tous les défauts de cet arbre.

**Un nom de mer pouvait nommer la mauvaise mer.** La recherche en spirale part du centre déclaré et
s'éloigne d'un pas qui grandit avec le mot ; dix anneaux d'un tel pas, pour un nom long, font plus de
la moitié du cadre. « Mer Baltique » est sorti de la Baltique, a traversé le Danemark et s'est posé
en mer du Nord, deux lignes au-dessus de « Mer du Nord » : les deux lisibles, les deux en eau libre,
les deux dégagées l'une de l'autre, et l'une des deux nommant la mauvaise mer. La spirale a
maintenant une laisse — un dixième du cadre — et au-delà, c'est la forme PLUS COURTE de la même mer
qui est essayée. Les trois directions nomment désormais « Balt. » ou « Baltique » sur la Baltique.

## The choreography

The eye reads the north-west as one dark mass — Iceland, Norway, Sweden, Finland, then France and
Switzerland — before it reads a single country name. What breaks that mass is one cell far to the
south-east, as dark as the north and surrounded by pale neighbours, and it is ringed so a reader
cannot mistake it for a fill. That adjacency is the whole reason this is a map and not a ranked
list: Albania's neighbours are the argument, and only a map puts them beside it. The note in the
left column counts them afterwards.

**The eye enters at** `the dark block`. **The claim lands at** `reveal`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the dark block` | `the ringed Albania` |
| reference | `the class key` | `the ringed Albania` |
| reveal | `the ringed Albania` | — |
| conclusion | `the exception note` | `the ringed Albania` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the dark block",
  "stations": [
    {
      "station": "establish",
      "carries": "the dark block",
      "subordinateTo": "the ringed Albania"
    },
    {
      "station": "reference",
      "carries": "the class key",
      "subordinateTo": "the ringed Albania"
    },
    {
      "station": "reveal",
      "carries": "the ringed Albania",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the exception note",
      "subordinateTo": "the ringed Albania"
    }
  ],
  "claimLands": "reveal"
}
```

## Precision

- **The exception is a search, not a pick** — the one country in the top class outside the north-west is found by measurement; Albania is the answer, not the premise.
- **The join fails loud** — every studied country is asserted to have a row; a dropped region throws at build time rather than rendering as a quiet no-data class.
- **The north-west is a computed set** — "north or west" is a measurement on the projected anchors, and the three neighbours are derived from the frozen rings by a test coarse in the safe direction.
- **The basemap is a baked MapTiler plate** — baked once per direction, repainted in the direction's own two tints before the capture, and the three plates verified identical in camera.
- **Forty countries in the one frame** — the block, the exception and the classes it is read against are all on the plate at once; nothing is deferred to a second view.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-exception-is-a-search-not",
    "the-join-fails-loud",
    "the-north-west-is-a-computed",
    "the-basemap-is-a-baked-maptiler",
    "forty-countries-in-the-one-frame"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-exception-is-a-search-not",
    "the-join-is-asserted-and-a": "the-join-fails-loud",
    "the-geography-in-the-claim-is": "the-north-west-is-a-computed",
    "the-basemap-is-a-maptiler-plate": "the-basemap-is-a-baked-maptiler",
    "asserted-in-the-one-frame": "forty-countries-in-the-one-frame"
  }
}
```
