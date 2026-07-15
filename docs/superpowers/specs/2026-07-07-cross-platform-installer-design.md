# Installeur cross-platform — design (Mac + Windows, 2 modes, clés en amont)

> **Date** : 2026-07-07
> **Statut** : design approuvé (brainstorming) → prêt pour `writing-plans`.
> **Contexte amont** : la distribution « façon Mycroft » (skill installable + page d'install, zéro
> terminal) est une décision verrouillée du CLAUDE.md. L'installeur actuel (`docs/installer/`) est
> **macOS-only, un seul mode** (fichier `.command` double-clic). Ce design ajoute **Windows** et un
> **mode copier-coller terminal**, tout en gardant « les clés fournies d'abord ».

## 1. Problème

Une petite rédaction non-tech doit installer Splash **sur Mac OU Windows**, par **l'un de deux
chemins au choix** :

1. un **exécutable** (fichier à double-cliquer) qui installe tout, ou
2. un **truc à copier-coller** dans le terminal.

Dans les deux cas, le journaliste a **déjà fourni ses clés API** en amont (formulaire de la page).

L'installeur actuel ne couvre que Mac + double-clic. Trois manques : (a) Windows, (b) le mode
copier-coller, (c) le rendu natif sur Windows (voir §3, piège Bun+Playwright).

## 2. Objectifs / non-objectifs

**Objectifs (IN)**
- Bootstrap d'install **versionné et hébergé** (`install/bootstrap.sh` + `install/bootstrap.ps1`),
  **sans clés**, idempotent — source unique de la logique d'install pour les deux modes.
- La page installeur émet, **par OS détecté**, les **deux** modes : un bloc copier-coller ET le
  téléchargement d'un **launcher mince** porteur des clés.
- Chemin **Windows natif complet** : Claude Code + Bun + Node.js + acquisition **zip** + `.env`.
- Refonte du chemin **Mac** : suppression de Homebrew, acquisition zip, `.command` auto-réparant.
- **Launcher local double-clic** créé par le bootstrap (lancement récurrent sans avertissement OS).
- **Garde rendu natif Windows** dans les `produce.mjs` de `chart-native` + `map-native`.
- Tests des générateurs (fonctions pures, comme `generate.test.ts`) + du garde produce.

**Non-objectifs (OUT)**
- **Notarisation macOS** (décision Rémy : non — 0 €/an, on documente le contournement).
- **Signature de code Windows** — inutile : Microsoft a retiré les OID EV (~août 2024), un `.exe`
  signé déclenche quand même SmartScreen ; seul le Microsoft Store donne zéro-avertissement.
- Runtimes **Codex / Gemini / Goose** — restent « coming soon » (non vérifiés).
- Re-vérification exhaustive de **tous** les skills sur Windows (au-delà des producteurs
  charts/maps/vidéo couverts ici).
- Traduction FR de la page installeur (aujourd'hui EN) — noté en §11, hors périmètre.

## 3. Faits groundés qui contraignent le design

Vérifiés (recherche multi-agents + fact-check adverse, 2026-07-07 ; confiance **haute** sauf mention).

- **Claude Code tourne nativement sur Windows** (binaire `claude.exe`, **pas de WSL**). Install :
  - Mac/Linux : `curl -fsSL https://claude.ai/install.sh | bash`
  - Windows PowerShell : `irm https://claude.ai/install.ps1 | iex`
  - Aucun droit admin requis ; aucun runtime Node requis pour le binaire natif.
- **Bun tourne nativement sur Windows** (Win32, depuis Bun 1.1). Install :
  - Mac/Linux : `curl -fsSL https://bun.sh/install | bash`
  - Windows PowerShell : `powershell -c "irm bun.sh/install.ps1|iex"`
- **⚠️ Piège Windows — Bun + Playwright** : sous le **runtime Bun sur Windows**,
  `chromium.launch()` **se bloque indéfiniment, sans erreur** (bug Bun #15679, ouvert ; cause :
  pipes stdio/CDP `fd3` du `--remote-debugging-pipe` de Playwright non gérés comme Node).
  **Contournement : piloter Playwright avec `node`, pas `bun`.** Or `produce.mjs`
  (chart-native + map-native) lance ses `snap-*.mjs` via `bun` et fait `chromium.launch()`.
  → impose le **garde §8** + une **dépendance Node.js sur Windows**.
- **Le copier-coller contourne le théâtre sécuritaire des deux OS** : `curl … | bash` (pas de
  quarantaine, pas de bit-exec manquant) et `irm … | iex` (pas de fichier MOTW, pas de problème
  d'association de fichier). `irm URL | iex` est l'idiome établi (Bun, Scoop, Claude Code).
- **Injection des clés dans le one-liner** : positionner l'env **avant** le pipe.
  - bash : `export KEY=… ; curl … | bash` — **piège** : `KEY=… curl … | bash` ne passe la variable
    qu'à `curl`, pas au `bash` piped ; utiliser `export` (ou `curl … | KEY=… bash`).
  - PowerShell : `$env:KEY='…' ; irm … | iex` — visible par `iex` (même session) ; **session-global
    et hérité** → le bootstrap doit **désenregistrer** les clés à la fin (`Remove-Item Env:\KEY`).
- **Fichiers double-clic** :
  - macOS `.command` → Terminal, mais un téléchargement navigateur = mode 644 (pas de bit-exec) +
    `com.apple.quarantine`. Sur **Sequoia+**, le clic-droit>Ouvrir a disparu → Réglages Système >
    Confidentialité & Sécurité > « Ouvrir quand même » (un non-tech s'y perd). Auto-réparation :
    `chmod +x "$0"` + `xattr -d com.apple.quarantine "$0" 2>/dev/null` en tête — mais le **1er**
    prompt Gatekeeper reste.
  - Windows `.bat`/`.cmd` → s'exécutent dans `cmd.exe` au double-clic ; un `.cmd` texte passe
    **souvent sans** prompt SmartScreen (la réputation cible les `.exe`). **`.ps1` ne s'exécute PAS**
    au double-clic (triple-verrou : association Notepad + execution policy + MOTW) → **jamais** de
    `.ps1` livré ; si PowerShell nécessaire, l'envelopper : `powershell -ExecutionPolicy Bypass …`.
  - **Un fichier créé localement (non téléchargé) n'a ni MOTW ni quarantaine** → le launcher local
    du bootstrap (§7) se double-clique proprement, sans avertissement.
- **Dépendances système** : `git` ne ship sur **aucun** des deux OS par défaut. Le plugin Splash
  **n'a aucun hook bash** (vérifié) → **Git Bash inutile sur Windows** → on peut **éviter git**
  entièrement via une acquisition **zip** (`Invoke-WebRequest`+`Expand-Archive` sur Win, `curl`+`unzip`
  sur Mac, tous built-in). `winget` est built-in sur Windows 10 1809+/11 (App Installer).

## 4. Architecture — « une logique, quatre surfaces »

Principe : **séparer les clés (générées, par-utilisateur) de la logique d'install (versionnée,
hébergée)**. L'actuel `generate.js` bake tout dans le fichier ; le mode copier-coller ne *peut pas*
être auto-contenu (un one-liner doit forcément fetch la logique distante). Donc la logique vit à une
URL et les deux modes convergent dessus.

```
              Page installeur (statique, GitHub Pages)
              collecte les clés → détecte l'OS
                          │
        ┌─────────────────┴─────────────────┐
   COPIER-COLLER                      TÉLÉCHARGER (launcher mince)
 Mac: export KEYS; curl …/bootstrap.sh | bash    Mac: splash-setup.command
 Win: $env:KEYS;  irm …/bootstrap.ps1 | iex      Win: splash-setup.cmd  (jamais .ps1)
        └─────────────────┬─────────────────┘
                          ▼
     Bootstrap versionné, hébergé, SANS clés (repo → install/)
     install/bootstrap.sh  (Mac)      install/bootstrap.ps1 (Win)
       • installe Bun (+ Node sur Win) + le runtime (Claude Code)
       • récupère Splash (zip — pas de git)
       • bun install + playwright install  (piloté via node sur Windows)
       • écrit ~/Splash/.env depuis les variables d'env
       • crée un launcher local double-clic, imprime la commande de lancement
```

**Hébergement** : `install/bootstrap.sh` + `install/bootstrap.ps1` vivent dans le repo, servis par la
même **GitHub Pages** que la page installeur (ou `raw.githubusercontent` sur un **tag épinglé** pour
la stabilité en release). `REPO_URL` (aujourd'hui `https://github.com/buriedsignals/splash`, marqué
« confirm before public release » dans `generate.js`) doit être **verrouillé** — déjà tracké par
`scripts/preflight-release.mjs`.

**Alternatives écartées** : (2) tout baker dans le fichier généré casse le mode copier-coller (un
one-liner doit fetch du distant) ; (3) app packagée (Tauri/MSI/pkg) = lourde, à re-signer par
OS/release, et **la signature Windows ne tue même pas SmartScreen** — contraire à l'ADN local-first.

## 5. Composants

Chaque unité a un rôle unique, une interface claire, testable isolément.

| Unité | Rôle | Entrée → sortie | Dépend de |
|---|---|---|---|
| `install/bootstrap.sh` | Logique install Mac/Linux | env (clés) → env installé + `.env` + launcher | Bun/Claude installers, réseau |
| `install/bootstrap.ps1` | Logique install Windows | env (clés) → env installé + `.env` + launcher | Bun/Node/Claude installers, winget |
| `docs/installer/generate.js` | Générateurs de sorties par-user (purs) | config (clés, OS, runtime) → { copyPaste, launcher } | `runtimes.js` |
| `docs/installer/runtimes.js` | Registre runtimes (source de vérité) | — | — |
| `docs/installer/index.html` | UI : form clés + détection OS + 2 modes + doc contournement | — | generate.js, runtimes.js |
| Garde produce (win32) | Bascule `bun`→`node` / `bunx`→`npx` pour étapes Chromium | `process.platform` → runner | — |

**`generate.js` — API cible** (fonctions pures, sans I/O ni réseau) :
- `generateCopyPaste({ os, runtime, keys, embed })` → string one-liner (bash ou PowerShell) avec
  clés inline + fetch du bootstrap hébergé.
- `generateLauncher({ os, runtime, keys, embed })` → { filename, contents } (`.command` ou `.cmd`).
- `launcherFilename(os)` → `"splash-setup.command"` | `"splash-setup.cmd"`.
- `bootstrapUrl(os)` → l'URL hébergée du bootstrap (Pages ou raw@tag).

## 6. Le bootstrap (idempotent, re-lançable)

Chaque étape teste l'existant avant d'installer (safe re-run). En pseudo-séquence :

**`bootstrap.sh` (Mac/Linux)**
1. **Bun** : `command -v bun || curl -fsSL https://bun.sh/install | bash` ; `PATH=$HOME/.bun/bin:$PATH`.
2. **Runtime** (Claude) : `command -v claude || curl -fsSL https://claude.ai/install.sh | bash`.
3. **Splash** : si `~/Splash` absent → `curl -L <zipUrl> -o /tmp/splash.zip && unzip` → `~/Splash`
   (strip du dossier racine). *(macOS ne déclenche pas l'Xcode CLT prompt puisqu'on n'appelle pas `git`.)*
4. **Deps** : pour chaque skill producteur natif (`chart-native`, `map-native`) → `(cd skill && bun install)` ;
   puis `bunx playwright install chromium` (une fois, cache partagé).
5. **`.env`** : écrit `~/Splash/.env` depuis les variables d'env (clés — voir §9).
6. **Launcher local** : écrit `~/Splash/"Launch Splash.command"` (charge `.env`, `cd`, `claude --plugin-dir .`)
   + `chmod +x`.
7. Message de succès (double-cliquer le launcher) + **unset** des variables clés.

**`bootstrap.ps1` (Windows)**
1. **Bun** : `Get-Command bun -ea 0 || (irm bun.sh/install.ps1 | iex)` ; PATH `~\.bun\bin`.
2. **Node.js** *(requis pour Playwright/Remotion — cf. §3)* : `Get-Command node -ea 0 ||
   winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements`
   (fallback documenté : scoop / MSI si winget absent).
3. **Runtime** (Claude) : `Get-Command claude -ea 0 || (irm https://claude.ai/install.ps1 | iex)`.
4. **Splash** : si `$HOME\Splash` absent → `Invoke-WebRequest <zipUrl> -OutFile $env:TEMP\splash.zip` ;
   `Expand-Archive` → `$HOME\Splash` (**pas de git**).
5. **Deps** : `bun install` dans chaque skill natif ; `bunx playwright install chromium` (le
   *téléchargement* du binaire marche sous bun ; seul le *lancement* bascule via node au produce).
6. **`.env`** : écrit `$HOME\Splash\.env` depuis `$env:` (clés).
7. **Launcher local** : écrit `Launch Splash.cmd` (charge `.env` via `for /f`, `cd`, `claude --plugin-dir .`).
8. Message de succès + `Remove-Item Env:\<clés>`.

## 7. Les deux modes de livraison (émis par la page, par OS)

- **Copier-coller** — Mac : `export KEY=… … ; curl -fsSL …/bootstrap.sh | bash`. Win :
  `$env:KEY='…' ; … ; irm …/bootstrap.ps1 | iex`. Contourne Gatekeeper/SmartScreen (pas de fichier).
  **Clés inline** (arbitrage : simplicité ; elles atterrissent dans l'historique shell → la page
  affiche « ferme le terminal après » ; clés rotables, faible enjeu). Le bootstrap unset l'env en fin.
- **Télécharger un launcher mince** — `splash-setup.command` (Mac ; auto-`chmod +x` + `xattr -d` en
  tête, message « supprime ce fichier après ») · `splash-setup.cmd` (Win ; **jamais** `.ps1`). Il
  porte les clés en env puis appelle le **même** bootstrap hébergé. Sur Win le `.cmd` invoque
  `powershell -ExecutionPolicy Bypass -Command "irm …/bootstrap.ps1 | iex"` → contourne le mur
  execution-policy. `set "KEY=…"` en cmd est hérité par le powershell enfant.

## 8. Garde rendu natif Windows (`produce.mjs`)

Dans `skills/chart-native/scripts/produce.mjs` et `skills/map-native/scripts/produce.mjs` : les
étapes qui **lancent Chromium** basculent quand `process.platform === 'win32'` :
- `snap-*.mjs` : `bun` → **`tsx`** (via `npx tsx`). *(Correction post-conception, validée au build :
  bare `node` ne suffit pas — les snap scripts importent des `.ts` avec specifiers **sans extension**
  que node ne résout pas, contrairement à bun/tsx. `tsx` tourne sous le **runtime node** (donc pas de
  hang Bun+Playwright) avec une résolution façon-bun. Prouvé sur Mac : PNG byte-identique à la sortie bun.)*
- `remotion still|render` : `bunx` → **`npx`** (remotion bundle son propre entry — pas de résolution `.ts` projet).
- Le reste (`bunx vite build` — pas de Chromium) **inchangé** (vite build sous bun marche sur Win).

Le choix du runner est une petite fonction pure (`snapCommand(platform)` → `["npx","tsx"]` | `["bun"]`,
`remotionCommand(platform)` → `["npx","remotion"]` | `["bunx","remotion"]`) testable unitairement.
`tsx` est une **devDep pinnée** de chart-native + map-native (esbuild déjà présent). Le `run` helper reçoit
`shell: isWin` (résolution des shims `.cmd` npx/bunx). Node fourni par le bootstrap Windows (§6.2).

## 9. Flux des clés

Clés collectées par le form → jamais commit, jamais dans la logique hébergée. Elles ne vivent que
(a) dans la sortie générée par-user (one-liner ou launcher), transitoirement, puis (b) dans
`~/Splash/.env` (gitignored, lu au lancement). Ensemble (existant, inchangé) :

| Variable | Usage | Requise |
|---|---|---|
| `ANTHROPIC_API_KEY` (via `runtimes.js.keyEnv`) | runtime IA | selon runtime |
| `VITE_MAPTILER_KEY` / `REMOTION_MAPTILER_KEY` | maps / vidéo-map | maps |
| `DATAWRAPPER_API_TOKEN` | export Datawrapper | charts DW |
| `SPLASH_EMBED_APP` / `FLY_API_TOKEN` | export embed (fly.io) | optionnel |

## 10. Tests / vérification

- **Fonctions pures** (`bun test docs/installer`, façon `generate.test.ts`) :
  - `generateCopyPaste` Mac + Win : assert l'env injecté (les 3–5 clés), le bon `bootstrapUrl`,
    **aucune clé dans la logique** (la logique est distante), le bon idiome (`export`+`curl|bash` /
    `$env:`+`irm|iex`).
  - `generateLauncher` Mac + Win : `.command` a l'auto-`chmod`/`xattr` ; `.cmd` a le wrapper
    `powershell -ExecutionPolicy Bypass` et **n'émet jamais** de `.ps1`.
- **Garde produce** : test unitaire `chromiumRunner('win32') === 'node'`, `chromiumRunner('darwin') === 'bun'`.
- **Registre** : le générateur refuse un runtime `verified:false` (déjà le cas).
- **Smoke manuel** (documenté dans `docs/installer/README.md`) : compte macOS propre + VM Windows
  propre → les 2 modes × 2 OS → Splash se lance et lit les clés ; sur Windows, **un visuel natif
  (chart-native) se rend** (valide le garde §8) ET le chemin Datawrapper marche.

## 11. Décisions verrouillées & suivis

**Verrouillé** : zip (pas git) · clés **inline** en copier-coller · **drop Homebrew** · **zéro
signature** (Mac non notarisé + doc ; Win jamais) · **Node sur Windows** uniquement pour
Playwright/Remotion · launcher local dans `~/Splash`.

**Suivis / hors périmètre** : notarisation macOS si un jour souhaitée · traduction FR de la page
installeur (Heidi.news = francophone) · vérif Windows des skills au-delà des producteurs natifs ·
épinglage du `zipUrl`/`bootstrapUrl` sur un tag de release (couplé au verrouillage `REPO_URL`).

## 12. Sources (grounding, 2026-07-07)

- Claude Code setup (natif Windows, install cmds) — `code.claude.com/docs/en/setup` + `claude.ai/install.ps1`.
- Bun Windows natif + install — `bun.sh/docs` / `bun.com`.
- Bug Bun+Playwright `chromium.launch()` hang — bun issues #15679 (ouvert), #23826, #27977.
- Gatekeeper/quarantine (Sequoia+), SmartScreen/MOTW, execution policy — Apple Developer / Microsoft Learn.
- Retrait des OID EV du programme racine Microsoft (~août 2024) — la signature ne tue plus SmartScreen.
- winget built-in (App Installer) — Microsoft Learn.
