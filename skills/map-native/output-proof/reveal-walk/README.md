# The reveal kind honours the journalist's walk — rendered proof

Sub-project ④(b), 2026-08-04. Two REAL produce runs of the same choropleth sample
(`assets/sample-data/choropleth.json`, `cameraMode: "simple"` → the Reveal family), rendered at
the same frame (140), differing only by an `arcBeats` walk.

The walk is **deliberately against the data's rank** — `GBR → DEU → NOR` while `NOR` carries the
highest value — because that is the only shape of walk that can tell "the journalist's order was
honoured" apart from "the ramp happens to look ordered".

| | what the frame shows |
|---|---|
| `without-walk.png` | Scandinavia and central Europe tint **together** — one ramp, everybody at once, the highest values reading first because they are the darkest bins |
| `with-walk.png` | **only the United Kingdom is in** — beat 1. Norway, the highest value in the data, has not entered yet |

That inversion is the proof: what appears, and in what order, comes from the walk the journalist
confirmed, not from the data's salience.

## Le symbole, la même preuve sur l'autre famille (2026-08-04)

`symbol-with-walk.png` / `symbol-without-walk.png` — même méthode, même frame, sur
`assets/sample-data/symbol.json`, avec une marche **à contre-courant de la TAILLE** :
`Amsterdam → Rome → Berlin`, alors qu'`Amsterdam` porte la plus petite valeur (52) et que
`London` porte la plus grosse (296) sans être dans la marche.

| | ce que la frame montre |
|---|---|
| `symbol-without-walk.png` | les étiquettes d'Amsterdam, London, Paris, Madrid et Rome sont **toutes** là, faibles — une rampe, tout le monde en même temps |
| `symbol-with-walk.png` | **seul Amsterdam est visible**. London, la plus grosse valeur de la donnée, n'est pas entrée |

Le symbole grandit dans l'ordre de la marche, jamais à une taille différente : l'expression
MULTIPLIE le rayon existant au lieu de le remplacer — la taille d'un symbole EST sa valeur, la
marche décide seulement quand il pousse.

Regenerate:

    bun scripts/produce.mjs <config-with-arcBeats>.json <outDir> video

Not wired into `bun run check` — it is two live MapTiler-backed Remotion renders (~2 min each),
the same reason `verify-source-bundle.mjs` stays opt-in.
