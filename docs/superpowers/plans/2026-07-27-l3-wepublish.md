# Plan — L3 : `embed-cms` (We.Publish)

> **Spec :** `docs/superpowers/specs/2026-07-27-l3-wepublish-design.md`
> **Branche :** `feat/l3-wepublish` (worktree `splash-l3`)
> **Baseline :** `cd lib && bun test` → 1254 pass / 11 skip / 0 fail (vérifié avant de commencer).
> **TDD strict** : le test qui échoue d'abord, à chaque tâche. Commit après chaque tâche.
>
> **Fichiers possédés :** `lib/delivery/**`, `lib/newsroom/capabilities.ts`,
> `lib/core/publishers.ts` (**ADD-only**). Tout le reste est hors périmètre.

---

## Tâche 1 — Le corps du message : pur, testable sans réseau

Tout ce que l'adapter sait dire **avant** de parler à quoi que ce soit vit dans des fonctions pures.
C'est ce qui rend les faits mesurés vérifiables sans instance, et c'est la forme que `s3-sign.ts`
a déjà prise en L2.

`lib/delivery/adapters/wepublish-block.ts` :

- `srcdocEscape(doc)` — `&` puis `"`, dans cet ordre (l'inverse double-échappe).
- `ownershipMarker(id)` → `<!-- splash:embed id="<id>" -->`.
- `carriesMarker(html, id)` — le prédicat du refus §4.2.
- `buildBlockHtml({ document, id, title, height })` → marqueur + `<iframe srcdoc>`.
- `carrierSlug(prefix, id)`.

**Tests (`wepublish-block.test.ts`) — écrits d'abord :**
- l'échappement traite `&` avant `"` (`&"` → `&amp;&quot;`, jamais `&amp;quot;`) ;
- un document contenant `</script>`, des accents et des guillemets survit à un aller-retour
  `srcdocEscape` → décodage HTML ;
- `carriesMarker` est vrai pour son id, **faux pour un autre id** (c'est le refus qui compte) ;
- `carriesMarker` est faux sur du HTML de rédaction quelconque ;
- le slug est déterministe et respecte `isSafeId`.

---

## Tâche 2 — Le client GraphQL borné, et W4

`lib/delivery/adapters/wepublish-gql.ts` : une seule fonction `gqlCall`, la **seule** porte réseau
du fichier.

- passe par **`fetchBounded`** (jamais un `fetch` nu) ;
- **W4** : inspecte `errors` **avant** `data` — un HTTP 200 porteur d'`errors` est un échec ;
- **W14** : mesure `Buffer.byteLength(body)` et refuse **avant** l'appel au-dessus de la limite ;
- **W11** : expose le message d'erreur brut pour que l'appelant distingue « not found » du reste ;
- ne throw jamais : renvoie un `VerbResult`.

**Tests — écrits d'abord**, contre un **vrai serveur HTTP local** (`Bun.serve`, pas un mock : le
seam réseau est réel, on lui donne un vrai serveur qui répond des formes mesurées) :
- un 200 + `errors[FORBIDDEN]` est un échec, et le message le dit ;
- un 413 est traduit en refus qui nomme la taille (W14) ;
- un corps au-dessus de la limite est refusé **sans qu'aucune requête ne parte** (le serveur compte
  ses hits : zéro) ;
- un serveur qui ne répond jamais est borné par `timeoutMs` et rend `NetworkTimeoutError`, pas un
  `AbortError` nu ;
- un corps non-JSON dégrade en refus, pas en exception.

---

## Tâche 3 — L'adapter : les refus, avant tout réseau

`lib/delivery/adapters/wepublish.ts`, `implemented: true`, `serves: ["interactive", "scrolly"]`.

Ordre de validation calqué sur `s3.ts` : settings → credentials → `isSafeId` → lecture de
l'artefact → taille (W14) → réseau.

**Tests (`wepublish.test.ts`) — hors ligne, écrits d'abord :**
- chaque setting manquant est nommé, et le refus dit **où** il se configure ;
- un `endpoint` malformé est refusé **comme un problème de config**, pas après un appel ;
- chaque credential manquant est nommé **un par un** — le refus sur l'email ne mentionne jamais le
  mot de passe (la discipline de `s3.ts`) ;
- un `id` non sûr est refusé (défense en profondeur) ;
- un artefact illisible est un refus borné ;
- un artefact au-dessus de W14 est refusé avec la taille **et** la limite dans le message ;
- **aucun de ces refus n'ouvre de socket** ;
- `serves` ne contient ni `static` ni `video`, et le commentaire qui l'explique cite W6.

---

## Tâche 4 — Le chemin réseau contre un faux We.Publish qui rejoue les faits mesurés

Toujours un vrai serveur HTTP (`Bun.serve`) — mais il **rejoue les formes de réponse mesurées au
§3**, y compris les pathologiques. Ce n'est pas un mock du protocole : c'est un serveur qui répond
ce que l'instance réelle a répondu.

**Tests — écrits d'abord :**
- **W10/W12** : un slug déjà présent **avec** le marqueur ⇒ `updateArticle`, pas `createArticle`
  (le serveur enregistre quelle mutation il a reçue) ;
- **§4.2** : un slug déjà présent **sans** le marqueur ⇒ **refus**, et **aucune** mutation d'écriture
  n'est envoyée ;
- **W11** : `Article with slug X was not found.` ⇒ `createArticle` ;
- **W12** : `publishArticle` est bien appelé après l'écriture ;
- **W13** : si la relecture anonyme renvoie un HTML **différent**, c'est un refus (pas un succès) ;
- la relecture est faite **sans en-tête `Authorization`** (le serveur l'assert) ;
- **W7** : aucune mutation ne sélectionne `blocks` (assert sur le corps de la requête reçue) ;
- **W9** : l'`url` du `PublishOutcome` est celle **renvoyée** par le serveur, même si elle ne
  ressemble pas à ce qu'on aurait construit ;
- `snippet` est **absent** de l'outcome (§4.4).

---

## Tâche 5 — Enregistrement, décor, capacité

- `lib/delivery/index.ts` : une ligne dans `DELIVERY_PUBLISHERS`.
- `lib/newsroom/capabilities.ts` : `embed-cms` passe à `implemented: true`, reçoit son `env`,
  son `envHelp` (où la rédaction obtient chaque valeur — **R2** : un utilisateur dédié, pas le
  compte admin d'un humain) et ses `settingsFields`.

**Tests :**
- l'adapter est joignable par `lookupPublisher("embed-cms")` ;
- la capacité et le publisher **s'accordent** sur l'id et sur `implemented` ;
- `deliver()` refuse un `static` vers `embed-cms` avec le message qui nomme le paquet portable
  (comportement existant, verrouillé ici parce que c'est la contrepartie du choix `serves`).

---

## Tâche 6 — La preuve live (opt-in)

`lib/delivery/adapters/wepublish-e2e.test.ts`, `SPLASH_WEPUBLISH_E2E=1`, en-tête documentant la
mise en route complète du §2 (les trois pannes comprises).

**Départ à `produce()`**, canal `article-web`, format `interactive` — jamais une fixture.
`propose` → `produce` → `requestDelivery` → `deliver`, puis relecture anonyme et comparaison
**octet pour octet** avec l'artefact sur disque.

**À exécuter réellement**, et le résultat mesuré (URL, statut, content-type, octets) est reporté.

---

## Tâche 7 — Auto-revue

Relire le diff contre le spec ; vérifier qu'aucun fichier hors périmètre n'est touché ;
`cd lib && bun test` + `bunx tsc --noEmit` (lib **et** `skills/splash`) ; consigner les résidus
dans `## Risques assumés` avec leur arbitrage. Puis **arrêter les conteneurs** et le dire.
