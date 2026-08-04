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

## (c) La décision de caméra descend au beat — FAIT

**Le problème** : `cameraMode` est un réglage **global**. « Survol guidé » ⇒ chaque étape
repositionne la caméra ; « plan fixe » ⇒ aucune. Le journaliste ne pouvait pas dire *« ici, ne
bouge pas »* sur une étape en particulier — alors que c'est exactement ce que demande la spec
parapluie (§ 5 : le réglage global devient le **défaut**, contredit beat par beat).

**Le mécanisme** : un beat porte `movement: "jump" | "hold"`. `hold` garde le cadre que l'étape
précédente a laissé. Appliqué **à un seul endroit** — `applyMapArc` (`map-story.ts`), là où une
étape de storyboard devient une étape de récit — donc les sept composants `Story` et les sept
`stepped` en héritent sans une ligne chacun.

**Le mot existait déjà** : `hold` est dans `CAMERA_GESTURES` depuis ①, déclaré sur `reveal` (la
caméra fitBounds une fois et ne bouge plus). ④(c) l'**implémente** pour `story`/`stepped` puis le
déclare — dans cet ordre, la règle de ①. Un mot, un sens, deux mécanismes.

**Quatre refus, pour qu'aucune dérive ne soit silencieuse** :

1. Un mot non implémenté (`fly` sur une vidéo) est refusé **au gate**, en nommant ce que le moteur
   sait faire. Sans ça, une faute de frappe serait jetée au rendu et l'étape bougerait quand même.
2. Un `hold` sur la **première** étape est refusé — il n'y a pas de cadre précédent à garder.
   Refusé aux deux surfaces : au gate (là où ça sert au journaliste) et au rendu (défense en
   profondeur).
3. Une **suite** de `hold` reste sur le dernier cadre qui a **vraiment bougé**, pas sur le cadre
   d'une étape qui tenait elle-même. (Premier jet : le commentaire décrivait ça, le code lisait le
   beat brut. Le test l'a attrapé.)
4. Un beat qui ne dit rien produit un rendu **identique à l'octet** à celui d'avant.

### ⚠️ Ce qui est prouvé, et par quel instrument

**Prouvé jusqu'au dérivateur** — `deriveSymbolStory` avec et sans `hold` : l'étape tenue reçoit
exactement le cadre de la précédente, et tout le reste du beat est intact. C'est ce que le
composant consomme : il transforme ce `camera` en solution MapLibre et y saute.

**PAS démontré au rendu, et c'est une limite de l'instrument, pas une réserve sur le code.** Deux
paires de vidéos ont été rendues (choroplèthe, symbole) sans réussir à **discriminer** :

- un choroplèthe en mode `context` (le défaut) garde délibérément le cadre d'établissement autour
  de chaque étape — toutes les étapes partagent déjà la même caméra, donc `hold` y est honoré mais
  **inobservable**. C'est une propriété du type, à dire au journaliste ;
- sur un symbole, la caméra reste sur la première étape jusqu'aux dernières fractions de seconde
  du clip, donc aucune frame échantillonnée ne montrait le mouvement que `hold` supprime.

Ce qui le montrerait : une marche à **deux** étapes sur un symbole, ou un clip allongé, avec des
frames extraites du mp4 aux frontières d'étapes plutôt qu'au still de revue (frame 140, qui tombe
dans le plan d'établissement).
