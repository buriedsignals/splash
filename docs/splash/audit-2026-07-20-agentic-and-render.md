# Audit & benchmark — agentique + rendu (2026-07-20)

> Audit à deux volets, croisant **recherche externe** (best-practices agentiques + réfs pro dataviz) et
> **audit interne du code** (archi/structure + fiabilité/QA). Méthode : 5 agents parallèles en lecture seule,
> chacun sourcé (URLs externes, `file:line` internes). Ce doc est la synthèse.
>
> Commande d'origine : « auditer/benchmarker des outils agentiques populaires + les best-practices de création
> de skill/orchestration/tooling, pour voir comment refacto et améliorer Splash — code, archi, structure,
> qualité de rendu, fiabilité. » Périmètre retenu : les deux (stack Anthropic + frameworks généraux) + rendu
> en volet séparé, multi-format (statique/interactif/vidéo).

---

## 0. Le recadrage (à lire en premier)

La discussion partait d'une question : **faut-il découpler Splash en skills autonomes (option « B »)** façon canon Tom (SKILL.md + scripts + assets self-contained, quitte à dupliquer le savoir) ?

**L'audit du code inverse la question.** Le « cœur partagé » que le CLAUDE.md décrit (`core/text.ts`, contraste WCAG, `deriveFurniture`, conformance) **n'existe pas au niveau inter-moteurs**. Il est **copié-mirroré à la main** :

- `chart-native/src/core/conformance.ts` (1 892 LOC) vs `map-native/src/conformance.ts` (754 LOC) vs `scrolly/src/conformance.ts` — le header de map-native dit verbatim *« Shared L0 … (mirrors chart-native's…) »* : **mirroré par copie, pas importé.**
- `deriveFurniture` défini **deux fois** (`chart-native/src/core/tokens.ts` + `map-native/src/theme/map-tokens.ts`).
- Contraste WCAG dupliqué (`chart-native/src/core/contrast-scan.ts` vs `dw-chart/src/contrast.ts`).
- `video-verify`, `locale`, `furniture-i18n` : tous mirrorés, header à l'appui.
- La colonne `skills/splash` **reach dans les `src/` internes** de chaque moteur via chemins relatifs profonds (`../../chart-native/src/…`), sans frontière de package.

**Conséquence directe : la convention n°1 « boucle feedback→système » (graver un fix une fois pour que tous les types héritent) est structurellement IMPOSSIBLE aujourd'hui.** Il n'y a pas de « niveau système » unique — il y a **4 quasi-cœurs dupliqués** + un couplage sale. Chaque fix WCAG/thème/i18n doit être re-propagé à la main à 3-4 copies ; les commentaires « mirrors… » sont du texte porteur, pas du code contraint.

Donc Splash est aujourd'hui dans le **pire des deux mondes** :

| | Bénéfice recherché | Splash aujourd'hui |
|---|---|---|
| Monolithe intégré | source unique de vérité (fix once) | ❌ pas de source unique (dupliqué) |
| Skills autonomes (B) | frontières propres, pluggable | ❌ couplage sale (reach dans `src/`), 7-site shotgun pour ajouter un moteur |
| Coût | — | ✅ paie le coût de duplication **ET** le coût de couplage |

**Verdict : B (plus de découplage) est exactement le mauvais remède.** La cure est l'inverse — **construire le vrai cœur partagé** que tout le monde (docs incluses) croyait déjà là, derrière une **interface propre + un registre de producteurs**. Ça rend `feedback→système` réel, ça ouvre la couture contributeur (Tom), et **ça réduit le code**.

Point remarquable : les 5 agents convergent sur cette même direction (voir §3).

---

## VOLET A — Agentique (code · archi · orchestration · fiabilité)

### A1. La topologie est BONNE — ne pas y toucher

Splash = **Routing → orchestrator-workers** dans le vocabulaire d'Anthropic (*Building Effective Agents*). C'est le pattern canonique pour « des catégories distinctes mieux traitées séparément ». Validé aussi par le **contre-exemple** : l'archi manager-worker hiérarchique de CrewAI *« échoue comme documenté »*, dégrade en séquentiel + latence ([Towards Data Science](https://towardsdatascience.com/why-crewais-manager-worker-architecture-fails-and-how-to-fix-it/)).

- Le renversement single-format 2026-07-10 (`spec.format` pinné à la proposition, un élément = un format) est le **bon move** : il transforme le format en **arête déterministe**, pas un choix du modèle. Confirmé dans le code (`producer-spec.ts:11`, union fermée, enforced au gate).
- **Ne PAS** adopter de boucle conversationnelle multi-agent / supervisor / swarm / handoff : ça ajoute de la surface d'erreur composée pour zéro bénéfice sur un dispatch one-shot.
- Décision = model-driven (`suggest-chart/SKILL.md` prose) ; routing/enforcement = code déterministe (`produce-all.ts`, `adapters.ts` switch sur `p.producer`). Ce split est sain.

**Source :** Anthropic *Building Effective Agents* (routing, orchestrator-workers) ; *Multi-Agent Research System* (multi-agent réservé au breadth-first, pas au travail couplé).

### A2. La vraie maladie : pas de cœur partagé + couplage sale

(cf. §0.) Les findings de couplage, du plus serré au plus lâche :

1. **L'orchestrateur reach dans les `src/` internes** de chaque moteur via chemins relatifs profonds (`adapters.ts:72-76`, `validate-gate.ts:7-26`, `guardrail-parity.ts:27-32`). Renommer un fichier moteur casse la colonne en silence.
2. **Ajouter un producteur = éditer ~7 sites hard-codés** : union `Producer` (`producer-spec.ts:4-5`) + `validate-gate.ts` + `adapters.ts` (`isFileBased`, `SCRIPT`, `SKILL_DIR`, switch `realDispatch`) + `producer-guard.ts` + `guardrail-parity.ts` + `brand-profile.ts` + `export-code.mjs`. **Pas de registre** → shotgun edit.
3. **`scrolly` hard-importe les composants concrets** de chart-native/map-native (`../../chart-native/src/BarChart`, etc., ~20 arêtes) — structurellement un sous-module des deux moteurs, pas un pair.
4. **Conformance/thème/contraste/video-verify dupliqués à la main** → `feedback→système` cassé (§0).
5. **Deux modèles d'exécution dans un dispatcher** : natif = sous-processus (`SPLASH_CHANNEL` env), DW = import in-process. Error-handling/timeout/threading différents par moteur (`adapters.ts:314-376`).

**Ce qu'il manque pour une frontière plugin propre** (et pour accueillir le skill de Tom) :
- (a) un **package cœur publié** (contraste/thème/texte/conformance/locale/video-verify) que les moteurs **dépendent** au lieu de copier ;
- (b) un **registre de producteurs** data-driven (manifeste : `name → spec-validator → produce-entry → format-set`) → ajouter un moteur = **un fichier, pas sept** ;
- (c) un **contrat d'interface** spec-in/artefact-out stable au lieu du reach `src/` ;
- (d) **un seul** modèle d'exécution.

**Convergence externe :**
- Anthropic best-practices (agent 1) : garder le cœur partagé pour la correctness **mais comme un package de workspace** ; **ne PAS** l'inliner-dupliquer dans chaque skill « pour l'autonomie » — ce serait réintroduire exactement la divergence que le cœur évite. Déviation défendable au canon skill-autonome *parce que* le cœur encode une correctness transversale qui ne doit pas forker.
- Frameworks (agent 2) : le **manifeste de skill type-MCP** est le standard 2025-26 pour qu'un tiers ajoute un moteur découvert dynamiquement sans toucher au cœur (modèle Cline MCP Marketplace). Le « format skill-autonome » de Splash **est déjà** un manifeste plugin type-MCP — le formaliser comme contrat publié. Le Suggesteur route par capacité, ne voit jamais les internes de Tom.
- **Contrats typés zod** (`inputSchema`/`outputSchema`, Vercel AI SDK 6 / Mastra) : c'est LE pattern TS-natif pour Splash. Chaque moteur = contrat spec-in/artefact-out validé zod → machine-checkable à chaque frontière de dispatch, et c'est la couture contre laquelle un contributeur code.

### A3. Les descriptions de skill fuient le workflow (cause mécanique probable d'un bug récurrent)

superpowers a **mesuré** qu'une `description` qui résume le workflow fait *suivre la description* à l'agent et **sauter le corps du skill** (un agent faisait une review au lieu de deux). Les descriptions `splash` (« Sequences ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT… ») et `suggest-chart` (« Routes to dw-chart… chart-native… ») sont **exactement** ce piège — plausiblement une **cause mécanique de la classe récurrente « l'orchestrateur improvise / saute un gate »** que le CLAUDE.md traque depuis des semaines.

**Fix :** réécrire les descriptions en **déclencheurs-seuls** (« quoi + quand »), retirer la séquence/recette. Garder les listes de mots-clés (bon pour la découverte). Cheap, fort impact.

**Source :** superpowers `writing-skills/SKILL.md` ; Anthropic agent-skills best-practices (#writing-effective-descriptions).

### A4. Deux SKILL.md obèses ; pas de commands/ ni de catalog

- `skills/splash/SKILL.md` (736 L) et `skills/suggest-chart/SKILL.md` (845 L) dépassent le budget ~500 lignes / 5k tokens → chaque invocation paie plein pot et concurrence le contexte de conversation. **Comparaison cruelle : ton propre `viznews-convert` fait le routeur en 76 lignes.**
- **Progressive disclosure** : déplacer matrices format-selection, catalogues de guardrails, exemples worked dans des `reference/*.md` **un niveau de profondeur**, groupés par domaine (chart/map/format). Garder L2 = table des matières navigable.
- Splash n'a **ni `commands/`** (aucune slash-command → installabilité/découvrabilité repose entièrement sur la description model-invoked) **ni catalog skill** (`using-splash`) marquant les skills internes (« Internal. Never user-invoked. »). viznews fait les deux.

**Source :** Anthropic best-practices (#token-budgets, #domain-specific-organization) ; viznews `using-viznews`, `commands/`.

### A5. Fiabilité : la vérification doit être souveraine, le juge seulement conseil

Le harness (`../splash-harness`) est solide dans sa charpente : boucle A↔B qui spawn le vrai binaire `claude` headless comme acteur dans un **worktree jetable** (parce que Splash hot-patch sa propre source), persona-journaliste, **21 checks mécaniques déterministes** + **1 appel juge LLM**, ledger JSONL, fixer one-shot qui **ne merge jamais**. « Delivered » est un prédicat mécanique, pas un jugement — bien.

**Mais les risques sont réels et documentés :**
- **Juge unique, sans consensus/retry/self-consistency** (`judge.ts:265`). Un juge en timeout **annule silencieusement le scoring**. Faux positifs documentés : « 290 % » (DW append `%` sans multiplier, render-vérifié correct), tokens d'âge lus comme valeurs, description hosted-DW **hallucinée** par WebFetch, « 8 criticals » = artefacts de contention.
- **`deep-verify.mjs`** (le filet mécanique pixel/interaction) est **opt-in / opéré à la main**, PAS câblé dans le `run-e2e.mjs` automatisé → les régressions d'interaction dépendent de la discipline humaine.
- **Les snap-guards de rendu** (`snap-contrast`, `snap-label-fit`, `snap-video`) ne tournent **que dans `produce.mjs`**, jamais dans le gate CI → `bun run check` (et la CI GitHub) peuvent être **verts pendant qu'un chemin de rendu est cassé**.
- **map-dw = moteur le moins gardé** : 1 427 LOC, **7 `throw` en tout**, zéro contrast/conformance/label-fit/snap. Il ship pourtant aux rédactions.
- Biais rubrique : `single-proposal-no-alternatives` **hard-forcé à `[major]`** chaque run « comme pression sur le backlog » → gonfle les compteurs par design.

**Best-practices (agents 2+5) :**
- **La vérification bat le jugement pour tout objectif.** Tous les « le juge peut mentir » gravés étaient des propriétés **objectives jugées sémantiquement** (export-skipped, always-purple par grep de bundle). Rendre les **checks déterministes sur l'artefact** (contraste sur PNG rendu, valeur du cœur géométrique, inspection filesystem du `-export`) **souverains** ; le juge LLM seulement **conseil** sur les axes vraiment sémantiques. C'est `deep-verify.mjs` promu au rang de gate.
- **Calibrer + cross-family le juge** : ne jamais juger avec la même famille de modèle que le générateur ; **pairwise** avec alternance d'ordre (tue le biais de position) ; **rubriques par-format** (chart-statique ≠ map-scrolly ≠ vidéo) ; audit **kappa vs humain** sur 100-300 traces (cible >0,6). Structured Outputs pour la sortie juge (le CLAUDE.md note « parfois non-parseable »).
- **Golden-dataset regression gate** : figer N cas avec rendus known-good, rejouer à chaque change, gate le merge sur régression. Tu as le corpus (Annemasse, suite 80 cas). Transforme les « waves » ad-hoc en CI.
- **Trajectory-aware eval** : asserter *quel* format pinné, *quel* exécuteur, dans quel ordre, avec quels args — attrape la classe « intention de format non honorée » que le jugement d'artefact final rate.

**Sources :** [rmax harness-engineering](https://rmax.ai/notes/harness-new-model-agent-systems-2026/) (+14pts Terminal-Bench sans changer de modèle, en durcissant le harness déterministe) ; [futureagi LLM-judge](https://futureagi.com/blog/llm-as-a-judge/) ; Anthropic *demystifying-evals* ; [Maxim golden-dataset](https://www.getmaxim.ai/articles/building-a-golden-dataset-for-ai-evaluation-a-step-by-step-guide/) ; [DeepEval eval-harness](https://deepeval.com/blog/what-is-an-eval-harness).

### A6. Prêt pour la release MIT (Sept-Oct 2026)

`plugin.json` en `0.1.0`, manque `keywords`/`repository`/`homepage`/`license: MIT`. Pas de semver réel (sans `version`, chaque commit git = une version = churn). Ajouter, bumper, `claude plugin validate` avant soumission au marketplace communautaire (SHA-pinné, safety-screené). **Prérequis direct du livrable bourse.**

Hygiène : `dist/` build artifacts committés dans `skills/map-native/dist/` (~200k LOC de bundles Vite polluant les greps) ; alias env `SPLASH_*`/`ATELIER_*` dans ≥9 fichiers (poids mort post-rename) ; `config.json` est un **dossier** au top-level (accidentel probable).

---

## VOLET B — Qualité du rendu (3 formats)

Livrable clé : **3 rubriques scorées 0-100**, chaque critère = un test vérifiable + sa réf pro. `[M]` mécanisable · `[H]` œil éditorial · `[M+H]` partiel. (Tableaux complets dans le rapport de l'agent 3 — reproduits ci-dessous en condensé ; poids sommant à 100/format.)

### Rubrique STATIQUE (chart/carte image)
S1 type↔intention FT `[M+H]` · S2 canaux haute-précision (position/longueur, pas angle/aire ; pas de pie >4, aire∝valeur) `[M]` · S3 échelles honnêtes (baseline zéro barres/aires, lie-factor≈1) `[M]` · S4 **titre = takeaway assertif, pas le sujet** `[H]` · S5 labeling direct, rien de clippé `[M]` · S6 couleur signifiante+CVD-safe+WCAG `[M]` · S7 annotation porte le « so what » `[M+H]` · S8 source/unité/date/alt-text `[M]` · S9 haute data-ink `[M+H]`.
*Réfs : FT Visual Vocabulary · Cleveland & McGill 1984 · Tufte/Cairo · data-to-viz · Datawrapper Academy · WCAG.*

### Rubrique INTERACTIF/SCROLLY
I1 ne jamais scrolljacker `[M]` · I2 beats discrets, pas de scrubbing 1:1 `[M]` · I3 **chaque beat ≠ voisins ; intro ≠ takeaway** `[M+H]` · I4 transitions signifiantes + object constancy (pas de teleport) `[M]` · I5 affordances hover/tooltip découvrables + in-viewport (touch → annotation fixe) `[M]` · I6 mobile-first responsive, rien de clippé `[M]` · I7 genre auteur↔lecteur cohérent `[H]` · I8 **`prefers-reduced-motion` + fallback statique** `[M]` · I9 furniture statique survit à chaque état `[M+H]` · I10 lisibilité de progression `[M]`.
*Réfs : Pudding/Goldenberg · scrollama · McKenna 2017 · Segel & Heer 2010 · WCAG 2.3.3.*

### Rubrique VIDÉO/MOTION
V1 **arc E→I→Peak→Release** (pas un data-dump plat) `[H]` · V2 frame-gating sur dispo réelle (idle OU settle-timeout, anti-hang) `[M]` · V3 reveal étagé, une idée à la fois, labels persistent `[M+H]` · V4 object constancy inter-scènes (tween, pas cut) `[M]` · V5 pacing lisible (≥~2s, motion = sens pas déco) `[H]` · V6 timing d'annotation synchronisé `[M+H]` · V7 **valider 1 still (dont `--frame=-1`) avant l'mp4** `[M]` · V8 accessibilité motion (essential-motion exception, pas de flash>3/s) `[M]` · V9 lisible sur l'aspect pinné `[M]`.
*Réfs : Amini 2015 (grammaire E/I/P/R) · Chang & Ungar (motion Disney→UI) · WCAG 2.3.1/2.3.3.*

### Les axes NON-mécanisables → gate éditorial humain (réponse à « est-ce vraiment bon ? »)
Aucun code ne juge : **(1) titre = la bonne assertion** supportée par les données · **(2) palette adaptée au sujet** (vert=renouvelables, charbon foncé, rouge≠croissance-est-bien) · **(3) cadrage honnête** (choix du dénominateur, fenêtre temporelle, per-capita vs absolu) · **(4) type défendable pour l'argument** · **(5) qualité de l'arc narratif** (le Peak est-il *le bon* Peak) · **(6) annotation dit le vrai et le pertinent**.

**Comment les rédactions pro les gèrent : revue éditoriale humaine, pas d'automatisation.** FT « Chart Doctor » (le Visual Vocabulary est un artefact de *formation/revue humaine* d'une rédaction, pas un linter) · NYT graphics desk (revue multi-personnes itérative avant publication) · The Pudding (le mobile-first comme *forcing function* éditoriale). **Recommandation : gate éditorial nommé, non-skippable** (« Confirme que ce titre EST le takeaway », « Confirme que cette palette sert le sujet »), **loggé comme décision humaine** — c'est le pattern CADRAGE Gate-1b généralisé.

### Modes d'échec « amateur » les plus courants (avec le fix)
Statique : pie multi-tranches → barres · baseline tronquée → zéro · légende round-trip → labels directs · rainbow sur données ordonnées → rampe séquentielle · titre-sujet → titre-assertion · bulle rayon∝valeur / 3D → aire∝valeur.
Scrolly : scrolljack → monitor jamais altérer · scrubbing qui saccade → beats discrets · tooltip hors-viewport / hover-only mobile → flip-clamp + annotation fixe · beats répétitifs → prose+état distincts · cuts durs → transitions object-constant · pas de reduced-motion → fallback.
Vidéo : dump plat → arc E/I/P/R · frames partielles/hang → frame-gating borné · tout apparaît d'un coup → reveal étagé · labels post-reveal → persistent · flashes trop rapides → dwell ≥~2s · fly-overs gratuits → motion seulement si sens.

---

## §3. Convergence des 5 agents

Les cinq analyses, externes et internes, pointent la même direction :

| Agent | Verdict propre | Pointe vers |
|---|---|---|
| Frameworks (2) | topologie routing-worker = bonne ; durcir le harness déterministe ; manifeste type-MCP | **cœur+registre+contrats, pas archi nouvelle** |
| Rendu (3) | rubriques mécanisables + axes éditoriaux irréductibles | **gate éditorial humain nommé** |
| Archi (4) | pas de cœur partagé (dupliqué), couplage star-into-`src/`, 7-site shotgun | **extraire le vrai cœur + registre** |
| Anthropic (1) | garder le cœur MAIS comme package workspace, ne pas inliner-dupliquer ; descriptions trigger-only | **cœur-as-package + hygiène skill** |
| Fiabilité (5) | vérif souveraine, juge conseil+calibré, deep-verify pas câblé, map-dw nu | **verification-first + golden gate** |

---

## §4. Feuille de route priorisée (impact ÷ effort)

### Tier 0 — cheap, fort impact (à faire en premier)
1. **Réécrire les descriptions de skill en déclencheurs-seuls** (retirer la séquence/recette). Cause mécanique probable de « l'orchestrateur improvise/saute un gate ». `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md` frontmatter. *[A3]*
2. **Câbler `deep-verify.mjs` dans `run-e2e.mjs` automatisé** (fin de l'opt-in humain). `../splash-harness`. *[A5]*
3. **Gate éditorial non-skippable pour les axes irréductibles** — champ `confirmedTakeaway` obligatoire dont le titre dérive ; confirm palette-sujet. Réponse directe à « est-ce vraiment bon ? ». *[B]*
4. **Enrichir `plugin.json` + semver réel** (keywords/repo/homepage/license MIT ; bump 0.1.0 ; `claude plugin validate`). Prérequis release. *[A6]*

### Tier 1 — le vrai refactor structurel (le cœur du sujet)
5. **Extraire un package cœur `@splash/core`** (contraste/thème/texte/conformance/locale/video-verify) que les moteurs **importent** au lieu de mirrorer. Tue la duplication, **rend `feedback→système` réel**, réduit le code. C'est la cure du §0. *[A2]*
6. **Registre de producteurs** data-driven (`name → validator → entry → formats`) remplaçant le 7-site shotgun ; ajouter un moteur = un fichier. Ouvre la couture contributeur (Tom en moteur enregistré, pas un fork). *[A2]*
7. **Un seul modèle d'exécution** (unifier natif-subprocess / DW-in-process) + **contrats spec-in/artefact-out validés zod** à chaque frontière. *[A2]*

### Tier 2 — profondeur qualité + fiabilité
8. **Câbler les 3 rubriques de rendu comme scores 0-100 dans le harness**, chaque critère émettant sa réf. « guardrails verts » → un *nombre de qualité* auditable. *[B]*
9. **Plancher de guardrails sur map-dw** (mirrorer produce-conformance + contraste). Moteur le plus nu. *[A5]*
10. **Snap contraste rendu pour map-native** (canvas readback Playwright) — le trou GL. *[A5]*
11. **Gates rendu manquants** : `prefers-reduced-motion`+fallback, transition/object-constancy scrolly+vidéo, invariant mobile-first, taxonomie FT machine-readable (intent→types autorisés). *[B]*
12. **Golden-dataset regression gate en CI** + lane `check:render` (un rendu golden par moteur) pour que la CI ne soit plus verte sur un rendu cassé. *[A5]*
13. **Juge : cross-family + pairwise + rubriques par-format + Structured Output + 2e juge sur les criticals seulement** + audit kappa humain. *[A5]*

### Tier 3 — packaging / hygiène
14. Splitter les 2 SKILL.md obèses en L2 + `reference/*.md` un niveau ; ajouter `commands/` (`/splash`) + catalog `using-splash`. *[A4]*
15. Purger `dist/` committés, retirer les alias `ATELIER_*`, corriger `config.json`-dossier. *[A6]*

**Note stratégique :** Tier 1 (5-6-7) est le plus haut levier *et* c'est une vraie décision d'archi — elle mérite son propre cycle brainstorming → spec → plan. Tier 0 est du quick-win indépendant, activable tout de suite. Tier 2 dépend en partie du Tier 1 (le gate éditorial et les rubriques sont plus propres une fois le cœur extrait).

---

## Annexe — sources primaires

**Agentique :** Anthropic *Building Effective Agents*, *Multi-Agent Research System*, *Writing Tools for Agents*, *Demystifying Evals* · platform.claude.com agent-skills {overview, best-practices} · code.claude.com {plugins, plugins-reference, agent-sdk/subagents, mcp} · OpenAI Agents SDK (handoffs/guardrails) · LangGraph (supervisor/checkpointing) · Mastra + Vercel AI SDK 6 (TS-natif) · rmax harness-engineering · futureagi + arXiv 2602.02219 (LLM-judge) · CrewAI manager-worker failure (TDS) · MCP spec.
**Rendu :** FT Visual Vocabulary (repo + PDF) · Cleveland & McGill 1984 · Cairo *Truthful Art* · data-to-viz caveats · Datawrapper Academy · Segel & Heer 2010 · McKenna 2017 · Pudding/Goldenberg + scrollama · Amini 2015 *Understanding Data Videos* · Chang & Ungar · WCAG 2.3.1/2.3.3 · Storybench (NYT desk review).
**Réfs d'implémentation locales :** superpowers `writing-skills/{SKILL.md, anthropic-best-practices.md}` · viznews `{using-viznews, viznews-convert}/SKILL.md`.
