# Plan — `taste-fires` : le titre rendu devient une preuve

> Spec : `docs/superpowers/specs/2026-07-27-taste-fires-design.md`.
> Branche : `feat/taste-fires` (worktree `splash-taste`), off `4b07c1d`.
> Baseline mesurée avant de commencer : `cd lib && bun test` → **1197 pass / 10 skip / 0 fail** ;
> `cd lib && bunx tsc --noEmit` et `cd skills/splash && bunx tsc --noEmit` propres.
> Discipline : **TDD** — test rouge écrit, EXÉCUTÉ, vu échouer, puis implémenté. Un commit par
> tâche. Aucun test affaibli, sauté ou supprimé.

Frontière de fichiers (rappel) : `lib/verify/**`, `lib/newsroom/**`, `lib/loop/manifest.ts`
(ADD-only). Tout le reste est interdit — en particulier `lib/loop/verify.ts`, qui n'a **pas**
besoin de bouger (spec §3).

---

## Tâche 1 — La calibration multilingue de `STOPWORDS`

**Rouge.** Dans `lib/verify/taste.test.ts`, un `describe` « calibration » qui rejoue le banc de la
spec §4.2 : les paires verbatim (fr/en/de/it) et le préfixe moteur restent muets, les divergences
fr/de/it se déclenchent, les reformulations légitimes restent muettes. Le cas `de` divergent
échoue avec la liste anglaise seule.

**Vert.** `lib/verify/taste.ts` : étendre `STOPWORDS` aux mots outils fr/de/it, avec le
commentaire qui dit pourquoi (les rédactions de ce projet publient en quatre langues) et que
`TAKEAWAY_OVERLAP_FLOOR` ne bouge pas.

**Preuve.** `bun test lib/verify/taste.test.ts` vert ; le cas `en` (Malta/Estonia) est écrit dans
le banc comme **muet attendu**, avec son commentaire — le rappel échangé contre du silence est
inscrit dans le test, pas seulement dans la spec.

---

## Tâche 2 — `renderedTitle` / `titleSource` sur la ligne de preuve

**Rouge.** `lib/verify/capture-html.test.ts` : un document réel dont le `<svg role="img"
aria-label="…">` déclare un titre ≠ du texte visible ; on attend `images[0].renderedTitle` et
`titleSource === "svg[role='img'][aria-label]"`. Plus : un document `h1`, un document sans aucun
candidat (`titleSource === "none"`, pas de `renderedTitle`), un `h2` de 400 caractères (écarté par
la borne). `lib/verify/capture-static.test.ts` : `titleSource === "static-image"` et pas de
`renderedTitle`.

**Vert.** `lib/verify/types.ts` (+2 champs optionnels sur `CaptureRecord`),
`lib/verify/schema.ts` (+2 champs optionnels — un run déjà sur disque continue de se lire),
`lib/verify/capture.ts` : `TITLE_SOURCES`, `MAX_RENDERED_TITLE_CHARS`, la lecture **dans**
`measureInPage`, et `captureStatic` qui pose `"static-image"`.

**Preuve.** `bun test lib/verify/capture-html.test.ts lib/verify/capture-static.test.ts` vert, y
compris le test de round-trip JSON existant (I6).

---

## Tâche 3 — La dérivation : le titre vient des captures, plus d'un appelant

**Rouge.** `lib/verify/taste.test.ts` + `lib/verify/redact.test.ts` : `runReview` reçoit des
captures qui portent un `renderedTitle` divergent et **rien d'autre** → `tasteRisk` contient
`title-takeaway-divergence`, et `buildReviewerInput` place ce même titre dans `ReviewerInput`.
Plus : `primary` gagne quand plusieurs breakpoints portent des titres différents.

**Vert.** `lib/verify/capture.ts` : `renderedTitleOf(captures)`. `lib/verify/review.ts` : dérive
au lieu de lire `req.source.renderedTitle`. `lib/verify/redact.ts` : **retire**
`ReviewerSource.renderedTitle` et dérive des captures.

**Preuve.** `cd lib && bunx tsc --noEmit` propre (la suppression du champ doit casser à la
compilation tout appelant qui l'affirmait — il n'y en a qu'un, le test de preuve, corrigé en
tâche 5) ; `bun test lib/verify` vert.

---

## Tâche 4 — R2 : le verrou porte le chiffre mesuré

Pas de code de production. `lib/verify/manifest-review.test.ts` : le commentaire du test « leaves
the pre-existing invariants exactly as they were » cesse d'annoncer « trois tests de `lib/loop` »
et porte la mesure (spec §5.2) : **un** test hors frontière, `lib/loop/driver.test.ts:256`, nommé.
**L'assertion ne change pas d'un caractère.**

**Preuve.** `bun test lib/verify/manifest-review.test.ts` vert, diff limité à des lignes de
commentaire.

---

## Tâche 5 — La preuve sur un artefact réellement rendu, dans les deux sens

**Rouge/vert d'un coup** (le test EST la preuve). `lib/verify/real-artifact-proof.test.ts` :

1. retirer les deux `renderedTitle: TAKEAWAY` écrits à la main ;
2. faire passer la preuve par `captureStep`/`reviewStep` (`lib/loop/verify.ts`, les appelants de
   production) au lieu de payloads assemblés à la main ;
3. **cas muet** : `renderedTitle === TAKEAWAY`, `titleSource` nommé, aucun
   `title-takeaway-divergence` ;
4. **cas bruyant** : `revise(el, { kind: "takeaway", … })` sur le même artefact rendu, puis
   `captureStep`/`reviewStep` → le signal existe, son `evidence` cite les deux chaînes, et il
   arrive dans `approvalDecision(...).needsHumanEye` ; on asserte AUSSI que
   `nextActionsForElement` route vers `produce` (la péremption, l'autre mécanisme) ;
5. **cas statique** : un `static.png` réellement produit → `titleSource === "static-image"`, voie
   muette ;
6. `console.log` des nombres mesurés (les deux titres, le recouvrement, le `titleSource`), pour
   que la preuve rapporte ce qu'elle a vu et pas qu'elle a tourné.

**Preuve.** `SPLASH_VERIFY_PROOF=1 bun test lib/verify/real-artifact-proof.test.ts`, sortie
rapportée dans le rapport final.

---

## Tâche 6 — Clôture

- `cd lib && bun test` (suite entière) · `cd lib && bunx tsc --noEmit` ·
  `cd skills/splash && bunx tsc --noEmit` · `cd skills/splash && bun test` — chacun redirigé vers
  un fichier, code de sortie testé séparément (jamais `| head`).
- `## Risques assumés` de la spec rempli, un ruling par ligne.
- Auto-review : relire le diff en cherchant (a) une affirmation que rien ne mesure, (b) un test
  qui prouverait le mécanisme plutôt que le chemin réel, (c) une prétention que des yeux ont
  regardé les pixels.
