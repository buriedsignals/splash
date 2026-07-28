# Spec — Cœur partagé + registre de producteurs + contrats (Tier 1)

> **Statut :** design validé (brainstorming superpowers, 2026-07-20). Prêt pour → writing-plans.
> **Origine :** audit `docs/splash/audit-2026-07-20-agentic-and-render.md`, Tier 1 (la clé de voûte).
> **Ledger :** tâches #5 (ce brainstorm), #6/#7/#8 (impls, bloquées par #5).

## 1. Problème (ce qu'on répare)

Le « cœur partagé » décrit dans `CLAUDE.md` **n'existe pas au niveau inter-moteurs**. Il est copié-mirroré à la
main entre les 4 moteurs, avec un couplage sale de l'orchestrateur vers les `src/` internes. Preuves (audit) :

- **Conformance dupliquée, pas identique :** `chart-native/src/core/conformance.ts` (1 892 LOC) vs
  `map-native/src/conformance.ts` (754 LOC) vs `scrolly/src/conformance.ts`. Le header de map-native dit verbatim
  *« Shared L0 … (mirrors chart-native's…) »* — mirroré par **copie**, pas importé.
- **`deriveFurniture` défini deux fois :** `chart-native/src/core/tokens.ts` + `map-native/src/theme/map-tokens.ts`.
- **Contraste WCAG dupliqué :** `chart-native/src/core/contrast-scan.ts` vs `dw-chart/src/contrast.ts`.
- **`video-verify`, `locale`, `furniture-i18n`** : tous mirrorés (headers à l'appui).
- **Reach-across profond :** `skills/splash` importe les `src/` internes des moteurs (`adapters.ts:72-76`,
  `validate-gate.ts:7-26`, `guardrail-parity.ts:27-32`) ; `scrolly` hard-importe les composants concrets de
  chart-native/map-native (~20 arêtes). Pas de workspace, pas d'`exports`, pas de versioning.
- **Ajouter un moteur = éditer ~7 sites hard-codés :** union `Producer` (`producer-spec.ts:4-5`), `validate-gate.ts`,
  `adapters.ts` (`isFileBased`, `SCRIPT`, `SKILL_DIR`, switch `realDispatch`), `producer-guard.ts`,
  `guardrail-parity.ts`, `brand-profile.ts`, `export-code.mjs`.
- **Deux modèles d'exécution dans un dispatcher :** natif = sous-processus (`SPLASH_CHANNEL` env),
  DW = import in-process (`adapters.ts:314-376`) — error-handling/timeout/threading divergents.

**Conséquence :** la convention n°1 « boucle feedback→système » (graver un fix une fois pour que tous héritent)
est **structurellement impossible** — il n'y a pas de « niveau système » unique. Splash paie le **coût de
duplication de l'autonomie ET le coût de couplage du monolithe**, sans les bénéfices de l'un ni de l'autre.

**Non-objectif :** ce n'est PAS le découplage en skills autonomes (« option B » de la discussion initiale) — ce
serait aggraver la duplication. C'est l'inverse : construire le vrai cœur unique + une frontière propre.

## 2. Objectifs / critères de succès

1. **`feedback→système` devient réel** — un fix WCAG/thème/locale se grave **une fois**, tous les moteurs héritent.
2. **Ajouter un moteur = un fichier** (un manifeste + un `register()`), plus le 7-site shotgun. Couture
   contributeur externe (ex. skill vidéo-carte de Tom) ouverte.
3. **Le couplage sale meurt** — aucun moteur n'importe le `src/` d'un autre ; le partagé passe par une API unique.
4. **Moins de code** — 4 quasi-cœurs → 1.
5. **Zéro régression** — `bun run check` vert à chaque étape de migration.
6. **Zéro risque packaging** — Splash reste UN plugin installable, pas de build-step, `claude plugin validate` OK.

## 3. Décisions verrouillées (brainstorming)

- **Forme = Option B** : cœur importé via une API propre, dans le layout plugin natif (pas de monorepo/workspace,
  pas de build-step). Écarté : A (workspace + build-step — inconnue marketplace juste avant release MIT) et
  C (cœur dans chart-native — hiérarchie implicite, dépotoir).
- **Périmètre `core` = primitives transversales identiques-par-nécessité** + **socle L0 de conformance**. Les
  règles de conformance **par-type** restent par-moteur mais **importent** `core`.
- **Modèle d'exécution** = un **dispatcher unique uniforme**, transport déclaré par le manifeste
  (`'subprocess' | 'in-process'`) — on n'impose pas un transport unique (absurde pour Remotion vs API DW).
- **Migration incrémentale**, une primitive à la fois, gate vert entre chaque. Jamais big-bang.

## 4. Architecture

### 4.1 Le package `core`

Emplacement : **chemin non-skill** à la racine du plugin (candidat `lib/core/`). À valider à l'impl que le loader
de plugin n'exige pas de `SKILL.md` là — si `skills/core/` sans `SKILL.md` déclenche un warning, `lib/core/` est
le repli. Ce choix de chemin **ne change pas le design** ; seuls les chemins d'import en dépendent.

API publique unique : `lib/core/index.ts` (barrel). Les moteurs importent **exclusivement** `core` par ce barrel.

**Contenu de `core` :**

| Module `core` | Absorbe (sources dupliquées à supprimer) |
|---|---|
| `contrast` | `chart-native/src/core/contrast-scan.ts`, `chart-native/src/core/conformance.ts:173-227` (constantes/math), `dw-chart/src/contrast.ts` |
| `theme` | `deriveFurniture` de `chart-native/src/core/tokens.ts` + `map-native/src/theme/map-tokens.ts` ; `resolveFrameColors` |
| `locale` | `chart-native/src/core/locale.ts`, `map-native/src/core/locale.ts`, formatage nombres |
| `i18n-furniture` | `dw-chart/src/furniture-i18n.ts`, `map-dw/src/furniture-i18n.ts` |
| `text-fit` | mesure/gouttières/label-fit (`core/text.ts`, `endLabelGutterPx`, `leftLabelGutterPx`, `sourceFooterReserve`) |
| `video-verify` | `chart-native/src/core/video-verify.ts`, `map-native/src/core/video-verify.ts` |
| `conformance-l0` | le socle header-rules commun (titre/source/alt-text présents, invariants furniture) extrait des `conformance.ts` |

**Ce qui NE bouge PAS** (reste par-moteur, importe `core`) : les règles de conformance **par-type**
(`chart-native` : barres/scatter/… ; `map-native` : choroplèthe/symbole/route/…), la géométrie, les composants de
rendu. Elles remplacent leurs primitives dupliquées par des imports `core`.

### 4.2 La garde de frontière (mécanique)

Test d'imports (`bun:test`) — le point faible de l'option B rendu mécanique :

- **Interdit :** tout import d'un moteur vers le `src/` d'un autre moteur (`skills/<A>/** → skills/<B>/src/**`).
- **Interdit :** tout import de `core` par un chemin interne (autorisé : `core` (barrel) uniquement).
- **Autorisé :** `skills/<moteur>/** → lib/core` (barrel). L'orchestrateur `skills/splash` importe les moteurs
  **uniquement** via leur manifeste (voir 4.3), plus par reach `src/`.

Ce test échoue le gate si un futur reach-in est introduit. C'est `feedback→système` appliqué à l'archi.

### 4.3 Le registre de producteurs

Chaque moteur exporte un **manifeste** typé :

```ts
// lib/core/registry.ts (types) ; chaque moteur : skills/<engine>/src/manifest.ts
type ExecutionModel = 'subprocess' | 'in-process'

interface ProducerManifest<Spec> {
  name: Producer                       // identifiant (ex. 'chart-native')
  formats: readonly VisualFormat[]     // ce qu'il sait produire
  specSchema: ZodType<Spec>            // contrat spec-in (zod)
  execution: ExecutionModel            // transport déclaré
  // subprocess : chemins script ; in-process : fn
  produce: (spec: Spec, ctx: ProduceContext) => Promise<DeliveredArtifact>
}
```

- L'orchestrateur construit son dispatch **depuis le registre** (`registerProducer(manifest)` au chargement),
  plus de switch/enum hard-codé. Les ~7 sites (`producer-spec.ts`, `adapters.ts` SCRIPT/SKILL_DIR/switch,
  `validate-gate.ts`, `producer-guard.ts`, `guardrail-parity.ts`, `brand-profile.ts`, `export-code.mjs`)
  lisent le registre au lieu de dupliquer l'énumération.
- **Ajouter un moteur** = écrire `skills/<engine>/src/manifest.ts` + un `register()`. Rien d'autre.
- **Couture contributeur** = implémenter `ProducerManifest` + dépendre de `core`. L'orchestrateur route par
  `formats`/`name` ; il ne voit jamais les internes du contributeur.

### 4.4 Contrats + dispatcher unique

- **`ProduceContext`** (spec-in commun) : `{ channel, format, outDir, themeBg, locale, … }` validé, threadé
  identiquement quel que soit le transport (fin du `SPLASH_CHANNEL`-env-natif-seul).
- **`DeliveredArtifact`** (artefact-out commun) : descripteur zod `{ format, form, files, report }`.
  `assertDelivered(files, {format, form})` devient une **clause du contrat** vérifiée par le dispatcher, pas par
  chaque chemin d'export.
- **Dispatcher unique** (`skills/splash`) : lit `manifest.execution`, exécute (spawn sous-processus **ou** appel
  in-process) derrière **la même** enveloppe erreur/timeout/threading, valide spec-in (zod) avant produce et
  artefact-out après. Un seul chemin de code, deux transports.

## 5. Plan de migration (incrémental, gate vert à chaque pas)

Ordre par risque croissant (le plus pur/testé d'abord). Chaque étape : créer le module `core`, supprimer le(s)
mirror(s), pointer les imports, `bun run check` **vert** avant l'étape suivante.

1. **`contrast`** — pur, bien testé, plus haute duplication. Le canari.
2. **`theme` / `deriveFurniture`** — dé-dupliquer les 2 implémentations (attention aux divergences réelles :
   diff avant fusion, préserver le comportement byte-identique testé).
3. **`locale` / i18n furniture**.
4. **`text-fit`** (gouttières, label-fit, footer-reserve).
5. **`video-verify`**.
6. **`conformance-l0`** — extraire le socle commun ; chaque moteur garde ses règles par-type au-dessus.
7. **Registre** — introduire `ProducerManifest` + `registerProducer`, migrer les ~7 sites vers la lecture du
   registre (l'union `Producer` peut rester comme type dérivé du registre).
8. **Dispatcher unifié + contrats zod** — `ProduceContext`/`DeliveredArtifact`, dispatcher unique, `assertDelivered`
   en clause de contrat.
9. **Garde d'imports** — activer le test de frontière (4.2) en dernier, une fois tous les reach-in supprimés.

**Invariant à chaque étape :** aucun changement de comportement rendu. Là où les 2 copies divergeaient (ex.
conformance 1892 vs 754 LOC), la fusion ne concerne QUE la primitive partagée ; la logique par-type divergente
reste intacte. En cas de divergence de primitive non triviale, la trancher explicitement (grounder la règle
WCAG/thème réelle) avant de fusionner — pas de fusion aveugle.

## 6. Tests

- **Non-régression :** `bun run check` (20 checks) vert à chaque étape — c'est le filet primaire.
- **Nouveau — garde d'imports** (`lib/core` ou `skills/splash`) : échoue si un moteur reach le `src/` d'un autre,
  ou importe `core` hors-barrel.
- **Nouveau — parité de primitive** : pour chaque primitive extraite, un test qui prouve que `core.X` produit le
  **même** résultat que l'ancienne implémentation sur un échantillon (évite le drift silencieux pendant la fusion).
- **Nouveau — registre** : un test qui prouve qu'ajouter un manifeste factice le rend dispatchable sans éditer un
  autre fichier (le critère de succès n°2, mécanisé).
- **Contrats zod** : specs invalides rejetées à la frontière (fail-hard, message listant les champs valides).

## 7. Risques & mitigations

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

| Risque | Mitigation |
|---|---|
| Fusion aveugle de 2 primitives qui divergeaient réellement → régression silencieuse | Test de parité par primitive (§6) ; diff + décision groundée avant fusion (§5 invariant) |
| Le loader de plugin traite `core` comme un skill sans `SKILL.md` | Chemin non-skill (`lib/core/`) ; valider à l'impl, repli documenté |
| Migration big-bang casse ~2 600 tests | Interdit — incrémental, gate vert entre chaque étape (§5) |
| La garde d'imports casse des imports légitimes existants | L'activer **en dernier** (étape 9), après nettoyage ; allowlist explicite du barrel |
| `scrolly` importe des composants concrets de chart-native/map-native (pas que des primitives) | **Décision :** ces imports sont de la **composition de rendu** (BarChart, map-story…), pas des primitives dupliquées — **hors périmètre Tier 1**. La garde d'imports (4.2) **allowliste explicitement** `scrolly → {chart-native, map-native}` composants comme la composition host-engine documentée (cf. `CLAUDE.md` : scrolly = mécanisme qui hérite de la furniture du moteur hôte). scrolly consomme quand même `core` pour ses primitives. Une vraie frontière de composants = follow-up séparé, pas Tier 1. |
| Env `SPLASH_*`/`ATELIER_*` threadé de 2 façons | Le `ProduceContext` unifié remplace le threading env ad-hoc ; les alias restent en repli le temps de la migration |

## 8. Hors périmètre (Tier 1)

- Les gates de rendu manquants, rubriques 0-100, durcissement du juge, golden-gate → **Tier 2** (spécifiés
  séparément, plusieurs bloqués par ce Tier 1 : #10, #12).
- Split des SKILL.md, `commands/`, catalog, hygiène → **Tier 0/3**.
- Le refactor de `scrolly` en profondeur (ses imports de composants sont allowlistés, voir §7) — follow-up séparé.

## 9. Références (audit → file:line)

`skills/splash/src/{adapters.ts,validate-gate.ts,guardrail-parity.ts,producer-spec.ts,producer-guard.ts,brand-profile.ts,channel.ts,export-guard.ts}` ·
`skills/chart-native/src/core/{conformance.ts,contrast-scan.ts,tokens.ts,locale.ts,video-verify.ts,text.ts}` ·
`skills/map-native/src/{conformance.ts,theme/map-tokens.ts,core/locale.ts,core/video-verify.ts}` ·
`skills/dw-chart/src/{contrast.ts,furniture-i18n.ts}` · `skills/map-dw/src/furniture-i18n.ts` ·
`skills/scrolly/src/*` · `.claude-plugin/plugin.json`.
Audit complet : `docs/splash/audit-2026-07-20-agentic-and-render.md`.
