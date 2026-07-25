# Spec — Livraison (publisher adapters : la destination, pas le packaging)

> **Statut :** design validé (brainstorming, 2026-07-25). Prêt pour → writing-plans (sur **L1** seulement).
> **Parent :** `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §4, ligne « Livraison ».
> Amont direct : `2026-07-24-preflight-setup-design.md` (décision 4 — *Préflight déclare la livraison, Livraison l'implémente*), `2026-07-24-verb-contract-adapters-design.md` (le verbe `publish`, déclaré sans corps), `2026-07-24-run-manifest-resume-design.md` (le slot dormant `delivery`), `2026-07-19-cloudflare-pages-embed-adapter-design.md` (l'unique adapter déjà mesuré live).
> **Issue Tom :** **#4** — « Make newsroom embeds the default delivery and replace source-code export with a portable package ».
> **Portée :** ce spec conçoit **toute l'interface de livraison** (§3) — une interface provider-neutre ne se conçoit pas à moitié. Elle se réalise en **trois tranches** : **L1** (§4, la couture + les deux adapters prouvables — le plan d'implémentation suit), **L2** (§5, S3-compatible), **L3** (§6, We.Publish + Fly).
> **Branche :** `feat/delivery-publishers` off `feat/preflight-setup` (worktree `splash-delivery`).
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Problème (constaté dans le code, pas déduit)

L'issue #4 nomme le défaut : *« Source code is not a useful journalist delivery mechanic. »* Le menu
de livraison actuel (`skills/splash/scripts/export-code.mjs:505-584`) demande au journaliste de
trancher entre **un bundle React**, **un HTML autonome** et **un embed hébergé**. C'est une question
de **packaging technique** posée à quelqu'un dont le métier n'est pas le packaging, et elle rejette
l'hébergement d'embed en branche optionnelle tardive alors que l'embed devrait être le défaut d'une
rédaction.

Quatre constats vérifiés dans l'arbre :

- **Le choix porte sur la mauvaise chose.** Les trois formes offertes sont trois *représentations du
  même artefact*, pas trois *destinations*. Le journaliste n'a aucun moyen de dire « ça part dans mon
  CMS ».
- **Un seul chemin de publication existe, et il est câblé en dur.** `deploy-embed.mjs` parle
  directement à Cloudflare Pages (`skills/splash/src/cloudflare-pages.ts`). Il n'y a pas d'interface :
  ajouter un publisher voudrait dire écrire un second script de bout en bout.
- **Le verbe existe mais n'a pas de corps.** `lib/core/verbs/index.ts:46` refuse `publish` avec
  `not-implemented`. La coquille neuve **ne peut pas livrer du tout**.
- **Le décor sait déjà déclarer des publishers, et n'en a qu'un.**
  `lib/newsroom/capabilities.ts` porte `embed-cloudflare` (`implemented: true`) et
  `embed-cms`/`embed-s3`/`embed-fly` (`implemented: false`) — les entrées que ce sous-projet remplit,
  exactement comme la décision 4 du Préflight l'a écrit.

**Donc Livraison n'est pas « ajouter des hébergeurs ». C'est faire exister la destination comme
objet de premier ordre** — une interface provider-neutre, un verbe qui la dispatche, un état qui sait
ce qui est publié et si ça correspond encore à ce que le journaliste regarde.

---

## 2. Décisions verrouillées (brainstorming 2026-07-25)

1. **Domicile : le substrat seul.** Livraison implémente le verbe `publish` + `lib/loop/deliver.ts`.
   `export-code.mjs` garde son menu a/b/c **tel quel** et mourra avec la coquille legacy. Même
   raisonnement que la décision 2 du Préflight : on ne rebâtit pas dans la coquille qu'on remplace.
2. **Le gate change de nature, il ne disparaît pas — « destination, pas packaging ».** Le P1 du
   spec-parapluie (*l'outil offre, le journaliste décide*) et la décision verrouillée du 2026-07-10
   (*gate de forme non-skippable*) sont tenus : on demande **où ça va**, avec le publisher configuré
   pré-sélectionné et annoncé, et le ZIP toujours offert en alternative. On ne demande plus quel
   *emballage*.
3. **Le bundle React sort du flux journaliste.** `skills/splash/scripts/bundle-source.mjs` reste et
   reste atteignable à la main — c'est un outil développeur, il ne s'offre plus dans le parcours.
   Renverse la part « forme 1 = bundle React » de la décision verrouillée du 2026-07-10.
4. **`zip` est un publisher comme un autre**, pas un cas spécial : il publie vers le disque. C'est ce
   qui garantit qu'il n'existe **qu'un seul chemin de livraison**.
5. **Le profil de livraison est minimal et extensible par adapter.** Le décor porte trois choses
   transverses (publisher choisi · gabarit de snippet · règles de taille) ; tout le reste est déclaré
   **par** l'adapter via `settingsFields`. Aucun champ générique sans lecteur.
6. **Publier exige un artefact frais, rien de plus par défaut.** Le sign-off humain reste **opt-in**
   (`requiredSigners` du profil → refus sans signature, la sémantique S4d actuelle). Motivation :
   `review`/`approved` sont des slots dormants du sous-projet Verify ; exiger `approved` rendrait la
   Livraison inatteignable et non prouvable.
7. **Les credentials sont injectés par l'appelant**, jamais lus de l'ambiant par le contrat (I5).
   Même pattern que `readiness(capabilities, state, env)` du Préflight et que `channel`
   (« defaulting is the caller's policy »).
8. **Le ZIP emballe l'artefact tel qu'il sort.** La lettre de #4 (« clean separate files rather than
   forcing one huge inlined HTML file ») **n'est pas satisfaite** : produire un build non-inliné
   toucherait les producteurs et créerait une 2ᵉ forme d'artefact à garder verte. Assumé, réouvrable.

---

## 3. L'interface de livraison (conçue une fois, sert les trois tranches)

### 3.1 Le registry provider-neutre

Miroir exact de ce que le contrat de verbes a fait pour `render` : le registry vit dans `lib/core`
(pour que le verbe le lise sans inverser la flèche de dépendance — jumeau de `lib/core/registry.ts`),
les adapters vivent ailleurs, une composition root les enregistre une fois.

```ts
// lib/core/publishers.ts
export type DeliveryMetadata = {
  title: string;
  altText: string;          // WCAG 1.1.1 — le refus des moteurs ne doit pas se perdre à l'emballage
  source: string;
  credit: string;
  lang: string;             // BCP-47 : la langue du CONTENU (NEWSROOM-PROFILE.md), pas de l'interface
  width?: number;
  height?: number | "responsive";
};

export type PublishRequest = {
  artifactPath: string;                  // I7 : un chemin, jamais des bytes
  id: string;                            // slug source ; contrôlé avant toute résolution de chemin
  metadata: DeliveryMetadata;
  settings: Record<string, string>;      // NON-secrets, depuis newsroom.json
  credentials: Record<string, string>;   // résolus par l'appelant — jamais lus de l'ambiant (I5)
  outDir: string;                        // là où un publisher "package" dépose son fichier
};

export type PublishOutcome = {
  publisherId: string;
  kind: "hosted" | "package";
  url?: string;                          // hébergé
  path?: string;                         // paquet possédé
  snippet: string;                       // rendu depuis le gabarit du profil
  publishedAt: string;
};

export interface Publisher {
  id: string;                            // = l'id de capacité du décor ("embed-cloudflare", "zip", …)
  kind: "hosted" | "package";
  implemented: boolean;
  publish(req: PublishRequest): Promise<VerbResult<PublishOutcome>>;
}

export function registerPublisher(p: Publisher): void;
export function lookupPublisher(id: string): Publisher | undefined;
```

**Le critère de qualité de cette interface : un adapter = un fichier + une ligne de registry.** Si un
adapter de L2/L3 exige de toucher autre chose, c'est un finding qui reforme le §3 avant d'aller plus
loin.

### 3.2 Le verbe `publish`

`lib/core/verbs/publish.ts` — corps du verbe, sous les mêmes invariants que `render` :

- **I1 (ne throw jamais)** : un adapter qui throw devient `engine-failed` ; la garde est structurelle
  au point de dispatch, pas un audit de chaque adapter.
- **I3 (opacité)** : `settings`/`credentials` sont des sacs de chaînes ; le contrat n'interprète que
  la forme, jamais le sens — c'est l'adapter qui sait ce dont il a besoin.
- **I5 (zéro ambiant)** : aucune lecture de `process.env`.
- **I6 (sérialisable)** : requête et résultat traversent `JSON.parse(JSON.stringify(x))` sans perte.
- **I7 (chemins, jamais des bytes)** : un ZIP de 4 Mo ne traverse pas le JSON de la façade.

**Un seul** code d'erreur s'ajoute à `VERB_ERROR_CODES` : **`unknown-publisher`** (aucun adapter sous
cet id). Un publisher déclaré sans corps réutilise **`not-implemented`**, qui existe déjà et porte
exactement ce sens. Dans les deux cas le refus tombe **avant toute I/O**.

`lib/core/verbs/index.ts` sort `publish` de sa branche « declared but no implementation ».

### 3.3 Les adapters

| Adapter | `kind` | Tranche | Preuve |
|---|---|---|---|
| `embed-cloudflare` | hosted | **L1** | live — déjà mesuré (spec 2026-07-19) |
| `zip` | package | **L1** | 100 % hors-ligne |
| `embed-s3` | hosted | **L2** | live (R2 / MinIO / bucket réel) |
| `embed-cms` (We.Publish) | hosted | **L3** | écrit contre l'API documentée, **preuve live déférée** |
| `embed-fly` | hosted | **L3** | écrit contre l'API documentée, **preuve live déférée** |

**`embed-cloudflare` est un hoist, pas une réécriture.** `skills/splash/src/cloudflare-pages.ts`
porte dix faits mesurés contre l'API live (l'alias qu'il ne faut jamais construire, les ~100 s de
provisionnement à froid, la normalisation lossy des accents, le `per_page` qui renvoie une liste vide
avec `success: true`). Il se déplace vers `lib/delivery/adapters/cloudflare-pages.ts`, l'ancien module
**ré-exportant** — geste de B1 avec `vocabulary.ts` et du hoist de Préflight. `deploy-embed.mjs`
legacy continue de marcher sans une ligne de changement, et sa suite de tests est le filet.

**`zip` emballe l'artefact tel qu'il sort** (décision 8), dans une archive aux **bytes
déterministes** (mtime épinglée → deux runs donnent le même sha256, donc un golden testable) :

```
<id>.zip
├── index.html        l'artefact auto-contenu, tel que produit
├── EMBED.txt         le snippet rendu depuis le gabarit du profil
├── README.md         instructions d'intégration, dans la langue de CONTENU
└── metadata.json     title · altText · source · credit · lang · id · width/height
```

Dépendance : **`fflate`** (pur JS, sans dépendance transitive) plutôt que le binaire `zip` du
système, absent de Windows — l'installeur est cross-platform.

### 3.4 Le snippet et la taille

`lib/delivery/snippet.ts`, **pur, aucune I/O** : rend le gabarit du profil avec les placeholders
`{url}` `{title}` `{id}` `{width}` `{height}`. Un placeholder inconnu est un **refus explicite** — un
`{width}` laissé tel quel dans du HTML publié est un défaut invisible depuis Splash et visible par le
lecteur. Les règles de taille (max-width, hauteur fixe ou responsive) viennent du profil et
alimentent `{width}`/`{height}`.

Sans gabarit configuré, un `<iframe>` par défaut est rendu — une rédaction qui n'a rien configuré
reçoit quelque chose qui marche, pas un refus.

### 3.5 La métadonnée

`lib/delivery/metadata.ts` dérive `DeliveryMetadata` de l'élément et du profil, sans rien inventer :
titre ← `angle.confirmedTakeaway` · `altText` ← `angle.altInsight` · source / crédit / langue ←
`NEWSROOM-PROFILE.md`. `altText` est **requis** par le type : le refus WCAG que les moteurs
appliquent déjà à la production ne peut pas se perdre à l'emballage.

### 3.6 Le décor (ce que Préflight porte, et rien de plus)

Préflight reste propriétaire du décor. Livraison y ajoute le strict minimum (décision 5) :

- `newsroom.json` : `publisher?` (**existe déjà**) + `delivery?: { snippetTemplate?: string;
  maxWidth?: number; height?: number | "responsive" }`. Champs optionnels ⇒ pas de bump de
  `schemaVersion` du décor ; un état écrit par la version d'avant reste lisible.
- `lib/newsroom/capabilities.ts` : `zip` ajouté (`kind: "delivery"`, `env: []`, aucune clé — donc
  toujours prêt, ce qui en fait un repli réellement universel) ; `embed-s3` / `embed-cms` /
  `embed-fly` reçoivent leurs `settingsFields` **au moment de leur tranche**, pas avant.
- Les identifiants **non-secrets** d'un publisher vivent dans `capabilities[id].settings` ; ses
  secrets restent dans `.env`. L'invariant du Préflight (« aucune valeur de `.env` n'atterrit dans
  `newsroom.json` ») continue de valoir, testé.

### 3.7 L'état du run

Le slot `delivery` du `RunManifest` **garde ses noms** (`requested` / `delivered` — ils portaient
déjà l'intention) ; seul le type de `delivered` change, donc **`schemaVersion` 2→3** + une entrée de
`lib/loop/migrate.ts`.

```ts
delivery?: {
  requested: string[];                 // les publisher ids que le JOURNALISTE a choisis
  delivered: {
    publisherId: string;
    kind: "hosted" | "package";
    url?: string;
    artifact?: { path: string; sha256: string };
    snippet: string;
    publishedAt: string;
    deliveredProvenanceHash: string;   // ← ce qui rend le système honnête
  }[];
};
```

**Migration 2→3 :** le slot était **dormant** — aucun chemin live ne l'a jamais écrit. La migration
le **supprime** s'il est présent (un `delivered: HashRef[]` de l'ancienne forme ne porte ni
publisher ni provenance : il n'y a rien à convertir honnêtement). Écrit ici pour que ce ne soit pas
une perte silencieuse.

**`deliveredProvenanceHash` est la pièce maîtresse.** Exactement comme `review` et `approved`, une
livraison **n'hérite jamais** d'un changement de provenance. Réviser l'emphase après publication fait
retomber `gateStateOf` de `delivered` à `stale` : l'état dit *« publié, mais ce qui est en ligne
n'est plus ce que tu regardes »*. Republier écrase **le même lien** (l'alias Cloudflare est dérivé du
slug + digest de l'id, donc déterministe) : le « Rouvre — vivant, même lien » du parcours est obtenu
par la provenance, pas par une feature dédiée.

`gateStateOf` répond `delivered` quand **au moins une** entrée de `delivered` porte la provenance
courante.

### 3.8 Le step `deliver`

`lib/loop/deliver.ts` — **le seul module qui touche `.env`** (décision 7 : il est l'appelant qui
résout les credentials, le contrat ne les lit jamais).

`deliver` est **déclenché par une décision**, jamais auto-avancé : symétrique de `proposal.chosenId`.
Le journaliste pose `requested` (la destination), et alors seulement `nextActions` répond
`["deliver"]`. Un artefact frais sans `requested` reste sur `show`. `NextAction` gagne `"deliver"`.

Séquence : pré-conditions → résolution destination + settings + credentials depuis le décor →
`runVerb("publish", payload)` → écriture de l'entrée `delivered`. Un refus n'écrit **rien** dans
`delivered` et laisse un `RunEvent` de type `failure`.

### 3.9 Flux de données

```
artefact frais
  → le journaliste choisit la DESTINATION (publisher configuré pré-sélectionné + zip toujours offert)
  → manifest(delivery.requested)
  → deliver : décor → { settings, credentials } → runVerb("publish")
  → adapter : upload / emballage → vérification → PublishOutcome
  → manifest(delivery.delivered[] + deliveredProvenanceHash)
  → MONTRE le lien / le chemin + le snippet
  → le journaliste révise l'angle → provenance change → gate retombe à `stale`
  → produce → deliver (même publisher, même id) → MÊME LIEN, contenu à jour
```

### 3.10 Erreurs et off-ramps (first-class)

| Situation | Réponse |
|---|---|
| Publisher inconnu | `unknown-publisher`, aucune I/O |
| Publisher déclaré non implémenté | `not-implemented`, aucune I/O — la 2ᵉ morsure du décor (Préflight §3.4) |
| Capacité non prête (clé absente) | refus qui **nomme la variable et où l'obtenir**, jamais sa valeur |
| Artefact `stale` | refus : on ne publie jamais du périmé |
| `requiredSigners` posé, artefact non signé | refus — sémantique S4d préservée, opt-in |
| Upload 200 mais mauvais bytes servis | **aucun `delivered` écrit** — la preuve est la vérification des bytes servis (`verifyServed`), jamais un code HTTP |
| Réseau injoignable | refus borné et actionnable, run intact, rien de partiellement déployé |

**Invariant secret, testé et non documentaire** (jumeau de celui du Préflight) : aucune valeur de
credential n'apparaît dans le manifest sérialisé, un `RunEvent`, un `VerbResult`, le ZIP, son README,
son `metadata.json` ou le snippet rendu.

**Déféré explicitement :** dépublier / rétention / rollback. L'API Cloudflare l'autorise
(suppression d'un déploiement aliasé sous `?force=true`, mesuré au spike du 2026-07-19), mais aucun
beat du parcours ne le demande encore.

---

## 4. L1 — la couture + les deux prouvables *(la tranche actionnable)*

### 4.1 Objectif

Faire exister la destination comme objet de premier ordre, prouvée sur les **deux familles
opposées** — hébergé (`embed-cloudflare`) et fichier possédé (`zip`). C'est ce contraste qui teste
réellement l'interface : si elle tient un upload distant vérifié **et** un emballage local
déterministe sans champ de circonstance, un 3ᵉ adapter n'est plus qu'un fichier.

### 4.2 Scope

**DANS :** `lib/core/publishers.ts` · `lib/core/verbs/publish.ts` + les 2 codes d'erreur ·
`lib/delivery/` (adapters `cloudflare-pages` hissé + `zip`, `snippet.ts`, `metadata.ts`, composition
root) · le slot `delivery` réel + migration 2→3 + `deliver` dans `NextAction`/`gateStateOf` ·
`lib/loop/deliver.ts` · `zip` dans les capacités du décor + les 3 champs de `newsroom.json`.

**HORS :** l'adapter S3 (**L2**) · We.Publish et Fly (**L3**) · le menu a/b/c legacy d'`export-code.mjs`
(décision 1) · un build non-inliné (décision 8) · dépublier / rétention (§3.10) · exiger `approved`
(décision 6 — sous-projet Verify) · l'interface de choix de destination côté agent (c'est de la prose
d'orchestration, pas du code : le step expose `requested`, le SKILL le demande).

### 4.3 Architecture

| Fichier | Responsabilité | État |
|---|---|---|
| `lib/core/publishers.ts` | Registry provider-neutre : `Publisher`, `PublishRequest`, `PublishOutcome`, `registerPublisher`, `lookupPublisher` | créer |
| `lib/core/verbs/publish.ts` | Le corps du verbe : shape-gate, lookup, refus typés, ne throw jamais | créer |
| `lib/core/verbs/types.ts` | `unknown-publisher` rejoint `VERB_ERROR_CODES` | modifier |
| `lib/core/verbs/index.ts` | `publish` sort de la branche `not-implemented` | modifier |
| `lib/delivery/adapters/cloudflare-pages.ts` | **Hissé** de `skills/splash/src/cloudflare-pages.ts`, enveloppé dans l'interface `Publisher` | déplacer |
| `skills/splash/src/cloudflare-pages.ts` | **Ré-exporte** depuis le nouvel emplacement — aucun importateur touché | modifier |
| `lib/delivery/adapters/zip.ts` | Le paquet portable, bytes déterministes | créer |
| `lib/delivery/snippet.ts` | Rendu du gabarit + règles de taille. Pur | créer |
| `lib/delivery/metadata.ts` | `DeliveryMetadata` depuis l'élément + le profil | créer |
| `lib/delivery/index.ts` | Composition root + `PUBLISHERS_REGISTERED` (export-valeur : un import purement à effet de bord est la ligne qu'un futur nettoyage supprime, et l'échec serait un `unknown-publisher` à l'exécution, pas une erreur de compilation) | créer |
| `lib/loop/manifest.ts` | Slot `delivery` réel · `schemaVersion` 3 · `deliver` dans `NextAction` · `gateStateOf` ancré sur `deliveredProvenanceHash` | modifier |
| `lib/loop/migrate.ts` | Migration 2→3 (suppression du slot dormant, §3.7) | modifier |
| `lib/loop/deliver.ts` | Le step : pré-conditions → décor → `runVerb("publish")` → écriture | créer |
| `lib/loop/driver.ts` | La branche `deliver` de `advance` | modifier |
| `lib/newsroom/capabilities.ts` | `zip` ajouté | modifier |
| `lib/newsroom/state.ts` | `delivery?` (3 champs optionnels) sur `NewsroomState` | modifier |

### 4.4 Tests (`bun:test`, TDD — test rouge d'abord)

- **Le filet.** Les suites existantes de `cloudflare-pages` et de `deploy-embed` passent
  **inchangées** après le hoist. C'est la preuve que le déplacement n'a rien perdu (même dispositif
  qu'en B1 avec `adapters.ts` et qu'au hoist du Préflight).
- **Registry** : publisher inconnu → `unknown-publisher` · `implemented: false` → `not-implemented`,
  **aucune I/O** (vérifié par un `outDir` inexistant qui ne doit jamais être touché).
- **Le verbe** : un adapter qui throw devient `engine-failed` (I1 structurel) · payload malformé →
  `invalid-request` · requête et résultat survivent à `JSON.parse(JSON.stringify(x))` (I6) · le
  résultat porte un chemin, jamais des bytes (I7).
- **`zip`** : contenu exact des 4 entrées · **déterminisme** (deux runs → même sha256) ·
  `metadata.json` porte l'`altText` · le README est dans la langue de contenu.
- **`snippet`** : placeholders rendus · placeholder inconnu → refus explicite · responsive vs hauteur
  fixe · gabarit absent → iframe par défaut.
- **`metadata`** : dérivée sans rien inventer · un élément sans `altInsight` ne peut pas produire une
  `DeliveryMetadata` (le refus WCAG survit à l'emballage).
- **`manifest`** : migration 2→3 · réviser après livraison fait retomber `gateStateOf` ·
  `nextActions` avec et sans `requested` · `delivered` multi-entrées (embed **et** ZIP).
- **`deliver`** : les 4 refus (stale · capacité absente · signers · bytes non vérifiés) ·
  **l'invariant secret** (§3.10) · un refus n'écrit rien et laisse un `RunEvent`.
- **e2e live Cloudflare** : un vrai déploiement, URL réellement servie vérifiée (vraies clés, vrais
  échecs — convention projet, aucun mock), même régime réseau que les tests existants de cet adapter.
- **e2e ZIP** : orient → propose → produce → deliver, **100 % hors-ligne**.

### 4.5 Critères de succès

1. Un artefact approuvé part vers la destination enregistrée **sans qu'on demande au journaliste de
   choisir entre du code source et du HTML** — la question porte sur *où*, pas sur *quoi*.
2. Le résultat porte un **snippet d'embed utilisable** (rendu depuis le gabarit de la rédaction) ou
   un **ZIP portable** avec ses instructions d'intégration.
3. Réviser après publication fait **retomber le gate** ; republier met à jour **le même lien**.
4. Un publisher déclaré non implémenté est refusé **avant toute I/O**, jamais offert comme prêt.
5. Aucun credential n'apparaît dans un artefact, un rapport, un log ou l'état — **prouvé par un
   test**, pas par relecture.
6. Ajouter un adapter = **un fichier + une ligne de registry** (le critère du §3.1).
7. `bun run check` vert.

### 4.6 Ce que L1 doit révéler avant qu'on écrive L2/L3

Rôle de-risk de la tranche, à écrire dans ce spec après exécution (comme le §4.9 du Préflight) :

- **L'interface tient-elle les deux familles sans champ de circonstance ?** Si `zip` a exigé un champ
  que seul un publisher local utilise, ou si Cloudflare a exigé une échappatoire hors interface, la
  forme du §3.1 est fausse et L2/L3 doivent la corriger d'abord.
- **La provenance suffit-elle à modéliser « publié puis périmé » ?** Si un artefact publié puis
  révisé produit un état qu'un journaliste lit mal, c'est le modèle d'état qui bouge, pas l'affichage.
- **Le décor porte-t-il un publisher à notion de projet distant ?** Question laissée ouverte par le
  §4.9 du Préflight (lister les projets existants d'un compte plutôt que saisir un identifiant).
  Cloudflare ne l'a pas exigée ; S3 non plus a priori ; **Fly, si**. Réponse attendue en L3.

---

## 5. L2 — S3-compatible *(conçu ici, planifié ensuite)*

`lib/delivery/adapters/s3.ts` : signature **SigV4 en `fetch` pur** (pas d'aws-sdk — même discipline
que le refus de wrangler au spike Cloudflare : pas de CLI, pas d'exigence de runtime Node), `PUT`
d'objet, URL publique dérivée de la configuration de bucket.

Prouvé **live** contre un bucket réel (Cloudflare R2, Scaleway, AWS ou MinIO local) — c'est le
« non-Fly static-host adapter » que l'acceptance criteria d'#4 demande, et il couvre la rédaction qui
héberge déjà chez elle.

Points à mesurer avant d'écrire (le spike d'abord, comme Cloudflare) : le `Content-Type` que le
provider applique par défaut à un `index.html`, sa politique d'accès public (ACL vs policy de bucket
vs domaine attaché), et si l'URL publique est prédictible ou doit être lue en retour.

`settingsFields` attendus : endpoint · région · bucket · préfixe · domaine public (non-secrets) ;
access key id + secret access key (secrets, `.env`).

---

## 6. L3 — We.Publish + Fly *(conçu ici, planifié ensuite)*

**`embed-cms` (We.Publish).** C'est le CMS du livrable bourse (Heidi.news, « extension We.Publish »).
Fait vérifié : We.Publish est un **CMS headless open-source à API GraphQL**, dont le rendu repose sur
un **système de blocs** — un bloc est une structure portant un `__typename` que l'API renvoie dans
une liste ordonnée (`docs.wepublish.ch/developers/website-builder/block-system`). L'adapter publie
donc un **bloc d'embed** dans un article. **La mutation exacte, ses permissions et le type de bloc
utilisable ne sont PAS mesurés** : aucun accès à une instance à ce jour. L'adapter est écrit contre
l'API documentée et reste **`implemented: false` jusqu'à sa preuve live** — donc jamais offert comme
prêt par la readiness. Dette datée du 2026-07-25.

**`embed-fly`.** L'ancien chemin fly a été retiré en juillet 2026 précisément parce que personne
n'avait monté l'infrastructure pour le prouver (spec Cloudflare, §« Why »). Il revient ici comme
**un adapter parmi d'autres, jamais le défaut produit** — ce que l'acceptance criteria d'#4 demande
explicitement (« Fly is optional and replaceable through the same publisher interface »). Même
régime : écrit contre l'API documentée, `implemented: false` jusqu'à preuve live.

Cette tranche répond aussi à la question ouverte du §4.6 (publisher à notion de projet distant).

---

## 7. Risques

| Risque | Réponse |
|---|---|
| Le hoist touche un chemin legacy vivant (`deploy-embed.mjs`) | Ré-export + sa suite de tests inchangée comme filet |
| Un credential fuit dans un artefact publié | Invariant testé (§3.10), pas une convention documentaire |
| CMS / Fly non prouvés live | `implemented: false` → la readiness ne les dit jamais prêts, le gate ne les offre jamais ; dette datée et écrite (§6) |
| Le ZIP reste un HTML inliné (lettre d'#4 non satisfaite) | Assumé par écrit (décision 8) ; réouvrable — c'est un mode de build, pas une refonte |
| `zip` introduit une dépendance | `fflate` (pur JS, sans dépendance transitive) plutôt que le binaire `zip`, absent de Windows |
| Le bump `schemaVersion` 2→3 casse un run existant | Le slot était dormant ; la migration est explicite et testée (§3.7) |
| Un test réseau échoue en CI / hors-ligne | Même régime que les tests réseau existants de l'adapter Cloudflare ; toute la chaîne ZIP se prouve hors-ligne |

---

## 8. Contraintes globales

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD** : test qui échoue avant
  l'implémentation, chaque tâche.
- Code, commentaires, identifiants, noms de fichiers, commits, branches : **anglais**.
- **Aucune mention** vendor dans un artefact commité. Pas de `Co-Authored-By`.
- **Pas de nouveau `any`.** Pas de mock d'API externe (vraies clés, vrais échecs).
- Les invariants du contrat de verbes s'imposent : **I1** (ne throw jamais), **I3** (opacité),
  **I5** (zéro ambiant), **I6** (sérialisable), **I7** (chemins, jamais des bytes).
- L'invariant du Préflight tient : **aucune valeur de `.env` n'atterrit dans `newsroom.json`.**
- Gate `bun run check` vert avant chaque commit.
- Branche `feat/delivery-publishers` off `feat/preflight-setup` (worktree `splash-delivery`).

---

## 9. Hors scope — et ce qu'on répond à Tom (#4)

| Demandé | Décision | Raison |
|---|---|---|
| « Replace the journalist-facing delivery menu » | **Fait dans le substrat, pas dans le legacy** | Le menu a/b/c vit dans `export-code.mjs`, la coquille qu'on remplace (issue #8). Livraison construit le chemin neuf ; le legacy meurt avec sa coquille (décision 1). |
| « Remove React/source-code bundles from the journalist delivery flow » | **Fait** | `bundle-source.mjs` reste atteignable à la main comme outil développeur, et ne s'offre plus dans le parcours (décision 3). |
| ZIP « clean separate files rather than one huge inlined HTML » | **Partiel, assumé** | Le ZIP porte 4 fichiers propres, mais `index.html` reste l'artefact auto-contenu tel que les moteurs le produisent. Un build non-inliné toucherait tous les producteurs et créerait une 2ᵉ forme d'artefact à garder verte (décision 8). Réouvrable si une rédaction bute dessus. |
| Le profil de livraison complet (~10 familles de réglages) | **Borné** | Trois champs transverses ; tout le reste déclaré par l'adapter via `settingsFields` (décision 5). Aucun champ générique sans lecteur — la leçon du §4.4 du Préflight sur les abstractions non prouvées. |
| « Preflight validates the selected adapter and CMS template before the first production run » | **Partiel** | La readiness du décor refuse déjà un publisher non prêt, et le gate de premier run est conçu en P2 du Préflight. La validation **live** du gabarit CMS suppose une instance : elle arrive avec L3. |
| « Integration tests cover one direct CMS/mock adapter » | **Reformulé** | Pas de mock (convention projet non-négociable). L1 couvre un adapter hébergé **live** et un adapter local **hors-ligne** ; le CMS réel arrive prouvé en L3, pas simulé avant. |
| Dépublier / rétention / rollback | **Déféré** | Mécaniquement possible (mesuré au spike Cloudflare) mais aucun beat du parcours ne le demande (§3.10). |
