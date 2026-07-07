# Native Group A — productionize bullet + slope end-to-end (2026-07-07)

> **Reprise :** lis `CLAUDE.md` (blocs `★ État` en fin de fichier, dont le lot a11y du 2026-07-07) +
> `docs/superpowers/2026-07-06-native-couture-handoff.md` + `git log --oneline -20`. Ce lot **finit Group A** :
> bullet et slope sont déjà fixés a11y + couverts par la garde de contraste (merge `f5cb0d1`) ; il ne reste
> que la **couture** pour les rendre atteignables depuis un article.

## Problème

`main` : **17 types natifs atteignables**. bullet et slope sont `deferred` dans `native-types.ts` : leur
composant est a11y-propre et leur check de conformité existe (`checkBulletConformance` `conformance.ts:352`,
`checkSlopeConformance` `:568`), mais aucun **mapper**, **garde produce câblée**, **entrée famille**, ni
**ref KB** ne les rend atteignables. Ce sont les 2 mappers « lourds » que le plan du lot a11y avait différés.

## Grounding (vérifié ce jour)

1. **Les refs KB EXISTENT** au **repo-root** `knowledge/references/chart/types/{bullet,slope}.md` (bullet =
   Stephen Few sourcé ; slope = FT/Tufte sourcé). *(Piège Batch 1 re-confirmé : la KB vit au repo-root, PAS
   sous `skills/chart-native/` — un `ls` depuis le skill dit « absent » à tort.)* `completeness.test.ts`
   `KB_FILENAME` mappe `bullet→bullet.md`, `slope→slope.md` (défaut `${id}.md`). → **VÉRIFIER, ne pas
   auteurer.** slope.md documente déjà « exactly two points » (colle au mapper) ; bullet.md décrit les
   bandes qualitatives — notre défaut piste-neutre est le sous-ensemble honnête (multi-bandes différé).
2. **bullet + slope sont déjà fixés a11y** (lot du 2026-07-07 : `SlopeChart.tsx:345,365` et
   `BulletChart.tsx:271` rendent en `COLORS.ink`) → **aucun fix composant** dans ce lot, juste la couture.

## Recette (identique à Batch 3 « check-existe-mais-pas-câblé »)

Par type : extraire la palette module-private vers `core/tokens.ts` (garde = composant, single source) →
**garde inline** dans `produce-conformance.ts` réutilisant le check existant (garde AVANT flip) → **mapper**
dans `spec-to-config.ts` `MAPPERS` → **entrée famille** dans `native-family-types.ts` → **flip** off
`deferred` dans `native-types.ts` → **SKILL.md** (liste de clés + note de forme) → **VÉRIFIER la ref KB
(existe)** → **render-verify E2E** via le vrai `produce-from-spec.mjs`. L'invariant (`completeness.test.ts` +
`native-family-types.test.ts`) enforce reachable ⟹ guarded ∧ mapper ∧ famille ∧ KB. **1 tâche par type**
(la KB existant déjà, pas de tâche d'auteurage séparée).

## slope (le mapper propre)

`SlopeConfig` = `{title, source, unit, labelField, leftField, rightField, leftPeriod, rightPeriod,
highlightLabel?, rows}` (`SlopeChart.tsx`).

- **Mapper** : CSV wide `category, <période1>, <période2>` → `labelField`=col0 ; `leftField` = **1er**
  numérique, `rightField` = **dernier** numérique (les 2 points temporels) ; `leftPeriod`/`rightPeriod` =
  les **en-têtes** de ces 2 colonnes ; `highlightLabel` = `spec.highlight` (optionnel, la ligne qui
  contredit la tendance) ; `rows` = brut.
- **Garde** : `checkSlopeConformance(input{title,source,leftPeriod,rightPeriod,accentColor,lineColors[]},
  textColors)`. `accentColor` = ACCENT (vermillon, Okabe-Ito ✓) ; `lineColors` = `[muted, vermillon]`
  (2 distinct ≤2 ✓) ; `leftPeriod`/`rightPeriod` depuis config ; `textColors` = `[ink, muted]`. **Pas de
  compute-layout** (encodage position). Extraire `SLOPE_LINE_COLORS = [COLORS.muted, OKABE_ITO.vermillion]`
  dans `tokens.ts` ; le composant lit `CONTEXT=SLOPE_LINE_COLORS[0]`, `ACCENT=SLOPE_LINE_COLORS[1]`.
- **Famille** : `change-over-time` += `slope`. **SKILL.md** : slope = **exactement 2 points temporels**
  (comparaison 2019↔2024) ; sinon `line`/multi-lignes. **KB** : `slope.md` **existe** (FT/Tufte sourcé) → vérifier.

## bullet (le mapper dur — synthèse honnête)

`BulletConfig.rows` = `{label, unit, value, target, max, bands[]}[]` (`BulletChart.tsx`). Un article donne
au mieux `category, value, target` → le mapper **synthétise `max` et `bands`**.

- **Décisions verrouillées (Rémy)** :
  - **`max` par ligne** = `max(value, target)` **+ ~15 % de marge, arrondi** (nice ceil) — pour que le
    marqueur target ne colle pas le bord droit. Per-row (les KPI ont des échelles différentes).
  - **`bands = []`** (tableau VIDE) → `bullet-geometry.ts:88` calcule `edges = [0, ...bands, max]` = `[0, max]`
    → **une seule zone neutre grise** (piste), **aucun seuil qualitatif inventé** (respecte « on ne génère
    pas d'intention »). *(NB : `bands` = seuils INTÉRIEURS ; `[]` = 1 zone, `[t]` = 2 zones. `[max]` serait
    une zone dégénérée de largeur nulle — donc `[]`, pas `[max]`.)* **Multi-bandes = DIFFÉRÉ** (backlog +
    note SKILL.md : support de colonnes-de-seuils explicites plus tard ; sans seuils = piste neutre).
- **Mapper** : `label`=col0 ; `value` = colonne `value` (ou 1er numérique non-target) ; `target` = colonne
  nommée `target` (insensible casse) sinon 2e numérique ; `unit` par ligne = `spec.unit` ; `max` et `bands`
  synthétisés comme ci-dessus.
- **Garde** : `checkBulletConformance(input{title,source,measureColors[],rows:{target?}[]}, textColors)`.
  `measureColors` = `[HIT, MISS]` = `[blue, vermillon]` ; `rows` = `config.rows.map(r => ({target: r.target}))`
  (le check exige un target par ligne) ; `textColors` = `[ink, muted]`. **Pas de compute-layout**
  (normalisation per-row `[0,max]` par construction). Extraire `BULLET_MEASURE_COLORS = [OKABE_ITO.blue,
  OKABE_ITO.vermillion]` dans `tokens.ts` ; le composant lit `HIT=[0]`, `MISS=[1]`.
- **Famille** : `magnitude` += `bullet`. **SKILL.md** : router bullet **uniquement quand il y a une target**
  (KPI vs objectif) ; note « piste neutre par défaut, pas de bandes qualitatives inventées ». **KB** :
  `bullet.md` **existe** (Stephen Few sourcé) → vérifier.

## Séquence (TDD, subagent-driven, review entre chaque)

Ordre : slope d'abord (mapper propre, dérisque la mécanique), puis bullet (synthèse). **1 tâche par type**
(KB existe déjà) : palette→tokens → garde (avant mapper) → mapper → famille → flip → SKILL.md → vérifier KB →
render-verify E2E.

1. **slope** : extract `SLOPE_LINE_COLORS` + composant ; garde ; mapper ; famille+flip+SKILL ; vérifier `slope.md` ;
   render-verify E2E.
2. **bullet** : extract `BULLET_MEASURE_COLORS` + composant ; garde ; mapper (`max`=ceil(max(value,target)×1.15),
   `bands=[]`) ; famille+flip+SKILL ; vérifier `bullet.md` ; render-verify E2E.

## Tests / gates (non négociables)

- `completeness.test.ts` + `native-family-types.test.ts` couvrent bullet+slope (reachable ⟹ guarded ∧
  mapper ∧ famille ∧ KB). `bun run check` **vert** après chaque tâche.
- **Render-verify E2E par le contrôleur** (Read le PNG) au vrai `produce-from-spec.mjs` : slope (2 périodes,
  ligne accent + labels ink, périodes en légende), bullet (mesure vs target sur piste neutre grise, HIT bleu
  / MISS vermillon, target marqueur visible avec marge).
- La garde de contraste `snap-contrast.mjs` tourne au produce sur les 2 types (déjà a11y-propres → GREEN).
- Review par-tâche + **whole-branch opus** avant merge `--no-ff`. 0 `any`/`@ts-ignore`, 0 mention vendor,
  runtime Bun. KB : URLs réelles seulement.

## Hors-scope (backlog)

- **Multi-bandes bullet** (colonnes de seuils qualitatifs explicites → bandes segmentées) — différé.
- Reste couture Family A : bump/pyramid/diverging-stacked/fan/treemap.
- Satellites inchangés : parité conformance + harnais-contraste map-native ; WaterfallChart labels de
  catégorie longs (framing) ; hash export-time ; release MIT ; scinder CLAUDE.md.
