# Plan — La couche Verify (`lib/verify` + verbes `capture` / `review`)

> **Spec :** `docs/superpowers/specs/2026-07-26-verify-layer-design.md`
> **Branche :** `feat/verify-layer` (worktree `splash-verify-layer`)
> **Baseline :** `cd lib && bun test` → **660 pass / 3 skip / 0 fail**. Doit rester vert à chaque tâche.
> **Discipline :** TDD strict — écrire le test, **le lancer**, le voir échouer, puis implémenter. Un commit par tâche.
> **Frontière de fichiers :** on possède `lib/verify/**`, `lib/core/verbs/capture.ts`, `lib/core/verbs/review.ts`, l'enregistrement **additif** dans `lib/core/verbs/index.ts`, et des **ajouts groupés** dans `lib/loop/manifest.ts`. Rien d'autre. `lib/brain`, `lib/newsroom`, `lib/delivery`, `lib/host`, `install`, et tout `lib/loop/*` sauf `manifest.ts` sont interdits.

---

## T1 — Le vocabulaire des findings + la table de sévérité centrale (#11)

**Rouge :** `lib/verify/severity.test.ts`
- `severityFor("furniture-below-fold")` → `"blocking"`.
- `severityFor("value-label-abbreviation")` → `"informational"`.
- Un id inconnu retombe sur le **défaut du critère** ; un critère inconnu ⇒ `"warning"` (jamais silencieusement `informational`).
- La table est **TOTALE** sur `CRITERIA` : un critère sans défaut fait échouer le test (garde de dérive).
- Un finding construit par `makeFinding()` **ignore** une sévérité fournie par l'appelant : la table gagne.

**Vert :** `lib/verify/types.ts` (types + `CRITERIA`, `SEVERITIES`, `FINDING_STATUSES`), `lib/verify/severity.ts`.

**Commit :** `feat(verify): findings carry a severity the finder cannot choose`

---

## T2 — Résolution du viewport réel depuis le canal (#10)

**Rouge :** `lib/verify/viewport.test.ts`
- `resolveTargets("article-web", "static")` → **une** cible `primary` 1200×675 (== `CHANNEL_POLICY.mediaSize`), pas de breakpoints.
- `resolveTargets("social-vertical", "static")` → 1080×1920.
- `resolveTargets("article-web", "interactive")` → 3 cibles : `narrow` 360, `primary` 1200, `wide` 1600.
- Un `DestinationProfile` fourni **gagne** sur la politique de canal (largeur d'embed réelle du CMS).
- `deviceScaleFactor` par défaut 2, surchargeable par le profil ; jamais 0/négatif (rejeté).
- Les cibles sont JSON-round-trippables (`toStrictEqual`) — I6.

**Vert :** `lib/verify/viewport.ts`.

**Commit :** `feat(verify): review targets come from the channel's real publication size`

---

## T3 — Dimensions réelles d'un PNG livré

**Rouge :** `lib/verify/png.test.ts`
- Sur un **vrai PNG** (celui que `lib/loop` produit déjà dans un tmpdir, ou un PNG minimal écrit octet par octet) : `pngSize()` rend la vraie largeur/hauteur.
- Un fichier non-PNG rend `null`, ne jette pas.
- Un fichier tronqué (< 24 octets) rend `null`.

**Vert :** `lib/verify/png.ts`.

**Commit :** `feat(verify): read a delivered PNG's real pixel size`

---

## T4 — `capture` : le format statique (sans navigateur)

**Rouge :** `lib/verify/capture-static.test.ts`
- Un PNG 1200×675 pour `article-web`/`static` : `capture()` rend **un** `CaptureRecord` (`primary`), avec `cssViewport` 1200×675, le sha256 réel du fichier, et `checks` contenant `capture:fits-viewport` en `pass`.
- Un PNG **800×450** pour le même canal : `capture:size-matches-destination` en `fail`, avec les deux tailles dans `detail`.
- Un chemin inexistant : résultat `ok:false`, **pas de throw** (I1).
- Le résultat round-trippe en JSON (I6) — aucun `undefined` qui disparaît.

**Vert :** `lib/verify/capture.ts` (branche image seule pour l'instant).

**Commit :** `feat(verify): capture records a static deliverable's real size against its channel`

---

## T5 — `capture` : le vrai navigateur, la vraie furniture, le vrai pli (#10) ★

**Rouge :** `lib/verify/capture-html.test.ts` — **vrai chromium, vrai fichier HTML écrit par le test** (pas un mock : un document réel dont la géométrie reproduit celle mesurée sur le rendu de la boucle — pied de source à ~554px, racine haute de 557px).
1. À la cible **primary 1200×675** : les 3 furnitures (`title`, `unit`, `source`) sont `present` **et** `in-frame` ; `fits-viewport` passe ; le PNG de review existe sur disque et **est** un PNG (magic bytes) aux dimensions `viewport × dpr`.
2. **La panne de #10, reproduite :** à **900×560**, `capture:furniture-in-frame` **échoue** pour `role: "source"`, et le `detail` cite la box du pied (bas 581) contre la hauteur de viewport (560). *C'est le test que l'issue demande nommément.*
3. Une furniture **absente du DOM** ⇒ `capture:furniture-present` en `fail` (pas un `in-frame` trompeur).
4. Un `alt-text` **visuellement caché** (1×1) est `present` — la règle a11y n'exige pas qu'il soit visible.
5. `rootSelector` retenu est enregistré dans le record ; sur un document sans `#root`, la racine dégrade vers `body` sans jeter.
6. `marks` et `markColours` sont **mesurés** sur le document réel (pour T9).

**Vert :** branche HTML de `lib/verify/capture.ts` (Playwright, `settleMs`, résolution de racine, mesure des boxes, screenshot de la racine).

**Commit :** `feat(verify): capture opens the real deliverable at the publication viewport`

---

## T6 — Le record de préview et son refus de type (#3)

**Rouge :** `lib/verify/preview.test.ts`
- Une préview dont le `deliverableSha256` ≠ artefact courant ⇒ `previewCoversDeliverable()` refuse avec `stale-preview`.
- **Un PNG pour un format `interactive` ⇒ refus `not-the-deliverable`** (la panne de #3 : « un still n'est pas l'interactif »).
- Un `.html` pour `scrolly` ⇒ accepté ; un `.mp4` pour `video` ⇒ accepté ; une image pour `static` ⇒ accepté.
- `presentedAs: "path-printed"` **est** une préview valide **si** `fallbackReason` est renseignée (le cas no-GUI de #3) ; sans raison ⇒ refus.

**Vert :** `lib/verify/preview.ts`.

**Commit :** `feat(verify): a preview must show the pinned format's own deliverable`

---

## T7 — La frontière de redaction (#9)

**Rouge :** `lib/verify/redact.test.ts`
- `buildReviewerInput()` sur une entrée **truffée** d'internes (runId, `elementId`, `chosenId`, `why`, `whySource`, `provenanceHash`, un chemin absolu de run dir, un id d'agent) : **aucune** de ces valeurs n'apparaît dans le JSON sérialisé de la sortie.
- Un champ interne **ajouté demain** (clé inconnue) n'est pas propagé — la whitelist, pas la suppression.
- `assertNoInternals()` **jette** si on lui passe une entrée contaminée à la main (la ceinture par-dessus la bretelle) ; l'erreur nomme le motif trouvé, pas la valeur entière.
- `hashReviewerInput()` est stable par permutation de clés et **change** si un extrait de preuve change (canonique).

**Vert :** `lib/verify/redact.ts`.

**Commit :** `feat(verify): the reviewer sees the artifact, never the orchestration`

---

## T8 — Le reviewer mécanique et l'attribution honnête (#9, #11)

**Rouge :** `lib/verify/review.test.ts`
- Un `CaptureCheck` `furniture-in-frame:fail` devient un finding `blocking` de critère `furniture`, `provenance: "mechanical"`, avec l'evidence du check.
- Un record de capture dont la cible ≠ profil accepté ⇒ finding **bloquant** `viewport` (`destination-mismatch`) — la 2ᵉ prise de #10.
- Alt-text manquant dans les evidences ⇒ finding bloquant `accessibility`.
- Sans adapter indépendant : `reviewer.mode === "mechanical"` et `independentSemanticReview === "unavailable"` — **jamais** `"independent"`.
- Avec un adapter enregistré qui rend un finding : le finding est **re-sévérisé par la table** (l'adapter ne choisit pas), et le mode passe `"independent"`.
- Un adapter qui **jette** ⇒ la review rend quand même un record, mode retombé sur `mechanical`, `independentSemanticReview: "declined"` (I1).
- `inputsHash`/`outputHash` présents et stables.

**Vert :** `lib/verify/review.ts`.

**Commit :** `feat(verify): a review that reports what produced each finding`

---

## T9 — La voie « needs-human-eye » (risque de goût)

**Rouge :** `lib/verify/taste.test.ts`
- **Densité :** `marks` au-delà du seuil pour la largeur de racine ⇒ signal `density`, `routedTo: "human-signoff"`.
- **Adjacence de palette :** deux `markColours` adjacentes trop proches (distance de teinte/luminance sous seuil) ⇒ signal `palette-adjacency`.
- **Divergence titre↔takeaway :** recouvrement de tokens sous seuil entre le titre rendu et le `confirmedTakeaway` ⇒ signal `title-takeaway-divergence`.
- **Blanc :** ratio racine/viewport hors bornes ⇒ signal `whitespace`.
- Un signal n'est **jamais** un finding bloquant et n'a **pas** de verdict (`pass`/`fail` absents du type) — garde de type + test.
- Les signaux apparaissent dans le `ReviewRecord` sous `tasteRisk`, séparés des `findings`.

**Vert :** `lib/verify/taste.ts` + branchement dans `review.ts`.

**Commit :** `feat(verify): name the taste risks a model must not grade`

---

## T10 — La décision d'approbation (#3, #11)

**Rouge :** `lib/verify/approval.test.ts`
- Bloquant `open` ⇒ refus `blocking-findings-open`, avec les ids.
- Bloquant + override **valide** (même `artifactSha256` **et** même `provenanceHash`) ⇒ approuvable.
- Le **même** override après une re-production (artefact re-hashé) ⇒ **ne compte plus** (refus) — l'invalidation de #11.
- Warning non acquitté ⇒ refus `warnings-unacknowledged` ; acquitté ⇒ approuvable.
- Informational ⇒ n'empêche rien.
- **Pas de préview ⇒ refus `preview-not-presented`**, même sans aucun finding — la porte de #3.
- Review d'une provenance périmée ⇒ refus `review-stale`.
- La décision liste les `tasteRisk` à présenter (elle ne les bloque pas).

**Vert :** `lib/verify/approval.ts`.

**Commit :** `feat(verify): approval refuses what was never previewed or never cleared`

---

## T11 — Les deux verbes (contrat : I1, I2, I4, I5, I6)

**Rouge :** `lib/core/verbs/verify-verbs.test.ts`
- `runVerb("capture", {})` ⇒ `invalid-request` (plus `not-implemented`), message nommant les champs requis.
- `runVerb("review", {})` ⇒ `invalid-request`.
- Payload de capture valide mais artefact absent ⇒ `engine-failed`, **jamais** de throw.
- `format: "video"` ⇒ `not-implemented` **typé**, message nommant la raison (déféré, §7 du spec).
- Le résultat des deux verbes round-trippe en JSON (I6, `toStrictEqual`).
- Un throw résiduel depuis la couche est converti au bord (I1) — test avec un adapter reviewer explosif.
- Aucune lecture de `process.env` dans `lib/verify/**` ni dans les deux verbes — **test de grep sur les sources** (I5), comme `produce.test.ts:254` le fait déjà pour « no subprocess, no skills/ import ».
- Le test existant `lib/core/verbs/index.test.ts` (« not-implemented pour capture/review ») **va casser** : il est dans un fichier qu'on possède **partiellement**… → **non** : il teste les verbes qu'on implémente, et `index.test.ts` n'est pas dans la liste interdite (`lib/core/verbs/**` nous appartient pour capture/review). On met à jour **uniquement** les deux assertions concernées, sans toucher au reste du fichier.

**Vert :** `lib/core/verbs/capture.ts`, `lib/core/verbs/review.ts`, enregistrement additif dans `index.ts`.

**Commit :** `feat(verbs): capture and review get bodies, not placeholders`

---

## T12 — Le slot `review` du manifest + `approveElement` (#3)

**Rouge :** `lib/verify/manifest-review.test.ts` (dans **notre** paquet, pour ne pas toucher aux tests de `lib/loop`)
- Un manifest portant un `ReviewRecord` complet **parse** et round-trippe (`readManifest`/`writeManifest`).
- Un manifest **ancien** (`review: { findings: [], reviewedProvenanceHash }`) parse toujours — rétro-compatibilité stricte.
- `approveElement()` refuse sans préview et **n'écrit pas** `approved`.
- `approveElement()` écrit `approved` quand la décision passe, avec `approvedProvenanceHash` == provenance courante.
- Nouvel invariant : un override référençant un `findingId` inexistant ⇒ `assertInvariants` jette.
- Nouvel invariant : une préview dont le hash contredit `el.artifact.sha256` ⇒ jette.
- Les 3 tests existants qui posent `approved` à la main **restent verts** (invariant conditionnel, pas inconditionnel — spec §6.2).

**Vert :** `lib/verify/schema.ts` + ajouts **groupés en fin** de `lib/loop/manifest.ts`.

**Commit :** `feat(loop): the dormant review slot holds a real review record`

---

## T13 — La preuve sur artefact réel (opt-in, mais exécutée) ★

**Rouge/preuve :** `lib/verify/real-artifact-proof.test.ts`, `test.skipIf(process.env.SPLASH_VERIFY_PROOF !== "1")` (convention `lib/loop/video-e2e.test.ts:17`).
- Produit un **vrai interactif** par `lib/loop/produce.ts` (chart-native, article-web) — le vrai seam, pas une fixture.
- `capture()` à ses 3 breakpoints réels → assertions sur **l'image réelle** : le PNG existe, ses magic bytes sont ceux d'un PNG, ses dimensions valent `viewport × dpr`, et les furnitures (titre confirmé, unité, source) sont `present` + `in-frame` à `primary`.
- **La même capture à 900×560 échoue** sur le pied de source — la panne de #10 sur le rendu de production, pas sur une fixture.
- `review()` sur ces captures rend un record structuré ; `approvalDecision()` **refuse** sans préview puis **accepte** avec une préview de l'`interactive.html` réel.
- Exécuter, mesurer, **reporter les nombres**.

**Commit :** `test(verify): prove capture and review on an artifact the loop really built`

---

## T14 — Self-review et résidus

- Relire le diff entier ; vérifier qu'aucun fichier hors frontière n'a bougé (`git diff --stat`).
- `cd lib && bun test` (660 + les neufs, 0 fail) · `cd skills/splash && bunx tsc --noEmit` propre.
- Ajouter `## Risques assumés` au spec avec le **ruling** de chaque résidu constaté à l'implémentation.

**Commit :** `docs(verify): record the residuals the slice knowingly leaves open`
