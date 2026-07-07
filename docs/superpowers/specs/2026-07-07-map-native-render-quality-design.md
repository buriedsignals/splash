# Map-native — render-quality fixes (8 confirmed bugs) (2026-07-07)

> **Reprise :** lis `CLAUDE.md` (fin de fichier) + `git log --oneline -15`. Ce lot suit immédiatement la parité
> conformance-au-produce map-native. Il corrige **8 bugs de rendu confirmés** trouvés par un audit multi-agents
> (4 lentilles → vérification adverse par finding ; 8 réels, 4 faux-positifs rejetés). Détail groundé (file:line
> + repro + fixSketch vérifié) archivé dans le rapport d'audit.

## Origine

Retour Rémy : « on continue et on résout les bugs si besoin pour optimiser, améliorer tout en gardant une
qualité de résultat final et en suivant les best practices. » La garde de conformance du lot précédent avait
fait surgir un bug (choropleth/symbol ignorent `mapStyle:dark`) ; un audit render-quality systématique l'a
confirmé **au rendu** (choropleth `dataviz-dark` rend identique au light) et a trouvé 7 autres défauts réels.

## Thème & principe directeur

**La plupart des bugs viennent de logique dupliquée qui a dérivé** entre renderers/formats (thème dark, format
de légende, taille de label, résolution de ramp). Best-practice + **feedback→système** : chaque fix (1) corrige
le rendu, (2) **extrait un helper partagé** (single source) pour qu'aucun renderer ne puisse re-diverger, (3)
ajoute une **garde mécanique** (test de parité et/ou harnais render-time) qui attrape la classe, pas l'instance.
Chaque type est **render-vérifié par le contrôleur** (produce avec la clé MapTiler sourcée de `.env`, PNG lu).

## Les 8 bugs (sévérité corrigée par la vérification adverse)

**IMPORTANT :**
1. **ChoroplethMap ignore totalement `mapStyle:dark`** (`ChoroplethMap.tsx:195` hardcode `DATAVIZ.LIGHT`, aucune
   variable `dark`) → basemap clair + légende blanche (`#444`/`#555`/`rgba(255,255,255,.92)` `:308/316/493`) +
   furniture clair ; `mapStyle` **absent** de `ChoroplethConfig`/`ChoroplethConfigShape`. **La garde
   `runProduceMapConformance` passe un config dark** (checke les tokens dark jamais peints) = contradiction
   garde↔renderer. *Render-prouvé.*
2. **Choropleth vidéo (story/reveal) + scrolly n'ont AUCUNE légende** (`ChoroplethStory/Reveal/Scrolly` = 0
   `map-legend`) alors que les 4 types plus récents en rendent une dans tous les formats → ramp 5-bins
   indécodable. La règle 6 de `design-conformance.md` porte encore un carve-out périmé « video carries no
   legend ». Le seul assert de légende (`snap-responsive`) ne tourne que sur l'interactif.
3. **Symbol vidéo guidé (`SymbolStory`) + scrolly omettent la couche `symbol-labels`** → cercles rangés 6..N
   (au-delà de `DEFAULT_MAX_REVEALS=5`) jamais nommés/valués = illisibles sans survol (viole rule 8 « labels
   directs, pas hover-only »). `SymbolReveal.tsx:122-144` la couche existe déjà — SymbolStory/Scrolly l'oublient.

**MINOR (drift/single-source, feedback→système) :**
4. **SymbolMap ignore `mapStyle:dark`** (même bug que #1 : basemap `:187`, légende `:374/375/425`, labels
   `:261-262`, MapFrame, config-shape). *(corrigé avec #1 via le même helper).*
5. **DotDensity univarié : le swatch de légende est theme-switched (`:342`) mais pas les points** (`ACCENT
   "#2171b5"` fixe, `dot-density-geo.ts:41/114`) → en dark, swatch quasi-blanc sur points bleus. Le swatch
   re-déclare `#2171b5` en littéral au lieu de lire `ACCENT` (drift possible même en light).
6. **hex-grid : la garde lit `config.scaleType` mais le renderer est TOUJOURS sequential** (`hex-grid-geo.ts:160`
   pin `"sequential"` ; `conformance.ts:529-542` + `map-produce-conformance.ts:116-121` lisent scaleType). Un
   `scaleType:"diverging"` égaré → la garde valide/gate une ramp diverging jamais peinte (**faux-positif** de
   refus ; pire, un count-aggregate `scaleType:diverging`+`palette:rdbu` = greenlight puis **crash render**
   `resolvePalette("sequential","rdbu")` throw). *Issu de mon propre lot conformance.* Cartogram = le bon patron
   (thread scaleType, valide le vrai `layout.bins`).
7. **Choropleth : la légende arrondit les bornes `Math.round` (`:316`)** alors que le fill split sur les
   breakpoints float (`choropleth-paint.ts:32`) → pour des données fractionnaires (taux, %, index) les 5 bins
   collapsent en labels dupliqués (`0–0`,`0–1`,…) sur 5 couleurs distinctes. Hex/Cartogram ont déjà un `fmt`
   décimal — choropleth est le seul avec `Math.round`.
8. **Labels on-map fixes 13px en static/interactif** (`SymbolMap.tsx:29`, `LocatorMap.tsx:33`) alors que les
   siblings vidéo/scrolly résolvent `width<=1080?18:13` → un embed **portrait/étroit** interactif montre des
   labels plus petits que sa propre vidéo. *(La vérif adverse a recadré : PAS un break large-canvas — sur wide
   la vidéo aussi met 13px ; le vrai défaut = drift cross-format sur l'axe étroit/portrait. NE PAS scaler
   naïvement par `frame.scale` = régression.)*

## Architecture — les helpers partagés à extraire (single source)

Chaque helper tue une famille de drift. Créer d'abord, migrer les consommateurs existants prudemment
(render-verify no-regression), puis brancher les fixes.

- **`resolveMapStyle`** (existe déjà, `route-geo.ts:11`) = LA source du token light/dark. Choropleth/Symbol
  doivent le consommer (aujourd'hui ils l'ignorent).
- **`legendTheme(dark)` → `{ink, sub, bg, stroke}`** — les couleurs de légende themed, aujourd'hui inline dans
  Hex/Cartogram/DotDensity/Locator. Choropleth/Symbol/DotDensity(swatch) le consomment. (#1/#4/#5)
- **`fmtBin(n)`** décimal-aware (Number.isInteger ? String : precision dérivée du plus petit gap) — aujourd'hui
  inline dans Hex/Cartogram. Toutes les légendes-bins le consomment. (#7)
- **`labelTextSize(width)`** (le `width<=1080?18:13`) dans `core/map-format.ts` — consommé par SymbolMap,
  LocatorMap ET les *Reveal/Story/Scrolly. (#8)
- **résolution de ramp par-type partagée guard=renderer** : hex-grid force `"sequential"` des deux côtés (le
  renderer ET la garde), via une résolution unique (ou la garde branche par-type). (#6)
- **couche `symbol-labels`** : le même builder que `SymbolReveal.tsx:122-144`, ajouté à SymbolStory + Scrolly. (#3)
- **légende-bin partagée** rendue par ChoroplethStory/Reveal/Scrolly (miroir des 4 types récents). (#2)

## Gardes système (feedback→système — attrape la classe, pas l'instance)

- **`scripts/snap-theme.mjs`** (nouveau, ou extension de `snap-*`) : build chaque type produ-able à
  `mapStyle:"dataviz-dark"`, échantillonne le **canvas basemap RÉEL + le pill de titre + la boîte de légende +
  le fond derrière les labels** (technique de `snap-contrast.mjs`), asserte qu'ils sont **effectivement dark**.
  → un type qui laisse tomber `mapStyle:dark` **échoue le produce avant export**. Ferme #1/#4/#5. **La garde de
  conformance actuelle ne peut PAS l'attraper** (elle drift-check des tokens config-time, pas le rendu).
- **Test de parité `resolveMapStyle`** : tout renderer qui accepte `mapStyle` consomme `resolveMapStyle` (pas de
  fix MapFrame-only partiel qui glisse). (#1/#4)
- **Test de parité `symbol-labels`** : les 4 renderers symbol (Map static, Reveal, Story, Scrolly) ajoutent la
  couche `symbol-labels`. (#3)
- **Légende présente en vidéo choropleth** : soit un assert render-time sur un still story/reveal/scrolly, soit
  câbler `checkChoroplethConformance` (hasLegend) dans la garde ; + corriger le carve-out périmé rule 6. (#2)
- **DotDensity swatch==dot** : `checkDotDensityConformance` asserte que la couleur du swatch == la couleur du
  point (single-source). (#5)
- **Ramp guard=renderer** : test asserte que pour chaque RAMP_TYPE, le verdict de la garde est cohérent avec la
  résolution de ramp du renderer (diverging sur hex → violation, jamais un pass propre). (#6)
- **Pas de `Math.round` sur les bornes** : `fmtBin` partagé + (option) test lint qu'aucune légende-bin n'utilise
  `Math.round`. (#7)
- **Taille de label = résolveur partagé** : le harnais asserte que la text-size des labels on-map suit
  `labelTextSize(width)` à chaque largeur, tous formats. (#8)

## Portée honnête

- **Ne PAS scaler les labels par `frame.scale`** (#8) — régression : sur wide ça sur-gonfle et découple des
  glyphes/tiles fixes. Le fix = dé-driftage cross-format (le bump portrait 18px partagé), pas un scaling continu.
- **Size-key symbol en vidéo** reste un **déféré v1 intentionnel** (faux-positif rejeté par l'audit) — le fix #3
  ne livre que les **labels directs** (name+value), pas une légende de taille.
- Les 4 faux-positifs de l'audit (locator declutter, route distinct-colour, symbol stroke-contrast, symbol
  size-legend) sont **rejetés à raison** — ne rien y toucher.

## Séquence (TDD/render-verify, subagent-driven — voir le plan pour le découpage tâche-par-tâche)

Foundation (helpers) → dark parity choropleth/symbol/dotdensity → vidéo légendes/labels → drift hex/round/label
size → harnais snap-theme + tests de parité. Chaque type **render-vérifié dark au PNG par le contrôleur**.

## Gates & barre de qualité

- `bun run check` vert après **chaque** tâche. Render-verify par moi (produce `set -a && . ./.env && set +a`,
  Read le PNG) — dark ET light pour les types touchés. Re-vérifier chaque claim de sous-agent.
- Review adverse par-tâche + whole-branch opus avant merge `--no-ff`. 0 `any`/`@ts-ignore`, 0 vendor, Bun.
- **Migrer les composants dark-aware existants vers les helpers = render-verify no-regression** (Hex/Cartogram/
  Locator/DotDensity/Route ne doivent pas changer de rendu ; le refactor est silencieux).

## Décision ouverte (à trancher au plan)

- **`snap-theme.mjs` séparé vs extension de `snap-contrast/snap-a11y`** : préférer un script dédié (le sampling
  dark est un concern distinct du contraste WCAG) mais réutiliser le helper de sampling. À confirmer au build.
