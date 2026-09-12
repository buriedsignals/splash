---
format: web
type: choropleth
---

# Beat — 7 pays européens tirent plus de 94 % de leur électricité de sources bas-carbone (web)

**Type:** choropleth (map). **Medium/format:** map / **web**. **Frame:** fluid in width, fixed in
proportion.

## Claim

**Seven European countries drew more than 94 % of their 2024 electricity from low-carbon sources** —
Albanie, Islande, Suède, Norvège, Suisse, Finlande, France. 41 countries are drawn, 40 carry a
reading and **1 is drawn hollow** for want of one.

## Why this map goes through the chart format

It draws its own geometry. The static sibling goes through `chart-beat`'s rasteriser rather than
`map-beat`'s for the same reason, and `map-web` exists for a **tiled basemap** and its live-plan
interaction: a projected vector map with no tiles has no use for either, and pulling one in would add
a third-party host to a page that needs none.

## The camera

Lambert azimuthal equal-area at 52° N 10° E — EPSG:3035. **A choropleth is read by area**, so a
projection that inflates the north inflates the argument: in Web Mercator, Norway, Sweden and Finland
are stretched by about a factor of two at their own latitudes, and three of the seven countries this
beat names are exactly those. The map also sets `xMidYMid meet`: an equal-area projection stretched
on one axis is no longer equal-area.

## Treatments spent

- `the-key-names-its-classes-in-their-own-colours` — the key is the classes, in their own swatches,
  with their bounds in per cent.
- `the-ramp-is-monotone-in-lightness` — the classes step one way only, so the order survives a
  monochrome print.
- `a-missing-cell-is-drawn-as-missing` — hollow and dashed, and named in the key. **The lowest class
  is a country at 10 %; a country with no data is neither.**

A ring too small to thin is kept whole — the rule that stops Malta from vanishing, and a choropleth
with a country silently absent is the failure every reference sheet warns about by name.

## What the web adds

A choropleth turns a number into a **class**, and a class is a band a reader cannot narrow: two
countries in the same colour may be twelve points apart. Every country answers with its exact share,
the class and its bounds, its low-carbon TWh, and its rank among the forty.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 ·
Natural Earth basemap. `data.csv` and `shapes.geojson` are byte-for-byte copies of
`proof/static-choropleth-europe-lowcarbon/`.

## Le fond de carte est MapTiler, et ce que la projection change

**Passe du 11 septembre 2026.** Le fond n'est plus un tracé Natural Earth projeté ici : c'est une
plaque **MapTiler** cuite par `bake.mjs`, et tout ce que la page dessine est placé par la caméra
enregistrée de cette plaque — `frameCorners`, mesuré avec `map.unproject()` après stabilisation de la
caméra, jamais les `bounds` nominales, que `fitBounds` élargit pour préserver le format du cadre.

**Une plaque par direction filée, teintée par la direction.** `the-basemap-gives-up-its-contrast` ne
peut pas être satisfait en choisissant entre deux styles publiés : `dataviz-dark` peint une terre
sombre sous une mer BLEU CLAIR, ce qui, sur le navy de `nocturne`, fait de l'eau l'objet le plus
contrasté de la page. Le bake reçoit donc les deux teintes que la direction lui donne — l'eau prend
un peu de l'accent (`water-is-a-tint-not-a-grey`), la terre un pas du fond vers l'encre. Les couches
de texture (couverture du sol, ombrage, routes, étiquettes, frontières) sont éteintes. La plaque est
cuite à 1600 × 1216 : une page web s'ouvre sur un écran à deux pixels par point, et une plaque cuite
à la taille du dessin y serait molle.

**Le coût, énoncé, et il n'est pas le même que pour la sœur statique.** Web Mercator gonfle le
nord : à 60° une forme dessine deux fois la surface qu'elle occupe. Le titre de ce beat est un
COMPTE de pays, pas une surface, donc il survit intact — et le standfirst le dit maintenant au lieu
de revendiquer une lecture équivalente qu'il n'a plus. `camera.ts` reste dans le beat : c'est la
caméra qui MESURE, et le runner imprime les deux. Les trois plaques sont vérifiées identiques en
caméra avant le rendu.

**Ce que le creux montre maintenant.** L'Ukraine, seul pays sans production publiée pour 2024, est
dessinée en creux : sous elle on voit désormais la terre de la plaque, pas le papier. Un pays sans
donnée ressemble donc au reste du monde hors étude, ce qui est exactement ce qu'il est — et son
contour reste en pointillé pour qu'on ne le confonde pas avec un pays hors cadre.
