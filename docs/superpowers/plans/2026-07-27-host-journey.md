# Plan — Le parcours hôte, du néant jusqu'au livré

Spec : `docs/superpowers/specs/2026-07-27-host-journey-design.md`.
Branche : `feat/host-journey`. Un commit par tâche. TDD strict : le test d'abord, **lancé**,
**vu rouge**, puis l'implémentation.

Baseline mesurée avant d'écrire une ligne :
`cd lib && bun test` → **1067 pass / 10 skip / 0 fail** (111 fichiers, 240 s).
`cd lib && bunx tsc --noEmit` et `cd skills/splash && bunx tsc --noEmit` propres.

Vérification des codes de sortie : **jamais** `cmd | head`. Toujours
`cmd > out.txt 2>&1; echo $?` puis lire `out.txt`.

Ordre imposé par la spec : **T5 (`phrase`) avant T6 (invariant)**. Ne pas intervertir.

---

## T1 — `initRun` : la fonction que personne n'avait

**Fichiers :** `lib/loop/init.ts` (créer), `lib/loop/init.test.ts` (créer).

**Tests d'abord** (`lib/loop/init.test.ts`) :

1. `initRun` crée `<dir>/run.json` lisible par `readManifest`, avec l'entrée gelée sous
   `input/` et le sha qui correspond au fichier source.
2. les défauts : `route: "embed"`, `channel: "article-web"`, `elements: [{id:"el1"}]`,
   `events: []`, `schemaVersion: 4`.
3. `nextActions` du run créé vaut `["orient"]` — un run neuf est à l'état `empty`.
4. un champ inconnu dans la déclaration est **refusé en le nommant** (`invalid-request`), et
   rien n'est écrit.
5. **la liste noire, un test par famille** : `angle`, `proposal`, `artifact`, `delivery`,
   `orient`, `events` dans la déclaration → refus. (Un seul `test.each`-like suffit, mais
   l'assertion doit nommer le champ.)
6. `input` vide (ni `data` ni `article`) → refus.
7. un `run.json` déjà présent → refus qui le dit, et le fichier existant est **byte-identique**
   après.
8. un chemin d'entrée inexistant → refus, et **`input/` n'est pas créé**.
9. un ledger illégal (`{mode:"real", data:{kind:"synthetic",…}}`) → refus, et **`input/` n'est
   pas créé** (c'est l'ordre du §1.2 : le ledger est validé avant le gel).
10. une déclaration avec `sources` valide + `elements[0].requestedFormat` → présents dans le
    manifeste écrit.

**Implémentation :** `RunDeclarationSchema` en `z.strictObject`, `initRun(runDir, raw):
VerbResult<RunManifest>` — jamais de throw, un refus est une valeur (discipline de
`chooseForm`/`requestDelivery`). Ordre exact : parse → run.json existant ? → `assertSourceLedger`
(dans un try/catch, avec les drapeaux tirés de la déclaration) → existence des chemins →
`freezeInput` → `writeManifest`.

**Vert :** `cd lib && bun test loop/init.test.ts`.

---

## T2 — `init` à la façade

**Fichiers :** `lib/host/drive.ts`, `lib/host/cli.ts`, `lib/host/init.test.ts` (créer).

**Tests d'abord** (spawn de la CLI, jamais d'appel en process) :

1. `init --run <dir> < declaration.json` sort 0 et le corps porte `{ok:true, value:{runId,
   nextActions:["orient"]}}`.
2. stdin vide → `usage`, exit 2 (même message-classe que `verb`).
3. stdin non-JSON → `usage`, exit 2.
4. `--run` absent → `usage`, exit 2.
5. un drapeau inconnu → `usage`, exit 2.
6. déclaration refusée par `initRun` → `invalid-request`, exit **1** (c'est la boucle qui
   refuse, pas la ligne de commande — `refusalExit` le décide déjà par le code).
7. après un `init`, `state --run <dir>` répond 0 dans un **process séparé**.

**Implémentation :** `initRunIn(runDir, payload)` dans `drive.ts` (lit, appelle `initRun`,
renvoie `{runId, nextActions}`) ; branche `init` dans `cli.ts` qui parse `--run`, lit stdin comme
`verb`, et émet. Mettre à jour la liste des commandes du message `unknown command`.

---

## T3 — `confirm-angle`

**Fichiers :** `lib/loop/angle.ts` (créer), `lib/loop/angle.test.ts` (créer),
`lib/host/drive.ts`, `lib/host/cli.ts`, `lib/host/angle.test.ts` (créer).

**Tests boucle d'abord** (`lib/loop/angle.test.ts`, sur `confirmAngle(el, parts)`) :

1. écrit `el.angle` avec les quatre parties ; `gateStateOf` passe à `angled`.
2. takeaway blanc / espaces → refus `invalid-request` nommant le takeaway.
3. altInsight blanc → refus **qui cite WCAG 1.1.1** (miroir de `metadata.ts:43`).
4. unit blanc → refus.
5. `emphasis` absent → pas de clé `emphasis` dans l'angle écrit (jamais de
   `emphasis: undefined`).
6. re-confirmer un angle sur un élément **déjà produit** : l'angle bouge, et
   `stalenessOf` bascule à `true`.

**Tests façade ensuite** (`lib/host/angle.test.ts`, spawn) :

7. le parcours nominal sort 0, `run.json` porte l'angle, `nextActions` avance.
8. `--takeaway` absent → `usage`, exit 2.
9. `--alt-insight` valant `"   "` → refus `invalid-request`, exit 1, **et `run.json` inchangé
   byte pour byte**.
10. `--element <id>` inexistant → refus listant les ids présents (le `selectElement` partagé).
11. re-confirmation sur un élément produit → la réponse porte `staled: true`.
12. un élément non produit → **pas** de clé `staled`.

**Implémentation :** `confirmAngle` renvoie un `VerbResult<RunElement>` ; `confirmAngleIn` passe
par le `decide()` existant de `drive.ts` (donc `selectElement` partagé), et calcule `staled` en
comparant `stalenessOf` avant/après. `parseFlags` avec
`["--run","--takeaway","--alt-insight","--unit","--emphasis","--element"]`.

---

## T4 — L'offre dans `state`

**Fichiers :** `lib/loop/resume.ts`, `lib/loop/resume.test.ts`, `lib/host/state.test.ts`.

**Tests d'abord :**

1. un élément sans `proposal` n'a **pas** la clé `proposal` dans le rapport.
2. un élément avec proposal : le rapport porte options (avec `whySource` et `why`), `excluded`,
   `chosenId`, `refusal` — comparés à ce que `run.json` porte, pas retapés.
3. par la CLI : après `advance`(propose), `state --run <dir>` expose les ids offerts et les
   `whySource` — c'est ce qui rend `phrase` pilotable (T5).

**Implémentation :** champ `proposal?` sur `ResumeReport["elements"][number]`, projection pure
de `el.proposal`.

---

## T5 — `phrase` : l'appelant de production d'`applyPhrasing`

**Fichiers :** `lib/loop/manifest.ts` (NextAction), `lib/host/drive.ts`, `lib/host/cli.ts`,
`lib/loop/manifest.test.ts`, `lib/loop/driver.test.ts`, `lib/host/phrase.test.ts` (créer).

**Tests d'abord :**

1. `nextActionsForElement` répond `["phrase"]` sur une offre non rédigée et non choisie.
2. …et `["choose-form"]` dès que **toutes** les options portent un `why`.
3. …et reste `["choose-form"]` (routage inchangé) quand un `chosenId` est déjà posé sur une
   offre non rédigée — la position sous `!chosenId` du §4.3, vérifiée mécaniquement.
4. `advanceStep` sur une action `phrase` répond `ran: null` (tour humain) — sans toucher
   `driver.ts`.
5. façade : `phrase --run <dir> < phrased.json` sort 0 et les `why` sont sur le manifeste.
6. façade : une liste dans le mauvais **ordre** → `invalid-request` exit 1, message du garde,
   **`run.json` inchangé**.
7. façade : un `why` vide → refus (`no why`).
8. façade : un nombre non groundé → refus du garde.
9. façade : une option marquée sans `markAcknowledged` → refus du garde.
10. `advance` sur un run à `phrase` refuse en **nommant la commande** (`nothingToRun`).

**Implémentation :** `"phrase"` ajouté à `NextAction` ; la ligne du §4.3 dans
`nextActionsForElement` ; `phraseOfferIn` dans `drive.ts` (try/catch autour d'`applyPhrasing`,
qui jette par conception → `invalid-request`) ; branche `phrase` dans `cli.ts` ; la phrase de
`nothingToRun`.

**Attendu :** `lib/loop/driver.test.ts:105` bascule de `["choose-form"]` à `["phrase"]`. Le
corriger en **rédigeant l'offre** puis en ré-assertant `choose-form` — le test emprunte alors le
vrai chemin. Mesurer ce qui bascule réellement, ne pas présumer la liste.

---

## T6 — L'invariant `why`, verrouillé (APRÈS T5, jamais avant)

**Fichiers :** `lib/loop/manifest.ts`, `lib/loop/gate-state.test.ts`.

**Tests d'abord :**

1. `assertInvariants` jette quand `chosenId` nomme une option dont le `why` est blanc — message
   nommant l'élément et l'option.
2. …et ne jette pas quand elle porte une phrase.
3. …et ne jette pas quand **aucune** option n'est choisie (une offre fraîche est légitimement
   non rédigée).
4. `writeManifest` propage le refus (rien n'est écrit).

**Implémentation :** remplacer le commentaire parké de `manifest.ts:541-550` par le contrôle,
avec la note de ce qui a levé le blocage (T5 : la façade sait rédiger).

**Puis mesurer le rayon de souffle** : `cd lib && bun test > out.txt 2>&1; echo $?`. Pour chaque
test qui tombe, la correction est **de rédiger avant de choisir** — jamais d'affaiblir
l'assertion. Si un fichier hors périmètre (`lib/brain/**`) tombe : STOP, revenir au §5 de la
spec et reporter.

---

## T7 — Le marqueur `sourcePolicy` sur un `render` nu

**Fichiers :** `lib/host/source-mark.ts` (créer), `lib/host/cli.ts`,
`lib/host/capabilities.ts`, `lib/core/verbs/render.ts` (commentaire seul),
`lib/host/capabilities.test.ts`, `lib/host/cli.test.ts`.

**Tests d'abord :**

1. `verb render` réussi → le corps porte `value.sourcePolicy.checked === false` et un `why`
   non vide.
2. `verb render` **refusé** → **pas** de `sourcePolicy` (rien n'a été rendu).
3. un autre verbe (`verb publish`, refusé) → pas de `sourcePolicy`.
4. `verbs` **déclare** le marqueur sur l'entrée `render`, avec exactement la même constante.
5. `lib/host/wiring.test.ts` reste vert **inchangé** (c'est un des neuf porteurs) — vérifié, pas
   édité.

**Implémentation :** constante unique dans `source-mark.ts`, lue par `capabilities()` et
`cli.ts` ; commentaire de décision dans `render.ts` à l'emplacement où la garde irait.

---

## T8 — La preuve : du néant au livré, par la CLI seule

**Fichier :** `lib/host/journey.test.ts`.

Réécrire le second `describe` pour qu'il **commence par `init`**. Interdits dans ce test :
`writeManifest`, `freezeInput`, tout import de `lib/loop`. Autorisé : écrire le CSV source et
lire `run.json` **en lecture** pour en extraire les ids offerts et le `whySource`.

Séquence :

```
init → advance(orient) → confirm-angle → advance(propose)
     → state (lit l'offre + le whySource) → phrase → choose-form
     → advance(produce) → request-delivery → advance(deliver) → state
```

Assertions porteuses : `gateState` final `delivered` ; le paquet zip existe et n'est pas vide ;
l'artefact rendu existe ; **et** une assertion qui prouve que chaque commande neuve est
nécessaire — l'offre lue depuis `state` porte les `whySource`, et le `why` persisté après
`phrase` est celui que le test a écrit.

Le premier `describe` (`verb render` nu) gagne l'assertion du marqueur (T7) s'il n'est pas déjà
couvert par `cli.test.ts`.

---

## T9 — Documenter, et réparer la contradiction de `SKILL.md`

**Fichiers :** `lib/host/README.md`, `skills/splash/SKILL.md`.

- `README.md` : passer de « huit commandes » à **onze**, une section par commande neuve
  (`init`, `confirm-angle`, `phrase`) avec des blocs JSON **collés d'un vrai run de la CLI**,
  jamais inventés (c'est la promesse de l'en-tête du fichier). Corriger le paragraphe
  `confirm-angle` (« the one human turn with **no** command behind it ») et la règle
  « Four commands write » → sept. Mettre à jour le bloc `verbs` avec le marqueur (T7).
- `SKILL.md` : la table « THE DECISIONS ARE MECHANICAL » gagne les lignes `confirm-angle` et
  `phrase` ; ajouter la mention de `init` — la règle « never hand-edit `run.json` » a enfin un
  chemin de création. La règle 2 du contrat de phrasage nomme la commande hôte.

---

## T10 — Passe finale

1. `cd lib && bun test > /tmp/…/final-lib.txt 2>&1; echo $?`
2. `cd skills/splash && bun test > … 2>&1; echo $?`
3. `cd lib && bunx tsc --noEmit > … 2>&1; echo $?`
4. `cd skills/splash && bunx tsc --noEmit > … 2>&1; echo $?`
5. Auto-revue ; compléter `## Risques assumés` de la spec avec ce que l'implémentation a appris.
