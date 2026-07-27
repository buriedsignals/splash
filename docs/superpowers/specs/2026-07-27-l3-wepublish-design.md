# Spec — L3 : `embed-cms`, l'adapter We.Publish (mesuré contre une vraie instance)

> **Statut :** design mesuré (spike live, 2026-07-27). Prêt pour → writing-plans.
> **Parent :** `docs/superpowers/specs/2026-07-25-delivery-publishers-design.md` §3 (l'interface, conçue une fois pour les trois tranches) et §6 (L3).
> **Amont direct :** `lib/delivery/adapters/s3.ts` (L2 — le modèle le plus proche : monté localement puis mesuré).
> **Branche :** `feat/l3-wepublish` (worktree `splash-l3`).
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Pourquoi cette tranche existe, et pourquoi elle ne pouvait pas être écrite avant

Le §6 du spec-parapluie a déclaré `embed-cms` et l'a laissé `implemented: false` avec une raison
explicite, datée du 2026-07-25 :

> « **La mutation exacte, ses permissions et le type de bloc utilisable ne sont PAS mesurés** :
> aucun accès à une instance à ce jour. L'adapter est écrit contre l'API documentée et reste
> `implemented: false` jusqu'à sa preuve live. »

C'est cette dette que L3 solde. **L'extension We.Publish est un livrable contractuel de la bourse
FJM** (Sept-Oct 2026) et Heidi.news, la rédaction pilote, publie sur We.Publish : `embed-cms` n'est
pas un adapter optionnel de plus, c'est le chemin de livraison du pilote.

La règle du projet — *« une preuve live contre une fixture ne prouve rien du chemin réel »* — a été
prise au mot : **une instance We.Publish complète a été montée localement** (docker-compose sous
colima) et **tous** les faits du §3 ci-dessous ont été mesurés contre elle. Rien dans ce spec n'est
lu dans une documentation.

---

## 2. Ce qui a été monté (et les trois pannes qu'il a fallu traverser)

Dépôt `wepublish/wepublish` (monorepo TypeScript, NestJS + Prisma + Postgres), cloné à
`/Users/rmdms/wepublish-l3`, `docker compose up database migration api`. Trois obstacles réels,
notés parce qu'ils reviendront pour quiconque refait la manip :

1. **Le clone ne peut pas vivre dans `/private/tmp`.** La VM colima ne monte que `/Users/rmdms`
   (`mount | grep virtiofs`). Un bind-mount depuis un chemin non monté ne fait pas échouer
   `docker compose` : Docker **crée un répertoire vide** à la place du fichier, et l'API meurt sur
   `EISDIR: illegal operation on a directory, read` en lisant `/config.yaml`. Le clone a donc été
   déplacé sous `/Users/rmdms/`, hors de tout worktree Splash.
2. **Le `docker-compose.yml` amont est cassé pour un Postgres nu.** `docker/migrate_start.js`
   dérive `DIRECT_DATABASE_URL` en réécrivant le port `:5432` → `:5433`, parce que le déploiement de
   production place PgBouncer devant Postgres et que les migrations Prisma exigent le listener
   direct. Le compose lance un `postgres:17` sans PgBouncer : rien n'écoute sur 5433 et
   `prisma migrate deploy` échoue en boucle. Corrigé par un `docker-compose.override.yml` qui pose
   `DIRECT_DATABASE_URL` explicitement (le script ne dérive que si la variable est absente).
3. **Le seed ne pose PAS les identifiants du README.** Le README annonce `dev@wepublish.ch` / `123`
   (c'est le seed du chemin `npm run dev`). Le seed du conteneur crée
   **`admin@wepublish.ch`** avec un **mot de passe aléatoire imprimé une seule fois** dans les logs
   de migration (`Bootstrapped initial admin user with password: …`), rôle `admin`.

Les images sont `linux/amd64` et tournent en émulation binfmt sous colima aarch64 (Rosetta désactivé)
— lent au démarrage, mais fonctionnel : l'API répond en ~90 s.

**Point d'accès réel : `http://localhost:4000/v1`.** Pas `/graphql` (404 `Cannot POST /graphql`) —
le chemin est posé par `GraphQLModule.forRoot({ path: 'v1' })`.

L'introspection est coupée dans l'image (`NODE_ENV=production`). Elle a été rallumée pour la mesure
(`NODE_ENV: development` + un `tmpfs` sur `/wepublish/apps`, parce qu'hors production Apollo veut
**écrire** le SDL dans un répertoire en lecture seule et meurt sur `EACCES: mkdir`), afin
d'introspecter **le schéma vivant** plutôt que le SDL commité dans le dépôt.

---

## 3. Faits mesurés (spike live, 2026-07-27)

Mesurés contre l'instance décrite au §2 — vraies mutations, vraies erreurs, vrai artefact produit.
Chaque ligne est une contrainte sur l'adapter, pas une observation décorative.

| # | Fait | Conséquence sur l'adapter |
|---|---|---|
| **W1** | L'endpoint GraphQL est **`/v1`**, pas `/graphql` | L'URL complète est **configurée** par la rédaction (`endpoint`), jamais dérivée d'un host — même leçon que `publicBaseUrl` en L2 (F5) |
| **W2** | `createSession(email, password)` → `{ token }` : chaîne opaque de **64 caractères**, `expiresAt` à **+7 jours**. Transmise en `Authorization: Bearer <token>` | L'adapter **ouvre une session à chaque publication**. Il ne stocke ni ne met en cache un jeton : un jeton de 7 jours mis en cache expirerait silencieusement entre deux livraisons |
| **W3** | Un jeton `createToken` (jeton d'API longue durée) est **REFUSÉ** pour `createArticle` (`FORBIDDEN`) | Le « meilleur » identifiant a été essayé et ne marche pas : les mutations éditoriales exigent une **session utilisateur**. Le credential est donc **email + mot de passe** — c'est ce que l'API offre, pas une facilité |
| **W4** | Un échec d'authentification renvoie **HTTP 200** avec `errors[0].extensions.code === "FORBIDDEN"`. Jeton absent et jeton bidon sont **indiscernables** | **Un 2xx n'est pas un succès.** Tout appel doit inspecter `errors` avant `data`. C'est la version GraphQL de la leçon L1/L2 |
| **W5** | `createArticle` prend des **arguments à plat** (`ArgsType`, pas un objet `input`), dont **10 NON_NULL sans valeur par défaut** : `blocks`, `tagIds`, `authorIds`, `socialMediaAuthorIds`, `properties`, `shared`, `hidden`, `disableComments`, `breaking`, `hideAuthor` | En omettre un est une erreur de validation. La mutation est écrite en entier, une fois |
| **W6** | `BlockContentInput` est une map one-of. `embed` → `IFrameBlockInput { url, title, width, height, sandbox, styleCustom }` — **porte une URL, jamais des octets**. `html` → `HTMLBlockInput { html }` | **C'est le fait qui décide de tout le design** (§4) : le bloc d'embed ne peut pas transporter l'artefact ; le bloc HTML le peut |
| **W7** | Sélectionner `latest { blocks }` sur un article **jamais publié** fait planter le serveur (`SlotTeasersLoader.loadSlotTeasersIntoBlocks`, `undefined is not iterable`) et renvoie `data: null`. `draft { blocks }` et — une fois l'article publié — `latest { blocks }` / `published { blocks }` résolvent tous | La mutation ne sélectionne **que des scalaires** (`id slug url`). La vérification se fait dans une **lecture séparée** |
| **W8** | Une sous-sélection en échec **n'annule pas** la mutation : deux articles de sonde existaient en base pendant que GraphQL répondait `data: null` | Un adapter naïf rapporterait un échec **après avoir écrit**, et un retry créerait des doublons. C'est W7 qui rend W8 évitable |
| **W9** | `Article.url` = `${WEBSITE_URL}/a/${slug}`, construite par l'`URLAdapter` de l'API depuis sa **propre** configuration | L'adapter **lit** l'URL dans la réponse, il ne la construit pas — leçon Cloudflare (« ne jamais construire l'URL ») |
| **W10** | Les **slugs en double sont acceptés** : deux articles distincts, même slug, **même `url`** | Republier doit **chercher puis mettre à jour**, jamais créer aveuglément — sinon la rédaction récolte des articles doublons qui se disputent une URL |
| **W11** | `article(slug:)` sur un slug absent renvoie **HTTP 200** + une erreur GraphQL `Article with slug X was not found.` | C'est le signal « créer », pas une panne. À traiter nommément |
| **W12** | `updateArticle` conserve **le même `id` et la même `url`** ; `published` reste **périmé** jusqu'à un nouvel appel à `publishArticle` | Publier est une étape **séparée et obligatoire**. C'est aussi ce qui donne gratuitement le « même lien après révision » du §3.7 du parapluie |
| **W13** | `article(slug:) { published { blocks } }` **anonyme** (sans jeton) renvoie le HTML **octet pour octet identique** à ce qui a été envoyé | C'est le canal de vérification : ce que le CMS sert réellement, lu sans privilèges |
| **W14** | Le corps de requête plafonne à **1 MiB** (1 048 576 o) : corps de 1 047 298 o accepté, 1 062 923 o **rejeté en HTTP 413, sans corps d'erreur GraphQL** | Un dépassement doit être **refusé en amont avec un message actionnable**, jamais laissé produire un 413 opaque |
| **W15** | `hidden: true` exclut l'article du listing public (`articles` : `totalCount` inchangé, slug absent) tout en le laissant **atteignable par son slug** | Exactement la sémantique d'un porteur d'embed : joignable, mais pas dans le fil éditorial de la rédaction |
| **W16** | Un **vrai artefact produit** (`produce()`, chart-native, format `interactive`) pèse **491 207 o** ; échappé en `srcdoc` **507 598 o** (+3,4 %), corps JSON complet **508 664 o** | Ça passe sous W14, avec **moins de 2× de marge**. La marge n'est pas un confort : c'est pourquoi W14 doit être gardé mécaniquement |

### 3.1 Ce qui reste NON mesuré (dette honnête)

- **Le rendu par le site.** Le `docker-compose.yml` amont ne contient **pas** de service website ;
  `WEBSITE_URL` n'est qu'une chaîne de configuration qui alimente `Article.url` (W9). L'URL livrée
  est donc **vérifiée au niveau de l'API** (W13 — le contenu que le CMS sert à n'importe quel
  renderer), **pas** en récupérant la page HTML finale. Monter `website-example` (Next.js, build nx
  complet sous émulation amd64) a été jugé hors budget. Voir §7, risque R1.
- **Le comportement de `dangerously-set-html-content` sur un `srcdoc` de 500 Ko** dans un vrai
  navigateur. Le composant amont (`libs/block-content/website/src/lib/html/html-block.tsx`) est
  **lu**, pas exécuté : il injecte le HTML via `dangerously-set-html-content`, une bibliothèque dont
  l'objet est précisément de **ré-exécuter les `<script>`** d'un HTML injecté. Voir §7, R1.
- **Une instance We.Publish de production** (versions, rôles réels, permissions d'un compte non-admin).
  Mesuré sur `master` du 2026-07-24 avec un compte `admin`.

---

## 4. La décision de design, et le fait qui la force

**W6 est le pivot.** Le bloc d'embed de We.Publish (`IFrameBlockInput`) ne porte qu'une **`url`**.
Or un `PublishRequest` porte un **`artifactPath`** — un chemin de fichier local (invariant I7) — et
**aucune URL**. Un adapter qui poserait un bloc iframe aurait donc besoin d'un *autre* hébergeur pour
l'artefact, c'est-à-dire d'une livraison chaînée : l'interface du §3 n'a pas de fente pour ça, et
inventer une dépendance `embed-cms` → `embed-s3` réintroduirait exactement le couplage que le
registry provider-neutre existe pour éliminer.

Le bloc **HTML** (`HTMLBlockInput { html }`), lui, porte du **balisage**, et We.Publish l'exécute.

**Décision : `embed-cms` publie l'artefact dans un bloc HTML, encapsulé dans un `<iframe srcdoc>`.**

Le `srcdoc` n'est pas une coquetterie, c'est ce qui rend le geste correct :

- Injecter le document auto-contenu **tel quel** dans le `<div>` du bloc collerait un
  `<!doctype html><html><head>…` à l'intérieur d'un `<div>` (le parseur `innerHTML` jette ces
  balises) **et** ferait fuiter le `<style>` de l'artefact sur **toute la page** de la rédaction.
- Le `srcdoc` donne au visuel la même **isolation** qu'un iframe vers Cloudflare ou S3 — c'est la
  forme sous laquelle les deux autres adapters hébergés livrent déjà.

### 4.1 `serves` : `["interactive", "scrolly"]`

Décidé sur la mesure, pas sur le goût :

- Le seul bloc capable de porter l'artefact porte du **balisage** (W6). `static` (PNG) et `video`
  (mp4) sont **binaires**. Les seuls foyers CMS-natifs pour eux sont le bloc `image` — qui exige un
  `imageID` provenant du serveur média, un mécanisme d'upload entièrement différent — et les blocs
  vidéo, qui sont tous des **plateformes externes** (`youTubeVideo`, `vimeoVideo`, `tikTokVideo`,
  `streamableVideo`, `facebookVideo`) prenant un identifiant de plateforme. **Il n'existe aucun bloc
  mp4 auto-hébergé** dans la liste `BlockContentInput` mesurée.
- Inliner un PNG/mp4 en base64 dans un bloc HTML crèverait W14 et produirait un résultat **pire**
  que le fichier que le champ image du CMS attend.
- C'est cohérent avec le modèle de genres déjà en place : `deliveryGenreFor` range `static`/`video`
  dans le genre **file**, et `defaultDestinationsFor` les route vers le paquet portable par défaut.
  `lib/loop/deliver.ts` transforme déjà un format non servi en refus propre qui **nomme** ce qui le
  sert — aucun code neuf n'est nécessaire pour que ce choix soit sûr.

### 4.2 L'article porteur, et le refus qui protège la rédaction

L'adapter écrit dans un **article dédié qu'il possède**, au slug déterministe
`${slugPrefix}${id}` (`slugPrefix` par défaut `splash-`). Déterministe **parce que** W10 + W12 :
même slug ⇒ même article ⇒ **même URL** après révision, ce qui est le comportement que le §3.7 du
parapluie décrit (« Republier écrase le même lien »).

Le bloc porte un **marqueur d'appartenance** en première ligne :

```html
<!-- splash:embed id="<id>" -->
```

**Si le slug existe déjà mais que le bloc ne porte pas le marqueur de CET id, l'adapter REFUSE au
lieu d'écraser.** C'est l'analogue direct du refus F4 de L2 : écraser les blocs d'un article que la
rédaction a écrit détruirait du contenu éditorial, et « poser une policy publique » comme « réécrire
un article » sont deux façons de modifier l'infrastructure de quelqu'un d'autre avec une portée plus
large que l'objet livré. Splash nomme le conflit et s'arrête.

L'article porteur est créé **`hidden: true`** (W15) : joignable par URL, absent du fil éditorial.
Ce n'est **pas** un réglage — un article porteur est de l'infrastructure, pas un papier ; un bouton
pour le faire remonter dans le fil de la rédaction n'aurait pas de lecteur.

### 4.3 Séquence

```
1. valider settings + credentials              (refus avant toute I/O)
2. lire l'artefact + mesurer le corps          (W14 — refus avant toute I/O réseau)
3. createSession                               (W2 ; W4 : inspecter errors)
4. article(slug:)  → trouvé ? / W11 non trouvé ?
5.   trouvé + marqueur absent  → REFUS         (§4.2)
     trouvé + marqueur présent → updateArticle (W12, scalaires seuls — W7)
     non trouvé                → createArticle (W5, scalaires seuls — W7)
6. publishArticle                              (W12 — sinon `published` reste périmé)
7. VÉRIFIER en anonyme : article(slug:){ published { blocks } }
   → octet-pour-octet égal à ce qu'on a envoyé (W13), sinon REFUS
8. PublishOutcome{ kind:"hosted", url ← la réponse (W9) }
```

### 4.4 Pas de `snippet`, et pourquoi ce n'est pas un oubli

`PublishOutcome.snippet` est optionnel et son commentaire de type est explicite : écrire `""`
affirmerait « livré avec un code d'embed vide », ce qui est une **affirmation différente et fausse**.

Pour `embed-cms`, **la livraison est terminée** : le visuel *est* dans le CMS. L'URL livrée est celle
d'une **page d'article**, pas d'un embed nu — l'iframer réinsérerait l'en-tête et le pied de page de
la rédaction autour du visuel, un résultat pire que ce que le CMS rend déjà. Il n'existe donc pas de
bon code à coller, et en inventer un serait précisément la fausse affirmation que le type interdit.

Corollaire assumé : **cet adapter ne lit pas `settings.snippetTemplate`**. Ce n'est pas la régression
C3 de L1 (un adapter qui *avait* un snippet et laissait tomber le gabarit configuré) : ici il n'y a
pas de snippet du tout, comme pour un paquet de genre file.

---

## 5. Forme

`lib/delivery/adapters/wepublish.ts` — un fichier, plus la ligne de registry dans
`lib/delivery/index.ts`, plus l'entrée `NEWSROOM_CAPABILITIES`. C'est le critère de qualité que le
§3.1 du parapluie pose pour l'interface, et il tient.

**Réglages** (`settingsFields`, non-secrets dans `newsroom.json`) :

| champ | rôle |
|---|---|
| `endpoint` | l'URL GraphQL complète, `…/v1` (W1) |
| `slugPrefix` | optionnel, défaut `splash-` — l'espace de noms des articles porteurs (§4.2) |
| `timeoutMs` / `uploadTimeoutMs` | les deux boutons partagés de `timeoutFromSettings` |

**Credentials** (`.env`, jamais dans le décor) : `SPLASH_WEPUBLISH_EMAIL`,
`SPLASH_WEPUBLISH_PASSWORD` (W3 — il n'y a pas de jeton d'API éditorial).

**Invariants tenus** : ne throw jamais (I1) · credentials injectés par l'appelant, jamais l'ambiant
(I5) · un chemin, jamais des octets (I7) · **tout appel réseau passe par `fetchBounded`** — aucun
`fetch` nu dans ce fichier.

---

## 6. La preuve live

Test opt-in `SPLASH_WEPUBLISH_E2E=1`, sur le modèle exact de
`lib/loop/delivery-genre-e2e.test.ts` : **départ à `produce()`**, jamais une fixture — c'est la
leçon que ce projet a payée deux fois. Canal `article-web`, format `interactive`, puis
`requestDelivery` → `deliver` → lecture anonyme de retour.

---

## 7. Risques assumés

| # | Risque | Arbitrage |
|---|---|---|
| **R1** | Le rendu final n'est pas vérifié dans un navigateur : pas de service website dans le compose amont, et l'exécution d'un `srcdoc` de 500 Ko par `dangerously-set-html-content` est **lue** dans le code, pas exécutée | **Accepté, et nommé.** La vérification porte sur ce que le CMS **sert** (W13, octet pour octet, en anonyme) — le contrat de l'API, qui est ce que l'adapter contrôle. Ce qu'un thème de rédaction fait ensuite de ce balisage n'est pas quelque chose que l'adapter puisse garantir, pour We.Publish comme pour n'importe quel CMS. **Reste à mesurer avant qu'une rédaction s'appuie dessus** |
| **R2** | Le credential est un **email + mot de passe**, pas un jeton scopé | **Contraint par l'API**, pas choisi : W3 a mesuré que le jeton longue durée est refusé. Conséquence à écrire dans la doc d'install : la rédaction crée un **utilisateur dédié à Splash**, pas le compte admin d'un humain |
| **R3** | W14 laisse **moins de 2× de marge** sur un artefact réel (W16) | Gardé **mécaniquement** : l'adapter mesure le corps et refuse **avant** le réseau, avec un message qui nomme la taille et la limite. Un artefact plus lourd obtient une phrase actionnable, pas un 413 opaque |
| **R4** | W7 (le plantage `SlotTeasersLoader`) est un bug amont qui peut être corrigé, ou se déplacer | L'adapter ne **dépend** pas du bug : il ne sélectionne que des scalaires sur les mutations, ce qui est de toute façon la bonne discipline. Si le bug disparaît, rien ne casse |
| **R5** | Le marqueur d'appartenance (§4.2) est du **balisage**, donc falsifiable par quelqu'un qui éditerait l'article à la main | Accepté. Il protège contre la **collision accidentelle** (le cas réel : un slug de la rédaction qui ressemble au nôtre), pas contre un acte délibéré. Le CMS a son propre contrôle d'accès pour ça |
| **R6** | Mesuré sur `master`, compte `admin`, une seule version | Nommé au §3.1. La forme de l'adapter ne dépend d'aucune version : elle dépend de `createSession` / `createArticle` / `publishArticle`, qui sont le cœur stable de l'API éditoriale |
