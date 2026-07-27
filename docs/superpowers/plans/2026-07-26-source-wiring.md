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

_(rempli au fil des tâches)_
