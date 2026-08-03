# Le storyboard éditorial — spec parapluie

**Date** : 2026-08-03 · **Statut** : conçu avec Rémy, validé section par section, **non implémenté**
**Nature** : spec **parapluie**. Le chantier se découpe en quatre sous-projets (§ 7), chacun avec sa
propre spec, son plan et son cycle. Ce document fixe le modèle commun.

## 1. La règle produit

> « Pour le scrolly ou la vidéo on doit **proposer une conception de storyboard** et la faire
> **valider ou modifier par le journaliste** — c'est le côté éditorial. Puis une fois validé,
> **produire**. Peu importe que ce soit n'importe quel type de map ou de chart ou de vidéo avec
> mouvement de caméra ou non. » — Rémy, 2026-08-03

Le storyboard remplit **trois** fonctions à la fois, et c'est ce qui le distingue d'un simple champ
de configuration :

1. **Vérifier que c'est éditorialement correct** — les étapes, ce qui est dit, ce qui est montré.
2. **Donner au journaliste une vision claire de ce qui va être produit** — il voit le film avant
   qu'il existe, au lieu de découvrir un fichier.
3. **S'assurer que ça rentre dans ce qu'on sait produire** — le storyboard est aussi un contrôle de
   faisabilité : il ne doit jamais promettre un geste qu'un moteur ne sait pas rendre.

## 2. Pourquoi cette spec existe — ce qui a été construit à la place

La même demande a été formulée le **2026-07-31** : « le travail éditorial que tu fais pour le scrolly
pour définir les étapes et ce qui est dit et ce qui est montré et les éléments à animer, **fais-le aussi
lorsque tu crées la vidéo** pour avoir le storyboard. »

Ce qui a été livré est **la plomberie, pas l'étape**. Le plan `2026-07-30-map-storyboard-and-video-geography`
a créé `arcBeats` — la structure qui porte des beats confirmés — et l'a câblée dans les compositions
`*Story` et dans les scrollies web. Il n'a jamais construit **l'étape de proposition**, et n'a jamais
vérifié que *tout* chemin l'honore.

**La demande a été traduite en capacité technique (un champ, des composants qui le lisent) au lieu
d'une conversation (proposer → valider → produire).** Le plan supposait qu'un storyboard confirmé
arriverait de quelque part, sans construire ce quelque part. Chaque tâche a été relue individuellement
et aucun relecteur ne pouvait voir le trou, parce qu'il est **entre** les tâches.

Conséquences mesurées le 2026-08-03 (`docs/splash/reachability-audit-2026-08-03.md`) :

- **`cameraMode: "simple"` jette silencieusement le storyboard sur les SEPT types.** La prose invite
  explicitement le journaliste à choisir ce mode (`skills/suggest-chart/SKILL.md:396-401`), le gate
  accepte avec 0 erreur et 0 avertissement, `story-comps.mjs:64-79` route vers la famille `*Reveal`,
  et **aucun des sept `*Reveal.tsx` ne lit `config.arcBeats`** (vérifié : 0 occurrence sur 6 fichiers,
  la 7ᵉ étant un commentaire disant qu'il ne le lit pas).
- **Huit composants d'un genre narratif entier sont orphelins** : `MapScrolly.tsx` et les sept
  `map-native/src/components/*Scrolly.tsx` ne sont importés par rien, et leurs compositions
  enregistrées ne sont jamais retournées par le dispatcher.
- **`arcBeats` n'existe dans `lib/` que dans un commentaire** — `ProductionBrief` ne porte pas ce
  champ, aucun assembleur ne l'écrit. La capacité vit sur le chemin V1 (la prose) ; la boucle V2 ne
  sait pas l'exprimer.

## 3. Le modèle de référence — `suggest-image`, déjà validé en pratique

Rémy : « ce qui était dans mon test scrolly image manuel était intéressant car tu posais les bases du
storyboard et les informations liées que le journaliste pouvait contredire et ensuite valider ».

`skills/suggest-image/SKILL.md` encode déjà exactement la bonne discipline, et cette spec la
**généralise** au lieu d'en écrire une seconde :

- La vision sert au **rapprochement et à l'ordre UNIQUEMENT** — « à quel passage de l'article cette
  image appartient-elle ? » — jamais à la description.
- **Les mots de chaque légende viennent du passage d'article rapproché**, reformulés pour être
  autonomes, jamais de ce que le modèle « voit ».
- `alt` et `credit` sont **demandés, jamais générés**.
- **Rien n'est produit avant confirmation sur un gate obligatoire.**

**Transposition aux graphiques et aux cartes** : le moteur **apparie** chaque ancre (une région, un
point, une série, un moment) **au passage de l'article qui en parle** ; il **ordonne** les beats selon
l'ordre du récit, **pas selon la saillance des données** ; le texte de chaque beat **vient de ce
passage** ; ce que l'article ne fournit pas est **demandé, jamais rempli**.

> C'est la différence entre « le journaliste raconte » et « la machine classe par valeur
> décroissante » — et c'est exactement ce que le storyboard actuel fait à l'envers.

Ce principe résout aussi le risque du brouillon-machine-publié-par-fatigue : ce que le journaliste
relit n'est pas une invention, **c'est sa propre prose reformulée**.

## 4. Le storyboard — un seul document, deux moteurs d'avancement

Un beat porte **quatre** propriétés, identiques en scrolly et en vidéo :

| Propriété | Ce qu'elle dit |
|---|---|
| **ancre** | ce qui est cadré, apparié à son passage d'article |
| **texte** | tiré de ce passage, validé par le journaliste, épinglé verbatim |
| **déplacement** | comment on arrive ici depuis le beat précédent |
| **animation** | ce qui bouge une fois le cadre tenu |

**La seule différence entre les deux formats est ce qui fait avancer le storyboard** : le scroll du
lecteur, ou le temps. D'où une cinquième propriété **propre à la vidéo** — la **durée** du beat,
puisque personne n'est là pour décider quand passer au suivant.

**Conséquence produit** : le travail éditorial est fait **une fois** et sert les deux formats. Un
storyboard conçu pour un scrolly se produit en vidéo sans être refait ; seul le rythme est à donner.

### 4.1 Suggestion et confirmation sont deux champs, pas un

Aujourd'hui le verrou de production est `unauthoredBeats` (`lib/loop/manifest.ts:662`) : il liste les
beats dont le texte est **vide**. **Si la machine pré-remplit une suggestion, plus aucun beat n'est
vide et le verrou devient inopérant** — une suggestion de machine partirait en production sans
relecture.

Donc un beat porte **ce que la machine suggère** et **ce que le journaliste a confirmé**, séparément.
Une suggestion n'est **jamais** promue en confirmation toute seule. Le verrou ne demande plus « y a-t-il
du texte ? » mais **« chaque beat est-il confirmé ? »**.

Le journaliste a trois gestes par beat : **accepter** la suggestion, **la réécrire**, **supprimer le
beat**. Accepter est un geste explicite — c'est ce qui le distingue de ne rien faire.

## 5. Les trois genres narratifs de la vidéo

Rémy : « pour les vidéos il faut intégrer la notion de mouvement et d'animation », et « dedans on a
différents types de narratifs : le story, le style scrolly, et le reveal ».

Les trois familles **existent déjà comme composants** dans `skills/map-native/src/components/` :

| Genre | Ce qui porte le récit | Ce que le beat commande | État aujourd'hui |
|---|---|---|---|
| `story` | la caméra | où elle va, et comment | **lit le storyboard** — le seul chemin qui marche |
| `scrolly` | l'étape | ce qui est à l'écran à ce palier | **orphelin** : 8 composants importés par rien |
| `reveal` | la donnée | ce qui apparaît, dans quel ordre | **ne lit rien** — les 7 ignorent `arcBeats` |

**Le genre narratif décide COMMENT les beats s'expriment, jamais S'ILS existent.** Le storyboard est le
même document dans les trois cas ; seule change l'interprétation du champ **déplacement** : un
mouvement de caméra pour `story`, un passage d'étape pour `scrolly`, une révélation d'élément pour
`reveal`.

> **Ce que ça corrige** : un `reveal` n'est pas « une vidéo sans récit », c'est **un récit où le
> mouvement est dans la donnée et non dans la caméra**. Et le genre `scrolly` n'est pas du code mort :
> c'est un genre entier que personne ne peut demander.

`cameraMode` change alors de nature : il cesse d'être un réglage global qui **écrase** le storyboard
pour devenir le **défaut** que la proposition applique à tous les beats, contredictible beat par beat.

## 6. La faisabilité, mécanique et non disciplinaire

**Le vocabulaire des gestes n'est pas le même d'un moteur à l'autre.** Une carte a une caméra qui vole
vers un lieu ; un graphique n'a pas de caméra — il a des barres qui poussent, une courbe qui se trace,
une série qui s'éclaire. « Survoler la Suisse » n'a aucun sens sur un graphique.

Donc **chaque moteur DÉCLARE son vocabulaire de gestes** — un ensemble fermé et petit, par type et par
genre — et la proposition se compose **uniquement** dans ce vocabulaire. Même patron que le registre
existant (`lib/core/registry`), où les moteurs déclarent déjà les formats qu'ils produisent ; on y
ajoute ce qu'ils savent faire **bouger**.

Trois conséquences :

- **La proposition ne peut plus promettre l'impossible** — faisable par construction, pas par vigilance.
- **Le journaliste apprend une limite au bon moment** — à la conception, avec son alternative
  (« ce type ne survole pas, mais il peut révéler ses régions dans l'ordre que vous donnez »), et non
  après une production ratée ou, pire, dans un fichier silencieusement diminué.
- **Le gate revérifie avant de produire** — parce qu'entre la proposition et la production le
  journaliste a pu réécrire. Un geste inconnu **refuse bruyamment**. C'est l'inverse exact de ce que
  fait `cameraMode: "simple"` aujourd'hui.

Corollaire : la matrice « quel type sait quel geste dans quel genre » cesse d'être une connaissance
dispersée dans sept composants pour devenir **une déclaration qu'un test peut lire**.

## 7. Découpage en sous-projets

Trop gros pour un seul plan. Quatre sous-projets, **dans cet ordre**, chacun avec sa spec et son plan.

**① Le vocabulaire des gestes.** Chaque moteur déclare, par type et par genre, ce qu'il sait faire
bouger. Livrable autonome : la déclaration + le test qui la lit + l'inventaire de ce que les composants
font réellement aujourd'hui. **Aucun changement de comportement.** C'est le socle : sans lui, la
proposition ne sait pas dans quoi puiser et le gate ne sait pas contre quoi valider.

**② Le modèle de beat et son verrou.** Les quatre propriétés + la durée, `suggéré`/`confirmé` séparés,
`unauthoredBeats` re-fondé sur la confirmation et non sur le vide. Touche `lib/loop` et `lib/core`.
Livrable autonome, vérifiable par mutation : un beat suggéré non confirmé doit **bloquer** la production.

**③ L'étape de proposition.** L'appariement ancre ↔ passage d'article, l'ordre du récit, le texte
dérivé, le gate obligatoire — généralisé depuis `suggest-image` à tous les types et aux deux formats.
C'est le cœur éditorial, et il dépend de ① et ②.

**④ Le câblage des trois genres.** Les sept `*Reveal` honorent le storyboard ; le genre `scrolly` vidéo
cesse d'être orphelin ; `cameraMode` devient un défaut par beat. C'est le plus gros en volume et le
dernier, parce qu'il consomme les trois précédents. **Chaque genre livré exige une preuve rendue et
regardée** — sur ce projet, c'est la seule méthode qui ait jamais attrapé un artefact faux.

## 8. Hors périmètre

- **Le lot route** (`ScrollyRouteMap`, `RouteStory`) — il sortira naturellement de ④, puisque la route
  est un type comme les autres une fois les trois genres câblés. Ne pas le traiter à part.
- **La boucle V2** : faire porter `arcBeats` par `ProductionBrief` est une conséquence de ②, à traiter
  là, pas ici.
- **Le découpage de `skills/splash/SKILL.md` par phase** — chantier distinct, mis au second plan par
  Rémy le 2026-08-03 (« il faut d'abord tester et voir ce qui marche ou non »).
- **Les graphiques hors des types déjà atteignables** : ① inventorie, il ne construit pas.
