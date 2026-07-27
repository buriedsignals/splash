# Spec — La couche Verify DANS le parcours

> **Statut :** design validé, prêt pour → writing-plans.
> **Branche :** `feat/verify-in-journey` (worktree `splash-verify-journey`), off `c88d1a8`.
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).
> **Lire d'abord :** `2026-07-26-verify-layer-design.md` (la couche construite) et
> `2026-07-27-host-journey-design.md` (la tranche qui a fermé la même classe un cran plus bas —
> on en reprend la forme : mesurer d'abord, une commande par acte, une preuve par appels CLI
> engendrés).
> **Issues Tom :** #3, #9, #10, #11 — cette fois **dans le chemin vécu**.

---

## 0. Le thème, et la mesure

La tranche `feat/verify-layer` a construit onze modules : capture au **vrai viewport de
publication**, table de sévérité centrale, frontière d'indépendance qui caviarde la plomberie
avant qu'un relecteur voie quoi que ce soit, porte de préview, records d'override liés aux
octets + à la provenance, et une voie **needs-human-eye** dont le type n'a délibérément aucun
champ de verdict. `lib/core/verbs/capture.ts` et `review.ts` ont un corps. `approveElement`
existe dans `lib/loop/manifest.ts` comme **unique écrivain sanctionné** de `approved`.

**Rien ne l'appelle.** Re-mesuré sur l'arbre courant (`c88d1a8`) avant d'être conçu :

| # | Trou | Mesure refaite le 2026-07-27 |
|---|---|---|
| 1 | La boucle ignore que la vérification existe | `nextActionsForElement` (`lib/loop/manifest.ts:345-393`) ne renvoie **jamais** `capture`, `review` ni `approve` : la cascade va de `produce` à `deliver`/`show` sans rien entre les deux. |
| 2 | La façade n'expose aucun acte de vérification | `lib/host/cli.ts:366` liste onze commandes ; aucune n'est `approve`. `advance` ne peut donc conduire qu'`orient`/`propose`/`produce`/`deliver`. |
| 3 | Les verbes n'ont aucun appelant de production | `grep 'runVerb("capture")'` / `runVerb("review")` → **zéro** hors `lib/core/verbs/*.test.ts`. `grep approveElement` → un seul consommateur, `lib/verify/manifest-review.test.ts`. |
| 4 | Le parcours réel n'a **aucune** étape d'approbation | `init → orient → confirm-angle → propose → phrase → choose-form → produce → request-delivery → deliver`, conduit de bout en bout à la façade : un visuel passe de *produit* à *publié* sans qu'aucune porte l'ait regardé. |

Et le symptôme le plus parlant, comme dans la tranche précédente : `lib/loop/deliver.ts:100`
porte **déjà** une porte d'approbation — mais seulement `if (requiredSigners.length > 0)`. Une
rédaction qui déclare des signataires ne pouvait **jamais publier** (rien n'écrivait `approved`) ;
une rédaction qui n'en déclare pas publiait **sans aucune porte**. La même maladie, dans les deux
sens à la fois.

---

## 1. Le principe qui gouverne cette tranche

La couche Verify a son principe (« une affirmation de vérification n'existe que si un mécanisme
l'a produite, et elle est étiquetée par ce qui l'a produite »). Celui-ci en est le corollaire de
câblage :

> **La publication est le seul acte irréversible de la boucle. Ce qui la précède doit être une
> porte que le code tient, jamais une phrase que quelqu'un doit se rappeler de lire.**

Trois conséquences, et elles décident tous les cas limites de ce spec :

1. **`deliver()` refuse un artefact non approuvé — inconditionnellement.** Pas seulement sous
   `requiredSigners`. C'est la porte, et elle est *dans la fonction qui publie*, pas seulement
   dans le routeur qui y mène.
2. **Le routage dit comment y arriver.** `nextActions` gagne le chemin `capture → review →
   preview → approve`, pour qu'un hôte à qui l'on refuse la livraison sache exactement quel acte
   est dû — et non pour qu'il *découvre* le refus.
3. **L'approbation reste HUMAINE.** Aucun appel sortant, aucun second modèle, aucune requalifi-
   cation de `unavailable` en `pass` (§5).

---

## 2. Les états ajoutés, et où exactement

### 2.1 La position dans la cascade

`nextActionsForElement` est une **cascade de précédence dérivée du manifeste**, jamais une
navigation libre — et `deliver` y est déclenché par une DÉCISION (`el.delivery` posé par
`request-delivery`), jamais auto-avancé. Les quatre états neufs se posent **à l'intérieur de
cette branche-là** :

```
if (!el.artifact || stalenessOf(run, el))   return ["produce"];
if (el.delivery && needsDelivery(run, el)) {
  if (approvalCovers(run, el))              return ["deliver"];   // inchangé
  if (!captureCovers(run, el))              return ["capture"];
  if (!reviewCovers(run, el))               return ["review"];
  if (!previewCovers(el))                   return ["preview"];
  return ["approve"];
}
return ["show"];
```

**Pourquoi DANS la branche de livraison et pas juste après `produce`.** Deux raisons, et la
première est une mesure, pas une préférence :

- `lib/source/wiring-proof.test.ts:128` asserte `nextActions(produced) === ["show"]` pour un
  élément produit dont **aucune livraison n'est demandée**. Ce fichier est hors frontière pour
  cette tranche. Poser la chaîne au-dessus de `show` casserait un test que je n'ai pas le droit
  de réparer — et un invariant écrit contre un test qu'on ne peut pas toucher est un faux vert,
  exactement le raisonnement que la tranche Verify a déjà tenu pour `approved ⇒ preview` (§6.2
  de son spec).
- Éditorialement, `show` a toujours voulu dire « frais, et personne n'attend après ». Avec une
  livraison demandée, **quelqu'un attend** : la vérification porte sur ce qui est sur le point de
  sortir. Une affirmation de vérification sur un visuel que personne ne publie ne prouve rien
  qu'on ait besoin de prouver aujourd'hui.

**Pourquoi `approvalCovers` court-circuite en tête.** Parce que la livraison n'a besoin que d'une
chose : **une approbation qui porte sur CES octets-là**. Capture, review et préview sont la
*route* vers elle, pas des conditions séparées. Et cela garde la cascade honnête vis-à-vis du
résidu R9 de la tranche précédente : `approved ⇒ preview` n'est pas un invariant du manifeste, la
porte est à l'écrivain (`approveElement`). Le routeur ne prétend donc pas savoir plus que le
manifeste ne sait.

### 2.2 Fraîcheur : tout est lié à `provenanceHash`

`captureCovers` / `reviewCovers` / `approvalCovers` comparent au `provenanceHash(run, el)`
courant, exactement comme `stalenessOf`. `previewCovers` compare aux **octets**
(`previewCoversDeliverable(format, review.preview, el.artifact.sha256)`), parce que c'est ce que
la porte de #3 vérifie. Une re-production déplace les deux ⇒ toute la chaîne retombe,
mécaniquement, sans que personne ait à s'en souvenir. C'est le même mécanisme qui fait tomber un
override (#11 : *« Re-production invalidates overrides tied to the prior artifact »*).

### 2.3 Le manifeste : un slot `capture` neuf, et un état de gate

`RunElementSchema` gagne **`capture?`** (`CaptureSlotSchema`, `lib/verify/schema.ts`) :

```ts
{ images: CaptureRecord[]; checks: CaptureCheck[]; capturedProvenanceHash: string;
  unsupported?: string }
```

**Pourquoi un slot séparé plutôt que de remplir `review` à moitié.** `gateStateOf` lit
`el.review` pour répondre `"reviewed"` : écrire un `review` partiel à la capture ferait dire au
manifeste qu'un artefact a été *revu* alors qu'aucun finding n'a été produit. Deux verbes, deux
faits, deux slots — et `gateStateOf` gagne `"captured"` entre `"produced"` et `"reviewed"`, de
sorte que l'échelle produced → captured → reviewed → approved → delivered soit enfin **entière
et atteignable** (elle était déjà écrite ; trois de ses cinq barreaux étaient morts).

`unsupported` porte la raison quand la capture n'est **pas** disponible pour ce format (§4.3).

---

## 3. Les trois étapes déterministes (`advance`)

`capture`, `review` et `preview` sont **déterministes** : `advanceStep` les conduit, une par
appel, comme `orient`/`propose`/`produce`/`deliver`. `approve` est un **tour humain** — il tombe
dans le `default:` d'`advanceStep` sans une ligne de changement, comme `choose-form`.

### 3.1 `capture` — `lib/loop/verify.ts`

Appelle `runVerb("capture")` avec un payload NEUTRE construit depuis le manifeste :

| Champ | D'où il vient | Pourquoi |
|---|---|---|
| `artifactPath` | `join(runDir, el.artifact.path)` | l'artefact **que le run a produit**, jamais un chemin arbitraire (#3, premier point de sa liste) |
| `format` | `chosenOption(el).format ?? "static"` | le format épinglé, la même résolution que `produce` et `deliver` |
| `channel` | `channelForElement(run, el)` | le canal de CE livrable |
| `outDir` | `join(runDir, "verify")` | frère de `elements/` et `deliveries/` — jamais dedans : `freshOutDir` **efface** `elements/<id>` à chaque re-produce (la panne que `elementDeliveryDir` a déjà payée) |
| `furniture` | titre = `angle.confirmedTakeaway`, unité = `angle.unit`, source = le crédit **déclaré**, alt-text = `angle.altInsight` | c'est la moitié porteuse de #10 : l'appelant sait quelle furniture il a commandée, la capture prouve qu'elle est là, visible, **et dans le cadre** |

Le crédit vient de `validateSourcePolicy(run.sources?.data, …).value.published.attribution` — la
**même** ligne que `produce.ts` rend dans l'artefact, jamais une seconde résolution : un check de
furniture qui chercherait un autre texte que celui qui a été peint mesurerait la mauvaise chose.

### 3.2 `review` — `lib/loop/verify.ts`

Appelle `runVerb("review")` avec les captures et les checks du slot, plus l'intention éditoriale
confirmée. `acceptedDestinationId` = `destinationIdFor(channel)`, c'est-à-dire **la même** valeur
que la capture a enregistrée : la deuxième prise de #10 (« un still pris pour une autre
destination n'est pas une preuve ») est donc active, et elle mordra le jour où un profil de
destination entrera dans le tableau (§7).

Le record complet atterrit dans `el.review`. Il porte `reviewer.independentSemanticReview:
"unavailable"` — parce que c'est vrai (§5).

### 3.3 `preview` — `lib/loop/preview.ts`

C'est #3, **mécaniquement** : *« Gate 3 must automatically present the actual preview before
approval »*.

L'étape :

1. **résout le livrable depuis le manifeste** (`el.artifact.path`), jamais depuis un chemin
   fourni ;
2. **le re-hache** et refuse s'il ne correspond plus à `el.artifact.sha256` (fichier remplacé
   sous le run) ;
3. vérifie que le **genre du fichier correspond au format épinglé** (`isDeliverableOf`) — un PNG
   ne peut pas préviewer un interactif ;
4. **présente** : lance un vrai visualiseur sur le livrable, et enregistre **ce qui s'est
   réellement passé** ;
5. écrit le `PreviewRecord` dans `el.review.preview` — l'endroit exact où `approvalDecision` le
   lit.

**Le présentateur** (`lib/loop/preview.ts`) résout un ouvreur de plateforme (`open` sur macOS,
`start` sur Windows, `xdg-open` ailleurs). Deux réglages, tous deux **produits** et non
d'essai :

- `SPLASH_PREVIEW_OPENER=<commande>` — un poste distant, un visualiseur maison ;
- `SPLASH_NO_VIEWER=1` — *l'hôte présente lui-même* (un agent qui incruste l'image dans sa
  transcription) ou la machine n'a pas d'affichage. Sur Linux sans `DISPLAY`/`WAYLAND_DISPLAY`,
  c'est déduit sans réglage.

Quand rien n'a pu être ouvert, le record dit `presentedAs: "path-printed"` **avec la raison
factuelle écrite par la colonne vertébrale** (jamais fournie par l'hôte), et la réponse porte le
chemin absolu — le *« clickable absolute path and a clear fallback command »* de #3. C'est la
lecture stricte de `previewCoversDeliverable` : un chemin imprimé compte comme préview
**seulement** s'il dit pourquoi aucun visualiseur n'a pu être ouvert.

Ce que la préview **ne peut pas** prouver : que des yeux humains ont touché les pixels. Rien ne
le peut. Ce qu'elle prouve mécaniquement : ce sont **ces octets-là**, c'est **le bon genre de
fichier**, et l'acte a eu lieu à un instant enregistré.

---

## 4. `approve` — la porte, et son rapport à la signature Ed25519

### 4.1 La question posée, et la réponse

Il existait déjà un sign-off éditorial **Ed25519** (`skills/splash/src/editorial-signoff.ts`,
`scripts/sign-artifact.mjs`, `scripts/apply-signoff.mjs`, `requiredSigners` dans
`NEWSROOM-PROFILE.md`, appliqué par `lib/loop/deliver.ts:100`). La consigne était explicite : ne
pas construire un second concept d'approbation à côté. Décision, prise délibérément :

> **Ce sont UN seul concept à deux forces, et `approveElement` est le seul écrivain.**
> `approved` répond **QUOI** a été approuvé (la cérémonie mécanique est complète pour CES
> octets-là) ; la signature Ed25519 répond **QUI** l'a approuvé, de façon infalsifiable. La
> signature ne s'ajoute pas *à côté* de `approved` : elle est **la preuve d'identité portée
> dedans**.

Concrètement, et c'est ce qui empêche cette tranche d'affaiblir quoi que ce soit :

- `approve` **utilise** `verifyEditorialSignature` — le module existant, importé, pas réécrit.
  Aucune deuxième implémentation de la crypto, aucun deuxième format de payload : l'éditeur
  signe toujours avec `sign-artifact.mjs --proposal <id> --key <pem>`, où `<id>` est l'id de
  l'élément et les octets signés sont ceux de l'artefact.
- Quand `NEWSROOM-PROFILE.md` déclare `requiredSigners`, **aucune approbation ne peut être
  écrite sans une signature vérifiée** d'un signataire requis, sur `el.artifact.sha256`. Sans
  cela, `deliver`'s `requiredSigners` gate — qui exige `el.approved` — serait *satisfait par une
  approbation non signée* : je transformerais une porte cryptographique en formalité. Ce n'est
  pas un ajout de confort, c'est la condition pour que cette tranche ne régresse pas.
- Sans `requiredSigners`, l'approbation est **non signée mais nommée** : elle porte un
  `actorLabel` et produit quand même un **document de sign-off** sur disque.

### 4.2 Le document de sign-off

`approved.signoffPath` était un `string` que rien n'écrivait et que rien ne lisait. Il pointe
désormais sur un fichier réel, `signoffs/<elementId>.json` (frère de `elements/` et
`deliveries/`, donc jamais effacé par une re-production) :

```json
{ "elementId": "el1", "artifactSha256": "…", "approvedProvenanceHash": "…",
  "actorLabel": "…", "at": "…",
  "acknowledged": ["unit-missing"],
  "overrides": [{ "findingId": "…", "reason": "…", "actorLabel": "…", "at": "…",
                  "artifactSha256": "…", "provenanceHash": "…" }],
  "needsHumanEye": [ … TasteRiskSignal … ],
  "independentSemanticReview": "unavailable",
  "signoff": { "signerId": "yvan", "signature": "…" } }
```

C'est la **preuve durable** que #11 demande (*« Every override is attached to the finding and
current artifact hash with a recorded reason »*), et c'est aussi ce qui rend la voie
needs-human-eye conséquente : les risques de goût sont **écrits dans le document que l'humain
signe**, au lieu de disparaître dans un champ que personne ne relit.

### 4.3 La cérémonie

`approve --run <dir> [--element <id>]`, avec un **document optionnel sur stdin** :

```json
{ "actorLabel": "Yvan Pandelé",
  "acknowledged": ["unit-missing"],
  "overrides": [{ "findingId": "no-capture", "reason": "…" }],
  "signoff": { "signerId": "yvan", "signature": "base64" } }
```

Document et non drapeaux, par le même raisonnement que `phrase` : une liste d'overrides
(id + raison) n'a pas de forme en drapeaux, et l'ordre/la cardinalité viennent du record de
review, pas de l'hôte. Un stdin **vide** vaut `{}` — approuver un artefact sans finding ouvert ne
doit pas exiger de cérémonie.

Ce que l'hôte **ne fournit pas**, et c'est le point porteur : `artifactSha256`, `provenanceHash`
et `at` d'un override sont posés **par la colonne vertébrale**, depuis le manifeste. Un override
ne peut donc pas prétendre porter sur d'autres octets que ceux qui sont devant le journaliste.

Refus (tous `invalid-request`, exit 1, run inchangé) : un `findingId` absent du record ; une
raison blanche ; un override sans `actorLabel` ; un signataire hors `requiredSigners` ; une
signature qui ne vérifie pas ; et enfin toutes les raisons d'`approvalDecision` d'un coup —
`preview-not-presented`, `stale-preview`, `not-the-deliverable`, `fallback-unexplained`,
`review-stale`, `blocking-findings-open`, `warnings-unacknowledged`. Une porte qui ne rapporte
qu'un blocage à la fois apprend aux gens à la relancer plutôt qu'à la lire.

### 4.4 La vidéo : la chaîne ne la saute pas, elle la NOMME

`capture` refuse `video` avec `not-implemented` (extraction de frame = ffmpeg, hors frontière —
raison inchangée depuis le spec de la couche). Trois options étaient possibles ; deux sont
mauvaises :

- router quand même vers `capture` ⇒ la vidéo est **bloquée pour toujours**. Non.
- sauter la chaîne pour la vidéo ⇒ une vidéo publie **sans porte**, exactement le trou qu'on
  ferme. Non.

Retenu : l'étape `capture` **enregistre le manque** (`capture: { images: [], checks: [],
unsupported: "<la raison du verbe>" }`), la review émet alors son finding `no-capture`
(**blocking**, table centrale), et la vidéo ne peut sortir que par un **override explicite avec
sa raison écrite**. C'est le dispositif de #11 utilisé pour ce qu'il est : un journaliste peut
sciemment publier au-delà d'un manque, et il en reste une preuve. Le silence n'est jamais
converti en preuve.

---

## 5. #9 dans le parcours : ce qui est câblé, et ce qui est REFUSÉ

La frontière de redaction (`buildReviewerInput` + `assertNoInternals`) est traversée à chaque
`review` de la boucle : c'est la moitié porteuse de #9, et elle est désormais **sur le chemin
vécu**, pas seulement dans un test.

**Le relecteur sémantique indépendant reste non branché, et c'est une décision, pas un manque.**
Un relecteur indépendant qui enverrait du reportage **non publié** à un service tiers est refusé :
le risque de rétention pour une rédaction est réel et contredit l'identité local-first de l'outil.
`ReviewRequest.adapter` reste donc **vide en production**, `independentSemanticReview` reste
enregistré `"unavailable"`, et **aucun appel sortant n'est ajouté**. Si un second avis est un jour
automatisé, il tournera **localement** ; ce n'est pas cette tranche.

Corollaire tenu partout : `unavailable` n'est jamais habillé en `pass`, et il est **affiché** —
`state` le remonte, et il est écrit dans le document de sign-off que l'humain signe.

---

## 6. La façade

- **`approve --run <dir> [--element <id>]`** — la commande neuve (§4.3). Passe par le même
  `decide()`/`selectElement` que `choose-form` et `request-delivery` : `liveElementFor` par
  défaut, `--element` pour nommer un frère, un id absent = refus qui liste les présents. Aucune
  seconde façon de désigner un élément.
- **`advance`** conduit `capture`, `review` et `preview` sans nouvelle commande — ce sont des
  étapes déterministes, et c'est précisément ce qu'`advance` est.
- **`nothingToRun`** nomme `approve` comme il nomme déjà `choose-form` : *« the next act is the
  journalist's — approve the visual with "approve --run <dir>" »*.
- **`state`** gagne, par élément, une projection **`verification?`** : les findings (id,
  criterion, severity, status, summary, evidence), les `tasteRisk`, le `preview`,
  `independentSemanticReview`, et la **décision d'approbation courante** (`approvable` +
  `reasons`). Sans elle, l'hôte se voit répondre `["approve"]` et ne voit ni les blocages ni les
  avertissements à acquitter — exactement le trou 3 de la tranche précédente (« on te dit de
  décider et tu ne peux pas voir les termes »), recréé un cran plus loin. C'est une **projection
  d'état persisté** plus un appel à la fonction pure `approvalDecision`, donc elle ne peut pas
  diverger de ce que la porte appliquera.
- **`verbs`** déclarait déjà `capture`/`review` comme implémentés (`lib/host/capabilities.ts:71`
  — le résidu R1 de la tranche précédente a été fermé) ; c'est `lib/host/README.md` qui est
  périmé et le dit encore `implemented: false`. Corrigé.

---

## 7. Hors scope — assumé, avec sa raison

| Déféré | Pourquoi (honnête) |
|---|---|
| **Le relecteur sémantique indépendant** | Décision verrouillée, pas un manque (§5). Aucun appel sortant. |
| **`capture` de la vidéo (extraction de frame)** | ffmpeg vit dans les scripts de snap des moteurs ; le ré-héberger dans `lib/` est une tranche entière. Ici on **nomme** le manque et on le fait passer par l'override (§4.4), au lieu de le cacher. |
| **`DestinationProfile` réel de la rédaction** | #10 avertit de ne pas supposer un rectangle « article web » universel — la vraie boîte d'embed devrait venir du profil. `lib/newsroom/**` et le parseur de profil sont **hors frontière de fichiers** ici. `resolveTargets` retombe donc sur `CHANNEL_POLICY`, un défaut **documenté**, et le seam (`capture.destination`) est déjà là : c'est un champ à remplir, pas un design à faire. |
| **`renderedTitle` extrait du rendu** | La capture mesure des boîtes, elle ne lit pas de texte. Sans lui, le détecteur `title-takeaway-divergence` de la voie humaine ne se déclenche jamais dans la boucle. Une extraction de texte à la capture est une modification de `lib/verify/capture.ts` qui mérite ses propres tests de rendu réel. |
| **`interactionResults`** | Les moteurs ont déjà leurs scripts d'interaction (`snap-tooltip-viewport.mjs`, …). Le champ existe et part **vide** plutôt que faussement rempli — R6 de la tranche précédente, inchangé. |
| **L'invariant `approved ⇒ preview` au manifeste** | Toujours R9 : trois tests de `lib/loop` posent `approved` à la main. Ils sont dans ma frontière cette fois, mais leur sujet est `gateStateOf`, pas l'approbation : les réécrire pour traverser une chaîne complète les rendrait moins lisibles sans rien prouver de plus. La porte reste à l'écrivain (`approveElement`) **et** à `deliver()`. |
| **`capture` d'un Datawrapper hébergé** | Pas de livrable local ; et aucun moteur DW n'est `LOOP_BUILDABLE` aujourd'hui, donc l'état n'est pas atteignable par la boucle. |

---

## 8. La preuve

`lib/host/journey.test.ts` est étendu : le même parcours `init → … → deliver`, **uniquement par
appels CLI engendrés**, passe désormais par `advance`(capture) → `advance`(review) →
`advance`(preview) → `approve` → `advance`(deliver). Et il prouve **le refus** : à l'étape où la
livraison est demandée mais rien n'est approuvé, un `advance` conduit `capture`, pas `deliver` —
et un `deliver` forcé (l'élément approuvé retiré) est refusé par `deliver()` lui-même. Publieur
`zip`, hors-ligne, aucune créance.

Une capture RÉELLE est mesurée et rapportée : le `static.png` produit par la boucle à
article-web, lu par son IHDR, contre la taille que le canal publie.

---

## 9. Risques assumés

*(écrits après implémentation, chacun avec son ruling.)*

| # | Résidu constaté | Ruling |
|---|---|---|
| R1 | **La chaîne ne se déclenche que sous une livraison demandée.** Un élément produit que personne ne demande à publier n'est jamais capturé ni revu — `nextActions` répond `show`, exactement comme avant. | **Voulu, et contraint par une mesure.** `lib/source/wiring-proof.test.ts:128` asserte `["show"]` pour ce cas et il est **hors frontière de fichiers**. Poser la chaîne au-dessus de `show` casserait un test que je n'ai pas le droit de réparer. Éditorialement c'est aussi le bon endroit : la vérification porte sur ce qui va sortir. Un run qui ne publie rien ne publie rien. |
| R2 | **`approved ⇒ preview` n'est toujours pas un invariant du manifeste.** Un `approved` écrit à la main court-circuite la chaîne (`approvalCovers` répond en tête de cascade), et **plusieurs tests de `lib/loop` en déclarent un** pour rester sur leur propre sujet. | **Assumé, hérité (R9 de la tranche Verify), et resserré quand même.** La porte est désormais à DEUX endroits, pas un : `approveElement` (le seul écrivain) et `deliver()` (inconditionnel). Ce qui reste ouvert est un manifeste édité à la main — que `SKILL.md` interdit déjà et qu'`init` a rendu inutile. L'invariant complet reste écrivable le jour où les trois tests `gate-state` traverseront la vraie chaîne ; leur sujet est `gateStateOf`, pas l'approbation, et les réécrire les rendrait moins lisibles sans rien prouver de plus. |
| R3 | **Une vidéo ne peut sortir que par un override explicite** du finding `no-capture`. | **Voulu** (§4.4). Les deux alternatives sont pires : bloquer pour toujours, ou publier sans porte. Ici le manque est **nommé** (`capture.unsupported` porte la raison du verbe, elle devient l'`evidence` du finding) et il faut une phrase écrite par un humain pour passer outre. Le jour où l'extraction de frame entre dans `lib/`, la ligne disparaît d'elle-même. |
| R4 | **`SPLASH_NO_VIEWER=1` rend `path-printed` atteignable partout.** Un hôte peut le poser et ne rien montrer du tout. | **Assumé, et c'est la limite de ce qu'un contrat JSON peut prouver.** La raison du repli est écrite par la colonne vertébrale, jamais fournie par l'hôte ; les dents qui restent sont les octets et le genre du fichier. Aucune machine ne peut prouver que des yeux ont touché des pixels — le record dit ce que la machine a fait, et rien de plus. |
| R5 | **`DestinationProfile` n'est jamais rempli** : `resolveTargets` retombe toujours sur `CHANNEL_POLICY`, donc l'avertissement de #10 (« pas de rectangle article-web universel ») n'est pas fermé. | **Déféré, hors frontière.** La vraie boîte d'embed vit dans `NEWSROOM-PROFILE.md` et son parseur (`lib/newsroom/**`, `skills/**`) — interdits ici. Le seam existe et est testé (`capture.destination`) : c'est un champ à remplir, pas un design à faire. |
| R6 | **`renderedTitle` n'est pas extrait du rendu**, donc le détecteur `title-takeaway-divergence` de la voie humaine ne se déclenche jamais dans la boucle. | **Déféré, honnêtement typé.** La capture mesure des boîtes, elle ne lit pas de texte. L'ajouter change `lib/verify/capture.ts` et mérite ses propres tests de rendu réel. Le champ est **absent** plutôt que faussement rempli. |
| R7 | **`interactionResults` part vide** : le critère « interaction » de la rubrique n'est jamais vérifié mécaniquement. | **Déféré** (R6 de la tranche précédente, inchangé). Les moteurs ont leurs scripts d'interaction ; les ré-héberger dans `lib/` est une tranche. Vide plutôt que faux. |
| R8 | **`lib/loop/approve.ts` et `lib/host/drive.ts` importent `skills/splash/src`** (le vérificateur Ed25519, le parseur de profil). | **Assumé, délibéré.** Le précédent existe (`lib/newsroom/decor.ts` importe déjà `brand-profile`), et l'alternative — réécrire la crypto et le format de payload dans `lib/` — serait exactement le « second concept d'approbation » que la consigne interdit. Réutiliser le vérificateur existant est ce qui garantit que l'éditeur signe toujours avec le même script. |
| R9 | **`preview` lance un vrai visualiseur pendant `advance`.** Un hôte qui boucle sur `advance` en aveugle ouvrira une fenêtre par élément. | **Voulu** — c'est littéralement la demande de #3 (« automatically opened or visibly embedded before Splash asks "ship it?" ») sur une machine de journaliste. Un hôte agentique pose `SPLASH_NO_VIEWER=1` et présente lui-même. |
| R10 | **La politique de signature est lue à la racine de l'INSTALL**, pas du run. Un hôte qui conduit les runs de deux rédactions depuis un même install leur applique une seule politique. | **Assumé, inchangé.** C'est exactement ce que `deliver()` fait déjà pour `requiredSigners` — une seule source, sinon la porte qui écrit l'approbation et la porte qui publie pourraient exiger des signataires différents. Un install par rédaction est le modèle local-first du produit. |
| R11 | **Tout bloquant est overridable.** #11 dit *« If policy permits an override »* ; ici la politique permet toujours, pourvu qu'il y ait une raison et un acteur. | **Assumé.** Une liste de findings non-overridables serait une politique de rédaction, pas une règle de code — et un blocage sans issue rendrait un run autonome impossible. Ce que le code garantit est la **trace** : id, raison, acteur, instant, octets, provenance, dans un document sur disque, qui tombe à la re-production. |
| R12 | **La vérification n'est pas exécutée sur le chemin `revise`** autrement que par la péremption de provenance. | **Correct par construction, noté quand même.** Toute re-confirmation d'angle déplace `provenanceHash`, donc capture/review/approbation tombent ensemble et la cascade repart sur `produce`. Il n'y a rien à câbler ; la propriété est testée (`manifest.test.ts`). |
| R13 | **Le document de sign-off est écrit AVANT que le manifeste soit persisté.** Si `writeManifest` échouait ensuite (disque plein, run en lecture seule), il resterait un `signoffs/<id>.json` que rien ne référence. | **Assumé, fenêtre étroite et inoffensive.** `approveElement` produit exactement la forme que `assertInvariants` accepte, donc le seul échec possible est un problème de disque — et un document orphelin n'est lu par personne (`approved.signoffPath` n'existe pas). L'inverse — persister l'approbation puis échouer à écrire sa preuve — serait le mauvais sens. Le corriger vraiment demanderait de sortir l'écriture de `approve()` vers l'appelant, ce qui casserait la symétrie avec les autres décisions de `lib/host/drive.ts`. |

---

## 10. Contraintes globales

- Runtime **Bun**. Tests `bun:test`, **TDD** (test rouge d'abord, exécuté, vu échouer).
- Invariants du contrat de verbes tenus : I1 jamais de `throw` au bord · I2 payload neutre ·
  I5 aucun `process.env` **dans `lib/verify` ni dans les verbes** (le présentateur de préview vit
  dans `lib/loop`, la couche qui lit déjà l'environnement — `lib/loop/deliver.ts`).
- `lib/verify` continue de n'importer que `lib/core`.
- Aucun mock d'un vrai seam : la capture ouvre un vrai fichier rendu, la signature est une vraie
  Ed25519, le publieur `zip` écrit une vraie archive.
- Code, commentaires, identifiants : **anglais**. Aucune mention vendor dans un artefact commité.
</content>
</invoke>
