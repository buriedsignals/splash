# Spec — Format-reach (vidéo + scrolly offrables)

> **Statut :** design validé (brainstorming, 2026-07-26). Prêt pour → writing-plans.
> **Origine :** sous-projet #4 de l'ordre verrouillé du spec-parapluie
> `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §4 ; ouvert par la
> **décision en attente** laissée par le spec du Proposal-cerveau
> (`docs/superpowers/specs/2026-07-25-proposal-brain-design.md`).
> **Branche :** `feat/format-reach`, off `feat/proposal-brain` (worktree `splash-reach`).
> **Portée :** le cerveau et sa couture production. La **branche article** (production
> scrolly/story) reste le spec suivant.
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Problème

Le cerveau du beat *Propose* est vert et sain, mais **il n'offre jamais de vidéo ni de scrolly**.
Mesuré par exécution sur `feat/proposal-brain` (données 8 lignes × 2 mesures numériques) :

| canal | `static` | `interactive` | `video` | `scrolly` |
|---|---|---|---|---|
| `article-web` | 33 (20 nets) | 33 (20 nets) | **26 (20 nets)** | **1 (0 net)** |
| `social-vertical` | 33 (20 nets) | — | **26 (20 nets)** | — |

« Net » = candidat sans marque, donc offrable propre. Le légal ne manque de rien : **20 candidats
vidéo `chart-native` propres et réellement constructibles** sur les deux canaux. Ils sont
**enterrés**, par deux mécanismes qui se composent :

1. `lib/brain/offer.ts:45` garde **une ligne par forme** (`seen.has(c.id)`) ;
2. `lib/brain/rank.ts:12` ordonne les formats `interactive < static < video < scrolly` en dernière
   clé du tri lexicographique.

Résultat : l'offre est **mono-format**. Sur `article-web` elle sort trois lignes interactives ; sur
les canaux sociaux, trois lignes statiques. Le statique ne remonte pas plus que la vidéo — ce n'est
pas un biais anti-vidéo, c'est l'absence de toute règle de diversité.

Trois défauts distincts s'ajoutent à ça :

- **(a) Une décision verrouillée est en régression.** Wave 7 (CLAUDE.md, 2026-07-11) : « signal de
  format explicite du journaliste GAGNE sur `interactiveDefault` ». `EligibilityInput` n'a
  **aucun champ** pour un format demandé, et rien ne route une demande jusqu'à `buildOffer`.
- **(b) Le scrolly est structurellement inatteignable.** `lib/brain/eligibility.ts:91` filtre sur
  `getProducer(engine)?.formats` ; ni `chart-native` ni `map-native` ne déclarent `scrolly` — les
  deux le **refusent explicitement** en pointant vers le producteur `scrolly`
  (`skills/chart-native/scripts/produce.mjs:400`, `skills/map-native/scripts/produce.mjs:467`).
- **(c) La KB ment sur elle-même.** Le corps de `dot-density.md:201-202`, `cartogram.md:191-204`,
  `hex-grid.md:143-145` documente des composants scrolly **livrés** — et ils existent
  (`skills/scrolly/src/Scrolly{Chart,Map,SymbolMap,HexMap,DotDensityMap,LocatorMap,CartogramMap}.tsx`).
  Mais **une seule fiche sur 45** déclare le format `scrolly` dans ses facettes
  (`image-scrolly.md`). Le savoir est écrit dans la prose et absent de la machine.

Enjeu : **vidéo et scrolly sont des promesses PUBLIQUES** de la page FJM (« motion graphics
code-rendered, pas du screen recording » · « map-scrolly live »), et le CLAUDE.md pose leur garde
mécanique comme prioritaire.

---

## 2. Portée

**DANS.**

- Le **genre de livrable** comme axe de diversité de l'offre, et la **ligne réservée** qui s'ensuit.
- Le **format demandé** : champ d'état, filtre dur dans la couche légalité, refus nommé, threading,
  et le point du parcours qui le pose.
- La **redirection producteur par format** qui rend le scrolly atteignable.
- L'**authoring KB** des 9 fiches dont le corps documente un scrolly livré, plus la source machine
  qui empêche cette facette de re-diverger.
- Une **preuve e2e** : un `.mp4` réel produit par la boucle depuis une ligne d'offre choisie.

**HORS — explicitement, et pas par oubli.**

- Le câblage production de `map-native` / `scrolly` : `LOOP_BUILDABLE_ENGINES` reste
  `["chart-native"]`. Cette tranche rend le scrolly **légal et atteignable**, pas constructible.
- La **branche article** (spec suivant).
- Le résidu cloudflare (`${url}/${stagedName}`) — même sujet, tranche différente.
- L'événement au refus d'une forme marquée (follow-up parké de #2).
- Toute modification de `rank.ts`. Les quatre tiers et `FORMAT_ORDER` sont intacts.

---

## 3. Le concept porteur — le genre de livrable

Un slot « meilleur autre format » naïf ne marche pas. Sur les données mesurées, le rang 4 est
`bump/static` : le statique gagnerait systématiquement le slot et la vidéo resterait enterrée.

Ce qui distingue vraiment deux lignes pour un journaliste n'est pas le format, c'est **ce avec quoi
il repart** :

| genre | formats | ce que c'est |
|---|---|---|
| `element` | `static`, `interactive` | un élément embarquable dans l'article |
| `motion` | `video` | un `.mp4` (réseaux, slot vidéo du CMS) |
| `page` | `scrolly` | une page narrative entière |

La taxonomie n'est pas inventée pour l'occasion : `lib/brain/eligibility.ts:46` dit déjà mot pour
mot « the engines whose output is a narrative page rather than an embeddable element », et la vidéo
est le seul format dont l'artefact n'est pas du HTML (`lib/loop/produce.ts:31`, `artifactMediaFor`).

**Domicile.** `lib/core/vocabulary.ts` — le vocabulaire canonique. La table est **totale** sur
`VisualFormat` (`Record<VisualFormat, DeliverableKind>`, pas `Partial`) : ajouter un format au
vocabulaire force à lui donner un genre, plutôt que de le laisser tomber dans un défaut muet.

```ts
export type DeliverableKind = "element" | "motion" | "page";
export const DELIVERABLE_KIND: Record<VisualFormat, DeliverableKind> = {
  static: "element",
  interactive: "element",
  video: "motion",
  scrolly: "page",
};
```

---

## 4. Contrat 1 — la ligne réservée (`lib/brain/offer.ts`)

**Règle.** L'offre garde son plafond (`DEFAULT_MAX = 3`) et sa dédup une-ligne-par-forme. **La
dernière ligne est réservée au candidat le mieux classé dont le genre n'est pas déjà représenté**
par les lignes précédentes.

**Algorithme, exactement.**

1. Remplir gloutonnement selon la règle actuelle (premier candidat par `id` non encore vu) jusqu'à
   `max - 1` lignes.
2. Pour la dernière ligne : parcourir `ordered` et prendre le **premier** candidat dont l'`id` n'est
   pas déjà pris **et** dont `DELIVERABLE_KIND[c.format]` n'est pas déjà représenté.
3. **Repli** : si aucun tel candidat n'existe, prendre la dernière ligne selon la règle normale.
   L'offre ne rétrécit jamais à cause de la réservation.
4. `max === 1` ⇒ aucune réservation (il n'y a pas de « dernière ligne » distincte de la première).
5. Moins de candidats que `max` ⇒ offre plus courte, comportement inchangé.

**Résultat mesuré attendu** sur les données de la probe, `article-web` :
`bump/interactive` · `fan/interactive` · **`connected-scatter/video`**.

**Pourquoi la ligne réservée porte une forme DIFFÉRENTE, jamais la même forme dans un autre
format.** `lib/loop/manifest.ts:156`, `:247`, `:343` et `lib/loop/produce.ts:56` résolvent tous
`chosenId` par `options.find(o => o.id === chosenId)`. Deux lignes partageant le même `id`
renverraient la **première** : le journaliste choisit la vidéo, la boucle produit l'interactif,
**silencieusement**. Garder l'`id` unique dans une offre évite ce trou sans toucher au contrat
`chosenId`, sans champ `chosenFormat`, et sans migration des manifests existants.

**Cette règle est de la SÉLECTION, pas du classement.** `rank.ts` n'est pas touché. Le nord du
cerveau — « l'intention n'influe que sur le classement, jamais sur la légalité » — est intact, et
la diversité de genre n'introduit rien de sémantique.

**Conséquence assumée.** La ligne réservée coûte une troisième forme distincte : l'offre montre
3 formes dont une en mouvement, au lieu de 3 formes embarquables. C'est le prix du choix, et c'est
P1 — l'outil propose, le journaliste décide.

**Le scrolly ne sortira pas encore, et c'est voulu.** Une ligne scrolly est marquée `missing`
(branche article inexistante + producteur non constructible) ; le tier 2 du classement (readiness)
la fait perdre contre une vidéo prête pour la ligne réservée. L'offre ne met pas en avant ce
qu'elle ne peut pas produire. Le scrolly devient **légal et atteignable** ici, et **visible** le
jour où la branche article le rend constructible — sans retoucher `lib/brain/`.

---

## 5. Contrat 2 — le format demandé

### 5.1 L'état

`RunElement` gagne un champ optionnel :

```ts
requestedFormat?: VisualFormat;   // zod: z.enum(VISUAL_FORMATS).optional()
```

Plat, pas imbriqué dans un objet `request` (YAGNI — c'est le seul champ, et rien d'autre n'est
prévu ; on l'imbriquera le jour où un deuxième existe). Sur l'**élément** et non sur le run, parce
que le canal est déjà run-level et qu'un run peut porter plusieurs éléments avec des intentions de
format différentes. Optionnel ⇒ **pas de bump de `schemaVersion`**, les runs existants restent
lisibles tels quels.

### 5.2 La condition (couche LÉGALITÉ)

`EligibilityInput` gagne `requestedFormat?: VisualFormat`. Le filtre s'applique **juste après le
filtre canal, avant le filtre producteur** :

- **Format hors du canal** (`!isFormatAllowed(channel, requestedFormat)`) : `eligible()` retourne
  `{ eligible: [], excluded: [], refusal }`, où `refusal` est **une** phrase nommant le canal, le
  format demandé et les formats que le canal autorise. **Aucune ligne d'exclusion** : 45 lignes
  identiques ne sont pas de l'information.
- **Format légal** : la liste `formats` de chaque fiche est réduite à ce seul format. Une fiche qui
  ne le décline pas est exclue avec sa propre raison — « tu as demandé une vidéo, cette forme ne se
  décline pas en vidéo » — ce qui est utile et par-fiche.

Le type de retour de `eligible()` gagne donc `refusal?: string` en plus de `{ eligible, excluded }`,
et `Offer` gagne le champ correspondant : `{ options, excluded, refusal?: string }`.

**Un troisième cas, découvert à l'exécution et fermé sur ruling** (review finale, 2026-07-26). Un
format demandé peut être **autorisé par le canal** et ne laisser pourtant **aucun candidat
constructible aujourd'hui** — `requestedFormat: "scrolly"` sur `article-web` en est le cas réel :
toutes les lignes survivantes sont des scrolly, toutes marquées `missing`, et `nextActions`
renvoyait `choose-form` indéfiniment sans verbe pour en sortir. Donc :

- `refusal` est **aussi** posé dans ce cas, en nommant le format demandé et ce que le canal sait
  réellement construire — mais ici **`options` n'est PAS vide** : les lignes restent offertes et
  marquées (« marqué, jamais retiré » n'est pas affaibli), et le refus est une phrase **en plus**
  qui explique l'impasse au lieu de la laisser subir. `refusal` ne signifie donc pas
  « `options: []` » : il signifie « ce que tu as demandé ne peut pas aboutir, voici pourquoi ».
- `ReviseChange` gagne de quoi **effacer** `requestedFormat` (`clear-requested-format`), qui
  invalide la proposition par le chemin d'invalidation existant — il y a donc une sortie.
- L'enum fermée `NextAction` n'est **pas** touchée : l'exposer comme un pas de boucle relève du
  chantier façade-hôte, pas d'une tranche du cerveau.

**Pourquoi dans la légalité et pas dans le classement.** Une demande de format est un **fait du
run**, pas une intention lue dans de la prose. La rendre soft affaiblirait la décision verrouillée
Wave 7 en la ramenant au niveau d'un signal faillible. Rien de sémantique n'entre dans
`eligibility.ts` : la contrainte est mesurable et vérifiable.

**Interaction avec la ligne réservée.** Quand un format est demandé, un seul genre survit au
filtre : la réservation est mécaniquement sans objet, et **aucune règle spéciale n'est écrite pour
ça**.

### 5.3 Le threading, et qui pose le champ

`lib/loop/propose.ts` lit `el.requestedFormat` et le passe à `buildOffer`.

Et — c'est la leçon des **gardes dormantes** (cf. `B/D source-preservation`, CLAUDE.md session
2026-07-14) — **`skills/splash/SKILL.md` (CADRAGE) doit dire d'enregistrer dans ce champ un format
explicitement demandé par le journaliste**. Sans ça on construit une garde que rien n'alimente.
Cette modification de doc **fait partie de la tranche**, pas d'un follow-up.

---

## 6. Contrat 3 — la redirection producteur par format

### 6.1 La fonction

Dans `lib/core/registry.ts` :

```ts
// Le format `scrolly` n'appartient à aucun moteur : le producteur `scrolly` HÉBERGE la piste de
// son hôte en gardant sa clé de rendu. La taxonomie du projet le dit déjà (« scrolly = mécanisme
// partagé, pas moteur pair ; le format appartient au moteur hôte et hérite de sa furniture ») et
// les deux produce.mjs natifs le refusent en NOMMANT ce producteur. Ceci est la même règle, en
// lisible-par-machine.
export function producerForFormat(engine: string, format: VisualFormat): string {
  // Un moteur qui déclare le format le rend lui-même — image-native construit son propre
  // image-scrolly et ne doit pas être redirigé.
  if (getProducer(engine)?.formats.includes(format)) return engine;
  return FORMAT_HOST[format] ?? engine;   // FORMAT_HOST = { scrolly: "scrolly" }
}
```

### 6.2 Les trois lecteurs, et pourquoi ils doivent tous l'utiliser

1. **Le filtre de formats** (`eligibility.ts:91`) : un format `f` survit si
   `getProducer(producerForFormat(engine, f))?.formats.includes(f)`. Le scrolly cesse d'être mangé ;
   `video` sur `map-dw` reste écarté (map-dw déclare `static, interactive`).
2. **La marque de constructibilité** (`eligibility.ts:229`) : `isLoopBuildable` et
   `unbuildableEngineReason` doivent recevoir le **producteur effectif**, pas `c.engine`. Sans ça
   une ligne `chart-native` + `scrolly` sortirait **propre** (chart-native est buildable) alors que
   rien ne peut la construire — exactement le « offre bruyante de l'inconstructible » que le
   commentaire de `buildable.ts` refuse.
3. **La garde de production** (`lib/loop/produce.ts:74`) : même résolution, pour que la marque de
   l'offre et le refus de `produce` restent la même phrase — l'invariant que `lib/loop/buildable.ts`
   documente déjà comme sa raison d'être.

### 6.3 L'authoring KB — 9 fiches, sourcé du dispatch

Vérité terrain, lue dans `skills/scrolly/src/Scrolly.tsx` :

- **piste chart** — `CHART_SCROLLY_TYPES` (`Scrolly.tsx:53`) = `line`, `bar`, `scatter` ;
- **piste carte** — branches explicites `symbol`, `hex-grid`, `dot-density`, `locator`,
  `cartogram`, plus **`choropleth` en branche par défaut** (`ScrollyMap` + `computeChoropleth`) ;
- **image** — `image-scrolly`, déjà déclaré (`image-native` le rend lui-même).

Les 9 fiches correspondantes gagnent `scrolly` dans leurs `formats`. **`route` ne le gagne pas** :
il n'a aucune branche et tomberait dans le défaut, donc serait rendu **comme un choroplèthe**,
silencieusement.

### 6.4 La source machine et le piège `route`

Une facette KB que rien ne vérifie re-diverge — c'est la classe de bug que `typology-drift.test.ts`
surveille déjà. Donc, dans `skills/scrolly/src/Scrolly.tsx` :

- extraire `MAP_SCROLLY_TYPES` en const exportée à côté de `CHART_SCROLLY_TYPES`, et **s'en servir
  dans le dispatch** (pas une liste parallèle) ;
- **refuser un type de carte inconnu** au lieu de le laisser tomber dans la branche par défaut,
  exactement comme la piste chart refuse déjà un `nativeType` non scrollable (`Scrolly.tsx:130`) :
  message clair, pas d'échafaudage vide, pas de choroplèthe déguisé.

C'est une modification **additive et symétrique** d'un moteur, assumée : elle ferme un piège de
rendu-faux-silencieux **préexistant** (`route`) et donne au test de dérive une source réelle plutôt
qu'un troisième registre à la main.

---

## 7. Ce qui ne bouge pas

- `lib/brain/rank.ts` — quatre tiers et `FORMAT_ORDER` **inchangés**.
- `lib/brain/verify-offer.ts` — contrat inchangé (mêmes ids, même ordre, même claim-grounding).
  Une offre vide (refus) donne `phrased = []` face à `offered = []`, ce que la garde accepte déjà.
- `DEFAULT_MAX` reste 3. `chosenId` garde sa sémantique. `schemaVersion` du manifest inchangée.
- `LOOP_BUILDABLE_ENGINES` reste `["chart-native"]`.
- Le comportement par défaut : **sans** `requestedFormat` et **sans** candidat d'un genre non
  représenté, l'offre est byte-identique à aujourd'hui.

---

## 8. Erreurs et off-ramps

| situation | comportement |
|---|---|
| `requestedFormat` hors du canal | `Offer.refusal` posé, `options: []`, aucune exclusion ; le desk affiche la phrase |
| `requestedFormat` légal mais **aucun candidat constructible** | `Offer.refusal` posé **et `options` non vide** — les lignes restent offertes marquées ; sortie par `revise` (`clear-requested-format`) |
| `requestedFormat` légal, aucune fiche ne le décline | `options: []`, exclusions **par fiche** avec leur raison |
| offre vide passée à `applyPhrasing` | **jette**, comme aujourd'hui (`lib/loop/phrase.ts:57`). Une offre vide n'a rien à rédiger ; le refus est porté par `Offer.refusal` et affiché par le desk, jamais par une phrase de modèle |
| aucun candidat d'un genre non représenté | repli silencieux sur la règle normale ; l'offre garde sa longueur |
| ligne scrolly choisie | `produce` refuse **loud**, avec la phrase déjà affichée dans la marque de l'offre |
| fiche déclarant `scrolly` pour un type que le dispatch ne connaît pas | test de dérive **rouge** au gate |

---

## 9. Tests (`bun:test`, TDD — test rouge d'abord)

**Dans le gate** (`bun run check`), tous déterministes :

1. `vocabulary` — `DELIVERABLE_KIND` est total sur `VISUAL_FORMATS` (exhaustivité au type **et** au
   runtime).
2. `offer` — la ligne réservée prend le mieux classé d'un genre non représenté ; repli quand il n'y
   en a pas ; l'offre ne rétrécit jamais ; `max === 1` ne réserve rien.
3. `offer` — **invariant d'unicité des `id`** dans une offre. Ce test garde la classe de bug
   `chosenId`/`find` décrite en §4 ; il doit exister **explicitement**, pas être implicite.
4. `eligibility` — format demandé légal ⇒ un seul format dans le légal ; hors canal ⇒ `refusal`
   posé + `options: []` + **zéro** exclusion ; fiche ne déclinant pas le format ⇒ exclusion avec sa
   propre raison.
5. `eligibility` — la marque de constructibilité est calculée sur le **producteur effectif** :
   `chart-native` + `scrolly` sort **marqué**, jamais propre.
6. `registry` — `producerForFormat` : redirection `scrolly` ; **pas** de redirection pour
   `image-native` (qui déclare le format) ; identité pour tout autre couple.
7. `typology-drift` — l'ensemble des fiches déclarant `scrolly` est **exactement**
   `CHART_SCROLLY_TYPES ∪ MAP_SCROLLY_TYPES ∪ {image-scrolly}`. Dans les deux sens : une fiche qui
   déclare sans dispatch échoue, un type dispatché sans fiche échoue.
8. `propose` / `manifest` — threading de `requestedFormat`, round-trip du champ optionnel,
   compatibilité d'un manifest qui ne le porte pas.
9. `phrase` — une offre en refus est refusée **loud** par `applyPhrasing`, avec le message
   existant. Le test verrouille que le refus n'emprunte jamais le chemin d'un `why`.
10. `produce` — une option scrolly est refusée avec la **même phrase** que la marque de l'offre.

**Opt-in, hors gate** : la preuve e2e (§10).

---

## 10. La preuve e2e vidéo

`lib/loop/video-e2e.test.ts`, **opt-in par variable d'environnement** (`SPLASH_VIDEO_E2E=1`), sur
le modèle de la preuve live déjà présente dans la suite (`lib 595/0, 1 skip`).

Il monte un run avec un vrai CSV gelé, appelle `propose()`, **choisit la ligne du genre `motion`**,
appelle `produce()`, et assert :

- un `.mp4` **réel** sous `runDir/elements/<id>/`, de taille non triviale ;
- `el.artifact.format === "video"` ;
- la provenance enregistrée (`stalenessOf` reste cohérent).

Il **n'entre pas** dans `bun run check` (rendu Remotion = minutes), **mais il doit être exécuté une
fois pendant la tranche et son résultat consigné** (chemin, taille, durée) dans le plan et le
CHANGELOG. La leçon gravée est explicite : *une preuve live sur une fixture ne prouve pas le chemin
réel* — c'est précisément ce qui avait laissé passer le bug « tout artefact servi en HTML ».

Prérequis d'environnement (à noter dans le plan, ce n'est pas un défaut) : `bun install` dans
`skills/chart-native`.

---

## 11. Critères de succès

1. Sur `article-web` et sur `social-vertical`, avec des données ordinaires et **sans** format
   demandé, l'offre contient **une ligne de genre `motion`** — mesuré par le même type de probe que
   §1, pas déduit.
2. `requestedFormat: "video"` ⇒ **toutes** les lignes sont des vidéos. `requestedFormat: "scrolly"`
   sur un canal social ⇒ `refusal` nommé, zéro ligne, **aucun repli silencieux vers l'interactif**.
3. `eligible()` sur `article-web` retourne des candidats `scrolly` pour les **9 fiches amendées**
   (plus `image-scrolly`, déjà déclarée), **tous marqués**, et `produce` refuse l'un d'eux avec la
   phrase de la marque.
4. Un `.mp4` réel a été produit par la boucle depuis une ligne d'offre choisie, et son empreinte est
   consignée.
5. `bun run check` vert. Suite `lib` verte. `skills/splash` tsc propre.
6. Sans `requestedFormat` et sans candidat d'un genre non représenté, l'offre est **byte-identique**
   à celle d'avant la tranche.

---

## 12. Contraintes globales

- Runtime **Bun**, tests `bun:test`, **TDD** (test rouge d'abord).
- Code, commentaires, identifiants, commits, branches en **anglais**.
- Aucune mention de fournisseur de modèle dans les artefacts publiés.
- Aucun `any` introduit. Les gardes échouent **loud**, jamais en silence.
- Boucle feedback → système : tout ce que cette tranche corrige est gravé au niveau du code partagé
  (`lib/core`, `lib/brain`) et de la référence concernée, jamais seulement sur l'exemple.

---

## 13. Risques assumés

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **La ligne réservée coûte une forme distincte** (3 formes dont une en mouvement, au lieu de 3
  embarquables). Assumé : c'est le prix du choix, et P1 tranche.
- **Une vidéo légale mais éditorialement faible** peut occuper la ligne réservée (un scatter animé,
  par exemple). Elle est classée dernière et porte son `why` issu de la fiche ; le journaliste
  décide. Si la classe se répète en QA, le levier est une facette KB (`notFor` en mouvement), pas
  une règle en dur ici.
- **Le scrolly reste invisible dans l'offre** jusqu'au spec 2. Assumé en §4 : mettre en avant
  l'inconstructible serait pire.
- **La modification de `Scrolly.tsx`** touche un moteur. Additive, symétrique d'une garde existante,
  et elle ferme un piège de rendu-faux préexistant — mais elle demande une vérification au rendu
  d'un scrolly carte connu (pas seulement un test unitaire) avant merge.
