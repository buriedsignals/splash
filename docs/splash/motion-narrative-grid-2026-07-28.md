# Splash — passe de grille : mouvement et narration (2026-07-28)

Branche `chore/motion-narrative-grid`, worktree `splash-grid`, à partir de `main` @ `9de41758`.

**71 cases mesurées, aucune extrapolée.** Chaque case a été soumise aux deux jambes : la jambe
**OFFRE** (énumération mécanique, sans modèle, via `renderableSheets()` / `eligible()` /
`isLoopBuildable`) et la jambe **RENDU** (`produce` réel, puis assertions sur l'artefact
lui-même — jamais sur un rapport de producteur).

Le sweep QA de 83 cas qui vient de tourner n'avait touché que 21 cases distinctes et une seule
vidéo. Il mesurait des parcours éditoriaux. Cette passe mesure la grille.

---

## 1. Les quatre quadrants

Le principe posé par le propriétaire : **une case n'est vivante que si elle est OFFERTE et
PRODUISIBLE**. Les deux diagonales opposées sont ce que la passe cherchait.

| Quadrant | Compte | Ce que c'est |
|---|---:|---|
| **① Vivante** — offerte propre **et** produit | **41** | La case tient ses deux promesses |
| **② Piège** — offerte propre, **ne produit pas** | **4** | Le pire : le journaliste ne l'apprend qu'après avoir choisi. **Fermé dans cette passe.** |
| **③ Gaspillée** — produit, **jamais offerte** | **9** | Une capacité qui existe et que personne ne peut demander. Rapportée, pas refermée. |
| **④ Absente, correctement** — ni offerte ni produisible | **17** | Fermée par une règle explicite, avec un refus nommé |

Les 4 cases du quadrant ② ont été fermées dans cette même passe (§5). Après fermeture, le
quadrant ② est **vide** et le quadrant ④ passe à 21.

---

## 2. Périmètre et méthode

### Ce qui a été mesuré

| Famille | Cases | Comment la jambe RENDU a été conduite |
|---|---:|---|
| chart reveal (vidéo) | 38 | `skills/chart-native/scripts/produce.mjs <type> <config> <out> video`, canal `article-web`, sur le sample livré de chaque type |
| chart scrolly — marche dérivée | 3 | La **boucle réelle** : `produce()` sur un `RunManifest` (`lib/loop/produce.ts`) |
| chart scrolly — beats **rédigés** | 3 | La boucle réelle : `draftBeats` → `applyBeats` → `produce()` |
| map story (vidéo narrée) | 7 | `skills/map-native/scripts/produce.mjs <config> <out> video` |
| map reveal (vidéo) | 7 | Remotion en direct sur chaque composition `*Reveal` (voir §4.1 pour pourquoi « en direct ») |
| map scrolly — marche dérivée | 6 | `skills/scrolly/scripts/produce.mjs` |
| map scrolly — arc **rédigé** (`arcBeats`) | 6 | idem, + validateur `mapNativeConfigErrors` et gate V1/V2 interrogés séparément |
| image scrolly | 1 | `skills/image-native/scripts/produce.mjs`, photographies synthétisées |
| **Total** | **71** | |

### Les assertions, sur l'artefact

**Vidéo** — lues sur le fichier par `ffprobe` puis par décodage de plans gris bruts (pas de
parsing de log, pas de décodage PNG, donc pas d'échec de mesure silencieux) :
conteneur mp4 valide portant un flux vidéo · durée > 0 · orientation conforme au canal · au
moins deux des huit images échantillonnées portent une image (amplitude > 8 sur 255) · **la
dernière image diffère de la première** (un mp4 figé est un échec, et il passe tous les
contrôles de conteneur).

**Scrolly** — la page est **ouverte dans un navigateur** (Playwright) et les nœuds
`[data-step-index]` sont lus dans le DOM. Ce dépôt a déjà payé deux fois la leçon inverse :
un scrolly calcule ses légendes au chargement, donc **grepper le bundle construit n'est pas une
preuve**. Pour la variante rédigée : les phrases du journaliste doivent apparaître **verbatim**
et **dans l'ordre du plan**, et aucune légende dérivée ne doit survivre à côté.

**Une nuance de taille, assumée.** Sur le canal `article-web` (paysage), la taille exacte n'est
pas épinglée au canal : `chart-native/scripts/produce.mjs:322-354` et son jumeau map-native
gardent délibérément les dimensions propres à chaque famille (840×460, 840×480, 1280×720) et
n'épinglent `mediaSize` que pour le carré et le portrait. L'assertion de taille a donc porté sur
l'**orientation** en paysage, et la décision est citée plutôt que rapportée comme un défaut.

---

## 3. La jambe OFFRE, case par case

Mesurée en isolant chaque fiche KB (une paire remise à `eligible()`) avec des faits synthétisés
pour satisfaire ses **propres** limites — de sorte qu'un refus de limite ne masque jamais une
réponse de capacité.

| Famille | offerte propre | offerte **marquée** | non offerte |
|---|---:|---:|---:|
| chart vidéo (38 fiches) | 27 → **23 après fermeture** | 0 → **4** | 11 |
| chart scrolly (3 fiches) | 2 (`line`, `bar`) | 1 (`scatter`) | 0 |
| map vidéo (7 fiches) | 7 | 0 | 0 |
| map scrolly (6 fiches) | 6 | 0 | 0 |
| image scrolly (1 fiche) | 0 | 1 | 0 |

Trois précisions qui changent la lecture :

- **Les 11 chart vidéo non offertes** sont les types famille B que le manifeste de chart-native
  déclare `deferred` (`candlestick`, `calendar`, `marimekko`, `sunburst`, `sankey`, `parallel`,
  `chord`, `lorenz`, `streamgraph`, `radar`, `gantt`). `renderableSheets()` les écarte avant même
  le jeu de candidats. Fermeture correcte.
- **`scatter` en scrolly est marquée, donc en pratique inatteignable.** Le renderer l'héberge
  (`CHART_SCROLLY_TYPES`) mais la boucle ne peut composer un plan rédigé que pour `line` et `bar`
  (`AUTHORABLE_SCROLLY_TYPES`), donc la case est marquée plutôt qu'offerte puis livrée avec des
  légendes machine. La marque vaut `missing`, le pire des quatre statuts, et l'offre est plafonnée
  à trois lignes : la case ne remonte jamais.
- **`image-scrolly` est marquée inconditionnellement** (« aucune photographie déclarée avec ce
  run »). `lib/brain/eligibility.ts` écrit lui-même ce que cela coûte : *« Marked, in practice,
  means UNREACHABLE here — not merely flagged. »* La case **produit pourtant parfaitement** (§4.4)
  → quadrant ③.

Les lignes `dw-chart` / `map-dw` apparaissant en « non offertes » pour ces deux formats ne sont
pas un défaut : ces moteurs ne déclarent ni `video` ni `scrolly`. La fiche reste offerte via son
moteur natif.

---

## 4. La jambe RENDU, case par case

### 4.1 chart reveal (vidéo) — 38 cases, 27 mesurables, **23 rendent**

Médiane 11 s par vidéo. Colonne « artefact » : dimensions, durée, écart moyen première/dernière
image (0 = mp4 figé).

| type | rendu | temps | artefact |
|---|---|---:|---|
| `line` | rend | 11s | 840×480, 8.0s, écart 2.11 |
| `bar` | rend | 12s | 840×460, 8.0s, écart 25.3 |
| `scatter` | rend | 12s | 840×480, 8.0s, écart 4.0 |
| `pie` | rend | 11s | 840×480, 8.0s, écart 17.91 |
| `stacked` | rend | 11s | 840×460, 8.0s, écart 62.87 |
| `slope` | rend | 12s | 840×480, 8.0s, écart 4.24 |
| `grouped` | rend | 11s | 840×460, 8.0s, écart 17.86 |
| `dumbbell` | rend | 11s | 840×480, 8.0s, écart 2.07 |
| `stacked-area` | rend | 12s | 840×480, 8.0s, écart 63.39 |
| `heatmap` | rend | 12s | 840×480, 8.0s, écart 47.22 |
| `histogram` | rend | 11s | 840×480, 8.0s, écart 45.91 |
| `diverging` | rend | 11s | 840×480, 8.0s, écart 15.81 |
| `waterfall` | rend | 11s | 840×480, 8.0s, écart 26.15 |
| `lollipop` | rend | 11s | 840×480, 8.0s, écart 3.04 |
| `bullet` | rend | 11s | 840×480, 8.0s, écart 24.07 |
| `connected-scatter` | rend | 11s | 840×480, 8.0s, écart 2.24 |
| `boxplot` | rend | 11s | 840×480, 8.0s, écart 3.11 |
| `bump` | rend | 11s | 840×480, 8.0s, écart 3.11 |
| `beeswarm` | rend | 11s | 840×480, 8.0s, écart 1.27 |
| `diverging-stacked` | rend | 12s | 840×480, 8.0s, écart 19.04 |
| `fan` | rend | 12s | 840×480, 8.0s, écart 5.4 |
| `violin` | rend | 12s | 840×480, 8.0s, écart 18.33 |
| `radial-bar` | rend | 11s | 840×480, 8.0s, écart 5.6 |
| **`pyramid`** | **ne rend pas** | 11s | mp4 encodé puis **refusé** par `snap-video` |
| **`treemap`** | **ne rend pas** | 12s | idem |
| **`waffle`** | **ne rend pas** | 11s | idem |
| **`dot-strip`** | **ne rend pas** | 11s | idem |
| 11 types famille B | non offerts, non produisibles | — | quadrant ④ |

**Les 4 échecs, mesurés deux fois chacun, chiffres identiques les deux fois** (donc
déterministes, pas des flakes) :

- `pyramid` — *mp4 frame 140 does not match the reviewed still: 1.12% of pixels differ beyond ±40
  (allowed 1.00%)* ; image finale 1.23%.
- `treemap` — 2.22% / 2.29%.
- `waffle` — 1.19% / 1.30%.
- `dot-strip` — défaut **différent** : *video has no progression: the 50% frame matches an
  endpoint (vs first 1.72, vs final 0.06, threshold 0.15) — two-state pop, nothing animates in
  between*. L'animation est finie avant la moitié du clip.

Les trois premiers sont des formes à **pavage dense** (petites barres, tuiles, carrés) : le
still que le journaliste approuve à la Gate 3 et le mp4 qui part ne sont pas la même image. Le
quatrième est un vrai défaut de mouvement. **Ces quatre cases étaient offertes propres.** →
fermées, §5.

*Note d'hygiène de fixture, sans rapport avec la grille :* les configs livrées
`skills/chart-native/assets/sample-data/*.json` ne portent pas `altInsight` et sont donc refusées
par la ceinture de conformité (WCAG 1.1.1) pour une raison qui ne dit rien du type. Un run réel de
la boucle ne rencontre jamais ce refus (`assembleChartNative` écrit toujours `altInsight` depuis
l'angle confirmé), donc la passe a fourni le même champ que l'assembleur aurait fourni. Les
samples ont vieilli par rapport à la ceinture.

### 4.2 chart scrolly — 6 cases (3 types × 2 variantes), conduites par la boucle réelle

| type | variante | résultat | marches lues dans le DOM |
|---|---|---|---:|
| `line` | dérivée | **rend** | 6 |
| `line` | **rédigée** | **rend** — 4 phrases verbatim, dans l'ordre, **aucune légende dérivée survivante** | 6 |
| `bar` | dérivée | **rend** | 6 |
| `bar` | **rédigée** | **rend** — 4 phrases verbatim, dans l'ordre, aucune légende dérivée survivante | 6 |
| `scatter` | dérivée | refusé **par son nom** à `produce` | — |
| `scatter` | rédigée | refusé **par son nom** à `draft-beats` | — |

Le refus de `scatter` est le comportement voulu, et il est bien écrit aux deux portes :

> *« a "scatter" scrolly would caption itself: Splash can draft a walk you then write for a line
> or a bar chart, and for no other chart type — the captions of a "scatter" scrolly would be the
> machine's own, under your byline. »*

**C'est la variante rédigée qui comptait**, et elle tient : les phrases du journaliste arrivent
sur la page, dans l'ordre du plan, et le brouillon ne survit nulle part. Aucune régression de la
classe « arc narratif jeté ».

### 4.3 map story et map reveal (vidéo) — 14 cases

| type | composition atteinte par le CLI | story rend | reveal rend | reveal atteignable ? |
|---|---|---|---|---|
| `choropleth` | `ChoroplethStory` | ✅ 123s, 27.4s | ✅ 75s, 10.6s | **non** |
| `cartogram` | `CartogramStory` | ✅ 123s, 31.7s | ✅ 79s, 10.6s | **non** |
| `dot-density` | `DotDensityStory` | ✅ 98s, 31.7s | ✅ 75s, 10.6s | **non** |
| `symbol` | `SymbolStory` | ✅ 52s, 31.7s | ✅ 75s, 10.6s | **non** |
| `hex-grid` | `HexGridStory` | ✅ 74s, 31.7s | ✅ 74s, 10.6s | **non** |
| `locator` | `LocatorStory` | ✅ 45s, 31.7s | ✅ 75s, 10.6s | **non** |
| `route` | `RouteReveal` | ✅ 62s, 15.4s | = la même | **oui** |

**7/7 en story, 7/7 en reveal. Toutes les vidéos animent** (aucun mp4 figé, écart
première/dernière entre 24 et 207).

**La note du projet est vérifiée, et elle est exacte à un type près.**
`skills/map-native/scripts/produce.mjs:227-239` route six types vers `*Story` et `route` vers
`RouteReveal` — `route` est le seul type sans composition `*Story` (il y a **6** `*Story` et **7**
`*Reveal` dans `Root.tsx`, pas 7 et 7). Le fichier le dit lui-même en toutes lettres : *« The old
"scrolly-captured-as-mp4" kind … is also no longer reachable through this CLI. »* Grep exhaustif
sur `*.ts`/`*.tsx`/`*.mjs` : **aucune autre référence** aux six autres compositions `*Reveal` en
dehors de leur enregistrement dans `Root.tsx`.

→ **6 composants qui rendent, que personne ne peut demander** (×3 aspects = 18 compositions
enregistrées). Quadrant ③. **Rapporté, pas refermé** : c'est une décision éditoriale — le
producteur documente sa préférence (*« a reveal that just fades every region in at once tells no
story »*) — et la remettre à disposition serait un knob de config, pas un correctif.

*Contrôle de fausse alerte :* `symbol` et `locator` affichent un écart première/dernière image
identique entre story et reveal (199.25 et 206.53). Vérifié : composants distincts, durées
distinctes (31.7s vs 10.6s), tailles de fichier distinctes (10 377 kB vs 963 kB). Coïncidence de
la mesure grossière première/dernière, pas un aliasing de composition.

### 4.4 map scrolly — 12 cases (6 types × 2 variantes)

| type | dérivée | arc **rédigé** (`arcBeats`) |
|---|---|---|
| `choropleth` | **rend**, 6 marches | **rend** — 4 phrases verbatim, dans l'ordre, aucun descripteur de salience survivant |
| `symbol` | **rend**, 7 marches | **rend** — 4 phrases verbatim, dans l'ordre, aucun descripteur de salience survivant |
| `hex-grid` | **rend**, 7 marches | **refusé par son nom** par le validateur |
| `dot-density` | **rend**, 7 marches | **refusé par son nom** par le validateur |
| `cartogram` | **rend**, 7 marches | **refusé par son nom** par le validateur |
| `locator` | **rend** (voir la fragilité ci-dessous) | **refusé par son nom** par le validateur |

**La correction D31 tient.** L'arc confirmé du journaliste arrive verbatim sur la page pour
`choropleth` et `symbol`, dans l'ordre confirmé, et la marche de salience ne survit pas dessous.
Aucune régression.

**Fragilité mesurée sur `locator` — donnée-dépendante, pas cassée.** Avec le sample livré
`locator-few.json` (peu de marqueurs, tous groupés dans Paris), la construction **échoue** :

> `[snap-reduced-motion scrolly] FAIL: vacuous check: step 3's camera equals step 2's — no real
> transition to test for lingering animation on this story`

Avec `locator-many.json` (40 marqueurs étalés), la même case construit proprement. La capacité
existe donc ; ce qui manque, c'est un refus lisible quand la marche dérivée produit deux caméras
identiques. **La case n'est pas fermée** — la fermer supprimerait une capacité réelle. Le message
actuel est écrit pour un mainteneur (« vacuous check »), pas pour un journaliste.

**Le trou de capacité, lui, est réel et il est du côté OFFRE.** L'arc rédigé de carte
**n'est exprimable nulle part dans la boucle V2** :

- `ProductionBrief` (`lib/core/production-brief.ts`) ne porte que `beats`, jamais de champ d'arc
  de carte ;
- `assembleScrolly` refuse un plan sur la piste carte — vérifié mécaniquement :
  > *« a map scrolly derives its own walk from the data (deriveMapStory) — an authored beat plan
  > belongs to a chart scrolly, so this walk cannot be published as written »*

Donc les 6 cases « map scrolly arc rédigé » sont **non offertes**, et deux d'entre elles
(`choropleth`, `symbol`) **produisent parfaitement** par le chemin V1 (config validée remise au
producteur). → quadrant ③, 2 cases. Les 4 autres sont quadrant ④, correctement fermées par
`unsupportedArcBeatsErrors` (`skills/map-native/src/map-arc.ts`).

**Une porte dérobée non gardée, à signaler.** Le CLI `skills/scrolly/scripts/produce.mjs`
**ne valide pas** : il ne passe pas par le `validate` du manifeste. Poussé directement par ce
CLI, un `arcBeats` sur un `locator` est accepté, **silencieusement abandonné**, et la page part
avec une marche de salience sous la signature du journaliste. Mesuré, page ouverte au navigateur :

- les 3 phrases rédigées : **aucune n'atteint la page** ;
- la marche livrée : « Cultural — 10, **the highest of the 40 shown** », « Modern — 10 »…

Les deux chemins **gardés** refusent correctement : la boucle V2 (`render()` appelle
`manifest.validate`, `lib/core/verbs/render.ts:179`) et le gate V1
(`skills/splash/src/validate-gate.ts:142-151` → `validateMapNative` → `unsupportedArcBeatsErrors`).
Ce n'est donc **pas** une régression D31 sur un chemin journaliste — c'est une entrée de
mainteneur sans ceinture. Rapporté, non refermé (fermer un CLI est une décision d'archi).

### 4.5 image scrolly — 1 case

| case | rendu | marches | phrases rédigées |
|---|---|---:|---|
| `image-scrolly` / scrolly | **rend** (2 s) | 4 | 3/3 verbatim, dans l'ordre |

Photographies synthétisées (Splash n'en génère jamais ; le dépôt n'en livre aucune) — le fixture
tient lieu de déclaration du journaliste et de rien d'autre. **La case produit et n'est jamais
offerte** (§3) → quadrant ③.

---

## 5. Ce qui a été fermé dans cette passe

Décision déjà prise par le propriétaire : *une case OFFERTE qui NE PRODUIT PAS est fermée
immédiatement dans la même passe.* C'est le seul quadrant qui piège quelqu'un.

**4 cases fermées** — le format `video` de `pyramid`, `treemap`, `waffle` et `dot-strip` chez
`chart-native`.

**Comment.** Nouveau module `skills/chart-native/src/video-reach.ts` (la liste, les mesures et la
phrase-journaliste de chaque entrée vivent avec le moteur), lu par le `supports` / `declines` de
l'entrée `chart-native` dans `lib/loop/assemble/index.ts` — la table qui est déjà l'arbitre unique
de ce que la boucle sait composer. De là, la **même** phrase atteint les deux lecteurs qui
comptent, sans qu'aucun code neuf soit écrit pour cela :
`lib/brain/eligibility.ts`'s `buildabilityMark` la met dans l'offre, et `lib/loop/produce.ts`
refuse le choix avec elle.

**Pourquoi pas le drapeau `deferred` du manifeste :** il retire un type de **tous** ses formats à
la fois — il aurait fermé trois formes qui marchent pour en fermer une cassée. Les formes
`static` et `interactive` de ces quatre types sont **intactes**, vérifié mécaniquement.

Vérification après fermeture (`isLoopBuildable` + `buildabilityMark`) :

```
treemap     video        buildable=false  mark=YES → "a treemap cannot be shipped as a video yet…"
treemap     static       buildable=true   mark=none
treemap     interactive  buildable=true   mark=none
bar         video        buildable=true   mark=none      (aucun autre type touché)
```

Et la jambe OFFRE re-jouée : les 4 cases passent de `offered-clean` à `offered-marked`. Elles ne
sont **pas retirées** — c'est la discipline du dépôt (« marquée, jamais silencieusement
retirée ») : le journaliste lit la raison avant de choisir.

Trois tests verrouillent la fermeture dans `lib/loop/assemble/index.test.ts` : la case vidéo est
refusée **et** le statique / l'interactif des quatre mêmes types restent construisibles ; le
refus nomme la forme et la sortie de secours et ne contient ni « snap-video », ni pourcentage, ni
la phrase générique auto-contradictoire ; et six autres types animent toujours (une faute de
frappe dans la table fermerait sinon toute la famille vidéo en silence).

Les phrases sont écrites pour un journaliste, pas pour un mainteneur — elles disent ce qui
n'arrivera pas et quoi faire à la place, jamais quel garde-fou a sauté ni quel pourcentage :

> *« a treemap cannot be shipped as a video yet: the frame you would be shown to approve it and
> the video that would actually go out are not the same picture — the tiles' edges do not survive
> video compression cleanly. Publish it as a static or interactive chart, which are unaffected »*

> *« a dot strip plot cannot be shipped as a video yet: the animation is over before the video is
> half-way through, so most of the clip is a still image and there is no reveal left to watch. »*

**Cette liste doit rétrécir.** Chaque entrée est un défaut de mouvement avec une mesure connue,
pas une décision sur ce dont une rédaction a besoin. Retirer une entrée est un changement d'une
ligne, et ce qui le mérite est la mesure au rendu qui passe au vert — pas un avis.

---

## 6. Le quadrant ③, rapporté et non refermé

Neuf cases produisent et ne sont jamais offertes. Aucune n'est un bug à refermer seul : chacune
est une décision éditoriale.

| # | Case | Ce qui existe | Ce qui manque pour l'offrir |
|---|---|---|---|
| 1-6 | map reveal × `choropleth`, `symbol`, `hex-grid`, `dot-density`, `locator`, `cartogram` | 6 composants (18 compositions) qui rendent une vidéo valide et animée | Un axe « kind » que le format `video` ne porte pas. Un knob de config, et une décision : le producteur préfère explicitement la story |
| 7-8 | map scrolly à **arc rédigé** × `choropleth`, `symbol` | L'arc confirmé arrive verbatim et dans l'ordre par le chemin V1 | Un champ d'arc de carte dans `ProductionBrief`, et la levée du refus de `assembleScrolly` sur la piste carte |
| 9 | image scrolly | La page se construit, les légendes du journaliste arrivent verbatim | Que `EligibilityInput` puisse voir `run.input.images`. Aujourd'hui la marque est inconditionnelle et vaut `missing`, donc la case ne remonte jamais dans une offre à 3 lignes |

---

## 7. Régressions des classes récemment corrigées

Trois classes ont été corrigées juste avant cette passe. Elles ont été re-testées de front.

| Classe | Verdict |
|---|---|
| **D31 — arc narratif confirmé jeté sur les pistes carte** (`6475a930`) | **Tient.** `choropleth` et `symbol` en scrolly rendent l'arc verbatim, dans l'ordre confirmé, sans descripteur de salience survivant. Les 4 types incapables refusent par leur nom. Une seule réserve : le CLI scrolly, non gardé, laisse encore passer et abandonne (§4.4) — mais les deux chemins journalistes refusent |
| **Désynchronisation de durée vidéo** (`0761b759`) | **Tient.** Les 7 vidéos map-native portent une durée cohérente et non nulle (mesurée : choropleth 27.35s, cartogram/dot-density/symbol/hex-grid/locator 31.66s, route 15.36s), aucun mp4 tronqué, aucun figé. La cause de l'écart choroplèthe n'a pas été instrumentée — seule la durée est mesurée |
| **D12 — retour à l'anglais** | **Non re-testé ici, et toujours ouvert par ailleurs.** Cette passe mesure la grille, pas la langue : les fixtures chart/map sont anglaises par construction, sauf les phrases rédigées (françaises), qui sont arrivées intactes. La grille n'a rien à dire sur D12 |

**Un défaut de mouvement neuf, jamais vu par le sweep** : `dot-strip` en vidéo est un
*two-state pop* (§4.1). Le sweep de 83 cas n'avait rendu qu'une seule vidéo — la case n'avait
jamais été ouverte.

---

## 8. Ce qui n'a pas pu être mesuré

- **Les 11 types chart famille B en vidéo.** Non offerts et non produisibles par construction
  (`deferred` dans le manifeste). La jambe RENDU n'a pas été tentée : il n'y a pas de mapper. Non
  comptés comme cassés.
- **Les autres canaux.** Tout a été rendu sur `article-web`. L'épinglage **exact** de la taille au
  canal n'est asserté par les producteurs que pour `social-feed` (carré) et `social-vertical`
  (portrait) ; en paysage la taille reste celle de la famille. **Le pin carré/portrait n'a donc
  pas été exercé** : c'est le trou le plus net de cette passe, et il est bon marché à combler
  (27 + 7 rendus, ~15 min).
- **Le statique et l'interactif**, hors périmètre par construction.
- **Le sample `locator-few.json` en scrolly** compte comme une fragilité rapportée, pas comme une
  case cassée : la même case construit avec `locator-many.json`.
- **Les 4 échecs vidéo sont des mesures de cette machine.** Déterministes (deux runs, chiffres
  identiques), mais l'encodeur h264 et la version de Chrome embarquée par Remotion entrent dans
  le calcul du seuil de 1 %. Une machine de CI pourrait donner des chiffres légèrement différents
  — pas assez pour changer le verdict de `dot-strip` (0.06 contre un seuil de 0.15), possiblement
  assez pour faire osciller `pyramid` (1.12 % contre 1.00 %).

---

## 9. Récapitulatif chiffré

```
71 cases mesurées

AVANT la fermeture              APRÈS la fermeture
  ① vivante        41             ① vivante        41
  ② piège           4             ② piège           0
  ③ gaspillée       9             ③ gaspillée       9
  ④ absente        17             ④ absente        21

Appels produce réellement conduits : 62
  27 chart vidéo · 7 map story · 7 map reveal · 12 map scrolly
  · 6 chart scrolly · 1 image scrolly · 2 contre-épreuves locator
Vidéos rendues ET vérifiées image par image : 37
  (les 4 mp4 refusés par le producteur ne sont pas comptés : produce sort non-zéro,
   donc la boucle ne les livre pas et ils n'ont pas été assertés)
Pages scrolly ouvertes et lues dans un navigateur : 17
```

---

## 10. État du gate

`bun run check` : **21/22**. Le seul check rouge est `lib/verify/capture-html.test.ts`, dont
deux ou trois tests Playwright dépassent le timeout de 120 s **sous la charge du gate complet**.

Ce n'est pas cette passe qui l'a causé, et ce n'est pas une opinion — c'est mesuré des deux
côtés : `bun test lib/verify/` donne **174 pass / 0 fail en 7,8 s**, à l'identique, avec la
fermeture appliquée **et** avec la fermeture retirée (`git stash`). Le fichier n'importe rien de
`lib/loop/assemble`. Les suites propres à la fermeture (`lib/loop/assemble/index.test.ts`) sont
vertes : 19 pass.

Flake de contention pré-existant, à traiter séparément.
