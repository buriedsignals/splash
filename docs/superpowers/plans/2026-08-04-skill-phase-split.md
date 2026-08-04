# Plan — Découper `skills/splash/SKILL.md` par phase

> **Spec :** `docs/superpowers/specs/2026-07-30-skill-phase-split-design.md`
> **Décision de Rémy (2026-08-04)** : enchaîner ce lot après E10 option C.
> **Langue :** prose FR, code et identifiants en anglais.

---

## 0. Ce que ce plan ajoute à la spec — trois faits mesurés le 2026-08-04

**① La spec a 5 jours et ses chiffres ont dérivé de 13 %.** `SKILL.md` est passé de 1354 à
**1530** lignes. La dérive n'est pas uniforme, et c'est ce qui compte :

| phase | spec (07-30) | mesuré (08-04) | dérive |
|---|---:|---:|---:|
| INPUT | 90 | 80 | −10 |
| ANALYSE | 9 | 10 | +1 |
| CADRAGE | 254 | **322** | **+68** |
| PROPOSITION | 337 | 344 | +7 |
| PRODUCTION | 271 | 290 | +19 |
| EXPORT | 183 | **366** | **+183** |
| racine totale | 1354 | 1530 | +176 |

L'architecture de la spec **tient** — les six titres de phase existent toujours, aux mêmes noms.
Seules les tailles changent. `EXPORT` a **doublé** : c'est là qu'a atterri tout le travail CMS du
2026-08-04. Le préambule (avant `### 1. INPUT`) fait **118 lignes** — c'est le socle de la racine,
auquel s'ajoutent les six blocs courts du § 3 de la spec.

**② `EXPORT` n'est plus la plus petite phase, c'est la deuxième plus grosse.** La spec le donnait à
183 lignes, sous PROPOSITION et PRODUCTION. À 366 il est au niveau de PROPOSITION. Conséquence sur
le plan : `splash-export` n'est plus le lot « facile pour commencer ». **Commencer par `INPUT`**
(80 l.), qui est le plus petit ET dont l'ancre d'invocation est la plus nette.

**③ Le fichier est en cours d'édition par d'autres sessions.** Trois commits l'ont touché le
2026-08-04 (10:54, 12:17, 12:57), depuis deux worktrees vivants. Un déplacement pur de tout un
fichier, en course contre ses éditeurs actifs, produit un conflit que personne ne peut relire —
et un conflit sur ce fichier-là, c'est un conflit sur des règles de parcours.
**⇒ Le déplacement (tâches 2 à 7) ne démarre pas tant que `skills/splash/SKILL.md` n'a pas été
stable pendant un cycle complet.** Vérification, pas intuition :
`git log --since="2 hours ago" -- skills/splash/SKILL.md` doit être vide.

## 1. L'instrument, construit AVANT le déplacement — ✅ FAIT

`scripts/verify-phase-split.mjs` + ses 6 tests (`verify-phase-split.test.ts`, verts).

    bun scripts/verify-phase-split.mjs <SKILL.md d'avant> <racine> <skills de phase…>

Il prouve les trois façons dont un « déplacement pur » peut être impur — **perdu**, **dupliqué**,
**inventé** — et refuse chacune. Il est écrit maintenant, avant le déplacement, délibérément : un
instrument écrit après l'est par quelqu'un qui croit déjà que le déplacement est bon, et il tend à
affirmer ce que le déplacement a fait.

Il **ne prouve pas** que le découpage est bon — qu'une ligne ait atterri dans la phase où elle
s'applique reste un jugement humain. Il existe pour que ce jugement soit dépensé là, plutôt que
sur un diff de 1500 lignes. Il le dit dans sa propre sortie.

## 2. L'ancre de CADRAGE — la seule question ouverte de la spec, tranchée

La spec (§ 5) laisse une ancre faible : *« une question posée n'est pas nécessairement une question
de CADRAGE »*, et interdit d'expédier une ancre approximative — « un check qui se déclenche à tort
coûte plus cher que pas de check ».

**Proposition : ancrer sur un fait de DISQUE, pas sur un fait d'outil.** `confirmedTakeaway` est un
champ **requis** de `accepted.json` (`skills/splash/src/producer-spec.ts:29`) et il n'est produit
que par le Gate 1b de CADRAGE. Donc :

> CADRAGE a démonstrablement eu lieu **⟺** le run a écrit un `accepted.json` portant un
> `confirmedTakeaway` non vide.

C'est net, ça ne dépend d'aucune heuristique sur les questions posées, et c'est le même principe
que le reste du dépôt : *la colonne vertébrale VOIT l'artefact, donc c'est une confirmation et pas
un auto-rapport*. Les quatre autres ancres restent celles de la spec (elles étaient déjà nettes).

## 3. Les tâches

| # | tâche | dépend de |
|---|---|---|
| 1 | ✅ l'instrument de preuve + ses tests | — |
| 2 | extraire `splash-input` (INPUT + ANALYSE, ~90 l.) ; prouver le déplacement | fichier stable |
| 3 | extraire `splash-cadrage` (~322 l.) | 2 |
| 4 | extraire `splash-proposition` (~344 l.) | 3 |
| 5 | extraire `splash-production` (~290 l.) | 4 |
| 6 | extraire `splash-export` (~366 l.) | 5 |
| 7 | réduire la racine aux 118 l. de préambule + 6 blocs courts + STOP | 2-6 |
| 8 | les 5 checks harness (§ 5 de la spec), validés dans les deux sens | 7 |

**Après CHAQUE extraction** : relancer l'instrument avec la racine et tous les skills déjà extraits.
Une extraction dont la preuve ne passe pas n'est pas commitée — c'est le seul garde-fou qui rende
un déplacement de cette taille relisible.

**Rappel du périmètre (spec § 6)** : aucune règle n'est reformulée, raccourcie ou « améliorée au
passage ». Les tables d'anti-patterns sont le lot suivant. Aucun changement d'état de run, de
manifeste ou de CLI hôte.

## 4. Le mode de panne que ce lot crée, et qui doit être surveillé

Le découpage rend possible qu'un run ait **moins** de règles en contexte qu'avant — celui qui
n'invoque pas le skill de sa phase. C'est pour ça que la tâche 8 n'est pas optionnelle, et pourquoi
le STOP en prose de la racine (§ 3 de la spec) est écrit avant même que les checks existent.
