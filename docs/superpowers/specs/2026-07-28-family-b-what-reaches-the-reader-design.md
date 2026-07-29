# Spec — Ce qui arrive au lecteur est faux (sous-projet B du registre de sweep)

> **Statut :** conçu, non implémenté.
> **Origine :** `docs/splash/sweep-2026-07-28-triage.md` — famille B du § 8.
> **Dépend de :** `docs/superpowers/specs/2026-07-28-refusals-that-bite-design.md` (famille A). Voir § 2.
> **Langue :** prose FR, identifiants et code en anglais (standard non négociable).

---

## 1. Le motif : neuf défauts, un seul geste manquant

Les neuf défauts de cette famille ne sont pas des bugs de rendu. Chacun est un **écart entre ce que
le journaliste a décidé et ce que le lecteur reçoit** — une langue, un titre, une source, une
couleur, une unité. Chacune de ces choses a été confirmée quelque part.

| défaut | prévalence |
|---|---|
| D17 — ledger source-fidelity : faux négatifs, puis contournement silencieux | 19 / 83 |
| D16 — le titre livré ne porte qu'une partie du takeaway confirmé | 13 / 83 |
| D12 — la langue retombe en anglais, ou fuit d'une langue à l'autre | 8 / 83 |
| D18 — l'URL de source fournie par le journaliste est perdue | 7 / 83 |
| D26 — la couleur annoncée n'est pas la couleur rendue | 5 / 83 |
| D10 · D25 · D28 · D29 | 4 / 83 chacun |

### Le motif commun, et il est plus net qu'un « fil coupé »

Pour chacun de ces neuf défauts, **le dernier segment du trajet n'a pas de propriétaire.** Personne
ne possède le pas qui va de « la décision est enregistrée » à « le lecteur la voit ». Ce segment
orphelin prend exactement trois formes, et les neuf défauts s'y rangent sans reste :

1. **La décision n'a aucun porteur.** Elle n'est écrite nulle part, alors que ses consommateurs sont
   construits et attendent. — D12, D18.
2. **Le porteur arrive et personne ne le consomme.** La valeur atteint le renderer, qui la range
   ailleurs que sous les yeux du lecteur. — D25, D28, D29, et une moitié de D26.
3. **Deux porteurs pour une seule décision, jamais rapprochés.** Les deux valeurs sont « correctes »
   chacune dans sa couche, et aucune couche ne les compare. — D16, D17, l'autre moitié de D26.

### La propriété qui les unit vraiment : **cette famille est celle des gardes verts**

C'est le constat le plus utile de la lecture, et il est mesurable. La famille A regroupe des gardes
qui passent au **rouge** et qu'on ignore. La famille B regroupe des gardes qui **ne peuvent pas
passer au rouge** — affamés, illisibles, ou tautologiques. Vérifié un par un :

| garde | fichier | pourquoi il est vert |
|---|---|---|
| gate i18n de la furniture | `skills/chart-native/scripts/lib/furniture-i18n.mjs:68` + `:40-42` | `furnitureGateApplies(lang)` = `sourceLabel(lang) !== sourceLabel("en")` → **false pour `undefined`**. Verrouillé par `skills/chart-native/tests/furniture-i18n-check.test.ts:32-36`. Le feed (`snap-contrast.mjs:73-77`) lit `config.lang`, que la boucle n'écrit jamais. |
| `assertLocalizedSourceMetadata` (DW) | `lib/core/i18n-furniture.ts:64-66` | `if (!label \|\| label === SOURCE_LABELS.en) return [];` — même famine. `lib/loop/assemble/dw-chart.ts:53-55` garantit l'absence de `lang`. |
| test i18n « hérité » | `lib/core/i18n-furniture.test.ts:82-83`, `:116-118` | compare `core.SOURCE_LABELS` à sa **propre ré-export** (`skills/dw-chart/src/furniture-i18n.ts:1`). Égalité vraie par construction. |
| alerte CVD maison | `skills/chart-native/scripts/produce.mjs:172-176` | écrit `brand-concerns.json` — **zéro lecteur** dans tout le dépôt. Le stdout jumeau est capturé puis jeté (`lib/core/verbs/exec.ts:47-56` : `stdout` n'est lu que dans le `catch`). |
| unité sur un label visible | `skills/map-native/src/conformance.ts:266-269` | la règle existe, mais `labelHasUnit` n'est posé par personne (5 occurrences, 3 en test) et `checkSymbolConformance` **n'est appelé nulle part en production**. Tri-état : `undefined` passe. |
| divergence titre↔takeaway | `lib/verify/taste.ts:288-307` | consultatif **par type** — `lib/verify/approval.ts:154-158` : « blocking on a RISK would make it noise ». |
| critère `colour-semantics` | `lib/verify/types.ts:26`, `lib/verify/severity.ts:34` | déclaré, sévérité posée, **zéro émetteur** dans `lib/verify/review.ts`. |
| provenance de la chaîne | `skills/splash/src/producer-spec.ts:105-108` | hache la spec **PRE-merge** *by design* — « NOT the profile-merged spec actually dispatched to the producer ». Compare l'accepté à l'accepté. |
| décision `source-fidelity` | `skills/splash/src/flow-decisions.ts:87`, `:154-171` | `required: false` → simple warning ; et le gate vérifie seulement qu'un `id` figure dans `decisions.jsonl` — il **ne rejoue jamais** `artifactCheck`. |

Neuf gardes, neuf verts, zéro information. Le journaliste n'apprend rien parce qu'aucun des
mécanismes construits pour l'en informer n'a de quoi se déclencher.

---

## 2. Pourquoi la famille A ne suffit pas — et ce que ça impose à l'ordre

La famille A rend les refus **terminaux**. C'est nécessaire et ça ne referme rien ici : **rendre
terminal un garde qui ne peut pas rougir est un no-op.** Un `existsSync` qui échoue arrête un
parcours ; un `return []` qui n'échoue jamais n'arrête rien, quelle que soit la force qu'on donne à
son verdict.

L'ordre qui en découle, et il n'est pas « B après A » au sens simple :

- **Ce que B doit faire pour que A serve à quelque chose ici** : donner à ces neuf gardes de quoi
  varier — un porteur là où il manque, un lecteur là où l'artefact est orphelin, une comparaison là
  où deux valeurs coexistent. C'est du travail que B peut faire seule, sans A.
- **Ce que B ne peut pas livrer seule** : la seconde moitié de D17 (le refus terminal, § 4.1), et le
  moment forcé où un signalement s'impose au journaliste dans la chaîne en prose (D16, § 4.2). Les
  deux sont des **arrêts**, donc de la famille A.

Dit franchement : **tant que A n'est pas faite, tout ce que B ajoute reste consultatif.** Un
signalement que personne n'est obligé de lire, un écart mesuré que rien n'empêche d'expédier. B rend
les gardes capables de dire quelque chose ; A rend ce qu'ils disent contraignant.

---

## 3. Les trois formes, mesurées

### 3.1 Forme 1 — la décision n'a aucun porteur

#### D12 — la langue

Vérifié : **il n'existe aucune détection de langue dans le dépôt.** `grep -rniE
"detectLang|detectLanguage|franc|langdetect|articleLang|sessionLang"` sur `lib/ skills/ scripts/
commands/` ne ramène aucun hit de code. Aucune dépendance de détection dans `package.json`.

Le seul endroit où le mot « détection » apparaît est une instruction de prompt :
`skills/suggest-chart/SKILL.md:29-47` — « in the language of the article **(detected upstream)** ».
Rien, en amont, ne détecte.

Et `lib/core/production-brief.ts` **ne porte aucun champ `lang`** — la boucle le déclare
elle-même, `lib/loop/produce.ts:210-213` :

> `// No lang: the loop carries no language axis yet (the manifest has no locale, and produce`
> `// sets no NativeSpec.lang either, so the engine already renders English furniture).`

**Tout l'aval est câblé et affamé** :

- `lib/core/locale.ts:52-57` — table `LOCALES` fr/de/it/en (séparateurs + `Source :` / `Quelle:` /
  `Fonte:` / `Source:`), `sourceLabel(lang)` à `:139-141`, `formatLocaleNumber` à `:96-105`.
- Consommateurs prêts : `skills/chart-native/src/core/ChartFrame.tsx:149`,
  `skills/map-native/src/core/MapFrame.tsx:191`, `skills/scrolly/src/Scrolly.tsx:781`,
  `lib/source/furniture.ts:99`.
- Datawrapper : `dwLocale` (`skills/dw-chart/src/spec-to-metadata.ts:476-488`) mappe sept langues et
  n'est jamais appelé sur le chemin boucle.
- Le questionnaire de source est **déjà localisé en quatre langues**
  (`lib/newsroom/ui-copy.ts:109-114`, `sourceQuestionCopy`).
- Et l'asymétrie qui rend le trou visible : **la livraison porte une langue, la production non.**
  `lib/delivery/metadata.ts:83` pose `lang: profile.lang?.trim() || "en"` et
  `lib/delivery/adapters/zip.ts:58` en dérive un README français — autour d'un visuel dont la
  furniture est anglaise, parce que `produce()` a décliné le champ que `deliver()` a honoré.

**Deuxième moitié de D12, distincte et non nommée par le registre : l'axe de langue est binaire là
où il devrait être quaternaire.** `isFrench` (`lib/core/locale.ts:72-74`) est un helper booléen, et
c'est la racine de toutes les fuites `de`/`it` → anglais :

| site | ligne | ce qui fuit |
|---|---|---|
| `skills/scrolly/src/chapters.ts:64`, `:118-127` | `const fr = isFrench(meta.lang)` | `"the highest of the N shown"` sur un scrolly italien — alors que le commentaire `:116-117` affirme l'inverse |
| `skills/map-native/src/map-story.ts:382-405` | `autoTakeaway` | `"a ${ratio}-fold gap"` en allemand |
| `skills/chart-native/src/chart-story.ts:467-480` | `const fr = isFrench(spec.lang)` | `"The lowest — …"` en italien |
| `skills/map-native/src/cartogram-story.ts:70-79` | aucun `lang` du tout | `"the highest"` **en français aussi** |
| `lib/core/locale.ts:196-207` | `labelWithUnit`, `isFrench` binaire | `"70%"` en allemand, là où `unitSuffix` (`:172`) gère `de` correctement — deux helpers du même fichier en désaccord sur l'allemand |

> **⚠️ Le registre nomme le mauvais fichier.** Il attribue le superlatif fr/en à
> `deriveSymbolStory`/`chapters.ts` de `skills/map-native`. Vérifié : `symbol-story.ts:34-140` ne
> contient **aucun** superlatif ni branche fr/en (sa seule localisation est le nombre, `:45-46`).
> Le site réel est `skills/scrolly/src/chapters.ts:118-127`. Corrigé ici.

#### D18 — l'URL du journaliste

Le porteur manque au **premier** hop, pas au dernier. `sourceHint` est documenté comme ne capturant
que ce que **l'article** a nommé — `skills/splash/SKILL.md:715-716` et
`skills/splash/src/source-guard.ts:53-56`. **Aucun champ n'enregistre la réponse du journaliste** à
la question de source (CADRAGE Q4 / Gate 2c, `SKILL.md:265-299`) : elle est recomposée à la main
dans `spec.source` par l'orchestrateur.

Conséquence directe et vérifiée : le garde est **structurellement aveugle au cas de D18**.
`skills/splash/src/source-guard.ts:152` :

```ts
if (typeof shippedUrlRaw !== "string" || !shippedUrlRaw.trim()) return null; // name-only ship
```

Une URL **divergente** est attrapée ; une URL **disparue** passe. C'est littéralement le mode
d'échec du sweep (« URL fournie deux fois, `source` livré sans elle »). Le filet secondaire,
`droppedSourceHintWarning` (`source-guard.ts:175-194`), est non bloquant et ne regarde que le *nom*.

Deux hops de perte supplémentaires, vérifiés au rendu :

- `skills/chart-native/src/core/ChartFrame.tsx:233-244` rend un lien sur le chemin interactif ;
  `:302` (statique) rend `{srcLabel} {source.name}` — **l'URL n'est pas imprimée, même en texte**.
- `skills/dw-chart/src/spec-to-metadata.ts:534-540` : `"source-url"` n'est renseigné que si
  `usesNativeSourceCaption(spec.lang)`, vrai **seulement pour l'anglais ou l'absence de langue**.
  Pour fr/de/it, la source part en `annotate.notes` composée nom-seul (`:464-471`) — **perte d'URL
  déterministe sur tout livrable Datawrapper non anglais**. D12 et D18 sont le même bug ici.

### 3.2 Forme 2 — le porteur arrive, personne ne le consomme

- **D25.** `brand-concerns.json` est écrit (`skills/chart-native/scripts/produce.mjs:172-176`,
  concern minté à `skills/chart-native/src/core/conformance.ts:138-141`), listé par nom dans
  l'allowlist de suppression (`lib/host/path-safety.ts:77`), et **ouvert par rien**.
  `skills/splash/SKILL.md:342` affirme pourtant que l'escalade existe. `review-gate.mjs:33-47` ne
  lit que `report.json` et les probes tapées à la main ; `references/render-review.md:80-146` n'a
  **aucun critère couleur**.
- **D28.** `skills/chart-native/src/SlopeChart.tsx:102` — `const fmtVal = (v: number) =>
  Number(v).toFixed(1)` ; idem `:244-245`, `:248`, et `:293` (`const fmt = (v) => v.toFixed(1)`,
  qui peint les labels SVG à `:302`, `:409`, `:427`, `:486`). Or `config.lang` **est là**,
  `SlopeChart.tsx:45-46`, et n'est threadé qu'à `ChartFrame` pour le label de source (`:196`).
  L'import à `:33` est `import type { Lang }` — type seul, aucune fonction de locale importée.
- **D29.** L'unité atteint le lecteur sur **un seul chemin chart-native** :
  `skills/chart-native/src/BarChart.tsx:102`, et seulement quand `embedded` est vrai — le
  commentaire `:98-101` le pose en décision assumée (« the standalone renders keep bare numbers —
  their frame states the unit once in the subtitle »). Partout ailleurs l'unité va au sous-titre du
  cadre, au tooltip, ou à un `aria-label` qui vaut **`undefined` sur un rendu statique**
  (`DivergingBarChart.tsx:253` — label visible `:285` `{signed(b.value)}`, soit exactement les
  « +218 / −99 » du sweep). Et le garde générique demande une question plus faible : `lib/verify/
  capture.ts:546-560` vérifie que la chaîne d'unité **existe quelque part** dans le DOM — un
  sous-titre suffit à le satisfaire.
- **Moitié « annonce » de D26.** `skills/splash/src/brand-profile.ts:466-468` estampille
  `baseColor` + `brandExplicit: true` sur **toute** spec `chart-native` — `colourKind`
  (`:409-423`) ne discrimine aucun `nativeType`. Onze types la rangent en furniture
  (`skills/chart-native/src/spec-to-config.ts:318, 340, 364, 522, 562, 603, 626, 669, 813, 834,
  937`) et peignent depuis une constante gelée (`WaterfallChart.tsx:247` →
  `core/tokens.ts:152-157`). Le commentaire de `WaterfallChart.tsx:55-59` explique **pourquoi**
  c'est correct au rendu — et personne ne le dit au journaliste.

### 3.3 Forme 3 — deux porteurs, jamais rapprochés

- **D16.** Dans la boucle V2, le titre **est** le takeaway, copié octet pour octet par les six
  assembleurs (`lib/loop/assemble/chart-native.ts:20`, `dw-chart.ts:32`, `image-native.ts:62`,
  `map-dw.ts:162`, `map-native.ts:169` et `:256`). D16 ne peut donc **pas naître dans la V2** — le
  design doc de taste le concède déjà (`docs/superpowers/specs/2026-07-27-taste-fires-design.md:386`).
  Dans la chaîne en prose, `spec.title` et `confirmedTakeaway` sont deux champs JSON indépendants
  écrits par le modèle (`skills/splash/SKILL.md:705-712`), et **aucun code ne les compare** — le
  seul contrôle mécanique est une présence (`guardrail-parity.ts:87-88`). La règle existe en prose
  (`SKILL.md:1185`, `:832-837`) et `skills/splash/src/review-gate.ts` ne lit jamais
  `confirmedTakeaway`.
- **D17.** La comparaison existe, et elle est fausse. `skills/splash/src/flow-decisions.ts:95-116`,
  `artifactCheck` : `haystack = String(payload.article).toLowerCase()` puis
  `haystack.includes(name.trim().toLowerCase())`. **Deux opérations de normalisation en tout** :
  `toLowerCase` et `trim`. Ni NFC/NFD, ni pliage d'accents, ni lemmatisation, ni tokenisation. Le
  côté URL est plus clément (match sur l'**hôte** canonique, `:103-104`) ; le côté nom n'a aucun
  équivalent — **cette asymétrie est le défaut**.
- **D26, moitié « rendu ».** `skills/chart-native/scripts/produce.mjs:165` copie la config
  post-merge, telle que rendue, dans `<outDir>/config.json`. `accepted.json` porte la spec
  pre-merge. `assertChainProvenance` (`skills/splash/src/render-provenance.ts:223-235`) compare
  l'un à l'autre… non : il compare `accepted.json` à son propre hash. Les deux valeurs sont
  « correctes » chacune dans sa couche et aucune couche ne les rapproche. Un diff JSON à zéro pixel
  est disponible et n'est pas pris. Côté V2, `lib/verify/capture.ts:439-461` récolte les
  `markColours` **du rendu vivant** et `lib/verify/taste.ts:266-284` ne s'en sert que pour
  l'adjacence deux à deux — jamais comparés à `baseColor` (grep `baseColor` dans `lib/verify/` : rien).

---

## 4. Les décisions déjà prises (Rémy, 2026-07-29)

Quatre arbitrages sont tranchés. La raison est gravée à côté de chacun, pour qu'un lecteur futur
sache que c'était un choix et non un défaut de conception.

### 4.1 D17 — assouplir la comparaison D'ABORD, rendre son refus terminal ENSUITE

**L'ordre est la décision.** Rendre terminal un contrôle qui se trompe transformerait 19 faux
positifs en 19 blocages. *Le contournement existe parce que le contrôle avait tort* — les cinq cas
où la décision n'a jamais été enregistrée (`sweep-2026-07-28-triage.md:245-249`) sont la
conséquence, pas la cause.

**« Assouplir » est typé, pas permissif.** Deux notions distinctes, à ne pas mélanger :

- **Accents, casse et déclinaisons relèvent de la NORMALISATION.** « Bundesamt für Statistik » et
  « Bundesamtes für Statistik » sont la même source. Le pliage d'accents existe déjà dans le dépôt
  et n'est donc pas une invention : `skills/chart-native/src/core/conformance.ts:238-241`,
  `deaccent(s) = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`. On reconnaît des formes
  légitimes de la **même** chaîne ; on ne baisse pas la barre.
- **Une source citée par NOM sans URL n'est pas défaillante : c'est une CLASSE.** `lib/source` la
  modélise déjà et la spec de politique de source l'a tranché
  (`docs/superpowers/specs/2026-07-26-source-policy-design.md`, D1-D2). La table par classe,
  `lib/source/requirements.ts:49-104`, dit exactement ceci : `public.url = "required"` (`:52`),
  **`local.url = "optional"`** (`:61`), **`prose.url = "optional"`** (`:88`), `private`/`synthetic`/
  `none` → `"forbidden"`. Le nom seul est un état pleinement légal pour trois classes sur six. Il
  faut **s'appuyer sur cette table**, pas inventer une seconde notion de « source acceptable ».
  Le vocabulaire de classe est déjà importable sans zod par construction
  (`lib/source/vocabulary.ts:1-12`), et `ProductionBrief.sourceKind` le porte déjà
  (`lib/core/production-brief.ts:64`, renseigné depuis le verdict à `lib/loop/produce.ts:253`).

**La seconde moitié appartient à la famille A.** Rendre le refus terminal, c'est un arrêt — et B ne
peut pas la livrer seule. Aujourd'hui la décision `source-fidelity` est `required: false`
(`flow-decisions.ts:87`), et le gate ne rejoue jamais `artifactCheck` : il lui suffit qu'un `id`
figure dans `decisions.jsonl` (`flow-decisions.ts:154-171`), un fichier JSONL sans hash ni signature
(`save-decision.mjs:36`) — alors même que la signature d'artefact, elle, utilise de la vraie
cryptographie (`skills/splash/scripts/sign-artifact.mjs:16-18`). B corrige le contrôle ; A décide de
ce qui arrive quand il refuse.

### 4.2 D16 — SIGNALER, ne pas bloquer

**Splash livre**, et **dit clairement** que le titre ne porte qu'une partie du takeaway confirmé,
en montrant **les deux côte à côte**. Le journaliste tranche. *Raison : un titre court est parfois
le bon choix éditorial — 13 cas sur 83, ce serait 13 blocages sur une décision qui appartient au
journaliste, pas à l'outil.*

**Conséquence à écrire honnêtement : un signalement lu en diagonale ne change rien.** La décision ne
tient que si le signalement est difficile à ignorer, donc la spec doit dire **où** il apparaît et
**à quel moment** — pas seulement qu'il existe. Ce que la mesure impose :

- **Le moment est celui où le journaliste doit agir**, pas un rapport annexe. Dans la boucle, ce
  moment existe et porte déjà un canal : `lib/verify/approval.ts:154-158` transporte
  `needsHumanEye: review.tasteRisk` jusqu'à l'invite d'approbation, précisément pour ce genre de
  signal. Y afficher les deux chaînes n'est pas une invention.
- **La forme est la juxtaposition, pas le score.** Le takeaway confirmé et le titre rendu, l'un sous
  l'autre. Un pourcentage de recouvrement n'est pas lisible et invite à discuter la métrique plutôt
  que le titre.
- **Le contrôle actuel ne peut pas porter ce signal tel quel.** `lib/verify/taste.ts:288-307` mesure
  un **recouvrement** contre un plancher de 0,3 (`:31`) : il détecte une *divergence*, pas une
  *couverture partielle* ni un *dépassement*. « La moitié du takeaway » partage largement plus de
  30 % de ses mots avec le tout ; « 9 ans biennaux » → « décennie après décennie » **ajoute** des
  mots sans en retirer. Les deux formes mesurées par le sweep passent sous le seuil actuel.
- **Dans la chaîne en prose, aucun moment forcé n'existe** — le signalement y dépendrait du même
  acteur qui a écrit le titre. C'est une dépendance famille A, pas un manque de B.

### 4.3 D25 — SIGNALER **ET PROPOSER**, pour la couleur maison

Une couleur maison non-CVD-safe est **livrée** — *c'est la charte de la rédaction, ce n'est pas à
l'outil de la refuser*. Mais elle est **annoncée comme telle**, et splash **propose la teinte
accessible la plus proche**. *Raison : signaler seul ne suffit pas — il faut offrir la sortie, sinon
on informe le journaliste d'un problème qu'on le laisse sans moyen de résoudre.*

Ce qui existe déjà pour tenir cette décision, vérifié :

- **L'alerte** : `brand-concerns.json` (`produce.mjs:172-176`), fondée sur `isOkabeIto`
  (`skills/chart-native/src/core/conformance.ts:31-33`) et sur le jeu gelé `:19-27`. Il manque un
  **lecteur**, pas un détecteur.
- **La proposition de teinte** : `lib/core/house-ramp.ts:62` `hexToOklch` et `:76` `oklchToHex`
  donnent l'espace perceptuel où « la plus proche » a un sens. Aucune fonction de distance
  couleur n'existe aujourd'hui (grep `deltaE|nearest|closestColor|colorDistance` : aucun hit hors
  tests) — c'est la pièce neuve, et elle est petite.
- **Le canal d'annonce** : `lib/verify/types.ts:26` déclare déjà le critère `"colour-semantics"`
  avec sa sévérité (`lib/verify/severity.ts:34`) et **aucun émetteur**. L'emplacement est réservé.

### 4.4 D26 — l'écart annoncé ≠ rendu est un **bug pur**, à corriger à la cause

Pas d'arbitrage : **ce qui est annoncé doit être ce qui sort.** Et la consigne est de chercher la
cause plutôt que de la contourner. La lecture donne la cause, et elle est en amont du rendu :

`skills/splash/src/brand-profile.ts:409-423` — `colourKind` renvoie `"chart"` pour **tout**
producteur `chart-native`, sans regarder `nativeType`. Onze types ne peuvent structurellement pas
peindre avec un `baseColor` (§ 3.2), et l'annonce est faite quand même — `suggest-chart/SKILL.md:313-318`
impose au modèle d'émettre `baseColor` sur **chaque** spec, et `skills/splash/SKILL.md:339-340`
affirme qu'un `baseColorExplicit` « **wins** », ce qui est faux pour 11 types sur 27.

Corriger à la cause, c'est donc rendre la connaissance « ce type honore-t-il `baseColor` sur ses
marques ? » disponible **au moment où la couleur est annoncée**, et non la découvrir au rendu. Le
fait est déjà écrit onze fois dans le code, en commentaire (`spec-to-config.ts:937-939` et ses dix
jumeaux) : il est constaté, jamais interrogeable.

**Un contournement à ne pas prendre, nommé pour qu'on ne le prenne pas** : élargir la tolérance du
contrôle de couleur, ou comparer les pixels *après coup*. `lib/verify/capture.ts:439-461` récolte
déjà les `markColours` du rendu vivant — c'est une vérification utile, mais elle constate l'écart
au lieu de l'empêcher, et elle arrive après que le journaliste a confirmé.

**Effet de bord vérifié, à ne pas perdre** : parce que le garde reçoit la constante de rôle et non
`cfg.baseColor` (`skills/chart-native/src/core/produce-conformance.ts:665-677`), **aucun
`brand-concerns.json` n'est écrit pour la couleur maison sur ces 11 types**. D25 et D26 portent donc
sur des ensembles de types **disjoints** — le registre les regroupe sous « couleur », ils ne se
recouvrent pas. En sens inverse, `checkMarkContrastOnBg` (`produce-conformance.ts:284-287`) peut
émettre une préoccupation de contraste sur une couleur que le waterfall ne peint jamais : une
fausse alerte, dans un fichier que personne ne lit.

---

## 5. Hors périmètre, dit explicitement

- **Les familles A, C et D** du registre. B en dépend pour la terminaison (§ 2) ; elle ne les traite pas.
- **Tout nouveau garde-fou de détection.** Comme pour A : la détection existe. Ce qui manque est un
  porteur, un lecteur, ou une comparaison.
- **La traduction.** Splash ne traduit rien et ne le fera pas ici. Porter la langue, ce n'est pas
  produire du texte dans cette langue : c'est choisir la bonne ligne dans les tables déjà écrites
  (`lib/core/locale.ts:52-57`, `lib/newsroom/ui-copy.ts:109-114`) et cesser de retomber sur `en`.
- **L'élargissement des tables de langue au-delà de fr/de/it/en.** Les tables couvrent quatre
  langues, `dwLocale` en mappe sept, `Lang = string` (`lib/core/locale.ts:27`) n'en contraint
  aucune. Aligner ces trois-là est un chantier de vocabulaire, pas de plomberie — § 7.
- **Le retrait de la chaîne en prose.** Décision (c) de la spec des assembleurs, inchangée.
- **De nouveaux fonds de carte, de nouveaux types, de nouvelles capacités.** B ne fait arriver au
  lecteur que ce que le journaliste a déjà décidé.
- **D10 tel que le registre le classe.** Voir § 8 : sa garde est *déjà* terminale dans la V1
  (`skills/splash/src/validate-gate.ts:615-616`, poussée en `extraErrors` avant tout producteur).
  Quatre cas signifient qu'elle a été contournée ou jamais atteinte — c'est un symptôme de famille A.
  Ce qui reste à B est **une seule chose** : les deux listes de placeholders divergent (§ 7).

---

## 6. Décisions qui appartiennent à Rémy

Six questions que cette spec **pose et ne tranche pas**. Chacune avec ses options et la conséquence
mesurée de chaque option.

### Q1 — D'où vient la langue ?

Il n'existe rien. Trois sources possibles, exclusives ou combinables :

| option | conséquence mesurée |
|---|---|
| **Détecter depuis l'article** | ajoute une dépendance de détection (aucune aujourd'hui dans `package.json`) et une classe d'erreur neuve : une détection fausse produit un livrable faux **sans que personne l'ait décidé** — exactement le motif de la famille B, reproduit. |
| **Demander au journaliste** | une question de plus dans CADRAGE, où le plafond de 6 questions est **déjà dépassé** (D20, 9 / 83, jusqu'à 7 posées). Mais c'est la seule option où la langue est *confirmée* plutôt que devinée, et le questionnaire de source montre que le canal existe (`lib/newsroom/ui-copy.ts:109-114`). |
| **Prendre celle du profil maison** | zéro question ajoutée, et le sweep a mesuré son mode d'échec : `gen-geo-point-magnitude-social-feed-en-static-themed` — la langue par défaut du profil a **écrasé la langue anglaise confirmée**. `lib/newsroom/language.ts:23-33` `resolveLanguage` modélise déjà l'axe `{ui, content}` avec priorité `override > uiLang > profileLang` : la structure pour une combinaison existe, la politique de priorité est à décider. |

### Q2 — Que fait splash pour une cinquième langue ?

Les tables couvrent fr/de/it/en (`lib/core/locale.ts:52-57`) ; `dwLocale` en mappe sept
(`spec-to-metadata.ts:478-486`) ; `Lang` est un `string` nu. Un livrable espagnol prend donc
aujourd'hui les nombres espagnols de Datawrapper sous un `Source:` anglais littéral. **Refuser la
langue non couverte** (honnête, ferme une capacité), ou **livrer avec une furniture anglaise en le
disant** (ouvert, mais c'est un livrable mixte assumé) ?

### Q3 — L'unité sur chaque label, ou une fois dans le sous-titre ?

D29 (4 / 83) contredit une décision **déjà prise et écrite dans le code** :
`skills/chart-native/src/BarChart.tsx:98-101` — « the standalone static/video/interactive renders
keep bare numbers — their frame states the unit once in the subtitle ». Ou bien cette décision est à
renverser (l'unité sur chaque valeur visible : plus lisible hors contexte, plus encombrée, et
`labelWithUnit` n'a **aucun appelant chart-native** aujourd'hui — 30 composants à toucher), ou bien
c'est le constat du sweep qui est mal calibré et D29 se réduit aux cas où l'unité n'atteint
**vraiment** rien (dw-chart, dot-density, route, locator — où elle est droppée à l'assemblage :
`lib/loop/assemble/dw-chart.ts:59-61`, `map-native.ts:210-222`, `:272`, `:284-291`).

### Q4 — D28 : une ligne, ou la classe de 21 ?

Le registre annonce « correctif d'une ligne ». Mesuré : `SlopeChart.tsx:102` est **le symptôme
nommé**, et il y a **21 sites visibles aveugles à la locale** sur 28 (13 chart-native, 8
map-native). Huit d'entre eux (`cartogram-story.ts`, `hex-grid-story.ts`, `dot-density-story.ts` et
leurs six composants) **n'importent aucun helper de locale**. Corriger le slope seul livre un chart
français correct et laisse un cartogramme français en `.` décimal ; corriger la classe est un
chantier de 21 sites sans difficulté conceptuelle mais avec 21 preuves au rendu.

### Q5 — Quelle chaîne B répare-t-elle ?

Les neuf défauts ne se répartissent pas également entre la prose et la boucle, et le registre ne le
distingue pas :

| défaut | chaîne en prose | boucle V2 |
|---|---|---|
| D16 | **le défaut y vit** (deux champs indépendants) | impossible par construction (titre := takeaway) |
| D17 · D18 · D10 | **le défaut y vit** | déjà fermé, par un mécanisme **différent** (déclaration + table de classes, jamais un match de sous-chaîne) |
| D12 | cassé (profil seulement) | cassé, **et déclaré** (`produce.ts:210-213`) |
| D25 · D26 · D28 · D29 | cassé | cassé (moteurs partagés) |

Réparer la prose, c'est traiter 39 des 68 occurrences là où elles ont été mesurées, sur une chaîne
que la spec des assembleurs prévoit de retirer un jour. Faire descendre ces garanties dans la
boucle, c'est le modèle « peau et socle » qu'a choisi la famille A — et cela laisse la prose
défaillante tant qu'elle tourne. **C'est la même décision que celle de la famille A, reposée sur
un autre lot de défauts.**

### Q6 — Quelle liste de placeholders fait foi ?

Deux implémentations divergentes, toutes deux terminales, chacune laissant passer ce que l'autre
rejette :

- V1, `skills/splash/src/source-guard.ts:14-15` — TLDs `example`/`test`/`invalid`/`localhost` +
  domaines `example.com|org|net`.
- V2, `lib/core/contract.ts:66` — `/(^|\.)(localhost|example|invalid|placeholder|todo)(\.|$)/i`.

Donc `https://data.test/x` passe la politique V2 et échoue le garde V1 ; `https://todo.com/x` fait
l'inverse. Unifier est nécessaire ; **dans quel sens** est un arbitrage (le plus strict bloque des
URL légitimes rares ; le plus permissif laisse passer un placeholder).

---

## 7. Risques assumés

- **Un signalement reste un signalement.** D16 et D25 sont tranchés en faveur du signalement ; si le
  moment forcé de la famille A n'arrive pas, les deux se lisent en diagonale et les 17 cas restent
  ouverts avec, en plus, du texte que personne ne lit. C'est le risque explicite de ces deux
  décisions, et il est accepté parce que bloquer serait pire.
- **Assouplir D17 peut créer des faux POSITIFS.** Plier les accents et normaliser les déclinaisons
  élargit le halo de ce qui « correspond ». Une source fabriquée dont le nom ressemble à un mot de
  l'article passerait. La barre n'est pas baissée sur ce qu'on exige — elle l'est sur la **forme**
  de la chaîne — mais aucune normalisation n'est gratuite, et rien ici ne mesure ce coût.
- **La teinte accessible la plus proche est un jugement déguisé en calcul.** Une distance OKLCH
  produira toujours *une* réponse ; rien ne garantit qu'elle soit acceptable pour la rédaction
  (le vert maison le plus proche peut être un bleu). La proposition doit pouvoir être refusée sans
  friction, sinon elle devient une pression sur la charte.
- **Porter la langue rendra des gardes ROUGES du jour au lendemain.** `furnitureGateApplies` et
  `assertLocalizedSourceMetadata` retournent `[]` parce qu'ils sont affamés. Les nourrir, c'est
  découvrir d'un coup toutes les fuites `de`/`it` du § 3.1 — et `assertLocalizedSourceMetadata` est
  **fail-hard avant l'appel API** (`skills/dw-chart/src/produce.ts:152`). Le premier run avec une
  langue posée peut bloquer une production qui « marchait ». C'est le comportement voulu ; il faut
  s'attendre au pic.
- **B ne mesure pas la justesse éditoriale.** Elle garantit qu'une décision prise arrive au lecteur.
  Un takeaway confirmé mais faux, une source réelle mais mal choisie, une couleur accessible mais
  contre-intuitive passeront toutes ces portes.
- **Rien ici n'a été re-vérifié au rendu.** Toutes les affirmations de cette spec viennent de
  lectures de code dans l'arbre à `8faccd22`, jamais d'un run. Les prévalences (19 / 13 / 8 / 7 / 5
  / 4) viennent du harness externe, dont le `checks.ts` **n'est pas dans ce dépôt** — non vérifié.

---

## 8. Ce que le registre n'a pas vu

Huit points où la lecture du code contredit ou complète `sweep-2026-07-28-triage.md`. À reporter
dans le registre.

1. **D12 nomme le mauvais fichier.** `deriveSymbolStory` (`skills/map-native/src/symbol-story.ts:34-140`)
   ne contient aucun superlatif ni branche fr/en. Le site réel est
   `skills/scrolly/src/chapters.ts:118-127`, et il y en a trois autres (§ 3.1).
2. **D28 n'est pas « un correctif d'une ligne ».** C'est une ligne pour le symptôme nommé et une
   classe de 21 sites visibles pour le défaut (Q4).
3. **Un cas de D29 n'est pas reproductible dans `main`.** `cafe-production-symbol` (« le correctif
   d'un débordement a supprimé `valueUnit` ») : `skills/map-native/src/SymbolMap.tsx:528` appelle
   toujours `labelWithUnit`. C'était un contournement local au run, pas un changement livré — le
   registre a enregistré un artefact de run comme un défaut de code.
4. **D25 et D26 portent sur des ensembles de types disjoints.** Les 11 types à palette de rôles
   n'écrivent **jamais** de `brand-concerns.json` pour la couleur maison
   (`produce-conformance.ts:665-677`). Les regrouper sous « couleur » suggère un recouvrement qui
   n'existe pas.
5. **D10 est mal classé.** Sa garde est déjà terminale dans la V1 (`validate-gate.ts:615-616`) ; 4
   cas signifient contournement ou non-atteinte, donc famille A. Ce qui reste en B est la divergence
   des deux listes (Q6).
6. **Le registre ne distingue jamais la prose de la boucle.** D16 est impossible dans la V2 ;
   D17/D18/D10 y sont déjà fermés par un autre mécanisme. Compter 19/83 sans dire de quelle chaîne
   il s'agit surestime le travail restant (Q5).
7. **Un dixième défaut de la même famille, absent du registre** :
   `lib/loop/assemble/scrolly.ts` ne porte **aucun champ `source`** (grep : rien) — un scrolly
   construit par la boucle part sans attribution, là où les cinq autres assembleurs la transmettent
   (`chart-native.ts:23-25`, `map-native.ts:171-173` et `:258-260`, `dw-chart.ts:42-44`,
   `map-dw.ts:164-166`, `image-native.ts:64-66`).
8. **Un onzième, du même moule** : `lib/loop/assemble/map-native.ts:233` émet `unit` pour le
   choroplèthe, mais `ChoroplethMap.tsx:355` (bins) et `:388`/`:393` (tooltip) lisent `valueUnit` —
   que l'assembleur ne pose jamais pour ce type. Un choroplèthe produit par la boucle montre son
   unité **une fois, en en-tête de légende**, et sur aucune valeur.
