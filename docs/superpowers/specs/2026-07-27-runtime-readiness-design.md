# Spec — Runtime readiness : voir le navigateur Remotion (follow-ups de debug)

> **Statut :** fait, 2026-07-27.
> **Origine :** deux recommandations issues d'une session de debug (voir §1).
> **Branche :** `feat/runtime-readiness` (worktree `splash-runtime-readiness`).
> **Portée fichiers :** `lib/newsroom/{capabilities,probe,readiness}.ts` + leurs tests ; `README.md`
> (documentation setup).
> **Langue :** prose FR, identifiants/types/messages en anglais (standard non-négociable).

---

## 1. L'incident qui a produit ces deux tâches

Un test a échoué **uniquement** dans un worktree fraîchement créé, avec tous les symptômes d'une
régression de merge (deux branches venaient d'être intégrées). Ce n'en était pas une.

Cause réelle : **le téléchargement du Chrome Headless Shell de Remotion s'était arrêté en cours de
route** — un fragment de 62,6 Mo d'un zip de 93,5 Mo, jamais extrait, posé dans
`skills/chart-native/node_modules/.remotion/chrome-headless-shell/`. Tout render vidéo qui
suivait mourrait avec un dump de sous-processus illisible. Une heure est partie à traquer des
fichiers innocents avant de trouver la vraie cause.

**Reproduit en direct pendant cette session** (pas une simulation) : le premier `cd lib && bun
test` de ce worktree a lui-même déclenché le téléchargement (un test de `lib/brain` fait tourner
un render chart-native réel), et a stallé exactement pareil :

```
Downloading Chrome Headless Shell https://www.remotion.dev/chrome-headless-shell
Getting Headless Shell - 9.5 Mb/93.5 Mb
Downloading ... failed (will retry): ... the server sent no data for 20 seconds
(fail) a real run reaches an offer that carries its discards and can be phrased [60005.92ms]
 1042 pass / 10 skip / 1 fail
```

`bunx remotion browser ensure` dans `skills/chart-native` puis `skills/map-native` a fini le
téléchargement (85,9 Mo obtenus, extraction propre), et le re-run est passé à **1043 pass / 10
skip / 0 fail** — confirmant à la fois le diagnostic et le remède.

Deux recommandations en sont sorties :

1. Le modèle de readiness doit pouvoir **VOIR** cette classe de panne, pas juste la résolution de
   paquets.
2. Le setup d'un worktree frais doit être **écrit noir sur blanc**, quelque part qu'on trouve.

---

## 2. Tâche 1 — le probe de navigateur

### 2.1 Les deux trous vérifiés

- `capabilities.ts` : `chart-native.criticalDeps.packages` = `["react", "vite"]` — **ne liste même
  pas `remotion`**, le paquet dont le navigateur téléchargé est la chose qui casse réellement.
  `map-native` le listait déjà (`["react", "remotion", "@maptiler/sdk"]`).
- Rien, nulle part dans `lib/newsroom/`, ne vérifie que le **navigateur téléchargé** est présent et
  extrait. `Bun.resolveSync("remotion", fromDir)` répond vrai dès que le paquet npm résout — ce qui
  reste vrai même quand `.remotion/chrome-headless-shell/` ne contient qu'un `.zip` fragment.

### 2.2 Décision — étendre le vocabulaire existant, pas en inventer un second

`readiness.ts` connaît déjà un tri-state (`ready | missing | unverified | disabled`) et un style de
probe injectable (`resolveDep`, mock en test). Le probe navigateur suit exactement ce moule :

- Un **quatrième primitif** dans `probe.ts` (à côté de `parseEnvFile`, `isSet`,
  `defaultResolveDep`) : `probeRemotionBrowser(fromDir): BrowserProbeResult`.
- Gated dans `capabilityReadiness` **après** le check `criticalDeps` existant, et seulement si
  `cap.criticalDeps.packages.includes("remotion")` — générique, pas une liste d'ids codée en dur.
  N'importe quelle capacité future qui déclare `remotion` comme dépendance critique hérite du
  check sans y toucher.
- Statut retourné : `missing` (jamais un cinquième état) avec une phrase actionnable :
  `"<label>'s video renderer needs its Remotion browser, which looks missing or half-downloaded —
  run \`bunx remotion browser ensure\` in skills/<dir>, then retry"`.

### 2.3 Ce que le probe vérifie, et pourquoi c'est bon marché

`probeRemotionBrowser` **ne fait qu'un `fs.statSync`** — aucun spawn, aucun réseau — donc son coût
sur chaque lecture de readiness (y compris la page preflight brandée) est négligeable.

Il rejoue la convention de cache **privée** de `@remotion/renderer` (vérifiée contre un vrai
`bunx remotion browser ensure`, pas devinée) :

```
<fromDir>/node_modules/.remotion/chrome-headless-shell/<platform>/
  chrome-headless-shell-<platform>/<executable>
```

— sans importer `@remotion/renderer/dist/browser/BrowserFetcher.js` (chemin non exporté,
susceptible de bouger d'une version Remotion à l'autre). `remotionExecutablePath(fromDir)` est
exporté séparément pour que le test calcule le **même** chemin sans coder en dur une plateforme
hôte.

Deux gardes contre le faux vert :
1. **Existence** du fichier au chemin exact — un fragment `.zip` non extrait vit dans le MÊME
   dossier de téléchargement mais jamais à ce chemin, donc il ne peut pas se faire passer pour un
   binaire extrait.
2. **Taille plancher** (`MIN_BROWSER_EXECUTABLE_BYTES = 1 000 000`) — un vrai binaire fait 50-90 Mo ;
   un stub ou une écriture tronquée ne peut pas l'atteindre. Défense en profondeur au-delà de la
   simple existence.

Pas de vérification de version (`VERSION` file ↔ `TESTED_VERSION`) : la reproduire exigerait de
dépendre de la même constante privée Remotion, fragile à chaque bump de version, pour une classe de
panne (mismatch de version) différente de l'incident réel. YAGNI assumé.

### 2.4 Flux à travers la page existante — pas de changement de page

`install/preflight/model.ts` (hors périmètre) appelle déjà `capabilityReadiness(cap, state, opts)`
et transmet directement `readiness.status`/`.reason`/`.help` au modèle que la page rend. Comme
`probeBrowser` est **optionnel** sur `ReadinessOpts` (même pattern que `resolveDep`/`skillsRoot`),
`model.ts` continue de fonctionner sans modification : `opts.probeBrowser` est `undefined`, donc
`capabilityReadiness` retombe sur le vrai `probeRemotionBrowser` — un stat fichier réel, gratuit,
honnête. Vérifié : la suite `install/preflight` (63 tests) passe sans y toucher.

### 2.5 Granularité assumée : par CAPACITÉ, pas par FORMAT

`chart-native` produit trois formats (static/interactive/video), et **seul le format vidéo** a
besoin du navigateur Remotion (`produce.mjs` : static/interactive passent par un build Vite, aucun
Chromium headless-shell). Le probe fait néanmoins passer TOUTE la capacité `chart-native` à
`missing` quand le navigateur manque — pas seulement son format vidéo.

Assumé sciemment : `readiness.ts` n'a **aucune** granularité par format nulle part (le check
`criticalDeps` existant bloque déjà toute la capacité même si seule une partie du code la
consomme). Ajouter une granularité par format serait une refonte architecturale plus large, hors
scope d'un follow-up de debug. Voir « Risques assumés » pour la discussion complète.

---

## 3. Tâche 2 — documentation du setup worktree

### 3.1 Où

`README.md`, section « For developers » — déjà l'endroit qui contenait `git clone` +
`bun run check`, juste incomplet. Pas de fichier `CONTRIBUTING.md`/`SETUP.md` existant à étendre ;
`CLAUDE.md` § Conventions ne porte pas de check-list opératoire (c'est le journal de décisions, pas
un guide d'installation). README.md est hors du périmètre interdit (`lib/host`, `lib/core/verbs`,
`lib/loop`, `lib/brain`, `lib/source`, `lib/verify`, `lib/delivery`, `install/**`, sources
`skills/**`) — autorisé à éditer.

### 3.2 Contenu

Liste vérifiable, une étape = une commande, avec CE QU'ELLE ÉVITE en une phrase (une étape dont le
but n'est pas expliqué est une étape qu'on saute) :

1. `bun install` à la racine — sans ça, `cd lib && bun test` échoue avec ~48 échecs fantômes
   (`zod`, `@noble/hashes`, `fflate` introuvables).
2. `bun install` dans `skills/chart-native`, `skills/map-native`, `skills/dw-chart` — puis
   `skills/scrolly` et `skills/image-native` pour `bun run check` complet.
3. `.env` racine (gitignored) pour `skills/image-native` — son test pilote un vrai build scrolly.
4. `bunx remotion browser ensure` dans `skills/chart-native` et `skills/map-native` — **la tâche 1
   de cette session** : sans ce téléchargement fait à l'avance, le premier test qui rend une vidéo
   le déclenche EN COURS DE SUITE, et un réseau capricieux (mesuré : ça a stallé pendant cette
   session même) le fait échouer avec un symptôme qui ressemble à une régression de code.

---

## 4. Preuve mesurée

- `probe.test.ts` : 4 nouveaux cas — rien téléchargé (missing), fragment `.zip` non extrait dans
  le dossier de téléchargement réel (missing — l'incident reconstruit), binaire extrait ≥ 1 Mo
  (ready), stub tronqué à 10 octets au chemin exact (missing). Les deux derniers utilisent
  `remotionExecutablePath()` pour construire le chemin sans coder en dur une plateforme hôte.
- `readiness.test.ts` : la garde `criticalDeps` existante est réutilisée telle quelle ; 4 nouveaux
  cas prouvent le gating générique (`chart-native` et `map-native` passent `missing` avec le bon
  message par skill dir ; `image-native`, qui ne déclare pas `remotion`, ne déclenche jamais
  `probeBrowser` — assertion sur un flag `called`) + un cas `ready`.
- État réel observé sur CETTE machine, dans CE worktree (rapporté aussi dans le message de
  rapport) : navigateur manquant → `bun test lib/brain` a réellement stallé et échoué (voir §1) ;
  navigateur extrait après `bunx remotion browser ensure` (159 972 320 octets, `VERSION`
  `149.0.7790.0`) → `cd lib && bun test` repasse **1043 pass / 10 skip / 0 fail** (puis 1052/10/0
  après les tests ajoutés par cette session).

---

## 5. Risques assumés

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

Voir le rapport final de la session pour la section `## Risques assumés` complète (granularité
capacité-vs-format, pas de check de version Remotion, la CLI de production `skills/splash/src/
preflight.ts` ne reçoit pas encore le probe browser).

> **Mise à jour 2026-07-27 :** le dernier de ces risques est **fermé** — `preflightFindings`
> appelle désormais le même `probeRemotionBrowser`, sous la même condition
> (`criticalDeps.packages` contient `"remotion"`). Voir
> `2026-07-27-residual-sweep-design.md` §2.
