# Plan — Source wiring (la consommation de `lib/source`)

> Spec : `docs/superpowers/specs/2026-07-26-source-wiring-design.md`.
> Branche : `feat/source-wiring`. TDD strict : le test échoue d'abord, on le RUN, on le voit
> échouer, puis on implémente. Un commit par tâche.

Baseline mesurée au départ du worktree :
`cd lib && bun test` → **939 pass / 7 skip / 1 fail** — le fail unique
(`lib/brain/acceptance.test.ts` « a real run reaches an offer… ») est un **flake de contention**
(LLM réel) : re-run isolé → **2 pass / 0 fail**. Baseline effective **940 / 7 / 0**.
`cd lib && bunx tsc --noEmit` et `cd skills/splash && bunx tsc --noEmit` : propres.

---

## T1 — `PublishedSource.attribution` (le jumeau sans préfixe)

**Fichiers :** `lib/source/furniture.ts`, `lib/source/furniture.test.ts`.

- RED : un test `credit === "Source : X" && attribution === "X"` pour `local`, un test prose
  (`attribution === "X (chiffres cités dans l'article)"`), un test synthetic (la notice est
  dans les DEUX), un test `none` (les deux vides), et l'invariant
  `credit === sourceLabel(lang) + " " + attribution` sur toute classe créditée.
- GREEN : composer `attribution` d'abord, puis `credit = `${sourceLabel(lang)} ${attribution}``.
- Les `toEqual` existants de `furniture.test.ts` sont élargis au nouveau champ (ils pinnent la
  forme complète — c'est voulu, on ne les affaiblit pas).

## T2 — `provenanceHash` couvre `sources` + produce lit le ledger (UN SEUL COMMIT)

**Fichiers :** `lib/loop/manifest.ts` (une ligne), `lib/loop/produce.ts` (le crédit + son import),
`lib/loop/manifest.test.ts`, `lib/loop/produce.test.ts`.

La spec source l'exige explicitement : le consommateur et le hash dans le même commit, sinon on
livre le bug (crédit périmé sur un artefact « frais »).

- RED (hash) : deux runs identiques sauf `sources.data.label` → `provenanceHash` doit différer ;
  un run sans `sources` garde une valeur stable entre deux appels.
- RED (produce, décision §4) : « produce refuses a run that declared no source » → attend
  `ok: false` et `/source-undeclared/` dans le message.
- RED (produce, crédit) : un run déclarant `public` + label + URL spécifique → l'artefact rendu
  ne contient plus « Provided by the newsroom ».
- GREEN : `sources: run.sources ?? null` dans `canonicalHash` ; `validateSourcePolicy` +
  `toVerbResult` + `published.attribution/url` dans `produce.ts`, **sans toucher** à la logique
  canal/format du fichier (un autre chantier y travaille).
- Migration des fixtures : tout run de test qui produit gagne
  `sources: { mode: "real", data: { kind: "local", label: … } }`.

## T3 — `deliveryMetadata` lit le ledger

**Fichiers :** `lib/delivery/metadata.ts`, `lib/delivery/metadata.test.ts`,
`lib/loop/deliver.ts` (une ligne d'appel).

- RED : avec un ledger `public`, `metadata.source` vaut l'attribution déclarée et **pas**
  `profile.source` ; avec un ledger invalide, la métadonnée échoue ; avec un ledger sans `data`,
  refus ; sans ledger du tout, comportement inchangé (R3).
- RED : la langue du profil localise le qualificatif prose.
- GREEN : 4ᵉ paramètre optionnel `sources?: SourceLedger` + `publicSourceView`.

## T4 — `conformanceL0` lit la table

**Fichiers :** `lib/core/conformance-l0.ts`, `lib/core/conformance-l0.test.ts`.

- RED : `sourceKind: "public"` + nom sans URL → « missing source URL » ; `sourceKind: "local"` +
  nom sans URL → **aucune** violation (la contradiction du §1) ; `sourceKind: "none"` sans nom →
  aucune violation ; URL non spécifique → violation ; **sans** `sourceKind`, verdict
  byte-identique à aujourd'hui sur les cas existants.
- GREEN : brancher sur `requirementsFor` + `sourceUrlVerdict`.

## T5 — La preuve mesurée (opt-in, exécutée une fois)

**Fichier :** `lib/source/wiring-proof.test.ts`, garde `SPLASH_SOURCE_PROOF=1`.

1. produce `interactive` avec une source `public` → lire `interactive.html` : le label et l'URL
   déclarés sont présents, « Provided by the newsroom » absent ;
2. produce `static` → le même label présent dans le DOM rendu capturé avant rasterisation ;
3. changer le label → `stalenessOf(run, el) === true` sur l'artefact déjà produit.

Opt-in parce qu'il rend un vrai chart (réseau + navigateur, ~60 s) ; **exécuté une fois** et le
résultat journalisé ci-dessous.

## T6 — Auto-revue du diff + résidus

Relire le diff entier, vérifier qu'aucun reformatage n'a touché `produce.ts`/`manifest.ts`
au-delà de la ligne prévue, et consigner les résidus honnêtes dans `## Risques assumés` de la
spec (déjà rédigés — à confronter au diff réel et à corriger si le diff les dément).

---

## Journal d'exécution

- **T1** `a305aa3` — `PublishedSource.attribution`. RED 7/10 fail → GREEN `lib/source` 100/0.
  Écart §5 mesuré et corrigé (le `credit` préfixé ne peut pas aller dans `spec.source.name`).
- **T2** `d7a220e` — `provenanceHash` + produce, **un seul commit**. RED : 2 fail hash + 2 fail
  produce. Migration de fixtures : `lib/loop/produce.test.ts` (5 runs),
  `lib/loop/driver.test.ts` (10), `lib/host/journey.test.ts` (2), `lib/loop/deliver.test.ts` (1),
  `lib/loop/engines.test.ts` (1, run sérialisé dans un sous-process),
  `lib/verify/real-artifact-proof.test.ts` (1) et `lib/brain/acceptance.test.ts` (1) — les deux
  derniers dans des répertoires que le périmètre interdisait, cf. spec R8.
- **T3** `8cc88fc` — `deliveryMetadata(el, profile, sizing, sources?)` + une ligne dans
  `deliver.ts`. RED 5/12 fail → GREEN 12/0.
- **T4** `afe03c3` — `conformanceL0({ sourceKind })`. RED 4/18 fail → GREEN `lib/core` 199/0 ;
  `skills/chart-native` (qui l'importe) typecheck propre + `tests/conformance.test.ts` 28/0.

### Preuves exécutées (mesures, pas assertions)

- `SPLASH_VERIFY_PROOF=1 bun test lib/verify/real-artifact-proof.test.ts` → **1 pass**.
  Rendu réel dans Chromium, `capture:furniture-present` (rôle `source`) au vert sur
  `"Source: Relevés cantonaux 2024"` — le label DÉCLARÉ, lu dans le DOM. Le même test échouait
  d'abord sur `source must be present in the produced chart` tant que sa constante décrivait
  encore le placeholder : c'est la preuve que le crédit rendu a réellement changé.
- `SPLASH_SOURCE_PROOF=1 bun test lib/source/wiring-proof.test.ts` → **2 pass**.
  (a) deux runs à un label près → PNG de bytes/sha256 différents ; (b) label corrigé sur
  l'élément produit → `stalenessOf` `false`→`true`, `nextActions` `["show"]`→`["produce"]`, et la
  ré-production retombe sur le sha256 de l'autre run ; (c) zip livré dézippé → `README.md` porte
  `Source: Office cantonal de la statistique GE`, jamais le placeholder ni `Source: Heidi.news`.

### Gate final

- `cd lib && bun test` → **959 pass / 9 skip / 0 fail** (baseline effective 940/7/0 ; +19 tests,
  +2 skips = les deux preuves opt-in).
- `cd lib && bunx tsc --noEmit` et `cd skills/splash && bunx tsc --noEmit` : propres.
- `cd skills/splash && bun test` → **764 pass / 2 skip / 0 fail** (les 2 skips sont
  token-gated Datawrapper, pré-existants — `scripts/produce-all-format.test.ts:172`,
  `src/adapters.test.ts:129` — et 764+2 = les 766 de la baseline annoncée).
- `cd skills/chart-native && bunx tsc --noEmit` : propre (il importe `lib/core/conformance-l0`).
