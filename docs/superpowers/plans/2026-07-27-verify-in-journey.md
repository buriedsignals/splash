# Plan — La couche Verify DANS le parcours

> **Spec :** `docs/superpowers/specs/2026-07-27-verify-in-journey-design.md`
> **Branche :** `feat/verify-in-journey`, off `c88d1a8`.
> **Discipline :** TDD strict — écrire le test, **le lancer**, le voir échouer, puis implémenter.
> Un commit par tâche. `bun test` sur les fichiers touchés à chaque tâche ; `cd lib && bun test`
> complet aux tâches 5 et 9.
> **Baseline mesurée :** `cd lib && bun test` → **1137 pass / 10 skip / 0 fail** (255 s).

---

## Tâche 1 — Le slot `capture`, l'état `captured`, et les prédicats de fraîcheur

**Fichiers :** `lib/verify/schema.ts`, `lib/verify/types.ts`, `lib/loop/manifest.ts`,
`lib/loop/manifest.test.ts`, `lib/loop/gate-state.test.ts`.

**Tests d'abord** (`lib/loop/manifest.test.ts`) :
1. un manifeste portant un slot `capture` bien formé parse ; un slot dont `images` n'est pas un
   tableau est refusé ;
2. `gateStateOf` répond `"captured"` pour un élément avec un artefact frais + une capture
   fraîche + pas de review ; `"produced"` quand la capture porte une autre provenance ;
3. `captureCovers` / `reviewCovers` / `approvalCovers` (exportés) sont vrais exactement quand le
   hash de provenance courant correspond.

**Implémentation :** `CaptureSlotSchema` (`images`, `checks`, `capturedProvenanceHash`,
`unsupported?`) ; `capture?` sur `RunElementSchema` ; `"captured"` dans `GateState` et
`gateStateOf` (entre `produced` et `reviewed`) ; les trois prédicats.

**Vérif :** `bun test lib/loop/manifest.test.ts lib/loop/gate-state.test.ts`.

---

## Tâche 2 — Le routage : `capture · review · preview · approve` dans `nextActions`

**Fichiers :** `lib/loop/manifest.ts`, `lib/loop/manifest.test.ts`.

**Tests d'abord :**
1. élément produit + `delivery.requested` non satisfait + rien de vérifié ⇒ `["capture"]` ;
2. + capture fraîche ⇒ `["review"]` ; + review fraîche ⇒ `["preview"]` ; + preview couvrante ⇒
   `["approve"]` ; + `approved` frais ⇒ `["deliver"]` ;
3. **sans** livraison demandée, un élément produit répond toujours `["show"]` (le contrat que
   `lib/source/wiring-proof.test.ts` — hors frontière — asserte) ;
4. une re-confirmation d'angle (provenance qui bouge) sur un élément approuvé ⇒ `["produce"]`,
   pas `["deliver"]`.

**Implémentation :** la cascade du spec §2.1 ; `NextAction` gagne `capture · review · preview ·
approve`.

**Vérif :** `bun test lib/loop/manifest.test.ts`.

---

## Tâche 3 — Les étapes `capture` et `review` (`lib/loop/verify.ts`) + le driver

**Fichiers :** `lib/loop/verify.ts` (neuf), `lib/loop/verify.test.ts` (neuf),
`lib/loop/driver.ts`, `lib/verify/review.ts` (rubrique partagée + evidence de capture
indisponible).

**Tests d'abord** (avec un vrai PNG produit par un helper d'octets PNG valides — IHDR réel) :
1. `captureStep` sur un `static.png` de 1200×676 à `article-web` écrit `el.capture` avec une
   image, `capturedProvenanceHash` courant, et un check `capture:size-matches-destination` en
   `pass` ;
2. `captureStep` sur un format `video` (capture `not-implemented`) écrit un slot **vide** portant
   `unsupported`, et **ne** refuse **pas** ;
3. `captureStep` sur un artefact illisible (pas un PNG) **refuse** (le run reste sur `capture`) ;
4. `reviewStep` écrit `el.review` avec `reviewedProvenanceHash` courant,
   `reviewer.independentSemanticReview === "unavailable"`, zéro finding pour un artefact sain ;
5. `reviewStep` après une capture `unsupported` émet le finding **blocking** `no-capture`, dont
   l'`evidence` porte la raison ;
6. `advanceStep` conduit `capture` puis `review` quand `nextActions` les nomme.

**Implémentation :** `captureStep` / `reviewStep` (payloads du spec §3.1-3.2, crédit tiré de
`validateSourcePolicy`, furniture déclarée en texte) ; deux `case` dans `advanceStep` ;
`DEFAULT_REVIEW_RUBRIC` et `captureUnavailable?` dans `ReviewRequest`.

**Vérif :** `bun test lib/loop/verify.test.ts lib/loop/driver.test.ts`.

---

## Tâche 4 — L'étape `preview` (`lib/loop/preview.ts`) + le driver

**Fichiers :** `lib/loop/preview.ts` (neuf), `lib/loop/preview.test.ts` (neuf),
`lib/loop/driver.ts`.

**Tests d'abord :**
1. avec `SPLASH_NO_VIEWER=1`, `previewStep` écrit `review.preview` avec
   `presentedAs: "path-printed"` et un `fallbackReason` non blanc, et
   `previewCoversDeliverable` l'accepte ;
2. avec `SPLASH_PREVIEW_OPENER=/usr/bin/true`, il écrit `presentedAs: "opened"` ;
3. un artefact dont les octets ont changé sous le run ⇒ **refus** (aucune préview écrite) ;
4. il refuse si `el.review` n'existe pas encore (l'ordre de la cascade est une précondition, pas
   un espoir) ;
5. `advanceStep` conduit `preview` quand `nextActions` le nomme.

**Implémentation :** le présentateur (ouvreur de plateforme + les deux réglages), l'étape, le
`case` du driver.

**Vérif :** `bun test lib/loop/preview.test.ts lib/loop/driver.test.ts`.

---

## Tâche 5 — `approve` : la cérémonie, la signature Ed25519, le document de sign-off

**Fichiers :** `lib/loop/approve.ts` (neuf), `lib/loop/approve.test.ts` (neuf),
`lib/loop/deliver.ts` (+ ses tests), et les tests de livraison qui doivent désormais déclarer
une approbation.

**Tests d'abord :**
1. `approve` sur une chaîne complète et saine écrit `approved` avec le `provenanceHash` courant
   et un `signoffPath` **qui existe sur disque**, portant les faits du spec §4.2 ;
2. sans préview ⇒ refus portant `preview-not-presented` ;
3. un finding **blocking** ouvert ⇒ refus ; le même avec un override (findingId + raison +
   actorLabel) ⇒ approuvé, et l'override enregistré porte `artifactSha256`/`provenanceHash`
   **posés par la colonne vertébrale** ;
4. un override nommant un finding absent, ou avec une raison blanche ⇒ refus ;
5. un warning non acquitté ⇒ refus ; acquitté ⇒ approuvé ;
6. avec `requiredSigners` : sans signature ⇒ refus ; avec une **vraie** signature Ed25519
   (clé générée dans le test, `sign-artifact.ts`'s payload) ⇒ approuvé ; signature d'un autre
   artefact ⇒ refus ; signataire hors `requiredSigners` ⇒ refus ;
7. **`deliver()` refuse un élément non approuvé**, même sans `requiredSigners` ; approuvé pour une
   provenance antérieure ⇒ refus aussi.

**Implémentation :** `approve()` (pur sauf l'écriture du document), la porte inconditionnelle de
`deliver()`. Mise à jour des tests de livraison existants : ils déclarent l'approbation de
l'artefact qu'ils publient (une ligne), leur sujet restant la livraison.

**Vérif :** `cd lib && bun test` (complet — cette tâche a le plus grand rayon de souffle).

---

## Tâche 6 — La façade : `approve`, et `advance` qui nomme le tour humain

**Fichiers :** `lib/host/drive.ts`, `lib/host/cli.ts`, `lib/host/drive.test.ts`,
`lib/host/cli.test.ts`.

**Tests d'abord :**
1. `approve --run <dir>` sans run ⇒ `no-run`, exit 2 ; avec `--element` inconnu ⇒
   `invalid-request` listant les ids présents ;
2. stdin vide vaut `{}` ; stdin non-JSON ⇒ `usage`, exit 2 ; un document dont `overrides` n'est
   pas un tableau ⇒ `invalid-request` ;
3. une approbation refusée **n'écrit rien** (run.json octet pour octet identique) ;
4. `advance` sur un élément dû à `approve` refuse en **nommant la commande** ;
5. la commande inconnue liste `approve` dans son message d'usage.

**Implémentation :** `approveIn` dans `drive.ts` (via `decide`), la commande dans `cli.ts`, le
lecteur stdin optionnel, `nothingToRun`, le message d'usage.

**Vérif :** `bun test lib/host/`.

---

## Tâche 7 — `state` porte la vérification

**Fichiers :** `lib/loop/resume.ts`, `lib/loop/resume.test.ts`.

**Tests d'abord :** un élément revu remonte `verification` avec ses findings (severity/status),
ses `tasteRisk`, son `preview`, `independentSemanticReview`, et une décision d'approbation dont
les `reasons` sont **exactement** celles qu'`approve` opposera ; un élément non revu ne porte pas
la clé.

**Implémentation :** la projection du spec §6.

**Vérif :** `bun test lib/loop/resume.test.ts lib/host/`.

---

## Tâche 8 — LA PREUVE : le parcours complet, par appels CLI engendrés

**Fichiers :** `lib/host/journey.test.ts`.

**Tests :** le parcours étendu — `init → advance(orient) → confirm-angle → advance(propose) →
state → phrase → choose-form → advance(produce) → request-delivery → advance(capture) →
advance(review) → advance(preview) → state (lit findings + décision) → approve →
advance(deliver) → state` — et **le refus** : après `request-delivery`, `nextActions` répond
`capture` et non `deliver` ; un `advance` supplémentaire ne publie rien tant que l'approbation
n'existe pas. Publieur `zip`. La mesure réelle de la capture est assertée (taille lue dans le
`CaptureRecord` contre la taille du canal).

**Vérif :** `bun test lib/host/journey.test.ts`.

---

## Tâche 9 — Documentation + revue

**Fichiers :** `lib/host/README.md`, `skills/splash/SKILL.md`, le spec (§9 Risques assumés).

- README : la commande `approve`, les trois étapes d'`advance`, `verification` dans `state`, les
  deux réglages de préview, et la correction du `implemented: false` périmé de `capture`/`review`.
- `SKILL.md` : la porte d'approbation dans le parcours V2 — préview mécanique avant « ship it ? ».
- `bunx tsc --noEmit` dans `lib` **et** `skills/splash` (sortie redirigée dans un fichier, code de
  sortie testé — jamais `| head`).
- `cd lib && bun test` complet, comptes rapportés.
- Auto-revue → `## Risques assumés` avec un ruling par résidu.
</content>
