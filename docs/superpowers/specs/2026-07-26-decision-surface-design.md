# Spec — La surface de décision (écrire le choix du journaliste, piloter la boucle depuis un hôte)

> **Statut :** design, prêt pour → writing-plans.
> **Branche :** `feat/decision-surface` (worktree `splash-decision-surface`).
> **Amont :** `2026-07-24-shell-and-desk-journey-design.md` (§2 P1 « tu joues un instrument », §5 la
> boucle) · `2026-07-26-delivery-genre-routing-design.md` §7 (« Exposer un pas de boucle à la façade
> hôte » — résidu explicitement déféré, que cette tranche ferme).
> **Langue :** prose FR, identifiants/fichiers/messages/commits en anglais.

---

## 1. Problème — les décisions n'ont pas de mécanisme

La boucle éditoriale V2 est complète et testée : `orient → propose → produce → revise → deliver`, un
manifeste durable, un contrat de verbes fermé, une façade hôte JSON (`lib/host/cli.ts`). Vérifié dans
le code, pas supposé :

| Fait | Preuve |
|---|---|
| `proposal.chosenId` n'a **aucun écrivain de production** | aucune fonction `choose*` n'existe ; seuls les tests posent le champ |
| `delivery.requested` n'a **aucun écrivain de production** | `lib/loop/request-delivery.ts` est écrit et testé, `grep requestDelivery` ne trouve que ses propres tests et `delivery-genre-e2e.test.ts` |
| `advance()` n'a **aucun appelant de production** | `grep "advance("` : `driver.ts` (la définition) + trois fichiers de test |
| la façade ne fait **aucun pas de boucle** | `cli.ts` expose `verbs \| state \| next \| verb \| newsroom` — lire l'état, ou lancer un verbe brut |
| `verb publish` **court-circuite** `deliver()` | `cli.ts:176` appelle `runVerb(name, payload)` : ni sign-off, ni fraîcheur de provenance, ni metadata dérivée du profil, ni readiness, ni légalité `serves` |

Conséquence : `next` peut répondre `["deliver"]` et **rien ne peut l'exécuter**. Le seul porteur d'une
décision aujourd'hui, c'est la **prose** de `skills/splash/SKILL.md` qui demande à un modèle
d'éditer le manifeste à la main. C'est exactement la maladie que la V2 soigne — *le flow est de la
prose, pas un mécanisme* — survivant **aux points de décision**, c'est-à-dire précisément là où se
joue la propriété éditoriale (P1 : l'outil offre, le journaliste décide).

Le paradoxe à nommer : plus la boucle est rigoureuse (marques d'inbuildabilité, hash de provenance,
gate de sign-off, routage par genre), plus le contournement par édition manuelle du JSON est
**dangereux** — il produit un manifeste que rien n'a validé, dans un système dont toutes les gardes
supposent que l'état a été écrit par du code.

---

## 2. Décisions de design (et pourquoi)

### D1 — Un module de décision par champ décisionnel, jamais un « setState » générique

`lib/loop/choose.ts` expose **`chooseForm`**, pendant exact de `requestDelivery` : même signature de
retour (`VerbResult<RunElement>`), mêmes refus-avant-écriture, aucune exception. Un `patchManifest`
générique aurait rouvert la porte de l'édition arbitraire côté code, ce que cette tranche ferme côté
prose. Deux champs sont décisionnels — `proposal.chosenId` et `delivery.requested` — donc deux
fonctions, chacune portant **ses** refus.

### D2 — `chooseForm` refuse exactement le cul-de-sac mécanique, pas toute option marquée

Une option de l'offre peut porter une `readiness` venant de **trois** sources (`lib/brain/eligibility.ts`) :
une capacité que la rédaction n'a pas allumée · la branche article-entier · un moteur que `produce`
ne sait pas assembler. Toutes **marquent**, aucune ne retire (spec brain §8).

`chooseForm` refuse **une seule** de ces situations : celle que la boucle ne peut **jamais**
satisfaire, c'est-à-dire `!isLoopBuildable(resolveBuilder(option))` — le même chemin de résolution
que `produce.ts`, `nextActionsForElement` et `buildabilityMark` (pas de quatrième résolution : c'est
la classe de dérive contre laquelle `lib/loop/buildable.ts` a été écrit).

Pourquoi pas « refuser toute option marquée » : ce serait **écraser P1**. Une marque « capacité pas
allumée » sur une option que `produce` sait construire décrit un choix de rédaction, pas une
impossibilité ; l'offre l'a montrée marquée, le journaliste l'a lue, il décide. Refuser là
transformerait un avertissement en interdiction.

Pourquoi refuser l'inbuildable plutôt que le laisser passer : `nextActionsForElement` **renvoie déjà
à `choose-form`** pour ce cas — écrire le choix produirait un manifeste qui boucle sur sa propre
impasse. Le refus dit la même chose une étape plus tôt, avec la phrase que l'offre affichait déjà :
on **remonte `option.readiness.reason`** (donc la formulation branche-article quand c'est elle qui
masque la marque moteur), et à défaut `unbuildableEngineReason(builder)`.

### D3 — `advance` est le seul pas de boucle exposé, et il en fait **un**

La façade gagne `advance --run <dir>` : lire le manifeste, demander à `nextActions()` ce qui est
valide, exécuter **le** pas déterministe correspondant (`orient` · `propose` · `produce` · `deliver`),
persister. Un pas par appel — la forme que `deliver()` a déjà choisie et documentée (« un
enregistrement par appel »), et la seule qui laisse l'hôte relire l'état entre deux pas, ce qui est
le point d'une boucle revisitable.

Les tours **humains** (`confirm-angle`, `choose-form`, `show`) ne sont pas exécutables : `advance`
refuse en **nommant la commande** qui les porte. Un hôte qui lit `next` puis appelle `advance` reçoit
donc soit un pas fait, soit l'instruction exacte de ce qu'il doit demander au journaliste.

### D4 — `advanceStep`, parce qu'un refus de pas ne doit pas ressembler à un succès

`advance()` enregistre les refus comme **événements bornés** et renvoie un manifeste : vu de
l'extérieur, un `produce` refusé est indiscernable d'un `produce` réussi. Pour un hôte non-JS qui
boucle sur `advance`, c'est une boucle infinie silencieuse.

`driver.ts` gagne donc **`advanceStep`**, qui renvoie `{ run, ran, failure? }`, et `advance()` devient
son enveloppe (`(await advanceStep(...)).run`). **Additif, jamais une signature changée** :
`lib/brain/acceptance.test.ts` et `lib/loop/*.test.ts` appellent `advance()` et ne sont pas à moi.
L'événement borné est écrit **exactement comme avant** — le manifeste persisté par la façade porte
donc la trace du refus, et l'hôte le lit aussi dans sa réponse.

### D5 — `request-delivery` est une **décision**, pas un pas ; elle ne publie rien

`requestDelivery` écrit `delivery.requested` et s'arrête là. C'est ce qui fait basculer
`nextActions` de `["show"]` vers `["deliver"]`, et c'est `advance` qui publie ensuite. Deux appels,
parce que ce sont deux actes : *décider où ça va* et *l'y envoyer*. Le manifeste garde la trace du
premier même si le second échoue — un défaut de credentials n'efface pas la décision.

Le nom des commandes est **repris du vocabulaire existant** (`NextAction "choose-form"`,
`requestDelivery`) : aucune synonymie inventée entre ce qu'un hôte tape et ce que le code appelle.

### D6 — La façade **refuse `verb publish`** ; le gate n'est pas porté dans le verbe

Les deux options étaient : router l'hôte par le pas de boucle, **ou** porter le gate dans le verbe.
C'est la première, pour une raison structurelle et non par préférence :

Tout ce que `verb publish` saute est un **fait sur le run**, pas sur la charge utile : le sign-off
(`el.approved` vs `provenanceHash(run, el)`), la fraîcheur (`stalenessOf`), la metadata dérivée du
profil de la rédaction, la readiness de la capacité, la légalité `serves` par genre. Le contrat de
verbes est **neutre par invariant** — il ne lit aucun état ambiant (I5), et `cli.ts` refuse déjà
explicitement de donner un `--run` à `verb` (« coupler le contrat neutre à la boucle éditoriale »).
Porter les gates dans le verbe reviendrait à lui passer le manifeste, le décor et le run dir : ce
n'est pas « ajouter une garde », c'est supprimer l'invariant qui fait du contrat une couture.

Donc : `verb publish` répond `usage` (exit 2) en nommant `request-delivery` + `advance`. Le verbe
`publish` **n'est pas touché** — `deliver()` continue de l'appeler in-process, et c'est le seul
chemin qui reste. La déclaration `verbs` porte la vérité : `publish` gagne un champ
`hostCommand: "advance"`, ce qui rend le détour **découvrable sans lire notre source** (la promesse
de `verbs`). `implemented: true` reste vrai — le verbe a un corps ; ce qui change est le chemin.

### D7 — Une seule règle de chargement de run, et elle refuse un schéma périmé

Les commandes neuves écrivent, donc l'argument « lire ne migre pas » ne les couvre pas. Elles
refusent quand même `stale-schema`, en réutilisant le `loadRun` de `state.ts` (exporté, pas
dupliqué) : un hôte a demandé *un pas de boucle*, pas *une migration*, et une migration écrit un
fichier d'input gelé dans le run. Une commande `migrate` explicite serait la bonne réponse — hors
scope ici (§5).

### D8 — Élément vivant uniquement (`elements[0]`)

`nextActions()` pilote `elements[0]`, le driver aussi. Les commandes de décision suivent la même
règle plutôt que d'inventer un `--element` que `next` ne saurait pas refléter. L'agrégation
multi-éléments est un chantier de la boucle, pas de la façade (§5).

---

## 3. La surface

### 3.1 `lib/loop/choose.ts`

```ts
export function chooseForm(el: RunElement, optionId: string): VerbResult<RunElement>
```

Refus (tous avant toute écriture, aucun throw) :

| Situation | Code | Message |
|---|---|---|
| pas de `proposal` | `invalid-request` | rien n'a encore été proposé |
| `options` vide | `invalid-request` | l'offre est vide — porte la `proposal.refusal` du cerveau quand elle existe |
| id inconnu | `invalid-request` | nomme les ids réellement offerts |
| option inbuildable | `invalid-request` | remonte `readiness.reason`, sinon `unbuildableEngineReason(builder)` |

Succès : `{ ...el, proposal: { ...proposal, chosenId } }`. Rien d'autre n'est touché — changer de
choix change `provenanceHash`, donc l'artefact devient `stale` et `nextActions` renvoie à `produce`
tout seul. Les `delivered` restent (même discipline que `requestDelivery` : nommer une destination
n'efface pas ce qui a été publié).

Pas de `run` en paramètre : la fonction ne lit que l'élément, et un argument non lu ment sur la
dépendance.

### 3.2 `lib/loop/driver.ts` — `advanceStep`

```ts
export type StepOutcome = {
  run: RunManifest;
  ran: NextAction | null;          // null ⇒ tour humain, rien de déterministe à faire
  failure?: { action: NextAction; message: string };
};
export async function advanceStep(run, runDir, decor?): Promise<StepOutcome>;
export async function advance(run, runDir, decor?): Promise<RunManifest>; // inchangé
```

`failure` porte **le même message** que l'événement borné appendé (tronqué à 200, identique) : une
seule vérité, pas deux formulations.

### 3.3 `lib/host/drive.ts` — trois commandes

Toutes : chargent le run par `loadRun` (mêmes refus `no-run` / `invalid-run` / `stale-schema`),
persistent par `writeManifest` (donc `assertInvariants` s'applique), n'écrivent **que** dans le run
nommé, ne lancent jamais d'exception.

| Commande | Écrit | `value` en succès |
|---|---|---|
| `advance --run <dir>` | un pas déterministe + `run.json` | `{ ran, nextActions }` |
| `choose-form --run <dir> --option <id>` | `proposal.chosenId` | `{ chosen, nextActions }` |
| `request-delivery --run <dir> [--to <id,id>]` | `delivery.requested` | `{ requested, nextActions }` |

`--to` est une liste séparée par des virgules ; absente, la destination est **dérivée du genre du
format** (`defaultDestinationsFor`, inchangé). Une entrée vide dans la liste est un refus `usage`, pas
un id silencieusement ignoré.

Codes de sortie, contrat existant respecté à la lettre :

- `0` succès · `1` refus (un pas ou une décision déclinée) · `2` usage / run illisible.
- Les décisions renvoient le `VerbResult` **tel quel** : `{ok:false, code:"invalid-request", message}`.
  Un code de la famille `verb`, dans une réponse de commande — assumé et documenté : c'est un
  résultat de verbe, pas une erreur de façade.
- `advance` refuse avec **un** code hôte neuf, `step-refused`, ajouté à `HOST_ERROR_CODES` (donc
  automatiquement publié par `verbs`, jamais retapé ailleurs). Il couvre les deux refus d'`advance` :
  « le prochain acte est humain, voici la commande » et « le pas a été tenté et refusé ».

### 3.4 `verbs` — la déclaration dit le détour

`{ name: "publish", implemented: true, hostCommand: "advance" }` : présent seulement quand
`verb <name>` est refusé par la façade, et nomme la commande qui le fait passer par la boucle.

---

## 4. Tests (TDD, `bun:test`)

Unitaires / assemblage :

1. `chooseForm` : succès écrit `chosenId` ; id inconnu refusé en **nommant les ids offerts** ; offre
   vide refusée en portant la `refusal` du cerveau ; option inbuildable refusée en portant
   `readiness.reason` ; option **marquée mais buildable** (capacité éteinte) **acceptée** — le test
   qui verrouille D2 ; `delivered` préservés ; l'élément d'entrée n'est pas muté.
2. `chooseForm` + `provenanceHash` : changer de choix rend l'artefact `stale` (le back-edge existant
   fonctionne sans code neuf).
3. `advanceStep` : `ran` nomme le pas réel sur chaque état ; `ran: null` sur un tour humain ;
   `failure` non vide sur un `produce` refusé, **et** l'événement borné est écrit ; `advance()` reste
   byte-pour-byte le même manifeste qu'avant (test de non-régression du wrapper).
4. `lib/host/drive.ts` : chaque commande sur un run réel ; run absent → `no-run` ; `schemaVersion`
   périmé → `stale-schema` ; un refus **n'écrit pas** `run.json` (comparaison d'octets avant/après).
5. Façade (par spawn, comme `cli.test.ts` le fait déjà) : les trois commandes, leurs codes de sortie,
   l'enveloppe unique, l'invariant « une seule ligne JSON sur stdout, stderr vide » étendu aux
   invocations hostiles neuves.
6. `verb publish` refusé exit 2 avec un message nommant `advance` — et l'adapter jamais entré.
7. Parcours complet, hors-ligne, par la **façade seule** (spawn) : un run produit → `request-delivery`
   → `next` répond `["deliver"]` → `advance` publie en zip → `state` dit `delivered`. C'est le test
   qui prouve la thèse de la tranche : **un hôte non-JS mène la boucle jusqu'à la livraison sans
   jamais éditer le manifeste**.

---

## 5. Hors scope (assumé, avec la raison)

- **Une commande `migrate`.** Les runs de schéma périmé restent refusés partout (D7). L'ajouter
  demande de décider ce qu'on écrit dans le run d'autrui ; ce n'est pas la question de cette tranche.
- **Enregistrer un sign-off éditorial.** `deliver()` exige `el.approved` quand le profil déclare des
  `requiredSigners` ; aucune commande de façade ne pose ce champ. `advance` refusera donc avec le
  message de `deliver()`, ce qui est honnête, mais un hôte non-JS ne peut pas franchir ce gate. Le
  sign-off humain est un sous-projet à part (S4d).
- **`confirm-angle` et `revise`.** Ce sont des décisions éditoriales à contenu libre (takeaway,
  altInsight, emphase), pas un choix dans une liste fermée. Elles méritent leur propre tranche avec
  leurs propres refus (`altInsight` non vide, WCAG 1.1.1) ; les mettre ici en vitesse aurait produit
  une commande « écris n'importe quoi dans le manifeste », l'inverse du but.
- **`--element`**, l'agrégation multi-éléments (D8), et un `--dir` de décor sur les commandes neuves
  (le décor se résout par `tryLoadDecor()`, exactement comme le driver).
- **Un wrapper MCP.** `verbs` reste la déclaration dont il aurait besoin ; rien de neuf ici.

---

## 6. Risques assumés

Findings réels de l'auto-review (relecture du diff + exécution de la séquence complète), chacun
avec son arbitrage.

### R1 — Un re-produce EFFACE le package déjà livré *(vérifié empiriquement, non corrigé)*

`render` passe par `freshOutDir` (`lib/core/verbs/exec.ts:98`) qui fait `rmSync(recursive)` sur
`outDir` ; `deliver()` écrit son package dans **le même** `elements/<id>/`. Donc : livrer en zip,
réviser l'angle, `advance` (re-produce) → **`elements/el1/el1.zip` a disparu du disque** alors que
`delivery.delivered[0].artifact` le référence toujours avec son hash. Probé, pas déduit : `true`
avant, `false` après.

Arbitrage : **rapporté, pas corrigé.** La machine à états s'en remet (la provenance a bougé, donc
`needsDelivery` redevient vrai et `nextActions` répond `["deliver"]` — une re-livraison réécrit le
fichier), et le hazard est **antérieur** à cette tranche : il vit dans `lib/core/verbs/exec.ts` et
dans le choix d'`outDir` de `lib/loop/deliver.ts`, deux fichiers hors de mes frontières. Ce que la
tranche change, c'est qu'il est désormais **atteignable en trois commandes**, ce qui vaut d'être
écrit ici. Le correctif propre est un dossier de livraison distinct de celui du rendu.

### R2 — Aucun verrou de run : deux `advance` concurrents peuvent publier deux fois

`writeManifest` est atomique (rename), donc pas de manifeste corrompu — mais deux processus qui
lisent le même run puis avancent chacun un pas peuvent tous deux voir `["deliver"]` et publier,
le second écrasant l'enregistrement du premier. En in-process le problème n'existait pas : un seul
appelant. La façade rend le parallélisme trivial (`for run in *; do advance & done`).

Arbitrage : **assumé.** Un verrou par run (lockfile + refus `busy`) est une capacité à part
entière, avec ses propres questions (verrou périmé, timeout, un code de plus). Le local-first
mono-journaliste ne l'exige pas aujourd'hui, et l'inventer à la va-vite produirait des runs bloqués
par un verrou que rien ne nettoie.

### R3 — `verb publish` refusé en `usage` (exit 2), pas en `invalid-request` (exit 1)

C'est un jugement, pas une évidence. Exit 2 dit « mauvaise commande » (même famille qu'une commande
inconnue, et le refus tombe avant même la lecture de stdin) ; exit 1 aurait dit « requête refusée ».
Choisi 2 parce que la charge utile n'est pas en cause — aucune requête `publish`, même parfaite, ne
passe par ce chemin. Un hôte qui traite 2 comme « mon appel est mal formé » lit juste ; c'est
verrouillé par un test et documenté dans le README.

### R4 — Le gate de sign-off reste infranchissable depuis un hôte

Si le profil de la rédaction déclare des `requiredSigners`, `deliver()` exige `el.approved` — et
aucune commande de façade ne pose ce champ (§5). `advance` répondra donc `step-refused` avec le
message de `deliver()`, indéfiniment. C'est **honnête** (rien n'est publié sans signature) et
**bloquant** (un hôte non-JS ne peut pas terminer un run sur une telle rédaction). Le sign-off
humain est un sous-projet à part ; le noter ici évite qu'on le découvre comme un bug.

### R5 — `advance` peut produire un artefact puis échouer à écrire le manifeste

Si `writeManifest` échoue après un `produce` réussi, le PNG existe et le run ne le sait pas.
Réponse : `invalid-run`, et le prochain `advance` re-produira (l'artefact n'est pas dans le
manifeste, donc rien n'est « stale », juste absent) — l'état reste cohérent, au prix d'un rendu
refait. Assumé : la seule alternative serait un journal en deux phases, hors de proportion avec un
échec d'écriture disque.

### R6 — `chooseForm` n'exige pas d'angle confirmé

Un manifeste écrit à la main peut porter une `proposal` sans `angle` ; `chooseForm` écrira le choix
et `nextActions` répondra `confirm-angle`. Aucun invariant n'est violé (`assertInvariants` n'exige
un angle que pour un artefact) et le chemin n'est pas atteignable via la boucle (`propose` ne tourne
qu'après un angle). Laissé tel quel : ajouter un refus ici défendrait contre un état que le loop ne
produit pas, au prix d'un troisième endroit qui décide de l'ordre des beats.

### R7 — Élément vivant seulement, et le décor n'est pas paramétrable

Rappelés depuis §5 parce qu'ils se voient à l'usage : un run multi-éléments ne se décide que sur
`elements[0]`, et le décor vient toujours de `tryLoadDecor()` (l'install courant) — il n'y a pas de
`--dir` sur les commandes neuves, alors que `newsroom` en a un. Assumé tant que `nextActions` lui-
même ne parle que de l'élément vivant : une commande qui déciderait pour `elements[2]` déciderait
d'une chose que `next` ne sait pas rapporter.
