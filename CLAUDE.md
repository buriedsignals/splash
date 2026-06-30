# Atelier — storytelling visuel open source pour chaque rédaction

> **Reprise de session :** lis CE fichier en entier + `git log --oneline -15` + la spec-parapluie
> `docs/superpowers/specs/2026-06-14-atelier-architecture-design.md`. Tout le contexte tient ici.
> (Mémoire Claude Code : non portable vers ce repo — la source de vérité, c'est ce CLAUDE.md + les specs.)

## Quoi / pourquoi (la bourse)

- Financé par la **bourse FJM** (juin 2026). Nom public : « Atelier — storytelling visuel open source pour chaque rédaction ».
- **But** : une petite rédaction non-équipée (pas d'équipe data/graphique) produit des visuels narratifs de qualité, juste en fournissant son article. Atelier orchestre la production — il ne génère ni texte ni illustration ; l'intention éditoriale reste au journaliste.
- **Livrable Sept-Oct 2026** : enquête Heidi.news « Annemasse, capitale du n'importe quoi » publiée + sortie **GitHub MIT** + extension We.Publish + rapport d'apprentissage.
- **Équipe** : Yvan Pandelé (Heidi.news, lead édito), Rinny Gremaud (Heidi.news, narratif), Tom Vaillant / Buried Signals (dev sous-traitant) → **Rémy fait le dev**.

## L'architecture (3 couches)

Atelier = **un skill open-source MIT, installable, agnostique runtime, local-first** (modèle Mycroft/Spotlight de Buried Signals). Pas de website hébergé, pas de backend.

- **Couche commune** : **① KB → ② Suggesteur → ③ Design (skills)**.
- **Workflow par article** : `INPUT → ANALYSE → CADRAGE → PROPOSITION (vetoable, pas de gate) → PRODUCTION → EXPORT (fichier possédé)`. Validation sur le **visuel produit**, jamais sur un plan abstrait.
- **Taxonomie moteurs/formats (à ne pas confondre)** : les **moteurs** sont `chart-native` et `map-native` (+ `dw-chart` pour le statique Datawrapper). Chaque moteur produit 3 **formats** : **statique** (image) · **interactif** (web) · **vidéo**. L'**interactif** a 2 **sous-formats** : *explore-libre* (pan/zoom/hover) et **scrolly** (scroll). `skills/scrolly` n'est que le **mécanisme** partagé (orchestrateur qui pilote le renderer d'un moteur) — PAS un moteur pair ; le format « interactif-scrolly » appartient au moteur hôte et **hérite** de sa furniture (titre/description/source). La furniture se définit **par moteur**.
- Détail complet → la spec-parapluie.

## Ce qu'on produit (workflow / orchestration / skills)

- **Workflow** = la boucle journaliste (6 étapes ci-dessus).
- **Orchestration** (le cerveau, la partie neuve) = **① KB** (le savoir rangé) + **② Suggesteur** (décide *où/quel* visuel sert le récit, garde-fous, dispatche vers le bon skill).
- **Skills** (les mains) = **③** ~11-15 exécuteurs (la grille type × format). Deux moteurs :
  - **Datawrapper** (mince) → charts standards, statique + interactif léger.
  - **D3 / Remotion / MapTiler / Cesium** (épais) → vidéo, interactif riche, maps.
  - Chaque skill applique le même savoir : **`KB (global) × fiche du type (précis) × discipline du format`**. Le moteur change, le savoir non.

## Décisions verrouillées (log)

- **2026-06-14** — Archi ①②③ ; flow par article ; install 1× puis boucle.
- **2026-06-23** — **Tiers supprimés : tout gratuit.** Plus de BASIC/PRO. ② propose juste le meilleur visuel. Revenu = consulting/intégrations/formations.
- **2026-06-23** — **Distribution façon Mycroft** : skill installable + page d'install qui génère un script `.command` (zéro terminal). **Pas de website.** Sous-chantier « Website » → « Installeur ».
- **Export** = tout = fichier que la rédaction possède (HTML autonome / mp4 / image). Self-host fly = optionnel (dynamique lourd), pas un paywall.
- **Savoir à 2 grains** : *global* (transversal : couleur, typo, a11y, narration) + *par-type* (fin : 1 fiche par type FT, comme la map a sa fiche geo-prep). Les **skills** se groupent au grain du moteur (~11 groupes couvrent ~55 types FT), pas 1 skill par type.
- **Maps** : factoriser **une couche geo-prep commune** (correctness de base) partagée par les renderers static/interactif/vidéo. Tom la duplique dans ses 2 skills car il n'avait besoin que de la vidéo.
- **Datawrapper vs D3** : Datawrapper = charts standards (rendu délégué = mince, mais **savoir complet** appliqué via ses réglages) ; D3 = **un cœur de géométrie pur → 3 sorties** (static + interactif + vidéo), réservé aux cas vidéo / interactif-riche / custom. Prouvé par le pilote (`chart-geometry.ts` pur → rendu Svelte + snapshot + Remotion).
- **2026-06-23 — Datawrapper reste la base des charts** (décision Rémy). Tension souveraineté reconnue (SaaS cloud propriétaire vs ADN local-first). **Mitigation obligatoire** : le skill Datawrapper produit **toujours un export statique possédé** (SVG/PNG) en fallback → la dépendance SaaS ne « rot » jamais l'archive.
- **2026-06-23 — Build = tranche verticale sur Annemasse d'abord**, PAS la KB complète. On valide la boucle `KB minimale → ② minimal → 1 skill → export` sur **un cas réel d'Annemasse** avant de scaler la KB (13 synthèses) et la grille (55 types). De-risque ② (le vrai risque produit). La spec KB complète (`2026-06-23-knowledge-base-design.md`) reste la cible, construite à rebours de ce qui sert réellement.
- **2026-06-23 — Tranche 1 (dw-chart) LIVRÉE + vérifiée** (branche `feat/slice-1-datawrapper-chart`). Boucle ②→dw-chart→export prouvée sur 9 types via vraie API ; multi-séries (couleurs+transpose) corrigé après vérif visuelle. 20/20 tests. Le seam `Spec→mapper→client→produce` est le template des prochains skills.
- **2026-06-23 — On va plus loin qu'Annemasse.** Décision Rémy : construire la **couverture chart complète** (24 types DW) + les **best-practices câblées en garde-fous** (pas juste des docs), parce que le livrable bourse inclut **Atelier en open-source MIT pour toutes les rédactions**, pas seulement le pilote. Spec : `2026-06-23-slice-1.1-full-coverage-and-guardrails.md`. Ce n'est PAS du sur-build — c'est le livrable produit #2.

## Ordre de construction (sous-chantiers)

1. **① KB** — *fondation, tout en dépend.* ← **PROCHAINE ÉTAPE**
2. **② Suggesteur** — le cœur neuf, dépend de ①.
3. **③ Câbler les skills** — archétypes largement existants (viznews-lib), câbler pas réinventer.
4. **Livraison** — export fichiers + self-host fly optionnel.
5. **Installeur** — page façon Mycroft + packaging agnostique runtime.

## La KB — 4 corps de sources (digest de session déjà fait)

- `~/Downloads/viz-research` — 26 PDFs académiques. **Pépites** : Segel & Heer (7 genres + axe auteur↔lecteur), Hullman & Diakopoulos (rhétorique viz), Lee 2015 (process VDSP), McKenna 2017 (7 flow-factors scrolly), Zhi 2019 (linking/layout), Amini 2015 (grammaire EIPR vidéo), Chang & Ungar (motion Disney), Boy 2017 (anthropographics). À jeter : DNI report, Data Analytics Week 2.
- `~/Downloads/Archive (1)` — 16 notes Tom (graphe Obsidian). Hub = `narrative-visualisation`, épine = explanatory↔exploratory. Frameworks nommés à préserver verbatim (Three Schools of Visual Trust, Constrained Exploration…).
- `vizualisation-skill/corpus` — recherche existante DÉJÀ synthétisée + créditée : **FT vocab + data-to-viz + académique + design-principles** (40 sources). Couvre le craft/chart.
- **Web** — FT Visual Vocabulary = **la bible** ; data-to-viz **crédité** ; firecrawl non connecté → WebSearch/WebFetch.
- **Crédits obligatoires.** KB structurée pour **retrieval** (références courtes autonomes + sections atomiques chunkables RAG), pas un tas de notes.

## Où vivent les choses

- **`/atelier` (ce repo) = le home.** Specs + planification + (à venir) le code Atelier.
- **`vizualisation-skill` = ancien repo** : le `corpus/` (source KB), les archétypes/skills existants (viznews-lib), le **pilote `chart-annotated`** (preuve de contrat skill-autonome), les digests de session.
- **Skills de référence de Tom** : `~/Downloads/cesium-flyover` (flyover 3D vidéo), `~/Downloads/map-animation/map-explainer` (map 2D vidéo). Modèle du format skill-autonome.

## État actuel / prochaine étape

- Architecture révisée et à jour (spec-parapluie, sans tiers, Mycroft).
- Grille type × format migrée ici → `docs/atelier/visual-element-grid.md`.
- Spec ① KB écrite (`docs/superpowers/specs/2026-06-23-knowledge-base-design.md`) — la cible complète.
- **Tranche 1 (dw-chart) + Tranche 1.1 (22 types + garde-fous) : LIVRÉES + MERGÉES dans `main`.** 32 tests vraie API. Le moteur chart est complet et conforme.
- **Spec ② suggester runtime écrit** (`docs/superpowers/specs/2026-06-23-suggester-runtime-design.md`) : ② = l'agent-hôte ; 1er cut `données+intention → ChartSpec` ; **harness d'éval** (scoreSpec déterministe + LLM-juge) = l'instrument du risque-produit. Design approuvé.
- **② suggester runtime + eval harness (1er cut) : LIVRÉ** sur branche `feat/suggester-runtime` (à reviewer, pas mergé). `suggest-chart/SKILL.md` a la procédure runtime (6 étapes + no-chart) ; `skills/suggest-chart/eval/` = `family-types.ts` (FAMILY_TYPES) + `score.ts` (scoreSpec) purs (8 tests bun:test) + 8 cas (dont 1 no-chart) + `judge.md` + `run.md`. **Baseline éval : pass 8/8, mean titleIsInsight 0.93, mean choiceSound 0.96** (`eval/baseline-report.md`) — au-dessus du seuil, pas d'itération nécessaire. Choix : eval sous `suggest-chart/` (mesure ②, pas le producteur). Les 32 tests dw-chart restent verts.
- **PROCHAIN** : cuts suivants ② — `article → où/quel` ; puis maps ; puis vidéo.

## Conventions

- **★ Boucle feedback → système (principe de travail, toujours en tête).** Chaque retour utilisateur sert à améliorer le **SYSTÈME** pour produire de meilleurs éléments visuels à l'avenir — pas seulement à corriger l'exemple courant. Donc à chaque retour : (1) le corriger sur l'exemple ET vérifier **au rendu** ; (2) le **graver au niveau système** — code partagé des moteurs (core/conformance/audit), `SKILL.md`, et la référence best-practices concernée (`docs/atelier/*`, `skills/*/references/*`) — pour que **tous les futurs types/modules en héritent** ; (3) si le retour révèle une règle générale (best practice), la **vérifier groundée** (sources réelles) avant de l'inscrire. Un fix qui ne touche que l'exemple est incomplet.
- Code, commentaires, identifiants, commits, branches : **anglais** (standard non-négociable).
- **Pas de mention Claude/Anthropic** dans les artefacts publiés (commits, PRs, docs).
- Runtime **Bun**. Tests `bun:test`, TDD.
- **Format skill-autonome** (canon Tom) : `SKILL.md` (8 sections : Overview · When to use · gotcha · Architecture · How it works · Quick start · Tuning knobs (chacun = un nombre) · Files) + `references/` + `scripts/` (prep déterministe) + `assets/` (1 composant battle-tested + sample-data + preview) + `output-proof`.
- Discipline vidéo (bug-free, façon Tom) : stack en couches · **frame-gating** sur la vraie disponibilité · données pré-cuites · valider 1 still avant le mp4 · plomberie (`preserveDrawingBuffer`, `--gl=angle`, timeouts).
</content>

## État 2026-06-23 (fin de session)
- **MERGÉ dans `main`** : Tranche 1 (boucle dw-chart) + Tranche 1.1 (22 types + garde-fous) + **② suggester runtime + harness d'éval**.
- ② : procédure runtime dans `suggest-chart/SKILL.md` ; éval `skills/suggest-chart/eval/` (scoreSpec pur + family-types + 8 cas + judge.md). Baseline auto-noté : 8/8 gate, 0.93/0.96 éditorial. **Lien ②→dw-chart prouvé live** (`eval/e2e-proof.md`, chart publié réel).
- **Caveat honnête** : baseline auto-noté (② = juge), à re-valider sur des cas non écrits-pour-réussir.
- **Prochains cuts** : ② `article → où/quel` (lecture d'article) ; puis le skill **map** (couche geo-prep commune + renderers static/interactif/vidéo) ; puis vidéo. Le seam `Spec→mapper→client→produce` est le template.

## Cadrage 2026-06-23 — ON CONÇOIT POUR TOUTE PETITE NEWSROOM (pas Annemasse)
**Décision Rémy, prioritaire :** Atelier se construit pour **toutes les petites rédactions, génériquement**. Annemasse = le livrable-pilote de la bourse, PAS une contrainte de design ni une dépendance de validation. **Ne PAS attendre de retours de Heidi/Annemasse.** Les corpus d'éval (ex. gold-standard du cut lecture-d'article) sont **rédigés par nous, sur des articles-types génériques, ancrés dans les best-practices (la KB)** — assumé auto-référentiel, mitigé par le grounding best-practice ; le harness est un instrument d'amélioration *relative*, pas de vérité absolue.

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
