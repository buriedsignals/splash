# Spec — Les assembleurs de moteurs : la boucle sait construire les six formes

> **Statut :** conçu, non implémenté. Branche `feat/engine-assemblers`, off `main` @ `8d7847ec`.
> **Langue :** prose FR, identifiants/code en anglais (standard non-négociable).

---

## 1. Le problème

`lib/loop/buildable.ts:34` tient la liste de ce que la boucle éditoriale sait **construire** :

```ts
export const LOOP_BUILDABLE_ENGINES: readonly string[] = ["chart-native"];
```

Un seul moteur sur six. Le cerveau, lui, **propose** à travers les six (`lib/brain/eligibility.ts`) :
une carte, un scrolly, un Datawrapper sont offerts — **marqués** comme non constructibles, jamais
retirés en silence, ce qui est le bon comportement. Mais le journaliste qui les choisit se voit
répondre `not-implemented`, et la V2 promet publiquement quatre formats par une pipeline unique.

**Pourquoi un seul ?** Parce que `produce()` ne sait assembler qu'une seule forme de spec. Tout le
reste de la chaîne est déjà générique — `lib/core/registry` connaît les six moteurs, chaque moteur
déclare son `validate` et son mode d'exécution (`subprocess` ou `in-process`), le verbe `render`
dispatche sans rien savoir des moteurs. Il manque **une seule pièce par moteur** : la fonction qui
transforme un élément de manifeste en la spec que ce moteur valide.

Aujourd'hui cette pièce existe une fois, en dur, au milieu de `produce()` :
`assembleNativeSpec` (`lib/loop/produce.ts:90`), qui produit du chart-native et rien d'autre. Le
commentaire d'en-tête de `buildable.ts` le dit déjà : *« Adding an engine here is a promise:
produce.ts must be able to assemble that engine's spec. »* Cette spec tient la promesse.

C'est la même maladie que cette refonte poursuit depuis le début, à un cran de plus : **un mécanisme
existe (les six moteurs, leurs validateurs, le registre, le dispatch) et rien ne l'invoque.**

---

## 2. Décisions prises au brainstorming

**(a) Les six moteurs, pas une sélection.** *« Tous doivent être réalisables, ça fait partie de la
capacité à produire. »* Aucun moteur n'est laissé marqué à la fin de cette tranche.

**(b) La géographie est INFÉRÉE par correspondance, MONTRÉE, et CORRIGEABLE.** Une carte a besoin
d'une colonne de régions et d'un fond de carte. Ni l'un ni l'autre n'est deviné en silence : la
boucle mesure la correspondance entre les valeurs de la colonne et les clés du fond de carte, montre
le résultat (« 24 régions sur 26 reconnues sur `world` — non reconnues : *Genève*, *Vaud* »), et le
journaliste corrige. Ni un refus sec, ni une carte fausse.

**(c) La V1 reste, en filet.** `skills/splash/` (le `SKILL.md` où le modèle rédige la spec dans
`accepted.json`, lu par `produce-all.mjs`) n'est pas retirée par cette tranche. La boucle construit
les six ; le chemin V1 continue d'exister tant que la transition n'est pas close. Retirer la V1 est
une décision séparée, prise quand plus rien ne s'y appuie.

---

## 3. La forme — un assembleur par moteur, derrière un contrat nommé

### 3.1 `ProductionBrief` — ce qu'un assembleur reçoit

Un objet **plat et nommé**, composé une seule fois par `produce()`, à partir de tout ce qu'il a déjà
sous la main au moment de l'appel :

```ts
export type ProductionBrief = {
  elementId: string;
  nativeType: string;          // le type choisi, tel qu'offert
  format: VisualFormat;        // le format PINNÉ (jamais re-décidé ici)
  angle: {
    confirmedTakeaway: string;
    altInsight: string;
    unit?: string;
    emphasis?: string;
  };
  dataCsv: string;             // l'entrée gelée, lue une fois par produce()
  attribution: string;         // le crédit issu du ledger, jamais un placeholder
  sourceUrl?: string;
  beats?: NarrativeBeatSpec[]; // présents seulement si l'élément porte un plan narratif écrit
  geo?: GeoMatch;              // §4.2 — présent seulement quand la donnée porte une géographie
};
```

**Pourquoi plat, et pas `RunManifest` + `RunElement`.** Deux raisons, toutes deux mesurées :

1. **La couche l'interdit.** `lib/core` n'importe jamais `lib/loop` (invariant écrit dans l'en-tête
   de `buildable.ts`). Un brief typé sur `RunManifest` ne peut donc pas vivre dans `lib/core`. Plat,
   il le peut — et c'est là qu'il doit vivre, puisque les moteurs sont une affaire de `lib/core`.
2. **Le paramètre `run` d'`assembleNativeSpec` est DÉJÀ mort.** Vérifié : la signature le prend, le
   corps ne le lit jamais. Un assembleur qui reçoit le manifeste entier peut aller chercher de
   l'état ambiant ; un brief plat rend cela impossible par construction. C'est l'invariant « le
   contrat ne porte aucun état ambiant », appliqué un cran plus tôt.

Le brief est composé **après** toutes les portes de `produce()` (source déclarée, beats écrits,
format pinné, canal résolu) : un assembleur ne re-valide rien, il traduit.

### 3.2 Un module par moteur, une table

```
lib/loop/assemble/
  brief.ts          → le type + la composition depuis (run, el, csv, verdict, format)
  chart-native.ts   → assemble(brief) → ce que valide nativeSpecErrors (NativeSpec)
  map-native.ts     → assemble(brief) → ce que valide mapNativeConfigErrors
  scrolly.ts        → compose les deux ci-dessus + les beats
  image-native.ts   → assemble(brief) → ce que valide checkImageConformance (ImageStory)
  dw-chart.ts       → assemble(brief) → ce que valide validateChartSpec (ChartSpec)
  map-dw.ts         → assemble(brief) → ce que valide validateMapSpec (MapSpec)
  index.ts          → ASSEMBLERS: Record<string, Assembler>
```

**Un assembleur ne jette jamais.** Il rend `VerbResult` — `ok(spec)` ou un refus typé nommant ce qui
manque, dans les mots du journaliste (§5.2). C'est l'invariant I1 des verbes, hérité tel quel :
`produce()` relaie le refus, il ne le traduit pas.

### 3.3 `LOOP_BUILDABLE_ENGINES` devient DÉRIVÉE

```ts
export const LOOP_BUILDABLE_ENGINES: readonly string[] = Object.keys(ASSEMBLERS);
```

La liste cesse d'être une déclaration d'intention tenue à la main. **Un moteur est constructible si
et seulement si un assembleur existe pour lui** — la promesse que l'en-tête de `buildable.ts` demande
de tenir devient une conséquence du code, pas une ligne à ne pas oublier. Les quatre lecteurs
(`produce.ts:211`, `brain/eligibility.ts:308`, `manifest.ts:512`, `choose.ts:67`) ne changent pas
d'une ligne : ils lisaient déjà la liste, ils liront la liste dérivée.

Sens de dépendance : `buildable.ts` importe la table, jamais l'inverse. Aucun cycle — les assembleurs
importent `lib/core` et les types des moteurs, pas `buildable.ts`.

### 3.4 `assembleNativeSpec` DÉMÉNAGE, sans changer d'un octet

Le corps part de `produce.ts:90` vers `assemble/chart-native.ts`, **comportement inchangé**. Le
paramètre mort `run` disparaît (il devient le brief). Trois appelants suivent :
`produce.ts:303`, `produce.test.ts:629,652`, `beats-render-proof.test.ts:151`.

**Preuve exigée : identité au rendu, pas au diff.** Le même run produit avant/après, et les deux
artefacts comparés octet à octet (le PNG statique) — un déménagement qui change un pixel n'est pas un
déménagement. C'est la seule tâche de cette tranche dont la preuve est une **régression**, pas une
capacité.

### 3.5 `produce()` dispatche sur `builder`, plus sur `chosen.engine`

Déjà écrit noir sur blanc dans le code (`produce.ts:385-400`) : *« THIS BREAKS the day `scrolly`
enters LOOP_BUILDABLE_ENGINES »*. Aujourd'hui `render({ engine: chosen.engine ?? … })` n'est correct
que par la coïncidence qu'un seul moteur est constructible. Le jour où `scrolly` entre, une option
chart-native en format `scrolly` passerait la garde (builder = `scrolly`, constructible) puis serait
dispatchée vers `chart-native`, dont le manifeste ne déclare pas `scrolly` → `unsupported-format` sur
une forme qu'on vient de promettre constructible.

**Correctif nommé par le code lui-même : dispatcher sur `resolveBuilder(chosen)`.** Il est dans cette
tranche, dans le même commit que l'entrée de `scrolly` dans la table.

---

## 4. Par moteur — ce que chacun demande réellement

Les six ne sont pas six fois le même travail. Mesuré, moteur par moteur, sur ce que déclare son
`validate` :

| moteur | ce que `validate` consomme | travail réel |
|---|---|---|
| `chart-native` | `nativeSpecErrors` — une **spec**, le moteur possède son mapper (`spec-to-config.ts`) | déménagement |
| `map-native` | `mapNativeConfigErrors` — une **config**, aucun mapper spec→config n'existe | **la vraie pièce** |
| `scrolly` | composition : piste chart = `NativeSpec` + beats, piste carte = config map-native | composition |
| `image-native` | `checkImageConformance(ImageStory)`, formats `["scrolly"]` | quasi trivial |
| `dw-chart` | `validateChartSpec` (`ChartSpec`), in-process, hébergé | vocabulaire DW |
| `map-dw` | `validateMapSpec` (`MapSpec`), in-process, `static`/`interactive` | vocabulaire DW |

### 4.1 chart-native — le déménagement

Rien de neuf. §3.4.

### 4.2 map-native — la seule pièce réellement neuve

**L'asymétrie est là.** chart-native valide une **spec** et fait lui-même le chemin spec→config ;
map-native valide une **config** — il n'y a pas de couche spec. L'assembleur de la boucle doit donc
composer la config complète : `type`, `regionKey`, `valueField`, `basemap`, les lignes, et la
furniture (titre, alt, source, unité).

Quatre champs obligatoires, dont **trois tombent d'une seule mesure** :

- **`valueField`** — la colonne numérique que l'angle met en avant. Le profil de `orient` la donne
  déjà (`numericColumns`).
- **`regionKey`** + **`basemap`** — les deux sortent de la **même** correspondance : on essaie chaque
  colonne non numérique contre la clé de jointure de chaque fond de carte livré, et on garde le
  meilleur appariement.
- **`type`** — c'est le `nativeType` que le cerveau a déjà offert et que le journaliste a choisi.

**La correspondance géographique (`GeoMatch`), nouvelle capacité de `orient`.** `OrientResult` gagne
un champ, persisté dans le manifeste comme le reste du profil :

```ts
export type GeoMatch = {
  column: string;      // la colonne de la donnée qui porte les régions
  basemap: string;     // le fond de carte livré contre lequel elle s'apparie
  matched: number;     // combien de lignes se joignent
  total: number;
  unmatched: string[]; // les valeurs qui ne se joignent PAS — montrées, jamais tues
};
```

`unmatched` est le cœur de la décision (b) : une jointure partielle ne devient jamais une carte
trouée en silence. La règle, explicite pour n'être pas réinterprétée : **en dessous de la moitié des
lignes appariées, l'assembleur REFUSE** (ce n'est alors pas une géographie que ce fond de carte
connaît) **en nommant les valeurs orphelines et les fonds disponibles** ; au-dessus, il produit et
les orphelines partent dans l'avertissement porté par le résultat. Dans les deux cas la liste est
**montrée** — jamais tronquée à un compte.

**⚠️ Contrainte matérielle à dire franchement : DEUX fonds de carte sont livrés.**
`skills/map-native/assets/geo/` contient `world.geojson` (jointure `iso_a3`) et `us-states.geojson`
(jointure `postal`) — c'est tout (`basemaps.ts`, `BASEMAPS`). Conséquence directe et non négociable
par du code : **un choroplèthe suisse par canton n'est pas constructible aujourd'hui**, quelle que
soit la qualité de l'assembleur. Le pilote Heidi.news est concerné.

Cette tranche **ne livre pas** de nouveaux fonds de carte : ajouter un fond, c'est une donnée
géographique à sourcer, licencier et créditer, ce qui est un chantier éditorial, pas un assembleur.
Ce qu'elle livre, c'est que le manque soit **dit** : la correspondance échoue en nommant les fonds
disponibles, au lieu de rendre une carte vide. Les fonds cantonaux/communaux sont un item de suivi
nommé (§8).

Les autres types map-native (symbole, locator, route, densité…) ne joignent pas par région mais par
point : `supportsPoint` existe déjà dans `OrientResult`, et l'assembleur lit les colonnes lat/lon.
Même discipline — les lignes non géolocalisables sont nommées.

### 4.3 scrolly — pas un sixième assembleur, une composition

Le manifeste de scrolly le dit déjà : une piste chart **est** une `NativeSpec` chart-native, une
piste carte valide par `mapNativeConfigErrors`. L'assembleur scrolly appelle donc les deux
précédents et pose les beats par-dessus. Il **ne duplique aucune règle** : dupliquer, c'est
exactement ce qui a produit les deux couches geo-prep que la spec-parapluie reproche à la V1.

Un point de contrat repris tel quel du manifeste : sur la piste carte, un `beats` explicite est
**refusé fort** (la piste carte dérive sa propre histoire et l'ignorerait en silence).

C'est ici que se ferme **A34** (§6).

### 4.4 image-native — quasi trivial

Un `ImageStory` : des images, des légendes qui passent **telles quelles** (le moteur ne réécrit
jamais une légende de journaliste), un seul format livré (`scrolly`), un seul type
(`image-scrolly`). L'assembleur est court ; sa seule vraie décision est que les légendes viennent des
beats écrits, pas d'une dérivation.

### 4.5 dw-chart et map-dw — traduire vers le vocabulaire Datawrapper

Les deux sont `in-process` et **hébergés** : la spec part chez Datawrapper, l'artefact revient. Les
mappers existent déjà côté moteur (`chart-spec.ts`, `map-spec.ts`) et sont éprouvés — l'assembleur
traduit le brief vers `ChartSpec` / `MapSpec` et rien de plus.

Deux faits qui bornent le périmètre : `map-dw` ne construit que `static`/`interactive` (les cartes
animées sont à map-native), et son type `symbol` est déclaré `deferred` dans le registre — le
validateur le refuse inconditionnellement. L'assembleur n'essaie pas de le contourner.

Leurs preuves exigent une clé Datawrapper → opt-in (§5.1).

### 4.6 Ordre d'exécution

`chart-native` (déménagement + preuve de régression) → `geo` dans `orient` → `map-native` → `scrolly`
(+ A34) → `image-native` → les deux Datawrapper.

Chaque étape entre dans la table `ASSEMBLERS` **avec sa preuve**, jamais avant : la liste dérivée
signifie qu'ajouter la clé, c'est promettre au cerveau que la forme est offrable sans marque.

---

## 5. Preuves et refus

### 5.1 Une preuve de rendu par moteur, qui part de `produce()`

Six preuves, une par moteur, toutes bâties sur le même patron et rejoignant `bun run proofs` :

- **Elle part de `produce()`**, jamais d'une fixture de spec écrite à la main. Une preuve qui
  assemble sa propre spec prouve un chemin parallèle — c'est exactement ce que l'en-tête
  d'`assembleNativeSpec` reproche déjà à un appelant qui contournerait.
- **Elle porte un contrôle positif.** Pas seulement « ça n'a pas refusé » : l'artefact réel est
  ouvert et mesuré (le crédit rendu, la région peinte, le pas de scrolly présent). Un refus qu'aucun
  run n'exécute est une intention, pas un comportement — et un vert qui ne mesure rien est la classe
  de faux vert que cette couche existe pour tuer.
- **Quatre des six exigent des clés** (MapTiler pour map-native/scrolly, Datawrapper pour les deux
  DW) → opt-in, derrière leur porte d'environnement, dans `bun run proofs`.
- **Chacune embarque le test de validité de fixture toujours actif** — la garde à 3,5 ms introduite
  par la tranche `feat/proofs-run` : la fixture passe au validateur réel dans `bun run check`, sans
  navigateur ni réseau. C'est ce qui empêche ces six preuves de pourrir en silence comme les quatre
  précédentes.

### 5.2 Les refus

Un assembleur refuse quand la donnée ne porte pas ce que le moteur exige, et **nomme ce qui manque**
dans les mots du journaliste : quelles valeurs ne se joignent pas, quelle colonne manque, quel fond
de carte est disponible. Jamais « invalid config ».

Côté offre, rien de neuf à construire : le cerveau **marque** déjà une forme non constructible via
`isLoopBuildable`/`withMarks`, et cette liste étant désormais dérivée de la table, les marques
disparaissent d'elles-mêmes au fur et à mesure que les assembleurs entrent. La phrase de refus
(`unbuildableEngineReason`) reste, pour le cas où un moteur ne serait pas encore dans la table.

**Ce que ces refus ne couvrent PAS, dit franchement** : un assembleur valide la *forme* de ce qu'il
compose ; il ne juge pas l'*à-propos éditorial* du visuel. Une carte correctement jointe sur une
donnée qui ne mérite pas une carte passe. C'est le travail du cerveau proposeur, pas d'un assembleur.

---

## 6. Dépendances nommées que cette tranche doit fermer

**A34 — la capture d'un scrolly crope sur sa bannière** (`docs/splash/residuals.md`). Mesuré en
direct : le sélecteur de repli `#root > div` résout un élément de **454 × 63 px** — la bannière de
titre, pas la page — parce que `skills/scrolly/src/Scrolly.tsx:588` retourne un fragment sans racine.
Toute la chaîne `capture → review → approve` mesurerait un fragment. C'est **latent** aujourd'hui
uniquement parce que `scrolly` n'est pas constructible : cette tranche le rend vivant, donc elle le
ferme, avec l'A/B au rendu qui prouve que le collage `position: sticky` n'a pas bougé.

**Le câblage de `draft-beats`.** `manifest.ts:528` le note : `draft-beats` n'est pas atteignable
aujourd'hui parce que la branche article est hors de `LOOP_BUILDABLE_ENGINES`. Elle y entre ici → le
`NextAction` doit être atteignable et exercé par la preuve scrolly.

**Ordre avec le résidu A21 (`sourceKind`).** A21 fait émettre `sourceKind` par `assembleNativeSpec` ;
cette tranche déménage `assembleNativeSpec`. Les deux touchent la même fonction. **A21 passe en
premier** (sa moitié `lib/loop` est d'une ligne, sa masse est sous `skills/`), et le déménagement le
transporte tel quel.

---

## 7. Hors périmètre — nommé pour ne pas y glisser

- **Le retrait de la V1** (`skills/splash/SKILL.md`, `produce-all.mjs`). Décision (c).
- **Les résidus déjà documentés** hors A34 et A21 : ils ont leur registre et leur tranche.
- **Les beats de map-scrolly et d'image-native** : la seconde moitié de la branche article, qui
  dépend de cette tranche et la suit.
- **De nouveaux fonds de carte** (§4.2) : chantier éditorial de données, pas un assembleur.
- **De nouveaux types** : cette tranche câble ce que les moteurs savent déjà rendre, elle n'élargit
  aucune grille.

---

## 8. Risques assumés

- **La géographie livrée reste `world` + `us-states`.** L'assembleur map-native sera correct et la
  carte suisse restera impossible. Le risque n'est pas technique, il est de lecture : « map-native
  est constructible » pourrait se comprendre comme « toutes les cartes le sont ». La phrase de refus
  doit donc nommer les fonds disponibles, et cette spec le dit deux fois exprès. **Suivi nommé :
  fonds cantonaux/communaux suisses pour le pilote Heidi.news.**
- **Six moteurs, six preuves, quatre derrière une clé.** L'exécution complète de `bun run proofs`
  s'allonge et exige plus d'infrastructure (MapTiler, Datawrapper, un navigateur headless). Rien ne
  la lance automatiquement — c'est le compromis déjà assumé par la tranche `feat/proofs-run`, et
  cette tranche l'aggrave d'un facteur deux.
- **A34 peut coûter plus qu'un `data-splash-root`.** Le résidu mesure que les deux issues évidentes
  échouent chacune (une `<div>` déplace le contexte de collage ; `display: contents` rend un rect à
  zéro). Si l'A/B au rendu montre un décalage, la tâche grossit — elle ne se contourne pas en
  élargissant la tolérance du crop.
- **La table dérivée rend l'ajout d'un moteur silencieusement puissant.** Ajouter une clé à
  `ASSEMBLERS`, c'est promettre au cerveau qu'il peut offrir la forme sans marque. C'est le but ;
  c'est aussi une ligne dont la portée dépasse ce qu'elle a l'air. La règle « une clé n'entre
  qu'avec sa preuve » (§4.6) est ce qui la tient.
