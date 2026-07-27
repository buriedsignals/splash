# Plan — La surface de décision

> Spec : `docs/superpowers/specs/2026-07-26-decision-surface-design.md`.
> Branche : `feat/decision-surface`. Runtime Bun, tests `bun:test`, **TDD strict** : le test rouge
> d'abord, lancé, vu échouer, puis l'implémentation. Un commit par tâche.
> Baseline à préserver : `cd lib && bun test` → **660 pass / 3 skip / 0 fail**.
> Frontières dures : je possède `lib/host/**`, `lib/loop/choose.ts`, `lib/loop/request-delivery.ts`,
> `lib/loop/driver.ts`, `skills/splash/SKILL.md`. `lib/loop/manifest.ts` est partagé — **ajouts en fin
> de région seulement**, aucun déplacement. Rien d'autre n'est touché.

---

## Tâche 1 — `chooseForm` : écrire le choix du journaliste

**Fichiers :** `lib/loop/choose.ts` (neuf), `lib/loop/choose.test.ts` (neuf).

**Rouge d'abord** — `choose.test.ts` :
- écrit `proposal.chosenId` et ne mute pas l'élément d'entrée ;
- id inconnu → `invalid-request`, message nommant les ids offerts ;
- pas de `proposal` → `invalid-request` ;
- `options: []` → `invalid-request` portant `proposal.refusal` quand elle existe ;
- option inbuildable (`engine: "map-native"`) → `invalid-request` portant sa `readiness.reason` ;
- option inbuildable **sans** `readiness` → message `unbuildableEngineReason(builder)` ;
- option **marquée mais buildable** (chart-native + `readiness: {status:"disabled"}`) → **acceptée** ;
- `delivery.delivered` déjà présent : préservé ;
- changer de choix sur un élément produit ⇒ `stalenessOf` bascule `true`.

**Vert :** `chooseForm(el, optionId)` → `VerbResult<RunElement>`, résolution d'inbuildabilité par
`resolveBuilder` + `isLoopBuildable` (`lib/loop/buildable.ts`), jamais une quatrième copie.

**Vérif :** `cd lib && bun test loop/choose.test.ts` vert, puis suite complète.
**Commit :** `feat(loop): choosing a form is a decision the code writes, not prose`

---

## Tâche 2 — `advanceStep` : un pas de boucle qui dit ce qu'il a fait

**Fichiers :** `lib/loop/driver.ts`, `lib/loop/driver.test.ts` (ajouts en fin de fichier).

**Rouge d'abord :**
- `advanceStep` renvoie `ran: "orient" | "propose" | "produce"` sur les états correspondants ;
- tour humain (`choose-form`) → `ran: null`, `run` inchangé ;
- off-ramp (`nextActions` vide) → `ran: null` ;
- `produce` refusé → `failure.action === "produce"`, `failure.message` **identique** au message de
  l'événement borné appendé ;
- `advance()` renvoie exactement `(await advanceStep(...)).run` (non-régression du wrapper).

**Vert :** extraire le corps de `advance` dans `advanceStep`, `advance` devient l'enveloppe.
Signature d'`advance` **inchangée** (`lib/brain/acceptance.test.ts` en dépend et n'est pas à moi).

**Commit :** `feat(loop): advanceStep reports the step it ran and the refusal it met`

---

## Tâche 3 — Le pilote hôte : trois opérations, jamais un throw

**Fichiers :** `lib/host/drive.ts` (neuf), `lib/host/drive.test.ts` (neuf), `lib/host/state.ts`
(exporter `loadRun`), `lib/host/errors.ts` (+ `step-refused`), `lib/host/capabilities.test.ts` si la
liste de codes y est pinnée.

**Rouge d'abord :**
- `advanceRun` sur un run frais : fait `orient`, persiste, `value.ran === "orient"` ;
- `advanceRun` sur un tour humain : `ok:false`, `step-refused`, message **nommant la commande** ;
- `chooseFormIn` : succès persiste `chosenId` ; refus **n'écrit pas** (octets de `run.json` égaux) ;
- `requestDeliveryIn` sans `--to` : écrit la destination dérivée du genre ; avec : la respecte ;
- les trois : `no-run`, `invalid-run`, `stale-schema` (schemaVersion 3 sur disque).

**Vert :** `lib/host/drive.ts` renvoyant des `HostResponse`, décor par `tryLoadDecor()`, écriture par
`writeManifest` sous `try/catch` → `invalid-run`.

**Commit :** `feat(host): a run can be advanced and decided on without editing its manifest`

---

## Tâche 4 — Câbler la façade + fermer le contournement `verb publish`

**Fichiers :** `lib/host/cli.ts`, `lib/host/cli.test.ts`, `lib/host/capabilities.ts`,
`lib/host/capabilities.test.ts`.

**Rouge d'abord** (par spawn, comme le fichier le fait déjà) :
- `advance --run <dir>` / `choose-form --run <dir> --option <id>` / `request-delivery --run <dir>
  [--to a,b]` : codes de sortie 0/1/2, enveloppe unique, stderr vide ;
- flags inconnus, `--option` absent, `--to` vide → `usage` exit 2 ;
- `verb publish` → exit 2, `usage`, message nommant `advance` ;
- le message de commande inconnue liste les commandes neuves (assertion pinnée à mettre à jour) ;
- les invocations neuves entrent dans le lot « hostile » (une seule ligne JSON, code documenté) ;
- `capabilities()` : `publish` porte `hostCommand: "advance"`, `errorCodes.host` contient
  `step-refused`.

**Vert :** trois branches dans `main()`, refus de `publish` **avant** la lecture de stdin, champ
`hostCommand` dans la déclaration.

**Commit :** `feat(host): drive the loop from the façade, and stop publish from skirting it`

---

## Tâche 5 — La preuve : la boucle menée de bout en bout par la façade seule

**Fichier :** `lib/host/journey.test.ts` (ajout d'un cas).

**Rouge d'abord :** un run avec un artefact produit (hors-ligne, artefact réel écrit par
`verb render`) → `request-delivery` (aucun `--to`, donc genre fichier → zip) → `next` répond
`["deliver"]` → `advance` publie → `state` dit `gateState: "delivered"`. **Zéro import du projet
autre que la construction du run ; aucune écriture manuelle dans `run.json` après sa création.**

**Commit :** `test(host): a non-JS host carries a run to delivery through the façade alone`

---

## Tâche 6 — La doc suit le mécanisme

**Fichiers :** `lib/host/README.md`, `skills/splash/SKILL.md`.

- README : les trois commandes neuves avec de vraies sorties collées d'un run réel ; l'invariant
  « seul `verb` écrit » **corrigé** (state/next restent lecture seule, les commandes de décision
  écrivent le run nommé) ; le tableau des codes de sortie élargi ; la section `verb` dit pourquoi
  `publish` n'y passe pas.
- `SKILL.md` : au point de décision, nommer le mécanisme (`chooseForm` / `choose-form`,
  `requestDelivery` / `request-delivery`, `advance`) et interdire l'édition à la main du manifeste.

**Commit :** `docs: the decision points name their mechanism, not a manifest edit`

---

## Tâche 7 — Auto-review et résidus

Relire le diff entier en chassant ce qui passe les tests tout en étant faux. Remplir
`## Risques assumés` dans la spec : findings réels, chacun avec son arbitrage. Re-lancer
`cd lib && bun test` (≥ 660 pass, 0 fail) et `cd skills/splash && bunx tsc --noEmit`.

**Commit :** `docs(spec): record the residuals this slice deliberately leaves`
