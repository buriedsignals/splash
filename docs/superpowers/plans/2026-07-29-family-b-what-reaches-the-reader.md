# Plan d'implémentation — Ce qui arrive au lecteur est faux (famille B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une décision prise par le journaliste — une langue, une source, une unité, une couleur,
un titre — arrive au lecteur telle qu'elle a été prise, et quand elle n'y arrive pas, un garde
capable de ROUGIR le dit. Cette famille n'est pas faite de bugs de rendu : elle est faite de neuf
gardes verts. Verts parce qu'affamés (rien ne les nourrit), sans lecteur (l'artefact d'alerte
n'est ouvert par personne), ou tautologiques (ils comparent l'accepté à l'accepté).

**Architecture:** Trois gestes, dans cet ordre, parce que c'est l'ordre des dépendances réelles.
**① Un porteur** là où la décision n'est écrite nulle part — la langue devient un champ que le
pipeline transporte (`resolveLanguage` → manifeste → `ProductionBrief.lang` → les six
assembleurs), jamais une valeur devinée au moment de rendre. **② Un lecteur** là où le porteur
arrive et que personne ne le consomme — l'unité qui s'arrête à l'assembleur, le nombre peint sans
helper de locale, le `brand-concerns.json` que rien n'ouvre. **③ Une comparaison** là où deux
porteurs coexistent sans jamais se rencontrer — le nom de source contre le texte de l'article, la
couleur annoncée contre la couleur que le type peut peindre, le titre rendu contre le takeaway
confirmé. Tout ce qui peut vivre dans `lib/` y vit : **la boucle est le socle, la chaîne en prose
l'appelle** (même modèle que la famille A). Une seule exception, mesurée : D16 est impossible dans
la boucle par construction (`title := takeaway`, six assembleurs), donc pour D16 seul la réparation
vit dans la prose et reste un **signalement**, jamais un blocage.

**Tech Stack:** Bun · TypeScript · `bun:test` · zod 4 (les schémas de manifeste, déjà en place) ·
`node:fs` (les gardes de dérive qui lisent l'arbre) · aucune dépendance nouvelle — en particulier
**aucune bibliothèque de détection de langue** : la langue est DÉCLARÉE par qui a lu l'article,
jamais devinée.

**Spec:** `docs/superpowers/specs/2026-07-28-family-b-what-reaches-the-reader-design.md`
**Matière mesurée:** `docs/splash/sweep-2026-07-28-triage.md` §§ 4-5 (D10, D12, D16, D17, D18, D25,
D26, D28, D29)
**Dépend de:** `docs/superpowers/plans/2026-07-28-refusals-that-bite.md` (famille A) pour la
TERMINAISON. Ce plan rend les gardes capables de dire quelque chose ; A rend ce qu'ils disent
contraignant. Les deux moitiés explicitement déférées à A sont nommées en tâche 15 (le refus
terminal de `source-fidelity`) et en tâche 17 (le moment forcé du signalement D16 dans la prose).

## Global Constraints

- **Runtime is Bun.** Never `npm`, never `node`. Tests are `bun:test`. Gate: `bun run check`
  (22 checks : 9 `tsc --noEmit` + 13 `bun test`, `scripts/check.mjs:7-23`).
- **Code, comments, identifiers, commit messages, branch names: English.** Sans exception, quelle
  que soit la langue de la conversation. Ce plan est en français ; ce qu'il fait écrire ne l'est pas.
- **Aucune mention Claude / Anthropic** dans un commit, une doc, un README, un artefact publié.
- **TDD.** Le test qui échoue est écrit ET LANCÉ avant l'implémentation, à chaque tâche.
- **★ Vérification par mutation, obligatoire.** Toute tâche qui pose ou répare un garde comporte
  une étape qui REMET le comportement bogué et constate que le test ROUGIT, **avec le chiffre**
  (`N pass, M fail`). Raison : le mode d'échec le plus coûteux observé sur ce dépôt est un chemin
  de vérification qui évite l'endroit qui casse
  (`.../memory/feedback-verification-path-avoids-the-break.md`). Cette famille entière est faite de
  gardes verts pour rien — un test vert qui ne rougit pas quand on casse le code y serait le
  dixième.
- **Aucune affirmation sans sa mesure.** Un nombre d'appelants ou de sites cité dans une tâche est
  accompagné de la commande qui l'établit. Les chiffres de ce plan ont été re-mesurés dans l'arbre
  courant ; là où ils contredisent la spec, la spec est corrigée en tête de tâche.
- **Pas de mock d'API externe.** Vraies clés, vrais échecs. Les suites Datawrapper/MapTiler
  s'auto-skippent sans `DATAWRAPPER_API_TOKEN` — c'est le comportement existant, à ne pas
  contourner par un faux client.
- **Layering.** `lib/core` n'importe rien. `lib/loop`, `lib/verify`, `lib/newsroom` peuvent importer
  `lib/core`. `skills/` importe `lib/`, jamais l'inverse (`lib/core/channel-policy.ts:3-4`).
  Aucune tâche ici n'ajoute une violation.
- **Aucun garde-fou de DÉTECTION nouveau** (spec § 5). La détection existe. Ce qui manque est un
  porteur, un lecteur, ou une comparaison. Deux exceptions explicitement voulues, et ce sont des
  gardes de DÉRIVE, pas de détection : la garde locale-reach (tâche 7) et l'émetteur
  `colour-semantics` (tâche 12).
- **Un faux blocage tue un run de journaliste.** Toute exemption est mesurée, jamais supposée, et
  son commentaire cite la ligne qui la justifie.
- **Vérifier au LIVRÉ, jamais au grep d'un bundle construit.** Un bundle single-file inline toute
  la registry de palettes ; grepper un hex dedans n'est pas une preuve (leçon gravée, CLAUDE.md).
- **Splash ne traduit pas.** Porter la langue, c'est choisir la bonne ligne dans une table écrite —
  jamais produire du texte dans une langue. Les tables de copie ajoutées ici (tâche 2) sont de la
  **furniture**, au même titre que `lib/newsroom/ui-copy.ts:109-114` qui est déjà en quatre langues.
- **Vérification par tâche, scopée** : `cd <dir> && bunx tsc --noEmit` puis `cd <dir> && bun test`.
  Le gate complet tourne une fois, en tâche 18.

---

## Ce que la vérification du CODE a corrigé dans la spec

Mesuré dans l'arbre courant avant d'écrire ce plan. Chaque correction est reprise en tête de la
tâche concernée ; regroupée ici pour qu'aucune tâche ne reparte du chiffre faux.

| § spec | affirmation | vérifié | correction |
|---|---|---|---|
| § 8.7 | `lib/loop/assemble/scrolly.ts` n'a **aucun champ `source`** → « un scrolly de la boucle part sans attribution » | **FAUX** | `assembleScrolly` (`scrolly.ts:65-76`) est un **pur dispatcheur** : il n'émet aucun objet, il délègue à `assembleChartNative` ou `assembleMapNative`, qui portent tous deux `source`. Le grep « rien » est exact et la conclusion ne l'est pas. → tâche 10, transformée en **preuve de régression** au lieu d'un correctif. |
| § 6 Q4 | « **21 sites visibles aveugles à la locale** sur 28 (13 chart-native, 8 map-native) » | **FAUX (sous-compte)** | **22** fichiers visibles aveugles sur 24 : `11` chart-native + `9` map-native + **`2` scrolly** (la spec omet `skills/scrolly/` entièrement). Commande § tâche 7. |
| § 6 Q4 | « Huit d'entre eux (`cartogram-story.ts`, `hex-grid-story.ts`, `dot-density-story.ts` et leurs six composants) n'importent aucun helper de locale » | **FAUX** | **11** modules sans helper : les 3 stories + `CartogramStory/Scrolly/Reveal` + `HexGridStory/Scrolly/Reveal` + `ScrollyCartogramMap` + `ScrollyHexMap`. Les composants **dot-density sont déjà localisés** (`DotDensityStory.tsx:77` importe `formatLocaleNumber`) — seul `dot-density-story.ts` ne l'est pas. |
| § 3.2 D26 | `brand-profile.ts:466-468` estampille `baseColor` + `brandExplicit: true` sur **toute** spec `chart-native` | **FAUX** | Trois façons de ne PAS l'être : pas de profil / palette vide (`brand-profile.ts:461`), et surtout la branche `seedBrandColor` (`:198-205`) qui pose `brandExplicit: isHouseColour` — une couleur explicite hors palette maison donne **`false`**. Seule la branche auto (`:467-469`) pose `true` inconditionnellement. Conséquence portée en tâche 13. |
| § 4.4 | « le garde reçoit la constante de rôle et non `cfg.baseColor` (`produce-conformance.ts:665-677`) » | **PARTIEL** | Deux gardes différents confondus. `checkMarkContrastOnBg` (`produce-conformance.ts:290-293`) **reçoit bien** `cfg.baseColor` via `houseMarks` (`:138-139`) — mais est court-circuité par `if (config.brandExplicit !== true) return [];` (`:134`). La constante de rôle (`:676`) est celle de `checkWaterfallConformance`, un garde par-type distinct. |
| § 4.3 | « Aucune fonction de distance couleur n'existe aujourd'hui » | **PARTIEL** | Aucune fonction **perceptuelle** ni aucun snapping accessible : vrai. Mais `colourSeparation` (`lib/verify/taste.ts:210`) est une distance RGB pondérée (2,4,3) avec un plancher `MIN_COLOUR_SEPARATION = 90` (`:25`). À ne pas dupliquer. |
| § 1 tableau | `assertLocalizedSourceMetadata` a la famine à `lib/core/i18n-furniture.ts:64-66` | **PARTIEL** | La ligne est exacte, la fonction ne l'est pas : le `return []` est dans le délégué `localizedSourceViolations` (`:60-97`), `assertLocalizedSourceMetadata` est à `:100-111`. |
| § 3.1 | le commentaire « No lang » de la boucle est à `produce.ts:210-213` | **PARTIEL** | `:211-213`. `:210` est un `//` nu. |
| § 3.3 D26 | `assertChainProvenance` est à `render-provenance.ts:223-235` | **PARTIEL** | Déclarée à `:163-168` ; `:223-235` est l'étape 2 de son corps. |
| § 3.2 D25 | `brand-concerns.json` est « ouvert par rien » | **PRÉCISER** | Zéro lecteur de son **contenu**, mais une inscription de basename : `lib/host/path-safety.ts:77` le liste dans `PRODUCIBLE_NAMES` (allowlist de suppression). |
| § 3.2 D25 | la préoccupation est mintée à `conformance.ts:138-141` | **INCOMPLET** | Un **second** site de minting non cité, `:145-148` (le jumeau contraste). Et une préoccupation est une **`string` nue** — `BrandReconciliation` (`:103-108`) n'a ni id, ni sévérité, ni champ couleur. C'est LA raison pour laquelle rien ne peut la consommer. |
| § 3.2 D26 | « Onze types la rangent en furniture (`spec-to-config.ts:318, 340, …`) » | **PARTIEL** | Le compte de **11 est exact** (`grep -c "FURNITURE only"` → `11`) mais les lignes citées sont celles du **commentaire** ; le routage est à **n+2** (320, 342, 366, 524, 564, 605, 628, 671, 815, 836, 939). Sur **27** builders au total. |

---

## File Structure

**Créés**

| fichier | responsabilité |
|---|---|
| `lib/core/story-copy.ts` | La table de copie auto-générée en **quatre** langues (fr/de/it/en) : superlatifs, ordinaux, séparateurs de légende, clauses d'écart, libellé photo. Une table, trois moteurs. `lib/core` n'importe rien — c'est ce qui la rend importable depuis `skills/chart-native`, `skills/map-native` et `skills/scrolly`. |
| `lib/core/story-copy.test.ts` | Les quatre langues existent pour chaque entrée ; aucune ne retombe en anglais. |
| `lib/core/placeholder-host.ts` | L'UNIQUE liste de placeholders, l'union des deux, la plus stricte. `PLACEHOLDER_LABELS`, `placeholderHostReason(host)`, `isPlaceholderHost(host)`. |
| `lib/core/placeholder-host.test.ts` | Les deux fuites croisées mesurées (`data.test`, `todo.com`) sont fermées ; les faux positifs historiques (`myexample.com`, `testing.gov.uk`) restent acceptés. |
| `lib/core/locale-reach.ts` | Le garde de dérive : `numberPaintSites(source)`, `callsLocaleHelper(source)`, `localeReachViolations(files, opts)`. Pur, aucun I/O — les tests de chaque moteur lui donnent l'arbre. |
| `lib/core/locale-reach.test.ts` | Le garde lui-même : il voit un `toFixed` peint, il ne voit pas un `toFixed` de diagnostic. |
| `lib/core/language-coverage.ts` | `COVERED_LANGS`, `isCoveredLang(lang)`, `uncoveredLanguageRefusal(lang)` — la cinquième langue, refusée AU MOMENT DE L'OFFRE, et la dette écrite à côté. |
| `lib/core/language-coverage.test.ts` | |
| `lib/verify/colour-announcement.ts` | `announcedColourFindings(input)` — le premier et seul émetteur du critère `colour-semantics`, sur deux motifs : une couleur maison hors Okabe-Ito (D25, avec la teinte accessible la plus proche) et une couleur annoncée qu'un type ne peint pas (D26). |
| `lib/verify/colour-announcement.test.ts` | |
| `lib/core/nearest-okabe-ito.ts` | `nearestOkabeIto(hex)` — la distance perceptuelle OKLCH sur le jeu gelé, et rien d'autre. Séparée pour que `lib/verify` ne réimplémente pas la distance RGB de `taste.ts:210`. |
| `lib/core/nearest-okabe-ito.test.ts` | |
| `skills/chart-native/src/base-colour-reach.ts` | `honoursBaseColor(nativeType)` + `FURNITURE_ONLY_TYPES` — le fait « ce type peint-il ses marques avec `baseColor` ? », rendu interrogeable au lieu d'être constaté onze fois en commentaire. |
| `skills/chart-native/tests/base-colour-reach.test.ts` | Le drift-guard : la liste et les onze commentaires `FURNITURE only` ne peuvent pas diverger. |
| `skills/chart-native/tests/locale-reach.test.ts` | La garde de tâche 7, appliquée à `skills/chart-native/src`. |
| `skills/map-native/tests/locale-reach.test.ts` | idem `skills/map-native/src`. |
| `skills/scrolly/tests/locale-reach.test.ts` | idem `skills/scrolly/src`. |
| `docs/splash/language-debt.md` | La dette de couverture linguistique : les langues des tables, celles que `dwLocale` mappe, et ce qui manque à chacune pour être livrable. Un document qui doit RÉTRÉCIR. |

**Modifiés**

| fichier | changement |
|---|---|
| `lib/newsroom/language.ts` | `resolveLanguage` gagne `articleLang`, entre l'override et le profil. Le profil devient le dernier recours. |
| `lib/newsroom/decor.ts` | `LoadDecorOpts` gagne `articleLang` ; `loadDecor` le passe. |
| `lib/core/locale.ts` | `labelWithUnit` cesse d'être binaire `isFrench` — il partage la base de langue de `unitSuffix`, qui gère déjà l'allemand. |
| `skills/scrolly/src/chapters.ts` | `const fr = isFrench(...)` → la table à quatre langues. |
| `skills/chart-native/src/chart-story.ts` | idem, + `ordinal` délégué à la table. |
| `skills/map-native/src/map-story.ts` | idem, + `ordinal` (anglais-seul aujourd'hui) délégué à la table. |
| `skills/scrolly/src/Scrolly.tsx` | `photoLabel` (`:328`) passe par la table. |
| `skills/dw-chart/src/spec-to-metadata.ts` | `sourceNotes` cesse de perdre l'URL sur fr/de/it. |
| `skills/map-dw/src/spec-to-map-metadata.ts` | Le jumeau exact, même correctif. |
| `lib/loop/init.ts` | `RunDeclarationSchema.input` gagne `articleLang` ; `initRun` prend un `profileLang` et résout **une fois** la langue du run. |
| `lib/loop/manifest.ts` | `RunManifestSchema` gagne `lang` (la langue résolue du run, un écrivain, un lecteur). |
| `lib/host/drive.ts` | `initRunIn` passe la langue du profil ; l'action `approve` porte la juxtaposition D16. |
| `lib/core/production-brief.ts` | `ProductionBrief` gagne `lang`. |
| `lib/loop/assemble/brief.ts` | `briefFor` lit `run.lang`. |
| `lib/loop/assemble/chart-native.ts`, `map-native.ts`, `dw-chart.ts`, `map-dw.ts`, `image-native.ts` | threadent `lang` ; `map-native.ts` répare aussi `valueUnit` et les trois types qui droppent l'unité ; `dw-chart.ts` fait arriver l'unité au sous-titre. |
| `lib/loop/produce.ts` | Le commentaire « No lang » (`:211-213`) disparaît avec sa cause. |
| `lib/brain/eligibility.ts` | Une langue hors tables est un `refusal`, au même endroit que le refus de format. |
| `skills/chart-native/src/{Boxplot,Bullet,Combo,DotStrip,Lollipop,Lorenz,Parallel,Sankey,Slope,Violin,Waffle}Chart.tsx` | Les onze formateurs aveugles passent par `formatLocaleNumber`. |
| `skills/map-native/src/{cartogram,hex-grid,dot-density}-story.ts` | `lang` entre dans les trois `Meta`, les nombres passent par le helper. |
| `skills/map-native/src/components/{Cartogram,HexGrid}{Story,Scrolly,Reveal}.tsx`, `skills/scrolly/src/Scrolly{Cartogram,Hex}Map.tsx` | Les huit légendes partagent un seul formateur localisé. |
| `skills/chart-native/src/core/conformance.ts` | Une préoccupation devient un **record** (`BrandConcern`) : critère, couleur, raison, teinte accessible la plus proche. |
| `skills/chart-native/scripts/produce.mjs` | Écrit le nouveau format et n'invente rien. |
| `skills/splash/src/review-gate.ts` + `scripts/review-gate.mjs` | Ouvrent `brand-concerns.json` et remontent son contenu. |
| `skills/splash/src/brand-profile.ts` | `mergeProfileDefaults` n'annonce plus une couleur qu'un type ne peint pas. |
| `skills/splash/src/flow-decisions.ts` | `artifactCheck` normalise (pliage d'accents, casse, déclinaison) et consulte la table de classes. |
| `skills/splash/src/source-guard.ts` | Une URL DISPARUE est attrapée ; la liste de placeholders devient un import. |
| `lib/core/contract.ts` | `isHostedUrl` importe la liste unique. |
| `lib/verify/taste.ts` | Deux formes de plus (couverture partielle, dépassement) et la juxtaposition rendue. |
| `lib/verify/review.ts` | Appelle le nouvel émetteur `colour-semantics`. |
| `lib/loop/approve.ts`, `lib/loop/resume.ts` | La juxtaposition arrive au moment où le journaliste agit. |
| `skills/splash/SKILL.md` | Le champ de langue, le refus de cinquième langue, la juxtaposition D16, l'unité au sous-titre. |
| `docs/splash/sweep-2026-07-28-triage.md` | Les corrections de § 8 reportées dans le registre. |
| `docs/splash/CHANGELOG.md` | Le journal daté. |

---

## Ordre imposé, et pourquoi

**Phase A — le porteur (tâches 1-6).** La langue d'abord, parce que deux des neuf gardes verts sont
verts **uniquement** faute d'elle (`furnitureGateApplies`, `localizedSourceViolations`) et que les
nourrir est le geste qui les rend capables de rougir.

Mais l'ordre INTERNE de la phase A est contraint par le risque que la spec nomme en § 7 : *« porter
la langue rendra des gardes ROUGES du jour au lendemain… `assertLocalizedSourceMetadata` est
fail-hard AVANT l'appel API (`skills/dw-chart/src/produce.ts:152`). Le premier run avec une langue
posée peut bloquer une production qui marchait. »* Donc les fuites sont **réparées avant** que le
porteur ne les révèle : tâche 2 (la prose auto binaire fr/en) et tâche 3 (l'URL perdue par
Datawrapper non-anglais) précèdent la tâche 6 qui pose la langue. Les tâches 2 et 3 sont réparables
seules parce que la chaîne en prose V1, elle, **pose déjà `spec.lang`** — leurs défauts sont vivants
aujourd'hui, indépendamment de la boucle. Et la tâche 4 (le refus de cinquième langue) précède le
porteur pour la même raison : sans elle, le premier run espagnol produit un livrable mixte au lieu
d'un refus.

**Phase B — le lecteur (tâches 7-13).** Rien n'y dépend de la langue portée par la boucle : ce sont
des valeurs qui arrivent déjà et que personne ne consomme. La garde locale-reach (7) vient **avant**
les corrections (8, 9) parce qu'elle est ce qui empêche le 23ᵉ site de réapparaître le mois
prochain : elle atterrit rouge sur une dette nommée, et chaque tâche suivante la fait rétrécir.
C'est le levier que Q4 exige — 22 preuves au rendu à la main ne tiennent pas dans le temps.

**Phase C — la comparaison (tâches 14-17).** En dernier parce que ce sont les gestes les plus
sémantiques et les plus exposés au faux positif : D17 (assouplir AVANT de rendre terminal, § 4.1),
D26 (l'annonce sait ce que le type peint), D16 (la juxtaposition), et l'unification des listes de
placeholders. La tâche 17 est mise ici et pas en phase A alors qu'elle est petite, parce que le
sens de l'unification (« la plus stricte gagne ») est un arbitrage de comparaison, pas de porteur.

**Tâche 18 en dernier** : le gate complet, le registre corrigé, le journal.

---

## Task 1 : `articleLang` — le profil maison cesse d'écraser une langue confirmée

Le mode d'échec est **mesuré**, pas hypothétique : `gen-geo-point-magnitude-social-feed-en-static-themed`
— « la langue par défaut du profil maison a écrasé la langue anglaise confirmée »
(`sweep-2026-07-28-triage.md:186-196`). La structure existe déjà et n'a pas le bon axe :
`resolveLanguage` (`lib/newsroom/language.ts:23-33`) résout `content` par
`override.content > profileLang > ui`. Il manque l'échelon du milieu — la langue de l'article — et
tant qu'il manque, le profil EST le premier porteur, donc l'écraseur.

**Décision Q1, acquise :** signal explicite du journaliste > langue de l'article établie à
l'ANALYSE > profil maison. Le profil est le **dernier recours** et n'écrase jamais une valeur déjà
posée. Aucune dépendance de détection : l'étape qui lit l'article DÉCLARE la langue qu'elle y a lue.

**Files:**
- Modify: `lib/newsroom/language.ts:23-33`
- Modify: `lib/newsroom/language.test.ts`
- Modify: `lib/newsroom/decor.ts:86-89` (`LoadDecorOpts`) et `:102-112` (`loadDecor`)
- Modify: `lib/newsroom/decor.test.ts`

**Interfaces:**
- Consumes: rien. Premier maillon.
- Produces:
  ```ts
  export function resolveLanguage(input: {
    override?: { ui?: string; content?: string };
    uiLang?: string;
    /** The language the ARTICLE is written in, DECLARED by whoever read it. Never guessed. */
    articleLang?: string;
    profileLang?: string;
  }): ResolvedLanguage; // { ui: string; content: string }

  export type LoadDecorOpts = {
    env?: Record<string, string | undefined>;
    articleLang?: string;
  };
  ```

- [ ] **Step 1: Write the failing test**

Dans `lib/newsroom/language.test.ts`, ajouter à la fin du `describe` existant :

```ts
  it("keeps the article's own language when the house profile prefers another", () => {
    // The measured failure mode: a confirmed English article under a French house
    // profile shipped French furniture. The profile is the LAST resort, never a writer
    // over a language somebody established.
    expect(
      resolveLanguage({ uiLang: "fr", articleLang: "en", profileLang: "fr" }),
    ).toEqual({ ui: "fr", content: "en" });
  });

  it("falls back to the house profile only when no article language was declared", () => {
    expect(resolveLanguage({ uiLang: "en", profileLang: "de" }).content).toBe("de");
  });

  it("lets an explicit override outrank the article's own language", () => {
    expect(
      resolveLanguage({
        articleLang: "de",
        profileLang: "fr",
        override: { content: "it" },
      }).content,
    ).toBe("it");
  });

  it("ignores a blank article language instead of letting it win", () => {
    expect(
      resolveLanguage({ articleLang: "   ", profileLang: "de" }).content,
    ).toBe("de");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test newsroom/language.test.ts`
Expected: FAIL — `Object literal may only specify known properties, 'articleLang' does not exist`
au typecheck, et à l'exécution `expected "en", received "fr"` sur le premier test.

- [ ] **Step 3: Write minimal implementation**

`lib/newsroom/language.ts`, remplacer `resolveLanguage` (`:23-33`) par :

```ts
export function resolveLanguage(input: {
  override?: { ui?: string; content?: string };
  uiLang?: string;
  /** The language the ARTICLE is written in, DECLARED by whoever read it — never detected.
   *  It sits ABOVE the house profile on purpose: a newsroom's default language is what to use
   *  when nobody established one, not a writer over a language somebody did establish. The
   *  measured failure it removes: a confirmed English article shipped under a French profile
   *  default (sweep-2026-07-28-triage.md, D12). */
  articleLang?: string;
  profileLang?: string;
}): ResolvedLanguage {
  const ui = firstSet(input.override?.ui, input.uiLang) ?? DEFAULT_UI_LANG;
  // A newsroom that set no deliverable language works in the language it reads: falling back
  // to `ui` beats falling back to English for a German newsroom that never filled the profile.
  const content =
    firstSet(input.override?.content, input.articleLang, input.profileLang) ?? ui;
  return { ui, content };
}
```

`lib/newsroom/decor.ts`, `LoadDecorOpts` (`:86-89`) :

```ts
export type LoadDecorOpts = {
  /** The environment to judge readiness against. Defaults to `decorEnv(root)`. */
  env?: Record<string, string | undefined>;
  /** The language of the article this decor is being loaded FOR, when there is one.
   *  Absent for every decor read that is not about a specific run — which is why it is an
   *  option and not a field of the install's own state. */
  articleLang?: string;
};
```

et `loadDecor` (`:109-112`) :

```ts
  const language = resolveLanguage({
    uiLang: state.uiLang,
    ...(opts.articleLang ? { articleLang: opts.articleLang } : {}),
    profileLang: profile?.lang,
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test newsroom/`
Expected: PASS, aucune régression sur les 5 tests existants de `language.test.ts`.

- [ ] **Step 5: MUTATION — remettre le bug et constater le rouge**

Remettre l'ordre bogué dans `lib/newsroom/language.ts` :

```ts
  const content =
    firstSet(input.override?.content, input.profileLang, input.articleLang) ?? ui;
```

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test newsroom/language.test.ts`
Expected: **FAIL**, et noter le chiffre (attendu : `1 fail` — « keeps the article's own language »,
`expected "en", received "fr"`). Puis REMETTRE l'ordre correct et relancer : `0 fail`.

Si la mutation ne rougit pas, le test ne teste pas ce qu'il prétend — corriger le test avant de
continuer.

- [ ] **Step 6: Commit**

```bash
git add lib/newsroom/language.ts lib/newsroom/language.test.ts lib/newsroom/decor.ts lib/newsroom/decor.test.ts
git commit -m "feat(newsroom): the article's language outranks the house profile"
```

---

## Task 2 : la prose auto-générée cesse d'être binaire fr/en

C'est la « deuxième moitié de D12 », que le registre ne nomme pas : l'axe de langue est **binaire là
où il devrait être quaternaire**. `isFrench` (`lib/core/locale.ts:72-74`) est un booléen, et c'est
la racine de toutes les fuites `de`/`it` → anglais.

**Correction de la spec, à ne pas perdre :** le registre attribuait le superlatif fr/en à
`deriveSymbolStory` (`skills/map-native/src/symbol-story.ts`). Vérifié : ce fichier ne contient
**aucun** superlatif ni branche fr/en. Les sites réels sont quatre, et il y a en plus **trois
implémentations séparées de `ordinal`** dont une anglais-seul :

```
$ grep -rn "function ordinal" skills/ lib/
skills/map-native/src/map-story.ts:481:function ordinal(n: number): string {      ← anglais SEUL
skills/chart-native/src/chart-story.ts:297:function ordinal(n: number, lang?: string): string {
skills/scrolly/src/chapters.ts:181:function ordinal(n: number, lang?: string): string {
```

Ceci n'est **pas de la traduction** (hors périmètre, spec § 5) : c'est de la **furniture**, exactement
comme `sourceQuestionCopy` (`lib/newsroom/ui-copy.ts:109-114`) qui est déjà écrite en quatre langues
dans ce dépôt. Une table, trois moteurs.

**Files:**
- Create: `lib/core/story-copy.ts`
- Create: `lib/core/story-copy.test.ts`
- Modify: `lib/core/locale.ts:196-207` (`labelWithUnit`)
- Modify: `lib/core/locale.test.ts`
- Modify: `skills/scrolly/src/chapters.ts:64`, `:118-127`, `:181-199`
- Modify: `skills/scrolly/src/Scrolly.tsx:328`
- Modify: `skills/chart-native/src/chart-story.ts:281-298`, `:467-480`
- Modify: `skills/map-native/src/map-story.ts:382-405`, `:481-486`

**Interfaces:**
- Consumes: `Lang` de `lib/core/locale.ts:27`.
- Produces:
  ```ts
  export type StoryCopy = {
    lowest: string;                                  // "the lowest"
    highestOf: (n: number) => string;                // "the highest of the 12 shown"
    nth: (rank: number) => string;                   // "the 3rd" / "le 3e"
    lowestRow: (label: string, value: string) => string;  // "The lowest — Vaud, 12.4"
    leads: (label: string, value: string) => string;      // "Vaud leads — 12.4"
    ranked: (label: string, value: string, rank: number) => string;
    captionSep: string;                              // ": " / " : "
    yearSpan: (n: number) => string;                 // " — a 9-year span"
    foldGap: (n: number) => string;                  // " — a 4-fold gap"
    photoLabel: string;                              // "Photo:" / "Photo :"
  };
  export const STORY_COPY: Record<"en" | "fr" | "de" | "it", StoryCopy>;
  export function storyCopy(lang?: Lang): StoryCopy;
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/core/story-copy.test.ts` :

```ts
import { describe, expect, it } from "bun:test";
import { STORY_COPY, storyCopy } from "./story-copy";

describe("the auto-generated story copy is quaternary, not binary", () => {
  it("has every language the locale tables cover", () => {
    expect(Object.keys(STORY_COPY).sort()).toEqual(["de", "en", "fr", "it"]);
  });

  it("never leaks English into a German or an Italian walk", () => {
    // The measured leak: `const fr = isFrench(meta.lang)` sent "the highest of the N shown"
    // into an Italian scrolly and "a 4-fold gap" into a German map story.
    for (const lang of ["de", "it", "fr"] as const) {
      const c = storyCopy(lang);
      expect(c.lowest).not.toBe(STORY_COPY.en.lowest);
      expect(c.highestOf(12)).not.toBe(STORY_COPY.en.highestOf(12));
      expect(c.foldGap(4)).not.toBe(STORY_COPY.en.foldGap(4));
      expect(c.yearSpan(9)).not.toBe(STORY_COPY.en.yearSpan(9));
    }
  });

  it("ordinals follow the language, including the two that had no branch at all", () => {
    expect(storyCopy("en").nth(3)).toBe("the 3rd");
    expect(storyCopy("fr").nth(1)).toBe("le 1er");
    expect(storyCopy("de").nth(3)).toBe("der 3.");
    expect(storyCopy("it").nth(3)).toBe("il 3º");
  });

  it("falls back to English for a tag no table covers, without throwing", () => {
    expect(storyCopy("es")).toEqual(STORY_COPY.en);
    expect(storyCopy(undefined)).toEqual(STORY_COPY.en);
    expect(storyCopy("fr-CH")).toEqual(STORY_COPY.fr);
  });
});
```

Et dans `lib/core/locale.test.ts`, ajouter :

```ts
  it("spaces a short unit the German way, like unitSuffix already does", () => {
    // labelWithUnit was `isFrench`-binary while its twin unitSuffix (locale.ts:167-174)
    // already handled `de` — two helpers of the same file disagreeing about German.
    expect(core.labelWithUnit("70", "%", "de")).toBe(core.labelWithUnit("70", "%", "fr"));
    expect(core.labelWithUnit("70", "%", "de")).not.toBe("70%");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/story-copy.test.ts core/locale.test.ts`
Expected: FAIL — `Cannot find module './story-copy'` pour la première suite, et
`expected "70 %", received "70%"` pour le test allemand de `labelWithUnit`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/core/story-copy.ts` :

```ts
// The words the caption engines GENERATE, in the four languages the locale tables cover.
//
// This is FURNITURE, not translation: splash never produces text in a language: it picks the
// right row of a table that is written down. The same discipline as lib/newsroom/ui-copy.ts's
// sourceQuestionCopy, which has been four-language since the source-policy tranche.
//
// It exists because the three caption engines each branched on `isFrench()` — a BOOLEAN — so
// "the highest of the 12 shown" shipped inside an Italian scrolly and "a 4-fold gap" inside a
// German map story. A binary axis cannot carry four languages; the leak was structural.
//
// lib/core imports nothing, which is what makes this importable from all three engines.
import type { Lang } from "./locale";

export type StoryCopy = {
  lowest: string;
  highestOf: (n: number) => string;
  nth: (rank: number) => string;
  lowestRow: (label: string, value: string) => string;
  leads: (label: string, value: string) => string;
  ranked: (label: string, value: string, rank: number) => string;
  /** Between a region's name and its value in a map-story takeaway. French puts a thin space
   *  before the colon; the other three do not. */
  captionSep: string;
  yearSpan: (n: number) => string;
  foldGap: (n: number) => string;
  photoLabel: string;
};

function enOrdinal(n: number): string {
  const r100 = n % 100;
  const r10 = n % 10;
  const suffix =
    r100 >= 11 && r100 <= 13
      ? "th"
      : r10 === 1
        ? "st"
        : r10 === 2
          ? "nd"
          : r10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

const EN: StoryCopy = {
  lowest: "the lowest",
  highestOf: (n) => `the highest of the ${n} shown`,
  nth: (rank) => `the ${enOrdinal(rank)}`,
  lowestRow: (label, value) => `The lowest — ${label}, ${value}`,
  leads: (label, value) => `${label} leads — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, the ${enOrdinal(rank)}`,
  captionSep: ": ",
  yearSpan: (n) => ` — a ${n}-year span`,
  foldGap: (n) => ` — a ${n}-fold gap`,
  photoLabel: "Photo:",
};

const FR: StoryCopy = {
  lowest: "le plus bas",
  highestOf: (n) => `le plus élevé des ${n}`,
  nth: (rank) => `le ${rank === 1 ? "1er" : `${rank}e`}`,
  lowestRow: (label, value) => `Le plus bas — ${label}, ${value}`,
  leads: (label, value) => `${label} en tête — ${value}`,
  ranked: (label, value, rank) =>
    `${label} — ${value}, ${rank === 1 ? "1er" : `${rank}e`}`,
  // U+202F narrow no-break space, the same convention as the FR thousands separator
  // (lib/core/locale.ts's FR_GROUP).
  captionSep: " : ",
  yearSpan: (n) => ` — ${n} an${n === 1 ? "" : "s"} d'écart`,
  foldGap: (n) => ` — un écart de 1 à ${n}`,
  photoLabel: "Photo :",
};

const DE: StoryCopy = {
  lowest: "der niedrigste",
  highestOf: (n) => `der höchste von ${n}`,
  nth: (rank) => `der ${rank}.`,
  lowestRow: (label, value) => `Am niedrigsten — ${label}, ${value}`,
  leads: (label, value) => `${label} führt — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, der ${rank}.`,
  captionSep: ": ",
  yearSpan: (n) => ` — ${n} Jahr${n === 1 ? "" : "e"} Abstand`,
  foldGap: (n) => ` — ein Verhältnis von 1 zu ${n}`,
  photoLabel: "Foto:",
};

const IT: StoryCopy = {
  lowest: "il più basso",
  highestOf: (n) => `il più alto dei ${n}`,
  nth: (rank) => `il ${rank}º`,
  lowestRow: (label, value) => `Il più basso — ${label}, ${value}`,
  leads: (label, value) => `${label} in testa — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, il ${rank}º`,
  captionSep: ": ",
  yearSpan: (n) => ` — ${n} ann${n === 1 ? "o" : "i"} di scarto`,
  foldGap: (n) => ` — un divario di 1 a ${n}`,
  photoLabel: "Foto:",
};

export const STORY_COPY: Record<"en" | "fr" | "de" | "it", StoryCopy> = {
  en: EN,
  fr: FR,
  de: DE,
  it: IT,
};

/** The row for `lang`, by base subtag ("fr-CH" → fr). An uncovered tag falls back to English —
 *  and a run that WOULD ship in an uncovered language is refused at the offer instead
 *  (lib/core/language-coverage.ts), so this fallback is a safety net, never a shipping path. */
export function storyCopy(lang?: Lang): StoryCopy {
  const base =
    typeof lang === "string" ? lang.toLowerCase().split(/[-_]/)[0] : undefined;
  return (base && STORY_COPY[base as keyof typeof STORY_COPY]) || EN;
}
```

`lib/core/locale.ts`, `labelWithUnit` (`:196-207`) — remplacer la branche `isFrench` :

```ts
export function labelWithUnit(
  valueText: string,
  unit: string | undefined,
  lang?: Lang,
): string {
  const u = unit?.trim();
  if (!u) return valueText;
  const short = u.length <= SHORT_UNIT_MAX_CHARS;
  // The SAME base-language test `unitSuffix` uses (:171-173). These two were the only two
  // helpers of this file that disagreed about German: unitSuffix spaced "70 %" and
  // labelWithUnit printed "70%", on the same deliverable.
  const base =
    typeof lang === "string" ? lang.toLowerCase().split("-")[0] : "en";
  if (short && (base === "fr" || base === "de"))
    return `${valueText}${FR_GROUP}${u}`;
  if (short && SYMBOL_UNIT_WITH_CURRENCY.test(u)) return `${valueText}${u}`;
  return `${valueText} ${u}`;
}
```

`skills/scrolly/src/chapters.ts` — supprimer `const fr = isFrench(meta.lang)` (`:64`) et la
fonction `ordinal` locale (`:181-199`), puis dans le bloc `:118-127` :

```ts
        const copy = storyCopy(meta.lang);
        if (b.rankRole === "tail" || i === minBeat) descriptor = copy.lowest;
        else if (b.rank === 1 || i === maxBeat)
          descriptor = copy.highestOf(meta.regionsWithData);
        else if (b.rank !== undefined) descriptor = copy.nth(b.rank);
```

`skills/scrolly/src/Scrolly.tsx:328` :

```tsx
  const photoLabel = storyCopy(config.lang).photoLabel;
```

`skills/chart-native/src/chart-story.ts` — supprimer `ordinalEn`/`ordinalFr`/`ordinal`
(`:281-298`) et remplacer le bloc `:467-480` :

```ts
    const copy = storyCopy(spec.lang);
    for (const r of walk) {
      const row = displayOrder[r.sortedIndex];
      const value = fmt(row.value);
      const autoCopy =
        r.role === "tail"
          ? copy.lowestRow(row.label, value)
          : r.rank === 1
            ? copy.leads(row.label, value)
            : copy.ranked(row.label, value, r.rank);
```

`skills/map-native/src/map-story.ts` — supprimer `ordinal` (`:481-486`, anglais-seul) et remplacer
`:382-405` :

```ts
  const copy = storyCopy(input.lang);
  const sep = copy.captionSep;

  if (input.pattern === "temporal") {
    const span = Math.abs(Math.round(input.maxValue - input.minValue));
    const spanClause = span > 0 ? copy.yearSpan(span) : "";
    return `${minName}${sep}${minLabel}, ${maxName}${sep}${maxLabel}${spanClause}`;
  }

  const ratio =
    input.minValue > 0 ? Math.round(input.maxValue / input.minValue) : 0;
  const gapClause = ratio >= 2 ? copy.foldGap(ratio) : "";
  return `${maxName}${sep}${maxLabel}, ${minName}${sep}${minLabel}${gapClause}`;
```

Chacun des quatre fichiers ajoute `import { storyCopy } from "<relatif>/lib/core/story-copy";` et
retire l'import `isFrench` devenu inutilisé (le laisser fait rougir `tsc` avec
`noUnusedLocals`).

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test core/
cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bunx tsc --noEmit && bun test
```
Expected: PASS partout. Les suites françaises existantes (`skills/map-native/tests/locale.test.ts`,
`skills/chart-native/tests/locale.test.ts`) doivent rester vertes octet pour octet — la sortie
française ne change pas, seules `de` et `it` cessent de retomber en anglais.

- [ ] **Step 5: MUTATION — remettre la binarité et constater le rouge**

Dans `lib/core/story-copy.ts`, remettre la binarité :

```ts
export function storyCopy(lang?: Lang): StoryCopy {
  const base =
    typeof lang === "string" ? lang.toLowerCase().split(/[-_]/)[0] : undefined;
  return base === "fr" ? FR : EN;   // MUTATION
}
```

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/story-copy.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `2 fail` — « never leaks English into a German or
an Italian walk » et « ordinals follow the language »). Puis restaurer et relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/story-copy.ts lib/core/story-copy.test.ts lib/core/locale.ts lib/core/locale.test.ts \
        skills/scrolly/src/chapters.ts skills/scrolly/src/Scrolly.tsx \
        skills/chart-native/src/chart-story.ts skills/map-native/src/map-story.ts
git commit -m "fix(i18n): generated story copy covers four languages, not two"
```

---

## Task 3 : un Datawrapper non anglais cesse de perdre l'URL de source

D18 et D12 sont **le même bug** ici, et il est déterministe. `usesNativeSourceCaption(lang)`
(`skills/dw-chart/src/spec-to-metadata.ts:455-457`) est vrai seulement pour l'anglais ou l'absence
de langue. Sinon `specToMetadata` blanchit `source-name` ET `source-url` (`:537-538`) et compose la
ligne à la main dans `annotate.notes` via `sourceNotes` (`:464-471`) — **nom seul**. L'URL est
perdue sur **tout** livrable Datawrapper fr/de/it. `skills/map-dw/src/spec-to-map-metadata.ts:98-105`
est le jumeau exact.

**Files:**
- Modify: `skills/dw-chart/src/spec-to-metadata.ts:464-471`
- Modify: `skills/map-dw/src/spec-to-map-metadata.ts:98-105`
- Modify: `skills/dw-chart/tests/spec-to-metadata.test.ts` (ou le fichier de test existant de ce module)
- Modify: `skills/map-dw/src/spec-to-map-metadata.test.ts`

**Interfaces:**
- Consumes: rien de neuf.
- Produces: `sourceNotes` reste module-privé dans chacun des deux fichiers ; son **contrat de
  sortie** change : `"<label> <name> — <url>"` quand une URL existe, `"<label> <name>"` sinon.

- [ ] **Step 1: Write the failing test**

Dans le fichier de test de `spec-to-metadata` :

```ts
  it("keeps the source URL on a non-English chart instead of dropping it", () => {
    // Deterministic loss, measured: for fr/de/it the native caption is blanked and the
    // self-built annotate.notes line was composed NAME-ONLY, so the URL the journalist gave
    // reached no reader at all.
    const patch = specToMetadata({
      type: "d3-bars",
      title: "T",
      altInsight: "A",
      lang: "fr",
      data: "a,b\n1,2\n",
      source: { name: "OFS", url: "https://www.bfs.admin.ch/x" },
    } as never);
    const notes = (patch.metadata as { annotate?: { notes?: string } }).annotate?.notes ?? "";
    expect(notes).toContain("OFS");
    expect(notes).toContain("https://www.bfs.admin.ch/x");
  });

  it("still says the name alone when there is no URL", () => {
    const patch = specToMetadata({
      type: "d3-bars",
      title: "T",
      altInsight: "A",
      lang: "de",
      data: "a,b\n1,2\n",
      source: { name: "Destatis" },
    } as never);
    const notes = (patch.metadata as { annotate?: { notes?: string } }).annotate?.notes ?? "";
    expect(notes).toBe("Quelle: Destatis");
  });
```

Le même couple de tests, mot pour mot, dans `skills/map-dw/src/spec-to-map-metadata.test.ts` avec
un spec carte (`type: "d3-maps-choropleth"`).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/dw-chart && bun test`
Expected: FAIL — `expected "Source : OFS" to contain "https://www.bfs.admin.ch/x"`.

- [ ] **Step 3: Write minimal implementation**

Dans les DEUX fichiers, remplacer le corps de `sourceNotes` :

```ts
function sourceNotes(spec: {
  source?: { name: string; url?: string };
  lang?: string;
}): string {
  if (usesNativeSourceCaption(spec.lang)) return "";
  if (!spec.source?.name) return "";
  const line = `${sourceLabel(spec.lang)} ${spec.source.name}`;
  // The URL, in PLAIN TEXT after an em dash. On the English path Datawrapper's own
  // `source-url` field carries it; on the localized path that field is blanked (else the
  // footer prints BOTH captions), so without this the URL reaches no reader at all — a
  // deterministic loss on every fr/de/it deliverable. Plain text rather than markdown: the
  // notes band is not a link surface on every DW theme, and a dead `[]()` is worse than a
  // readable address.
  const url = spec.source.url?.trim();
  return url ? `${line} — ${url}` : line;
}
```

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/dw-chart && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-dw/src && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-dw/eval && bun test
```
Expected: PASS. Sans `DATAWRAPPER_API_TOKEN`, les suites qui appellent l'API s'auto-skippent —
c'est le comportement existant, à ne pas contourner.

- [ ] **Step 5: MUTATION — remettre la perte et constater le rouge**

Dans `skills/dw-chart/src/spec-to-metadata.ts`, remettre `return line;` inconditionnel.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/dw-chart && bun test`
Expected: **FAIL**, noter le chiffre (attendu : `1 fail`). Restaurer, relancer : `0 fail`.
Répéter à l'identique sur `skills/map-dw`.

- [ ] **Step 6: Commit**

```bash
git add skills/dw-chart/src/spec-to-metadata.ts skills/dw-chart/tests \
        skills/map-dw/src/spec-to-map-metadata.ts skills/map-dw/src/spec-to-map-metadata.test.ts
git commit -m "fix(dw): a localized source line keeps the URL it was given"
```

---

## Task 4 : une langue hors tables est REFUSÉE au moment de l'offre, et la dette est écrite

**Décision Q2, acquise :** REFUS, énoncé **au moment de l'offre**, pas à la livraison. Pas de
livrable mixte — aujourd'hui un livrable espagnol prend les nombres espagnols de Datawrapper
(`dwLocale` mappe sept langues, `spec-to-metadata.ts:475-489`) sous un `Source:` anglais littéral
(les tables `LOCALES` n'en couvrent que quatre, `lib/core/locale.ts:51-56`). Le refus est enregistré
comme une **DETTE qui doit rétrécir**, pas comme un état.

L'emplacement existe déjà et n'est pas une invention : `lib/brain/eligibility.ts` porte un `refusal`
sur une seule ligne pour tout le run (`:100`, `:236`), et `lib/brain/offer.ts:37` le transporte —
c'est le mécanisme posé par le chantier format-reach.

**Files:**
- Create: `lib/core/language-coverage.ts`
- Create: `lib/core/language-coverage.test.ts`
- Create: `docs/splash/language-debt.md`
- Modify: `lib/brain/eligibility.ts` (`EligibilityInput`, et le bloc de refus run-level `:91-101`)
- Modify: `lib/brain/eligibility.test.ts`
- Modify: `lib/loop/propose.ts` (le passage de `lang` à `buildOffer`)

**Interfaces:**
- Consumes: `lib/core/locale.ts`'s `LOCALES` table (via son export `localeFor`, pour ne pas
  re-typer la liste).
- Produces:
  ```ts
  export const COVERED_LANGS: readonly ["en", "fr", "de", "it"];
  export function isCoveredLang(lang: string | undefined): boolean;
  export function uncoveredLanguageRefusal(lang: string): string;
  ```
  `EligibilityInput` gagne `contentLang?: string`.

- [ ] **Step 1: Write the failing test**

Create `lib/core/language-coverage.test.ts` :

```ts
import { describe, expect, it } from "bun:test";
import {
  COVERED_LANGS,
  isCoveredLang,
  uncoveredLanguageRefusal,
} from "./language-coverage";

describe("the languages splash can actually finish a deliverable in", () => {
  it("covers exactly the four the furniture tables are written for", () => {
    expect([...COVERED_LANGS].sort()).toEqual(["de", "en", "fr", "it"]);
  });

  it("accepts a regional tag of a covered language", () => {
    expect(isCoveredLang("fr-CH")).toBe(true);
    expect(isCoveredLang("de_AT")).toBe(true);
  });

  it("refuses a fifth language rather than shipping a mixed deliverable", () => {
    // The measured mixed shape: Datawrapper renders Spanish numbers (dwLocale maps es-ES)
    // under a literal English "Source:", because the furniture tables have no `es` row.
    expect(isCoveredLang("es")).toBe(false);
    const r = uncoveredLanguageRefusal("es");
    expect(r).toContain("es");
    expect(r).toContain("fr, de, it");
  });

  it("treats an absent language as covered — the run simply has none yet", () => {
    expect(isCoveredLang(undefined)).toBe(true);
    expect(isCoveredLang("")).toBe(true);
  });
});
```

Dans `lib/brain/eligibility.test.ts` :

```ts
  it("refuses the whole run when its language has no furniture", () => {
    const { eligible: legal, refusal } = eligible({
      ...baseInput,
      contentLang: "es",
    });
    expect(legal).toEqual([]);
    expect(refusal ?? "").toContain("es");
  });
```

(`baseInput` = l'entrée de fixture déjà utilisée par les tests voisins de ce fichier.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/language-coverage.test.ts brain/eligibility.test.ts`
Expected: FAIL — `Cannot find module './language-coverage'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/core/language-coverage.ts` :

```ts
// WHICH languages splash can finish a deliverable in — and the refusal it owes when asked for
// another one.
//
// The refusal is stated AT THE OFFER, never at delivery. A fifth language does not fail
// loudly today: Datawrapper's own locale map covers seven tags (dwLocale,
// skills/dw-chart/src/spec-to-metadata.ts), so a Spanish run renders Spanish NUMBERS under a
// literal English "Source:" — a mixed deliverable nobody chose. Offering a form and then
// handing back that is worse than not offering it.
//
// This list is a DEBT, not a state. docs/splash/language-debt.md records what each uncovered
// language needs; the list grows when a row is written, and this module is the one place that
// has to change.
import { localeFor } from "./locale";

export const COVERED_LANGS = ["en", "fr", "de", "it"] as const;

function base(lang: string): string {
  return lang.toLowerCase().split(/[-_]/)[0] ?? "";
}

/** True when the furniture tables have a row for `lang` — or when there is no language at all
 *  (a run that never declared one is not a run in a fifth language; it is a run in the
 *  default, which is covered by construction). */
export function isCoveredLang(lang: string | undefined): boolean {
  if (typeof lang !== "string" || !lang.trim()) return true;
  const b = base(lang.trim());
  // Read from the table rather than restated: localeFor falls back to EN for an unknown tag,
  // so "the table has a row" is exactly "the label is not the English one, or the tag IS en".
  return (
    b === "en" ||
    localeFor(b).source !== localeFor("en").source ||
    (COVERED_LANGS as readonly string[]).includes(b)
  );
}

/** What the journalist is told, at the offer. Names the languages that ARE covered, because a
 *  refusal that does not say what would work is a dead end. */
export function uncoveredLanguageRefusal(lang: string): string {
  const others = COVERED_LANGS.filter((l) => l !== "en").join(", ");
  return (
    `this run is in "${lang}", and splash has no furniture written for it — a deliverable ` +
    `would carry ${lang} numbers under an English "Source:" caption, which is a mix nobody ` +
    `chose. English, ${others} are covered; bring the article in one of those, or add the ` +
    `row (docs/splash/language-debt.md says what a row needs)`
  );
}
```

`lib/brain/eligibility.ts` — `EligibilityInput` gagne le champ, et le refus run-level rejoint le
bloc existant (`:91-101`), AVANT le filtre canal-format :

```ts
  // A language with no furniture is one refusal about the RUN, exactly like a channel that
  // does not carry the requested format — and for the same reason: it is a fact about the run,
  // not about 45 sheets.
  if (!isCoveredLang(input.contentLang))
    return {
      eligible: [],
      excluded: [],
      refusal: uncoveredLanguageRefusal(input.contentLang!),
    };
```

`lib/loop/propose.ts` — passer `contentLang: run.lang` à `buildOffer` (le champ `run.lang` est posé
en tâche 5 ; jusque-là il est `undefined`, ce qui est « couvert » par construction et ne change
donc rien).

Create `docs/splash/language-debt.md` :

```markdown
# Language debt

Splash finishes deliverables in **four** languages: `en`, `fr`, `de`, `it`. Any other is
REFUSED at the offer (`lib/core/language-coverage.ts`), not shipped mixed.

This file is a debt that must SHRINK. It is not a description of a settled state.

## What a fifth language needs

| table | file | what a row is |
|---|---|---|
| furniture labels | `lib/core/locale.ts` `LOCALES` | separators + the `Source:` label |
| generated story copy | `lib/core/story-copy.ts` `STORY_COPY` | superlatives, ordinals, span/gap clauses, photo label |
| source questionnaire | `lib/newsroom/ui-copy.ts` `SOURCE_QUESTION_TABLE` | the five source-class questions |
| Datawrapper locale | `skills/dw-chart/src/spec-to-metadata.ts` `dwLocale` | the regional tag DW reads |
| coverage list | `lib/core/language-coverage.ts` `COVERED_LANGS` | the last line to change, once the four above have a row |

## Already half-there

`dwLocale` maps **seven** tags (`fr, en, de, es, it, nl, pt`). `es`, `nl` and `pt` therefore have
their Datawrapper number formatting and nothing else — which is exactly the mixed deliverable the
refusal exists to prevent. They are the three cheapest rows to complete.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test`
Expected: PASS.

- [ ] **Step 5: MUTATION — remettre le laisser-passer et constater le rouge**

Dans `lib/core/language-coverage.ts`, remettre `export function isCoveredLang() { return true; }`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/language-coverage.test.ts brain/eligibility.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `2 fail` — le refus de la cinquième langue et le
refus run-level). Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/language-coverage.ts lib/core/language-coverage.test.ts \
        lib/brain/eligibility.ts lib/brain/eligibility.test.ts lib/loop/propose.ts \
        docs/splash/language-debt.md
git commit -m "feat(brain): a language with no furniture is refused at the offer"
```

---

## Task 5 : la langue de l'article est DÉCLARÉE et enregistrée sur le run

Le porteur manque au premier hop. Vérifié : `grep -rniE "detectLang|detectLanguage|franc|langdetect"` sur
`lib/ skills/ scripts/ commands/` ne ramène **aucun hit de code**, et aucune dépendance de détection
n'est déclarée dans `package.json`. La seule mention de « détection » est une instruction de prompt
(`skills/suggest-chart/SKILL.md:29-47`, « in the language of the article (detected upstream) ») —
rien, en amont, ne détecte.

**Décision Q1, acquise :** aucune dépendance de détection n'est ajoutée. **L'étape qui lit l'article
DÉCLARE la langue qu'elle y a lue** — dans la boucle, c'est le déclarant du run, qui est l'appelant
(la chaîne en prose ou le journaliste via la façade). Et **aucune question CADRAGE nouvelle** (le
plafond de 6 est déjà dépassé, D20) : c'est un **confirm-back** accroché à un échange existant, la
prochaine action rendue par la façade.

**Files:**
- Modify: `lib/loop/init.ts:51-68` (`RunDeclarationSchema`), `:101` (`initRun`), `:200-210`
- Modify: `lib/loop/manifest.ts:324-347` (`RunManifestSchema`)
- Modify: `lib/host/drive.ts:195-212` (`initRunIn`)
- Modify: `lib/loop/init.test.ts`, `lib/loop/manifest.test.ts`, `lib/host/drive.test.ts`

**Interfaces:**
- Consumes: `resolveLanguage` (tâche 1), `isCoveredLang` (tâche 4).
- Produces:
  ```ts
  // lib/loop/init.ts
  export function initRun(
    runDir: string,
    raw: unknown,
    opts?: { profileLang?: string },
  ): VerbResult<RunManifest>;
  // RunDeclarationSchema.input gains: articleLang: z.string().trim().min(2).optional()
  // RunManifestSchema gains:          lang: z.string().min(2).optional()
  ```

- [ ] **Step 1: Write the failing test**

Dans `lib/loop/init.test.ts` :

```ts
  it("records the language the article was declared to be in", () => {
    const dir = mkdtempSync(join(tmpdir(), "init-lang-"));
    const data = join(dir, "d.csv");
    writeFileSync(data, "a,b\n1,2\n");
    const r = initRun(join(dir, "run"), {
      runId: "r1",
      input: { data, articleLang: "it" },
      sources: { mode: "test", data: { kind: "synthetic", label: "demo" } },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.lang).toBe("it");
  });

  it("falls back to the house profile only when no article language was declared", () => {
    const dir = mkdtempSync(join(tmpdir(), "init-lang-"));
    const data = join(dir, "d.csv");
    writeFileSync(data, "a,b\n1,2\n");
    const r = initRun(
      join(dir, "run"),
      {
        runId: "r2",
        input: { data },
        sources: { mode: "test", data: { kind: "synthetic", label: "demo" } },
      },
      { profileLang: "fr" },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.lang).toBe("fr");
  });

  it("does not let the house profile overwrite the article's language", () => {
    const dir = mkdtempSync(join(tmpdir(), "init-lang-"));
    const data = join(dir, "d.csv");
    writeFileSync(data, "a,b\n1,2\n");
    const r = initRun(
      join(dir, "run"),
      {
        runId: "r3",
        input: { data, articleLang: "en" },
        sources: { mode: "test", data: { kind: "synthetic", label: "demo" } },
      },
      { profileLang: "fr" },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.lang).toBe("en");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/init.test.ts`
Expected: FAIL — la déclaration stricte refuse `articleLang` (`input.articleLang: Unrecognized key`),
et `r.value.lang` n'existe pas au type.

- [ ] **Step 3: Write minimal implementation**

`lib/loop/init.ts` — `RunDeclarationSchema.input` :

```ts
  input: z.strictObject({
    data: z.string().min(1).optional(),
    article: z.string().min(1).optional(),
    /** The language the ARTICLE is written in, DECLARED by whoever read it. NEVER detected:
     *  no detection dependency exists in this repo and none is added — a wrong guess would
     *  produce a wrong deliverable that nobody decided, which is the exact defect shape this
     *  tranche removes. The step that reads the article states what it read. */
    articleLang: z.string().trim().min(2).optional(),
    images: ImageInputSchema.optional(),
  }),
```

`lib/loop/manifest.ts` — `RunManifestSchema`, après `channel` :

```ts
  /** The language this run's DELIVERABLES are made in — resolved ONCE, at init, from the
   *  declared article language and the house profile (lib/newsroom/language.ts's priority:
   *  explicit override > article > profile). One writer (initRun), one reader (briefFor).
   *
   *  Optional so every manifest already on disk stays readable; absent means "English
   *  furniture", which is exactly what the loop rendered before this field existed. */
  lang: z.string().min(2).optional(),
```

`lib/loop/init.ts` — `initRun` :

```ts
export function initRun(
  runDir: string,
  raw: unknown,
  opts: { profileLang?: string } = {},
): VerbResult<RunManifest> {
```

et, à la construction du manifeste (là où `route`, `channel` et `input` sont posés, autour de
`:200-210`) :

```ts
  // Resolved HERE and nowhere else. produce() gets a manifest, not ambient state — the
  // discipline lib/core/production-brief.ts:7 states — so resolving per-produce would give the
  // same run two languages depending on when it ran.
  const language = resolveLanguage({
    ...(decl.input.articleLang ? { articleLang: decl.input.articleLang } : {}),
    ...(opts.profileLang ? { profileLang: opts.profileLang } : {}),
  }).content;
```

puis, dans l'objet manifeste, `...(language !== DEFAULT_UI_LANG || decl.input.articleLang ? { lang: language } : {})` —
c'est-à-dire : on écrit `lang` dès qu'une langue a été **établie** par quelqu'un, et on laisse le
champ absent quand rien n'a été déclaré et que le profil est vide (identité byte-pour-byte avec les
manifestes existants).

`lib/host/drive.ts` — `initRunIn` :

```ts
export function initRunIn(runDir: string, declaration: unknown): HostResponse {
  const owed = undeclaredSourceQuestion(declaration);
  if (owed) return { ok: false, code: "invalid-request", message: owed };

  // The house language, as the LAST resort under the declared article language. tryLoadDecor
  // is already this file's way of reaching the install's own facts (:491).
  const decor = tryLoadDecor();
  const created = initRun(runDir, declaration, {
    profileLang: decor.language.content,
  });
  if (!created.ok) return refusedDecision(created);
  return {
    ok: true,
    value: {
      runId: created.value.runId,
      // The confirm-back, attached to an exchange that already exists rather than a seventh
      // CADRAGE question (the cap of six is already exceeded — D20, 9/83): the journalist
      // reads the language the deliverables will be made in alongside what to do next, and
      // vetoes it there.
      lang: created.value.lang ?? "en",
      nextActions: nextActions(created.value),
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test`
Expected: PASS. Les fixtures de manifeste existantes n'ont pas `lang` et restent valides
(le champ est `.optional()`).

- [ ] **Step 5: MUTATION — remettre l'écrasement et constater le rouge**

Dans `lib/loop/init.ts`, remettre la priorité inversée :

```ts
  const language = resolveLanguage({
    ...(opts.profileLang ? { articleLang: opts.profileLang } : {}),        // MUTATION
    ...(decl.input.articleLang ? { profileLang: decl.input.articleLang } : {}),
  }).content;
```

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/init.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `1 fail` — « does not let the house profile
overwrite the article's language », `expected "en", received "fr"`). Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/init.ts lib/loop/init.test.ts lib/loop/manifest.ts lib/loop/manifest.test.ts \
        lib/host/drive.ts lib/host/drive.test.ts
git commit -m "feat(loop): a run records the language its article was declared to be in"
```

---

## Task 6 : `ProductionBrief.lang` — le porteur atteint les six assembleurs, et les deux gardes affamés rougissent

C'est le geste que la boucle DÉCLINE explicitement aujourd'hui, `lib/loop/produce.ts:211-213`
(corrigé : `:211`, pas `:210`) :

> `// No lang: the loop carries no language axis yet (the manifest has no locale, and produce`
> `// sets no NativeSpec.lang either, so the engine already renders English furniture).`

Le manifeste en a une maintenant (tâche 5). Tout l'aval est câblé et affamé :
`ChartFrame.tsx:149`, `MapFrame.tsx:191`, `Scrolly.tsx:781`, `lib/source/furniture.ts:99` lisent
tous `lang`. Et **deux gardes deviennent capables de rougir** :
`furnitureGateApplies(lang)` (`skills/chart-native/scripts/lib/furniture-i18n.mjs:40-42`) et
`localizedSourceViolations` (`lib/core/i18n-furniture.ts:64-66`) retournent tous deux vide quand
`lang` est `undefined`. Les fuites qu'ils vont révéler ont été fermées aux tâches 2 et 3 — c'est
l'ordre imposé, et c'est pour ça.

**Files:**
- Modify: `lib/core/production-brief.ts:51-68`
- Modify: `lib/loop/assemble/brief.ts:27-54`
- Modify: `lib/loop/assemble/chart-native.ts`, `map-native.ts`, `dw-chart.ts`, `map-dw.ts`, `image-native.ts`
- Modify: `lib/loop/produce.ts:201-213` (le commentaire disparaît avec sa cause)
- Modify: `lib/loop/assemble/*.test.ts`, `lib/loop/produce.test.ts`

**Interfaces:**
- Consumes: `run.lang` (tâche 5).
- Produces:
  ```ts
  // lib/core/production-brief.ts
  export type ProductionBrief = {
    /* … unchanged … */
    /** The deliverable's language, resolved once at init and carried — never guessed here. */
    lang?: string;
  };
  ```
  Les cinq assembleurs émettent `...(brief.lang ? { lang: brief.lang } : {})`. `assembleScrolly`
  n'en émet aucun : il délègue (voir tâche 10).

- [ ] **Step 1: Write the failing test**

Dans `lib/loop/assemble/chart-native.test.ts` (et le pendant dans `map-native.test.ts`,
`dw-chart.test.ts`, `map-dw.test.ts`, `image-native.test.ts`) :

```ts
  it("carries the run's language onto the engine spec", () => {
    const spec = assembleChartNative({ ...baseBrief, lang: "de" }) as {
      ok: true;
      value: { lang?: string };
    };
    expect(spec.value.lang).toBe("de");
  });

  it("omits lang entirely when the run has none — byte-identical to before", () => {
    const spec = assembleChartNative(baseBrief) as { ok: true; value: object };
    expect("lang" in spec.value).toBe(false);
  });
```

Et dans `lib/loop/assemble/brief.test.ts` :

```ts
  it("takes the language off the manifest, never off ambient state", () => {
    const b = briefFor(
      { ...baseRun, lang: "it" },
      baseElement,
      "a,b\n1,2\n",
      "OFS",
      undefined,
      "static",
    );
    expect(b.lang).toBe("it");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/assemble/`
Expected: FAIL — `'lang' does not exist in type 'ProductionBrief'` au typecheck, puis
`expected "de", received undefined`.

- [ ] **Step 3: Write minimal implementation**

`lib/core/production-brief.ts`, dans `ProductionBrief` après `sourceKind` :

```ts
  /** The language this deliverable is made in — resolved ONCE at init (lib/loop/init.ts) and
   *  carried here. produce() used to decline to set it, with a comment saying the loop had no
   *  language axis; the axis is the manifest's `lang` field and this is where it lands.
   *  Absent means English furniture, which is what the engines rendered before. */
  lang?: string;
```

`lib/loop/assemble/brief.ts`, dans l'objet retourné :

```ts
    ...(run.lang ? { lang: run.lang } : {}),
```

`lib/loop/assemble/chart-native.ts`, dans `ok({ … })` :

```ts
    ...(brief.lang ? { lang: brief.lang } : {}),
```

Le même ajout, mot pour mot, dans `image-native.ts` (à côté de son `source`), dans `map-dw.ts`
(à côté de `:164`), dans les **quatre** branches `ok({ … })` de `map-native.ts` (choroplèthe `:224`,
cartogramme, dot-density `:208`, route `:272`, locator `:287` — soit tous les retours `ok` du
fichier), et dans `dw-chart.ts` : y **supprimer** le paragraphe « DELIBERATELY ABSENT » relatif à
`lang` (`:53-55`) et émettre le champ à côté de `source` :

```ts
    ...(brief.lang ? { lang: brief.lang } : {}),
```

`lib/loop/produce.ts:211-213` — retirer les trois lignes « No lang » et laisser à leur place :

```ts
  // The language is on the MANIFEST (run.lang, resolved once at init) and reaches the engines
  // through briefFor. It is not resolved here: produce() gets a manifest, never ambient state.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test`
Expected: PASS.

Puis la preuve que les deux gardes affamés SAVENT désormais rougir — c'est le cœur de cette famille,
et un test le fixe. Ajouter dans `lib/core/i18n-furniture.test.ts` :

```ts
  it("is starved without a language and bites with one", () => {
    const englishPatch = { "source-name": "OFS", "source-url": "https://x.ch/y" };
    // Starved: no lang → nothing to compare against, so nothing is ever reported.
    expect(localizedSourceViolations(englishPatch, {})).toEqual([]);
    // Fed: a French deliverable whose metadata still carries the English caption fields.
    expect(
      localizedSourceViolations(englishPatch, { lang: "fr", source: { name: "OFS" } }),
    ).not.toEqual([]);
  });
```

- [ ] **Step 5: MUTATION — remettre la famine et constater le rouge**

Dans `lib/loop/assemble/brief.ts`, remettre l'omission : supprimer la ligne
`...(run.lang ? { lang: run.lang } : {}),`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/assemble/`
Expected: **FAIL**, noter le chiffre (attendu : `6 fail` — un « carries the run's language » par
assembleur, plus celui de `brief.test.ts`). Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/production-brief.ts lib/loop/assemble lib/loop/produce.ts lib/core/i18n-furniture.test.ts
git commit -m "feat(loop): the deliverable's language reaches the engines"
```

---

## Task 7 : la garde locale-reach — un nombre visible peint sans helper ROUGIT

**Décision Q4, acquise :** D28 est la CLASSE, pas la ligne. Mais le levier n'est pas 21 preuves au
rendu à la main : c'est **une garde mécanique**. Sans elle, le 23ᵉ site réapparaît le mois prochain.

**Correction de la spec, mesurée.** Le registre annonçait « correctif d'une ligne » ; la spec
annonçait « 21 sites sur 28, 13 chart-native + 8 map-native ». Les deux sont faux :

```
$ cd /Users/rmdms/Sites/Professional/splash-merge
$ grep -rn "toFixed(" skills/chart-native/src skills/map-native/src skills/scrolly/src | wc -l
      40
$ grep -rl "toFixed(" skills/chart-native/src skills/map-native/src skills/scrolly/src | wc -l
      28
$ for f in $(grep -rl "toFixed(" skills/chart-native/src skills/map-native/src skills/scrolly/src); do \
    grep -qE "formatLocaleNumber|localizeDecimal|localizeNumberString|labelWithUnit" "$f" || echo "$f"; done | wc -l
      24
```

24 fichiers peignent un `toFixed` sans jamais appeler un helper de locale. **Deux** sont
diagnostiques (leurs chaînes vont dans un message de violation de conformité, jamais chez un
lecteur) : `skills/chart-native/src/core/conformance.ts`, `skills/map-native/src/conformance.ts`.
Reste **22 fichiers visibles aveugles** : **11** chart-native + **9** map-native + **2** scrolly —
la spec omet `skills/scrolly/` entièrement.

**Files:**
- Create: `lib/core/locale-reach.ts`
- Create: `lib/core/locale-reach.test.ts`
- Create: `skills/chart-native/tests/locale-reach.test.ts`
- Create: `skills/map-native/tests/locale-reach.test.ts`
- Create: `skills/scrolly/tests/locale-reach.test.ts`

**Interfaces:**
- Consumes: rien (`lib/core` n'importe rien ; les tests de chaque moteur font le `readdirSync`).
- Produces:
  ```ts
  export type NumberPaintSite = { line: number; text: string };
  export type SourceFile = { path: string; source: string };
  export function numberPaintSites(source: string): NumberPaintSite[];
  export function callsLocaleHelper(source: string): boolean;
  export function localeReachViolations(
    files: SourceFile[],
    opts: { exempt: readonly string[] },
  ): string[];
  export function staleExemptions(
    files: SourceFile[],
    opts: { exempt: readonly string[] },
  ): string[];
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/core/locale-reach.test.ts` :

```ts
import { describe, expect, it } from "bun:test";
import {
  callsLocaleHelper,
  localeReachViolations,
  numberPaintSites,
  staleExemptions,
} from "./locale-reach";

const BLIND = `const fmt = (v: number) => v.toFixed(1);\nreturn fmt(x);\n`;
const SEEING = `import { localizeNumberString } from "./locale";\nconst f = (v: number) => localizeNumberString(v.toFixed(1), lang);\n`;

describe("the locale-reach drift guard", () => {
  it("sees a number painted without a locale helper", () => {
    expect(numberPaintSites(BLIND)).toHaveLength(1);
    expect(callsLocaleHelper(BLIND)).toBe(false);
    expect(localeReachViolations([{ path: "a.tsx", source: BLIND }], { exempt: [] }))
      .toHaveLength(1);
  });

  it("says nothing about a number that goes through one", () => {
    expect(callsLocaleHelper(SEEING)).toBe(true);
    expect(localeReachViolations([{ path: "b.tsx", source: SEEING }], { exempt: [] }))
      .toEqual([]);
  });

  it("honours a named exemption", () => {
    expect(
      localeReachViolations([{ path: "a.tsx", source: BLIND }], { exempt: ["a.tsx"] }),
    ).toEqual([]);
  });

  it("reports an exemption that no longer applies, so the debt list cannot rot", () => {
    expect(
      staleExemptions([{ path: "b.tsx", source: SEEING }], { exempt: ["b.tsx"] }),
    ).toEqual(["b.tsx"]);
  });
});
```

Create `skills/chart-native/tests/locale-reach.test.ts` :

```ts
import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  localeReachViolations,
  staleExemptions,
  type SourceFile,
} from "../../../lib/core/locale-reach";

const SRC = join(import.meta.dir, "..", "src");

/** Diagnostic-only: these strings go into a conformance VIOLATION message, never to a reader.
 *  Measured, not assumed — both files' toFixed sites are inside `violations.push(...)`. */
const DIAGNOSTIC_ONLY = ["core/conformance.ts"];

/** THE DEBT. Every entry here paints a number a reader sees, in whatever language the browser's
 *  default happens to be. It must shrink to [] — task 8 of
 *  docs/superpowers/plans/2026-07-29-family-b-what-reaches-the-reader.md empties it. An entry
 *  that no longer applies fails `staleExemptions`, so the list cannot rot either. */
const KNOWN_BLIND: string[] = [
  "BoxplotChart.tsx",
  "BulletChart.tsx",
  "ComboChart.tsx",
  "DotStripChart.tsx",
  "LollipopChart.tsx",
  "LorenzChart.tsx",
  "ParallelChart.tsx",
  "SankeyChart.tsx",
  "SlopeChart.tsx",
  "ViolinChart.tsx",
  "WaffleChart.tsx",
];

function walk(dir: string, prefix = ""): SourceFile[] {
  const out: SourceFile[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      out.push({ path: rel, source: readFileSync(full, "utf8") });
  }
  return out;
}

const exempt = [...DIAGNOSTIC_ONLY, ...KNOWN_BLIND];

test("no NEW chart-native file paints a number without a locale helper", () => {
  expect(localeReachViolations(walk(SRC), { exempt })).toEqual([]);
});

test("the debt list carries no entry that is already fixed", () => {
  expect(staleExemptions(walk(SRC), { exempt })).toEqual([]);
});
```

Les deux jumeaux, mot pour mot, avec leur propre `KNOWN_BLIND` :

- `skills/map-native/tests/locale-reach.test.ts` — `DIAGNOSTIC_ONLY = ["conformance.ts"]`,
  `KNOWN_BLIND = ["cartogram-story.ts", "hex-grid-story.ts", "dot-density-story.ts",
  "components/CartogramStory.tsx", "components/CartogramScrolly.tsx",
  "components/CartogramReveal.tsx", "components/HexGridStory.tsx",
  "components/HexGridScrolly.tsx", "components/HexGridReveal.tsx"]`.
- `skills/scrolly/tests/locale-reach.test.ts` — `DIAGNOSTIC_ONLY = []`,
  `KNOWN_BLIND = ["ScrollyCartogramMap.tsx", "ScrollyHexMap.tsx"]`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/locale-reach.test.ts`
Expected: FAIL — `Cannot find module './locale-reach'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/core/locale-reach.ts` :

```ts
// A number a reader SEES must go through the locale table. This module is the guard that makes
// that checkable — not a new detection: the helpers exist (lib/core/locale.ts), and 22 visible
// files simply never call them, so a French chart printed "52.0" and a French cartogram printed
// "3.5" with an English decimal point.
//
// The point of a GUARD rather than 22 fixes: the 23rd site would reappear the next month, and
// nobody would notice until a run in the field. This is a drift guard in the same family as
// lib/brain/typology-drift.test.ts — pure here, fed the tree by each engine's own test.
//
// lib/core imports nothing.

export type NumberPaintSite = { line: number; text: string };
export type SourceFile = { path: string; source: string };

// `.toFixed(` is the whole vocabulary on purpose: it is what the 40 measured sites use, and a
// broader pattern (String(n), template interpolation of a number) cannot be told apart from an
// id or a pixel coordinate without types. A guard that fires on pixel maths is a guard people
// disable.
const PAINT = /\.toFixed\s*\(/;
const HELPERS =
  /\b(formatLocaleNumber|localizeDecimal|localizeNumberString|labelWithUnit)\s*\(/;

export function numberPaintSites(source: string): NumberPaintSite[] {
  const out: NumberPaintSite[] = [];
  source.split("\n").forEach((text, i) => {
    if (PAINT.test(text)) out.push({ line: i + 1, text: text.trim() });
  });
  return out;
}

export function callsLocaleHelper(source: string): boolean {
  return HELPERS.test(source);
}

function offends(f: SourceFile): boolean {
  return numberPaintSites(f.source).length > 0 && !callsLocaleHelper(f.source);
}

/** One sentence per offending file that is NOT exempt. */
export function localeReachViolations(
  files: SourceFile[],
  opts: { exempt: readonly string[] },
): string[] {
  return files
    .filter((f) => offends(f) && !opts.exempt.includes(f.path))
    .map((f) => {
      const sites = numberPaintSites(f.source);
      return (
        `${f.path} paints ${sites.length} number(s) without a locale helper ` +
        `(first at line ${sites[0]!.line}: ${sites[0]!.text}) — route it through ` +
        `localizeNumberString/formatLocaleNumber with the deliverable's lang`
      );
    });
}

/** Exemptions that no longer apply: the file was fixed (or deleted) and the debt list still
 *  names it. Without this the list rots into a permanent allowlist. */
export function staleExemptions(
  files: SourceFile[],
  opts: { exempt: readonly string[] },
): string[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  return opts.exempt.filter((p) => {
    const f = byPath.get(p);
    return f === undefined ? false : !offends(f);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test core/locale-reach.test.ts
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/locale-reach.test.ts
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test tests/locale-reach.test.ts
cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bun test tests/locale-reach.test.ts
```
Expected: PASS partout — la dette est nommée, donc exemptée, et aucune exemption n'est périmée.

- [ ] **Step 5: MUTATION — introduire un 23ᵉ site et constater le rouge**

Créer un fichier jetable `skills/chart-native/src/__mutation.tsx` :

```tsx
export const f = (v: number) => v.toFixed(2);
```

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/locale-reach.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `1 fail`, message
`__mutation.tsx paints 1 number(s) without a locale helper`). Supprimer le fichier, relancer :
`0 fail`. **Puis la seconde mutation** — retirer `"SlopeChart.tsx"` de `KNOWN_BLIND` et relancer :
`1 fail` (le garde voit bien la dette existante, il ne la voit pas *parce que* la liste le lui
cache). Remettre l'entrée.

- [ ] **Step 6: Commit**

```bash
git add lib/core/locale-reach.ts lib/core/locale-reach.test.ts \
        skills/chart-native/tests/locale-reach.test.ts \
        skills/map-native/tests/locale-reach.test.ts \
        skills/scrolly/tests/locale-reach.test.ts
git commit -m "test(locale): a visible number painted without the locale table reddens"
```

---

## Task 8 : les onze formateurs aveugles de chart-native

D28 dans son symptôme nommé et ses dix jumeaux. Le sweep décrit deux défauts imbriqués : « décimale
parasite sur des entiers » ET « point décimal anglais » (`sweep-2026-07-28-triage.md:344-351`).
`SlopeChart.tsx` est le seul des onze à ne traiter **ni** l'un **ni** l'autre — quatre autres
(`ViolinChart`, `DotStripChart`, `ComboChart`, `SankeyChart`) gèrent déjà le cas entier sans
localiser le séparateur.

Le helper juste est `localizeNumberString` (`lib/core/locale.ts:113-124`), **pas**
`formatLocaleNumber` : il préserve exactement les décimales que l'appelant a choisies, ce qui est
indispensable ici — `SlopeChart.tsx:99-101` dimensionne ses gouttières **sur les chaînes exactes
dessinées**, donc mesure et rendu doivent passer par la même expression.

Les onze fichiers portent déjà `lang` dans leur config et l'importent en **type seul** :

```
$ grep -rln "import type { Lang }" skills/chart-native/src | wc -l
      40
```

**Files (11 modifiés + les tests) :**
- Modify: `skills/chart-native/src/BoxplotChart.tsx`, `BulletChart.tsx`, `ComboChart.tsx`,
  `DotStripChart.tsx`, `LollipopChart.tsx`, `LorenzChart.tsx`, `ParallelChart.tsx`,
  `SankeyChart.tsx`, `SlopeChart.tsx`, `ViolinChart.tsx`, `WaffleChart.tsx`
- Modify: `skills/chart-native/tests/locale.test.ts`
- Modify: `skills/chart-native/tests/locale-reach.test.ts` (vider `KNOWN_BLIND`)

**Interfaces:**
- Consumes: `localizeNumberString` de `lib/core/locale.ts` (via le shim `./core/locale`, qui
  ré-exporte : `skills/chart-native/src/core/locale.ts` est `export * from "../../../../lib/core/locale";`).
- Produces: aucune API nouvelle. Le **contrat de sortie** change : un chart fr/de/it imprime
  `"3 200"` et `"52"` là où il imprimait `"3200.0"` et `"52.0"`.

- [ ] **Step 1: Write the failing test**

Dans `skills/chart-native/tests/locale.test.ts` :

```ts
import { renderSlopeChart } from "../src/SlopeChart";

it("prints slope value labels in the deliverable's language, integers bare", () => {
  // The measured defect: a French chart showed "52.0" and "3200.0" — a parasitic decimal on
  // an integer AND an English decimal point. Both halves, one expression.
  const svg = renderSlopeChart({
    ...slopeFixture,          // the fixture this file already builds for the English case
    lang: "fr",
    rows: [{ label: "Cadres", left: 3200, right: 52.4 }],
  });
  expect(svg).toContain("3 200");
  expect(svg).toContain("52,4");
  expect(svg).not.toContain("3200.0");
  expect(svg).not.toContain("52.0");
});
```

(`renderSlopeChart` est le nom d'export réel du module — le vérifier avec
`grep -n "^export" skills/chart-native/src/SlopeChart.tsx` et l'utiliser tel quel ; si le module
n'expose qu'un composant React, rendre via le même chemin que les tests voisins de ce fichier.)

Un test équivalent, deux lignes, pour **chacun** des dix autres — même forme : une valeur entière et
une valeur décimale, en `fr`, et l'assertion négative sur la forme anglaise.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/locale.test.ts`
Expected: FAIL — `expected … to contain "3 200"`, la sortie contient `3200.0`.

- [ ] **Step 3: Write minimal implementation**

Dans les onze fichiers, l'import de type devient un import de valeur :

```ts
import { localizeNumberString, type Lang } from "./core/locale";
```

et **chaque** formateur local devient la même expression. Pour `SlopeChart.tsx`, les deux
formateurs (`:102` et `:293`) :

```ts
  // ONE expression, used for measurement AND for painting: the gutters are sized from the
  // exact strings drawn (see the note above), so a second formatter here would size the
  // gutter for "52.0" and draw "52,4".
  //   - an integer stays bare: the sweep's "52.0" / "3200.0" were a parasitic decimal.
  //   - a decimal keeps ONE place, then takes the language's separators.
  const fmtVal = (v: number) =>
    localizeNumberString(
      Number.isInteger(v) ? String(v) : v.toFixed(1),
      config.lang,
    );
```

et le tooltip (`:244-248`) ainsi que l'`aria-label` (`:427`) appellent `fmtVal` au lieu de
`.toFixed(1)` en ligne. Les dix autres fichiers ont exactement un formateur chacun ; y appliquer la
même expression, en lisant `config.lang` (ou `spec.lang` selon le nom local du paramètre, à vérifier
fichier par fichier).

Puis vider la dette dans `skills/chart-native/tests/locale-reach.test.ts` :

```ts
const KNOWN_BLIND: string[] = [];
```

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bunx tsc --noEmit && bun test
```
Expected: PASS, y compris `tests/locale-reach.test.ts` désormais sans dette, et les suites de
label-fit existantes (les gouttières sont mesurées sur la nouvelle chaîne, donc cohérentes).

- [ ] **Step 5: MUTATION — remettre un `toFixed` nu et constater le DOUBLE rouge**

Dans `skills/chart-native/src/SlopeChart.tsx`, remettre `const fmtVal = (v: number) => Number(v).toFixed(1);`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test`
Expected: **FAIL deux fois**, noter les chiffres — le test de rendu français (`tests/locale.test.ts`)
ET la garde de dérive (`tests/locale-reach.test.ts`, qui n'exempte plus `SlopeChart.tsx`). C'est la
démonstration que le garde de la tâche 7 attrape la régression même si personne n'a écrit le test
de rendu. Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add skills/chart-native/src skills/chart-native/tests
git commit -m "fix(chart-native): value labels follow the deliverable's number locale"
```

---

## Task 9 : les onze modules du bloc carto/hex qui n'importent aucun helper

**Correction de la spec :** elle annonce « huit sites (`cartogram-story.ts`, `hex-grid-story.ts`,
`dot-density-story.ts` + leurs six composants) ». Mesuré : **onze** modules n'importent aucun helper
de locale, et les composants **dot-density n'en font pas partie** — ils sont déjà localisés
(`DotDensityStory.tsx:77`, `DotDensityScrolly.tsx:40`, `DotDensityReveal.tsx:33`,
`ScrollyDotDensityMap.tsx:19` importent `formatLocaleNumber`). Seul `dot-density-story.ts` lui-même
est aveugle. Les deux modules que la spec omet sont dans `skills/scrolly/`.

La liste exacte, telle que les `KNOWN_BLIND` de la tâche 7 la nomment :
`map-native/src/{cartogram,hex-grid,dot-density}-story.ts` ·
`map-native/src/components/{Cartogram,HexGrid}{Story,Scrolly,Reveal}.tsx` ·
`scrolly/src/Scrolly{Cartogram,Hex}Map.tsx`.

Les huit composants partagent **un seul et même motif**, à deux lignes près :

```ts
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
…
`<span style="font:11px/1.2 sans-serif;color:${sub}">${fmt(b.min)}–${fmt(b.max)}</span>`
```

(`HexGridStory.tsx:449/459`, `HexGridScrolly.tsx:290/300`, `HexGridReveal.tsx:196/206`,
`CartogramStory.tsx:461/471`, `CartogramScrolly.tsx:303/313`, `CartogramReveal.tsx:207/217`,
`ScrollyCartogramMap.tsx:273/283`, `ScrollyHexMap.tsx:255/265`.)

Et les trois `Meta` n'ont **aucun champ `lang`** — la langue ne peut pas être branchée sans un
changement d'API. C'est ça, le vrai travail.

**Files:**
- Modify: `skills/map-native/src/cartogram-story.ts:41`, `hex-grid-story.ts:45-50`,
  `dot-density-story.ts:19-25` (+ leurs types `Meta`)
- Modify: `skills/map-native/src/components/{Cartogram,HexGrid}{Story,Scrolly,Reveal}.tsx`
- Modify: `skills/scrolly/src/Scrolly{Cartogram,Hex}Map.tsx`
- Modify: `skills/map-native/tests/locale-reach.test.ts`, `skills/scrolly/tests/locale-reach.test.ts` (vider `KNOWN_BLIND`)
- Modify: `skills/map-native/tests/locale.test.ts`

**Interfaces:**
- Consumes: `localizeNumberString`, `storyCopy` (tâche 2).
- Produces:
  ```ts
  // skills/map-native/src/cartogram-story.ts
  export type CartogramStoryMeta = { /* … existing … */ lang?: string };
  // idem HexGridStoryMeta, DotDensityStoryMeta
  ```
  Les huit composants reçoivent `config.lang` (déjà présent sur leurs configs — il est threadé pour
  le libellé de source) et le passent au formateur de légende.

- [ ] **Step 1: Write the failing test**

Dans `skills/map-native/tests/locale.test.ts` :

```ts
import { deriveCartogramStory } from "../src/cartogram-story";
import { deriveHexGridStory } from "../src/hex-grid-story";
import { deriveDotDensityStory } from "../src/dot-density-story";

it("cartogram, hex-grid and dot-density callouts follow the deliverable's language", () => {
  // These three modules imported NO locale helper at all — a French cartogram printed "3.5"
  // with an English decimal point while every other map type printed "3,5".
  const c = deriveCartogramStory(cartogramLayoutFixture, { lang: "fr" });
  expect(JSON.stringify(c)).toContain("3,5");
  expect(JSON.stringify(c)).not.toContain("3.5");

  const h = deriveHexGridStory(hexLayoutFixture, { lang: "de" });
  expect(JSON.stringify(h)).not.toContain(" avg");   // English word in a German walk

  const d = deriveDotDensityStory(dotLayoutFixture, { lang: "it" });
  expect(JSON.stringify(d)).toContain("1,2k");
});
```

(Les trois fixtures de layout sont celles que les tests voisins de ce fichier construisent déjà ;
les réutiliser plutôt qu'en écrire de nouvelles.)

Et pour les huit légendes, un test unique dans le même fichier :

```ts
it("the eight cartogram/hex legends print a French bin range", () => {
  const html = renderHexGridStoryLegend({ ...hexConfigFixture, lang: "fr" });
  expect(html).toContain("1 200");
  expect(html).not.toContain("1200");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bun test tests/locale.test.ts`
Expected: FAIL — `deriveCartogramStory` n'accepte pas de second argument ; sortie `3.5`.

- [ ] **Step 3: Write minimal implementation**

Les trois `Meta` gagnent le champ, et le formateur devient local-aware. `cartogram-story.ts:41` :

```ts
import { localizeNumberString } from "./core/locale";
…
  const fmt = (v: number) =>
    localizeNumberString(
      Number.isInteger(v) ? String(v) : v.toFixed(1),
      meta.lang,
    );
```

`hex-grid-story.ts:45-50` — le nombre ET les deux mots anglais (`"avg"`, `"points"`) passent par
la table de la tâche 2, qui gagne pour l'occasion deux entrées :

```ts
  const n = (v: number) =>
    localizeNumberString(
      Number.isInteger(v) ? String(v) : v.toFixed(1),
      meta.lang,
    );
  const copy = storyCopy(meta.lang);
  const fmt = (v: number) =>
    layout.aggregate === "mean"
      ? copy.meanOf(`${n(v)}${unit}`)
      : layout.aggregate === "sum"
        ? `${n(Math.round(v))}${unit}`
        : copy.pointCount(n(Math.round(v)));
```

`lib/core/story-copy.ts` gagne donc, dans `StoryCopy` et ses quatre lignes :

```ts
  /** "12 avg" — a mean-aggregated hex cell's callout. */
  meanOf: (value: string) => string;
  /** "1 200 points" — a count-aggregated hex cell's callout. */
  pointCount: (value: string) => string;
```

et les quatre rangées gagnent leurs deux entrées :

```ts
// in EN
  meanOf: (value) => `${value} avg`,
  pointCount: (value) => `${value} points`,
// in FR
  meanOf: (value) => `${value} en moyenne`,
  pointCount: (value) => `${value} points`,
// in DE
  meanOf: (value) => `${value} im Mittel`,
  pointCount: (value) => `${value} Punkte`,
// in IT
  meanOf: (value) => `${value} in media`,
  pointCount: (value) => `${value} punti`,
```

`dot-density-story.ts:19-25` — `formatCompact` prend la langue et localise la décimale de
l'abréviation (`localizeDecimal`, le helper écrit exactement pour ça,
`lib/core/locale.ts:132-135`) :

```ts
function formatCompact(v: number, lang?: string): string {
  const abs = Math.abs(v);
  const trim = (s: string) => (s.endsWith(".0") ? s.slice(0, -2) : s);
  if (abs >= 1e9) return localizeDecimal(trim((v / 1e9).toFixed(1)) + "B", lang);
  if (abs >= 1e6) return localizeDecimal(trim((v / 1e6).toFixed(1)) + "M", lang);
  if (abs >= 1e3) return localizeDecimal(trim((v / 1e3).toFixed(1)) + "k", lang);
  return localizeNumberString(String(Math.round(v)), lang);
}
```

Les **huit** composants reçoivent le même remplacement à deux lignes chacun — l'import de valeur, et
le formateur :

```ts
import { localizeNumberString } from "<relatif>/core/locale";
…
  const fmt = (n: number) =>
    localizeNumberString(
      Number.isInteger(n) ? String(n) : n.toFixed(1),
      config.lang,
    );
```

Puis vider les deux dettes : `KNOWN_BLIND = []` dans
`skills/map-native/tests/locale-reach.test.ts` et `skills/scrolly/tests/locale-reach.test.ts`.

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test core/story-copy.test.ts
cd /Users/rmdms/Sites/Professional/splash-merge/skills/map-native && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bunx tsc --noEmit && bun test
```
Expected: PASS. Le produce interactif de map-native est lent sous contention (≈86 s, plafond 240 s
depuis la Wave 11) — si la suite timeout, la relancer isolée avant de conclure à une régression.

- [ ] **Step 5: MUTATION — remettre un des huit et constater le rouge**

Dans `skills/scrolly/src/ScrollyHexMap.tsx`, remettre `const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bun test tests/locale-reach.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `1 fail`,
`ScrollyHexMap.tsx paints 1 number(s) without a locale helper`). Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/story-copy.ts lib/core/story-copy.test.ts \
        skills/map-native/src skills/map-native/tests \
        skills/scrolly/src skills/scrolly/tests
git commit -m "fix(map-native,scrolly): the cartogram/hex cluster reads the locale table"
```

---

## Task 10 : les deux entrées d'assembleur du § 8 — l'unité qui n'arrive pas, et la source qui arrive bien

Deux constats du § 8 de la spec, l'un juste et l'autre faux. Les deux DOIVENT avoir leur traitement,
et le traitement n'est pas le même.

**§ 8.8 — VRAI, et c'est un défaut.** `lib/loop/assemble/map-native.ts:233` émet `unit` pour le
choroplèthe, alors que `ChoroplethMap.tsx` lit **`valueUnit`** aux trois endroits qui comptent :
`:355` (les bornes de bin de la légende), `:388` et `:393` (le tooltip). Le champ `unit` a bien un
lecteur (`:341`, le long libellé de légende) — donc un choroplèthe de la boucle montre son unité
**une fois, en en-tête de légende, et sur aucune valeur**. Les branches sœurs du même fichier
émettent correctement `valueUnit` (cartogramme `:188`, famille point `:320`, `:354`). Et **trois
types la droppent entièrement** : dot-density (`ok({…})` `:208-221`, aucun champ d'unité), route
(`:272`), locator (`:287-294`).

**§ 8.7 — FAUX.** La spec affirme que `lib/loop/assemble/scrolly.ts` n'a aucun champ `source` et
qu'« un scrolly construit par la boucle part sans attribution ». Le grep est exact, la conclusion
ne l'est pas : `assembleScrolly` (`:65-76`) est un **pur dispatcheur** — il n'émet aucun objet, il
délègue à `assembleChartNative` ou `assembleMapNative`, qui portent `source` (`chart-native.ts:23`,
`map-native.ts:171` et `:258`). Le traitement dû n'est donc pas un correctif : c'est une **preuve
de régression** qui empêche la conclusion fausse d'être reprise, et une correction du registre
(tâche 18).

**Files:**
- Modify: `lib/loop/assemble/map-native.ts` (`:233`, et les trois `ok({…})` sans unité)
- Modify: `lib/loop/assemble/map-native.test.ts`
- Modify: `lib/loop/assemble/scrolly.test.ts`

**Interfaces:**
- Consumes: `brief.angle.unit` (`lib/core/production-brief.ts:58`).
- Produces: aucune signature nouvelle. Le contrat de sortie change : **tous** les types map-native
  qui ont un lecteur d'unité émettent `valueUnit`, et le choroplèthe émet `unit` ET `valueUnit`
  (deux lecteurs distincts, deux champs, `ChoroplethMap.tsx:53-54` le documente).

- [ ] **Step 1: Write the failing test**

Dans `lib/loop/assemble/map-native.test.ts` :

```ts
  it("gives the choropleth the field its tooltip and bins actually read", () => {
    // ChoroplethMap.tsx reads `valueUnit` at :355 (bin ranges), :388 and :393 (tooltip);
    // `unit` (:341) is the long legend HEADER only. Emitting `unit` alone showed the unit
    // once, in a heading, and on no value a reader hovers.
    const r = assembleMapNative({ ...choroplethBrief, angle: { ...choroplethBrief.angle, unit: "€" } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const v = r.value as { unit?: string; valueUnit?: string };
      expect(v.unit).toBe("€");
      expect(v.valueUnit).toBe("€");
    }
  });

  it.each(["dot-density", "route", "locator"])(
    "carries the unit onto a %s map instead of dropping it",
    (nativeType) => {
      const r = assembleMapNative({
        ...briefFixtureFor(nativeType),
        angle: { ...baseAngle, unit: "km" },
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect((r.value as { valueUnit?: string }).valueUnit).toBe("km");
    },
  );
```

Dans `lib/loop/assemble/scrolly.test.ts` — la preuve, pas un correctif :

```ts
  it.each([...SCROLLY_TRACK_TYPES])(
    "hands %s to a delegate that carries the source — the register said it did not",
    (nativeType) => {
      // sweep-2026-07-28-triage / family-B spec §8.7 recorded "scrolly.ts has no `source`
      // field, so a loop-built scrolly ships unattributed". The grep is right and the
      // conclusion is wrong: assembleScrolly emits NO object at all, it dispatches. This test
      // is the proof, so the conclusion cannot be drawn again from the same grep.
      const r = assembleScrolly({
        ...briefFixtureFor(nativeType),
        attribution: "OFS",
        sourceUrl: "https://www.bfs.admin.ch/x",
      });
      expect(r.ok).toBe(true);
      if (r.ok)
        expect((r.value as { source?: { name: string; url?: string } }).source).toEqual({
          name: "OFS",
          url: "https://www.bfs.admin.ch/x",
        });
    },
  );
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/assemble/`
Expected: FAIL sur les deux premiers tests (`expected "€", received undefined` sur `valueUnit` ;
`undefined` sur les trois types). Le test scrolly, lui, doit **PASSER dès maintenant** — c'est ce
qui démontre que le § 8.7 était faux. S'il échoue, c'est le § 8.7 qui avait raison et la tâche
change de nature : investiguer avant de continuer.

- [ ] **Step 3: Write minimal implementation**

`lib/loop/assemble/map-native.ts`, branche choroplèthe (`:233`) :

```ts
      source,
      // TWO fields, TWO readers, and they are not interchangeable: ChoroplethMap.tsx:53-54
      // documents `unit` as the long legend HEADER and `valueUnit` as the SHORT suffix its
      // tooltip (:393) and bin ranges (:355) print. Emitting only `unit` showed the unit in a
      // heading and on no value — the sibling branches (:188, :320, :354) already emit
      // `valueUnit`; this one was the odd one out.
      ...(unit ? { unit, valueUnit: unit } : {}),
```

Dans les trois `ok({…})` qui n'avaient aucun champ d'unité (dot-density `:208-221`, route `:272`,
locator `:287-294`), ajouter la même ligne que les branches sœurs :

```ts
      ...(unit ? { valueUnit: unit } : {}),
```

et, pour route/locator, hisser `const unit = brief.angle.unit;` au-dessus de leur `return` (la
constante existe déjà dans les deux autres blocs, `:175` et `:262`).

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test loop/
```
Expected: PASS.

- [ ] **Step 5: MUTATION — remettre `unit` seul et constater le rouge**

Dans `lib/loop/assemble/map-native.ts`, remettre `...(unit ? { unit } : {}),` sur le choroplèthe.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/assemble/map-native.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `1 fail`, `expected "€", received undefined` sur
`valueUnit`). Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/assemble/map-native.ts lib/loop/assemble/map-native.test.ts lib/loop/assemble/scrolly.test.ts
git commit -m "fix(assemble): the unit reaches the field a map's tooltip and bins read"
```

---

## Task 11 : dw-chart — l'unité arrive au lecteur, une fois, dans le sous-titre

**Décision Q3, acquise :** ne PAS renverser la décision déjà écrite dans
`skills/chart-native/src/BarChart.tsx:98-101` (« the standalone renders keep bare numbers — their
frame states the unit once in the subtitle »). Ne pas toucher les 30 composants. D29 se réduit aux
cas où l'unité n'atteint **vraiment** rien parce qu'elle est droppée à l'assemblage. La tâche 10 a
fermé le versant map-native. Reste `lib/loop/assemble/dw-chart.ts:59-60`.

Et là, le commentaire dit vrai et n'épuise pas la question : `ChartSpec` n'a **aucun** champ `unit`
(vérifié — `grep -n "unit" skills/dw-chart/src/chart-spec.ts` ne ramène que `numberFormat` et un
commentaire `data-unit y`), et l'unité ne peut pas être passée en `numberFormat` (c'est un token de
FORMAT). Mais elle a un chemin qui atteint le lecteur et que la décision Q3 nomme elle-même : le
**sous-titre**. `ChartSpec.intro` (`chart-spec.ts:170`) est le sous-titre imprimé, et l'assembleur
le remplit déjà depuis `altInsight` (`dw-chart.ts:39`).

**Files:**
- Modify: `lib/loop/assemble/dw-chart.ts:33-40`, `:59-60`
- Modify: `lib/loop/assemble/dw-chart.test.ts`

**Interfaces:**
- Consumes: `brief.angle.unit`, `brief.angle.altInsight`.
- Produces:
  ```ts
  /** Exported so the test states the rule rather than restating the string. */
  export function introWithUnit(intro: string, unit: string | undefined): string;
  ```

- [ ] **Step 1: Write the failing test**

Dans `lib/loop/assemble/dw-chart.test.ts` :

```ts
  it("states the unit once in the printed subtitle, the way the native engines do", () => {
    // ChartSpec has no `unit` field and the unit cannot be smuggled in as `numberFormat`.
    // The reader-reaching path is the SUBTITLE — the same decision BarChart.tsx:98-101 made
    // for the native renders. Without it the unit reached nothing at all on a hosted chart.
    const r = assembleDwChart({
      ...baseBrief,
      nativeType: "d3-bars",
      angle: { confirmedTakeaway: "T", altInsight: "Cantons compared", unit: "€/m²" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.value as { intro?: string }).intro).toBe("Cantons compared (€/m²)");
  });

  it("does not repeat a unit the subtitle already states", () => {
    expect(introWithUnit("Rents in €/m²", "€/m²")).toBe("Rents in €/m²");
  });

  it("says the unit alone when there is no subtitle to hang it on", () => {
    expect(introWithUnit("", "km")).toBe("km");
  });

  it("changes nothing when there is no unit", () => {
    expect(introWithUnit("Cantons compared", undefined)).toBe("Cantons compared");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/assemble/dw-chart.test.ts`
Expected: FAIL — `introWithUnit` n'existe pas ; `intro` vaut `"Cantons compared"`.

- [ ] **Step 3: Write minimal implementation**

`lib/loop/assemble/dw-chart.ts` :

```ts
/** The unit, stated ONCE, in the printed subtitle.
 *
 *  ChartSpec has no `unit` field and never will get one here: the strict validator refuses an
 *  unknown top-level key, and `numberFormat` is a number FORMAT token ("%" on 0-1 data is a
 *  hard error the engine raises by name). So the unit had exactly one reader-reaching path,
 *  and it is the one chart-native already chose for its standalone renders
 *  (skills/chart-native/src/BarChart.tsx:98-101): the frame states it once, in the subtitle.
 *
 *  Never repeated: a subtitle the journalist already wrote with the unit in it stays as it is. */
export function introWithUnit(intro: string, unit: string | undefined): string {
  const u = unit?.trim();
  if (!u) return intro;
  const base = intro.trim();
  if (!base) return u;
  if (base.toLowerCase().includes(u.toLowerCase())) return base;
  return `${base} (${u})`;
}
```

et, dans `ok({…})`, remplacer la ligne `:39` :

```ts
    ...(introWithUnit(brief.angle.altInsight, brief.angle.unit)
      ? { intro: introWithUnit(brief.angle.altInsight, brief.angle.unit) }
      : {}),
```

Enfin, remplacer le paragraphe « DELIBERATELY ABSENT » relatif à `unit` (`:59-60`) par :

```ts
    //   unit — ChartSpec has no unit field, and it cannot be smuggled in as `numberFormat`.
    //     It reaches the reader through `intro` instead (introWithUnit above) — the same
    //     "state it once in the subtitle" decision the native engines made.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test loop/`
Expected: PASS.

- [ ] **Step 5: MUTATION — redropper l'unité et constater le rouge**

Remettre `...(brief.angle.altInsight ? { intro: brief.angle.altInsight } : {}),`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test loop/assemble/dw-chart.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `1 fail`,
`expected "Cantons compared (€/m²)", received "Cantons compared"`). Restaurer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/assemble/dw-chart.ts lib/loop/assemble/dw-chart.test.ts
git commit -m "fix(assemble): a hosted chart states its unit once, in the subtitle"
```

---

## Task 12 : une préoccupation de marque devient un RECORD, et trouve enfin un lecteur

**Décision D25, acquise (spec § 4.3) :** une couleur maison non-CVD-safe est **livrée** — c'est la
charte de la rédaction, ce n'est pas à l'outil de la refuser. Mais elle est **annoncée** et splash
**propose la teinte accessible la plus proche**. Signaler sans offrir la sortie, c'est informer d'un
problème qu'on laisse sans moyen de résoudre.

**Ce qui manque n'est pas le détecteur, c'est le lecteur — et la raison pour laquelle il n'existe
pas.** Vérifié : une « préoccupation » est une **`string` nue**. `BrandReconciliation`
(`skills/chart-native/src/core/conformance.ts:103-108`) n'a ni id, ni sévérité, ni champ couleur —
le hex n'est récupérable qu'en re-parsant de la prose anglaise. C'est pour ça que rien en aval ne
peut la consommer. Et `brand-concerns.json` a **zéro lecteur de son contenu** :

```
$ grep -rn "brand-concerns" --include=*.ts --include=*.tsx --include=*.mjs --include=*.md . \
    | grep -v node_modules | grep -v docs/
lib/host/path-safety.ts:43        (comment)
lib/host/path-safety.ts:77        (PRODUCIBLE_NAMES — a delete-safety allowlist, by BASENAME)
lib/host/README.md:1145
lib/host/path-safety.test.ts:186
skills/chart-native/scripts/produce.mjs:174   ← l'écrivain, et personne d'autre
```

Le jumeau stdout est capturé puis jeté : `lib/core/verbs/exec.ts:40-56` — `stdout` n'est lu que
dans le `catch`.

**Correction de la spec, à ne pas perdre :** il y a **deux** sites de minting, pas un —
`conformance.ts:138-141` (CVD) et `:145-148` (le jumeau contraste). Et « aucune fonction de distance
couleur n'existe » est à nuancer : `colourSeparation` (`lib/verify/taste.ts:210`) est une distance
RGB pondérée, à ne pas dupliquer ; ce qui manque est une distance **perceptuelle** et un snapping
accessible.

**Files:**
- Create: `lib/core/nearest-okabe-ito.ts`, `lib/core/nearest-okabe-ito.test.ts`
- Create: `lib/verify/colour-announcement.ts`, `lib/verify/colour-announcement.test.ts`
- Modify: `skills/chart-native/src/core/conformance.ts:103-108`, `:138-148`
- Modify: `skills/chart-native/scripts/produce.mjs:165-177`
- Modify: `skills/splash/scripts/review-gate.mjs:27-52`
- Modify: `lib/verify/review.ts:239-…` (`runReview` émet le critère)
- Modify: `skills/chart-native/tests/conformance.test.ts`, `skills/splash/tests/review-gate-cli.test.ts`

**Interfaces:**
- Consumes: `hexToOklch` / `oklchToHex` / `Oklch` (`lib/core/house-ramp.ts:56-86` — noter que `h`
  est en **radians**), `OKABE_ITO_SET` (`skills/chart-native/src/core/conformance.ts:18-27`),
  `Finding` / `Criterion` / `Severity` (`lib/verify/types.ts:53-62`), `SEVERITY_BY_CRITERION`
  (`lib/verify/severity.ts:34` pour `colour-semantics`).
- Produces:
  ```ts
  // lib/core/nearest-okabe-ito.ts
  export const OKABE_ITO: readonly string[];       // the same eight, one home
  export function isOkabeIto(hex: string): boolean;
  export function nearestOkabeIto(hex: string): { hex: string; distance: number };

  // skills/chart-native/src/core/conformance.ts
  export type BrandConcern = {
    kind: "cvd" | "contrast";
    colour: string;              // "#2E7D57"
    reason: string;              // one journalist-readable sentence
    nearestAccessible?: string;  // "#009E73" — the way out, never applied automatically
  };
  export interface BrandReconciliation {
    violations: string[];
    concerns: BrandConcern[];    // was string[]
  }

  // lib/verify/colour-announcement.ts
  export function announcedColourFindings(input: {
    concerns: BrandConcern[];
    announced?: string;          // the baseColor the journalist was told about
    honoured?: boolean;          // whether the chosen type paints its marks with it (task 13)
  }): Finding[];
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/core/nearest-okabe-ito.test.ts` :

```ts
import { describe, expect, it } from "bun:test";
import { isOkabeIto, nearestOkabeIto, OKABE_ITO } from "./nearest-okabe-ito";

describe("the way out of a non-CVD-safe house colour", () => {
  it("recognises the frozen set", () => {
    expect(OKABE_ITO).toHaveLength(8);
    expect(isOkabeIto("#009e73")).toBe(true);
    expect(isOkabeIto("#2E7D57")).toBe(false);
  });

  it("proposes the perceptually nearest accessible hue, not a hue-wheel neighbour", () => {
    // The measured house green from the sweep. Its nearest Okabe-Ito is the bluish green,
    // not the orange that a naive RGB distance can land on.
    expect(nearestOkabeIto("#2E7D57").hex).toBe("#009E73");
  });

  it("returns the colour itself when it is already in the set", () => {
    expect(nearestOkabeIto("#0072B2")).toEqual({ hex: "#0072B2", distance: 0 });
  });
});
```

Create `lib/verify/colour-announcement.test.ts` :

```ts
import { describe, expect, it } from "bun:test";
import { announcedColourFindings } from "./colour-announcement";

describe("the colour-semantics criterion finally has an emitter", () => {
  it("files a warning for a house colour outside the accessible set, with the way out", () => {
    const f = announcedColourFindings({
      concerns: [
        {
          kind: "cvd",
          colour: "#2E7D57",
          reason: "outside the Okabe-Ito set",
          nearestAccessible: "#009E73",
        },
      ],
    });
    expect(f).toHaveLength(1);
    expect(f[0]!.criterion).toBe("colour-semantics");
    expect(f[0]!.severity).toBe("warning");     // shipped, not blocked (D25)
    expect(f[0]!.evidence.join(" ")).toContain("#009E73");
  });

  it("files a warning when a colour was announced that the type does not paint", () => {
    const f = announcedColourFindings({
      concerns: [],
      announced: "#CC79A7",
      honoured: false,
    });
    expect(f).toHaveLength(1);
    expect(f[0]!.evidence.join(" ")).toContain("#CC79A7");
  });

  it("says nothing when the announcement and the render agree", () => {
    expect(
      announcedColourFindings({ concerns: [], announced: "#CC79A7", honoured: true }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/nearest-okabe-ito.test.ts verify/colour-announcement.test.ts`
Expected: FAIL — les deux modules n'existent pas.

- [ ] **Step 3: Write minimal implementation**

Create `lib/core/nearest-okabe-ito.ts` :

```ts
// The way OUT of a non-CVD-safe house colour. D25's decision is to SHIP the newsroom's own
// hue and SAY it is not colour-blind-safe — and saying it without offering an alternative is
// telling a journalist about a problem you leave them no way to solve.
//
// Perceptual, on purpose: lib/verify/taste.ts:210's colourSeparation is a weighted RGB
// distance built for pairwise ADJACENCY, and RGB distance picks visually wrong "nearest"
// colours across hues. OKLCH already exists here (lib/core/house-ramp.ts), so the distance is
// taken in OKLab coordinates — L, and the (a, b) the chroma/hue pair projects to.
//
// This is a PROPOSAL. Nothing here applies it: a nearest accessible hue is a judgment dressed
// as a calculation (spec §7), and the newsroom's charter outranks it.
import { hexToOklch } from "./house-ramp";

export const OKABE_ITO: readonly string[] = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#D55E00",
  "#CC79A7",
  "#56B4E9",
  "#F0E442",
  "#000000",
];

const SET = new Set(OKABE_ITO.map((h) => h.toUpperCase()));

export function isOkabeIto(hex: string): boolean {
  return SET.has(hex.toUpperCase());
}

function lab(hex: string): [number, number, number] {
  const { L, C, h } = hexToOklch(hex);
  // `h` is in RADIANS (house-ramp.ts:73 uses Math.atan2 and :77-78 Math.cos/Math.sin).
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

/** The perceptually closest colour of the frozen set, and how far it is. Distance 0 means the
 *  colour already IS in the set. */
export function nearestOkabeIto(hex: string): { hex: string; distance: number } {
  if (isOkabeIto(hex))
    return { hex: OKABE_ITO.find((h) => h.toUpperCase() === hex.toUpperCase())!, distance: 0 };
  const [L, a, b] = lab(hex);
  let best = OKABE_ITO[0]!;
  let bestD = Infinity;
  for (const cand of OKABE_ITO) {
    const [L2, a2, b2] = lab(cand);
    const d = Math.hypot(L - L2, a - a2, b - b2);
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }
  return { hex: best, distance: bestD };
}
```

`skills/chart-native/src/core/conformance.ts` — `BrandReconciliation` (`:103-108`) devient typée,
et les **deux** sites de minting (`:138-141`, `:145-148`) émettent des records :

```ts
/** A house-colour tradeoff that is RECORDED and SHIPPED, never silently dropped and never
 *  blocking. It used to be a bare string, which is exactly why nothing downstream could read
 *  it: the hex was only recoverable by re-parsing English prose. */
export type BrandConcern = {
  kind: "cvd" | "contrast";
  colour: string;
  reason: string;
  /** The accessible hue closest to `colour`. A PROPOSAL — the charter outranks it. */
  nearestAccessible?: string;
};

export interface BrandReconciliation {
  violations: string[];
  concerns: BrandConcern[];
}
```

```ts
    if (cvd && brand.has(cvd[1].toUpperCase())) {
      concerns.push({
        kind: "cvd",
        colour: cvd[1],
        reason:
          `brand colour ${cvd[1]} is not colour-blind-safe (outside the Okabe-Ito set) — ` +
          `kept per the newsroom's house style (render-review concern)`,
        nearestAccessible: nearestOkabeIto(cvd[1]).hex,
      });
```

(le second site, `:145-148`, prend `kind: "contrast"` et le même champ `colour`, sans
`nearestAccessible` — une préoccupation de contraste ne se règle pas en changeant de teinte.)

`skills/chart-native/scripts/produce.mjs:172-176` écrit le nouveau format tel quel — l'objet est
déjà sérialisable, aucune transformation :

```js
if (brandConcerns.length > 0) {
  writeFileSync(
    join(outDir, "brand-concerns.json"),
    JSON.stringify({ type, concerns: brandConcerns }, null, 2),
  );
}
```

`skills/splash/scripts/review-gate.mjs` — **le lecteur**. Aujourd'hui les `concerns` sont des
arguments positionnels TAPÉS À LA MAIN par l'orchestrateur (`:27`), ce qui est précisément le motif
de la famille B : l'artefact est sur le disque, et le gate attend qu'on le retape. Après le parse
des probes, ajouter :

```js
// THE READER brand-concerns.json never had. It sat next to the outputs, listed in a
// delete-safety allowlist, opened by nothing — while this gate took its concerns as
// hand-typed argv. A journalist signed "ship it" without ever learning their house colour
// breaks accessibility (D25, 4/83).
const concernsPath = join(dirname(reportPath), "brand-concerns.json");
let fileConcerns = [];
if (existsSync(concernsPath)) {
  const parsed = JSON.parse(readFileSync(concernsPath, "utf8"));
  fileConcerns = (parsed.concerns ?? []).map((c) =>
    c.nearestAccessible
      ? `${c.reason} — closest accessible hue: ${c.nearestAccessible}`
      : c.reason,
  );
}
const allConcerns = [...fileConcerns, ...concerns];
```

et passer `allConcerns` à `applyReviewGate` (sa signature `(report, id, concerns, probes)` ne change
pas) ainsi qu'au `console.log` final.

`lib/verify/colour-announcement.ts` — l'émetteur côté boucle :

```ts
// The FIRST emitter of the `colour-semantics` criterion. It was declared (lib/verify/types.ts:26)
// and priced (lib/verify/severity.ts:34) and never once filed against — a dead enum member.
//
// Two shapes, both WARNINGS, never blockers:
//   - the newsroom's own hue is not colour-blind-safe (D25): shipped, said, and the closest
//     accessible hue offered.
//   - a colour was ANNOUNCED that the chosen type does not paint its marks with (D26).
import type { Finding } from "./types";
import type { BrandConcern } from "../../skills/chart-native/src/core/conformance";

export function announcedColourFindings(input: {
  concerns: BrandConcern[];
  announced?: string;
  honoured?: boolean;
}): Finding[] {
  const out: Finding[] = [];
  for (const c of input.concerns)
    out.push({
      id: `colour-${c.kind}-${c.colour.replace("#", "").toLowerCase()}`,
      criterion: "colour-semantics",
      severity: "warning",
      status: "open",
      summary: c.reason,
      evidence: c.nearestAccessible
        ? [c.colour, `closest accessible hue: ${c.nearestAccessible}`]
        : [c.colour],
      provenance: "mechanical",
    });
  if (input.announced && input.honoured === false)
    out.push({
      id: `colour-announced-unpainted-${input.announced.replace("#", "").toLowerCase()}`,
      criterion: "colour-semantics",
      severity: "warning",
      status: "open",
      summary:
        `${input.announced} was announced as this element's colour, and this type encodes ` +
        `with a fixed role/categorical palette — the hue tints the frame, never the marks`,
      evidence: [input.announced],
      provenance: "mechanical",
    });
  return out;
}
```

⚠ **Layering** : ce module importe un TYPE depuis `skills/`, ce qui est la direction interdite.
Le corriger en déplaçant `BrandConcern` dans `lib/core/brand-concern.ts` (types seuls, zéro
dépendance) et en le ré-exportant depuis `skills/chart-native/src/core/conformance.ts` — le même
motif que `lib/core/i18n-furniture.ts` ré-exporté par `skills/dw-chart/src/furniture-i18n.ts:1`.
Faire ce déplacement dans cette tâche, pas plus tard.

Enfin, `lib/verify/review.ts` — `runReview` concatène `announcedColourFindings(...)` à ses findings
mécaniques, à l'endroit où il assemble déjà le `ReviewRecord`.

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Expected: PASS. Et la mesure qui prouve que le critère mort est vivant :

```
$ grep -rn "colour-semantics" lib/ skills/ | grep -v ".test." | wc -l
```
doit passer de `2` (déclaration + sévérité) à `4` ou plus.

- [ ] **Step 5: MUTATION — recouper le lecteur et constater le rouge**

Dans `skills/splash/scripts/review-gate.mjs`, remettre `const allConcerns = concerns;`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/review-gate-cli.test.ts`
Expected: **FAIL**, noter le chiffre. Puis, dans `lib/verify/colour-announcement.ts`, remettre
`return [];` en tête de fonction.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test verify/colour-announcement.test.ts`
Expected: **FAIL**, `2 fail`. Restaurer les deux, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/nearest-okabe-ito.ts lib/core/nearest-okabe-ito.test.ts lib/core/brand-concern.ts \
        lib/verify/colour-announcement.ts lib/verify/colour-announcement.test.ts lib/verify/review.ts \
        skills/chart-native/src/core/conformance.ts skills/chart-native/scripts/produce.mjs \
        skills/chart-native/tests skills/splash/scripts/review-gate.mjs skills/splash/tests
git commit -m "feat(verify): a brand concern is a record, and something finally reads it"
```

---

## Task 13 : `honoursBaseColor` — l'annonce sait ce que le type peut peindre

**Décision D26, acquise (spec § 4.4) :** ce n'est pas un arbitrage, c'est un **bug pur**, à corriger
**à la cause**. Ce qui est annoncé doit être ce qui sort. Le contournement nommé pour qu'on ne le
prenne pas : élargir la tolérance d'un contrôle de couleur, ou comparer les pixels après coup —
`lib/verify/capture.ts:439-463` récolte déjà les `markColours` du rendu vivant, mais ça constate
l'écart au lieu de l'empêcher, et ça arrive après que le journaliste a confirmé.

La cause est en amont du rendu : `colourKind` (`skills/splash/src/brand-profile.ts:409-417`) renvoie
`"chart"` pour **tout** producteur `chart-native`, sans regarder `nativeType`. Le fait
« ce type honore-t-il `baseColor` sur ses marques ? » est écrit **onze fois dans le code, en
commentaire**, et n'est jamais interrogeable :

```
$ grep -c "FURNITURE only" skills/chart-native/src/spec-to-config.ts
      11
```

Les onze commentaires sont aux lignes 318, 340, 364, 522, 562, 603, 626, 669, 813, 834, 937 ; le
routage réel est à **n+2** (320, 342, …, 939). Les types : `grouped`, `stacked`, `stacked-area`,
`pie`, `diverging`, `dumbbell`, `slope`, `bullet`, `diverging-stacked`, `pyramid`, `waterfall` —
onze sur **27** builders.

**Correction de la spec, importante :** la spec affirme que `brand-profile.ts:466-468` estampille
`brandExplicit: true` sur **toute** spec chart-native. **Faux.** `seedBrandColor` (`:198-205`) pose
`brandExplicit: isHouseColour` — une couleur explicite hors palette maison donne `false` — et sans
profil ou avec une palette vide (`:457-461`) rien n'est estampillé du tout. Ne rien construire sur
« toute spec est estampillée ».

**Files:**
- Create: `skills/chart-native/src/base-colour-reach.ts`
- Create: `skills/chart-native/tests/base-colour-reach.test.ts`
- Modify: `skills/splash/src/brand-profile.ts:409-417`, `:460-470`
- Modify: `skills/splash/tests/brand-profile.test.ts`

**Interfaces:**
- Consumes: rien (une liste + un prédicat).
- Produces:
  ```ts
  export const FURNITURE_ONLY_TYPES: readonly string[];   // the eleven
  export function honoursBaseColor(nativeType: string | undefined): boolean;
  ```
  `lib/verify/colour-announcement.ts` (tâche 12) consomme le booléen via son paramètre `honoured`.

- [ ] **Step 1: Write the failing test**

Create `skills/chart-native/tests/base-colour-reach.test.ts` :

```ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FURNITURE_ONLY_TYPES, honoursBaseColor } from "../src/base-colour-reach";

test("the eleven furniture-only types are named, not guessed", () => {
  expect([...FURNITURE_ONLY_TYPES].sort()).toEqual(
    [
      "bullet",
      "diverging",
      "diverging-stacked",
      "dumbbell",
      "grouped",
      "pie",
      "pyramid",
      "slope",
      "stacked",
      "stacked-area",
      "waterfall",
    ].sort(),
  );
});

test("a type that paints its marks with the house hue honours it", () => {
  expect(honoursBaseColor("bar")).toBe(true);
  expect(honoursBaseColor("heatmap")).toBe(true);
  expect(honoursBaseColor("waterfall")).toBe(false);
  expect(honoursBaseColor(undefined)).toBe(true);
});

test("DRIFT: the list and the eleven in-code comments cannot diverge", () => {
  // The fact was written eleven times, in prose, and never once interrogable
  // (spec-to-config.ts:937-939 and its ten twins). If a twelfth type becomes furniture-only,
  // this fails until the list says so.
  const src = readFileSync(
    join(import.meta.dir, "..", "src", "spec-to-config.ts"),
    "utf8",
  );
  const marked = src.split("\n").filter((l) => l.includes("FURNITURE only")).length;
  expect(marked).toBe(FURNITURE_ONLY_TYPES.length);
});
```

Dans `skills/splash/tests/brand-profile.test.ts` :

```ts
  it("does not announce a house colour on a type that paints with a role palette", () => {
    // Measured: a magenta #CC79A7 was proposed AND confirmed for a waterfall, and the chart
    // shipped the increase/decrease/total palette. The announcement was made anyway.
    const out = mergeProfileDefaults(
      { nativeType: "waterfall", title: "T" },
      { palette: ["#2E7D57"], accent: "#2E7D57" },
      { producer: "chart-native" },
    ) as { baseColor?: string; brandExplicit?: boolean };
    expect(out.baseColor).toBeUndefined();
    expect(out.brandExplicit).toBeUndefined();
  });

  it("still announces it on a type that does paint with it", () => {
    const out = mergeProfileDefaults(
      { nativeType: "bar", title: "T" },
      { palette: ["#2E7D57"], accent: "#2E7D57" },
      { producer: "chart-native" },
    ) as { baseColor?: string };
    expect(out.baseColor).toBe("#2E7D57");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/base-colour-reach.test.ts`
Expected: FAIL — `Cannot find module '../src/base-colour-reach'`.

- [ ] **Step 3: Write minimal implementation**

Create `skills/chart-native/src/base-colour-reach.ts` :

```ts
// Does this type paint its MARKS with the house hue, or only its furniture?
//
// The answer was written eleven times in spec-to-config.ts, in a comment — "FURNITURE only.
// The house hue tints the greys and the frame band; this type encodes with a fixed
// categorical/role palette, which the hue must never touch." — and was never once
// interrogable. So the announcement was made upstream regardless, and a journalist confirmed
// a magenta waterfall that shipped in increase/decrease/total colours (D26, 5/83).
//
// Correcting AT THE CAUSE means making the fact available WHERE THE COLOUR IS ANNOUNCED, not
// discovering it at the render. Widening a colour check's tolerance, or diffing pixels after
// the fact, both arrive after the journalist has already confirmed.
export const FURNITURE_ONLY_TYPES: readonly string[] = [
  "grouped",
  "stacked",
  "stacked-area",
  "pie",
  "diverging",
  "dumbbell",
  "slope",
  "bullet",
  "diverging-stacked",
  "pyramid",
  "waterfall",
];

const SET = new Set(FURNITURE_ONLY_TYPES);

/** True when the hue reaches the marks a reader sees. An UNKNOWN type answers true: the
 *  conservative direction is to keep announcing (the fallback the 16 other types share),
 *  never to silence an announcement for a type nobody listed. */
export function honoursBaseColor(nativeType: string | undefined): boolean {
  return typeof nativeType === "string" ? !SET.has(nativeType) : true;
}
```

`skills/splash/src/brand-profile.ts` — `colourKind` consulte le fait :

```ts
function colourKind(
  producer: string | undefined,
  spec: { nativeType?: unknown; type?: unknown },
): "chart" | "map" | "none" {
  // A chart-native type that encodes with a frozen role/categorical palette cannot paint its
  // marks with the house hue — announcing one to the journalist would be a promise the render
  // structurally cannot keep. Read from the engine, never restated here.
  if (
    producer === "chart-native" &&
    typeof spec.nativeType === "string" &&
    !honoursBaseColor(spec.nativeType)
  )
    return "none";
  if (producer === undefined || CHART_COLOUR_PRODUCERS.has(producer))
    return "chart";
  if (MAP_COLOUR_PRODUCERS.has(producer)) return "map";
  if (producer === "scrolly") return spec.nativeType != null ? "chart" : "map";
  return "none";
}
```

`"none"` court-circuite déjà tout le bloc d'estampillage (`:461`), donc aucune autre ligne ne change.

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Expected: PASS. ⚠ Vérification au **rendu**, pas au grep du bundle : produire un waterfall et un bar
sous un profil maison, et lire les PNG — le waterfall garde sa palette de rôles, le bar prend la
teinte maison. Grepper un hex dans l'`interactive.html` est INVALIDE (le bundle single-file inline
toute la registry de palettes — leçon gravée, CLAUDE.md).

- [ ] **Step 5: MUTATION — remettre l'annonce aveugle et constater le rouge**

Dans `skills/splash/src/brand-profile.ts`, retirer la première clause de `colourKind`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/brand-profile.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `1 fail`, `expected undefined, received "#2E7D57"`).
Puis, dans `skills/chart-native/src/base-colour-reach.ts`, retirer `"waterfall"` de la liste.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native && bun test tests/base-colour-reach.test.ts`
Expected: **FAIL**, `2 fail` (la liste nommée ET le drift-guard des onze commentaires). Restaurer
les deux, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add skills/chart-native/src/base-colour-reach.ts skills/chart-native/tests/base-colour-reach.test.ts \
        skills/splash/src/brand-profile.ts skills/splash/tests/brand-profile.test.ts
git commit -m "fix(brand): a colour is only announced where the type can paint with it"
```

---

## Task 14 : D17 — la comparaison source↔article normalise, et le nom seul redevient une CLASSE

**Décision § 4.1, acquise : assouplir D'ABORD, rendre le refus terminal ENSUITE.** L'ordre EST la
décision. Rendre terminal un contrôle qui se trompe transformerait 19 faux négatifs en 19 blocages ;
*le contournement existe parce que le contrôle avait tort*. Les cinq cas où la décision n'a jamais
été enregistrée sont la conséquence, pas la cause.

La comparaison existe et elle est fausse. `skills/splash/src/flow-decisions.ts:95-116` :

```ts
      const haystack = String(payload.article ?? "").toLowerCase();
      …
      if (name && !haystack.includes(name.trim().toLowerCase()))
```

**Deux opérations de normalisation en tout** : `toLowerCase` et `trim`. Ni NFC/NFD, ni pliage
d'accents, ni tokenisation. Le côté URL est plus clément (match sur l'**hôte** canonique, `:103-104`) ;
le côté nom n'a aucun équivalent — **cette asymétrie est le défaut**.

**« Assouplir » est typé, pas permissif**, et les deux notions ne se mélangent pas :

- **Accents, casse, déclinaisons = NORMALISATION.** « Bundesamt für Statistik » et « Bundesamtes für
  Statistik » sont la même source. Le pliage d'accents existe déjà dans le dépôt et n'est donc pas
  une invention : `skills/chart-native/src/core/conformance.ts:239-241`,
  `deaccent(s) = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")` (module-privé — d'où la
  ré-extraction ci-dessous plutôt qu'un import).
- **Un nom SANS URL n'est pas défaillant : c'est une CLASSE.** `lib/source/requirements.ts:49-104`
  le dit déjà — `public.url = "required"` (`:52`), **`local.url = "optional"`** (`:61`),
  **`prose.url = "optional"`** (`:88`), `private`/`synthetic`/`none` → `"forbidden"` (`:70`, `:79`,
  `:97`). Le nom seul est un état pleinement légal pour **trois classes sur six**. S'appuyer sur
  cette table, ne pas inventer une seconde notion de « source acceptable ». Le vocabulaire est
  importable sans zod par construction (`lib/source/vocabulary.ts:14-33`).

**La seconde moitié appartient à la famille A** et n'est PAS faite ici : `source-fidelity` reste
`required: false` (`flow-decisions.ts:87`), et `evaluateDecisions` (`:154-171`) continue de ne
vérifier qu'une présence d'`id` sans rejouer `artifactCheck`. B corrige le contrôle ; A décide de ce
qui arrive quand il refuse.

**Files:**
- Create: `lib/source/name-match.ts`, `lib/source/name-match.test.ts`
- Modify: `skills/splash/src/flow-decisions.ts:95-116`
- Modify: `skills/splash/src/flow-decisions.test.ts`

**Interfaces:**
- Consumes: `requirementsFor` / `SourceKind` (`lib/source/requirements.ts:106`,
  `lib/source/vocabulary.ts:33`).
- Produces:
  ```ts
  export function deaccent(s: string): string;
  export function normalizeName(s: string): string;         // deaccent + lowercase + collapse
  export function nameAppearsIn(name: string, article: string): boolean;
  export const MIN_STEM = 4;
  ```
  `DecisionPayload` gagne une clé lue (non typée, le type est `Record<string, unknown>`) :
  `sourceKind`.

- [ ] **Step 1: Write the failing test**

Create `lib/source/name-match.test.ts` :

```ts
import { describe, expect, it } from "bun:test";
import { deaccent, nameAppearsIn, normalizeName } from "./name-match";

describe("recognising the same source under a different form", () => {
  it("folds diacritics, the way the chart engine already does", () => {
    expect(deaccent("intermédiaires")).toBe("intermediaires");
    expect(normalizeName("  Office  Fédéral  ")).toBe("office federal");
  });

  it("matches a German declension of the same name", () => {
    // Measured: `energie-region-allemand` — the ledger refused because the article wrote the
    // genitive. Same source, different ending.
    expect(
      nameAppearsIn(
        "Bundesamt für Statistik",
        "Laut Angaben des Bundesamtes für Statistik stieg der Wert.",
      ),
    ).toBe(true);
  });

  it("matches a name whose accents the CLI mangled", () => {
    // Measured: `co2-secteurs-grouped` — the source was verbatim, the encoding was not.
    expect(nameAppearsIn("Office fédéral de l'énergie", "publié par l'Office federal de l energie"))
      .toBe(true);
  });

  it("does NOT match a name that merely shares a common word", () => {
    // The accepted risk (spec §7): normalizing widens the halo. It must not widen it to this.
    expect(nameAppearsIn("Institut Pasteur", "Le rapport de l'institut national de la santé"))
      .toBe(false);
  });

  it("does not let a two-letter token carry a match on its own", () => {
    expect(nameAppearsIn("de", "un texte de test")).toBe(false);
  });
});
```

Dans `skills/splash/src/flow-decisions.test.ts` :

```ts
  it("accepts a name-only source whose class allows no URL", () => {
    // lib/source/requirements.ts: prose.url and local.url are "optional"; private/synthetic/
    // none are "forbidden". A name without a URL is a fully legal state for three classes of
    // six — refusing it is the guard being wrong, not the source being bad.
    const d = getDecision("source-fidelity")!;
    const r = d.artifactCheck!("/tmp/run", {
      article: "Chiffres cités dans l'article.",
      sourceName: "Chiffres cités dans l'article",
      sourceKind: "prose",
    });
    expect(r.ok).toBe(true);
  });

  it("still refuses a name the article never states", () => {
    const d = getDecision("source-fidelity")!;
    const r = d.artifactCheck!("/tmp/run", {
      article: "Un texte qui ne cite personne.",
      sourceName: "Institut Pasteur",
      sourceKind: "public",
    });
    expect(r.ok).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test source/name-match.test.ts`
Expected: FAIL — `Cannot find module './name-match'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/source/name-match.ts` :

```ts
// Is this the SAME source, written differently?
//
// The ledger's comparison had exactly two normalization operations — toLowerCase and trim —
// and refused to record a decision whenever the form differed: a German genitive, an accent
// the CLI mangled, a URL that was literally in the article. 19 cases of 83, and each one
// produced a WORSE second act: splash worked around it silently (D17 = D01's fuel).
//
// The bar is not lowered on WHAT is required. It is lowered on the FORM of the string. The
// accepted cost (spec §7): a fabricated source whose name resembles an article word would now
// pass. MIN_STEM and the all-tokens rule are what keep that halo small.
//
// Imports nothing: skills/splash/src imports it directly.

export const MIN_STEM = 4;

/** NFD-fold combining diacritics. The same expression chart-native's conformance belt already
 *  uses (src/core/conformance.ts:239-241) — module-private there, so it is written once more
 *  here rather than reached into across the layering boundary. */
export function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeName(s: string): string {
  return deaccent(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** True when every SIGNIFICANT token of `name` appears in `article` — as a whole token, or as
 *  a stem of one (which is what makes "Bundesamt" match "Bundesamtes"). Tokens shorter than
 *  MIN_STEM are dropped, not matched loosely: "de", "of", "la" would otherwise carry a match
 *  on their own. A name with NO significant token falls back to the old substring test. */
export function nameAppearsIn(name: string, article: string): boolean {
  const hay = normalizeName(article);
  const needle = normalizeName(name);
  if (!needle) return false;
  if (hay.includes(needle)) return true;
  const tokens = needle.split(" ").filter((t) => t.length >= MIN_STEM);
  if (tokens.length === 0) return hay.includes(needle);
  const hayTokens = hay.split(" ");
  return tokens.every((t) =>
    hayTokens.some(
      (h) =>
        h === t ||
        (h.startsWith(t) && h.length - t.length <= 3) ||
        (t.startsWith(h) && h.length >= MIN_STEM && t.length - h.length <= 3),
    ),
  );
}
```

`skills/splash/src/flow-decisions.ts:95-116` — la comparaison consulte la normalisation ET la table
de classes :

```ts
    artifactCheck: (_runDir, payload) => {
      const article = String(payload.article ?? "");
      const url = payload.sourceUrl ? String(payload.sourceUrl) : "";
      const name = payload.sourceName ? String(payload.sourceName) : "";
      // WHAT KIND of source this is, when the caller says. lib/source/requirements.ts is the
      // one table that answers "is a URL owed here" — public: required, local/prose: optional,
      // private/synthetic/none: forbidden. A name-only ship is a fully legal state for three
      // classes of six, and refusing it was the guard being wrong about the SOURCE POLICY, not
      // the source being bad.
      const kind = typeof payload.sourceKind === "string" ? payload.sourceKind : undefined;
      const rules =
        kind && (SOURCE_KINDS as readonly string[]).includes(kind)
          ? requirementsFor(kind as SourceKind)
          : undefined;

      if (url) {
        const host = canonicalUrl(url).split("/")[0];
        if (host && !normalizeName(article).includes(normalizeName(host)))
          return {
            ok: false,
            reason: `cited source URL "${url}" (host ${host}) does not appear in the article text`,
          };
      }
      if (name && rules?.label !== "forbidden" && !nameAppearsIn(name, article))
        return {
          ok: false,
          reason: `cited source name "${name}" does not appear in the article text`,
        };
      return { ok: true };
    },
```

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test source/
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Expected: PASS.

- [ ] **Step 5: MUTATION — remettre le sous-chaîne exact et constater le rouge**

Dans `skills/splash/src/flow-decisions.ts`, remettre
`if (name && !article.toLowerCase().includes(name.trim().toLowerCase()))`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test src/flow-decisions.test.ts`
Expected: **FAIL**, noter le chiffre. Puis, dans `lib/source/name-match.ts`, remettre
`export function nameAppearsIn() { return true; }`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test source/name-match.test.ts`
Expected: **FAIL**, `2 fail` (les deux tests de NON-correspondance — la garantie que l'assouplissement
n'est pas devenu un laisser-passer). Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/source/name-match.ts lib/source/name-match.test.ts \
        skills/splash/src/flow-decisions.ts skills/splash/src/flow-decisions.test.ts
git commit -m "fix(source): the fidelity check normalizes form and reads the class table"
```

---

## Task 15 : D18 — la réponse du journaliste a un porteur, et une URL DISPARUE est attrapée

Le porteur manque au **premier** hop, pas au dernier. `SourceHint` est documenté comme ne capturant
que ce que **l'article** a nommé (`skills/splash/src/source-guard.ts:53-66`, et
`skills/splash/SKILL.md:715-716`). **Aucun champ n'enregistre la réponse du journaliste** à la
question de source (CADRAGE Q4 / Gate 2c) : elle est recomposée à la main dans `spec.source` par
l'orchestrateur.

Conséquence directe et vérifiée : le garde est **structurellement aveugle** au cas de D18.
`source-guard.ts:152` :

```ts
  if (typeof shippedUrlRaw !== "string" || !shippedUrlRaw.trim()) return null; // name-only ship
```

Une URL **divergente** est attrapée ; une URL **disparue** passe. C'est littéralement le mode
d'échec du sweep (« URL fournie deux fois, `source` livré sans elle »,
`sweep-2026-07-28-triage.md:253-259`). Le filet secondaire `droppedSourceHintWarning`
(`:175-194`) est non bloquant et ne regarde que le *nom*.

**Q5, acquise : la boucle est le socle.** Côté boucle, D18 est **déjà fermé par un autre mécanisme** :
`SourceLedger` enregistre la déclaration avec son URL, et `lib/source/policy.ts` la juge par classe —
il n'y a pas de « réponse recomposée à la main ». Cette tâche traite donc le **versant prose**, avec
la MÊME table de classes que la boucle, jamais une seconde notion.

**Files:**
- Modify: `skills/splash/src/source-guard.ts:53-70`, `:145-173`
- Modify: `skills/splash/src/validate-gate.ts:605-630`
- Modify: `skills/splash/tests/source-guard.test.ts`, `skills/splash/tests/validate-gate.test.ts`

**Interfaces:**
- Consumes: `requirementsFor` / `SourceKind` (`lib/source`).
- Produces:
  ```ts
  /** What the JOURNALIST answered at CADRAGE Q4 — distinct from SourceHint, which is what the
   *  ARTICLE named. Two different questions with two different answers. */
  export interface SourceAnswer {
    name?: string;
    url?: string;
    kind?: string;
  }
  export function droppedSourceUrlReason(
    shipped: unknown,
    answered: SourceAnswer | undefined,
  ): string | null;
  ```

- [ ] **Step 1: Write the failing test**

Dans `skills/splash/tests/source-guard.test.ts` :

```ts
describe("droppedSourceUrlReason", () => {
  it("catches a URL the journalist gave that the shipped spec no longer has", () => {
    // The measured failure: the journalist supplied the URL TWICE and `source` shipped with
    // the name alone. sourceUrlFidelityReason returns null on a name-only ship (:152), by
    // design — it compares two URLs. Nothing compared "given" against "absent".
    expect(
      droppedSourceUrlReason(
        { name: "OFS" },
        { name: "OFS", url: "https://www.bfs.admin.ch/x", kind: "public" },
      ),
    ).toContain("https://www.bfs.admin.ch/x");
  });

  it("says nothing when the URL survived", () => {
    expect(
      droppedSourceUrlReason(
        { name: "OFS", url: "https://www.bfs.admin.ch/x" },
        { name: "OFS", url: "https://www.bfs.admin.ch/x", kind: "public" },
      ),
    ).toBeNull();
  });

  it("says nothing for a class whose URL is forbidden", () => {
    // private/synthetic/none: requirements.ts sets url "forbidden". Dropping it is CORRECT.
    expect(
      droppedSourceUrlReason(
        { name: "Internal desk figures" },
        { name: "Internal desk figures", url: "https://intranet/x", kind: "private" },
      ),
    ).toBeNull();
  });

  it("says nothing when the journalist gave no URL to begin with", () => {
    expect(droppedSourceUrlReason({ name: "OFS" }, { name: "OFS", kind: "local" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/source-guard.test.ts`
Expected: FAIL — `droppedSourceUrlReason is not exported`.

- [ ] **Step 3: Write minimal implementation**

`skills/splash/src/source-guard.ts` — le porteur manquant, à côté de `SourceHint` :

```ts
/** What the JOURNALIST answered at CADRAGE Q4 / Gate 2c — NOT what the article named.
 *
 *  These are two different questions with two different answers, and until now only the first
 *  had a field. The journalist's answer was recomposed by hand into `spec.source` by the
 *  orchestrator, which is precisely why a URL given TWICE could ship as a name-only source and
 *  no guard could see it: `sourceUrlFidelityReason` compares two URLs and returns null the
 *  moment one of them is missing (:152, the "name-only ship" line). Absence was invisible
 *  because absence had no counterpart to be absent FROM. */
export interface SourceAnswer {
  name?: string;
  url?: string;
  /** The class, when the journalist stated it. Read through lib/source/requirements.ts — a URL
   *  is only OWED for classes whose row says so. */
  kind?: string;
}

/** The URL the journalist gave and the shipped spec no longer carries. `null` when there is
 *  nothing to say — including for the three classes whose row FORBIDS a URL, where dropping
 *  it is the correct behaviour and flagging it would be a false block. */
export function droppedSourceUrlReason(
  shipped: unknown,
  answered: SourceAnswer | undefined,
): string | null {
  const given = answered?.url?.trim();
  if (!given) return null;
  const kind = answered?.kind;
  if (
    kind &&
    (SOURCE_KINDS as readonly string[]).includes(kind) &&
    requirementsFor(kind as SourceKind).url === "forbidden"
  )
    return null;
  const shippedUrl = (shipped as { url?: unknown } | null)?.url;
  if (typeof shippedUrl === "string" && shippedUrl.trim()) return null;
  return (
    `the source URL you gave — ${given} — is not on the shipped source: the deliverable ` +
    `credits "${answered?.name ?? "the source"}" by name only, so a reader cannot reach the ` +
    `dataset`
  );
}
```

`skills/splash/src/validate-gate.ts` — le garde entre en GUARD 2d, à côté des trois autres
(`:615-627`) :

```ts
  const droppedUrl = droppedSourceUrlReason(
    (p.spec as { source?: unknown } | null)?.source,
    (p as { sourceAnswer?: SourceAnswer }).sourceAnswer,
  );
  if (droppedUrl) extraErrors.push(droppedUrl);
```

et `AcceptedProposal` gagne `sourceAnswer?: SourceAnswer` (champ optionnel — une proposition qui
n'en porte pas se comporte exactement comme avant).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test`
Expected: PASS.

- [ ] **Step 5: MUTATION — remettre l'aveuglement et constater le rouge**

Dans `skills/splash/src/source-guard.ts`, remettre `return null;` en tête de
`droppedSourceUrlReason`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/source-guard.test.ts tests/validate-gate.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `2 fail` — le test de source-guard et celui du gate).
Restaurer, relancer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/src/source-guard.ts skills/splash/src/validate-gate.ts skills/splash/tests
git commit -m "feat(source): a URL the journalist gave cannot vanish unnoticed"
```

---

## Task 16 : D16 — le takeaway confirmé et le titre rendu, côte à côte, au moment où le journaliste agit

**Décision § 4.2, acquise : SIGNALER, ne pas bloquer.** Splash livre, et **dit clairement** que le
titre ne porte qu'une partie du takeaway confirmé, en montrant **les deux côte à côte**. Le
journaliste tranche. *Raison : un titre court est parfois le bon choix éditorial — 13 cas sur 83, ce
serait 13 blocages sur une décision qui appartient au journaliste.*

**Q5, acquise, et l'exception est ici.** D16 est **impossible dans la boucle par construction** : le
titre EST le takeaway, copié octet pour octet par les six assembleurs
(`lib/loop/assemble/chart-native.ts:20`, `dw-chart.ts:32`, `image-native.ts:62`, `map-dw.ts:162`,
`map-native.ts:169` et `:256`) — le design doc de taste le concède déjà
(`docs/superpowers/specs/2026-07-27-taste-fires-design.md:386`). C'est la seule exception à
« la boucle est le socle » de tout ce plan : pour D16, la réparation vit dans la prose, et elle
**reste un signalement**.

Trois faits mesurés qui contraignent la forme :

1. **Le contrôle actuel ne peut pas porter ce signal tel quel.** `lib/verify/taste.ts:287-306` mesure
   un **recouvrement** contre un plancher de `0.3` (`TAKEAWAY_OVERLAP_FLOOR`, `:30`) : il détecte une
   *divergence*, pas une *couverture partielle* ni un *dépassement*. « La moitié du takeaway »
   partage largement plus de 30 % de ses mots avec le tout ; « 9 ans biennaux » → « décennie après
   décennie » **ajoute** des mots sans en retirer. **Les deux formes mesurées par le sweep passent
   sous le seuil actuel.**
2. **La forme est la JUXTAPOSITION, pas le score.** Le takeaway confirmé et le titre rendu, l'un
   sous l'autre. Un pourcentage invite à discuter la métrique plutôt que le titre.
3. **Le moment existe déjà et porte déjà un canal.** `lib/verify/approval.ts:158` transporte
   `needsHumanEye: review.tasteRisk` jusqu'à la décision d'approbation, précisément pour ce genre de
   signal — mais vérifié : **rien ne le RENDE**. Ses seuls puits non-test sont des sérialisations
   (`lib/loop/approve.ts:244` l'écrit dans `signoffs/<id>.json`, `lib/loop/resume.ts:171` le recopie
   dans un objet de rapport). Le commentaire `:155-157` promet « the approval prompt can show it » —
   ce prompt n'existe pas dans ce dépôt. **C'est le lecteur manquant, et c'est le geste de cette
   tâche.**

**Files:**
- Modify: `lib/verify/taste.ts:25-31`, `:287-306`
- Modify: `lib/verify/taste.test.ts`
- Modify: `lib/host/drive.ts:290-297` (l'action `approve`)
- Modify: `lib/host/drive.test.ts`

**Interfaces:**
- Consumes: `TasteRiskSignal` (`lib/verify/types.ts:250-255` — `{ dimension, detector, evidence,
  routedTo: "human-signoff" }`, **sans** `outcome`/`severity`/`pass`, par construction).
- Produces:
  ```ts
  export const TAKEAWAY_COVERAGE_FLOOR = 0.6;
  /** Two lines, the confirmed takeaway and the rendered title, for a human to read side by
   *  side. Never a score. */
  export function juxtaposeTitleAndTakeaway(signals: TasteRiskSignal[]): string[];
  ```
  Deux `dimension` nouvelles : `"title-partial-coverage"` et `"title-overrun"`.

- [ ] **Step 1: Write the failing test**

Dans `lib/verify/taste.test.ts` :

```ts
  it("sees a title that carries half the confirmed takeaway", () => {
    // Measured (fix-scatter-snake-headers, frontaliers-dots, …): half the takeaway. Overlap is
    // WELL above the 0.3 divergence floor, so the existing detector says nothing.
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway:
        "Rents rose fastest in Geneva while wages stagnated across the whole canton",
      renderedTitle: "Rents rose fastest in Geneva",
    });
    expect(signals.map((s) => s.dimension)).toContain("title-partial-coverage");
  });

  it("sees a title that says MORE than was confirmed", () => {
    // Measured (cloudflare-embed-scrolly): "9 biennial years" became "decade after decade" —
    // words ADDED, none removed. Overlap-based detection is structurally blind to this.
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway: "Nine biennial years of measurements",
      renderedTitle: "Nine biennial years of measurements, decade after decade of decline",
    });
    expect(signals.map((s) => s.dimension)).toContain("title-overrun");
  });

  it("says nothing when the title is the takeaway", () => {
    const t = "Rents rose fastest in Geneva";
    expect(
      detectTasteRisks({ captures: [], confirmedTakeaway: t, renderedTitle: t }).map(
        (s) => s.dimension,
      ),
    ).not.toContain("title-partial-coverage");
  });

  it("shows the two strings side by side, and no score", () => {
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway: "Rents rose fastest in Geneva while wages stagnated",
      renderedTitle: "Rents rose fastest in Geneva",
    });
    const lines = juxtaposeTitleAndTakeaway(signals);
    expect(lines.join("\n")).toContain("Rents rose fastest in Geneva while wages stagnated");
    expect(lines.join("\n")).toContain("Rents rose fastest in Geneva");
    expect(lines.join("\n")).not.toMatch(/\d+\s?%/);
  });
```

Dans `lib/host/drive.test.ts` :

```ts
  it("puts the juxtaposition where the journalist has to act", () => {
    // needsHumanEye was carried to approval and rendered by NOBODY: its only non-test sinks
    // were a JSON file and a report object. A signal nobody sees is not a signal.
    const r = nextActionsForElement(runWithPartialTitle, elementWithPartialTitle);
    const approve = r.find((a) => a.action === "approve");
    expect(approve?.detail ?? "").toContain("you confirmed:");
    expect(approve?.detail ?? "").toContain("the title reads:");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test verify/taste.test.ts host/drive.test.ts`
Expected: FAIL — `juxtaposeTitleAndTakeaway` n'existe pas ; les dimensions ne sont pas émises.

- [ ] **Step 3: Write minimal implementation**

`lib/verify/taste.ts` — à côté de `TAKEAWAY_OVERLAP_FLOOR` (`:30`) :

```ts
/** Below this share of the confirmed takeaway's content words, the title carries a PART of what
 *  was confirmed. Distinct from TAKEAWAY_OVERLAP_FLOOR, which measures DIVERGENCE: "half the
 *  takeaway" shares far more than 30% of its words with the whole, so the divergence floor is
 *  structurally blind to it — as is any overlap measure to a title that ADDS words. Both forms
 *  the sweep measured (13/83) pass the existing threshold. */
export const TAKEAWAY_COVERAGE_FLOOR = 0.6;
```

dans `detectTasteRisks`, après le bloc de divergence existant (`:287-306`) :

```ts
  if (input.renderedTitle?.trim()) {
    const takeaway = contentWords(input.confirmedTakeaway);
    const title = contentWords(input.renderedTitle);
    if (takeaway.size > 0) {
      const carried = [...takeaway].filter((w) => title.has(w)).length;
      const added = [...title].filter((w) => !takeaway.has(w));
      if (carried / takeaway.size < TAKEAWAY_COVERAGE_FLOOR)
        signals.push({
          dimension: "title-partial-coverage",
          detector: "title-covers-takeaway",
          evidence: [input.confirmedTakeaway, input.renderedTitle],
          routedTo: "human-signoff",
        });
      // A title may legitimately be SHORTER. It may not legitimately assert MORE than was
      // confirmed: "9 biennial years" → "decade after decade" is a claim nobody signed.
      if (added.length > 0 && carried === takeaway.size)
        signals.push({
          dimension: "title-overrun",
          detector: "title-adds-to-takeaway",
          evidence: [input.confirmedTakeaway, input.renderedTitle],
          routedTo: "human-signoff",
        });
    }
  }
```

`TasteDimension` gagne les deux membres dans `lib/verify/types.ts`.

Puis la juxtaposition — **deux chaînes, jamais un score** :

```ts
/** The two strings, one under the other, for a human to read at the moment they decide.
 *
 *  No percentage: a coverage number invites an argument about the metric instead of a look at
 *  the title, and the decision belongs to the journalist either way (spec §4.2). */
export function juxtaposeTitleAndTakeaway(signals: TasteRiskSignal[]): string[] {
  const out: string[] = [];
  for (const s of signals) {
    if (s.dimension !== "title-partial-coverage" && s.dimension !== "title-overrun") continue;
    const [takeaway, title] = s.evidence;
    out.push(
      s.dimension === "title-overrun"
        ? "the title says more than you confirmed — read both:"
        : "the title carries part of what you confirmed — read both:",
      `  you confirmed: ${takeaway}`,
      `  the title reads: ${title}`,
    );
  }
  return out;
}
```

`lib/host/drive.ts:290-297` — l'action `approve` porte les lignes :

```ts
  if (action === "approve") {
    const lines = juxtaposeTitleAndTakeaway(tasteRiskOf(el));
    return {
      action,
      detail:
        'presented, and publishing it is a human decision: "approve --run <dir>" (read the ' +
        "artifact first)" +
        (lines.length ? `\n${lines.join("\n")}` : ""),
    };
  }
```

où `tasteRiskOf(el)` lit `el.review?.tasteRisk ?? []` — la valeur que `lib/verify/approval.ts:158`
transporte déjà et que rien ne rendait.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test`
Expected: PASS.

- [ ] **Step 5: MUTATION — remettre le seuil aveugle et constater le rouge**

Dans `lib/verify/taste.ts`, remettre `export const TAKEAWAY_COVERAGE_FLOOR = 0;`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test verify/taste.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `2 fail` — la couverture partielle et la
juxtaposition qui n'a plus rien à juxtaposer). Puis remettre `return [];` dans
`juxtaposeTitleAndTakeaway` et relancer `bun test host/drive.test.ts` : **FAIL**, `1 fail`.
Restaurer les deux : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/verify/taste.ts lib/verify/taste.test.ts lib/verify/types.ts lib/host/drive.ts lib/host/drive.test.ts
git commit -m "feat(verify): the confirmed takeaway and the rendered title, side by side at sign-off"
```

---

## Task 17 : une seule liste de placeholders, la plus stricte

**Décision Q6, acquise :** UNION des deux listes, **la plus stricte gagne**, dans **UN SEUL module
partagé** — plus jamais deux listes. *Un blocage injuste sur une URL légitime rare est une friction
visible et réversible ; un placeholder qui atteint le lecteur est un mensonge publié.* Base : la
regex V2 `lib/core/contract.ts:66`, **étendue des TLD de V1** `skills/splash/src/source-guard.ts:14-15`.

Les deux implémentations divergentes, vérifiées mot pour mot :

```
skills/splash/src/source-guard.ts:14: const RESERVED_TLDS = new Set(["example", "test", "invalid", "localhost"]);
skills/splash/src/source-guard.ts:15: const RESERVED_DOMAINS = new Set(["example.com", "example.org", "example.net"]);
lib/core/contract.ts:66:  if (/(^|\.)(localhost|example|invalid|placeholder|todo)(\.|$)/i.test(host))
```

Les deux fuites croisées, dérivées de ces lignes : `https://data.test/x` — V1 refuse (TLD `test`
réservé), V2 **accepte** (`test` n'est pas dans son alternation). `https://todo.com/x` — V2 refuse
(label `todo`), V1 **accepte** (TLD `com`, registrable `todo.com` hors liste).

Le geste est donc précisément : ajouter `test` à l'alternation V2, et faire lire cette unique
alternation aux deux appelants. **Attention à ne pas casser les non-faux-positifs que V1 documente**
(`source-guard.ts:38` : `myexample.com`, `example-data.fr`, `testing.gov.uk` ne doivent PAS être
rejetés) — la regex V2 étant bornée par label, ils passent tous.

`lib/core/contract.ts:55-69` a **10 appelants** non-test :

```
$ grep -rn "isHostedUrl" lib skills --include="*.ts" --include="*.mjs" | grep -v "\.test\." | wc -l
```

**Files:**
- Create: `lib/core/placeholder-host.ts`, `lib/core/placeholder-host.test.ts`
- Modify: `lib/core/contract.ts:55-69`
- Modify: `skills/splash/src/source-guard.ts:1-50`
- Modify: `lib/core/contract.test.ts`, `skills/splash/tests/source-guard.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  ```ts
  export const PLACEHOLDER_LABELS: readonly string[];
  export const PLACEHOLDER_LABEL_RE: RegExp;
  export function isPlaceholderHost(host: string): boolean;
  export function placeholderHostReason(host: string): string | null;
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/core/placeholder-host.test.ts` :

```ts
import { describe, expect, it } from "bun:test";
import {
  isPlaceholderHost,
  placeholderHostReason,
  PLACEHOLDER_LABELS,
} from "./placeholder-host";

describe("one placeholder list, the strictest of the two", () => {
  it("is the union of what each of the two used to catch", () => {
    expect([...PLACEHOLDER_LABELS].sort()).toEqual(
      ["example", "invalid", "localhost", "placeholder", "test", "todo"].sort(),
    );
  });

  it("closes the two measured cross-leaks", () => {
    // data.test passed the V2 policy and failed the V1 guard; todo.com did the opposite.
    expect(isPlaceholderHost("data.test")).toBe(true);
    expect(isPlaceholderHost("todo.com")).toBe(true);
  });

  it("still lets through the legitimate hosts V1 documented as non-hits", () => {
    // source-guard.ts:38 names these three explicitly — a label-bounded match, never substring.
    expect(isPlaceholderHost("myexample.com")).toBe(false);
    expect(isPlaceholderHost("example-data.fr")).toBe(false);
    expect(isPlaceholderHost("testing.gov.uk")).toBe(false);
  });

  it("says WHY, in one sentence a journalist can act on", () => {
    expect(placeholderHostReason("x.example.com")).toContain("example");
    expect(placeholderHostReason("www.bfs.admin.ch")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/placeholder-host.test.ts`
Expected: FAIL — `Cannot find module './placeholder-host'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/core/placeholder-host.ts` :

```ts
// THE placeholder list. One, shared, and the strictest of the two it replaces.
//
// There were two, both terminal, each letting through what the other rejected:
//   V1 skills/splash/src/source-guard.ts — RFC-2606 TLDs (example/test/invalid/localhost) plus
//      the three example.com/.org/.net registrable domains. Positional: the TLD only.
//   V2 lib/core/contract.ts — a label-bounded alternation (localhost|example|invalid|
//      placeholder|todo), any label of the host.
// So `https://data.test/x` passed V2 and failed V1; `https://todo.com/x` did the opposite.
//
// The union, label-bounded (V2's shape, extended with V1's `test`). An unfair block on a rare
// legitimate URL is visible friction a journalist can report and we can reverse; a placeholder
// that reaches the reader is a published lie. That asymmetry is the whole arbitration.
//
// NOT substring matching: source-guard.ts:38 documents myexample.com, example-data.fr and
// testing.gov.uk as deliberate NON-hits, and they stay non-hits here.

export const PLACEHOLDER_LABELS: readonly string[] = [
  "localhost",
  "example",
  "invalid",
  "placeholder",
  "todo",
  "test",
];

export const PLACEHOLDER_LABEL_RE = new RegExp(
  `(^|\\.)(${PLACEHOLDER_LABELS.join("|")})(\\.|$)`,
  "i",
);

export function isPlaceholderHost(host: string): boolean {
  return PLACEHOLDER_LABEL_RE.test(host);
}

/** One sentence, or null. Journalist-facing: it names the label that fired and why the address
 *  is not citable, never an internal rule id. */
export function placeholderHostReason(host: string): string | null {
  const m = PLACEHOLDER_LABEL_RE.exec(host);
  if (!m) return null;
  return (
    `source URL host "${host}" uses the reserved placeholder label "${m[2]}" ` +
    `(RFC 2606/6761) — not a real, citable dataset URL`
  );
}
```

`lib/core/contract.ts:66-67` :

```ts
  if (isPlaceholderHost(host)) return false;
```

`skills/splash/src/source-guard.ts` — supprimer `RESERVED_TLDS` (`:14`) et `RESERVED_DOMAINS`
(`:15`), et faire de `placeholderSourceReason` (`:40-50`) un délégué :

```ts
export function placeholderSourceReason(url: string): string | null {
  const host = extractHost(url);
  if (!host) return null;
  // ONE list, shared with lib/core/contract.ts's isHostedUrl. Two lists is what let
  // `https://data.test/x` through the policy and `https://todo.com/x` through the guard.
  return placeholderHostReason(host);
}
```

- [ ] **Step 4: Run test to verify it passes**

```
cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit && bun test
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test
```
Expected: PASS. Les suites existantes qui verrouillent le comportement V1
(`skills/splash/tests/source-guard.test.ts:14-91`) et V2 (`lib/core/contract.test.ts:121-129`,
`skills/splash/tests/export-guard.test.ts:210-233`) restent vertes — la liste unifiée est un
sur-ensemble strict de chacune. Si l'une rougit, c'est un cas que l'ancienne liste ACCEPTAIT : le
lire, et confirmer que le rejet est voulu avant de toucher au test.

- [ ] **Step 5: MUTATION — rescinder l'union et constater le rouge**

Dans `lib/core/placeholder-host.ts`, retirer `"test"` de `PLACEHOLDER_LABELS`.
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test core/placeholder-host.test.ts`
Expected: **FAIL**, noter le chiffre (attendu : `2 fail` — la liste et la fuite `data.test`). Puis
retirer `"todo"` et relancer : la seconde fuite rougit aussi. Restaurer : `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/placeholder-host.ts lib/core/placeholder-host.test.ts lib/core/contract.ts \
        lib/core/contract.test.ts skills/splash/src/source-guard.ts skills/splash/tests/source-guard.test.ts
git commit -m "fix(source): one placeholder list, the strictest of the two"
```

---

## Task 18 : le gate complet, la doc du skill, et le registre corrigé

Trois choses qu'aucune tâche précédente ne pouvait faire seule : le gate en une fois, la doc du skill
mise en cohérence avec ce que le code fait désormais, et les **huit corrections du § 8** reportées
dans le registre — y compris celle que ce plan a établie CONTRE la spec.

**Files:**
- Modify: `skills/splash/SKILL.md`
- Modify: `skills/splash/tests/skill-doc-parity.test.ts`
- Modify: `docs/splash/sweep-2026-07-28-triage.md`
- Modify: `docs/splash/CHANGELOG.md`
- Modify: `CLAUDE.md` (§ État courant)

**Interfaces:**
- Consumes: tout ce que les tâches 1-17 produisent.
- Produces: rien de mécanique.

- [ ] **Step 1: Run the full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check`
Expected: `22/22 checks passed.` Si `test skills/map-native` échoue seul, relancer isolé avant de
conclure — le produce interactif MapLibre est lent/flaky sous contention (connu, CLAUDE.md), pas une
régression.

- [ ] **Step 2: Update SKILL.md**

Quatre passages, chacun aligné sur un comportement que le code tient maintenant :

1. **La langue** — la section CADRAGE gagne une phrase : *le journaliste n'est PAS interrogé sur la
   langue (le plafond de 6 questions est déjà dépassé) ; la langue de l'article est DÉCLARÉE au
   moment de l'INPUT et confirmée en retour avec la prochaine action.* Nommer l'ordre :
   signal explicite > langue de l'article > profil maison, et que le profil n'écrase jamais.
2. **La cinquième langue** — le refus est énoncé AU MOMENT DE L'OFFRE, jamais à la livraison, et
   renvoie à `docs/splash/language-debt.md`.
3. **L'unité** — la règle est explicitée telle qu'elle est appliquée : l'unité est dite **une fois,
   dans le sous-titre**, sur les rendus autonomes (`BarChart.tsx:98-101`), et cela vaut aussi pour un
   chart Datawrapper (tâche 11). Sur les cartes, elle accompagne les valeurs via `valueUnit`.
4. **D16** — la juxtaposition : si le titre ne porte qu'une partie du takeaway confirmé, splash
   **livre** et **montre les deux**. Le journaliste tranche. Écrire noir sur blanc que dans la chaîne
   en prose ce signalement dépend du même acteur qui a écrit le titre, donc qu'il n'y a **pas de
   moment forcé** — c'est une dépendance famille A, pas un manque de B.

Mettre `skills/splash/tests/skill-doc-parity.test.ts` en accord avec les nouvelles phrases si ce
test verrouille des chaînes de la doc.

- [ ] **Step 3: Report the eight § 8 corrections into the register**

Dans `docs/splash/sweep-2026-07-28-triage.md`, sous chaque entrée D concernée, une ligne
« **Corrigé au chantier famille B (2026-07-29)** » :

- **D12** — le fichier nommé est faux : `symbol-story.ts` ne contient aucun superlatif ni branche
  fr/en. Les sites réels sont `skills/scrolly/src/chapters.ts:118-127`,
  `skills/chart-native/src/chart-story.ts:467-480`, `skills/map-native/src/map-story.ts:382-405`,
  et `skills/map-native/src/cartogram-story.ts` (aucun `lang` du tout).
- **D28** — ce n'est pas « un correctif d'une ligne ». **22 fichiers visibles** aveugles à la locale
  (11 chart-native, 9 map-native, 2 scrolly), dont **11 modules n'important aucun helper**.
- **D29** — `cafe-production-symbol` **n'est pas reproductible dans `main`** :
  `skills/map-native/src/SymbolMap.tsx:528` appelle bien `labelWithUnit`. Le registre a enregistré
  un artefact de run comme un défaut de code.
- **D25/D26** — ensembles de types **disjoints** : les 11 types à palette de rôles n'écrivent jamais
  de préoccupation de couleur maison. Les regrouper sous « couleur » suggère un recouvrement qui
  n'existe pas.
- **D10** — mal classé : sa garde est **déjà terminale** dans la V1 (`validate-gate.ts:615-616`,
  poussée en `extraErrors` avant tout producteur). 4 cas = contournement ou non-atteinte, donc
  famille A. Ce qui restait en B était la divergence des deux listes — **fermée, tâche 17**.
- **Prose vs boucle** — le registre ne distingue jamais les deux chaînes. D16 est **impossible dans
  la V2** ; D17/D18/D10 y sont fermés par un mécanisme différent (déclaration + table de classes,
  jamais un match de sous-chaîne). Compter 19/83 sans dire de quelle chaîne il s'agit **surestime**
  le travail restant.
- **§ 8.7 — la spec de la famille B avait tort** : `lib/loop/assemble/scrolly.ts` est un pur
  dispatcheur, les deux délégués portent `source`. Aucun scrolly de la boucle ne part sans
  attribution. La preuve de régression est dans `lib/loop/assemble/scrolly.test.ts` (tâche 10).
- **§ 8.8 — la spec avait raison** : le choroplèthe émettait `unit` là où le composant lit
  `valueUnit`. Fermé, tâche 10.

- [ ] **Step 4: Write the CHANGELOG entry**

Une entrée datée dans `docs/splash/CHANGELOG.md` : ce qui a été fermé, **avec ses mesures** (les
chiffres avant/après du grep locale-reach, le nombre d'émetteurs de `colour-semantics` passé de 2 à
≥ 4, les 22 fichiers ramenés à 0 dette), les deux moitiés explicitement **déférées à la famille A**
(le refus terminal de `source-fidelity` ; le moment forcé du signalement D16 dans la prose), et le
risque assumé qui reste ouvert : *un signalement reste un signalement — si le moment forcé de la
famille A n'arrive pas, D16 et D25 se lisent en diagonale.*

- [ ] **Step 5: Update CLAUDE.md § État courant**

Deux ou trois lignes : la famille B fermée côté porteur/lecteur/comparaison, le gate à 22/22, et le
pointeur vers ce plan et sa spec.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/SKILL.md skills/splash/tests/skill-doc-parity.test.ts \
        docs/splash/sweep-2026-07-28-triage.md docs/splash/CHANGELOG.md CLAUDE.md
git commit -m "docs(family-b): the register is corrected where the code contradicted it"
```

---

## Auto-revue

Faite après écriture, sur les trois axes que la skill impose.

### 1. Couverture de la spec

| exigence de la spec | tâche |
|---|---|
| § 3.1 D12 — la langue n'a aucun porteur | 1, 5, 6 |
| § 3.1 D12 — l'axe binaire `isFrench` (5 sites mesurés) | 2 |
| § 3.1 D18 — l'URL du journaliste, premier hop | 15 |
| § 3.1 D18/D12 — perte d'URL déterministe sur Datawrapper non anglais | 3 |
| § 3.2 D25 — `brand-concerns.json` sans lecteur | 12 |
| § 3.2 D28 — les labels de valeur aveugles | 7, 8, 9 |
| § 3.2 D29 — l'unité qui n'atteint pas le lecteur | 10, 11 |
| § 3.2 D26 moitié « annonce » | 13 |
| § 3.3 D16 — deux champs jamais comparés | 16 |
| § 3.3 D17 — la comparaison littérale | 14 |
| § 3.3 D26 moitié « rendu » | 13 (à la cause) — le diff post-rendu est le contournement NOMMÉ que § 4.4 interdit ; aucune tâche ne le prend |
| § 4.1 D17 ordre : assouplir d'abord | 14 (et la terminaison explicitement déférée à A) |
| § 4.2 D16 signaler + où + quand | 16 |
| § 4.3 D25 signaler ET proposer | 12 (`nearestOkabeIto`) |
| § 4.4 D26 corriger à la cause | 13 |
| § 5 D10 → une seule chose reste : les deux listes | 17 |
| § 6 Q1 langue | 1, 5 |
| § 6 Q2 cinquième langue | 4 |
| § 6 Q3 unité | 10, 11 (les 30 composants NON touchés, comme décidé) |
| § 6 Q4 la classe, par une garde | 7, 8, 9 |
| § 6 Q5 quelle chaîne | toutes (`lib/` d'abord) ; exception D16 écrite en tête de tâche 16 |
| § 6 Q6 placeholders | 17 |
| § 7 le pic de rouge après avoir nourri la langue | ordre imposé : 2 et 3 AVANT 6 |
| § 8.7 scrolly sans source | 10 (retourné en preuve — la spec avait tort) |
| § 8.8 choroplèthe `unit` vs `valueUnit` | 10 |

**Aucun trou.** Deux exigences sont volontairement NON traitées et le disent : la terminaison de D17
(famille A) et le moment forcé de D16 dans la prose (famille A). Elles sont nommées dans l'en-tête et
répétées en tâche 18.

### 2. Chasse aux placeholders

Relu à la recherche de « TBD », « similar to Task N », « add error handling », « write tests for the
above », d'un pas sans code là où du code est dû. **Trois zones nécessitent une vérification par
l'exécutant plutôt qu'une valeur figée, et chacune dit COMMENT l'obtenir** — ce ne sont pas des
placeholders, ce sont des mesures locales :

- tâche 8, le nom d'export réel de `SlopeChart.tsx` → `grep -n "^export" skills/chart-native/src/SlopeChart.tsx`.
- tâche 8/9, le nom du paramètre de config par fichier (`config.lang` vs `spec.lang`) → à lire
  fichier par fichier ; l'expression à écrire est donnée en entier.
- tâches 8, 9, 14, 15, les fixtures existantes des suites de tests concernées → à réutiliser plutôt
  qu'à recréer, avec le nom de la suite qui les porte.

### 3. Cohérence des types entre tâches

- `resolveLanguage` (T1) → `initRun(opts.profileLang)` (T5) → `RunManifest.lang` (T5) →
  `ProductionBrief.lang` (T6) → `<spec>.lang` (T6). Un seul nom de champ, `lang`, à chaque hop ;
  `articleLang` n'existe que sur l'entrée déclarative, jamais sur le manifeste.
- `storyCopy` (T2) est étendu par T9 (`meanOf`, `pointCount`) — l'extension est écrite dans T9 avec
  ses quatre lignes, pas laissée à deviner.
- `BrandConcern` est défini en T12 (`lib/core/brand-concern.ts`, ré-exporté par
  `skills/chart-native/src/core/conformance.ts`) et consommé par `announcedColourFindings` (T12) et
  `review-gate.mjs` (T12). Aucun autre nom (`Concern`, `BrandIssue`) n'apparaît nulle part.
- `honoursBaseColor` (T13) alimente le paramètre `honoured` de `announcedColourFindings` (T12) —
  **T12 précède T13**, donc T12 définit le paramètre et T13 le branche ; c'est écrit dans les deux
  blocs Interfaces.
- `isPlaceholderHost` / `placeholderHostReason` (T17) remplacent `RESERVED_TLDS`/`RESERVED_DOMAINS`
  et la regex inline — aucun appelant de `placeholderSourceReason` ni d'`isHostedUrl` ne change de
  signature, donc les 10 appelants mesurés de `isHostedUrl` restent intacts.
- `SourceAnswer` (T15) est distinct de `SourceHint` (existant) et le commentaire dit pourquoi les
  deux coexistent — pas de fusion silencieuse.
- `nameAppearsIn` (T14) vit dans `lib/source/`, importé par `skills/splash/src` : direction légale.
- `announcedColourFindings` (T12) importait un type depuis `skills/` — **violation de layering
  attrapée à l'auto-revue** et corrigée dans la tâche elle-même par le déplacement de `BrandConcern`
  vers `lib/core/brand-concern.ts`, sur le modèle de `lib/core/i18n-furniture.ts` ré-exporté par
  `skills/dw-chart/src/furniture-i18n.ts:1`.
