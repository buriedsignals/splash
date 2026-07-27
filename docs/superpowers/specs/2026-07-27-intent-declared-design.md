# Spec — L'intention est DÉCLARÉE, plus devinée

> **Statut :** design (2026-07-27). Branche `feat/intent-declared`.
> **Origine :** mesure sur `lib/brain/rank-intent.ts` — la passe par mots-clés no-ope silencieusement
> sur des formulations éditoriales ordinaires, dans les deux langues.
> **Socle :** `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §2 (P1 — « l'outil
> **offre**, le journaliste **décide** ») et beat 2 (« l'outil **décrit factuellement**… *il ne
> propose jamais l'histoire* »).
> **Langue :** prose FR, identifiants/types/fichiers en anglais (standard non-négociable).

---

## 1. Le problème, mesuré

`lib/loop/propose.ts:30` nourrit le cerveau avec `intentsFromAngle(el.angle.confirmedTakeaway)` —
32 lignes de regex sur la prose du journaliste (`lib/brain/rank-intent.ts`). Le fichier le dit
lui-même : *« deliberately crude: a keyword pass over the confirmed takeaway »*, avec un repli
documenté : *« No cue ⇒ no intent: the ranking then falls back on fit and readiness, which is the
honest fallback »*.

Mesure réelle (probe sur la fonction, 2026-07-27) :

| takeaway | résultat |
|---|---|
| « Geneva pays the **highest** premium of the French-speaking cantons » | `["ranking","spatial"]` |
| « Genève paie la prime **la plus lourde** des cantons romands » | **`[]`** |
| « Premiums **rose** 30% **over ten years** » | **`[]`** |
| « Les primes ont **augmenté** de 30% **en dix ans** » | `["change-over-time"]` |
| « Housing is the **largest share** of the budget » / « la plus grande part » | `["part-to-whole"]` (les deux) |
| « Income and life expectancy **move together**  » / « évoluent ensemble » | **`[]` (les deux)** |
| « La prime **varie** de 115 francs entre le **canton** le plus cher et le moins cher » | `["spatial"]` |

Deux défauts distincts, pas un :

1. **Le no-op silencieux.** Sur une majorité de formulations ordinaires, l'intention est vide.
   L'offre est alors ordonnée par *fit* et *readiness* seuls (`lib/brain/rank.ts:51`,
   `intentTier = 1` pour tout le monde) — exactement la plainte « plat / générique / la forme ne
   sert pas le propos » que ce redesign existe pour fermer. Rien, nulle part, ne dit que ça vient
   d'arriver.
2. **Le contre-sens.** La dernière ligne est une affirmation d'**étendue** (`distribution`) lue
   comme de la **géographie** (`spatial`), parce que le mot « canton » a gagné. Mesuré sur l'offre
   réelle : `spatial` sort `hex-grid · choropleth · cartogram` (trois cartes) là où `distribution`
   sort `dot-strip · boxplot · beeswarm`. Le journaliste voit trois cartes pour une phrase sur
   l'écart entre deux valeurs.

**Ce n'est pas un bug caché** — la grossièreté est documentée et le repli est honnête. C'est le
**mécanisme** qui est faux : deviner l'intention à partir de la formulation de quelqu'un est
précisément ce que le socle interdit. Beat 2 : *l'outil décrit factuellement, pousse honnêtement,
et **le journaliste choisit l'angle** ; il ne propose jamais l'histoire.*

---

## 2. La décision

**On arrête de deviner. Le journaliste DÉCLARE l'intention.**

Ce n'est pas une décision produit neuve : elle est déjà verrouillée par le socle. Ce spec
l'implémente, il ne la prend pas.

**Invariant conservé** (spec proposal-brain §4.2) : l'intention influe sur l'**ordre** des formes
éligibles ; elle ne peut jamais rendre une forme légale illégale, ni l'inverse. Déclarer plutôt que
deviner ne renforce pas le pouvoir de l'intention — ça change qui le tient.

---

## 3. La forme

### 3.1 L'intention devient une part déclarée de l'angle

`confirm-angle` collecte déjà quatre créneaux **nommés** (`lib/loop/angle.ts`) : `takeaway`,
`altInsight`, `unit` (les trois refusés à blanc) et `emphasis` (optionnel). Le raisonnement du
fichier — *« the caller never names a key — it answers one of four known questions »* — s'applique
mot pour mot à l'intention : c'est **une question de plus dans le même questionnaire**, à choix
**fermé**, donc encore moins un écrivain de prose que les trois autres.

- `AngleParts` gagne `intent: Intent` — **requis**, comme les trois autres, et pour la même raison :
  ce qui n'est pas refusé à la confirmation est découvert des heures plus tard, ou jamais.
- Deux refus : **blanc** (rien n'a été répondu) et **hors vocabulaire** (le refus liste les neuf
  valeurs — une valeur inconnue est un fait contre lequel personne ne peut classer,
  `lib/brain/intents.ts`).
- Le champ atterrit sur `RunElement.angle.intent`, **optionnel dans le schéma** (`lib/loop/
  manifest.ts`, ajout pur) : un manifeste écrit avant cette tranche porte un angle sans intention
  et doit rester lisible. Le seul écrivain du champ reste `confirmAngle`.

**Singulier, pas pluriel.** La passe par mots-clés rend un tableau ; la question éditoriale a **une**
réponse (« que voulez-vous faire voir ? »). `propose` passe `[intent]` au cerveau, qui garde sa
signature `Intent[]`.

### 3.2 La question est ÉDITORIALE, jamais du vocabulaire de graphique

Un journaliste ne doit **jamais** s'entendre demander « votre intention est-elle *part-to-whole* ? ».
Les neuf ids restent le vocabulaire machine (le host nomme un id, comme `choose-form --option <id>`)
mais ce qui est **présenté** est une phrase de rédaction plus un exemple concret, dans la langue de
la rédaction.

Table dans `lib/host/intent-copy.ts`, **même forme que `lib/newsroom/ui-copy.ts`** (une entrée par
langue, `en` par défaut, une langue inconnue retombe sur `en` plutôt que d'afficher un formulaire
à moitié traduit). Le fichier vit dans `lib/host/**` et non dans `lib/newsroom/**` parce que
`ui-copy.ts` appartient à un autre paquet dans ce découpage — et parce que la copie est une affaire
de **desk**, pas de décor : `lib/loop/resume.ts` est délibérément sans langue (« English scaffold;
the orchestrating agent restates it »).

**Les neuf formulations retenues** (label = comment un journaliste le dit ; exemple = une
affirmation réelle de cette forme) :

| id | FR — label | FR — exemple |
|---|---|---|
| `ranking` | Qui est en tête, qui est en queue | Genève paie la prime la plus lourde des cantons romands. |
| `change-over-time` | Ce qui a changé, et dans quel sens | Les primes ont augmenté de 30 % en dix ans. |
| `part-to-whole` | Ce qu'une part pèse dans l'ensemble | Le logement absorbe la plus grande part du budget des ménages. |
| `correlation` | Deux choses qui vont ensemble | Là où le revenu monte, l'espérance de vie monte aussi. |
| `distribution` | Comment les cas s'étalent, et où sont les extrêmes | La prime varie de 115 francs entre le canton le plus cher et le moins cher. |
| `deviation` | L'écart à une référence : qui est au-dessus, qui est en dessous | Trois cantons dépassent la moyenne suisse. |
| `magnitude` | L'ordre de grandeur : combien, à côté de quoi | La prime genevoise pèse 583 francs par mois. |
| `spatial` | Où ça se passe sur le territoire | Le poids des primes dessine une fracture est-ouest. |
| `flow` | Ce qui passe d'un endroit — ou d'un état — à un autre | Un quart des assurés genevois ont changé de caisse. |

Question posée : **« Que voulez-vous faire voir ? »** / *« What do you want to show? »*

**Le choix des mots, et pourquoi.** Chaque label est écrit pour être vrai *sans connaître le
catalogue* : il décrit un **propos**, jamais une forme. « Qui est en tête » n'est pas « un
classement » (qui pointe déjà vers un objet graphique) ; « comment les cas s'étalent » n'est pas
« une distribution » (jargon statistique) ; « où ça se passe sur le territoire » évite « carte ».
Les deux paires que la mesure du §1 confond — `ranking`/`magnitude` et `distribution`/`spatial` —
sont volontairement écrites pour se départager **par l'exemple** : les exemples de `distribution` et
de `spatial` sont deux phrases sur les mêmes cantons dont une seule parle du territoire.

**Garde mécanique** (`intent-copy.test.ts`) : aucun label ni exemple ne peut contenir un mot du
vocabulaire de graphique (`chart`, `graphique`, `bar`, `barres`, `camembert`, `pie`, `scatter`,
`nuage de points`, `histogramme`, `courbe`, `axe`, `carte`, `map`…) ni l'id brut de l'intention.
La règle du socle cesse d'être documentaire.

**Langues livrées : `fr` + `en`.** C'est exactement ce que la couche de copie existante
(`ui-copy.ts`) livre aujourd'hui — donc la parité, pas une régression. `de` et `it` sont
**explicitement différés** (§6).

### 3.3 Offrir, ne pas imposer — la passe par mots-clés reste, rétrogradée

La passe n'est pas supprimée : elle **cesse de décider**. Elle devient une **suggestion** que le
journaliste confirme ou écrase, et le renommage rend la rétrogradation structurelle —
`intentsFromAngle` → **`suggestIntents`** (le seul appelant en production était `propose`).

Deux surfaces la rendent lisible, toutes deux dans `lib/host/**` :

1. **`suggest-intent --takeaway <s> [--language <tag>]`** — commande neuve, en lecture seule, sans
   run. Rend `{ language, question, choices[], suggested[] }` : les neuf choix formulés
   éditorialement **plus** ce que la passe a cru lire dans le brouillon de takeaway, étiqueté comme
   suggestion. Pourquoi une commande et pas `state` : la suggestion se calcule sur le takeaway, et
   au moment où la question se pose le takeaway n'est pas encore dans le run — `state` ne peut donc
   pas la produire. C'est aussi ce qui garde la passe **vivante et appelée** au lieu de devenir du
   code mort atteignable seulement par un manifeste hérité.
2. **`state --run <dir>` porte `intentChoices`** dès qu'un élément doit encore `confirm-angle` —
   « `state` porte déjà l'offre » : un host qui pilote depuis `state` ne doit pas avoir à savoir
   qu'une seconde commande existe pour poser la question. Sans le takeaway, `state` porte les
   **choix** ; il ne porte pas de suggestion.

Et le refus d'usage de `confirm-angle` sans `--intent` **nomme `suggest-intent`** : le chemin qui
mène à la question est écrit là où la question manque.

### 3.4 Plus jamais de no-op silencieux

**Ce que fait la boucle quand rien n'est déclaré : elle DEMANDE, puis elle REFUSE — et pour un
angle hérité, elle ENREGISTRE l'absence.** Justification en trois temps :

- **Demander** est le seul choix compatible avec P1. Un refus muet (« intention manquante ») sans
  les choix laisserait le host inventer la question — donc inventer le vocabulaire de graphique que
  le socle interdit. D'où §3.2/§3.3 : la question et ses réponses sont servies, structurées.
- **Refuser** est ce qui rend le no-op *structurellement* inatteignable pour tout run ouvert après
  cette tranche : `confirmAngle` n'écrit pas d'angle sans intention, `nextActions` ne franchit pas
  `confirm-angle` sans angle — donc `propose` a toujours une intention. Ce n'est plus une
  convention, c'est une impossibilité d'écriture.
- **Enregistrer** couvre le seul cas restant : un `run.json` **déjà sur disque** dont l'angle est
  antérieur. Le refuser reviendrait à échouer des runs légitimes pour un champ qui n'existait pas
  quand ils ont été écrits. `propose` retombe alors sur `suggestIntents` — et `state` **dit lequel
  des trois cas s'applique**, par élément :

  ```jsonc
  "intent": { "basis": "declared", "declared": "ranking" }
  "intent": { "basis": "guessed",  "guessed": ["spatial"] }   // l'ordre repose sur une devinette
  "intent": { "basis": "none",     "guessed": [] }            // l'ordre ne repose sur rien
  ```

  Présent exactement quand l'élément porte un angle (même règle de présence que `proposal` et
  `verification`). `basis: "none"` est précisément l'état que ce spec existe pour rendre visible :
  l'offre non-classée, dite à voix haute au lieu de se dégrader en silence.

### 3.5 `propose` lit l'intention déclarée

```
declared = el.angle.intent
guessed  = declared ? [] : suggestIntents(el.angle.confirmedTakeaway)
intents  = declared ? [declared] : guessed
```

La déclaration gagne **totalement** : aucun mélange avec la devinette, aucune union. Un angle
déclaré `distribution` sur une phrase où « canton » apparaît ne doit pas se voir rajouter `spatial`
par la fenêtre — ce serait le contre-sens du §1 réintroduit derrière la décision du journaliste.

---

## 4. Frontières de fichiers

**Possédés :** `lib/brain/rank-intent.ts`, `lib/brain/intents.ts`, `lib/loop/angle.ts`,
`lib/loop/propose.ts`, `lib/host/**`, `lib/newsroom/language.ts`.
**Partagé, AJOUT SEUL :** `lib/loop/manifest.ts` (une ligne dans `RunElementSchema.angle`).
**Interdits :** `lib/verify/**`, `lib/source/**`, `lib/delivery/**`, `lib/core/**`, `install/**`,
`skills/**`, le reste de `lib/newsroom/**`, le reste de `lib/loop/**`.

Conséquences directes de ces frontières, assumées et notées ici parce qu'elles ont façonné le
design :

- `lib/loop/driver.ts:123-134` construit la `proposal` persistée en déstructurant
  `{ options, excluded, refusal }`. Tout champ neuf rendu par `propose` serait **jeté**. C'est
  pourquoi le *basis* n'est pas un champ de `proposal` mais une **dérivation de l'angle**, rapportée
  par `state` (§3.4) — la trace dans le run, c'est `angle.intent` lui-même.
- `lib/loop/resume.ts` est interdit, donc `intentChoices` et le bloc `intent` par élément sont
  ajoutés dans `describeState` (`lib/host/state.ts`), en post-traitement du rapport. C'est aussi le
  bon endroit : c'est de la copie localisée, et `resume.ts` est sans langue par construction.

---

## 5. Tests (`bun:test`, TDD — rouge d'abord)

| unité | ce qui est prouvé |
|---|---|
| `manifest` | un angle avec `intent` round-trip ; une valeur hors vocabulaire est refusée ; un angle **sans** intent reste lisible (héritage) |
| `rank-intent` | `suggestIntents` reste la passe grossière — et les cas mesurés du §1 sont **écrits en test** comme sa faiblesse documentée, pas comme un contrat |
| `angle` | `intent` requis · blanc refusé · hors-vocabulaire refusé en listant les neuf · écrit sur l'angle |
| `propose` | déclaré gagne · la devinette ne sert qu'à défaut · l'ordre **change** entre deux intentions déclarées sur les mêmes faits |
| `intent-copy` | les neuf ids couverts dans chaque langue · repli `en` · **aucun vocabulaire de graphique** (garde mécanique) · pas d'id brut dans un label |
| `cli` / `drive` | `--intent` requis, le refus nomme `suggest-intent` · `suggest-intent` rend choix + suggestion · une valeur inconnue est refusée |
| `state` | `intentChoices` présent exactement quand `confirm-angle` est dû · `intent.basis` déclaré/deviné/aucun |
| journey | le parcours complet passe par `--intent`, et l'offre livrée s'ordonne autour de lui |

---

## 6. Différé (explicite)

- **`de` et `it`** pour la table éditoriale. Parité avec `ui-copy.ts`, qui ne livre que `en`/`fr` ;
  ajouter une langue = une entrée, la garde mécanique couvre déjà toute langue ajoutée.
- **Le re-routage des angles hérités.** Un angle écrit avant cette tranche ne repasse pas par
  `confirm-angle` : `nextActionsForElement` (`lib/loop/manifest.ts`) le laisse filer, et le changer
  serait une modification d'un fichier en ajout-seul. L'absence est *rapportée* (§3.4), pas
  *corrigée*.
- **`skills/splash/SKILL.md:493`** documente `confirm-angle` sans `--intent`. Fichier hors
  frontière ; à mettre à jour par le propriétaire de `skills/**`.

## 7. Risques assumés

*(renseigné à l'issue de l'implémentation)*
