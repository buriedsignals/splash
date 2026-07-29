# Plan d'implémentation — Le système sait ce qu'il sait faire

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toute restriction PRÉVISIBLE de Splash est déclarée là où elle est mesurée, arrive au
journaliste AVANT qu'il choisisse, et refuse dans la même phrase au produce — de sorte qu'un champ
qu'un moteur rejette, un type que la KB ne modélise pas, une source absente, une légende coupée,
un clavier qu'une famille de moteurs ne peut pas tenir, cessent d'être découverts après acceptation.

**Architecture:** Aucun mécanisme neuf. Quatre gestes sur des dispositifs qui existent déjà :
**(1)** un champ de charte ne se pose que sur un moteur qui le déclare — ici `accent` est RETIRÉ,
pas discriminé ; **(2)** une entrée qui contourne un validateur appelle le validateur qui existe
(`skills/scrolly/scripts/produce.mjs` → `scrollySpecErrors`) ; **(3)** un garde qui refuse mesure
la page livrée (fond réel, fenêtre du canal, échelle du livrable) et un garde écrit est BRANCHÉ
(`checkSymbolConformance`) ; **(4)** une limite de rendu mesurée devient une donnée
(`lib/core/feature-reach.ts`) que `lib/brain/eligibility.ts` porte à l'offre par le même chemin que
`buildabilityMark`. La KB cesse d'affirmer du technique ; un test de dérive l'en empêche.

**Tech Stack:** Bun · TypeScript · `bun:test` · zod (`lib/brain/typology.ts`) · Playwright (les
snaps de rendu) · `node:child_process` `execFileSync` en **argv, jamais en chaîne shell**.

**Spec:** `docs/superpowers/specs/2026-07-28-family-c-capability-and-validation-design.md`
**Décisions du § 8, tranchées par Rémy le 2026-07-29** — reportées ci-dessous en § « Décisions
acquises », à ne jamais rouvrir.
**Dépendance :** la famille A (`docs/superpowers/plans/2026-07-28-refusals-that-bite.md`) rend les
refus terminaux. Tant qu'elle n'est pas exécutée, chaque garde posée ici reste contournable par un
orchestrateur. Ce plan ne bloque PAS sur A et n'ouvre pas de second vocabulaire de refus : les
phrases de déviation qu'il écrit (tâche 23) sont des chaînes ordinaires, avec un follow-up nommé
pour les replier dans `lib/core/routed-refusal.ts` le jour où A atterrit.

**24 tâches, sept phases.** Chaque phase produit un logiciel testable seule, SAUF la phase 5, que la
décision § 7 ② rend non sécable.

---

## Global Constraints

- **Runtime is Bun.** Never `npm`, never `node`. Tests are `bun:test`. Gate: `bun run check`.
- **Code, comments, identifiers, commit messages, branch names: English.** Sans exception, quelle
  que soit la langue de la conversation. Ce plan est en français ; ce qu'il fait écrire ne l'est pas.
- **No mention of Claude / Anthropic** in any commit, doc, or published artifact.
- **No mock for an external API** — real keys, real failures (Datawrapper, MapTiler).
- **Vérification par MUTATION, obligatoire.** Toute tâche qui pose ou branche une garde contient une
  étape qui REMET le comportement bogué, lance le test, et constate qu'il ROUGIT — avec le chiffre
  (nombre de tests en échec, ou le message exact). Cette famille contient une garde écrite et jamais
  appelée (`checkSymbolConformance`, `skills/map-native/src/conformance.ts:201`, dont les seuls
  appelants sont `skills/map-native/tests/conformance.test.ts` et un COMMENTAIRE de
  `skills/map-dw/src/map-spec.ts:432`) : brancher une garde sans prouver qu'elle peut rougir
  reproduit exactement le défaut qu'on traite.
- **Aucune affirmation chiffrée sans la commande qui l'établit.** Un « 0 violation » qui vient d'un
  garde non branché n'est pas un succès.
- **Vérifier le LIVRÉ, jamais le grep d'un bundle construit.** Un bundle single-file inline toute la
  registry de palettes ; grepper n'est pas une preuve (leçon gravée, CLAUDE.md).
- **Un faux blocage tue un run de journaliste.** Toute exemption est MESURÉE, jamais supposée, et son
  commentaire cite la ligne qui la justifie.
- **Layering.** `lib/core` n'importe rien. `lib/brain`/`lib/loop` peuvent importer `lib/core`.
  `skills/` importe `lib/`, jamais l'inverse (`lib/core/channel-policy.ts:3-4`). Aucune tâche ici
  n'ajoute une exception.
- **Vérification par tâche, scopée :** `cd <dir> && bunx tsc --noEmit` et `cd <dir> && bun test`.
  Le gate complet (`bun run check`) tourne une fois, en tâche 23. Il compte **22 checks**
  (9 `tsc` + 13 `bun test`) — établi par :
  ```bash
  cd /Users/rmdms/Sites/Professional/splash-merge && bun -e 'const s=require("fs").readFileSync("scripts/check.mjs","utf8");const t=s.match(/TSC_DIRS = \[(.*?)\]/s)[1].split(",").filter(x=>x.trim()).length;const e=s.match(/TEST_DIRS = \[(.*?)\];/s)[1].split(",").filter(x=>x.trim()).length;console.log(t,e,t+e)'
  # → 9 13 22
  ```
  (Le CLAUDE.md dit encore « 20 checks » — périmé.)
- **Branche :** `feat/family-c-capability-and-validation`, ouverte depuis `main` (`8ed6a6fe`).

---

## Décisions acquises — ne pas rouvrir

**Du § 7 de la spec (propriétaire, 2026-07-28) :**

- **D24 — le CODE fait foi.** La KB ne devient pas un contrat ; un test de dérive l'empêche de
  contredire le code, et toute affirmation **purement technique** est **RETIRÉE** plutôt que
  synchronisée. Conséquence mécanique assumée : `HeaderSchema` doit savoir exprimer « aucun moteur
  atteignable aujourd'hui », sinon une fiche sans moteur ne peut pas exister
  (`lib/brain/typology.ts:53-56`).
- **D22 — les deux moitiés dans la même passe.** Réparer les faux positifs ET brancher le raté,
  canal par canal. **Le canal social-vertical reste inaccessible tant que les deux moitiés ne sont
  pas faites** ; pas de réouverture partielle. (Tâches 15→20 : un seul lot.)
- **D21 — vérifier avant d'offrir.** Une forme n'entre dans l'offre que si sa constructibilité est
  établie, et la marque de l'offre et le refus du produce sont **la même phrase**.

**Du § 8, tranché le 2026-07-29 :**

1. **`accent` → option (d), et rien d'autre : le RETIRER de la charte maison.** C'est la seule
   option qui RÉDUIT la promesse. Complément indispensable : rendre le champ **inconnu partout**,
   pour que le validateur strict de dw-chart le refuse bruyamment au lieu de casser 18 lignes sans
   que personne sache pourquoi. *(Follow-up, PAS une tâche : si un besoin réel apparaît, l'option
   (b) — un champ sur `NativeSpec` + un point d'injection dans `specToNativeConfig` — reste un
   petit ajout.)*
2. **Toute restriction PRÉVISIBLE remonte à l'offre.** Ce qui ne se mesure que sur le rendu (le
   contraste réel) donne un **refus TARDIF assumé** — mais ce refus DÉVIE vers le pas qui débloque
   (règle famille A) et il est **ENREGISTRÉ** pour que la liste rétrécisse. **Pas de marque
   préventive sur une forme soupçonnée sans mesure** : un refus non mesuré est un faux dans l'autre
   sens.
3. **`deferred` : router par POINT D'ENTRÉE, pas par champ.** Bloqué sur le chemin journaliste,
   autorisé sur le chemin mainteneur — la porte de sortie que `skills/dw-chart/src/manifest.ts:18-20`
   déclare (« fully producible … if asked for by name ») est gardée, mais un journaliste ne reçoit
   jamais un type que la KB ne modélise pas.
4. **Un chart sans ligne de source → REFUS DUR**, aligné sur `nativeFurnitureViolations`
   (`skills/splash/src/guardrail-parity.ts:84-94`). L'attribution est une promesse du produit.
5. **Le clavier → limite DÉCLARÉE à l'offre** (option b). « Cette carte interactive ne sera pas
   navigable au clavier », et le journaliste choisit en connaissance de cause. WCAG 2.1.1 étant un
   critère de niveau A, la limite est **enregistrée comme une dette visible**, pas diluée en note.
6. **Narratif absent → AVERTISSEMENT qui NOMME l'alternative**, jamais refus.

**Décisions prises par ce plan faute de réponse dans la spec** (signalées comme telles) :

- **D27(c) — un `nativeType` inconnu passe le gate journaliste avec un WARNING, pas une erreur.**
  Le § 8 ne tranche pas ce cas. Le chemin `FALLBACK_TO_DW` est réel (`validate-gate.ts:83-91` le
  documente), donc le promouvoir en erreur casserait une capacité mesurée ; mais « laisser passer
  sans rien dire » est précisément ce que le § 6 ④ interdit. Warning nommant le type et le repli.
- **Une limite déclarée n'est PAS un `readiness`.** `lib/brain/eligibility.ts` documente lui-même
  qu'un `readiness: "missing"` rend une forme **inatteignable** en pratique (tier 2 de
  `lib/brain/rank.ts` + offre plafonnée à 3 lignes dans `lib/brain/offer.ts:38`) — c'est écrit noir
  sur blanc dans l'en-tête de `imageWalkMark`. Une limite clavier posée en `readiness` retirerait
  silencieusement TOUTE carte interactive de l'offre, l'inverse exact de la décision 5. Donc un
  champ neuf : `Candidate.limits: string[]` → `OfferOption.limits`.
- **Le verrou anti-dérive de la KB est un garde de PHRASE LITTÉRALE**, pas un test général « aucune
  affirmation technique ». Aucun test ne peut décider si une phrase de prose est technique. On
  verrouille la phrase mesurée, et le test porte son propre aveu de portée.
- **`accent` retiré « partout » inclut** : les 6 lectures mortes de `config.accent` côté chart-native,
  le drapeau `--accent` de `skills/splash/scripts/propose-charter.mjs`, l'écriture de la ligne
  `accent:` par `lib/newsroom/profile-write.ts:64`, et l'exemple `NEWSROOM-PROFILE.example.md:11`.
  Sinon le champ reste demandé à la rédaction.

---

## Ce que la vérification du CODE a démenti dans la spec

À lire avant d'exécuter : ces points changent ce qu'il y a à faire.

| affirmation de la spec | ce que le code dit |
|---|---|
| « le patron à généraliser est `skills/chart-native/src/video-reach.ts` » (§ 4, § 7 ③) | **Le fichier n'existe pas sur `main`.** `ls skills/chart-native/src/video-reach.ts` → *No such file*. Il vit sur `chore/motion-narrative-grid`, non fusionnée (`git branch --list '*motion-narrative*'`). La tâche 17 **crée** le dispositif au lieu de l'étendre, et en reprend la règle d'entretien (« THIS LIST MUST SHRINK », chaque entrée porte sa mesure). |
| « l'arbitre de l'offre n'est pas joignable depuis la chaîne du journaliste » (§ 3, risque 3) | **Le mécanisme de marque existe et est joignable.** `lib/loop/buildable.ts` (`isLoopBuildable`, `unbuildableEngineReason`) et `lib/brain/eligibility.ts` (`withMarks`, `buildabilityMark`) portent déjà « marqué, jamais retiré », et `skills/splash/SKILL.md:581-646` documente le chemin journaliste qui les appelle via la CLI `lib/host`. Le fait mesuré exact est plus étroit : **zéro import `.ts`** de `lib/loop`/`lib/brain` dans `skills/`. La tâche 19 se branche sur le dispositif existant ; elle n'ouvre pas de pont. |
| « cinq composants chart-native lisent `config.accent` » (§ 5, D13) | **Six**, plus une septième lecture dans la couche conformance. `LollipopChart.tsx:246` est omis (alors que le commentaire source, `brand-profile.ts:495`, le nomme), et `skills/chart-native/src/core/produce-conformance.ts:140-141` lit `config.accent` pour en faire une marque. |
| `lib/core/tokens.ts`, `lib/core/produce-conformance.ts`, `lib/core/resolve-conformance-colors.ts` | **Ces trois fichiers n'existent pas.** Les vrais chemins sont `skills/chart-native/src/core/{tokens,produce-conformance,resolve-conformance-colors}.ts` — les numéros de ligne cités (260, 908, 60) y sont exacts. |
| « `ProducerManifest` porte `formats` et `types`, rien d'autre » (§ 5, D21) | **Faux** : 8 membres (`lib/core/registry.ts:25-55` — `name`, `formats`, `types?`, `unsupportedFormatMessage?`, `validate`, `execution`, `subprocess?`, `inProcess?`). La lecture défendable est plus étroite : `types` est un `readonly EngineType[]` **plat, sans dimension de format**. |
| « au moins quatre copies manuelles de listes de types … `skills/dw-chart/SKILL.md:60-77` » (§ 2 ⑥) | **Trois.** `skills/dw-chart/SKILL.md:60-77` est la table « Tuning knobs » puis des règles en prose ; le fichier (93 lignes) ne contient **aucune énumération de types DW**. |
| « la phrase de refus map-dw, `map-spec.ts:420-433` » | La chaîne d'erreur est à **`:434`** (`:420-432` = le commentaire, `:433` = `errors.push(`). Le fait de fond — « top-N » affirmé deux fois, implémenté nulle part — est **confirmé** : `symbol-geo.ts:87-89` mappe TOUS les points sans `.slice()`, `symbol-labels.ts:35-45` fait un label par symbole, et la page interactive LIVE n'en rend **aucun** (`SymbolMap.tsx:327`). |
| « `charter.ts:947` — retirer `accent` de la charte » (§ 8, option d) | Un seul consommateur : `skills/splash/scripts/propose-charter.mjs:101-105`, qui n'écrit que de la **prose** dans le rapport de proposition. La ligne `accent:` du frontmatter est écrite par `lib/newsroom/profile-write.ts:64` depuis un drapeau `--accent` tapé par un humain (`propose-charter.mjs:189-190`, `:206`). « Retirer de la charte » touche donc **trois** sites, pas un. |
| « le facteur d'échelle portrait `1.7` n'est jamais appliqué » (§ 5, D22 b) | Il **est** appliqué — dans le harnais d'audit (`skills/chart-native/scripts/audit.mjs:52` → `skills/chart-native/src/mount.tsx:216`). Ce qui est vrai : il n'atteint **jamais le chemin produce**, car `mount.tsx:185-190` ne passe aucun `scale`. |
| `checkMapFraming` « (`conformance.ts:393-396`) ne compare qu'une hauteur » | La fonction est à **`:358-367`** (dérive 35 lignes). `:393-396` tombe bien sur la sous-règle légende, qui ne compare effectivement qu'une hauteur — mais la fonction entière vérifie aussi la largeur du titre (`:377-384`). |
| `"multiple-lines"` « existe dans `CHART_TYPES` (`chart-spec.ts:62`) » | Vrai, mais à **`:67`** (et `:85` dans `MULTI_SERIES_TYPES`). |
| `producer-spec.ts:127` « non bloquant par conception » | Le mot employé est **« advisory »**, pas « non-blocking » ; le bloc est `:124-128`. Le littéral « NON-blocking » est à `candidate-provenance.ts:130`. |
| `skills/suggest-article/SKILL.md:131-171` | La règle est à **`:129-147`** ; `:171-175` est l'exemple JSON. |
| `symbol-labels.ts:49-51` « pose le drapeau » | Le setter est à **`:53-55`** (`wantsStaticFallbackLabels`) ; `:49-51` est son commentaire. Le fond est confirmé : seul le harnais de capture pose `?staticLabels=1`. |
| `mapNativeConfigErrors` « aveugle à `arcBeats` » *(déjà corrigé dans la spec, re-confirmé ici)* | **Il le connaît parfaitement** : `skills/map-native/src/validate-config.ts:216` et `:352` le valident contre les régions réelles ; `skills/splash/src/validate-gate.ts:138` route même un `beats` de carte vers `arcBeats`. Le trou est **le CLI scrolly qui n'appelle aucun validateur** — un seul point d'entrée (tâche 4). |

Deux faits établis par la spec et **absents du registre de sweep**, qui ont chacun leur tâche :

- **`accent` est un no-op même sur chart-native.** `NativeSpec` (`spec-to-config.ts:43-127`) n'a pas
  le champ, et `specToNativeConfig` (`:947-988`), qui a un point d'injection explicite pour `lang`,
  `brandExplicit`, `subject`, `altInsight`, `themeBg` et `sourceKind`, n'en a **aucun** pour
  `accent`. → tâches 1-2.
- **Les règles de légende de map-native EXISTENT, écrites, appelées seulement par leurs propres
  tests.** `checkSymbolConformance` (`skills/map-native/src/conformance.ts:201`) n'est référencé que
  par `skills/map-native/tests/conformance.test.ts` et par un COMMENTAIRE de
  `skills/map-dw/src/map-spec.ts:432`. « 0 violation » est donc une garde jamais branchée, pas une
  garde qui réussit. → **tâche 17**.

---

## File Structure

**Créés**

| fichier | responsabilité |
|---|---|
| `lib/core/feature-reach.ts` | Le vocabulaire des LIMITES DE RENDU mesurées (`RenderFeature`, `FeatureLimit`) + le registre `registerFeatureLimits` / `featureLimits(engine, type, format)`. Types et une `Map`, zéro I/O — `lib/core` continue de n'importer rien. Porte sa règle d'entretien : **cette liste doit rétrécir**, et ce qui retire une entrée est une mesure au rendu, pas un avis. |
| `lib/core/feature-reach.test.ts` | toute entrée porte une mesure non vide ; la recherche répond par (moteur, type, format). |
| `skills/map-native/src/feature-limits.ts` | Les limites **mesurées** de map-native : clavier (aucun nœud DOM à focuser derrière un canvas WebGL) et labels de symboles en interactif (hover-only). Enregistrées à l'import du manifeste. |
| `skills/map-native/tests/feature-limits.test.ts` | chaque limite cite le fichier:ligne qui l'établit. |
| `skills/chart-native/scripts/lib/ground-of.mjs` | Le sol RÉEL d'une page rendue, dérivé de la config — ce que le sampler prenait pour « le papier ». |
| `skills/chart-native/scripts/lib/snap-viewport.mjs` | La fenêtre qu'un snap doit ouvrir : la boîte CSS du canal, plus le `STATIC_DEVICE_SCALE` que la tâche 15 consomme. |
| `skills/chart-native/tests/{sample-text-contrast-ground,snap-viewport-follows-channel,accent-is-gone}.test.*` | les trois verrous côté chart-native. |
| `skills/map-native/tests/symbol-legend-fit.test.ts` | la gouttière de légende est mesurée, pas fixée. |
| `skills/scrolly/src/produce-cli-validation.test.ts` | l'entrée CLI appelle le validateur, avant le build. |
| `lib/brain/kb-technical-claims.test.ts` | le verrou de phrase littérale sur la KB. |
| `lib/core/guardrails-doc-parity.test.ts` | `guardrails.md` nomme des fichiers qui existent et les gardes qui tournent. |
| `skills/splash/src/late-refusal.ts` | Un refus tardif qui nomme le pas qui débloque + le format d'enregistrement (`late-refusals.jsonl`). |
| `skills/splash/src/late-refusal.test.ts` | |
| `lib/brain/typology-drift-engines.test.ts` | DRIFT 3 : une clé `engines:` doit désigner un type **non-`deferred`** de ce moteur. |

**Modifiés**

| fichier | changement |
|---|---|
| `skills/splash/src/brand-profile.ts` | `accent` quitte `BrandProfile`, le parseur et `mergeProfileDefaults`. |
| `lib/newsroom/charter.ts`, `lib/newsroom/profile-write.ts` | `accentCandidate` et l'écriture de la ligne `accent:` disparaissent. |
| `skills/splash/scripts/propose-charter.mjs` | le drapeau `--accent` et la prose « possible accent » disparaissent. |
| `NEWSROOM-PROFILE.example.md`, `skills/newsroom-charter/SKILL.md` | cessent de demander une couleur qu'on ne rend nulle part. |
| `skills/chart-native/src/{SlopeChart,LollipopChart,HistogramChart,RadialBarChart,BumpChart}.tsx`, `bump-geometry.ts`, `core/produce-conformance.ts` | les 6 lectures mortes de `config.accent` + la marque de conformance partent. |
| `skills/scrolly/src/manifest.ts` | `scrollySpecErrors` devient exporté. |
| `skills/scrolly/scripts/produce.mjs` | appelle le validateur qui existe, avant le build. |
| `skills/dw-chart/src/chart-spec.ts` | `source` est validé dans sa FORME et exigé (refus dur). |
| `skills/splash/src/guardrail-parity.ts` | la parité furniture couvre dw-chart, pas seulement chart-native. |
| `skills/splash/src/validate-gate.ts` | le spine journaliste refuse un type `deferred` par son nom ; un `nativeType` inconnu ne passe plus muet. |
| `knowledge/references/chart-selection.md` | l'affirmation technique sur `baseColor` est retirée. |
| `lib/brain/typology.ts` | `HeaderSchema` sait exprimer « aucun moteur atteignable aujourd'hui ». |
| `knowledge/references/chart/types/streamgraph.md` | cesse d'affirmer un moteur sans mapper. |
| `docs/splash/guardrails.md` | la ligne 54 nomme le snap qui tourne vraiment ; une parité de chemins la garde. |
| `skills/chart-native/scripts/lib/sample-text-contrast.mjs` | le repli terminal prend le sol réel, passé en argument. |
| `skills/chart-native/scripts/snap-contrast.mjs`, `snap-interactive-contrast.mjs` | fenêtre du canal, sol réel, échelle du livrable dans la provision grand-texte. |
| `skills/map-native/src/core/MapFrame.tsx` | la bande source reçoit le sol que la garde lui suppose. |
| `skills/map-native/src/core/map-produce-conformance.ts` | `furnitureGround` cesse de supposer, et branche `checkSymbolConformance`. |
| `skills/map-native/src/SymbolMap.tsx` | la légende dimensionne sa gouttière sur le label réel le plus large. |
| `skills/map-dw/src/map-spec.ts` | le refus cesse de promettre un top-N qu'il n'a lu nulle part. |
| `lib/brain/eligibility.ts`, `lib/brain/offer.ts`, `lib/brain/verify-offer.ts` | une limite déclarée voyage jusqu'à l'offre et doit être présentée. |
| `skills/splash/src/candidate-provenance.ts` | l'avertissement narratif nomme l'alternative concrète du run. |
| `skills/splash/SKILL.md` + `skills/splash/tests/skill-doc-parity.test.ts` | le contrat de phrasage gagne sa règle 5 (une limite déclarée est imprimée). |
| `docs/splash/CHANGELOG.md` | l'entrée datée. |

---

## Ordre choisi, et pourquoi

**Phase 1 (tâches 1-3) — le CHAMP, d'abord, parce que c'est le seul défaut qui casse en dur un
chemin vivant.** `accent` fait sortir `produce-all.mjs` en code 1 pour toute rédaction qui déclare
sa couleur d'accent, et emporte les 18 lignes Datawrapper. C'est aussi le seul geste du plan qui
**réduit** la promesse : il ne coûte aucun arbitrage, il en rend d'autres inutiles.

**Phase 2 (tâche 4) — l'ENTRÉE qui contourne le validateur.** Une seule ligne d'appel, une règle qui
existe déjà et qui est complète. Le meilleur rapport preuve/coût du plan, et il isole le seul point
d'entrée fautif au lieu de toucher les validateurs (qui, eux, sont justes).

**Phase 3 (tâches 5-8) — les SILENCES.** Les quatre refus muets du spine. Ils viennent après la
phase 2 parce que trois d'entre eux vivent dans `validate-gate.ts` / `guardrail-parity.ts`, et
qu'on ne veut pas resserrer le gate avant d'avoir fermé l'entrée qui le contourne — sinon on
resserre une porte pendant qu'une fenêtre est ouverte.

**Phase 4 (tâches 9-12) — la PROSE.** Indépendante du reste, mais placée avant les gardes : c'est
`chart-selection.md` que `skills/suggest-chart/SKILL.md:344` envoie lire au modèle **au moment
d'émettre le spec**. Tant que le mensonge y est, chaque run part d'une information fausse.

**Phase 5 (tâches 13-18) — le GARDE, un seul lot, non sécable.** Décision § 7 ② : les faux positifs
ET le raté dans la même passe ; **le canal social-vertical reste fermé jusqu'à la tâche 18
incluse**. Rouvrir la moitié « ne plus refuser du valide » sans la moitié « ne plus laisser passer
du cassé » échangerait un canal bloqué mais honnête contre un canal qui livre du cassé — le
quadrant piège reconstitué à la main. Les tâches 13-16 réparent, 17-18 branchent.

**Phase 6 (tâches 19-21) — la CAPACITÉ à l'offre.** En dernier des mécanismes, parce qu'elle
CONSOMME ce que la phase 5 produit : une limite n'entre dans la table que **mesurée** (décision 2 —
« pas de marque préventive sur une forme soupçonnée sans mesure »). L'inverser aurait rempli la
table d'entrées invérifiables, c'est-à-dire D24 avec un fichier de plus (risque 2 de la spec).

**Phase 7 (tâches 22-23) — le narratif et le gate.** Le narratif est autonome ; le gate ferme.

---

## Phase 1 — l'axe du CHAMP (D13)

### Task 1 : `accent` quitte la fusion de profil, et dw-chart le refuse bruyamment

**Files:**
- Modify: `skills/splash/src/brand-profile.ts` (`:18-25` l'interface, `:52` + `:65-68` le parseur,
  `:141`, `:166`, `:203`, `:259`, `:352`, `:450`, `:494-498`)
- Modify: `skills/splash/tests/brand-profile.test.ts` (`:30-52`, `:78`, `:93`, `:113-124`, `:588-607`)

**Interfaces:**
- Consumes: `validateChartSpec(input: unknown): { ok: true; spec: ChartSpec; warnings: string[] } | { ok: false; errors: string[] }`
  (`skills/dw-chart/src/chart-spec.ts:404`) et `CHART_SPEC_FIELDS` (`:231-252`, 21 entrées) —
  inchangés, c'est déjà l'autorité qui refuse tout champ inconnu (`:421-431`).
- Produces: `BrandProfile` **sans** `accent` ; `mergeProfileDefaults<T>(spec: T, profile: BrandProfile | null, opts?: { producer?: string }): T`
  ne pose plus jamais `accent`. Les tâches 2 et 3 en dépendent.

- [ ] **Step 1 : Write the failing test**

Dans `skills/splash/tests/brand-profile.test.ts`, REMPLACER tout le bloc `:588-607`
(`describe("mergeProfileDefaults seeds the story accent", …)`) par :

```ts
describe("mergeProfileDefaults never emits `accent` (dw-chart rejects unknown fields)", () => {
  // The house charter no longer asks for an accent, and no engine ever rendered one:
  // NativeSpec has no such field (spec-to-config.ts:43-127) and specToNativeConfig has no
  // injection point for it (:947-988). A profile that still carries one must not put it on a
  // spec — validateChartSpec refuses any unknown top-level field (chart-spec.ts:421-431), and
  // that failure is HARD (produce-all exits 1).
  const legacyProfileWithAccent = {
    palette: ["#0072B2"],
    accent: "#7A1FA2",
  } as unknown as Parameters<typeof mergeProfileDefaults>[1];

  it("should not set spec.accent for a chart-native spec", () => {
    const out = mergeProfileDefaults(
      { nativeType: "slope" } as Record<string, unknown>,
      legacyProfileWithAccent,
      { producer: "chart-native" },
    );
    expect(out.accent).toBeUndefined();
  });

  it("should not set spec.accent for a dw-chart spec", () => {
    const out = mergeProfileDefaults(
      { type: "d3-lines" } as Record<string, unknown>,
      legacyProfileWithAccent,
      { producer: "dw-chart" },
    );
    expect(out.accent).toBeUndefined();
  });

  it("should drop a legacy `accent:` frontmatter key instead of carrying it", () => {
    const p = parseNewsroomMarkdown(
      '---\npalette: ["#0072B2"]\naccent: "#7A1FA2"\n---\n',
    );
    expect(p).not.toBeNull();
    expect((p as Record<string, unknown>).accent).toBeUndefined();
  });
});
```

Puis, dans le même fichier, AJOUTER le test qui prouve que le refus est bruyant côté moteur :

```ts
import { validateChartSpec } from "../../dw-chart/src/chart-spec";

describe("dw-chart refuses a stray `accent` loudly", () => {
  it("should name the offending field rather than fail silently", () => {
    const r = validateChartSpec({
      type: "d3-lines",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "alt",
      accent: "#7A1FA2",
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.includes('unknown field "accent"'))).toBe(
        true,
      );
  });
});
```

Adapter aussi les fixtures `:30-52`, `:78`, `:93`, `:113-124` : retirer `accent` des frontmatters
d'exemple et l'assertion « an accent alone is not a brand » (elle n'a plus d'objet).

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/brand-profile.test.ts
```
Attendu : ÉCHEC — `expect(out.accent).toBeUndefined()` reçoit `"#7A1FA2"` sur les deux premiers
cas (`mergeProfileDefaults` pose encore le champ, `brand-profile.ts:497-498`), et le troisième
reçoit `"#7A1FA2"` (le parseur le retient encore).

- [ ] **Step 3 : Write the minimal implementation**

Dans `skills/splash/src/brand-profile.ts` :

1. Supprimer les deux lignes de l'interface (`:21-22`) :
```ts
  /** optional accent hue (#rrggbb) */
  accent?: string;
```
2. Dans `buildProfile`, supprimer `accent?: unknown;` du type du paramètre (`:52`), le bloc
   `:65-68`, et la ligne `:141` `if (accent) p.accent = accent;`. Mettre à jour le commentaire
   `:44-48` : la phrase « an accent alone (no palette) is not a brand » disparaît avec le champ.
3. Supprimer `accent: o.accent,` (`:166`) et l'entrée `accent` de la liste des clés reconnues du
   parseur markdown (`:250-259`, `:352`) — une clé `accent:` héritée devient une clé INCONNUE,
   donc ignorée (le parseur ignore déjà les clés inconnues, `:250`).
4. Dans `seedBrandColor` (`:196-206`), remplacer :
```ts
  const isHouseColour =
    brand.palette.includes(baseColor) || brand.accent === baseColor;
```
   par :
```ts
  // The house palette is now the whole definition of a house colour: `accent` was removed
  // (it rendered nowhere — NativeSpec has no field, specToNativeConfig no injection point —
  // and dw-chart hard-failed on it). `brand.accent === baseColor` was false for every profile
  // without an accent, so this is byte-identical for them.
  const isHouseColour = brand.palette.includes(baseColor);
```
5. Supprimer `accent?: string;` de la contrainte générique de `mergeProfileDefaults` (`:450`) et
   le bloc `:494-498` en entier (les 4 lignes de commentaire + les 2 lignes de code).

- [ ] **Step 4 : Run the test to verify it passes**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec. `tsc` doit être vert **avant** `bun test` : c'est lui qui prouve qu'aucun
appelant survivant ne lit `profile.accent`.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre temporairement dans `mergeProfileDefaults`, juste avant le bloc `themeBg` :
```ts
  if ((profile as { accent?: string }).accent && kind === "chart")
    out = { ...out, accent: (profile as { accent?: string }).accent };
```
Lancer :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/brand-profile.test.ts
```
Attendu : **2 tests en échec** (`should not set spec.accent for a chart-native spec` et
`… for a dw-chart spec`). Noter le chiffre. Puis RETIRER la mutation et re-lancer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/brand-profile.ts skills/splash/tests/brand-profile.test.ts
git commit -m "fix(brand-profile): drop the accent field — it rendered nowhere and hard-failed dw-chart"
```

---

### Task 2 : `accent` quitte la charte maison, le rédacteur de profil et la CLI

**Files:**
- Modify: `lib/newsroom/charter.ts` (`:69-72` la constante, `:942-958` `accentCandidate`)
- Modify: `lib/newsroom/charter.test.ts` (`:514-525` le describe `accentCandidate`)
- Modify: `lib/newsroom/profile-write.ts` (`:28` le champ, `:64` l'écriture)
- Modify: `lib/newsroom/profile-write.test.ts` (`:49-93`)
- Modify: `skills/splash/scripts/propose-charter.mjs` (`:6`, `:28`, `:101-105`, `:189-190`, `:206`, `:230`)
- Modify: `NEWSROOM-PROFILE.example.md` (`:11`, `:37`)
- Modify: `skills/newsroom-charter/SKILL.md` (`:3`, `:58`, `:93`, `:119`, `:147`, `:162`)

**Interfaces:**
- Consumes: `BrandProfile` sans `accent` (tâche 1).
- Produces: `NewsroomFacts` sans `accent` ; `profileMarkdown(facts: NewsroomFacts): string`
  n'émet plus jamais de ligne `accent:`. Plus aucun export `accentCandidate`.

- [ ] **Step 1 : Write the failing test**

Dans `lib/newsroom/profile-write.test.ts`, remplacer le test `:49` par :

```ts
it("should never write an accent line, even when one is handed in", () => {
  // The charter stopped asking for an accent (no engine renders one). A caller that still
  // passes the key must not get it back into the frontmatter — a NEWSROOM-PROFILE.md carrying
  // `accent:` is a newsroom asked for a colour Splash never shows.
  const md = profileMarkdown({
    palette: ["#0072B2", "#D55E00"],
    theme: "dark",
    accent: "#C8102E",
  } as unknown as Parameters<typeof profileMarkdown>[0]);
  expect(md).toContain('palette: ["#0072B2", "#D55E00"]');
  expect(md).toContain('theme: "dark"');
  expect(md).not.toContain("accent");
});
```

Dans `lib/newsroom/charter.test.ts`, SUPPRIMER le `describe("accentCandidate", …)` (`:514-525`) et
ajouter, dans le describe de plus haut niveau du fichier :

```ts
it("should no longer export an accent candidate", async () => {
  // `accent` was removed from the house charter (2026-07-29): it was the only proposal field
  // that named a colour nothing in the product renders.
  const mod = (await import("./charter")) as Record<string, unknown>;
  expect(mod.accentCandidate).toBeUndefined();
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test newsroom/profile-write.test.ts newsroom/charter.test.ts
```
Attendu : ÉCHEC — `expect(md).not.toContain("accent")` reçoit une chaîne contenant
`accent: "#C8102E"` (`profile-write.ts:64`), et `mod.accentCandidate` est une fonction
(`charter.ts:947`).

- [ ] **Step 3 : Write the minimal implementation**

1. `lib/newsroom/profile-write.ts` : supprimer `accent?: string;` (`:28`) et la ligne `:64`
   `if (isSet(facts.accent)) lines.push(\`accent: "${scalar(facts.accent!)}"\`);`.
2. `lib/newsroom/charter.ts` : supprimer `export function accentCandidate(…)` (`:942-958`) et la
   constante `ACCENT_HUE_SEPARATION` (`:69-72`) si plus aucun appelant ne la lit
   (`grep -n ACCENT_HUE_SEPARATION lib/newsroom/charter.ts`). **Garder** le signal
   `accent-property` (`:82`, `:430`, `:447-450`, `:467-469`, `:640`) : c'est une SOURCE de mesure
   (la propriété CSS `--accent` d'un site, qui alimente le classement du candidat primaire), pas
   le champ de sortie qu'on retire. Ajouter au-dessus du signal :
```ts
// NOTE: `accent-property` is an INPUT signal (a site's `--accent` custom property, scored below
// the link colour), not the removed output field. The house charter stopped OFFERING an accent
// on 2026-07-29 — nothing in the product rendered it — but a site that declares one is still
// evidence about its palette.
```
3. `skills/splash/scripts/propose-charter.mjs` : supprimer l'import `accentCandidate` (`:28`), le
   bloc `:101-105`, la validation `#rrggbb` du drapeau `--accent` (`:189-190`), la propagation
   `...(accent ? { accent } : {}),` (`:206`), et la mention du drapeau dans l'usage (`:6`, `:230`).
4. `NEWSROOM-PROFILE.example.md` : supprimer la ligne `:11` (`accent: "#C8102E" …`) et le
   paragraphe `:37` qui l'explique.
5. `skills/newsroom-charter/SKILL.md` : retirer les six mentions de l'accent comme champ proposé.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test
```
Attendu : PASS, 0 échec des deux côtés.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre temporairement dans `lib/newsroom/profile-write.ts`, à la place de la ligne supprimée :
```ts
  if (isSet((facts as { accent?: string }).accent))
    lines.push(`accent: "${scalar((facts as { accent?: string }).accent!)}"`);
```
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test newsroom/profile-write.test.ts
```
Attendu : **1 test en échec** (`should never write an accent line…`). Retirer la mutation,
re-lancer : 0 échec.

- [ ] **Step 6 : Vérifier qu'il ne reste aucune demande d'accent**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge && grep -rn "accentCandidate\|accent:" lib skills NEWSROOM-PROFILE.example.md 2>/dev/null | grep -v "accent-property\|--accent\|accentColor\|deaccent\|ACCENTS\|install/preflight"
```
Attendu : **aucune ligne** hors les lectures mortes de `config.accent` que la tâche 3 retire.

- [ ] **Step 7 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add lib/newsroom skills/splash/scripts/propose-charter.mjs NEWSROOM-PROFILE.example.md skills/newsroom-charter/SKILL.md
git commit -m "fix(charter): stop asking a newsroom for an accent colour the product never renders"
```

---

### Task 3 : les six lectures mortes de `config.accent` quittent chart-native

**Files:**
- Modify: `skills/chart-native/src/SlopeChart.tsx` (`:56` décl., `:395` lecture)
- Modify: `skills/chart-native/src/LollipopChart.tsx` (`:50` décl., `:246` lecture)
- Modify: `skills/chart-native/src/HistogramChart.tsx` (`:47` décl., `:297` lecture)
- Modify: `skills/chart-native/src/RadialBarChart.tsx` (`:49` décl., `:252` lecture)
- Modify: `skills/chart-native/src/BumpChart.tsx` (`:48` décl., `:89` lecture)
- Modify: `skills/chart-native/src/bump-geometry.ts` (`:38` param, `:44`, `:51`)
- Modify: `skills/chart-native/src/core/produce-conformance.ts` (`:140-141`)
- Delete: `skills/chart-native/tests/slope-accent.test.tsx`, `lollipop-accent.test.tsx`,
  `histogram-accent.test.tsx`, `radial-bar-accent.test.tsx`
- Modify: `skills/chart-native/tests/bump-basecolor.test.tsx` (`:59`, `:69-115`)

**Interfaces:**
- Consumes: rien de neuf. Après la tâche 1, `config.accent` est `undefined` sur 100 % des chemins
  (c'était un passthrough non typé : `NativeSpec` n'a pas le champ, `specToNativeConfig` n'a pas
  d'injection — vérifié `spec-to-config.ts:43-127` et `:947-988`).
- Produces: `resolveBumpAccents(colors: { base?: string; series?: string[] }, count: number, fallback: (i: number) => string): string[]`
  — la clé `accent` disparaît de son paramètre.

- [ ] **Step 1 : Write the failing test**

Créer `skills/chart-native/tests/accent-is-gone.test.tsx` :

```tsx
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("config.accent is gone from chart-native", () => {
  // `accent` never reached a render through a declared path: NativeSpec has no such field
  // (spec-to-config.ts:43-127) and specToNativeConfig has no injection point for it (:947-988).
  // Its only writer was mergeProfileDefaults, removed 2026-07-29. A dead read is how a field
  // that renders nothing keeps looking alive.
  it("should have no `config.accent` read left in src/", () => {
    const hits = walk(SRC).filter((f) =>
      /config\.accent\b/.test(readFileSync(f, "utf8")),
    );
    expect(hits).toEqual([]);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/accent-is-gone.test.tsx
```
Attendu : ÉCHEC — la liste reçue contient 6 chemins (`SlopeChart.tsx`, `LollipopChart.tsx`,
`HistogramChart.tsx`, `RadialBarChart.tsx`, `BumpChart.tsx`, `core/produce-conformance.ts`).
Noter le chiffre : **6**.

- [ ] **Step 3 : Write the minimal implementation**

Chaque site perd la lecture ET sa déclaration de prop, en gardant le défaut qui s'appliquait déjà :

```tsx
// SlopeChart.tsx:395
const color = hi ? ACCENT : CONTEXT;
// LollipopChart.tsx:246
? ACCENT
// HistogramChart.tsx:297
stroke={MEDIAN}
// RadialBarChart.tsx:252
? PEAK_COLOR
```
```tsx
// BumpChart.tsx:89 — drop the `accent` key from the object handed to resolveBumpAccents
    base: config.baseColor,
    series: config.seriesColors,
```
```ts
// bump-geometry.ts — drop `accent?: string;` from the param type (:38), the
// `const accent = clean(colors.accent);` line (:44), and the `?? accent` term (:51):
  if (count === 1) return [base ?? series[0] ?? fallback(0)];
```
```ts
// core/produce-conformance.ts:140-141 — delete both lines:
//   const accent = config.accent;
//   if (isHex(accent)) marks.push({ color: accent, role: "accent" });
```
Supprimer aussi `accent?: string;` des types de props aux lignes `SlopeChart.tsx:56`,
`LollipopChart.tsx:50`, `HistogramChart.tsx:47`, `RadialBarChart.tsx:49`, `BumpChart.tsx:48`.

Supprimer les 4 fichiers de tests d'accent (ils testent un champ qui n'existe plus) et, dans
`bump-basecolor.test.tsx`, supprimer les deux describes qui portent sur l'accent (`:69-97` et
`:98-115`) ainsi que la fixture `:59`.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bunx tsc --noEmit && bun test
```
Attendu : PASS. Noter le total de tests — il doit avoir baissé exactement du nombre de tests
supprimés (4 fichiers × 2 + 6 cas bump), pas davantage.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `stroke={config.accent ?? MEDIAN}` dans `HistogramChart.tsx:297` (et
`accent?: string;` dans son type de props pour que `tsc` passe), puis :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/accent-is-gone.test.tsx
```
Attendu : **1 test en échec**, la liste reçue contenant `HistogramChart.tsx`. Retirer la mutation,
re-lancer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/chart-native/src skills/chart-native/tests
git commit -m "fix(chart-native): remove the six dead config.accent reads and their tests"
```

---

## Phase 2 — l'ENTRÉE qui contourne le validateur (D27-d)

### Task 4 : le CLI scrolly appelle le validateur qui existe déjà

**Files:**
- Modify: `skills/scrolly/src/manifest.ts` (`:25` — la fonction devient exportée)
- Modify: `skills/scrolly/scripts/produce.mjs` (insérer l'appel entre `:46` et `:65`)
- Create: `skills/scrolly/src/produce-cli-validation.test.ts`

**Interfaces:**
- Consumes: `mapNativeConfigErrors(spec: unknown): string[]` (`skills/map-native/src/validate-config.ts:953`),
  `nativeSpecErrors` + `narrativeBeatErrors` (`skills/chart-native/src/{spec-to-config,chart-story}.ts`),
  `MAP_TRACK_BEATS_REFUSAL` (`skills/scrolly/src/scrolly-types.ts`) — tous déjà composés par
  `scrollySpecErrors`. **Rien de neuf à écrire : la règle existe, elle est complète, et
  `validate-config.ts:216` / `:352` valident `arcBeats` contre les régions réelles.**
- Produces: `export function scrollySpecErrors(spec: unknown): string[]` — le CLI et le manifeste
  partagent désormais une seule fonction.

- [ ] **Step 1 : Write the failing test**

Créer `skills/scrolly/src/produce-cli-validation.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scrollySpecErrors } from "./manifest";

describe("the scrolly CLI does not bypass the validator", () => {
  // Measured twice (spec C §5 D27-d and the chore/motion-narrative-grid grid pass): an
  // `arcBeats` pushed through `bun scripts/produce.mjs` was accepted and then silently
  // dropped — none of the three authored sentences reached the page, the salience walk
  // shipped instead. The rule was never missing: mapNativeConfigErrors validates arcBeats
  // (validate-config.ts:216, :352) and the five incapable types refuse it BY NAME (:411,
  // :499, :623, :742, :875). Only this entry point never asked.
  it("should refuse an arcBeats plan on a type that cannot carry one", () => {
    const errors = scrollySpecErrors({
      type: "route",
      title: "T",
      altInsight: "alt",
      source: { name: "S" },
      arcBeats: [{ region: "FR", role: "context", text: "x" }],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toContain("arcBeats");
  });

  it("should be the function the CLI calls, not a copy", () => {
    const cli = readFileSync(
      join(import.meta.dir, "..", "scripts", "produce.mjs"),
      "utf8",
    );
    expect(cli).toContain("scrollySpecErrors");
    // and it must run BEFORE the vite build, not after
    expect(cli.indexOf("scrollySpecErrors")).toBeLessThan(
      cli.indexOf('"vite", "build"'),
    );
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bun test src/produce-cli-validation.test.ts
```
Attendu : ÉCHEC — `scrollySpecErrors` n'est pas exporté (erreur d'import), et `produce.mjs` ne
contient que `scrollySourceManifest` (`grep -c scrollySpecErrors skills/scrolly/scripts/produce.mjs`
→ `0`).

- [ ] **Step 3 : Write the minimal implementation**

Dans `skills/scrolly/src/manifest.ts:25`, ajouter `export` :
```ts
export function scrollySpecErrors(spec: unknown): string[] {
```

Dans `skills/scrolly/scripts/produce.mjs`, ajouter l'import après la ligne 8 :
```js
import { scrollySpecErrors } from "../src/manifest.ts";
```
et, juste après `const rawConfig = JSON.parse(readFS(configPath, "utf8"));` (`:46`), avant tout
travail de build :
```js
// VALIDATE FIRST — this CLI is a journalist-reachable entry point, and it used to be the only
// one that reached the renderer without asking the validator. An `arcBeats` plan pushed through
// here was accepted and then silently dropped (measured: none of the three authored sentences
// reached the page). No new rule: scrollySpecErrors is the SAME function the producer manifest
// registers, so the CLI and the spine refuse identically.
const specErrors = scrollySpecErrors(rawConfig);
if (specErrors.length > 0) {
  console.error("[produce scrolly] INVALID CONFIG — refusing to build:");
  for (const e of specErrors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
```

- [ ] **Step 4 : Run the test to verify it passes**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Commenter l'appel dans `produce.mjs` (les 7 lignes du bloc), puis :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bun test src/produce-cli-validation.test.ts
```
Attendu : **1 test en échec** (`should be the function the CLI calls, not a copy`). Décommenter,
re-lancer : 0 échec.

- [ ] **Step 6 : Vérification LIVE — le refus arrive vraiment au CLI**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly
cat > /tmp/scrolly-bad-arcbeats.json <<'JSON'
{"type":"route","title":"T","altInsight":"alt","source":{"name":"S"},
 "arcBeats":[{"region":"FR","role":"context","text":"x"}]}
JSON
bun scripts/produce.mjs /tmp/scrolly-bad-arcbeats.json /tmp/scrolly-out; echo "exit=$?"
```
Attendu : la sortie imprime `INVALID CONFIG — refusing to build` avec la ligne `arcBeats`, et
`exit=1`. **Aucun `vite build` ne doit avoir tourné.**

- [ ] **Step 7 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/scrolly/src/manifest.ts skills/scrolly/src/produce-cli-validation.test.ts skills/scrolly/scripts/produce.mjs
git commit -m "fix(scrolly): the produce CLI validates its config before building"
```

---

## Phase 3 — l'axe du SILENCE (D27 a, b, c)

### Task 5 : un chart sans ligne de source ne part pas — dw-chart valide la FORME de `source`

**Files:**
- Modify: `skills/dw-chart/src/chart-spec.ts` (`:213` la déclaration, après le contrôle
  `altInsight` de `validateChartSpec`, ~`:439`)
- Modify: `skills/dw-chart/tests/chart-spec.test.ts`

**Interfaces:**
- Consumes: `CHART_SPEC_FIELDS` (`:231-252`) et l'assertion de complétude compile-time
  `UnlistedChartSpecField` (`:256-263`) — inchangées, `source` y est déjà (`:250`).
- Produces: `validateChartSpec` refuse `{ ok: false }` quand `source` n'est pas un objet portant
  un `name` non vide. Les tâches 6 et 7 s'appuient sur ce refus.

**Décision acquise n° 4** : refus DUR, aligné sur `nativeFurnitureViolations`
(`skills/splash/src/guardrail-parity.ts:92`, « chart-native spec is missing a source name »).
L'attribution est une promesse du produit, pas une préférence.

- [ ] **Step 1 : Write the failing test**

Ajouter à `skills/dw-chart/tests/chart-spec.test.ts` :

```ts
describe("validateChartSpec — the source line is a promise, not a preference", () => {
  const base = {
    type: "d3-lines" as const,
    title: "T",
    data: "a,b\n1,2",
    altInsight: "alt",
  };

  it("should refuse a flat string source", () => {
    // Measured: `source: "INSEE"` passed the unknown-field loop (source IS in
    // CHART_SPEC_FIELDS:250) and NO shape check followed → { ok: true }, zero warnings, and
    // spec-to-metadata read `spec.source?.name` → undefined → "" → a chart published with no
    // source line. Three spine guards disarm on the same shape: placeholderSourceError reads
    // `source?.url` of a string → null (validate-gate.ts:188-192); shippedSource → {} → null
    // (source-guard.ts:84-90); nativeFurnitureViolations catches it but runs for chart-native
    // ONLY (guardrail-parity.ts:139-140).
    const r = validateChartSpec({ ...base, source: "INSEE" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("source");
  });

  it("should refuse an object with a blank name", () => {
    const r = validateChartSpec({ ...base, source: { name: "  " } });
    expect(r.ok).toBe(false);
  });

  it("should refuse a spec with no source at all", () => {
    const r = validateChartSpec(base);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("source");
  });

  it("should accept a name-only source (the honest prose fallback)", () => {
    const r = validateChartSpec({ ...base, source: { name: "INSEE" } });
    expect(r.ok).toBe(true);
  });

  it("should accept name + url", () => {
    const r = validateChartSpec({
      ...base,
      source: { name: "INSEE", url: "https://insee.fr/x" },
    });
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/dw-chart && bun test tests/chart-spec.test.ts
```
Attendu : ÉCHEC sur les 3 premiers cas (`r.ok` vaut `true` — aucune vérification de forme n'existe).
Noter le chiffre : **3 tests en échec**.

- [ ] **Step 3 : Write the minimal implementation**

Dans `skills/dw-chart/src/chart-spec.ts`, changer la déclaration `:213` :
```ts
  // REQUIRED. A chart without an attribution line is not shippable: the newsroom's promise is
  // that every visual says where its numbers come from. `url` stays optional — the honest
  // name-only prose fallback is legitimate (see validate-gate.ts's GUARD 2 comment). Aligned
  // with chart-native's nativeFurnitureViolations (guardrail-parity.ts:92).
  source: { name: string; url?: string };
```
et ajouter, dans `validateChartSpec` juste après le contrôle `altInsight` :
```ts
  // SHAPE, not just presence: `source: "INSEE"` (a string) used to pass the unknown-field loop
  // and then read as `spec.source?.name === undefined` downstream (spec-to-metadata.ts:469,
  // :539-540) → a published chart with an empty source line, and no error anywhere.
  const src = s.source;
  if (!src || typeof src !== "object" || Array.isArray(src)) {
    errors.push(
      'source is required and must be an object: { name: "…", url?: "…" } ' +
        "(a bare string does not carry an attribution)",
    );
  } else {
    const sname = (src as { name?: unknown }).name;
    if (typeof sname !== "string" || !sname.trim())
      errors.push("source.name is required (the attribution line the chart ships)");
    const surl = (src as { url?: unknown }).url;
    if (surl !== undefined && (typeof surl !== "string" || !surl.trim()))
      errors.push("source.url, when present, must be a non-empty string");
  }
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/dw-chart && bunx tsc --noEmit && bun test
```
Attendu : PASS. **`tsc` va probablement rougir d'abord** : rendre `source` requis casse les
fixtures et les appelants qui l'omettaient. Les corriger en ajoutant une vraie source, jamais en
re-rendant le champ optionnel — c'est précisément la promesse qu'on grave.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Commenter le bloc de vérification ajouté à l'étape 3, puis :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/dw-chart && bun test tests/chart-spec.test.ts
```
Attendu : **3 tests en échec** (les trois refus). Décommenter, re-lancer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/dw-chart/src/chart-spec.ts skills/dw-chart/tests/chart-spec.test.ts
git commit -m "fix(dw-chart): require and shape-check the source line, like chart-native already does"
```

---

### Task 6 : la parité furniture du spine couvre dw-chart, pas seulement chart-native

**Files:**
- Modify: `skills/splash/src/guardrail-parity.ts` (`:78-99` la garde (B), `:139-140` le dispatch)
- Modify: `skills/splash/src/guardrail-parity.test.ts`

**Interfaces:**
- Consumes: `AcceptedProposal` (`skills/splash/src/producer-spec.ts`) — `p.producer` et `p.spec`.
- Produces: `export function furnitureViolations(spec: unknown, producer: string): string[]` —
  la garde partagée. `nativeFurnitureViolations(spec: unknown): string[]` reste exporté comme
  alias mince (les tests existants l'appellent).

**Motif traité :** « deux porteurs jamais rapprochés ». La règle « un titre-insight + un nom de
source » est écrite une fois, pour un seul producteur, alors qu'elle vaut pour les deux.

- [ ] **Step 1 : Write the failing test**

Ajouter à `skills/splash/src/guardrail-parity.test.ts` :

```ts
describe("furniture parity covers dw-chart too", () => {
  it("should flag a dw-chart proposal missing a source name", () => {
    // The rule existed and ran for ONE producer. A Datawrapper chart shipping without an
    // attribution went through the spine in silence (guardrail-parity.ts:139-140).
    const out = guardrailParityViolations({
      producer: "dw-chart",
      format: "static",
      channel: "article-web",
      spec: { type: "d3-lines", title: "T", data: "a,b\n1,2", altInsight: "a" },
    } as unknown as Parameters<typeof guardrailParityViolations>[0]);
    expect(out.join(" ")).toContain("source name");
  });

  it("should name the producer it is talking about", () => {
    const out = furnitureViolations({ title: "" }, "dw-chart");
    expect(out.join(" ")).toContain("dw-chart");
    expect(out.join(" ")).not.toContain("chart-native");
  });

  it("should keep chart-native's wording byte-identical", () => {
    expect(nativeFurnitureViolations({})).toEqual([
      "chart-native spec is missing an insight title",
      "chart-native spec is missing a source name",
    ]);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/guardrail-parity.test.ts
```
Attendu : ÉCHEC — `furnitureViolations` n'existe pas (erreur d'import) et le premier cas reçoit
un tableau sans mention de source.

- [ ] **Step 3 : Write the minimal implementation**

Dans `skills/splash/src/guardrail-parity.ts`, généraliser (B) :
```ts
// (B) FURNITURE — an insight title + a source name, for EVERY chart producer. The rule was
// written for chart-native alone and dispatched for it alone (the "two carriers never brought
// together" pattern): a dw-chart proposal with no attribution passed the spine in silence.
// The producer NAMES itself in the message so a journalist reads which engine refused.
export function furnitureViolations(
  spec: unknown,
  producer: string,
): string[] {
  const out: string[] = [];
  const s = (spec ?? {}) as { title?: unknown; source?: { name?: unknown } };
  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (!title) out.push(`${producer} spec is missing an insight title`);
  const name =
    typeof s.source?.name === "string" ? s.source.name.trim() : "";
  if (!name) out.push(`${producer} spec is missing a source name`);
  return out;
}

/** chart-native's own call, kept so existing callers and their wording are unchanged. */
export function nativeFurnitureViolations(spec: unknown): string[] {
  return furnitureViolations(spec, "chart-native");
}
```
et, au dispatch (`:139-140`) :
```ts
  if (p.producer === "chart-native") {
    out.push(...furnitureViolations(p.spec, "chart-native"));
    const subjectFit = nativeSubjectFitViolation(p.spec);
    if (subjectFit) out.push(subjectFit);
  } else if (p.producer === "dw-chart") {
    // Same furniture promise, second carrier. dw-chart's own validateChartSpec now refuses a
    // malformed source (task 5); this is the SPINE-side half, so the two agree before any
    // producer runs — the parity this module exists for.
    out.push(...furnitureViolations(p.spec, "dw-chart"));
  }
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `else if (p.producer === "dw-chart") { /* nothing */ }` (branche vide), puis :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/guardrail-parity.test.ts
```
Attendu : **1 test en échec** (`should flag a dw-chart proposal missing a source name`). Restaurer,
re-lancer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/guardrail-parity.ts skills/splash/src/guardrail-parity.test.ts
git commit -m "fix(spine): furniture parity runs for dw-chart, not chart-native alone"
```

---

### Task 7 : le spine journaliste refuse un type `deferred` par son nom

**Files:**
- Modify: `skills/splash/src/validate-gate.ts` (dans `validateAccepted`, avant `validateByProducer`)
- Modify: `skills/splash/src/validate-gate.test.ts`

**Interfaces:**
- Consumes: `isRenderable(engine: string, typeId: string): boolean` (`lib/core/registry.ts:123`) —
  « déclaré par ce moteur ET non `deferred` », déjà écrit, déjà la bonne réponse ; et
  `engineTypes(name: string): readonly EngineType[]` (`:117`) pour retrouver la raison en prose.
- Produces: rien de neuf pour les autres tâches. `validateChartSpec` et `nativeSpecErrors` restent
  **inchangés** — c'est le point de la décision.

**Décision acquise n° 3 — router par POINT D'ENTRÉE.** `skills/dw-chart/src/manifest.ts:18-20`
déclare que les types `deferred` restent « fully producible … if asked for by name » : c'est une
porte de sortie de mainteneur assumée, qu'on GARDE. Ce qu'on ferme, c'est le chemin journaliste.

- [ ] **Step 1 : Write the failing test**

Ajouter à `skills/splash/src/validate-gate.test.ts` :

```ts
describe("the journalist spine refuses a deferred type by name", () => {
  it("should refuse a dw-chart proposal for a deferred type", () => {
    // `multiple-lines` EXISTS in CHART_TYPES (chart-spec.ts:67) — the engine validator is right
    // to accept it. It is marked deferred in the manifest (manifest.ts:34-35) because no KB
    // sheet models it, and `deferred` was consulted by no validator. A journalist must never
    // receive a type the KB does not model.
    const out = validateAccepted({
      producer: "dw-chart",
      format: "static",
      channel: "article-web",
      spec: {
        type: "multiple-lines",
        title: "T",
        data: "a,b\n1,2",
        altInsight: "a",
        source: { name: "S" },
      },
    } as unknown as Parameters<typeof validateAccepted>[0]);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errors.join(" ")).toContain("multiple-lines");
      // the manifest's own prose reason, not a maintainer's paraphrase
      expect(out.errors.join(" ")).toContain("small-multiples");
    }
  });

  it("should leave the ENGINE validator's maintainer door open", () => {
    // Same spec, straight to the engine: still accepted. That door is declared
    // (dw-chart/src/manifest.ts:18-20) and is deliberately kept.
    const r = validateChartSpec({
      type: "multiple-lines",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "a",
      source: { name: "S" },
    });
    expect(r.ok).toBe(true);
  });

  it("should pass a non-deferred type through unchanged", () => {
    const out = validateAccepted({
      producer: "dw-chart",
      format: "static",
      channel: "article-web",
      spec: {
        type: "d3-lines",
        title: "T",
        data: "a,b\n1,2",
        altInsight: "a",
        source: { name: "S" },
      },
    } as unknown as Parameters<typeof validateAccepted>[0]);
    expect(out.ok).toBe(true);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/validate-gate.test.ts
```
Attendu : ÉCHEC sur le 1er cas (`out.ok` vaut `true`). Les 2e et 3e passent déjà — ils sont là pour
verrouiller ce qui ne doit PAS changer.

- [ ] **Step 3 : Write the minimal implementation**

Dans `skills/splash/src/validate-gate.ts`, ajouter en tête de fichier :
```ts
import { engineTypes, isRenderable } from "../../../lib/core/registry";
```
et une garde appelée depuis `validateAccepted` avant `validateByProducer(p)` :
```ts
// GUARD — a deferred type is a MAINTAINER's door, not a journalist's. The registry already
// answers this (`isRenderable` = declared by that engine AND not deferred, registry.ts:123);
// nothing consulted it on this path. The engines' own validators stay unchanged on purpose:
// dw-chart's manifest DECLARES that deferred types remain producible "if asked for by name"
// (manifest.ts:18-20), and that door is kept. What closes here is the entry a journalist uses.
// The refusal quotes the manifest's OWN prose reason, so the offer's mark and this refusal are
// one wording.
function deferredTypeError(p: AcceptedProposal): string | null {
  const typeId =
    typeof (p.spec as { nativeType?: unknown })?.nativeType === "string"
      ? (p.spec as { nativeType: string }).nativeType
      : typeof (p.spec as { type?: unknown })?.type === "string"
        ? (p.spec as { type: string }).type
        : null;
  if (!typeId) return null;
  const declared = engineTypes(p.producer).some((t) => t.id === typeId);
  if (!declared) return null; // an undeclared type is another guard's business
  if (isRenderable(p.producer, typeId)) return null;
  const reason = engineTypes(p.producer).find((t) => t.id === typeId)?.deferred;
  return (
    `"${typeId}" is not an offerable ${p.producer} type: ${reason ?? "it is deferred"}. ` +
    "Choose a type the knowledge base models, or ask a maintainer to call the engine directly."
  );
}
```
et, dans `validateAccepted`, juste avant l'appel au validateur du producteur :
```ts
  const deferred = deferredTypeError(p);
  if (deferred) return { ok: false, errors: [deferred] };
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec. Vérifier en particulier qu'aucun test existant de `chart-native` ne
rougit : les 14 types `deferred` de `NATIVE_TYPES` deviennent inatteignables **par ce chemin**.
Chiffre à citer si besoin :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && awk 'NR>=32 && NR<=155' skills/chart-native/src/native-types.ts | grep -c 'deferred:'
# → 14
```

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remplacer `if (isRenderable(p.producer, typeId)) return null;` par `return null;`, puis :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/validate-gate.test.ts
```
Attendu : **1 test en échec** (`should refuse a dw-chart proposal for a deferred type`). Restaurer,
re-lancer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/validate-gate.ts skills/splash/src/validate-gate.test.ts
git commit -m "feat(spine): refuse a deferred type on the journalist path, keep the maintainer door"
```

---

### Task 8 : un `nativeType` inconnu ne passe plus le gate muet

**Files:**
- Modify: `skills/splash/src/validate-gate.ts` (`validateNative`, `:83-91`)
- Modify: `skills/splash/src/validate-gate.test.ts`

**Interfaces:**
- Consumes: `UnsupportedNativeType` et `specToNativeConfig` (`skills/chart-native/src/spec-to-config.ts`).
- Produces: `validateNative` retourne `{ ok: true, warnings: [<phrase>] }` au lieu de
  `{ ok: true, warnings: [] }` sur un type inconnu.

**Décision prise faute de réponse** (le § 8 ne tranche pas ce cas) : **warning, pas erreur.** Le
chemin `FALLBACK_TO_DW` est réel et documenté à cet endroit précis ; le promouvoir en erreur
casserait une capacité mesurée. Mais « laisser passer sans rien dire » est ce que le § 6 ④
interdit — une faute de frappe passait le gate sans même un avertissement.

- [ ] **Step 1 : Write the failing test**

```ts
describe("an unknown nativeType is not a silent pass", () => {
  it("should warn, naming the type and the fallback it takes", () => {
    const out = validateAccepted({
      producer: "chart-native",
      format: "static",
      channel: "article-web",
      spec: {
        nativeType: "bra", // a typo for "bar"
        title: "T",
        data: "a,b\n1,2",
        altInsight: "a",
        source: { name: "S" },
      },
    } as unknown as Parameters<typeof validateAccepted>[0]);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.warnings.join(" ")).toContain("bra");
      expect(out.warnings.join(" ")).toContain("Datawrapper");
    }
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/validate-gate.test.ts
```
Attendu : ÉCHEC — `out.warnings` est vide (`validate-gate.ts:88`).

- [ ] **Step 3 : Write the minimal implementation**

```ts
function validateNative(spec: unknown): ValidationOutcome {
  try {
    specToNativeConfig(spec as NativeSpec);
    return { ok: true, warnings: [] };
  } catch (e) {
    if (e instanceof UnsupportedNativeType) {
      // NOT an error: the FALLBACK_TO_DW path the dispatch handles is real, and promoting this
      // to a failure would close a measured capability. But it was a SILENT pass — a typo'd
      // nativeType went through with not even a warning, which is the exact "let through
      // without saying anything" this family exists to close. Name the type and the fallback.
      const t = (spec as { nativeType?: unknown })?.nativeType;
      return {
        ok: true,
        warnings: [
          `nativeType "${String(t)}" has no chart-native mapper — this element will be ` +
            "routed to Datawrapper instead. If that was a typo, fix it; if it was deliberate, " +
            "nothing to do.",
        ],
      };
    }
    return { ok: false, errors: [e instanceof Error ? e.message : String(e)] };
  }
}
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Attendu : PASS. `validateScrolly` (`:102`) appelle `validateNative` et compose ses warnings —
vérifier qu'aucun test de scrolly ne compte les warnings à l'identique.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `if (e instanceof UnsupportedNativeType) return { ok: true, warnings: [] };`, puis :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/validate-gate.test.ts
```
Attendu : **1 test en échec**. Restaurer, re-lancer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/validate-gate.ts skills/splash/src/validate-gate.test.ts
git commit -m "fix(spine): an unknown nativeType warns instead of passing silently"
```

---

## Phase 4 — l'axe de la PROSE (D24)

### Task 9 : la KB cesse d'affirmer le contraire du code sur `baseColor`

**Files:**
- Modify: `knowledge/references/chart-selection.md` (`:144-154`, la phrase est `:150-151`)
- Create: `lib/brain/kb-technical-claims.test.ts`

**Interfaces:**
- Consumes: `loadTypology()` (`lib/brain/typology.ts:107`) uniquement pour localiser le dossier KB ;
  le test lit les `.md` directement.
- Produces: rien pour les autres tâches.

**Décision acquise (§ 7 ①) : le CODE fait foi, et une affirmation purement technique est RETIRÉE,
pas synchronisée.** Aggravant mesuré : c'est exactement le fichier que
`skills/suggest-chart/SKILL.md:343-345` ordonne au modèle de consulter **au moment d'émettre le
`NativeSpec`**.

**Portée du verrou, dite franchement** (décision prise faute de réponse) : aucun test ne peut
décider si une phrase de prose est « technique ». On verrouille **la phrase mesurée**, littérale.
Le test porte son propre aveu de portée dans son commentaire.

- [ ] **Step 1 : Write the failing test**

Créer `lib/brain/kb-technical-claims.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KB = join(import.meta.dir, "..", "..", "knowledge", "references");

function mdFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...mdFiles(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

describe("the KB does not contradict the code on baseColor", () => {
  // SCOPE, said plainly: this is a LITERAL-PHRASE lock, not a general "no technical claims in
  // the KB" test — no test can decide whether a sentence of prose is technical. It locks the
  // one claim that was measured contradicting the code on three independent sites:
  //   skills/chart-native/src/spec-to-config.ts:392-395 threads spec.baseColor "so the
  //   sequential ramp is DERIVED from it (heatmapRamp)";
  //   skills/chart-native/src/core/tokens.ts:260 (heatmapRamp);
  //   skills/chart-native/src/heatmap-geometry.ts:106;
  //   and the produce guard reads the same derived ramp
  //   (skills/chart-native/src/core/produce-conformance.ts:908).
  // Decision (spec §7①): the CODE is authoritative, and a purely technical KB claim is REMOVED
  // rather than kept in sync.
  it("should not tell anyone that baseColor is ignored", () => {
    const offenders = mdFiles(KB).filter((f) =>
      /baseColor[^\n]{0,40}\bignored\b/i.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test brain/kb-technical-claims.test.ts
```
Attendu : ÉCHEC — la liste reçue contient `knowledge/references/chart-selection.md`. Le confirmer
à la main :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && grep -n "it is ignored" knowledge/references/chart-selection.md
# → 150:… so do NOT set `baseColor` (it is ignored — the ramp is the encoding); …
```

- [ ] **Step 3 : Write the minimal implementation**

Dans `knowledge/references/chart-selection.md`, remplacer le fragment `:149-151` :
```
where colour is the quantitative channel: it paints a **sequential CVD-safe ramp** (single-hue Blues,
monotonic luminance), NOT the Okabe-Ito categorical palette, so do NOT set `baseColor` (it is ignored —
the ramp is the encoding); a colourbar legend + optional in-cell value labels come built in. For a value
```
par :
```
where colour is the quantitative channel: it paints a **sequential CVD-safe ramp** with monotonic
luminance, NOT the Okabe-Ito categorical palette — the ramp IS the encoding; a colourbar legend +
optional in-cell value labels come built in. For a value
```
La moitié **éditoriale** (« la rampe est l'encodage, pas la palette catégorielle ») reste : c'est un
fait de lecture, et il est juste. La moitié **technique** (« ne posez pas `baseColor`, il est
ignoré ») part : c'était faux, et c'est au code de répondre.

- [ ] **Step 4 : Run the test to verify it passes**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test brain/kb-technical-claims.test.ts
```
Attendu : PASS.

- [ ] **Step 5 : MUTATION — prouver que le verrou peut rougir**

Remettre `(it is ignored — the ramp is the encoding)` dans la phrase, relancer :
Attendu : **1 test en échec**, la liste contenant `chart-selection.md`. Retirer, re-lancer : PASS.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add knowledge/references/chart-selection.md lib/brain/kb-technical-claims.test.ts
git commit -m "fix(kb): drop the false baseColor claim the emitter is told to read"
```

---

### Task 10 : le schéma de la KB sait dire « aucun moteur atteignable aujourd'hui »

**Files:**
- Modify: `lib/brain/typology.ts` (`HeaderSchema`, `:50-83` — la contrainte est `:52-64`)
- Modify: `lib/brain/typology.test.ts`

**Interfaces:**
- Consumes: rien de neuf.
- Produces: `TypeSheet` gagne `unreachable?: string`. `renderableSheets()` (`:144-154`) n'a **pas**
  à changer : une fiche sans moteur ne produit aucune paire, donc elle est structurellement hors
  offre. La tâche 11 en dépend.

**Conséquence mécanique de la décision § 7 ①, à ne pas découvrir en route :** le test qui ferme le
trou est « une clé `engines:` doit désigner un type non-`deferred` ». Or `HeaderSchema` **exige au
moins un moteur** (`typology.ts:53-56`) : une fiche qui n'en a plus **ne peut pas exister** sous le
schéma actuel.

- [ ] **Step 1 : Write the failing test**

Ajouter à `lib/brain/typology.test.ts` :

```ts
describe("HeaderSchema can express 'no reachable engine today'", () => {
  it("should accept a sheet with no engines when it says why", () => {
    // The KB's job is to say WHEN a form serves the story (bestFor/notFor). A sheet whose
    // engine has no mapper must be able to keep that editorial body without CLAIMING a
    // constructibility it does not have — otherwise the only way to stop lying is to delete
    // the editorial knowledge too.
    const s = parseSheetHeader({
      id: "streamgraph",
      engines: {},
      unreachable: "no chart-native mapper (MAPPERS, spec-to-config.ts)",
      intent: ["change-over-time"],
      shape: "wide",
      formats: ["static"],
      bestFor: ["x"],
      notFor: ["y"],
    });
    expect(s.unreachable).toContain("mapper");
    expect(Object.keys(s.engines)).toEqual([]);
  });

  it("should still refuse a sheet with no engines and no reason", () => {
    expect(() =>
      parseSheetHeader({
        id: "x",
        engines: {},
        intent: ["change-over-time"],
        shape: "wide",
        formats: ["static"],
        bestFor: ["x"],
        notFor: ["y"],
      }),
    ).toThrow();
  });

  it("should refuse `unreachable` on a sheet that DOES name an engine", () => {
    // Two contradictory statements in one header is the drift this affordance exists to
    // prevent, not a state to allow.
    expect(() =>
      parseSheetHeader({
        id: "x",
        engines: { "chart-native": "bar" },
        unreachable: "…",
        intent: ["change-over-time"],
        shape: "wide",
        formats: ["static"],
        bestFor: ["x"],
        notFor: ["y"],
      }),
    ).toThrow();
  });
});
```

Si `parseSheetHeader` n'est pas encore exporté, l'exporter (`HeaderSchema.parse` enveloppé) —
c'est la seule façon d'unit-tester le schéma sans écrire un fichier sur disque.

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test brain/typology.test.ts
```
Attendu : ÉCHEC — le 1er cas throw (`engines: a sheet must name at least one engine`), et le champ
`unreachable` n'existe pas.

- [ ] **Step 3 : Write the minimal implementation**

Dans `lib/brain/typology.ts`, remplacer la contrainte inline de `engines` (`:53-56`) par une
contrainte au niveau de l'objet :

```ts
const HeaderSchema = z
  .object({
    id: z.string().min(1),
    engines: z.record(z.string(), EngineKeys).transform((e) =>
      Object.fromEntries(
        Object.entries(e).map(([engine, keys]) => [
          engine,
          Array.isArray(keys) ? keys : [keys],
        ]),
      ),
    ),
    /** WHY this form reaches no engine TODAY — required exactly when `engines` is empty, and
     *  refused when it is not. A sheet's job is to say WHEN a form serves the story; without
     *  this field the only way to stop a sheet from claiming a constructibility it does not
     *  have was to delete its editorial body too. Mechanical consequence of the 2026-07-29
     *  decision that the CODE is authoritative (spec §7①), not a reopened question. */
    unreachable: z.string().min(1).optional(),
    intent: z.array(z.enum(INTENTS)).min(1),
    shape: z.string().min(1),
    limits: LimitsSchema.default({}),
    formats: z.array(z.enum(VISUAL_FORMATS)).min(1),
    bestFor: z.array(z.string().min(1)).min(1),
    notFor: z.array(z.string().min(1)).min(1),
  })
  .superRefine((h, ctx) => {
    const named = Object.keys(h.engines).length > 0;
    if (!named && !h.unreachable)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "engines: a sheet must name at least one engine, or state `unreachable: \"<why>\"`",
      });
    if (named && h.unreachable)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "`unreachable` contradicts the engines this sheet names — state one or the other",
      });
  });
```
Ajouter `unreachable?: string;` au type `TypeSheet` et le propager dans `loadTypology`
(`:107-134`) comme les autres clés.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec. Les 46 fiches existantes nomment toutes un moteur, donc aucune ne bouge :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && ls knowledge/references/{chart,map,image}/types/*.md | wc -l
# → 46
```

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Retirer la seconde branche du `superRefine` (celle qui refuse la contradiction), puis relancer
`bun test brain/typology.test.ts` : Attendu **1 test en échec**
(`should refuse 'unreachable' on a sheet that DOES name an engine`). Restaurer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add lib/brain/typology.ts lib/brain/typology.test.ts
git commit -m "feat(kb): a sheet can declare it reaches no engine today, instead of claiming one"
```

---

### Task 11 : DRIFT 3 — une clé `engines:` doit désigner un type non-`deferred`

**Files:**
- Create: `lib/brain/typology-drift-engines.test.ts`
- Modify: `knowledge/references/chart/types/streamgraph.md` (`:2-4`)

**Interfaces:**
- Consumes: `loadTypology()` (`lib/brain/typology.ts:107`), `engineTypes` / `isRenderable`
  (`lib/core/registry.ts:117`, `:123`), et le champ `unreachable` de la tâche 10.
- Produces: rien pour les autres tâches.

**Le trou, exactement :** DRIFT 1 (`lib/brain/typology-drift.test.ts:10-17`) vérifie qu'une clé
`engines:` existe dans le catalogue du moteur — `streamgraph` y est, **avec son drapeau `deferred`**
(`skills/chart-native/src/native-types.ts:89-94`) : **vert**. `completeness.test.ts:38` exempte les
types `deferred` : **vert**. L'intersection « une fiche promet un moteur » × « ce type est
`deferred` » n'est couverte par rien. Chiffres :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge
awk 'NR>=32 && NR<=155' skills/chart-native/src/native-types.ts | grep -c 'id: "'      # → 41
awk 'NR>=32 && NR<=155' skills/chart-native/src/native-types.ts | grep -c 'deferred:'  # → 14
```
41 − 14 = 27, exactement les 27 clés de `MAPPERS` (`spec-to-config.ts:167-944`).

- [ ] **Step 1 : Write the failing test**

Créer `lib/brain/typology-drift-engines.test.ts` :

```ts
import { test, expect } from "bun:test";
import { loadTypology } from "./typology";
import { engineTypes, isRenderable } from "../core/registry";
import "../../skills/splash/src/register-producers";

test("DRIFT 3: a declared engine key must be a NON-deferred type of that engine", () => {
  // The hole between DRIFT 1 (typology-drift.test.ts:10-17 — the key EXISTS in the catalogue,
  // deferred included) and completeness.test.ts:38 (which EXEMPTS deferred types). streamgraph
  // sat in it: streamgraph.md declared `engines: chart-native: streamgraph`, the components
  // exist (component-registry.tsx:117, :163), and MAPPERS has no entry — so the sheet promised
  // a renderer no path could reach.
  const broken: string[] = [];
  for (const sheet of loadTypology())
    for (const [engine, keys] of Object.entries(sheet.engines))
      for (const key of keys) {
        const declared = engineTypes(engine).some((t) => t.id === key);
        if (declared && !isRenderable(engine, key))
          broken.push(`${sheet.id} promises ${engine}:${key}, which is deferred`);
      }
  expect(broken).toEqual([]);
});

test("DRIFT 3b: a sheet with no engines states why", () => {
  const silent = loadTypology()
    .filter((s) => Object.keys(s.engines).length === 0 && !s.unreachable)
    .map((s) => s.id);
  expect(silent).toEqual([]);
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test brain/typology-drift-engines.test.ts
```
Attendu : ÉCHEC — la liste reçue contient
`streamgraph promises chart-native:streamgraph, which is deferred`. Noter : **1 entrée**.

- [ ] **Step 3 : Write the minimal implementation**

Dans `knowledge/references/chart/types/streamgraph.md`, remplacer `:3-4` :
```yaml
engines:
  chart-native: streamgraph
```
par :
```yaml
engines: {}
unreachable: "chart-native ships the components (StreamgraphChart / InteractiveStreamgraphChart / StreamgraphReveal) but MAPPERS has no streamgraph entry, so no spec can reach them; the type is deferred in native-types.ts (family B)"
```
Le CORPS de la fiche (quand un flux empilé sert le récit) **reste** : c'est éditorial, et c'est le
métier propre de la KB.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test brain/
```
Attendu : PASS — DRIFT 1, DRIFT 2, DRIFT 3, DRIFT 3b et `typology-coverage` tous verts.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `engines: { chart-native: streamgraph }` (et retirer `unreachable`), relancer :
Attendu : **1 test en échec** (DRIFT 3), avec la fiche nommée. Restaurer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add lib/brain/typology-drift-engines.test.ts knowledge/references/chart/types/streamgraph.md
git commit -m "test(kb): DRIFT 3 — a declared engine key must name a non-deferred type"
```

---

### Task 12 : la page qui dit ce que la machine garantit nomme les gardes qui tournent

**Files:**
- Modify: `docs/splash/guardrails.md` (`:54`)
- Create: `docs/splash/guardrails-parity.test.ts` — **ou**, si `docs/` n'est pas dans `TEST_DIRS`,
  `lib/core/guardrails-doc-parity.test.ts` (c'est le cas : `scripts/check.mjs` teste
  `docs/installer`, pas `docs/splash` → **écrire le test dans `lib/core/`**)

**Interfaces:**
- Consumes: rien.
- Produces: rien pour les autres tâches.

**Même défaut, un cran plus haut.** `docs/splash/guardrails.md:6` affirme *« Every row was verified
against its named file — no guard is documented from memory »*, et `:54` nomme `snap-theme.mjs` /
`snap-a11y.mjs` pour map-native en **omettant** `skills/map-native/scripts/snap-contrast.mjs`, qui
est celui qui tourne réellement (`skills/map-native/scripts/produce.mjs:287` statique, `:356`
interactif) — c'est-à-dire exactement le garde du symptôme (c) de D22.

- [ ] **Step 1 : Write the failing test**

Créer `lib/core/guardrails-doc-parity.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const DOC = join(ROOT, "docs", "splash", "guardrails.md");

describe("guardrails.md names files that exist, and the ones that run", () => {
  const md = readFileSync(DOC, "utf8");

  it("should name only script paths that exist on disk", () => {
    // The page claims at :6 that "every row was verified against its named file". That claim
    // has to be mechanical, or it is the same drift one level up.
    const paths = [...md.matchAll(/`((?:skills|lib|scripts)\/[^`]+\.(?:mjs|ts|tsx))`/g)].map(
      (m) => m[1],
    );
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((p) => !existsSync(join(ROOT, p)))).toEqual([]);
  });

  it("should name every snap that map-native's produce actually runs", () => {
    const produce = readFileSync(
      join(ROOT, "skills", "map-native", "scripts", "produce.mjs"),
      "utf8",
    );
    const run = [...produce.matchAll(/scripts\/(snap-[a-z-]+\.mjs)/g)].map((m) => m[1]);
    const missing = [...new Set(run)].filter(
      (s) => !md.includes(`skills/map-native/scripts/${s}`) && !md.includes(`\`${s}\``),
    );
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/guardrails-doc-parity.test.ts
```
Attendu : ÉCHEC sur le 2e cas — `missing` contient `snap-contrast.mjs`. Le confirmer :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && grep -c "map-native/scripts/snap-contrast.mjs" docs/splash/guardrails.md
# → 0
```

- [ ] **Step 3 : Write the minimal implementation**

Dans `docs/splash/guardrails.md:54`, remplacer la fin de la cellule « où » :
```
`skills/map-native/scripts/snap-theme.mjs`, `snap-a11y.mjs` — all run fail-hard from `produce.mjs`
```
par :
```
`skills/map-native/scripts/snap-contrast.mjs` (the furniture-text WCAG guard actually invoked at `produce.mjs:287` static / `:356` interactive — a HARD FAIL with no brand-colour downgrade bucket), `snap-theme.mjs`, `snap-a11y.mjs` — all run fail-hard from `produce.mjs`
```

- [ ] **Step 4 : Run the test to verify it passes**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/guardrails-doc-parity.test.ts
```
Attendu : PASS.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Retirer à nouveau `snap-contrast.mjs` de la ligne 54, relancer : Attendu **1 test en échec** avec
`snap-contrast.mjs` dans `missing`. Restaurer : PASS.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add docs/splash/guardrails.md lib/core/guardrails-doc-parity.test.ts
git commit -m "docs(guardrails): name map-native's snap-contrast, and make the page's claim mechanical"
```

---

## Phase 5 — l'axe du GARDE (D22, D23) — **un seul lot, non sécable**

> **Décision § 7 ② — à relire avant de commencer.** Les faux positifs ET le raté dans la même
> passe. **Le canal social-vertical reste inaccessible tant que la tâche 18 n'est pas verte.** Ne
> pas rouvrir à moitié : échanger un canal bloqué mais honnête contre un canal qui livre du cassé,
> c'est reconstituer le quadrant piège à la main. Aucune tâche de cette phase ne se merge seule.

### Task 13 : le sampler cesse d'inventer « le papier »

**Files:**
- Create: `skills/chart-native/scripts/lib/ground-of.mjs`
- Modify: `skills/chart-native/scripts/lib/sample-text-contrast.mjs` (`:14` la signature, `:38` le repli)
- Modify: `skills/chart-native/scripts/snap-contrast.mjs` (`:66` l'appel `page.evaluate`)
- Modify: `skills/chart-native/scripts/snap-interactive-contrast.mjs` (l'appel `page.evaluate`)
- Create: `skills/chart-native/tests/sample-text-contrast-ground.test.ts`

**Interfaces:**
- Consumes: `deriveFurniture(themeBg?: string): ColorTokens` (`skills/chart-native/src/core/tokens.ts`,
  ré-export de `lib/core/theme.ts`) — la couche config-time l'honore déjà
  (`skills/chart-native/src/core/produce-conformance.ts:333-339`,
  `core/resolve-conformance-colors.ts:60`). La divergence est ENTRE LES DEUX COUCHES de gardes, pas
  dans la configuration.
- Produces: `export function groundOf(configPath: string | undefined): string` — le sol réel, `#ffffff`
  seulement quand la config le dit. `sampleTextContrast(ground)` prend désormais un argument.
  Les tâches 14 et 15 consomment `groundOf`.

- [ ] **Step 1 : Write the failing test**

Créer `skills/chart-native/tests/sample-text-contrast-ground.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { groundOf } from "../scripts/lib/ground-of.mjs";

describe("the render-time sampler measures the page the journalist receives", () => {
  it("should derive the ground from the config, not assume paper", () => {
    // sample-text-contrast.mjs:38 returned "#ffffff" — "the paper" — whatever themeBg said.
    // document.elementsFromPoint returns an EMPTY list outside the viewport, which leads
    // straight to that fallback. On a dark theme, in-cell heatmap labels painted #FFFFFF by
    // labelInkOnFill (HeatmapChart.tsx:290 → core/conformance.ts:47-51) were measured white on
    // a PHANTOM white ≈ 1:1 — a guaranteed hard violation on a correct render.
    const dir = mkdtempSync(join(tmpdir(), "ground-"));
    const p = join(dir, "config.json");
    writeFileSync(p, JSON.stringify({ themeBg: "#18181B" }));
    expect(groundOf(p).toLowerCase()).toBe("#18181b");
  });

  it("should still answer white for the light default", () => {
    const dir = mkdtempSync(join(tmpdir(), "ground-"));
    const p = join(dir, "config.json");
    writeFileSync(p, JSON.stringify({ title: "T" }));
    expect(groundOf(p).toLowerCase()).toBe("#ffffff");
  });

  it("should answer white when no config is threaded (manual runs)", () => {
    expect(groundOf(undefined).toLowerCase()).toBe("#ffffff");
  });

  it("should hand the ground to the sampler, not hardcode it", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "scripts", "lib", "sample-text-contrast.mjs"),
      "utf8",
    );
    expect(src).toContain("export function sampleTextContrast(ground)");
    expect(src).not.toContain('return "#ffffff"; // the paper');
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/sample-text-contrast-ground.test.ts
```
Attendu : ÉCHEC — `ground-of.mjs` n'existe pas (erreur d'import), et le dernier cas trouverait
`return "#ffffff"; // the paper` (`sample-text-contrast.mjs:38`).

- [ ] **Step 3 : Write the minimal implementation**

Créer `skills/chart-native/scripts/lib/ground-of.mjs` :
```js
// The REAL ground a rendered page sits on, derived from the produced config the way the
// components derive it (deriveFurniture). Shared by BOTH contrast snaps so the answer cannot
// diverge between the static and the interactive entry point — a second copy is how the two
// layers of guards came to disagree in the first place.
import { readFileSync } from "node:fs";
import { deriveFurniture } from "../../src/core/tokens.ts";

export function groundOf(configPath) {
  if (!configPath) return "#ffffff"; // manual run with no CONFIG: the light default IS white
  try {
    const cfg = JSON.parse(readFileSync(configPath, "utf8"));
    return deriveFurniture(
      typeof cfg.themeBg === "string" ? cfg.themeBg : undefined,
    ).bg;
  } catch {
    return "#ffffff";
  }
}
```

Dans `sample-text-contrast.mjs`, changer la signature et le repli :
```js
// `ground` is passed IN (page.evaluate(fn, arg)) rather than closed over — the module stays
// closure-free, which is what Playwright's fn.toString() serialisation requires (:11-13).
export function sampleTextContrast(ground) {
```
```js
    return ground; // the REAL ground of this page, not an assumed sheet of paper
```
Mettre à jour le bloc « Known limitations » (`:23-26`) : le repli n'est plus « paper #ffffff », il
est « le sol dérivé de la config ».

Dans les deux snaps, ajouter l'import à côté de celui de `sampleTextContrast` (`snap-contrast.mjs:15`) :
```js
import { groundOf } from "./lib/ground-of.mjs";
```
et remplacer la ligne `const samples = await page.evaluate(sampleTextContrast);` (`snap-contrast.mjs:66`,
et son équivalent dans `snap-interactive-contrast.mjs`) par :
```js
const ground = groundOf(process.env.CONFIG);
const samples = await page.evaluate(sampleTextContrast, ground);
```
(`snap-interactive-contrast.mjs` lit déjà `process.env.CONFIG` pour `lang`, `:77-80` — réutiliser
la même lecture plutôt qu'en ouvrir une seconde.)

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/sample-text-contrast-ground.test.ts
```
Attendu : PASS, 4/4.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `return "#ffffff"; // the paper` dans `bgAt`, relancer : Attendu **1 test en échec**
(`should hand the ground to the sampler, not hardcode it`). Restaurer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/chart-native/scripts/lib skills/chart-native/scripts/snap-contrast.mjs skills/chart-native/scripts/snap-interactive-contrast.mjs skills/chart-native/tests/sample-text-contrast-ground.test.ts
git commit -m "fix(chart-native): the contrast sampler measures the real ground, not assumed paper"
```

---

### Task 14 : la fenêtre des snaps suit le canal que `produce` leur threade déjà

**Files:**
- Create: `skills/chart-native/scripts/lib/snap-viewport.mjs`
- Modify: `skills/chart-native/scripts/snap-contrast.mjs` (`:55`)
- Modify: `skills/chart-native/scripts/snap-interactive-contrast.mjs` (`:55`)
- Create: `skills/chart-native/tests/snap-viewport-follows-channel.test.ts`

**Interfaces:**
- Consumes: `CHANNEL_POLICY` (`lib/core/channel-policy.ts:31`) — `mediaSize` par canal
  (social-vertical 1080×1920, social-feed 1080×1080, article-web 1200×675, print 2480×1748) ;
  `STATIC_DEVICE_SCALE = 2` (`skills/chart-native/vite.config.ts:52`).
- Produces: dans **`skills/chart-native/scripts/lib/snap-viewport.mjs`** (un module propre, pas une
  seconde fonction dans `ground-of.mjs`, qui deviendrait un fourre-tout) :
  `export function snapViewportFor(channel: string | undefined): { width: number; height: number }`
  et `export const STATIC_DEVICE_SCALE = 2`. La tâche 15 consomme `STATIC_DEVICE_SCALE`.

**Le fait mesuré :** les deux snaps ouvrent un viewport **constant 900×560** (`:55` dans les deux
fichiers, ligne byte-identique), et **aucun des deux ne lit `SPLASH_CHANNEL`** — que `produce.mjs`
leur threade pourtant déjà (`:181`, `const env = { …, SPLASH_CHANNEL: channel }`). Le statique
social-vertical fait **540×960 CSS** (1080×1920 ÷ 2) : tout ce qui est sous ~536 px lit un sol
fantôme. Le dépôt a déjà payé cette leçon (`snap-proof.mjs:83-90` : *« a false-positive class
across the whole interactive family »*).

- [ ] **Step 1 : Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { snapViewportFor } from "../scripts/lib/snap-viewport.mjs";

describe("the contrast snaps open the window the deliverable is rendered in", () => {
  it("should size the viewport from the channel's media box", () => {
    // 1080x1920 / STATIC_DEVICE_SCALE(2) = the CSS box vite.config.ts:61-62 builds.
    expect(snapViewportFor("social-vertical")).toEqual({ width: 540, height: 960 });
    expect(snapViewportFor("social-feed")).toEqual({ width: 540, height: 540 });
    expect(snapViewportFor("article-web")).toEqual({ width: 600, height: 338 });
  });

  it("should keep the historical 900x560 when no channel is threaded", () => {
    // A manual run without SPLASH_CHANNEL must not change behaviour.
    expect(snapViewportFor(undefined)).toEqual({ width: 900, height: 560 });
  });

  it("should be what both snaps actually call", () => {
    for (const f of ["snap-contrast.mjs", "snap-interactive-contrast.mjs"]) {
      const src = readFileSync(join(import.meta.dir, "..", "scripts", f), "utf8");
      expect(src).toContain("snapViewportFor");
      expect(src).toContain("SPLASH_CHANNEL");
      expect(src).not.toContain("width: 900, height: 560");
    }
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/snap-viewport-follows-channel.test.ts
```
Attendu : ÉCHEC — le module n'existe pas ; confirmer aussi :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && grep -c "SPLASH_CHANNEL" skills/chart-native/scripts/snap-contrast.mjs skills/chart-native/scripts/snap-interactive-contrast.mjs
# → 0 et 0
```

- [ ] **Step 3 : Write the minimal implementation**

Créer `skills/chart-native/scripts/lib/snap-viewport.mjs` :
```js
// The window a contrast snap must open: the CSS box the deliverable is actually rendered in.
// Both snaps used a constant 900x560 while produce.mjs threaded SPLASH_CHANNEL to them (:181)
// and neither read it — so a social-vertical static (540x960 CSS) had everything below ~536px
// measured against a phantom ground. Absent channel ⇒ the historical box, byte-identical.
import { CHANNEL_POLICY } from "../../../../lib/core/channel-policy.ts";

/** Mirrors vite.config.ts:52 — the static path lays out at mediaSize/2 and screenshots at
 *  deviceScaleFactor 2. */
export const STATIC_DEVICE_SCALE = 2;

export function snapViewportFor(channel) {
  const entry = channel ? CHANNEL_POLICY[channel] : undefined;
  if (!entry) return { width: 900, height: 560 };
  return {
    width: Math.round(entry.mediaSize.width / STATIC_DEVICE_SCALE),
    height: Math.round(entry.mediaSize.height / STATIC_DEVICE_SCALE),
  };
}
```

Dans chaque snap, remplacer `:55` :
```js
const viewport = snapViewportFor(process.env.SPLASH_CHANNEL);
const page = await browser.newPage({ viewport, deviceScaleFactor: STATIC_DEVICE_SCALE });
```
Et dans `snap-interactive-contrast.mjs` UNIQUEMENT, après `page.goto` et l'attente du SVG, ajouter
la croissance en hauteur (le dist interactif coule : `core/ChartFrame.tsx:179-249` en flux,
`InteractiveHeatmapChart.tsx:17` `height = 480`, `index.html:13` `padding:24px`) :
```js
// The interactive dist FLOWS taller than its plot box (header + source footer sit outside the
// height-constrained div, ChartFrame.tsx:188-215 and :225-247). Clipping there is the exact
// false-positive class snap-proof.mjs:83-90 records. Grow the window to the document.
const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
if (docHeight > viewport.height)
  await page.setViewportSize({ width: viewport.width, height: docHeight });
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/snap-viewport-follows-channel.test.ts
```
Attendu : PASS, 3/3.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `const page = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });`
dans `snap-contrast.mjs`, relancer : Attendu **1 test en échec**
(`should be what both snaps actually call`). Restaurer : 0 échec.

- [ ] **Step 6 : Vérification LIVE — un rendu réel, pas seulement l'unité**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native
SPLASH_CHANNEL=social-vertical bun scripts/produce.mjs bar assets/sample-data/bar.json /tmp/snap14 static; echo "exit=$?"
```
Attendu : `exit=0`, et la sortie de `snap-contrast` ne rapporte **aucune** violation attribuée à un
fond blanc pour un élément situé sous 560 px. **Ne PAS conclure « le canal social-vertical est
rouvert » ici** — la décision § 7 ② l'interdit tant que la tâche 18 n'est pas verte.

- [ ] **Step 7 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/chart-native/scripts/lib/snap-viewport.mjs skills/chart-native/scripts/snap-contrast.mjs skills/chart-native/scripts/snap-interactive-contrast.mjs skills/chart-native/tests/snap-viewport-follows-channel.test.ts
git commit -m "fix(chart-native): contrast snaps open the channel's window instead of a constant 900x560"
```

---

### Task 15 : l'échelle du livrable entre dans la provision grand-texte

**Files:**
- Modify: `skills/chart-native/src/core/contrast-scan.ts` (`wcagMinContrast`)
- Modify: `skills/chart-native/scripts/snap-contrast.mjs` (l'appel à `wcagMinContrast`)
- Modify: `skills/chart-native/src/core/contrast-scan.test.ts` (ou le fichier de test existant)

**Interfaces:**
- Consumes: `MIN_CONTRAST = 4.5`, `LARGE_TEXT_CONTRAST = 3`, `LARGE_TEXT_NORMAL_PX = 24`,
  `LARGE_TEXT_BOLD_PX = 18.66` (`lib/core/contrast.ts:4-7`).
- Produces: `wcagMinContrast(fontPx: number, bold: boolean, deviceScale?: number): number` —
  un paramètre OPTIONNEL, défaut 1, donc byte-identique pour tout appelant existant.

**Le fait, et sa borne.** Le livrable statique est rendu à `deviceScaleFactor: 2` : un libellé de
44 px dans le PNG livré est mesuré **22 px CSS**, sous le seuil grand-texte de 24
(`lib/core/contrast.ts:6`) — la garde exige 4,5:1 là où WCAG SC 1.4.3 donne 3:1. **La correction
est bornée au chemin STATIQUE** (un PNG de taille fixe : ce que le lecteur voit est le pixel
livré). Le chemin INTERACTIF ne bouge pas : il est responsive, et le px CSS **est** ce que le
lecteur obtient. *(Note : le facteur portrait `1.7` de `scripts/audit.mjs:29-30` EST appliqué — via
`audit.mjs:52` → `mount.tsx:216` — mais seulement dans le harnais d'audit ; il n'atteint jamais le
chemin produce, car `mount.tsx:185-190` ne passe aucun `scale`. Il n'entre donc pas dans ce calcul.)*

- [ ] **Step 1 : Write the failing test**

```ts
describe("wcagMinContrast accounts for the delivered scale", () => {
  it("should treat a 22px CSS label delivered at 2x as large text", () => {
    // The delivered PNG carries it at 44px. SC 1.4.3's large-text provision is about what the
    // reader sees, and for a fixed-size media export that is the delivered pixel.
    expect(wcagMinContrast(22, false, 2)).toBe(LARGE_TEXT_CONTRAST);
  });

  it("should keep the strict floor for a genuinely small label", () => {
    expect(wcagMinContrast(11, false, 2)).toBe(MIN_CONTRAST);
  });

  it("should be byte-identical when no scale is given (the interactive path)", () => {
    expect(wcagMinContrast(22, false)).toBe(MIN_CONTRAST);
    expect(wcagMinContrast(24, false)).toBe(LARGE_TEXT_CONTRAST);
    expect(wcagMinContrast(19, true)).toBe(LARGE_TEXT_CONTRAST);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test src/core/contrast-scan.test.ts
```
Attendu : ÉCHEC sur le 1er cas — `wcagMinContrast(22, false, 2)` retourne `4.5` (le 3e argument
est ignoré : la fonction n'en a que deux).

- [ ] **Step 3 : Write the minimal implementation**

```ts
/**
 * The WCAG floor for one label. `deviceScale` is the factor the DELIVERABLE is exported at
 * (STATIC_DEVICE_SCALE = 2 for the media path, vite.config.ts:52). SC 1.4.3's large-text
 * provision is about the text the reader sees; for a fixed-size PNG that is the delivered
 * pixel, not the CSS px the layout was authored in. Defaults to 1 — the interactive path is
 * responsive, where the CSS px IS what the reader gets, so every existing caller is unchanged.
 */
export function wcagMinContrast(
  fontPx: number,
  bold: boolean,
  deviceScale = 1,
): number {
  const delivered = fontPx * deviceScale;
  const large = bold
    ? delivered >= LARGE_TEXT_BOLD_PX
    : delivered >= LARGE_TEXT_NORMAL_PX;
  return large ? LARGE_TEXT_CONTRAST : MIN_CONTRAST;
}
```
Dans `snap-contrast.mjs` **seulement** (le chemin statique), passer l'échelle :
```js
const min = wcagMinContrast(s.fontPx, s.bold, STATIC_DEVICE_SCALE);
```
`snap-interactive-contrast.mjs` garde son appel à deux arguments — c'est la borne.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remplacer `const delivered = fontPx * deviceScale;` par `const delivered = fontPx;`, relancer :
Attendu : **1 test en échec** (`should treat a 22px CSS label delivered at 2x as large text`).
Restaurer : 0 échec.
**Deuxième mutation, dans l'autre sens** (c'est un desserrement : il faut prouver qu'il ne desserre
pas trop) : passer `STATIC_DEVICE_SCALE` à `4` dans l'appel de `snap-contrast.mjs` et vérifier que
`wcagMinContrast(11, false, 4)` retournerait `LARGE_TEXT_CONTRAST` — donc qu'un libellé de 11 px
échapperait au seuil strict. C'est précisément pourquoi le facteur est **lu de la constante de
build**, jamais écrit à la main. Restaurer `STATIC_DEVICE_SCALE`.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/chart-native/src/core/contrast-scan.ts skills/chart-native/src/core/contrast-scan.test.ts skills/chart-native/scripts/snap-contrast.mjs
git commit -m "fix(chart-native): the static contrast floor accounts for the delivered device scale"
```

---

### Task 16 : la bande source de la carte reçoit le sol que la garde lui suppose

**Files:**
- Modify: `skills/map-native/src/core/MapFrame.tsx` (`:106-116` `pillStyle`, `:169-190` la bande source)
- Modify: `skills/map-native/src/core/map-produce-conformance.ts` (`furnitureGround`, `:117-119`)
- Modify: `skills/map-native/tests/conformance.test.ts`

**Interfaces:**
- Consumes: `resolveFrameColors(themeBg?: string, houseHue?: string): FrameColors`
  (`lib/core/theme.ts:183`) — `pill` vaut `rgba(255,255,255,0.92)` au défaut clair
  (`lib/core/theme.ts:47-51`) et `rgba(r,g,b,0.82)` sur un sol arbitraire (`:205`).
- Produces: `export function furnitureGround(furnitureBg: string | undefined, houseHue?: string): string`
  — le **pire** composite du pill sur les deux extrêmes de basemap.

**Le fait mesuré :** `pillStyle` n'est appliqué qu'à la bande **titre** (`MapFrame.tsx:136`, seule
occurrence hors sa définition `:106`) ; en mode responsive la bande **source** ne reçoit rien
(`:182-188` → `{}`), et **les sept composants web passent `responsive`** (`SymbolMap.tsx:609`,
`ChoroplethMap.tsx:573`, `HexGridMap.tsx:445`, `CartogramMap.tsx:430`, `DotDensityMap.tsx:497`,
`LocatorMap.tsx:673`, `RouteMap.tsx:597`). Le texte est donc du `muted` nu **posé sur le basemap**,
pendant que la garde config-time mesure contre un fond **supposé** (`resolveThemeBg(bg) ?? "#ffffff"`).
On ne fait pas deviner une tuile à la garde : **on donne un sol au texte**, ce qui rend
l'hypothèse vraie — puis la garde mesure ce sol pour de bon.

- [ ] **Step 1 : Write the failing test**

```ts
import { contrastRatio } from "../../../lib/core/contrast";
import { resolveFrameColors } from "../src/theme/map-tokens";
import { furnitureGround } from "../src/core/map-produce-conformance";

describe("map furniture stands on a ground, not on a basemap tile", () => {
  it("should keep the source text legible over the WORST basemap the pill can sit on", () => {
    // The light pill is rgba(255,255,255,0.92): over a black tile it composites to ~#EBEBEB.
    // muted #5f5f5f must still clear 4.5:1 THERE, not only against the assumed white.
    const g = furnitureGround(undefined);
    const { muted } = resolveFrameColors(undefined);
    expect(contrastRatio(muted, g)).toBeGreaterThanOrEqual(4.5);
  });

  it("should not answer plain white for the light default", () => {
    // furnitureGround returned `resolveThemeBg(bg) ?? "#ffffff"` — the assumption, not the
    // composite. #5f5f5f on pure white is 6.38:1 and PASSES; on a real light tile it does not.
    expect(furnitureGround(undefined).toLowerCase()).not.toBe("#ffffff");
  });

  it("should give the responsive source band the same pill the title band has", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "src", "core", "MapFrame.tsx"),
      "utf8",
    );
    // two spreads of pillStyle now: the title band and the source band
    expect(src.match(/\.\.\.pillStyle/g)?.length).toBe(2);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test tests/conformance.test.ts
```
Attendu : ÉCHEC sur les cas 2 et 3 (`furnitureGround(undefined)` vaut `"#ffffff"` ; il n'y a
**qu'un** `...pillStyle` dans `MapFrame.tsx`). Confirmer :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && grep -c '\.\.\.pillStyle' skills/map-native/src/core/MapFrame.tsx
# → 1
```

- [ ] **Step 3 : Write the minimal implementation**

Dans `MapFrame.tsx`, la bande source (`:169-190`) prend le même sol que le titre :
```tsx
      {/* Source band (bottom-left) — ALWAYS rendered, incl. video */}
      <div
        data-testid="map-source"
        style={{
          position: "absolute",
          bottom: m,
          left: m,
          zIndex: 10,
          opacity: furnitureOpacity,
          fontSize: frame.type.source,
          color: colors.muted,
          // The source band gets the SAME ground the title band has. Without it the muted text
          // sat bare on the basemap while the config-time guard measured it against an assumed
          // one — the two never agreed, and neither was wrong on its own terms.
          ...pillStyle,
        }}
      >
```
(le `textShadow` de la branche vidéo est déjà DANS `pillStyle` pour `responsive === false`,
`:112-116` — donc le remplacement est byte-identique pour la vidéo.)

Dans `map-produce-conformance.ts` :
```ts
/** The ground the furniture text actually stands on: the pill, composited over the WORST
 *  basemap it can overlay. `resolveThemeBg(bg) ?? "#ffffff"` was the ASSUMPTION — true only
 *  because MapFrame now gives the source band that pill (see MapFrame.tsx), and still wrong by
 *  the pill's alpha. Measuring the composite is what makes the guard's answer the render's. */
export function furnitureGround(
  furnitureBg: string | undefined,
  houseHue?: string,
): string {
  const { pill } = resolveFrameColors(furnitureBg, houseHue);
  // rgba(r,g,b,a) → composite over both extremes; keep the one with the LEAST headroom.
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(pill);
  if (!m) return resolveThemeBg(furnitureBg) ?? "#ffffff";
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const composite = (under: number) =>
    `#${[r, g, b]
      .map((c) =>
        Math.round(a * c + (1 - a) * under)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  const onBlack = composite(0);
  const onWhite = composite(255);
  const ink = resolveFrameColors(furnitureBg, houseHue).muted;
  return contrastRatio(ink, onBlack) <= contrastRatio(ink, onWhite)
    ? onBlack
    : onWhite;
}
```
Importer `contrastRatio` depuis `../../../../lib/core/contrast`. Mettre à jour l'unique appelant
(`:183`, `bg: furnitureGround(furnitureBg)`) pour passer aussi la teinte maison si elle est en main.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bunx tsc --noEmit && bun test
```
Attendu : PASS. Si un type de carte rougit désormais sur son `muted`, **c'est un vrai défaut de
rendu** : le corriger au token, jamais en relâchant la garde.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `return resolveThemeBg(furnitureBg) ?? "#ffffff";` en tête de `furnitureGround`, relancer :
Attendu : **1 test en échec** (`should not answer plain white for the light default`). Puis retirer
le `...pillStyle` de la bande source : Attendu **1 test de plus en échec** (le comptage à 2).
Restaurer les deux : 0 échec.

- [ ] **Step 6 : Vérification au RENDU — la seule qui compte pour une couleur**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native
bun scripts/produce.mjs symbol assets/sample-data/symbol.json /tmp/map16 static; echo "exit=$?"
```
Attendu : `exit=0`. **Ouvrir le PNG** et constater que la ligne « Source : » repose sur une pastille,
comme le titre. Ne PAS conclure d'un grep du bundle (leçon gravée, CLAUDE.md).

- [ ] **Step 7 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/map-native/src/core/MapFrame.tsx skills/map-native/src/core/map-produce-conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "fix(map-native): the source band stands on the pill the guard measures against"
```

---

### Task 17 : `checkSymbolConformance` est BRANCHÉ — une garde écrite qui n'a jamais parlé

**Files:**
- Modify: `skills/map-native/src/core/map-produce-conformance.ts` (`runProduceMapConformance`, `:147-200`)
- Modify: `skills/map-native/tests/conformance.test.ts`

**Interfaces:**
- Consumes: `checkSymbolConformance(input, textColors): string[]` (`skills/map-native/src/conformance.ts:201`)
  — **inchangée** ; `symbolGeometry(data: SymbolData, maxRadius: number): SymbolGeometry`
  (`skills/map-native/src/symbol-geo.ts:71`), pure, sans basemap, qui calcule `legend`, `maxRadius`,
  `bounds`, `symbols` ; `furnitureColorsFor(config)` (`map-produce-conformance.ts:63`).
- Produces: rien pour les autres tâches.

**Le fait, et pourquoi il compte plus que les autres :** les règles de légende **existent, écrites**
— présence de la légende, nombre de paliers, rayon max, unité des libellés. Vérifié :
`checkSymbolConformance` n'est référencé QUE par `skills/map-native/tests/conformance.test.ts` et
par un **commentaire** de `skills/map-dw/src/map-spec.ts:432`.
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && grep -rn "checkSymbolConformance" skills lib | grep -v "output-proof"
```
`produce.mjs:177-178` n'invoque que `runProduceMapConformance`, dont l'en-tête écrit lui-même que la
géométrie de légende est **hors périmètre** (`map-produce-conformance.ts:13-15`). **« 0 violation »
est donc le comportement correct d'une garde jamais branchée, pas d'une garde qui réussit.**

**Périmètre honnête du branchement :** on lui donne ce que la CONFIG peut prouver (`sizingMode`,
`hasLegend`, `legendStops`, `maxRadiusPx`, `viewportMinPx`, `pointsWithData`, `boundsNonEmpty`,
`labeled`, `valueUnit`, `labelHasUnit`). `strokeContrast` et `staticFallbackLabeled` restent aux
snaps de rendu : les inventer serait un refus non mesuré, exactement ce que la décision 2 interdit.

- [ ] **Step 1 : Write the failing test**

```ts
describe("runProduceMapConformance actually asks the symbol rules", () => {
  const base = {
    type: "symbol",
    title: "T",
    altInsight: "a",
    source: { name: "S" },
    points: [
      { lon: 6.1, lat: 46.2, label: "Genève", value: 100 },
      { lon: 7.4, lat: 46.9, label: "Berne", value: 40 },
    ],
    maxRadius: 30,
    format: { width: 1200, height: 675 },
  };

  it("should refuse a symbol map with no legend", () => {
    const r = runProduceMapConformance("symbol", { ...base, hasLegend: false });
    expect(r.checked).toBe(true);
    expect(r.violations.join(" ")).toContain("legend");
  });

  it("should refuse radius-proportional sizing", () => {
    const r = runProduceMapConformance("symbol", { ...base, sizingMode: "radius" });
    expect(r.violations.join(" ")).toContain("area-proportional");
  });

  it("should refuse a symbol that swallows the map", () => {
    // SYMBOL_MAX_VIEWPORT_FRACTION = 0.25 (conformance.ts:198): 30px max radius is fine in a
    // 675px-tall frame, 300px is not.
    const r = runProduceMapConformance("symbol", { ...base, maxRadius: 300 });
    expect(r.violations.join(" ")).toContain("too large");
  });

  it("should pass a well-formed symbol config", () => {
    const r = runProduceMapConformance("symbol", base);
    expect(r.violations).toEqual([]);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test tests/conformance.test.ts
```
Attendu : ÉCHEC sur les 3 premiers cas — `r.violations` est `[]` pour tous, parce que la garde
n'est branchée nulle part. Noter : **3 tests en échec, tous parce que la garde se tait.**

- [ ] **Step 3 : Write the minimal implementation**

Dans `map-produce-conformance.ts`, ajouter les imports :
```ts
import { checkSymbolConformance } from "../conformance";
import { symbolGeometry } from "../symbol-geo";
```
et, dans `runProduceMapConformance`, après le bloc furniture existant et avant le `return` :
```ts
  // SYMBOL — the per-type rules that were written and never called (the only callers were
  // their own tests, plus a COMMENT in skills/map-dw/src/map-spec.ts:432). The geometry core
  // is pure (symbol-geo.ts:71, no basemap, no MapTiler), so the legend stops, the max radius
  // and the bounds are all config-provable HERE, before a render costs anything.
  // DELIBERATELY NOT fed: `strokeContrast` and `staticFallbackLabeled`. They are render facts,
  // and inventing them would be an unmeasured refusal — the render snaps keep them.
  if (type === "symbol") {
    const points = Array.isArray(config.points)
      ? (config.points as { lon: number; lat: number; value: number }[])
      : [];
    const fmt = config.format as { width: number; height: number } | undefined;
    const maxRadius =
      typeof config.maxRadius === "number" ? config.maxRadius : 30;
    let legendStops = 0;
    let boundsNonEmpty = false;
    if (points.length > 0) {
      const geo = symbolGeometry({ points } as Parameters<typeof symbolGeometry>[0], maxRadius);
      legendStops = geo.legend.length;
      boundsNonEmpty =
        geo.bounds[0] !== geo.bounds[2] || geo.bounds[1] !== geo.bounds[3];
    }
    const colors = furnitureColorsFor(config as Parameters<typeof furnitureColorsFor>[0]);
    violations.push(
      ...checkSymbolConformance(
        {
          title: String(config.title ?? ""),
          description:
            typeof config.description === "string" ? config.description : undefined,
          source: (config.source ?? {}) as { name?: string; url?: string },
          sizingMode: config.sizingMode === "radius" ? "radius" : "area",
          hasLegend: config.hasLegend !== false,
          legendStops,
          maxRadiusPx: maxRadius,
          viewportMinPx: fmt ? Math.min(fmt.width, fmt.height) : 675,
          pointsWithData: points.length,
          boundsNonEmpty,
          // Render-only inputs: give the values the rules treat as "not my business here".
          strokeContrast: Infinity,
          labeled: config.labeled !== false,
          valueUnit:
            typeof config.valueUnit === "string" ? config.valueUnit : undefined,
          labelHasUnit:
            typeof config.labelHasUnit === "boolean"
              ? config.labelHasUnit
              : undefined,
          ...(fmt ? { format: fmt } : {}),
        },
        { text: [colors.ink, colors.muted], bg: colors.bg },
      ),
    );
  }
```
Adapter les noms `colors.ink` / `colors.muted` / `colors.bg` à ce que `furnitureColorsFor` retourne
réellement (`map-produce-conformance.ts:63`) — ne pas deviner : lire la signature avant d'écrire.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec. **Si un output-proof de symbole existant rougit, c'est un vrai défaut
livré** : le corriger, ne pas relâcher la règle.

- [ ] **Step 5 : MUTATION — la garde peut-elle rougir ? (l'étape la plus importante du plan)**

Retirer entièrement le bloc `if (type === "symbol") { … }`, relancer :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test tests/conformance.test.ts
```
Attendu : **3 tests en échec** (aucune légende / rayon-proportionnel / symbole trop grand). C'est
exactement l'état d'avant : la garde écrite, muette. Restaurer : 0 échec.
**Sans ce chiffre, la tâche n'est pas finie** — c'est le défaut même de cette famille.

- [ ] **Step 6 : Vérification LIVE**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native
bun scripts/produce.mjs symbol assets/sample-data/symbol.json /tmp/map17 static
```
Attendu : la ligne `[produce map] conformance: OK (0 violations)` — et cette fois le « 0 » vient
d'une garde qui a réellement parlé.

- [ ] **Step 7 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/map-native/src/core/map-produce-conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "fix(map-native): wire checkSymbolConformance into produce — it had never been called"
```

---

### Task 18 : la légende symbole dimensionne sa gouttière sur le label réel le plus large

**Files:**
- Modify: `skills/map-native/src/SymbolMap.tsx` (`:528` le x du texte, `:531` la largeur du SVG,
  `:173` et `:537` `labelOverhang: 80`)
- Create: `skills/map-native/tests/symbol-legend-fit.test.ts`

**Interfaces:**
- Consumes: `endLabelGutterPx(labels: string[], fontSize: number, opts: { gapPx: number; floorPx: number; bold?: boolean }): number`
  (`lib/core/text-fit.ts:241-252`) et `textWidth` (`:10-12`).
- Produces: rien pour les autres tâches.

**Le remède existe, dans le cœur partagé, non adopté.** `SymbolMap.tsx:531` écrit
`el.innerHTML = \`<svg width="${max * 2 + 70}" …\`` avec le texte de valeur qui commence à
`max * 2 + 10` (`:528`) — **60 px, quelle que soit la chaîne**, pour une valeur formatée avec son
unité (`labelWithUnit(…)`). Le commentaire de `lib/core/text-fit.ts:234-236` nomme exactement ce
défaut : *« A hardcoded gutter is the recurring failure: it fits the sample's labels, then overflows
once the data's are longer. »* chart-native le ré-exporte et l'utilise
(`skills/chart-native/src/core/text.ts:4`) ; **map-native ne l'importe nulle part** :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && grep -rn "text-fit" skills/map-native/ ; echo "exit=$?"
# → aucune ligne
```
alors qu'il importe déjà six autres modules de `lib/core`, et entretient son propre estimateur
(`symbol-labels.ts:116`, `CHAR_RATIO = 0.62`) qu'il n'emploie que pour l'ancrage MapLibre.

- [ ] **Step 1 : Write the failing test**

Créer `skills/map-native/tests/symbol-legend-fit.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { endLabelGutterPx, textWidth } from "../../../lib/core/text-fit";

describe("the symbol legend is sized on the labels it will draw", () => {
  it("should reserve more than the fixed 60px for a long unit-carrying label", () => {
    // "8 magnitud…" — the measured clip. The legend text starts at max*2+10 and the SVG is
    // max*2+70 wide, i.e. exactly 60px for the string, whatever the string is.
    const labels = ["8 magnitude Richter", "4 magnitude Richter"];
    const gutter = endLabelGutterPx(labels, 11, { gapPx: 10, floorPx: 60 });
    expect(gutter).toBeGreaterThan(60);
    expect(gutter).toBeGreaterThanOrEqual(textWidth(labels[0], 11) + 10);
  });

  it("should not shrink below the historical floor for short labels", () => {
    expect(endLabelGutterPx(["8", "4"], 11, { gapPx: 10, floorPx: 60 })).toBe(60);
  });

  it("should be what SymbolMap actually calls", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "src", "SymbolMap.tsx"),
      "utf8",
    );
    expect(src).toContain("endLabelGutterPx");
    expect(src).not.toContain("max * 2 + 70");
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test tests/symbol-legend-fit.test.ts
```
Attendu : ÉCHEC sur le 3e cas — `SymbolMap.tsx` contient encore `max * 2 + 70` et n'appelle pas
`endLabelGutterPx`. Les cas 1 et 2 passent : ils décrivent la fonction partagée, qui est déjà juste.

- [ ] **Step 3 : Write the minimal implementation**

Dans `SymbolMap.tsx`, importer le remède partagé :
```tsx
import { endLabelGutterPx } from "../../../lib/core/text-fit";
```
et, à l'endroit où la légende est composée (autour de `:520-540`), mesurer avant d'écrire :
```tsx
// The legend gutter is MEASURED on the strings this legend will actually draw, not fixed at
// 60px. lib/core/text-fit.ts:234-236 names this exact failure mode: "A hardcoded gutter is the
// recurring failure: it fits the sample's labels, then overflows once the data's are longer."
// chart-native has used this since the stacked-area clip; map-native never imported it.
const legendLabels = stops.map((s) => labelWithUnit(s.value, valueUnit));
const legendGutter = endLabelGutterPx(legendLabels, 11, {
  gapPx: 10,
  floorPx: 60, // the historical width — short labels are byte-identical
});
```
puis :
```tsx
// :528 — the value text starts one gap after the largest circle
`<text x="${max * 2 + 10}" y="…" font-size="11" fill="${theme.ink}">…</text>`
// :531 — the SVG is as wide as the circles plus the MEASURED gutter
el.innerHTML = `<svg width="${max * 2 + legendGutter}" height="${h}">${rows}</svg>`;
```
et remplacer les deux `labelOverhang: 80` en dur (`:173`, `:537`) par
`labelOverhang: Math.max(80, legendGutter)` — la constante devient un plancher, pas une promesse
(`map-format.ts:107` prend déjà `Math.max(BASE_INSET, labelOverhang)`).

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `el.innerHTML = \`<svg width="${max * 2 + 70}" …\``, relancer : Attendu **1 test en échec**
(`should be what SymbolMap actually calls`). Restaurer : 0 échec.

- [ ] **Step 6 : Vérification au RENDU — la seule qui décide d'un clip**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native
bun scripts/produce.mjs symbol assets/sample-data/symbol.json /tmp/map18 static
```
**Ouvrir le PNG** : la légende doit afficher les libellés en entier, unité comprise (le cas mesuré
était « 8 magnitud… »). Si `assets/sample-data/symbol.json` ne porte pas d'unité-mot longue, en
fabriquer une copie qui en porte une et produire depuis elle — un échantillon qui ne provoque pas le
défaut ne prouve rien.

- [ ] **Step 7 : PHASE 5 CLOSE — les deux moitiés sont faites**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge && bun run check
```
Attendu : **22/22**. C'est ici, et pas avant, que la décision § 7 ② est honorée : les faux positifs
(13-16) et le raté (17-18) ont été traités dans la même passe, donc le canal social-vertical peut
être considéré comme rouvert — sous la réserve du risque 4 de la spec (aucune passe de rendu ne l'a
encore parcouru ; le pin carré/portrait n'a jamais été exercé).

- [ ] **Step 8 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/map-native/src/SymbolMap.tsx skills/map-native/tests/symbol-legend-fit.test.ts
git commit -m "fix(map-native): measure the symbol legend gutter instead of fixing it at 60px"
```

---

## Phase 6 — l'axe de la FONCTIONNALITÉ et du CLAVIER (D21, D05)

### Task 19 : `lib/core/feature-reach.ts` — une limite de rendu MESURÉE devient une donnée

**Files:**
- Create: `lib/core/feature-reach.ts`
- Create: `lib/core/feature-reach.test.ts`

**Interfaces:**
- Consumes: `VisualFormat` (`lib/core/vocabulary.ts`). Rien d'autre — `lib/core` n'importe rien,
  et c'est ce qui rend ce module lisible depuis `lib/brain`, `lib/loop` ET `skills/`.
- Produces:
  ```ts
  export type RenderFeature = "keyboard" | "hover-values" | "direct-labels" | "annotations";
  export type FeatureLimit = {
    feature: RenderFeature;
    /** The sentence a journalist reads — the SAME one the refusal shows. */
    sentence: string;
    /** WHERE this was established. A file:line, or the command that measured it. A limit
     *  without one is an opinion, and this module refuses it. */
    measuredBy: string;
  };
  export function registerFeatureLimits(
    engine: string,
    limits: (nativeType: string, format: VisualFormat) => FeatureLimit[],
  ): void;
  export function featureLimits(
    engine: string,
    nativeType: string,
    format: VisualFormat,
  ): FeatureLimit[];
  export function clearFeatureLimits(): void; // tests only
  ```
  Les tâches 20 et 21 en dépendent.

**Pourquoi on CRÉE au lieu d'étendre.** La spec désigne `skills/chart-native/src/video-reach.ts`
comme le patron à généraliser. **Ce fichier n'est pas sur `main`** :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && ls skills/chart-native/src/video-reach.ts; git branch --list '*motion-narrative*'
# → No such file or directory ; + chore/motion-narrative-grid
```
On reprend donc sa **règle**, pas son fichier : la mesure à côté de chaque entrée, et l'entretien
écrit dans le module lui-même. Le registre imite `registerProducer` (`lib/core/registry.ts:64`),
que chaque moteur appelle déjà depuis son manifeste — un seul motif d'enregistrement dans le dépôt.

**Risque 2 de la spec, traité de front :** une table de constructibilité crée un nouveau lieu de
dérive. Les deux contrepoids sont dans le module : (a) `measuredBy` est **obligatoire** et non vide,
donc une entrée non mesurée ne compile pas de fait (le test la refuse) — c'est la décision 2, « pas
de marque préventive sans mesure » ; (b) la règle d'entretien est écrite là où on la lit.

- [ ] **Step 1 : Write the failing test**

Créer `lib/core/feature-reach.test.ts` :

```ts
import { describe, it, expect, beforeEach } from "bun:test";
import {
  registerFeatureLimits,
  featureLimits,
  clearFeatureLimits,
  type FeatureLimit,
} from "./feature-reach";

const KEYBOARD: FeatureLimit = {
  feature: "keyboard",
  sentence: "this interactive map will not be keyboard-navigable",
  measuredBy: "skills/map-native/src/**/*.tsx — zero tabIndex / role=\"img\"",
};

describe("feature-reach — a measured render limit, per (engine, type, format)", () => {
  beforeEach(() => clearFeatureLimits());

  it("should answer per pairing, not per engine", () => {
    registerFeatureLimits("map-native", (_t, format) =>
      format === "interactive" ? [KEYBOARD] : [],
    );
    expect(featureLimits("map-native", "symbol", "interactive")).toEqual([KEYBOARD]);
    expect(featureLimits("map-native", "symbol", "static")).toEqual([]);
  });

  it("should answer empty for an engine that declared nothing", () => {
    expect(featureLimits("chart-native", "bar", "interactive")).toEqual([]);
  });

  it("should refuse a limit with no measurement", () => {
    // A refusal nobody measured is a false in the other direction. THIS is the guard that keeps
    // the table from becoming a sixth place where capability is written and drifts.
    registerFeatureLimits("map-dw", () => [
      { feature: "hover-values", sentence: "s", measuredBy: "  " } as FeatureLimit,
    ]);
    expect(() => featureLimits("map-dw", "choropleth", "static")).toThrow(
      /measuredBy/,
    );
  });

  it("should refuse two registrations for one engine", () => {
    registerFeatureLimits("map-native", () => []);
    expect(() => registerFeatureLimits("map-native", () => [])).toThrow();
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/feature-reach.test.ts
```
Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3 : Write the minimal implementation**

Créer `lib/core/feature-reach.ts` :

```ts
// WHAT A RENDERED FORM CANNOT DO, per (engine, nativeType, format) — and how we know.
//
// The gap this closes: there was NO machine description of render FEATURES anywhere.
// ProducerManifest (lib/core/registry.ts:25-55) carries formats and a flat type list;
// NEWSROOM_CAPABILITIES (lib/newsroom/capabilities.ts:60) describes what the newsroom turned
// ON, never what a type can draw; the KB frontmatter has no `labels:`, no `tooltips:`, no
// `annotations:`. So a promise made mid-dialogue rested entirely on the model reading the
// source — and the sweep measured it reading, then promising the opposite.
//
// ── THIS LIST MUST SHRINK ──────────────────────────────────────────────────────────────────
// A declared limit is a DEBT, not a state. What removes an entry is a RENDER MEASUREMENT that
// comes back green — never an opinion, never a refactor that "should" have fixed it. And what
// ADDS one is equally a measurement: `measuredBy` is required and must be non-empty, because a
// refusal nobody measured is a false in the other direction (decision 2, 2026-07-29).
//
// Registration mirrors registerProducer (lib/core/registry.ts:64): each engine declares its own
// limits from its own manifest, so the fact lives WITH the engine and there is one registration
// idiom in the repo, not two.
import type { VisualFormat } from "./vocabulary";

export type RenderFeature =
  | "keyboard"
  | "hover-values"
  | "direct-labels"
  | "annotations";

export type FeatureLimit = {
  feature: RenderFeature;
  /** The sentence a journalist reads. The offer's declaration and any later refusal show THIS
   *  string — one wording, the rule the video quadrant closure established. */
  sentence: string;
  /** WHERE it was established: a `path:line`, or the command that measured it. */
  measuredBy: string;
};

type LimitsFn = (nativeType: string, format: VisualFormat) => FeatureLimit[];

const REGISTRY = new Map<string, LimitsFn>();

export function registerFeatureLimits(engine: string, limits: LimitsFn): void {
  if (REGISTRY.has(engine))
    throw new Error(
      `feature-reach: ${engine} already declared its limits — one declaration per engine, ` +
        "so there is one answer and not two",
    );
  REGISTRY.set(engine, limits);
}

export function featureLimits(
  engine: string,
  nativeType: string,
  format: VisualFormat,
): FeatureLimit[] {
  const fn = REGISTRY.get(engine);
  if (!fn) return [];
  const out = fn(nativeType, format);
  for (const l of out) {
    if (!l.sentence.trim())
      throw new Error(
        `feature-reach: ${engine}/${nativeType}/${format} declares a ${l.feature} limit with ` +
          "no sentence — a mark a journalist cannot read is a silent removal",
      );
    if (!l.measuredBy.trim())
      throw new Error(
        `feature-reach: ${engine}/${nativeType}/${format} declares a ${l.feature} limit with ` +
          "no measuredBy — an unmeasured refusal closes a capability on a suspicion",
      );
  }
  return out;
}

/** Tests only. Production registers once, at import. */
export function clearFeatureLimits(): void {
  REGISTRY.clear();
}
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test core/feature-reach.test.ts
```
Attendu : PASS, 4/4.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Supprimer le contrôle `if (!l.measuredBy.trim()) throw …`, relancer : Attendu **1 test en échec**
(`should refuse a limit with no measurement`). Restaurer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add lib/core/feature-reach.ts lib/core/feature-reach.test.ts
git commit -m "feat(core): a measured render limit is data, per (engine, type, format)"
```

---

### Task 20 : map-native déclare ses limites mesurées, et map-dw cesse de promettre un top-N

**Files:**
- Create: `skills/map-native/src/feature-limits.ts`
- Create: `skills/map-native/tests/feature-limits.test.ts`
- Modify: `skills/map-native/src/manifest.ts` (importer le module pour son effet de bord)
- Modify: `skills/map-dw/src/map-spec.ts` (`:420-434` — le commentaire ET la chaîne)
- Modify: `skills/map-dw/eval/` ou `skills/map-dw/src/*.test.ts` (le test du refus)

**Interfaces:**
- Consumes: `registerFeatureLimits`, `featureLimits`, `FeatureLimit` (tâche 19).
- Produces: `export function mapNativeLimits(nativeType: string, format: VisualFormat): FeatureLimit[]`
  et `export const SYMBOL_LABELS_INTERACTIVE: string` (la phrase que map-dw CITE plutôt que d'en
  inventer une). Le module s'auto-enregistre à l'import (`registerFeatureLimits("map-native", mapNativeLimits)`),
  et `skills/map-native/src/manifest.ts` l'importe pour cet effet de bord. La tâche 21 ne lit que
  `featureLimits`, jamais `mapNativeLimits` directement.

**Les deux limites, avec leur mesure :**

1. **Clavier (D05).** `../splash-harness/scripts/deep-verify.mjs:56` cherche
   `[role="img"][tabindex="0"]` sur la page interactive livrée. chart-native le porte
   (**41 composants**, `grep -rl "tabIndex" skills/chart-native/src --include="*.tsx" | wc -l` → `41`) ;
   **map-native ne le porte pas du tout** (`grep -rn 'tabIndex\|role="img"' skills/map-native/src --include="*.tsx"`
   → aucune ligne, sur 36 `.tsx`) : les marques sont dessinées dans un `<canvas>` WebGL, **il n'y a
   aucun nœud DOM à focuser**. Ce n'est pas « six cas ont raté un attribut » : c'est une capacité
   qu'aucun correctif ne rend, seulement un calque DOM parallèle — un chantier, pas un fix
   (spec § 9 : écrire les capacités manquantes est HORS PÉRIMÈTRE).
2. **Labels de symboles en interactif (D21).** `SymbolMap.tsx:324-327` monte le calque
   `symbol-labels` `if (!interactive || staticFallbackLabels)` — *« The LIVE interactive page stays
   hover-only — tooltip XOR labels »* ; le drapeau n'est posé que par le harnais de capture
   (`symbol-labels.ts:53-55`, `?staticLabels=1`). Et **aucun top-N n'existe** :
   `symbol-geo.ts:87-89` trie value-desc puis mappe **tous** les points (aucun `.slice()`),
   `symbol-labels.ts:35-45` fait un label par symbole, et `SymbolMap.tsx:346-347`
   (`text-allow-overlap: false` + `text-optional: true`) autorise MapLibre à en **abandonner** par
   collision.

**Le pire, et c'est le cœur de la tâche : c'est un message de REFUS du produit qui porte la fausse
promesse.** `skills/map-dw/src/map-spec.ts:434` refuse les cartes symbole Datawrapper en renvoyant
vers map-native, *« which directly labels the top-N circles by name + value »*. La source le
contredit deux fois. La règle § 7 ③ vaut aussi pour nous : **y compris quand la fausse promesse est
écrite par nous.**

- [ ] **Step 1 : Write the failing test**

Créer `skills/map-native/tests/feature-limits.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { featureLimits } from "../../../lib/core/feature-reach";
import "../src/manifest";

describe("map-native declares what its interactive render cannot do", () => {
  it("should declare the keyboard limit on every interactive type", () => {
    for (const t of ["symbol", "choropleth", "route", "locator", "hex-grid", "dot-density", "cartogram"]) {
      const ls = featureLimits("map-native", t, "interactive");
      const kb = ls.find((l) => l.feature === "keyboard");
      expect(kb, `${t} must declare its keyboard limit`).toBeDefined();
      expect(kb!.sentence).toContain("keyboard");
      expect(kb!.measuredBy).toContain("map-native");
    }
  });

  it("should declare NO keyboard limit on the static render", () => {
    // A static PNG has no interaction to navigate — declaring a limit there would be a
    // refusal about nothing.
    expect(
      featureLimits("map-native", "symbol", "static").some((l) => l.feature === "keyboard"),
    ).toBe(false);
  });

  it("should declare that an interactive symbol map shows no direct labels", () => {
    const ls = featureLimits("map-native", "symbol", "interactive");
    expect(ls.some((l) => l.feature === "direct-labels")).toBe(true);
  });

  it("should be the sentence map-dw's refusal quotes, not a second wording", () => {
    const dw = readFileSync(
      join(import.meta.dir, "..", "..", "map-dw", "src", "map-spec.ts"),
      "utf8",
    );
    expect(dw).not.toContain("top-N");
    expect(dw).toContain("SYMBOL_LABELS_INTERACTIVE");
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test tests/feature-limits.test.ts
```
Attendu : ÉCHEC sur les 4 cas (le module n'existe pas ; `map-spec.ts` contient `top-N` — le
vérifier : `grep -c "top-N" skills/map-dw/src/map-spec.ts` → `2`).

- [ ] **Step 3 : Write the minimal implementation**

Créer `skills/map-native/src/feature-limits.ts` :

```ts
// What map-native's rendered forms CANNOT do, measured. Registered from the manifest, so the
// fact lives with the engine (see lib/core/feature-reach.ts's header for the maintenance rule:
// THIS LIST MUST SHRINK, and only a green render measurement removes an entry).
import {
  registerFeatureLimits,
  type FeatureLimit,
} from "../../../lib/core/feature-reach";
import type { VisualFormat } from "../../../lib/core/vocabulary";

/** The one wording for "an interactive symbol map does not label its circles" — exported so
 *  map-dw's refusal QUOTES it instead of asserting a top-N nothing implements. */
export const SYMBOL_LABELS_INTERACTIVE =
  "on the live interactive page the circles are read by hovering them — they carry no " +
  "always-visible name+value labels (the no-JS static fallback does)";

const KEYBOARD: FeatureLimit = {
  feature: "keyboard",
  sentence:
    "this interactive map will not be keyboard-navigable: its marks are drawn in a WebGL " +
    "canvas, so there is no element to focus (WCAG 2.1.1, level A)",
  measuredBy:
    'grep -rn \'tabIndex|role="img"\' skills/map-native/src --include="*.tsx" → no match ' +
    "across 36 .tsx files; the harness check is ../splash-harness/scripts/deep-verify.mjs:56",
};

const SYMBOL_LABELS: FeatureLimit = {
  feature: "direct-labels",
  sentence: SYMBOL_LABELS_INTERACTIVE,
  measuredBy:
    "SymbolMap.tsx:324-327 mounts symbol-labels only when !interactive || staticFallbackLabels; " +
    "the flag is set by the capture harness alone (symbol-labels.ts:53-55). No top-N exists: " +
    "symbol-geo.ts:87-89 maps every point, and SymbolMap.tsx:346-347 lets MapLibre drop labels " +
    "on collision (text-allow-overlap:false, text-optional:true)",
};

export function mapNativeLimits(
  nativeType: string,
  format: VisualFormat,
): FeatureLimit[] {
  if (format !== "interactive" && format !== "scrolly") return [];
  const out: FeatureLimit[] = [KEYBOARD];
  if (nativeType === "symbol") out.push(SYMBOL_LABELS);
  return out;
}

registerFeatureLimits("map-native", mapNativeLimits);
```
Dans `skills/map-native/src/manifest.ts`, ajouter l'import pour l'effet de bord, à côté de
`registerProducer` :
```ts
import "./feature-limits";
```

Dans `skills/map-dw/src/map-spec.ts`, réécrire le commentaire `:430-432` et la chaîne `:434` :
```ts
    // It is therefore NOT a producible map-dw output: route it to map-native, whose STATIC
    // symbol render directly labels its circles by name + value and whose conformance asserts
    // `labeled` (skills/map-native/src/conformance.ts checkSymbolConformance, wired at produce
    // since 2026-07-29). The INTERACTIVE map-native render is hover-only — that limit is
    // declared once, in map-native's own words (feature-limits.ts), and quoted here rather
    // than restated: this refusal used to promise a "top-N" no code implements.
    errors.push(
      "symbol maps are not producible by map-dw: Datawrapper draws proportional circles with " +
        "values on HOVER only (no always-visible data-value labels on symbols — Datawrapper " +
        "Academy), so the owned static PNG ships mute, unlabeled circles that cannot carry the " +
        'claim without interaction; route to map-native instead (producer:"map-native", ' +
        'type:"symbol"), whose STATIC render labels every circle by name + value. Note: ' +
        SYMBOL_LABELS_INTERACTIVE,
    );
```
avec, en tête de `map-spec.ts` :
```ts
import { SYMBOL_LABELS_INTERACTIVE } from "../../map-native/src/feature-limits";
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-dw && bunx tsc --noEmit && bun test src
```
Attendu : PASS des deux côtés. Un test de map-dw qui assertait la chaîne exacte doit être mis à
jour — **en citant la nouvelle phrase**, pas en relâchant l'assertion.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Remettre `which directly labels the top-N circles by name + value` dans la chaîne de refus,
relancer `bun test tests/feature-limits.test.ts` côté map-native : Attendu **1 test en échec**
(`should be the sentence map-dw's refusal quotes, not a second wording`). Restaurer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/map-native/src/feature-limits.ts skills/map-native/src/manifest.ts skills/map-native/tests/feature-limits.test.ts skills/map-dw/src/map-spec.ts
git commit -m "feat(map-native): declare the measured keyboard and hover-only limits; map-dw stops promising a top-N"
```

---

### Task 21 : une limite déclarée voyage jusqu'à l'offre, et doit y être présentée

**Files:**
- Modify: `lib/brain/eligibility.ts` (`Candidate`, `withMarks`)
- Modify: `lib/brain/offer.ts` (`OfferOption`, `toOption`)
- Modify: `lib/brain/verify-offer.ts` (`PhrasedOption`, la boucle `:63-90`)
- Modify: `lib/brain/eligibility.test.ts`, `lib/brain/offer.test.ts`, `lib/brain/verify-offer.test.ts`
- Modify: `skills/splash/SKILL.md` (le contrat de phrasage, après la règle 4, ≈`:614-628`)
- Modify: `skills/splash/tests/skill-doc-parity.test.ts`

**Interfaces:**
- Consumes: `featureLimits(engine, nativeType, format): FeatureLimit[]` (tâche 19), déjà alimenté
  par map-native (tâche 20).
- Produces: `Candidate.limits?: string[]` → `OfferOption.limits?: string[]` →
  `PhrasedOption.limitsAcknowledged?: true`.

**Décision prise faute de réponse, et sa raison mesurée — une limite N'EST PAS un `readiness`.**
`lib/brain/eligibility.ts` documente lui-même, dans l'en-tête de `imageWalkMark`, qu'une marque
`missing` rend une forme **inatteignable** en pratique : `lib/brain/rank.ts` classe sur la sévérité
de readiness et `lib/brain/offer.ts:38` plafonne l'offre à trois lignes, donc *« Marked, in
practice, means UNREACHABLE here — not merely flagged »*. Poser la limite clavier en `readiness`
retirerait silencieusement **toute carte interactive** de l'offre — l'inverse exact de la décision 5,
qui veut que « le journaliste choisisse en connaissance de cause ». D'où un champ neuf, sans effet
sur le rang.

- [ ] **Step 1 : Write the failing test**

Dans `lib/brain/eligibility.test.ts` :
```ts
it("should carry a measured render limit without changing what is legal", () => {
  const { eligible: legal } = eligible(inputForMapSymbolInteractive());
  const c = legal.find((x) => x.engine === "map-native" && x.format === "interactive");
  expect(c).toBeDefined();
  // declared, NOT marked: eligibility.ts's own imageWalkMark header records that a `missing`
  // readiness makes a form unreachable (rank tier 2 + the 3-row offer cap). A keyboard limit
  // must inform, not remove — decision 5, 2026-07-29.
  expect(c!.readiness).toBeUndefined();
  expect(c!.limits?.join(" ")).toContain("keyboard");
});
```
Dans `lib/brain/offer.test.ts` :
```ts
it("should surface the limit on the offered option", () => {
  const o = buildOffer(inputForMapSymbolInteractive());
  const row = o.options.find((x) => x.engine === "map-native");
  expect(row?.limits?.join(" ")).toContain("keyboard");
});
```
Dans `lib/brain/verify-offer.test.ts` :
```ts
it("should refuse a phrasing that does not acknowledge a declared limit", () => {
  const offer = buildOffer(inputForMapSymbolInteractive());
  const phrased = offer.options.map((o) => ({ id: o.id, why: "…", markAcknowledged: undefined }));
  expect(() => verifyOffer(phrased as never, offer)).toThrow(/limitsAcknowledged/);
});

it("should refuse the flag on an option that declares none", () => {
  const offer = buildOffer(inputForChartStatic());
  const phrased = offer.options.map((o) => ({ id: o.id, why: "…", limitsAcknowledged: true }));
  expect(() => verifyOffer(phrased as never, offer)).toThrow(/limitsAcknowledged/);
});
```
*(`inputForMapSymbolInteractive()` / `inputForChartStatic()` : réutiliser les fabriques de
`EligibilityInput` déjà présentes dans ces fichiers de test ; ne pas en écrire de nouvelles.)*

Dans `skills/splash/tests/skill-doc-parity.test.ts` :
```ts
it("should document the declared-limit rule in the phrasing contract", () => {
  expect(splashSkill).toContain("limitsAcknowledged");
});
```

- [ ] **Step 2 : Run the tests to verify they fail**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test brain/
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/skill-doc-parity.test.ts
```
Attendu : ÉCHEC — `limits` n'existe ni sur `Candidate` ni sur `OfferOption`, `verifyOffer` ne
connaît pas `limitsAcknowledged`, et `SKILL.md` ne le mentionne pas.

- [ ] **Step 3 : Write the minimal implementation**

`lib/brain/eligibility.ts` — sur `Candidate`, après `readiness` :
```ts
  /** Render limits this pairing DECLARES, in the journalist's words (lib/core/feature-reach.ts).
   *  Distinct from `readiness` on purpose: a mark drives rank.ts's severity tier and, with the
   *  3-row cap in offer.ts, makes a form unreachable in practice (see imageWalkMark's header).
   *  A declared limit must INFORM the choice, never remove the row. */
  limits?: string[];
```
et dans `withMarks`, juste avant le calcul de `worst` :
```ts
  // The measured render limits of THIS pairing. Read, never restated: the offer shows the same
  // sentence a later refusal would (lib/core/feature-reach.ts).
  const declared = featureLimits(c.engine, c.key, c.format).map((l) => l.sentence);
  const withLimits = declared.length > 0 ? { ...c, limits: declared } : c;
```
puis remplacer les deux `return { ...c, … }` de fin par des retours sur `withLimits`.

`lib/brain/offer.ts` — sur `OfferOption`, `limits?: string[];` ; et dans `toOption` :
```ts
    ...(c.limits ? { limits: c.limits } : {}),
```

`lib/brain/verify-offer.ts` — sur `PhrasedOption`, `limitsAcknowledged?: true;` ; et dans la
boucle (à côté du contrôle `markAcknowledged`, `:78-85`) :
```ts
    // Same discipline as a readiness mark, for a DIFFERENT thing: a mark says the form may not
    // be buildable; a limit says the form IS buildable and will not do one specific thing. Both
    // must be shown, and the guard can only check that structurally — so the reason itself is
    // printed by code, never left to the model to restate.
    if (option.limits?.length && p.limitsAcknowledged !== true)
      throw new Error(
        `verifyOffer: "${p.id}" declares a render limit and the phrasing does not set ` +
          "limitsAcknowledged — print the limit beside the why",
      );
    if (!option.limits?.length && p.limitsAcknowledged)
      throw new Error(
        `verifyOffer: "${p.id}" declares no render limit, so limitsAcknowledged must not be set`,
      );
```

`skills/splash/SKILL.md` — ajouter après la règle 4 du contrat de phrasage :
```markdown
5. **Une limite DÉCLARÉE est imprimée, pas résumée.** Une option peut porter `limits` : ce que la
   forme, une fois construite, **ne fera pas** (« cette carte interactive ne sera pas navigable au
   clavier »). Ce n'est pas une marque de readiness — la forme est constructible, elle est classée
   normalement, et elle reste choisissable. Poser `limitsAcknowledged: true` sur le phrasage de
   chaque option qui en porte une (le garde refuse le phrasage sinon, et refuse également le
   drapeau sur une option qui n'en porte aucune), et **imprimer chaque phrase de `limits` à côté
   du `why`** — les mots sont émis par le code, jamais restitués par le modèle.
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test
```
Attendu : PASS des deux côtés. **Vérifier explicitement que le rang n'a pas bougé** : les tests de
`lib/brain/rank.test.ts` et `offer.test.ts` doivent être verts sans modification — c'est la preuve
qu'une limite informe sans retirer.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

(a) Dans `withMarks`, remplacer `limits: declared` par `readiness: { status: "missing", reason: declared[0] }`
et relancer `bun test brain/` : Attendu — le test
`should carry a measured render limit without changing what is legal` échoue **et** des tests de
`offer.test.ts` changent d'ordre, ce qui démontre pourquoi la décision est celle-là. Restaurer.
(b) Supprimer le contrôle `limitsAcknowledged` de `verifyOffer`, relancer : Attendu **1 test en
échec**. Restaurer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add lib/brain skills/splash/SKILL.md skills/splash/tests/skill-doc-parity.test.ts
git commit -m "feat(brain): a measured render limit is declared at the offer and must be shown"
```

---

## Phase 7 — le silence narratif, le refus tardif, et la clôture

### Task 22 : l'avertissement narratif nomme l'alternative de CE run

**Files:**
- Modify: `skills/splash/src/candidate-provenance.ts` (`narrativeConsiderationWarning`, `:138-165`)
- Modify: `skills/splash/scripts/produce-all.mjs` (`:53` l'appel)
- Modify: `skills/splash/src/candidate-provenance.test.ts`

**Interfaces:**
- Consumes: `AUTHORABLE_SCROLLY_TYPES` (`skills/chart-native/src/chart-story.ts:127`, valeur
  `["line", "bar"]`) et `MAP_TYPES` (`skills/map-native/src/map-types.ts`) — les deux seules
  sources mécaniques de « quelle forme narrative ce type peut prendre ».
- Produces: `narrativeConsiderationWarning(json: unknown, accepted?: unknown[]): string | null`
  — second paramètre OPTIONNEL, donc tout appelant existant est inchangé.

**Décision acquise n° 6 : AVERTISSEMENT, pas refus — mais un avertissement qui NOMME l'alternative**
(la forme retenue pour D25 en famille B : « signaler ET proposer »). Le promouvoir en refus rendrait
le menu narratif obligatoire pour tout élément, y compris ceux qui n'en ont aucun besoin.

**Ce qui manque exactement.** La phrase actuelle (`:158-164`) nomme déjà la FAMILLE générique
(« chart-scrolly · map-story · map-scrolly · image-scrolly · video reveal ») ; elle ne nomme
**aucune alternative concrète pour ce run**. Or `accepted` est en main au même endroit
(`produce-all.mjs:31` le lit avant `:53`), donc l'alternative est dérivable mécaniquement.
Rappel du contexte mesuré : `candidates.json` est **écrit par le modèle**, aucun code n'émet de
candidat ; `narrativePotential` n'existe dans aucun `.ts` sinon deux assertions de présence dans le
markdown (`skills/splash/tests/skill-doc-parity.test.ts:122`, `:127`).

- [ ] **Step 1 : Write the failing test**

```ts
describe("the narrative warning names an alternative, not just a family", () => {
  const menuWithoutNarrative = { candidates: [{ type: "bar", producer: "chart-native" }] };

  it("should name the chart-scrolly a bar could have taken", () => {
    const w = narrativeConsiderationWarning(menuWithoutNarrative, [
      { producer: "chart-native", format: "static", spec: { nativeType: "bar" } },
    ]);
    expect(w).not.toBeNull();
    expect(w!).toContain("chart-scrolly");
    expect(w!).toContain("bar");
  });

  it("should name the map-scrolly a choropleth could have taken", () => {
    const w = narrativeConsiderationWarning(menuWithoutNarrative, [
      { producer: "map-native", format: "static", spec: { type: "choropleth" } },
    ]);
    expect(w!).toContain("map-scrolly");
  });

  it("should say plainly when this element has no narrative sibling", () => {
    // A treemap has no authorable scrolly (AUTHORABLE_SCROLLY_TYPES = ["line", "bar"]).
    // Naming one anyway would be the same false promise this family exists to close.
    const w = narrativeConsiderationWarning(menuWithoutNarrative, [
      { producer: "chart-native", format: "static", spec: { nativeType: "treemap" } },
    ]);
    expect(w!).toContain("no narrative form");
  });

  it("should stay null when narrative WAS considered", () => {
    expect(
      narrativeConsiderationWarning({ candidates: [{ format: "scrolly" }] }, []),
    ).toBeNull();
  });

  it("should be byte-identical when called with one argument", () => {
    const w = narrativeConsiderationWarning(menuWithoutNarrative);
    expect(w).toContain("narrativeRuledOut");
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/candidate-provenance.test.ts
```
Attendu : ÉCHEC sur les 3 premiers cas — la fonction ne prend qu'un argument et la phrase ne
contient ni `bar` ni « no narrative form ».

- [ ] **Step 3 : Write the minimal implementation**

```ts
import { AUTHORABLE_SCROLLY_TYPES } from "../../chart-native/src/chart-story";
import { MAP_TYPES } from "../../map-native/src/map-types";

/** The narrative form THIS element could have taken, or null when it has none. Derived from the
 *  engines' own lists, never from a hand-kept table: a chart scrolly is authorable for
 *  AUTHORABLE_SCROLLY_TYPES only (chart-story.ts:127), and a map track exists for MAP_TYPES. */
function narrativeSiblingOf(
  accepted: unknown[] | undefined,
): { form: string; type: string } | null {
  for (const a of accepted ?? []) {
    const p = a as { producer?: string; spec?: Record<string, unknown> };
    const nt = typeof p.spec?.nativeType === "string" ? p.spec.nativeType : null;
    const mt = typeof p.spec?.type === "string" ? p.spec.type : null;
    if (
      p.producer === "chart-native" &&
      nt &&
      (AUTHORABLE_SCROLLY_TYPES as readonly string[]).includes(nt)
    )
      return { form: "chart-scrolly", type: nt };
    if (
      p.producer === "map-native" &&
      mt &&
      (MAP_TYPES as readonly string[]).includes(mt)
    )
      return { form: "map-scrolly", type: mt };
  }
  return null;
}

export function narrativeConsiderationWarning(
  json: unknown,
  accepted?: unknown[],
): string | null {
  // KEEP `candidate-provenance.ts:139-153` exactly as they are: the two flags
  // (`sawNarrativeCandidate`, `sawRuledOut`), the recursive `visit`, and the `visit(json)` call.
  // Nothing about the traversal changes — only what is returned when it found nothing.
  if (sawNarrativeCandidate || sawRuledOut) return null;
  const base =
    "candidates.json considered NO narrative form and carries no explicit " +
    "`narrativeRuledOut` reason — the menu skipped the narrative family (chart-scrolly · " +
    "map-story · map-scrolly · image-scrolly · video reveal) silently. Either offer the " +
    'narrative candidate the story shape warrants, or state `narrativeRuledOut: "<reason>"` ' +
    "(suggest-chart contract: silent narrative absence is not a valid payload)";
  if (accepted === undefined) return base;
  // SIGNAL AND PROPOSE (the form D25 took in family B): name the concrete sibling of THIS run's
  // element, or say plainly that it has none — naming one it does not have would be the same
  // false promise this family exists to close.
  const sib = narrativeSiblingOf(accepted);
  return sib
    ? `${base}. For this run: the ${sib.type} you accepted also comes as a ${sib.form} — ` +
        "offer it, or rule it out by name."
    : base +
        ". For this run: the element you accepted has no narrative form of its own, so " +
        "`narrativeRuledOut` is the honest answer here.";
}
```

Dans `produce-all.mjs:53` :
```js
    menuNarrativeWarning = narrativeConsiderationWarning(parsed, accepted);
```

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Attendu : PASS, 0 échec — dont le cas « byte-identical when called with one argument ».

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Faire retourner `null` à `narrativeSiblingOf`, relancer : Attendu **2 tests en échec** (les deux
qui nomment `chart-scrolly` et `map-scrolly`). Restaurer : 0 échec.

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/candidate-provenance.ts skills/splash/src/candidate-provenance.test.ts skills/splash/scripts/produce-all.mjs
git commit -m "feat(spine): the narrative warning names this run's own alternative"
```

---

### Task 23 : un refus TARDIF dévie vers le pas qui débloque, et il est ENREGISTRÉ

**Files:**
- Create: `skills/splash/src/late-refusal.ts`
- Create: `skills/splash/src/late-refusal.test.ts`
- Modify: `skills/chart-native/scripts/snap-contrast.mjs` (`:107-110` équivalent — le bloc de sortie)
- Modify: `skills/chart-native/scripts/snap-interactive-contrast.mjs` (`:107-110`)
- Modify: `skills/map-native/scripts/snap-contrast.mjs` (le bloc de sortie)

**Interfaces:**
- Consumes: rien. Module pur (`node:fs` seulement pour l'append).
- Produces:
  ```ts
  export type LateRefusal = {
    guard: string;      // which guard spoke
    subject: string;    // the chart/map type + format it refused
    reason: string;     // what it measured
    deviation: string;  // the step that unblocks, in the journalist's words
    at: string;         // ISO timestamp
  };
  export function lateRefusalSentence(r: Omit<LateRefusal, "at">): string;
  export function recordLateRefusal(outDir: string, r: Omit<LateRefusal, "at">): void;
  ```

**Décision acquise n° 2, sa seconde moitié.** Le contraste réel ne se mesure que sur le rendu : ce
refus-là reste **tardif, et c'est assumé**. Mais il doit (a) **DÉVIER** vers le pas qui débloque
(règle famille A), et (b) être **ENREGISTRÉ** pour que la liste des limites déclarées rétrécisse —
un refus déclaré est une dette, pas un état.

**Pourquoi une chaîne ordinaire et pas le vocabulaire de la famille A.** `lib/core/routed-refusal.ts`
appartient au premier segment du pont (`docs/superpowers/plans/2026-07-28-refusals-that-bite.md`,
tâche 1) et n'existe pas encore. En ouvrir un second ici contredirait le § 6 de la spec (« elle ne
doit pas en ouvrir un troisième en parallèle »). **Follow-up nommé** : le jour où A atterrit,
`lateRefusalSentence` devient un rendu de `routed()` et `LateRefusal.deviation` devient une `Route`.

- [ ] **Step 1 : Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lateRefusalSentence, recordLateRefusal } from "./late-refusal";

describe("a late refusal deviates and is recorded", () => {
  const r = {
    guard: "snap-contrast",
    subject: "heatmap/static",
    reason: 'label "Vendredi" measured 3.1:1 against #18181B, below the 4.5:1 floor',
    deviation:
      "pick a lighter house ground, or a darker in-cell label colour, then produce again",
  };

  it("should name the unblocking step in the sentence", () => {
    const s = lateRefusalSentence(r);
    expect(s).toContain("3.1:1");
    expect(s).toContain("produce again");
  });

  it("should never emit a refusal with no deviation", () => {
    // A refusal that stops instead of routing is the defect family A exists to close; this
    // module must not be able to produce one.
    expect(() => lateRefusalSentence({ ...r, deviation: "  " })).toThrow(/deviation/);
  });

  it("should append one JSON line per refusal, so the list can shrink", () => {
    const dir = mkdtempSync(join(tmpdir(), "late-"));
    recordLateRefusal(dir, r);
    recordLateRefusal(dir, { ...r, subject: "heatmap/interactive" });
    const p = join(dir, "late-refusals.jsonl");
    expect(existsSync(p)).toBe(true);
    const lines = readFileSync(p, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).at).toMatch(/^\d{4}-/);
  });
});
```

- [ ] **Step 2 : Run the test to verify it fails**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/late-refusal.test.ts
```
Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3 : Write the minimal implementation**

```ts
// A refusal that can only be measured on the RENDER — the contrast guards. It is late, and that
// is assumed (decision 2, 2026-07-29): what cannot be established before the render cannot be
// declared at the offer, and a preventive mark on a form nobody measured would be a false in
// the other direction. Two things are owed instead: the refusal DEVIATES to the step that
// unblocks, and it is RECORDED so the declared-limit list shrinks on evidence.
//
// FOLLOW-UP: family A introduces lib/core/routed-refusal.ts (its task 1). When it lands,
// lateRefusalSentence becomes one rendering of routed() and `deviation` becomes a Route — this
// module must NOT grow into a second refusal vocabulary (spec §6).
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type LateRefusal = {
  guard: string;
  subject: string;
  reason: string;
  deviation: string;
  at: string;
};

export function lateRefusalSentence(r: Omit<LateRefusal, "at">): string {
  if (!r.deviation.trim())
    throw new Error(
      "late-refusal: a refusal with no deviation stops the run instead of routing it — " +
        "name the step that unblocks",
    );
  return `${r.guard} refused ${r.subject}: ${r.reason}. Next: ${r.deviation}`;
}

export function recordLateRefusal(
  outDir: string,
  r: Omit<LateRefusal, "at">,
): void {
  lateRefusalSentence(r); // validate before recording — no unrouted refusal on disk either
  mkdirSync(outDir, { recursive: true });
  const row: LateRefusal = { ...r, at: new Date().toISOString() };
  appendFileSync(join(outDir, "late-refusals.jsonl"), JSON.stringify(row) + "\n");
}
```

Dans les trois snaps, remplacer le bloc de sortie dure par un appel qui dévie et enregistre. Pour
`skills/chart-native/scripts/snap-interactive-contrast.mjs:107-110` :
```js
if (violations.length) {
  const r = {
    guard: "snap-interactive-contrast",
    subject: `${chart}/interactive`,
    reason: `${violations.length} text label(s) below ${MIN_CONTRAST}:1 against the page's real ground`,
    deviation:
      "raise the contrast of the failing label (a darker/lighter ink, or a different house " +
      "ground), then produce again — this is measured on the render, so it cannot be told at the offer",
  };
  console.error(lateRefusalSentence(r));
  for (const v of violations) console.error(`  ✗ ${v}`);
  if (process.env.OUTDIR) recordLateRefusal(process.env.OUTDIR, r);
  process.exit(1);
}
```
Faire le même geste dans `skills/chart-native/scripts/snap-contrast.mjs` (`guard: "snap-contrast"`,
`subject: \`${chart}/static\``) et dans `skills/map-native/scripts/snap-contrast.mjs`
(`guard: "snap-contrast (map)"`, `subject: \`${type}/${process.env.MODE}\``). **Le refus reste
DUR** — `process.exit(1)` est conservé ; ce qui change est ce que le journaliste lit et ce qui
reste sur le disque.

- [ ] **Step 4 : Run the tests to verify they pass**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test src/late-refusal.test.ts
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test
```
Attendu : PASS partout, 3/3 sur le nouveau fichier.

- [ ] **Step 5 : MUTATION — prouver que la garde peut rougir**

Supprimer le `throw` sur `deviation` vide, relancer : Attendu **1 test en échec**
(`should never emit a refusal with no deviation`). Restaurer : 0 échec.

- [ ] **Step 6 : Vérification LIVE — un vrai refus tardif**

Fabriquer une config dont un libellé échoue vraiment (par exemple un `themeBg` mi-gris que
`lib/core/theme.ts` ne peut pas rendre lisible), produire, et constater :
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native
bun scripts/produce.mjs bar /tmp/bad-theme-config.json /tmp/late23 static; echo "exit=$?"
cat /tmp/late23/late-refusals.jsonl
```
Attendu : `exit=1`, la phrase imprimée contient « Next: … then produce again », et le `.jsonl`
porte une ligne. **Un refus tardif qui ne laisse aucune trace ne fait pas rétrécir la liste** —
c'est toute la seconde moitié de la décision 2.

- [ ] **Step 7 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/late-refusal.ts skills/splash/src/late-refusal.test.ts skills/chart-native/scripts skills/map-native/scripts
git commit -m "feat(guards): a late contrast refusal names the unblocking step and is recorded"
```

---

### Task 24 : le gate complet, le journal, et les follow-ups nommés

**Files:**
- Modify: `docs/splash/CHANGELOG.md` (nouvelle entrée datée en tête du journal)
- Modify: `CLAUDE.md` (§ « État courant » — le compte de checks, périmé à 20)

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: rien.

- [ ] **Step 1 : Run the full gate**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge && bun run check
```
Attendu : **22/22 checks passed.** En cas d'échec, corriger — deux tentatives maximum, puis STOP et
rapporter l'erreur exacte (règle projet). Ne jamais relâcher une garde pour verdir le gate.

- [ ] **Step 2 : Re-verify the mutation numbers in one pass**

Les tâches qui posent ou branchent une garde ont chacune produit un chiffre. Les re-lister ici, et
vérifier qu'aucune n'a été sautée :

| tâche | garde | tests qui rougissent sous mutation |
|---|---|---|
| 1 | `accent` ne se pose plus | 2 |
| 2 | pas de ligne `accent:` écrite | 1 |
| 3 | plus de lecture morte | 1 |
| 4 | le CLI scrolly valide | 1 |
| 5 | `source` exigée et typée | 3 |
| 6 | parité furniture dw-chart | 1 |
| 7 | `deferred` refusé au spine | 1 |
| 8 | `nativeType` inconnu averti | 1 |
| 9 | la KB n'affirme plus | 1 |
| 10 | schéma « aucun moteur » | 1 |
| 11 | DRIFT 3 | 1 |
| 12 | parité doc↔garde | 1 |
| 13 | sol réel du sampler | 1 |
| 14 | fenêtre = canal | 1 |
| 15 | échelle livrée (2 sens) | 1 + 1 |
| 16 | sol de la bande source | 2 |
| 17 | **`checkSymbolConformance` branché** | **3** |
| 18 | gouttière mesurée | 1 |
| 19 | `measuredBy` obligatoire | 1 |
| 20 | plus de « top-N » | 1 |
| 21 | limite déclarée présentée | 1 + 1 |
| 22 | alternative nommée | 2 |
| 23 | déviation obligatoire | 1 |

Une ligne sans chiffre constaté = une garde dont on n'a pas prouvé qu'elle peut parler. C'est
exactement le défaut que cette famille traite (`checkSymbolConformance` : écrit en juin, jamais
appelé jusqu'à la tâche 17).

- [ ] **Step 3 : Write the CHANGELOG entry**

Ajouter en tête de `docs/splash/CHANGELOG.md` une entrée datée qui dit, en français, ce qui a
changé et ce qui a été MESURÉ — pas ce qui a été « amélioré ». Y porter en clair : le canal
social-vertical est rouvert par la phase 5 mais **aucune passe de rendu ne l'a encore parcouru**
(risque 4 de la spec), et cette famille améliore ce que le système SAIT, pas ce qu'il TIENT, tant
que la famille A n'est pas exécutée (risque 5).

- [ ] **Step 4 : Correct the stale gate count in CLAUDE.md**

Le § « État courant » annonce « gate `bun run check` 18 checks » puis « gate à 20 checks » selon
les sessions. La valeur mesurée est **22** (9 `tsc` + 13 `bun test`, commande en § Global
Constraints). La corriger une fois.

- [ ] **Step 5 : Record the follow-ups, named — not as tasks**

À ajouter au backlog du CLAUDE.md, sans les traiter ici :

1. **`accent`, option (b)**, si un besoin réel apparaît : un champ sur `NativeSpec` + un point
   d'injection dans `specToNativeConfig` (`:947-988`), et les six composants qui le lisaient le
   recevraient enfin. Petit ajout, pas une reprise.
2. **`lateRefusalSentence` → `routed()`** le jour où la famille A livre `lib/core/routed-refusal.ts`.
3. **Le tooltip par type chez dw-chart.** Six capacités SONT modélisées par type dans les mêmes
   fichiers (`chart-spec.ts:102`, `:113`, `:143`, `:165`, `value-label-safety.ts:55`,
   `export-aspect.ts:87`) ; le tooltip est la seule qui manque, et c'est celle qu'on a promise. La
   déclarer dans `feature-reach` demande une **mesure live** (une vraie clé Datawrapper, un vrai
   `d3-bars` publié, un vrai survol) — donc pas dans ce plan, qui n'invente aucune entrée non
   mesurée.
4. **Le calque DOM parallèle aux marques WebGL** (D05) — un chantier, pas un correctif. Tant qu'il
   n'existe pas, la limite est déclarée (tâche 20) et visible à l'offre (tâche 21).
5. **Les trois copies de listes de types en prose** (`skills/suggest-chart/SKILL.md:329-336`,
   `:494`, `:525`) + `DW_REACHABLE_NATIVE_TYPES` (`skills/splash/src/flow-decisions.ts:22-30`) :
   rien ne les compare aux catalogues. Un test de parité est faisable ; il n'est pas dans le
   périmètre tranché ici.
6. **Re-runner le sweep** — le registre le recommande (son § 7, point 1) ; ce n'est pas ce plan.
7. **`wrapLabel` ne coupe que sur l'espace** (`lib/core/text-fit.ts:127-132` — la déclaration ;
   `:134` `const words = text.split(/\s+/).filter(Boolean);` et `:135`, un seul mot ⇒ `truncate`).
   D'où « Saint-Étienne » raccourci. **Nommé ici et NON traité :** couper sur le trait d'union
   change le rendu de tous les charts et demande une politique de césure (trait d'union, tiret
   long, CJK) que le § 8 ne tranche pas. Ce plan ne modifie pas un rendu sur une préférence non
   arbitrée. À rapprocher des deux estimateurs de glyphe divergents du dépôt : `0.6`
   (`lib/core/text-fit.ts:10-12`) et `0.62` (`skills/map-native/src/symbol-labels.ts:116`).

- [ ] **Step 6 : Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add docs/splash/CHANGELOG.md CLAUDE.md
git commit -m "docs: record the capability-and-validation pass, its measurements and its follow-ups"
```

---

## Ce que ce plan ne fait PAS, dit explicitement

- **Il n'écrit aucune capacité manquante** (spec § 9) : ni le tooltip chez Datawrapper, ni le top-N
  sur les cartes symbole, ni le clavier sur les marques WebGL. Il porte sur **savoir et dire** ce
  qui est là.
- **Il ne touche ni la famille A, ni B, ni D.** D12 (la langue) et D17 (le ledger source-fidelity)
  touchent la validation mais appartiennent à B.
- **Il ne rouvre pas la KB dans son ensemble** (les 33 lignes famille B, les 20 fiches Datawrapper
  manquantes de `what-splash-can-make-2026-07-28.md` § 4) : chantier de contenu, pas d'accord
  KB↔code.
- **Il ne re-runne pas le sweep.**
- **Il n'ouvre pas de troisième segment de pont.** Les limites voyagent par le chemin que
  `buildabilityMark` emprunte déjà ; le vocabulaire de refus reste celui de la famille A.

