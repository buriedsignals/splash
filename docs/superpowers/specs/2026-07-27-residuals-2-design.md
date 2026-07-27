# Spec — Balayage de résidus #2 (2026-07-27)

> **Statut :** clos.
> **Branche :** `feat/residuals-2`.
> **Langue :** prose FR, identifiants/code en anglais (standard non-négociable).

---

## 0. Pourquoi ce document

Quatre résidus repérés par une session précédente et parkés avec leur raison, à vérifier contre
le code réel avant tout geste — plusieurs avaient été notés contre un arbre mouvant (la tranche
`intent-declared` a tourné entre-temps sur la même zone). Un paragraphe par résidu : ce que
c'était, et ce qui a été fait — ou pourquoi il ne restait plus rien à faire.

---

## 1. `skills/splash/SKILL.md` documentait `confirm-angle` sans `--intent` *(fermé)*

Vérifié : la tranche `intent-declared` (spec `2026-07-27-intent-declared-design.md`) a bien fait
de l'intent un quatrième slot NOMMÉ de `confirmAngle` — refusé vide ou hors du vocabulaire fermé
à neuf valeurs (`lib/loop/angle.ts`), avec une commande dédiée `suggest-intent` pour poser la
question dans la langue de la rédaction sans jamais montrer l'id machine. La ligne du tableau
« the confirmed angle » de `SKILL.md` (autour de la ligne 493) documentait encore la commande
d'avant : `--takeaway --alt-insight --unit [--emphasis]`, sans `--intent` — exactement une
commande que le code refuserait aujourd'hui (blanc → `invalid-request`). Un exemple qui
contredit le comportement livré enseigne le mauvais geste, et cette ligne est recopiée par des
hôtes qui ne lisent jamais `lib/loop/angle.ts`.

Fait : la ligne ajoute `--intent <id>` à la commande, actualise la liste des refus (blanc ou
hors-vocabulaire, avec le renvoi vers `suggest-intent --takeaway <s>` pour poser la question
sans jamais présenter l'id brut) et corrige « Four NAMED slots » en « Five ». Documentation
seule, alignée sur `lib/host/README.md` qui, lui, était déjà à jour sur ce point précis.

---

## 2. La liste des commandes de `lib/host/README.md` était peut-être périmée *(déjà à jour — vérifié, pas retouché)*

Vérifié en détail contre `lib/host/cli.ts` : les branches réelles de dispatch sont `verbs`,
`state`, `next`, `init`, `advance`, `confirm-angle`, `phrase`, `choose-form`, `approve`,
`request-delivery`, `suggest-intent`, `newsroom`, `verb` — treize commandes. Le README les
documente déjà toutes sous « ## The thirteen commands », avec `suggest-intent` et la commande
`confirm-angle --intent <id>` présentes, et `capture`/`review`/`preview` documentées comme les
trois étapes déterministes que `advance` traverse entre `produce` et `deliver` (elles ne sont pas
des commandes de la façade elles-mêmes — elles n'ont pas de branche `command === "..."` dans le
dispatch, elles s'exécutent SOUS `advance`). Le résidu était réel au moment où il a été noté ; une
session antérieure l'a déjà refermé avant que celle-ci ne s'en saisisse.

Ce qui restait à faire, et qui est fait : une **garde mécanique**, pas une relecture. Un test
neuf (`lib/host/readme-parity.test.ts`) extrait par une regex les noms de commande des deux
sources de vérité — chaque `command === "<name>"` de `cli.ts` (la ligne combinée `state`/`next`
en donne deux, capturés par le même passage global) et chaque titre `### \`<name> ...\`` du
README — et compare les deux ensembles triés. Écrit d'abord contre le vrai texte : la première
version, avec une regex `\S+` sur le README, capturait `verbs\`` (l'accent grave collé, sans
espace derrière `verbs`) au lieu de `verbs` et faisait échouer le test pour une mauvaise raison —
corrigée en restreignant la capture aux caractères de nom de commande. Vérifié ensuite que le
test **détecte vraiment la dérive** : renommer temporairement un titre du README (`suggest-intent`
→ `xx-suggest-intent`) fait échouer le test avec le bon diff, remis en état avant de committer.
Même classe de garde que `capabilities-parity.test.ts`, qui interroge déjà le dispatcheur plutôt
qu'une seconde liste à la main.

---

## 3. `lib/verify/review.ts` reçoit `sourceName` sur le payload du verbe *(laissé fermé, avec sa raison — pas de nouveau code)*

C'est la question rouverte de `docs/superpowers/specs/2026-07-27-residual-sweep-design.md` §6,
non tranchée à l'époque : maintenant que `lib/source` existe, le relecteur peut-il voir
honnêtement la source déclarée, sans que cela rouvre l'indépendance de l'issue #9 (le relecteur
ne doit jamais pouvoir noter le processus plutôt que l'artefact) ?

Vérifié contre le code réel : la tranche `feat(loop): capture and review get their first
production callers` (commit `33fe16d`, postérieure à la note du §6) a déjà répondu à la question
sans qu'aucune note ne le dise explicitement. `lib/loop/verify.ts` — hors du périmètre de cette
session (`lib/loop/**`) — porte `renderedSourceName(run)` : elle résout le crédit **de la même
façon que `produce.ts`**, via `validateSourcePolicy` sur le ledger `run.sources` déclaré, et
c'est cette chaîne déjà résolue, une simple string, qui atterrit sur `ReviewRequest.source.sourceName`
avant d'appeler le verbe. Le verbe `review` lui-même (`lib/verify/review.ts`) ne voit jamais le
run, jamais le ledger — seulement le résultat, déjà honnête. C'est exactement le compromis que le
résidu demandait : la source peut être lue honnêtement **sans** élargir ce que le relecteur reçoit.
Rien à livrer en code ici — la question a une réponse, et elle était déjà la bonne architecture.

Fait, dans le seul fichier que cette session possède : un commentaire sur `ReviewRequest.source`
(`lib/verify/review.ts`) qui nomme l'invariant, pointe vers `renderedSourceName` dans
`lib/loop/verify.ts` comme le seul dérivateur légitime, et prévient explicitement contre la
tentation de « corriger » en élargissant `source` pour porter le run — ce qui rouvrirait
précisément ce que le whitelist de `redact.ts` existe pour fermer. Écrit à l'endroit où le
prochain regardera, comme demandé.

---

## 4. Renommage `intentsFromAngle` → `suggestIntents` *(déjà clos — rien à faire)*

Vérifié par grep sur tout le dépôt (code + docs) : le seul appelant de production
(`lib/loop/propose.ts`) et le fichier lui-même (`lib/brain/rank-intent.ts`) utilisent déjà
`suggestIntents`. Les seules occurrences restantes de l'ancien nom vivent dans des documents
historiques et datés : `docs/superpowers/plans/2026-07-25-proposal-brain.md` (le plan d'AVANT le
renommage, écrit sous l'ancien nom, jamais réécrit — convention du dépôt pour les plans/specs
passés) et les deux documents `2026-07-27-intent-declared-*` qui NOMMENT l'ancien identifiant
précisément pour expliquer pourquoi il a été renommé (« a name that reads like a fact is how a
guess ends up believed »). Aucune prose vivante ne traite plus la suggestion comme un fait sous
le nom `intentsFromAngle`. Résidu clos par la tranche qui l'a créé ; rien à changer.

---

## Ce qui s'est avéré faux dans le brief

Rien : les quatre résidus, une fois vérifiés contre le code réel, correspondaient à leur
description — deux étaient déjà fermés par des tranches postérieures (items 2 et 4), un
appelait un jugement plutôt qu'un correctif et le jugement a confirmé l'architecture existante
(item 3), et un seul demandait effectivement une modification de fichier (item 1, un tableau de
documentation en retard d'un slice).
