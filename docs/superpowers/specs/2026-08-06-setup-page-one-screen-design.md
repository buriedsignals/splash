# La page de réglages devient un seul écran : l'adresse du site fabrique le profil

**Date** : 2026-08-06 · **Branche** : `feat/setup-page-one-screen` · **Origine** : trois retours de
Rémy en regardant la page servie après la fusion de `feat/setup-page-keys-and-profile`.

Troisième chantier sur le même écran, et le premier qui **retire** plutôt qu'il n'ajoute. Il
renverse deux décisions récentes ; elles sont nommées au §2, parce qu'une décision qu'on annule
sans le dire revient toujours par la fenêtre.

---

## 1. Les trois constats

### 1.1 Le profil s'affiche mais ne s'édite pas — et à l'install, il n'existe pas

Le chantier précédent a fait afficher `NEWSROOM-PROFILE.md` en lecture seule, pour ne pas réécrire
un fichier qui appartient à la rédaction. Vu sur la vraie page, c'est le mauvais arbitrage :

- **à l'installation, ce fichier n'existe pas.** La rédaction qui installe Splash pour la première
  fois n'a ni couleur maison ni crédit à déclarer — c'est précisément ce qu'elle vient chercher ;
- le formulaire « nom / site / couleur » qui s'affiche à sa place demande **à un journaliste le
  code hexadécimal de sa maison**, ce que `skills/newsroom-charter` documente comme la raison même
  de son existence : *« A journalist is not a designer and does not know their newsroom's hex »* ;
- et une fois le profil écrit, la page redevient muette : elle affiche, on ne peut plus rien
  corriger depuis l'écran qui l'a créé.

**Décision de Rémy (2026-08-06)** : la section devient **éditable**, et **l'adresse du site la
remplit**. On colle l'URL, Splash mesure le site, propose ce qu'il a lu — avec l'origine de chaque
valeur — le journaliste corrige, et la page **écrit** le profil.

### 1.2 La section Langue n'a plus lieu d'être

`lang` est un champ du profil. Depuis que le profil est sur la page, la section Langue demande une
deuxième fois, dans un autre vocabulaire, ce que la section au-dessus vient d'établir — et le
chantier précédent a déjà produit l'incohérence visible : le profil affichait `fr` pendant que le
sélecteur affichait *Français*, la même valeur nommée deux fois sur un écran.

### 1.3 Les cases à cocher n'ont plus lieu d'être

Depuis que les clés de production sont demandées d'emblée, cocher « Datawrapper charts » n'ouvre
plus rien : la clé est déjà réclamée au-dessus. Il ne reste à la case qu'un rôle administratif —
décider ce que « Où vous en êtes » appelle un blocage — c'est-à-dire faire porter au journaliste
une déclaration dont la seule conséquence est le ton d'un message.

---

## 2. Les deux décisions renversées, nommées

| Décision renversée | Où elle était | Ce qui la remplace |
|---|---|---|
| **« La page n'écrit jamais dans un `NEWSROOM-PROFILE.md` existant ; ce fichier appartient à la rédaction »** (2026-07-24, décision 6 ; réaffirmée comme D2 le 2026-08-06) | `install/preflight/client.ts` renvoyait vers un éditeur de texte | La page écrit le profil, **toujours après validation humaine**. Le fichier reste celui de la rédaction : ses commentaires et ses champs inconnus survivent à une réécriture (§3.1). |
| **« Une case par outil, l'envie mène »** (2026-08-06, D3 du chantier précédent) | `want` / `choice` sur les capacités, groupes rendus par `groupEnginesByWant` | Plus de cases. Ce que la rédaction peut produire se **déduit** de ce qui est configuré, et se lit en fin de page (§3.4). |

Le `want` et le `choice` du registre ne sont pas supprimés du modèle de données : ils restent la
manière dont une capacité se nomme en langue de journaliste, et le récapitulatif final s'en sert.
Ce qui disparaît, c'est la **case** et le groupe qui la portait.

---

## 3. Ce que la page devient

Quatre sections, dans cet ordre : **Votre rédaction · Votre assistant · Vos comptes · Ce que vous
pourrez produire.**

### 3.1 Votre rédaction

Un champ d'abord : **l'adresse de votre site**. À la validation, la page appelle
`lib/newsroom/charter.ts` (`proposeCharter`, déjà écrit, déterministe, sans LLM) via
`charter-fetch.ts`, et pré-remplit :

- la **palette** — la primaire d'abord, chaque valeur montrée avec **d'où elle vient** (« lue dans
  le logo », « couleur des liens de vos articles ») et avec sa confiance telle que l'extracteur la
  donne : `declared` reste `declared`, `inferred` est relayé comme une supposition ;
- le **crédit** — nom de la rédaction et URL ;
- le **fond maison**, quand `groundTheme()` en déduit un ;
- les **typos** — voir ci-dessous.

Tous les champs restent **éditables**, avant comme après la mesure. Le site qui ne déclare rien est
une réponse légitime, pas une erreur : la page le dit et laisse la saisie manuelle.

**Ce que la page écrit, et ce qu'elle ne touche pas.** L'écriture passe par
`lib/newsroom/profile-write.ts`, qui est déjà l'unique auteur de ce fichier. Sur un profil
existant, elle **préserve le corps** (les commentaires du journaliste, ses notes) et ne réécrit que
les champs du frontmatter qu'elle connaît ; un champ inconnu est laissé tel quel. Rien n'est écrit
sans un geste humain — la mesure n'est jamais une décision, invariant de `skills/newsroom-charter`.

**Les typos vont dans le CORPS, pas dans le frontmatter.** Le mesureur lit les familles du corps,
des titres et les `@font-face` auto-hébergées (`lib/newsroom/charter.ts:588-670`) ; aucun moteur ne
les applique aujourd'hui. Elles sont donc enregistrées comme **notes datées avec leur origine**
(`NewsroomFacts.notes`, déjà supporté), et non comme une clé `fonts:` que rien ne lirait — la règle
que le fichier s'impose à lui-même : *« a key the reader ignores would be a promise the pipeline
does not keep »* (`lib/newsroom/profile-write.ts:15-17`). Le jour où les moteurs appliquent la typo
(sous-projet #3), elle monte en champ.

### 3.2 Votre assistant

Inchangée. Six runtimes, le login déclaré par celui qu'on choisit.

### 3.3 Vos comptes

Les deux clés de production, demandées d'emblée (acquis du chantier précédent), plus les
destinations de publication qui restent conditionnées au choix d'y publier. La phrase de section
n'a plus à parler de cases : elle dit ce que les comptes ouvrent.

### 3.4 Ce que vous pourrez produire

Dernière section, et un **constat**, pas un formulaire : à partir de ce qui vient d'être saisi, la
page liste ce que la rédaction peut produire — et, pour ce qu'elle ne peut pas, la clé qui
l'ouvrirait. Aucun signalement de « manquant », aucune case : un compte absent n'est pas un défaut,
c'est un choix.

La dérivation est celle qui existe déjà (`lib/newsroom/readiness.ts`), à ceci près qu'elle ne
consulte plus l'état coché : un moteur dont les clés sont là est disponible, un moteur maison l'est
toujours.

---

## 4. Ce que ça ne fait pas

- **Aucun moteur n'apprend la typo.** Elle est mesurée et notée, rien de plus (sous-projet #3).
- **`want` / `choice` restent au registre** : le récapitulatif nomme les capacités avec.
- **Aucun run de preuve des apps de bureau.** Inchangé : Couche B non observée pour les deux, et le
  motif écrit à côté de chaque drapeau dit pourquoi — y compris la confusion `goose` / `goose-desktop`
  que ce dépôt a payée deux fois.
- **La clé MapTiler morte n'est pas de ce chantier** : elle bloque tout rendu de carte et se
  regénère sur `cloud.maptiler.com`.

---

## 5. Comment on prouve

1. **La mesure d'un vrai site**, en test : `proposeCharter` reçoit des sources fixes (HTML + CSS
   capturés, pas un appel réseau dans la suite) et rend une palette avec ses reçus ; un site qui ne
   déclare rien rend une liste vide et la page le dit.
2. **L'écriture préserve** : un `NEWSROOM-PROFILE.md` portant un commentaire du journaliste et un
   champ inconnu passe par l'écriture et les retrouve intacts. **Vérification par mutation** :
   retirer la préservation doit faire rougir.
3. **La page servie** (`install/preflight/server.test.ts`, le harnais du chantier précédent) :
   plus aucune case dans le modèle servi, le récapitulatif final présent, et le profil éditable —
   c'est-à-dire que la soumission **porte** de nouveau la clé `newsroom`, l'inverse exact de ce que
   le chantier précédent assertait.
4. `bun run check` : **20/23**, les trois rouges étant la clé MapTiler morte (chaîne établie —
   `verifyMapTiler` échoue aussi sur `main`, l'API répond 403, et le snap carte meurt sur
   `waitForSelector('.maplibregl-canvas')`). Aucun rouge de plus ne doit apparaître.
