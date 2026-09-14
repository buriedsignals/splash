# Addendum — les cartes scrolly passent par MapTiler, avec tous les pays et un niveau de détail choisi par le sujet

**Statut :** conception, à approuver. Non planifiée, non implémentée.
**Complète :** `2026-09-12-maps-through-maptiler-spec.md` (« la spec »), qui traite le statique, le web et la vidéo,
et exclut le cartogramme et la grille hexagonale (§11).
**Décisions du propriétaire enregistrées ici (2026-09-15) :**

1. Les scrollys de cartes passent **entièrement** par MapTiler : tout ce qui est dans la carte devient une couche
   MapLibre, légendes et textes restent dehors (§2 de la spec).
2. Tous les pays sont présents, comme sur une vraie carte, même ceux dont le beat ne montre rien.
3. Le niveau de détail n'est pas fixé d'avance : l'outil le déduit du sujet que fournit le journaliste.

---

## 1. Le constat

Les huit scrollys de cartes de la passe qualité (`proof/scrolly-*` : cartogramme, choroplèthe, contour, semis, flux,
grille hexagonale, locator, symbole proportionnel) sont en **SVG**, dessinés depuis un extrait Natural Earth 50 m gelé
à **64 pays** qui touchent une fenêtre fixe (25° O – 45° E, 34° N – 72° N).

- **Des pays manquent.** Libye, Égypte, Israël, Jordanie, Arabie saoudite, Kazakhstan… ne sont pas dans le fichier. Dès
  que la vue sort de la fenêtre — un téléphone qui élargit le cadre en hauteur, un gros plan —, la terre s'arrête net.
- **Ils contreviennent à une règle déjà écrite.** `skills/scrolly/references/scrolly-discipline.md`, « A map on a
  scrolly is LIVE » (2026-08-10) : *« une carte utilise MapTiler, dans tous les formats, y compris celui-ci »*. Ils ont
  été produits en SVG malgré elle. Le catalogue les a décochés le 2026-09-15.

---

## 2. Le scrolly comme cinquième consommateur du plan

La spec pose un **plan de carte** (style, caméra, couches) consommé par quatre rendus. Le scrolly est déjà l'un d'eux
sur le papier ; ce qui manque, c'est la manière dont le scroll pilote ce plan.

**2.1 Des caméras par carte, pas une animation.** Le plan porte une caméra par carte de texte (centre, zoom, cap,
inclinaison, en degrés). Entre deux cartes, le pilote interpole et appelle `map.jumpTo` à chaque image : **le scroll
possède le temps**, MapLibre n'anime rien (`flyTo`, transitions de peinture à durée 0). Le zoom s'interpole
linéairement (il est déjà logarithmique), le centre dans l'espace projeté, pas en degrés.

**2.2 Les gestes du beat sont des états de peinture.** Révéler, filtrer, teinter par classe, estomper : chaque champ
d'état du scroll se traduit en `setPaintProperty` ou en `feature-state`, recalculé à chaque image. La chorégraphie
validée pour chaque type se garde telle quelle ; seul le moteur de dessin change.

**2.3 Le sujet d'un gros plan au centre exact.** Une caméra de gros plan se centre sur le sujet sur les deux axes, sans
`padding` qui le décale (règle du propriétaire). Quand la carte de texte le couvre, le nom du sujet est levé dans la
bande libre au-dessus d'elle avec un trait de rappel — le geste validé sur la choroplèthe le 2026-09-15.

**2.4 Les mots, placés par caméra.** Le placement reste au beat (§5 de la spec) mais se calcule **à la caméra de chaque
carte** : les mots d'une carte n'apparaissent qu'une fois sa caméra atteinte et s'effacent avant le départ, comme les
noms du gros plan aujourd'hui. Aucun mot n'est placé pendant un mouvement.

**2.5 Le repli gelé, carte par carte.** Sous la carte vivante, une image gelée par carte de texte (fond et marques),
produite par le rendu statique du même plan. Sans clé, sans script ou si MapTiler blanchit (§9 de la spec), le lecteur
voit ces images. La page commitée porte `__MAPTILER_KEY__` ; `deliver` substitue la clé à la livraison. Aucune clé dans
un fichier commité.

**2.6 La caméra chauffée.** Toutes les caméras du beat sont parcourues avant de révéler la couche vivante
(`warmCameras`, déjà mesuré sur le Danube). Garde : un défilement rapide ne laisse aucune image avec une tuile manquante.

---

## 3. Tous les pays présents

**3.1 La géographie vient du fond, entière.** Terre, côtes, frontières et mers sont celles de MapTiler, pour le monde
entier : aucun extrait gelé, aucune fenêtre. Un pays sans donnée est une terre neutre du fond, jamais un trou.

**3.2 Les surfaces teintées suivent la même côte.** Une couche de remplissage par pays (choroplèthe) ne peut pas
redessiner une côte Natural Earth par-dessus celle d'OpenMapTiles (le halo de §1.3 de la spec). Elle se branche sur des
polygones **issus des mêmes tuiles** et joints aux données par code ISO. *À vérifier avant le plan : quel jeu MapTiler
porte des polygones de pays et de régions avec leurs codes, à quels niveaux, et son coût en requêtes.*

**3.3 Garde.** Pour chaque caméra du beat, aucune zone de terre de la vue n'est vide de fond : la capture de contrôle
échoue si un pixel de terre attendu est de la couleur de la page.

---

## 4. Le niveau de détail, déduit du sujet

**4.1 Ce que « niveau de détail » recouvre.** Deux choses distinctes, décidées ensemble :

- **l'unité** que les données teintent ou comptent : pays, régions (ISO 3166-2, NUTS), communes, points ;
- **le contexte** que le fond montre : côtes seules, fleuves, villes, relief, routes.

**4.2 D'où il vient.** Il est déduit, pas choisi au goût, et enregistré avec son origine comme la palette (`origin:`) :

| signal | où il est lu | ce qu'il décide |
| --- | --- | --- |
| la clé géographique des données — ISO3, code régional, lat/lon | `intake`, à la lecture du fichier | l'unité |
| l'étendue des données — continent, pays, ville | `intake`, boîte englobante | la plage de zoom et le contexte par défaut |
| la nature du sujet — eau, relief, transport, énergie… | `storyboard`, à partir du sujet du journaliste | le contexte ajouté (fleuves, relief, routes…) |
| le journaliste | `storyboard` | peut changer l'un ou l'autre ; c'est alors noté comme son choix |

Le résultat s'écrit dans le `BRIEF.md` du beat (`detail:` — unité, contexte, origine) et le plan le lit. Rien de ce
choix n'est codé dans un composant (§7.1 de la spec).

**4.3 Refus.** Une unité sans source de contours disponible, ou un contexte que le fond ne sait pas montrer à cette
étendue, arrête le rendu et nomme ce qui manque (§7.3 de la spec).

---

## 5. Le cartogramme et la grille hexagonale

La spec les écartait : ces formes **jettent la position**, et un fond de carte y affirmerait une correspondance que la
forme nie. La décision 1 du propriétaire les fait entrer. Proposition qui garde la raison de l'exclusion :

- **tant que la forme montre la géographie** (le cartogramme part de la carte), c'est une carte MapTiler vivante ;
- **quand la forme quitte la géographie** (les tuiles), le fond s'efface entièrement et les tuiles vivent **hors de la
  carte**, en calque du beat : elles ne prétendent plus rien sur la position.

---

## 6. Découpage

**Préalable.** Ces sous-projets touchent `shared/map-beat/` : les autres sessions en sont prévenues avant la première
modification.

**S1 — le rendu scrolly du plan.** Caméras par carte, états de peinture pilotés par le scroll, mots par caméra, repli
gelé par carte, clé substituée, gardes (§2.6, §3.3). Pilote : la choroplèthe, déjà pilote de la spec.

**S2 — le niveau de détail.** Lecture de la clé et de l'étendue dans `intake`, contexte du sujet dans `storyboard`,
`detail:` dans le BRIEF, lecture par le plan, sources de contours (§3.2), refus (§4.3).

**S3 — les huit scrollys refaits**, type par type, chacun validé par le propriétaire comme pendant la passe qualité ;
cartogramme et grille hexagonale en dernier (§5).

---

## 7. Questions ouvertes

1. **La projection.** Les statiques et les scrollys SVG dessinent en Lambert azimutale équivalente ; MapLibre dessine en
   Web Mercator (ou en globe). À 70° N, Mercator triple les surfaces : la Scandinavie et la Russie gonflent à l'écran.
   Les chiffres des cartes (moyenne « au km² ») restent calculés sur les vraies surfaces, mais une carte qui **montre**
   une surface la montre fausse. À trancher : Mercator accepté, globe, ou refus des sujets dont l'argument est une
   surface vue.
2. **Les polygones joints** (§3.2) : jeu MapTiler ou contours gelés recalés sur la côte du fond.
3. **Le poids du repli** : une image par carte de texte multiplie le poids de la page par le nombre de cartes.
