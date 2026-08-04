# Goose Desktop — ce que la vérification a établi

**Date** : 2026-08-03 · **Machine** : macOS 26.3 (arm64), Goose Desktop **1.45.0**, Goose CLI **1.43.0**
**Tâche 1 du plan** `docs/superpowers/plans/2026-08-03-goose-desktop-runtime.md` — le gate qui peut
annuler la spec.

Statut : **les 3 questions sont répondues, positivement. Le gate est FERMÉ, la spec tient — et elle
rétrécit** : aucune plomberie de `PATH` n'est nécessaire, et une des sept tâches du plan se révèle
déjà faite. Q1 et Q2 ont été fermées le matin (§ Q1, § Q2) ; **Q3 l'a été l'après-midi** (§ Q3), sans
le pilote humain que la première passe croyait indispensable.

> **L'état de la machine a changé entre les deux passes.** Le matin, l'app tournait depuis
> AppTranslocation et `/Applications/Goose.app` était absent (§ F1 ci-dessous). L'après-midi, elle est
> installée normalement — `/Applications/Goose.app`, backend
> `goose serve --tls --platform desktop --host 127.0.0.1 --port 63044`. **F1 reste un constat valide
> pour le module** : c'est ce qu'obtient un journaliste qui dézippe et double-clique depuis
> Téléchargements, pas un artefact de cette session.

---

## Le contexte, parce qu'il a failli fausser tout le diagnostic

L'app **était ouverte** sur la machine, et pourtant :

- `/Applications/Goose.app` — **absent**
- `mdfind` (index Spotlight) — **aucun résultat**
- `~/Library/Application Support/Goose` — **absent**

D'où une première conclusion erronée : « l'app n'est pas installée ». La vérité est venue de
`ps aux` :

```
/private/var/folders/…/T/AppTranslocation/FF22E6E5-…/d/Goose.app/Contents/MacOS/Goose
/private/var/folders/…/d/Goose.app/Contents/Resources/bin/goose serve --tls
```

L'app tourne depuis **AppTranslocation** — le montage temporaire, aléatoire et en lecture seule que
Gatekeeper impose à une application **quarantainée exécutée sans avoir été déplacée dans
`/Applications`**. Origine réelle : `~/Downloads/Goose.app`, dézippée depuis `Goose.zip`.

> ★ **F1 — CONSÉQUENCE DIRECTE SUR LE MODULE (important).** Un journaliste qui fait le geste le plus
> naturel — dézipper et double-cliquer depuis Téléchargements — obtient une app **translocée**. Donc :
> - la détection par `[ -d "/Applications/Goose.app" ]` **échoue** alors que l'app existe et tourne ;
> - `open -a Goose` peut ne pas viser la bonne copie ;
> - aucun chemin stable n'existe tant que l'app n'est pas déplacée.
>
> Le module `goose-desktop.sh` doit **détecter la translocation** (ou l'absence dans `/Applications`
> alors qu'un processus Goose tourne) et demander explicitement le déplacement, plutôt que de conclure
> « pas installée » et réinstaller par-dessus.

> ★ **F2 — L'app et la CLI sont DEUX installations distinctes, à des versions différentes.**
> App : `Contents/Resources/bin/goose` en **1.45.0**. CLI : `~/.local/bin/goose` en **1.43.0**.
> C'est exactement la divergence décrite par le bug amont où un skill fonctionnait dans l'app et pas
> dans la CLI. **Ne jamais inférer le comportement de l'une depuis l'autre** — la confusion est facile,
> les deux répondent à `goose`.

---

## Q1 — Où l'app de bureau lit-elle les skills ? → `~/.agents/skills` ✅

Interrogé **le binaire embarqué de l'app** (celui qui fait tourner l'interface, `goose serve --tls`),
pas la CLI :

```
"$APP/Contents/Resources/bin/goose" skills list
```

Les skills Splash remontent, avec `Location = /Users/rmdms/.agents/skills/<nom>`.

> ★ **CORRECTION (preuve niveau A, même jour).** La première rédaction disait « **les 12** skills
> Splash remontent ». C'est faux, et le comptage est instructif : **12 répertoires sont LIÉS, 11 sont
> DÉCOUVERTS**, et la douzième ligne de la liste était `goose-doc-guide`, le builtin de Goose.
> Le manquant est **`skills/image-native/`** — le seul répertoire de `skills/` **sans `SKILL.md`**
> (il n'en a jamais eu, et aucune prose n'en référence un). C'est une bibliothèque de production que
> `suggest-image` pilote, posée dans un répertoire dont tous les voisins sont des skills, et
> `link_agents_skills` la lie parce qu'il globe `skills/*/` sans regarder. Les hôtes l'ignorent en
> silence. Détail et conséquences : `docs/installer/goose-desktop-proof.md`.

**C'est le répertoire que `link_agents_skills` alimente déjà.** Aucun chemin nouveau à gérer, aucune
copie à prévoir : le module `goose-desktop` peut appeler le helper partagé tel quel.

## Q2 — Un skill lié par symlink est-il suivi ? → OUI ✅

Les 12 entrées de `~/.agents/skills` sont des **liens symboliques** vers
`/Users/rmdms/Sites/Professional/splash-merge/skills/<nom>/`, et l'app les résout et les liste.
Le mécanisme de distribution du projet (lier, ne pas copier) tient pour l'app.

## Q3 — L'app exécute-t-elle les scripts d'un skill ? → OUI, **et le runtime dont nos producteurs ont besoin est atteignable** ✅

C'était la question make-or-break, et elle a bien failli être enregistrée à l'envers.

### Q3.1 — L'app est lancée depuis le Dock, donc son `PATH` est nu

```
$ pgrep -fl Goose
… /Applications/Goose.app/Contents/Resources/bin/goose serve --tls --platform desktop --host 127.0.0.1 --port 63044

$ ps eww <pid>
PATH=/Applications/Goose.app/Contents/Resources/bin:/usr/bin:/bin:/usr/sbin:/sbin
SHELL=/bin/zsh   USER=rmdms   HOME=/Users/rmdms   TMPDIR=…
```

`bun` vit en `/usr/local/bin/bun`. **Ce répertoire n'est pas dans la liste.** Tous les producteurs
Splash sont en Bun : si un processus fils héritait simplement de cet environnement, rien de ce qu'on
livre ne tournerait.

### Q3.2 — La mesure qui était fausse, et pourquoi elle est écrite ici plutôt que gommée

Première sonde : une commande passée par `goose run` sous cet environnement exact, provider
`claude-code`. Résultat :

```
BUN-NOT-FOUND
PATH=/Applications/Goose.app/Contents/Resources/bin:/usr/bin:/bin:/usr/sbin:/sbin:…
```

Ça se lit comme un constat bloquant. Ça n'en est pas un, parce que **ça ne mesure pas l'outil shell
de Goose** : sous ce provider, c'est l'outil de la CLI `claude` qui a exécuté la commande — les
entrées `…/bin` en fin de `PATH` observé sont ses répertoires de plugins, que Goose n'ajoute jamais.
La sonde répondait à une question que personne n'avait posée.

Même classe que les erreurs que ce projet paie en boucle : un résultat cru parce qu'il était
plausible, venu d'un instrument que personne n'avait vérifié comme pointé sur la cible. Écrit, pas
remplacé en silence.

### Q3.3 — La mesure qui répond

L'outil shell de Goose est une **extension de plateforme**, en processus : il ne peut pas être sondé
en MCP stdio (`goose mcp developer` → `Invalid command`). La chaîne a donc été établie depuis la
source livrée à la version exacte, avec le seul maillon dépendant de l'environnement mesuré en vrai.

1. **Le backend déclare sa plateforme** : `--platform desktop`, observé ci-dessus.

2. **C'est cette plateforme qui est l'interrupteur** — `crates/goose/src/agents/agent.rs`, v1.45.0 :

   ```rust
   fn resolve_use_login_shell_path(explicit: Option<bool>, platform: &GoosePlatform) -> bool {
       explicit.unwrap_or(matches!(platform, GoosePlatform::GooseDesktop))
   }
   ```

   Vrai sur Desktop, faux sur la CLI. La fonction qu'il commande porte le commentaire amont qui
   décrit exactement notre problème : *« When goosed is launched from a desktop app (e.g. Electron),
   it may inherit a minimal PATH like `/usr/bin:/bin`. This function spawns a login shell to source
   the user's profile and recover the full PATH. »*

3. **Ce qu'elle lance** — `platform_extensions/developer/shell.rs` :

   ```rust
   fn unix_login_shell_command_args(shell: &str) -> [&'static str; 4] { ["-l", "-i", "-c", probe] }
   ```

   `-l -i` : shell **de login ET interactif**, donc `.zprofile` (donc `path_helper`) *et* `.zshrc`
   sont sourcés.

4. **Ce qu'elle en fait** — même fichier :

   ```rust
   if let Some(path) = login_path { command.env("PATH", path); }
   ```

   Le `PATH` récupéré est injecté dans le fils qui exécute la commande.

5. **Le maillon vivant — cette invocation-là, sous l'environnement exact de l'app :**

   ```
   $ env -i PATH=<le PATH de l'app> HOME=… USER=… SHELL=/bin/zsh … /bin/zsh -l -i -c 'echo $PATH; command -v bun'
   LOGIN_PATH=/Users/rmdms/Library/Python/3.11/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:…
   /usr/local/bin/bun
   ```

**Donc sur Goose Desktop un producteur trouve `bun`.** La tâche 3 n'a besoin d'aucune plomberie de
`PATH` : ni `launchctl setenv`, ni wrapper, ni copie de binaire dans le bundle.

### Q3.4 — La condition qui doit tenir, et ce que le module lui doit

La récupération ne vaut que ce que vaut le profil shell du journaliste. `bun` est trouvé ici parce
que `/usr/local/bin` est sur la liste par défaut de `path_helper` ; une installation neuve, c'est
autre chose : `install/bootstrap.sh:31-36` installe Bun via `bun.sh/install` dans `$HOME/.bun`, puis
exporte `$BUN_INSTALL/bin` **le temps du processus bootstrap seulement**. Ce qui le fait survivre,
c'est que l'installeur de Bun ajoute lui-même son export au `.zshrc` — que la sonde `-l -i` source.

C'est une dépendance au fait qu'un tiers édite un profil, et elle échoue **en silence** : l'app
trouverait les skills, lirait la prose, lancerait la commande, et rendrait `command not found: bun`.

> ★ **F3 — DÛ PAR LA TÂCHE 3, et peu coûteux.** Après avoir câblé la découverte, vérifier qu'un shell
> de login+interactif résout bien `bun` ; s'il ne le résout pas, ajouter l'export au profil au lieu de
> le supposer. Une vérification, un message, et le mode de panne disparaît.

### Q3.5 — Un fait d'environnement de plus, pour le S2 de l'audit

Le renderer est démarré avec `GOOSE_WORKING_DIR=/Users/rmdms` : **l'app ouvre dans `$HOME`**, pas
dans un projet. Ça confirme sur l'app de bureau le constat S2 de
`docs/splash/host-gates-audit-2026-08-02.md` — notre prose est écrite relativement à une racine de
dépôt qu'aucun `SKILL.md` ne résout, et ça marche aujourd'hui parce qu'un lanceur fait `cd` d'abord.
Rien ici ne le corrige ; c'est nommé pour que le module ne soit pas crédité de l'avoir fermé.

---

## Le canal d'installation — le plan sondait le mauvais nom

L'étape 1 du plan lance `brew info --cask goose` et traite « pas de cask » comme la branche à prévoir.
Ce nom n'existe pas, mais **un cask existe** :

```
$ brew info --cask goose
Error: Cask 'goose' is unavailable: No Cask with this name exists.

$ brew info --cask block-goose
==> block-goose (Goose): 1.45.0
Required: macOS >= 12
==> Artifacts
Goose.app (App)
```

Et un téléchargement direct existe aussi, ce qui est ce qui compte pour un journaliste sans Homebrew :

- `Goose.zip` (Apple Silicon) et `Goose_intel_mac.zip` (Intel), depuis la release GitHub ;
- **`github.com/block/goose` redirige désormais vers `github.com/aaif-goose/goose`.** Une URL codée
  en dur sur l'ancien chemin marche aujourd'hui par redirection et cassera le jour où elle s'arrête.

> ★ **F4.** Garder **les deux branches** dans le module plutôt qu'en supprimer une : Homebrew quand il
> est là, le `.zip` sinon. Et `.zip`, pas `.dmg` — il n'y a aucune image à monter, donc l'esquisse
> `hdiutil` du plan ne s'applique pas.

## Le provider — ce qui débloque la preuve de niveau B

Goose 1.45 embarque un provider **`claude-code`** (`crates/goose/src/providers/claude_code.rs`) qui
pilote la CLI `claude` locale. La preuve de niveau B (tâche 6) n'a donc **pas** besoin d'une clé API
neuve : elle tourne sur l'abonnement existant, et se sélectionne par run
(`goose run --provider claude-code --model sonnet`) **sans toucher la configuration du journaliste**.

Confirmé au passage, et c'est le blocage historique : le provider configuré sur la machine est
`google`, et son quota gratuit est à **zéro** — `limit: 0` sur `generate_content_free_tier_requests`.
C'est ce qui avait coupé la preuve de niveau B le 2026-07-14 ; ce n'est pas un accident de quota,
c'est l'état permanent du palier gratuit.

## Les deux skills parasites remontent aussi sur l'app

```
playwright-cli    … /Users/rmdms/.agents/skills/dw-chart/node_modules/playwright-core/lib/tools/cli-client/skill
playwright-trace  … /Users/rmdms/.agents/skills/dw-chart/node_modules/playwright-core/lib/tools/trace
```

L'item **B6 du backlog** n'est donc pas un artefact de la CLI : il vaut pour l'app de bureau.

## Un second répertoire de découverte, vérifié

`~/.config/goose/skills` est lu **aussi**. Sonde posée puis retirée :

```
$ mkdir -p ~/.config/goose/skills/splash-probe && … > …/SKILL.md
$ goose skills list
splash-probe  | A probe skill used once to establish … | /Users/rmdms/.config/goose/skills/splash-probe
```

Sans conséquence sur le module — `~/.agents/skills` suffit et c'est celui que le helper partagé
alimente déjà. Noté pour qu'on ne re-sonde pas la question.

---

## Réserve de méthode, à ne pas gommer

L'interrogation a porté sur le **binaire embarqué de l'app**, pas sur son processus d'interface. Les
deux partagent le bundle et la découverte passe par ce binaire (`goose serve`), donc la preuve est
forte — mais elle n'est pas la même chose que « l'app affiche `splash` dans sa liste de skills à
l'écran ». Un coup d'œil dans l'interface la convertirait en preuve directe, et coûte dix secondes.

## Ce que ça change pour le plan

| Tâche | État après ce gate |
|---|---|
| **1 — le gate** | **FERMÉ.** Les trois questions répondues, canal d'installation tranché (F4). |
| **2 — balayage des liens morts** | **DÉJÀ FAITE ET FUSIONNÉE.** `install/bootstrap.sh:15-26` porte le balayage, `install/bootstrap.ps1:17-27` le reflète pour les jonctions, et `docs/installer/bootstrap-sh.test.ts:97` l'épingle. Arrivée avec `fix/dead-skill-links`. **Retirer la tâche, ne pas la ré-implémenter.** |
| **3 — le module `goose-desktop`** | Tient. Peut appeler `link_agents_skills` sans variante (Q1, Q2). Doit intégrer **F1** (translocation — le plan ne le prévoyait pas), **F3** (vérifier `bun` sur le PATH de login) et **F4** (cask `block-goose`, canal `.zip`, propriétaire `aaif-goose`). **Aucune injection de `PATH`.** |
| **4 — l'entrée de la page de setup** | Inchangée. |
| **5 — preuve niveau A** | Inchangée, moins l'étape lien-mort : elle prouve désormais un helper déjà livré, pas un helper neuf. |
| **6 — preuve niveau B** | Débloquée côté provider : `--provider claude-code` tourne sur l'abonnement existant, sans clé neuve ni modification de la config du journaliste. |
| **7 — le gate final** | Inchangé. |

- **F2** impose de tester dans l'app tout ce qu'on croit savoir de la CLI, et réciproquement.

**Non mesuré, et nommé plutôt que supposé** : si l'app exécute un producteur **de bout en bout**
(c'est le niveau B, tâche 6 — ce gate établit qu'elle exécute une commande et sait trouver le
runtime, pas qu'un visuel en sort) ; et si l'app impose une **demande d'autorisation** que le
journaliste doit cliquer, puisque toutes les mesures ici sont passées par le point d'entrée CLI du
même binaire, pas par la fenêtre.
