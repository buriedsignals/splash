# Temps borné sur le substrat de livraison

> Passe dédiée, promise deux fois et parquée deux fois (spec `2026-07-25-delivery-publishers-design.md`
> §5.2, résidu `docs/splash/delivery-l2-followups.md` : « Aucun `fetch` n'a de timeout »). Branche
> `feat/bounded-time`, worktree `splash-bounded-time`. Périmètre : `lib/delivery/adapters/**` +
> `lib/core/publishers.ts` (additif seul).

## 1. Le problème

Le contrat des verbes (`lib/core/verbs/types.ts`, invariant I1) dit qu'un publisher ne lance jamais —
il répond toujours un `VerbResult` typé. C'est vrai en **forme**. Ça ne l'était pas en **temps** :
chaque `fetch()` du substrat de livraison attendait une réponse sans borne. Un endpoint qui accepte la
connexion puis reste muet — le cas mesuré de cette passe, un serveur `Bun.serve` dont le handler ne
résout jamais sa promesse — bloque `advance()` indéfiniment, sans message, sans refus.

Aggravation notée au parking : le chemin S3 est le premier que la rédaction pointe vers **sa propre**
machine (MinIO auto-hébergé), potentiellement injoignable — donc la classe est plus atteignable
qu'un simple risque théorique contre un cloud provider.

## 2. Inventaire complet des sites réseau sortants

Balayage de `lib/**` (hors tests) pour tout `fetch(`, `http(s).request`, `WebSocket`, `.connect(` :

| Site | Rôle | Dans le périmètre ? | Traitement |
|---|---|---|---|
| `lib/delivery/adapters/s3.ts:258` | PUT de l'artefact (upload) | oui | `fetchBounded`, budget upload |
| `lib/delivery/adapters/s3.ts:295` | GET anonyme de vérification post-upload (F3) | oui | `fetchBounded`, budget réseau |
| `lib/delivery/adapters/cloudflare-pages.ts:189` (`cf()`) | tout appel à l'API Cloudflare (get/create project, upload-token, check-missing, asset upload, create deployment, list deployments) | oui | `fetchBounded` threadé dans `cf()`, budget réseau par défaut, budget upload pour le seul appel qui porte les octets (`/pages/assets/upload`) |
| `lib/delivery/adapters/cloudflare-pages.ts:368` (`verifyServed`) | GET de vérification des octets servis, dans une boucle de poll propre | oui | `fetchBounded`, budget réseau par tentative — la boucle de poll externe (`COLD_START_WINDOW_MS`) reste inchangée, elle borne le NOMBRE de tentatives, pas une tentative individuelle |
| `lib/delivery/adapters/s3-sign.ts` | signature SigV4 pure, aucune I/O | n/a | rien à faire — confirmé par lecture, zéro appel réseau |
| `lib/delivery/adapters/zip.ts` | publisher "package" — écrit sur disque, jamais le réseau | n/a | rien à faire — confirmé par lecture, zéro `fetch` |
| `lib/newsroom/verify.ts:24,38,58,73` | vérifie les clés Datawrapper / Anthropic à la configuration | **hors périmètre** | `lib/newsroom/**` est explicitement dans la liste "Do NOT touch" de cette tranche — trouvé, non touché, à signaler comme suite (même classe, même remède, autre sous-projet) |

La classe est donc fermée à l'intérieur du périmètre confié : les deux adapters cités au parking
(`s3.ts`, `cloudflare-pages.ts`) et rien d'autre n'y manquait. `lib/newsroom/verify.ts` est la même
classe mais explicitement hors-scope de cette tranche (limite de fichiers de la tâche) — reporté tel
quel, pas absorbé.

## 3. Le modèle de timeout choisi

### 3.1 Un seul mécanisme, un seul endroit

`lib/core/publishers.ts` — déjà le point commun des trois adapters via `artifactMediaFor` et
`deliveryGenreFor` (le fichier porte déjà le commentaire "ce codebase s'est déjà fait mordre deux fois
par deux registres du même fait qui divergent"). Ajouts, additifs uniquement :

```ts
export const DEFAULT_NETWORK_TIMEOUT_MS = 20_000;   // appels de contrôle : métadonnée, vérification
export const DEFAULT_UPLOAD_TIMEOUT_MS = 120_000;   // appels qui portent les octets de l'artefact

export class NetworkTimeoutError extends Error { readonly url: string; readonly timeoutMs: number; }

export async function fetchBounded(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_NETWORK_TIMEOUT_MS,
): Promise<Response>;
```

`fetchBounded` arme un `AbortController` avec `setTimeout(timeoutMs)`, l'attache à `init.signal`,
et — SEULE transformation — traduit un `AbortError` en `NetworkTimeoutError` dont le message nomme
l'endpoint, la durée attendue, et ce qu'il faut vérifier :

> `no response from <url> within <N>s — check the endpoint is reachable, or pass a longer timeoutMs
> if this call carries a large upload over a slow connection`

Chaque adapter continue de faire ce qu'il faisait déjà : envelopper son `fetch` dans un `try/catch`
et traduire `(e as Error).message` dans son propre `fail("engine-failed", …)`. Aucun adapter n'a eu
besoin d'un nouveau `VerbErrorCode` (`lib/core/verbs/types.ts` est hors périmètre de toute façon) —
le message de `NetworkTimeoutError` traverse tel quel le message de refus existant, qui nommait déjà
l'endpoint (`s3: PUT ${key} to ${req.settings.endpoint} failed: …`,
`s3: uploaded ${key} but verifying ${url} failed: …`) : le refus final nomme donc l'endpoint DEUX
fois (celui de l'adapter, celui du timeout), jamais zéro fois, et jamais une `AbortError` générique
brute.

### 3.2 Un flat timeout est honnête — à condition d'avoir deux budgets

Un timeout mur-à-mur (armé une fois, jamais réarmé sur progression d'octets) est honnête pour un
appel de contrôle (quelques centaines d'octets, latence réseau dominante). Il est **malhonnête**
appliqué au même budget pour un PUT qui porte l'artefact produit — une vidéo Remotion de plusieurs
dizaines de Mo sur l'uplink d'une rédaction peut légitimement prendre plus que 20s, sans que
l'endpoint soit pour autant "accroché". `AbortController` + `setTimeout` n'offre pas nativement de
timeout d'inactivité (pas de "reset sur réception d'un octet") sans ajouter un suivi de flux — hors
scope pour fermer une classe qui aujourd'hui n'a AUCUN budget. Le choix retenu : **deux constantes**,
pas un timeout unique — `DEFAULT_NETWORK_TIMEOUT_MS` (20s) pour tout appel de contrôle, et
`DEFAULT_UPLOAD_TIMEOUT_MS` (120s) réservé aux DEUX appels qui transmettent réellement les octets de
l'artefact (`s3.ts` PUT, le `/pages/assets/upload` de Cloudflare) — le troisième paramètre de
`fetchBounded` (et le nouveau paramètre de `cf()`) est le point d'override par-appel demandé par la
tâche, exercé aujourd'hui exactement à ces deux endroits.

### 3.3 Les boucles de poll de `cloudflare-pages.ts` restent inchangées dans leur logique

`resolveAliasUrl` et `verifyServed` bornent déjà le NOMBRE de tentatives via `COLD_START_WINDOW_MS`
(200s, mesuré — provisionnement DNS d'un projet neuf) — ce mécanisme n'est pas touché. Le trou était
qu'une tentative individuelle, elle, pouvait ne jamais revenir : `while (Date.now() < deadline)`
ne se ré-évalue jamais tant qu'on est bloqué dans un `await fetch` qui ne répond ni ne rejette. Border
chaque tentative avec `fetchBounded` restaure l'invariant que la boucle prétendait déjà tenir : le
`catch` existant de `verifyServed` absorbe déjà toute erreur de tentative et retente — il absorbe
maintenant aussi `NetworkTimeoutError` de la même façon qu'il absorbait un `ECONNREFUSED`, sans
changement de code dans la boucle elle-même au-delà du remplacement `fetch` → `fetchBounded`.

## 4. Les défauts, en un mot

- `DEFAULT_NETWORK_TIMEOUT_MS = 20_000` — tout appel de contrôle (les deux GET de vérification, tous
  les appels `cf()` sauf l'upload d'octets).
- `DEFAULT_UPLOAD_TIMEOUT_MS = 120_000` — le PUT S3 et l'upload d'assets Cloudflare, les deux seuls
  appels qui portent les octets produits.

Pas de troisième couche de configuration (pas de `settings.timeoutMs` newsroom) : la tâche demande
un mécanisme et un override PAR APPEL, pas une nouvelle surface de configuration rédaction — en
ajouter une aurait été hors-scope et aurait rouvert le risque "deux registres du même fait" que ce
fichier existe déjà pour éviter. Si un opérateur réel bute sur `DEFAULT_UPLOAD_TIMEOUT_MS`, le point
d'extension est le paramètre déjà là, pas un nouveau canal — suite documentée en Risques assumés.

## 5. Preuve

`lib/core/publishers.test.ts` — un serveur `Bun.serve` réel dont le handler ne résout jamais sa
promesse (accepte la connexion, ne répond jamais). Le test assert que `fetchBounded` refuse en
`NetworkTimeoutError` DANS la fenêtre bornée (pas juste "un jour"), pas qu'il hangue. C'est la preuve
demandée — un timeout qu'aucun test ne déclenche est une intention, pas un comportement.

Même discipline reproduite au niveau adapter, contre de vrais serveurs `Bun.serve` accrochés — pas
un clock mocké — pour les quatre sites du tableau §2 qui étaient réellement atteignables hors-ligne :
`s3.test.ts` (PUT hors budget upload, GET de vérification hors budget réseau — deux serveurs
distincts, endpoint et publicBaseUrl séparés, pour reproduire le cas réaliste où l'un répond et
l'autre pas) et `cloudflare-pages.test.ts` (`cf()` via son override `base` réservé aux tests,
`verifyServed` directement sur son propre paramètre `url`). `resolveAliasUrl` partage exactement la
même formule de plafonnement que `verifyServed` (revue de code, pas de second test dupliqué) et
n'est pas testée séparément contre un serveur accroché — voir Risques assumés.

`SPLASH_S3_E2E=1 SPLASH_S3_ACCESS_KEY_ID=minioadmin SPLASH_S3_SECRET_ACCESS_KEY=minioadmin bun test
lib/loop/delivery-genre-e2e.test.ts` contre MinIO réel (colima) — **1 pass / 0 fail, 6.7s** — prouve
que `DEFAULT_UPLOAD_TIMEOUT_MS` (120s) n'est pas assez serré pour faire échouer un upload réel : le
default n'est pas devenu une régression.

## 6. Risques assumés

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **Pas de timeout d'inactivité (suivi d'octets)** — `fetchBounded` est un mur-à-mur, jamais réarmé
  sur progression. Mitigé par le budget upload séparé (§3.2). Réel, jugé suffisant : fermer la
  classe "aucun budget du tout" prime sur l'affiner en timeout glissant, qui demanderait un suivi de
  flux hors scope de cette passe.
- **`lib/newsroom/verify.ts` — FERMÉ dans une passe suivante, même branche.** Les 4 `fetch` (MapTiler,
  Datawrapper, Cloudflare, Anthropic) passent maintenant par `fetchBounded`, avec un budget dédié
  plus court que `DEFAULT_NETWORK_TIMEOUT_MS` : `VERIFY_TIMEOUT_MS = 8_000` (interne à `verify.ts`,
  pas une troisième constante exportée par `publishers.ts`). Raison de descendre sous 20s : c'est
  le seul site d'appel du dépôt où un humain regarde l'écran — le bouton « Check my keys » de la
  page de setup — et un check de credential fait un aller-retour en quelques centaines de ms en
  pratique ; 8s reste une marge large pour une connexion lente tout en bornant le temps qu'un
  journaliste non-technique fixe un spinner avant qu'un « injoignable » honnête ne s'affiche.
  Chaque `verifyXxx` gagne un `base` optionnel réservé aux tests (même convention que `cf()` dans
  `cloudflare-pages.ts`) et un `timeoutMs` optionnel — tous deux avec défauts de production
  inchangés, aucun appelant existant (`install/preflight/server.ts`,
  `install/configurator-core.ts`) n'a dû changer. Le `try/catch` déjà en place dans chaque
  fonction absorbait déjà toute erreur en `null` — brancher `fetchBounded` a suffi à faire
  atterrir un timeout dans le SEUL bucket honnête : `NetworkTimeoutError` → `catch` → `null` →
  `verifyCapability` traduit en `"unreachable"`, jamais `"rejected"`. Preuve :
  `lib/newsroom/verify.test.ts`, describe "verify* against a real hung endpoint" — un vrai
  `Bun.serve` qui accepte et ne répond jamais, budget de test à 150ms, assertion sur les 4
  fonctions ET sur `verifyCapability("dw-chart", …)` (le chemin complet jusqu'au `VerifyOutcome`),
  refus sous la fenêtre bornée avec le résultat `null`/`"unreachable"`, jamais `false`/`"rejected"`.
- **`resolveAliasUrl` n'a pas de preuve live dédiée** contre un serveur accroché — seule sa jumelle
  `verifyServed` (formule de plafonnement identique, revue de code) l'a. `resolveAliasUrl` appelle
  `cf()` qui EST testée contre un serveur accroché (via l'override `base`) ; ce qui n'est pas
  exercé en test, c'est spécifiquement le plafonnement PAR TENTATIVE dans SA boucle à elle. Jugé
  acceptable : code identique ligne pour ligne à celui de `verifyServed`, dupliquer le test
  n'aurait prouvé que la même formule deux fois.
- **Aucune preuve live pour Cloudflare** (l'équivalent du test MinIO pour S3) — les instructions de
  cette tâche en mentionnaient une ("SPLASH_S3_E2E=1, et une Cloudflare") mais **elle n'existe pas
  dans ce dépôt** : `cloudflare-pages.test.ts` est intégralement hors-ligne (voir son propre
  commentaire d'en-tête, "no request is mocked here, none is made" — la preuve live du protocole a
  été faite une fois, en 2026-07-19, contre l'API réelle, et consignée dans la spec de l'époque, pas
  rejouée en test). Rien à "ne pas casser" ici puisque rien de tel n'était vert avant cette tâche —
  signalé tel quel plutôt que d'inventer un test contre l'API Cloudflare réelle sans que ça ait été
  demandé.
- **`cf` exporté avec un 5ᵉ paramètre `base`, réservé aux tests** — c'était le seul moyen de prouver
  le timeout contre un vrai serveur accroché plutôt qu'un mock, sans quoi cette tâche aurait dû se
  contenter d'un test de plus haut niveau contre l'API Cloudflare réelle (hors de question sans
  compte de test dédié) ou d'aucune preuve directe pour ce site précis. Défaut `= API` : zéro
  changement de comportement pour tout appelant de production.
- **Pas de configuration par-rédaction du timeout dans `newsroom.json`** — décision délibérée (§4).
  `settings.timeoutMs`/`settings.uploadTimeoutMs` couvrent le besoin ("configurable, per-call
  override") sans ouvrir une nouvelle surface de setup ; une rédaction qui veut vraiment relever le
  défaut n'a qu'à poser ces deux clés dans `capabilities[id].settings`, déjà le canal existant pour
  `snippetTemplate`/`prefix`.
