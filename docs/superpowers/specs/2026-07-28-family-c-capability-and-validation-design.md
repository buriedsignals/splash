# Spec — Le système ne sait pas ce qu'il sait faire (sous-projet C du registre de sweep)

> **Statut :** conçu, non implémenté.
> **Origine :** `docs/splash/sweep-2026-07-28-triage.md` — famille C du § 8
> (D13, D22, D24, D27, D21, D08, D23, D05).
> **Langue :** prose FR, identifiants et code en anglais (standard non négociable).
> **Dépendance :** la famille A (`2026-07-28-refusals-that-bite-design.md`) rend les refus
> terminaux. Tant qu'elle n'est pas faite, **tout garde ajouté ici reste consultatif** — un
> orchestrateur libre d'expédier par-dessus un refus l'est aussi par-dessus ceux-ci.

---

## 1. Huit défauts, une seule phrase

| | | |
|---|---|---|
| **D13** — le champ `accent` d'une charte maison casse dw-chart | **8 / 83** | jugement, **re-vérifié dans le code** |
| **D05** — marques interactives non atteignables au clavier | 6 / 83 | mécanique |
| **D21** — splash promet une capacité qu'il n'a pas, puis se rétracte | 5 / 83 | jugement |
| **D22** — gardes de conformance : faux positifs bloquants, et un raté | 4 / 83 | jugement |
| **D24** — dérive entre la KB et le code | 4 / 83 | jugement |
| **D23** — légendes et labels clippés à largeur SVG fixe | 4 / 83 | jugement |
| **D27** — trous de validateur | 3 / 83 | jugement |
| **D08** — absence silencieuse de candidat narratif | 3 / 83 | mécanique |

Aucun de ces défauts n'est gros. Ensemble ils disent une seule chose :

> **Le système ne sait pas ce qu'il sait faire.** Il promet ce qu'il ne peut pas (D21), refuse ce
> qu'il peut (D22), pose sur un moteur un champ que ce moteur rejette (D13), laisse passer ce qu'il
> devait attraper (D27, D23), n'offre pas ce qu'il sait produire (D08) — et sa documentation de
> capacité ment à celui qui la lit pour décider (D24).

Ce n'est pas un manque de savoir. **Le savoir existe, écrit six fois, à six endroits qui ne se
parlent pas** (§ 2) — et aucun d'eux ne répond à la question **au moment où elle est posée** (§ 3).

---

## 2. Les six lieux où la capacité de Splash est écrite

Chacun sait quelque chose que les cinq autres ignorent. **Aucun n'est faux ; ils sont désaccordés.**

**① Le frontmatter de la KB** — `knowledge/references/{chart,map,image}/types/*.md`, 46 fiches,
chargées comme des données par `loadTypology` (`lib/brain/typology.ts:107-134`), schéma **fermé et
validé par zod** (`HeaderSchema`, `typology.ts:49-81` — 8 clés : `id, engines, intent, shape,
limits, formats, bestFor, notFor`). Un header invalide **throw**. C'est la moitié solide.
*Ce qu'il ne peut pas dire :* qu'un type **n'est pas atteignable** — le schéma n'a aucun champ pour
l'exprimer.

**② La prose de la KB** — le corps des fiches et **toutes** les fiches transverses
(`chart-selection.md`, `design-conformance.md`, `formats/*.md`). **Aucun consommateur de `lib/` ne
la lit** : seuls `bestFor`/`notFor` remontent, via `whySource.fragments`
(`lib/brain/offer.ts:93-98`). Elle n'est lue que par le modèle, **sur instruction prose** —
`skills/suggest-chart/SKILL.md:344` lui ordonne de consulter `chart-selection.md` au moment
d'émettre le `NativeSpec`. **Rien ne la vérifie, et rien ne pourra jamais la vérifier tant qu'elle
est de la prose.**

**③ Les manifestes de moteurs + le registre** — `lib/core/registry.ts` (`registerProducer:64`,
`engineTypes:117`, `isRenderable:123` — « renderable = déclaré par ce moteur ET non `deferred` »),
alimenté par `skills/dw-chart/src/manifest.ts:47-56` et `skills/chart-native/src/manifest.ts:17-22`.
C'est **le seul endroit qui sait « déclaré mais pas constructible »**. *Ce qu'il ne peut pas dire :*
quoi que ce soit d'une **fonctionnalité** — `EngineType` vaut `{ id, deferred? }`
(`registry.ts:23`), et `deferred` est une raison en prose, pas un drapeau de capacité.

**④ Les validateurs des moteurs** — la seule autorité sur les **champs** qu'un moteur accepte.
`validateChartSpec` (`skills/dw-chart/src/chart-spec.ts:404`) refuse tout champ inconnu
(`:421-431`) contre `CHART_SPEC_FIELDS` (`:231-252`, 21 entrées), avec une assertion de complétude
compile-time (`UnlistedChartSpecField`, `:256-263`). *Qui ne le consulte jamais :* l'auteur du
champ (§ 5, D13).

**⑤ Les gardes de conformance et les snaps** — la seule autorité sur le **rendu réel** (contraste
WCAG mesuré au pixel, fit des labels, snap vidéo — inventaire complet dans `docs/splash/guardrails.md`
§ « Layer 2 »). *Le problème :* ils parlent **après l'acceptation**, à l'intérieur de `produce`, et
ce qu'ils refusent n'a jamais été dit à l'offre (§ 5, D22).

**⑥ Les tables en prose des `SKILL.md`** — au moins quatre copies manuelles de listes de types
(`skills/suggest-chart/SKILL.md:329-336`, `:494`, `:525`, `skills/dw-chart/SKILL.md:60-77`), plus
`DW_REACHABLE_NATIVE_TYPES` (`skills/splash/src/flow-decisions.ts:22-30`), table manuelle dont le
commentaire assume la duplication. **Rien ne les compare aux catalogues.**

---

## 3. Les trois moments où la question se pose — et qui répond

| moment | la question | qui répond aujourd'hui |
|---|---|---|
| **à l'offre** | *quelles formes puis-je proposer ?* | ① ∩ ③, joints par `renderableSheets()` (`lib/brain/typology.ts:144-153`) puis la table d'assembleurs (`lib/loop/assemble/index.ts`). **Solide — mais dans `lib/loop`** |
| **à la promesse** (en plein dialogue) | *peut-il étiqueter les cercles ? montrer la valeur au survol ? annoter ?* | **personne.** Le modèle lit la source et devine (§ 5, D21) |
| **au produce** | *est-ce que ça se construit ?* | ④ et ⑤ — **après que le journaliste a confirmé** (§ 5, D13 et D22) |

Deux faits mesurés encadrent ce tableau.

**Le premier : l'arbitre de l'offre n'est pas joignable depuis la chaîne que le journaliste
emprunte.** `grep` de `lib/loop|lib/brain` dans `skills/` ne ramène que des **commentaires** —
zéro import. Les moteurs importent `lib/core` (vocabulaire, thème, contraste, registre), jamais
`lib/loop`. La chaîne prose n'a donc aucun accès à la table qui, dans l'autre chaîne, sait répondre.

**Le second : la même question posée aux deux jambes donne deux réponses, et on l'a mesuré.** La
passe de grille du 2026-07-28 (`docs/splash/motion-narrative-grid-2026-07-28.md`, branche
`chore/motion-narrative-grid`, **non fusionnée**) a soumis **71 cases** à la jambe OFFRE
(énumération) **et** à la jambe RENDU (`produce` réel, assertions sur l'artefact). Quatre
quadrants : **41 vivantes · 4 pièges · 9 gaspillées · 17 correctement absentes**.

---

## 4. Le motif a déjà été fermé une fois — sur trois axes seulement

Les 4 cases du quadrant **piège** (offerte propre, ne produit pas) ont été fermées dans la même
passe : le format vidéo de `pyramid`, `treemap`, `waffle`, `dot-strip` chez `chart-native`, refusé
par le contrat de reveal du producteur **après l'encodage du mp4**. La fermeture est le patron que
cette spec généralise :

- une liste **par (type, format)** vivant **avec le moteur** — `skills/chart-native/src/video-reach.ts`
  (branche `chore/motion-narrative-grid`), qui porte la mesure **et la phrase que lit le journaliste** ;
- lue par le couple `supports` / `declines` de la table d'assembleurs
  (`lib/loop/assemble/index.ts:37-43`), **l'arbitre unique** de ce que la boucle sait composer ;
- de sorte que **la marque de l'offre et le refus du produce sont la même phrase**, sans code neuf ;
- refusée au niveau `deferred` du manifeste, **délibérément** : `deferred` retire un type de **tous**
  ses formats — il aurait fermé trois formes qui marchent pour en fermer une cassée.

**Ce que la grille n'a pas mesuré, c'est exactement la famille C.** Elle a parcouru trois axes —
moteur, type, format. Les huit défauts de cette famille sont le **même quadrant piège sur les axes
qu'elle n'a pas parcourus** : le **champ** (D13), la **fonctionnalité** (D21), le **garde** (D22,
D23), la **prose de capacité** (D24), et le **silence** (D08, D27, D05).

Cadre de lecture complémentaire : `docs/splash/what-splash-can-make-2026-07-28.md` compte
**107 lignes qui marchent / 23 défectueuses / 63 qui ne sortent pas** sur 193 — mais c'est une
**lecture mécanique : rien n'y a été rendu** (§ 5.1 du document, dit par son auteur). La grille,
elle, a rendu. Les deux mesures ensemble donnent le plafond et le plancher ; ni l'une ni l'autre ne
couvre les axes ci-dessus.

---

## 5. Défaut par défaut — ce que la lecture du code établit

### D13 — un champ posé sur un moteur qui le refuse · l'axe du CHAMP

`mergeProfileDefaults` (`skills/splash/src/brand-profile.ts:439`) pose l'accent :

```ts
// skills/splash/src/brand-profile.ts:497-498
if (profile.accent && kind === "chart")
  out = { ...out, accent: profile.accent };
```

`kind` vient de `colourKind` (`:387-397`), qui range **dw-chart ET chart-native** dans `"chart"`
(`CHART_COLOUR_PRODUCERS`, `:380`). Il n'y a **aucune discrimination de producteur** à cet endroit —
alors que la branche `themeBg`, **trente lignes plus bas**, en fait une explicitement
(`:529-532`, avec le commentaire *« dw-chart is excluded (Datawrapper has its own theming) »*).
`opts?.producer` est disponible là où `accent` est posé.

En face, `validateChartSpec` refuse tout champ inconnu (`chart-spec.ts:421-431`) — et l'échec est
**dur** : `produce-all.ts:75-91` fusionne le profil **avant** de valider (`:203`), le gate route vers
le validateur dw-chart (`validate-gate.ts:665-667`), le résultat passe `status: "failed"`
(`produce-all.ts:206-209`) et le CLI sort en **code 1** (`produce-all.mjs:104`).

**Et le fait qui recadre le correctif : `accent` ne fait rien nulle part.** Cinq composants
chart-native lisent bien `config.accent` (`SlopeChart.tsx:395`, `HistogramChart.tsx:297`,
`RadialBarChart.tsx:252`, `BumpChart.tsx:89` → `bump-geometry.ts:38-51`), **mais `NativeSpec` n'a
pas de champ `accent`** (`spec-to-config.ts:43-135`) et `specToNativeConfig` (`:947-990`), qui a un
point d'injection explicite pour `lang`, `brandExplicit`, `subject`, `altInsight`, `themeBg`,
**n'en a aucun pour `accent`**. Le commit d'origine (`dbd75579`) n'a touché que `brand-profile.ts`
et son test ; le test ne couvre que `{ producer: "chart-native" }`
(`skills/splash/tests/brand-profile.test.ts:588-607`) — **aucun test ne croise `accent` et
`dw-chart`**.

Donc : **une rédaction qui déclare sa couleur d'accent casse en dur le producteur de graphiques par
défaut, pour un champ qui, même du côté où il est censé servir, n'atteint jamais le rendu.** La
charte maison la lui demande pourtant (`lib/newsroom/charter.ts:947`, `accentCandidate`).
Conséquence chiffrée par `what-splash-can-make-2026-07-28.md` § 3 : les **18 lignes Datawrapper**
(9 fiches × statique/interactif) passent en « ne sort pas » pour cette rédaction.

### D27 — le validateur ne valide pas ce qu'on croit · l'axe du SILENCE

**(a) `validateChartSpec` ne valide pas `source` du tout.** Le champ est déclaré optionnel
(`chart-spec.ts:213`) et présent dans `CHART_SPEC_FIELDS` (`:250`) — donc `source: "INSEE"` (une
chaîne) passe la boucle des champs inconnus, et **aucune vérification de forme ne suit** :
`{ ok: true }`, zéro erreur, zéro warning. En aval, `spec-to-metadata.ts:469` et `:539-540` lisent
`spec.source?.name` → `undefined` → `""` : **chart publié sans ligne de source**.

Trois gardes du spine qui auraient pu l'attraper **se désarment en silence sur la même forme** :
`placeholderSourceError` (`validate-gate.ts:188-192`) lit `source?.url` d'une chaîne → `null` ;
`sourceNamePreservedReason` via `shippedSource` (`source-guard.ts:84-90`) → `{}` → `null` ;
et `nativeFurnitureViolations` **attrape bien** le cas (« missing a source name »,
`guardrail-parity.ts:84-94`) mais **n'est appelé que pour `chart-native`** (`:139-140`).
**dw-chart n'a aucun équivalent.**

**(b) Correction au registre — la formulation « type inexistant » est inexacte.** `"multiple-lines"`
**existe** dans `CHART_TYPES` (`chart-spec.ts:62`) : le validateur a raison de l'accepter. Ce qui
manque, c'est le lien entre le registre et le validateur : le type est marqué `deferred`
(`skills/dw-chart/src/manifest.ts:32-33`), et le manifeste l'écrit lui-même (`:18-19`) —
*« They remain fully producible — validateChartSpec/produceChart accept them unconditionally if
asked for by name »*. **`deferred` n'est consulté par aucun validateur.**

**(c) Et côté natif, c'est pire et c'est assumé.** `validateNative` (`validate-gate.ts:79-91`)
attrape `UnsupportedNativeType` et retourne **`{ ok: true, warnings: [] }`** : n'importe quel
`nativeType` inconnu — faute de frappe comprise — passe le gate **sans même un warning**, au motif
que le dispatch a un chemin `FALLBACK_TO_DW`. Même trou dans `nativeSpecErrors`
(`spec-to-config.ts:995-1002`), signalé en commentaire dans `lib/loop/assemble/scrolly.ts:62`.

**(d) La porte dérobée du CLI scrolly — re-classée ici depuis la famille A.** Le plan A
(`docs/superpowers/plans/2026-07-28-refusals-that-bite.md:2574-2580`) la range en trou de
validateur, et c'est juste : `skills/scrolly/scripts/produce.mjs` **n'appelle aucun validateur**
(le fichier ne contient qu'un import de `scrollySourceManifest`, `:8`, `:85`), donc un `arcBeats`
poussé par ce CLI est accepté puis **silencieusement abandonné** — mesuré au navigateur par la
passe de grille (`motion-narrative-grid-2026-07-28.md` § 4.4 : aucune des trois phrases rédigées
n'atteint la page, la marche de salience est livrée à la place).

**Re-mesuré avant d'écrire, et la précision annoncée doit être corrigée : `mapNativeConfigErrors`
connaît parfaitement `arcBeats`.** Il route par type (`skills/map-native/src/validate-config.ts:953-968`) ;
le choroplèthe et le symbole valident le plan contre les régions réelles (`:216-226`, `:352-361`
→ `mapArcErrors`) ; et les **cinq** types incapables le refusent **par leur nom** —
`unsupportedArcBeatsErrors` est appelé en `:411` (route), `:499` (locator), `:623` (dot-density),
`:742` (hex-grid), `:875` (cartogram). Côté chart, `nativeSpecErrors` ignore effectivement
`arcBeats`, mais c'est le champ de l'autre piste : un `beats` posé sur une piste carte est refusé
par son nom au manifeste (`skills/scrolly/src/manifest.ts:34-38`, `MAP_TRACK_BEATS_REFUSAL`).

**Donc le refus existe, il est correct, et il est complet — il n'est simplement pas sur ce
chemin-là.** Ce n'est pas un validateur trop laxiste : c'est une **entrée qui contourne le
validateur**. Les deux chemins journalistes passent bien par lui (le gate V1
`skills/splash/src/validate-gate.ts` et le `render()` de la boucle via `manifest.validate`) ; le
CLI, non. Fermer ce trou ne demande aucune règle neuve — seulement que l'entrée appelle la règle
qui existe déjà.

### D24 — la KB ment à celui qui la lit pour décider · l'axe de la PROSE

**Correction au registre, vérifiée :** la fiche fautive n'est **pas** `heatmap.md` (qui ne contient
aucune occurrence de `baseColor`). La phrase est dans la fiche transverse
`knowledge/references/chart-selection.md:150-151` :

> *« …so do NOT set `baseColor` (it is ignored — the ramp is the encoding) »*

Le code fait l'inverse, et sur trois sites indépendants : `spec-to-config.ts:392-395` threade
`spec.baseColor` explicitement *« so the sequential ramp is DERIVED from it (heatmapRamp) »* ;
`core/tokens.ts:260` (`heatmapRamp`) ; `heatmap-geometry.ts:106` ; et le garde de produce lit la
même rampe dérivée (`core/produce-conformance.ts:908`). **Aggravant : c'est exactement le fichier
que `skills/suggest-chart/SKILL.md:344` ordonne au modèle de consulter** au moment d'émettre le
spec. La KB ne se contente pas de mentir : on l'envoie lire le mensonge.

**Le streamgraph, lui, n'est annoncé que par sa propre fiche.** `streamgraph.md:2-4` déclare
`engines: chart-native: streamgraph` ; les composants existent (`StreamgraphChart.tsx`,
`InteractiveStreamgraphChart.tsx`, `StreamgraphReveal.tsx`, enregistrés dans
`component-registry.tsx:117` et `:163`) ; **`MAPPERS` (`spec-to-config.ts:167-945`, 27 clés) n'a
aucune entrée `streamgraph`** et `native-types.ts:88-93` le marque
`deferred: "family-B: rare in a small newsroom"`. Il est donc inatteignable par les trois chemins
(brain, producteur direct, prompt).

**La dérive n'épargne pas la documentation des gardes elle-même.** `docs/splash/guardrails.md:54`
nomme `snap-theme.mjs` / `snap-a11y.mjs` comme les snaps de contraste de map-native et **omet**
`skills/map-native/scripts/snap-contrast.mjs` — qui est pourtant celui qui tourne réellement
(`map-native/scripts/produce.mjs:287` statique, `:356` interactif), c'est-à-dire exactement le
garde du symptôme (c) ci-dessous. Le document affirme en tête (`:6`) que *« Every row was verified
against its named file »*. Même défaut, un cran plus haut : la page qui dit ce que la machine
garantit ne dit pas ce que la machine fait.

**Et les tests laissent passer, par composition.** DRIFT 1 (`lib/brain/typology-drift.test.ts:10-17`)
vérifie qu'une clé `engines:` existe dans le catalogue du moteur — `streamgraph` y est, avec son
drapeau : **vert**. `completeness.test.ts:37` exempte les types `deferred` : **vert**. L'intersection
« une fiche promet un moteur » × « ce type est deferred » n'est couverte par rien. Et le schéma de
la KB n'a **aucun champ** permettant à une fiche de déclarer sa propre non-atteignabilité.

### D22 — les gardes bloquent du valide et manquent du cassé · l'axe du GARDE

Quatre symptômes rapportés ; la lecture les ramène à **deux désaccords d'architecture**, et
**aucun n'a été re-vérifié au rendu** (le registre le demande ; la consigne de cette spec est
« aucun test, aucun rendu »).

**Désaccord n° 1 (symptômes a et b) — le garde ne mesure pas la page que le journaliste reçoit.**
L'échantillonneur partagé masque le glyphe et lit le fond réel à trois points, mais son **repli
terminal est en dur** : `skills/chart-native/scripts/lib/sample-text-contrast.mjs:38` →
`return "#ffffff"; // the paper`, quel que soit `themeBg` — le module est « closure-free,
browser-only » (`:11-13`) et **ne reçoit jamais la config** (`snap-interactive-contrast.mjs:77-80`
ne lit `CONFIG` que pour `lang`). Et `document.elementsFromPoint` renvoie une **liste vide hors
viewport**, ce qui mène droit à ce repli.

Or les deux snaps ouvrent un viewport **constant de 900×560** (`snap-contrast.mjs:55`,
`snap-interactive-contrast.mjs:55`), et **aucun des deux ne lit `SPLASH_CHANNEL`**, que `produce`
leur threade pourtant (`produce.mjs:181`).

- *(a) le thème sombre* : le dist **interactif coule en hauteur** (`core/ChartFrame.tsx:179-248`
  en flux, `InteractiveHeatmapChart.tsx:17` `height = 480`, `index.html:13` `padding:24px`). Le
  dépôt a **déjà payé cette leçon** : `snap-proof.mjs:83-90` documente que l'écrêtage au viewport
  avait produit *« a false-positive class across the whole interactive family »*. Ce qui dépasse
  est mesuré contre un blanc fantôme — et les libellés in-cell d'une heatmap sont peints
  `#FFFFFF` par `labelInkOnFill` (`HeatmapChart.tsx:290` → `core/conformance.ts:47-51`), **sans
  regarder `themeBg`** : blanc contre blanc fantôme ≈ 1:1, violation dure garantie.
- *(b) le canal social-vertical* : le statique y fait **540×960 CSS** (1080×1920 ÷ 2,
  `vite.config.ts:61-62` → `mount.tsx:185-190`) dans un viewport haut de 560 — tout ce qui est
  sous ~536 px lit le papier blanc. **Second effet, indépendant :** le livrable est rendu à
  `deviceScaleFactor: 2`, donc un libellé de 44 px dans le PNG livré est mesuré à **22 px CSS**,
  sous le seuil grand-texte de 24 (`lib/core/contrast.ts:4-7`) — le garde exige 4,5:1 là où la
  règle WCAG SC 1.4.3 donnerait 3:1. *(Et le facteur d'échelle portrait prévu, `1.7` dans
  `scripts/audit.mjs:29-30`, n'est jamais appliqué en production : `mount.tsx:185-190` ne passe
  aucun `scale`.)*

**Le point qui tranche : la couche config-time, elle, honore `themeBg`**
(`core/produce-conformance.ts:333-339`, `core/resolve-conformance-colors.ts:60`). La divergence est
**entre les deux couches de gardes**, pas dans la configuration. Le refus, lui, est dur —
`snap-interactive-contrast.mjs:107-110` → `process.exit(1)`, lancé sans filet depuis
`produce.mjs:263` (`execFileSync`, aucun `try/catch`).

**Désaccord n° 2 (symptômes c et d) — côté carte, un fond supposé contre un fond réel, et une
question jamais posée.**

- *(c) le « Source: » qui échoue sur lui-même* : **la bande source n'a aucun fond**. Le `pillStyle`
  n'est appliqué qu'à la bande **titre** (`skills/map-native/src/core/MapFrame.tsx:136`) ; en mode
  responsive la bande source ne reçoit rien (`:182-188`) — et **les sept composants web passent
  `responsive`** (`SymbolMap.tsx:609`, `ChoroplethMap.tsx:573`, `HexGridMap.tsx:445`,
  `CartogramMap.tsx:430`, `DotDensityMap.tsx:497`, `LocatorMap.tsx:673`, `RouteMap.tsx:597`), ce
  qui explique la reproductibilité sur les deux chemins. Le texte est donc du `muted` nu **posé sur
  le basemap**. Le snap render-time échantillonne le pixel composité et le dit lui-même
  (`skills/map-native/scripts/snap-contrast.mjs:15-21`) ; le garde config-time, lui, mesure contre
  un fond **supposé** : `furnitureGround()` (`core/map-produce-conformance.ts:117-119`) retourne
  `resolveThemeBg(bg) ?? "#ffffff"`. `#5f5f5f` sur blanc supposé = 6,38:1, **passe** ; sur une
  tuile claire réelle, il descend sous 4,5:1. Et il n'existe **aucun levier** : le snap carto refuse
  explicitement tout bac de rétrogradation (*« a HARD FAIL, no brand-colour downgrade bucket »*,
  `snap-contrast.mjs:46-55`), et aucun `SKIP_*` n'existe dans `map-native/scripts/produce.mjs`.
- *(d) le raté n'est pas un raté : la question n'est pas posée* — et c'est pire que ça. Les règles
  de légende **existent, écrites** : `checkSymbolConformance` (`skills/map-native/src/conformance.ts:201-281`)
  vérifie la présence de la légende, ses paliers, le rayon max, l'unité des libellés. **Elle n'est
  appelée par aucun code de production** : le seul appelant est
  `skills/map-native/tests/conformance.test.ts` ; `produce.mjs:177-178` n'invoque que
  `runProduceMapConformance`, dont l'en-tête écrit lui-même que la **géométrie de légende est hors
  périmètre** (`core/map-produce-conformance.ts:5-20`). Aucun contrôle de **largeur** n'existe
  ailleurs : `checkMapFraming` (`conformance.ts:393-396`) ne compare qu'une **hauteur**, et
  `snap-responsive.mjs:209,234-243` ne demande que le panneau **peuplé et dans la fenêtre**. Zéro
  violation sur une légende visiblement coupée est donc le comportement **correct** d'un garde
  écrit, jamais branché.

### D23 — le clip, et le fait qu'un remède partagé existe déjà · l'axe du GARDE (suite)

`SymbolMap.tsx:531` écrit la légende en dur :
`el.innerHTML = \`<svg width="${max * 2 + 70}" …\`` avec le texte de valeur qui commence à
`max * 2 + 10` (`:528`) — **60 px, quelle que soit la chaîne**, pour une valeur formatée avec son
unité (`labelWithUnit(…)`). Rien ne mesure le texte. Même motif sur le cadre :
`labelOverhang: 80` en dur (`:173`, `:537`) → `map-format.ts:107`, une constante.

Côté chart-native, le wrapping ne coupe que sur l'espace : `wrapLabel` (`lib/core/text-fit.ts:134-135`)
fait `text.split(/\s+/)` puis, à un seul mot, tronque — d'où « Saint-Étienne » raccourci.

**Et le remède existe, dans le cœur partagé, non adopté.** `endLabelGutterPx`
(`lib/core/text-fit.ts:241-252`) et `leftLabelGutterPx` (`:277-297`) dimensionnent une gouttière sur
le **label réel le plus large** via `textWidth` (`:10-12`) ; le commentaire `:234-236` nomme
exactement ce défaut : *« A hardcoded gutter is the recurring failure: it fits the sample's labels,
then overflows once the data's are longer. »* chart-native le ré-exporte et l'utilise
(`skills/chart-native/src/core/text.ts:4`) ; **map-native ne l'utilise nulle part** — alors qu'il
importe déjà six autres modules de `lib/core` — et entretient son propre estimateur
(`symbol-labels.ts`, `CHAR_RATIO = 0.62`) qu'il n'emploie que pour l'ancrage MapLibre, jamais pour
dimensionner la légende.

### D21 — la promesse n'a aucune source · l'axe de la FONCTIONNALITÉ

Les trois promesses rapportées sont chacune contredites par une ligne précise, et **aucune de ces
lignes n'est interrogeable** :

- **Étiqueter les cercles.** `SymbolMap.tsx:327` — le calque `symbol-labels` est monté
  `if (!interactive || staticFallbackLabels)`, avec le commentaire *« The LIVE interactive page
  stays hover-only — tooltip XOR labels »* ; le drapeau n'est mis que par le harnais de capture
  (`symbol-labels.ts:49-51`). De plus **aucun top-N n'existe** (`symbol-geo.ts:71-105` renvoie tous
  les points, `symbol-labels.ts:35-45` un label par symbole) et les labels sont **abandonnables par
  collision** (`SymbolMap.tsx:346-347`, `text-allow-overlap: false` + `text-optional: true`).
  **Le pire : c'est un message de REFUS du produit qui porte la fausse promesse** —
  `skills/map-dw/src/map-spec.ts:420-433` refuse les cartes symbole Datawrapper en renvoyant vers
  map-native, *« which directly labels the top-N circles by name + value »*. La source le contredit
  deux fois.
- **Lire la valeur au survol sur un `d3-bars`.** Il n'existe **aucune trace** de la capacité
  « tooltip » par type dans `skills/dw-chart` — alors que six autres capacités **sont** modélisées
  par type dans les mêmes fichiers (`ANNOTATION_UNSUPPORTED_TYPES:113`,
  `ANNOTATION_UNMAPPED_BAR_TYPES:143`, `SCATTER_ANNOTATION_TYPES:102`, `HIGHLIGHT_TYPES:165`,
  `hasValueLabelControl()` `value-label-safety.ts:55`, `ROW_DRIVEN_TYPES` `export-aspect.ts:87`).
  Le tooltip est la seule qui manque, et c'est celle qu'on a promise.
- **« Garder le thème sombre et livrer avec une anomalie annotée ».** Le gate est fail-hard
  (`snap-interactive-contrast.mjs:107-110`) ; la seule dérogation existante
  (`lib/verify/approval.ts:48-121`) vit **en aval du produce** et ne peut pas défaire un
  `process.exit(1)` qui a empêché l'artefact d'exister.

**Structurellement :** il n'existe aucune description machine des fonctionnalités de rendu.
`ProducerManifest` (`lib/core/registry.ts:25-53`) porte `formats` et `types`, rien d'autre ;
`NEWSROOM_CAPABILITIES` (`lib/newsroom/capabilities.ts:60+`) décrit **ce que la rédaction a
activé**, jamais ce qu'un type sait rendre ; le frontmatter KB n'a ni `labels:`, ni `tooltips:`,
ni `annotations:`. **La promesse repose entièrement sur la lecture de la source par le modèle** —
et le sweep montre qu'il lit, puis promet le contraire.

### D08 — le narratif n'est jamais proposé par du code · l'axe du SILENCE

**Aucun code n'émet de candidat**, narratif ou non : `candidates.json` est **écrit par le modèle**
(un appel `Write`), et tous les sites en code sont des **lecteurs** —
`skills/splash/scripts/produce-all.mjs:44-59`, `flow-decisions.ts:73-80` (l'existence du fichier
comme **preuve** que suggest-chart a tourné), et le harnais. La règle qui décide d'offrir un scrolly
est en prose (`skills/suggest-chart/SKILL.md:62-93`), et son entrée `narrativePotential` aussi
(`skills/suggest-article/SKILL.md:131-171`) : `grep` de `narrativePotential` dans les `.ts` ne
ramène qu'un test qui vérifie **que la chaîne est présente dans le markdown**
(`skills/splash/tests/skill-doc-parity.test.ts:122,127`).

Le seul filet, `narrativeConsiderationWarning` (`skills/splash/src/candidate-provenance.ts:138-165`),
est **non bloquant** par conception (`producer-spec.ts:127`, `docs/splash/guardrails.md:26`) — deux
lignes au-dessus, dans le même CLI, le garde de provenance des candidats est **fail-hard**
(`produce-all.mjs:40-43`). Conséquence : **un modèle qui omet le narratif produit exactement le même
état de run qu'un modèle qui l'a envisagé puis écarté**, à un avertissement près que personne n'a à
traiter.

### D05 — une capacité annoncée que 100 % des cartes ne tiennent pas · l'axe du SILENCE

Le contrôle est un fait mécanique : `../splash-harness/scripts/deep-verify.mjs:56` cherche
`[role="img"][tabindex="0"]` sur la page interactive livrée.

- **chart-native le fait** — les 41 composants portent le triplet `tabIndex`/`role`/`aria-label`
  (p. ex. `BarChart.tsx:410-412`), **mais recopié 41 fois** : le shell partagé
  `core/InteractiveChart.tsx` ne possède ni focus, ni rôle, ni `tabIndex`. **Un seul site par
  composant**, donc une seule famille de marques focusable par graphique.
- **map-native ne le fait pas du tout** — zéro `tabIndex` / `role="img"` dans
  `skills/map-native/src/**/*.tsx` : les marques sont dessinées dans un `<canvas>` WebGL, **il n'y a
  aucun nœud DOM à focuser**, et il n'y en aura pas sans un calque parallèle. Toute livraison
  interactive de carte échoue ce contrôle **par construction**.
- **scrolly** ne porte que `role="img"` sur le conteneur, sans `tabindex` (six fichiers,
  p. ex. `ScrollyMap.tsx:416`) ; **image-native** n'en a aucun.
- Il n'existe **aucune couche d'interaction partagée entre moteurs** : `lib/core/` n'a pas de module
  a11y/interaction.

Ce n'est donc pas « six cas ont raté un attribut » : **c'est une capacité que le produit annonce
(un visuel interactif) et qu'une famille entière de moteurs ne peut pas tenir**, sans que rien ne le
dise à l'offre.

---

## 6. Ce que la spec propose

Un seul principe, décliné quatre fois : **une restriction connue doit être exprimée là où elle est
déclarée, et arriver au journaliste AVANT qu'il choisisse — dans une seule formulation.** C'est
exactement ce que la fermeture du quadrant piège a fait pour la vidéo (§ 4), et ce qui est proposé
ici est sa généralisation aux axes manquants. Aucun mécanisme neuf n'est inventé.

**① L'axe du champ (D13).** Un champ de charte ne se pose que sur un moteur qui le **déclare**. Le
patron existe déjà, trente lignes plus bas dans le même fichier (`brand-profile.ts:529-532`), et
l'autorité de référence existe aussi : la liste de champs du validateur du moteur
(`CHART_SPEC_FIELDS`). La forme minimale est une discrimination par producteur ; la forme forte est
que la fusion **interroge** le moteur au lieu de dupliquer sa liste. Ce que la spec ne tranche pas :
si `accent` doit être réparé ou retiré de l'offre (§ 8, décision 1).

**② L'axe du garde (D22, D23).** Deux gestes distincts, à ne pas confondre :
- *un garde qui refuse doit être juste* — le repli `#ffffff` du sampler et le viewport 900×560
  constant sont des hypothèses de thème et de canal figées dans un produit qui a rendu les deux
  arbitraires. Les corriger n'ouvre aucune capacité : cela cesse d'en fermer par erreur ;
- *un garde qui ferme durablement une forme doit le dire à l'offre*, dans les mots du journaliste,
  via le même couple `supports` / `declines` que la vidéo — sinon la restriction n'est apprise
  qu'après acceptation, ce qui est la définition du quadrant piège.
- Et ce qu'aucun garde ne mesure ne doit pas passer pour propre : le fit du texte de légende carto
  a un remède partagé (`endLabelGutterPx`) que map-native n'a jamais adopté.

**③ L'axe de la prose (D24).** Deux moitiés de KB au statut opposé, et la prose est celle qu'on
envoie lire au modèle. **Tranché au § 7 ① :** le code fait foi, un test de dérive garde la KB, et
toute affirmation purement technique est **retirée** plutôt que synchronisée. Reste à câbler : le
test qui ferme le trou entre DRIFT 1 et `completeness` (une fiche qui promet un moteur dont le type
est `deferred`), et l'affordance de schéma qu'il rend nécessaire.

**④ L'axe du silence (D27, D08, D05).** Quatre refus silencieux, une même règle : **un validateur
qui laisse passer ne doit pas laisser passer sans rien dire — et une entrée qui contourne le
validateur n'est pas une entrée.** Un `nativeType` inconnu, une `source` plate, un `arcBeats` poussé
par le CLI scrolly, une absence de candidat narratif et une famille de moteurs qui ne peut pas tenir
le clavier sont tous **détectables mécaniquement** — ce qui reste à décider est la sévérité, et elle
n'appartient pas à cette spec (§ 8).

**Où ça vit.** Les mécanismes ① ② ④ vivent dans les moteurs et le spine de la chaîne prose (celle
que le journaliste emprunte). Le mécanisme ② « le dire à l'offre » traverse la frontière mesurée
au § 3 : l'arbitre est dans `lib/loop`, que `skills/` n'importe pas. C'est le même segment de pont
que la famille A ouvre pour les garanties — **cette famille en est le second segment, celui des
capacités**, et elle ne doit pas en ouvrir un troisième en parallèle.

---

## 7. Décisions prises (2026-07-29) — et pourquoi

Trois arbitrages ont été tranchés par le propriétaire. Ils sont écrits ici **avec leur raison**,
pour qu'un lecteur futur sache que c'étaient des choix, pas des défauts.

### ① D24 — le CODE fait foi ; un test de dérive garde la KB ; et ce qui est purement technique est RETIRÉ

**La décision.** Entre la KB et le code, **le code fait foi**. La KB ne devient pas un contrat que
le code doit satisfaire ; c'est un test de dérive qui empêche la KB de le contredire.

**Trois raisons.**

1. **Le dépôt porte déjà ce motif, et il a déjà payé.** `lib/brain/typology-drift.test.ts` fait
   exactement cela : DRIFT 1 (`:10-17`) vérifie que toute clé `engines:` d'une fiche existe dans le
   catalogue du moteur, DRIFT 2 (`:19-29`) que tout type atteignable a une fiche. Le motif est si
   établi que le manifeste de dw-chart le **cite dans son propre commentaire** :
   *« See DRIFT 2 in `lib/brain/typology-drift.test.ts`, which is what caught this gap »*
   (`skills/dw-chart/src/manifest.ts:21-22`). On étend un dispositif éprouvé, on n'en invente pas un.
2. **La KB a un métier propre : dire QUAND un type sert le récit.** C'est ce que `bestFor`/`notFor`
   portent, et ce sont les seules phrases que le modèle a le droit de reprendre
   (`lib/brain/offer.ts:95-97`). En faire le contrat technique transformerait **chaque fiche en
   promesse d'implémentation** — et le dépôt aurait 11 fiches famille B en dette permanente.
3. **C'est la KB que l'orchestrateur lit quand il improvise.** Si elle ne peut plus **affirmer** un
   fait technique, elle ne peut plus l'**induire en erreur**. C'est le chaînon direct entre D24 et
   D01 : `suggest-chart/SKILL.md:344` envoie le modèle lire `chart-selection.md`, et c'est là que
   se trouve le mensonge.

**La discipline qui va avec — la moitié utile.** Là où une affirmation de la KB est **purement
technique**, on la **RETIRE** au lieu de la synchroniser. Un test de dérive sur une affirmation qui
n'aurait pas dû exister est un entretien perpétuel.

Appliqué aux deux cas mesurés :

| affirmation | nature | sort |
|---|---|---|
| `chart-selection.md:150-151` — « do NOT set `baseColor` (it is ignored — the ramp is the encoding) » | **technique** (ce que le mapper fait du champ) | **retirée** |
| `heatmap.md:41-45` — l'encodage d'une heatmap est une rampe séquentielle, pas la palette catégorielle | **éditoriale** (un fait de lecture) | **reste**, et elle est déjà juste |
| `streamgraph.md:2-4` — `engines: chart-native: streamgraph` | **technique** (une affirmation de constructibilité) | **ne peut plus affirmer un moteur sans mapper** |
| le corps de `streamgraph.md` — quand un flux empilé sert le récit | éditoriale | reste |

**Conséquence d'implémentation à ne pas découvrir en route :** le test qui ferme le trou est
« une clé `engines:` doit désigner un type **non-`deferred`** de ce moteur » — c'est exactement
l'intersection que DRIFT 1 (qui accepte les `deferred`) et `completeness.test.ts:37` (qui les
exempte) laissent vide. Or `HeaderSchema` **exige au moins un moteur** (`lib/brain/typology.ts:51-64`) :
une fiche qui n'a plus de moteur atteignable **ne peut pas exister** sous le schéma actuel. Fermer
le trou demande donc que le schéma sache exprimer « aucun moteur aujourd'hui » — c'est une
conséquence mécanique de la décision, pas une question rouverte.

### ② D22 — réparer la garde, canal par canal, les deux moitiés dans la même passe

**La décision.** On répare la garde. **Les faux positifs ET le cas raté dans la même passe**, canal
par canal.

**La raison : c'est la même garde.** Les symptômes (a) et (b) et le raté (d) sortent du même
désaccord de couches décrit au § 5 — un garde qui ne mesure pas la page livrée, et un garde écrit
qu'on n'a jamais branché. Rouvrir le social-vertical en laissant passer un vrai défaut échangerait
un canal **bloqué mais honnête** contre un canal **qui livre du cassé** : c'est le quadrant piège
reconstitué à la main.

**Ce que ça implique, et c'est assumé : le canal social-vertical reste inaccessible tant que les
deux moitiés ne sont pas faites.** Pas de réouverture partielle.

Les deux moitiés, telles que la lecture les définit :

- **Moitié « ne plus refuser du valide »** — l'échantillonnage doit porter sur la page que le
  journaliste reçoit : plus de repli « papier blanc » (`sample-text-contrast.mjs:38`), une fenêtre
  qui suit le canal que `produce` threade déjà (`produce.mjs:181`, jamais lu par les snaps), le
  facteur d'échelle du livrable pris dans la provision grand-texte (`lib/core/contrast.ts:4-7`), et
  côté carte un fond **réel** plutôt que supposé (`furnitureGround()`,
  `core/map-produce-conformance.ts:117-119`, contre une bande source sans aucun fond,
  `MapFrame.tsx:182-188`).
- **Moitié « ne plus laisser passer du cassé »** — brancher les règles de légende **déjà écrites**
  (`checkSymbolConformance`, `skills/map-native/src/conformance.ts:201-281`, aujourd'hui appelée
  seulement par ses tests) et donner enfin un contrôle de **largeur/ajustement** au texte de
  légende, là où chart-native a des gouttières mesurées depuis `lib/core/text-fit.ts:241-297` et
  map-native n'en a aucune.

### ③ D21 — vérifier avant d'offrir

**La décision.** Une forme n'entre dans l'offre que si **sa constructibilité est établie**.

**Deux appuis, tous deux déjà dans le dépôt.**

1. **La boucle V2 applique déjà cette discipline** : une clé n'entre dans la table d'assembleurs
   (`lib/loop/assemble/index.ts`) qu'avec sa preuve de rendu, et cette table est **l'arbitre unique**
   de ce que la boucle sait composer — avec, sur chaque entrée, le couple `supports` / `declines`
   (`:37-43`) dont le commentaire dit la fonction : *« WHY a pairing `supports` declines is
   declined, in the journalist's words — the sentence the offer's mark and produce's refusal both
   show »*.
2. **La passe de grille du 2026-07-28 a fabriqué l'oracle qui manquait.** Elle a soumis 71 cases aux
   deux jambes et fermé le quadrant piège avec `skills/chart-native/src/video-reach.ts` : la
   constructibilité y est établie **par couple (type, format)** — explicitement **pas** par un
   `deferred` de manifeste, qui *« retire un type de tous ses formats à la fois »* et aurait fermé
   trois formes qui marchent pour en fermer une cassée — et **la même phrase-journaliste** sert la
   marque de l'offre et le refus de `produce`. Le fichier écrit aussi la règle d'entretien :
   *« THIS LIST MUST SHRINK »*, et ce qui retire une entrée est **la mesure au rendu qui passe au
   vert, pas un avis**. C'est le modèle à généraliser, pas à réinventer.

**Pourquoi l'alternative est écartée.** « Ne plus rien promettre de précis » contredirait un
principe du projet : **la validation porte sur le visuel produit, jamais sur un plan abstrait**
(CLAUDE.md, § archi). Un journaliste valide ce qu'il voit ; l'offre qui précède doit donc être
**honnête avant**, pas plus vague.

**Ce que ça change pour les huit défauts.** « Constructible » cesse d'être une question de type et
de format : un champ que le moteur refuse (D13), un garde qui refusera au produce (D22), une
fonctionnalité que le composant ne rend pas (D21), une famille de moteurs qui ne peut pas tenir le
clavier (D05) sont **tous** des faits de constructibilité — donc tous à établir **avant** l'offre,
dans la même phrase que le journaliste lira. Y compris quand la fausse promesse est écrite par
nous : la phrase de refus de map-dw (`skills/map-dw/src/map-spec.ts:420-433`) affirme une capacité
que map-native n'a pas, et elle tombe sous la même règle.

---

## 8. Décisions qui appartiennent à Rémy

Ce qui reste ouvert après le § 7. Aucune n'est tranchée ici ; chacune est posée avec ses options et
leur conséquence mesurée.

**1. `accent` : réparer, ou retirer de l'offre ?** La lecture montre que le champ **ne rend rien
nulle part** (§ 5, D13).
- *(a) L'exclure de dw-chart* — une ligne, patron déjà écrit. Rétablit les 18 lignes Datawrapper.
  Mais `accent` reste un no-op : la rédaction déclare une couleur qui ne se voit jamais.
- *(b) L'exclure ET le brancher côté natif* — un champ sur `NativeSpec` + un point d'injection dans
  `specToNativeConfig` : les cinq composants qui le lisent l'obtiennent enfin.
- *(c) (b) + un slot dw-chart* — `spec-to-metadata.ts:594-598` (`custom-colors` du highlight) est le
  site naturel, borné à `HIGHLIGHT_TYPES` (`d3-bars`, `column-chart`) ; coûte deux endroits (le
  champ **et** `CHART_SPEC_FIELDS`, l'assertion de complétude l'exige).
- *(d) Retirer `accent` de la charte maison* (`charter.ts:947`) — cesser de demander ce qu'on ne
  rend pas. **C'est la seule option qui réduit la promesse au lieu de l'étendre.**

**2. Le résidu de la décision ③ : que fait-on de ce qu'aucun oracle ne peut établir d'avance ?**
« Vérifier avant d'offrir » suppose une mesure préalable — et **le contraste réel ne se mesure que
sur le rendu**. La règle praticable est donc « toute restriction **prévisible** remonte à l'offre »,
et il reste à dire ce qu'on fait des autres : refus tardif assumé (le journaliste paie un cycle), ou
marque préventive sur une forme qu'on soupçonne sans l'avoir mesurée. Conséquence à peser : la seule
famille fermée à ce jour (les 4 vidéos) l'a été **après mesure**, et `video-reach.ts` pose que la
liste doit rétrécir — un refus déclaré est une **dette**, pas un état.

**3. Les validateurs doivent-ils consulter `deferred` ?** Mesuré : le manifeste dw-chart écrit
explicitement que les types `deferred` restent *« fully producible … if asked for by name »*
(`manifest.ts:18-19`). Les bloquer supprime une porte de sortie de mainteneur assumée ; ne pas les
bloquer laisse un journaliste recevoir un type que la KB ne modélise pas. **Décision de produit sur
qui a le droit de nommer un type.**

**4. Un chart sans ligne de source peut-il partir ?** (D27-a) La lecture montre que oui, en
silence, sur le chemin Datawrapper. Options : refus dur (aligné sur `nativeFurnitureViolations` côté
natif) ; avertissement au gate de rendu ; ou statu quo. La conséquence est éditoriale — l'attribution
est une promesse du produit, pas une préférence.

**5. Le clavier est-il un critère de livraison ?** (D05) `map-native` ne peut pas y répondre sans un
calque DOM parallèle aux marques WebGL — ce n'est pas un correctif, c'est un chantier.
- *(a) Blocage* — aucune carte interactive ne se livre tant que le calque n'existe pas.
- *(b) Limite déclarée* — la marque le dit à l'offre (« cette carte interactive ne sera pas
  navigable au clavier »), et le journaliste choisit en connaissance de cause.
- *(c) Silence, statu quo.* WCAG 2.1.1 est un critère de niveau A ; l'arbitrage est éditorial et
  potentiellement contractuel, pas technique.

**6. L'absence de narratif : avertissement ou refus ?** (D08) Aujourd'hui non bloquant par
conception, à côté d'un garde fail-hard dans le même CLI. La promouvoir en refus rend le menu
narratif obligatoire ; la laisser advisory maintient l'état où omettre et écarter sont
indiscernables.

---

## 9. Hors périmètre, dit explicitement

- **Les familles A, B et D.** En particulier D12 (la langue) et D17 (le ledger source-fidelity)
  touchent la validation mais appartiennent à B — ce qui **arrive au lecteur** est faux, plutôt que
  ce que le système **croit savoir faire**.
- **Écrire les capacités manquantes.** Rien ici ne demande d'ajouter le tooltip à Datawrapper, le
  top-N aux cartes symbole ou le clavier aux marques WebGL. La spec porte sur **savoir et dire**
  ce qui est là.
- **La KB dans son ensemble** (les 33 lignes famille B, les 20 fiches Datawrapper manquantes
  recensées par `what-splash-can-make-2026-07-28.md` § 4) : un chantier de contenu, pas d'accord
  KB↔code.
- **Le pont dans son ensemble.** Seul le segment des capacités est ici, après celui des garanties
  ouvert par la famille A.
- **La géographie** (`geography-anywhere-design.md`) : c'est une capacité manquante nommée
  ailleurs, avec sa propre spec.
- **Re-runner le sweep.** Le registre le recommande (son § 7, point 1) ; ce n'est pas cette spec.

---

## 10. Risques assumés

1. **Cette spec repose sur des lectures de code, pas sur des rendus.** Les quatre symptômes de D22
   ont chacun un mécanisme lu dans le code qui les explique, **aucun n'a été reproduit au rendu** —
   et le registre lui-même classe D22 en famille jugement, à re-vérifier. Le dépôt a déjà démasqué
   des cascades de faux positifs du juge ; deux corrections au registre trouvées en chemin
   (`heatmap.md` innocent, `"multiple-lines"` bien existant) montrent que c'était justifié.
2. **« Vérifier avant d'offrir » (§ 7 ③) crée un nouveau lieu de vérité — donc un nouveau lieu de
   dérive.** Le § 2 en compte déjà six. Une table de constructibilité par couple ne vaut que si elle
   est *lue* par le chemin qui promet et *testée* contre le code qu'elle décrit ; sinon c'est D24
   avec un fichier de plus. C'est précisément pourquoi `video-reach.ts` porte **la mesure** à côté
   de chaque entrée, et pourquoi sa règle d'entretien est écrite dans le fichier lui-même.
3. **Faire remonter une restriction à l'offre suppose que l'offre soit atteignable.** Elle ne l'est
   pas depuis la chaîne prose (zéro import de `lib/loop` dans `skills/`, § 3). Ce sous-projet a donc
   une dépendance d'architecture réelle, et non un simple ordre de priorité.
4. **Corriger un garde ouvre des formes que personne n'a re-mesurées.** La décision § 7 ② borne le
   risque (le canal reste fermé tant que les deux moitiés ne sont pas faites) mais ne l'annule pas :
   un social-vertical rouvert n'aura été prouvé par aucun rendu tant qu'une passe ne l'a pas
   parcouru — et la passe de grille du 2026-07-28 nomme précisément ce trou (son § 8 : le pin
   carré/portrait **n'a jamais été exercé**, 27 + 7 rendus estimés à ~15 min).
5. **Dépendance A, redite :** un refus juste, exprimé à l'offre, dans les mots du journaliste, reste
   un refus qu'un orchestrateur peut aujourd'hui contourner en silence — 50 cas sur 83 le prouvent.
   Tant que A n'est pas faite, cette famille **améliore ce que le système sait**, pas ce qu'il tient.
