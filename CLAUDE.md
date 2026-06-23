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
- **PROCHAIN** : écrire la **spec ① KB** dans ce repo, alignée (sans tiers, RAG, crédits, 4 sources, structure = graphe de Tom + trous web), puis plan → build.

## Conventions

- Code, commentaires, identifiants, commits, branches : **anglais** (standard non-négociable).
- **Pas de mention Claude/Anthropic** dans les artefacts publiés (commits, PRs, docs).
- Runtime **Bun**. Tests `bun:test`, TDD.
- **Format skill-autonome** (canon Tom) : `SKILL.md` (8 sections : Overview · When to use · gotcha · Architecture · How it works · Quick start · Tuning knobs (chacun = un nombre) · Files) + `references/` + `scripts/` (prep déterministe) + `assets/` (1 composant battle-tested + sample-data + preview) + `output-proof`.
- Discipline vidéo (bug-free, façon Tom) : stack en couches · **frame-gating** sur la vraie disponibilité · données pré-cuites · valider 1 still avant le mp4 · plomberie (`preserveDrawingBuffer`, `--gl=angle`, timeouts).
</content>
