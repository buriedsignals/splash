# Native a11y — render-time contrast harness + Group-A label fixes (2026-07-07)

> **Reprise :** lis `CLAUDE.md` (blocs `★ État` en fin de fichier) + `docs/superpowers/2026-07-06-native-couture-handoff.md`
> (grounding scouté des types + le finding a11y systémique) + `git log --oneline -20`. Cette spec règle la
> décision de conception ouverte du handoff et cadre le lot a11y (Group A).

## Problème

Plusieurs composants chart-native peignent leurs **labels de valeur dans la couleur du MARK**
(vermillon `#D55E00` ≈ 3.87:1, orange ≈ 2.25:1 sur blanc) — même classe WCAG que le bug stacked-area
corrigé le 2026-07-06. Types touchés (grounding handoff) : **diverging** (`DivergingBarChart.tsx:236`),
**dumbbell** (`DumbbellChart.tsx:297,308` — le pire, orange 2.25:1), **waterfall** (`WaterfallChart.tsx:282-292`),
**bullet** (label mesure en vermillon), **slope** (end-labels highlight en accent).

La garde produce actuelle ne l'attrape pas : `produce-conformance.ts` **passe `textColors` à la main**
(littéral `[COLORS.ink, COLORS.muted]` par type, ex. `produce-conformance.ts:275,297,317`). Le check WCAG
tourne sur *ce qu'on lui dit que les labels sont*, pas sur ce que le composant **peint** réellement. Donc :
(1) les bugs ci-dessus sont invisibles à la garde ; (2) un futur edit réintroduisant un label couleur-mark
**passe en silence** — seul le render-verify humain l'attrape. C'est la décision de conception ouverte du
handoff : discipline manuelle vs enhancement mécanique.

## Décision de conception (tranchée en brainstorming)

**Enhancement mécanique au render**, échantillonnage pixel réel, périmètre : harnais + fix les 5 +
productionisation E2E du sous-ensemble propre. Trois décisions verrouillées :

1. **Anti-régression = harnais de contraste au render** (pas discipline manuelle, pas couplage source-partagée).
   Rationale : `snap-a11y.mjs` ouvre déjà le SVG **rendu** dans Playwright au produce et **gate déjà le run**
   (`produce.mjs:82`). Un check de contraste texte est une **extension d'une garde existante**, pas une infra
   neuve. Il attrape **toute la classe label-en-couleur-mark pour les ~40 types, mécaniquement, pour toujours**,
   zéro discipline par-type. Les gardes par-type restent focalisées sur structure + palette-mark ; le harnais
   possède la dimension **contraste-texte**.
2. **Fond de chaque texte = échantillonnage pixel réel** (pas fond-page + annotation opt-out). Un label
   vermillon sur blanc = bug ; un label blanc DANS une case waffle colorée = correct. Seul l'échantillonnage
   du pixel réel derrière le glyphe distingue les deux **sans annotation par-composant** (ce qu'on cherche
   justement à éliminer).
3. **Périmètre** : harnais (systémique) + fix les **5** composants (le vrai bug WCAG) + productioniser E2E
   les **3 mappers propres** (diverging, waterfall, dumbbell) ; **bullet + slope restent `deferred`** mais
   **fixés + couverts-harnais** (mappers lourds → lot couture ultérieur ; l'invariant autorise
   guarded-but-unreachable).

## Architecture — 3 pistes qui composent

### Piste 1 — `scripts/snap-contrast.mjs` (le cœur, nouvelle garde système)

- **Cible : le build static** — là où les labels directs sont peints. L'interactif les supprime
  (tooltip-XOR labels, discipline map/chart) ; la vidéo réutilise le même composant que static (mêmes
  labels) → un seul passage static suffit. Attendre le settle du reveal (p=1, ~2.1 s) comme `snap-a11y.mjs`.
- **Algorithme, par nœud `<text>` du SVG** :
  1. lire sa bounding box (`getBoundingClientRect`) ;
  2. masquer le glyphe (`visibility:hidden` sur le `<text>` seul) — **avant** le screenshot, pour qu'aucun
     pixel de glyphe anti-aliasé ne contamine l'échantillon de fond ;
  3. screenshot de la bbox (clip) → lire la couleur de fond à **plusieurs points** de la bande centrale ;
  4. restaurer la visibilité ;
  5. contraste WCAG `fill` (couleur de texte calculée via `getComputedStyle`) vs le fond échantillonné.
- **Worst-case** : sur les multi-échantillons, garder le **pire** ratio (label à cheval sur 2 segments
  empilés → conservateur). Un **halo blanc** (paint-order stroke pour lisibilité on-mark) devient
  naturellement le fond échantillonné → géré sans cas spécial.
- **Seuil : 4.5:1 uniforme** (pas d'exemption large/gras 3:1 AA). **Non seulement conservateur mais
  nécessaire** : les bugs visés (vermillon 3.87, orange 2.25) tombent dans la bande 3–4.5 ; un check
  WCAG-tieré laisserait passer un label vermillon large (3.87 ≥ 3). Le 4.5 uniforme les attrape tous.
- **Math** : réutiliser `contrastRatio(a,b)` (`conformance.ts:38`, déjà sourcé WCAG) — pas de nouvelle
  implémentation. La fonction prend deux `#rrggbb` ; le pixel échantillonné est converti en `#rrggbb`.
- **Sortie / gate** : échec = liste `{text, fill, bg, ratio}` fautifs → exit ≠ 0. Câblé dans `produce.mjs`
  **juste après `snap-a11y`**. Un run produce échoue sur une vraie violation, avant tout export.
- **TDD système** : pointé sur les builds **actuels** (non-fixés) des 5 types → **doit être RED** (preuve
  qu'il attrape de vrais bugs) ; GREEN après chaque fix composant.

### Piste 2 — fix des 5 composants (label→ink)

Règle établie : **« le label porte la valeur, le mark porte la teinte »** (précédent vermillon +
stacked-area). Value labels peints `fill={markColor}` → `fill={COLORS.ink}` ; le signe/rôle/série reste
porté par la **couleur du MARK** (+ poids bold pour l'emphase). Points exacts (à re-scouter au render si
besoin) :

| Type | Fichier:ligne | Correctif |
|---|---|---|
| diverging | `DivergingBarChart.tsx:236` | label signé `fill={fill}` (NEG vermillon) → `COLORS.ink` |
| dumbbell | `DumbbellChart.tsx:297,308` | 2 labels valeur en couleur-mark (orange 2.25:1) → `COLORS.ink` |
| waterfall | `WaterfallChart.tsx:282-292` | label signé en couleur-rôle vermillon → `COLORS.ink` |
| bullet | `BulletChart.tsx` (label mesure) | label mesure en vermillon → `COLORS.ink` |
| slope | `SlopeChart.tsx` (end-labels highlight) | end-labels highlight en accent → `COLORS.ink` |

Chaque fix vérifié : **harnais GREEN pour ce type + render-verify PNG par moi** (le mark garde sa teinte,
le label est lisible en ink).

### Piste 3 — productionisation E2E des 3 mappers propres

Recette prouvée (handoff), **garde AVANT mapper**, vert après chaque tâche, pour **diverging, waterfall,
dumbbell** :

1. **Palette** : extraire l'ARRAY module-private du composant vers `core/tokens.ts` (pour que la garde
   peigne exactement les mêmes couleurs que le composant) — `DIVERGING_SIGN_COLORS=[blue,vermillion]`,
   `DUMBBELL_DOT_COLORS=[orange,blue]`, waterfall roleColors. Une palette qui n'est qu'un alias
   `OKABE_ITO.<x>` n'a pas besoin d'extraction.
2. **Garde** : case inline dans `produce-conformance.ts` réutilisant le check existant
   (`checkDivergingBarConformance` `conformance.ts:153`, `checkWaterfallConformance` `:190`,
   `checkDumbbellConformance` `:607`), `computeXLayout` pour `valueDomain` où requis. `textColors`
   **désormais honnête** `[ink, muted]` (vrai après le fix Piste 2).
3. **Mapper** : `spec-to-config.ts` — diverging & waterfall pie-style (catField=col0, valField=dernier
   numérique ; waterfall peut porter une colonne `total`) ; dumbbell paired (labelCol=col0, 2 numériques
   = start/end).
4. **Famille** : entrée dans `native-family-types.ts` (diverging→`deviation`, waterfall→`deviation`,
   dumbbell→`magnitude`/`ranking`).
5. **Flip** : retirer `deferred` dans `native-types.ts`.
6. **SKILL.md** : annoncer les 3 types + notes de forme CSV (le suggesteur LLM ne les émet que s'ils y sont —
   leçon batch-1 : câblé-en-code ≠ atteignable).
7. **KB** : refs existent (`diverging-bar.md`, `waterfall.md`, `dumbbell.md`) — vérifier, pas auteurer.
8. **Render-verify PNG par moi** pour chacun.

**bullet + slope** : Piste 2 (fix) + couverture harnais seulement. Restent `deferred(reason)` dans
`native-types.ts` (mappers lourds : bullet synthétise target/max/bands ; slope = 2-time-points spécial).
L'invariant complétude autorise guarded-but-unreachable → gate reste vert.

**Précondition donnée diverging** : les valeurs doivent traverser 0 (le check l'exige) — ② ne route
diverging que quand elles croisent zéro. Noté dans le mapper + SKILL.md.

## Séquence (TDD, subagent-driven, 1 type/sous-agent, review entre chaque)

1. **Harnais** `snap-contrast.mjs` → le pointer sur les builds actuels des 5 types → **RED** (preuve) →
   câbler dans `produce.mjs` après `snap-a11y`.
2. **Par type** (diverging → waterfall → dumbbell → bullet → slope) : fix composant label→ink →
   **harnais GREEN** pour ce type → **render-verify PNG**.
3. **Pour les 3 propres seulement** : productioniser E2E (Piste 3) → invariant complétude reste vert.
4. **bullet/slope** : fixés + couverts, restent `deferred(reason)`.

## Tests / gates (non négociables)

- `snap-contrast.mjs` = nouvelle garde produce (RED→GREEN par type). Un test unitaire minimal du seuil
  (réutilise `contrastRatio`) si le harnais introduit une helper pure de décision.
- `completeness.test.ts` + `suggest-chart/eval/tests/native-family-types.test.ts` couvrent les 3
  productionisés (reachable ⟹ guarded ∧ mapper ∧ famille ∧ ref KB).
- `bun run check` reste **vert** après chaque tâche.
- **Review par-tâche + whole-branch (opus)** avant merge — elles ont attrapé les vrais défauts de tout
  cet effort (SKILL.md sur-promesse, bugs a11y, dérive). Merge `--no-ff`. Enregistrer dans CLAUDE.md.
- **0 `any` / `@ts-ignore`, 0 mention Claude/Anthropic attributive, runtime Bun, brancher avant de coder.**

## Risques traités

- **Anti-alias** : glyphe masqué (`visibility:hidden`) AVANT screenshot → zéro pixel de glyphe dans
  l'échantillon de fond.
- **Fond multi-couleur** (label sur 2 segments) : multi-échantillon → worst-case.
- **Halo blanc on-mark** : le halo EST le fond effectif → l'échantillon derrière le glyphe (dans le halo)
  donne blanc → correct, sans cas spécial.
- **Static vs interactif** : harnais sur static (labels présents post-reveal) ; interactif supprime les
  labels ; vidéo = même composant que static.
- **Portée du harnais** : il **n'annule pas** les gardes structurelles (baseline-0, valueDomain,
  palette-mark Okabe-Ito) — il **ajoute** la dimension contraste-texte, mécaniquement, sur tous les types.
- **Faux positif décoratif** : gridlines/ticks ne sont pas des `<text>` de contenu ; si un `<text>`
  décoratif de faible contraste existe (peu probable), l'exclure par testid/rôle explicite, pas en
  baissant le seuil.

## Hors-scope (backlog, inchangé)

Parité conformance map-native (résolveur + câblage produce) · robustesse gardes layout (throw→violation
au boundary `runProduceConformance`) · DotStripChart wording générique · export-time hash · release MIT
(REPO_URL + scrub) · scinder CLAUDE.md · Family B deferred (sankey/chord/heatmap/…).
</content>
</invoke>
