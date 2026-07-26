# Spec — Proposal-cerveau (le beat « Propose »)

> **Statut :** design validé (brainstorming, 2026-07-25). Prêt pour → writing-plans.
> **Origine :** sous-projet « Proposal-cerveau » du spec-parapluie
> `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §4 (issue Tom **#2**).
> **Branche :** `feat/proposal-brain`, off `feat/delivery-s3` (worktree `splash-brain`).
> **Portée :** le cerveau seul. La **branche article** (production scrolly/story, composition du
> texte apporté) est un **second spec**, écrit après celui-ci.
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Problème

Le beat 5 du parcours desk — **Propose** — est aujourd'hui un moignon. `lib/loop/propose.ts`
tient 60 lignes de règles en dur : trois formes chart-native (`slope`, `dumbbell`, `line`)
choisies sur le seul nombre de colonnes numériques, avec un `why` écrit à la main dans le code.
L'axe **CAPACITÉ** est le seul des quatre à être réellement branché (via le décor du préflight).

Pendant ce temps le savoir existe, écrit, sourcé, crédité — et **inexploitable par une machine** :

- `knowledge/references/chart/types/` — **38 fiches** par type (FT Visual Vocabulary + data-to-viz,
  créditées), chacune avec un « When to use / when NOT », ses seuils (« ≤ ~12 lignes »), sa
  grammaire de motion.
- `knowledge/references/map/types/` — 7 fiches carto · `knowledge/references/formats/` — la
  discipline par format · `knowledge/references/chart-selection.md` — intention FT → type.
- `skills/suggest-chart/SKILL.md` — **613 lignes de prose de sélection**, c'est-à-dire la forme
  exacte que l'audit a condamnée : de la connaissance qu'un agent est censé suivre et saute.

Le sous-projet n'écrit donc pas du savoir. Il rend **mécaniquement exploitable** un savoir déjà
écrit, et fait du beat Propose un vrai instrument : une offre motivée, avec ce qui a été écarté
et pourquoi, sur laquelle le journaliste tranche.

---

## 2. Portée

**DANS.**

- Les quatre axes `RAISON × SCOPE × CAPACITÉ × STYLE` du spec-parapluie §2 beat 5.
- La **typologie complète** : tout type qu'un moteur enregistré sait rendre aujourd'hui —
  chart-native (27 atteignables), map-native (7), dw-chart (`CHART_TYPES`), image-native, et les
  sous-formats de scrolly. Le catalogue vient du **registre moteur**, jamais d'une liste à la main.
- Le **frontmatter** des fiches KB : les facettes machine, écrites, validées, testées contre le
  registre moteur.
- L'**offre** : 2-3 formes classées avec leur pourquoi groundé, **plus les écartées et leur
  raison**, persistées au manifest.
- Le **routage prose/data** : la route est portée par le manifest, et les formes narratives sont
  **offertes marquées indisponibles** tant que la branche article n'existe pas.
- Le retrait de la logique de sélection de `skills/suggest-chart/SKILL.md`.

**HORS** (chacun a sa case §4 du parapluie) :

- La **branche article** elle-même — spec 2, immédiatement après celui-ci.
- Le **préflight** : le décor est consommé tel qu'il est, aucune préférence maison nouvelle n'est
  inventée (cf. §4, axe STYLE).
- L'**ampleur du récit** (combien de visuels, où ils tombent dans l'article) : le cerveau offre des
  formes **pour un élément**. `SCOPE` ici veut dire **canal de publication**, rien d'autre.
- Les **types déférés** (14 côté chart-native) : structurellement inoffrables, et c'est le but.
- Toute retouche aux moteurs de rendu.

---

## 3. Architecture

Nouveau dossier `lib/brain/`, **pur** (aucune I/O hors la lecture des fiches KB), consommé par
`lib/loop/propose.ts` qui devient un appelant mince. La boucle garde la propriété que la branche
verb-contract lui a donnée : **rien sous `lib/loop/` ne connaît `skills/` sauf `engines.ts`.**

| Unité | Responsabilité | Dépend de |
|---|---|---|
| `intents.ts` | Le **vocabulaire fermé** des intentions (le canon FT). Une constante, rien d'autre. | — |
| `typology.ts` | Charge les fiches KB → `TypeSheet[]` validé zod ; joint aux catalogues moteurs. | `intents`, registre |
| `eligibility.ts` | Pur : `(facts, channel, decor, route) → { eligible[], excluded[] }`. Toute exclusion porte sa raison. | `typology` |
| `rank.ts` | Pur : ordonne les éligibles. Heuristique, dégradable. | `intents` |
| `offer.ts` | Assemble l'offre : top-3 + écartées + fragments groundés + faits calculés. | tous |
| `verify-offer.ts` | La garde mécanique sur ce que le modèle a rédigé. | — |

Chaque unité se lit et se teste seule ; aucune ne connaît un moteur autrement qu'à travers le
registre.

**Le catalogue de types vient du registre qui rend.** `registerProducer` (`lib/core/registry`)
gagne un champ `types: readonly EngineType[]` (`{ id, deferred?: string }`), alimenté par chaque
moteur depuis son catalogue canonique existant — `chart-native/src/native-types.ts`,
`map-native/src/map-types.ts`, `dw-chart/src/chart-spec.ts` (`CHART_TYPES`), et les leurs pour
image-native et scrolly. Conséquences structurelles, pas déclaratives :

- un type **déféré** ne peut pas être offert (il n'entre pas dans l'ensemble légal) ;
- un type qui **devient** atteignable entre dans l'offre **sans qu'on touche au cerveau** ;
- un moteur absent de l'install (host façade B2) retire ses types de l'offre par construction.

---

## 4. Les quatre axes — deux couches, pas quatre filtres

La décision centrale de ce design : **séparer ce qui est mesurable de ce qui est sémantique**, et
ne jamais laisser le sémantique décider de la légalité.

### 4.1 Couche LÉGALITÉ — déterministe, testée

Une forme est légale si et seulement si les quatre conditions tiennent. Chacune est un fait
mesurable, et **chaque exclusion produit une raison lisible** — jamais de retrait silencieux.

1. **Forme des données.** La fiche déclare la forme CSV attendue (`shape`) et ses seuils
   (`limits`), confrontés au `DataProfile` réel produit par `orient`. Exemple : `slope` exige
   exactement deux points et ≤ 12 séries ; onze séries passent, treize sont écartées avec
   « 13 lignes — au-delà de 12 les trajectoires s'emmêlent ».
2. **SCOPE = le canal de publication.** La chaîne `channel → format → taille → sous-format` déjà
   en place dit quels formats sont autorisés. Un canal hors-embed n'offre jamais d'interactif ;
   un canal social n'offre pas un format paysage. Le cerveau **n'invente pas** cette règle, il la
   consomme.
   *Correctif de frontière inclus dans ce chantier :* les **types** `Channel`/`VisualFormat` sont
   déjà dans `lib/core/vocabulary`, mais la **table** `CHANNELS` (et `isFormatAllowed`) vit dans
   `skills/splash/src/channel.ts`. C'est du vocabulaire partagé, pas de la connaissance de skill :
   on la **remonte dans `lib/core`**, `skills/splash` la ré-exportant pour ne rien casser. Sans ça
   le cerveau devrait tendre la main dans `skills/`, exactement ce que §13 interdit.
3. **CAPACITÉ = le décor.** Comportement déjà en place dans `propose.ts` et **conservé tel quel** :
   la forme dont une capacité manque est offerte **marquée** (`readiness: { status, reason }`),
   jamais retirée en silence ni offerte nue. Le statut d'une forme est le **pire** statut de ce
   qu'elle requiert.
4. **STYLE = seulement l'impossible physique.** STYLE n'introduit **aucune préférence maison
   nouvelle** (ce serait étendre le sous-projet Préflight). Il n'écarte que là où le rendu est
   réellement impossible — cas connu et render-prouvé : un `themeBg` non-clair ne peut pas être
   rendu par Datawrapper (fond plan-gated, cf. CLAUDE.md § session 2026-07-14/15), donc les types
   dw-chart sont écartés avec « thème maison sombre — Datawrapper ne rend que sur fond clair ».

### 4.2 Couche CLASSEMENT — heuristique, dégradable

L'**intention** (`RAISON`) — « ce que le takeaway veut faire voir » — est sémantique : elle se
dérive du `confirmedTakeaway`, de la prose. On ne peut pas la rendre déterministe honnêtement.
Donc elle ne décide de **rien** :

> **Invariant.** L'intention influe sur l'**ordre** des formes éligibles. Elle ne peut jamais
> rendre une forme légale illégale, ni l'inverse.

Une intention mal classée dérange l'ordre des deux ou trois options posées sur la table ; le
journaliste voit toujours l'ensemble légal complet, écartées comprises, et tranche. C'est la
dégradation gracieuse qui rend acceptable d'avoir du sémantique dans la boucle.

Le classement combine : correspondance d'intention (la fiche déclare les intentions qu'elle sert)
· adéquation aux faits (une forme dont les seuils sont confortablement tenus passe devant une
forme à la limite) · statut de readiness (une forme prête passe devant une forme marquée).

**Grounding (étoile polaire arrêtée au brainstorming du socle, 2026-07-24).** La liaison
intention→forme suit le FT Visual Vocabulary ; le **filtre est dur**, le **rang est souple**,
ordonné par efficacité-par-tâche (Saket, TVCG 2019 · Kim & Heer). Il n'y a **ni solveur ni poids
appris**, et le **classement n'est jamais confié au modèle** — DracoGPT est la preuve publiée que
c'est ce qu'il fait le moins bien. Le modèle ne fait donc que rédiger (§7).

**Vocabulaire fermé des intentions** — le canon FT Visual Vocabulary, déclaré une fois dans
`lib/brain/intents.ts` :
`deviation` · `correlation` · `ranking` · `distribution` · `change-over-time` · `magnitude` ·
`part-to-whole` · `spatial` · `flow`.
(`knowledge/references/chart-selection.md` en expose six dans son tableau intention→type ; c'est
un sous-ensemble de présentation, pas une seconde source — le vocabulaire fait autorité ici.)

---

## 5. Contrat 1 — le frontmatter de fiche

Une fiche par type reste **un fichier**. L'en-tête porte les facettes machine ; le corps en prose
reste intact et sert de grounding. Aucun drift savoir↔règle possible : il n'y a qu'un endroit.

```yaml
---
id: slope                                 # id canonique de la fiche (= son nom de fichier)
engines:                                  # moteur → SA clé de rendu ; vérifié contre le registre
  chart-native: slope
intent: [change-over-time, ranking]       # vocabulaire fermé (§4.2)
shape: wide                               # miroir de NativeTypeEntry.shape
limits: { points: 2, maxSeries: 12 }      # mesurables sur le DataProfile
formats: [static, interactive, video]     # ce que le moteur sait en sortir pour CE type
bestFor:
  - "un avant/après sur une poignée de catégories"
  - "un changement de rang entre deux périodes"
notFor:
  - "plus de deux points dans le temps — c'est une ligne"
  - "beaucoup de catégories proches — les lignes s'emmêlent"
---
```

- `bestFor` / `notFor` sont **rédigés en citant le corps de la fiche** (ici sa section « When to
  use / when NOT »). **Pas de parsing de prose libre** : reformuler un paragraphe de la fiche ne
  casse aucune règle. Ce sont eux, plus les faits calculés, la seule matière que le modèle a le
  droit d'utiliser pour rédiger le `why` (§7).
- Chargé et validé **zod** au démarrage du cerveau ; un frontmatter invalide **fail-hard**, il ne
  dégrade pas en silence.
- Le YAML se parse avec un lecteur minimal maison (le `package.json` ne porte que
  `@noble/hashes`, `fflate`, `zod` — le frontmatter est un sous-ensemble plat, pas du YAML
  général ; un frontmatter qui sort de ce sous-ensemble fail-hard plutôt que d'être deviné).

**Trois tests de dérive**, portés sur les trois catalogues moteurs :

1. toute clé de rendu déclarée dans `engines` existe dans le catalogue du moteur nommé —
   les ids **divergent** d'un moteur à l'autre (`slope` côté chart-native, `d3-range-plot`
   côté dw-chart), c'est pourquoi `engines` est une table et non une liste ;
2. tout type **atteignable** (non déféré) d'un moteur enregistré **a sa fiche** — extension du
   test de complétude qui existe déjà côté chart-native (`tests/completeness.test.ts`, où le
   backfill `LEGACY_KB_FAMILY_BACKFILL` doit **rétrécir, jamais grandir**) ;
3. tout `intent` déclaré appartient au vocabulaire fermé de `intents.ts`.

**Coût honnête.** Écrire ce frontmatter pour ~38 fiches chart + 7 fiches carto + les types
dw-chart est du **travail d'auteur**, pas du code : c'est là que la qualité de l'offre se joue.
Le plan le porte en tâches explicites (une par famille), pas en « et aussi ».

---

## 6. Contrat 2 — l'offre dans le manifest

`FormOption` (schéma zod dans `lib/loop/manifest.ts`) s'étend :

```ts
type FormOption = {
  id: string;
  nativeType: string;
  engine: string;                 // qui rendra
  format: VisualFormat;           // lib/core/vocabulary — un élément = un format (décision verrouillée)
  intent: Intent[];               // ce que la forme sert
  why: string;                    // rédigé par le modèle, vérifié (§7)
  whySource: { sheet: string; fragments: string[]; facts: Record<string, string> };
  requires?: string[];            // capacités + "article-branch"
  readiness?: { status: "ready" | "missing" | "unverified" | "disabled"; reason: string };
};
```

`proposal` s'étend de `excluded: { id: string; reason: string }[]`.

**Les écartées sont de l'état, pas une phrase.** Persistées au manifest, elles survivent à un
`resume`, le journaliste peut y revenir et en réclamer une, et une revue peut lire ce que le
cerveau a refusé d'offrir. C'est la différence entre un outil qui montre son raisonnement et un
outil qui l'affirme.

`route: "embed" | "article"` monte sur le manifest (portée run, à côté de `input`).

`schemaVersion` **3 → 4**, migration dans `migrate.ts` (le mécanisme existe et a déjà servi) :
un manifest v3 migre avec `excluded: []` et `route: "embed"`.

---

## 7. La couture modèle et sa garde

**Ce que le code produit.** `offer()` retourne de la **donnée** : les ids, l'ordre, les fragments
`bestFor`/`notFor` de la fiche, les **faits calculés** (`{ series: "12", points: "2", periods:
"2019 → 2024" }`), les écartées et leurs raisons.

**Ce que le modèle fait.** Une seule chose : **rédiger** cette donnée dans la langue du décor
(`decor.language`), au ton d'un desk. Il ne choisit pas, ne réordonne pas, n'ajoute pas, ne retire
pas.

**Ce qui l'empêche de faire autre chose.** `verifyOffer(phrased, offer)`, appelée par le skill —
non optionnelle, et elle **throw** :

- un id absent de l'ensemble légal ;
- un ordre modifié ;
- une écartée présentée comme offerte (ou l'inverse) ;
- une forme marquée présentée comme prête ;
- **un token numérique absent des faits calculés et des données** — le claim-grounding déjà en
  place côté chart-native (« tokens numériques hors domaine data »), appliqué au texte de l'offre.

C'est cette garde, et non une phrase d'intention dans un SKILL.md, qui fait tenir « le code
décide, le modèle rédige ».

---

## 8. Le routage prose/data

La typologie couvre **les deux branches** dès ce spec. Selon ce qui est apporté (`input.data`,
`input.article`, les deux) et le canal, le cerveau peut poser une forme **narrative** sur la table
— scrolly, story, article-vidéo.

Tant que la branche article n'est pas construite (spec 2), ces formes déclarent
`requires: ["article-branch"]` et sont offertes **marquées indisponibles**, avec **exactement** la
mécanique de readiness d'une capacité manquante : même champ, même sévérité, même discipline
« jamais silencieusement retirée, jamais silencieusement offerte ».

Deux bénéfices : le journaliste **découvre** que la voie existe (P1 — l'outil offre, il décide) ;
et le spec 2 la débloque en fournissant la capacité, **sans retoucher le cerveau**.

---

## 9. Ce qui est retiré

`skills/suggest-chart/SKILL.md` (613 lignes) porte aujourd'hui la logique de sélection en prose.
Dès que le cerveau existe, c'est une **seconde source de vérité** — le défaut exact que la
re-conception attaque. Le spec inclut donc :

- vider la logique de sélection de `suggest-chart/SKILL.md` vers le frontmatter et la typologie ;
- laisser un skill mince (le reste — shapes CSV par type — a déjà migré vers
  `knowledge/references/chart-selection.md` lors du prose-slimming du 2026-07-17) ;
- vérifier qu'aucun chemin de code ne dépend encore de ce qui a été retiré.

`suggest-article` et `suggest-image` ne sont **pas** touchés ici : le premier relève de la branche
article (spec 2), le second d'image-native.

---

## 10. Erreurs et off-ramps

- **Aucune forme légale.** Le cerveau ne fabrique rien et ne dégrade pas vers « le moins pire » :
  il dit ce qui manque, en s'appuyant sur les raisons d'exclusion déjà calculées (« rien ici ne
  peut porter ce point : une seule colonne numérique, et le canal social interdit l'interactif »).
  C'est le pendant, au beat Propose, de l'honnêteté d'`orient`.
- **Frontmatter invalide / fiche manquante pour un type atteignable** : fail-hard au chargement.
  Un savoir à moitié chargé produirait une offre silencieusement appauvrie.
- **Offre rephrasée non conforme** : `verifyOffer` throw ; l'offre n'est jamais posée telle quelle.
- **Décor absent** (install sans préflight) : l'offre se fait sans l'axe CAPACITÉ, comme
  aujourd'hui — les formes sortent non marquées plutôt que marquées à tort.

---

## 11. Tests (`bun:test`, TDD — test rouge d'abord)

- **`typology`** : parse golden d'une fiche réelle · zod rejette un frontmatter invalide · les
  trois tests de dérive (§5) · une fiche dont l'`id` ne correspond à aucun moteur enregistré
  échoue.
- **`eligibility`** : table-driven, un cas par axe et par frontière (seuil tenu / dépassé, canal
  autorisé / interdit, capacité prête / manquante, thème clair / sombre) · **invariant : toute
  exclusion porte une raison non vide.**
- **`rank`** — *le test-clé du design* : sur le même profil, deux intentions différentes (dont une
  volontairement fausse) produisent **des ordres différents et le même ensemble légal**.
- **`verify-offer`** : une offre rephrasée qui ajoute une option · en retire une · réordonne ·
  invente un chiffre · présente une marquée comme prête → **throw** dans les cinq cas.
- **`offer`** : au plus 3 offertes, les écartées présentes avec raison, `whySource` renseigné.
- **`migrate`** : un manifest v3 migre en v4 (`excluded: []`, `route: "embed"`) sans perte.
- **e2e dans la boucle** : CSV réel → `orient` → angle → **offre 3 options + écartées** → choix →
  `produce` existant rend un vrai artefact, manifest cohérent de bout en bout.

---

## 12. Critères de succès

1. Sur une donnée réelle, le beat Propose pose **2-3 formes classées avec un pourquoi groundé** et
   **dit ce qu'il a écarté et pourquoi** — le journaliste tranche, l'outil n'a rien décidé pour lui.
2. **Aucun type déféré, aucun type sans moteur** ne peut être offert — par construction (registre),
   pas par vigilance.
3. Une **intention fausse** dégrade l'ordre et **jamais** l'ensemble légal (test explicite).
4. Une forme narrative apparaît **marquée « nécessite la branche article »**, et le spec 2 la
   débloquera sans modifier `lib/brain/`.
5. Il n'existe plus **qu'une** source de vérité pour la sélection : la fiche KB.

---

## 13. Contraintes globales

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD** : test qui échoue avant
  l'implémentation, à chaque tâche.
- Code, commentaires, identifiants, noms de fichiers, commits, branches : **anglais**.
- **Aucune mention** vendor (Claude/Anthropic) dans un artefact commité. Pas de `Co-Authored-By`.
- **Pas de nouveau `any`** ; pas d'import cross-moteur de `src/` depuis `lib/loop/` ou `lib/brain/`
  (le catalogue passe par le registre, comme le rendu passe par le verbe).
- Gate `bun run check` vert avant chaque commit.
- **★ Boucle feedback → système** : tout défaut d'offre trouvé en QA se corrige au **frontmatter ou
  à la règle**, jamais sur l'exemple courant.
- **Git** : branche `feat/proposal-brain`, worktree `/Users/rmdms/Sites/Professional/splash-brain`,
  off `feat/delivery-s3`.
