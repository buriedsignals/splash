# Sous-projet ④ — câbler les genres narratifs

**Parapluie** : `2026-08-03-editorial-storyboard-design.md` § 7. Dépend de ①②③ (fusionnés).

## Ce que ④ doit fermer

Trois genres narratifs, et aucun ne recevait le storyboard de la même façon :

| genre | ce qui porte le récit | état avant ④ |
|---|---|---|
| `story` | la caméra | **honore la marche** — le seul chemin qui marchait |
| `stepped` | l'étape (avancée par le temps) | famille complète, enregistrée, **inatteignable** |
| `scrolly` | l'étape (avancée par le lecteur) | honore la marche |
| `reveal` | la donnée | **aucune notion de récit du tout** |

## (a) `stepped` — FAIT

`MapScrolly.tsx` dispatche les 7 types, `Root.tsx` enregistre ses 3 aspects avec `scrollyMeta`
(durée calculée par run, puisqu'une vidéo à étapes est aussi longue que sa marche a d'étapes).
Ce qui manquait : `storyComps()` ne connaissait que `guided-tour`, `route-reveal` et `simple`.
**Un genre narratif entier rendait correctement et personne ne pouvait le demander** — exactement
l'état dans lequel `simple` était avant d'être ajouté là.

`stepped` rejoint `CAMERA_MODES` et `storyComps`. Un seul dispatcher pour tous les types, contrairement
aux deux modes par-type : `MapScrolly` switche lui-même sur `config.type`.

**Effet de bord voulu** : `RouteScrolly.tsx` est déjà branché dans ce dispatcher — donc la moitié du
« lot route » (C2 du backlog) devient atteignable sans écrire un composant.

## (b) `reveal` — le mécanisme est là, la couverture est partielle et NOMMÉE

Un reveal, c'est « ce qui apparaît, dans quel ordre ». Avant : **une seule rampe** pilotait
l'opacité de tous les sujets à la fois, donc la marche confirmée du journaliste ne changeait rien
à l'écran. (L'en-tête de `ChoroplethReveal` prétendait révéler « par ordre de bin » ; `__binIdx`
était calculé et jamais lu — mesuré par l'inventaire du 2026-08-03.)

**Le mécanisme, pur et partagé** (`src/reveal.ts`) : `walkSubjectProgress` donne à chaque sujet sa
propre fenêtre dans l'ordre du journaliste ; `walkFillOpacity` en compose l'expression MapLibre ;
`activeWalkIndex` répond quel beat est à l'écran (ce qu'une légende nommera). **Sans marche, la
valeur retournée est le scalaire d'avant, à l'octet** — un run que personne n'a storyboardé ne
bouge pas d'une frame.

**Qui l'honore** : les **cinq** types dont l'ancre est une clé que la donnée porte —
`ChoroplethReveal`, `CartogramReveal`, `SymbolReveal`, `LocatorReveal`, `DotDensityReveal`.

★ **La clé de chacun est lue dans SON PROPRE validateur**, jamais choisie ici — c'est ce qui
garantit que ce qui est *validé* et ce qui est *peint* parlent de la même chose :
`points[].label` (symbole, `validateSymbolConfig`) · `markers[].label` (locator,
`validateLocatorConfig`) · `rows[][regionKey]` (densité, `validateDotDensityConfig`) ·
la clé de région (choroplèthe) · `values[].id` (cartogramme).

**Qui ne l'honore pas, et pourquoi** — pinné mécaniquement par
`tests/reveal-walk-coverage.test.ts`, pas affirmé en prose. Ce ne sont plus des « en attente » :
ce sont deux exclusions **de nature**.

- `RouteReveal` — son animation EST la marche, point par point (`story-comps.mjs` le dit : le
  survol guidé d'une route et son tracé sont la même animation).
- `HexGridReveal` — ses cellules n'ont pas de clé qu'un beat pourrait nommer (l'ancre d'un
  hex-grid est un *place* en texte libre, la raison même de son exclusion de ③).

**Deux décisions de conception, tranchées et assumées** :

- **Un symbole grandit dans l'ordre de la marche, jamais à une taille différente.** L'expression
  MULTIPLIE le rayon existant au lieu de le remplacer : la taille d'un symbole EST sa valeur ; la
  marche décide *quand* il pousse, jamais *jusqu'où*.
- **Le plafond d'opacité suit le composant, pas la famille.** Les surfaces plafonnent à 0,85, les
  points à 1 — parce que c'est ce que chacun peignait avant. L'invariant tient : sans marche,
  aucun pixel ne bouge.

## ★ PROUVÉ AU RENDU (2026-08-04)

`skills/map-native/output-proof/reveal-walk/` — deux produce RÉELS du même choroplèthe, rendus à
la même frame, ne différant que par la marche.

La marche est **délibérément à contre-courant du classement des données** (`GBR → DEU → NOR`
alors que `NOR` porte la valeur la plus haute), parce que c'est la seule forme de marche qui
distingue « l'ordre du journaliste a été honoré » de « la rampe a l'air ordonnée par hasard ».

- **Sans marche** : la Scandinavie et l'Europe centrale se teintent **ensemble** — une seule
  rampe, tout le monde en même temps, les valeurs hautes se lisant d'abord parce qu'elles sont
  les bins les plus foncés.
- **Avec marche** : **seul le Royaume-Uni est en place** — le beat 1. La Norvège, valeur la plus
  haute de la donnée, n'est pas encore entrée.

Cette inversion EST la preuve : ce qui apparaît, et dans quel ordre, vient de la marche que le
journaliste a confirmée, pas de la saillance des données.

## (c) `cameraMode` par beat — non commencé

Dépend de (b), qui est désormais complet : les cinq `*Reveal` qui peuvent lire une marche la
lisent, donc il existe enfin un beat sur lequel poser un défaut de caméra.
