# Plan — L'intention déclarée (TDD)

> Spec : `docs/superpowers/specs/2026-07-27-intent-declared-design.md`
> Branche : `feat/intent-declared` · worktree `/Users/rmdms/Sites/Professional/splash-intent`
> Discipline : **test rouge d'abord, lancé, vu échouer**, puis implémentation, puis commit.
> Gate par tâche : `cd lib && bun test` (baseline **1197 pass / 10 skip / 0 fail**) +
> `cd lib && bunx tsc --noEmit` (sortie redirigée dans un fichier, `echo $?` lu séparément).

---

## T1 — `angle.intent` existe dans le manifeste *(ajout seul)*

**Rouge :** `lib/loop/manifest.test.ts` ne peut pas être touché (hors frontière). Le test vit donc
dans `lib/loop/angle.test.ts` : un `RunElement` parsé avec `angle.intent: "ranking"` le conserve ;
`angle.intent: "pie-chart"` est refusé ; un angle **sans** `intent` parse toujours.

**Vert :** `lib/loop/manifest.ts` — une ligne ajoutée dans l'objet `angle` de `RunElementSchema` :
`intent: z.enum(INTENTS).optional()`, plus l'import de `INTENTS`. Rien d'autre n'est déplacé,
reformaté ni réordonné.

---

## T2 — La passe par mots-clés est rétrogradée en SUGGESTION

**Rouge :** `lib/brain/rank-intent.test.ts` — le nom `suggestIntents` n'existe pas ; et les sept
formulations mesurées du spec §1 sont écrites comme *faiblesse documentée* (`[]` sur « la plus
lourde », `["spatial"]` sur une affirmation d'étendue) plutôt que comme contrat.

**Vert :** renommage `intentsFromAngle` → `suggestIntents` ; en-tête réécrit — elle ne décide plus
rien, elle propose. Seul appelant en production : `lib/loop/propose.ts` (mis à jour en T4, le
typecheck le tient rouge d'ici là ; si nécessaire T2 met à jour l'appel sans changer la sémantique).

---

## T3 — `confirm-angle` collecte l'intention, et la refuse absente ou inconnue

**Rouge :** `lib/loop/angle.test.ts` — `confirmAngle` avec `intent: ""` refusé ; avec
`intent: "correlations"` refusé en **listant les neuf valeurs** ; avec `intent: "ranking"` accepté et
écrit sur l'angle ; `inheritAngle` transporte l'intention chez le livrable frère (même angle
éditorial ⇒ même intention).

**Vert :** `lib/loop/angle.ts` — `AngleParts.intent: Intent` (typé `string` en entrée pour pouvoir
refuser proprement une valeur hors vocabulaire venue d'un flag), les deux refus, l'écriture.

---

## T4 — `propose` lit l'intention déclarée

**Rouge :** `lib/loop/propose.test.ts` — sur les mêmes faits, deux intentions déclarées donnent
**deux ordres différents** ; un angle déclaré `distribution` sur un takeaway contenant « canton » ne
se voit **pas** rajouter `spatial` ; un angle hérité (sans `intent`) retombe sur `suggestIntents`.

**Vert :** `lib/loop/propose.ts` — `declared ? [declared] : suggestIntents(takeaway)`.

---

## T5 — La table éditoriale, et la garde qui interdit le vocabulaire de graphique

**Rouge :** `lib/host/intent-copy.test.ts` — `intentCopy("fr")` couvre les neuf ids ; `intentCopy("de")`
retombe sur `en` ; **aucun** label ni exemple ne contient un mot de la liste noire graphique ni
l'id brut ; chaque langue a une `question` non vide.

**Vert :** `lib/host/intent-copy.ts` — `EN` + `FR`, `TABLE` clé-langue, repli `en`, exactement la
forme de `lib/newsroom/ui-copy.ts`.

---

## T6 — La surface host : `--intent`, et `suggest-intent`

**Rouge :** `lib/host/angle.test.ts` — `confirm-angle` sans `--intent` est un refus d'usage qui
**nomme `suggest-intent`** ; avec une valeur inconnue, un refus qui liste le vocabulaire ; avec une
valeur bonne, l'angle porte l'intention. `lib/host/cli.test.ts` — `suggest-intent --takeaway <s>`
rend `question` + neuf `choices` + `suggested`, et `--language fr` rend du français.

**Vert :** `lib/host/cli.ts` (flag `--intent`, commande `suggest-intent`, usage mis à jour),
`lib/host/drive.ts` (passe-plat `AngleParts`), `lib/host/suggest-intent.ts` (la composition
copie × passe).

---

## T7 — `state` rend la question et le *basis* lisibles

**Rouge :** `lib/host/state.test.ts` — un run qui doit encore `confirm-angle` porte `intentChoices`
(question + neuf choix, dans la langue du décor) ; une fois l'angle confirmé, `intentChoices`
disparaît et l'élément porte `intent.basis: "declared"` ; un angle hérité sans intention porte
`basis: "guessed"` ou `"none"` selon ce que la passe lit.

**Vert :** `lib/host/state.ts` — `describeState` post-traite le rapport de `resumeReport`.

---

## T8 — La preuve sur un vrai run, et la doc de la façade

**Rouge :** `lib/host/journey.test.ts` — le parcours complet passe désormais par `--intent`, et
l'offre livrée est ordonnée autour de lui.

**Vert :** mise à jour de `lib/host/README.md`. Puis **mesure avant/après hors test**, par la CLI
réelle, sur les deux cas du spec §1 (le no-op « la plus lourde » et le contre-sens « varie… canton »),
consignée dans le rapport final et dans `## Risques assumés` du spec.
