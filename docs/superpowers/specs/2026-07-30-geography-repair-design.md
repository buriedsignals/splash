# Spec — Réparer `feat/geography-anywhere`

> **Statut :** conçu, non implémenté.
> **Origine :** `docs/splash/geography-final-review-2026-07-30.md` — la revue finale de branche que
> le plan n'a jamais eue (quatre lentilles, sept Criticals, quatre reproduits en exécutant du code).
> **Branche :** `feat/geography-anywhere` (worktree `splash-geography`), non fusionnée.
> **Langue :** prose FR, identifiants et code en anglais (standard non négociable).

---

## 1. Ce qu'on répare

La branche remplace une géométrie monde codée en dur, importée en `?raw`, par un descripteur
**déclaré → résolu au produce → injecté** dans les composants. Le substrat (`lib/geo/`) est jugé
bon par les quatre revues, et la fusion est mécaniquement facile — quatre fichiers en collision,
tous auto-mergeables. **Le trou est entre le substrat et la livraison.**

Sept régressions réelles, dont trois trouvées indépendamment par plus d'une revue. Aucune n'est un
faux blocage : les deux gardes les plus stressées — l'obligation de crédit géo et le refus de
jointure non résolue — tiennent. Le détail vit dans le document de revue et n'est pas recopié ici ;
cette spec dit **comment on ferme**, et surtout **ce qui empêchera cette classe de revenir**.

## 2. Le vrai sujet : trois aveuglements, pas sept bugs

Fermer les sept Criticals sans fermer les trois mécanismes qui les ont laissés passer, c'est
re-livrer la même classe au prochain chantier carto. Les trois, mesurés :

1. **Le gate ne voit pas les chemins de produce.** Les suites qui les exerceraient s'auto-skippent
   sans `VITE_MAPTILER_KEY`, et celles qui tournent ne couvrent que `choropleth`. Un `bun run check`
   vert n'est une preuve de rien ici.
2. **La mesure compensatoire a été briefée et jamais courue.** L'étape 2 de la tâche 21 demandait
   exactement le diff gate-sans-clé / gate-avec-clé. La tâche 21 porte **0 case cochée sur 131** et
   est la seule tâche du plan sans rapport au ledger.
3. **Deux fixtures ont été éditées pour contenir ce que la production ne fournit plus.**
   `scrolly.json` a gagné 9 304 lignes de TopoJSON inlinée ; les deux fixtures de géométrie
   déclarent `joinKey: "name"`, la seule valeur qui masque le fait que `keepProperties` supprime
   `name`.

**Conséquence de conception, non négociable dans ce lot :** chaque réparation ci-dessous est
accompagnée du levier qui l'aurait attrapée, et ce levier tourne **sans clé MapTiler** partout où
c'est possible — parce qu'un levier qui s'auto-skippe est exactement le problème qu'on répare.

Le point de levier le plus rentable, et il est bon marché : **C1 et C2 plantent AVANT tout rendu**,
au moment de la résolution de configuration. Une passe de résolution seule sur les sept types × les
fixtures livrées est donc exécutable dans le gate, sans réseau, sans clé, en quelques secondes — et
elle aurait attrapé les deux.

## 3. Les décisions de conception

**D1 — La résolution de géométrie devient un module partagé.** Le bloc de ~155 lignes vit
aujourd'hui dans `skills/map-native/scripts/produce.mjs` ; le producteur scrolly en a besoin à
l'identique. Il est extrait dans `lib/geo/resolve-for-produce.ts` et **les deux producteurs
l'appellent**. Les producteurs importent déjà `lib/geo/*` (`produce.mjs:45-47`), donc c'est le
mouvement idiomatique et non une nouvelle dépendance. Le refuser reviendrait à dupliquer, et une
règle dupliquée diverge.

**D2 — La sur-simplification se corrige en trois points, pas un.** `keep-shapes` seul rend les
géométries non nulles mais laisse la tolérance fausse d'un facteur 10 à 80. Donc : (a) `keep-shapes`
dans l'invocation mapshaper ; (b) la tolérance dérive du **bbox réel des entités filtrées**, plus
des constantes de remplacement ; (c) une post-condition dure — zéro géométrie nulle **et** chaque
`featureId` demandé revenu — qui échoue en nommant ce qui manque. Le (c) est le vrai levier : sans
lui, la prochaine dérive de tolérance repart en `TypeError` trois couches plus bas, ou en timeout
Playwright de 30 s.

**D3 — L'ADM1 se répare, il ne se refuse pas.** C'est la capacité qui justifie la branche entière ;
la refuser proprement à l'orient serait honnête mais viderait le chantier de son sens. La fermeture
complète est : l'entrée `SHIPPED_REFS` avec la **bonne extension** (`.topojson`), `BASEMAPS` élargi,
et le validateur cartogram qui appelle enfin `validateBasemap` — il est le seul à ne pas le faire,
et c'est pour ça qu'un cartogram ADM1 file jusqu'à un ENOENT mapshaper au lieu d'un refus nommé.
**Avec une preuve rendue et inspectée à l'œil** : ce chemin n'a jamais rendu quoi que ce soit, et
c'est exactement la situation qui a produit le faux « crash vendor WebGL » de `RouteMap`.

**D4 — Le chemin vidéo reste hors périmètre, mais cesse de mentir.** La famille vidéo ignore
`config.geometry` et lit toujours `staticFile("geo/world.geojson")`. Elle n'est pas régressée, donc
on ne la câble pas dans ce lot. Mais une géographie **déclarée** avec `format: video` rend
aujourd'hui Natural Earth en silence, avec l'assertion de crédit qui passe sur un artefact montrant
un fichier non crédité. Elle doit **refuser au produce**, avec un message nommé. Un refus explicite
coûte trois lignes ; un artefact qui affiche le mauvais fond avec le bon crédit est une faute de
conformité.

**D5 — Le crédit géo se câble aux sept sites d'appel et se verrouille par un test qui ne peut pas
le passer lui-même.** `map-frame-locale.test.tsx` « prouve » le rendu en passant la prop de
lui-même — un test de composant ne peut jamais voir un site d'appel manquant. Le verrou est un scan
de source : chaque composant qui rend `MapFrame` doit lui passer `geoCredit`. C'est un fait de
structure, pas une chaîne.

**D6 — Les gardes `?raw` changent de forme.** Elles interdisent aujourd'hui **une orthographe** sur
une **liste fermée de sept fichiers**, et sont donc aveugles à la forme sans `?raw` déjà présente
dans l'arbre (`RouteReveal.tsx:22`, `RouteScrolly.tsx:22`), à la forme runtime dans huit fichiers
(`fetch(staticFile(...))`), et à tout fichier neuf. La forme correcte existe déjà dans le dépôt :
`lib/loop/schema-version-drift.test.ts` parcourt l'arbre, exempte par classe explicite, et **assure
que le scan n'était pas vide** (`>500` fichiers) — donc il ne peut pas passer sur un scan
défaillant. On la porte.

**D7 — La migration de schéma obtient un chemin réel.** `schemaVersion` 5 rend inaccessible tout
`run.json` v4 via **toute** la façade hôte, et le message nomme une commande qui n'existe pas.
Retenu : `loadRun` migre **en mémoire** pour les versions dont la migration n'écrit rien
(`migrateV4toV5` est une transformation pure), plutôt qu'un verbe `migrate` qu'un journaliste
devrait connaître et taper. Un verbe explicite reste possible plus tard ; il ne doit pas être la
seule porte.

**D8 — La documentation est du périmètre, pas du polish.** `docs/splash/guardrails.md` ouvre en
promettant que chaque ligne a été vérifiée contre son fichier nommé, et lui manque trois gardes de
cette branche. `skills/map-native/SKILL.md:328-333` recommande d'ajouter des données **Eurostat
NUTS** que le plan lui-même disqualifie comme incompatibles MIT — pour un dépôt dont le livrable est
une sortie MIT à des rédactions, c'est le défaut le plus coûteux du lot, et il ne coûte rien à
corriger.

## 4. Le périmètre, groupé

**Groupe A — les plantages de production** (C1, C2, C3)
La famille points (`symbol`, `locator`, `hex-grid`) ne joint aucune géométrie : le bloc doit la
sauter au lieu de retomber sur la forme choropleth · la sur-simplification, en trois points (D2) ·
le producteur scrolly appelle le module partagé (D1).

**Groupe B — les obligations qui ne s'appliquent pas** (C5, C7, D4)
`geoCredit` câblé aux sept sites + verrou par scan de source (D5) · `keepProperties` conserve `name`
en plus de la clé de jointure (et du `labelField` quand il existe) · refus nommé pour géographie
déclarée × format vidéo.

**Groupe C — la capacité annoncée** (C6)
Extension `.topojson`, `BASEMAPS` élargi, `validateBasemap` appelé par le cartogram, **preuve
rendue et inspectée**.

**Groupe D — l'état du run** (C4)
Migration en mémoire dans `loadRun` (D7).

**Groupe E — les leviers** (le cœur)
1. **Passe de résolution sans clé, sur les 7 types × les fixtures livrées**, dans le gate. Elle
   aurait attrapé C1 et C2. Elle doit échouer si on lui retire une des corrections — vérification
   par mutation obligatoire.
2. **Un e2e map-scrolly au niveau boucle**, construit depuis une configuration **assemblée**, jamais
   depuis `sample-data/scrolly.json`. L'e2e existant ne construit que la piste chart.
3. **Le diff gate-sans-clé / gate-avec-clé** de la tâche 21, couru et **écrit** — la mesure qui
   dit combien de suites s'auto-skippent, donc combien le gate ne voit pas.
4. **Gardes `?raw` reformées** (D6).

**Groupe F — la prose** (D8 + les dérives nommées)
`guardrails.md` gagne ses trois lignes · le compte « three pieces of furniture » de
`skills/map-native/SKILL.md:131` devient quatre et `geoCredit` est documenté · la recette Eurostat
NUTS est retirée · `skills/scrolly/SKILL.md:141` cesse de nommer un import que la suite interdit ·
`skills/map-native/SKILL.md:206-207` garde sa règle et perd sa justification devenue fausse (un
orchestrateur qui vérifie la justification « corrigera » la règle) · les attributions de tâches
périmées dans `geo-match.ts`.

## 5. Hors périmètre, nommé

- **Câbler la famille vidéo sur la géométrie injectée.** Non régressée ; D4 la fait refuser
  proprement plutôt que mentir. Chantier propre.
- **Le dot-density non-monde** (`DotDensityMap.tsx:41`, `JOIN_KEY = "iso_a3"`). Déjà ruled out par
  la tâche 13 avec sa mesure, et le refus est épinglé.
- **L'injection d'expression mapshaper via `joinKey`** (I2) et la comparaison stringly (I3) —
  à traiter, mais après les Criticals : `joinKey` n'est pas encore atteignable depuis une
  déclaration journaliste dans un run réel. **À écrire comme tâches nommées, pas comme prose de
  ledger**, sinon elles disparaissent.
- Les Minors du document de revue (poids de l'asset ADM1, `-o force`, `ref.ts` singleton muté,
  `ARG_MAX`, fixtures ±180/±90).

## 6. Vérification

- Chaque groupe se termine sur une preuve **exécutée**, pas narrée. Pour A et C : un rendu réel,
  ouvert et regardé. Pour B : le scan de source, plus un artefact où le crédit est **lu**.
- **Vérification par mutation partout où on ajoute un levier** : on casse la correction, le levier
  rougit ; on rétablit, il redevient vert. Un levier qui ne rougit pas n'est pas un levier — c'est
  la leçon que cette branche vient de payer sept fois.
- Le gate complet tourne **une fois, machine calme**, à la fin — deux gates concurrents
  s'invalident.
- Aucune image `output-proof/` régénérée n'est commitée (337 fichiers suivis, réécrits par les
  snaps) : `git status` avant chaque commit.

## 7. Risques

- **La correction de tolérance (D2) change tous les rendus carte.** Les preuves visuelles de la
  branche ont été faites sous la tolérance fausse ; toutes sont à refaire. C'est un coût réel et
  c'est la raison pour laquelle D2 vient tôt dans l'ordre d'exécution.
- **L'ADM1 n'a jamais rendu.** Le groupe C peut découvrir un défaut de la classe du faux « crash
  vendor » — un composant frère qui reçoit pour la première fois de vraies données à pleine
  échelle. C'est prévu : sa preuve rendue est une condition de sortie, pas une formalité.
- **Le lot est gros.** Il l'est parce que la branche a livré sept régressions, pas parce qu'on
  élargit. Le seul élargissement assumé est le groupe E, et c'est celui sans lequel on recommence.
