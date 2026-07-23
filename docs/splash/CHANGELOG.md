# Splash — changelog (log historique daté)

> Extrait de CLAUDE.md le 2026-07-09 (fichier >40K, scission flaggée de longue date). L'état
> COURANT de `main` + la roadmap vivent dans `CLAUDE.md` ; ce fichier = le journal daté des sessions
> (des chiffres anciens sont périmés — c'est un log, pas l'état courant).

## Session 2026-07-21 — AUDIT #2 (orchestration stricte + qualité) → S1 seam de production strict + S2-slice-1 claim-arc narratif (2 piliers mergés main)

Rémy : « les tests n'ont jamais testé le bon fonctionnement du flow, thèmes/formats réutilisés (un type = même thème/format), le narratif scrolly/story = data-dump, colorimétrie parfois pas top, échanges du flow moyens. Tom dit que Spotlight a un orchestrateur STRICT (plan étape-par-étape, pas de hors-route, appelle des outils/skills/templates préconçus, inspiré de superpowers). » → **Audit #2** (6 agents //, `docs/splash/audit-2026-07-21-orchestration-and-quality.md`, score B-, la thèse du SEAM : front éditorial flexible model-driven, back production strict code-owned). 4 piliers S1-S4 + dette test T1-T4. Superpowers brainstorming→spec→plan→subagent-driven pour chaque.

### S3 fan-out résiduel carte — map tinted-neutral furniture (branche `feat/map-tinted-neutrals`, mergé main, review finale opus MERGE 0C/0I, gate 22/22)

Ferme le résidu du pilier colorimétrie : la furniture carte (`muted` = sous-texte légende, corps du pill) portait un gris mort pendant que la furniture chart murmurait la teinte maison (slice-3b). Symétrie fermée. Spec `docs/superpowers/specs/2026-07-22-map-tinted-neutrals-design.md`, plan `docs/superpowers/plans/2026-07-22-map-tinted-neutrals.md` (4 tâches, chaîne de dépendances séquentielle).

- **La « variance par-type » redoutée s'est effondrée au grounding.** L'audit notait « seuls Symbol/DotDensity/Route portent `config.brandHue` ; Cartogram/Choropleth/HexGrid/Locator passent la teinte par la rampe → résoudre par-type ». Faux après vérif : `config` est en scope à CHAQUE render-site, et l'expression **uniforme** `config.brandHue ?? config.brandPalette?.[0]` couvre tout (Locator porte `brandPalette`, pas `brandHue` ; les deux tracent `profile.palette[0]` via `brand-profile.ts:394`). Zéro branchement par-type. (Leçon re-payée : grounder avant de concevoir.)
- **Core** (`lib/core/theme.ts`) : `resolveFrameColors(themeBg?, houseHue?)` tinte `muted` via `tintNeutral` (chroma 0.03, L OKLCH préservée → contraste préservé), sur les 2 chemins (clair-défaut short-circuit + fond dérivé), byte-identique sans houseHue. Mirror exact de `deriveFurniture`. `pill`/`ink` intacts. Tests : byte-identity vs littéral `FRAME_COLORS`, L-preservation oracle (`hexToOklch`), sweep WCAG 6 teintes × 4 fonds ≥4.5:1.
- **Thread** : `MapFrame`+`MapFilterBar`+`legendTheme(dark, themeBg?, houseHue?)`+`map-produce-conformance` gagnent `houseHue?`. Le guard de conformance valide le `muted` **teinté réel** via un helper exporté `furnitureColorsFor(config)` (plus le gris mort) — test indépendant-oracle (`furnitureColorsFor({brandHue}).muted === tintNeutral(base, hue)`).
- **Fan-out** : **43 render/call-sites** threadés (27 `<MapFrame>` : 7 top-level Maps + 20 composants vidéo, Route sans Story · 6 `<MapFilterBar>` · 10 `legendTheme` : 7 Maps + Choropleth Reveal/Story/Scrolly). **Drift-guard source-scan** `frame-house-hue-parity.test.ts` verrouille la complétude.
- **Review finale opus** : MERGE, 0 critical/important. **1 important attrapé en cours** (task-review) : le drift-guard slicait au premier `/>` du fichier → un `<MapFilterBar/>` nested dans `belowTitle` pouvait satisfaire le check de MapFrame (mutation-prouvé) ; corrigé `openingTag` (scan brace-depth jusqu'au `>` propre du tag) + `stripNestedTags`, mutation-vérifié (strip houseHue de MapFrame outer → guard FAIL listant le fichier → restore → PASS). **1 minor fixé** : test dark byte-identity tautologique (`FRAME_COLORS_DARK` = lui-même `resolveFrameColors(DARK_FRAME_BG)`) → pinné à un littéral `{pill:"rgba(24,24,27,0.82)",ink:"#f4f4f5",muted:"#c4c4c5"}`.
- **Render-prouvé** : choropleth + symbol brandHue vert `#2E7D57` → rampe/marks maison + furniture WCAG **0 violation** sur PNG composité réel (10 + 7 labels) ; no-hue choropleth byte-identity sain (0 violation). Tint whisper (0.03) imperceptible en PNG sur fond clair PAR DESIGN → preuve définitive = cœur géométrique (unit tests), pas le pixel (leçon gravée). Map + chart partagent l'identique `tintNeutral(grey,hue,0.03)` → même cast garanti par construction.
- **Follow-up deferred** (opus, non-bloquant, scope-borné) : 6 familles carte VIDEO (DotDensity/HexGrid/Cartogram/Symbol/Locator/Route Reveal/Story/Scrolly) inline leurs couleurs de légende, n'appellent pas `legendTheme` → texte swatch vidéo gris mort. MapFrame furniture teinte tous formats ; l'interactif (`*Map.tsx`) teinte la légende des 7 types. Seul le swatch-texte in-légende vidéo hors-Choropleth reste non-teinté.

### S3 résidus tranchés + T1-slice-1 dette test (grounding → 2 non-gaps, 1 slice de durcissement)

**S3 résidus** (grounding avant de construire — la leçon re-payée) : (1) **grouped-bar accent = NON-GAP** — `GroupedBarChart` = Okabe-Ito catégoriel, correct CVD pour N séries (accent+gris = highlight mono-sujet seulement) ; reclassé. (2) **furniture des charts sans baseColor = DEFERRED low-value** — `mergeProfileDefaults` sème déjà `baseColor: palette[0]` sur TOUS les specs chart, mais ~24 charts (+ interactifs = ~48 sites, dont les 14 Family-B) ne threadent pas `config.baseColor` à leur `<ChartFrame>` ; le murmure de furniture (0.03) y serait imperceptible sur de l'encre catégorielle/rôle → value/effort faible, la covering-array S4 les exercera. Cohort naturel « a un baseColor » (16) = fait (slice-3b).

**T1-slice-1 — lib/core golden-value hardening** (branche `feat/t1-lib-core-golden-tests`, mergé main, review finale MERGE 0 finding, gate 22/22). Fondation de S4 : agent 6 avait chiffré **~40% des parités `lib/core` TAUTOLOGIQUES** (`core.X()` comparé à un re-export de lui-même — ne peut pas échouer), pires = `theme.test`/`video-verify.test` (0 vraie assertion). Grounding confirmé : `skills/chart-native/src/core/video-verify.ts:6` = `export * from "../../../../lib/core/video-verify"` (pur re-export) → les 6 `it` comparaient lib/core à elle-même ; idem `theme.test` 2 parités contre tokens/map-tokens re-exports. Spec `2026-07-22-t1-lib-core-golden-tests-design.md`, plan 2 tâches.
- **Fix** : réauthorés en assertions **golden/analytiques indépendantes** — `meanAbsDiff`/`lumaVariance`/`diffRatio` dérivés analytiquement à la main (moyenne des |a−b| ; variance luma BT.601 ; ratio pixels connus) ; tables furniture hex pinnées (`deriveFurniture`/`resolveFrameColors` × 6 fonds) ; verdicts `verifyVideo` pinnés (capturés-puis-mutation-prouvés). Constantes tuning pinnées à leurs littéraux.
- **Mutation-prouvé (l'acceptance)** : 6 mutations injectées dans la source (drop `Math.abs`, coeff luma, `>`→`>=`, ratio mix 0.3→0.35, opacité pill 0.82→0.80, flip seuil verifyVideo) → chaque golden FAIL sur sa mutation → revert. Les 2 reviewers ont **re-dérivé les oracles indépendamment** (pas de confiance sur parole).
- **TEST-ONLY** : source `lib/core` byte-identique au merge (`git diff main -- lib/core/*.ts` vide ; source touchée seulement transitoirement pour la preuve de mutation, revertée). Les re-exports chart-native/map-native restent (on pin le comportement dans lib/core, on ne supprime pas les re-exports).
- **Follow-up T1-slice-2** : auditer/classer les parités cross-module restantes (conformance-l0/contrast/house-ramp/i18n-furniture/locale/text-fit) — tautologique vs intégration légitime — puis durcir.

**T1-slice-2 — durcissement golden des 4 parités cross-module tautologiques** (branche `feat/t1-slice-2-golden`, mergé main, review finale MERGE 0 crit/imp, gate 22/22). Spec `2026-07-22-t1-slice-2-golden-tests-design.md`. **Audit des 6 fichiers `lib/core` important de `skills/*`** → classés : **4 tautologiques** (`locale` chart+map `export *`, 17 assertions · `text-fit` chart `export *`, 21 · `house-ramp` shim re-export map-native · `contrast` chart-native conformance `export {relativeLuminance,contrastRatio}` de lib/core, 4) — tous comparaient lib/core à un re-export d'elle-même (ne peut pas échouer) → **durcis** ; **2 laissés** (`conformance-l0` = `checkGlobalConformance` est une fonction INDÉPENDANTE qui wrappe `conformanceL0`, parité cross-impl légitime + vrais goldens `toEqual([])`/`toBe(true)` ; `i18n-furniture` = a déjà un guard d'IDENTITÉ de re-export `expect(dwSourceLabels).toBe(core.SOURCE_LABELS)` + table golden bytes — bien conçu).
- **Fix** : chaque fichier réauthoré en assertions golden/analytiques indépendantes — `contrast` = WCAG analytique pur (relativeLuminance #fff=1/#000=0, contrastRatio #000/#fff=21, valeurs par-échantillon) ; `locale`/`text-fit`/`house-ramp` = valeurs capturées-puis-mutation-prouvées (strings locale par langue, mesures text-fit, arrays hex de rampe). **8 mutations prouvées** (coeff luminance ; L_DARK + chroma route ; char-width + bold-inflate ; séparateur FR U+202F + label DE). **L'agent locale a capturé les VRAIS bytes runtime** — l'ancien test tautologique masquait que le code NBSP-préfixe TOUTES les unités courtes fr/de (pas seulement %/‰) ; golden corrigé au comportement réel.
- **TEST-ONLY** : 4 sources `lib/core` byte-identiques (source touchée transitoirement pour la preuve de mutation, revertée). Re-exports skills/* conservés.
- **Parallélisé (4 worktrees isolés simultanés + cherry-pick)** : ⚠️ **leçon infra** — l'`isolation: worktree` du harness ancre les worktrees au repo `/Users/rmdms/Sites/Professional/splash` (sur `feat/splash-apertus-sovereign` `e8173f0`, lignée landing-page de Tom, PAS de `lib/core/`), pas à `splash-merge`. 3/4 agents ont détecté la mauvaise base et self-recover en `git checkout -B <branch> main` (object-store partagé → commits cherry-pickables depuis splash-merge) ; le 4ᵉ (locale) a BLOQUÉ prudemment (aucun dommage) et été re-dispatché avec l'étape de recovery explicite. Pour de futurs fan-outs worktree : donner l'instruction de recovery d'emblée, ou créer les worktrees manuellement sous le conteneur.
- Minor (review, fixé) : constante `NBSP` de locale.test = glyphe U+202F brut alors que le commentaire disait « écrit en escape » → passé en `" "` (valeur identique, diffable).

**S1 — seam de production strict (chain-verified export, branche `feat/strict-production-seam`, mergé main `72b3c8e`, review finale opus 0C/0I, gate 22/22).** Déclencheur : la certification a surfacé un **critical improvisation** (acteur hand-authore un spec, bypasse `produce-all`, shippe quand même). La prohibition prose n'est pas une frontière d'exécution. Fix par CONSTRUCTION : l'export vérifie la PROVENANCE de la chaîne sanctionnée `candidates.json → accepted.json → produce-all → outputs`.
- `produce-all` estampille `acceptedConfigHash` (sha256 du spec accepté **pré-merge** — review a attrapé le bug : hashait le spec profile-mergé `batch[i]` ≠ `accepted.json` sur disque → aurait fail-close tout run brandé ; corrigé `accepted[i].spec`).
- `assertChainProvenance(report, id, exportDir, reportPath)` (`render-provenance.ts`) : (a) producteur tracé à `candidates.json` (ou direct-branch exempté), (b) spec `accepted.json` re-hashé == `acceptedConfigHash`, (c) délègue à `assertArtifactProvenance` (planté/périmé). Câblé dans `export-code.mjs` avant CHAQUE forme de livraison, no bypass, no partial-write. **canonicalJson extrait en `lib/core`… non — en `skills/splash/src/canonical-json.ts`** (source unique du hash, les deux côtés l'importent). **Déviation review-validée** : `accepted.json`/`candidates.json` vivent à côté de `report.json` (run dir), PAS dans `exportDir` (le plan disait faux ; résolu `dirname(reportPath)` — SKILL.md + produce-all.mjs le confirment ; lecture littérale aurait brické tout export). ~17 fixtures export mises à jour (ajout chaîne sanctionnée, aucune assertion affaiblie).
- `anti-improvisation.test.ts` pinne le critical (spec chart-native hors-menu → refusé ; contrôle shippe ; mutation-prouvé non-vacuous). SKILL.md : règle registry-lookup (pas de grep `src/`) + « Never » rétrogradés de défense-primaire à guidance (le structurel défend). `docs/splash/runtime-capability-belt.md` (la ceinture runtime = recommandation d'intégration, hors code, générique runtime-agnostic MIT-safe). **HMAC/nonce token du spec SUPERSÉDÉ** par la vérif-de-chaîne on-disk (honnête — pas de faux crypto, pas de secret runtime que Splash n'a pas).

**S2-slice-1 — claim-arc narratif (chart-native, branche `feat/claim-arc-narrative`, mergé main `df2e888`, review finale opus 0C/0I).** Fix du data-dump : les beats prouvent un ARGUMENT au lieu de sortir les points saillants. Grounding sources fait (agent) : `establish→build→turn→payoff` ≙ **Cohn E/I/P/R** (« Visual Narrative Structure » 2013), adapté data-video par **Amini (CHI '15**, motif dominant `E+I+PR+`).
- **Modèle de rôle** : `NarrativeBeat.role` (chart-native) + `arcErrors` fail-loud (establish ouvre, payoff ferme, ≥1 build, ≤1 turn, pas de demi-arc, chaque beat-rôle porte une claim=`text`) appendu à `narrativeBeatErrors` (gate spine). `role` sur `ChartBeat`, la claim EST la caption. **Legacy byte-identique** (beats absents / anchor-only sans rôle = auto-pick inchangé).
- **Fallback flaggé** : `narrativeFallbackWarning` — un scrolly line/bar sans `beats` confirmés warn à Gate 3a (via `ProposalResult.warnings`) : narratif auto-pické par saillance ≠ argument confirmé. Non-bloquant (rendu VISIBLE, pas bloqué).
- **Story-warrant** : `story-warrant.ts` `assessStoryArc` (pure) — line=tendance/turn (plancher CV de platitude AVANT le test de turn range-relatif, sinon le bruit plat false-fire), bar=vraie dispersion, scatter=|r|≥seuil. `suggest-chart` le CONSULTE pour proposer statique-vs-scrolly (vetoable par le journaliste, **jamais de refus dur**). **★ HEURISTIQUE MAISON explicite** — grounding : AUCUNE source citable ne dit « telle forme ne mérite pas d'arc » (Segel&Heer/McKenna/Kosara = appuis adjacents, PAS l'autorité). Le header du module + les docs le DISENT (jamais présentée comme best-practice créditée).
- **Gate 1b élargi** (SKILL.md) : de « confirmer le takeaway » à « confirmer le claim-arc qui le prouve » ; le journaliste choisit le turn (non-mécanisable), le code enforce la forme. **map-native déféré HONNÊTEMENT** (pas de `storyBeats`/override carte encore — S2-slice-2).
- Review finale : legacy byte-identique, changement unique (warning fallback) prouvé advisory-only, honnêteté tenue code+docs+tests, arcErrors ni false-block ni false-accept. 4 minors = trous de test → fermés (`df2e888` : count-caps >1 establish/payoff, enum invalide, build répété PASSE, threading role deriveChartStory). Gate 21/22 — le seul échec = **timeout API réelle Datawrapper** dans `map-dw` (skill non-touché par S2, passe 143/0 en isolation ; rotait avec un timeout vidéo map-native au run précédent) = flake env documenté, pas une régression S2.

**S2-slice-2 — parité claim-arc carte (workhorse-first, branche `feat/map-claim-arc-parity`, mergé main `126d8b0`, gate 22/22).** map-native n'avait AUCUN override journaliste (6 derivers de story, `validate-gate` rejetait `beats` sur la piste carte). Choix Rémy : **workhorse-first**.
- **`lib/core/claim-arc.ts`** : `arcErrors`/`ARC_ROLES`/`ArcRole` extraits de chart-native (move byte-identique, chart-native re-exporte, ses tests inchangés) → chart + map partagent une source unique.
- **`Beat.role`** sur tous les types carte ; **`MapArcBeat {region, role?, text?}`** + **`arcBeats?`** override sur **choroplèthe + symbole** (les 2 workhorses) ; validation par-type (`region` existe dans `rows[regionKey]` / `points.label` + `arcErrors`), fail-loud. **`applyMapArc(arcBeats, resolve)`** — helper partagé, chaque deriver fournit un callback `resolve(region)→{camera,highlight,name,value}` (ancres différentes : choroplèthe=feature bounds, symbole=box lon/lat) ; câblé dans `deriveMapStory` + `deriveSymbolStory`, **path saillance byte-identique** (baseline pré-capturée en test). Les 4 autres derivers (route/cartogram/dot-density/hex-grid/locator) = `Beat.role` seul, override = **follow-up assumé** (SKILL.md le dit, jamais promettre l'inexistant).
- **Un-reject piste carte** (`validate-gate`) : `arcBeats` validé via `validateMapNative` ; le champ chart `beats` sur une carte reste rejeté (pointe vers `arcBeats`) ; `mapNarrativeFallbackWarning` (choroplèthe/symbole SEULEMENT — les autres types ne warn jamais, garde de déférement alignée sur le dispatch `validateMapNative`).
- **Review finale opus (5 commits)** : 5 invariants tenus (byte-identity 2 paths, `arcErrors` source unique, no-false-warn, no-masked-error, docs honnêtes) + **1 important attrapé** — mismatch region-space validateChoropleth (toutes les lignes data) vs deriver (`withData` = régions basemap-matchées) : une région dans les DONNÉES mais absente du BASEMAP passait le gate puis crashait au produce avec un message auto-contradictoire → **erreur produce honnête ajoutée** (`deriveMapStory` pré-check région∈withData, message « in your data but absent from the basemap ») + 2 minors (`arcBeats:[]` warn ; `NarrativeBeat.role`→`ArcRole`). **Régression closure attrapée au gate** (pas en per-skill tsc) : `validate-config`+`validate-gate` value-importaient `mapArcErrors`/`mapNarrativeFallbackWarning` du LOURD `map-story.ts` (→`core/staged-reveal`→`remotion`) → `validate-closure.test.ts` FAIL → **fix : extraction `map-arc.ts` pur** (lib/core seul), rewire (`RevealMode`→`import type`). + strict-null `map-arc.ts` (le `lib` tsconfig est plus strict que map-native — attrapé au gate). Tous corrigés, gate 22/22 vert final.

**S3-slice-1 — couleur OKLCH (rampe séquentielle perceptuelle + gate uniformité, branche `feat/oklch-sequential-ramp`, review finale opus MERGE 0C/0I, gate 22/22).** Recadrage vs l'audit §4 (« rampe maison HSL boueuse ») : la rampe CARTE (`houseRamp`) était déjà OKLCH ; le vrai boueux = la rampe CHART `hueRamp` (`tokens.ts`) qui interpolait via `_mix` = **blend sRGB naïf sur octets bruts**. Fix : nouveau moteur partagé `lib/core/house-ramp.ts` **`hueRampOklch(base,n,themeBg?)`** (interpolation L-linéaire OKLCH — clair pâle→profond ; sombre saturé-mid→bright, **chroma-shrink vers le bright** pour éviter le collapse gamut : sans ça un rouge vif sortait 7 roses identiques) ; `hueRamp` devient un mince appelant ; `houseRamp` carte **byte-identique**. `_mix`/`_rgb`/`_hex` chart supprimés (dead après repoint ; le `_mix` de `lib/core/theme.ts` est un autre, vivant). **Gate d'uniformité** `rampUniformityIssues` (span OKLCH-L + anti-kink max/min ΔL) câblé fail-hard dans `checkHeatmapConformance`, **frère du snap WCAG**, sur la rampe DÉRIVÉE. **Span floor theme-aware 0.60 clair / 0.40 sombre** : le plancher a11y 3:1 vs le vrai fond chart `#0b1220` (pas la réf basemap carte 0.1) borne physiquement le span L sur near-black (sweep : `DARK_LO=0.52` → span 0.43 + 3:1=3.04). **Plafond chroma muté 0.12** (levier §4 tiré en avant après review) : le gate fail-hard bloquait ~14/24 teintes vives (le clamp per-channel de `oklchToHex` en linear-RGB ne préserve pas L → span/kink faussés) ; cap = **0/24 sur un sweep de 288 combos** (review finale opus), rampes in-gamut uniformes par construction, look muté « pro ». Grandfathering : les Blues ColorBrewer échouent l'uniformité (kink 4.12) mais n'atteignent JAMAIS `checkHeatmapConformance` (le calendrier passe par `checkCalendarConformance`, chemin séparé 0 appelant prod) → pas d'exemption, documenté. Tests **golden/structurels non-tautologiques** (dette T1 : oracles OKLCH-L + WCAG indépendants, pas de comparaison `core.X` vs re-export). **Render-prouvé** (heatmaps clair pâle→navy · sombre mid→bright · rouge vif muté rose→bordeaux régulier sur les 2 fonds). Décisions de design tranchées en cours (theme-aware span + chroma cap) validées par Rémy « suis ta reco ». Follow-ups déférés (Minor, review opus) : `n===1` sans consommateur · branche zero-step non testée · contraste sur fond gris-moyen ~0.25-0.4 (pré-existant, hors scope). **Restant S3** : accent/neutre · palette-story.

**S3-slice-2 accent/neutre = CONSTAT déjà-fait (pas de slice).** Grounding avant de construire (comme la prémisse HSL de slice-1) : « 1 accent, reste gris » est déjà appliqué partout où il s'applique proprement — `barColor` (highlight→accent `baseColor`, reste→`C.muted`), `SlopeChart` (`[muted, vermillion]`), `LineChart`/`ScatterChart` mono-série (une teinte sujet). L'arc-en-ciel (`SERIES_COLORS`) ne sert qu'à `StackedBarChart` (composition — exempt correct) et `GroupedBarChart` (le seul type à-sujet encore arc-en-ciel, cas multi-gris déféré au fan-out). Faire un cycle complet pour re-systématiser du code qui marche = YAGNI → **pivot vers les neutres teintés** (le levier §4 réellement non-implémenté).

**S3-slice-3 — neutres teintés (branche `feat/tinted-neutrals`, review finale opus MERGE 0C/0I, gate 22/22).** Les gris de furniture (`muted`/`axis`/`grid`) portent un murmure de la teinte maison au lieu d'un gris mort (polish « pro » classique). **`tintNeutral(grey, houseHue, chroma)`** (`lib/core/theme.ts`) = la **L OKLCH du gris préservée** + teinte maison à basse chroma → le contraste luminance-based ne bouge pas, le gris garde son rôle a11y. Réutilise `hexToOklch`/`oklchToHex` **exportés** de `house-ramp.ts` (slice-1). **`deriveFurniture(bg?, houseHue?)`** teinte `muted`/`axis`/`grid` sur **les DEUX chemins** (early-return clair-défaut + fond dérivé) ; `ink`/`bg`/`line`/`head` intacts ; **byte-identique sans houseHue** (les ~26 autres charts inchangés). Threadé via `themeColors(themeBg, baseColor)` sur **line/bar/scatter** (workhorse ; reste = fan-out). **Render-tune décisif** : à `TINT_CHROMA=0.015` le tint était **imperceptible même zoomé** (source #636e69 ≈ #6B6B6B) → **monté à 0.03** (muted #5b7167 = gris-vert perceptible mais lit encore « gris », pas « coloré »). **Contraste prouvé** : sweep 16 teintes (nommées + primaires purs) × {#ffffff, #18181b} = 0 échec, worst muted 5.25:1 (review finale opus). Tests golden/structurels (oracle L/hue indépendant, WCAG re-implémenté). **Fix-avant-merge** : un commit portait un trailer `Claude-Session` (subagent haiku, règle harness) → strippé (amend) ; branche + 84 commits déjà poussés re-vérifiés **0 mention vendor**. Minors déférés (opus) : import mid-file test · helper `mix()` mort dans theme.test (byte-identity via proxy `C<0.02`) · ChartFrame furniture pas encore threadé (incohérence intra-chart imperceptible à 0.03, fan-out). **Restant S3** : palette-story · fan-out (26 charts + carte + ChartFrame + grouped-bar accent) · follow-up contraste fond gris-moyen.

**S3-slice-3b — fan-out tinted-neutrals (branche `feat/tinted-neutrals-fanout`, review finale opus MERGE 0C/0I, gate 22/22).** Rend la feature RÉELLE : slice-3 ne teintait que 3 des ~27 types. **`ChartFrame` gagne une prop `baseColor?`** → `themeColors(themeBg, baseColor)` (ferme l'incohérence corps-teinté/frame-gris que la review slice-3 avait notée). **`config.baseColor` threadé dans les 16 charts qui l'ont** : 13 en corps+frame (Beeswarm/Boxplot/Bump/ConnectedScatter/DotStrip/Fan/Heatmap/Histogram/Lollipop/RadialBar/Waffle/Treemap/Violin) + les 3 workhorse (Line/Bar/Scatter) en frame-only (corps déjà threadé slice-3). La couleur maison du profil (`mergeProfileDefaults` pose `baseColor` = `palette[0]`) teinte donc la furniture de TOUS ces charts. **Les 11 sans `baseColor`** (Pie/StackedBar/DivergingBar/DivergingStacked/StackedArea/Dumbbell/Waterfall/PopulationPyramid/GroupedBar/Slope/Bullet — composition/rôles) restent gris pur ; leur tint story-wide = **palette-story** (déféré). **★ Parallélisé** (suggestion Rémy « n'hésite pas à paralléliser ») : Task 2 = 16 fichiers disjoints → **2 implémenteurs en worktrees isolés** (groupes A/B), chacun commit dans son worktree, cherry-pick/reset sur la branche (chaîne propre `ChartFrame→A→B`) — gain de wall-clock réel, SDD interdisant des implémenteurs parallèles sur le même arbre (course d'index). 1 golden bougé (`bump-basecolor` `#6B6B6B`→`#79646f`, tint de `#CC79A7`), byte-identique sans `baseColor`. Render-prouvé (lollipop house vert : source ChartFrame + labels d'axe = même green-grey). Gate 22/22 (le seul rouge = flake réseau `deploy-embed` vraie-API Cloudflare, `skills/splash` 715/0 en isolation). **Restant S3** : palette-story · furniture carte · grouped-bar accent.

**S3 palette-story = story accent (branche `feat/story-accent`, review finale opus MERGE 0C/0I, gate 22/22).** **Décision CVD-first** (Rémy) : le catégoriel reste Okabe-Ito — c'est là que le daltonisme casse le plus, une palette de marque arbitraire n'est pas CVD-distinguable ; palette-story ne dérive donc PAS les couleurs de séries. Le séquentiel (baseColor) + la furniture (tint) livrent déjà la cohésion. Le vrai gap (grounding, comme la prémisse HSL) : **`profile.accent` capturé mais MORT** — `mergeProfileDefaults` ne threadait que `baseColor` (palette[0]). Fix : `mergeProfileDefaults` sème `spec.accent` depuis `profile.accent` (chart uniquement, guarded `profile.accent && kind==="chart"`) ; **5 charts à-accent-éditorial** lisent `config.accent ?? défaut` : Slope/Lollipop/Histogram → `#D55E00` vermillon, RadialBar → `#E69F00` orange, Bump → `resolveBumpAccents` fallback `base ?? series[0] ?? accent ?? BUMP_ACCENT_COLORS[0]` (baseColor/series gagnent, multi-highlight cycling intact). **Intouchables** : catégoriel `SERIES_COLORS`/`GROUPED`/`STACKED` (CVD) · rôles `DIVERGING_SIGN_COLORS`/`WATERFALL_ROLE_COLORS`/Likert (signes, guard-validés) · highlight=baseColor (bar/scatter/connected-scatter, déjà brand). **a11y = déjà-wirée, zéro code neuf** : `houseMarks` (`produce-conformance.ts:140-141`) collectait DÉJÀ `config.accent` (role "accent", « threaded for completeness » — anticipé) → `checkMarkContrastOnBg` flag non-fatal un accent faible-contraste sur les runs `brandExplicit` + `reconcileBrandViolations` le downgrade CVD (policy b). Prouvé : accent pâle `#E8D8F0` (1.35:1) → concern « kept per house style » ; accent normal → pass. **★ Parallélisé** (Rémy « n'hésite pas à paralléliser ») : Task 1 (splash, normal) + Task 2 (4 charts) + Task 3 (bump) en **worktrees isolés simultanés** → cherry-pick sur la branche (chaîne `seed→4charts→bump`). Byte-identique sans `profile.accent` (tests golden/structurels par chart, red-first vérifié sur bump via stash). Render-prouvé (slope : vermillon défaut vs violet `#7A1FA2` accent, contexte gris inchangé). 1412/0. Minor déféré (opus) : les checks géométrie par-type (`checkSlopeConformance` accentColor / `checkBumpConformance`) valident le défaut pas l'accent live — INTENTIONNEL (ces checks sont fatals ; re-feeder un accent custom le hard-rejetterait = viol policy b ; le path non-fatal houseMarks flag déjà). **Restant S3** : fan-out résiduel (furniture carte · 11 charts sans baseColor via palette[0] · grouped-bar accent).

**Note deps worktree** : un worktree frais nécessite `bun install` par-skill (dw-chart/scrolly playwright/react, image-native sharp) + root (`@noble/hashes`, `bun-types`) + copie `.env` — sinon tsc/tests faux-échouent sur deps manquantes. **★ Leçon gate** : le `bun run check` COMPLET attrape ce que les tsc/tests par-skill ratent — le closure drift-guard (`validate-closure`) et le strict-null du `lib` tsconfig ne se voient qu'au gate entier ; toujours faire tourner le gate complet avant merge, pas seulement les suites touchées.

## Session 2026-07-19 — Frontière harness↔outil : provenance de candidats DANS l'outil (Tom #1/#2/#3) + validation réelle #4/#5

Rémy (après correction sur #4) : « assure-toi que le harness ne fait QUE tester et que c'est l'OUTIL
qui gère/détecte/orchestre tout ». Audit complet de la frontière → **une vraie fuite** : le routage
suggesteur/menu de candidats était **prose-only + harness-seul** (aucun code outil ne lisait
`candidates.json` ; GUARD 5 `skillsInvoked` contournable par omission). En run réel SANS harness (le cas
de Tom), un orchestrateur qui improvise expédiait un seul spec hors-menu — fondation structurelle des
points Tom #1 (type d'abord), #2 (alternatives), #3 (narratif).

- **Gate de provenance dans `produce-all`** (branche `feat/candidate-provenance-gate`, mergée main
  `780cbbb`, gate 20/20) : `candidate-provenance.ts` (`extractCandidateProducers`,
  `candidateProvenanceIssue`) ; `produce-all` résout `candidates.json` frère d'`accepted.json` et
  **refuse avant production** (fail-hard, par proposition) toute proposition **non-directe** dont le
  PRODUCER n'est pas au menu, ou tout run **sans `candidates.json`**. **Producer-level** (pas type-level)
  — review adversariale de mon propre code a attrapé un **faux-blocage scrolly** (candidat `chart-scrolly`
  ≠ spec `line`) : match strict aurait cassé tout run scrolly. Branche DIRECT (`skillsInvoked:
  splash:cadrage-direct`) seule exemptée ; `skillsInvoked` absent N'EST PAS exempté (ferme le trou par
  omission). CLI injecte toujours → prod applique toujours ; param `null` = tests hermétiques.
- **Warning narratif menu-level (Tom #3)** : même classe, même artefact. `narrativeConsiderationWarning`
  → `report.warnings` (NON-bloquant, choisi vs fail-hard pour ne pas faux-bloquer un batch sur un
  marqueur manquant) quand un menu présent ne porte NI candidat narratif NI `narrativeRuledOut`. Nouveau
  champ `ProduceReport.warnings`.
- **Résultat frontière** : les checks harness (`hand-authored-spec`, `suggest-chart-no-candidates`,
  `single-proposal-no-alternatives`, `narrative-not-considered`) passent de *détection d'un trou* à
  *vérification d'un invariant garanti par l'outil*.
- **Validation réelle #4 (demande de clé)** : sous la condition exacte de Tom (clone sans clé MapTiler),
  le gate propre `produce-all` refuse AVANT production (message langage-journaliste + URL, rien produit) —
  prouvé au vrai CLI ; round-trip `save-key.mjs` (yellow→green + miroir MapTiler + chmod 0600). L'OUTIL
  détecte/gère, pas le harness. **#5 (deploy fly)** : `deploy-embed.mjs` fail-fast prouvé en vrai (stall
  corrigé) ; le deploy fly qui RÉUSSIT reste à prouver avec un vrai compte fly (runbook préparé).
- **Preuve pré-merge** : run harness réel `budget-commune-part` sur la branche (via override test-infra
  `SANDBOX_HEAD_REF` — le sandbox détachait sur `main`) → livré, provenance ENGAGÉE et passée légitimement
  (`candidates.json` présent au bon endroit, producer-match), `report.warnings: None` (narrativeRuledOut
  reconnu), **zéro faux-blocage**.
- **Axe format = TROIS faux-positifs démasqués (discipline « challenger le finding / vérifier le LIVRÉ »)** :
  le run avait deux findings sur un switch format interactive→static. (1) Le juge criait « impro / spec
  hand-authored » → **FAUX** : le transcript montre que le journaliste a *confirmé* interactif puis, informé
  d'un vrai bug apparent, a *explicitement* choisi static (« la source doit être visible »). **Pas de gate
  format à construire.** (2) « Le waffle interactif drope la source » → j'ai vérifié au DOM du livrable
  (`interactive.html` rendu pleine page en navigateur) : `Source: Riverton Energy Authority 2025` **présent,
  visible, dans les bornes du doc** (y=558-573 / docHeight 605). La source EST livrée. (3) Le review-still
  (`interactive.png`) ET l'output-proof la coupaient tous deux — **même cause racine**. **VRAI bug trouvé
  (review-infra, pas livrable)** : `snap-proof.mjs` capturait l'interactif en **page screenshot borné au
  viewport 560px**, coupant le footer source que le `ChartFrame` responsive rend en flow SOUS le plot
  (~605px). Splash, le juge, l'output-proof lisaient tous ce still tronqué → faux « source manquante », classe
  systémique sur toute la famille interactive. **Fix** (`bbf7b1e`) : element screenshot de `#root > div`
  (comme le static) → pleine hauteur, source incluse ; render-vérifié sur le waffle ; garde
  `snap-proof-fullheight.test.ts`. Follow-up mineur : re-générer les `output-proof/*/interactive.png` tronqués.

## Session 2026-07-18 (suite) — Résolution GÉNÉRALE des bugs de l'audit (4 fixes, 4 agents //, review par branche)

Rémy : « résous proprement et de manière générale les bugs que tu as soulevés ». Principe feedback→
système : la CLASSE, pas l'instance. 4 agents parallèles (worktrees disjoints) + review adversariale
ciblée « sur-correction / faux-positif » (pas « ça marche » — c'est TDD). Gate 20/20.

- **p.id path-safety** (`assertSafeId`, `id-safety.ts`) : tout identifiant fourni par le LLM passe un
  slug-guard `/^[A-Za-z0-9_-]+$/` avant d'atteindre une résolution de chemin — au spine (produce-all
  fail-hard AVANT le `rmSync`), realDispatch, ET export-code `--id` (2ᵉ instance trouvée par l'agent).
  Test escape-proof : un fichier sentinelle voisin de outDir survit à `id:"../precious"`. Ferme la
  classe path-traversal côté spine (même que C5 côté image-native).
- **claim-grounding — 2 angles morts fermés** (validate-gate) : (1) un nombre n'est « backed » que via
  un champ structurel `x`/`y`/`value` d'annotation, plus le scraping du texte libre (fin du laundering
  « objectif 70 % » en caption) ; (2) le strip de phrase fragile (qui bridgait par-dessus le newline
  title\ntakeaway) → exclusion PAR TOKEN (exempté seulement si adjacent à une unité durée/cohorte).
  Review : SAFE — le seul producteur d'annotations (dw-chart) ancre par `y` structurel, les lignes-cibles
  passent encore. narrower-not-wider prouvé fr/en/de/it.
- **Family-B baseColor — sweep de TOUTE la famille** (chart-native, 10 mappers + 10 composants) : mon
  rapport disait « tous les autres types forwardent » — FAUX (6/27 seulement). 10 types droppaient
  baseColor et rendaient bleu défaut ; tous corrigés, preuve au rendu (cellules #CC79A7 réelles).
  **Review a attrapé un fix incomplet** : forwarder baseColor sans mettre à jour `resolve-conformance-
  colors.ts` DÉSARMAIT la garde WCAG sur histogram/lollipop/connected-scatter (elle validait le bleu
  fantôme pendant que le composant peignait le hue faible-contraste) → corrigé (le resolver lit baseColor
  comme beeswarm, la garde valide la vraie couleur). + waffle tooltip dérive le dénominateur du grid réel.
- **anti-improvisation (harness, `feat/apertus-flue-runner`)** : `check:hand-authored-spec` [major] keye
  sur le CONTENU (un objet type/nativeType+data+title = un spec de producteur, quel que soit le chemin —
  imparable, généralise le vieux PRODUCT_SOURCE_RE limité à src/scripts) + `check:suggest-chart-no-
  candidates`. Validé sur les vrais transcripts : peage 1×, w9-double 2×, bus-de-nuit propre 0.

**Leçon (constante de la session) : mes affirmations produites par agent se font corriger par la
vérification, et c'est le système qui marche** — rapport de bug imprécis (6/27 pas « tous »), fix
incomplet (resolver désarmé), 2ᵉ instance ratée (export-code), tout attrapé avant merge par la review
adversariale ciblée sur la sur-correction.

## Session 2026-07-17/18 — AUDIT agentic challengé + DÉGRAISSAGE prose (validé au comportement)

Rémy : « audit Splash + best-practices agentic » → « challenge l'audit » → « dégraisse la prose ».

**Audit croisé (3 analyses // : spine, flow empirique, best-practices groundées Anthropic/EMNLP/OWASP).**
Conclusion : la philosophie de Splash EST la best-practice (« code the floor, prose the ceiling » =
workflow gaté d'Anthropic). Loi empirique (17 runs) : la prose perd contre l'échelle de décision ;
ne survit que hoistée + adossée à un levier (fait 6× cette session). **Passé à l'avocat du diable
(auto-critique) :** 3 biais corrigés — (1) les 2 « HIGH » (p.id delete, source fabriquée) = 0/766
observés, théoriques, rétrogradés sous threat-model local-first ; (2) « pyramide QA inversée » = erreur
de catégorie (le 97 %/3 % mesure le harness de découverte, pas l'enforcement produit qui tourne 100 %
au spine) ; (3) le vrai n°1 manquait = la volumétrie prose. Artifact d'audit + roadmap révisée sur
l'empirique. Plan MIT-hardening (Spotlight B1-B4) et roadmap leviers (escalationReason, checks
récurrents) au backlog.

**Dégraissage prose (chantier `2026-07-17-prose-slimming.md`, mergé, gate 20/20, adversarial-review SAFE) :**
SKILL.md **1835→1667 lignes** (le −55 % promis était de l'optimisme d'audit — acté ; l'irréductible
est de la vraie règle porteuse). Structurel : catalogue par-type (105 l.) déplacé en `chart-selection.md`
à-la-demande · ~8 blocs guard-explainer → pointeurs `guardrails.md` (qui gagne la ligne GUARD 5) ·
war-stories d'incidents → impératifs terses · ordre hot-path-first. **Filet TDD durable : 7 pins
survivantes** dans `skill-doc-parity.test.ts` (resserrées sur la clause actionnable après review — les
pins mots-clés étaient gameable) verrouillent mécaniquement les 5 règles sans backstop (source-incertaine,
takeaway-explicite, never-fabricate-coord, Gate-3a 6 critères, WAIT-means-WAIT) + 2 mentions. **Validé
au comportement (4 runs de parité, 0 régression survivante)** : peage narratif parfait (chart-scrolly +
line-reveal), venezia single-proposal = variance (re-run OK), bus-de-nuit = bug harness corrigé
(`checkNarrativeConsidered` tableau-nu). Résidus (i18n, approximations, format-q) = classes pré-slim,
pas des régressions. **Leçon gravée : les chiffres d'un audit produit par agent se challengent, y compris
les siens ; la doc-parity prouve la présence, seul le run prouve le suivi.**

## Session 2026-07-16/17 — LE CHANTIER TOM : 6 retours → flow canonique 12 étapes + 4ᵉ moteur image-scrolly + préflight-prérequis, 15 runs de validation

Tom (Buried Signals) a fait le premier test 100 % externe (clone rd-dev, article réel) : « pas
foufou » + 6 retours (screenshots) : format demandé trop tôt · une seule reco · refus sec sur un
article texte (« pas assez de données ») · préflight muet · pipeline morte (`Cannot find package
'react'`) · guardrails anti-hallucination demandés. Session géante : spec + 7 plans (dont l'étude
Spotlight), 6 chantiers implémentés/mergés (agents parallèles worktrees + review adversariale par
branche), harness co-évolué, 15 runs de validation.

**Décisions produit (Rémy) :** la **séquence canonique 12 étapes** (arbitrage sur le retour Tom —
supersède mon premier draft « type avant canal ») : article demandé s'il manque · vérité des données
(table 2b prose-only + source 2c TOUJOURS) remontée AVANT tout routage · canal = DERNIÈRE question
du cadrage (les candidats sont canal-aware) · **propositions plurielles groupées** (toutes les
opportunités en un message, chaque candidat avec son pourquoi, un recommandé) · zéro question format
(déduit canal×type, annoncé pour veto) · offre re-format proactive post-export (étape 12, nouvelle
entrée `<id>-<format>`) · **clés = prérequis collectés dans le flow** (renverse le hors-scope C2 :
`save-key.mjs`, seul chemin d'écriture, noms gatés manifeste, valeur jamais ré-affichée) ·
**narratif toujours CONSIDÉRÉ** (candidat narratif présent quand la forme du récit le porte, sinon
`narrativeRuledOut` explicite — l'absence silencieuse n'est plus un état) · **narratif TOUTE LA FAMILLE
déclenché par l'ANALYSE de la prose** (`narrativePotential` sur le ProposalSet, modes
temporal→chart-scrolly/vidéo · geographic→map-story/scrolly · visual→image-scrolly, indépendant de
la richesse data ; la dispo des images se résout au CHOIX du candidat, jamais en question CADRAGE.
Confirmé au rendu : série 5 points → chart-scrolly recommandé + line-reveal en possible, pourquois
ancrés sur les inflexions ; Venise → image-scrolly ancré prose IT ; logement → rule-out motivé).

**Livré sur `main` (gate 20/20, reviews adversariales par branche) :**
- **C1** closure de validation libérée de TOUTES les deps sibling (remotion/react via route-geo→
  video-scene + playwright via dw-chart label-safety lazy) + drift-guard auto-actualisant
  (deps+devDeps map-native, imports statiques seuls) ; repro Tom vert (charge sans node_modules).
- **C2** préflight par moteur (env+deps), tri-état persisté `.splash-preflight.json`
  (green/yellow/red+reason), gate produce-all AVANT production, CLI PROPOSITION, parité installeur,
  fallback `.env` racine, read-merge-write ; + `save-key.mjs` (prérequis in-flow).
- **C3+C4** SKILL.md réécrit sur les 12 étapes (survivantes re-ancrées — review exhaustive), contrat
  `candidates` 2 stages (suggest-chart : Stage 1 EN TÊTE de procédure après échec live du placement
  Output-only), artefact `candidates.json` écrit avant présentation (trace machine + reprise
  mid-PROPOSITION), exemption jumelle GUARD 3b (suffixe==format pinné), context-recovery/retry-borné/
  stall-protocol (pratiques Spotlight A1/A3/A4).
- **A5** `skillsInvoked` mécanique (GUARD 5 : branche guidée sans suggest-chart = FAIL ; tokens
  `splash:cadrage-guided|direct`) — prouvé émis dès le 1er run live.
- **C6** GUARD 4 étendu map-native (`rows[valueField]`, typo=no-op strict, fallback chaîné) + preuve
  map-dw + `docs/splash/guardrails.md` (inventaire vérifié ligne à ligne).
- **C5 image-scrolly phase 2** (reprise du design 2026-07-10) : `prep-images.mjs` (sharp, fit/sRGB/
  EXIF-strip, containment), `ScrollyImage.tsx` (crossfade, légendes, crédits, alt), produce CLI
  scrolly-v1, routing spine complet (Producer union + preflight + validate via conformance),
  `suggest-image` (vision = matching/ordre SEULEMENT, alt/crédit fournis jamais générés, gate
  mandatory), e2e prouvé au rendu (output-proof committé). Review : 2 HIGH path-traversal fermés
  (frameRef `../` lu+embarqué · id `../../` écriture arbitraire → slug strict + containment),
  code-source image = refus loud, thème maison threadé.
- **GUARD 4 affiné 2× sur incidents réels** : durées (« en 5 ans » vs max 4) puis tranches d'âge
  (« over-55s »/« 55-Jährigen » vs max 48) exemptées fr/en/de/it — chaque faux positif re-pressait
  un takeaway confirmé (réécriture sans re-confirmation observée = la vraie casse).
- Fix env : `Response.json` statique (bun-types 1.3.14) dans le configurateur.

**Harness co-évolué (~20 commits, 282/282)** : deep-verify couvre les embeds hébergés (URL +
auto-détection `EMBED_URL.txt` ; 2 bugs du vérificateur débusqués en le testant : `locator.hover()`
vs bgRect DW → mouse.move brut ; charts DW HTML-rendered sans SVG) · **juge réparé** (timeout
120→300s — il pensait 201s, 4/4 étaient tués silencieusement) · checks neufs :
`single-proposal-no-alternatives` (major mécanique, ancre `"tier"`, exemption DIRECT par token A5),
`skills-invoked-not-emitted`, `preflight-false-block`, `narrative-not-considered` · sandbox installe
les deps de skills jamais installées dans le repo partagé (classe image-native/sharp red) · driver
migré 12 étapes (judge.md + bras persona candidats/étape-12) · WORKFLOW.md : baseline jugée =
SÉQUENTIEL (le parallèle tue les juges ; re-vérif séquentielle obligatoire des findings parallèles
— revalidé : 2 « majors » parallèles non reproduits en séquentiel).

**15 runs de validation** (bus-de-nuit ×5, budget ×3, Tom-réel Trump/Iran polls texte-only, complexes
streamgraph/scrolly-Afrique, batch 4-parallèle sans-dataset FR/DE/IT toujours-guidé embed-insisté +
2 re-vérifs séquentielles) : **le dead-end de Tom livre désormais** (2 stats comparables → bar
honnête, le 3ᵉ chiffre écarté explicitement « no companion value » ; deep-verify vert) · le menu
candidats prouvé en vrai (slope recommandé + column + dumbbell, pourquois, `candidates.json`
persisté) · les 2 faux positifs GUARD 4 attrapés-fixés · **cluster waffle confirmé** (baseColor
droppé + grille 100 fixe vs unit-text + tooltip EN sous lang:fr) et furniture a/b/c d'export-code
FR-hardcodé (session DE) → backlog harness trié (`FIX-BACKLOG.md`) avec 2 classes récurrentes
escaladées (question format autonome 3× malgré Never-list · escalade chart-native sans demande
d'interactivité 4× — levier `escalationReason` proposé).

**Étude Spotlight** (`docs/splash/spotlight-learnings.md`) : A1-A5 adoptés (context recovery ·
tri-état persisté · retry borné · stall protocol · skillsInvoked), B1-B4 planifiés pour la release
MIT (`2026-07-16-mit-release-hardening.md` : AGENTS.md contrat runtime + llms.txt · schemaVersion +
CHANGELOG public · deps pinnées + refus d'installer · DISCLAIMER + notice IA à doser), C1-C3 au
backlog (catégories protégées harness · review-artefact · provenance manifest).

**Reste ouvert** : push `main`→`origin/rd-dev` + re-test Tom (décision Rémy) · commits harness sur
`feat/apertus-flue-runner` à cherry-pick vers master (checkout partagé session Apertus) · lot de
fixes backlog (waffle cluster, treemap baseColor, a/b/c i18n, escalationReason) · notice IA (ton).

## Session 2026-07-14 (suite 3) — Vérif harness du thème arbitraire (scrolly/story) + fixes de trous, dont le scaffold scrolly blanc

Rémy : « lance 2-3 tests harness avec persona/sujets neufs pour m'assurer que tout est correct » →
puis « produis le scrolly et le story pour me le prouver » → puis « t'es sûr que le scrolly rend
correctement ? il n'y a que le chart qui a un fond coloré, le reste est blanc » → « et le fond
global » → « fais un check-up complet pour éviter les trucs hardcodés qui cassent ce qu'on
implémente ».

**Harness sur le thème arbitraire (5 cas neufs committés, `splash-harness`).** 3 cas fond-arbitraire
(chart rose #F7E8EE · carte choroplèthe charbon #26262B · heatmap teal #12232E) + 2 preuves de format
(chart-scrolly navy · map-story vidéo charbon). Tous `delivered`. **Prouvé au PNG rendu** : chart rose
(ligne magenta maison), carte charbon (basemap sombre + rampe teal + pill/légende charbon — config
confirme `themeBg`+`mapStyle=dataviz-dark`+`brandHue`), heatmap teal (rampe dérivée du baseColor, plus
le bleu en dur ; cases basses lisibles), chart-scrolly (fond navy + ligne bleu-ciel révélée au scroll),
map-story vidéo (basemap sombre + teal + furniture blanche lisible), chart-vidéo (fond navy plein-cadre).

**Trois trous produit attrapés par le harness + corrigés au système (branche
`fix/theme-scrolly-scaffold-and-label-gutters`, gate 20/20) :**
1. **Scaffold scrolly blanc** (le vrai bug pointé par Rémy) : `ScrollyChart.tsx` codait
   `background:"#ffffff"` en dur sur la boîte de centrage → un scrolly sombre montrait des marges
   blanches autour d'un chart navy. Corrigé → `deriveFurniture(config.themeBg).bg`. + scaffold
   `Scrolly.tsx` (cartes prose, header, crédit, **fond global page/body**, wrapper) dérive tout de
   `config.themeBg`. **Check-up complet = Workflow 45 agents + verify adversarial** : ce `#ffffff` de
   ScrollyChart était le SEUL vrai littéral casse-thème ; les ~40 wrappers `#FFFFFF` des Reveal vidéo
   sont MORTS (ChartFrame peint son bg dérivé plein-cadre par-dessus — render-prouvé au chart-vidéo
   navy) et les littéraux dark/light des composants carte sont liés-au-basemap (intentionnels). Lock
   mécanique `scaffold-theme-parity.test.ts`.
2. **Gouttières de labels fixes → mesurées** : `HeatmapChart` gouttière de lignes fixe 52px → les noms
   longs (« Vendredi »/« Dimanche ») débordaient le cadre (fail WCAG, forçait le raccourcissement de
   la donnée). Mesurée via `leftLabelGutterPx` + tronquée seulement au-delà du cap ~42%. **Étendu aux
   4 types qui tronquaient trop tôt** (boxplot, diverging-bar, diverging-stacked, lollipop) → ils
   grandissent avant de tronquer, comme slope/dumbbell/dot-strip.
3. **Fuite nom-de-colonne** : nouveau `seriesLabelFromColumn` (humanize + majuscule initiale) sur le
   directLabel de la line + les légendes de séries wide-CSV (grouped/stacked/stacked-area) → « shops »
   → « Shops », « coal_share » → « Coal share » au lieu du header brut.

Réponse nette à la question format : **le thème arbitraire marche sur TOUS les formats** — chart
statique/interactif/vidéo/scrolly (dont le scaffold désormais), carte statique/interactif/vidéo/scrolly
(basemap+marks+furniture). Le seul résidu mineur non-render-prouvé = le pill furniture d'une carte-
scrolly web (l'audit n'y a trouvé aucun casse-thème).

## Session 2026-07-14 (suite 2) — Thème à FOND ARBITRAIRE : chaque chart ET carte dérive sa furniture de la couleur maison (n'importe quelle couleur)

Rémy : « le theme devrait s'adapter aussi aux newsroom style… light ou dark mais un newsroom pourrait
l'avoir gris, rose, ou tout autre couleur… Pas que se focus sur heatmap mais sur tous les charts et
maps car c'est complet et global. » Puis (challenge maps) : « les maps… il y a le ground ET il y a
les éléments visuels dessus et les deux doivent être adaptés. »

**Ce qui a été construit (branche `feat/chart-dark-theme`, gate 20/20, review adversariale opus 5 axes).**
Généralisation du système de thème d'un binaire light/dark vers un **fond arbitraire** (`themeBg` = un
hex #rrggbb quelconque, ou les presets "light"/"dark") dont TOUTE la furniture dérive par contraste —
plus aucune couleur en dur.

- **chart-native** : `config.dark:boolean` → `config.themeBg:string` (33 composants re-threadés,
  migration mécanique). `themeColors(themeBg)` = `deriveFurniture(themeBg)` : **ink = pôle
  max-contraste** (near-black/near-white selon le fond, escalade au pôle PUR #000/#FFF sur la bande
  mid-grise ≈ #71–#81 où les extrêmes adoucis tombent à ~4.0:1) ; muted = ink mixé 30 % vers le fond
  (≥ 4.5:1 avec marge sur tout fond réel) ; axis/grid hairlines. **Rampe heatmap DÉRIVÉE du
  `baseColor`** (sujet/maison) via `hueRamp`/`heatmapRamp`, plus de Blues en dur — sur fond sombre le
  bas de rampe est un **mid visible** (chaque palier ≥ 3:1 vs le fond), garde `checkHeatmapConformance`
  neuve (plancher 3:1 dark-ground). Défaut light (`themeBg` undefined) = `COLORS`, byte-identique.
- **map-native** (le ground ET les éléments dessus, les deux adaptés) : **basemap** snappé light/dark
  par la luminance du fond maison (les tuiles MapTiler n'existent qu'en 2 styles — contrainte assumée) ·
  **marks** dérivent déjà de la teinte maison (house-ramp) · **furniture** (pill titre/source +
  panneau légende) = `resolveFrameColors(themeBg)` : pill = le fond maison à 0.82 opacité, ink
  max-contraste (même escalade que les charts), muted 22 %. `MapFrame`/`MapFilterBar`/`legendTheme`
  threadés `config.themeBg` sur les 7 composants ; `validate-config`/`route-geo` gagnent `themeBg`.
- **splash** `brand-profile` : `theme` élargi à `string` (arbitraire) ; `resolveThemeBg(theme)` →
  `themeBg` posé sur les specs chart-native/scrolly ET map-native/scrolly ; `mapStyle` snappé par
  luminance ; dw-chart/map-dw exclus (follow-up) ; override par-élément gagne ; "light" → null →
  byte-identique.

**Prouvé au PNG rendu (méthode définitive, jamais le grep de bundle).** Chart fond rose (#F7E8EE),
navy (#1B2A4A), charbon (#2B2B2B) ; heatmap rampe verte dérivée du baseColor (#2E7D32) + heatmap fond
sombre (bas de rampe lisible) ; carte pill rose (basemap clair) + carte navy réelle (basemap sombre +
pill navy + ink blanc). Furniture + marks + rampe dérivent tous de la couleur sujet/maison.

**Review adversariale (Workflow, 5 axes, verify par finding) → 3 findings mineurs confirmés + 1 faux
positif réfuté** (les strokes #fff de StackedArea = séparateurs de bande intentionnels, pas de la
furniture). Les 3 corrigés + gravés au système (feedback→système) :
1. `deriveFurniture` ink : les extrêmes adoucis tombaient sous 4.5:1 sur la bande mid-grise → **escalade
   au pôle pur** (garanti ≥ 4.5:1 à toute luminance ; presets byte-identiques). Même correctif appliqué
   à `resolveFrameColors` (maps).
2. La garde produce-conformance ne validait la furniture que pour la heatmap ; **les ~19 autres
   branches + `resolveConformanceColors` validaient #1A1A1A sur BLANC** (fiction) → toutes threadées sur
   `deriveFurniture(themeBg)` : un fond mid-gris illisible **FAIL désormais loud** au produce (au lieu de
   ship silencieux), les fonds clairs/sombres restent byte-identiques.
3. Garde map : `fc` et le fond WCAG résolvaient `themeBg` différemment → **échec spurieux** pour un
   override `#FFFFFF`/"light"/malformé sur basemap sombre → unifié sur le même `furnitureBg`.
   (+ garde `mark-contrast` : muted 0.38→0.30 pour clear 4.5:1 sur les bleus/verts saturés sombres.)

Locks de test ajoutés partout (bande mid-grise escalade, garde qui flag le mid-gris, garde map
non-spurieuse, rampe heatmap dark ≥ 3:1). Note honnête : un fond **mid-gris pathologique** (#71–#81)
FAIL le produce (aucune couleur de texte ne clear 4.5:1 dessus — physique WCAG) — c'est le comportement
correct : les gris que les rédactions utilisent (charbon, gris clair chaud) marchent ; seul le gris-
milieu illisible est bloqué, loud. Détail migration : la review a tourné concurremment avec un Workflow
de re-thread → les deux ont édité le même arbre (d'où des dup transitoires convergées) ; gate final vert
sur l'arbre fusionné.

## Session 2026-07-14 (suite) — Sweep QA rigoureux : harness parallèle + suite 80 cas + 6 fixes produit

Rémy : « lance splash-harness pour tous les types et format… check les flows, la conformité, les
règles, la qualité réelle, l'interactif, le storytelling, les mouvements de caméra… ne laisse aucun
trou ou truc erroné. Sois précis, vigilant, rigoureux. »

**Harness durci (repo `splash-harness`).**
- **Résilience suite** (`d6ae827`) : un cas malformé (dossier vide → ENOENT sur article.md) abortait
  TOUT le run de 80 cas au 2e cas. `runSuiteCases` enveloppe désormais chaque cas try/catch → outcome
  `error`, le suite continue. Cas vide `air-quality-explorable-lyon` supprimé. **C'est probablement
  pourquoi Rémy ne voyait jamais de nouvel index de suite** : tout `--suite` mourait au 2e cas.
- **Parallèle borné** (`43f4f39`) : `runSuiteCases` gagne `--concurrency N` (défaut 1 = séquentiel).
  Sûr sur le ledger (findings collectés en mémoire, mergés UNE fois à la fin — pas de course
  read-modify-write ; le piège du parallèle naïf). Chaque cas a son worktree sandbox ; `git worktree
  add` concurrent testé lock-safe (5/5). Résultats réécrits par index → ordre préservé. Test prouvant
  l'overlap réel (3 lanes au pic).

**Suite 80 cas (parallèle ×4) → 69 livrés, 11 did-not-converge, 173 findings (8 critical, 36 major).**
- **LEÇON contention** : les 11 did-not-converge = `timeout`/`turn-cap` sous concurrency-4 (les
  sous-process `claude` ralentis passent le cap wall-clock). **Re-run séquentiel : 11/11 livrés propres,
  0 did-not-converge** → les 11 échecs + leurs **8 criticals étaient des artefacts de contention, pas
  des bugs produit**. Un suite propre doit être séquentiel (ou concurrency ≤2).

**Triage adversarial des findings récurrents (Workflow de vérificateurs — « le juge peut mentir »).**
Écartés avec preuve : **format-aspect (9×) = comportement INTENTIONNEL** (d3-bars row-driven, hauteur
libre pour ne pas rogner des barres — j'aurais « corrigé » un non-bug) ; **title-takeaway général =
sémantique** (reste en revue humaine) ; timeouts = contention. Confirmés réels + mécanisables → fixes
ci-dessous.

**6 fixes produit mergés (gate 20/20, chart-native 1111/0, splash 417/0) :**
1. **Tooltip titre chart-native** (`8395582`) : `<title>{config.title}</title>` à la racine du `<svg>`
   sur **41 composants** → tooltip natif qui suit le curseur et répète le titre. Supprimé partout ;
   `aria-label` (nom accessible, gagne sur `<title>`) + tooltips de données gardés. DOM live vérifié.
2. **Bar-scrolly ordre des beats** (`903fdda`) : `sort="desc"` écrasait l'ordre narratif explicite
   (géographique). `resolveBarSort` (explicit → beats-sans-sort ⇒ "none" → desc), partagé mapper+story ;
   `narrativeBeatWarnings`. Config réelle : highlightIndex [2,5,3,0,1,4]→[0..5].
3. **Slope mutilation de donnée** (`58a84aa`) : gouttière fixe → produce hard-fail → splash tronquait
   la **DONNÉE** ("Interm." pour "professions intermédiaires"). `leftLabelGutterPx` (gouttière pilotée
   par le label, wrap ≤2 lignes) + tripwire d'intégrité (advisory). Donnée intacte, overflow 0px.
4. **Scatter en-têtes bruts** (`95a0a70`) : axes affichaient `pib_par_habitant` littéral.
   `humanizeColumn` + `spec.xLabel ?? humanize(col)`.
5. **Contraste value-label in-fill** (`f5927e5`) : blanc sur `#009E73` = 3,42:1 (< AA) sur
   Marimekko/Streamgraph/Sunburst (heuristique de luminance). `labelInkOnFill` (max-contraste réel
   white-vs-ink) sur les 6 sites. `#084594` garde blanc (pas de régression).
6. **Claim-grounding** (C, `d63222c`) : takeaway « 70% en 2035 » jamais encodé → tripwire numérique
   dans validate-gate (tokens hors domaine data non-annotés → throw). Énergie throw, temp-anomaly passe.
   **Source name/URL (B/D)** : gardes `sourceNamePreservedReason`/`sourceUrlFidelityReason` construites
   + testées avec vrais indices (INSEE, REN/DGEG), mais **dormantes jusqu'au threading de `sourceHint`**
   dans accepted.json (SKILL.md Gate 2c/5b l'instruit — lever prose comme channel/confirmedTakeaway).

**Couverture (doute de Rémy) vérifiée au rendu** : couleur maison + `theme:dark` maps en **statique +
interactif + scrolly** (PNG verts/ambre) ; subject-fit (38 sujets) majoritairement correct (eau→bleu,
feu→vermillon, logement→ambre, env→vert, social→violet), questionnables = vermillon transport/salaires.

**Backlog honnête** : B/D threading `sourceHint` · dw-chart value-label contraste (krankenhaus = dw-chart,
équivalent chart-native corrigé) · format-aspect prose over-spec (LOW) · subject-fit polish · render frais
chart/dw/vidéo house-colour (friction mapper) · tripwire mutilation (E) advisory medium-confidence.

**Suite du sweep — « tout » + 5 tests harness de couverture des fixes (gate 20/20, 9 fixes au total) :**
- **3 fixes backlog mergés** : (H) **dw-chart value-label fail-loud** — DW POSSÈDE la couleur du label
  (YIQ ≠ WCAG, aucune clé d'option pour l'override) ; le bug = une clause `barAxisFallback` downgradait
  tout label < AA en concern non-bloquant dès que l'axe valeur était présent (toujours) → sub-AA shippé
  en silence. Retiré → hard-fail avant l'appel API (fill brand-explicit = concern policy-b). (I) **source
  drop-warning** — threading `sourceHint` = **prose-only par nécessité** (aucun script n'assemble
  accepted.json ; verdict tracé, pas de seam inventé) ; ajout d'un `droppedSourceHintWarning` visible au
  gate. (Fix-E-gap) **slope/dumbbell labels longs** : un label 59-car faisait ENCORE basculer chart-native
  sur dw (slope collision black-on-black d'un bloc 2-lignes de-collidé par un gap 1-ligne + troncature de
  la valeur ; dumbbell = zéro gouttière, Fix E était slope-only). Helpers partagés `fitSideLabels`
  (plus grande police qui tient SANS tronquer, plancher 50%) + `spreadLabelsBounded` (de-collision
  down-then-up bornée) ; slope + dumbbell les utilisent. **Donnée jamais tronquée** (police bornée).
- **5 cas fix-coverage** (nouveaux persona/sujets, committés `splash-harness`, run SÉQUENTIEL) :
  câbles→ordre chrono (`resolveBarSort→"none"` ✅) · salaires 59-car→**trou Fix E attrapé** (puis fermé) ·
  déserts médicaux snake_case→axes humanisés ✅ · facture élec→value-labels lisibles ✅ · renouvelables
  cible-80%-2030→**claim grounded** (takeaway ajusté + cible flaggée « repère contextuel non représenté »
  ✅). **4/5 fixes confirmés e2e sur du neuf ; le 5e a révélé + fait fermer un vrai trou.**
- **Docs gravées** (CLAUDE.md État courant + ce CHANGELOG). Gate final **20/20**, 9 fixes, HEAD `350943f`.

## Session 2026-07-14 — La couleur maison sur les CARTES ne marchait PAS en vrai (bug e2e attrapé par le harness, corrigé)

Rémy : « Tu dis que tu as testé mais je ne vois aucun nouveau splash-harness. » Juste. Le chantier
« couleur maison sur tous les producteurs » (session 2026-07-13) était unit-testé + render-prouvé à la
main, mais **jamais passé de bout en bout dans le harness**. Cause : le harness pilote splash dans un
worktree détaché de HEAD committé, donc le `NEWSROOM-PROFILE.md` non-tracké à la racine n'y était jamais
→ le chemin mécanique du profil ne se déclenchait pas (le run ad-hoc `newsroom-house-style` tombait sur
le chemin par défaut, dw-chart non-brandé).

- **Harness réparé** (repo `splash-harness`, commit `4e636da`) : `injectNewsroomProfileFixture`
  (`src/driver.ts`) copie un `newsroom-profile.md` par-cas dans la racine du worktree sandbox comme
  `NEWSROOM-PROFILE.md` avant le run (gardé au worktree sandbox SEUL — jamais l'arbre partagé, qui
  l'auto-appliquerait à tout produce). `meta.json` note `newsroomProfileInjected`. 3 cas ajoutés :
  `newsroom-house-choropleth` (rampe, clair), `newsroom-house-symbol-dark` (fill, fond sombre),
  `newsroom-house-scrolly` (pass-through).
- **Le bug que le run live a révélé (unit-tests aveugles dessus).** Le suggesteur émet TOUJOURS un
  `palette` subject-fit pour une carte (ici `"purples"` pour un sujet internet). Les chemins couleur
  carte préfèrent un palette explicite à `brandHue`, donc `houseRamp` ne se déclenchait JAMAIS →
  l'`interactive.html` livré peignait la rampe VIOLETTE sous un profil maison vert. Les charts
  marchaient (le merge écrase le `baseColor` auto) ; les cartes n'avaient pas d'équivalent — le merge
  ajoutait `brandHue` mais laissait le palette auto en place.
- **Corrigé au niveau système** (splash `main`, merge `f2db360`) : `mergeProfileDefaults` **efface**
  désormais le palette auto d'une carte (mécanique, map-native) → la rampe maison gagne ; la règle
  Map-colour de `suggest-chart` gagne le « maison d'abord + bouclier explicite » (répare map-dw via
  l'omission du `colorScale`, protège un ramp explicitement nommé par le journaliste via
  `baseColorExplicit`) ; une échelle **divergente** garde sa palette registry (une rampe maison
  séquentielle ne peut pas encoder un point milieu signé — rampe divergente maison = follow-up). Test
  de régression merge→computeChoropleth.
- **Review adversariale (opus) : cœur du fix SAIN** (pas de mutation, houseRamp se déclenche, garde
  cohérente, map-dw non-cassé, tests non-vacants) + 2 findings (régression palette explicite, over-claim
  map-dw) adressés par la règle suggesteur + docs honnêtes.
- **Prouvé au RENDU (pixels, méthode définitive)** : produce.mjs déterministe → PNG **choroplèthe rampe
  verte maison** (fond clair) + PNG **symbole fill ambre maison** (fond sombre). ⚠️ Leçon gravée : grep
  de comptes-hex dans l'`interactive.html` est INVALIDE — c'est un bundle JS single-file qui inline TOUTE
  la registry de palettes ; vérifier au PNG rendu ou au cœur géométrique, jamais au grep du bundle (une
  fausse alerte « toujours violet » a coûté une investigation avant correction). Gate 19/20 (le seul échec
  = `docs/installer` gemini, session concurrente, hors-scope). Détail : ci-dessus.
- **Trou distinct fermé — `theme: dark` du profil maison** (branche `feat/newsroom-theme-dark`, review opus SOUND, choix Rémy « défaut du profil maison ») : le run dark a révélé que la couleur maison SE REND sur fond sombre mais qu'un journaliste ne pouvait pas CHOISIR un fond sombre via le flux (le suggesteur n'émet jamais `mapStyle`, aucun doc ne l'expose → l'actor a livré clair malgré la demande explicite du persona « notre site est sombre »). Fermé façon house-default : `NEWSROOM-PROFILE.md` gagne un champ `theme: "dark" | "light"` ; `mergeProfileDefaults` applique `mapStyle: dataviz-dark` à chaque carte map-native/map-scrolly (miroir de palette/source/lang ; map-dw exclu — son fond sombre est un mécanisme Datawrapper, follow-up ; un `mapStyle` par-élément prime). Parsé du md + brand.json (thème seul = profil valide, trimé). **Prouvé au rendu** : un symbole SANS mapStyle + profil `theme:dark` → merge `mapStyle:dataviz-dark`+`brandHue` → PNG fond sombre + cercles ambre maison. Review : 0 defect (probé live), 2 nits corrigés (trim ; l'exemple ship `theme` commenté = dark opt-in sans épingler le clair).

## Session 2026-07-13 (suite) — Option 3 item 3 : bundle source React RUNNABLE pour map-native/scrolly (10 tâches, branche `feat/map-scrolly-source-bundle`)

La forme « Code source » de l'EXPORT (décision verrouillée 2026-07-10) n'était réellement runnable
QUE pour chart-native (`export-source.mjs` copie `chart-native/src`, self-contenu) — map-native et
scrolly livraient un dossier de fichiers déjà buildés, byte-identique à la forme « HTML autonome »,
rien à reconstruire. Fermé (spec `docs/superpowers/specs/2026-07-13-map-scrolly-runnable-source-
bundle-design.md`, plan `docs/superpowers/plans/2026-07-13-map-scrolly-runnable-source-bundle.md`,
10 tâches, chaque tâche review clean) :

- **Générateur `skills/splash/scripts/bundle-source.mjs`.** map-native/scrolly ont un `src`
  ENTRELACÉ (scrolly importe chart-native+map-native ; map-native importe scrolly depuis 2 fichiers
  hors du chemin interactif) donc ni un `cpSync` brut du dossier ni un metafile esbuild ne
  suffisent (les imports Vite `?raw`/`.css` ne se résolvent pas sans plugin — la spec a été mise à
  jour en conséquence, esbuild n'était qu'un choix de départ). À la place : un **tracer d'imports
  statiques maison** (`traceClosure`) qui parcourt le graphe depuis `mount.tsx`, résout les imports
  relatifs, s'arrête aux bare-specifiers ; la copie **préserve le layout repo-relatif**
  `skills/<engine>/{src,assets}` (chaque import relatif existant résout sans réécriture) ; les deps
  du `package.json` généré sont **DÉRIVÉES de la closure tracée**, jamais écrites à la main —
  `remotion` y apparaît automatiquement car il est réellement sur le chemin interactif carte
  (`mount.tsx → composant → route-geo.ts → video-scene.ts → remotion`).
- **Deux marqueurs producteurs.** `skills/map-native/scripts/produce.mjs` et
  `skills/scrolly/scripts/produce.mjs` déposent désormais `source-manifest.json` (+ `config.json`,
  déjà existant) en sortie interactive/scrolly — le signal que `bundle-source.mjs` peut assembler un
  bundle pour cet élément.
- **Routing `export-code.mjs` + `assertDelivered` resserré.** La forme `code-source` détecte
  `source-manifest.json` (map-native/scrolly, en l'absence de `native-source.json` chart-native) et
  route vers `bundle-source.mjs` au lieu de copier les fichiers déjà buildés — le dossier de
  fichiers reste un dernier recours si NI l'un NI l'autre marqueur n'existe.
  `assertDelivered(files, { format, form: "code-source" })` exige maintenant `package.json` +
  `vite.config.ts` à la racine (pas juste un dossier non-vide) — bloque une régression vers une
  simple copie d'`interactive.html` qui passerait pour un bundle runnable.
- **Preuve from-zero (harness opt-in `skills/splash/scripts/verify-source-bundle.mjs`, délibérément
  PAS dans `bun run check`** — réseau réel + `bun install`/`bun run build` réels + rendu Playwright
  réel, trop lourd pour tourner à chaque commit) : **4 types rendus de bout en bout depuis zéro** —
  choropleth, symbol, route (le cas géo-dense : polygones + longue ligne, basemap sombre) et un
  map-scrolly (la closure à 3 arbres scrolly+map-native+chart-native) — chacun `bun install && bun
  run build` dans un dossier temp SANS `node_modules` partagé, puis rendu headless asserte un canvas
  MapLibre peint, les tuiles chargées, aucune erreur `VITE_MAPTILER_KEY missing`. **Les 7 types
  map-native** sont build-vérifiés structurellement depuis zéro (les 4 restants — locator,
  dot-density, hex-grid, cartogram — sautent le rendu Playwright par design : juste `bun install &&
  bun run build` → `dist/index.html`). Un flake d'environnement (contention Chromium après ~6
  lancements Playwright séquentiels dans le même run) a fait échouer `map-native-route` une fois ;
  PASS au retry isolé avec un `bun install` à froid réel — aucun bug de bundle trouvé.
- **Caveat MapTiler documenté, jamais contourné.** La carte fetch ses tuiles basemap à l'exécution —
  le bundle est *rebuildable*, pas *offline* (inhérent au design basemap hébergé). La clé splash
  n'est jamais embarquée (secret privé, révocable, à quota) ; le bundle documente
  `VITE_MAPTILER_KEY` dans `.env.example` + `README.md` — le journaliste met la sienne.

`bun run check` reste **20/20** — les nouveaux tests d'assemblage vivent dans les `TEST_DIRS` déjà
couverts (`skills/splash`, `skills/map-native`, `skills/scrolly`), pas de nouvelle ligne de gate,
pas de réseau dans le gate.

## Session 2026-07-13 — Chantier déféré #1 : le hang vidéo seismes ROOT-CAUSÉ + fix universel (le seul vrai échec du corpus, éliminé)

Le hang du rendu vidéo symbole animé (map-native + Remotion) — **le seul `status=failed` restant du corpus QA**,
et la zone vitrine vidéo de Splash — root-causé en discipline systematic-debugging (reproduire → instrumenter
→ prouver → corriger → re-render). **DEUX causes racines prouvées, corrigées au root :**
1. **Frame-gating non-borné** : chaque frame attendait `map.on("idle")` MapLibre — qui ne se déclenche que
   quand TOUTE tuile demandée est chargée ; une seule tuile bloquée/jamais-arrivée pendant un survol caméra
   large laissait le handle `delayRender` de la frame jamais continué → Remotion bloquait sur cette frame à
   jamais. Fix : `core/frame-ready.ts` `continueWhenMapSettles` continue sur `idle` OU après un settle borné
   (`FRAME_MAP_SETTLE_MS=6000`, entre un settle sain <1s et le timeout delayRender de Remotion), exactement
   une fois — une tuile bloquée dégrade en frame légèrement-moins-tuilée, **jamais un hang**. C'est l'invariant.
2. **Bounds caméra antiméridien** : les points Ring of Fire straddlent la dateline (Japon +142 → Alaska −176
   → Chili −73) ; les bounds naïfs `{west:min, east:max}` donnaient un span ~360° → la caméra survolait le
   globe entier en chargeant chaque tuile. Fix : `core/longitude.ts` `shortWayLongitudeExtent` (arc minimal,
   `east` non-wrappé >180 pour `cameraForBounds` en Mercator continu) → caméra centrée Pacifique.
- **Propagé à TOUTE la classe** (feedback→système) : 42 sites idle-continue sur **20 composants** vidéo-carte
  (Cartogram/Choropleth/DotDensity/HexGrid/Locator/Route × Reveal/Story/Scrolly + Symbol Reveal/Scrolly +
  HarnessCheck) convertis au helper borné ; les interactifs `*Map.tsx` laissés (ne gatent pas delayRender).
  Antiméridien propagé à Locator (même mécanisme point-lon ; region-family turf-bbox = follow-up noté).
  **Drift-guard test non-vacuous** (`components-frame-ready-invariant.test.ts` : aucun composant ne garde le
  pattern hangable ; tout delayRender-continue passe par le helper) → le hang est **structurellement
  impossible pour les 21 compositions vidéo-carte**, un futur composant hérite la règle.
- **Render-vérifié de bout en bout** : le seismes symbole rend **927/927 frames** → mp4 4,7 Mo (était : hang
  indéfini), still = carte **Pacifique-centrée** correcte (séismes en cercles autour du rim, taille=magnitude,
  du Japon au Chili) ; une vidéo choroplèthe non-symbol rend **801/801 frames** (la propagation marche
  au-delà de symbol). map-native 646/0, tsc clean.

## Session 2026-07-12 (suite 5) — Wave 13 : breadth (types/personas sous-testés) + 2 gaps de capacité fermés

Post-convergence, la boucle passe en **breadth + fermeture de gaps** (les chemins communs ayant convergé).
Wave 13 = 4 cas sur des combos sous-testés + persona adversarial : **4/4 livrés, 0 critical**.
- **Types render-vérifiés haute qualité** : **waterfall** (cascade 12,4→8,5, palette de rôle inc/dec
  intacte — le fix highlight ne l'a PAS cassée, totaux ancrés, value-labels) · **bump** (rangs streaming,
  croisements nets, tooltip fonctionnel « Spotify 2021 #1·2022 #1·2023 #1·2025 #2 ») · **diverging**
  (balance ±, garde value-axis-zéro + sign colors) · **adversarial-contradictory** (pie→refusé→bar,
  takeaway changé, correction de donnée réclamée puis rétractée) **géré de façon cohérente sans major** —
  robustesse confirmée sous pression indécise (Lyon 5400 rétracté correct au rendu).
- **1 major = improvisation qui revient** (bump `conformance-no-fabrication` : echo fabriqué + contournement
  d'un non-zéro transitoire) — classe **comportementale-LLM récurrente**, QA-attrapée, **livraison propre**
  (le bump livré est excellent) ; discipline déjà élargie 2×, pas de levier mécanique produit propre (même
  classe que titre↔takeaway) — le filet reste la garde.

**2 gaps de capacité/qualité fermés (agents + review) :**
- **★ Heatmap atteignable de bout en bout** (`feat/wire-heatmap`, review SAFE) — ferme le gap Wave 7
  (une demande de grille jour×heure dégradait en grouped-column). Le moteur existait (HeatmapChart +
  géométrie + comps vidéo, registered) ; manquaient le MAPPER (`spec-to-config.ts` : matrice-large →
  config, **1er type atteignable à faire valeur-continue→couleur** via ramp Blues CVD-safe), le routing
  suggest-chart (famille magnitude), l'un-defer `native-types`, et la garde produce (`checkHeatmapConformance`
  ramp monotone). Static+interactif+vidéo live ; scrolly fail-hard. **A débusqué + corrigé un vrai défaut
  WCAG latent** (`cellTextColor` seuil cassé, blanc sur mid-tone ~2.4:1) via **WCAG SC 1.4.3** : labels
  in-cell en grand gras (≥18.66px conformes à 3:1), la garde contraste PARTAGÉE apprend la provision
  large-text — **étroitement bornée** (review : 15 cas-frontière WCAG-corrects, fail-closed, n'affecte QUE
  les cellules mid-tone heatmap, les 40+ autres types inchangés). Render-vérifié (grille d'intensité +
  colourbar). chart-native 1072/0.
- **Value-labels directs dw-chart** (`fix/dw-chart-bar-value-labels`, live-vérifié) — FT best-practice #3 :
  les barres dw-chart shippaient sans labels de valeur (le lecteur estimait sur la grille). L'agent a
  **renversé la prémisse du code par vérif live** : DW choisit la couleur du label inside par seuil **YIQ
  (~160), PAS luminance WCAG** (sky et amber, même luminance, couleur DW opposée) → les fills clairs
  reçoivent de l'encre foncée sûre, seuls quelques mid-tone ont un blanc sub-AA. Fix : `show-value-labels`
  ON par défaut + format locale (« 10 600 » groupé) + `force-grid` (axe) comme fallback a11y toujours
  présent ; la garde modélise le YIQ (plus de faux flag sur fills clairs), mid-tone-inside-avec-fallback =
  concern (pas throw), throw dur conservé si pas de fallback. Render-vérifié (nombres sur les barres).
  dw-chart 247/0. (stacked bars exclus — concern distinct.)

**Validation au flow réel (re-run des 2 cas) — les 2 capacités livrent, render-vérifiées :**
- **heatmap** livrée = **vraie grille d'intensité** (jour×créneau, lundi soir 210 = cellule la plus foncée,
  labels in-cell lisibles via le fix WCAG, colourbar, tooltip) — plus de grouped-column. Gap Wave 7 fermé
  et prouvé au rendu.
- **bar dw-chart** livrée = **chaque barre porte son nombre** (Paris 10 600, Lyon 5 400… groupés à
  l'espace FR via `language:fr-FR`, encre foncée lisible) ; Lyon 5 400 = valeur adversarial rétractée
  correcte.

**★ Insight précision-harness : la « classe improvisation » était largement un faux positif du filet QA.**
Les 2 majors `conformance-no-fabrication` des re-runs étaient des **snaps flakés sous flap réseau**
(prouvé : le produce heatmap avec le config EXACT passe TOUS les snaps en isolation, exit 0) et des
**livraisons hosted-DW** (`outputs=0` par nature — la livraison est `EMBED_URL.txt`). Fix harness
(`checks.ts`, master `0c60a31`+`2170b50`) : le exit-arm de `conformance-no-fabrication` est gaté sur
l'état FINAL du rapport — gate-clean (produced+reviewed+approved AND (outputs>0 OR hosted-embed
`EMBED_URL.txt` réel)) ⇒ retry légitime, supprimé ; sinon flaggé. **Corpus 6→1** : seul reste
`seismes` (vrai `status=failed`, le hang vidéo connu). `product-source-hot-patch` intact (aging
fabrication toujours attrapée). `delivery.ts` partagé = contrat hosted-embed unique avec
`deliverable-reached`. 252/0. **Conséquence : les verdicts de wave sont maintenant fiables** — la vraie
improvisation produit est rare ; l'inflation venait du filet, pas du produit.

## Session 2026-07-12 (suite 4) — Wave 12 : CONVERGENCE — 6/6 livrés, 0 critical, 0 major, toutes les confirmations tiennent

**Première wave entièrement propre** (2 re-runs de confirmation Wave 11 + 2 fraîches, + legit-abc/wealth-health)
: 6/6 livrés, **0 critical, 0 major**. Les fixes Wave 11 CONFIRMÉS au flow/rendu :
- **aging → 0 finding** (était 1 crit + 2 maj) : la carte scrolly non-réalisable (pas de fond départements
  FR) est **surfacée honnêtement** puis bascule map-dw statique — plus de script fabriqué, plus de faux
  « delivered ». L'improvisation guard tient exactement comme voulu.
- **source-correction → majors éliminés** (re-produce propre, plus de contournement) · **legit-abc →
  scatter dégagé** (occlusion Copenhague corrigée) · **wealth-health → capture propre** · **takeaway-reframe
  (fraîche) → le reframe mid-flow marche** : splash re-confirme le takeaway changé + re-produit + re-review
  sur le nouveau rendu, titre final porte le trade-off · **long-title (fraîche) → titre 78 car. rendu sans
  clip**.

**Résiduel = minors uniquement** (polish/préférence, pas de défaut flow/résultat) — laissés au backlog :
- **abréviation grands nombres sur value-labels** (wealth-health : PIB 1 000–89 000 non abrégé « 42k » ;
  best-practice FT #4/#7) + décision suffixe-unité par-label vs sous-titre (chart-native met déjà l'unité
  au sous-titre — arbitrage clutter) — la classe result-quality la plus actionnable.
- **CADRAGE Q3 canal/format** re-flaggé malgré le fix wording : le juge lit l'énumération des formats dans
  l'option canal comme un « choix de format plié dans le canal » ; mais le canal héberge vraiment plusieurs
  formats et le journaliste doit le savoir — pas de wording qui satisfait sans perdre l'info (préférence juge).
- **indépendance Gate-3a** : les probes de render-review restent LLM-authored (le filet mécanique indépendant
  = deep-verify + snaps produce ; la review éditoriale reste attestée-LLM — limite architecturale connue).
- mineurs : stray `echo noop` · série dérivée non distinguée visuellement (source-correction).

**★ Bilan de la boucle QA (Waves 8→12, 2026-07-12) : convergence atteinte.** 5 waves, ~40 cas, personas
variés (DE/IT/FR · pressé/pointilleux/sceptique/girouette/insistant/coopératif) : **0 critical produit sur
les 5 waves, 0 major sur la dernière, toutes les confirmations tiennent au rendu.** Chaque classe récurrente
mécanisée en garde permanente (validation stricte · beats · comptabilité par-probe · provenance gate-render ·
unité une-source · WAIT a/b/c · **improvisation** · embed/fly · scatter-occlusion). Flake de gate le plus
fréquent éliminé (map-native produce). Gate 20/20. Le filet QA (checks sandbox + deep-verify) a prouvé sa
valeur en attrapant les improvisations. Régime « propre » : les nouveaux findings sont désormais des minors
de polish, plus des défauts de flow ou de résultat.

## Session 2026-07-12 (suite 3) — Wave 11 : 3 confirmations OK + classe « improvisation » mécanisée (5 fixes), flake map-native éliminé

**Wave 11 (2 re-runs de confirmation + 3 probes neuves qui stressent les gardes fraîches) : 5/5 livrés.**
**Confirmations validées** : double-opportunité @ turnCap 40 → **0 major** (le fix résout le closed-early) ·
happy-path a/b/c (persona coopératif choisit « b) HTML autonome ») → la règle WAIT **ne frictionne pas**
le chemin normal · takeaway en deux parties (richesse↔vie + exception US) → **tenu jusqu'au titre**.

**4 classes réelles → 5 fixes (workflow 4 clusters + review, 1 agent flake séparé) :**
- **Garde anti-improvisation** (2 findings = 1 classe : le pattern « splash improvise pour passer un
  échec ») : aging a **fabriqué un script produit ad-hoc** (`skills/scrolly/scripts/verify-aging.mjs`,
  inexistant dans le repo) pour satisfaire un gate ; source-correction a **contourné un produce non-zéro**
  au re-produce ; wealth-health a **mv-é** un artefact mal-pathé. Tous attrapés par les checks sandbox du
  harness (`product-source-hot-patch`, `conformance-no-fabrication`). Fix : Never list élargie (jamais
  créer/éditer du source produit, jamais contourner un exit non-zéro, jamais de file-op ad-hoc) + chemin
  de capture Gate-3 rendu **absolu run-scoped** (l'enabler du mv). SAFE.
- **Intégrité embed/fly** (aging critical) : le choix embed calait sur `FLY_API_TOKEN` absent et était
  marqué « delivered » sur l'output pré-export. Fix : `deploy-embed` fail-fast + `assertDelivered` exige
  une vraie URL hébergée pour la forme embed + la proposition a/b/c signale l'embed indisponible (steer
  vers b). Le chemin hosted-DW (publicUrl, sans fly) livre toujours. SAFE.
- **Modèle de questions CADRAGE** (4e finding de wording) : Q1 DIRECT/GUIDED confirmé pas inféré ·
  comptage réel (fini le « Q3, toujours posée » quand moins de questions ont été posées) · plus de
  double-ask canal↔format. **Review UNSAFE** : le 1er jet renumérotait channel Q3→Q2 dans un seul fichier
  → 18 refs périmées ailleurs ; re-scopé (renumérotation revertée, vrais fixes gardés, purement additif).
- **Occlusion titre-d'axe scatter dw** (render-confirmé : Copenhague caché sous le titre X) : DW n'offre
  aucun levier pour bouger un titre d'axe scatter (inline aux coins) — le SEUL levier honoré est le
  domaine (`visualize.y-axis.range` **numérique** ; les bornes string du chemin `custom-range-y` sont
  ignorées sur un scatter, live-vérifié) → étendre le domaine Y de 0.3×span des deux côtés pousse les
  marks hors des bandes-titres des coins, déterministe. **Render-vérifié** (Copenhague dégagé). *(2 agents
  morts sur flap API ; fini inline — le test RED écrit par l'agent était la spec exacte de la forme
  métadonnées à émettre.)*
- **Flake map-native éliminé** : le test `produce.mjs single-format dispatch` (6 renders MapLibre live +
  tuiles maptiler, injouable offline) timeout à ~86s sous contention — **la cause de re-run de gate la
  plus fréquente de la semaine**. Timeout porté à 240s (même classe que les fixes install + map-dw) ;
  gate 20/20 validé 3× par l'agent. Passe 630/0 en isolation.

**Note** : reprise après relèvement de la limite de dépense. Le filet QA (checks sandbox) a prouvé sa
valeur en attrapant les 2 improvisations — exactement son rôle ; le produit durcit maintenant le contrat.

## Session 2026-07-12 (suite 2) — Wave 10 : confirmation ciblée + longue traîne épuisée (7 fixes), gate 20 checks

**Wave 10 (4 re-runs des cas mordus Wave 9) : les 2 cibles principales CONFIRMÉES 0-major** — italien
(tooltip carto + fit sub-national) et startup prose-only (provenance gate-render + Gate 2b) tiennent. Les
2 cas restants ont donné des findings précis, tous mécanisés :
- **map-dw unité — une source par surface (`fix/map-dw-unit-single-source`)** : le « %% » doublé était la
  collision **unit × token-pourcent** (le fixer a RÉFUTÉ l'hypothèse `number-append` par 6 probes live —
  ce mécanisme n'atteint AUCUNE surface carte, phantom) → `formattedSurfaceUnit`/`rawTooltipUnit`, l'unité
  apparaît exactement une fois par surface, matrice unit×numberFormat testée + e2e live. **+ émission** :
  suggest-chart émet le champ `unit` pour les unités courtes (le tooltip italien était nu car spec sans
  `unit:"mm"`) + garde eval `requireUnit`. **+ jointure France** : `postal` = abréviations, pas d'INSEE →
  join sur `name` (probé live ; classe world-2019/DW_STATE_CODE).
- **a/b/c : WAIT means WAIT (`fix/abc-wait-discipline`)** : splash auto-décidait le choix de forme
  (« Je finalise… pour les deux ») sans attendre — SKILL.md durci + ligne « attends le choix » dans le bloc
  émis PAR export-code + **check mécanique harness** (proposition sans tour-réponse journaliste avant
  `--form` = [major]). Sweep corpus : **3 instances réelles** de la classe attrapées, 0 faux positif.
- **Infra de test — la classe flake sous contention, mécanisée** : `install` verify-tests à 60s ·
  **map-dw e2e live plafonné à 2 charts publiés** + retry CDN borné (`live-render` partagé, matrice
  déplacée en assertions métadonnées pures ; 60s→37s) · **override `turnCap` par-cas via expect.json**
  (le cap global 24 coupait un run CORRECT à 2 éléments dont les gates par-élément doublent le dialogue —
  double-opportunité passé à 40).
- **Gate à 20 checks** : dw-chart + map-dw enfin typecheckés (tsconfigs + deps ; 0 erreur — code déjà
  propre sous la discipline no-any).

**Note honnête** : le re-run final double-opportunité @ turnCap 40 et le chantier e2e-slim ont été
**interrompus par la limite de dépense mensuelle** (les waves harness et les agents lancent des
sous-process `claude` → API Anthropic ; `bun test`/`bun run check` frappent Datawrapper/MapTiler, non
bloqués). e2e-slim était commité avant la mort de l'agent → validé et mergé inline (suite 145/0, 37s).
La confirmation du turnCap-40 sur double-opportunité reste à re-runner quand la limite est relevée.
Aging timeout Wave 10 = symptôme des 3 passes correctives (join/unit/%%) — supprimées à la source par le
fix unité ; à re-confirmer.

## Session 2026-07-12 (suite) — Wave 9/9b : fixes validés au rendu, 0 critical, longue traîne mécanisée

**Wave 9 (4 re-runs des cas mordus + 3 probes neuves) : 7/7 livrés, 0 critical.** Les fixes Wave 8
**validés au rendu** : krankenhaus → Basel HIGHLIGHTED accent/muted + titre allemand portant les 2 parties
du takeaway + « Quelle: » localisé ; tourism → vert subject-fit (plus d'orange hardcodé) sur le
`video-square-final.png` ; farm scrolly → plan 3-temps tenu (1 minor de bruit) ; aging → beats explicites
tenus (Alpes-Maritimes inclus). **Règles structurantes validées** : deux-opportunités (2 éléments, 2
accepts, 2 exports séparés, `confirmedTakeaway` présent) · prose-only Gate 2b (table exacte confirmée
avant production, source name-only honnête) · italien e2e livré. **« Vérifier le livré » a re-payé** : le
[major] « 142 absent + dataset 404 » = lag de propagation CDN mi-flow — le chart publié PORTE le 142
(curl vérifié) ; le vrai résidu = la review avait silencieusement abandonné le concern de sa propre probe.

**Ronde 9b (3 clusters + reviews exécutantes, 1 UNSAFE corrigé) :**
- **Doc-cluster (SAFE)** : libellé Q3 re-précisé (3× flaggé — ma propre correction print avait sur-corrigé :
  « (image statique) » lisait tout article-web comme statique) → « Article web / embed — interactif, image
  ou vidéo (destination print ⇒ image statique) » · règle caption-de-beat à claim comparatif vérifiée
  contre l'ordre réel (un beat livré disait « devant » pour une valeur INFÉRIEURE) · un `confirmedTakeaway`
  PAR élément · never-do artefacts plantés à la main dans les output dirs.
- **map-dw (SAFE, merged-tree vérifié)** : tooltip choroplèthe porte l'UNITÉ (« 1480 » → « 1480 mm » —
  hover live vérifié headless ; la classe %REGION_VALUE% qui ignorait number-append) · warning
  sparse-subset (7 provinces sur l'Italie entière = micro-cluster illisible ; seuillé pour que les
  8-cantons légitimes passent) · préférence routing map-native auto-fit pour les subsets sub-nationaux.
- **Intégrité de spine (UNSAFE→fixé)** : gate-render refuse un fichier non-traçable au produce courant
  (tue le hack du fichier planté + l'approbation périmée, chemin hosted-DW sanctionné préservé) ·
  review-gate : ledger de probes obligatoire + **comptabilité par-probe** (le reviewer a prouvé le drop
  PARTIEL : une probe `concern` passait dès qu'un concern quelconque existait → chaque concern-probe doit
  être citée verbatim ou résolue avec preuve) · **tripwire GUARD 3b duplicate-confirmedTakeaway**
  (le reviewer a démontré trivial ce que l'implémenteur croyait non-mécanisable — 2 éléments au takeaway
  byte-identique = validation failure) · `format-selection.md` purgé du fallback aboli (doc-rot que le
  fix Wave 7 avait raté).
- **Migration CSV RFC4180 dw-chart (SAFE)** : les 12 sites naïfs migrés, byte-fidélité **fuzzée 300 000
  cas** (sortCsv réordonne les strings brutes, jamais de re-sérialisation), 4 hooks de cleanup à 60s
  (la classe flake). Le reviewer a diffé main-vs-branch sur 13 fixtures : zéro divergence.
- **Gate renforcé : 20 checks** — dw-chart + map-dw jamais directement typecheckés (note de review :
  couverture transitive seule via les imports d'splash) → tsconfigs + deps + `TSC_DIRS`, 0 erreur surfacée.

**Environnement** : 5 runs Wave 9 tués par une panne réseau (ConnectionRefused, même flap que les gates
17/18 de la veille) — relancés propres ; 2 agents tués par la même panne, repris par SendMessage.

## Session 2026-07-12 — Wave 8 QA (9 cas, personas variés) → 5 chantiers de fixes + 3 systémiques pour classes répétées

Reprise de la boucle QA sur le main durci (mandat Rémy : boucler jusqu'à parfait, solutions concrètes
quand les erreurs se répètent). 9 cas neufs : dialogue 100% ALLEMAND (jamais testé) · vidéos carré+portrait
(premières productions sous le snap vidéo) · map+chart scrolly · interactif noms-longs mobile · map-dw
embed-only · slope print + persona girouette · piège stories-interactif. Personas : pressé, pointilleux,
sceptique, girouette, insistant. **8/9 livrés, 0 critical produit réel.**

**Passes remarquables (gardes des tranches 1-3 validées en vrai flow)** : le TRAP stories-interactif =
refus net avec explication technique + 2 alternatives honnêtes (2 pushbacks tenus, jamais cédé) · la
girouette re-pinne static proprement (re-route suggest-chart) · le snap vidéo tourne en production
(`video-verify.json` : portrait sparse line midVsEarly 0.276 — passe le seuil recalibré 0.15 que l'ancien
0.5 aurait bloqué à tort ; reveal 1.01 ; still-match 0.0003) · map-dw embed-only propre · sign-off coupé
par le driver.

**5 chantiers de fixes (workflow + review adversariale, 2 UNSAFE corrigés) :**
- **barColor jette baseColor sur highlight** (render-confirmé : pink #CC79A7 spec → orange hardcodé) :
  highlighted = primary (baseColor ?? défaut), contexte = muted ; sweep famille (seul BarChart avait le
  pattern — vérifié par grep reviewer) ; + value-labels scrolly embarqués suffixés unité courte
  (locale-aware, `SHORT_UNIT_MAX_CHARS`). Review SAFE, pixel-exact vérifié (#CC79A7, zéro orange).
- **dw-chart : validation STRICTE + vrai highlight** (systémique — l'orchestrateur avait halluciné
  `highlight`/`highlightColor`, avalés silencieusement → cycle de production gâché) : champs inconnus
  rejetés fail-loud (liste canonique compile-lockée, suggestion near-miss) + champ `highlight` RÉEL
  (par valeur de catégorie, DW custom-colors, e2e API+pixels). **La review a attrapé un important** :
  membership check en `split(",")` naïf → catégorie RFC4180 à virgule faussement rejetée (« Ministère de
  l'Économie, des Finances… ») → scanner RFC4180 porté dans dw-chart (convention sibling). Le fixer a
  révélé la classe entière : sortCsv/dataShape/numericValuesOf toujours naïfs → **migration systémique
  dispatchée** (branche `fix/dw-chart-csv-rfc4180-migration`).
- **Contrôle narratif scrolly** (répété 2× cette wave : plan 3-temps confirmé aplati en auto-pick ;
  Alpes-Maritimes résolu par cherry-picking) : `beats` explicites dans la spec (line : ancres x + textes ;
  bar-walk : liste ordonnée de catégories, longueur libre), validés contre les données (typo = fail loud),
  auto-pick par défaut byte-identique (diffé sur 8 fixtures par le reviewer) ; PROPOSITION annonce
  honnêtement contrôlable vs auto. Review SAFE.
- **Harness : registration hosted-embed** (3e occurrence du faux critical « deliverable not reached ») :
  `EMBED_URL.txt` frais + publicUrl matché = livrable réel ; + le driver RÉPOND au choix a/b/c (détection
  de la proposition + dérivation du choix depuis la persona). **La review a attrapé un important** : le
  détecteur ne connaissait que FR/EN — la proposition ALLEMANDE (« Welche Lieferform möchtest du? », run
  krankenhaus réel) passait au travers → bras STRUCTUREL langue-indépendant (3 kinds classifiés = signature)
  + vocabulaire de/it. 240/0.
- **Discipline de flow** (SAFE) : `confirmedTakeaway` REQUIS dans accepted.json (3e occurrence de la
  divergence titre↔takeaway — levier de présence mécanique + instruction review « citer et vérifier
  toutes les parties ») · Q3 couvre le print (→ article-web + format static) · règle d'incertitude de
  source (« de mémoire » ⇒ fallback prose honnête, jamais citation confiante).

**Backlog légué (mineurs reviews)** : valueUnit pas threadé au suffixe embarqué (forme canonique
long-unit+valueUnit) · `fmt()` chart-story vs `unitSuffix` divergent (fr sans espace vs U+202F) ·
séparateur unitSuffix hors table LOCALES · gutter vertical embedded non-géré · dw narrow-width review
(long labels sur dw interactif : seul le 1200px inspecté au Gate 3 — la classe label-safety à étendre) ·
vermillon sur sujet cyber (palette sémantique, connu) · 2-form proposal 4e langue (détecteur conservateur).

## Session 2026-07-11 (suite 3) — Tranche 3 : clôture de la P-list mécanique de l'audit (P3 + P5 + densité) — 4 clips produit réels débusqués et corrigés

Même dispositif (3 implémenteurs worktrees + reviewers qui **exécutent** les gardes). La review label-fit
est le sommet de la méthode : elle a couru la garde à 360px (largeur de livraison documentée que le 1er
jet ne mesurait pas) et découvert que **le bug stacked-area corrigé en début de session vivait encore sur
le chemin responsive narrow** (« 280 »→« 28| » à l'écran) — puis le fixer a invalidé l'hypothèse du
reviewer par la mesure (vrai root-cause : `padding` html+body empilé 48px affamait un téléphone 360px sous
le plancher `minWidth` 280px → le svg peignait hors carte).

- **P3 — snap label-fit générique (`feat/label-fit-snap`)** : Playwright, chaque nœud texte rendu doit
  tenir dans ses bornes de clip ±4px (tolérance calibrée : em-box ascent 3.00px mesuré zéro-encre-coupée ;
  vrais clips ≥5px, classe historique 15px+) · static@900 + **interactif@360 ET 1100** · résout les
  ancêtres `clipPath` (userSpaceOnUse/rect, boundary documentée fail-open) · gardes de vacuité · RED
  mécanique sur le bug historique (StackedAreaChart pré-fix → exit 1 à 15.4px). Câblé fail-hard dans
  produce (static+interactif) après snap-contrast. **4 clips produit RÉELS trouvés par la garde et
  corrigés au niveau layout** (jamais en élargissant la tolérance) : (1) inset de page responsive —
  body-only + contrat `minWidth` honnête sur le wrapper (synché dans le template `export-source`) ;
  (2) légende dumbbell « Men » coupée en bas à 360 (réserve `legendRowCount` partagée) ; (3) annotation
  « projection → » du FanChart coupée par son clipPath (36.92px, produce-reachable — flip côté historique
  quand la zone forecast est étroite) ; (4) légende dot-strip jamais wrappée (18.72px — `legendWrapsAt`
  unique pilote réserve ET wrap rendu). chart-native 1034/1034.
- **P5 — gate i18n furniture (`feat/i18n-furniture-gate`, SAFE)** : deliverable non-EN ⟹ vérifié localisé,
  aux bons seams — DOM furniture pour les natifs (dans les page-loads de snaps EXISTANTS, zéro session
  browser en plus : préfixe source == table locale importée single-source · blocklist EN scoped furniture,
  data-labels exclus — testé adversarial « Software Republic », catégories « Note: » · spot-check groupage
  nombres conservateur, patterns non-ambigus seuls) — et **assertion de métadonnées** pour les 2
  producteurs DW (invariant `annotate.notes`+champs-natifs-blanked assertés AVANT tout appel API : une
  régression future échoue au produce au lieu de shipper la caption anglaise). 4 suites vertes API réelle.
  Follow-ups loggés : chemin vidéo non-gaté (indirect) · `sourceLabel` map-native ne localise que le FR
  (gap de/it vs les 3 autres).
- **Densité dw-chart harmonisée (`fix/dw-chart-density-floor`, SAFE)** : **un canal = une taille livrée
  pour les 4 producteurs** — dw-chart static demandait la boîte pleine (DW rasterise à 2× → 2400×1350
  livrés, jamais assertés) ; requête halvée comme map-dw + plancher IHDR fail-hard (±2px ; jambe largeur
  seule pour les types row-driven à hauteur contenu). Vérifié live des deux côtés du fix (RED 2400 → GREEN
  1200×675 / 1080×1080). Le reviewer a re-prouvé live que le 2× DW tient pour les charts sur les 2 jambes.
  Follow-ups : `zoom` non-pinné dans la requête export (le plancher échoue fort si DW change le défaut) ·
  `output-proof` PNG à re-générer (densité pré-fix).

**★ P-list mécanique de l'audit 2026-07-11 : FERMÉE** (P1 vidéo · P2 channel · P3 label-fit · P4 map-dw ·
P5 i18n + alt-text + sign-off + source-i18n dw + densité). Restent les non-mécaniques (palette sémantique,
`confirmedTakeaway`, flags attestés-LLM/`approvedHash`) + les follow-ups ci-dessus — et les deux chantiers
à input Rémy : **dry-run Annemasse** (vrais brouillons) et **release MIT**.

## Session 2026-07-11 (suite 2) — Tranche 2 : les 2 gardes structurantes (P1 vidéo + P4 map-dw) mergées

Même dispositif que la Tranche 1 (workflow 2 implémenteurs worktrees + review adversariale par branche →
2 UNSAFE avec findings réels → agents correctifs → merge). Les reviews de cette tranche ont **exécuté les
gardes elles-mêmes contre des rendus réels** (pas lu le diff seulement) — les 2 findings majeurs viennent
de là.

- **P1 — snap vidéo + watchdog (`feat/video-snap-guard`)** — la promesse vitrine Splash (« motion graphics
  code-rendered ») passait de zéro garde à une vérification mécanique fail-hard du **mp4 réel** dans les
  2 producteurs natifs : sanité conteneur (ffmpeg bundlé Remotion, dims==canal, durée==comp ±1 frame) ·
  frames 2/50/98 % (reveal anime ≥0.5 mean-diff · progression mid ≥0.15 · jamais blank) · **frame du still
  ≈ mp4 à la même frame** (transfère l'approbation Gate 3 à l'artefact livré) · **vrai still FINAL**
  (`remotion still --frame=-1`, capacité neuve — l'ancienne « last-frame.png » des exports était un
  artefact ad-hoc circulaire tiré du mp4 ; le snap diffe maintenant la fin réelle → ferme la classe
  « end-labels n'apparaissent jamais ») · **watchdog** qui borne le rendu (SPLASH_VIDEO_TIMEOUT_MS,
  kill du process-group, SIGINT/SIGTERM forwardés) — le hang seismes devient un échec propre (root-cause
  du hang = ticket séparé, inchangé). **Le critical attrapé par la review** : le premier jet réutilisait le
  seuil 0.5 (calibré dense-BarReveal) pour les jambes mid → **bloquait des vidéos line saines au produce**
  (LinePortrait 0.383 mesuré, LineSquare 0.485 — les 2 canaux sociaux) ; fix = seuil séparé
  `PROGRESSION_MIN_MEAN_DIFF` 0.15 calibré des deux côtés (bruit frozen ≤0.04 ; mid sain le plus faible
  0.383), calibration gravée dans le commentaire du knob, RED→GREEN sur les 3 comps réels. chart-native
  988/988, map-native 622/622. Limites documentées : still final map-native déféré (chemin still =
  seismes-prone) ; troncature map story après frame 140 non-détectée sans EXPECTED_FRAMES.
- **P4 — plancher map-dw (`feat/map-dw-floor`)** — le producteur le plus faible : format pinné threadé
  (static→PNG seul, interactive→embed seul, video/scrolly→reject **avant tout appel API** — le seam
  anti-chart-orphelin de dw-chart mirroré + testé token-free) · taille d'export dérivée du canal
  (`mapExportSize`, moitié du mediaSize car DW rasterise à 2×) · **IHDR readback fail-hard** du PNG livré
  (±2px, pattern chart-native + signature PNG 8-octets ajoutée aux 3 twins). **L'important attrapé par la
  review** : sur le chemin routé, la spec émise par suggest-chart n'a **pas de champ channel** →
  produceMap validait contre le défaut article-web et passait (RED live : social-feed livré 1200px
  article-web) ; fix = `withProposalChannel` au dispatch (adapters) — le canal canonique de la PROPOSITION
  est injecté dans la spec des 2 producteurs cloud (dw-chart avait le même gap de classe), précédence
  proposal-first documentée (miroir `resolveGuardChannel`), template MapSpec suggest-chart complété.
  map-dw 120/120 (API réelle), splash 262/262. **Follow-ups loggés** : dw-chart static ship du 2×-mediaSize
  sans assertion (incohérence de densité — décision à prendre) · judge.md:161-163 périmé (dw-chart
  « owned fallback » + map-dw catalogué symbol).

## Session 2026-07-11 (suite) — Tranche 1 post-audit : 4 fixes qualité mergés (workflow parallèle + review adversariale)

Suite directe de l'audit (`docs/splash/audit-2026-07-11.md`, 71/100 B-) et du renommage public **Splash**
(`splash.buriedsignals.com` — vidéo/scrolly = promesses de vitrine). Rémy a donné mandat qualité large.
Exécution : workflow 4 implémenteurs parallèles en worktrees isolés + 1 reviewer adversarial par branche →
2 branches UNSAFE (findings réels attrapés) → agents correctifs → merges. Un agent (signoff) mort mi-course
(API) — travail repris et complété par un agent successeur. Gate final vert.

- **channel fail-closed de bout en bout** (P2 audit, était fail-OPEN) : `normalizeChannel` throw sur un
  canal inconnu non-vide (liste les canaux valides) ; absent/vide garde le défaut `article-web` documenté.
  **La review adversariale a attrapé une VRAIE régression dans le premier jet** : le gate acceptait les
  alias (« feed »→social-feed) mais le dispatch threadait le canal BRUT vers `SPLASH_CHANNEL`, que le
  parsing exact-match de chart-native re-défaultait silencieusement en article-web → **ship paysage
  1200×675 pour un carré résolu au gate, reproduit mécaniquement** (sur main ce chemin fail-hardait). Fix :
  normalisation UNIQUE au gate + dispatch reçoit `{...p, channel}` canonique + parsing `SPLASH_CHANNEL`
  fail-closed dans les producteurs (chart-native produce+vite, map-native — qui crashait aussi sur env
  VIDE, bug bonus corrigé) + dw-chart résout la taille d'export AVANT tout appel API (plus de chart DW
  orphelin publié sur canal invalide). RED proofs mécaniques, suites vertes (splash 254, chart-native 920,
  dw-chart 169 API réelle, map-native), tsc ×3.
- **dw-chart « Source : » localisé** (gap i18n backlog, le défaut FR le plus visible à haute fréquence) :
  miroir octet-pour-octet du pattern map-dw (`annotate.notes`, champs natifs blanked hors-EN, comment
  cross-ref). Review SAFE — le reviewer a re-runné l'e2e API réelle lui-même et inspecté les rendus FR/EN
  (« Source : Insee », zéro doublon, EN inchangé). Trade-offs disclosed : URL non-cliquable hors-EN (même
  choix que map-dw) ; quirk espace ASCII vs fine insécable hérité volontairement (fix = ticket 2-skills).
- **altInsight enforced + émis partout (WCAG 1.1.1)** (audit R3 : « opt-in de fait OFF ») : threadé
  spec→config au mapper central (jamais fabriqué depuis le titre), gate produce **fail-hard** (exit 1 si
  absent — parité avec dw-chart/map-dw), émis via `AltInsightContext` (mount partagé → ChartFrame, nœud
  visually-hidden clip-pattern, jamais display:none). **La review a attrapé le trou du bundle React
  exporté** (form 1 « code source » : mount.tsx supprimé du bundle → aucun provider → l'interactif rebuilddé
  re-perdait l'alt) → `main.tsx` généré wrappe le render dans le Provider (lu défensivement), **prouvé sur
  bundle réel** : vite build vert + dist inspecté headless (1 nœud caché, clip rect, 1×1px). +5 samples
  backfill avec insights data-accurate, doc suggest-chart mise à jour. chart-native 930/0.
- **Discipline de clôture de session** (bruit « À bientôt ! » ×4, vu 2× en QA) : SKILL.md §6 EXPORT + liste
  Never — après handover + signal de complétion du journaliste (merci/au revoir PUR, sans requête), AU PLUS
  UN message de clôture puis session TERMINÉE. Côté harness (`23c7543`) : détecteur pure-close conservateur
  (`close-detection.ts`, whole-match normalisé, marqueurs de requête disqualifiants, ≤80 car.) câblé dans
  le driver avec gate situationnel (deliverable enregistré OU tour splash lui-même une clôture, jamais en
  réponse à une question de gate) → coupe en `closed-early` + `personaSignoffClose:true` dans meta.json
  (pas de nouveau exitReason, métriques QA non-skewées). 214/0 harness.
- **Renommage public Splash gravé** (CLAUDE.md « Quoi/pourquoi ») + fixtures Wave 7 committées au harness.

## Session 2026-07-11 — Wave 7 « tour d'horizon » (7 cas) : 2 fixes produit, 1 faux positif démasqué, redesign validé

Sweep post-redesign sur 7 nouveaux sujets couvrant la matrice de formats (heatmap, slope, streamgraph,
dumbbell, dw-interactive, mapdw, line-video). **Flow solide** : 5/7 livrés en single-format propre
(static→media seul, interactif→html+still, vidéo→mp4+stills, dw-interactif→`EMBED_URL.txt`) ; les 2
closed-early : `gdp-growth-dw-interactive` = cutoff **harness a/b/c-capture** connu (l'`EMBED_URL.txt` a bien
été écrit — livraison réelle, juste non-enregistrée par le harness) ; `er-wait-heatmap` = **gap
heatmap-non-atteignable** reconfirmé (demande explicite de heatmap interactif → dégradé en `dw-chart
grouped-column`, car le composant heatmap chart-native n'est pas câblé dans les MAPPERS — le juge a
correctement noté le grouped-column comme vecteur plus faible). Aucun des deux = régression produit. **2 fixes produit** (branche
`fix/wave7-stacked-label-and-format-pin-doc`, chart-native 911/911, gate 17/18 — le 18e = flake réseau
map-native MapLibre, cf. ci-dessous) :

- **chart-native stacked-area : label de bande de droite tronqué.** La gouttière droite était un `right:
  116` en dur — OK pour l'échantillon, mais un nom+valeur long (« Renouvelables 280 », 17 car. ≈ 143px
  gras) débordait et rendait « Renouvelables 28 » (render-confirmé sur le mix électrique allemand). Fix :
  gouttière dimensionnée sur le label le PLUS LARGE via un helper partagé `endLabelGutterPx()`
  (`core/text.ts`), plancher à 116 pour ne pas changer les charts à labels courts. Couvre le static ET
  l'interactif (ce dernier réutilise `StackedAreaChart`). Render-vérifié : « Renouvelables 280 » complet.
- **splash SKILL.md : contradiction interne PROPOSITION vs single-format.** Le redesign avait retiré le
  fallback no-JS `static.html` auto et mis à jour §6 + le garde-fou export, mais la section PROPOSITION
  (choix de format article/web) promettait encore le fallback « ALWAYS produced » — contradiction qui a
  causé un miss Wave 7 : un dumbbell dont le journaliste voulait EXPLICITEMENT du static a été pinné
  interactif, parce que le texte périmé disait « défaut interactif, ne jamais présenter interactif-seul »
  (sûr seulement quand un fallback static était garanti). Corrigé : le format pinné est le SEUL artefact,
  un signal de format explicite du journaliste (« image statique », « pour le print ») GAGNE sur
  `interactiveDefault`, et le format pinné est annoncé pour veto — plus de fallback fantôme.

**1 faux positif démasqué (corollaire « le juge peut mentir »)** : `unemployment-mapdw` — le juge a flaggé
`numberFormat: "0.0%"` sur des valeurs déjà en points de pourcentage (2,9…11,3) comme rendant « 290 % »
sous d3-format. **Faux** : Datawrapper APPEND le « % » sans multiplier (documenté `map-spec.ts:235`,
vérifié par export rendu) — le PNG livré affiche « 2,7 % » / « 11,3 % » correctement, avec groupage locale
FR et « Source : » i18n OK. Aucun fix.

**1 fix antérieur validé au rendu** : `temp-anomaly-line-video` — le point-label de fin du line chart vidéo
est EXACTEMENT au bout de la ligne (2023, +1,5 °C), sans décalage en avant. Le fix end-label mergé tient.

**Notes (non-fixes)** : `energy-mix` palette « pas subject-fit » = soft (renouvelables=vert déjà
subject-fit ; palette sémantique-carburant = décision design vs invariant CVD-safe global → backlog) ;
type stacked-area + format interactif = CORRECTS (persona demandait « stacked-area (ou streamgraph)…
interactif »). Le miss format (life-exp) reste attrapé par le filet QA (le finding l'a surfacé) —
discipline d'annonce-de-format doc-enforced (classe titre/takeaway, pas de levier mécanique propre).

## Session 2026-07-10 (nuit) — REDESIGN single-format produce→export (7 tâches) + 2 décisions renversées

Constat post-Wave 5 (cf. sessions ci-dessous) : le pipeline `produce → export` sur-produisait sur **deux
axes**, et la livraison était un tas plutôt que « l'export adapté ». Preuves relevées : `renouvelables`
(format vidéo) avait aussi buildé `interactive.html` + `interactive.png` + `static.png` en byproduct ;
`seismes` (format vidéo) n'avait **jamais** produit son `.mp4` mais avait quand même buildé `static.png` +
`interactive.html` + 4 `responsive-*.png` avant d'atteindre le turn-cap ; `langages` avait livré le bundle
React runnable **146-fichiers entier** sans attendre de choix ; `budget` avait livré `static.html` +
`EMBED.md` d'un chart Datawrapper sans choix non plus. Cause racine : rien ne *pinnait* l'unique
format/forme défini pour l'élément — le pipeline produisait/matérialisait *tout ce qui est possible* au
lieu de *ce qui est défini*. Spec `docs/superpowers/specs/2026-07-10-single-format-produce-export-design.md`,
plan `docs/superpowers/plans/2026-07-10-single-format-produce-export.md`, branche
`feat/single-format-produce-export`, gate **16/16** à la fin (7 tâches, review clean par tâche).

**Modèle cible : un élément = un format visuel, produit et livré seul.**

**Tâches livrées :**
1. **Pin du format** — `spec.format` (un `VisualFormat` unique) porté par la spec acceptée à la
   PROPOSITION (Gate 2 existant, vetoable — pas de nouveau gate) ; `assertFormatAllowed(channel, format)`
   ajouté à `skills/splash/src/channel.ts` (throw si le format n'est pas dans `allowedFormats(channel)`).
2. **chart-native `produce.mjs` single-format** — le mode `formats="all"` par défaut disparaît ; le script
   ne build QUE le format demandé (`produce.mjs <type> <config> <outDir> <format>`), avec un still de
   revue éphémère pour interactif/scrolly (non livré).
3. **map-native + dw-chart single-format** — même dispatch strict ; dw-chart `interactive` produit
   l'embed hébergé (`publicUrl`) comme artefact, pas de build local additionnel.
4. **`produce-all.mjs` thread le format unique** — lit `spec.format`, `assertFormatAllowed`, invoque
   chaque producteur avec ce seul format au lieu de `"all"`.
5. **`assertDelivered` par forme** — n'exige plus `static.html` pour un interactif ; nouvelle règle
   `(format, form)` : `static`/`video` → un média seul ; `interactive`/`scrolly` → la forme choisie
   (`.html`, dossier bundle, ou URL hébergée enregistrée).
6. **`export-code.mjs` refonte + paresse** — `static` livre le média directement (pas de dossier, pas de
   `.html`) ; `video` livre le `.mp4` directement ; `interactive`/`scrolly` proposent a/b/c, **attendent**
   la réponse, puis matérialisent **uniquement** la forme choisie (bundle React construit à la demande via
   `export-source.mjs`, déploiement fly.io à la demande via `deploy-embed.mjs`, ou simple copie du `.html`).
   Plus de bundle ni de `static.html` ni d'`EMBED.md`-fourre-tout pré-construits d'office.
7. **Docs** (cette entrée) — `CLAUDE.md` + ce changelog mis à jour avec les 2 renversements. `judge.md`
   (harness, repo séparé `../splash-harness`) doit être retourné au modèle single-format en cohérence
   (un format produit seul est attendu ; « plusieurs formats produits » ou « toutes les formes livrées
   d'office » devient un **défaut** à flagger, plus de `static.html` requis) — appliqué au merge pour
   que la rubrique harness atterrisse avec le comportement `main`, pas avant.

**★ Deux décisions verrouillées renversées (log, cf. `CLAUDE.md` § Décisions verrouillées) :**
- **Le fallback no-JS `static.html` (déc. 2026-06-23, mitigation a11y+souveraineté « Datawrapper reste la
  base ») n'est plus auto-produit.** L'accessibilité/le fichier possédé no-JS = **choisir le format
  `static`** — un interactif est juste l'interactif, plus de repli embarqué automatique.
- **La déc. 2026-07-10 « EXPORT : le journaliste CHOISIT la forme » (produire tous les artefacts d'office
  PUIS proposer a/b/c) devient PARESSEUSE.** Seule la forme choisie est construite/livrée. Le local-first
  reste préservé pour static/video/html autonome (un fichier possédé existe toujours) ; l'embed reste un
  choix explicite (hébergé, sans fichier possédé).

**Suivi (backlog, hors scope de ce plan à 7 tâches) :** **map-dw** (producteur carte Datawrapper, distinct
de map-native/dw-chart) sur-produit encore PNG+embed quel que soit le format — traitement single-format
analogue à dw-chart à donner · le snap WCAG statique (`snap-contrast.mjs`) ne tourne plus pour le format
`interactive` (le garde-fou config-level `produce-conformance` tourne toujours) — à trancher si un snap de
contraste rendu dédié à l'interactif est nécessaire · le format vidéo de map-native mappe toujours sur le
style « story » — « reveal » a perdu son accès CLI dans ce redesign, à faire un knob de config si voulu ·
items déjà hors-scope non traités par ce redesign : **hang du rendu vidéo symbole animé** (`seismes`,
Remotion+MapLibre par frame — le redesign réduit le déclencheur en coupant le sur-produit mais ne corrige
pas le hang lui-même, follow-up dédié) · **harness qui coupe avant la réponse a/b/c** (le driver marque
« delivered » à la proposition, le choix de forme n'est jamais capturé en test — nécessaire pour VOIR la
forme livrée en QA, mais séparé du produit).
## Session 2026-07-10 (suite) — audit installeur : 15 défauts confirmés → 15 fixes système + 11 tests

Branche `fix/installer-audit-15` (non mergée à l'écriture). Rémy : « teste le système d'installation ».
Méthode = **audit adverse fan-out** (workflow : 6 finders/composant × étage de vérification adverse ;
23 findings bruts → 21 confirmés/plausibles, 1 réfuté) **puis drive e2e du vrai configurateur** (principe
« vérifier le LIVRÉ, pas le proof » : ouvrir/piloter les vrais endpoints + `source` bash réel, pas lire le
code). Le système = page publique (`docs/installer/`) → bootstrap (`install/bootstrap.{sh,ps1}`) →
configurateur Bun local (`install/configurator.{ts,-core.ts}`). Gate `bun run check` **16/16** après fixes.

**🔴 Bloquants / hauts (5) :**
- **Clés requises vides acceptées** → install « réussie » mais `.env` à clés vides (les gates client
  `!==false` et serveur `some(===false)` laissent passer `null`=blank). Fix = **warn/confirm doux** :
  marqueurs `(required)`, `confirm()` avant Save, trim client. **Pas de hard-block** (chart-native = 0 clé
  légitime). `configurator-core.ts`.
- **Windows : PATH claude non préfixé en session** → `claude.ai/install.ps1` ne touche que le PATH
  persistant, le re-test `Get-Command claude` throw à tort « could not be installed » → abort avant le
  launcher. Fix = `$env:PATH = "$HOME\.local\bin;$env:PATH"` après install (miroir de `bootstrap.sh:45`).
  Vérifié *par mécanisme* (install.ps1 inspecté), non exécuté sur Windows.
- **`.env` non-quoté** → le launcher mac `. ./.env` word-splittait les tokens fly `FlyV1 fm2_…` (espace
  littéral) → `command not found` → claude ne démarrait jamais. Fix = `serializeEnv` **double-quote** +
  trim + strip `"`/newline ; launcher Windows `set "%%a=%%~b"` (retire les quotes). **Asymétrie .sh/.cmd
  gravée** : le format `.env` partagé doit être sûr pour `source` (bash) ET `for /f` (cmd). Prouvé e2e :
  vrai serveur → `.env` → `. ./.env` → token intact, chaîne n'abort plus.
- **Option B mac morte** (download `.command` sans bit `+x`, self-heal `chmod +x "$0"` inatteignable).
  Fix = workaround on-page `chmod +x`. `index.html`.
- **Release-gate aveugle** : `preflight-release.mjs` ne scannait que `commands.js` → un vert pouvait
  shipper des bootstraps pointant le repo placeholder (404 constaté aujourd'hui). Fix = scan des **2
  bootstraps** + gate du **REF non-pinné** (`main`) dans les 3 fichiers.

**🟠 Moyens (4) :** `bun install` garde stderr + guard (fini le dead-stop silencieux sous `set -e`) ·
winget gardé (`Get-Command winget` → fallback amical vivant sur LTSC/entreprise) · `writeFileSync`/
`req.json` gardés → **400/500 propres + exit(1) au lieu de hang infini** (`~/Splash` read-only/disque
plein) · `verify*` renvoie **`null` (injoignable) ≠ `false` (invalide)** → clé valide derrière proxy/TLS-MITM
plus bloquée.

**🟡 Bas (6) :** configurateur derrière `[ ! -f .env ]` + `SPLASH_RECONFIGURE` (re-run n'exige plus la
re-saisie) · hint « Ctrl-C » + idle-timeout 30 min · trim des clés (espace collé → MapTiler 403) · toggle
OS `role=tablist`→`aria-pressed` (a11y : `aria-selected` inerte sur `<button>`) · Copy avec feedback +
fallback `execCommand` + `.catch` · download `revokeObjectURL` différé + anchor in-DOM (Safari).

**Tests (11 nouveaux) :** `configurator-core.test.ts` (format quoté, **preuve behaviorale bash-source**,
`verify*`→null réseau, marqueurs required) · `configurator.test.ts` (nouveau — serveur : malformé→400,
blank→`.env` quoté, 404) · `bootstrap-{sh,ps1}.test.ts` (stderr gardé, guard re-run, PATH claude, winget,
`%%~b`) · `page.test.ts` (chmod workaround, copy fallback, revoke différé, aria-pressed) ·
`preflight-release.test.ts` (nouveau — scan bootstraps + REF).

**★ Méta-leçons gravées :** (1) **le contrat `.env` du launcher est cross-platform** — un format sûr d'un
seul côté (`for /f` Windows tolérait l'espace, `source` bash non) est un demi-fix ; graver les deux. (2)
**un release-gate doit gater CHAQUE fichier qui hardcode le placeholder**, pas un seul — sinon un vert
faux-négatif shippe un install 404. (3) **le vérificateur d'un finding peut mourir** (1 agent en erreur
réseau a filtré le finding blocker Windows) → re-vérifier soi-même les findings orphelins critiques.

## Session 2026-07-10 — 3 cycles QA (waves 1-3, 16 cas) → 12 fixes, tous mergés vert

Boucle « fond de roulement » (`../splash-harness/WORKFLOW.md`) : lancer des tests e2e en parallèle
(persona journaliste pilote le vrai splash headless en sandbox worktree de `main`) → collecter les
findings → **inspecter le LIVRÉ réel + `deep-verify.mjs`** → fixes en worktrees isolés parallèles →
review-lot adversarial (1 agent/branche) → merge → gate. `main` : `c7d67bd` → **`661a928`**, gate
**16/16** à chaque merge, 0 mention vendor, 0 `any`.

**Waves :** W1 (matrice complète + 3 pièges nommés par Rémy) · W2 (waterfall/beeswarm/map-scrolly/
symbol-vidéo/choroplèthe) · W3 (validation e2e des fixes mergés). 1 timeout (`inflation`) = **transient,
non reproduit** (le repro a livré ; la vraie leçon = le *thrash-on-hang* d'splash, pas le chemin produce).

**Fixes produit (9) :**
- **export dw-chart interactif** (le plus impactant) : `export-code.mjs` crashait (`embedSnippet(undefined)`)
  → `-export` VIDE pour un interactif Datawrapper (embed hébergé = pas de html local ; PNG nommé
  `<id>.png` ≠ `static.png`). Détecte la forme hébergée via le `report` (`publicUrl` + `outputs`
  déclarés, pas un match de nom) → `-export` complet (static.html a11y + EMBED.md → URL hébergée).
  Chemin courant (article-web + chart standard) qui dégradait **silencieusement**. Vérifié e2e API DW réelle.
- **chart-native** : tous les highlights scatter labellisés (plus le seul max-y) · value-labels
  survivent au reveal vidéo sur les petites barres (anti-pattern d'opacité tardive → knob partagé
  `core/math.ts:labelReveal`, propagé à **toute la famille barres** : Bar/Diverging/Waterfall/Lollipop/
  Bullet/Dumbbell) · titre d'axe X ne surimprime plus la source (`sourceFooterReserve`, réserve de
  bas de cadre partagée symétrique du header → 40 charts en héritent).
- **dw-chart** : annotations scatter résolvent la colonne **Y** (lisaient X/PIB → hors-canvas droppées) +
  domaine y de la seule colonne Y + tripwire (throw si y d'annotation hors-domaine — un rendu ne peut
  pas attraper une annotation *droppée*, ce check data si).
- **CADRAGE Gate 1b** : takeaway/insight = gate explicite **non-skippable**, confirm-back les 2 branches.
- **légendes carto** : nombres groupés locale (`17600`→`17 600 €`) — map-dw (metadata `labelFormat` +
  `column-format` + `lang`→locale) ET map-native symbol (seul sibling encore en `${value}` brut).
- **render-review** : toute affirmation d'interaction (tooltip in-viewport, hover, popup) doit **citer
  le run d'un snap-script d'interaction** (`snap-tooltip-viewport.mjs` etc., qui tournent déjà fail-hard
  dans `produce-all`), jamais déduite d'un PNG statique ; chaque critère taggé `[static]` vs `[interaction-tested]`.

**Fixes harness/rubrique (3) :** le driver juge le **vrai `-export`** (`canonicalizeDeliveryOutputs`,
plus le build-subdir) — a tué une **cascade de faux « export skipped / missing a11y »** · `judge.md`
aligné : source name-only prose = légitime · **scrolly exempt de static.html** (faux [major] récurrent) ·
sous-gates 1b/2c/3a réels (le modèle (1,2,2b,3,4) était périmé).

**★ Méta-leçon gravée : le JUGE peut mentir aussi.** Deux cascades de faux positifs (export-skipped,
scrolly-sans-static.html) démasquées en inspectant le filesystem/`-export` réel — pas en croyant le
finding. Corollaire de « vérifier le livré, pas le proof » : **vérifier le livré ET challenger le
finding** (les reviewers de merge l'ont aussi appliqué — ex. le premier a attrapé une propagation
incomplète de la famille barres, le finding « Gate 2c inventé » était lui-même stale).

**Backlog légué (mineur) :** dw-chart *statique* met l'embed hébergé en forme 1 (la forme possédée
devrait mener — souveraineté) · 6 charts self-clearing double-comptent `sourceFooterReserve`
(cosmétique) · légende map-dw *symbol* non vérifiée pour le groupement.

### Suite 2026-07-10 — EXPORT : le journaliste choisit la forme (feature, met à jour la déc. 2026-06-23)

Parti d'un retour Rémy sur 2 runs (« ça sort plus que le .html souhaité » + « splash ne propose jamais code source / html / embed »). Diagnostic groundé : (a) le `-export` = les formes possédées + docs, PNG de build non livrés (par design) ; (b) **vrai bug** — l'offre des formes/embed était incohérente (~la moitié des livraisons interactives disaient juste « Livré. » sans rien proposer). Deux corrections de terminologie de Rémy en cours de route (vérifiées au fichier) : « HTML statique » = le fichier **autonome** `interactive.html` (JS inline dedans), PAS le no-JS ; « code source » = **le vrai code React**, pas les fichiers compilés.

Décision produit (Rémy, via petites questions) : le journaliste **choisit** une des 3 formes ; livraison façonnée ; **forme 1 = bundle React runnable**.

Livré (branche `fix/export-form-choice`, mergé, gate 16/16, adversarial-review SAFE avec **build indépendamment reproduit de zéro**) :
- **Flux** : `export-code.mjs` produit les artefacts d'office (local-first préservé) PUIS **émet** une proposition prête-à-relayer (`EXPORT_FORMS_JSON` + bloc `a/b/c`) → l'orchestrateur relaie un message fixe au lieu de se fier à sa mémoire (fin du « Livré. » nu). SKILL.md §6 : gate explicite non-skippable « propose 3 formes → le journaliste choisit → livre la forme choisie ».
- **Forme 1 = bundle React runnable** : nouveau générateur `skills/chart-native/scripts/export-source.mjs` assemble un projet Vite auto-contenu (`<id>-source/` : copie `chart-native/src` — clôture 0 import cross-skill — + `config.json` + entry `main.tsx` + `package.json` deps interactif seul (pas remotion) + vite/tsconfig + README). **Acceptation build-de-zéro prouvée** (2×, moi + le reviewer) : `bun install` (49 pkgs) → `bun run build` (369 modules → `dist` 480 KB auto-contenu) → rend 5 barres = les 5 lignes de données, 0 erreur. chart-native seulement ; map-native/scrolly/DW = dossier fichiers (leur src pas auto-contenu → follow-up).
- **Forme 2** = `interactive.html` autonome ; **Forme 3** = `deploy-embed` → fly.io (ou `publicUrl` DW live).
- `judge.md` **retourné** : proposer les formes = flow voulu ; « Livré. » nu = défaut (annule la règle « demander = ancien flow »).

Reste (backlog) : valider le flux conversationnel a/b/c par un run harness ; bundle runnable pour map-native/scrolly.

### Wave 4 2026-07-10 — 6 sujets neufs (climat/sport/café/cantons/connectivité/startups) → 2 fixes

Nouveaux cas (thèmes/lieux/données neufs + pièges) : `ocean-heat-video`, `record-marathon-slope`,
`cafe-production-symbol`, `deficit-cantons-diverging`, `internet-penetration-choropleth`,
`startup-funding-datapoor`. **Fixes des cycles précédents validés au rendu** (0 régression) : D (barre
Fribourg +8 gardée), I (légende `4 000 000 t`), C (3 coureurs marathon labellisés), flux export a/b/c
(proposé 4/5). Deux fixes mécaniques mergés (adversarial-review — les agents ont d'abord renvoyé des
stubs « test », **re-vérifié à la main** : seuil, tests, wiring) :
- **map-dw : join-key silencieux** — un `mapKeyAttr` erroné (`ISO_A3` vs vraie clé `DW_STATE_CODE` de
  `world-2019`, 0/10 lignes matchées) passait `validateMapSpec` sans warning → carte **grise sans
  données** publiée, marquée `produced`. Fix 2 leviers : registre `basemap-keys.ts` (clés réelles par
  basemap → `validateMapSpec` rejette une clé invalide) + garde produce `join-match.ts` (taux de match
  réel des LIGNES de données ; throw si < 50% → `status:failed`). **Subset-safe vérifié** (dénominateur =
  lignes de données, pas régions du basemap → une carte « 8 cantons » = 100% match, passe ; seule une
  jointure cassée = 0% échoue). 95 tests, API réelle correct-vs-cassé.
- **map-native : labels symboles coupés au bord** — « Indonésie » → « Indonés » au bord droit. Root :
  `text-variable-anchor` de MapLibre ne réancre que sur collision label-label, aveugle au bord canvas.
  Fix : primitive partagée `placeSymbolLabel` (miroir de `tooltip-clamp`) → flip right→left / clamp
  intra-viewport, ancre data-driven `text-anchor`, garde `changed` anti-boucle-idle. 553 tests,
  render-vérifié (avant/après).

Findings au backlog (bigger/flow/harness) : carte interactive choroplèthe dégrade en statique sur
données quasi-globales (clamp a11y bounded-nav) · titre qui revient au cadrage de l'article vs takeaway
confirmé (règle Gate 1b non obéie) · vidéo produite mais run closed-early sans registration de livraison ·
`suggest-chart` émet la clé `world`+`ISO_A3` cassée (attrapée au produce, à corriger à la source) ·
renderers symboles vidéo/scrolly encore en `text-variable-anchor` (même classe edge-clip).

### Passe backlog 2026-07-10 — 4 issues confirmées vérifiées puis corrigées

Sur demande Rémy (« remonte les bugs puis corrige-les ») : vérif de chaque item backlog **dans le code**
(réel vs bruit), puis fix des 4 confirmés mécaniques (parallèle, review **manuelle** — les agents de
review avaient renvoyé du stub au batch précédent). Mergés, gate 16/16 :
- **#3 `suggest-chart` clé de jointure world cassée** — émettait `world`+`ISO_A3` (0 région ; DW API live :
  `world-2019` n'a pas d'`ISO_A3`, la clé ISO-A3 est `DW_STATE_CODE`). Corrigé à la source (SKILL.md +
  fixtures eval → `world-2019`+`DW_STATE_CODE`, warn explicite). **map-native laissé intact** (il utilise
  son propre `world.geojson`, ISO-A3 en `regionKey`, correct). e2e API réelle 12/12 join, rendu coloré.
- **#4 labels symboles coupés au bord en vidéo/scrolly** — `SymbolReveal/Story/Scrolly` encore en
  `text-variable-anchor` (aveugle au bord). Primitive partagée `assignSymbolLabelAnchors` (SymbolMap la
  single-source aussi) ; Reveal = compute-once au load idle, Story/Scrolly = recompute par frame. Test de
  parité (aucun renderer symbole n'utilise plus `text-variable-anchor`). Locator déféré (modèle différent).
- **#5 map-dw symbole nombres bruts** — tooltip en `{{ col }}` brut (DW substitue verbatim → « 2100 »).
  Corrigé via l'expression DW `{{ FORMAT(col, "0,0.[00]") }}` + `legends.color.labelFormat`, locale threadée.
  Rendu API réelle : légende `4 000 000`, tooltip `Paris / 4 000 000 t`. (Chemin bas-trafic : `produceMap`
  route les symboles vers map-native — corrigé quand même.)
- **#7 réserve source double-comptée** — **23** charts (pas ~10) baquaient leur clearance dans `basePad`
  EN PLUS de la réserve partagée `sourceFooterReserve`. Chaque `basePad.bottom` = furniture seule ;
  Waterfall reste le seul opt-out. Audit **ALL GREEN 539 renders** (re-vérifié moi-même — garde anti-collision).

Différés avec raison (backlog) : dégradation interactif→statique quasi-global (arbitrage a11y) · titre vs
takeaway (pas de levier mécanique propre) · Locator edge-clamp · vidéo closed-early. #6 (embed en forme 1)
résolu par le flux export a/b/c.

## État 2026-06-23 (fin de session)
- **MERGÉ dans `main`** : Tranche 1 (boucle dw-chart) + Tranche 1.1 (22 types + garde-fous) + **② suggester runtime + harness d'éval**.
- ② : procédure runtime dans `suggest-chart/SKILL.md` ; éval `skills/suggest-chart/eval/` (scoreSpec pur + family-types + 8 cas + judge.md). Baseline auto-noté : 8/8 gate, 0.93/0.96 éditorial. **Lien ②→dw-chart prouvé live** (`eval/e2e-proof.md`, chart publié réel).
- **Caveat honnête** : baseline auto-noté (② = juge), à re-valider sur des cas non écrits-pour-réussir.
- **Prochains cuts** : ② `article → où/quel` (lecture d'article) ; puis le skill **map** (couche geo-prep commune + renderers static/interactif/vidéo) ; puis vidéo. Le seam `Spec→mapper→client→produce` est le template.

## Cadrage 2026-06-23 — ON CONÇOIT POUR TOUTE PETITE NEWSROOM (pas Annemasse)
**Décision Rémy, prioritaire :** Splash se construit pour **toutes les petites rédactions, génériquement**. Annemasse = le livrable-pilote de la bourse, PAS une contrainte de design ni une dépendance de validation. **Ne PAS attendre de retours de Heidi/Annemasse.** Les corpus d'éval (ex. gold-standard du cut lecture-d'article) sont **rédigés par nous, sur des articles-types génériques, ancrés dans les best-practices (la KB)** — assumé auto-référentiel, mitigé par le grounding best-practice ; le harness est un instrument d'amélioration *relative*, pas de vérité absolue.

## Cut ② lecture d'article — SPEC MERGÉ (design only)
`docs/superpowers/specs/2026-06-23-suggester-article-reading-design.md`. Approche : ② lit `article+données` → `ProposalSet` de propositions vetoables (`claim + data + intent`, sans family) → chaque proposition acceptée alimente le runtime `data+intention→ChartSpec` déjà construit. ② **lie data↔claim lui-même**. Éval = `scoreProposalSet` (dataValid via validateChartSpec + provenanceOk + count + recall/precision lenients) + LLM-juge (rightPlace/rightDose/dataFit). **PROCHAIN : plan + build de la 1re tranche.**

## État (cut lecture-d'article MERGÉ)
- **MERGÉ dans `main`** : ② article-reading 1re tranche. `skills/suggest-article/` : SKILL.md (`article+données → ProposalSet`, ② lie data↔claim, propositions claim+data+intent vetoables sans family) + éval `scoreProposalSet` (dataValid + provenanceOk + recall/precision lenients, **6 tests**) + 4 cas génériques + judge + runner + baseline (auto-noté, instrument relatif) + e2e-proof.
- **Suite totale `main` : 46 tests** (6 suggest-article + 8 suggest-chart eval + 32 dw-chart vraie API). Vérifiés à la main.
- **Lien article→chart re-prouvé indépendamment** (cas festival-recap, chart réel produit puis supprimé) — pas seulement le rapport de l'agent.
- **Caveat assumé** : baseline auto-référentiel (on écrit cas+gold, ② et juge = agents). Instrument d'amélioration relative. Prochain renfort = diversifier le corpus sur des cas non écrits-pour-réussir.
- **Prochains cuts** : ② → CADRAGE (questionnaire d'intention) ou directement le skill **map** (geo-prep commun + renderers) ; puis vidéo Remotion.

## Boucle d'amélioration ② — exemple loggé (2026-06-23)
- Faire tourner la **vraie chaîne de skills** (suggest-article → suggest-chart → dw-chart) sur `town-growth` a révélé un **bug réel** : ② sortait un small-multiples (multiple-lines + transpose) au lieu d'une tendance multi-séries.
- Root cause = trou KB : `chart-selection.md` + le guardrail transpose de `suggest-chart/SKILL.md` étaient ambigus sur « tendance multi-séries dans le temps ».
- **Fix** (mergé) : `d3-lines` multi-colonnes SANS transpose pour les tendances temporelles ; transpose réservé aux stacked/grouped catégoriels. Re-vérifié via les skills → chart de tendance correct.
- **Leçon clé** : le gate déterministe (`validateChartSpec`/`scoreSpec`) NE PEUT PAS attraper « spec valide mais sémantiquement faux pour la donnée ». Seul l'œil / le LLM-juge sur le rendu l'attrape. → toujours re-vérifier via les vrais skills + le rendu, pas à la main.

## Backlog — petits fixes connus
- **Annotation parfois coupée (rognée)** : sur certains charts, le `text-annotation` est tronqué hors-cadre (vu sur `town-growth` : « France peak » coupé en bas-droite). Cause probable : `align:"bl"` par défaut + position (`x`,`y`) près d'un bord, sans clamp dans la zone visible. Piste : dans `skills/dw-chart/src/spec-to-metadata.ts` (mapping `text-annotations`), choisir l'`align` selon la position (éviter de pousser le texte hors-cadre près des bords) et/ou ajouter un offset. Petit fix, non bloquant. À éprouver visuellement via les skills.
- **Collision label de série ↔ annotation** : sur un d3-lines, l'annotation de fin (« 31 days ») chevauche le label direct de la série (« wait_days »). Lié au fix annotation ci-dessus (placement/align). Trouvé via vérif-rendu sur `clinic-waits`.
- **Unité non explicitée** : données en milliers/millions affichées brutes (« 1.8 » pour 1.8M, « 26 » pour 26k). Piste : ② devrait mettre l'unité dans `intro` (« en millions ») ou un suffixe de format. Trouvé sur `school-budget`/`town-growth`.
- **Note qualité ②** : titres parfois avec coquille (« this years » sans apostrophe) — artefact de génération, à surveiller via le LLM-juge, pas un fix code.
- **Gate de confirmation prose = contrat social, pas mécanique** : le SKILL.md exige de montrer la table reconstruite + OK humain avant `suggest-chart`, mais rien ne l'impose dans le code. Un vrai déploiement doit l'imposer côté UI/orchestration. Trouvé via test-système end-to-end (article VE).
- **② ne produit qu'UN visuel, les propositions secondaires tombent silencieusement** : sur l'article VE, la 2ᵉ histoire (tendance 2020→2023) a été abandonnée. Le SKILL.md autorise jusqu'à 3 propositions ; surfacer/produire les autres si le journaliste les accepte. Design, pas quick fix.

## Cut map (Datawrapper) — MERGÉ (choropleth)
- **MERGÉ dans `main`** : `skills/map-dw/` — choropleth DW, **réutilise le client `dw-chart/datawrapper.ts`** (pas réécrit) via le seam `MapSpec → spec-to-map-metadata → produceMap`. 26 tests. e2e live conservé : https://datawrapper.dwcdn.net/vZRmO/1/
- **Binding** : `visualize.basemap` + `visualize["map-key-attr"]` (clé de jointure du basemap) + `axes.keys`(colonne région)/`axes.values`(valeur). 4497 basemaps via `GET /v3/basemaps` ; clés via `GET /v3/basemaps/{id}` → `meta.keys[].value`.
- **Couleur** : `visualize.colorscale = {mode, interpolation, colors:[{color,position}]}` — **JAMAIS de champ `stops` string** (ça rendait tout noir). Light→#0072B2.
- **Règle basemap-fit** (trouvée au rendu, comme transpose) : le basemap doit **épouser l'étendue des données** (UE→`europe-sovereign-states`, US→`us-states`…), pas `world-2019` pour une histoire régionale. `validateMapSpec` ne l'attrape pas — **seul le rendu**.
- **Différé** : symbol map + locator map (bindings différents). Le natif geo-prep (MapTiler/Cesium, Tom) = cut lourd séparé plus tard.
- **Suite totale `main` : 72 tests** (32 dw-chart + 8 suggest-chart + 6 suggest-article + 26 map-dw).

## Map DW — symbol + locator MERGÉS (famille DW complète)
- **MERGÉ dans `main`** : `map-dw` couvre maintenant **choropleth + symbol + locator** (MapSpec = union discriminée). 54 tests map-dw, **100 au total**.
- **Symbol map** (`d3-maps-symbols`) — par coordonnées, PAS region-join : `axes.lat`/`axes.lon` + **`axes.area` = colonne taille** (le champ qui manquait) + `axes.values` = couleur. (Mon spike échouait car j'utilisais le binding choropleth.)
- **Locator map** (`locator-map`) — marqueurs dans `visualize.markers` (`{type:"point", coordinates:[lng,lat], title, markerColor, icon}`), pas de data table ; le mapper calcule `view.center`+`view.zoom` (`fit:false`) sinon ça cadre le monde entier (bug attrapé au rendu seulement).
- **Footgun basemap** : `us-states` valide mais **500 à la publication** → préférer `us-states-continental`. Noté dans SKILL.md.
- **Vérifié via le vrai skill + rendu** sur des cas neufs (France symbol, Arve locator, US-tech symbol). e2e live : symbol https://datawrapper.dwcdn.net/39yaG/1/ · locator https://datawrapper.dwcdn.net/Jb5NP/1/
- **Toute la famille map DW (light) est faite.** Reste différé : le natif geo-prep (MapTiler/Cesium — scrolly/3D/explorable, le chemin de Tom).

## Map DW — tooltips symbol + locator MERGÉS (+ leçon vérif interactive)
- **MERGÉ** : symbol + locator ont maintenant un hover tooltip. Symbol = `visualize.tooltip {enabled, title:"{{col}}", body:"{{col}}", fields:{...}}` — **chaque `{{token}}` DOIT être déclaré dans `tooltip.fields` sinon vide** (≠ choropleth qui utilise `%REGION_NAME%`). Locator = `tooltip:{enabled:true}` par marqueur (le title s'affiche).
- **LEÇON (4e du genre) : un PNG statique ne peut pas montrer un hover.** On avait validé les maps au rendu statique → angle mort sur l'interactif. Trouvé par Rémy en ouvrant les charts live. → Pour tout output **interactif**, vérifier le **comportement live au navigateur (Playwright hover + screenshot)**, pas juste le rendu ou les métadonnées.
- Vérifié live : symbol https://datawrapper.dwcdn.net/Ud7sZ/1/ · locator https://datawrapper.dwcdn.net/YqI3y/1/ · captures hover dans `output-proof/` + Desktop.

## map-native — proportional symbol = 2e type MapTiler MERGÉ ★ 1er de la série
- **MERGÉ dans `main`** (`f36a607`, 2026-06-29) : `map-native` couvre maintenant **choropleth + proportional symbol**. 2e type sur la recette (cœur géométrique pur → 1 composant piloté par `progress` → static/interactif/vidéo → garde de conformité), il a forcé l'extraction du **cœur point-based** (lat/lon, sans region-join) : `src/symbol-geo.ts` (sizing **aire-proportionnel** `r∝√value`, tri décroissant, légende à cercles emboîtés) + `src/symbol-labels.ts` (labeling direct). Discipline subagent-driven (6 tâches + addendum), 80 tests, 3 formats vérifiés à l'œil.
- **LEÇON (re-gravée) : regarder CHAQUE format ré-rendu.** Un fix attribution a fait disparaître les cercles en vidéo (retrait du gate `mapReady` → l'effet per-frame ne se re-déclenche pas dans le rendu Remotion frame-fixe). Attrapé au still, pas aux tests. Le gate `mapReady` est REQUIS pour le reveal vidéo.
- **LEÇON (retour Rémy) : la donnée doit être lisible SANS survol.** 1ère version = ronds non étiquetés (valeurs seulement au hover) → illisible en static/vidéo. Fix système : **labeling direct nom+ville+valeur** (couche GL `symbol`, halo blanc, anti-collision `text-allow-overlap:false`), câblé dans les 3 formats + **règle de conformité `labeled`** (ne pourra plus régresser) + référence `knowledge/references/map/types/proportional-symbol.md` rule 6. Vérifié à l'œil : London 296 / Paris 181 / Madrid 124 / Berlin 88 / Rome 67 / Amsterdam 52.
- **Conformité = garde test-only** (comme `checkChoroplethConformance`) : aucun call-site au rendu ; à câbler dans produce un jour (dette partagée, hors scope).
- **Différé (polish symbol)** : placement value-inside-gros-cercle (texte blanc) + nom au-dessus (champ `placement` retiré car non câblé v1) · légende de taille en vidéo · anti-collision cartes denses (>~30 pts) · geocoding noms→coords · bivarié taille+couleur · câblage `suggest-visual` ("comptages à des lieux → symbol") en passe groupée après 2-3 types points.
- **Prochains types MapTiler** (recette identique) : flow/route (spike RiverReveal à finir), dot-density, locator, hex/grid, cartogram, contour.

## map-native — lisibilité & navigation (slice A+B) MERGÉ ★ « c'est une carte, pas un chart »
- **MERGÉ dans `main`** (`2a30d78`, 2026-06-29). Retour Rémy : « pas lisible sur la map + il manque le côté navigation ; c'est une map pas un chart ». Fix système :
  - **Labels À CÔTÉ du symbole** (plus dessus) : `text-variable-anchor:["left","right","top","bottom"]` + `text-radial-offset` par-feature (`labelOffset = labelRadialOffset(radius, textSize)`, helper pur testé) → le moteur pose le label hors du cercle, choisit le côté libre (anti-collision + flip bords). Halo blanc. Câblé `SymbolMap` (static/interactif) + `SymbolStory` (vidéo).
  - **Taille label scalée par ratio vidéo** : `labelTextSize = width<=1080 ? 18 : 13` → portrait/carré lisibles (le « illisible en portrait »).
  - **Navigation interactive** : `makeResetControl` extrait dans `src/controls.ts` (partagé choropleth+symbol, DRY) + `NavigationControl` ; pan/zoom/reset vérifiés live (Playwright : pan, scroll, reset retourne à l'étendue).
- **Principe gravé (mémoire `feedback_capability_not_default`)** : quand un feature a plusieurs traitements valides (modes caméra vidéo : tour / zoom-out / pan / 3D), NE PAS coder un défaut — construire la capacité paramétrée, l'IA choisit par l'article. Vaut pour tous les types de map.
- **RESTE — slice C (designé, pas construit)** : **système de modes caméra vidéo** (tour guidé ville par ville / zoom-out depuis le leader / pan cinématique / survol 3D différé), choisi par l'intention de l'article, sur l'infra `map-story.ts`+`story-timeline.ts` existante (déjà beat-driven frame-déterministe). Spec à écrire quand on l'attaque. Note : `text-allow-overlap:false` peut masquer des labels sous une caméra zoom-out → à gérer dans la slice C.

## ★ PROGRAMME PARITÉ maps↔charts — « le même dispositif que les charts, pour les maps sous tous les formats »
- **Origine** : retour Rémy — « le titre est sur des valeurs et doit pas sortir de l'écran vidéo » puis « récupère le process/la recette des charts pour faire pareil pour les maps et tous leurs formats, on assurera un bon résultat en prod ». Cartographie du gap chart-native↔map-native faite (synthèse : core pur OK, mais manquaient frame partagé, scaling format, conformance format-aware+cadrage, harnais vérif multi-largeur+a11y, KB). Découpé en **4 slices**, séquence 1→2→3→4.
- **Slice 1 — MapFrame MERGÉ** (`745f31c`, 2026-06-29) : porté le triptyque chart `tokens`→`resolveFrame`→`ChartFrame` aux maps : `src/theme/map-tokens.ts` (FRAME_TYPE/FONT/COLORS) + `src/core/map-format.ts` `resolveMapFrame(w,h)` (pur, 9 tests : `scale` par canvas + `pad` safe-area asymétrique) + `src/core/MapFrame.tsx` (shell partagé : titre bande-haute + **source TOUJOURS rendue, vidéo incluse** — absente avant). Câblé aux 4 composants (ChoroplethMap/SymbolMap/ChoroplethStory/SymbolStory), `frame.pad`→`fitBounds` → titre-non-sur-donnée + rien-hors-cadre par construction. Vérifié à l'œil sur **les 2 types × tous formats**. LEÇON re-confirmée : un wrap conditionnel `if(title&&source)` = anti-pattern qui démonte le canvas MapTiler (blanc) → wrap inconditionnel ; et un artefact PNG périmé m'a fait croire à une régression → toujours re-render avant de juger.
- **Slice 2 — Conformance parité MERGÉ** (`8953326`, 2026-06-30) : `checkGlobalMapConformance` (L0 partagé extrait des 2 checks par-type — titre <12/year-range/**ALL-CAPS nouveau**/description/source name+url/contraste WCAG) + `checkMapFraming(format,title,…)` **format-aware** (via `resolveMapFrame` : titre tient dans la largeur scalée, bandes titre/source réservées, **source présente** — attrape le cas vidéo-sans-source au niveau format) + hook optionnel `format?:{width,height}` sur les 2 checks (back-compat). Pur, 107 tests. Garde reste test-only (câblage produce = dette partagée différée).
- **Slice 3 — Harnais de vérif MERGÉ** (`6e39fe9`, 2026-06-30) : `scripts/snap-responsive.mjs` (build interactif singlefile via file://, 4 largeurs 360/768/1100/1600, asserte no-overflow + titre/source/légende in-viewport via `data-testid` map-title/map-source/map-legend, exit≠0 si échec) + `scripts/snap-a11y.mjs` (role=region+aria-label, lien source href, ≥2 boutons contrôles clavier, popup au hover — layer-dispatched comme snap-proof), câblés dans `produce.mjs` (échec → produce échoue). Fix au passage : **SymbolMap n'avait pas `role=region`** (révélé par le harnais), ajouté. Vérifié en exécutant sur symbol ET choropleth + 360 à l'œil. A11y = niveau-conteneur (canvas GL, focus par-mark N/A).
- **Différé slice-3 (→ 1er commit slice 4)** : porter le grid-scan fallback de `snap-proof.mjs` dans le path symbol de `snap-a11y.mjs` (résilience, l'assertion marche déjà sur les samples).
- **Slice 4 — KB parité MERGÉ** (`846ebaa`, 2026-06-30) : `knowledge/references/map/design-conformance.md` (checklist globale map, 8 règles sourcées + cross-ref code réel) + `knowledge/references/map/types/choropleth.md` (ref type, miroir de proportional-symbol.md, cross-ref `checkChoroplethConformance`). Cross-refs vérifiés réels, URLs réelles seulement.
- **★ PARITÉ maps↔charts COMPLÈTE** (4/4 slices, 2026-06-30) : MapFrame (frame partagé titre-safe + source + scaling format) · Conformance (L0 partagé + format-aware + cadrage/lisibilité) · Harnais vérif (snap-responsive + snap-a11y câblés dans produce) · KB (global + choropleth). Les maps ont maintenant le même dispositif qualité que les charts, sur tous les formats. **Reste différé (hors parité)** : refs formats map (`map/formats/`), grid-scan fallback symbol dans snap-a11y, câblage conformance dans produce (dette partagée avec les charts).
- **Dette pré-existante notée** (hors scope, à ticketer) : `bunx tsc --noEmit` échoue dans map-native faute de `@types/react-dom` (`tsconfig types:["react","react-dom"]`) — empêche un gate tsc sur les futures slices.

## Module unifié chart-native — MERGÉ (un composant → 3 formats) ★ jalon archi
- **MERGÉ** : `skills/chart-native/` — **UN composant React+D3, piloté par `frame`** → **static + interactif + vidéo**. La vision « un module web → tous les formats » est prouvée.
- **D3 = maths** (`chart-geometry.ts` pur, framework-free, porté du pilote chart-annotated, + `revealLine(layout, progress)` déterministe). **React = DOM** (car **Remotion = React only, PAS Svelte**). 3 dérivations : static (Vite build + Playwright snapshot), interactif (`vite-plugin-singlefile` → 1 HTML + tooltip), vidéo (Remotion composition `frame→Easing.inOut(cubic)→progress→le même composant`).
- **Discipline Tom appliquée** : animation = fonction PURE de `frame` (pas d'horloge/random), valider 1 still avant le mp4, `--gl=angle`. Test-contrat `reveal-contract` : static(p=1) ≡ frame finale, repro par frame, pas de NaN sur 180 frames.
- **Vérifié à l'œil sur les 3 sorties** (static PNG, hover interactif live, 4 frames vidéo extraites du mp4). Best-practices conformes (Okabe-Ito, titre-insight, label direct, nombres abrégés, source, alt).
- **DW reste le fallback no-code rapide** (statique + interactif léger). chart-native = le chemin riche unifié.
- **Différé** : généraliser le patron (cœur pur → 1 composant → 3 renderers) aux autres types de charts (line seul pour l'instant) ; puis les maps web (MapLibre → 3 formats).
- Remotion : ~174 packages (node_modules gitignored), render via npx/node (la seule exception non-Bun acceptée).

## chart-native = moteur de charts natifs (3 types, core extrait) — MERGÉ ★ jalon
- **MERGÉ dans `main`** : `chart-native` n'est plus mono-type. **3 types** sur la recette prouvée (cœur géométrique pur → 1 composant React+D3 piloté par `progress` → static + interactif + vidéo + garde de conformité) :
  - **line** (tendance, la ligne se trace), **bar** (magnitude/ranking, baseline 0, les barres poussent), **scatter/bubble** (corrélation, axes non-zéro, bulle = aire via `scaleSqrt`, les points popent).
- **`src/core/` extrait** (le palier partagé, fait au 2e/3e type, pas deviné) : `math` (format/easings/stagger), `tokens` (Okabe-Ito), `conformance` (garde globale L0 + checks par-type composés), `InteractiveChart` (LE wrapper responsive+reveal, ResizeObserver+rAF+reduced-motion), `ChartFrame` (LA coquille titre/sous-titre/source). → **un nouveau type = géométrie + le SVG + 1 règle de conformité**, le reste hérité.
- **KB en couches réelle** (la vraie idée de Rémy, façon atomic-design) : `knowledge/references/` = global (`design-conformance.md`) → `chart/types/{line,bar,scatter}.md` → `formats/{video,interactive}.md`. Sourcée (FT Visual Vocabulary, data-to-viz, skills Remotion de Tom, WCAG). **Le code matérialise les couches au fur et à mesure ; la KB peut être complète.**
- **Modèle archi figé** : couches = ingrédients (KB + code), composées en silence. Skills = capacités au grain job (skill-group × format). On NE fait PAS un skill par couche. Un livrable = union(global ∩ famille ∩ type ∩ format).
- **Conformité gardée** (`conformance.ts` = l'équivalent natif de `validateChartSpec`) : Okabe-Ito, contraste WCAG réel ≥4.5:1, titre-insight, source nom+url, baseline-0 (bar), axes labellisés (scatter). Tests négatifs prouvent qu'elle attrape les violations. a11y : points focusables clavier (tooltip au focus, pas que hover) + source liée.
- **Best practice labels scatter** : `annotate` (② nomme les points de l'histoire) ; défaut = l'outlier ; placement anti-collision 4 positions + **leader lines** courtes pour un point de cluster, sinon skip (jamais de chevauchement, jamais dans la marge des axes). Le nuage parle par sa forme — pas besoin de tout labelliser.
- **69 tests**, tout **vérifié à l'œil sur les 3 formats à plusieurs largeurs** (static 360→1600 + vidéo).
- **LEÇON (répétée, gravée)** : « j'ai codé le fix » ≠ « le rendu est bon ». Il faut regarder **chaque format à chaque largeur** ET **la marge des axes** avant d'affirmer. Mes claims labels-scatter étaient faux 3× parce que je n'avais pas balayé responsive + vidéo + collision-axes. Rémy m'a fait re-vérifier à chaque fois.
- **Différé / prochains pas** : palier cartésien-axes (gridlines/ticks partagés = prochain L1) · 4e type FT (area, lollipop…) · maps web (MapLibre → 3 formats) · CADRAGE.
- **Vidéo multi-format — FAIT** : `core/format.ts` (`resolveFrame`) scale la typo/marges par `scale` et centre le plot à un ratio sain ; `scale` câblé dans les 3 composants + ChartFrame. Compositions Remotion paysage (840×480) + **carré 1080×1080** + **portrait 4:5 1080×1350** pour les 3 types (LineSquare/LinePortrait, Bar*, Scatter*). Paysage prouvé inchangé (le centrage ne se déclenche pas quand availH < idealH). Vérifié au rendu (portrait line/bar/scatter lisibles, titre 2 lignes sans chevauchement, bulles/texte scalés). 9:16 (1080×1920) rendable aussi via une compo si besoin.

## suggest-visual routing — COMPLET (4 formats routés depuis un article) ★ jalon
- **MERGÉ dans `main`** (`c1c6189`, 2026-06-29) : le routeur `suggest-chart`/`suggest-visual` choisit maintenant l'**élément** (chart vs map, Gate 5) + le **format** (statique / interactif / vidéo / scrolly) + un discriminant `producer`. Les 4 formats sont routés et prouvés live e2e :
  - **chart** → `dw-chart` (statique) / `chart-native` (interactif/vidéo) — ranking EV → barres.
  - **map statique** → `map-dw` (MapSpec) — gradient EU renouvelables → choropleth `2C3f2`.
  - **map native** → `map-native` (ChoroplethConfig, interactif Gate 2 / vidéo Gate 4) — "trouve ton pays" → carte explorable + 3 mp4.
  - **scrolly** → `scrolly` (réutilise ChoroplethConfig + `validateChoroplethConfig`, Gate 3 narratif séquentiel) — "nord→sud, un pays à la fois" → `scrolly.html` 5.5 MB vérifié à l'œil (establish full map → flyTo Norway "99%, the highest of the 8 shown").
- **Gate grounded, pas un knob** : la décision élément/format est le **jugement de l'IA**, ancré dans `knowledge/references/formats/format-selection.md` (Gate 0→5). Jamais une question à l'utilisateur. `scoreSpec` (`eval/score.ts`) est le gate déterministe : `isMap = producer ∈ {map-dw,map-native,scrolly}`, mismatch `expect.producer` → fail, `map-native|scrolly` → `validateChoroplethConfig`, `map-dw` → `validateMapSpec`.
- **scrolly v1 = map-based** ; le scrolly chart (histoire non-géo en scroll) est différé jusqu'à ce que chart-native se branche sur l'orchestrateur scrolly.
- **Prochaine phase (décidée Rémy)** : couvrir **tous les types de map MapTiler** dans `map-native` (proportional symbol, flow/route, dot-density, hex/grid, cartogram, contour, locator) un par un via la recette — comme les 41 types de chart-native.

## Backlog (suggest-visual map routing — deferred from slice-1 review)
- **`producer` discriminator is convention-only (TS-invisible)** : la SKILL.md fait émettre `producer:"map-dw"` et `score.ts` le lit, mais `ChoroplethMapSpec` n'a pas ce champ → un spec typé le perdrait à la compilation. Fix futur : ajouter `producer?:"map-dw"` au type (ou une union discriminée au niveau `MapSpec`). Marche au runtime (champs extra non rejetés).
- **Cas eval manquants** : "absolute counts (not rates) → bar" et "régions géo mais aucun basemap ne matche → bar fallback" (le cas `regions-no-basemap` teste 'pas de structure géo', pas 'géo sans basemap'). À ajouter pour couvrir Gate 5 à 100%.
- **Nettoyer les trailers `Claude-Session:` de l'historique avant la sortie MIT** : des commits de la session 2026-06-29 portent un trailer `Claude-Session: https://claude.ai/...` (mention Claude → viole la règle de publication). Décision : arrêté à partir de là, pas de réécriture immédiate ; scrubber les messages (filter sur `Claude-Session:`) avant le push public / la sortie MIT sept-oct 2026.

## scrolly — symbol scrolly MERGÉ (parité scrolly choropleth↔symbol)
- **MERGÉ dans `main`** (`d8eb8eb`, 2026-06-30) : le moteur `skills/scrolly` n'est plus choroplèthe-only. `map-native/src/symbol-story.ts` `deriveSymbolStory(points, meta)` produit la **même forme `Beat`** que `deriveMapStory` (camera=bbox ; title→establish→reveal chaque ville tri valeur-desc→takeaway) → `mapStoryToChapters` réutilisé tel quel. `scrolly/src/ScrollySymbolMap.tsx` rend cercles+labels (réutilise `symbolGeometry`/`symbolLabels`), caméra qui vole ville par ville au scroll (mirror `ScrollyMap`). `Scrolly.tsx` dispatch sur `config.type`, **back-compat choroplèthe** vérifié. Vérifié au rendu : establish 6 villes → vol vers Madrid « 124$bn ». Padding caméra 64 pour que le plus gros cercle ne clip pas.
- **Matrice type×format symbol désormais complète** : static · interactif nav-libre · vidéo L/C/P · **scrolly** ✅.
- **Différé** : tour-caméra vidéo symbol (réutiliser deriveSymbolStory), highlight/dim ville focus, routage suggest-visual du symbol scrolly, scrolly des futurs types (flow…).

## map-native — qualité de rendu (Group A, 7 fixes) MERGÉ + couche KB format créée
- **MERGÉ dans `main`** (`aefc003`, 2026-06-30). 7 retours Rémy traités, chacun = **code + conformité/harnais + KB à la bonne couche + vérif rendu sur les 2 types** :
  1. static sans controls : isolation des builds `produce` par run (`dist/<kind>-<tag>` via `BUILD_OUT`, snaps lisent `SERVE_DIR`) + garde `snap-static` (0 control nav) → la prod échoue si un static montre un control. *(le vrai bug était la contamination `dist/` partagé, pas le défaut mount)*
  2. donnée jamais sous titre/légende : `resolveMapFrame` réserve la vraie `legendHeight` dans `pad.bottom` + règle `checkMapFraming`.
  3. unité dans les labels valués (`labelText += valueUnit`) + règle `checkSymbolConformance` `labelHasUnit`.
  4. gutter titre static (`MapFrame` 16px×scale) + assertion `snap-responsive`.
  5. interactif tooltip XOR labels (couche `symbol-labels` seulement si `!interactive`).
  6. interactif nav bornée : `maxBounds` (bbox +15%) + `minZoom`(zoom de fit).
  7. interactif responsive : `ResizeObserver` → `map.resize()` + re-`fitBounds` (carte recentrée, zoom adapté).
  + **fix pré-existant** : `clampBounds` (lat ±85° mercator-safe) → le choroplèthe **charge enfin à 360px** (crash `Invalid LngLat` éliminé).
- **★ Couche KB par-format map créée** : `knowledge/references/map/formats/{static,interactive,video}.md` (miroir des charts ; manquait depuis slice 4). Le KB map a maintenant les 3 couches : global + par-type + par-format. `video.md` alimente le Group B.
- **Principe gravé (mémoire `feedback_system_improvement_loop` mise à jour)** : tout retour = 4 livrables couplés (code + conformité + KB **à la bonne couche** global/type/format + harnais), écrit/distribué au bon endroit, comme les charts.
- **RESTE — Group B** : vidéo storytellée (système de modes caméra `reveal-simple | guided-tour | …` choisi par l'IA selon l'article ; réutilise `deriveMapStory`/`deriveSymbolStory` ; intègre l'aesthetic `map-explainer` de Tom — tracé qui se dessine + régions/villes en séquence) **+ scrolly sortable en vidéo**. Spec à écrire.

## ★ État courant — 2026-07-06 (LIS CECI EN PREMIER pour l'état de `main`)

Grosse session **audit + refonte** (~40 commits, tout mergé dans `main`), gate `bun run check` **14/14 vert**. Commits sans attribution vendor — les seules occurrences « claude »/« CLAUDE.md » sont des références FONCTIONNELLES au runtime / au fichier (le repo EST un `.claude-plugin`), pas des attributions ; traitées par le scrub pré-release.

**Sol technique (le plancher qui manquait) :**
- **CI + `bun run check`** racine (`scripts/check.mjs` : tsc des 4 skills à tsconfig + les **10 suites de test**, dont `skills/splash` entier ET `docs/installer`) ; `.github/workflows/ci.yml`.
- **tsc réparé** sur `map-native` + `scrolly` : 220 erreurs → **0** (dont un vrai bug latent camera `LngLatLike`), `@types/react-dom`/`@types/node` déclarés, zéro `any` introduit.
- **LICENSE (MIT)** + **README** racine (manquaient — bloquaient la sortie MIT).
- test rouge `map-dw` réparé ; tests API `dw-chart` self-skip sans token (clean checkout vert).
- **`docs/RELEASE.md`** = checklist pré-release + **`scripts/scrub-trailers.sh`** (scrub des trailers `<vendor>-Session` — préparé, PAS exécuté ; à lancer au pré-release).

**Correction :** `map-native produce.mjs` défaut `static` (fin du footgun 9-renders vidéo) ; **i18n** — le suggester émet les libellés dans la langue de l'article (règles dans les 3 SKILL.md + KB `design-conformance.md`). F-color vérifié déjà résolu (note d'audit périmée).

**★ Spine d'orchestration déterministe (le gros morceau) — `skills/splash/src/` + `scripts/` :**
- Conçu (spec `docs/superpowers/specs/2026-07-06-deterministic-orchestration-design.md`, **validé au feu adverse** → design rendu plus lean/honnête), planifié (`docs/.../plans/2026-07-06-deterministic-orchestration.md`), **construit en 7 tâches TDD sous-agents, chacune reviewée** (ledger : `.superpowers/sdd/progress.md`).
- `produce-all.mjs`/`produce-all.ts` : **boucle in-code drop-proof** (chaque proposition acceptée → rapport structuré, jamais droppée). `adapters.ts` : dispatch par producteur (file/cloud), `FALLBACK_TO_DW` via exit-2, **stdout capturé → rapport JSON pur**. `gate.ts`/`gate-render.mjs` : seul écrivain de `renderApproved` (sha256, audit-marker). `export-guard.ts` **câblé DANS** `export-code.mjs`/`deploy-embed.mjs` (refuse avant tout write/upload sauf produced + render-approved). `map-data.ts` : round-trip CSV RFC4180 — **pas encore consommé** (réservé au futur format-escalation).
- **Câblé dans `splash/SKILL.md`** (PRODUCTION/EXPORT pilotent le spine : `accepted.json` → `produce-all` → statut → `gate-render` → export gardé) + **prouvé e2e sur un vrai chart Datawrapper** (a attrapé un vrai bug de chemin, corrigé — les outputs sont dans `exports/<slug>/<id>/`).
- **Le review-loop a attrapé de VRAIS bugs** (3 corruptions CSV, le gate qui ne lançait pas les tests, la pollution stdout, une commande cassée dans EMBED.md).

**★ Recadrage archi (Rémy, prioritaire) :** splash = **NOUVEAU projet nourri par l'expérience viznews**, PAS une absorption/consolidation. On ne porte rien depuis viznews, on ne le touche pas.

**PROCHAINS follow-ons (session fraîche recommandée) :**
1. **conformance-au-produce — FAIT pour chart-native** (commit `ef362f6`) : `resolveConformanceColors` partagé + les 7 types couleur (line/bar/scatter/histogram/beeswarm/connected-scatter/lollipop) câblés dans `produce.mjs` → une violation **échoue le run avant de builder** (garde-fous à l'exécution, plus test-only). **★ A trouvé un vrai bug a11y live** : `OKABE_ITO.vermillion` (#D55E00) en **TEXTE** = 3.87:1 sur blanc (< WCAG 4.5:1), sur histogram + lollipop → **FIXÉ** : les labels rendent en `COLORS.ink` (le vermillon reste sur le MARK — ligne médiane / stem+dot ; emphase via poids bold), vérifié **au rendu** (histogram + lollipop), produce **fail-hard** maintenant (plus de warn), règle KB gravée (design-conformance.md item 7 : « le label porte la valeur, le mark porte la teinte »). **RESTE conformance** : (a) les **~34 autres types** chart (palettes bespoke non modélisées dans le résolveur) ; (b) **parité map-native** (résolveur + câblage produce).
   **Autre design-bearing (→ brainstorming)** : **couture 4→41 types natifs** (table-driven `spec-to-config` + test de complétude : seuls bar/line/scatter/pie sont atteignables de bout en bout).
2. **Contenu** : export-time hash enforcement + `produce-all` qui clear `renderApproved` au re-produce ; produire/surfacer les propositions secondaires acceptées (② n'en produit qu'une).
3. **Release MIT — gate mécanique `bun run release:check`** (`scripts/preflight-release.mjs` : LICENSE / README / REPO_URL confirmé / trailers scrubés / `.env` untracked ; **PAS** dans le `bun run check` quotidien — échoue tant que pas prêt ; actuellement **3/5**). **FAIT** : la clé installeur ne va plus dans `~/.zshrc` (elle vit dans le `.env` gitignored, sourcée au lancement `set -a && . ./.env && set +a`). **RESTE** (les 2 blockers que le preflight signale) : (a) confirmer le vrai `REPO_URL` public dans `docs/installer/generate.js` + retirer le TODO ; (b) `scripts/scrub-trailers.sh --yes` (destructif, au pré-release).
4. **Doc** : scinder ce CLAUDE.md (état-courant vs changelog) — l'audit l'a flaggé.

**Caveat honnête maintenu :** l'éval du suggester reste **auto-référentielle** (on écrit cas+gold ; ② et le juge = agents) → instrument d'amélioration *relative*, pas de vérité absolue. Renfort futur = corpus tiers + juge sur le **rendu** (pas le JSON).

## ★ Moteur natif de bout en bout — Plan 1 MERGÉ (couture 4→41 + invariant, témoin grouped-bar) — 2026-07-06

Mergé dans `main` (`0075b67`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-06-native-engine-end-to-end-design.md` + plan `docs/.../plans/2026-07-06-native-engine-end-to-end.md` ; 11 tâches TDD sous-agents, review par-tâche + review whole-branch (opus) = **ready-to-merge, 0 Critical**.

- **Problème réglé** : chart-native *dessine* 41 types mais seuls **4 étaient atteignables** depuis un article (`spec-to-config.ts` = switch 4 cases → le reste dégradait en DW statique silencieusement) et **7 gardés** au produce.
- **Mécanisme** : liste canonique exportée **`NATIVE_TYPES`** (source unique ; tue la duplication PREFIX/registries ; test de dérive `NATIVE_TYPES ≡ REMOTION_PREFIX ≡ 2 registries`) · **`validateShape` fail-loud** + `csv.ts` partagé (conventions de forme single/wide/paired/distribution) · **table `MAPPERS`** (les 4 legacy migrés **byte-identique**).
- **★ Invariant machine-vérifié** (`chart-native/tests/completeness.test.ts`, dans `bun run check`) : **reachable ⟹ conformance-guarded** (HARD) + non-deferred/non-legacy ⟹ mapper ∧ garde ∧ ref KB (FULL). **Non-vacant : a attrapé un vrai trou pré-existant — `pie` était reachable-but-unguarded → maintenant gardé.** Partition `mapped | deferred(raison)` ; exemption legacy visible+shrinking `LEGACY_KB_FAMILY_BACKFILL` (honnête, ≤4).
- **grouped-bar productionisé E2E** (témoin) : mapper wide-CSV + garde produce `seriesColors` bespoke (couleurs vérifiées = ce que le composant peint) + validation `nativeType` dans l'éval (`score.ts` branche `producer:"chart-native"`, **rejette les types deferred**) + ref KB + **render-vérifié au PNG** (titre non-rogné, axe à 0, 2 séries lisibles, Okabe-Ito, source).
- **★ DÉCOUVERTE (corrige une hypothèse du plan)** : le **KB chart est déjà riche** — **34 refs sourcées** existent au **repo-root** `knowledge/references/chart/types/` (pas dans le skill), fichiers en **noms d'affichage** (`grouped-bar.md`…). → la ref KB de grouped **préexistait** (Task 9 = vérif) ; test de complétude corrigé (path repo-root + map id→nom-affichage). **Implication roadmap : les prochains lots de types sont moins chers (KB surtout déjà faite).** Note : `chart-native/SKILL.md:~20` dit « no chart/types dir » = périmé (dette doc).
- **Discipline review a attrapé de vrais défauts** (tous corrigés) : le bug de path KB (pointait un dir inexistant), un test false-green (`try/catch` sans assertion hors-catch), un trou de dérive (set LEGACY hardcodé au lieu d'importer l'exemption shrinking).

**PROCHAINS (mis à jour) :**
1. **Couture — lots suivants** (recette prouvée = mapper + garde + entrée famille ; KB souvent déjà là) : **Plan-2 immédiat** = câbler le routage éval de native `line/scatter/pie` (aujourd'hui producer-reachable+guarded mais **pas scorables** : `NATIVE_FAMILY_TYPES` n'a que `magnitude:[bar,grouped]`) + cas de corpus natifs + renforcer le `validates` natif (parité avec `validateChartSpec`). Puis les sous-familles Famille A par forme (wide : stacked/slope/stacked-area/bump/pyramid/diverging-stacked/fan ; paired : dumbbell/connected-scatter ; distribution : boxplot/violin/beeswarm ; single : lollipop/waffle/treemap/diverging/waterfall/dot-strip/radial-bar/bullet).
2. **Conformance restante** : les ~34 types au produce se réduisent à *câbler la garde par type au fur et à mesure qu'il devient mapped* (l'invariant l'exige déjà) ; **parité map-native** (résolveur + câblage produce) = satellite séparé.
3. **Backlog dette** (hors couture) : `produce-from-spec.mjs` double-nest la sortie avec des chemins relatifs-repo-root + exit 0 trompeur (robustesse CLI) ; `SKILL.md:~20` périmé ; hash-enforcement export-time ; propositions secondaires ; release MIT (REPO_URL + scrub) ; scinder ce CLAUDE.md.

## ★ Native Batch 1 MERGÉ — line/scatter/pie routés + 4 types de plus E2E (9 types natifs atteignables) — 2026-07-06

Mergé dans `main` (`cd1e766`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Plan `docs/.../plans/2026-07-06-native-batch-1.md` ; 5 tâches TDD sous-agents, review par-tâche + review whole-branch (opus).

- **A** — routage éval de native `line/scatter/pie` (`NATIVE_FAMILY_TYPES` += change-over-time/correlation/part-to-whole) + **`validates` natif renforcé** à parité DW (title ∧ source ∧ forme-données via `validateShape` en try/catch).
- **4 types productionisés E2E** via la recette prouvée (garde + KB **préexistants** → juste **mapper + entrée famille + flip + render-verify**) : **histogram** (distribution, obs. brutes), **lollipop** (single, `highlightLabel` brut), **connected-scatter** (paired, clé-temps col0 exclue des mesures, non-triée), **beeswarm** (distribution, catégorie = colonne texte **basse-cardinalité** ≤5, sinon single-hue). **Chaque render vérifié au PNG par moi** (histogram médiane-en-ink, lollipop ranking + highlight-mark, connected-scatter trajectoire ordonnée + 2 axes titrés, beeswarm 3 cats Okabe-Ito + outlier isolé).
- **★ La review whole-branch a attrapé 2 vrais défauts que les reviews par-tâche + mon plan ont ratés** : (1) **`suggest-chart/SKILL.md` périmé** — les 4 types étaient câblés en *code* mais le SKILL.md que lit le suggesteur (LLM) ne listait que bar/line/scatter/pie/grouped → le suggesteur ne les **émettrait jamais** (atteignables aux tests, pas depuis un article). **Sur-promesse fixée** : SKILL.md liste les 9 familles + notes de forme CSV par type. **LEÇON : un lot de types DOIT mettre à jour le SKILL.md** (fait pour grouped en Plan 1, oublié dans le plan du lot). (2) **beeswarm** faisait toujours de la colonne texte unique une catégorie → un `company,revenue` (>5 distinct) **échouait le produce** (>5 couleurs) ; **fixé** = dégrade en single-hue (colonne → label par-point) au-delà de 5.
- **Modèle figé** : 9 types natifs atteignables de bout en bout (bar/line/scatter/pie/grouped + histogram/lollipop/connected-scatter/beeswarm) × la matrice de formats (static/interactif/vidéo) héritée.

**PROCHAINS (mis à jour) :**
1. **Couture — types restants qui ont besoin d'une NOUVELLE garde** (pas déjà-gardés, donc plus chers : mapper **+ garde groundée dans le composant** + famille + flip + render-verify) : wide (stacked/slope/stacked-area/bump/pyramid/diverging-stacked/fan) · paired (dumbbell) · distribution (boxplot/violin) · single (diverging/waterfall/treemap/waffle/dot-strip/radial-bar/bullet). Famille B (sankey/chord/heatmap/gantt/candlestick/calendar/marimekko/streamgraph/radar/parallel/lorenz/arc/pictogram) reste `deferred(raison)`.
2. **Parité conformance map-native** (résolveur + câblage produce) = satellite ; hash-enforcement export-time ; release MIT (REPO_URL + scrub) ; scinder ce CLAUDE.md.

## ★ Native Batch 2 MERGÉ — stacked-bar + stacked-area (nouvelle garde + fix a11y) — 2026-07-06

Mergé dans `main` (`c35382d`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Plan `docs/.../plans/2026-07-06-native-batch-2-wide.md`. **11 types natifs atteignables** (les 9 + stacked, stacked-area). 1er lot « **nouvelle garde** » : ces types n'avaient PAS de garde produce câblée.

- **Recette nouvelle-garde** (plus chère que batch-1) : **extraire la palette de séries** module-private du composant vers `core/tokens.ts` (pour que la garde peigne **exactement** ce que le composant rend — 3 palettes **distinctes** : grouped `blue-first`, stacked `black-first`, stacked-area `skyblue-first` ; réutiliser la mauvaise passerait `isOkabeIto` en silence) + case garde miroir de `grouped` (`compute*Layout`→valueDomain + `checkXConformance(seriesColors, textColors)`) + mapper wide + famille + flip + SKILL.md + render-verify.
- **stacked** (part-to-whole) : propre, légende ink. **stacked-area** (change-over-time) : **+ un vrai FIX a11y** — ses labels directs de bord droit étaient peints **dans la couleur de série** (skyblue ~1.9:1 → échoue WCAG) ; déplacés vers **`COLORS.ink`** (règle « le label porte la valeur, le mark porte la teinte », précédent vermillon). La review whole-branch a **audité chaque nœud texte** des 2 composants → aucune couleur-série peinte en texte → `textColors=[ink,muted]` honnête. Les 2 rendus **vérifiés au PNG par moi** (stacked : bars empilées noir/orange/skyblue somment ; stacked-area : composition-dans-le-temps, labels « renewables 210/gas 55/coal 15 » en **ink lisible**).
- **SKILL.md mis à jour cette fois** (leçon batch-1 appliquée) → suggesteur peut émettre les 2.
- **Backlog** (whole-branch, non-bloquant) : les gardes produce **throw** (au lieu de retourner une violation) si `compute*Layout` échoue sa précondition (ex. stacked-area avec 1re colonne non-numérique) — bruyant, miroir du rendu, ne mis-produit rien ; fix une fois au boundary `runProduceConformance` (try/catch→violation) si ça mord. Fragilité système : `textColors` codé en dur par-case → un futur edit ré-introduisant un label couleur-série passerait la garde en silence (attrapé seulement au render-verify) — discipline suffisante, enhancement mécanique noté.

## ★ Native Batch 3 MERGÉ — dot-strip + waffle + radial-bar (types single « propres ») — 2026-07-06

Mergé dans `main` (`7afdfd0`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Plan `docs/.../plans/2026-07-06-native-batch-3-single.md`. **14 types natifs atteignables**.

- **3 types single « propres »** (scoutés : réutilisent le check existant + palette Okabe-Ito + AUCUN fix a11y composant) : **dot-strip** (distribution — garde groupe les lignes→categoryCounts ; KB **auteurée**), **waffle** (part-to-whole — palette `WAFFLE_CATEGORY_COLORS` extraite ; le mapper construit `items[]`), **radial-bar** (magnitude **cyclique** — mapper NE trie PAS ; KB **auteurée** ; note SKILL.md « cyclique seulement, sinon `bar` »). Les 3 rendus **vérifiés au PNG par moi** (dot-strip : spread par clinique + mean ticks ; waffle : grille 10×10 Coal38→Nuclear2 ; radial-bar : 24h en horloge, 2 pics orange commute).
- **Recette pour un type déjà-gardé-en-check-mais-pas-câblé** = mapper + case garde inline (réutilise `checkXConformance`) + palette (extraire si array module-private, sinon alias OKABE_ITO direct) + famille + flip + SKILL.md + KB (auteurer si absente) + render-verify. La review whole-branch a confirmé les 3 gardes **honnêtes** (reproduisent ce que le composant peint) et les 2 KB **sourcées** (URLs réelles vérifiées).
- **★ Découverte systémique (→ lot a11y dédié, session fraîche)** : le scout des single/paired restants a trouvé que **`diverging`, `dumbbell`, `waterfall`, `bullet`, `treemap` peignent tous les labels de valeur dans la couleur du MARK** (vermillon/orange < 4.5:1 sur blanc) — **même classe de bug WCAG que stacked-area**, sur plusieurs types. Chacun a besoin d'un fix composant label→ink. C'est un **lot a11y** à faire avec soin (option : enhancement mécanique du check pour attraper les labels-couleur-mark, pas seulement au render-verify).
- **Backlog contenu** : `DotStripChart` code en dur « Individual pupil »/« pupil » (reste d'un échantillon écoles) → wording générique pour réutilisation rédaction ; `parseCsv` mange le zéro de tête (« 00 »→0).

**★ ÉTAT — 14 types natifs atteignables** (bar/line/scatter/pie/grouped + histogram/lollipop/connected-scatter/beeswarm + stacked/stacked-area + dot-strip/waffle/radial-bar). **PROCHAIN** = soit le **lot a11y** (diverging/dumbbell/waterfall — fix labels + garde, plus valeur), soit les **wide bespoke restants** (bump/slope/pyramid/diverging-stacked/fan), soit un satellite (parité map-native, hash, release).

## ★ Lot a11y — garde de contraste au render (systémique) + 6 fixes composant + 3 types productionisés — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/native-a11y-contrast-harness`), `bun run check` **14/14 vert**, 0 mention vendor attributive, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-native-a11y-contrast-harness-design.md` + plan `docs/.../plans/2026-07-07-native-a11y-contrast-harness.md` ; 12 tâches TDD sous-agents (11 planifiées + 1 ajoutée quand la garde a attrapé un 6e bug), review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important** (a audité CHAQUE nœud `<text>` des 6 composants → aucun label couleur-mark résiduel). **17 types natifs atteignables**.

- **★ Décision de conception tranchée (brainstorming) : enhancement MÉCANIQUE, pas discipline manuelle.** La classe de bug (labels de valeur peints en couleur-mark, vermillon 3.87 / orange 2.25 < 4.5:1) était invisible à la garde produce (qui recevait `textColors` codé à la main). Fix système = **`scripts/snap-contrast.mjs`** : Playwright sur le build static, pour chaque `<text>` → masque le glyphe → échantillonne le **fond RÉEL** derrière (`elementsFromPoint`, 3 points, worst-case) → assert WCAG **≥4.5:1 uniforme** (nécessaire, pas juste conservateur : les bugs tombent dans la bande 3–4.5 qu'un check large-text 3:1 raterait). Helper pur `src/core/contrast-scan.ts` (`worstContrast`/`isContrastViolation`) réutilise `contrastRatio` de `conformance.ts`. **Câblé dans `produce.mjs` après snap-proof → un label couleur-mark échoue le run avant export.** Attrape toute la classe pour les ~40 types, mécaniquement, pour toujours. Limitations documentées in-code (fill-attribut seulement ; halo-sur-mark = faux-positif latent).
- **6 fixes composant label→ink** (règle « le label porte la valeur, le mark porte la teinte ») : diverging (`:235`), dumbbell (`:297,308`), waterfall (label-au-dessus `:288` **ET** la branche narrow-bar), bullet (`:271`, halo blanc conservé), slope (`:345,365`). **Chaque rendu vérifié au PNG par moi** (RED→GREEN au harnais par type).
- **★ La garde a PROUVÉ sa valeur** : en productionisant waterfall, elle a attrapé un **6e bug WCAG réel non prévu** — la branche narrow-bar peignait le label DANS la barre en blanc (`fill="#fff"` = 3.87:1 sur decrease vermillon). Watch-item **rapporté, pas absorbé** → Task 12 ajoutée (décision Rémy : label ink au-dessus de la barre, vertical avec fallback horizontal pour barres hautes anti-clip). Après ça, waterfall n'a **zéro** label sur couleur-mark.
- **Palettes extraites vers `core/tokens.ts`** (`DIVERGING_SIGN_COLORS`, `WATERFALL_ROLE_COLORS`, `DUMBBELL_DOT_COLORS`) → la garde peint EXACTEMENT ce que le composant rend (single source, pas de dérive).
- **3 types productionisés E2E** via la recette prouvée (garde-avant-mapper + mapper + famille + flip + SKILL.md + KB + render-verify au **vrai `produce-from-spec.mjs`**) : **diverging** (deviation, données croisant zéro), **waterfall** (bridge ; mapper gère la colonne `total` optionnelle + l'exclut de la sélection de valeur), **dumbbell** (paired ; les en-têtes des 2 colonnes numériques deviennent les labels de série). Nouvelle clé d'intention `deviation:["diverging","waterfall"]` ; dumbbell → `magnitude`. **bullet + slope : fixés + couverts-harnais mais restent `deferred`** (mappers lourds : bullet synthétise target/max/bands, slope 2-points — lot ultérieur).
- **Backlog (whole-branch, non-bloquant)** : (1) harnais — faux-positif halo-sur-mark + faux-négatif fill-CSS (documentés in-code, latents : les labels atteignables sont sur papier) ; (2) **WaterfallChart labels de catégorie longs rotés -40 débordent la marge basse** (collision ligne Source / clip gauche) — trou de framing/padding, PAS un bug de contraste, ticket séparé ; (3) mapper waterfall `label,total`-seul dégénéré ; (4) `conformance.ts` inline le littéral 4.5 au lieu d'importer `MIN_CONTRAST` (2 seuils pourraient dériver) ; (5) bruit reformat `resolveFrameWithHeader` dans les 5 commits de fix.

**★ ÉTAT — 17 types natifs atteignables** (les 14 + diverging/waterfall/dumbbell) + **garde de contraste systémique au render** (toute la classe label-couleur-mark attrapée mécaniquement). **PROCHAIN** = soit les **wide/single bespoke restants** (bump/pyramid/diverging-stacked/fan/treemap ; bullet+slope à finir de productioniser), soit un **satellite** (parité conformance map-native — le résolveur + câblage produce ; parité harnais-contraste côté map ; hash export-time ; release MIT REPO_URL+scrub ; scinder ce CLAUDE.md), soit le **fix framing** des labels de catégorie longs.

## ★ Group A fini — bullet + slope productionisés (19 types natifs) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/native-group-a-bullet-slope`), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-native-group-a-bullet-slope-design.md` + plan `docs/.../plans/2026-07-07-native-group-a-bullet-slope.md` ; 2 tâches TDD sous-agents, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. **19 types natifs atteignables** (les 17 + slope + bullet). Group A (les types du lot a11y) est **fini** : ils étaient déjà fixés a11y + couverts-harnais ; ce lot = couture seule (recette « check-existe-mais-pas-câblé »).

- **slope** (change-over-time, 2 points temporels) : palette `SLOPE_LINE_COLORS=[muted, vermillon]` extraite → garde `checkSlopeConformance` (accentColor + lineColors ≤2, pas de layout) → mapper (labelField=col0, left/right = 1er/dernier numérique, **périodes = les en-têtes de colonnes**, highlight=spec.highlight) → famille `change-over-time` → flip → SKILL.md (« exactement 2 points, sinon line »). **Render-vérifié E2E par moi** (turnout 2019→2024, ligne accent orange qui contredit la tendance, labels ink). *A fixé au passage un test-témoin périmé (`produce-conformance.test.ts` utilisait `slope` comme type-non-câblé → swap vers `bump`, vérifié encore deferred → non-vacant).*
- **bullet** (magnitude, mesure vs target) : palette `BULLET_MEASURE_COLORS=[blue, vermillon]` → garde `checkBulletConformance` (measureColors + rows→{target}, pas de layout) → **mapper à SYNTHÈSE** (l'article ne donne que `category,value,target`) : `target`=colonne nommée target sinon dernier numérique, `value`=l'autre, **`max`=`ceil(max(value,target)×1.15)`** (marge pour le marqueur), **`bands=[]`** = piste neutre unique (`geometry` : `edges=[0,...bands,max]`) → **AUCUN seuil qualitatif inventé** (décision Rémy, respecte « on ne génère pas d'intention » ; multi-bandes = différé) → famille `magnitude` → flip → SKILL.md (« target requise ; ne jamais inventer les bandes »). **Render-vérifié E2E par moi** (KPI 4 régions, piste neutre, HIT bleu / MISS vermillon corrects, ticks target avec marge, labels ink).
- **Backlog (whole-branch, non-bloquant, tous fail-safe)** : (1) mapper bullet — `max≤0`/target non-numérique → `bullet-geometry` throw (fail-safe, bloque un mauvais rendu ; ajouter un précheck `validateShape` si ça mord) ; (2) slope/bullet prennent 1er/dernier numérique si >2 colonnes (silencieux — **même patron que dumbbell déjà en prod**, garde-fou = la note SKILL.md côté suggesteur) ; (3) cas dégénéré 1 seule colonne numérique → chart valide mais vide de sens (discipline suggesteur).

**★ ÉTAT — 19 types natifs atteignables** (les 17 + slope + bullet). **PROCHAIN** = soit les **bespoke restants Family A** (bump/pyramid/diverging-stacked/fan/treemap), soit un **satellite** (parité conformance + harnais-contraste map-native ; WaterfallChart labels de catégorie longs = framing ; hash export-time ; release MIT ; scinder ce CLAUDE.md).

## ★ Satellite — parité conformance-au-produce map-native (garde fail-hard, trou palette CVD fermé) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/map-native-conformance-parity`), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-map-native-conformance-parity-design.md` + plan `docs/.../plans/2026-07-07-map-native-conformance-parity.md` (les DEUX **révisés au feu adverse** — voir plus bas) ; 5 tâches TDD sous-agents, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. **Satellite, PAS un type de plus** : les 19 types natifs (charts) sont inchangés ; ce lot porte le plancher qualité `conformance-au-produce` des charts (`ef362f6`/`f5cb0d1`) vers le moteur **map-native** (les 7 types de carte : choropleth/symbol/route/locator/dot-density/hex-grid/cartogram).

- **Le vrai payoff — trou palette CVD fermé** : `checkPaletteConformance` (CVD-safety) n'était câblé que sur **choropleth** ; **hex-grid + cartogram** calculaient une ramp (`bins[].color`) mais ne la validaient jamais → une palette **custom-array** non-safe s'exportait. Poussé **dans les checks par-type** (`checkHexGridConformance` + `checkCartogramConformance`, feedback→système, règle durable du type) + parité validate-layer hex-grid (`palette` sur `HexGridConfigShape` + `paletteErrors`). Trigger = array custom (une palette nommée passe toujours par `VETTED_COLORS`).
- **Garde LEAN (décision Rémy) `runProduceMapConformance`** (`src/core/map-produce-conformance.ts`) : valide **furniture L0 sémantique (les 7) + palette CVD (les 3 ramp)** au **config-time**, **sans charger de GeoJSON** ni rejouer de geo-core lourd (les couleurs de ramp viennent de `resolvePalette(scaleType, palette).ramp` — fonction pure). Le structurel exigeant le basemap reste couvert par les snaps runtime. Normalisation `type ?? "choropleth"` (**fix CRITICAL** : choropleth = défaut mount sans champ `type` → sinon s'exportait non-gardé), type-inconnu→violation (pas de pass silencieux), `textColors` **light/dark** dérivés de `resolveMapStyle(mapStyle)` (`#ffffff`/`#18181b`), palette-arm en try/catch, **route récupère son L0 manquant** (son check par-type ne le composait pas).
- **Câblé fail-hard dans `produce.mjs`** avant le premier `vite build` → une violation `process.exit(1)` avant tout build/export. **Produce-vérifié par moi** : GREEN (choropleth propre → gate OK → build → **PNG conforme lu par moi** : titre-insight, source liée, légende 5 bins bleu CVD-safe) ; RED (source retirée → **vrai exit 1**, violation imprimée, aucun output). **`MAP_TYPES`** (registre canonique + drift-test ancré sur la reachability de `mount.tsx`, sans refacto) + **invariant de parité comportemental** (`map-completeness.test.ts` : reachable ⟹ genuinely-guarded via le vrai dispatch — pas une tautologie `A⊆A` ; + sibling `RAMP_TYPES` CVD-completeness). SKILL.md : ligne fail-hard + fix stale `defaults to all`→`static`.
- **★ Feu adverse (4 lentilles) a reshapé le design AVANT le build** : la v1 sur-vendait la portée et décrivait une garde « pure/config-only » **impossible** (les geo-cores exigent le GeoJSON du basemap). Corrigé → garde lean sans GeoJSON ; résolveur **fondu** dans la garde (pas de triple homogène côté map, contrairement aux 7 charts plats) ; **markColors + extraction de constantes supprimés** (dead work — aucun check ne consomme les fills) ; CRITICAL choropleth-default attrapé ; portée recadrée (valeur neuve = **palette-CVD + furniture sémantique + fail-fast** ; `source`/`titre-hors-cadre` déjà attrapés par les snaps). La review whole-branch a aussi attrapé un **test tautologique** dans l'invariant (corrigé mid-lot en assertion comportementale).
- **Portée honnête (backlog explicite, non-droppé)** : labels rendus en **GL** (canvas WebGL → `snap-contrast` ne se porte pas ; pixel-sampling GL = spike séparé) · framing vidéo · chemin **scrolly** (producteur séparé) · checks structurels complets exigeant le basemap.
- **Backlog tickets (whole-branch + par-tâche, non-bloquant)** : (1) **`ChoroplethMap`/`SymbolMap` ne passent pas `dark` à `MapFrame`** (contrairement aux 5 autres) → peignent le furniture light même en `mapStyle:dark` — trou de composant **pré-existant** révélé par la garde, viole design-conformance rule 9 (pill blanc sur basemap sombre), hors scope lean ; (2) branche `checked:false` non-atteignable (future-proofing documenté, `MAP_PRODUCE_GUARDED_TYPES = MAP_TYPES`) ; (3) `subject` pas threadé dans le propre appel palette de `checkHexGridConformance` (garde plus stricte, inoffensif) ; (4) message cartogram `bad-name`→`layout failed` (chemin test seulement ; la garde émet un `palette:` propre) ; (5) tsconfig omet `tests/` du tsc (repo-wide) ; (6) `mkdirSync` avant le gate → dir vide sur RED (inoffensif).

**★ ÉTAT — map-native a maintenant le même plancher `conformance-au-produce` que les charts** (garde fail-hard config-time : furniture L0 + palette CVD, les 7 types) ; 19 types natifs charts inchangés. **PROCHAIN** = soit **parité harnais-contraste côté map** (le pixel-sampling GL, spike différé de ce lot) ; soit les **bespoke restants Family A** charts (bump/pyramid/diverging-stacked/fan/treemap) ; soit un autre satellite (fix composant `dark`→MapFrame ; WaterfallChart framing ; hash export-time ; release MIT REPO_URL+scrub ; scinder ce CLAUDE.md).

## ★ Satellite — map-native render-quality (8 bugs dark/légende/label + garde render-time) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/map-native-render-quality`), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-map-native-render-quality-design.md` + plan `docs/.../plans/2026-07-07-map-native-render-quality.md` ; **8 tâches TDD sous-agents, chacune render-vérifiée au PNG par moi (dark ET light)** + review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. Origine : retour Rémy « résous les bugs pour optimiser/améliorer en gardant la qualité ». **Un audit multi-agents** (4 lentilles → vérif adverse par finding) a confirmé **8 bugs réels au rendu** (4 faux-positifs rejetés) ; le bug anchor (choropleth dark rendait identique au light) render-prouvé par moi.

- **Thème dominant : le dark-mode était cassé pour choropleth/symbol** — `ChoroplethMap:195`/`SymbolMap:187` hardcodaient `DATAVIZ.LIGHT` et n'appelaient jamais `resolveMapStyle` → `mapStyle:dark` **silencieusement ignoré** (basemap+légende+labels+furniture restaient clairs). **Fixé sur les 7 `*Map.tsx`** (static/interactif) : basemap DATAVIZ.DARK + légende via `legendTheme(dark)` + labels light + MapFrame `dark` + contrôles/popup dark. **Render-vérifié par moi : choropleth/symbol/dot-density dark rendent enfin sombres.**
- **Racine commune = logique dupliquée qui a dérivé → helpers partagés extraits (single source, plus de drift)** : `legendTheme(dark)` (couleurs légende themed), `fmtBin` (labels décimaux — fixe la légende choropleth qui collapsait `0–0,0–1` en `Math.round`), `labelTextSize(width)` (labels 18px en portrait, plus le drift static↔vidéo), `HEX_GRID_SCALE_TYPE`/`univariateAccent` (guard=renderer). RouteMap migré aussi.
- **8 bugs** : #1 ChoroplethMap dark · #4 SymbolMap dark · #5 DotDensity dot univarié theme-aware + swatch==dot single-source (`#56B4E9` Okabe-Ito en dark) · #2 **légende de bins ajoutée aux 3 composants choropleth vidéo/scrolly** (étaient indécodables) · #3 **labels par-symbole ajoutés à SymbolStory/Scrolly** (cercles rangés 6..N étaient anonymes ; + fix collision label↔callout géant sur reveal-beat) · #6 hex-grid guard pinне sequential comme le renderer (plus de ramp diverging fantôme / greenlight-puis-crash) · #7 fmtBin décimal · #8 taille label cross-format.
- **★ Gardes render-time (feedback→système, attrape la classe pas l'instance)** : **`scripts/snap-theme.mjs`** — build à `mapStyle:dark`, échantillonne le **basemap RÉEL (screenshot→canvas median-luminance) + le furniture DOM**, asserte qu'ils sont **effectivement sombres**, câblé fail-hard dans `produce.mjs` (gated sur mapStyle:dark) → un type qui laisse tomber le dark échoue avant export. **J'ai vérifié qu'il ne false-fail PAS les cas denses** (dot-density-multi/symbol dark passent exit 0). + **3 tests de parité** (resolveMapStyle-consumption sur les 7 `*Map.tsx` ; `legendTheme`-consumption ; no-`Math.round` ; label-size), tous non-vacants (RED sur revert).
- **LEÇON re-gravée** : render-verify **une frame PAR TYPE DE BEAT**, pas juste la terminale — ma vérif terminale-only avait raté la collision reveal-beat de #3 ; la whole-branch a rendu un reveal-beat et l'a attrapée.
- **Hygiène** : dé-tracké `.superpowers/sdd/task-{6,7}-report.md` (scratch gitignored force-add historique, pré-MIT).

**★ MAJOR follow-up (lot dédié suivant) — le dark-mode a un facet VIDÉO/SCROLLY non couvert** : les composants `ChoroplethStory/Reveal/Scrolly`, `SymbolStory/Scrolly`, DotDensity vidéo hardcodent encore un basemap LIGHT → un dark exporté en **vidéo** reste clair (avertissement produce-time ajouté en attendant). Même recette que ce lot (dark par composant), par composant. **Backlog non-bloquant** : `checkDotDensityConformance` swatch==dot reste test-only (décision Rémy : respecte le lean-guard ; bug déjà mort par single-sourcing) ; GL-label contrast (pas de snap-contrast maps) ; les minors par-tâche.

**★ ÉTAT — dark-mode + lisibilité render corrects pour les 7 types map en static/interactif** ; garde render-time systémique (dark rend vraiment dark). map-native : 7 types, 467 tests. **PROCHAIN** = dark-vidéo (le facet ci-dessus) · Family A charts (7 types) · GL-contrast · release MIT.

## ★ Satellite — dark-vidéo map (le facet vidéo/scrolly du dark-mode) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/map-dark-video`, worktree isolé), `bun run check` **14/14 vert**, 0 vendor, 0 nouveau `any`. Plan `docs/superpowers/plans/2026-07-07-map-dark-video.md` ; 3 tâches TDD sous-agents, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. **Ferme le facet vidéo laissé en follow-up par le lot render-quality** : les composants map vidéo/scrolly hardcodaient un basemap LIGHT et ignoraient `mapStyle:dark` — un dark exporté en vidéo restait clair. **6 composants corrigés** (ChoroplethStory/Reveal/Scrolly + SymbolStory/Scrolly/Reveal) en **mirrorant la référence déjà-wired `DotDensityStory/Reveal/Scrolly`** (l'analogue vidéo des Tasks 2-3 statiques). **Chaque composant render-vérifié dark ET light au still par moi** (basemap dark, légende/labels/panel dark, highlight visible). Helpers de thème déjà existants (`MapFrame`/`ScrollyPanel` dark prop, `legendTheme(dark)`) → consommés, pas réinventés ; déterminisme préservé (`dark` config-invariant, `theme` mémoïsé). **Garde** : `resolve-map-style-parity.test.ts` étendu aux 20 composants vidéo/scrolly (non-vacant). Découverte : Route/Locator/HexGrid/Cartogram vidéo étaient DÉJÀ dark-wired.

**★ Exécuté EN PARALLÈLE du lot Family A charts** (worktrees isolés `.splash-wt/{darkvideo,familya}`, branches séparées, fichiers disjoints map-native vs chart-native, `bun run check` vert dans chaque). **Backlog (tickets)** : Route/Locator/HexGrid/Cartogram vidéo passent la parité mais pas render-vérifiés dark par moi ; pas de `RouteStory.tsx` (trou de couverture vidéo, hors dark) ; emphasis-ring dark symbol-scrolly un poil faible (polish). **map-native dark-mode COMPLET sur static/interactif/vidéo/scrolly, les 7 types.**

## ★ Native Family A couture — 7 types productionisés (19 → 26 atteignables) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/native-family-a`, **worktree isolé, EN PARALLÈLE du lot dark-vidéo map**), `bun run check` **14/14 vert**, 0 vendor, 0 nouveau `any`. Plan `docs/superpowers/plans/2026-07-07-native-family-a.md` ; 5 tâches TDD sous-agents + fixes, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important NEW**. **chart-native : 19 → 26 types natifs atteignables** — les 7 Family A `deferred` productionisés via la recette prouvée (mapper + garde-câblée-au-produce + palette-extract + flip + famille + SKILL.md + KB) : **treemap** (part-to-whole), **boxplot**+**violin** (distribution), **diverging-stacked** (deviation, Likert), **pyramid** (distribution, population), **fan** (change-over-time, prévision), **bump** (ranking). **Chaque type render-vérifié au PNG par moi** (treemap nested+per-cell-contrast, boxplot IQR+outlier, diverging-stacked neutral-straddle+distinct, pyramid mirroré, fan bandes-confiance nichées, bump ranking+label-ink, violin densités distinctes). 26 confirmé au sol (MAPPERS ≡ non-deferred ≡ family ≡ SKILL ≡ guarded, zéro drift). **violin.md auteurée** (FT+data-to-viz sourcés live).

- **La discipline review + render-verify a attrapé/fixé plusieurs vrais bugs** : cap cardinalité treemap >5 (mirror beeswarm, sinon 2 groupes même couleur) ; **2 bugs WCAG label-couleur-mark** (treemap cellText + diverging-stacked in-segment → picker contraste-réel) ; diverging-stacked `neutralIndex` omis (cassait le straddle Likert + collision agree/stronglyAgree) **+** cap réponses >5 (la ramp 2-teintes/côté collisionne à 6+, un Likert 6-points forced-choice) ; fan CSV sparse rejeté par la shape-validation générique → branche isolée `id==="fan"` + shape ≥2 bandes + axe-temps numérique ; **bump label→ink a11y** (fix + snap-contrast RED→GREEN).
- **★ Palettes single-sourcées** (`TREEMAP_GROUP_COLORS`/`DIVERGING_STACKED_COLORS`/`PYRAMID_SIDE_COLORS`/`BUMP_ACCENT_COLORS` dans `core/tokens.ts`, lues par composant ET garde — pas de drift).
- **★ MAJOR follow-up (lot dédié) — a11y tooltip hover systémique** : le `<strong style={{color}}>` du Tooltip interactif peint le nom en couleur-de-ligne sur fond ink → **WCAG ~3.3:1**, **byte-identique dans Bump/Chord/Candlestick/Radar/Sunburst/Waffle (≥6 types)**, hors portée de `snap-contrast` (static-only ; c'est le path hover). Pré-existant (Waffle shippé avec en Batch 3), non introduit ici. **Le lot dédié doit inclure bump.** Autres tickets : smoke-test produce par type ; boxplot n-floor par catégorie ; commentaire `native-types.ts` périmé ; labels catégorie longs tronqués (framing).

**★ ÉTAT — 26 types natifs chart atteignables + map-native dark-mode complet 4 formats.** Reste Family A→B (15 types déférés par design), a11y-tooltip systémique (lot), release MIT (REPO_URL+scrub), scinder ce CLAUDE.md.

> **⚠ NOTE HYGIÈNE GIT (2026-07-07)** : pendant l'exécution parallèle, le worktree principal a été switché sur `feat/cross-platform-installer` (session parallèle installeur/Windows) à mon insu — **DEUX fois** (avant le merge Family A, puis avant le lot tooltip). Family A a d'abord atterri sur la branche installeur (refait proprement sur `main`) ; le lot tooltip s'est basé sur le tip installeur (rebasé proprement sur `main` via `git rebase --onto main`). La branche `feat/cross-platform-installer` porte 2 commits accidentels Family A (merge + CLAUDE.md) — à reset sur `7e088e0` par son propriétaire si besoin (non touché). **Leçon** : quand une session parallèle bouge le HEAD du worktree partagé, vérifier `git branch --show-current` avant chaque merge / `checkout -b`.

## ★ Tooltip a11y systémique — WCAG hover sur 10 charts + harnais hover-contrast — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/tooltip-a11y`, rebasée proprement sur main), `bun run check` **14/14 vert**, 0 vendor, 0 nouveau `any`. Plan `docs/superpowers/plans/2026-07-07-tooltip-a11y.md` ; 2 tâches TDD sous-agents + fixes, review par-tâche + **whole-branch opus** (qui a attrapé un **CRITICAL** raté par toutes les reviews par-tâche). Ferme le follow-up systémique surgi du lot Family A. **Bug** : 10 composants chart peignaient le NOM de série du tooltip hover en teinte-de-mark sur fond ink `#1A1A1A` → WCAG fail (blue #0072B2=3.36:1 = palette[0] partout ; black 1.21 Chord ; muted 3.27 Bump/Parallel). Hors portée de `snap-contrast` (static-SVG-only, pas de hover). **Scope (Rémy) : patch-en-place** (pas la migration Tooltip-partagé des 40 = follow-up DRY séparé).

- **Fix** = le pattern swatch de ComboChart : nom en `#fff` + glyphe `■` décoratif `aria-hidden` portant la teinte (exempt de la règle 4.5:1 car non-texte, garde l'association teinte↔série). Les 10 : Bump/Chord/Candlestick/Radar/Sunburst/Waffle + **4 non-listés par la review d'origine** (Beeswarm/DivergingStacked/Sankey/Parallel). **Render-vérifié par moi** (radar hover, série blue palette[0] : swatch bleu + nom blanc lisible).
- **★ Harnais `snap-tooltip-contrast.mjs`** : build interactif, focus chaque mark (sélecteur généralisé `[role="img"][tabindex="0"]` car le fallback tag-restreint matchait 0 sur Chord `<path>`), échantillonne le `.tooltip` via `getComputedStyle(color)`+opacité composite vs ancestor-walk bg (pas `elementsFromPoint` car pointer-events:none), **skip les swatches `aria-hidden`** (sinon false-fail), asserte ≥4.5:1 via `contrast-scan.ts`, câblé **fail-hard** dans produce. Garde `checked===0` (tooltip cassé entièrement → fail, pas pass silencieux).
- **★ La whole-branch opus a attrapé un CRITICAL** : le câblage produce appelait `snap(...)` (un helper qui n'existait que sur la branche installeur d'où le lot était parti ; mon rebase sur main l'a laissé non-défini) → `ReferenceError` sur CHAQUE produce, harnais jamais invoké — invisible à `bun run check` (produce.mjs = script runtime). **Fixé** (`snap`→`run`) + **vérifié end-to-end à travers produce par moi** (GREEN exit 0 harnais passe ; RED swatch-reverté → produce exit 1 depuis le harnais avec `"Hawks": #6b6b6b on #1a1a1a = 3.27:1`). LEÇON re-gravée : vérifier le câblage **à travers produce**, pas le harnais isolé (le RED→GREEN par-tâche « passait » alors que le câblage était cassé).
- **Backlog (tickets)** : extraire `core/Tooltip.tsx` partagé + migrer les 40 call-sites (tue la duplication 40× du shell ; le harnais garde déjà la non-régression) — y plier l'`aria-hidden` manquant sur les 2 swatches de ComboChart ; cap N=12 marks du harnais (documenté).

**★ ÉTAT — a11y tooltip hover corrigée + gardée mécaniquement sur les charts.** 26 types natifs chart + map-native dark 4 formats. Reste Family B (15 déférés design), release MIT (REPO_URL+scrub), scinder CLAUDE.md, + le follow-up DRY Tooltip partagé.

## ★ Installeur cross-platform (Mac+Win, 2 modes, clés en amont) + garde rendu natif Windows (tsx) — 2026-07-07

Mergé dans `main` (`d006f81`, merge --no-ff depuis `feat/cross-platform-installer`), `bun run check` 14/14 + produce chart-native re-vérifié end-to-end après merge (produce.mjs = script runtime, invisible au gate). Spec `docs/superpowers/specs/2026-07-07-cross-platform-installer-design.md` + plan `docs/.../plans/2026-07-07-cross-platform-installer.md` ; 8 tâches TDD sous-agents, review par-tâche + whole-branch opus = READY TO MERGE, 0 Critical.

- **Problème réglé** : l'installeur était **macOS-only, un seul mode** (`.command` double-clic, git clone, Homebrew). Retour Rémy : pour un journaliste non-tech, il faut **un exécutable OU un copier-coller terminal**, **les deux** portant les clés fournies en amont, **sur Mac ET Windows**.
- **Archi « une logique, 4 surfaces »** : séparer les **clés** (générées par-user) de la **logique d'install** (versionnée, hébergée). `install/bootstrap.{sh,ps1}` (sans clés, idempotents) installent Bun + Claude Code (+ **Node sur Win**), acquièrent Splash par **zip** (pas de git — le plugin n'a aucun hook bash → Git Bash inutile), écrivent `.env`, créent un launcher local double-clic (créé localement → **pas de MOTW/quarantaine** → relance propre), scrubent les secrets. La page (`docs/installer/`) collecte les clés → émet **par OS** un **copier-coller** (`export…;curl|bash` / `$env:…;irm|iex`, contourne Gatekeeper/SmartScreen) **et** un **launcher mince** (`.command` auto-réparant / `.cmd` wrapper `powershell -ExecutionPolicy Bypass`, **jamais** de `.ps1`). Décisions verrouillées : **zéro signature** (notarisation refusée ; signer ne tue plus SmartScreen sur Win ~août 2024), clés inline, drop Homebrew. Grounding vérifié (workflow multi-agents + fact-check adverse) : Claude Code + Bun **natifs Windows** (pas de WSL).
- **★ Garde rendu natif Windows** (`chart-native` + `map-native`) : sous le runtime **Bun sur Windows, `chromium.launch()` de Playwright pendouille** (bug #15679). Les étapes qui lancent Chromium basculent sous **`tsx`** (`snapCommand(p)→["npx","tsx"]|["bun"]`), Remotion sous `npx`. **★ Découverte qui a invalidé le plan** : bare `node` ne suffit PAS — les snap scripts importent des `.ts` avec **imports sans extension** que node ne résout pas (bun/tsx si). `tsx` = runtime node (pas de hang) + résolution façon-bun. **Validé sur Mac** : snap sous tsx local → **PNG byte-identique** à bun ; chaîne `.ts` map-native résolue. `tsx@4.23.0` = devDep pinnée. Le `run` helper reçoit `shell:isWin` (résout les shims `.cmd`).
- **1 Important corrigé** (whole-branch) : `bootstrap.ps1` `Move-Item "splash-$Ref"` cassait sur un tag `v`-préfixé/slashé (GitHub réécrit le dossier d'archive) → glob miroir du `.sh` (`cf8d153`). **Fix post-merge** : la garde tooltip-contrast du lot a11y parallèle (nouvelle étape Chromium mergée) routée via `snap()` pour couvrir Windows aussi.
- **★ INCIDENT concurrence (leçon opérationnelle)** : une **2e session SDD tournait dans le même working tree** (lot tooltip-a11y). Collisions répétées : merge family-a poussé sur mon tip + HEAD switché vers main ; edits étrangers flottants ; ledger `.superpowers/sdd/progress.md` écrasé ; mon `git worktree add main` a échoué (main déjà extrait) → le merge a tourné dans le tree principal (heureusement propre + gate 14/14 + produce re-vérifié). **Récupéré à chaque fois** (travail toujours committé sur la branche). **Règle** : une session SDD par **worktree/clone**, jamais deux dans le même working tree.
- **Backlog** : `chart-native` **vidéo** utilise `npx` (Node) mais `bootstrap.sh` n'installe pas Node sur Mac → vidéo chart-native casserait sur un Mac vierge (map-native vidéo via `bunx` OK). Fix : `render-video.mjs` → `bunx` Mac / `npx` Win (miroir map-native), à render-verifier. + release MIT : confirmer `REPO_URL` + pin `REF` sur un tag (le `.ps1` est déjà glob-safe). + les Minors déférés (voir plan §self-review).

**★ ÉTAT — installeur Mac+Win livré (2 modes, clés en amont) + rendu natif débloqué sur Windows (tsx).** Reste (backlog) : vidéo chart-native sans Node sur Mac ; release MIT (REPO_URL+scrub) ; scinder ce CLAUDE.md.

## ★ Installeur ré-aligné sur le canon Buried Signals — key-free + configurateur local 127.0.0.1 — 2026-07-08

Mergé dans `main` (`dcc6672`, merge --no-ff depuis `feat/installer-local-configurator`), fait **dans un worktree isolé** (`.claude/worktrees/`) pour échapper aux collisions multi-sessions du tree principal. `bun run check` **16/16** (14 + `tsc install` + `test install`). Spec `docs/superpowers/specs/2026-07-08-installer-local-configurator-design.md` + plan `docs/.../plans/2026-07-08-installer-local-configurator.md` ; 8 tâches TDD sous-agents, review par-tâche + whole-branch opus = READY TO MERGE, 0 Critical.

- **Origine (retour Rémy)** : on a comparé notre installeur (2-modes, clés bakées dans l'artefact) aux vraies pages de Mycroft/Spotlight (récupéré leur `install.sh` réel). Le canon-maison = **installeur SANS clés + configurateur local `127.0.0.1`** : les clés sont saisies **après** install, vérifiées en direct, écrites `.env` — *« never sit in Downloads »*. On divergeait sur ce seam.
- **Page publique dépouillée** : plus de formulaire de clés ni de radio runtime. Une **commande statique key-free par OS** (`curl …/bootstrap.sh | bash` / `irm …/bootstrap.ps1 | iex`, identique pour tous) + download `.command`/`.cmd` key-free + doc contournement. `generate.js`/`runtimes.js` (baking par-user) **supprimés** → mini `commands.js` pur.
- **Bootstrap ré-ordonné** (miroir Mycroft, config **avant** tooling) : Bun → repo (zip) → **`bun install/configurator.ts`** → abort gracieux si pas de `.env` → runtime (lu depuis `.splash-runtime`) + Node sur Win → deps + Playwright → launcher local. Plus de `.env`-depuis-l'env, plus de scrub.
- **★ `install/configurator.ts`** = serveur **Bun** (`Bun.serve` 127.0.0.1:port-libre, zéro dep npm) : sert le formulaire, ouvre le navigateur, **vérifie chaque clé en direct** (vraies API GET MapTiler/Datawrapper/Anthropic, no-mock, self-skip), au `/submit` **re-vérifie côté serveur** puis écrit `~/Splash/.env` **chmod 600** + `.splash-runtime`, exit → le bootstrap reprend. Cœur pur `configurator-core.ts` (serializeEnv omit/include ANTHROPIC, RUNTIMES, HTML, verify*) testé ; `install/` = **nouvelle unité gardée** (tsconfig/package.json + ajout au gate `check.mjs` + `ci.yml`).
- **Auth flexible** (retour Rémy « tout abonnement OU clé API ») : clé Anthropic **optionnelle** — vide → `claude` fait son login OAuth au 1er lancement (abonnement) ; fournie → écrite dans `.env`. Les deux via le comportement natif de `claude`, sans branche.
- **Windows natif conservé** (Bun cross-platform — avantage sur Mycroft, POSIX/Python-only ; garde rendu tsx héritée intacte).
- **★ Reviews ont attrapé 4 vrais défauts, tous corrigés + re-vérifiés en live par moi** : (1) `/submit` response droppée avant flush → `setTimeout(250)` ; (2) abort bash « Configuration not completed » **mort sous `set -e`** (le sous-shell tuait le script avant le check) → garde l'appel `if ! (…) || [ ! -f .env ]` ; (3) ps1 avait **perdu le garde d'existence Claude** au réordonnancement → restauré ; (4) **`/submit` ne re-vérifiait pas côté serveur** (whole-branch) → la garantie « verified live » était contournable (vérifier une bonne clé, l'éditer en typo, save écrit la mauvaise) → re-vérif serveur + refus 400. Live-vérifié : mauvaise clé → 400 sans écriture ; vraie clé → 200 + `.env` 600.
- **Backlog (déféré, non-bloquant)** : `serializeEnv` écrit `KEY=value` non-quoté → un `FLY_API_TOKEN` (format `FlyV1 <macaroon>`, avec espace) casserait le sourcing du launcher (pré-existant, champ avancé optionnel — durcir en quotant) ; `configurator.ts` (serveur) sans test unitaire (live-vérifié) ; `docs/RELEASE.md` pointe encore `generate.js`+`git clone` (à MàJ avant release MIT) ; `REPO_URL`/`REF` placeholders (preflight repointé sur `commands.js`).

**★ ÉTAT — installeur key-free + configurateur local `127.0.0.1` livré** (vérif-live des clés, `.env` 600, abonnement OU clé API, Mac+Win natif). Aligné sur le canon Buried Signals. Reste (backlog) : quoting `.env`, `docs/RELEASE.md`, release MIT (REPO_URL+scrub), vidéo chart-native sans Node sur Mac.

## ★ Canal → format → taille → sous-format → export : Slice 1 (couche décision) MERGÉE — 2026-07-08

Mergé dans `main` (`8d46e16`, merge --no-ff depuis `feat/channel-driven-format-export`, worktree isolé), `bun run check` **16/16**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-08-channel-driven-format-export-design.md` + plan `docs/.../plans/2026-07-08-channel-driven-format-slice-1.md` ; 6 tâches TDD sous-agents (2 rounds parallèles fichiers-disjoints, commits sérialisés par le coordinateur pour éviter les races d'index) + fix de review, review par-tâche + **whole-branch opus**.

- **Origine (retour Rémy, validé au feu adverse)** : « le canal & format de diffusion n'est jamais vraiment respecté car pas clair — on demande *où* puis pas le format (static/interactif/vidéo) ni la taille matchée au canal ni les sous-formats/l'export interactif ». Corroboré par le harness (recyclage : 9:16 promis, paysage livré ; geneve : vidéo voulue, interactif livré ; zurich/loyers : sur-escalade interactif).
- **Décision de conception (Rémy)** : canal = **choix structuré** qui pilote tout, déterministe. **(b) défaut interactif franc** pour article/web (contre le static-first, assumé) **mais invariant a11y** : quand interactif choisi, un **fallback static qui porte le message est TOUJOURS produit**. Pas de bucket print/email. Narration : GUIDED → l'AI tranche, DIRECT → le journaliste nomme.
- **Livré (couche décision)** : `skills/splash/src/channel.ts` = **source unique** `Channel = social-vertical|social-feed|article-web` → `{aspect, mediaSize, allowedFormats, interactiveDefault}` (portrait 1080×1920 · carré 1080×1080 · paysage 1200×675 ; social ⇒ {static,video} ; article-web ⇒ les 4 + défaut interactif). Consommée par dw-chart (`export-aspect.ts` refactoré, plus de table dupliquée + drift-test), suggest-chart (routing SKILL.md + éval), produce-all. **Règle dure enforced fail-hard** `isFormatAllowed(channel, format)` dans `produce-all.ts` (format interdit → `status:"failed"`, jamais shippé). **Garde aspect↔type mécanique** (portrait/carré ∧ `isRowDriven(type)` → fail, attrape recyclage). CADRAGE **Q3 = pick structuré** · PROPOSITION **annonce `{format, taille, sous-format}`** vetoable · EXPORT branché (média direct / interactif = 3 livraisons). `format-selection.md` recadré (GATE -1 canal-first ; static-first = justification du fallback a11y).
- **★ La whole-branch opus a attrapé un CRITICAL** que les reviews par-tâche ont raté : le guard fail-hard était **inerte en vrai** — `channel` absent du schéma `accepted.json` §5b du SKILL.md → les propositions ne le portaient jamais → retombait sur le défaut permissif `article-web`. **La leçon re-gravée : vérifier le câblage À TRAVERS produce, pas le guard isolé.** Fixé (§5b requiert `channel` ; `produce-all.mjs` le passe déjà) + garde aspect↔type mécanisée (le commentaire prétendait à tort « pas dérivable ») + drift-test pixel. Re-vérifié à l'œil (câblage bout-en-bout réel).
- **★ Render-verify e2e (3 cas, main mergé) = Slice 1 marche là où ça compte** : **recyclage** (social-vertical) — les 2 MAJORS aspect-mismatch du batch pré-fix ont **disparu** (PNG static propre) ; **geneve** (social-vertical) — avant Slice 1 shippait un **interactif** (faux) ; maintenant choisit **`format:"video"`**, threade `channel:"social-vertical"`, guard passe la vidéo permise, `status:"produced"` → **not-embed⇒jamais-interactif respecté bout-en-bout** (confirmé via `accepted.json`/`report.json`) ; **zurich** (article-web) — PNG static, aucune violation.
- **Découpage assumé (writing-plans : 1 sous-système = 1 plan)** : **Slice 2 (à faire)** = rendu producteur — compos **9:16 natives** (chart-native + map-native ne font que du **4:5** aujourd'hui — vraie incohérence trouvée au grounding : « portrait » = 9:16 côté dw mais 4:5 côté natif) + threading `canal→taille` dans le rendu natif static/interactif/vidéo + ne rendre que l'aspect permis + conformance aspect==canal au pixel.

**Backlog issu de ce lot (tickets, non-bloquant)** : (1) **chart-native sur-produit** — il build `interactive.html` même quand le canal l'interdit (byproduct sur disque ; ne devrait pas être buildé pour un canal social) ; (2) M2 `VisualFormat` dupliqué channel.ts↔producer-spec.ts (import type = cycle, laissé en ticket) ; (3) **flow-adherence de l'orchestrateur** (majors récurrents e2e : specs hand-authored / no-op bash après suggest-article — bypasse parfois le chemin gardé ; plus large que ce lot) ; (4) capture source nom+URL (récurrent, lot bugs séparé).

**★ Lot bugs séparé (du batch de test 2026-07-08, PAS mélangé à ce lot)** : numberFormat « 0% » qui multiplie ×100 (« 4100% », referendum/eu-renewables) · capture source nom+URL faible (systémique) · **scrolly paris-metro** timeout + caméra pleine-France + fuite EN malgré lang:fr · crash annotation **d3-arrow-plot** (`ANNOTATION_UNMAPPED_BAR_TYPES` incomplet) · gate-render sans review-gate.

**Harness QA (privé, `../splash-harness`)** : 18 cas éditoriaux (13 + 5 neufs : geneve-loyers-video/co2-secteurs-grouped/frontaliers-dots/zurich-rents-english/loyers-dispersion-beeswarm). Workflow parallèle test/fix/merge dans `WORKFLOW.md`. **★ ÉTAT — canal respecté + clair + enforced au niveau décision, prouvé e2e.** PROCHAIN = Slice 2 (rendu 9:16 natif) ou le lot bugs.

## ★ Lot bugs (2 retours Rémy + le batch de test) — 6 bugs corrigés en 2 vagues parallèles — 2026-07-08

Tous mergés dans `main` (`3c9afde`), `bun run check` 16/16, 0 mention vendor, 0 nouveau `any`. 6 fixes en worktrees isolés, root-cause + render-verify chacun, review par-fix, merge en 2 vagues (fichiers disjoints).

- **Vague 1** :
  - **interactif ⇒ pas d'export image** (`be6934b`, retour Rémy) : `export-code.mjs` ne copie plus de PNG dans une livraison interactive ; livraisons = code source · **HTML statique no-JS (= le fallback a11y)** · embed fly. A aussi fixé un **bug latent** : le mauvais screenshot (`interactive.png`) pouvait être inliné à la place de `static.png` (match par nom exact désormais). Render-vérifié (dossier livré = interactive.html + static.html + EMBED, aucun PNG).
  - **dw numberFormat % + crash arrow-plot** (`021dcf7`) : le « ×100 » du juge était **empiriquement FAUX** (41+"0%"→"41%" correct). **Vrai bug** : DW appose "%" sans multiplier → une **fraction** 0.41+"0%"→"0%" (précision détruite), et le guard `isPercentScaleMismatch` ne checkait que `numberFormat`, pas `valueFormat` (le token d'axe), et n'était qu'un warning que `produceChart` ignore → **fix : check les 2 champs + hard error** (bloque avant publish). + `d3-arrow-plot`/`d3-dot-plot`/`d3-range-plot` ajoutés à `ANNOTATION_UNMAPPED_BAR_TYPES` (annotation crashait au produce à toutes les largeurs ; groundé sur l'orientation value-x/category-y de `ROW_DRIVEN_TYPES`). Sondé à la vraie API, charts throwaway supprimés.
  - **scrolly caméra focus** (`96a3ded`) : **★ notre 1er fix scrolly ÉTAIT le bug.** Les beats reveal portent déjà des bbox serrées ; le problème est la TRANSITION — `peakFlightZoom = min(from,to) − 0.5` tirait l'arc flyTo EN ARRIÈRE vers l'étendue pleine sur un zoom-in, et comme le zoom est lu live en vol, un lecteur qui scrolle plus vite que le flight (1200 ms) faisait **ratcheter le plancher toujours plus large** step après step. Fix = `peakFlightZoom = min(from,to)` (sans margin) → le flight ne fait que zoomer IN, le plancher ne fait que monter, le ratchet est impossible. Knob `PEAK_ZOOM_MARGIN` retiré. Render-vérifié par-beat (Norway/Germany/Poland cadrés serrés).
- **Vague 2** :
  - **scrolly i18n** (`a77a03d`) : nombres FR `34 000 voyageurs/j` (root cause `symbol-story.ts` `Math.round` sans locale, contrairement au choroplèthe qui threadait déjà `lang` via `formatLocaleNumber` — helper réutilisé) + captions FR « le plus élevé des N » (root cause `chapters.ts` mots de rang hardcodés EN → tables FR/EN + `lang` threadé dans les **6** call-sites map-scrolly). Render-vérifié FR vs EN.
  - **baseColor subject-fit + altInsight** (`fdb4bf4`) : root cause = SKILL.md offrait le sky-blue sous « social/culture » ET le guard n'excluait que l'EXACT `#0072B2` (donc `#56B4E9` passait). Fix : règle Colour réécrite (housing→amber `#E69F00`, labour/transport-flow→vermillon `#D55E00`, « blue = toute la famille »), `baseColor` + `altInsight` **obligatoires** sur les NativeSpec, checks conformance (blue-family-sur-sujet-non-bleu + altInsight manquant). 10 tests négatifs.
  - **source + gate-render** (`3c9afde`) : **GATE 2c** — établir source nom + URL spécifique traçable AVANT la PRODUCTION (1 tour, rejette nom-seul/homepage, interdit le fallback prose comme échappatoire) ; suggest-article extrait un `sourceHint` verbatim + ne confond plus le nom de CSV avec une citation. + `produce-all` **reset** `reviewed`/`renderApproved`/`approvedHash` après le spread du dispatch (fail-safe contre une régression future ; test adverse qui smuggle une approbation stale → strippée) + règles SKILL.md (jamais gate-render après un re-produce sans re-review).

**★ Backlog issu de ce lot (tickets, honnêtement flaggés, non-bloquant)** : (1) **câbler les checks conformance `subject`/`altInsight` au produce** (opt-in/test-only pour l'instant — pattern accepté du repo ; le vrai levier est la guidance SKILL.md que le suggester lit) + threader `NativeSpec.subject`/`altInsight` dans le produce ; (2) le guard blue de **dw-chart** a le même trou exact-`#0072B2` (le fix couvre chart-native, pas dw) ; (3) levier déterministe `source.url` requis dans les 3 fichiers conformance (dw/chart-native/map-native) ; (4) les **sibling story files** (hex/dot/locator/cartogram/route) ont le même pattern nombre non-localisé latent ; (5) **chart-native sur-produit** (build encore static.png/interactive.png byproduct même en interactif) → **Slice 2** (rendu producteur). **paris-metro-scrolly timeout** = non re-observé après le fix caméra (à re-tester).

**★ ÉTAT global — canal (Slice 1) + 6 bugs corrigés, main `3c9afde`, gate 16/16.** PROCHAIN = **Slice 2** (rendu producteur : compos 9:16 natives + threading canal→taille + ne rendre que l'aspect permis + câbler les conformance au produce) ou un nouveau batch de tests.

## ★ Canal → format — Slice 2 (rendu producteur, vrai 9:16) MERGÉE — 2026-07-08

Mergé dans `main` (`24cf063`, merge --no-ff depuis `feat/channel-driven-format-slice-2`, worktree isolé), `bun run check` **16/16**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-08-channel-driven-format-slice-2-design.md` + plan `docs/.../plans/2026-07-08-channel-driven-format-slice-2.md` ; 5 tâches TDD sous-agents + grounding, review par-tâche + **whole-branch opus = READY_TO_MERGE, 0 Critical/Important** (a re-rendu la chaîne live pour vérifier). **Ferme la demande canal de Rémy** : les producteurs rendent maintenant vraiment à la taille/aspect du canal.

- **★ Découverte de grounding** : « portrait » = **4:5 (1080×1350)** côté natif mais **9:16 (1080×1920)** dans la table canal — et **4:5 ne mappe à AUCUN canal**. Donc le fix le moins cher = **repoint** des comps Portrait 1350→1920 (41 chart + 14 map), PAS un 4e aspect. `resolveFrame`/`resolveMapFrame` centrent déjà le plot sur canvas haut → le contenu « marche » au 9:16 (juste un tuning `plotAspect`). Et **`channel` était DROP au boundary de l'adapter** — n'atteignait aucun producteur.
- **Livré** : `channel.ts` += `channelAspect`/`renderSize`/`assertRenderedSize(±2px)`. `adapters.ts` **thread `channel` via env `SPLASH_CHANNEL`** (survit le re-spawn `produce-from-spec.mjs` par héritage `process.env` — pas de plomberie en plus). Les 2 producteurs : lisent le channel → **ne rendent QUE l'aspect du canal** (1 mp4 au lieu de 3 — compense le canvas plus haut) + **taille static par canal** (chart: Vite define `__MEDIA_W/H__` lu à `mount.tsx` avec `/2` pour le deviceScaleFactor:2 ; map: viewport Playwright `snap-static` @1x) + **Portrait 1350→1920** + tuning `boostPlotAspectForTallCanvas` (chart). **Conformance fail-hard** : `produce.mjs` lit l'IHDR du `static.png` produit → `assertRenderedSize` → `process.exit(1)` avant export (câblé comme snap-contrast, sans re-render) ; comp vidéo portrait/square **hard-assertée** == mediaSize.
- **★ Render-verify (moi, à l'œil)** : **vraie vidéo chart 9:16 rendue** (`portrait.mp4`, 240 frames, `static.png`+still = **1080×1920**, **un seul aspect émis** — pas de square/landscape parasite ; conformance verte) + le still lu = barres lisibles, titre 2 lignes non-rogné, source ancrée bas, plot remplit le canvas haut. Map static 9:16 render-vérifié par T3 (choroplèthe+symbol 1080×1920). Conformance **GREEN+RED live** (mauvais canal → vrai exit 1). 138/700/517 tests.
- **★ Discipline anti-stall (leçon)** : 2 agents ont **calé** en lançant un render Remotion **vidéo** inline (bloque silencieux >600s → watchdog les tue). Parade : agents font le code + **render-verify STATIC only** (rapide, output qui coule) + timeouts bornés ; le render **vidéo** = moi, en background bordé. Gravé pour les futurs lots rendu.

**Backlog (whole-branch, non-bloquant)** : (1) **vidéo landscape article-web pas size-guardée** + dims incohérentes (comps landscape restent 840×480 chart / 1280×720 map, pas 1200×675) — scope « repoint only » assumé, ticket parité landscape ; (2) **rendu live map bloqué mi-session par un glitch réseau/cert** (`UNKNOWN_CERTIFICATE_VERIFICATION_ERROR` MapTiler, **reproduit sur `main`** = env, pas le code) → map vidéo live non re-rendu par moi (dims assertées) ; (3) prose : `map-native/SKILL.md` dit « landscape 1200×675 » mais le comp vidéo landscape est 1280×720 ; header Root.tsx map liste 5 comps portrait au lieu de 14 ; (4) l'échelle de layout chart (composé à demi-résolution via /2@2x) vs map (pleine @1x) = polish visuel ; (5) `produce-from-spec.mjs` non touché (déviation légitime — l'env-var suffit).

**★ ÉTAT global — chaîne canal→format→taille→sous-format→export COMPLÈTE (Slice 1 décision + Slice 2 rendu), main `24cf063`, gate 16/16.** social-vertical → vrai 9:16 static+vidéo, feed → carré, article-web → paysage/responsive ; hors-embed⇒jamais interactif enforced ; taille rendue == canal (fail-hard). PROCHAIN = lot a11y-tooltip / câblage conformance subject-altInsight au produce / parité vidéo landscape / nouveau batch de tests / release MIT.

## ★ Fix normalizeChannel — self-map canonique (social-feed ne se mis-size plus en landscape) — 2026-07-09

Mergé dans `main` (`c669368` + merge `36df43e` depuis `fix/normalize-channel-canonical`), `bun run check` **16/16**. **Vrai bug de sizing** attrapé après Slice 2 : `normalizeChannel(freeText)` (`skills/splash/src/channel.ts`) mappe l'input libre du journaliste → enum canonique via une table d'alias (`CHANNEL_KEYWORDS`) + fallback `article-web`. **Trou** : la table d'alias ne contient PAS toutes les valeurs canoniques (`social-feed`/`article-web` n'y sont pas comme clés) → une valeur DÉJÀ canonique `social-feed` (que le suggester émet verbatim, SKILL.md §5b) tombait dans le fallback `article-web` → un post feed était sizé en **landscape** au lieu de carré. **Fix** : `if (ALL_CHANNELS.includes(key)) return key` avant la table d'alias — une valeur canonique se self-map. +9 tests. **Cohérence de toute la chaîne canal revérifiée à la reprise 2026-07-09** : ① channel.ts source unique → ② suggest-chart/eval/score.ts (channelOk `isFormatAllowed` + garde aspect↔type `isRowDriven` ligne 130-139) → ③ SKILL.md §5b (`channel` requis) → ④ produce-all.ts (gate fail-hard) → ⑤ adapters.ts (thread `SPLASH_CHANNEL`) → ⑥ chart-native/map-native produce.mjs (rend UN aspect + `assertRenderedSize` fail-hard). Câblage de bout en bout confirmé, aucun maillon pendouille. **PROCHAIN inchangé** = a11y-tooltip / conformance subject-altInsight au produce / parité vidéo landscape / batch tests / release MIT.

## ★ Batch QA 21 cas (18 régression + 3 sujets neufs) → 5 fixes mergés + follow-ups honnêtes — 2026-07-09

Boucle **feedback→système complète** via le harness privé (`../splash-harness`, WORKFLOW.md), tout render-vérifié par moi. Mergé dans `main` (`64071ed`, 3 branches --no-ff), `bun run check` **16/16**, 0 mention vendor, 0 nouveau `any`. J'ai écrit 3 sujets neufs génériques (`parking-hausse-vertical` social-vertical/aspect-guard · `budget-ville-waterfall` deviation · `energie-region-allemand` i18n DE) — dans `cases/` du harness.

**Discipline « regarder les pixels » = a séparé le vrai du bruit** : **2 faux positifs juge écartés** (numberFormat « 9200%/7000% » — rendus corrects, le juge raisonne le token `0%` pas les pixels) ; **fixes-qui-tiennent confirmés** (Gate 5 ranking→bar ; chaîne canal **vrai 9:16** + garde aspect↔type → colonnes sur portrait ; waterfall E2E).

**5 fixes mergés (chacun render-vérifié par moi + garde/KB/SKILL au niveau système) :**
- **locale** `core/locale.ts` FR/EN binaire → **table-driven fr/de/it/en** (LineChart n'avait AUCUN `lang` → cause du hot-patch allemand). Threadé dans 40+ composants + `formatLocaleNumber` dans les value-labels qui le bypassaient (WaterfallChart « +2.4 »→« +2,4 »). Garde `locale-furniture-parity.test.ts`. **Render-vérifié : waterfall FR « +2,4/−0,5 », beeswarm « 4 300 », DE line « Quelle: ».**
- **beeswarm** honore `baseColor` (logement→ambre, plus le bleu défaut) + outliers agrandis+labellisés ink. Garde subject-fit. **Render-vérifié : ambre + Lutry 2 810/Pully 2 620.**
- **labels bar-H** non tronqués (gutter au plus long label + wrap ≤2 lignes).
- **map-dw symbol/dot** : DW ne peut **pas** labelliser en statique (groundé DW Academy) → `validateMapSpec` **erreur dure → route map-native**. map-dw = choropleth + locator désormais.
- **export hardening (décision Rémy B : garder défaut franc interactif + durcir export)** : `export-code.mjs` tourne **en 1er inconditionnellement** (static.html a11y toujours produit), seul l'embed fly.io reste opt-in ; garde mécanique **`assertDelivered`** (refuse une livraison sans EMBED.md/.html/static.html) câblée dans export-code → **« delivered » exige un artefact**. + règle encoding-drift (pas de highlight sur cadrage neutre).

**Re-verify des 7 cas affectés sur main mergé — les fixes TIENNENT :** tous livrés, **ZÉRO critical** (avant : 2 timeouts/turn-caps + criticals) ; **energie DE : 0 hot-patch** (1crit+9maj → 3maj) ; waterfall 0 major ; beeswarm ambre confirmé.

**★ Découverte stratégique (le vrai next) : le gros cluster orchestration = le LLM DÉSOBÉIT à des règles qui EXISTENT DÉJÀ et sont bien écrites** (hot-patch=règle SKILL.md:394 ; sub-agent parasite=397 ; source name+url=398-399 ; hand-authored spec au lieu d'invoquer suggest-chart=390 ; producer flip-flop). Ajouter de la prose ne le règlera pas → **il faut de l'enforcement MÉCANIQUE**. J'ai posé les 1res dents (`assertDelivered`). Prochain lot naturel = « rendre l'orchestrateur mécaniquement inévitable ».

**Follow-ups honnêtes surgis du re-verify (non-bloquants, non faits) :**
1. **a11y static fallback d'une carte symbol INTERACTIVE pas labellisé** (seul le point highlighté) — l'interactif supprime les labels directs (règle tooltip-XOR-labels) et le fallback a11y en hérite. Le fallback a11y (pas de hover) devrait porter les labels directs. **Vrai fix code.**
2. **Réconcilier le ROUTAGE avec la décision B** : la prose « escalade interactif seulement si conditions » de `suggest-chart/SKILL.md` **contredit** le défaut franc → le juge flag une sur-escalade qui est en fait le design voulu. Aligner la prose (+ le rubric `judge.md` du harness, périmé sur le flow export « demander les 3 formes »).
3. **Adhérence orchestrateur** = le lot mécanique ci-dessus.
4. `.example` TLD accepté comme source (partiellement artefact de mes personas ; splash pourrait rejeter les TLD réservés). Watch-items agents : Swiss-German apostrophe `de-CH`, beeswarm `subject` opt-in au produce, bar wrap capé 2 lignes.

**PROCHAIN** = lot « enforcement mécanique orchestrateur » (le vrai levier) / a11y fallback labels interactif-symbol / réconcilier routage+judge avec B / a11y-tooltip / release MIT.

### Vérif des 4 formats non-statiques (retour Rémy : « pas vu de map interactive ni de vidéo ») — 2026-07-09
Le batch avait tout render-vérifié en **statique** → angle mort sur interactif/vidéo. Produit + vérifié **live sur main mergé** (Playwright hover/zoom + frames mp4 via ffmpeg) les 4 formats :
- **Chart interactif** ✅ hover tooltip OK + **locale FR dans le tooltip** (« +2,4 · running 2,4 »). *Minor : value-labels rotés vertical à 1200px de large — lisible, à surveiller.*
- **Map interactif** ✅ zoom control marche, choroplèthe CVD + légende, fit sur l'Europe.
- **Chart vidéo** ✅ barres qui s'animent, valeurs qui se révèlent (frame par beat vérifiée).
- **Map vidéo** ⚠️ **BUG cadrage** : le reveal choroplèthe rend en **vue-monde** (Europe petite, ~60% du cadre vide) au lieu de fit-données comme le statique/interactif. `reveal.ts revealCameraPlan(bounds)` = caméra FIXE au bounds passé → soit le bounds data-extent n'atteint pas le comp Remotion (`remotion/src/Root.tsx`), soit `fitBounds` n'est pas appliqué au render → défaut monde/zoom 0. Root-cause à finir dans Root.tsx ; lié au chantier caméra vidéo « Group B ». **Fix concret + visible à faire.**

**Leçon re-gravée** : pour interactif → vérif live navigateur (hover/pan/zoom Playwright) ; pour vidéo → frames par type de beat (early/mid/end), jamais juste le statique. Le statique cache les bugs de hover ET de cadrage-caméra vidéo.

### « Les deux » — Track 2 (enforcement mécanique slice 1) MERGÉ · Track 1 (map-vidéo) TENU — 2026-07-09
- **Track 2 MERGÉ** (`main`, gate 16/16) — 1res dents mécaniques sur l'orchestrateur (le LLM désobéit aux règles écrites → guards qui refusent) : **GUARD producer-match** (`src/producer-guard.ts` : l'exécuté == l'accepté, seul le fallback natif→dw sanctionné passe ; `actualProducer` enregistré ; attrape le flip budget-commune au niveau dispatch — caveat honnête : le flip LLM « dit dw, écrit chart-native dans accepted.json » reste invisible car les 2 champs lisent alors la même valeur → slice spec-provenance suivante) + **GUARD placeholder-source** (`src/source-guard.ts` : rejette `.example`/`.test`/`.invalid`/`.localhost` + `example.com/org/net`, câblé au point unique `validateAccepted` couvrant les 5 producteurs ; vérifié GREEN+RED par moi). Splash 169 tests. Spec-provenance/gate-ordering = slice 2 (design-bearing).
- **★ Track 1 (cadrage map-vidéo) TENU, PAS mergé** (branche `fix/map-video-framing` gardée). L'agent a bien root-causé (l'Europe est un extent portrait → height-constrained en landscape 16:9 ; le statique landscape a le même cadrage — ma comparaison initiale était fausse) et fixé le padding (frame FINALE serrée, confirmée par moi). **MAIS ma vérif du vrai mp4 a attrapé que le fix est INSUFFISANT** : frames 60/120/180 (~75% du clip, dont `STILL_FRAME.reveal=120` que le pipeline vérifie) restent **lâches vue-monde** ; la caméra ne se serre qu'aux ~40 dernières frames. **L'agent a claim « Europe fills » en ne vérifiant QUE la frame finale** — la discipline « chaque frame par beat » a rattrapé le trou. **Root cause réelle (plus profonde que le padding)** : la caméra reveal ne tient PAS l'extent Europe dès frame 0 — `fitBounds(duration:0)` sur load n'est pas appliqué aux frames early du render Remotion (le map rend à son `center:[10,50] zoom:3` initial jusqu'à un settling très tardif). **Fix à faire** : la caméra doit montrer les bounds fittés dès frame 0 (fixer le center/zoom initial au fit calculé, ou corriger le timing fitBounds/delayRender), vérifié aux frames 60 ET 120, pas juste la finale. Probablement pré-existant sur `main` (bug caméra reveal de longue date, surfacé par la vérif-format).

**★ ÉTAT — main `4e9cf6a`, gate 16/16.** Track 2 mécanique mergé ; map-vidéo reveal a un vrai bug caméra-early tenu (branche `fix/map-video-framing` conserve le padding-fix partiel + tests).

### Track 1 v2 — ★ CORRECTION : le « bug de cadrage map-vidéo » N'EXISTAIT PAS (illusion couleur, erreur de vérif) — 2026-07-09
**Retour Rémy qui m'a rattrapé.** J'avais conclu que le reveal choroplèthe était « lâche 75% du clip » et j'ai (a) rejeté le fix padding de l'agent, (b) passé 3 « fixes » (jumpTo/redraw/areTilesLoaded, tous « échoués ») en débogage systématique, (c) conclu à tort à un « bug architectural Remotion+MapTiler ». **TOUT ça était faux.** Preuve : un **diff pixel frame120-vs-frame239** (ffmpeg `blend=difference`) montre que les SEULES différences sont les **pays de données** (gris→coloré) + le texte overlay ; **tout le basemap (côtes/Groenland/Russie/océan) est pixel-IDENTIQUE**. L'overlay que j'avais instrumenté le disait déjà (`z=2.54 c=10.9,60` identiques aux 2 frames) — même zoom+centre+canvas ⟹ projection identique ⟹ côtes aux mêmes pixels. **Ce que j'ai lu comme « dézoomé » à frame 120 = les pays GRIS non-colorés qui se fondent dans le fond gris, l'œil n'accroche pas l'Europe.** Le reveal cadre l'Europe de façon CONSTANTE ; seules les couleurs fadent in (comportement correct). **Un 2e diff (main-239 vs fix-239, colorées)** montre que `main` et le fix de l'agent sont quasi identiques → le reveal de `main` était déjà bon, le fix agent = tweak mineur. **★ LEÇON gravée : pour juger un CADRAGE, faire un diff pixel objectif — ne JAMAIS juger le cadrage à l'œil sur une frame où l'absence de couleur trompe la perception.** J'ai chassé un fantôme longtemps ; le diff tranche en 2s.

**Statut branche `fix/map-video-framing`** : le fix padding de l'agent est un tweak mineur (tests verts, gate 16/16), pas urgent — à merger comme petite amélioration OU dropper, au choix ; PAS de bug à corriger. Track 1 = **clos, faux problème**.

**PROCHAIN** = spec-provenance (enforcement slice 2) · réconcilier routage+judge avec B · a11y fallback labels symbol interactif · release MIT. (PAS de « fix caméra reveal » — il n'y a pas de bug.)

### 3 lots en parallèle MERGÉS (`fcd394c`, gate 16/16) — 2026-07-09
Lancés en parallèle (worktrees isolés), review + render-verify par moi, merge propre (dry-run clean, disjoints) :
1. **Réconcilier routage avec décision B** — `suggest-chart/SKILL.md` : article-web = **interactif par défaut** (les conditions AND large/multi-série/perso/web-only reframées en **signaux**, pas préconditions) ; le routage MAP aussi (article-web choroplèthe → map-native interactif par défaut, map-dw gardé pour static social + cas static justifié). `splash/SKILL.md` déjà correct, aucun test d'éval n'encodait l'ancien gate. **+ harness `judge.md` aligné par moi** (`0ca06ae`, repo séparé) : ne flagge plus l'interactif-par-défaut ni l'export-first.
2. **Provenance = enforcement slice 2** (`src/guardrail-parity.ts`) — pas de preuve de provenance (impossible : orchestrateur ET suggest-chart = même LLM, pas de frontière de confiance) → **ré-applique au produce les garde-fous DÉTERMINISTES** de suggest-chart. Gaps câblés : **garde aspect↔type au produce** (était éval-only), furniture native (titre+source), subject-fit native (blue-family sur sujet non-eau) ; **ferme le bypass « channel porté seulement sur le spec »**. 25+7+1 tests, splash 201. Hors-scope documenté (element/producer/family = besoin de gold ; qualité LLM-juge).
3. **a11y symbol interactif** — le proof `a11y.png` (build interactif pré-hover) est maintenant labellisé (flag `?staticLabels` sur la capture a11y seulement). **★ 2e faux-flag proof-artefact de la session (comme le map-vidéo)** : j'ai vérifié moi-même que le **fallback RÉELLEMENT livré** (`static.html` ← `static.png` du build statique) était **déjà pleinement labellisé** — pas de vrai trou a11y de livraison. Valeur réelle du fix = le proof `a11y.png` (ce que le QA/juge regarde) était trompeur → faux-flag récurrent ; le fix le rend honnête + verrouille l'invariant (conformance + KB WCAG). **LEÇON re-gravée : pour juger un artefact, vérifier ce qui est RÉELLEMENT LIVRÉ, pas le proof — 2 fois cette session j'ai flaggé un proof comme un bug (map-vidéo, a11y symbol).**

**★ ÉTAT — main `fcd394c`, gate 16/16.** Enforcement mécanique slice 1+2, routage aligné B (+ judge harness), a11y symbol proof honnête. **PROCHAIN** = release MIT (REPO_URL + scrub) · scinder ce CLAUDE.md (trop gros) · éventuel corpus QA tiers (le vrai renfort anti-auto-référentiel).

## ★ Batch QA2 (6 cas neufs diversifiés + pièges) + filet deep-verify mécanique + 2 fixes — 2026-07-09

Retour Rémy : « lance de nouveaux tests, couvre le matrix complet (vidéo/interactif/scrolly/image), tente des pièges, vérifie best-practices ET résultat final, remonte pour corriger ». 6 cas neufs écrits (thèmes/lieux variés : budget FR, démographie monde, mégapoles Chine, électrification Afrique de l'Est, médailles sprint, glaciers cantons suisses), 3 pièges tendus (labels diagonaux longs · tooltip hors-fenêtre · hover masqué). Mergé dans `main` (`d9584cc`), gate 16/16, 0 vendor.

**★ Directive Rémy la plus importante — « les judges + fixes doivent vérifier le LIVRÉ en profondeur, c'est pas normal qu'on loupe ça ».** Racine : `judge.md:14` = le juge LLM est **aveugle aux pixels** (raisonne sur le spec/metadata, ne voit pas le rendu ni n'interagit) → il rate tooltip-overflow, scrolly texte-répété, couleurs. Fix systémique = **`splash-harness/scripts/deep-verify.mjs`** (filet MÉCANIQUE Playwright) : ouvre interactive.html/scrolly.html et teste ce que le juge ne peut pas — **tooltip reste in-viewport** (hover marks du bord), hover surface un tooltip (régression overlap), **scrolly intro ≠ takeaway** (pas de répétition), **pas de fuite langue** (noms anglais dans un livrable FR). **Validé** : il a attrapé le tooltip-overflow (glaciers) + scrolly intro=outro + fuite « Ethiopia/S. Sudan ». `judge.md` (mandat lire le contenu texte + déférer pixel/interaction au filet) + `WORKFLOW.md` (deep-verify câblé dans LOOK) mis à jour (harness `42628e5`). **Gravé aussi dans les prompts des agents de fix** (obligation d'ouvrir/hover/lire le livré, pas les tests).

**★ Pattern d'erreur de MA vérif reconnu (3× cette session)** : sur-flag map-vidéo (illusion couleur), sur-flag a11y-proof (proof ≠ livré), **sous-flag scrolly** (« ✓ livré » sans l'ouvrir — Rémy l'a ouvert et vu le texte répété/couleurs que j'avais ratés). Sur-flag ou sous-flag = même défaut : profondeur de vérif inconstante. Le filet mécanique + « toujours ouvrir/interagir le LIVRÉ » = la parade gravée.

**2 fixes mergés (chacun deep-verifié par l'agent PUIS par moi via `deep-verify.mjs` indépendant) :**
- **chart-native** : (1) **tooltip interactif déborde hors-fenêtre** (bord droit → coupé) — `core/tooltip-clamp.ts` `clampOffset` flip/clamp dans le plot box, partagé via `ChartFrame` (les ~40 types), + gate `snap-tooltip-viewport.mjs` fail-hard au produce (non-vacant). Vérifié : tooltips edge in-viewport. (2) **parser CSV ne gère pas les champs quotés** (virgules dans labels → shape cassée) — `csv.ts` réécrit quote-aware RFC4180. PNG noms de ministères quotés intacts.
- **map-native + scrolly + suggest-chart** : (1) **scrolly intro = takeaway** (identiques) — `deriveTakeawayCopy` (map-story.ts) génère un closer distinct data-tied (« écart de 1 à N ») + guard `auditDistinctBookends`. (2) **noms de pays en anglais dans scrolly FR** — `labelField` threadé (`computeChoropleth` → `layout.labels`) → Éthiopie/Soudan du Sud. (3) **ramp choroplèthe bleu générique** — subject→ramp câblé (energy→oranges), templates suggester émettent subject+palette, guard `checkPaletteConformance` fire au produce (refuse subject sans palette). Vérifié à mon œil : ramp chaud YlOrRd.

**★ Queués (relevés, PAS droppés)** : dense-symbol carte produce-échec (conformance + a11y-source + pas de re-route dw → turn-cap) · producer over-produce (`interactive.html` buildé pour canal social — l'export LIVRÉ reste propre, c'est le byproduct) · cas **portrait/colonne** à ajouter pour reproduire enfin les **labels diagonaux coupés** (ici ça a routé en barres H, pas de rotation) · piège hover-masqué non testable (carte dense blanche) · coquille source « Émité » · downgrade sans re-confirm (long-labels) · popup hover static/interactif choroplèthe montre encore le nom anglais du basemap (surface séparée, labelField non threadé) · DRY `core/Tooltip.tsx`.

**★ ÉTAT — main `d9584cc`, gate 16/16.** Batch QA2 : matrix couvert (vidéo 9:16 ✓, static ✓, scrolly ✓, interactif ✓), tooltip-overflow + CSV + scrolly-qualité + ramp subject-fit corrigés et deep-verifiés, **filet mécanique deep-verify** en place (le vrai antidote aux misses). PROCHAIN = le lot queué (dense-symbol/produce-gating/cas portrait-colonne) · release MIT · scinder ce CLAUDE.md.

## ★ Tes 2 bugs nommés reproduits + corrigés (labels rotés coupés · hover masqué) — 2026-07-09

Mergé dans `main` (`ed18929`), gate 16/16, deep-verify par les agents PUIS par moi.
- **#1 labels diagonaux coupés** (WaterfallChart) : labels rotés -40° end-anchored → début clippé au bord gauche + collision « Source ». **Reproduit par moi** (Read PNG). Fix (`core/text.ts` helpers partagés) : tronque la FIN (début lisible gardé), marge descente **bornée à une fraction du canvas** (grounding : article-web rend à 600×338 → grossir la marge collapse le plot ; le bon modèle = borner+tronquer), font un cran plus petit ; tooltip interactif porte le nom complet. Test render-géométrie non-vacant (ancien start x = -209px off-canvas). **Vérifié à mon rendu** : « Ministère de l'Édu… / …Éco… / …Tr… / …Int… / …Ju… », débuts lisibles, source dégagée, axe Y régulier.
- **#3 hover masqué** (carte symbol dense, cercles chevauchants) : seul le plus gros cercle atteignable (les autres derrière, bloqués). **Reproduit par moi** (sweep Playwright : 1/6 avant). Root cause : pas de `circle-sort-key` (l'ordre du tableau ne contrôle PAS le z des cercles MapLibre — la KB affirmait le contraire, corrigée) + hover `mouseenter`+`features[0]` fragile. Fix (`SymbolMap.tsx`) : `circle-sort-key` small-on-top + `mousemove` + `nearestSymbolIndex` (pick le centre le plus proche). Test régression non-vacant. **Vérifié** : agent 2/6→6/6, moi HK/Dongguan/Foshan désormais atteignables (étaient bloqués).

**★ ÉTAT — main `ed18929`, gate 16/16.** Tes 3 bugs nommés désormais TOUS traités : tooltip hors-fenêtre (lot précédent) · labels rotés coupés · hover masqué. Reste queué : dense-symbol produce-cluster (source non-capturée → a11y hard-fail → pas de re-route dw) · producer over-produce social · popup choroplèthe nom-anglais · release MIT · scinder CLAUDE.md.

## ★ Cluster dense-symbol — racine mécanique corrigée (snap-a11y acceptait pas une source prose) — 2026-07-09

Mergé/committé dans `main` (`f1c8cd1`), gate 16/16, vérifié au vrai produce. Le cas QA2 dense-symbol échouait le produce à `snap-a11y` (« source link missing href »). **Vrai bug** : `map-native/scripts/snap-a11y.mjs:306` exigeait un lien source (href) et **hard-failait le produce sans**, alors que `SKILL.md:190` dit explicitement « a name-only prose source with no URL **still passes** ». Une source prose légitime (« Chiffres tels que rapportés dans cet article ») tuait un interactif entièrement buildé. **Fix** : la source doit être PRÉSENTE (texte lisible) ; un lien rendu doit porter un href ; une prose nom-seul (texte, pas d'ancre) passe — la règle « dataset nommé → URL requise » reste au guard config-time, pas au snap render. chart-native snap-a11y durci pareil (son `getAttribute` sur `a[href]` zéro-match pouvait hang/throw sur une source prose). **Vérifié** : prose → « a11y: all checks pass », vraie URL → passe toujours. → le produce dense-symbol réussit maintenant même en source prose (plus de hard-fail + terminate).

**Reste du cluster = flow, pas mécaniquement fixable proprement** : la vraie source du persona tombait en prose (suggest-article ne l'a pas extraite / Gate 2c pas suivi) — c'est la faiblesse récurrente de capture source (contrat social au déploiement). Le no-re-route-dw devient moot (le produce réussit).

**★ ÉTAT — main `f1c8cd1`, gate 16/16.** Bugs restants majeurs traités. Queué : producer over-produce social (`interactive.html` buildé pour social) · popup choroplèthe nom-anglais basemap · capture source (flow) · release MIT · scinder CLAUDE.md.

## ★ Popup choroplèthe localisé (nom data, pas basemap anglais) + décision honnête sur l'over-produce — 2026-07-09

Mergé/committé dans `main` (`9a5abd5`), gate 16/16. **Popup choroplèthe** : le hover montrait `f.properties.name` = nom **basemap anglais** (« Ethiopia ») même en livrable FR. Fix : `config.labelField` threadé dans le `computeChoropleth` de `ChoroplethMap` (peuple `layout.labels`), `__label` localisé écrit sur chaque feature, préféré dans le popup (fallback nom basemap). **Vérifié par moi au Playwright hover** : « Éthiopie — 51% », « Soudan du Sud — 8% », « Ouganda — 45% » (était Ethiopia/S. Sudan/Uganda). (Champ `labelField?` ajouté au type `ChoroplethConfig`.)

**Over-produce (interactive.html buildé pour canal social) — DÉFÉRÉ honnêtement (pas droppé)** : le livré est **déjà correct** (l'export exclut l'interactif pour social — c'est un byproduct du outDir de produce, temps de build gaspillé seulement). Le fix propre (gater le build interactif + ses ~4 snaps interactifs par canal, sans casser article-web/static/vidéo) est un **refacto multi-branches** qui mérite sa passe dédiée avec régression complète — pas un changement à la va-vite en fin de session énorme. Faible sévérité, risque réel → passe dédiée.

**★ ÉTAT — main `9a5abd5`, gate 16/16.** Restants : over-produce social (refacto dédié) · capture source (flow) · release MIT · scinder CLAUDE.md.
