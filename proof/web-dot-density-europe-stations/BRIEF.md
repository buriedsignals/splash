---
format: web
type: dot-density
---

# Beat — Sur 8 299 centrales bas-carbone européennes, 72 sont nucléaires (web)

**Type:** dot density (map). **Medium/format:** map / **web**.

## Claim

Of the **8 299** low-carbon power stations the database lists in Europe, **72 are nuclear — 0,9 % of
the sites — and they carry 35,6 % of the combined capacity.** Nuclear is also the most concentrated
fuel by capacity per site (**2 241 MW** against 96 for hydro, 28 for wind, 8 for solar), and that
ranking is **derived**: a data refresh that overturned it would change the sentence, and the beat
would throw.

## Treatments spent

- `the-dots-resolution-is-what-the-data-supports` — **one dot is one station**, not a rounded quantity
  of megawatts. The file is a register of places, so the dot is a place.
- `three-classes-of-place-three-treatments` — the fuels are three treatments, not a ramp: the claim
  counts places by kind. The rare kind is drawn **last**, so a nuclear dot is never buried under a
  common one.
- `the-basemap-gives-up-its-contrast` — the coastline is a step off the ground and nothing more.

## What the web adds

A dot map shows **where** and **how many** and says nothing about how big. Every dot answers with the
station's fuel, its megawatts, its country and its share of that country's fleet — the weight the
count deliberately drops.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped**.

## Source

Global Power Plant Database (WRI) · Natural Earth basemap. `stations.csv` and `shapes.geojson` are
byte-for-byte copies of `proof/static-dot-density-europe-stations/`.

## Le fond de carte est MapTiler, et ce que la projection change

**Passe du 11 septembre 2026.** Le fond n'est plus un tracé projeté ici : c'est une plaque
**MapTiler** cuite par `bake.mjs` à 1600 × 1216, une par direction filée, et chaque point est placé
par la caméra enregistrée de cette plaque — `frameCorners`, mesuré avec `map.unproject()` après
stabilisation, jamais les `bounds` nominales que `fitBounds` élargit.

**Les teintes viennent de la direction, pas d'un style sur étagère.** `dataviz-dark` peint une terre
sombre sous une mer bleu clair : sur le navy de `nocturne`, l'eau deviendrait l'objet le plus
contrasté de la page, ce que `the-basemap-gives-up-its-contrast` interdit. Le bake reçoit donc l'eau
(un peu de l'accent) et la terre (un pas du fond vers l'encre), et éteint couverture du sol, ombrage,
routes, étiquettes et frontières avant la prise.

**Le coût, énoncé, et pour cette forme il est presque nul.** Un point n'a pas de surface. Web
Mercator déplace les lieux mais ne gonfle pas un point, et les deux nombres du titre — 8 299 sites,
72 nucléaires, 36 % de la puissance — sont des comptes et des sommes, jamais des surfaces : ils ne
touchent pas à la caméra. Le seul coût réel est de lecture : au nord, le même nombre de points
couvre plus de page, donc la Scandinavie paraît un peu moins dense qu'elle ne l'est. C'est le contraire
du piège du choroplèthe voisin, et c'est pour cette raison que ce beat-là garde sa caméra équivalente
pour mesurer alors que celui-ci n'en a pas besoin.

**Les formes de l'aire d'étude restent dessinées par-dessus la plaque.** La plaque porte la côte et
la mer ; les formes portent l'appartenance à l'étude. Sans elles, rien ne distinguerait un pays
mesuré de la Turquie ou de la Russie, qui sont dans le cadre sans être dans le fichier.
