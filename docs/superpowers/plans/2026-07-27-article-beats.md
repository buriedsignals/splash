# Plan — Les beats d'un article visuel (TDD)

> **Spec :** `docs/superpowers/specs/2026-07-27-article-beats-design.md`
> **Branche :** `feat/article-beats` (worktree `splash-beats`), off `ffd2d8e`.
> **Discipline :** pour chaque tâche — écrire le test qui ÉCHOUE, **le lancer, le voir échouer**,
> puis implémenter, relancer, commiter. Anglais partout dans le code et les commits.
> **Frontière :** `skills/scrolly/**`, `lib/loop/**`, `lib/brain/**` seulement.
> **Baseline :** `cd lib && bun test` → 1254 pass / 11 skip / 0 fail ; `cd skills/scrolly && bun
> test` → 80 pass. `bunx tsc --noEmit` propre dans `lib` et `skills/splash`.

---

## Tâche 1 — `suggestBeats` : le brouillon, nommé comme un brouillon

**Fichiers :** `lib/brain/beats.ts` (neuf), `lib/brain/beats.test.ts` (neuf).

**Tests rouges d'abord :**
- une série `line` de 7 points → un plan d'au moins 3 beats, ancrés sur des valeurs de la colonne
  x réellement présentes, `role` = `establish` … `build`+ … `payoff`, **jamais `turn`** ;
- chaque beat porte un `draftText` non vide et un `text`… *(non — `SuggestedBeat` n'a pas de
  `text` ; c'est `draftBeats` qui pose le `""`)* ;
- `bar` → ancres sur des catégories présentes, dans l'ordre d'affichage résolu ;
- **refus** : `nativeType: "scatter"` → `beats: []` + `refusal` portant les mots du moteur
  (`line and bar`) ;
- **refus** : 2 points seulement → `beats: []` + `refusal` nommant l'arc (`establish`, `build`,
  `payoff`) ;
- `beatSource.facts` d'un beat contient son ancre et sa valeur ; `beatSource.shared` contient
  premier/dernier/min/max/écart/écart % /nombre de points ;
- un plan produit sur une liste d'ancres explicite (`anchors`) respecte exactement cette liste, et
  refuse une ancre absente de la donnée en la nommant.

**Vert :** implémenter `suggestBeats` + un `parseCsvRows` exporté depuis `lib/loop/profile.ts`
(réutilise le split existant, pas un second parseur).

---

## Tâche 2 — Le test de dérive : mes ancres == celles du moteur

**Fichiers :** `lib/brain/beats-drift.test.ts` (neuf).

**Test rouge d'abord :** sur trois CSV réels (dont le sample `line-scrolly.json` et une série
bar), les ancres de `suggestBeats` doivent être **exactement** celles que
`lineNotableIndices` / `barRankedReveals` + le choix de colonnes de `MAPPERS` (importés depuis
`skills/chart-native/src/`) désignent. Un test, jamais du code de production — c'est le seul
endroit du slice qui traverse la frontière moteur, et c'est ce que font déjà
`lib/core/conformance-l0.test.ts` et `lib/core/i18n-furniture.test.ts`.

**Vert :** aligner `suggestBeats` sur les sélecteurs du moteur si l'écart existe.

---

## Tâche 3 — `verifyBeats` : le garde

**Fichiers :** `lib/brain/verify-beats.ts` (neuf), `lib/brain/verify-beats.test.ts` (neuf).

**Tests rouges d'abord :**
- un plan écrit fidèlement passe ;
- **ordre changé** → jette, en nommant l'ordre offert et l'ordre reçu (miroir `verifyOffer`) ;
- **un beat retiré** (y compris `[]`) → jette avec la MÊME erreur que le ré-ordonnancement ;
- **un id inventé** → jette en le nommant ;
- **un nombre absent de la donnée** → jette en nommant le nombre (`… claims the number 4200, which
  is in neither the beat's facts nor the plan's`) ;
- un nombre **arrondi à 0/1/2 décimales** d'un fait autorisé passe ; un arrondi à un chiffre
  significatif (583 → 600) **jette** ;
- « 8 000 » écrit avec une espace insécable ne compte pas pour deux nombres
  (`collapseDigitGroups`) ;
- le libellé d'ancre d'un **autre** beat du plan est citable ;
- un **arc malformé** (deux `payoff`, pas de `build`, un demi-arc) → jette avec la phrase
  d'`arcErrors` ;
- un `text` **vide** → jette (via `arcErrors`) ;
- `AuthoredBeat` **n'a pas** de champ d'ancre : c'est prouvé par un test de type (`@ts-expect-error`
  sur un objet qui en porte un), pas seulement affirmé en prose.

**Vert :** implémenter `verifyBeats`.

---

## Tâche 4 — Le créneau `narrative` dans le manifeste

**Fichiers :** `lib/loop/manifest.ts`, `lib/loop/manifest.test.ts`.

**Tests rouges d'abord :**
- un manifeste portant `narrative` parse et re-parse (round-trip) ;
- `provenanceHash` **bouge** quand un `text` de beat change ; il est **stable** quand rien ne bouge ;
- `stalenessOf` répond `true` sur un artefact produit avant une réécriture de beat ;
- `assertInvariants` **jette** sur `artifact` + un `text` vide, en nommant l'élément et le beat ;
- `assertInvariants` **accepte** un `narrative` à `text` vides **sans** artefact (c'est l'état
  brouillon, exactement comme une offre non rédigée) ;
- `nextActionsForElement` : élément scrolly choisi + constructible + canal résolu, sans
  `narrative` → `["draft-beats"]` ; avec un `text` vide → `["author-beats"]` ; tout écrit →
  `["produce"]` ;
- **la régression à ne pas commettre** : un élément **non-scrolly** (static/interactive/video)
  ignore entièrement le créneau — `nextActions` byte-identique à avant.

**Vert :** schéma, `provenanceHash`, `assertInvariants`, `nextActionsForElement`, les deux
`NextAction`.

---

## Tâche 5 — `draftBeats` / `applyBeats` : les deux appelants

**Fichiers :** `lib/loop/beats.ts` (neuf), `lib/loop/beats.test.ts` (neuf).

**Tests rouges d'abord :**
- `draftBeats` sur un run réel (entrée gelée sur disque) → `VerbResult.ok`, l'élément porte un
  `narrative` à `text` vides et `draftText` remplis ;
- `draftBeats` **ne jette jamais** : entrée gelée illisible → `fail("engine-failed", …)` ;
  type non supporté → `fail("invalid-request", …)` portant le refus de `suggestBeats` ;
- `applyBeats` écrit les textes et rend un manifeste NEUF (l'entrée n'est pas mutée) ;
- `applyBeats` **jette** quand le garde jette (le message du garde traverse intact) ;
- `applyBeats` jette sur un élément inconnu / sans `narrative`, en le nommant.

**Vert :** implémenter les deux.

---

## Tâche 6 — Le produce : le plan atteint le spec, et le blanc est refusé

**Fichiers :** `lib/loop/produce.ts`, `lib/loop/produce.test.ts`.

**Tests rouges d'abord :**
- `assembleNativeSpec` (extrait, exporté) pose `beats` sur le spec quand `el.narrative` est écrit,
  et **ne pose rien** quand il est absent (chemin non-scrolly byte-identique) ;
- les `NarrativeBeat` produits portent `x`/`category` selon l'ancre, `role` et `text` — la forme
  que `narrativeBeatErrors` accepte ;
- `produce()` **refuse** un `scrolly` dont un beat a un `text` vide, en nommant les beats ;
- `produce()` sur un chart-native static est **inchangé** (le test existant reste vert).

**Vert :** extraire `assembleNativeSpec`, y threader les beats, poser le refus.

---

## Tâche 7 — Le driver face aux deux tours

**Fichiers :** `lib/loop/driver.test.ts` seulement.

**Corrigé en cours de route, et c'est un constat, pas un raccourci.** Le plan prévoyait un
`case "draft-beats"` dans `advanceStep`. En l'écrivant, il s'avère **inatteignable** :
`nextActionsForElement` ne peut répondre `draft-beats` que pour un `scrolly`, et un `scrolly`
sort au gate de constructibilité juste au-dessus (§5 du spec). Un bras de `switch` inatteignable
est du code mort — la maladie même que le slice précédent vient de soigner. Le `case` n'est donc
**pas** ajouté ; le câblage est nommé dans le spec et dans le test.

**Test rouge d'abord :** un élément portant un plan à beat non écrit route vers `author-beats`
(**atteignable**), et `advanceStep` n'exécute rien : `ran: null`, manifeste inchangé.

**Vert :** déjà couvert par le routage de la tâche 4 ; le test le prouve de bout en bout à travers
le driver plutôt qu'au niveau de la fonction de routage.

---

## Tâche 8 — La preuve sur un rendu réel

**Fichiers :** `lib/loop/beats-render-proof.test.ts` (neuf, opt-in `SPLASH_PROVE_BEATS=1`).

Séquence, sans mock : run réel → `draftBeats` → `applyBeats` avec des phrases de journaliste →
`assembleNativeSpec` → `render({ engine: "scrolly", format: "scrolly", … })` → vrai `scrolly.html`.

**Mesures :**
1. chaque phrase écrite est présente dans le HTML livré ;
2. **aucun** `draftText` auto-généré n'y est ;
3. le refus du garde : un beat affirmant un nombre absent de la donnée est refusé, nommément.

Hors `bun run check` (build Vite + Playwright réels, ~25 s).

---

## Tâche 9 — Auto-revue + résidus

- `cd lib && bun test` (≥ 1254 + les neufs, 0 fail) ; `cd skills/scrolly && bun test` (80) ;
  `cd lib && bunx tsc --noEmit` et `cd skills/splash && bunx tsc --noEmit` propres — **exit codes
  lus depuis un fichier, jamais derrière un `head`** ;
- pas de `any` neuf, aucune mention vendor, aucun fichier hors frontière touché
  (`git diff --stat` vérifié nommément) ;
- `## Risques assumés` du spec relu et statué.
