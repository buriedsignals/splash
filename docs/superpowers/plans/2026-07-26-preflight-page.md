# Plan — Préflight P2 : la page de setup brandée

**Spec :** `docs/superpowers/specs/2026-07-26-preflight-page-design.md`
**Branche :** `feat/preflight-page` (worktree `splash-preflight-page`)
**Discipline :** TDD strict — le test échoue d'abord, on le regarde échouer, puis on implémente.
Un commit par tâche, message minuscule décrivant le comportement.

**Baseline mesurée avant la 1ʳᵉ tâche :** `cd lib && bun test` → **660 pass / 3 skip / 0 fail** ·
`cd install && bun test` → **15 pass / 3 skip / 0 fail** (les skips = preuves live opt-in, clés absentes).

**Frontières :** on écrit dans `install/**`, `lib/newsroom/**`, `skills/splash/scripts/export-code.mjs`.
Interdits : `lib/loop`, `lib/brain`, `lib/delivery`, `lib/host`, `lib/core`, `skills/splash/SKILL.md`,
`skills/splash/src/**`.

---

## Tâche 1 — `verify*` déménage dans `lib/newsroom/verify.ts`, au grain de la capacité

*Ferme l'obligation §5.1 du spec parent et le trou B.*

- **Rouge :** `lib/newsroom/verify.test.ts` — les 4 `verify*` importées **depuis leur nouveau
  domicile** (le fichier n'existe pas → échec), plus le contrat neuf :
  - `verifyCapability("dw-chart", { DATAWRAPPER_API_TOKEN: "" })` → `"rejected"` (jamais de fetch) ;
  - fetch qui throw → `"unreachable"`, jamais `"rejected"` ;
  - `verifyCapability("chart-native", {})` → `undefined` (rien à vérifier ≠ échec) ;
  - `verifyCapability("map-native", …)` accepte **l'un ou l'autre** nom miroir MapTiler ;
  - `verifyCapability("embed-cloudflare", …)` sans account id → `"rejected"` ;
  - les 3 preuves live keyées (`skipIf`) portées telles quelles depuis `install/configurator-core.test.ts`.
- **Vert :** `lib/newsroom/verify.ts` = les 4 fonctions **déplacées verbatim** + `verifyCapability`.
  `install/configurator-core.ts` les **ré-exporte** (le temps de la bascule) ; ses tests `verify*`
  disparaissent avec le code qui a déménagé.
- **Preuve :** `cd lib && bun test` vert, `cd install && bun test` vert.

## Tâche 2 — `readDecorState` : le chemin skill devient migration-aware sans écrire

*Ferme le trou D (finding #3 parké de P1).*

- **Rouge :** `lib/newsroom/decor.test.ts` — un répertoire portant `.splash-runtime` + un
  `NEWSROOM-PROFILE.md` en `lang: fr`, **sans** `newsroom.json` : `readDecorState(d).uiLang === "fr"`,
  et `readdirSync(d)` est **inchangé** après l'appel (rien n'est écrit).
- **Vert :** `readDecorState(root, env?)` exporté depuis `lib/newsroom/decor.ts`, réutilisant la
  dérivation lecture-seule déjà employée par `loadDecor(dir)`.
- **Puis** `skills/splash/scripts/export-code.mjs` : `uiCopy()` passe de `readNewsroomState` à
  `readDecorState`. Le helper miroir de `skills/splash/tests/export-code-proposal-cli.test.ts` suit,
  sinon il se désynchronise de ce que le script résout réellement.
- **Preuve :** `cd lib && bun test` + `cd skills/splash && bun test` verts.

## Tâche 3 — Le modèle de page (pur, piloté par le registre)

- **Rouge :** `install/preflight/model.test.ts` —
  - un credential partagé (`DATAWRAPPER_API_TOKEN` : `dw-chart` + `map-dw`) apparaît **une fois**, en
    nommant ses deux capacités ;
  - le miroir MapTiler ne produit **qu'un** champ ;
  - **invariant secret** : `JSON.stringify(model)` ne contient jamais la valeur d'un secret de l'env
    injecté — seulement `configured: true` ;
  - un champ n'a jamais son nom de variable pour libellé principal ;
  - une capacité `implemented: false` est présente, désactivée, avec sa raison, et **absente des
    bloqueurs** ;
  - `zip` est prêt sans aucune clé ;
  - le modèle est **pur** : env injecté vide alors que `process.env` est peuplé ⇒ le résultat suit
    l'env injecté.
- **Vert :** `install/preflight/model.ts` + `install/preflight/status-view.ts`.

## Tâche 4 — Le sérialiseur (fusion `.env`, état, gabarit de profil)

- **Rouge :** `install/preflight/serialize.test.ts` —
  - une valeur soumise vide **ne détruit pas** la clé existante ;
  - une ligne étrangère de `.env` est préservée, une clé existante est mise à jour **en place**
    (pas de doublon) ;
  - la clé MapTiler est **mirrorée** sur `VITE_` et `REMOTION_` ;
  - `ANTHROPIC_API_KEY` omise si vide, présente sinon (règle existante) ;
  - guillemetage : trim, `"` et `\n` supprimés, **et le fichier se source réellement en bash** avec
    une valeur contenant une espace (test porté depuis `configurator-core.test.ts`) ;
  - `submittedState` : `runtime`/`uiLang`/`publisher`/`enabled` corrects, `lastVerified` estampillé
    depuis les verdicts, **aucune valeur de credential** dans le JSON sérialisé ;
  - `profileMarkdown` : la langue de contenu et la couleur maison choisies s'y retrouvent.
- **Vert :** `install/preflight/serialize.ts`.

## Tâche 5 — La page : HTML + CSS + client

- **Rouge :** `install/preflight/page.test.ts` — la page est un **vrai fichier** (`page.html` lu
  depuis le disque), sans `<script>` d'application inline, sans URL externe (aucun `http://` /
  `https://` en attribut `src`/`href` : contrainte « self-contained »), et portant les ancres que le
  client attend (`#preflight-model`, les conteneurs de section).
- **Vert :** `page.html`, `page.css`, `client.ts` (DOM seulement, importe `status-view.ts` et
  `copy.ts`), `copy.ts` (en/fr).
- Note : le test de fichier ci-dessus est une garde de structure, **pas** la vérification — celle-ci
  est la tâche 8 (rendu regardé).

## Tâche 6 — Le serveur, et `configurator.ts` qui délègue

- **Rouge :** `install/preflight/server.test.ts` (patron de `install/configurator.test.ts` : spawn,
  port lu sur stdout, `SPLASH_NO_OPEN=1`) —
  - `GET /` → 200 HTML portant le modèle JSON ;
  - `POST /verify` corps malformé → 400 propre (pas l'overlay 500 de Bun) ;
  - `POST /submit` → `.env` écrit (chmod 600 quand la plateforme le permet) **et** `newsroom.json`
    écrit, `runtime` dedans ;
  - `.splash-runtime` préexistant → **supprimé** après un submit réussi ;
  - un `.env` préexistant portant une clé non re-soumise **la conserve** ;
  - chemin inconnu → 404.
  - `install/configurator.test.ts` est retargeté sur le même comportement (il assertait
    `.splash-runtime` : c'est justement ce qui change).
- **Vert :** `install/preflight/server.ts` ; `install/configurator.ts` réduit à une délégation ;
  `install/configurator-core.ts` perd le HTML mort et `serializeEnv` (leur contrat est repris et
  re-prouvé en tâche 4), garde `RUNTIMES` et la ré-export `verify*`.

## Tâche 7 — Fermer les deux domiciles de `runtime` dans le bootstrap

- **Rouge :** `install/read-runtime.test.ts` — `newsroom.json` gagne sur `.splash-runtime` ; un
  `newsroom.json` corrompu retombe sur le legacy puis sur `claude` ; aucune dépendance externe n'est
  importée (le script tourne avant tout `bun install`).
  `docs/installer/bootstrap-sh.test.ts` / `-ps1.test.ts` restent verts (l'appel
  `bun install/configurator.ts` ne bouge pas).
- **Vert :** `install/read-runtime.ts` ; `bootstrap.sh` lit le runtime par ce script ; `bootstrap.ps1`
  fait la même résolution en PowerShell natif ; les deux ajoutent le `bun install` racine gardé
  (§2.7 du spec).

## Écarts entre ce plan et ce qui a été fait

- **Tâche 2** a découvert que la lecture du profil n'était pas neutre : `loadNewsroomProfile`
  réécrit le cache `brand.json` à chaque appel, donc `readDecorState` n'aurait pas été
  sans-écriture. La migration lit désormais la langue via `parseNewsroomMarkdown` /
  `loadBrandProfile` (aucun des deux n'écrit). Résidu #2 du spec.
- **Tâche 6** a supprimé `install/configurator.test.ts` au lieu de le retarget : `server.test.ts`
  lance déjà `install/configurator.ts` (le point d'entrée publié), donc le retarget aurait été une
  copie du même fichier.
- **Tâche 6** a dû toucher un fichier hors des fichiers possédés :
  `skills/splash/tests/preflight.test.ts` importait `serializeEnv` pour sa parité installeur. Le
  test a été réécrit sur `envUpdates` (parité plus forte : elle couvre désormais le miroir
  MapTiler). Même geste pour le helper miroir de `skills/splash/tests/export-code-proposal-cli.test.ts`
  en tâche 2.
- **Tâche 8** a produit trois correctifs que seule la capture a révélés (détail au §8 du spec),
  plus une passe de durcissement (publisher/runtime/profil validés contre le registre) issue de
  l'auto-revue du diff.

## Tâche 8 — Vérification **au rendu**, puis auto-revue

- Lancer le serveur, capturer la page en headless (Playwright, déjà présent dans
  `skills/chart-native`) dans **trois états** : install fraîche (tout manquant), install partiellement
  configurée (mélange prêt/manquant), thème sombre. **Regarder** les captures.
- Corriger ce que la capture révèle (c'est le point du geste), re-capturer.
- Auto-revue du diff complet ; remplir `## Risques assumés` du spec, un ruling par résidu.
- Gate final : `cd lib && bun test`, `cd install && bun test`, `cd skills/splash && bunx tsc --noEmit`,
  `cd install && bunx tsc --noEmit`.
