# Spec — Le détecteur le plus important de la voie humaine se déclenche enfin

> **Statut :** design validé, prêt pour → writing-plans.
> **Branche :** `feat/taste-fires` (worktree `splash-taste`), off `4b07c1d`.
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).
> **Lire d'abord :** `2026-07-27-verify-in-journey-design.md` (la tranche qui a mis la couche
> Verify dans le parcours ; ses résidus **R6**, **R5** et **R2** sont le sujet exact d'ici) et
> `2026-07-26-verify-layer-design.md` (la couche elle-même).
> **Frontière de fichiers :** `lib/verify/**`, `lib/newsroom/**`, et `lib/loop/manifest.ts`
> (ADD-only). Tout le reste de `lib/loop/**`, `lib/brain`, `lib/source`, `lib/delivery`,
> `lib/host`, `lib/core`, `install/`, `skills/` est **interdit**.

---

## 0. Le thème, et la mesure

La voie **needs-human-eye** (`lib/verify/taste.ts`) est délibérément sans verdict : le type
`TasteRiskSignal` n'a ni `outcome`, ni `severity`, ni `pass`. Elle porte quatre détecteurs. Trois
se déclenchent. Le quatrième — `title-takeaway-divergence` — **ne s'est jamais déclenché dans la
boucle**, et c'est celui qui porte la doléance la plus ancienne du projet : *« titre qui diverge
du takeaway confirmé — récurrent, règle non obéie, pas de levier mécanique propre car la
divergence est sémantique »* (CLAUDE.md, backlog).

Re-mesuré sur l'arbre courant (`4b07c1d`) avant d'être conçu :

| # | Trou | Mesure refaite le 2026-07-27 |
|---|---|---|
| 1 | La capture ne lit aucun texte | `measureInPage` (`lib/verify/capture.ts:186-308`) mesure des **boîtes** et des **couleurs**. `CaptureRecord` n'a aucun champ de texte. |
| 2 | Le champ existe et n'est rempli par personne | `grep renderedTitle lib` → le champ est **déclaré** dans `ReviewerSource` (`redact.ts:40`), `ReviewerInput` (`types.ts:275`) et `TasteInput` (`taste.ts:100`), et le **seul** endroit qui l'assigne est un test (`real-artifact-proof.test.ts:221,252`), à la main, avec la constante `TAKEAWAY` — c'est-à-dire en se comparant à lui-même. Aucun appelant de production ne le passe. |
| 3 | Donc le détecteur est structurellement mort | `taste.ts:165` — `if (input.renderedTitle?.trim())`. Sans valeur, la branche entière est morte dans la boucle. |

Et le fait qui décide de tout le reste, mesuré lui aussi :

> **`lib/loop/produce.ts:168` écrit `title: el.angle.confirmedTakeaway`.** Dans la boucle telle
> qu'elle est câblée aujourd'hui, le titre rendu **est** le takeaway confirmé, par construction —
> `inheritAngle` (commit `4b07c1d`) vient d'ailleurs de renforcer cette discipline pour les
> livrables frères, en toutes lettres : *« la discipline "le titre EST le takeaway confirmé" ne
> peut pas tenir si un run en porte deux »*.

Il faut donc dire précisément ce que cette tranche construit, sans le survendre : **elle ne
détecte pas une divergence que la boucle produirait aujourd'hui — elle ferme la boucle de
vérification entre ce que le manifeste a confirmé et ce que le navigateur a réellement peint.**
Tant que rien ne lit le rendu, « le titre est le takeaway » est une promesse du code de production
qui se croit sur parole. À partir d'ici, c'est une **mesure prise sur l'artefact**, présentée à
l'humain qui approuve.

---

## 1. Le principe qui gouverne cette tranche

> **Le titre rendu est une PREUVE, pas une affirmation d'appelant. Il vient de l'artefact ou il
> n'existe pas.**

Ce projet a déjà payé le prix de l'inverse : un `grep` de hex dans un bundle single-file a une
fois « prouvé » une palette qui n'était pas celle à l'écran (CLAUDE.md, 2026-07-14 — leçon gravée).
`taste.ts:141-143` porte la même leçon pour les couleurs : *« récoltées depuis le rendu vivant
plutôt que lues dans une config »*. Le titre suit la même règle, et cela décide deux choses :

1. `renderedTitle` devient un champ du **`CaptureRecord`** — la ligne de preuve, celle qui porte
   déjà `marks` et `markColours` — et non un argument que `runReview` reçoit.
2. `ReviewerSource.renderedTitle` **disparaît**. Un appelant ne peut plus déclarer quel titre a
   été rendu : `runReview` le **dérive** des captures qu'on lui donne. Le seul endroit où l'on
   pouvait mentir est retiré, et le mensonge qui existait déjà (le test de preuve qui se passait
   `TAKEAWAY` à lui-même) meurt avec.

Corollaire, et c'est la contrainte de frontière transformée en meilleur design : **rien dans
`lib/loop/**` ne change.** `captureStep` passe déjà l'artefact, `reviewStep` passe déjà
`captures: el.capture.images`. En posant le titre sur le record et en le dérivant dans
`runReview`, le câblage traverse la boucle sans qu'une ligne de la boucle bouge.

---

## 2. L'extraction — étendre la mesure, pas en inventer une seconde

### 2.1 Où

Dans `measureInPage`, la fonction **déjà** sérialisée dans la page et qui résout la racine et la
furniture en une seule visite. Pas de second parcours, pas de seconde page, pas de second
screenshot.

### 2.2 Comment la furniture est identifiée aujourd'hui — et pourquoi le titre ne peut pas
l'être de la même façon

`FurnitureExpectation` est **du texte attendu**, jamais un sélecteur (`types.ts:112-116`) : le
seul descriptif vrai des six moteurs à la fois. `measureInPage` cherche donc l'élément le plus
profond **contenant** ce texte.

C'est exactement pourquoi cette voie ne peut pas servir ici : le texte attendu du rôle `title`
est `angle.confirmedTakeaway` (`lib/loop/verify.ts:60`). Chercher le titre par son texte attendu
répondrait toujours « oui, il est là » ou « non, il n'y est pas » — jamais « voici ce qui y est à
la place ». Un détecteur de divergence a besoin du **texte réellement peint**, indépendamment de
celui qu'on espérait.

### 2.3 L'échelle de candidats

Le même dispositif que `ROOT_SELECTORS` (`capture.ts:52-57`), pour la même raison écrite dans son
en-tête : *« Quel candidat a répondu est ENREGISTRÉ, de sorte qu'une mauvaise racine soit lisible
dans la preuve plutôt que de recadrer silencieusement. »*

```ts
export const TITLE_SOURCES = [
  { selector: "[data-splash-title]",       read: "text"       },
  { selector: "svg[role='img'][aria-label]", read: "aria-label" },
  { selector: "h1",                        read: "text"       },
  { selector: "h2",                        read: "text"       },
] as const;
```

Mesuré sur les moteurs, pas supposé :

- **chart-native** — les **42** composants terminent sur `<svg role="img" aria-label={config.title}>`
  (p. ex. `skills/chart-native/src/BarChart.tsx:289-290`). C'est le **nom accessible que le rendu
  déclare**, verbatim. C'est aussi le SEUL titre nommé dans ce DOM : `ChartFrame` peint le titre
  visible dans un `<div>` sans classe, sans id et sans attribut (`ChartFrame.tsx:167-176` et
  `244-253`) — il n'existe aucun marqueur à viser, et « le plus gros texte en haut » attraperait
  une étiquette de valeur.
- **map-native / scrolly** — même forme, mais **préfixée** (`Interactive map: <title>`,
  `ChoroplethMap.tsx:485` ; `Map: <title>`, `ScrollyMap.tsx:406`). Sans effet sur la métrique,
  qui compte la part des mots du **takeaway** présents dans le titre : des mots en plus côté titre
  ne diluent rien (mesuré §4). Aucun de ces moteurs n'est `LOOP_BUILDABLE` aujourd'hui ; on ne
  normalise donc pas un préfixe qu'aucun run ne produit encore.
- **`[data-splash-title]`** n'existe nulle part — exactement comme `[data-splash-root]`, déjà en
  tête de `ROOT_SELECTORS`. C'est la convention du fichier : si un moteur marque un jour son
  titre, il gagne, sans changer une ligne ici.
- **`h1`/`h2`** : la dégradation, pour un livrable dont l'échafaudage a une vraie tête de chapitre.

`titleSource` (le sélecteur qui a répondu, ou `"none"`) atterrit sur le record, comme
`rootSelector`. Une extraction fausse reste **lisible dans la preuve**.

**La borne.** Un `textContent` de `h2` peut être une page entière. Un candidat dont le texte
normalisé dépasse `MAX_RENDERED_TITLE_CHARS = 300` n'est **pas** un titre : on continue l'échelle,
et si rien ne qualifie, `titleSource: "none"` et pas de `renderedTitle`. 300 parce que les titres
réels de ce projet montent à 110+ caractères (backlog CLAUDE.md, « titre trop long (110+ car.) »)
— la borne écarte un vidage de document, pas un titre bavard.

### 2.4 Un artefact statique : ce qu'on fait, et ce qu'on ne fait pas

Un `static.png` n'a **pas de DOM**. `captureStatic` (`capture.ts:111-163`) ne lance aucun
navigateur — il lit l'IHDR du PNG. Il n'y a donc aucun texte à lire.

Ce qu'on fait : `renderedTitle` reste **absent**, et `titleSource` vaut `"static-image"` — le
record dit *pourquoi* il n'y a pas de titre, au lieu de se taire. Le détecteur reste silencieux
sur une absence (`taste.ts:165` teste déjà `?.trim()`).

Ce qu'on **ne fait pas**, et c'est le point porteur :

- **pas d'OCR.** Extraire du texte de pixels introduirait une couche d'incertitude dont aucune
  ligne du record ne rendrait compte, pour alimenter un détecteur dont toute la valeur est d'être
  une mesure.
- **surtout pas recopier le titre commandé.** Remplir `renderedTitle` avec
  `angle.confirmedTakeaway` faute de mieux ferait comparer une chaîne à elle-même : un détecteur
  garanti silencieux, présenté comme ayant regardé. C'est précisément le mensonge que cette
  tranche retire du test de preuve.

Conséquence assumée, écrite en §8 : **un livrable `static` ne traverse pas ce détecteur.** C'est
cohérent avec ce que `captureStatic` fait déjà — il n'émet aucun check de furniture non plus,
pour la même raison physique.

---

## 3. Le chemin, de la page jusqu'à la porte d'approbation

Aucune ligne de `lib/loop/**` ne bouge. Le titre voyage sur la preuve :

```
measureInPage  →  CaptureRecord.renderedTitle / .titleSource     (lib/verify/capture.ts)
   ↓ runVerb("capture")
captureStep    →  el.capture.images[]                            (lib/loop/verify.ts, INCHANGÉ)
   ↓ reviewStep passe déjà captures: el.capture.images
runReview      →  renderedTitleOf(captures)                      (lib/verify/review.ts)
   ├→ detectTasteRisks({ … renderedTitle })                      (lib/verify/taste.ts)
   └→ buildReviewerInput  →  ReviewerInput.renderedTitle         (lib/verify/redact.ts)
   ↓ el.review.tasteRisk
approvalDecision  →  needsHumanEye                               (lib/verify/approval.ts:158)
   ├→ state.elements[].verification.tasteRisk                    (lib/loop/resume.ts:139)
   └→ le document de sign-off que l'humain signe                 (lib/loop/approve.ts:213)
```

**`renderedTitleOf(captures)`** — dans `capture.ts`, à côté du producteur du champ : le
breakpoint **`primary`** d'abord (le conteneur où le livrable est réellement publié), sinon la
première capture qui en porte un. Un seul endroit, pour que personne ne construise une seconde
résolution subtilement différente — la classe de dérive que ce code a déjà payée
(`manifest.ts:251-254`).

`ReviewerSource.renderedTitle` est **retiré**. `buildReviewerInput` dérive des mêmes captures dont
il dérive déjà `renders` — la whitelist reste une whitelist, et le champ ne peut plus être
affirmé par un appelant.

---

## 4. La calibration — et sur quelles preuves

Le seuil existe déjà : `TAKEAWAY_OVERLAP_FLOOR = 0.3`, part des mots de contenu du takeaway que le
titre reprend. **Il ne bouge pas.** Ce qui bouge, c'est la liste `STOPWORDS`, et la raison est
mesurée.

### 4.1 Le défaut trouvé : `STOPWORDS` est anglais-seul

`taste.ts:37-67` liste 29 mots outils **anglais**. Les rédactions de ce projet publient en
**fr/de/it** (`NEWSROOM-PROFILE.example.md` : *« lang: fr, en, de, it… »* ; `lib/newsroom/language.ts`
résout une langue de CONTENU ; les fixtures du dépôt portent des takeaways dans les quatre). Un
mot outil français de plus de deux lettres (`les`, `des`, `dans`, `plus`, `entre`, `sont`) compte
donc comme un **mot de contenu** et gonfle le recouvrement — c'est-à-dire **fait taire** le
détecteur sur une vraie divergence.

### 4.2 Le banc

14 paires (titre, takeaway) prises dans les **fixtures réelles du dépôt** — dont la paire
contradictoire d'un vrai run, citée dans le message du commit `4b07c1d` : *« Genève paie la prime
la plus lourde »* face à *« Fribourg est le canton romand le moins cher »*, un même sujet, deux
points éditoriaux. Trois familles : le câblage actuel de la boucle (titre verbatim), une
divergence réelle, une reformulation éditoriale légitime du même point.

Recouvrement mesuré, seuil 0.3 :

| Cas | attendu | EN seul | EN+FR+DE+IT |
|---|---|---|---|
| verbatim fr / en / de / it | quiet | 1.00 quiet | 1.00 quiet |
| préfixe moteur (`Interactive map: …`) | quiet | 1.00 quiet | 1.00 quiet |
| **divergence réelle fr (`4b07c1d`)** | fire | 0.00 **FIRE** | 0.00 **FIRE** |
| divergence de | fire | 0.33 quiet ✗ | 0.00 **FIRE** |
| divergence it | fire | 0.00 **FIRE** | 0.00 **FIRE** |
| divergence fr (titre de rubrique générique) | fire | 0.00 **FIRE** | 0.00 **FIRE** |
| divergence en (Malta vs Estonia) | fire | 0.33 quiet ✗ | 0.33 quiet ✗ |
| reformulation fr / fr courte / en | quiet | 0.71 / 0.83 / 1.00 | 0.75 / 0.80 / 1.00 |
| reformulation de | quiet | 0.50 quiet | 0.33 quiet |

**Ce qu'on retient :** ajouter les mots outils fr/de/it fait passer une vraie divergence
allemande de *muette* à *détectée*, et ne fait basculer **aucune** reformulation légitime. Le
seuil reste 0.3.

### 4.3 Ce qu'on refuse de faire, et pourquoi

Le cas `en` (« Malta lags far behind on packaging recycling » titré « Estonia leads packaging
recycling in Europe ») reste **muet à 0.33** : le sujet est partagé (`packaging`, `recycling`),
c'est la **revendication** qui est inversée. Monter le seuil à 0.5 l'attraperait — et ferait
**feu sur la reformulation allemande, à 0.33 elle aussi**. La tranche précédente a déjà appris ce
prix-là : son détecteur de couleurs se déclenchait sur les teintes de grille, *« et une voie qui
se déclenche à chaque fois est une voie que les gens apprennent à cliquer sans lire »*
(`capture.ts:235-240`). **On échange du rappel contre du silence, délibérément.**

Ce que le détecteur mesure, donc, énoncé sans marge d'interprétation : une divergence
**lexicale**, pas une contradiction sémantique. Il ne juge pas — le type le lui interdit — et il
n'a pas non plus la prétention de tout voir.

### 4.4 Une liste, pas quatre

L'union des quatre langues plutôt qu'une liste choisie par langue de contenu : `lib/verify`
n'importe que `lib/core` (contrainte de la couche), et la langue vit dans `lib/newsroom`. Le coût
d'une union est nul en pratique — un mot outil français dans un titre anglais est un mot rare.

### 4.5 Ce qui se passe déjà à côté, et qu'on ne touche pas

Quand le titre rendu diverge, le check de furniture `capture:furniture-present` du rôle `title`
échoue déjà (le texte commandé n'est nulle part dans le DOM) et `review` en tire un finding
**bloquant** `furniture-missing`. La divergence est donc attrapée **deux fois** : une porte dit
*« le titre que vous avez commandé n'est pas là »*, la voie de goût dit *« voici ce qui est
peint à la place, et il partage N mots sur M avec votre point »*. On ne touche pas à la première :
c'est une porte existante, et l'affaiblir pour faire de la place à un signal serait le contraire
du travail.

---

## 5. Les deux résidus voisins

### 5.1 R5 — le `DestinationProfile` réel de la rédaction : **laissé, et voici pourquoi**

`resolveTargets` retombe sur `CHANNEL_POLICY`. La tranche précédente l'a déféré comme « hors
frontière de fichiers ». `lib/newsroom/**` est dans la mienne — j'ai donc vérifié si c'était un
câblage.

**Ce n'en est pas un.** Mesuré : le profil de rédaction ne porte **aucune boîte d'embed**.
`NEWSROOM-PROFILE.example.md` déclare `palette`, `accent`, `source`, `lang`, `theme` — rien de
dimensionnel. `Decor.profile` (`lib/newsroom/decor.ts:49-56`) porte `source`, `credit`, `lang`,
`requiredSigners`. Il n'y a pas de champ à brancher : il faudrait **l'inventer**, décider ce que
« narrow » et « wide » veulent dire pour le CMS d'une rédaction, l'écrire dans le fichier que les
journalistes remplissent, le documenter, et le migrer. Et le parseur qui le lirait
(`skills/splash/src/brand-profile.ts`) est **hors frontière** ici.

**Ruling : déféré, requalifié.** Ce n'est pas un champ à remplir, c'est une **question de design
de produit** (« quel contrat d'embed une rédaction déclare-t-elle ? ») qui appartient à une
tranche du profil, pas à celle-ci. Le seam (`capture.destination`) reste là et testé. La
formulation *« c'est un champ à remplir, pas un design à faire »* de la tranche précédente est
**fausse** ; elle est corrigée ici.

### 5.2 R2 — `approved ⇒ preview` au manifeste : **refusé, mais avec la mesure exacte**

La tranche précédente a refusé cet invariant en écrivant que *« trois tests de `lib/loop` posent
`approved` à la main »*. Je l'ai **mesuré** au lieu de le reprendre : invariant ajouté à
`assertInvariants`, suite `lib/` complète exécutée, invariant retiré.

```
1195 pass · 10 skip · 2 fail
```

Exactement **deux** tests tombent, et pas ceux annoncés :

1. `lib/loop/driver.test.ts:256` (« run dir handoff ») — la fixture déclare `approved` sans
   review, puis `writeManifest`. Son propre commentaire dit que son sujet est *« le run dir qui
   voyage entier, pas la cérémonie d'approbation »*. **Hors de ma frontière de fichiers.**
2. `lib/verify/manifest-review.test.ts:262` — le **verrou** qui enregistre le refus précédent
   (« la porte de préview vit à `approveElement` »). Dans ma frontière, mais c'est la décision
   elle-même.

Les autres fixtures citées (`gate-state.test.ts`, `deliver.test.ts`, `acceptance-deliver.test.ts`)
ne tombent **pas** : elles n'écrivent jamais ce manifeste-là.

**Ruling : refusé, pour une raison plus étroite et plus vraie que la précédente.** L'invariant est
sémantiquement juste — `previewCoversDeliverable` exige une préview pour **tous** les formats — et
son coût est UN test hors frontière, pas trois. Mais « un test que je n'ai pas le droit de
réparer » suffit : le fermer voudrait dire livrer une suite rouge ou toucher un fichier interdit,
et un invariant écrit contre un test qu'on ne peut pas migrer est un faux vert (le raisonnement
que les deux tranches précédentes ont déjà tenu). Ce qui change ici : le commentaire du verrou
cesse d'annoncer « trois tests » et porte le chiffre mesuré, avec le nom du fichier — pour que la
prochaine tranche qui possède `lib/loop/driver.test.ts` sache que c'est **la seule** chose à
migrer. L'assertion, elle, ne bouge pas d'un caractère.

---

## 6. Hors scope — assumé, avec sa raison

| Déféré | Pourquoi (honnête) |
|---|---|
| **Le titre d'un livrable `static`** | Pas de DOM, pas de texte. Ni OCR ni recopie du titre commandé (§2.4). `titleSource: "static-image"` le dit. |
| **La vidéo** | `capture` refuse `video` (`not-implemented`), inchangé. Le manque est déjà nommé et passe par l'override explicite (tranche précédente, §4.4). |
| **La stemmatisation / la détection de contradiction** | Un métrique de tokens ne voit pas une revendication inversée (§4.3). Y remédier demanderait un juge sémantique — précisément ce que la voie humaine existe pour **ne pas** faire. |
| **Normaliser les préfixes moteurs** (`Interactive map: …`) | Sans effet sur la métrique (§4), et aucun de ces moteurs n'est buildable par la boucle. Normaliser un préfixe qu'aucun run ne produit serait du code non exercé. |
| **Le relecteur sémantique indépendant** | Décision verrouillée, inchangée : aucun appel sortant, `independentSemanticReview` reste `"unavailable"`. |
| **`interactionResults`** | Toujours vide plutôt que faussement rempli. |

---

## 7. La preuve

`lib/verify/real-artifact-proof.test.ts` (opt-in, `SPLASH_VERIFY_PROOF=1`) est étendu et son
**mensonge est retiré** : il ne se passe plus `renderedTitle: TAKEAWAY` à la main.

Deux runs, tous deux à travers la vraie boucle (vrai `produce` chart-native, vrai navigateur,
vrais verbes `captureStep`/`reviewStep` de `lib/loop/verify.ts`) :

1. **Le cas muet.** `produce` rend l'interactif ; `captureStep` extrait le titre du rendu ;
   `reviewStep` produit le record. Attendu : `renderedTitle === angle.confirmedTakeaway`,
   `titleSource` nommé, et **aucun** `title-takeaway-divergence` dans `tasteRisk`.
2. **Le cas bruyant.** Sur le **même artefact rendu**, la back-edge réelle de la boucle —
   `revise(el, { kind: "takeaway", … })`, le journaliste qui change d'avis après avoir vu le
   visuel — puis `captureStep`/`reviewStep` à nouveau. Attendu : le signal apparaît, son
   `evidence` cite le titre peint ET le takeaway confirmé, et il **arrive dans
   `approvalDecision(...).needsHumanEye`** — la présentation d'approbation.

Le cas bruyant est honnête sur ce qu'il est : après un `revise`, `provenanceHash` bouge, donc la
boucle route de toute façon vers `produce` et l'approbation refuserait pour `review-stale`. **La
preuve l'asserte aussi**, plutôt que de le cacher : les deux mécanismes sont complémentaires — la
péremption dit *« cet artefact n'est plus le bon »*, la voie de goût dit *« et voici en quoi son
titre ne dit plus votre point »*. C'est le seul chemin réel qui fasse diverger les deux chaînes
avec un rendu réel sur disque, puisque `produce.ts:168` les tient égales.

Un troisième cas, sur un `static.png` réellement produit par la boucle : `titleSource ===
"static-image"`, pas de `renderedTitle`, voie muette.

---

## 8. Risques assumés

*(écrits après implémentation, chacun avec son ruling.)*

---

## 9. Contraintes globales

- Runtime **Bun**. Tests `bun:test`, **TDD** (test rouge d'abord, exécuté, vu échouer).
- Invariants du contrat de verbes tenus : I1 jamais de `throw` au bord · I2 payload neutre ·
  I5 aucun `process.env` dans `lib/verify` · I6 tout round-trippe en JSON (donc `renderedTitle`
  et `titleSource` sont des **clés absentes** quand ils n'existent pas, jamais `undefined`) ·
  I7 des chemins, jamais des octets.
- `lib/verify` continue de n'importer que `lib/core`.
- Compatibilité de schéma : `CaptureRecordSchema` gagne deux champs **optionnels**. Un run déjà
  sur disque doit continuer à se lire — la règle que `lib/verify/schema.ts` s'impose depuis sa
  première ligne.
- Aucun mock d'un vrai seam : la capture ouvre un vrai fichier rendu dans un vrai navigateur.
- Code, commentaires, identifiants : **anglais**. Aucune mention vendor dans un artefact commité.
