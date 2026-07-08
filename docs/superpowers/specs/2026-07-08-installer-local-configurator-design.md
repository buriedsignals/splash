# Installeur key-free + configurateur local `127.0.0.1` — design

> **Date** : 2026-07-08
> **Statut** : design approuvé (brainstorming) → prêt pour `writing-plans`.
> **Branche** : `feat/installer-local-configurator` (worktree isolé, base `main`).
> **Contexte amont** : ré-aligner l'installeur Atelier sur le **pattern canonique Buried Signals**
> (Mycroft/Spotlight), que le CLAUDE.md nous désigne comme modèle. L'installeur actuel (livré au lot
> précédent) **bake les clés** dans l'artefact généré ; le canon utilise un **installeur sans clés +
> configurateur local `127.0.0.1`** où les clés sont saisies après install, vérifiées en direct,
> écrites sur disque — jamais dans les Downloads ni l'historique shell.

## 1. Problème

Notre installeur actuel collecte les clés dans la **page publique** et les **bake dans l'artefact
généré** (one-liner inline / `.command` téléchargé). Deux coûts : les clés atterrissent dans
l'historique shell (copier-coller) ou dans un fichier des Downloads (launcher) ; et on diverge du
modèle-maison Buried Signals, que Mycroft ET Spotlight suivent à l'identique.

Le canon : la page publique donne une **commande sans clés** (identique pour tous) ; l'install
récupère le repo, lance un **configurateur local** (page servie sur `127.0.0.1`) où le journaliste
saisit ses clés (**vérifiées en direct** avec chaque provider) ; elles sont écrites en `.env` (mode
600) et jamais exposées ailleurs.

## 2. Objectifs / non-objectifs

**IN**
- Page publique **dépouillée** : one-liner statique key-free par OS + download key-free + doc contournement.
- **`install/configurator.ts`** : serveur **Bun** local `127.0.0.1` (formulaire runtime + clés,
  vérif live, écrit `~/Atelier/.env` chmod 600 + le runtime choisi, exit 0).
- **Bootstrap ré-ordonné** : Bun → repo → **configurateur** → runtime + deps + Playwright → launcher.
- **Auth flexible** : marche avec **abonnement** (OAuth login de `claude`, clé Anthropic vide) **OU
  clé API** (champ Anthropic optionnel).
- **Vérif live** des clés (vraies API, pas de mock).
- **Natif Windows conservé** (Bun cross-platform — avantage sur Mycroft, POSIX/Python-only).
- `install/` devient une **unité testée** (ajoutée à `scripts/check.mjs`).

**OUT**
- Flow OAuth custom — délégué à `claude` lui-même (login navigateur au 1er lancement).
- Runtimes autres que Claude Code (Codex/Gemini/Goose : « coming soon » dans le configurateur).
- Signature de code (inchangé du lot précédent : non signé + doc contournement).
- Le garde rendu natif Windows (tsx) — **inchangé**, hérité, on n'y touche pas.

## 3. Faits groundés

- **Mécanisme Mycroft (`install.sh` réel, récupéré)** : clone le repo → `python3 install/setup_server.py`
  (serveur local) → le navigateur **écrit un fichier sourceable** (`setup-config.env`) → le script
  **bloque** jusqu'à son existence puis le **source** (`set -a; . file; set +a`). Clés en
  `~/.config/.../.env` **`chmod 600`**. **Pas de Windows** (POSIX/Python). Ordre : config **avant** tooling.
- **Claude Code auth** (grounding lot précédent + docs) : supporte **les deux** — si `ANTHROPIC_API_KEY`
  est présent dans l'env, il l'utilise ; sinon il déclenche un **login OAuth navigateur** au 1er
  lancement (abonnement). → clé Anthropic **optionnelle** côté configurateur.
- **Bun natif** : `Bun.serve` (HTTP), `fetch`, `node:fs`, `Bun.spawn` — tous natifs, cross-platform
  Windows inclus, zéro dépendance npm pour le configurateur.
- **Endpoints de vérif** (GET, sans coût en tokens) :
  - MapTiler : `GET https://api.maptiler.com/maps/streets-v2/style.json?key=<KEY>` → 200 valide / 403 invalide.
  - Datawrapper : `GET https://api.datawrapper.de/v3/me` header `Authorization: Bearer <TOKEN>` → 200 / 401.
  - Anthropic (si fournie) : `GET https://api.anthropic.com/v1/models` headers `x-api-key: <KEY>` +
    `anthropic-version: 2023-06-01` → 200 / 401 (liste de modèles, gratuite).
  - fly (optionnel) : pas de vérif v1 (jeton de déploiement, non testable par un GET simple).

## 4. Architecture

```
        Page publique (statique, GitHub Pages) — SANS clés
        « Lance cette commande » (par OS) + « Prefer a file? » + doc contournement
                          │  (commande identique pour tous)
                          ▼
     curl …/bootstrap.sh | bash   /   irm …/bootstrap.ps1 | iex
                          ▼
     install/bootstrap.{sh,ps1} (hébergé, SANS clés)
       1. installe Bun            (requis pour lancer le configurateur)
       2. fetch Atelier (zip)     (contient le configurateur)
       3. bun install/configurator.ts   ─────────────┐  (bloque)
                                                      ▼
                             ┌─────────────────────────────────────────┐
                             │ configurateur Bun — 127.0.0.1:<port>     │
                             │ formulaire (runtime + clés) → navigateur │
                             │ submit → VÉRIF LIVE chaque clé           │
                             │ OK → écrit ~/Atelier/.env (chmod 600)    │
                             │       + runtime choisi → exit 0          │
                             └─────────────────────────────────────────┘
                          ▼
       4. installe le runtime choisi (claude) + Node sur Win
       5. bun install (skills) + playwright install chromium
       6. crée le launcher local double-clic → lit .env → lance claude --plugin-dir .
```

Le seam clés change : **plus de génération par-user côté page** ; les clés naissent dans le
configurateur local, vérifiées, écrites 600 — jamais dans les Downloads ni l'historique shell.

## 5. Composants

| Unité | Rôle | Notes |
|---|---|---|
| `docs/installer/index.html` | Page publique statique : one-liner key-free par OS + download + workaround | plus de form clés, plus de radio runtime |
| `docs/installer/commands.js` | Purs : `installCommand(os)`, `launcherContents(os)`, `launcherFilename(os)`, `bootstrapUrl(os)` (key-free, statiques) | **remplace** `generate.js` (supprimé) |
| `docs/installer/{generate.js,runtimes.js}` | **supprimés** (baking par-user + registre → migrent) | + leurs `.test.ts` |
| `install/bootstrap.{sh,ps1}` | Install logic ré-ordonnée (Bun → repo → configurateur → runtime+deps → launcher) | garde tsx Windows |
| `install/configurator.ts` | Entrée mince : serveur `Bun.serve` 127.0.0.1, ouvre navigateur, orchestre submit→écrit→exit | zéro dep npm |
| `install/configurator-core.ts` | Purs/testables : `RUNTIMES`, `serializeEnv(cfg)`, `verifyMapTiler/Datawrapper/Anthropic(key)`, `renderConfiguratorHtml()`, `pickPort()` | vérif = vraies API |
| `install/{package.json,tsconfig.json}` | Rend `install/` tsc-checkable + testable | miroir d'un skill |
| `scripts/check.mjs` | +`install/` dans TSC_DIRS + TEST_DIRS | le gate couvre le configurateur |

## 6. Le configurateur (détail)

**Serveur** (`configurator.ts`) : `Bun.serve({ hostname: "127.0.0.1", port: 0, fetch })` (port 0 → l'OS
assigne un port libre ; lire `server.port`). Ouvre le navigateur : `open` (darwin) / `start` via
`cmd /c start` (win32) / `xdg-open` (linux) sur `http://127.0.0.1:<port>/`.

**Routes** :
- `GET /` → `renderConfiguratorHtml()` (formulaire : runtime picker [Claude Code ✓, autres disabled],
  MapTiler, Datawrapper, fly optionnel, **Anthropic API key optionnelle** avec note « laisse vide si
  abonnement »).
- `POST /verify` → pour chaque clé fournie, appelle `verify<Provider>(key)` (vraies API §3), renvoie
  `{maptiler:bool, datawrapper:bool, anthropic:bool|null}`. La page affiche ✓/✗ par champ.
- `POST /submit` → re-vérifie, puis `serializeEnv(cfg)` → écrit `~/Atelier/.env` (`writeFileSync` +
  `chmodSync(path, 0o600)` — no-op effectif sur NTFS, noté) + écrit le runtime choisi dans
  `~/Atelier/.atelier-runtime` (texte, ex. `claude`). Répond une page « Configuration enregistrée,
  reviens au Terminal ». Puis `server.stop()` + `process.exit(0)`.
- L'utilisateur ferme sans submit → le bootstrap détecte l'absence de `.env` (ou un exit≠0) → avertit
  « configuration non terminée, relance l'installeur » (miroir Mycroft), exit≠0.

**`serializeEnv(cfg)`** émet exactement les variables existantes (compat avec le reste du système) :
`ANTHROPIC_API_KEY` (uniquement si fournie), `VITE_MAPTILER_KEY`, `REMOTION_MAPTILER_KEY`,
`DATAWRAPPER_API_TOKEN`, `ATELIER_EMBED_APP`, `FLY_API_TOKEN`. Clés supposées alphanumériques (pas de
guillemets) — mais ici plus de risque shell-history (écrites directement sur disque).

## 7. Modèle d'auth (les deux chemins)

- **Abonnement** : le journaliste laisse le champ Anthropic **vide** → `.env` sans `ANTHROPIC_API_KEY`
  → au 1er `claude --plugin-dir .`, `claude` déclenche son **login OAuth navigateur**. Rien à gérer côté nous.
- **Clé API** : il colle sa clé → vérifiée live (`v1/models`) → écrite dans `.env` → `claude` l'utilise
  automatiquement. Les deux fonctionnent sans branche spéciale (comportement natif de `claude`).

## 8. Tests

- **`install/configurator-core.test.ts`** (bun:test, dans le gate) :
  - `serializeEnv` : émet toutes les clés services ; **omet** `ANTHROPIC_API_KEY` si vide ; format `K=V`.
  - `verifyMapTiler`/`verifyDatawrapper`/`verifyAnthropic` : **vraies API** avec de vraies clés (via
    `.env` du repo si dispo) — un cas valide (200→true) + un cas invalide (mauvaise clé→false). Se
    **self-skip** proprement si la clé provider n'est pas dispo (comme les tests dw-chart), pour rester
    vert sur un checkout propre.
  - `renderConfiguratorHtml` : contient les champs attendus + la note abonnement ; `pickPort` logique.
- **`docs/installer/commands.test.ts`** : `installCommand(os)` = le bon idiome key-free (`curl|bash` /
  `irm|iex`) + **aucune clé** ; `launcherContents` `.command`/`.cmd` key-free (jamais `.ps1`).
- **`docs/installer/page.test.ts`** (mis à jour) : la page **n'a plus** de form clés (`input[name=ai]`
  absent), a le one-liner key-free + le download + les data-testid OS/mode.
- **`install/bootstrap-*.test.ts`** (déplacés depuis docs/installer ou mis à jour) : le bootstrap
  **lance le configurateur** (`configurator.ts`), n'écrit **plus** `.env` depuis l'env du caller,
  ordre = Bun→repo→configurateur→runtime.
- **Vérif contrôleur (render/run)** : lancer le configurateur en local, remplir, confirmer l'écriture
  `.env` 600 + la vérif live sur de vraies clés + la reprise du bootstrap (au moins jusqu'au launcher).

## 9. Décisions verrouillées

Configurateur en **Bun** (on-brand, cross-platform Windows) · clé Anthropic **optionnelle** (abonnement
OU clé) · **vérif live** vraies API · `.env` **chmod 600** · **port libre** (0→OS) · on **garde** le
download fichier (parité Mycroft/Spotlight) · natif Windows conservé · page publique **statique
key-free** · runtime choisi **dans le configurateur** (pas la page).

## 10. Suivis / hors périmètre

- fly token : pas de vérif live v1 (jeton de déploiement) — écrit tel quel.
- `chmod 600` inopérant sur NTFS (Windows) — le `.env` reste dans le profil protégé ; ACL Windows = suivi.
- Autres runtimes (Codex/Gemini/Goose) : câbler installeur + entrée configurateur quand vérifiés.
- Release MIT : `REPO_URL` + pin `REF` (hérité, tracké par `preflight-release.mjs`).
- Le garde rendu Windows (tsx) et les moteurs : **inchangés**.

## 11. Sources

- `install.sh` réel de Mycroft (mécanisme configurateur : Python server + fichier sourceable + chmod 600).
- Pages setup Mycroft/Spotlight (UX : key-free installer + 127.0.0.1 + « verified live » + « never sit in Downloads »).
- Docs Claude Code (auth OAuth vs `ANTHROPIC_API_KEY`) — grounding lot précédent.
- Docs API MapTiler / Datawrapper / Anthropic (endpoints de vérif GET).
