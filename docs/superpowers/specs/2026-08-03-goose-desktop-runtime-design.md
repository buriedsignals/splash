# Splash sur les applications de bureau — le runtime `goose-desktop`

**Date** : 2026-08-03
**Statut** : conçu, validé par Rémy, non implémenté
**Décision fondatrice** : « L'ensemble doit fonctionner sur les apps de bureau, pas que les CLI qui
sont plus pour les techs. » (Rémy, 2026-08-03) — Goose Desktop d'abord, parce que c'est le pilote,
puis les autres apps de bureau.

## Le problème

Splash n'est pas une application : c'est un jeu de skills, et `skills/splash/SKILL.md` est de la prose
qu'un agent lit et suit. **L'agent est le runtime.** Les quatre runtimes que l'installeur sait servir
aujourd'hui — Claude Code, Codex, Gemini CLI, Goose CLI — sont **tous des CLI**. Or l'utilisateur visé
est un journaliste sans équipe technique et sans terminal.

L'audit `docs/splash/host-gates-audit-2026-08-02.md` a mesuré l'écart : un seul hôte permet aujourd'hui
à un journaliste d'aller d'un article à un fichier fini, et c'est une CLI. Ce lot ouvre le premier
chemin d'app de bureau.

### Trois faits établis avant la conception (2026-08-03)

1. **Les producteurs ont un repli disque.** Quand la variable d'environnement est absente, ils lisent
   le `.env` à la racine du dépôt (`skills/scrolly/scripts/produce.mjs:21-35`, même mécanisme dans une
   douzaine de scripts `chart-native`). **C'est ce qui rend une app de bureau viable** : un agent lancé
   depuis le Dock n'hérite d'aucune variable, et trouve quand même les clés. Le lanceur qui source
   `.env` n'est donc pas indispensable au produit — seulement à la CLI.
2. **Goose Desktop a le système de skills complet.** Le défaut connu allait dans l'autre sens : c'était
   la CLI qui était en retard sur l'app. (Source secondaire — à confirmer par la vérification § 5.)
3. **Sur une machine de développement, les liens de skills sont morts.** Les neuf entrées de
   `~/.agents/skills` pointent vers `…/Professional/atelier/…`, chemin disparu au renommage
   atelier→splash. **Aucun hôte lisant ce répertoire ne trouve Splash.** Un journaliste installé avant
   un renommage a un Splash silencieusement invisible, sans message d'erreur.

## Décision de forme : on garde le `.command`

Trois formes ont été pesées. **Retenue : (a) garder le `.command` double-cliquable.**

- **(a) `.command`** — coût quasi nul, tout existe. Le journaliste ne tape rien ; une fenêtre de
  terminal apparaît à l'installation. Promesse publique honnête : « aucune commande à taper ».
- **(b) une vraie `Splash.app`** — aucun terminal jamais, mais bundle, signature et **notarisation
  Apple** (compte développeur payant, récurrent). Écarté : coût récurrent qu'un projet MIT porte mal.
- **(c) tout déléguer à Goose Desktop** — le moins de code, mais dépend entièrement d'une capacité
  d'installation de skill depuis l'app, non vérifiée. Écarté comme socle, à re-considérer si la
  vérification § 5 montre que l'app sait le faire seule.

**Conséquence assumée** : le terminal apparaît **à l'installation**, jamais à l'usage — parce que
`runtime_launch_cmd` ouvre l'application et rend la main.

## Architecture

### Ce qui ne change pas

Le `.command`, la page de configuration locale sur `127.0.0.1`, les clés dans `~/Splash/.env`, le repli
disque des producteurs, le contrat des modules de runtime.

### Ce qui change

`install/runtimes/goose.sh` cesse d'être le seul module Goose. Il en existe **deux**, parce qu'ils ne
servent pas les mêmes gens :

| Module | Pour qui | Lancement |
|---|---|---|
| `goose` (existant) | dev, Tom, Rémy | `goose session` dans le terminal |
| `goose-desktop` (neuf) | **la rédaction** | `open -a Goose` |

La page de configuration les propose comme deux choix distincts (`install/configurator-core.ts`,
`RUNTIMES`).

### Le module `goose-desktop`

Même contrat que les quatre existants (`install/runtimes/README.md`) : `runtime_install` et
`runtime_launch_cmd`. `runtime_install` enchaîne quatre étapes, **chacune idempotente** :

1. **Détecter avant d'installer.** Si `Goose.app` est présente dans `/Applications`, ne rien toucher.
   Un journaliste qui utilise déjà Goose ne doit pas voir son installation remplacée.
2. **Installer si absente**, par le canal officiel de Block. Canal exact à fixer par la vérification
   § 5 : `.dmg` à monter, ou `brew install --cask` (plus propre en script, mais suppose Homebrew, que
   le journaliste n'a pas forcément).
3. **Nettoyer puis poser les skills.** **Supprimer d'abord les liens morts** de chaque répertoire de
   découverte — c'est ce qui répare une installation cassée par un renommage — puis lier les skills.
   Aux deux emplacements si la vérification § 5 montre qu'ils divergent.
4. **Ne pas toucher au fournisseur LLM.** Goose est agnostique et l'app a son propre écran de
   configuration. Y injecter une clé par script serait fragile et intrusif. La page Splash collecte
   MapTiler et Datawrapper — les clés du **produit** — et laisse le journaliste choisir son modèle
   dans Goose.

`runtime_launch_cmd` rend `open -a Goose`.

### Le nettoyage des liens morts

Un lien mort est indistinguable d'une absence pour l'utilisateur, mais pas pour le script : il existe
et pointe vers rien. `link_agents_skills` (défini dans `install/bootstrap.sh`) pose des liens mais ne
détecte ni ne répare l'existant. Ce lot ajoute ce nettoyage **au helper partagé**, pas au seul module
`goose-desktop` — le défaut frappe Codex et Gemini de la même façon, et le corriger au seul endroit
neuf laisserait trois hôtes cassés.

## Preuve

Contrat en deux couches, comme les quatre adaptateurs existants (`docs/installer/<runtime>-proof.md`) —
cette distinction est ce qui a évité de survendre Goose CLI.

- **Couche A — installation et découverte.** L'app s'installe ou est détectée ; les liens morts sont
  nettoyés ; les skills apparaissent dans l'app. Vérifiable localement, **sans dépenser un token**.
- **Couche B — le parcours réel.** L'app active `splash`, invoque `suggest-article` puis
  `suggest-chart`, et **produit un fichier**. C'est la couche que Goose CLI n'a jamais franchie (coupée
  par le quota Gemini gratuit, `docs/installer/goose-proof.md:53-55`). Le plan Anthropic la rend
  atteignable ; **la même expérience ferme aussi le trou du pilote CLI**.

**Règle non négociable : `verified: true` dans `RUNTIMES` seulement si la couche B passe.** Le drapeau
de Goose CLI est aujourd'hui une décision produit, pas une preuve — son fichier de preuve le dit. Pas
de second drapeau de complaisance, surtout sur le chemin qu'une rédaction empruntera.

### Tests automatisés

Hermétiques, sur le patron de `docs/installer/goose-runtime.test.ts`, dans `bun run check`, **sans
réseau ni app installée** : le script est du bash valide · `runtime_launch_cmd` rend la bonne commande ·
le câblage des liens fonctionne avec l'installation simulée · **un lien mort est détecté et supprimé**
(le cas neuf de ce lot) · parité `.ps1` si un équivalent Windows est fourni.

## § 5 — Vérification préalable, AVANT d'écrire une ligne

Trois questions, dix minutes, aucune dépense :

1. **Où Goose Desktop lit-il les skills ?** `~/.agents/skills`, `~/.config/goose/skills`, ou les deux ?
   (La preuve live du 2026-07-14 valide `~/.agents/skills` **pour la CLI en 1.43.0** ; une source
   secondaire mentionne `~/.config/goose/skills` — les deux peuvent être vrais selon la version.)
2. **Un skill lié par symlink y apparaît-il comme utilisable ?** Le lien symbolique est notre mécanisme
   de distribution ; s'il n'est pas suivi, il faut copier au lieu de lier.
3. **L'app exécute-t-elle les scripts d'un skill ?** Rémy le tient pour acquis — « Splash est justement
   créé pour ça » — et le skill `pdf` livré par Anthropic dans Claude Desktop appelle bien Python et des
   outils en ligne de commande, ce qui rend l'hypothèse raisonnable. **Personne ne l'a vu tourner dans
   Goose Desktop.**

**Si la vérification dit non** — aucun répertoire alimentable, ou pas d'exécution de scripts — alors ce
n'est pas un module d'installeur qu'il faut mais un pont d'un autre genre, et **l'implémentation
s'arrête pour en rendre compte** plutôt que de forcer une conception caduque. C'est le seul scénario
qui invalide cette spec, et il se détecte avant tout code.

## Hors périmètre

- **Les autres apps de bureau** (Claude Desktop et suivantes). Claude Desktop a une surface de skills
  native au **format identique au nôtre** (`SKILL.md` + frontmatter + `scripts/`) sous
  `~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/…` — donc la conclusion
  « non-démarrage » de l'audit porte sur **l'absence d'adaptateur dans notre dépôt**, pas sur une
  incapacité de la plateforme. Reste à établir si un tiers peut y déposer un skill (le répertoire est
  géré, avec des UUID, vraisemblablement synchronisé depuis le compte). **Lot suivant.**
- **Le poids de la prose** (~45-50 k tokens par invocation, mesuré) : contrainte d'hôte réelle, traitée
  par le découpage de `SKILL.md` (`docs/superpowers/specs/2026-07-30-skill-phase-split-design.md`), pas
  ici. Noter la tension : le découpage **ajoute** cinq invocations imbriquées, le mécanisme non prouvé
  sur le pilote — d'où l'intérêt de fermer la couche B d'abord.
- **La notarisation Apple** et tout bundle `.app` — écartés avec leur raison ci-dessus.
- **Windows** : le module `.ps1` suivra si l'app Goose y est distribuée de la même façon ; non conçu
  ici faute de machine pour le vérifier.
