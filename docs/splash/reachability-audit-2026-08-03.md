# Audit d'atteignabilité — ce que le moteur calcule, ce qui arrive au lecteur

> **Date :** 2026-08-03 · **Arbre :** `splash-merge` (`main`, `1d5b4496`) · **Lecture seule** — aucun
> fichier du produit modifié.
>
> **Pourquoi cet audit.** Le 2 août 2026, le même défaut a été trouvé **deux fois par accident** : le
> storyboard carte (`arcBeats` accepté puis silencieusement perdu sur quatre des six types portés par le
> scrolly) et le storyboard route (rendu arc-capable au prix de trois rondes de correctifs, et qui
> n'atteint aucun artefact livré). La consigne du porteur du projet, verbatim : **« il faut que ce
> qu'on a produit en feature fonctionne et soit accessible pour produire »**. Ce document est le
> balayage systématique qui aurait dû trouver ces deux-là.
>
> **Méthode.** Chaque affirmation est ancrée sur un `fichier:ligne`, et **l'exécution prime la
> lecture** : les matrices ci-dessous sont produites en appelant `isLoopBuildable`, `storyComps`,
> `mapNativeConfigErrors` et `buildabilityMark` directement, et en comparant les compositions
> Remotion réellement enregistrées à celles qu'un producteur peut sélectionner. Les sorties réelles
> sont citées. Là où seul un rendu ou une clé vivante trancherait, c'est dit explicitement.

---

## 0. Résumé — les six choses à retenir

| # | Constat | Classe |
|---|---|---|
| 1 | **`arcBeats` n'existe pas dans la chaîne V2.** Le champ n'apparaît nulle part dans `lib/` hors d'un commentaire. `ProductionBrief` n'a pas le champ. Aucun assembleur ne l'émet. Le storyboard carte — 7 types, ~800 lignes de garde dédiée — n'est atteignable que par la chaîne V1 ou une config écrite à la main. | Capacité inatteignable par la boucle |
| 2 | **`cameraMode: "simple"` jette le storyboard confirmé, sans un mot.** Les **7** composants `*Reveal.tsx` ne lisent jamais `arcBeats` ; la porte accepte la config avec 0 erreur et 0 avertissement. **Prouvé par exécution.** | **Perte silencieuse** |
| 3 | **Un sous-arbre mort de 8 composants**, pas un orphelin isolé. `MapScrolly.tsx` + les 7 `*Scrolly.tsx` de `map-native` ne sont atteignables par aucun producteur : les 3 compositions `MapScrolly*` sont enregistrées mais `storyComps` ne les retourne jamais. `RouteScrolly.tsx` est un membre de ce sous-arbre, pas une exception. | Orphelins |
| 4 | **`skills/map-native/SKILL.md` §Produce documente une CLI qui n'existe plus** (`format ∈ {static\|reveal\|story\|scrolly\|all}`), et une fiche KB entière (`video-scrolly.md`) décrit un sous-format que rien ne peut produire. | Prose > code |
| 5 | **`knowledge/references/map/camera-modes.md:17` nie une capacité réelle** (« `"simple"` n'est PAS une valeur `cameraMode` valide ») que `camera-mode.ts:9` accepte — et se contredit elle-même 60 lignes plus bas. | Prose < code |
| 6 | **L'outil dénigre un artefact correct.** `produce.mjs:197-202` avertit qu'une carte-vidéo sombre « *will render with a LIGHT basemap* ». Les 13 composants vidéo résolvent `mapStyle` et rendent bien sombre — parité **29 pass / 0 fail**. L'avertissement est du rot jamais retiré. | Prose < code, face-journaliste |

---

## 1. La matrice

### 1.1 Cartes — 7 types × 4 formats

Produite en appelant `isLoopBuildable(producerForFormat("map-native", f), t, f)` sur les 7 types de
`MAP_TYPES` (`skills/map-native/src/map-types.ts`) — sortie verbatim :

```
type            static        interactive   scrolly       video
choropleth      OK            OK            OK            OK
symbol          OK            OK            OK            OK
route           OK            OK            REFUSED       OK
locator         OK            OK            OK            OK
dot-density     OK            OK            OK            OK
hex-grid        OK            OK            OK            OK
cartogram       OK            OK            OK            OK
```

**27 atteignables / 1 refusée / 0 incertaine**, au niveau de la porte.

Mais la porte n'est pas le lecteur. La même matrice, une fois posée la question **« et le storyboard
confirmé du journaliste (`arcBeats`) y arrive-t-il ? »** :

| type | static | interactive | scrolly | video (`guided-tour`, défaut) | video (`simple`) |
|---|---|---|---|---|---|
| choropleth | ✅ ⟨sans objet⟩ | ✅ ⟨sans objet⟩ | ✅ **arc honoré** | ✅ **arc honoré** | ⚠️ **arc jeté en silence** |
| symbol | ✅ ⟨sans objet⟩ | ✅ ⟨sans objet⟩ | ✅ **arc honoré** | ✅ **arc honoré** | ⚠️ **arc jeté en silence** |
| locator | ✅ ⟨sans objet⟩ | ✅ ⟨sans objet⟩ | ✅ **arc honoré** | ✅ **arc honoré** | ⚠️ **arc jeté en silence** |
| cartogram | ✅ ⟨sans objet⟩ | ✅ ⟨sans objet⟩ | ✅ **arc honoré** | ✅ **arc honoré** | ⚠️ **arc jeté en silence** |
| dot-density | ✅ ⟨sans objet⟩ | ✅ ⟨sans objet⟩ | ✅ **arc honoré** | ✅ **arc honoré** | ⚠️ **arc jeté en silence** |
| hex-grid | ✅ ⟨sans objet⟩ | ✅ ⟨sans objet⟩ | ✅ **arc honoré** | ✅ **arc honoré** | ⚠️ **arc jeté en silence** |
| **route** | ✅ ⟨sans objet⟩ | ✅ ⟨sans objet⟩ | ❌ **refusé fort** | ⚠️ **arc jeté en silence** | ⚠️ **arc jeté en silence** |

Légende — ✅ atteignable · ❌ refusé fort (le journaliste l'apprend) · ⚠️ **produit un artefact
diminué sans le dire** · ⟨sans objet⟩ = le format n'a pas de notion de récit, `arcBeats` n'y a rien
à perdre.

**Et par-dessus tout cela** : dans la chaîne **V2** (`lib/loop`), aucune des cases « arc honoré »
n'est réellement atteignable, parce que rien n'émet `arcBeats` (§2.1). Les cases vertes ci-dessus
décrivent la chaîne **V1** (`skills/splash/SKILL.md` + `validate-gate.ts`), où le modèle écrit la
config lui-même.

### 1.2 Graphiques — 41 types × 4 formats

Produite en exécutant `isLoopBuildable` sur `NATIVE_TYPES` :

```
types déclarés : 41
static      : 27/41 atteignables (constructeur chart-native)
interactive : 27/41 atteignables (constructeur chart-native)
scrolly     :  2/41 atteignables (constructeur scrolly)
video       : 23/41 atteignables (constructeur chart-native)
```

**79 cases atteignables / 85 inatteignables / 0 incertaine** sur 164 — avec une réserve sur les 23
cases `video` ouvertes à la porte : elles ne sont *prouvées* que par un rendu réel (voir §5).

| famille | static | interactive | scrolly | video |
|---|---|---|---|---|
| `line`, `bar` (2) | ✅ | ✅ | ✅ | ✅ |
| `scatter` (1) | ✅ | ✅ | ❌ *délibéré (byline)* | 🟡 |
| 20 autres types famille A | ✅ | ✅ | ❌ | 🟡 |
| `pyramid`, `treemap`, `waffle`, `dot-strip` (4) | ✅ | ✅ | ❌ | ❌ *mesuré* |
| 14 types famille B | ❌ | ❌ | ❌ | ❌ *différé* |

🟡 = porte ouverte, composition Remotion enregistrée, **non prouvé par un rendu**.

---

## 2. Par cellule inatteignable — où exactement ça s'arrête

### 2.1 ⚠️ `arcBeats` n'atteint aucune carte par la chaîne V2 — les 7 types

**Où ça s'arrête :** nulle part, littéralement. Le champ n'est jamais posé.

```
$ grep -rn "arcBeats" lib/ --include='*.ts' | grep -v '\.test\.'
lib/brain/beats.ts:95:  * Every map-native type now carries `arcBeats` (region-anchored: `{region, role, text}`,
lib/brain/beats.ts:97:  * override, exactly like this track's `beats`. It is absent HERE because `arcBeats` is never
```

Deux lignes, toutes deux dans un **commentaire**. `ProductionBrief`
(`lib/core/production-brief.ts:107`) ne déclare que `beats?: BriefBeat[]` — le champ de la piste
*graphique*. `assembleMapNative` (`lib/loop/assemble/map-native.ts:148-404`) n'émet `arcBeats` dans
aucune de ses 7 branches ; la branche route (`:301-317`) construit `{type, route, basemap, geography,
title, description, source, lang?, valueUnit?}` et rien d'autre.

**Délibéré ou trou ?** `lib/brain/beats.ts:95-101` l'assume par écrit — « `arcBeats` is never
MACHINE-DRAFTED — the journalist's own wording is pinned verbatim, with no `draft-beats` step to
route to ». La justification tient pour le *drafting*. Elle ne dit rien du **transport** : il n'y a
aucun verbe, aucun champ de brief, aucun chemin par lequel la formulation verbatim du journaliste
entre dans la config carte. **Trou non fermé.**

**Aggravant côté V1 :** `skills/splash/SKILL.md:282-327` documente `arcBeats` longuement et
honnêtement — mais `skills/suggest-chart/SKILL.md` et `skills/suggest-chart/references/map-native-spec.md`,
c'est-à-dire les fiches qui disent au modèle **quels champs écrire dans une config map-native**, ne
mentionnent `arcBeats` **nulle part** (grep : 0 occurrence). Le suggesteur ne peut donc pas l'émettre
non plus.

### 2.2 ⚠️ `cameraMode: "simple"` — la perte silencieuse la plus large

**Où ça s'arrête :** `skills/map-native/scripts/lib/story-comps.mjs:64-79`. La branche `simple`
sélectionne la famille `*Reveal`, et **aucun** des 7 composants `*Reveal.tsx` ne lit `arcBeats` :

```
ChoroplethReveal       arcBeats mentions=0
SymbolReveal           arcBeats mentions=0
LocatorReveal          arcBeats mentions=0
DotDensityReveal       arcBeats mentions=0
HexGridReveal          arcBeats mentions=0
CartogramReveal        arcBeats mentions=0
RouteReveal            arcBeats mentions=1   ← un commentaire expliquant qu'il ne le lit pas
```

**Prouvé par exécution** — choroplèthe, échantillon réel + `cameraMode: "simple"` + 3 beats confirmés :

```
gate errors:      []
fallback warning: null
video comps for cameraMode 'simple': [["ChoroplethReveal","landscape"], …]
```

Zéro erreur, **zéro avertissement**. `mapNarrativeFallbackWarning` (`map-arc.ts`) est le seul garde
qui parle de l'arc, et il ne se déclenche que quand `arcBeats` est **absent** — donc précisément pas
ici. `validateByProducer` (`skills/splash/src/validate-gate.ts:787-799`) route un `map-native` vers
`validateMapNative`, **qui ne reçoit jamais le format** : aucune porte ne *peut* dire « ce mode caméra
va jeter votre plan ».

**Délibéré ou trou ?** Le comportement du renderer est délibéré (un plan fixe n'a pas de couture pour
des beats discrets) et `skills/splash/SKILL.md:325-327` le décrit correctement. **Le silence, lui,
n'est pas délibéré** — c'est un trou : la règle est écrite dans une prose que le journaliste ne lit
pas, et rien ne la fait respecter mécaniquement.

**Aggravant :** `skills/suggest-chart/SKILL.md:396-401` invite explicitement à poser la question au
journaliste — « *a guided tour between the highlights, or a fixed shot that fills in?* ». Un
journaliste qui répond « plan fixe » **après** avoir confirmé son storyboard perd son storyboard.

### 2.3 ⚠️ route × video — le storyboard route n'atteint rien

**Où ça s'arrête :** `skills/map-native/src/components/RouteReveal.tsx:159-171`.

> « `config.arcBeats` … is **DELIBERATELY NOT read here** … This composition draws the route's own
> line on, continuously, as a single physical sweep through every crossed territory in GEOGRAPHIC
> order — that IS the animation, not a sequence of discrete camera beats a plan could reorder or
> subset. »

Et `storyComps` fait converger **les trois** modes caméra d'une route vers cette même composition
(`story-comps.mjs:33-34` pour `guided-tour`, `:58` pour `route-reveal`, `:75-76` pour `simple`) —
exécuté :

```
defaultCameraMode(route) = route-reveal → [["RouteReveal","landscape"], …]
guided-tour              → [["RouteReveal","landscape"], …]
```

**Prouvé par exécution** — une config route valide portant un arc à 3 beats :

```
GATE ERRORS: []      ACCEPTED: true      WARNING: null
```

Et `buildabilityMark("map-native", "video", "route")` → `null` : **la forme est offerte sans marque**.

**Délibéré ou trou ?** Le refus du renderer est délibéré et bien argumenté. Le **silence de la porte
sur le chemin vidéo** est un trou. À comparer avec le chemin scrolly, qui lui *est* fermé (§2.4) :
`validate-gate.ts:189-192` ajoute même la phrase « The confirmed claim-arc on this spec would reach no
reader-facing output ». Cette phrase existe pour le scrolly et **pas** pour la vidéo, alors que la
conséquence est identique.

### 2.4 ❌ route × scrolly — refusé fort (délibéré, correctement fermé)

**Où ça s'arrête, trois fois, en cascade :**

1. `skills/scrolly/src/scrolly-types.ts:42-49` — `MAP_SCROLLY_TYPES` a **six** entrées, pas sept.
2. `lib/loop/assemble/scrolly.ts:66-67` — refus nommé à la composition. Exécuté :
   > `nothing walks a "route" through a scrolly: a scrolly hosts a line or a bar chart, or a map (symbol, hex-grid, dot-density, locator, cartogram, choropleth) — build this one as a static or interactive element instead`
3. `skills/splash/src/validate-gate.ts:181-193` — refus Tier-0 côté V1, **avec** la phrase dédiée
   quand un `arcBeats` est présent.
4. `skills/map-native/scripts/produce.mjs:505-512` — refus dur au producteur.

**Délibéré, et c'est le modèle du genre** : la fiche KB elle-même est cohérente
(`knowledge/references/map/types/route.md:8` déclare `formats: [static, interactive, video]`, sans
`scrolly`), et un test de dérive (`skills/scrolly/tests/kb-scrolly-drift.test.ts`) *fait respecter*
cette cohérence dans les deux sens. **Exécuté : 5 pass / 0 fail.** C'est le garde né du défaut n°1 —
il fonctionne.

### 2.5 ❌ 14 types graphiques famille B × 4 formats (56 cases)

**Où ça s'arrête :** `lib/loop/assemble/index.ts:268` lisant `deferred` depuis
`skills/chart-native/src/native-types.ts:71-155` ; cause racine `spec-to-config.ts:952-953`
(`MAPPERS` a 27 clés, `specToNativeConfig` lève `UnsupportedNativeType`). Second verrou indépendant
sur la chaîne V1 : `skills/splash/src/validate-gate.ts:718-719`.

**Délibéré.** `native-types.ts:70` : « *Family B, deferred by design (structural/specialist data an
article rarely yields)* », avec une raison par type. `validate-gate.ts:663` : « *a deferred type is a
MAINTAINER's door, not a journalist's* » — et cette porte est réellement ouverte : un
`produce.mjs sankey config.json out static` construit sans erreur depuis une config écrite à la main.

### 2.6 ❌ 25 types graphiques × scrolly

**Où ça s'arrête :** `lib/loop/assemble/index.ts:89` → `SCROLLY_TRACK_TYPES`
(`lib/loop/assemble/scrolly.ts:24-27`), dont la moitié graphique est
`AUTHORABLE_SCROLLY_TYPES = ["line","bar"]` (`skills/chart-native/src/chart-story.ts:128`).

**Délibéré pour `scatter`, trou pour les 24 autres** — et le code le dit en deux phrases distinctes
exprès (`assemble/scrolly.ts:29-48`). Pour `scatter` : « *a "scatter" scrolly would caption itself …
the captions would be the machine's own, under your byline* ». Le renderer, lui, **héberge**
réellement `scatter` (`scrolly-types.ts:13` ; `ScrollyChart.tsx:131` dispatche `ScatterChart`) : la
boucle refuse une capacité qui marche, pour une raison éditoriale assumée.

⚠️ **Mais le refus n'est fort que dans la boucle.** Le validateur propre du producteur —
`scrollySpecErrors` (`skills/scrolly/src/manifest.ts:66-72`) — ne consulte **jamais**
`CHART_SCROLLY_TYPES` ; il n'exécute que le mapper et la forme. Exécuté :

```
scrollySpecErrors(scatter) -> ACCEPT     scrollySpecErrors(heatmap) -> ACCEPT
scrollySpecErrors(pie)     -> ACCEPT     scrollySpecErrors(treemap) -> ACCEPT
```

Un `pie` atteignant la CLI scrolly meurt alors dans le garde reduced-motion lancé à
`skills/scrolly/scripts/produce.mjs:141`, sur `TimeoutError: waiting for
locator('[data-step-index]')` — le type n'est **jamais nommé**. `checkScrollyConformance`
(`skills/scrolly/src/conformance.ts:16`, « *only 0 steps — a scrolly needs at least 3* ») existe et
**n'est appelée par aucun producteur** — grep vérifié : ses seuls appelants hors tests sont
`skills/scrolly/scripts/audit-scrolly.mjs:54` (opt-in). **Trou.**

### 2.7 ❌ `pyramid`, `treemap`, `waffle`, `dot-strip` × video

**Où ça s'arrête :** `lib/loop/assemble/index.ts:63` → `chartNativeSupports`
(`skills/chart-native/src/video-reach.ts:68-73`).

**Délibéré, mesuré, et marqué dans l'offre.** Exécuté :

```
chart-native waffle × video → {"status":"missing","reason":"a waffle chart cannot be shipped as a
video yet: the frame you would be shown to approve it and the video that would actually go out are
not the same picture …"}
chart-native waffle × static → null
```

⚠️ **Mais ce verrou n'existe que sur la chaîne V2.** `video-reach.ts` n'est importé que par
`lib/loop/assemble/index.ts` ; `skills/splash/src/validate-gate.ts` ne le consulte pas. Sur la chaîne
V1, une vidéo `pyramid` est proposée, **encodée**, puis refusée tardivement par `snap-video.mjs`.

---

## 3. Composants orphelins — existent, marchent, enregistrés nulle part

### 3.1 Le sous-arbre mort de `map-native` — 8 composants, 3 compositions

`RouteScrolly.tsx` **n'est pas un orphelin isolé** : c'est un membre d'un sous-arbre entier qui n'est
atteignable par aucun producteur. Prouvé par exécution, en comparant les compositions enregistrées
dans `remotion/src/Root.tsx` à celles que `storyComps` peut retourner sur les 7 types × 3 modes
caméra :

```
compositions enregistrées      : 43
atteignables via storyComps    : 39

ENREGISTRÉES MAIS INATTEIGNABLES PAR TOUT PRODUCTEUR :
  - HarnessCheck          (délibéré : smoke test)
  - MapScrolly
  - MapScrollySquare
  - MapScrollyPortrait
```

Et la chaîne d'imports, vérifiée :

| composant | importé par |
|---|---|
| `MapScrolly.tsx` | `remotion/src/Root.tsx` seulement |
| `ChoroplethScrolly.tsx` | `MapScrolly.tsx` (+ ses 6 frères, pour un helper) |
| `SymbolScrolly.tsx` | `MapScrolly.tsx` seulement |
| `LocatorScrolly.tsx` | `MapScrolly.tsx` seulement |
| `DotDensityScrolly.tsx` | `MapScrolly.tsx` seulement |
| `HexGridScrolly.tsx` | `MapScrolly.tsx` seulement |
| `CartogramScrolly.tsx` | `MapScrolly.tsx` seulement |
| **`RouteScrolly.tsx`** | `MapScrolly.tsx` seulement |

`storyComps` ne retourne jamais `MapScrolly*` : le sous-format « scrolly capturé en MP4 » a été
débranché de la CLI au redesign single-format, ce que `produce.mjs:24-27` documente honnêtement
(« *that render path is not deleted, just unwired from this single-format entry point* »). Le coût du
débranchement — 8 composants et 3 compositions devenus morts — n'a pas été comptabilisé.

**Pourquoi cela a trompé un relecteur :** `skills/map-native/tests/arc-beats-threading.test.ts:233-320`
consacre **~90 lignes** à une garde anti-régression sur mesure, résistante à la mutation, pour
`RouteScrolly.tsx` — un composant que rien ne peut rendre. Un bloc de test de cette qualité est le
signal le plus fort possible qu'une capacité existe. Il porte sur du code mort.

### 3.2 Côté graphique — la branche, pas le fichier

Aucun composant de `chart-native` n'a zéro importeur. La forme d'orphelin y est la même que pour
`RouteScrolly` : **une branche de dispatch vivante et correcte, que rien ne peut atteindre.**

1. **`ScrollyChart.tsx:131` — la branche `ScatterChart`.** Vivante, correcte, couverte par des tests
   (`tests/chart-story.test.ts` : 18/18, y compris la marche des outliers scatter), hébergée par
   `CHART_SCROLLY_TYPES` — et la boucle ne route jamais un scrolly scatter (§2.6).
2. **28 composants famille B** (`MarimekkoChart` … `PictogramChart` + leurs frères `Interactive*`),
   enregistrés en `component-registry.tsx:91-179`. Inatteignables depuis un spec ; atteignables via la
   CLI directe.
3. **42 compositions Remotion famille B** (`Root.tsx:492-1107`) — doublement bloquées : ni mapper, ni
   route vidéo.

---

## 4. Divergences prose ↔ code

### 4.1 Prose > code (la prose promet ce que le code ne peut pas livrer)

**D1 — `skills/map-native/SKILL.md:376-398` documente une CLI qui n'existe plus.** *(grave — c'est le
document de référence du moteur)*

> « `produce.mjs <config.json> <outDir> <format>` where `format ∈ { static | reveal | story | scrolly | all }`
> (defaults to `static`). The static + interactive proofs (`static.png`, `interactive.png`) are always
> emitted »

Le code (`skills/map-native/scripts/produce.mjs:146,151-154`) : `VALID_FORMATS = {"static",
"interactive", "video", "scrolly"}`, **pas de défaut**, et `scrolly` **échoue dur** (`:505-512`).
« always emitted » est faux depuis le redesign single-format — chaque format ne construit que le sien.
La ligne `:383-385` promet en outre explicitement le scrolly-vidéo route :

> « `scrolly` → scrolly-as-video … Covers all 3 types (choropleth, symbol, route). **Route gains
> `scrolly` alongside `story`** »

**C'est la phrase qui fabrique la croyance qu'un scrolly route existe.**

**D2 — `knowledge/references/map/formats/video-scrolly.md` (fiche entière, 45+ lignes) décrit le
sous-format scrolly-vidéo** comme une capacité vivante (« *one narrative, two expressions* »), y
compris sa dérivation route via `routeStoryToChapters`. Aucun producteur ne peut le produire (§3.1).

**D3 — `knowledge/references/chart/types/*.md` déclarent `video` pour les 4 types que la boucle
refuse en vidéo.** Exécuté :

```
VIDEO_UNREACHABLE_TYPES = pyramid, treemap, waffle, dot-strip
Fiches KB déclarant `video` pour un type refusé en vidéo :
  dot-strip          -> chart-native:dot-strip
  waffle             -> chart-native:waffle
  population-pyramid -> chart-native:pyramid
  treemap            -> chart-native:treemap
```

**Le point structurel :** il existe un test de dérive KB↔code pour l'axe **scrolly**
(`skills/scrolly/tests/kb-scrolly-drift.test.ts`, né du défaut n°1, 5 pass) et **aucun pour l'axe
vidéo**. C'est exactement le même défaut, un axe plus loin, sans garde. Le schéma des fiches
(`lib/brain/typology.ts:86`) n'a d'ailleurs pas d'échappatoire par format — `unreachable:` est
type-wide, donc ces quatre fiches **ne peuvent pas exprimer la vérité**.

**D4 — `knowledge/references/chart/types/scatter.md:8`** déclare `formats: [static, interactive,
video, scrolly]`. Le scrolly scatter est refusé (§2.6).

**D5 — `skills/chart-native/SKILL.md:3,8-16,100,107`** — « *41 chart types* », « *ships ALL THREE
formats* », « *the other 40 follow the identical pattern* », « *Any of the 41 … motion reveal* ».
Vrai pour 23. Le fichier ne mentionne ni `deferred`, ni la famille B, ni les exclusions vidéo — et sa
liste de mots-clés nomme les 14 types inatteignables. Même affirmation héritée dans
`skills/using-splash/SKILL.md:41-42`. *(la chaîne d'héritage à corriger ensemble)*

**D6 — les 11 fiches famille B** portent `formats: [static, interactive, video]` **et** un champ
`unreachable:` quatre lignes plus haut (ex. `sankey.md:4` vs `:8`). Seul `unreachable:` est lu
(`typology.ts:91-102`) — contradictoire mais inoffensif. `arc`, `combo`, `pictogram` **n'ont aucune
fiche**.

**D7 — `skills/scrolly/SKILL.md:3,55,185`** — « *v1 drives the MAP visual* », « *v1 implements
`visual:"map"` only* ». Les deux pistes (chart, image) sont livrées, et le même fichier documente la
piste chart en détail à `:62-77`.

**D2b — `skills/map-native/SKILL.md:322` promet le scrolly route dans son tableau de capacités.**

> `| Flow / route | MapTiler 2D | ✓ | ✓ | ✓ | … **static + interactive … + video (route-reveal / scrolly)** |`

Avec D1 (`:383-385`), cela fait **deux endroits** du même fichier qui promettent un scrolly route.
La fiche KB du type, elle, est correcte (`route.md:8`).

**D2c — `knowledge/references/map/formats/video-scrolly.md:142` inverse la ligne route.** Vérifié :

```
| Route | ✓ | — | ✓ | ✓ |          (colonnes : static | reveal | story | scrolly)
`:148-149` « route has no simple-reveal … its only video formats are `story` and `scrolly` »
```

Le code dit l'exact inverse : `Root.tsx` n'enregistre **aucune** composition `RouteStory` (seulement
`RouteReveal{,Square,Portrait}`, `:647-673`), et `story-comps.mjs:33-34,75-77` fait converger le
`guided-tour` **et** le `simple` d'une route vers `RouteReveal`. Route a **reveal ✓, story ✗,
scrolly ✗** — la fiche affirme reveal ✗, story ✓, scrolly ✓. Une ligne fausse sur ses trois cellules.

**D2d — `knowledge/references/map/types/route.md:208-209,260` documente un champ CLI `kind: "story"`**
qui n'existe nulle part (`produce.mjs` prend un `<format>` positionnel, `:150-153`). Même vocabulaire
mort à `camera-modes.md:73`.

**D2e — `skills/map-native/SKILL.md:3,8,151` annonce « 9 MapTiler 2D types ».** `MAP_TYPES`
(`skills/map-native/src/map-types.ts:5-13`) en compte **7**, et le commentaire du fichier explique
que `contour` « *was designed but never built* ». Le propre tableau de route du SKILL (`:329`) marque
d'ailleurs Contour/isoline `◻ ◻ —`, contredisant son frontmatter.

**D2f — `skills/scrolly/scripts/produce.mjs:52-54` affirme une équivalence qui n'existe pas.**

> « *`scrollySpecErrors` is the SAME function the producer manifest registers, so the CLI and the
> spine refuse identically.* »

Faux : `scrollySpecErrors` (`manifest.ts:42-72`) ne consulte ni `MAP_SCROLLY_TYPES` ni
`CHART_SCROLLY_TYPES` — une config **route** portant un `arcBeats` confirmé y **passe** et fait
construire une page à story vide. La colonne vertébrale (`assemble/scrolly.ts:66-67`,
`validate-gate.ts:181-193`) refuse ; la CLI, non.

**D2g — `themeBg` (fond maison arbitraire) n'est lu par aucun composant vidéo ni scrolly de
`map-native`.** Vérifié : `grep -c themeBg skills/map-native/src/components/*.tsx` → **zéro occurrence
sur les 21 fichiers**. Le point de perte est explicite : `ChoroplethStory.tsx:162` appelle
`legendTheme(dark, undefined, houseHue)` — `undefined` occupe la place de `themeBg`
(`theme/legend-theme.ts:26-33`) ; idem `ChoroplethReveal.tsx:79`, `ChoroplethScrolly.tsx:166`.
`core/MapFrame.tsx:39,105-107` **accepte** la prop ; `ChoroplethStory.tsx:639-651` ne la passe jamais.
Face à cela, `docs/splash/CHANGELOG.md:448-449` affirme « *le thème arbitraire marche sur **TOUS les
formats** — carte statique/interactif/**vidéo**/scrolly (basemap+marks+**furniture**)* » et
`CLAUDE.md:434-435` reprend l'affirmation. Le chemin vidéo honore bien la **teinte** maison
(`houseHue`), ce qui explique qu'un contrôle à l'œil passe. *(Documents internes, pas face-journaliste
— d'où le rang 4.)*

### 4.2 Prose < code (le code a une capacité que la prose nie)

**D8 — `knowledge/references/map/camera-modes.md:17` nie `"simple"` et se contredit.** *(grave — c'est
la fiche que le modèle lit pour choisir le mode caméra)*

> « **Dispatch value:** none — the simple-reveal format does NOT set `cameraMode` at all (the field is
> absent). `"simple"` is a conceptual mode name, **NOT a valid `cameraMode` value**. The only valid
> `cameraMode` values are `"guided-tour"` and `"route-reveal"`. »

Le code : `skills/map-native/src/camera-mode.ts:9` — `CAMERA_MODES = ["guided-tour", "route-reveal",
"simple"]`, et son propre commentaire (`:5-8`) explique que `"simple"` a été **restauré
délibérément** parce que « *a reveal is a capability the tool offers, not a mistake to leave
unreachable* ». `story-comps.mjs:64-79` le dispatche.

Pire : **la même fiche**, ligne ~83, dit au modèle de *poser* `cameraMode: simple` :

| Signal | Mode |
|--------|------|
| Single metric, full country/region distribution | `simple` |

Une fiche qui, dans le même document, ordonne d'émettre une valeur et déclare cette valeur invalide.
Conséquence pratique : un modèle qui suit la ligne 17 n'émet jamais `simple`, et les **21
compositions `*Reveal`** restent inatteignables par le flux — la capacité que `camera-mode.ts:5-8`
croyait avoir rendue atteignable.

**D8b — `skills/map-native/scripts/produce.mjs:197-202` dit au journaliste que sa vidéo sombre sera
claire. Elle sera sombre.** *(grave — c'est un message face-journaliste, et il est faux)*

> « *WARNING: mapStyle "dataviz-dark" requested with format "video" — dark mode is **not yet
> honored** in the video renderer; the output will render with a **LIGHT** basemap.* »

Vérifié par exécution : les 13 composants vidéo résolvent bien `mapStyle` et basculent le fond de
carte — `ChoroplethStory.tsx:158` (`resolveMapStyle(config.mapStyle) === "dataviz-dark"`) puis
`:196-197` (`DATAVIZ.DARK` / `DATAVIZ.LIGHT`), même forme dans `SymbolStory`, `LocatorStory`,
`DotDensityStory`, `HexGridStory`, `CartogramStory`, `RouteReveal` et les six `*Reveal`. Le garde de
parité passe : **`bun test tests/resolve-map-style-parity.test.ts` → 29 pass / 0 fail.**
`knowledge/references/map/formats/video.md:72-79` et `CLAUDE.md:413` (« *dark-mode complet sur
static/interactif/vidéo/scrolly* ») sont le côté correct. L'avertissement est du **rot** : il a été
ajouté avant les correctifs qui ont fermé le trou et n'a jamais été retiré. **Conséquence réelle : un
journaliste qui demande une vidéo sombre reçoit une vidéo sombre correcte, et le produit lui dit
qu'elle est ratée.** C'est le seul cas de l'audit où l'outil dénigre son propre artefact juste.

**D8c — `skills/map-native/src/components/RouteReveal.tsx:169-171` — le commentaire qui fabrique la
croyance.** *(c'est celui-ci qui a trompé un relecteur)*

> « *A confirmed arc still reaches the **SCROLLY render** of this same route (`RouteScrolly.tsx`,
> which walks discrete steps and so has a real seam) — it is only this continuous video composition
> that cannot express one.* »

Faux, et démontré §3.1 : `RouteScrolly.tsx` n'est atteignable que par la composition `MapScrolly`,
qu'aucun producteur ne sélectionne, et le scrolly HTML n'a pas de branche route.
`skills/splash/SKILL.md:319-321` dit l'inverse et a raison : « *A route's confirmed arc therefore
reaches the reader through **NEITHER** format.* » Le commentaire est placé exactement là où un
relecteur va vérifier si la capacité existe, et il l'affirme.

**D9 — `knowledge/references/chart-selection.md:32-33`** — « *the article→CSV mapper currently
produces bar/column, line, scatter, pie natively — any other type falls back to `dw-chart`* ».
**Sous-promet de 23 types** et enverrait `grouped`/`stacked`/`slope`/`dumbbell`/`histogram`/`heatmap`
vers Datawrapper. Contredit `suggest-chart/SKILL.md:329-331`, le seul document du dépôt qui donne le
bon ensemble de 27.

**D10 — `skills/chart-native/SKILL.md:20`** — « *(there is no separate
`knowledge/references/chart/types/` directory)* ». Le répertoire existe, contient 38 fiches, et est lu
à l'exécution par `lib/brain/typology.ts:18`. Le même fichier ne contient **aucune** occurrence de
« scrolly », alors que chart-native détient cette capacité pour `line`/`bar`.

### 4.3 Commentaires de code périmés — la même phrase fausse dans deux fichiers

**D11 —** la classe « la même fausse affirmation héritée d'un fichier à l'autre », dans le code cette
fois :

- `lib/loop/buildable.ts:77` — « *so no entry restricts by format today* »
- `lib/brain/eligibility.ts:393` — « *No format restriction survives in the table today
  (lib/loop/assemble/index.ts).* »

Les deux sont fausses : l'entrée `chart-native` de la table **restreint** le format `video` pour 4
types (`assemble/index.ts:63` → `chartNativeSupports`), et c'est le mécanisme même que
`eligibility.ts` exécute trois lignes plus bas. Sans conséquence pour le journaliste ; conséquence
réelle pour le prochain mainteneur, qui lira deux fois qu'un axe est inutilisé alors qu'il porte
quatre refus mesurés.

**D12 — `skills/suggest-chart/references/map-native-spec.md:66`** — « *A `route` has no `cameraMode`
field* ». Vérifié : `validateRouteConfig` est en effet le **seul** des 7 validateurs à ne pas appeler
`cameraModeError` (`validate-config.ts` : lignes 197, 328, 581, 746, 941, 1125 — pas de route). La
prose est donc exacte sur l'intention, mais le code est **plus permissif** qu'elle : une route peut
porter n'importe quel `cameraMode`, y compris une valeur invalide, sans que la porte proteste. Sans
conséquence de rendu (les trois modes convergent vers `RouteReveal`), mais c'est un contrôle absent,
pas un contrôle délibérément retiré.

---

## 5. Ce que cet audit n'a pas tranché

Dit explicitement, plutôt que masqué :

| Question ouverte | Ce qui la trancherait |
|---|---|
| Les **23 cases `video` graphiques** marquées 🟡 : porte ouverte, 123 compositions enregistrées, dispatch vérifié sans substitution — mais `snap-video.mjs` refuse **après encodage**, et c'est ainsi que les 4 exclusions actuelles ont été découvertes. | Un rendu Remotion réel + `snap-video.mjs` pour chacun des 23. Aucune clé API nécessaire — la vidéo chart-native est entièrement locale. `video-reach.ts:23-26` le dit : « *the thing that earns it is the render measurement going green, not an opinion* ». |
| Les cellules **carte × {static, interactive}** pour les 6 types autres que route : atteignables par construction (dispatch complet dans `mount.tsx:66-104`, validateur par type, branche d'assemblage), **non rendues ici**. | Un `produce.mjs <config> <out> static` et `… interactive` par type. **Une l'a été** : `route × static` a été rendue de bout en bout pendant cet audit avec un `arcBeats` à 3 beats — `PRODUCE_RESULT {"static":"…/static.png"}`, 1200×675, 8 étiquettes de mobilier passant WCAG. |
| Les cellules **carte × video** : dispatch prouvé par exécution, compositions enregistrées, dims vérifiées à la production — mais aucun mp4 rendu dans cet audit (coût). | Un rendu par type ; l'historique du projet en enregistre plusieurs comme verts. |
| Le **scrolly image** (`image-native`) n'a pas été balayé — hors du périmètre demandé (types carte et graphique). | Le même traitement appliqué à `skills/image-native`. |
| Les **14 types famille B** ont composants et compositions Remotion, mais rien dans l'arbre n'atteste un rendu vert. | Un rendu par type via la porte mainteneur. |
| `themeBg` absent du chemin vidéo (D2g) : **ligne de périmètre assumée ou oubli ?** Les tuiles MapTiler n'ont que 2 styles, donc un fond arbitraire ne pourrait thémer que le mobilier — argument plausible, mais **aucun document ne pose cette limite** ; ils affirment tous la couverture complète. | Une décision explicite, écrite quelque part. |
| L'avertissement dark de `produce.mjs` (D8b) : rot ou ceinture-bretelles délibérée ? L'ordre des commits dit rot ; aucun ticket ne dit de le garder. | Un `git log` sur les correctifs dark vs l'ajout de l'avertissement, et un arbitrage. |

---

## 6. Classement par conséquence pour le journaliste

> Règle de classement : **ce qui produit en silence un artefact faux ou diminué** passe avant **ce qui
> refuse fort**, qui passe avant **ce qui est seulement mal documenté**. Une perte silencieuse est la
> pire classe : le journaliste croit avoir eu ce qu'il a demandé.

### Rang 1 — pertes silencieuses (le journaliste croit avoir été entendu)

| # | Ce qui se passe | Portée | Ancrage |
|---|---|---|---|
| **1** | **`cameraMode: "simple"` jette le storyboard confirmé.** Le journaliste confirme un arc verbatim, répond « plan fixe » à une question que le skill lui pose explicitement, et reçoit une vidéo qui raconte la salience des données à la place de son argument. 0 erreur, 0 avertissement. | **7 types × video** | `story-comps.mjs:64-79` · les 7 `*Reveal.tsx` · `suggest-chart/SKILL.md:396-401` · prouvé par exécution |
| **2** | **route × video jette le storyboard confirmé.** Même perte, sans même le choix d'un mode caméra : les trois modes convergent vers `RouteReveal`. La forme est offerte **sans marque** (`buildabilityMark` → `null`). Le refus scrolly a une phrase dédiée pour ce cas ; le chemin vidéo n'en a pas. | **route × video** | `RouteReveal.tsx:159-171` · `story-comps.mjs:33-34,58,75-76` · prouvé par exécution |
| **3** | **Un scrolly graphique non hébergé meurt sur un timeout Playwright anonyme.** `scrollySpecErrors` accepte `pie`/`heatmap`/`treemap` ; la production échoue à `produce.mjs:141` sans jamais nommer le type. `checkScrollyConformance` existe et n'est appelée par aucun producteur. | 39 types × scrolly, hors boucle V2 | `skills/scrolly/src/manifest.ts:66-72` · `conformance.ts:30` |
| **4** | **Sur la chaîne V1, une vidéo `pyramid`/`treemap`/`waffle`/`dot-strip` est proposée, encodée, puis refusée tard.** `video-reach.ts` n'est importé que par la boucle V2. | 4 types × video, chaîne V1 | `video-reach.ts` ∌ `validate-gate.ts` |
| **5** | **L'outil dénigre un artefact correct.** Un journaliste qui demande une carte-vidéo sur fond sombre reçoit une vidéo sombre juste, et lit « *the output will render with a LIGHT basemap* ». Perte silencieuse inversée : il peut abandonner une forme qui marche. | toute carte × video en `dataviz-dark` | `produce.mjs:197-202` vs `ChoroplethStory.tsx:158,196-197` · parité 29 pass/0 fail |
| **6** | **Un scrolly route atteignant la CLI construit une page à story vide au lieu d'être refusé.** `scrollySpecErrors` ne consulte pas `MAP_SCROLLY_TYPES` — ce qui falsifie l'affirmation d'équivalence CLI↔colonne vertébrale écrite dans le producteur lui-même. | route × scrolly, hors boucle | `manifest.ts:42-72` vs `scrolly/scripts/produce.mjs:52-54` |

### Rang 2 — capacités construites qui n'atteignent aucun lecteur

| # | Ce qui se passe | Ancrage |
|---|---|---|
| **7** | **`arcBeats` n'est émis par aucun chemin de la boucle V2.** Ni champ de brief, ni assembleur, ni verbe. Toute la capacité storyboard carte — 7 types, 12 composants threadés, 7 sizers, une garde dédiée — n'existe que pour la chaîne V1 et l'édition manuelle. Et sur la V1, la fiche qui écrit les configs carte (`map-native-spec.md`) ne mentionne pas le champ. | `grep arcBeats lib/` = 2 commentaires · `production-brief.ts:107` · `assemble/map-native.ts:301-317` |
| **8** | **Le sous-arbre `MapScrolly` — 8 composants, 3 compositions — est mort.** Débranché au redesign single-format, jamais retiré ni rebranché. `RouteScrolly.tsx` en est un membre, et une garde de ~90 lignes veille sur lui. | `story-comps.mjs` ∌ `MapScrolly` · prouvé par exécution (43 enregistrées / 39 atteignables) |
| **9** | **La branche `ScatterChart` de `ScrollyChart.tsx:131`** — vivante, testée 18/18, hébergée par le renderer, jamais routée par la boucle. Refus éditorial assumé côté boucle, mais la capacité reste payée et non signalée comme telle dans le renderer. | `ScrollyChart.tsx:131` · `AUTHORABLE_SCROLLY_TYPES` |
| **10** | **21 compositions `*Reveal` inatteignables en pratique**, parce que la fiche KB dit au modèle que `"simple"` n'est pas une valeur valide (D8) — annulant la restauration délibérée de `camera-mode.ts:5-8`. | `camera-modes.md:17` vs `camera-mode.ts:9` |

### Rang 3 — refus forts (corrects : le journaliste l'apprend)

| # | Ce qui se passe | Verdict |
|---|---|---|
| **11** | route × scrolly — refusé quatre fois en cascade, avec une phrase dédiée quand un arc est présent, et **un test de dérive KB↔code qui le fait respecter** (5 pass). | **Délibéré et bien fermé — le modèle à répliquer** |
| **12** | 14 types famille B × 4 formats — différés par conception, double verrou V1+V2, porte mainteneur réellement ouverte. | Délibéré |
| **13** | `scatter` × scrolly — refus éditorial argumenté (byline), marqué dans l'offre. | Délibéré |
| **14** | 4 types × video — mesuré, chiffré, marqué dans l'offre, avec un « THIS LIST MUST SHRINK » en tête de fichier. | Délibéré |

### Rang 4 — documentation seule (aucun artefact faux, mais elle fabrique la croyance)

| # | Divergence | Ancrage |
|---|---|---|
| **15** | `map-native/SKILL.md:376-398` documente une CLI supprimée **et promet le scrolly route** — la phrase même qui a trompé un relecteur. | D1 |
| **16** | `video-scrolly.md` : une fiche entière pour un sous-format que rien ne produit. | D2 |
| **17** | Pas de test de dérive KB↔code sur l'axe **vidéo**, alors qu'il existe sur l'axe **scrolly** — 4 fiches mentent, et le schéma ne peut pas exprimer la vérité. | D3 |
| **18** | `chart-native/SKILL.md` : « 41 types, ALL THREE formats » (vrai pour 23), hérité dans `using-splash/SKILL.md`. | D5 |
| **19** | `chart-selection.md:32-33` sous-promet de 23 types et routerait à tort vers Datawrapper. | D9 |
| **20** | `chart-native/SKILL.md:20` nie un répertoire lu à l'exécution ; zéro occurrence de « scrolly ». | D10 |
| **21** | `scatter.md:8` déclare `scrolly` ; 11 fiches famille B se contredisent ; `arc`/`combo`/`pictogram` sans fiche. | D4, D6 |
| **22** | `scrolly/SKILL.md` : « v1 drives the MAP visual only », alors que le même fichier documente la piste chart. | D7 |
| **23** | `buildable.ts:77` et `eligibility.ts:393` portent la même phrase périmée (« no entry restricts by format today »). | D11 |
| **24** | `map-native-spec.md:66` : `validateRouteConfig` est le seul validateur sans contrôle `cameraMode`. | D12 |

---

## 7. Ce que cet audit suggère de mécaniser (sans rien décider)

Trois constats de cet audit sont des **classes**, pas des instances, et une seule d'entre elles a
aujourd'hui un garde :

1. **KB `formats:` ↔ capacité réelle.** L'axe `scrolly` a `kb-scrolly-drift.test.ts` (né du défaut
   n°1, vert). L'axe `video` n'a rien, et 4 fiches mentent. La forme du garde existe déjà et est
   testée sur un cas de fixture vacuous.
2. **Un champ confirmé par le journaliste ↔ chaque chemin de rendu qui le consomme.**
   `arc-beats-threading.test.ts` vérifie 12 composants et exclut nommément les `*Reveal` — l'exclusion
   est correcte au niveau du renderer, mais rien ne vérifie qu'une *porte* prévient quand le chemin
   choisi n'honore pas le champ.
3. **Composition enregistrée ↔ producteur qui peut la sélectionner.** La comparaison qui a révélé le
   sous-arbre mort tient en dix lignes (§3.1) et n'existe nulle part dans l'arbre.
