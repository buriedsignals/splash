# Les cartes vidéo passent par MapTiler, comme le pilote scrolly

**Statut :** design approuvé par le propriétaire le 2026-09-15, section par section. Non planifié, non implémenté.
**Complète :** `2026-09-13-video-quality-pass-spec.md` (la passe qualité vidéo) et, sur la branche `quality/scrolly`,
`2026-09-12-maps-through-maptiler-spec.md` et `2026-09-15-scrolly-maps-through-maptiler-addendum.md`.
**Pilote de référence :** `proof/scrolly-choropleth-europe-lowcarbon` (branche `quality/scrolly`, commits
a170beb3..fdec7bbd), carte MapTiler vivante, validé par le propriétaire le 2026-09-15.

**Décisions du propriétaire enregistrées ici (2026-09-15) :**

1. Les cartes vidéo se produisent « comme dans scrolly » : la carte MapTiler vivante, pilotée en nombres par l'image
   courante comme le scroll la pilote.
2. Le moteur carte du pilote est **copié** dans `quality/video`, pas fusionné.
3. Le pilote vidéo est la **choroplèthe** ; les autres types attendent sa validation.
4. La chorégraphie validée de chaque type se garde ; seul le moteur de dessin change.

---

## 1. Le constat

Les huit vidéos de cartes de la passe qualité (`proof/video-*-europe-*`, `proof/video-flow-map-*`, `proof/video-locator-*`,
`proof/video-hex-grid-*`, `proof/video-proportional-symbol-*`) sont dessinées en SVG depuis un extrait Natural Earth
50 m gelé à une fenêtre fixe. Elles contreviennent à la règle « une carte utilise MapTiler, dans tous les formats »
(`skills/scrolly/references/scrolly-discipline.md`, 2026-08-10), réaffirmée le 2026-09-15 pour les scrollys :

- des pays manquent dès que la vue sort de la fenêtre (Libye, Égypte, Proche-Orient, Kazakhstan) ;
- les côtes, frontières et mers ne sont pas celles de la carte que le lecteur connaît ;
- un crédit sur une ligne ne trouve pas de mer libre sur une carte bord à bord, faute de savoir ce qui est eau.

---

## 2. Architecture

### 2.1 Le moteur, copié

Sont copiés depuis `quality/scrolly`, octet pour octet, chacun portant en tête le commit d'origine :

- `shared/map-beat/scrolly.mjs` — caméra et peinture en nombres (`cameraFields`, `viewOf`, `mercatorOf`, `lonLatOf`,
  `zoomShiftFor`, `bindState`, `validateScrollyPlan`) ;
- `shared/map-beat/mount.mjs` — `mountPlan`, `beforeIdFor` (couches `beneath: "water"`), `validateExpressions` ;
- `shared/map-beat/style.mjs` — `transformStyle`, `applyLiveStyle`, `assertLiveStyleAnswered` ;
- `shared/map-beat/scrolly-live.mjs` — `initScrollyMap`, `applyScrollyMap` ;
- `shared/map-beat/plan.mjs` — `makePlan`, `validatePlan`, `validateLivePlan` ;
- `shared/map-beat/tints.mjs` si la version scrolly diffère de celle de `quality/video` ;
- le plan de la choroplèthe et ses sièges (`proof/scrolly-choropleth-europe-lowcarbon/plan.mjs`, `seats.json`), repris
  par le beat vidéo.

Un test des copies (sur le modèle de `skills/splash/test/carried-copies.test.ts`) refuse toute copie qui diverge de son
original déclaré. Le jour où `quality/scrolly` rejoint `main`, les copies sont remplacées par le module unique.

### 2.2 Le plan décrit la carte, la scène donne les nombres

Le beat vidéo produit le même plan que le pilote : style MapTiler dataviz (`__MAPTILER_KEY__` dans l'URL), projection
`mercator` à plat, fonds MapTiler Countries (`administrative`, `level == 0`, `iso_a2`) dessinés sous l'eau du fond,
noms en couches `symbol` à des sièges gelés, teintes de la direction.

Ce qui change : les caméras et les états ne sont plus rattachés aux cartes de texte, mais aux **événements du contrat
de temps** (`establish`, `reference`, `reveal`, `subject`, `conclusion`, `hold`). `sceneAt(props, frame)` rend, pour
l'image demandée :

- la caméra en nombres (`camX`, `camY` en Web Mercator 0..1, `camZoom`, `camBearing`, `camPitch`), interpolée dans
  l'espace projeté, le zoom linéairement (il est déjà logarithmique), easée comme toute arrivée ;
- les valeurs des peintures liées (`{"$state": champ}`), avec les fenêtres et les easings du beat ;
- les champs du hors-carte (compteur, curseur, jauges, crédit), comme aujourd'hui.

Aucune peinture liée ne lit les données d'un pays (`get`, `feature-state`) : `validateScrollyPlan` le refuse, parce que
MapLibre recharge alors toutes les tuiles à chaque changement (mesuré sur le pilote). Une couche par classe.

### 2.3 La composition Remotion

- `<LiveMap>` monte MapLibre une fois (`initScrollyMap`, `interactive: false`, `fadeDuration: 0`, transitions de
  peinture tuées), sous `delayRender` jusqu'à sa première vue dessinée.
- À chaque image : `applyScrollyMap(handle, sceneAt(props, frame))`, puis `delayRender` jusqu'à `idle` et
  `map.areTilesLoaded()`. Un délai dépassé fait échouer le rendu : aucune image à tuile manquante n'est livrée.
- Par-dessus, en SVG, le hors-carte : la carte titre, la légende (compteur, curseur, classes), les gestes d'argument
  mesurés au pixel (étiquettes et jauges du gros plan, puce de l'Albanie), le crédit.
- Rendu `--gl=angle --concurrency=1`, `--env-file` vide à chaque spawn (documenté par Remotion, « Map animations »).

### 2.4 Les mots

- **Dans la carte :** les noms sont des couches `symbol` du plan, à leurs sièges, `text-allow-overlap`, opacité liée à
  l'état — visibles seulement caméra posée, jamais pendant un mouvement.
- **Hors carte, sur la carte :** ce qui doit rester mesuré (jauges, étiquettes à part comptée, puce, crédit) est placé
  en Bun à partir des **positions projetées** (`map.project`) relevées à chaque caméra fixe par la passe de mesure
  (§3.2), figées en props. Les gardes actuelles tiennent : plancher de 30 px, largeur mesurée en Bun et relue en Chrome.

### 2.5 La clé

- Le script de rendu lance un **proxy local éphémère** sur `127.0.0.1`. Le style du plan pointe sur lui ; le proxy
  ajoute la clé aux requêtes vers `api.maptiler.com` et réécrit les URL de tuiles, de glyphes et de sprites que
  renvoient le style et les `tiles.json`, pour qu'elles repassent par lui.
- La clé est lue dans l'environnement du processus Bun (`mapTilerKeyIn(process.env)`, `.env` git-ignoré). Elle n'est
  jamais dans les props, l'argv, les logs, un fichier écrit ou le bundle.
- Le proxy met les réponses en cache sur disque, **sans clé**, hors du dépôt : les rendus répétés d'un beat ne
  consomment pas de quota. MapTiler invalide toutes les clés d'un compte à 100 % de sa limite de dépense.

---

## 3. Gardes

### 3.1 Tests Bun, hors ligne

- États, timing, scène : l'ordre des classes, le plancher et le compteur, les champs caméra à chaque image (centre en
  projeté, zoom linéaire, gros plan centré sur le sujet sur les deux axes, sans `padding`), les valeurs des peintures
  liées, les jauges et leur comptage.
- `validatePlan`, `validateLivePlan`, `validateScrollyPlan` sur le plan du beat.
- Le test des copies (§2.1).
- Vérification par mutation, comme pour tout beat.

### 3.2 La passe de mesure (Bun et Chrome, via le proxy)

À chaque caméra fixe du beat (vue d'ensemble, gros plan), sur une carte montée à la taille de la vidéo :

- relever `map.project` pour chaque siège nommé et chaque ancre du hors-carte ;
- capturer l'image et vérifier sur les pixels : aucune tuile manquante (`areTilesLoaded`), aucune terre laissée à la
  couleur de la page (tous les pays présents), chaque étiquette SVG lisible sur les couleurs réellement dessinées sous
  elle, le crédit posé sur l'eau et loin de tout mot.

Les sorties (positions, contrôles) sont figées en props ; build et tests restent hors ligne. La passe se relance quand
le plan change (empreinte du plan).

### 3.3 Le rendu

- Chaque image attend `idle` et `areTilesLoaded()` ; un dépassement fait échouer la direction.
- Le temps de rendu par direction et le nombre de requêtes MapTiler sont mesurés sur le pilote et consignés.

### 3.4 La clé

- Un test vérifie qu'aucune sortie — props, bundle, logs, images rendues, cache — ne contient la clé.
- `skills/splash/test/no-key-in-the-repository.test.ts` reste vert.

---

## 4. La choroplèthe, pilote

La chorégraphie validée (`proof/video-choropleth-europe-lowcarbon/BRIEF.md`) est gardée ; son support devient MapTiler.

1. **La carte.** À plat, le monde entier ; la vue d'ensemble au cadrage de la plaque statique, comme le pilote.
   L'inflation du Nord est acceptée (addendum §7.1), les chiffres restent calculés sur les vraies surfaces.
2. **Les classes arrivent.** Une couche de remplissage par classe, sous l'eau, opacité liée ; les pays sans donnée
   restent terre neutre du fond, Ukraine comprise.
3. **Le plancher monte.** Les couches des classes dépassées repassent au neutre ; compteur et curseur en SVG dans la
   légende ; les six noms en couches `symbol`, une fois le plancher posé.
4. **Gros plan sur l'Albanie.** Caméra interpolée en projeté, zoom linéaire, l'Albanie au centre des deux axes ; les
   frontières régionales (Countries, `level == 1`) arrivent avec la caméra ; noms, parts et jauges en étiquettes SVG
   aux positions projetées de la caméra fixe, qui comptent une fois celle-ci posée.
5. **Retour à la carte entière.** Toutes les classes, les sept nommés, l'Albanie cerclée ; le crédit sur une ligne,
   avec l'attribution que MapTiler exige — « Source : Ember, via Our World in Data · © MapTiler © OpenStreetMap » —
   là où la passe de mesure montre de l'eau et aucun mot.
6. **Rythme.** ~19 s, 2 s de tenue.

Chaîne de travail inchangée : BRIEF, TDD, `--look`, mutations, NBSP, commits à chemins explicites, trois directions,
ouverture des seuls mp4.

---

## 5. Après la validation du pilote

- **Contour, semis de points, flux, locator, symbole proportionnel** — chacun son plan, sa chorégraphie validée gardée.
- **Cartogramme et grille hexagonale** en dernier, selon l'addendum §5 : carte vivante tant que la forme montre la
  géographie, puis le fond s'efface et les tuiles deviennent un calque hors carte.
- Les quatre vidéos de cartes recoupées en SVG le 2026-09-15 (choroplèthe, cartogramme, contour, semis) sont refaites
  sur ce moteur.
- Le catalogue garde les cartes vidéo décochées jusqu'à leur refonte validée.

---

## 6. Ce que cette spec ne fait pas

- Elle ne fusionne rien : les copies attendent que `quality/scrolly` rejoigne `main`.
- Elle ne décide pas du niveau de détail déduit du sujet (addendum §4, S2 côté scrolly) : le pilote reprend celui de la
  choroplèthe scrolly.
- Elle ne tranche pas la globe : la carte est à plat, décision du propriétaire.
