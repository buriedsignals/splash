# Map-native — parité conformance-au-produce (2026-07-07)

> **Reprise :** lis `CLAUDE.md` (blocs `★ État` en fin de fichier, jusqu'à « Group A fini — 19 types natifs »)
> + `git log --oneline -20`. Ce lot est un **satellite** de la couture chart (pas un type de plus) : il porte
> le **plancher qualité `conformance-au-produce`** que `chart-native` a déjà (`ef362f6` + lot a11y `f5cb0d1`)
> vers `map-native`. Aucun nouveau type de carte ; on **câble** des checks qui existent déjà et on **ferme un
> vrai trou** (palette CVD non-validée sur hex-grid/cartogram).
>
> **★ Cette spec a été révisée après revue adverse (4 lentilles, code relu).** La v1 sur-vendait la portée et
> décrivait une garde « pure/config-only » impossible (les geo-cores exigent le GeoJSON du basemap). La v2
> ci-dessous est **plus lean et honnête** : garde = couche **furniture + palette au produce**, sans charger de
> GeoJSON ; le structurel/responsive reste aux snaps existants ; les labels GL restent différés.

## Problème (recadré honnêtement)

`chart-native` échoue le run **avant export** sur une violation, via `runProduceConformance` câblé dans
`produce.mjs` (fail-hard) + un invariant `reachable ⟹ guarded`.

`map-native` a **tous les checks** mais **aucun câblage produce** — ils sont test-only. Ce que la garde
apporte réellement de **neuf** (le reste du plancher qualité est déjà couvert ailleurs) :

1. **Palette CVD non-validée sur hex-grid + cartogram** — le vrai trou. `checkPaletteConformance` n'est câblé
   que sur choropleth (`conformance.ts:191`). hex-grid et cartogram calculent une ramp (`bins[].color`) mais
   ne la CVD-valident jamais. **Trigger** : uniquement une palette **custom-array** (`palette:['#f00',…]`) ;
   une palette nommée passe toujours par `VETTED_COLORS` (`scale.ts:107-137`), donc safe. Une ramp custom
   non-safe s'exporterait aujourd'hui sur ces 2 types.
2. **Règles sémantiques de furniture** (titre <12 / year-range / ALL-CAPS / description / source name+url /
   contraste WCAG des tokens de texte) — encodées dans `checkGlobalMapConformance` mais jamais appliquées au
   produce. Les snaps (`snap-a11y`, `snap-responsive`) ne checkent ni ALL-CAPS, ni year-range, ni titre<12.
3. **Fail-fast pré-build** — attraper la violation avant de builder/rendre, pas après.

**Ce que la garde n'apporte PAS de neuf** (déjà couvert, ne pas re-vendre) : `source manquante` →
`snap-a11y.mjs:300` échoue déjà le produce ; `titre hors-cadre` interactif → `snap-responsive` (in-viewport à
4 largeurs) ; cadrage vidéo → nécessite `{width,height}` que la garde config-time n'a pas.

## Grounding (scouté + relu en revue adverse — vérifié aux fichiers)

1. **7 checks par-type existent** (`conformance.ts`), **6 composent L0** (`checkGlobalMapConformance` `:64`) en
   premier ; **⚠ EXCEPTION route** : `checkRouteConformance` `:290` ne compose **PAS** L0 (pas de contraste,
   description, ALL-CAPS, year-range, titre-insight) et retourne `{violations}` (pas `string[]`). La variante
   `checkRouteConfigConformance(config, boundaries, textColors)` `:623` **compose L0 + recalcule** via
   `computeRoute` → **c'est elle qu'on utilise au produce pour route.**
   - `checkChoroplethConformance(input, textColors)` `:156` (seul à appeler `checkPaletteConformance` `:191`)
   - `checkSymbolConformance(input, textColors)` `:220`
   - `checkDotDensityConformance(input, textColors)` `:406`
   - `checkLocatorConformance(input, textColors)` `:449`
   - `checkHexGridConformance(input, textColors)` `:488` — **pas de palette CVD**
   - `checkCartogramConformance(input incl. features, textColors)` `:528` — recalcule `computeCartogram`
     (try/catch interne `:554-568`), **pas de palette CVD**
2. **L0** : `checkGlobalMapConformance(input, textColors:{text:string[];bg:string})` `:64` — titre ≥12 / pas
   year-range / pas ALL-CAPS / description / source name+url / chaque `text` ≥ 4.5:1 sur `bg`.
3. **CVD-safety** : `checkPaletteConformance({scaleType, scaleColors, values?, paletteName?, subject?})` `:114`.
   `isCvdSafeRamp` = tout couleur ∈ `VETTED_COLORS` (`scale.ts:142`). `resolvePalette` ne renvoie une ramp
   non-validée QUE sur la branche `Array.isArray(request)` (`scale.ts:116-122`).
4. **Palettes single-sourced** : ramps dans `theme/scale.ts` ; furniture dans `theme/map-tokens.ts`
   (`FRAME_COLORS.ink="#1a1a1a"/.muted="#5f5f5f"` sur pill blanc ; **`FRAME_COLORS_DARK` `:15-19`** =
   `#f4f4f5`/`#c4c4c8` sur pill sombre). `MapFrame.tsx:73` choisit via `dark = resolveMapStyle(mapStyle) ===
   'dataviz-dark'`.
5. **7 types atteignables** : choropleth (**défaut, sans champ `type`**), symbol, route, locator, dot-density,
   hex-grid, cartogram. Discriminateurs `is*` `mount.tsx:42-47` ; choropleth = branche `else` par défaut
   (`:82-88`). **Aucun registre canonique** (liste éparse : chaîne booléenne dupliquée `produce.mjs:90-95` &
   `:100-104`, union `AnyConfig` `mount.tsx:18-25`, `*ConfigShape`). Différés : contour (jamais construit),
   3D Cesium (moteur séparé).
6. **`produce.mjs` n'importe pas `conformance.ts`** ; lit le config à `:89` (après les builds/snaps, pour choisir
   les comps vidéo). `snap-responsive`/`snap-a11y` sont câblés fail-hard (`execFileSync stdio:inherit`).
   `check.mjs` (`:9-12`) **fait déjà tourner** `skills/map-native` → pas de câblage de suite à ajouter.
7. **Latent bug asymétrique** (précision) : `validateCartogramConfig` CVD-check DÉJÀ la ramp custom
   (`validate-config.ts:647` → `paletteErrors` → `isCvdSafeRamp`) ; `validateHexGridConfig` **non**, et
   `HexGridConfigShape` **omet le champ `palette`** alors que `computeHexGrid` lit `data.palette`
   (`hex-grid-geo.ts:160`). MAIS **les deux `validate*Config` sont morts au produce** (jamais appelés). Donc au
   produce, les deux sont non-gardés — le payoff tient. Pour la parité validate-layer, ajouter `palette` à
   `HexGridConfigShape` + `paletteErrors` à `validateHexGridConfig`.

## Architecture (v2 lean — miroir adapté, PAS de GeoJSON dans la garde)

Le point-clé : **la garde produce = couche config-time (furniture L0 + palette CVD) ; elle ne charge AUCUN
GeoJSON de basemap et ne rejoue AUCUN geo-core lourd.** Les règles structurelles qui exigent le basemap
(bounds non-vides, ≥1 région jointe) restent couvertes par les snaps runtime + les tests existants — c'est la
répartition miroir des charts (produce-conformance = config-time ; snaps = render-time).

**Pièce 0 — le vrai payoff : fermer le trou palette DANS les checks par-type (feedback→système).**
- Pousser `checkPaletteConformance` **dans** `checkHexGridConformance` (via
  `resolvePalette(scaleType, config.palette).ramp`) et `checkCartogramConformance` (via `layout.bins.map(b=>
  b.color)`, déjà en scope `:575`). Règle durable du type, pas seulement une garde.
- Parité validate-layer hex-grid : `palette` dans `HexGridConfigShape` + `paletteErrors` dans
  `validateHexGridConfig` (réutilise `isCvdSafeRamp`/`paletteErrors` existants — ne pas réinventer).
- Test RED : `palette:['#f00','#0f0','#00f']` (custom-array non-safe) attrapé sur hex-grid ET cartogram.

**Pièce 1 — Registre canonique `MAP_TYPES` + drift-test** (décision Rémy validée). `src/map-types.ts` :
`MAP_TYPES = ['choropleth','symbol','route','locator','dot-density','hex-grid','cartogram'] as const`.
**Drift-test** (`tests/map-types.test.ts`) : `MAP_TYPES` ≡ les discriminateurs atteignables de `mount.tsx`
(les 6 `is*` ∪ {choropleth défaut}). **Pas de refacto de `mount.tsx`** ; on **n'ancre PAS** sur les registres
Remotion (orthogonaux à la conformance). Contour absent du registre (jamais construit).

**Pièce 2 — `runProduceMapConformance(type, config): {checked, violations}`** — `src/core/map-produce-conformance.ts`.
La garde unique (résolveur de couleurs **fondu inline**, pas de module séparé — côté map il n'y a pas de triple
homogène partagé, contrairement aux 7 charts plats ; on résout par branche comme le fait le chemin bespoke
chart `produce-conformance.ts:293-551`).
- **Normalisation `const t = config.type ?? 'choropleth'`** (fixe le CRITICAL : choropleth n'a pas de champ
  `type`). Type **inconnu** (∉ `MAP_TYPES`) → **violation** (pas `checked:false` : sinon un typo rend un
  choropleth non-gardé, le trou que le lot prétend fermer).
- Gate sur `MAP_PRODUCE_GUARDED_TYPES` (= `MAP_TYPES` une fois tous câblés). Type câblé mais géré → dispatch.
- **`textColors` light/dark** dérivés de `resolveMapStyle(config.mapStyle)` (pas un blanc codé en dur) →
  reflète ce que `MapFrame` peint. Honnêteté : la partie contraste-furniture est une **défense-contre-dérive
  sur constantes pré-vettées**, pas un catch par-render (le vrai risque par-render = les labels GL, différés).
- **Dispatch par type**, en assemblant l'input **depuis le config seul** (pas de GeoJSON) :
  - **furniture (les 7)** : `checkGlobalMapConformance({title, description, source}, textColors)`.
  - **palette (choropleth/hex-grid/cartogram)** : `checkPaletteConformance` alimenté par
    `resolvePalette(scaleType, config.palette).ramp` + `values = config.rows` (fonction pure — **aucun geo**).
  - **route** : `checkRouteConfigConformance(config, boundaries, textColors)` **si** on a le boundaries ;
    sinon L0-furniture seul. *(Décision au build : route est le seul type dont le check config-level exige le
    GeoJSON ; par défaut on lui applique la couche furniture ; le structurel route reste snap/test-couvert —
    on ne charge PAS le basemap dans la garde.)*
  - Les règles **structurelles par-type** (legend, ≥3 scaleColors, symbol max-radius, bounds) qui n'exigent
    pas de basemap peuvent être ajoutées **si config-complètes** (ex. symbol-geo est config-complet) ; celles
    qui exigent le basemap restent hors-garde (snap/test). **Décision par-type au plan.**
- **try/catch** autour de tout appel qui peut throw (ex. `resolvePalette` sur nom inconnu, un `computeRoute`
  si jamais utilisé) → convertir en violation propre (miroir `checkCartogramConformance:554-568`), jamais un
  crash de `produce.mjs`.

**Pièce 3 — Câblage `produce.mjs` (fail-hard)** — juste après le garde d'args + `mkdirSync` (`:41`), **AVANT
le premier `vite build` (`:58`)** : lire le config (aujourd'hui à `:89`), `runProduceMapConformance(config.type
?? 'choropleth', config)` → `!checked` : log informatif, on continue ; `violations>0` : `console.error` +
`process.exit(1)` ; sinon log OK. Miroir du bloc chart `produce.mjs:47-61` (adapté : le type vient du config,
pas d'un argv).

**Pièce 4 — Invariant de parité `map-completeness.test.ts`** — **reachable ⟹ guarded** : tout `MAP_TYPES` a une
entrée `MAP_PRODUCE_GUARDED_TYPES` **et** une ref KB (`knowledge/references/map/types/*.md`, override
id→nom-affichage : `symbol→proportional-symbol.md`, etc.). **⚠ Pas d'escape hatch** : les 7 sont reachable, 0
deferred → l'invariant reste **RED tant que les 7 ne sont pas câblés** (fine sous TDD). **Implication plan** :
les pièces 2-3 doivent couvrir les 7 types avant que la pièce 4 passe au vert ; on ne peut pas shipper
partiellement sans marquer malhonnêtement un type reachable « deferred ». → **pièce 2 découpée par type dans le
plan.**

**Pièce 5 — SKILL.md (honnêteté, pas un nouveau type)** : une ligne « la conformance tourne maintenant
fail-hard au produce » + corriger le stale `SKILL.md:318` « defaults to `all` » → « defaults to `static` »
(contredit `produce.mjs:30`). **Aucune édition de la liste de types** (garde ≠ type émettable).

## Portée honnête (ce que la garde vérifie / NE vérifie PAS)

- **Vérifie (config-time, avant build)** : palette **CVD-safe** pour les 3 types ramp (**dont hex-grid/cartogram,
  neuf**) ; règles sémantiques de furniture (titre<12 / year-range / ALL-CAPS / description / source name+url) ;
  contraste WCAG des tokens de texte **light OU dark** selon `mapStyle` (défense-contre-dérive sur constantes
  pré-vettées).
- **NE vérifie PAS** :
  - **Labels rendus en GL** (MapLibre peint sur canvas WebGL, pas de `<text>` DOM → `snap-contrast` ne se porte
    pas ; pixel-sampling GL = spike séparé, backlog). **Décision Rémy validée.**
  - **Cadrage format-aware** (title-overrun vidéo) : la garde config-time n'a pas `{width,height}` ; reste aux
    snaps (`snap-responsive` interactif) + backlog vidéo.
  - **Structurel exigeant le basemap** (bounds non-vides, région jointe) : couvert par les snaps runtime + tests
    existants ; la garde ne charge pas de GeoJSON.
  - **Chemin scrolly** : l'export scrolly interactif passe par `skills/scrolly/produce.mjs` (chemin séparé),
    **pas** `map-native/produce.mjs` → hors de cette garde. Backlog : porter la garde au produce scrolly.
  - **Couleurs de mark** (fills symbol/route/dot-density/locator) : aucun check map ne les consomme
    (`checkSymbol` prend `strokeContrast` pré-calculé, pas le fill) → **rien à résoudre**, pas d'extraction de
    constantes.

## Séquence (TDD, subagent-driven — review entre chaque)

1. **Pièce 0** (payoff) : palette CVD dans `checkHexGridConformance` + `checkCartogramConformance` + parité
   validate-layer hex-grid. RED custom-array → GREEN. *(fait en premier : c'est le cœur de valeur, indépendant
   du câblage.)*
2. **Pièce 1** : `MAP_TYPES` + drift-test (mount.tsx reachability). RED→GREEN.
3. **Pièce 2 (par type)** : `runProduceMapConformance` — squelette dispatch + normalisation `?? 'choropleth'` +
   type-inconnu→violation + textColors light/dark, puis **une sous-tâche par type** (furniture + palette où
   ramp + structurel config-complet). Chaque : test violations attrapées + type non-câblé → `checked:false`.
4. **Pièce 3** : câbler `produce.mjs` ; **RED** sur un config non-conforme (source retirée / ramp custom
   non-safe) et **GREEN** sur un sample propre ; **produce-verify par moi** (Read la sortie garde + le rendu).
5. **Pièce 4** : invariant de parité (non-vacant, 7 reachable, RED jusqu'à ce que les 7 soient câblés).
6. **Pièce 5** : SKILL.md (note + fix stale).

## Gates & barre de qualité (non négociable)

- `bun run check` **vert après chaque tâche** (la pièce 4 peut rester RED pendant le câblage des 7 — sous TDD
  c'est attendu ; verte au dernier).
- **VÉRIFIER, ne pas affirmer** : produce-verify par moi (Read la sortie de garde ET le rendu d'un sample propre
  par type), re-vérifier chaque claim de sous-agent.
- **Review adverse** : par-tâche + whole-branch (opus) avant merge.
- **Ne jamais sur-promettre** : la garde couvre furniture + palette au config-time ; GL/structurel/scrolly
  restent hors-scope (dit dans le backlog + in-code).
- **feedback→système** : le trou palette = code (dans le check par-type) + note KB
  (`knowledge/references/map/design-conformance.md`).
- 0 `any`/`@ts-ignore`, 0 mention vendor attributive, runtime Bun, brancher avant de coder
  (`feat/map-native-conformance-parity`), merge `--no-ff`.

## Décisions

- **Verrouillé (Rémy « oui », 2026-07-07)** : (1) `MAP_TYPES` + drift-test, **sans** refacto de `mount.tsx`.
  (2) contraste labels GL = **différé** (spike séparé).
- **Révisé au feu adverse (2026-07-07)** : garde = couche **furniture + palette config-time**, **sans charger
  de GeoJSON** (v1 décrivait une garde pure impossible) ; résolveur **fondu** dans la garde (pas de module) ;
  **markColors/extraction de constantes supprimés** (dead work) ; **CRITICAL choropleth-default** corrigé
  (`?? 'choropleth'` + type-inconnu→violation) ; **textColors light/dark** selon `mapStyle` ; **portée
  recadrée** (valeur neuve = palette-CVD + furniture sémantique + fail-fast, pas source/framing déjà couverts).
- **Verrouillé au grounding** : fermer le trou palette **dans les checks par-type** hex-grid/cartogram (pas
  seulement la garde) = livrable primaire.
