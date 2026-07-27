# Spec — Les beats d'un article visuel : dérivés en brouillon, écrits par le journaliste

> **Statut :** en cours.
> **Branche :** `feat/article-beats`, off `ffd2d8e`.
> **Langue :** prose FR, identifiants/code/commits en anglais (standard non-négociable).
> **Lire d'abord :** `lib/loop/phrase.ts`, `lib/brain/verify-offer.ts`,
> `2026-07-27-host-journey-design.md` (§4, §5), et le socle
> `2026-07-24-shell-and-desk-journey-design.md` (§2, beat 2 — la bifurcation).

---

## 0. La contradiction

Les moteurs scrolly existent et rendent. `ScrollyChart`, `ScrollyHexMap`, `ScrollyCartogramMap`,
`ScrollyLocatorMap`, `ScrollyDotDensityMap`, `ScrollyImage` — plus `image-native` pour les
narrations photo. **Le rendu n'est pas le trou.**

Le trou est une phrase :

```
skills/scrolly/src/Scrolly.tsx:139   const beats = deriveChartStory(config, config.insight);
```

Les beats narratifs sont **dérivés de la donnée**, pas écrits. Le sample
`assets/sample-data/line-scrolly.json` ne porte aucun `beats`. `chart-story.ts` fabrique alors les
légendes lui-même (`"2007 — 4.3"`, `"Genève en tête — 583 CHF"`) et le scrolly les affiche sous la
signature du journaliste. La machine écrit la prose.

Le socle dit l'inverse (§2, beat 2, bifurcation ⑃) : sur la branche article,
**« l'outil compose le texte apporté, sans écrire le journalisme »**.

Le moteur le SAIT déjà et le dit — `narrativeFallbackWarning`
(`skills/chart-native/src/chart-story.ts:256`) émet, au gate de rendu :

> « narrative auto-picked by data salience (no confirmed claim-arc `beats`) — the scrolly walks the
> most salient points, not a confirmed argument. »

Un avertissement, non bloquant. Le mécanisme de l'override existe aussi
(`NativeSpec.beats`, `narrativeBeatErrors`, `arcErrors`) — et **rien sur le chemin de la boucle ne
l'écrit jamais.** C'est la maladie que le parcours hôte a nommée un cran plus bas : *le mécanisme
existe, et rien ne l'invoque.*

**La décision, prise par le porteur du produit : hybride.** Splash **dérive un premier jet** des
beats ; le journaliste **valide ou réécrit chacun** avant production. Honnête sur qui écrit, et la
dérivation qui marche reste un point de départ.

---

## 1. La couture — c'est celle de `phrase`, pas une nouvelle

La forme est déjà dans le codebase, et elle est reprise telle quelle plutôt qu'inventée :

| `phrase` (l'offre) | `beats` (le plan narratif) |
|---|---|
| `lib/brain/offer.ts` → `Offer` : ids, ordre, `whySource` (fragments + facts), `why` **vide** | `lib/brain/beats.ts` → `suggestBeats` : ids, ordre, ancres, `beatSource` (facts), `text` **vide** |
| `lib/brain/verify-offer.ts` → `verifyOffer` : jette | `lib/brain/verify-beats.ts` → `verifyBeats` : jette |
| `lib/loop/phrase.ts` → `applyPhrasing` : **le seul appelant du garde**, écrit au manifeste | `lib/loop/beats.ts` → `applyBeats` : idem |
| `propose()` persiste l'offre non rédigée | `draftBeats()` persiste le plan non écrit |
| invariant : une option **choisie** au `why` vide ne s'écrit pas | invariant : un **artefact** sur un plan au `text` vide ne s'écrit pas |

Trois unités, exactement comme pour l'offre :

### 1.1 `lib/brain/beats.ts` — le brouillon

```ts
export type BeatAnchor =
  | { kind: "x"; value: string }          // line : une valeur de la colonne x
  | { kind: "category"; value: string };  // bar  : une catégorie

export type BeatSource = {
  /** Les nombres que la revendication de CE beat peut citer. */
  facts: Record<string, string>;
  /** Les nombres que N'IMPORTE QUEL beat du plan peut citer (la forme de la série). */
  shared: Record<string, string>;
};

export type SuggestedBeat = {
  id: string;         // "beat-1"… positionnel : l'id encode l'ordre
  anchor: BeatAnchor;
  role: ArcRole;      // establish | build… | payoff
  draftText: string;  // ce qu'une dérivation AURAIT dit. Montré, jamais livré.
  beatSource: BeatSource;
};

export function suggestBeats(input: {
  nativeType: string;
  dataCsv: string;
  sort?: "asc" | "desc";
  valueUnit?: string;
  unit?: string;
  lang?: string;
}): { beats: SuggestedBeat[]; refusal?: string };
```

**Le nom.** Le codebase vient d'appliquer cette discipline à `intentsFromAngle` → `suggestIntents`
(« un nom qui se lit comme un fait, c'est ainsi qu'une supposition finit par être crue »).
`deriveChartStory` se lit comme un fait — *l'histoire du chart* — alors que c'est un pari sur la
saillance des données. Elle est donc **rétrogradée** : ce qu'elle produit s'appelle ici une
`SuggestedBeat` dont le texte est un `draftText`, et la fonction qui le produit `suggestBeats`.

> **Ce que ce slice N'A PAS pu faire, et pourquoi.** `deriveChartStory` vit dans
> `skills/chart-native/src/chart-story.ts`, hors de la frontière de fichiers de ce slice
> (`skills/` autre que `skills/scrolly/` est interdit). Le nom trompeur reste donc en place chez
> le moteur ; la rétrogradation est appliquée **à la couture**, qui est le seul endroit que ce
> slice possède. Renommer `deriveChartStory` → `suggestChartStory` chez chart-native est un
> follow-up d'une ligne (plus ses 6 appelants), noté §7.

**Le refus.** `suggestBeats` refuse plutôt que d'inventer, dans deux cas :

- **un type sans plan de beats** — l'override `spec.beats` du moteur ne supporte que `line` et
  `bar` (`narrativeBeatErrors` : *« explicit `beats` override supports line and bar chart
  scrollies only »*). Le scatter est refusé **avec la phrase du moteur**, jamais avec une
  seconde formulation ;
- **moins de trois ancres** — `arcErrors` exige `establish` … ≥1 `build` … `payoff`. Une série de
  deux points ne porte pas d'argument. Le refuser fort est correct pour une **page narrative** :
  un scrolly à deux points n'est pas une démonstration.

**Les rôles que le brouillon attribue** : premier = `establish`, dernier = `payoff`, tout ce qui
est entre = `build`. **Jamais `turn`.** Le `turn` est le pivot de l'argument (le Peak de Cohn) —
c'est un jugement éditorial, pas une propriété de la donnée. Le brouillon décline explicitement de
le deviner ; le journaliste peut le poser (§1.2).

Attribuer des rôles a un effet mécanique voulu : dès qu'un beat porte un rôle, `arcErrors` exige
que **tous** en portent un et que **chacun affirme un `text` non vide**. Le brouillon vide est
donc refusé par le validateur du moteur lui-même, en plus des refus de la boucle (§3).

### 1.2 `lib/brain/verify-beats.ts` — le garde

```ts
export type AuthoredBeat = { id: string; role: ArcRole; text: string };
export function verifyBeats(authored: AuthoredBeat[], suggested: SuggestedBeat[]): void; // jette
```

Il **jette**, pour la raison que `verifyOffer` et `assertFormatAllowed` jettent : un appelant qui
veut être indulgent doit le dire à voix haute.

**Ce qu'il vérifie, et pourquoi chaque contrôle :**

1. **Ids, compte, ordre — exacts, position par position.** Même raisonnement que `verifyOffer`
   (« une rédaction qui laisse tomber une option est une suppression silencieuse »), et il pèse
   plus lourd ici : **un plan de beats EST un ordre** — c'est la marche narrative. Un plan dont
   les beats ont bougé n'est plus le plan qu'on a montré au journaliste.
   *L'échappatoire qui rend cette rigidité légitime :* changer le plan est un **re-brouillon**
   (`draftBeats` accepte une liste d'ancres explicite), pas une réécriture. Le journaliste garde
   la main ; il la prend par une porte nommée.

2. **L'ancre ne peut pas changer — et c'est structurel, pas vérifié.** `AuthoredBeat` **n'a pas de
   champ d'ancre**. Le tour d'écriture ne peut donc pas déplacer le point de donnée dont on parle ;
   l'ancre est reprise de la suggestion par id. C'est exactement le procédé de `confirm-angle`
   (§2.2 du parcours hôte) : *l'hôte ne choisit pas OÙ la prose atterrit, seulement à quelle
   question il répond.* Une ancre déplacée qui existe quand même dans la donnée passerait
   n'importe quel contrôle de validité tout en expédiant une légende sur la mauvaise année —
   c'est la faute que ce choix rend **impossible à commettre** plutôt que détectable.

3. **L'arc doit rester bien formé** — `arcErrors` (`lib/core/claim-arc.ts`) est ré-appliqué sur ce
   qui revient. Le **rôle**, lui, est réécrivable : nommer le `turn` est un acte éditorial que le
   brouillon a refusé de faire à la place du journaliste. Ce que `arcErrors` interdit (deux
   `establish`, deux `payoff`, deux `turn`, un demi-arc, un beat à rôle sans revendication) reste
   interdit. On réutilise la règle du codebase, on n'en écrit pas une seconde.

4. **Claim-grounding : tout nombre du texte doit venir de la donnée.** Miroir exact de
   `verifyOffer` — « chaque nombre de la prose doit venir du `whySource` de cette option-là ». Ici
   l'ensemble autorisé pour un beat est :
   - les `facts` **de ce beat** (son ancre et sa valeur) ;
   - les `shared` **du plan** (premier, dernier, min, max, écart, écart en %, nombre de points) ;
   - les **libellés d'ancre de tous les beats du plan** — la matière connective d'un récit
     (« depuis 1979 » dans le beat de 2025).

   **Ce qui n'est PAS dans l'ensemble : toutes les valeurs de la série.** Les y admettre rendrait
   le garde quasi inopérant sur une donnée large (presque n'importe quel nombre à deux chiffres
   trouverait un jumeau), et le garde ne vaut que ce qu'il refuse.

   Comparaison faite **après** repli des séparateurs de milliers (`collapseDigitGroups`, repris
   verbatim de `verify-offer.ts` : « 8 000 » est un nombre, pas deux), et en acceptant la valeur
   **arrondie à 0, 1 ou 2 décimales** — un arrondi décimal est une présentation de la même mesure.
   Pas d'élargissement aux chiffres significatifs : 583 → 600 change la magnitude de
   l'affirmation, et un lecteur lit 600 comme un fait.

**Ce que le garde ne vérifie PAS, sciemment** (§7 le juge) : le style, la langue, le fait qu'un
texte écrit pour le beat 2 ait été collé sur le beat 3 (aucune amarre textuelle ne permet de le
dire — même limitation que la « cross-attribution » de `verifyOffer`), et les nombres écrits en
toutes lettres.

> **Un beat réécrit, ce sont les mots du journaliste. Le garde protège les faits, pas le style.**

### 1.3 `lib/loop/beats.ts` — les deux appelants

- **`draftBeats(run, el, runDir): VerbResult<RunElement>`** — un **verbe** de la boucle : il ne
  jette jamais (I1), il lit l'entrée gelée, appelle `suggestBeats`, et pose le plan sur l'élément
  avec **tous les `text` vides**, exactement comme `propose()` pose une offre avec tous les `why`
  vides. Il accepte une liste d'ancres explicite (`{ anchors }`) — c'est le re-brouillon du §1.2.1.
- **`applyBeats(run, elementId, authored): RunManifest`** — **jette**, comme `applyPhrasing` et
  pour la même raison : ce n'est pas un verbe, c'est un tour humain que la skill pilote. Il appelle
  `verifyBeats` puis réécrit les textes sur le manifeste. Il rend un manifeste NEUF ; l'appelant
  décide quand persister.

---

## 2. L'état — le créneau `narrative`

`RunElementSchema` gagne :

```ts
narrative: z.object({
  beats: z.array(z.object({
    id: z.string(),
    anchor: z.object({ kind: z.enum(["x", "category"]), value: z.string() }),
    role: z.enum(ARC_ROLES),
    text: z.string(),        // "" ⇒ brouillonné, pas écrit
    draftText: z.string(),   // ce que la dérivation proposait — gardé pour pouvoir le re-montrer
    beatSource: BeatSourceSchema,
  })),
}).optional()
```

`draftText` est **gardé en état** et pas jeté après affichage, pour la raison qui a fait garder
`excluded` sur l'offre : il survit à un `resume`, et un journaliste qui revient sur son run doit
pouvoir revoir ce qu'on lui avait proposé sans le re-dériver.

**`provenanceHash` intègre `narrative`.** Même raisonnement que pour `sources` : depuis que le
plan est rendu **DANS** l'artefact, corriger une phrase de beat sans périmer la page laisserait
`nextActions` répondre « show » sur une page qui ne dit plus ce que le manifeste dit. Élargir le
hash re-value tous les hashs — c'est la direction sûre (jamais « frais » pour un artefact bâti sur
un autre plan) et aucun test ni aucune fixture sur disque ne fige une valeur littérale.

**Deux `NextAction` neuves**, et leurs noms disent qui agit :

- **`draft-beats`** — déterministe, du même type que `propose` : une dérivation pure de la donnée ;
- **`author-beats`** — tour humain, il tombe dans le `default:` d'`advanceStep` (comme `phrase`).

> **Et `advanceStep` n'a délibérément PAS de `case "draft-beats"`.** L'action n'est pas
> atteignable tant que `scrolly` n'est pas constructible (voir juste en dessous), et un bras de
> `switch` inatteignable est du code mort — exactement la maladie que le slice précédent vient de
> soigner (« le mécanisme existe et rien ne l'invoque »). Le câblage est **nommé** : trois lignes
> dans la forme de `case "propose"`, appelant `draftBeats`, le jour où la branche article atterrit.
> `author-beats`, lui, **est** atteignable (n'importe quel élément portant un plan non écrit y
> route) et son comportement de tour humain est testé pour de vrai.

**Leur position dans `nextActionsForElement`, et pourquoi elle est là :** *sous* le contrôle de
constructibilité et *sous* `confirm-aspect`, *au-dessus* de `produce`.

```
if (!chosenId)                    → phrase | choose-form
if (!isLoopBuildable(builder))    → choose-form
if (!resolvedChannel)             → confirm-aspect
if (format === "scrolly") {                          ← NEUF
  if (!el.narrative)              → draft-beats
  if (un text vide)               → author-beats
}
if (!artifact || stale)           → produce
```

C'est la règle que le parcours hôte a posée (§4.3) : *n'ajouter du routage que là où l'état est
atteignable*. Brouillonner les beats d'une forme que rien ne peut construire serait du travail
pour rien, et contredirait la sortie de secours de la course échouée (`choose-form`).

**Conséquence assumée, et c'est le point le plus honnête de ce spec :** `scrolly` n'est **pas** dans
`LOOP_BUILDABLE_ENGINES`, donc *ce routage n'est pas atteignable par `advance()` aujourd'hui*.
Voir §5 — la décision de ne pas l'y mettre, et ce qui est prouvé à la place.

---

## 3. « Un beat que personne n'a écrit ne doit pas être livré »

`phrase` refuse un `why` blanc parce qu'une option enregistrée comme choisie sur une phrase vide
dit qu'un journaliste a choisi ce que personne ne lui a montré. L'équivalent ici est **le refus de
produire**, et il est posé à trois niveaux indépendants :

1. **`applyBeats`** ne peut pas écrire un blanc : `arcErrors`, appelé par `verifyBeats`, refuse un
   beat à rôle dont le `text` est vide. Le seul producteur d'un `text` vide est donc `draftBeats`,
   délibérément (le cerveau livre l'ancrage, le desk écrit la langue).
2. **`produce()`** refuse un `scrolly` dont le plan porte un `text` vide, en nommant les beats
   concernés. C'est **le garde de livraison proprement dit** : le format `scrolly` est une page
   narrative, et une page narrative dont la prose n'est pas écrite n'est pas produite.
3. **`assertInvariants`** refuse d'écrire sur disque un élément qui porte **un artefact** et un
   plan à `text` vide — l'état « une page produite dont personne n'a écrit la prose » n'est pas
   représentable. Symétrique exact de l'invariant `chosenId ⇒ why non vide`.

Et, en défense en profondeur venue du moteur : le `validate` du producteur scrolly
(`skills/scrolly/src/manifest.ts`) fait déjà tourner `narrativeBeatErrors` → `arcErrors` sur le
spec entrant, donc un plan à texte vide est refusé **avant tout octet rendu**, même par un hôte qui
appellerait `render` directement.

**Pourquoi le refus n'est PAS mis dans le moteur** (c.-à-d. pourquoi `skills/scrolly` ne refuse pas
un chart-track sans `beats` du tout) : c'est le raisonnement que `lib/core/verbs/render.ts` tient
déjà pour `spec.source`. Le moteur est un renderer appelable directement avec ce qu'un hôte lui
tend ; « les beats sont écrits par le journaliste » est un fait sur un **run**, que la charge utile
d'un verbe ne peut pas nommer. Le moteur **avertit** (`narrativeFallbackWarning`), la boucle
**refuse**. Fermer côté moteur casserait par ailleurs ses propres smoke-tests et ses samples, qui
sont des rendus légitimes hors-run.

---

## 4. La question qu'il fallait répondre : une page narrative est-elle un troisième genre ?

`lib/delivery/routing.ts` route sur `deliveryGenreFor(format)` : `embed` (interactive, scrolly →
URL hébergée) ou `file` (static, video → paquet). Une **page narrative entière n'est pas un élément
encastrable**. Faut-il un troisième genre ?

**Réponse : non — et le codebase porte déjà la distinction manquante, ailleurs.**

Le genre répond à **une** question : *l'artefact part-il en octets ou en URL ?* Pour une page, la
réponse honnête est « en URL » — elle a besoin d'être hébergée. Ce n'est pas la mauvaise réponse ;
c'est la bonne réponse à une question qui n'est pas celle qu'on pose. La question qu'on pose est :
**ce que l'URL EST par rapport à l'article.** Et cette distinction a déjà un nom dans
`lib/core/vocabulary.ts` :

```ts
export const DELIVERABLE_KIND: Record<VisualFormat, DeliverableKind> = {
  static: "element", interactive: "element", video: "motion", scrolly: "page",
};
```

Le commentaire de `lib/core/publishers.ts` interdit d'ailleurs explicitement de fusionner les deux
tables : *« they answer different questions and must not be merged »*. C'est exactement ça : `embed`
confond aujourd'hui **« une URL que tu encastres dans ton article »** et **« une URL qui EST ton
article »**.

**Ce qui casse concrètement**, si une page passait par le routage tel quel :

- `defaultDestinationsFor` prend le premier de `HOSTED_PREFERENCE`, en tête `embed-cms` : publier
  une page narrative entière dans un **créneau d'embed** du CMS. La relation est inversée — la page
  ne va pas *dans* l'article, elle *est* l'article (ou l'article pointe vers elle) ;
- la remise porte un `snippet` d'iframe. Pour une page, ce qu'on remet est une **URL canonique**,
  pas un bout de HTML à coller dans un corps d'article.

**La fermeture, et ce qu'elle coûte :** faire lire `DELIVERABLE_KIND` à
`defaultDestinationsFor` à côté du genre, pour qu'un `page` ne tombe jamais par défaut dans un
publisher à créneau d'embed, et que sa remise soit une URL canonique plutôt qu'un `snippet`. C'est
`lib/delivery/**` et `lib/core/publishers.ts` — **hors de la frontière de ce slice**. Le
raisonnement est donc écrit et l'implémentation **déférée**, avec sa forme exacte.

*Corollaire éditorial, non implémenté et signalé comme tel :* si Splash produit la page, l'article
Heidi.news devient un lien sortant plutôt qu'un corps d'article — c'est une décision de rédaction
(Yvan/Rinny), pas une décision de code, et elle appartient au sous-projet « Bifurcation article ».

---

## 5. La preuve — ce qui est prouvé et ce qui ne peut pas l'être ici

**`scrolly` n'entre PAS dans `LOOP_BUILDABLE_ENGINES` dans ce slice**, et la raison est mesurée,
pas estimée. Le flip a été instruit avant d'être écarté :

- `lib/brain/eligibility.test.ts:401` — *« un format demandé légal-pour-le-canal mais sans aucun
  candidat constructible est refusé nommément »* : sa fixture EST `requestedFormat: "scrolly"` sur
  `article-web`. Scrolly constructible ⇒ plus de refus ⇒ le test perd son sujet ;
- `lib/loop/driver.test.ts:577` — la course échouée de bout en bout : elle prouve **deux fixes
  d'un autre slice à la fois** (le refus nommé d'`eligibility.ts` et la sortie
  `clear-requested-format` de `revise.ts`). Elle roule `advance()` sur le VRAI KB, sans injection
  de fixtures. Après le flip, **aucun format ne laisse zéro candidat constructible** (chart-native
  couvre static/interactive/video, et scrolly deviendrait constructible) : la fixture n'est pas
  réparable, elle est dissoute.

Réécrire la preuve porteuse du fix d'un autre slice pour faire de la place au mien serait
exactement la chose à refuser plutôt qu'à forcer. **Câbler `scrolly` dans la boucle est le
sous-projet « Bifurcation article » du spec-parapluie (§4), pas celui-ci.**

**Ce qui est prouvé, alors :** la couture entière sur du réel, sans mock.

L'assemblage du `NativeSpec` est **extrait** de `produce.ts` dans une fonction exportée
(`assembleNativeSpec`) que `produce()` appelle. La preuve appelle **la même fonction** puis **le
même verbe `render`** avec les mêmes arguments que `produce()` — donc ce qui est rendu est
littéralement ce que la production rendrait, pas un chemin parallèle. Le test :

1. monte un run réel (entrée gelée, ledger de sources déclaré, angle, offre du cerveau, forme
   choisie en `scrolly`) ;
2. `draftBeats` → un plan brouillonné, `text` vides, `draftText` remplis ;
3. `applyBeats` avec les **phrases du journaliste** → manifeste ;
4. `assembleNativeSpec` → `render({ engine: "scrolly", format: "scrolly", … })` → un vrai
   `scrolly.html` (build Vite réel + le snap `prefers-reduced-motion` du producteur) ;
5. **mesure** : les phrases écrites sont dans le HTML livré ; les `draftText` auto-générés n'y
   sont pas ;
6. **le refus du garde** : un beat qui affirme un nombre absent de la donnée est refusé, nommément.

Ce test est **opt-in** (`SPLASH_PROVE_BEATS=1`), pas dans `bun run check` : il fait un build Vite
réel et un Playwright réel, et le gate n'a pas à porter ça à chaque run. Même discipline que
`skills/splash/scripts/verify-source-bundle.mjs`, délibérément hors gate pour la même raison.

### Le résultat mesuré (2026-07-27)

Les deux pages construites pour de vrai, leurs **steps lus dans un navigateur** (nœuds
`[data-step-index]`) — pas dans la config, pas dans le rapport du producteur. Même série, mêmes
ancres, même structure à six cartes ; seuls les quatre steps narratifs diffèrent :

| | steps 1 → 4 |
|---|---|
| **DÉRIVÉ** (`line-scrolly.json`, sans `beats`) | `1979 — 7` · `1995 — 6.1` · `2007 — 4.3` · `2025 — 4.3` |
| **ÉCRIT** (cette couture) | « En 1979, la banquise d'été tenait encore sur 7 millions de kilomètres carrés. » · « Seize ans plus tard, le recul est engagé… » · « 2007 est l'année où le doute cesse… » · « Un demi-siècle après, rien n'est revenu — et c'est cela, l'histoire. » |

`scrolly.html` réel, 5 726 513 octets, `render` OK, les quatre légendes dérivées **absentes** du
livrable. Et le garde refuse `« La surface est tombée à 1,8. »` en nommant `1.8` — la série ne
descend jamais sous 3,6 — **sans rien écrire** : le manifeste reste identique, donc un refus se
retente sans risque.

---

## 6. Ce qui est déféré, et pourquoi

- **map-scrolly.** Les six pistes carte dérivent leur histoire par `deriveMapStory` /
  `deriveHexGridStory` / `deriveSymbolStory` / `deriveDotDensityStory` / `deriveLocatorStory` /
  `deriveCartogramStory` — six dérivations, pas une. Et le producteur scrolly **refuse déjà**
  explicitement un `beats` sur la piste carte (`skills/scrolly/src/manifest.ts` : *« explicit
  `beats` override is not supported on the map scrolly track »*), parce qu'il serait ignoré en
  silence. Ouvrir la piste carte, c'est six ancres à définir (une région ? une caméra ? une bin ?)
  — **une conception, pas une généralisation.** `lib/core/claim-arc.ts` est déjà partagé et
  `skills/map-native/src/map-arc.ts` porte déjà le miroir du flagged-fallback : la matière est là,
  la décision d'ancrage ne l'est pas.
- **`image-native`.** Son cas est **différent, pas plus petit**, et c'est ce qui vaut d'être dit :
  `Scrolly.tsx:120` le documente — *« captions pass through AS-IS; the journalist gate upstream
  owns them »*. Les légendes d'une narration photo sont **déjà** les mots du journaliste. Il n'y a
  pas de dérivation à rétrograder ; il y a une question toute autre — *où* est ce gate amont, et
  est-il mécanique ou documentaire ? Y plaquer le brouillon/garde de ce slice **ajouterait** une
  dérivation là où il n'y en a pas. Une réponse bâclée serait pire que l'absence de réponse.
- **`scatter`.** L'override `spec.beats` du moteur ne le supporte pas (line et bar seulement).
  Refusé avec la phrase du moteur, pas avec une seconde formulation.
- **Le genre de livraison d'une page** (§4) : raisonné, forme de fermeture écrite,
  implémentation hors frontière.
- **`LOOP_BUILDABLE_ENGINES` + scrolly** (§5) : sous-projet « Bifurcation article ».

---

## 7. À documenter ailleurs (fichiers hors frontière de ce slice)

Deux fichiers sont édités par un autre agent en ce moment et n'ont pas été touchés. Ce qui doit y
être écrit, et pourquoi :

- **`lib/host/README.md`** — les deux `NextAction` neuves et la commande hôte qui manque :
  `author-beats --run <dir> [--element <id>]`, lisant sur **stdin** la liste des beats écrits
  (`[{ "id": "beat-1", "role": "establish", "text": "…" }]`). Le JSON, pas des drapeaux, pour la
  raison exacte du §4.2 du parcours hôte : c'est *une liste dont la longueur et l'ordre sont fixés
  par le brouillon*, une phrase par beat — et c'est précisément cet ordre que le garde vérifie.
  `applyBeats` jette ; la façade convertit en `invalid-request` portant le message du garde, comme
  elle le fait déjà pour `phrase`. Il faut aussi que `state` **projette `el.narrative`** (avec
  `draftText` et `beatSource` intacts) : sans le `beatSource`, un hôte ne peut pas écrire un beat
  groundé — c'est le trou 3 du parcours hôte, re-créé un cran plus bas.
- **`skills/splash/SKILL.md`** — le beat CADRAGE : sur la branche article, après le choix de forme,
  Splash **montre le brouillon** et demande au journaliste de valider ou réécrire chaque beat. Et
  la règle qui va avec, dans les mots du socle : *Splash compose le texte apporté, il n'écrit pas
  le journalisme.* La section PROPOSITION doit dire que le `draftText` est un point de départ
  affiché, jamais un livrable.

---

## 8. Risques assumés

- **Le routage `draft-beats`/`author-beats` n'est pas atteignable par `advance()` aujourd'hui**,
  parce que `scrolly` reste hors de `LOOP_BUILDABLE_ENGINES` (§5). C'est la maladie « le mécanisme
  existe et rien ne l'invoque » — assumée les yeux ouverts, avec deux atténuations : chaque pièce
  est *exercée pour de vrai* par la preuve (§5), et `produce()` **refuse en nommant** le plan non
  écrit, donc le jour du câblage rien n'est à découvrir. **Jugement : assumé, et c'est le prix de
  ne pas dissoudre la preuve d'un autre slice.**
- **Le garde refuse « près de 40 % » quand la donnée dit 38,6 %.** L'arrondi décimal passe (39),
  l'arrondi à un chiffre significatif non. Un journaliste rencontrera ce refus. **Jugement :
  ouvert — et la fermeture, si un parcours réel le rencontre, est d'ÉMETTRE le fait arrondi dans le
  brouillon, jamais d'assouplir le garde.**
- **`suggestBeats` réimplémente le choix d'ancres** (`lineNotableIndices`, `barRankedReveals`, le
  choix des colonnes de `MAPPERS`) au lieu de l'importer : `lib/brain` ne peut pas importer
  `skills/chart-native/src/` (spec-parapluie §6, « pas d'import cross-moteur de `src/` »), et le
  bon domicile (`lib/core`, comme `claim-arc.ts` y a été déplacé) demande d'éditer chart-native,
  hors frontière. Un **test de dérive** (`lib/brain/beats-drift.test.ts`) importe les sélecteurs du
  moteur et les compare aux miens sur des fixtures réelles — c'est un test, et les tests de `lib/`
  importent déjà `skills/` (`lib/core/conformance-l0.test.ts`). **Jugement : intérim mesuré ; la
  fermeture est le déplacement vers `lib/core`, une fois la frontière levée.**
- **Le garde ne vérifie ni la langue ni la cross-attribution** (un texte écrit pour le beat 2 collé
  sur le beat 3 passe). Hérité de `verifyOffer`, qui documente longuement pourquoi il ne peut pas
  vérifier le sens à travers les langues. **Jugement : ouvert, hérité.**
- **Un `text` réécrit peut contredire l'ancre sans qu'aucun contrôle ne le dise** — écrire « la
  chute de 2012 » sur un beat ancré en 2007 est du ressort du sens, pas de la structure. Le garde
  refuserait le nombre `2012` s'il n'est pas dans le plan ; il ne refusera pas « la chute
  d'il y a treize ans ». **Jugement : voulu — le garde protège les faits, pas le style.**
- **`draftBeats` ne re-vérifie pas ses ancres contre une donnée qui a bougé.** Une entrée regelée
  périme l'artefact (provenance) mais laisse le plan en place ; une ancre disparue échoue alors
  **fort** au produce (`narrativeBeatErrors`), pas en silence. **Jugement : acceptable — fail-loud,
  pas fail-silent.**
