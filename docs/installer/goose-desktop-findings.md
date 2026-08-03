# Goose Desktop — ce que la vérification a établi

**Date** : 2026-08-03 · **Machine** : macOS, Goose Desktop **1.45.0**, Goose CLI **1.43.0**
**Tâche 1 du plan** `docs/superpowers/plans/2026-08-03-goose-desktop-runtime.md` — le gate qui peut
annuler la spec.

Statut : **2 questions sur 3 répondues, positivement. La troisième reste ouverte.**

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

Les 12 skills Splash remontent, tous avec `Location = /Users/rmdms/.agents/skills/<nom>`.

**C'est le répertoire que `link_agents_skills` alimente déjà.** Aucun chemin nouveau à gérer, aucune
copie à prévoir : le module `goose-desktop` peut appeler le helper partagé tel quel.

## Q2 — Un skill lié par symlink est-il suivi ? → OUI ✅

Les 12 entrées de `~/.agents/skills` sont des **liens symboliques** vers
`/Users/rmdms/Sites/Professional/splash-merge/skills/<nom>/`, et l'app les résout et les liste.
Le mécanisme de distribution du projet (lier, ne pas copier) tient pour l'app.

## Q3 — L'app exécute-t-elle les scripts d'un skill ? → **NON ÉTABLI**

Rien dans ce qui précède ne le prouve : lister un skill n'est pas l'exécuter. C'est la question
make-or-break — un hôte qui lit la prose mais n'exécute rien ne produit aucun fichier.

**Ce qu'il faut faire** : dans l'interface de l'app, demander un travail qui atteint un producteur
(`skills/dw-chart` est le moins cher — ni Playwright ni MapTiler) et observer si l'app exécute, refuse,
ou demande une permission. **Nécessite un pilote humain de l'interface.**

---

## Réserve de méthode, à ne pas gommer

L'interrogation a porté sur le **binaire embarqué de l'app**, pas sur son processus d'interface. Les
deux partagent le bundle et la découverte passe par ce binaire (`goose serve`), donc la preuve est
forte — mais elle n'est pas la même chose que « l'app affiche `splash` dans sa liste de skills à
l'écran ». Un coup d'œil dans l'interface la convertirait en preuve directe, et coûte dix secondes.

## Ce que ça change pour le plan

- **Tâche 3** — le module peut appeler `link_agents_skills` sans variante : Q1 et Q2 sont favorables.
  Mais sa détection doit gérer **F1** (translocation), ce que le plan ne prévoyait pas.
- **Tâche 1** — reste ouverte sur Q3 seulement, plus le canal d'installation (`.dmg` vs `brew`), qui
  n'a pas été tranché puisque l'app était déjà présente autrement.
- **F2** impose de tester dans l'app tout ce qu'on croit savoir de la CLI, et réciproquement.
