# Atelier — storytelling visuel open source pour chaque rédaction

> **Reprise de session :** lis CE fichier en entier + `git log --oneline -15`. Le contexte courant tient
> ICI (état de `main` + roadmap, section « État courant » ci-dessous). Le **journal daté** des sessions
> passées est dans `docs/atelier/CHANGELOG.md` (log historique — des chiffres anciens y sont périmés).
> Spec-parapluie : `docs/superpowers/specs/2026-06-14-atelier-architecture-design.md`.
> (Mémoire Claude Code : non portable — la source de vérité, c'est ce CLAUDE.md + le CHANGELOG + les specs.)

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

## Conventions

- **★ Boucle feedback → système (principe de travail, toujours en tête).** Chaque retour utilisateur sert à améliorer le **SYSTÈME** pour produire de meilleurs éléments visuels à l'avenir — pas seulement à corriger l'exemple courant. Donc à chaque retour : (1) le corriger sur l'exemple ET vérifier **au rendu** ; (2) le **graver au niveau système** — code partagé des moteurs (core/conformance/audit), `SKILL.md`, et la référence best-practices concernée (`docs/atelier/*`, `skills/*/references/*`) — pour que **tous les futurs types/modules en héritent** ; (3) si le retour révèle une règle générale (best practice), la **vérifier groundée** (sources réelles) avant de l'inscrire. Un fix qui ne touche que l'exemple est incomplet.
- Code, commentaires, identifiants, commits, branches : **anglais** (standard non-négociable).
- **Pas de mention Claude/Anthropic** dans les artefacts publiés (commits, PRs, docs).
- Runtime **Bun**. Tests `bun:test`, TDD.
- **Format skill-autonome** (canon Tom) : `SKILL.md` (8 sections : Overview · When to use · gotcha · Architecture · How it works · Quick start · Tuning knobs (chacun = un nombre) · Files) + `references/` + `scripts/` (prep déterministe) + `assets/` (1 composant battle-tested + sample-data + preview) + `output-proof`.
- Discipline vidéo (bug-free, façon Tom) : stack en couches · **frame-gating** sur la vraie disponibilité · données pré-cuites · valider 1 still avant le mp4 · plomberie (`preserveDrawingBuffer`, `--gl=angle`, timeouts).

## ★ État courant — 2026-07-09 (LIS CECI pour l'état de `main`)

`main` (voir `git log --oneline -15` pour le HEAD exact), gate `bun run check` **16/16 vert** (tsc 4 skills + install, 11 suites de test). 0 mention vendor attributive, 0 `any` introduit. Le **journal daté complet** de comment on est arrivé là = `docs/atelier/CHANGELOG.md`.

**Ce qui est construit et vert :**
- **Chaîne canal→format→taille→sous-format→export COMPLÈTE** (Slice 1 décision + Slice 2 rendu) : social-vertical → vrai 9:16, feed → carré, article-web → paysage/interactif ; hors-embed⇒jamais interactif enforced ; taille rendue == canal (fail-hard). Source unique `skills/atelier/src/channel.ts`.
- **chart-native : 26 types natifs atteignables** de bout en bout (article→type→3 formats). **map-native : 7 types**, dark-mode complet sur static/interactif/vidéo/scrolly.
- **Enforcement mécanique orchestrateur slice 1+2** : gate fail-hard `isFormatAllowed`, garde aspect↔type au produce, producer-match, rejet TLD placeholder, ré-application au produce des garde-fous déterministes de suggest-chart (`guardrail-parity.ts`).
- **Filet deep-verify MÉCANIQUE** (`../atelier-harness/scripts/deep-verify.mjs`) : ouvre interactif/scrolly et teste ce qu'un juge aveugle-aux-pixels rate (tooltip in-viewport · scrolly intro≠takeaway · fuite langue · hover). Parade systémique aux misses de vérif.
- **Bugs QA corrigés + deep-verifiés** (tooltip hors-fenêtre flip/clamp · labels rotés coupés tronqués · hover masqué small-on-top+nearest · CSV RFC4180 quoted · scrolly intro≠outro+noms FR+ramp subject-fit · dense-symbol snap-a11y prose · popup choroplèthe localisé).
- **Produce channel-gated** : les producteurs ne buildent plus l'interactif (ni ses snaps) quand le canal l'interdit (social → static.png seul ; article-web → interactif inchangé). Fin de l'over-produce.

**Principe de travail (toujours) :** boucle feedback→système (cf. Conventions) + **toujours vérifier le LIVRÉ, pas le proof** (leçon gravée : ouvrir/hover/lire l'artefact réel ; le proof peut mentir — interactif pré-hover, reveal non-coloré).

**PROCHAIN / backlog :** capture source (persona/article → prose au lieu de la vraie source = flow/orchestration, pas mécaniquement fixable proprement) · Family B types natifs (15 déférés par design) · **release MIT** (confirmer REPO_URL public + scrub trailers `<vendor>-Session` — besoin de l'input Rémy + destructif, au pré-release) · le harness QA privé = `../atelier-harness` (WORKFLOW.md + `scripts/deep-verify.mjs`).
