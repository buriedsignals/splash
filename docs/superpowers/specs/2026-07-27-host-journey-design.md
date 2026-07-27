# Spec — Le parcours hôte, du néant jusqu'au livré

> **Statut :** en cours.
> **Branche :** `feat/host-journey`, off `60b4c60`.
> **Langue :** prose FR, identifiants/code en anglais (standard non-négociable).
> **Lire d'abord :** `2026-07-27-facade-parity-design.md` (§3, §4) et
> `2026-07-27-residual-sweep-design.md` (§3 + « Ce qu'un parcours réel a ajouté au §3 »).

---

## 0. Le thème

Un parcours réel a été conduit de bout en bout sur `main` @ `687dadf` — primes maladie, six
cantons, 2015→2024, source publique déclarée — **et il a marché** : orient → propose →
choose-form → produce → request-delivery → deliver, un vrai chart rendu, un embed Cloudflare
Pages servi en HTTP 200 portant le titre, les données et le crédit déclaré.

Mais **un vrai hôte ne peut pas le refaire**. Quatre trous, une seule maladie :

> **le mécanisme existe, et rien ne l'invoque.**

Ce n'est pas la maladie de la parité (« la façade ne sait pas ce que la boucle sait ») : c'est un
cran plus bas. La boucle elle-même possède `freezeInput` et `applyPhrasing` sans qu'aucun chemin
de production ne les appelle. Le code est écrit, testé, documenté — et mort.

Les quatre trous ont été **re-mesurés sur l'arbre courant** (`60b4c60`) avant d'être conçus, pas
recopiés des specs :

| # | Trou | Mesure refaite le 2026-07-27 |
|---|---|---|
| 1 | Rien ne crée un run | `grep freezeInput` → **un seul** appelant de production, `lib/loop/migrate.ts:130`. Les 30 autres sites sont des tests. `cli.ts:250` liste 8 commandes, aucune ne crée. |
| 2 | Rien n'enregistre l'angle | `lib/host/drive.ts:166` le dit lui-même : « *no façade command records it yet* ». |
| 3 | `state` n'expose pas l'offre | Run réel conduit à `gateState: "proposed"` → la réponse porte `id · gateState · nextActions · validation · destination · aspect · channel`, **pas l'offre**. `next` dit `choose-form` et l'hôte ne voit aucune forme. |
| 4 | `why` vide sur chaque option | Run réel : `bar`, `dumbbell`, `lollipop` — les trois avec `whySource` rempli et **`why: ""`**. `grep applyPhrasing` → aucun appelant de production (seulement `lib/brain/acceptance.test.ts`). |

Et une contradiction documentaire, qui est le symptôme le plus parlant du trou 1 :
`skills/splash/SKILL.md` grave **« ★ THE DECISIONS ARE MECHANICAL — never hand-edit `run.json` »**
alors que l'édition à la main était le **seul** moyen d'obtenir un run. La règle était juste et
le codebase ne pouvait pas l'honorer — exactement la forme du §3 du balayage de résidus.

---

## 1. Trou 1 — `init` : la commande qui crée un run

### 1.1 Ce qui est décidé

Une commande **`init --run <dir>`** qui lit une **déclaration de run** en JSON sur stdin, adossée
à une fonction réutilisable `initRun(runDir, declaration)` dans un module neuf
`lib/loop/init.ts`. La façade n'invente rien : elle appelle la boucle, comme `choose-form`
appelle `chooseForm`.

**Pourquoi du JSON sur stdin et pas des drapeaux.** Le reste de la façade est en drapeaux parce
que ses arguments sont des scalaires (`--option <id>`, `--to <id,id>`). Une création de run ne
l'est pas : elle porte deux fentes d'entrée (`data`, `article`), chacune avec sa **déclaration de
source** (kind, label, url, internalRef), plus un tableau d'éléments. En drapeaux cela donne dix
drapeaux dont deux paires quasi homonymes (`--source-label` / `--article-source-label`) — la
forme même où un hôte se trompe de fente en silence. C'est un document ; il arrive comme un
document. L'idiome existe déjà sur cette surface (`verb <name> < request.json`).

**Ce que la déclaration NE PEUT PAS porter, et c'est le point porteur.** Le schéma
(`RunDeclarationSchema`, zod **strict**) admet exactement : `runId` · `route?` · `channel?` ·
`input{data?,article?}` (au moins une) · `sources?` · `elements?[{id, requestedFormat?,
deliverable?, deliverableOf?}]`. Il n'admet **pas** `angle`, `proposal`, `artifact`, `review`,
`delivery`, `approved`, `orient`, `cadrage`, `events`. Un champ inconnu **échoue au parse en le
nommant** (`z.strictObject`, la même discipline que `SourceLedgerSchema` — cf. son en-tête : « un
objet permissif laisserait passer une déclaration ne portant aucun label »).

Autrement dit : **`init` crée un run à l'état `empty`, et rien d'autre.** Chaque champ ultérieur
est *gagné* par une commande qui a ses propres refus. C'est ce qui rend la phrase de `SKILL.md`
honnête pour la première fois : on ne peut plus obtenir par `init` ce qu'on obtenait en éditant
`run.json` à la main, donc la règle « ne jamais éditer à la main » a enfin un chemin.

### 1.2 L'ordre des opérations, et pourquoi il est celui-là

Un refus doit **ne rien laisser derrière**. `freezeInput` écrit (il crée `input/` et y copie un
fichier content-addressed) ; `writeManifest` valide ensuite le ledger de sources
(`assertInvariants` → `assertSourceLedger`). Dans l'ordre naïf, un ledger illégal — `synthetic`
dans un run `real` — laisserait un `input/data-<hash>.csv` orphelin dans un répertoire sans
`run.json`.

L'ordre retenu :

1. parser la déclaration (strict) ;
2. **refuser si `<dir>/run.json` existe déjà** — voir §1.3 ;
3. valider le ledger **avant tout octet écrit**, avec les drapeaux de présence tirés de la
   *déclaration* (`assertSourceLedger` prend `{data: boolean, article: boolean}`
   structurellement, jamais le manifeste — c'est ce qui garde `lib/source` libre de toute
   dépendance sur `lib/loop`) ;
4. vérifier que chaque chemin d'entrée existe ;
5. geler les entrées ;
6. `writeManifest`.

Un refus aux étapes 1-4 laisse le répertoire **intact**. C'est la même promesse que
`lib/host/drive.ts` tient déjà pour ses deux décisions (« a refused decision writes nothing at
all — the run on disk is byte-identical, which is what makes a refusal safe to retry »).

### 1.3 Un run existant n'est jamais écrasé

`init` sur un répertoire qui porte déjà un `run.json` est un **refus**, pas un remplacement. Le
manifeste est le ledger : il porte les événements, les artefacts produits, les livraisons
effectuées. L'écraser sur une commande dont le nom dit « commence » détruirait un travail fini
sans que rien ne le demande. C'est la même famille que le refus d'`outDir` de
`lib/host/path-safety.ts` — « refuses rather than delete content it did not create ».

### 1.4 Ce qui n'est PAS gardé

Les chemins d'entrée sont résolus contre le répertoire de travail du process quand ils sont
relatifs, et rien ne restreint *quel* fichier un hôte peut geler. Délibéré : l'hôte nomme sa
propre donnée, et il pouvait déjà passer n'importe quels octets par `spec.data` de `verb render`
— `init` n'ouvre pas d'exposition neuve. Le pendant destructif (`outDir`, qui **efface**) est
gardé parce qu'il efface ; `init` **lit** et **copie**. Noté en §6.

---

## 2. Trou 2 — `confirm-angle` : enregistrer un angle sans devenir « écris n'importe quelle prose »

### 2.1 Le raisonnement qu'on doit respecter

Le slice « decision surface » a délibérément écarté l'angle :

> « free editorial text; a command that writes arbitrary prose into the manifest would be the
> disease, not the cure »

**Ce raisonnement est juste**, et il vise une commande générique — un `set --field <chemin>
--value <prose>`, où l'hôte choisit *où* la prose atterrit. Une telle commande rendrait la
mécanique de la boucle décorative : tout garde-fou qui suppose que l'état a été écrit par du code
serait contournable par construction.

Mais l'angle n'est pas de la prose libre **posée n'importe où**. Il a des parties connues, et le
codebase les connaît déjà.

### 2.2 La forme retenue : quatre fentes nommées, pas un document

**`confirm-angle --run <dir> --takeaway <s> --alt-insight <s> --unit <s> [--emphasis <s>]
[--element <id>]`** — des **drapeaux**, et cette fois délibérément l'inverse du choix d'`init`.

Quatre raisons, dans l'ordre de leur poids :

1. **L'hôte ne choisit pas *où* la prose atterrit — seulement *à laquelle des quatre questions*
   il répond.** Il n'y a aucune clé à nommer, aucun chemin dans le manifeste à désigner. La
   surface *est* le questionnaire. C'est la différence exacte entre cette commande et la maladie
   que le slice précédent refusait : un document JSON invite « voici un objet », des drapeaux
   énumèrent. Le manifeste a déjà ce vocabulaire fermé
   (`RunElementSchema.angle = {confirmedTakeaway, emphasis?, altInsight, unit}`), et
   `lib/host/drive.ts:166` **nomme déjà les trois parties** dans son refus (« the angle (takeaway,
   alt text, unit) has to be confirmed ») : la commande ne fait qu'exécuter la phrase que la
   façade prononçait déjà.
2. **Chaque partie est refusée vide, avec le refus que le codebase donne déjà ailleurs.**
   `lib/delivery/metadata.ts:43` refuse un `altInsight` blanc (WCAG 1.1.1 — et
   `lib/core/conformance-l0.ts:116` le fait échouer dur côté producteur : « alt text must state
   the insight, not the chart's structure ») ; `metadata.ts:51` refuse un `confirmedTakeaway`
   blanc (« a blank title is as visible to a reader as a blank alt text is to a screen-reader
   user »). Ces deux refus existaient **au moment de l'emballage**, c'est-à-dire après le rendu.
   Les poser **au moment où l'angle est enregistré** veut dire que le run ne peut plus porter le
   blanc du tout : le journaliste l'apprend avant de produire, pas après.
3. **`--unit` est requis et non blanc.** Le schéma rend déjà `unit` non optionnel — un angle sans
   lui ne typecheck pas — et une valeur nue sans unité est une affirmation sur un nombre nu. Pour
   un dénombrement, l'unité *est* la chose comptée (« cantons »). Jugement assumé, réversible :
   §6.
4. **C'est une DÉCISION, donc elle suit la discipline des décisions.** Refusée → rien n'est
   écrit ; acceptée → persistée avec `nextActions` dans le même souffle. Elle passe par le même
   `decide()` de `lib/host/drive.ts` que `choose-form` et `request-delivery`, donc par le même
   `selectElement` (`liveElementFor` par défaut, `--element` pour nommer un frère, un id absent
   = refus qui liste les présents). Aucune seconde façon de désigner un élément.

### 2.3 Re-confirmer est permis — et l'hôte est averti de ce qu'il périme

Re-confirmer un angle est le geste légitime que `lib/loop/revise.ts` modélise déjà (« a
back-edge: the journalist changes the angle after seeing the visual »). L'angle entre dans
`provenanceHash`, donc le changer **périme l'artefact produit** et `nextActions` repart sur
`produce`.

La réponse le **dit** : quand l'élément portait un artefact frais que ce changement rend obsolète,
elle porte `staled: true`. C'est exactement le résidu que le §4 de la spec de parité laissait
ouvert pour `--element` (« rien ne prévient l'hôte que sa décision annule un travail fini ») ;
il coûte cinq lignes ici, et une décision silencieusement destructrice n'a pas à être la norme
d'une surface dont tout le reste est explicite.

---

## 3. Trou 3 — `state` porte l'offre

`resumeReport` gagne, par élément, un champ **`proposal?`** — présent exactement quand
`el.proposal` l'est. Il porte l'offre **telle qu'elle est persistée** : `options` (chacune avec
`id · nativeType · engine · format · intent · why · whySource · requires · readiness`),
`excluded`, `chosenId`, `refusal`.

**Pourquoi l'offre entière, et pas un résumé.** L'hôte doit faire trois choses avec :
la **montrer** au journaliste, la **rédiger** à partir du `whySource` *seul* (§4), et **nommer**
un id. Amputer `whySource` rendrait `phrase` non pilotable depuis `state` : l'hôte devrait
ouvrir `run.json` lui-même — c'est-à-dire précisément la maladie « la façade ne sait pas ce que la
boucle sait », re-créée un cran plus bas.

C'est une **projection d'état persisté**, sans aucune dérivation : elle ne peut donc pas diverger
de ce que la boucle lit. `excluded` en fait partie parce que le manifeste le garde comme état
« precisely so this survives a resume and the journalist can ask for one back », et un hôte qui
ne le voit pas ne peut pas rendre ce service. `refusal` en fait partie parce que sans lui
`options: []` est indiscernable de « rien à offrir ».

---

## 4. Trou 4 — `phrase` : donner un appelant à `applyPhrasing`

### 4.1 La commande

**`phrase --run <dir> [--element <id>]`**, qui lit sur stdin la liste des options rédigées :

```json
[{ "id": "bar", "why": "…", "markAcknowledged": true }]
```

Elle appelle `applyPhrasing` (`lib/loop/phrase.ts`) — « the one path that calls the guard and
then writes the `why` back onto the manifest » — et persiste. `applyPhrasing` **jette** par
conception ; la façade ne jette jamais, donc `lib/host/drive.ts` convertit en `invalid-request`
portant le message du garde, comme il le fait déjà pour toute décision.

### 4.2 Pourquoi CETTE prose-là peut avoir une commande, alors que la prose générique ne peut pas

C'est la question que le §2.1 pose et il faut y répondre deux fois, différemment :

- l'**angle** est libre mais **placé** : quatre fentes nommées, rien à désigner (§2.2) ;
- le **phrasage** est libre mais **vérifié** : `verifyOffer` contrôle les ids, le compte,
  **l'ordre exact**, les formes écartées présentées comme offertes, l'acquittement structurel des
  marques — et **chaque nombre de la prose doit venir du `whySource` de cette option-là** (ses
  fragments, ses facts, la raison de sa marque). Puis `applyPhrasing` ajoute le seul contrôle que
  le garde s'interdit : un `why` blanc est refusé.

Un JSON est ici la bonne forme là où des drapeaux étaient la bonne forme pour l'angle : le
phrasage est une **liste dont la longueur et l'ordre sont fixés par l'offre**, une phrase par
option. Aucun jeu de drapeaux n'exprime « une valeur par option, dans l'ordre de l'offre » — et
c'est justement cet ordre que le garde vérifie.

### 4.3 `nextActions` gagne `phrase`, à une position choisie

`nextActionsForElement` répond `["phrase"]` **quand rien n'est encore choisi et qu'au moins une
option porte un `why` blanc** :

```
if (!el.proposal)            return ["propose"];
if (options.length === 0)    return [];
if (!chosenId)               return options.some(blank why) ? ["phrase"] : ["choose-form"];
… (inchangé)
```

Deux décisions de position, chacune payante :

- **Avant `choose-form`** : un journaliste ne peut pas choisir dans une offre que personne n'a
  écrite. Sans cette étape, l'hôte s'entend dire `choose-form`, essaie, et découvre l'invariant
  du §5 comme un refus — ce qui recrée le trou 3 (« on te dit `choose-form` et tu ne peux pas
  voir les formes ») une commande plus loin.
- **Sous le test `!chosenId`, pas au-dessus** : une fois un `chosenId` posé, l'invariant du §5
  garantit qu'il porte un `why` — l'état « choisi mais non rédigé » n'est plus **écrivable sur
  disque**. Router hors d'un état que l'invariant interdit d'écrire ne servirait personne, et
  placer le test au-dessus ferait basculer des tests de boucle qui construisent en mémoire des
  offres non rédigées pour prouver **autre chose** (l'impasse `choose-form` de
  `driver.test.ts:607`). La règle : n'ajouter du routage que là où l'état est atteignable.

`phrase` est un **tour humain** : le `default:` d'`advanceStep` (`lib/loop/driver.ts:160`) le
traite comme `confirm-angle`/`choose-form` sans une ligne de changement, et
`nothingToRun` (`drive.ts`) le nomme avec sa commande — comme il le fait déjà pour `choose-form`.

---

## 5. L'invariant `why`, verrouillé — et **après** l'appelant

Le résidu parké (`assertInvariants` n'exige pas un `why` non vide sur l'option **choisie**) est
**fermé dans ce slice**, et l'ordre imposé par le balayage de résidus est respecté à la lettre :

> « d'abord donner un appelant à `applyPhrasing` sur le chemin hôte, ensuite seulement verrouiller
> l'invariant. L'invariant sans le phrasage transformerait une promesse non tenue en panne dure. »

Donc : §4 d'abord (la commande `phrase` existe et le parcours hôte l'emprunte), §5 ensuite. Le
commentaire parké dans `assertInvariants` — qui nommait la raison et les deux tests bloquants —
est remplacé par le contrôle réel plus la note de ce qui a levé le blocage.

**Ce que l'invariant refuse** : `proposal.chosenId` nommant une option dont le `why` est blanc.
Une option enregistrée comme choisie sur une phrase vide dit qu'un journaliste a choisi quelque
chose que personne ne lui a montré.

**Rayon de souffle, mesuré et non estimé.** `why` est **requis** par `FormOptionSchema`
(`z.string()`, pas `.optional()`), et `grep 'why: ""'` sur tous les tests de `lib/` renvoie
**zéro**. Aucune fixture écrite à la main n'est donc concernée : le seul producteur d'un `why`
vide est `propose()` (`lib/loop/propose.ts:45`, délibéré — « le cerveau livre le grounding, le
desk écrit la langue »). Les tests touchés sont exactement ceux qui **écrivent** un manifeste
après avoir posé un `chosenId` à la main sur une offre construite par le cerveau. Leur
correction est d'**emprunter le vrai chemin** — rédiger avant de choisir —, ce qui les rend plus
fidèles à la production, jamais plus permissifs.

---

## 6. La garde `render` — marquer, pas fermer

`lib/core/verbs/render.ts` ne valide pas `spec.source` : un hôte appelant `render` nu fournit le
crédit qu'il veut. **La décision est prise : marquer, pas fermer.**

**Le raisonnement, conservé dans le code** (`render.ts`, à l'emplacement exact où la garde
irait — même dispositif que le commentaire parké d'`assertInvariants`) : un artefact rendu hors
run **ne porte aucun hash de provenance**, donc `deliver()` ne peut pas le publier
(`needsDelivery`/`deliveredProvenanceHash` n'ont rien à comparer) et `verb publish` est **déjà**
refusé à la façade (`HOST_ONLY_VERBS`). Le fichier mal crédité **reste local et ne peut pas
sortir par Splash**. Fermer coûterait neuf tests porteurs — la garde d'`outDir` destructif au
bord du process, la frontière never-throw, et qu'un vrai moteur soit joignable depuis un process
qui n'importe que la CLI (`lib/host/wiring.test.ts`) — pour un risque qui n'atteint jamais la
publication.

**Ce qui change** : la réponse de la façade à un `verb render` **réussi** porte désormais

```json
"sourcePolicy": { "checked": false, "why": "…" }
```

à côté de l'artefact, de sorte qu'il ne puisse plus **passer pour** un artefact contrôlé.

Trois choix de placement, chacun contre son alternative :

- **À la façade, pas dans `render()`.** `render()` est aussi appelé par `lib/loop/produce.ts`,
  qui **a** appliqué la politique (`validateSourcePolicy`, et il refuse un run non déclaré).
  Marquer dans le verbe apposerait « non contrôlé » sur le seul chemin qui l'est.
- **À côté de l'artefact, pas dans `report`.** `report` est le sac du **moteur** ; y glisser une
  phrase de la façade ferait dire au moteur ce qu'il n'a pas dit.
- **Déclaré par `verbs`, pas seulement émis.** Une constante unique
  (`lib/host/source-mark.ts`) lue par `capabilities()` **et** par `cli.ts` : un hôte lit le
  marqueur dans la déclaration au lieu de le découvrir dans une réponse, ce qui est la règle de
  cette surface partout ailleurs (`hostCommand`, `errorCodes`), et les deux ne peuvent pas
  décrire deux mondes.

Le marqueur ne va **que** sur un succès : un refus n'a rien rendu.

---

## 7. La preuve

Un test de bout en bout qui conduit un run **du néant à un artefact livré, uniquement par des
appels CLI engendrés** — aucune construction de manifeste en process, aucun `run.json` écrit à la
main à aucune étape. `lib/host/journey.test.ts` porte déjà la forme de la seconde moitié ; il est
étendu au vrai commencement :

```
init → advance(orient) → confirm-angle → advance(propose) → state(lit l'offre)
     → phrase → choose-form → advance(produce) → request-delivery → advance(deliver) → state
```

Publieur `zip` (hors-ligne, aucune créance). C'est la seule preuve qui vaut : chacune des quatre
commandes neuves est *nécessaire* au parcours, donc aucune ne peut redevenir morte sans que ce
test tombe.

---

## 8. Risques assumés

- **`init` ne restreint pas quel fichier est gelé.** Un hôte peut pointer `input.data` sur
  n'importe quel chemin lisible, relatif compris (résolu contre le cwd du process). Assumé :
  l'hôte nomme sa propre donnée, et il pouvait déjà passer n'importe quels octets par
  `spec.data` de `verb render` ; `init` **lit et copie** là où `outDir` **efface**, et c'est
  l'effacement que `path-safety.ts` garde. **Jugement : ouvert.**
- **`--unit` exigé non blanc est un jugement éditorial, pas une contrainte de schéma.** Le schéma
  accepte `""`. Si un type légitime apparaît sans unité dicible, c'est ce refus-là qui devra
  céder — pas le schéma. **Jugement : réversible, une ligne.**
- **`state` expose l'offre, toujours pas l'angle enregistré.** Un hôte qui reprend un run à
  froid lit `gateState: "angled"` sans pouvoir relire le takeaway confirmé sans ouvrir
  `run.json`. Même famille que le trou 3, hors périmètre : le trou nommé était l'offre.
  **Jugement : ouvert, à fermer avec le prochain besoin réel.**
- **`phrase` ne vérifie pas la LANGUE.** Le garde ne peut pas vérifier le sens à travers les
  langues (son en-tête le documente longuement) ; un hôte peut donc rédiger en anglais pour un
  journaliste francophone. Inchangé par ce slice, et non fermable ici. **Jugement : ouvert,
  hérité.**
- **`confirm-angle` avertit d'une péremption, il ne la refuse pas.** `staled: true` informe ;
  rien n'oblige l'hôte à le lire. Un refus serait faux (re-confirmer est légitime).
  **Jugement : voulu.**
- **`verb render` reste appelable avec un crédit arbitraire.** Décision prise en amont, marquée
  et non fermée (§6). Ce que le marqueur ne fait pas : empêcher un hôte de **retirer** le
  marqueur avant de relayer la réponse. Rien dans un contrat JSON ne peut l'en empêcher.
  **Jugement : assumé, et c'est la limite de « marquer ».**
