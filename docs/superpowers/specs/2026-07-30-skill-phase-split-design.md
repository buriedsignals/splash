# Spec — Découper `skills/splash/SKILL.md` par phase

> **Statut :** conçu, non implémenté.
> **Origine :** mesure du 2026-07-30 (CLAUDE.md § État courant) — 5 des 8 retours d'un test manuel
> portaient sur des règles DÉJÀ écrites, dont deux citant mot pour mot la phrase fautive.
> **Langue :** prose FR, identifiants et code en anglais (standard non négociable).

---

## 1. Ce qu'on répare, et ce qu'on ne répare pas

`SKILL.md` fait **1354 lignes** et se charge en entier au démarrage. Les règles de PROPOSITION
étaient donc bel et bien en contexte quand l'EXPORT les a ignorées — 900 lignes plus haut.

Il faut être précis sur la causalité, parce qu'elle décide du périmètre : **le découpage seul ne
répare pas l'obéissance.** Deux des huit retours citaient la phrase fautive telle qu'elle est
écrite dans `SKILL.md`, comme contre-exemple. La règle a été lue et violée. Une règle écrite en
négatif (« ne dis jamais X ») fournit la forme fautive au modèle — c'est la classe exacte du bug
`check:charter-not-offered`, dont la première version cherchait « charte maison », chaîne présente
dans « *pas de* charte maison à appliquer », la faute même.

Donc trois choses, indissociables, dont ce lot ne livre que les deux premières :

1. **Le découpage** — le porteur. Il rend possible qu'une règle arrive au moment où elle
   s'applique. C'est ce lot.
2. **La garde d'invocation** — sans elle, le découpage crée un mode de panne neuf : un run qui
   n'invoque pas le skill de sa phase a **moins** de règles en contexte qu'avant. C'est ce lot.
3. **Les tables d'anti-patterns en deux colonnes** (la rationalisation → ce qui est vrai), qui
   remplacent les règles en négatif. **Lot suivant**, additif, une fois la parité prouvée.

Ce qui est mesuré contre les deux systèmes de référence :

| | Superpowers | Spotlight | splash aujourd'hui |
|---|---|---|---|
| découpage | par PHASE, 14 skills | orchestrateur + 10 spécialisés | 1 monolithe de parcours |
| médiane | 167 l. | 159 l. | racine **1354 l.** |
| présence de la règle | le modèle invoque le skill de la phase | `invoke-skill(…)` au point du flux | tout lu une fois au départ |
| anti-patterns nommés | 10/14 | 9/11 | **0** |
| garde sur le chargement | — | **oui**, STOP si un skill ne résout pas | — |

splash délègue déjà à des skills — mais uniquement à des **moteurs** (`chart-native`, `map-native`,
`dw-chart`, `scrolly`, `image-native`) et à des **suggesteurs** (`suggest-article`, `suggest-chart`,
`suggest-image`, `newsroom-charter`). Jamais une règle de **parcours**. Le mécanisme existe, tourne
en production, et n'est pas utilisé pour ce qui en a le plus besoin.

## 2. Architecture

**Une phase = un skill. La racine orchestre.**

La racine `skills/splash/SKILL.md` tombe à **~200 lignes** et ne garde que ce qui vaut à tout
moment du parcours :

- Overview
- Voix — carte de progression, noms internes qui ne sortent jamais, « dire ce qui s'est passé »
- La séquence des six phases, réduite à six blocs courts (voir § 3)
- La table des Gates
- Never
- Récupération de contexte
- Protocole de blocage
- Reference (consultation à la demande)

Cinq skills nouveaux, frères des onze existants, chacun avec son propre `SKILL.md` et son
frontmatter `name` / `description` :

| skill | contenu | taille approx. |
|---|---|---|
| `splash-input` | INPUT + ANALYSE (silencieuse) | ~90 l. |
| `splash-cadrage` | CADRAGE — Gate 1, 1b, 2b, 2c | ~254 l. |
| `splash-proposition` | PROPOSITION — Gate 2 | ~337 l. |
| `splash-production` | PRODUCTION — Gate 3 | ~271 l. |
| `splash-export` | EXPORT — Gate 4 + « proposer un autre format » | ~183 l. |

ANALYSE (9 lignes) ne mérite pas son propre skill et n'a pas de gate : elle est le versant
silencieux de l'INPUT et part avec lui.

Médiane obtenue ~254 lignes — au-dessus des deux références (167 / 159), mais aucune phase ne
dépasse le quart du monolithe actuel, et le découpage suit la seule frontière que le parcours
possède réellement : le gate. Découper plus fin voudrait dire inventer des frontières que le flux
n'a pas.

## 3. Le point d'invocation

Chaque bloc de phase dans la racine tient en quatre lignes : à quoi sert la phase, sur quel gate
elle finit, ce qu'elle reçoit de la précédente, et l'invocation :

> **3. CADRAGE** — établir l'intention éditoriale et la vérité des données. Finit sur les gates 1,
> 1b, 2b, 2c. Reçoit : l'article et/ou les données gelées par l'INPUT.
> **Invoque `splash-cadrage` maintenant.** Si le skill ne se charge pas, **ARRÊTE-TOI** et dis-le au
> journaliste — n'improvise pas la phase de mémoire.

Le STOP est repris de Spotlight, qui a exactement cette garde. Il est en prose, donc non mécanique
— c'est le § 5 qui le rend mesurable.

**Le passage de relais reste de la prose.** Chaque phase finit en nommant ce qu'elle transmet — les
mêmes faits que le flux porte déjà (dossier du run, format épinglé, `confirmedTakeaway`, canal). Le
déplacement ne doit **pas** inventer une machine à états : il n'y a aucun état neuf, aucun reçu
écrit sur disque, aucun champ ajouté au manifeste. Un lot qui déplace du texte et modifie l'état du
run en même temps est un lot dont on ne peut plus dire ce qui a cassé.

## 4. La migration, et sa preuve

**Déplacement pur. Zéro réécriture.** Chaque ligne de `SKILL.md` atterrit dans exactement un
fichier. Aucune règle n'est reformulée, raccourcie, fusionnée ou « améliorée au passage » dans ce
lot — les reformulations sont le lot suivant, où elles sont visibles et relisibles pour ce
qu'elles sont.

La preuve est un **check de parité par contenu**, dans le gate du dépôt (`bun run check`, via une
suite dans `skills/splash/tests/`), pas dans le harness : c'est un invariant de structure de
document, vérifiable sans faire tourner un run.

L'invariant, formulé pour être implémentable sans classer les lignes en « règle » ou « pas règle »
— une classification qui serait elle-même une liste de mots :

> Soit `L(f)` le multiensemble des lignes de `f` après normalisation (trim, espaces internes
> réduits, lignes vides écartées, en-têtes Markdown écartés). Alors
> `L(racine) ∪ L(5 phases) == L(SKILL.md @ SHA d'avant le découpage) ∪ L(SCAFFOLDING)`
> où `SCAFFOLDING` est une liste **explicite et courte** de lignes ajoutées : les frontmatters des
> six fichiers et les six blocs d'invocation du § 3.

Le SHA d'avant le découpage et le fichier de référence sont figés comme fixture dans la suite. Le
check échoue en nommant les lignes perdues et les lignes apparues — donc une réécriture accidentelle
est impossible à commiter en silence.

**Corollaire : ce check ferme le follow-up 6** (« le compte de règles numérotées de `SKILL.md` n'a
toujours aucun garde-fou »). Et il n'est pas théorique — la revue finale de `feat/geography-anywhere`
vient de trouver la même classe en vrai : `skills/map-native/SKILL.md:131` annonce **trois** pièces
de furniture, la branche en a ajouté une quatrième (`geoCredit`), et
`skills/splash/tests/skill-doc-parity.test.ts` — 135 appels `toContain("<littéral>")`, sur
`skills/splash` et les trois `suggest-*`, jamais `map-native` ni `scrolly` — ne pouvait
structurellement pas le voir.

D'où un **second check, distinct et petit** : tout en-tête ou toute phrase qui annonce un nombre
d'éléments (« three pieces of furniture », « Four rules », « up to 6 questions ») doit correspondre
au nombre d'éléments effectivement présents dessous. Il s'accroche à une **forme** (un numéral
suivi d'un nom au pluriel, en tête d'une liste ou d'une table) et non à une liste de chaînes, ce qui
le rend valide au-delà de l'instance qui l'a motivé. Portée : tous les `SKILL.md` du dépôt, pas
seulement ceux de splash.

## 5. La garde d'invocation

Deux moitiés, parce qu'aucune ne suffit :

- **La prose STOP** dans la racine (§ 3) — elle évite le dégât quand le chargement échoue.
- **Cinq checks harness**, un par phase, calqués sur `checkCharterNotOffered`
  (`splash-harness/src/checks.ts:1642`), qui s'accroche déjà exactement à ce fait : *un skill
  a-t-il été invoqué ou non*, lu sur les événements `tool-use`. Forme : la phase a démonstrablement
  commencé (fait d'outil) **et** son skill n'apparaît dans aucun `tool-use` → finding **major**.

L'ancre « la phase a commencé » par phase :

| phase | ancre (fait d'outil) | solidité |
|---|---|---|
| INPUT | un `freeze`/lecture d'article ou de CSV | nette |
| CADRAGE | la première `AskUserQuestion` du run | moyenne |
| PROPOSITION | invocation de `suggest-article` / `suggest-chart` | nette |
| PRODUCTION | invocation de `produce-all` / `produce.mjs` | nette |
| EXPORT | invocation de `export-code` | nette |

CADRAGE est la seule ancre faible et c'est le seul point de ce design qui demande un vrai travail
de conception dans le plan : une question posée n'est pas nécessairement une question de CADRAGE.
Piste à instruire au moment du plan — ancrer plutôt sur le **premier** `tool-use` qui suit
l'invocation de `splash-input`, ou accepter que ce check-là soit `minor` tant que son ancre n'est
pas nette. **Ne pas expédier une ancre approximative** : un check qui se déclenche à tort coûte
plus cher que pas de check, parce qu'on apprend à l'ignorer.

Chaque check est validé **dans les deux sens** contre un transcript réel — il trouve le défaut
quand il est là, il se tait quand il ne l'est pas — comme les quatre checks du 2026-07-30.

## 6. Ce qui n'est PAS dans ce lot

- Les tables d'anti-patterns en deux colonnes (lot suivant, additif).
- Toute réécriture de règle, y compris la conversion des règles en négatif.
- Tout changement d'état de run, de manifeste, ou de CLI hôte.
- Le découpage des autres `SKILL.md` (les moteurs sont déjà à la bonne taille et déjà invoqués au
  point du flux).

## 7. Vérification

1. **Parité de contenu** (§ 4) — dans le gate.
2. **Garde de compte** (§ 4) — dans le gate, sur tous les `SKILL.md`.
3. **Résolution des skills** — les cinq nouveaux sont découvrables via
   `claude --plugin-dir <repo>` ; le test le prouve en lisant le frontmatter de chacun, pas en
   supposant que le répertoire suffit.
4. **Un run réel de bout en bout** sur `splash-test-article/`, piloté par le harness, avant/après :
   les checks déjà mécanisés restent verts, les cinq checks d'invocation se déclenchent quand on
   retire délibérément une invocation de la racine, et se taisent sur un run normal. **C'est la
   vérification par mutation, et elle n'est pas facultative** — un check qui ne rougit pas quand on
   casse le mécanisme n'est pas un check.

## 8. Risques

- **Le modèle n'invoque pas.** Traité au § 5, et c'est le risque principal. Si les checks montrent
  un taux d'invocation médiocre sur des runs réels, le découpage est un échec mesuré et se
  reverte — le déplacement pur rend ce retour arrière trivial, ce qui est une raison de plus de ne
  rien réécrire dans ce lot.
- **Une règle transversale se retrouve dans une seule phase.** La table des Gates et le Never
  restent dans la racine, donc toujours en contexte. Le check de parité garantit qu'aucune règle
  n'est dupliquée pour « faire bonne mesure » — la duplication est précisément ce qui fait diverger
  deux copies d'une même règle.
- **Coût en tokens.** Le découpage réduit ce qui est chargé au départ mais ajoute des chargements
  en cours de route. Ce n'est pas l'objectif et ce n'est pas un critère de succès ; c'est noté pour
  qu'on ne l'invoque pas comme justification si le reste ne prend pas.
