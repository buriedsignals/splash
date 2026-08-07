# Splash — storytelling visuel open source pour chaque rédaction

> **Reprise de session :** lis CE fichier en entier + `git log --oneline -15`. Le contexte courant tient
> ICI (état de `main` + roadmap, section « État courant » ci-dessous). Le **journal daté** des sessions
> passées est dans `docs/splash/CHANGELOG.md` (log historique — des chiffres anciens y sont périmés).
> Spec-parapluie : `docs/superpowers/specs/2026-06-14-splash-architecture-design.md`.
> (Mémoire Claude Code : non portable — la source de vérité, c'est ce CLAUDE.md + le CHANGELOG + les specs.)

## Quoi / pourquoi (la bourse)

- Financé par la **bourse FJM** (juin 2026). Nom public : « Splash — storytelling visuel open source pour chaque rédaction ».
- **Renommage public en cours : « Splash »** (2026-07-11) — premier jet d'explication : `splash.buriedsignals.com` (Buried Signals). Tagline « Visual journalism for every newsroom ». Le repo/code garde `splash` jusqu'à décision de release. **La page publique PROMET** : chart-scrolly live · map-scrolly live · motion graphics **code-rendered** (Remotion/Cesium, « pas du screen recording ») · 4 formats via une pipeline unique · open source CMS-agnostic. Conséquence qualité : **vidéo + scrolly = promesses de vitrine publiques**, pas seulement livrable bourse — leur garde mécanique est prioritaire. (Gap promis-vs-codebase : Cesium flyover pas encore intégré aux moteurs — skill Tom séparé.)
- **But** : une petite rédaction non-équipée (pas d'équipe data/graphique) produit des visuels narratifs de qualité, juste en fournissant son article. Splash orchestre la production — il ne génère ni texte ni illustration ; l'intention éditoriale reste au journaliste.
- **Livrable Sept-Oct 2026** : enquête Heidi.news « Annemasse, capitale du n'importe quoi » publiée + sortie **GitHub MIT** + extension We.Publish + rapport d'apprentissage.
- **Équipe** : Yvan Pandelé (Heidi.news, lead édito), Rinny Gremaud (Heidi.news, narratif), Tom Vaillant / Buried Signals (dev sous-traitant) → **Rémy fait le dev**.

## L'architecture (3 couches)

Splash = **un skill open-source MIT, installable, agnostique runtime, local-first** (modèle Mycroft/Spotlight de Buried Signals). Pas de website hébergé, pas de backend.

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
- **2026-07-10 — EXPORT : le journaliste CHOISIT la forme** (met à jour la déc. 2026-06-23 « livrer les formes possédées d'office, ne pas demander quelle forme »). À l'export, splash PRODUIT tous les artefacts d'office (local-first préservé — les fichiers existent sur disque), PUIS **propose 3 formes et le journaliste en choisit une** (gate explicite non-skippable), livraison façonnée : **(1) Code source** = bundle React runnable (`<id>-source/` : copie `chart-native/src` + `config.json` + scaffold Vite → `bun install && bun run build` reproduit le visuel — **capacité neuve, build-vérifiée** ; chart-native seulement, map-native/scrolly/DW = dossier fichiers, follow-up *(périmé pour map-native/scrolly depuis le chantier bundle runnable ci-dessous, 2026-07-13 — DW reste dossier fichiers)*) · **(2) HTML autonome** = le seul `interactive.html` auto-contenu (JS inline ; `scrolly.html`/`static.html` selon le producteur) · **(3) Embed** = `deploy-embed` → URL fly.io (ou `publicUrl` DW déjà live). a11y : le no-JS `static.html` reste **dans** la forme 1 (dossier), assumé « waivé » si le journaliste prend la forme 2/3. Motivation : le « Livré. » nu (l'orchestrateur ne proposait les formes qu'à moitié) + Rémy veut un vrai choix. `export-code.mjs` **émet** la proposition (`EXPORT_FORMS_JSON` + bloc `a/b/c` prêt-à-relayer) → fiabilité mécanique.
- **2026-07-10 (soir) — RENVERSEMENT : un élément = un format, produit et livré seul** (spec `docs/superpowers/specs/2026-07-10-single-format-produce-export-design.md`, plan 7 tâches, branche `feat/single-format-produce-export`). Constat post-Wave 5 : le pipeline sur-produisait sur 2 axes — le producteur build `static+interactive+video` même quand un seul format sert l'élément, ET `export-code` matérialise toutes les formes de livraison d'office avant même le choix a/b/c. Cause racine : rien ne *pinne* l'unique format/forme défini — le pipeline produisait *tout ce qui est possible* au lieu de *ce qui est défini*. Modèle cible : `spec.format` = UN `VisualFormat` pinné à la PROPOSITION (Gate 2 existant, vetoable) ; `produce.mjs <type> <config> <outDir> <format>` ne build QUE ce format (chart-native/map-native/dw-chart) ; `assertDelivered(files, {format, form})` valide la forme livrée par format. **Deux décisions verrouillées renversées :**
  1. Le fallback no-JS `static.html` (mitigation a11y+souveraineté de la déc. 2026-06-23 « Datawrapper reste la base ») **n'est plus auto-produit**. L'a11y/le fichier possédé no-JS = **choisir le format `static`**, pas un ajout automatique — un interactif n'embarque plus de repli.
  2. La déc. 2026-07-10 ci-dessus (« produire toutes les formes d'office = local-first, PUIS proposer a/b/c ») devient **paresseuse** : `export-code` attend le choix puis ne build/livre QUE la forme choisie (bundle React construit à la demande si « code source » ; déploiement fly.io à la demande si « embed »). Local-first préservé pour static/video/html autonome (fichier possédé existe) ; embed reste un choix explicite (hébergé, sans fichier possédé).
- **Savoir à 2 grains** : *global* (transversal : couleur, typo, a11y, narration) + *par-type* (fin : 1 fiche par type FT, comme la map a sa fiche geo-prep). Les **skills** se groupent au grain du moteur (~11 groupes couvrent ~55 types FT), pas 1 skill par type.
- **Maps** : factoriser **une couche geo-prep commune** (correctness de base) partagée par les renderers static/interactif/vidéo. Tom la duplique dans ses 2 skills car il n'avait besoin que de la vidéo.
- **Datawrapper vs D3** : Datawrapper = charts standards (rendu délégué = mince, mais **savoir complet** appliqué via ses réglages) ; D3 = **un cœur de géométrie pur → 3 sorties** (static + interactif + vidéo), réservé aux cas vidéo / interactif-riche / custom. Prouvé par le pilote (`chart-geometry.ts` pur → rendu Svelte + snapshot + Remotion).
- **2026-06-23 — Datawrapper reste la base des charts** (décision Rémy). Tension souveraineté reconnue (SaaS cloud propriétaire vs ADN local-first). **Mitigation obligatoire** : le skill Datawrapper produit **toujours un export statique possédé** (SVG/PNG) en fallback → la dépendance SaaS ne « rot » jamais l'archive.
- **2026-06-23 — Build = tranche verticale sur Annemasse d'abord**, PAS la KB complète. On valide la boucle `KB minimale → ② minimal → 1 skill → export` sur **un cas réel d'Annemasse** avant de scaler la KB (13 synthèses) et la grille (55 types). De-risque ② (le vrai risque produit). La spec KB complète (`2026-06-23-knowledge-base-design.md`) reste la cible, construite à rebours de ce qui sert réellement.
- **2026-06-23 — Tranche 1 (dw-chart) LIVRÉE + vérifiée** (branche `feat/slice-1-datawrapper-chart`). Boucle ②→dw-chart→export prouvée sur 9 types via vraie API ; multi-séries (couleurs+transpose) corrigé après vérif visuelle. 20/20 tests. Le seam `Spec→mapper→client→produce` est le template des prochains skills.
- **2026-06-23 — On va plus loin qu'Annemasse.** Décision Rémy : construire la **couverture chart complète** (24 types DW) + les **best-practices câblées en garde-fous** (pas juste des docs), parce que le livrable bourse inclut **Splash en open-source MIT pour toutes les rédactions**, pas seulement le pilote. Spec : `2026-06-23-slice-1.1-full-coverage-and-guardrails.md`. Ce n'est PAS du sur-build — c'est le livrable produit #2.

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

- **`/splash` (ce repo) = le home.** Specs + planification + (à venir) le code Splash.
- **`vizualisation-skill` = ancien repo** : le `corpus/` (source KB), les archétypes/skills existants (viznews-lib), le **pilote `chart-annotated`** (preuve de contrat skill-autonome), les digests de session.
- **Skills de référence de Tom** : `~/Downloads/cesium-flyover` (flyover 3D vidéo), `~/Downloads/map-animation/map-explainer` (map 2D vidéo). Modèle du format skill-autonome.

## Conventions

- **★ Boucle feedback → système (principe de travail, toujours en tête).** Chaque retour utilisateur sert à améliorer le **SYSTÈME** pour produire de meilleurs éléments visuels à l'avenir — pas seulement à corriger l'exemple courant. Donc à chaque retour : (1) le corriger sur l'exemple ET vérifier **au rendu** ; (2) le **graver au niveau système** — code partagé des moteurs (core/conformance/audit), `SKILL.md`, et la référence best-practices concernée (`docs/splash/*`, `skills/*/references/*`) — pour que **tous les futurs types/modules en héritent** ; (3) si le retour révèle une règle générale (best practice), la **vérifier groundée** (sources réelles) avant de l'inscrire. Un fix qui ne touche que l'exemple est incomplet.
- Code, commentaires, identifiants, commits, branches : **anglais** (standard non-négociable).
- **Pas de mention Claude/Anthropic** dans les artefacts publiés (commits, PRs, docs).
- Runtime **Bun**. Tests `bun:test`, TDD.
- **Format skill-autonome** (canon Tom) : `SKILL.md` (8 sections : Overview · When to use · gotcha · Architecture · How it works · Quick start · Tuning knobs (chacun = un nombre) · Files) + `references/` + `scripts/` (prep déterministe) + `assets/` (1 composant battle-tested + sample-data + preview) + `output-proof`.
- Discipline vidéo (bug-free, façon Tom) : stack en couches · **frame-gating** sur la vraie disponibilité · données pré-cuites · valider 1 still avant le mp4 · plomberie (`preserveDrawingBuffer`, `--gl=angle`, timeouts).

## ★ CHANTIER STORYBOARD ÉDITORIAL — ①②③ FUSIONNÉS (2026-08-04, `main` = `9d24edb9`)

Spec parapluie : `docs/superpowers/specs/2026-08-03-editorial-storyboard-design.md` (4 sous-projets).
C'est la demande de Rémy du 2026-07-31, retraduite en **conversation** (proposer → valider → produire)
après avoir été traduite en **champ technique** la première fois.

- **① Vocabulaire des gestes** — fusionné (`082eabc0`). Six moteurs déclarent ce qu'ils font bouger,
  chaque affirmation ancrée à une ligne ; garde vérifié sur 6 mutations. + migration `scrolly` →
  **`stepped`** (4ᵉ genre narratif, arbitrage de Rémy) : `fly` a enfin un propriétaire.
- **② Modèle de beat unifié** — fusionné (`88c334fb`). Ancre élargie à `region`/`place` · le beat
  déclare mouvement/animation/durée · **schéma 7** avec preuve de reprise commitée · `beatMotionErrors`
  livré. ⚠️ La tâche 5 (unifier `MapArcBeat`) s'est arrêtée : sa justification a été **réfutée par la
  revue finale** puis corrigée dans la spec (§ 4.3) — le vrai blocage est `role`/`text` requis sur le
  schéma unifié vs optionnels sur `MapArcBeat`, pas une capacité manquante.
- **③ Étape de proposition** — fusionné (`9d24edb9`). Spec+plan :
  `2026-08-04-proposal-step-design.md` / `-proposal-step.md`. **Une carte narrative reçoit enfin une
  marche PROPOSÉE** (5 types : choropleth, symbol, locator, cartogram, dot-density) au lieu d'un
  `arcBeats` à écrire depuis rien — en **scrolly ET en vidéo**, parce que les deux honorent une marche
  aujourd'hui. `arcBeats` avait **zéro occurrence dans `lib/`** : une marche confirmée ne pouvait pas
  atteindre une carte par la boucle. `produce` juge désormais le mouvement d'un beat contre le moteur
  qui rendra (premier appelant de `beat-motion.ts`).
  **Deux trous trouvés à l'exécution, tous deux entre les couches** : `assembleScrolly` refusait TOUTE
  marche sur le track carte (la chaîne serait allée jusqu'à l'écriture du journaliste puis aurait
  refusé d'assembler) ; et le brouillon lisait **deux colonnes que le rendu ne lit pas** (ancre en
  colonne 0 au lieu de celle que la géographie a matchée ; valeur en dernière colonne numérique au lieu
  de celle que le takeaway désigne — or ces nombres sont ce contre quoi `verifyBeats` fonde les
  affirmations du journaliste).
- **④ Câblage des trois genres** — **(a), (b) et (c) FAITS — le chantier storyboard est CLOS** (`6a4dcd31`), spec
  `2026-08-04-narrative-kinds-wiring-design.md`. **(c) non commencé.**
  - **(a) `stepped` est atteignable.** `MapScrolly` dispatchait déjà les 7 types et ses 3 aspects
    étaient enregistrés — mais `storyComps()` ne connaissait que `guided-tour`/`route-reveal`/
    `simple`, donc **un genre narratif entier rendait correctement et personne ne pouvait le
    demander**. ★ Effet de bord voulu : `RouteScrolly` est déjà branché dans ce dispatcher, donc
    **la moitié du lot route (C2) devient atteignable sans écrire un composant**.
  - **(b) Le `reveal` apprend un ORDRE.** Avant : une seule rampe pilotait l'opacité de tous les
    sujets à la fois — la marche confirmée du journaliste ne changeait **rien** à l'écran.
    Mécanisme pur et partagé dans `src/reveal.ts` (`walkSubjectProgress` · `walkFillOpacity` ·
    `activeWalkIndex`) ; **sans marche, la valeur rendue est le scalaire d'avant, à l'octet**.
    Honoré par les **cinq** types dont l'ancre est une clé que la donnée porte : choroplèthe,
    cartogramme, symbole, locator, densité. ★ **La clé de chacun est lue dans SON PROPRE
    validateur**, jamais choisie — c'est ce qui garantit que ce qui est validé et ce qui est peint
    parlent de la même chose (`points[].label` · `markers[].label` · `rows[][regionKey]` · la clé
    de région · `values[].id`). Les deux qui restent dehors le sont **par nature**, pinné par
    `reveal-walk-coverage.test.ts` : `route` (son animation EST déjà la marche) et `hex-grid`
    (ses cellules n'ont pas de clé qu'un beat pourrait nommer). Plus aucun « en attente ».
    Deux décisions assumées : un symbole grandit dans l'ordre de la marche mais **jamais à une
    taille différente** (l'expression multiplie le rayon, elle ne le remplace pas — la taille EST
    la valeur) ; et le plafond d'opacité suit le composant (0,85 surfaces, 1 points), parce que
    c'est ce que chacun peignait avant.
    **★ PROUVÉ AU RENDU** — `skills/map-native/output-proof/reveal-walk/` : deux produce réels du
    même choroplèthe à la même frame, marche **délibérément à contre-courant du classement**
    (`GBR → DEU → NOR` alors que `NOR` est le plus haut). Sans marche, la Scandinavie et l'Europe
    centrale se teintent ensemble ; avec, **seul le Royaume-Uni est en place** et la Norvège n'est
    pas entrée. L'inversion EST la preuve. **Refaite sur la famille symbole** (marche à contre-courant de la TAILLE : Amsterdam 52 en premier, London 296 hors marche — sans marche toutes les étiquettes sont là, avec, seul Amsterdam). mp4 `violations: []` des deux côtés. Hors gate (2 rendus MapTiler
    live), comme `verify-source-bundle.mjs`.
  - **(c) La décision de caméra descend au BEAT — FAIT.** `cameraMode` était un réglage global :
    le journaliste ne pouvait pas dire « ici, ne bouge pas » sur UNE étape. Un beat porte désormais
    `movement: "jump" | "hold"` ; un `hold` garde le cadre laissé par l'étape précédente. Appliqué
    à **un seul endroit** (`applyMapArc`, là où une étape de storyboard devient une étape de récit)
    donc les 7 `Story` + 7 `stepped` en héritent sans une ligne chacun. Le mot `hold` **existait
    déjà** dans `CAMERA_GESTURES` (déclaré sur `reveal` depuis ①) — ④(c) l'implémente pour
    story/stepped **puis** le déclare, dans cet ordre. Quatre refus : mot non implémenté refusé
    **au gate** en nommant ce que le moteur sait faire · `hold` sur la 1ʳᵉ étape refusé (gate +
    rendu) · une SUITE de holds reste sur le dernier cadre qui a vraiment bougé · un beat muet
    rend à l'octet près comme avant.
    ⚠️ **Prouvé jusqu'au dérivateur** (`deriveSymbolStory` ± hold, mutation-vérifié), **PAS
    démontré au rendu** — et c'est une limite de l'instrument, écrite comme telle : un choroplèthe
    en mode `context` garde le cadre d'établissement sur chaque étape (le hold y est honoré mais
    **inobservable** — propriété du type, à dire au journaliste), et sur un symbole la caméra reste
    sur l'étape 1 jusqu'aux dernières fractions de seconde. ★ **Le still de revue (frame 140) n'est
    pas un instrument valable pour juger une décision de caméra tardive** — il tombe dans le plan
    d'établissement ; extraire des frames du mp4 aux frontières d'étapes.

**★ FERMETURE DU CHANTIER (2026-08-04, `ba41b0da`) — les 3 trous que ④ avait laissés :**
- **La vidéo du track CHART est ouverte pour `bar`.** Elle ignorait toute marche : `BarChart`
  échelonne ses barres par index, donc un plan écrit ET validé par le journaliste atteignait la
  config et ne changeait rien à l'écran. `skills/chart-native/src/core/walk.ts` (pur) donne la
  POSITION d'entrée de chaque sujet : les sujets nommés d'abord dans l'ordre de la marche, le reste
  ensuite en ordre de donnée, toujours une permutation (dédupliquée). Sans marche, la position EST
  l'index → un graphique non-storyboardé est identique à l'octet. **Prouvé au rendu**
  (`skills/chart-native/output-proof/walk-order/`) par inversion : marche partant de Westpark
  (dernière ligne, plus petite barre) vs ordre de lecture partant de Central. chart-native 1488/0 —
  le composant est partagé par les 3 formats, donc c'était le vrai risque.
  ⚠️ **`line` reste fermé, MESURÉ** : une vidéo de ligne n'a aucune entrée par sujet à réordonner
  (tracé continu par longueur cumulée ; les seuls `stagger` de `LineChart` sont grilles + étiquettes
  d'axe). Y exprimer une marche = segmenter le tracé en pauses par étape, autre mécanisme.
  ⚠️ **Le still de revue (frame 140) est inutilisable pour juger un ordre d'entrée de barres** — il
  tombe APRÈS la fenêtre d'échelonnement. Extraire une frame du mp4 pendant la construction (~1,5 s).
- **D'où viennent les mots d'un beat — écrit dans `skills/splash/SKILL.md`.** La prose demandait « la
  revendication, une phrase » sans jamais dire sa source. Règle de `suggest-image` transposée : la
  machine **apparie et ordonne**, chaque revendication vient du **passage de l'article du journaliste**
  qui parle de cette ancre, l'ordre suit le récit (pas la saillance), et ce que l'article ne fournit
  pas est **demandé**, jamais rempli. Vaut aussi pour le track carte et le genre `stepped`.
- **★ Lot route (C2) — FERMÉ.** `RouteStory` n'avait pas à exister (le dépôt a tranché : le survol
  guidé d'une route EST son tracé) et la vidéo à étapes est atteignable depuis ④(a) via
  `RouteScrolly`. **`ScrollyRouteMap` est écrit et prouvé** (`skills/scrolly/src/ScrollyRouteMap.tsx`,
  preuve `skills/scrolly/output-proof/route/`) : c'était le SEUL type de carte arc-capable sans
  scrolly navigateur — la marche existait, rien ne la rendait. Tout l'amont est **partagé** avec la
  famille vidéo (layout, walk, séquence d'étapes et refs sentinelles), jamais re-dérivé. La fiche KB
  déclare le format (DRIFT 3 exige que le savoir et la capacité s'accordent), le registre déclare
  `fly` + `draw` + `highlight` (`draw` = le seul qu'aucun autre scrolly carte n'a), et **3 tests qui
  épinglaient l'ABSENCE ont été INVERSÉS** plutôt que supprimés.
  ⚠️ **Deux défauts que seul le bout-en-bout a attrapés** : (1) la prop est une **ref de beat**, pas
  un indice d'étape (`Scrolly.tsx` passe `currentBeatRef`) — lue comme un indice, l'aperçu se
  rabattait sur le premier territoire et la caméra ne bougeait jamais ; (2) une étape de tracé doit
  cadrer **le territoire qu'elle entre**, pas l'étendue cumulée (règle de la vidéo) — sur cet
  échantillon les deux coïncident (l'Inde couvre presque tout le fleuve) et **le garde de mouvement
  réduit a refusé le build en le nommant** (« step 2's camera equals step 1's »). Ce refus parle du
  lecteur : en scroll, c'est lui qui donne le rythme, et une étape dont la caméra ne bouge pas se lit
  comme une page cassée.

**Rouges de `lib` au 2026-08-04, tous nommés et attribués** (aucun causé par ①②③) : `eligibility`
(E5 — **une assertion fausse dans le test**, établi le 2026-08-04, ni environnement ni bug de rendu) ·
`typology-drift` DRIFT 2 (E13 — 6 types scrolly-carte sans fiche KB) · `capture` ×2-3 (contention
Playwright, **20/20 en isolation en 8 s**). ⚠️ Et les tests d'init d'un run **ne sont pas hermétiques** :
ils lisent le `NEWSROOM-PROFILE.md` ambiant à la racine, donc ils rougissent chez la personne la plus
susceptible de travailler sur la charte maison, en accusant son travail. **Pas encore au backlog.**

## ★ Distribution de skills à un hôte — E10/B6 fermés (2026-08-04, branche `feat/skill-distribution-payload`)

Un hôte (Goose, Claude Desktop…) ne reçoit plus le dépôt entier : `bun run pack-skills` matérialise
`.dist/skills/<name>/` (prose + `references/`+`scripts/`+`src/`+`assets/`, sans `node_modules/` ni
`output-proof/`) à l'installation, et l'installeur lie CE répertoire dans `~/.agents/skills` — plus
`skills/` directement. `lib/host/skill-payload-budget.test.ts` est le garde-fou qui empêche la
régression (400 fichiers / 160 000 caractères par skill livré, sous le seuil de débordement Goose).
Mesuré en `HOME` isolé (`bun run pack-skills` puis `link_agents_skills` puis `goose skills list`) :
**12 liés / 12 découverts**, et les 2 parasites `playwright-cli`/`playwright-trace` (qui entraient
par `dw-chart/node_modules`) ont disparu. Détail : `docs/splash/backlog-2026-08-03.md` (E10, B6),
`docs/splash/skill-payload-2026-08-04.md`.

## ★★ CAP PRODUIT — décidé par Rémy le 2026-08-03 (LIS CECI AVANT DE PRIORISER QUOI QUE CE SOIT)

**A. Le dépôt reste PRIVÉ pour l'instant, mais il sera rendu public.** Donc : **tout préparer pour que
ça marche le jour J** — `REPO_URL`, scrub des trailers, promesses publiques recadrées sur le vérifié.
On prépare, on ne publie pas.

**B. Passer par les APPS DE BUREAU, pas le terminal.** Ordre : **Goose d'abord**, puis Claude Desktop,
Gemini desktop, ChatGPT desktop. **Le découpage de `SKILL.md` passe au second plan** — « il faut
d'abord tester et voir ce qui marche ou non ».

> ★ **Les quatre cibles ne sont PAS de même nature** (établi 2026-08-03) :
> - **Goose Desktop + Claude Desktop** = skills au format ouvert, lus en local, exécution locale.
>   Les deux sont « câbler et prouver ». ⚠️ **Correction mesurée le 2026-08-04** : la surface de
>   Claude Desktop n'est PAS `…/local-agent-mode-sessions/skills-plugin/…` (répertoire **géré par
>   Anthropic**, synchronisé) — c'est **`~/.claude/skills/`**, auto-chargé par l'app et monté en
>   lecture seule dans sa VM. Câblé depuis (`install/runtimes/claude-desktop.sh`).
> - **Gemini** : c'est la **CLI** qui implémente le standard ouvert. L'app macOS (Spark, juin 2026,
>   accès fichiers locaux) — support `SKILL.md` **non établi**.
> - **ChatGPT Desktop** : ⚠️ **ce qui suit a été MESURÉ FAUX le 2026-08-04** — « connecteurs côté web,
>   donc pas d'exécution locale ». La doc OpenAI documente les serveurs MCP **STDIO lancés en process
>   local** (`command = …`), config partagée avec Codex (`~/.codex/config.toml`). L'exécution locale
>   n'est donc PAS le blocage ; ce qui manque est la **surface** (MCP expose des outils, pas des
>   skills). Piste la moins chère : la surface est Codex embarqué, runtime qu'on livre déjà. Détail :
>   `docs/installer/claude-desktop-findings.md` § B4.

**C. Tout ce qui a été construit doit FONCTIONNER et être ACCESSIBLE pour produire.** Ce n'est pas
seulement le lot route : c'est un **audit d'atteignabilité** de toutes les capacités. La session du
2026-08-02 a trouvé deux fois la même classe — une capacité que le moteur calcule et que le rendu jette
(le storyboard de route sans sortie ; le scrolly livré qui jetait les phrases confirmées de 4 types).
**Livingdocs ET We.Publish** : pouvoir proposer au journaliste d'intégrer **directement dans son
article, dans son CMS**. « Un petit plus qui aidera les journalistes non tech. »

**D. Le comportement Datawrapper est CONSERVÉ** — publication à l'URL publique au moment du produce.
Décision prise, ne pas la rouvrir.

**E. Résorber la dette** pour avoir « un truc clean et qui fonctionne correctement ».

## ★ POINT 2 FERMÉ — la jointure ADM1 (fusionné, `main` = `c66cb23f`)

**Un CSV sans accents produit enfin une carte** — vérifié au RENDU, pas au test : le rendu sans accents
(`Geneve`, `Zurich`, `Neuchatel`) et le contrôle accentué sont **identiques au pixel**. Gate 21/22, même
ambiant que ci-dessous ; `lib/geo` 77/0. Le bump de schéma **5→6** est inclus (voir plus bas).

**Le vrai défaut n'était pas celui annoncé.** Le diagnostic de départ (« il suffit de threader le
`featureId` déjà résolu ») ne couvrait **qu'une couche sur quatre**. Le bon cadrage était : *quelles
couches lient une ligne de CSV à un polygone, et suivent-elles toutes la même règle ?* Réponse : quatre
couches (`resolve-for-produce` subset · `choropleth-geo` · `cartogram-geo` ×2 joins · `dot-density-geo`),
deux règles. Chaque revue a trouvé la couche suivante en **rejouant le cas du journaliste**, jamais en
relisant le diff — trois rondes, la contradiction déplacée à chaque fois au lieu d'être fermée. Fermeture
finale : **une seule réécriture de `config.rows`/`config.values` au point que tous les consommateurs
lisent**, pas quatre patchs.

**Fermé aussi, découvert en route** : le crash à la reprise (le champ était `.optional()` + version de
schéma non bumpée ⇒ un manifeste d'hier levait **sans être rattrapé**, crash du producteur ; désormais
`migrateV5toV6` laisse tomber l'appariement périmé et redemande `orient`, étape mécanique sans
intervention) · **le même piège sur `us-states`/`world`** (CSV en minuscules `ny`/`ca` → « 2 sur 2
reconnus » puis « 2 sur 2 absentes »), que le premier rapport déclarait inexistant · une **régression
introduite par le correctif lui-même** sur les géométries déclarées (normalisation appliquée au GeoJSON
du journaliste ; désormais gated sur `origin === "shipped"`).

**Observé au rendu, non corrigé (backlog)** : la légende écrit `1,200–1,316CHF` — **pas d'espace avant
l'unité**, sur le chemin choroplèthe (`legend-format.ts`, classe déjà notée au backlog, ici confirmée).

**★ PIÈGE D'ENVIRONNEMENT À CONNAÎTRE** : un worktree neuf n'a **pas de `.env`** (il n'est pas suivi).
Sans lui, `skills/scrolly` sort 4 fail/3 errors et **aucun rendu n'est possible** — ce qui a fait conclure
à tort à des « échecs pré-existants » et a bloqué la seule vérification qui comptait. Remède :
`ln -s ../splash-merge/.env .env` dans le worktree → scrolly repasse **137/0**. Corollaire déjà payé deux
fois : **`git stash` n'établit JAMAIS qu'un rouge est pré-existant** sur une branche multi-commits —
comparer à la base de fusion ou monter un worktree de contrôle.

> **Le compte de checks du gate ne s'écrit pas à la main.** Il vaut `TSC_DIRS.length +
> TEST_DIRS.length` dans `scripts/check.mjs` — et `LIB_DIRS` y est calculé par `readdir`, donc
> ajouter un skill ou un dossier sous `lib/` change le total sans que personne l'édite. Le gate
> imprime lui-même sa dernière ligne (`N/N checks passed`) : **c'est la seule source**. Tous les
> « gate 22/22 », « 23/23 », « 20/23 » qui suivent sont des **reçus datés** — vrais au commit et à
> la branche qu'ils nomment, jamais une affirmation sur aujourd'hui. Le compte a déjà été « corrigé
> une fois pour toutes » à 18, puis 20, puis 22, puis 23 ; il vaut 25 au 2026-08-06. Réécrire les
> reçus est ce qui produit la dérive — lire `check.mjs` est ce qui y met fin.

## ★ État courant — 2026-08-06 — LA CHARTE LIT UN VRAI SITE DE RÉDACTION (**fusionnée** dans `main` @ `dcfff3c3`)

`proposeCharter` lisait 0 feuille de style sur heidi.news avant ce chantier (filtre same-host,
`oklch()` non lu) ; mesuré en vrai après coup : `#d5121e` corroboré par 3 déclarations
indépendantes (au lieu d'1) + `Sang Bleu Kingdom`, **aucune nouvelle couleur — il n'y en avait pas
à trouver**, refusé de baisser le seuil pour en fabriquer une. Second essai qui **rend** la page
(navigateur réel, 14 tests par lancement injecté, jamais automatique) prouvé exécutable de bout en
bout à la main sur `therecord.media`, mais pas exercé par la suite ; `color-mix()` reste non lu.
**Ce qui est mesuré se corrige** : les polices lues (`Sang Bleu Kingdom`) s'affichaient nulle part
tout en étant écrites dans le profil — désormais montrées avec leur reçu et rayables avant
l'enregistrement ; un échec dit CE QUI a échoué (navigateur absent ≠ site muet) dans la langue de
la page, détail machine subordonné.

**Revue finale en deux mandats + re-revue ciblée** (le diff entier faisait caler les reviewers) →
19 correctifs, dont **deux trous SSRF ouverts par la levée du filtre same-host** : le chemin rendu
ne vérifiait pas l'adresse où le navigateur avait ATTERRI (un redirecteur collé menait à
`169.254.169.254`, dont le corps repartait comme la page de la rédaction), et `getText` suivait les
redirections d'une feuille de style avant de les vérifier (une `<link>` qui rebondit sur
`http://192.168.1.1/reboot?confirm=1` — primitive d'écriture, pas seulement de lecture). Fermés,
vérifiés par mutation. Trois résidus parqués **avec la forme du correctif** : E29 (écrêtage
`oklch()` hors gamut), E30 (`readAppliedStyles` sans couverture, par construction), E31 (regex de
rôle qui rate une classe préfixée).

**Prouvé en vrai sur `main` fusionnée** (page servie, navigateur réel) : heidi.news mesurée en
2,3 s → `#d5121e` + `Sang Bleu Kingdom` avec leurs reçus ; une police se raye, une couleur s'édite,
et c'est **la valeur validée** qui est écrite — commentaire du journaliste, clé inconnue et corps du
profil intacts ; Chromium absent → « Impossible d'ouvrir votre site dans un navigateur non plus »,
pas « votre site n'a pas répondu ». **Limite nommée** : sur un profil EXISTANT, `facts.notes` est
ignoré (le corps n'est jamais réécrit — `profile-write.ts:314`), donc les polices ne touchent le
disque que sur un profil NEUF.

`bun run check` **23/25** sur le résultat fusionné, les 2 rouges étant `bunx mapshaper` non déclaré
(cause fermée juste après, voir ci-dessous). Le gate exige `VITE_MAPTILER_KEY` dans `.env`, sans quoi
`skills/scrolly` + `skills/image-native` rougissent à l'import — clé manquante, pas défaut de code.
Détail : `docs/splash/CHANGELOG.md`, `docs/installer/charter-measurement.md`.

## ★ 2026-08-06 — `mapshaper` n'était déclaré nulle part (classe de flake du gate, fermée)

`lib/geo/subset.ts` appelait `bunx mapshaper` sans que le paquet soit une dépendance : chaque appel
le **re-résolvait depuis le réseau** dans le cache d'install partagé, donc deux subsets simultanés —
ce que la suite fait couramment — se tuaient sur `Failed to link <dep>: EEXIST`, et le run entier
échouait hors-ligne. Le symptôme arrivait déguisé : un `ENOENT: … config.json` dans un test
map-native sans rapport, parce qu'un `produce.mjs` dont l'étape géométrie throw n'écrit simplement
jamais sa sortie — et un test DIFFÉRENT rougissait à chaque run. Déclaré en devDependency racine
(`mapshaper@0.7.51`). Mesuré : `lib/geo` 105 s → **6,9 s** (87/87), `skills/map-native` 0 échec
(1251 pass) au lieu d'un rouge tournant.

## ★ État courant — 2026-08-06 — LA PAGE DE SETUP TIENT SUR UN ÉCRAN (branche `feat/setup-page-one-screen` @ `3fc8e0c9`, gate 23/23)

Profil rédaction éditable et prérempli-avec-reçu depuis l'adresse du site (`POST /charter`),
écriture qui préserve (`updateProfileMarkdown`), section Langue et cases à cocher supprimées — ce
que la rédaction peut produire est **dérivé**, pas coché. Preuve mutation-testée (22/22, régresse
à 20/22 si l'ancien refus-de-réécrire est restauré). **La clé MapTiler était morte (`403 Invalid
key`, cause des 20/23 notés ci-dessous le même jour) — Rémy l'a régénérée, gate repassé 23/23,
cartes re-rendues.** Détail : `docs/splash/CHANGELOG.md`, `docs/installer/setup-page-proof.md`.

## ★ État courant — 2026-08-06 (nuit) — TOUTE VIDÉO DE GRAPHIQUE PORTE LES MOTS DE SA MARCHE

Spec `docs/superpowers/specs/2026-08-06-every-chart-video-carries-its-words-design.md`, plan
`.../plans/2026-08-06-every-chart-video-carries-its-words.md` (8 tâches), branche
`feat/chart-video-walk-everywhere` **fusionnée dans `main`**.

**Le trou** : sur 41 types de graphiques, **un seul** (`bar`) pouvait porter une marche. Les 40
autres n'offraient qu'un genre → une offre n'est pas une question → **le genre n'était jamais
demandé et aucun storyboard proposé**. Cause : on avait confondu AFFICHER la phrase du beat et
RÉORDONNER l'entrée des sujets ; seul le premier est le critère du garde.

**Trois grains, tous honnêtes et tous DITS au journaliste** (registre
`skills/chart-native/src/core/chart-walk.ts` — `grain: "accent" | "entrance" | "sequenced"`,
couvrant les 41 ; **c'est le registre qui fait foi, pas ce paragraphe** : compter les types à la
main est exactement ce qui a fait dériver le compteur de gate) :
- **ancré**, en deux nuances — les types bar/diverging/lollipop/dumbbell/slope/radial-bar/pyramid,
  où le sujet entre au moment de sa phrase, dans l'ordre du journaliste. `entrance` = le sujet
  ENTRE à sa phrase ; `accent` = il est déjà là et se fait ACCENTUER (le registre porte alors un
  champ `accent: {prop, by}` qui dit quelle propriété bouge). La distinction était absente de ce
  document alors qu'elle change ce que le journaliste voit ;
- **séquencé** — les phrases se suivent dans l'ordre écrit, sur l'animation telle qu'elle est.
  Leurs beats n'ont **pas d'ancre** : une ancre y est refusée fort (jamais acceptée puis ignorée).

Le calendrier d'entrée est **lu** du registre par les composants (plus de littéraux à faire
dériver) ; les 41 enveloppes vidéo passent par `RevealStage` ; `WALK_CAPABLE_CHART_TYPES` est
dérivé du registre ; `narrativeBeatErrors` connaît la surface (scrolly inchangé / vidéo par grain,
ancre résolue par le champ propre au type) et **la colonne vertébrale l'appelle enfin sur le chemin
vidéo**, ce qu'elle ne faisait pas.

**★ Ce que seule la preuve rendue a montré** (`docs/splash/proofs/2026-08-06-chart-video-walk/`) :
1. **`beats` n'arrivait JAMAIS jusqu'à la config du composant** — aucun mapper ne les copiait, donc
   la marche était écrite, validée, puis jetée entre la spec et le rendu. Ça emportait aussi le
   réordonnancement de `bar` livré le matin même. Les deux mécanismes n'avaient été éprouvés que
   contre une config écrite à la main. Threadé au point d'injection unique (comme lang/altInsight).
2. **Le récit passait dans l'ordre des données** — `establish` en deuxième — car seul `bar`
   permutait. Tous les types ancrés permutent désormais, et la permutation se construit sur les
   **libellés MIS EN PAGE** (la géométrie du lollipop trie par valeur : un ordre sur les lignes non
   triées vise des positions jamais rendues).
   ⇒ **Invariant** : le sujet du beat k entre en position k. La légende ne résout plus aucun sujet
   (deux versions antérieures le faisaient, les deux étaient fausses).

**Conséquence assumée** : une vidéo de graphique sans `narrativeKind` est refusée (message routé).

**⚠️ Gate 20/23 à la fusion — les 3 rouges sont EXTERNES et identiques sur `main`** : la clé
MapTiler du `.env` répond **`403 Invalid key`**. Tout ce qui touche les tuiles échoue (`lib`,
`skills/scrolly`, `skills/map-native` produce). `skills/splash` + `skills/chart-native` = 2571/0.
**À FAIRE (Rémy) : régénérer la clé MapTiler**, puis re-runner le gate.

## ★ État courant — 2026-08-06 (soir) — LE GENRE NARRATIF D'UNE VIDÉO EST PROPOSÉ (fusionné, gate 23/23)

Spec `docs/superpowers/specs/2026-08-06-the-narrative-kind-is-proposed-design.md`, plan
`.../plans/2026-08-06-propose-the-narrative-kind.md` (5 tâches), branche
`feat/narrative-kind-proposed` **fusionnée dans `main`**.

**Le défaut** : une vidéo n'est pas une chose. Une carte peut être un survol guidé (`story`), une
suite d'étapes (`stepped`) ou une révélation à caméra fixe (`reveal`) — trois familles de
composants. Personne ne demandait laquelle : `cameraMode` restait au repli du moteur, donc rien ne
pouvait honnêtement en dépendre — et le garde de marche exigeait un storyboard même pour un
`reveal`, qui **n'affiche aucun mot** (Rémy : « le reveal n'inclut pas des mots, c'est normal »).

**Ce qui est en place :**
- `narrativeKindsFor(producer, type)` **lu du registre**, jamais récité (une carte : 3 genres ; un
  chart : 2, faute de caméra qui voyage ; un type sans marche : `reveal` seul, avec sa raison) +
  la commande `bun lib/host/cli.ts narrative-kinds --producer <p> --type <t>`.
- `narrativeKind` voyage sur la proposition ; **une marche n'est exigée que si le genre narre**.
  Genre absent ⇒ question ouverte, refusée en nommant la commande. Un `cameraMode` explicite déjà
  sur la spec compte comme réponse (ancien vocabulaire) ; le repli du moteur, non.
- **Trou fermé** : les moteurs lisent `cameraMode` et n'ont jamais entendu parler de
  `narrativeKind` ⇒ un genre choisi mais non traduit dans la spec est un choix **jeté avant le
  rendu**. Refusé, en nommant le champ à écrire ; l'offre porte désormais son `cameraMode` (dont
  le `route-reveal` propre à une route).
- `splash-proposition` ouvre toute vidéo épinglée par la question du genre : proposition
  **éditoriale** (pas un formulaire), coût dit avant le choix, puis storyboard si story/stepped.
  4 pins doc-parity mutation-vérifiés.

**Prouvé sur la chaîne du journaliste** (`produce-all.mjs`, avant tout moteur) : sans genre → refus
routé nommant la commande ; genre posé sans `cameraMode` → refus nommant le champ ; traduit → seules
restent les erreurs de forme de la fixture. **Reste de la tâche 5 : un vrai `/using-splash` par
Rémy** — la question du genre doit apparaître après le choix de la vidéo, le storyboard ne suivre
que si le genre narre.

## ★ Suite du chantier setup page — 2026-08-06 (branche `feat/setup-page-keys-and-profile`, fusionnée, 5 tâches revues)

**Suite du chantier setup page** : clés de production demandées d'emblée (`PreflightField.upfront`
dérivé du registre, plus d'édition manuelle par moteur) · profil de rédaction affiché en lecture
seule (jamais renvoyé dans le payload soumis) · `goose-desktop`/`claude-desktop` sélectionnables
par décision écrite (Couche B **non observée pour les deux** — une revue finale de branche avait
brièvement cru `goose-desktop` « atteinte » le 2026-08-04 en citant la section « ★★★ Layer B —
REACHED » de `docs/installer/goose-desktop-proof.md`, mais cette preuve appartient à `goose`, la
CLI, jamais à la fenêtre de l'app : la précision « À QUI ce document fait crédit » du même fichier
[2026-08-05] le dit explicitement — corrigé dans la même vague de fix qui s'était d'abord trompée)
· page servie assertée sur le vrai serveur.
Gate **20/23** mesuré sur l'arbre final : `lib`, `skills/map-native` et `skills/scrolly`, **une seule
cause** — la clé MapTiler morte. Chaîne établie, pas déduite : `verifyMapTiler` échoue aussi sur
`main` ; l'API répond `403 Invalid key` sur la clé ; et le snap carte meurt sur
`waitForSelector('.maplibregl-canvas')` — sans style, pas de canevas, pas de rendu — **aucune carte ne peut se rendre tant que la clé n'est pas régénérée sur
cloud.maptiler.com**. Détail + preuve verbatim : `docs/installer/setup-page-proof.md`,
`docs/splash/CHANGELOG.md` (session 2026-08-06, Task 5).

## ★ État courant — 2026-08-06 (branche `feat/setup-page-truth` @ `c3567a92`, revue finale close)

**La page de setup dit vrai sur une vraie install, prouvé sous `$HOME` isolé.** Gate 23/23 (les 3
échecs du 1er run = `.env` absent dans ce worktree, pas la branche — même classe que le corollaire
scrolly ci-dessous). La preuve live a trouvé et fixé un **vrai bug** : `install/bootstrap.sh`
plantait (`unbound variable`) sur macOS/bash 3.2 en UTF-8 avant même d'atteindre la page — accolage
`${engine}` (`68e4f767`). Une fois fixé : `chart-native`/`map-native`/`scrolly`/`image-native`
lisent tous `ready` dans le JSON servi, `embed-fly` absent, aucun `bun install` dans le modèle.
Détail : `docs/installer/setup-page-proof.md`, `docs/splash/CHANGELOG.md` (session 2026-08-06).

**Revue finale de branche (2026-08-06) — 1 vague de fix, mutation-prouvée par finding, gate 23/23
re-vérifié :** fixture readiness discriminante (`server.test.ts` répondait `ready` même la ligne de
wiring `skillsRoot` retirée — corrigé + un vrai piège Bun découvert au passage : un `bun` en vrai
sous-processus auto-résout un paquet absent depuis `~/.bun/install/cache`, neutralisé pour la
fixture via `bunfig.toml` `install.auto = "disable"`) · boucle vidéo `bootstrap.sh`/`bootstrap.ps1`
enfin testée sur sa PROPRE liste de moteurs (le test précédent se contentait de `toContain` sur tout
le fichier, où `map-native` apparaît déjà ailleurs) · cache navigateur Remotion **par skill**
(`.dist/skills/<engine>/node_modules/.remotion`) désormais reporté au re-pack, comme
`node_modules` l'était déjà — sans ça, chaque re-run retéléchargeait ~187 Mo · risque `bunx` sous
Bun (pas Node) sur Windows nommé en commentaire + dans `setup-page-proof.md` (pas de redesign non
vérifiable) · nettoyage Fly.io résiduel (`guardrails.md`, exemple `bootstrap.ps1`). Rapport détaillé
+ preuves de mutation : `.superpowers/sdd/2026-08-05-setup-page-truth/final-fix-report.md`.

## ★ État courant — 2026-08-02 (LIS CECI EN PREMIER — storyboard carte + géographie vidéo)

**Le storyboard de carte et la géographie vidéo sont fusionnés** (`feat/map-storyboard-and-video-geography`,
43 commits, avance rapide, arbre propre). Gate **21/22** : le seul rouge est l'ambiant
`lib/brain/eligibility.test.ts` (« a mark can never carry an empty reason », `readiness.ts:54`),
qui échoue **aussi en isolation** en 123 ms — antérieur à tout ce travail, présent sur `main` avant.
La branche n'introduit **aucune dépendance** (donc pas de `bun install` requis après un pull).

**Ce que ça change pour un journaliste.** Les **sept** types de cartes acceptent un *storyboard confirmé*
(`arcBeats` : une liste ordonnée de beats, chacun nommant une ancre réelle dans SES données + le texte
qu'il a confirmé, épinglé verbatim). **Six sur sept** le font arriver jusqu'au lecteur sur les trois
formes (vidéo *story*, vidéo *reveal*, scrolly web). La **vidéo rend enfin une géographie non-mondiale**
— le refus provisoire est tombé, prouvé par une image de cantons suisses rendue et **regardée par deux
relecteurs** via le vrai chemin non contourné.

**★ LA ROUTE EST LE TROU CONNU, ET IL EST CADRÉ.** Elle est capable côté moteur (dériveur, validateur,
dimensionneur, `resolveRouteWalk` qui produit territoire+caméra+texte par beat) mais **n'a aucune sortie** :
il lui manque **DEUX composants**, pas un — `ScrollyRouteMap` (la piste scrolly web a six composants
carte, pas de route) et `RouteStory` (les six autres types ont un `*Story.tsx`, le mode vidéo qui marche
les beats ; la route n'a que `RouteReveal`, ligne continue qui ignore les beats **par conception**).
En attendant, le système **refuse honnêtement** au gate Tier-0, avant que le journaliste n'écrive ses
beats — il n'accepte plus pour perdre ensuite. `RouteScrolly.tsx` (Remotion) existe, marche, et n'est
enregistré nulle part : c'est lui qui a fait croire à une revue que la capacité existait. Le brancher ou
le supprimer fait partie du lot. Décision Rémy (2026-08-02) : lot dédié, pas greffé en fin de branche.

**Deux Criticals trouvés par la revue finale de branche** (la 5ᵉ fois d'affilée qu'elle en trouve —
**ne jamais fusionner sans elle**) : le scrolly LIVRÉ jetait silencieusement le storyboard confirmé pour
4 types sur 6 (`Scrolly.tsx`, fichier **jamais touché par la branche**) — la branche avait transformé un
**refus bruyant en perte silencieuse** ; et la prose promettait que l'arc de route atteignait le lecteur
alors que les trois chemins étaient fermés. Corrigés, re-vérifiés par mutation indépendante.

**★ LEÇON DE MÉTHODE LA PLUS CHÈRE DE LA SESSION — un garde vert ne prouve rien tant qu'on ne l'a pas vu
rougir POUR LA BONNE RAISON.** Trois gardes de cette branche sont restés verts avec le bug présent : un
grep de source, puis un comptage de forme d'appel (battu par `const rw2 = resolveRouteWalk`), puis un
test « comportemental » qui n'appelait que des fonctions pures et ne voyait jamais le câblage du
composant. La mutation qui tranche est celle qui **casse le comportement en laissant le texte grepé
intact**. Le levier final de C1 y survit parce qu'il rend le vrai composant (`renderToStaticMarkup`) et
lit **la page**, pas le fichier. Corollaire : quand une branche accorde une capacité, **les affirmations
périmées ne sont JAMAIS dans le diff qui l'accorde** — 5 foyers trouvés hors diff cette session (un test
`validate-gate`, une phrase de `SKILL.md` 350 l. plus loin, 3 tests + la doc de `scrolly`, et
`map-native/SKILL.md`). Balayer **le dépôt**, nommer les répertoires fouillés. Et « j'ai confirmé avec
`git stash` que c'est pré-existant » **n'est pas valide** sur une branche multi-commits : seule la
comparaison à la **base de fusion** (ou un worktree de contrôle) l'établit.

**Suivi ouvert (non bloquant, aucun chemin journaliste ne l'atteint)** : `scrollySpecErrors`
(`skills/scrolly/src/manifest.ts:42-72`) accepte encore une route avec `arcBeats` — une **troisième**
couche qui désaccorde, sous un commentaire (`produce.mjs:53`) affirmant que « la CLI et la colonne
refusent à l'identique ». Le garde de câblage **caméra** reste un scan de source (parité avec l'existant,
le rendu serveur n'expose aucun état MapLibre).

## ★ État courant — 2026-07-29 (branche `feat/family-b-what-reaches-the-reader`, famille B fermée)

Famille B du registre (« ce qui arrive au lecteur est faux » — langue, unité, couleur
annoncée≠rendue, titre/takeaway) fermée côté **porteur/lecteur/comparaison** : les 18 tâches du
plan `docs/superpowers/plans/2026-07-29-family-b-what-reaches-the-reader.md` (spec
`docs/superpowers/specs/2026-07-28-family-b-what-reaches-the-reader-design.md`) sont mergées sur
cette branche, avec le registre `docs/splash/sweep-2026-07-28-triage.md` corrigé sur 8 points où
sa lecture contredisait le code. Gate **21/22** (le seul échec, `test lib`, porte les deux ambiants
nommés depuis avant le premier commit — non une régression ; réserve : `.env` racine non lu par
`bun test` par paquet, donc ce chiffre ne prouve pas que Datawrapper/MapTiler ont tourné). Détail
et mesures : `docs/splash/CHANGELOG.md`, session 2026-07-29.

## ★ État courant — 2026-07-30 (LIS CECI en priorité)

`main` = `splash-merge/`, **157 commits** au-dessus de `47e83752`, arbre propre, gate **21/22** — le
seul échec est l'ambiant `eligibility.test.ts` « a mark can never carry an empty reason
(readiness.ts:54) », antérieur à tout ce travail.

**Les quatre familles du registre de sweep sont fusionnées** (B → C → A → D), plus la mesure
carré/portrait, le plan géographie, les trois trous de la passe de grille, et le premier segment de
production du PONT entre les deux chaînes.

**Non fusionné, prêt, mais IL LUI MANQUE SA REVUE FINALE** : `feat/geography-anywhere`
(worktree `splash-geography`, 21 tâches, 31 commits, gate 21/22). Ne pas fusionner sans elle — sur les
quatre plans précédents, cette étape a trouvé À CHAQUE FOIS un Critical que les revues par tâche
avaient laissé passer, dont trois faux blocages qui auraient tué des runs réels.

**★ LE CHANTIER SUIVANT EST STRUCTUREL — le découpage de `skills/splash/SKILL.md` par phase.**
Mesuré contre les deux systèmes de référence : Superpowers découpe par PHASE (14 skills, médiane
167 lignes, 10/14 avec une table de rationalisations) ; Spotlight garde un orchestrateur de 509 lignes
qui fait `invoke-skill(...)` au point du flux (11 skills, médiane 159, 9/11 nommant leurs
anti-patterns, plus une garde qui STOPPE si un skill ne se charge pas). `SKILL.md` fait **1354 lignes**
et n'a **aucune** table d'anti-patterns : arrivé à l'EXPORT, les règles de PROPOSITION sont 900 lignes
derrière. Splash délègue à des MOTEURS, jamais des règles de PARCOURS. C'est la cause mécanique du
plus gros amas du registre (« les règles écrites que rien n'applique ») — démontrée le 2026-07-30 par
un test manuel où 5 retours sur 8 portaient sur des règles déjà écrites, dont deux citant mot pour mot
la phrase fautive comme contre-exemple. Détail et chiffres : mémoire `resume-2026-07-30`.

**Pour tester à la main** : `claude --plugin-dir /Users/rmdms/Sites/Professional/splash-merge` — le
dépôt EST un plugin (`.claude-plugin/plugin.json`). Article de test :
`/Users/rmdms/Sites/Professional/splash-test-article/`.

**★ Follow-ups NOMMÉS le 2026-07-30, écrits ici parce que les ledgers de worktree sont supprimables :**

1. **Bug produit jamais corrigé, trouvé en run manuel réel** : `chart-native` reçoit bien
   `kind: "synthetic"` dans son `config.json` mais **ne passe jamais la source par
   `publishedSourceFor`**, donc la mention obligatoire (« données de démonstration ») n'est composée
   nulle part et n'apparaît sur aucun graphique. `map-dw` et `dw-chart` sont à vérifier sur le même
   point. C'est un défaut de conformité, pas un détail : un visuel de démo sort sans sa mention.
2. **`assertShippable` ne vérifie rien d'utile** (famille A, nommé dans le code) : la comparaison
   `shownSha256` vs `approvedHash` est **tautologique** — `gate.ts:38-49` écrit les deux champs depuis
   la même variable et en est le seul écrivain. Elle n'attrape qu'une retouche manuelle partielle, pas
   l'absence, et reste contournable par omission. Vraie fermeture : re-vérifier contre le reçu de
   présentation via `shownCovers(path, r.approvedHash)` (`lib/loop/presentation.ts:105`, chemins dans
   `r.outputs`), et exiger la présence avec le raisonnement-par-forme de `lib/loop/deliver.ts:147-157`.
3. **`map-native` n'enregistre AUCUN refus tardif** (chart-native oui depuis la famille C). Cause :
   son snap de contraste écrit un PNG de debug que `collectOutputs` ramasserait avec `static.png` si
   `OUTDIR` était threadé — l'incident `assertFileMedia` « deux fichiers image » de la tâche 7. Fix :
   threader `OUTDIR` **et** rediriger le PNG hors du dossier de livraison (il tombe par défaut dans
   `output-proof/contrast/`).
4. **Un garde correct dont le message n'atteint personne** (géographie) : le contrôle de géométrie se
   déclenche bien — vérifié par une sonde `page.on("pageerror")` — mais `snap-static.mjs` et
   `smoke-filters.mjs` ne capturent pas les erreurs de page, donc un vrai run affiche un **timeout
   Playwright de 30 s** au lieu du message. Même classe pour les `TypeError` nus sur
   `undefined.objects` là où un import `?raw` a été retiré. L'information existe, est juste, et
   n'arrive jamais.
5. **`DotDensityMap.tsx:41` code encore `JOIN_KEY = "iso_a3"`** — donc un dot-density non-monde est
   refusé. Écarté du plan géographie avec sa mesure : l'édition est petite, mais la fermeture complète
   (retirer le refus de `map-native.ts` + une preuve rendue et inspectée qu'aucune autre hypothèse
   monde/iso_a3 ne s'y cache) est un lot à part — et la tâche 20 venait de découvrir un **crash de
   rendu vendor dans `RouteMap.tsx`** au moment exact où ce composant frère recevait pour la première
   fois de vraies données à pleine échelle.
6. **Le compte de règles numérotées de `SKILL.md` n'a toujours aucun garde-fou** — un en-tête « Four
   rules » a survécu à l'ajout d'une cinquième jusqu'à ce qu'un humain le lise ; `skill-doc-parity`
   épingle des chaînes, jamais un COMPTE.

**Discipline mesurée, à reconduire** : commiter AVANT toute vérification longue (toutes les pertes de
ces deux jours ont été des arbres non commités) · lire `lib` UNIQUEMENT via `cd lib && bun test`
(depuis la racine, l'invocation est sensible au cwd et fabrique 5 faux échecs) · un gate complet exige
une machine calme (deux gates concurrents invalident les deux) · ne jamais commiter les PNG
`output-proof/` régénérés.

---

## ★ État courant — 2026-07-28 (LIS CECI en priorité)

`main` = `splash-merge/`, gate **22/22** (22 checks : 9 `tsc --noEmit` + 13 `bun test` — le compte a
dérivé « 18 checks »/« 20 checks » selon les sessions passées, corrigé ici une fois pour toutes ;
le seul échec vu est le flake de contention `lib/verify/capture-html` : 120 s en suite complète,
20 tests en 7,7 s en isolation).

**LE FAIT QUI STRUCTURE TOUT LE RESTE — deux chaînes de production coexistent.**
`/splash` (et le harness) conduisent la chaîne EN PROSE : `skills/splash/SKILL.md` → `suggest-*`
jouées par le modèle → `produce-all.mjs`. La boucle V2 (`lib/loop` + `lib/brain` + `lib/core/verbs`,
pilotée par `lib/host`) est une SECONDE chaîne, mesurée par le gate et les preuves, et **aucun pont
exécutable ne les relie** (zéro import de `lib/loop` depuis `skills/`). Tout le travail V2 du
2026-07-27/28 vit dans une boucle qu'un journaliste n'emprunte pas encore. C'est LE chantier restant.
Mesure : `docs/splash/two-chains-gap-2026-07-28.md` (verdict phase par phase, la boucle gagne sur
tout ce qui se contraint, la prose sur tout ce qui se converse ; recommandation : la prose reste la
peau, les gates de la boucle descendent dessous phase par phase).

**Livré et fusionné aujourd'hui** : les six moteurs assemblables par la boucle (chacun entré dans
`lib/loop/assemble/` avec sa preuve de rendu, jamais avant) · la livraison hébergée enregistrée et
traversant capture→preview→approve→deliver · le scrolly traité comme un composant intégrable (le
marquage « branche article » retiré après un parcours complet, ce qui a démasqué deux gardes cassés
sur TOUT scrolly) · les 9 types DW « row-driven » rendus à l'offre · la voix journaliste (5 retours
de Rémy) · la charte dérivable du site d'une rédaction (`skills/newsroom-charter`) · l'export embed
réparé · l'arc narratif transmis aux pistes carte + la durée vidéo resynchronisée · `draft-beats`
franchissable par le driver et la CLI (`author-beats`).

**Trois documents mesurés, à lire avant de décider quoi que ce soit :**
- `docs/splash/what-splash-can-make-2026-07-28.md` — 107 marchent / 23 sortent défectueux / 63 ne
  sortent pas. ATTENTION : lecture MÉCANIQUE (la boucle compose + l'offre porte sans marque), rien
  n'y est rendu.
- `docs/splash/two-chains-gap-2026-07-28.md` — l'écart entre les deux chaînes.
- `docs/splash/sweep-2026-07-28-triage.md` — 484 constats → **32 défauts distincts**, avec au §8 le
  **découpage en 4 sous-projets et l'ordre** (commencer par A : « les règles écrites que rien
  n'applique » — D01 50/83, D02 56/83, D15 10/83 ; une seule cause : la règle est dans le SKILL.md,
  rien ne l'applique en run). Brainstorming de A entamé, spec PAS écrite.

**PROCHAIN PAS EXACT — le plan du sous-projet A.** La spec est écrite, relue et **approuvée par
Rémy** : `docs/superpowers/specs/2026-07-28-refusals-that-bite-design.md`. Il ne reste qu'à invoquer
`superpowers:writing-plans` dessus. Les trois décisions y sont gravées : un refus **dévie** vers le
pas qui débloque · avant toute validation splash doit avoir **partagé ET ouvert** l'artefact (média
affiché, HTML **lancé** — lire la source d'un HTML ne montre rien) · les **probes décident**, un
relecteur **distinct** juge l'éditorial. Et l'implantation : les trois mécanismes vivent dans la
BOUCLE, la prose les appelle — premier segment du pont.

**Grille mouvement+narration : FAITE** (branche `chore/motion-narrative-grid`, rapport
`docs/splash/motion-narrative-grid-2026-07-28.md`, non fusionnée). 71 cases, 62 `produce` réels.
Quadrant piège 4 → **0** : le format vidéo de `pyramid`/`treemap`/`waffle` (le still approuvé ≠ la
vidéo livrée) et de `dot-strip` (*two-state pop*, animation finie avant la moitié du clip) fermés
par `skills/chart-native/src/video-reach.ts`, per-(type,format) et non par un `deferred`. Quadrant
gaspillé : **9**, dont 6 `*Reveal` map inatteignables (et il y a **6** `*Story`, pas 7 — `route`
n'en a pas). **PORTE DÉROBÉE À FERMER** : `skills/scrolly/scripts/produce.mjs` ne valide pas — un
`arcBeats` y est silencieusement abandonné et la page part avec une légende dérivée sous la
signature (0/3 phrases, mesuré au navigateur). **NON MESURÉ** : les canaux carré et portrait — le
pin exact de taille n'est asserté QUE là et n'a jamais été exercé (~15 min, 34 rendus).

**Sweep QA du 2026-07-28** : arrêté volontairement à **83 cas sur 163** (rendement effondré, mêmes
classes répétées ; ~4,8 h de quota économisées). Journal complet conservé :
`../splash-harness/reports/sweep-2026-07-28-83cases.log`. Réglages validés par calibration :
`--concurrency 4` + `timeoutMs` porté à 1 800 000 — la contention ne dégradait PAS la durée par cas
(médiane 10,5 min contre 12 en séquentiel), c'est le plafond à 900 s qui fabriquait les faux
timeouts de la session précédente. Coût : l'ACTEUR domine (12 min de session agentique par cas) ;
le juge se rejoue seul sur les runs stockés (`../splash-harness/scripts/dimension-kappa.mjs`) ;
les contrôles `check:` sont déterministes et gratuits.

**Le sweep ne couvre PAS la grille** : mesuré, il n'a touché que **21 cases (type × format) sur ~138**,
et une seule vidéo. Une passe de grille mouvement+narration était en cours à la fin de la session
(branche `chore/motion-narrative-grid`) : deux jambes (offerte ? produit ?), fermeture immédiate des
cases offertes-mais-non-produisibles, rapport attendu dans `docs/splash/motion-narrative-grid-2026-07-28.md`.
Inventaire narratif exact : chart = `Reveal` seulement (123 compositions = 41 types × 3 cadrages,
AUCUNE narrative) ; map = `Story` (vidéo narrée) + `Reveal` + `Scrolly`, 7 types chacune ; le skill
`scrolly` n'a PAS de Remotion (build Vite). Chaque scrolly a deux variantes à éprouver : marche
dérivée, et beats RÉDIGÉS — c'est là que vivaient tous les défauts du jour.

**Motif à surveiller plus que n'importe quel défaut** : trois fois ce jour-là, un défaut a survécu
parce que le CHEMIN DE VÉRIFICATION évitait l'endroit qui casse — la preuve des beats court-circuitait
le driver ; un test de fréquence était vert avant comme après le correctif ; une garde i18n était verte
parce qu'affamée. Et trois fois un agent a affirmé faux avec assurance (« 8 appelants » = 12, « 25
échecs réels » = environnementaux, un plafond qui ne plafonnait pas). La relecture adversariale les a
tous attrapés ; la bonne foi, aucun.

---

## ★ État courant — 2026-07-21 (LIS CECI pour l'état de `main`)

`main` (voir `git log --oneline -15` pour le HEAD exact), gate `bun run check` **22/22** (tsc skills + install + image-native + installer, suites de test — vert ; le produce map-native interactif/vidéo ET le map-dw e2e API-réelle peuvent timeout/flaker sous contention réseau, rotent, passent en isolation). 0 mention vendor attributive. Le **journal daté complet** = `docs/splash/CHANGELOG.md`.

> **★ 2026-07-21 — AUDIT #2 → 2 piliers mergés main (détail → CHANGELOG).** Rémy a challengé la qualité (flow jamais testé pour de vrai, narratif scrolly/story = data-dump, colorimétrie, échanges du flow) + Spotlight/Tom (orchestrateur strict). **Audit #2** (`docs/splash/audit-2026-07-21-orchestration-and-quality.md`, 6 agents, thèse du SEAM : front éditorial flexible model-driven / back production strict code-owned) → 4 piliers S1-S4. **S1 seam de production strict** (`72b3c8e`) : l'export vérifie mécaniquement la provenance de la chaîne `candidates→accepted→produce-all→outputs` (`assertChainProvenance`, `render-provenance.ts`) → un spec hand-authoré/bypass est **UNSHIPPABLE** (tue le critical improvisation de la cert). `produce-all` estampille `acceptedConfigHash` (spec pré-merge, source hash unique `canonical-json.ts`). HMAC-token du spec superszédé par la vérif-chaîne on-disk (honnête). **S2-slice-1 claim-arc narratif chart-native** (`df2e888`) : beats = ARGUMENT (`establish→build→turn→payoff` ≙ Cohn E/I/P/R / Amini CHI'15), `NarrativeBeat.role` + `arcErrors` fail-loud au gate spine, fallback saillance FLAGGÉ à Gate 3a, `story-warrant.ts` `assessStoryArc` (**heuristique MAISON explicite** — pas de source citable, dit tel quel) propose statique-vs-scrolly vetoable, Gate 1b élargi au claim-arc. Legacy byte-identique. Review finale opus 0C/0I sur les deux. **S2-slice-2 parité carte** (`126d8b0`) : `arcErrors` factorisé en `lib/core/claim-arc.ts` (chart+map partagent), **choropleth + symbole** acceptent un override journaliste `arcBeats` région-ancré (`applyMapArc`, path saillance byte-identique) ; les 4 autres derivers carte = `Beat.role` seul (override = follow-up assumé) ; validation pure extraite en `map-native/src/map-arc.ts` (garde `remotion` hors du closure d'import de validation — drift-guard `validate-closure.test.ts`). Review finale opus : 1 important (validator↔deriver region-space carte → erreur produce honnête ajoutée) + closure-regression attrapée au gate + strict-null, tous corrigés ; gate 22/22. **S3-slice-1 couleur OKLCH mergé main** (branche `feat/oklch-sequential-ramp`, review finale opus MERGE 0C/0I, gate 22/22) : la rampe heatmap chart passe du blend sRGB boueux (`_mix`) au moteur perceptuel OKLCH partagé `lib/core/house-ramp.ts` `hueRampOklch` (L-linéaire ; clair pâle→profond, sombre saturé-mid→bright avec chroma-shrink pour éviter le collapse gamut). **Gate d'uniformité fail-hard** `rampUniformityIssues` (span + anti-kink) dans `checkHeatmapConformance`, **span floor theme-aware** (0.60 clair / 0.40 sombre — le plancher a11y 3:1 sur near-black borne physiquement le span L atteignable). **Plafond chroma muté 0.12** (§4 tiré en avant) rend le gate fail-hard sûr pour TOUTE teinte newsroom (sweep 288 combos = 0 échec ; sans cap ~14/24 teintes vives bloquaient). `houseRamp` carte byte-identique. Render-prouvé (heatmaps clair/sombre + rouge vif muté, plus de collapse). **S3 accent/neutre = CONSTAT déjà-fait** (grounding, comme la prémisse HSL de slice-1) : « 1 accent, reste gris » est déjà appliqué partout où il s'applique proprement (`barColor` highlight→accent+`C.muted`, `SlopeChart`, line/scatter mono-série) ; l'arc-en-ciel ne sert qu'à StackedBar (composition, exempt correct) et GroupedBar (seul type à-sujet encore arc-en-ciel = fan-out). Pas de slice full — YAGNI. **S3-slice-3 neutres teintés mergé main** (branche `feat/tinted-neutrals`, review finale opus MERGE 0C/0I, gate 22/22) : les gris de furniture (`muted`/`axis`/`grid`) portent un murmure de la teinte maison au lieu d'un gris mort. `tintNeutral(grey, houseHue)` = L OKLCH du gris préservée + teinte maison à chroma 0.03 (render-tuné depuis 0.015 imperceptible) → **contraste préservé** (sweep 16 teintes × 2 fonds = 0 échec, worst 5.25:1). `deriveFurniture(bg?, houseHue?)` teinte les 2 chemins (clair-défaut + fond dérivé), byte-identique sans houseHue ; threadé via `themeColors(themeBg, baseColor)` sur line/bar/scatter (workhorse). `ink`/`bg`/`line` intacts. Render-prouvé. **S3-slice-3b fan-out tinted-neutrals mergé main** (branche `feat/tinted-neutrals-fanout`, review finale opus MERGE 0C/0I, gate 22/22) : `ChartFrame` gagne une prop `baseColor` (ferme l'incohérence corps↔frame) + `config.baseColor` threadé dans les **16 charts qui l'ont** (13 corps+frame · line/bar/scatter frame-only) → la couleur maison du profil (`mergeProfileDefaults` pose `baseColor`) teinte la furniture de TOUS ces charts, plus juste 3. **Parallélisé** : 2 implémenteurs en worktrees isolés (moitiés disjointes) + cherry-pick — gain de temps. Les 11 charts sans `baseColor` (Pie/Stacked*/DivergingBar/Slope/Waterfall/GroupedBar…) restent gris pur (teinte story-wide = palette-story). Render-prouvé (lollipop house vert : source ChartFrame + axe = même teinte). **S3 palette-story = story accent mergé main** (branche `feat/story-accent`, review finale opus MERGE 0C/0I, gate 22/22) : **décision CVD-first** — le catégoriel reste Okabe-Ito (colour-blind-critique, une palette de marque arbitraire n'est pas CVD-safe), donc palette-story ne touche PAS les couleurs de séries. Le vrai gap trouvé : `profile.accent` était **capturé mais mort** (`mergeProfileDefaults` ne threadait que baseColor). Fix : `mergeProfileDefaults` sème `spec.accent` depuis `profile.accent` (chart) ; **5 charts à-accent-éditorial** (Slope/Lollipop/Histogram/RadialBar lisent `config.accent ?? vermillon/orange` ; Bump : accent en fallback avant `BUMP_ACCENT_COLORS[0]`, baseColor/series gagnent) → l'emphase éditoriale est brand-consistante story-wide. **Intouchables** : catégoriel Okabe-Ito · rôles sémantiques (diverging/waterfall/Likert) · highlight=baseColor (bar/scatter, déjà brand). **a11y déjà-wirée** (`houseMarks` collectait déjà `config.accent` lignes 140-141 → `checkMarkContrastOnBg` flag non-fatal un accent faible-contraste sur les runs `brandExplicit` ; prouvé pale #E8D8F0→concern) — zéro code a11y neuf. **Parallélisé** (Task 1 splash + Task 2/3 chart-native en worktrees isolés simultanés + cherry-pick). Byte-identique sans `profile.accent`. Render-prouvé (slope : vermillon défaut vs violet accent, contexte inchangé). Minor (opus, follow-up) : les checks géométrie par-type valident le défaut pas l'accent live — intentionnel (ces checks sont fatals, re-feeder un accent custom le hard-rejetterait = viol policy b). **S3 fan-out résiduel carte = map tinted-neutrals mergé main** (branche `feat/map-tinted-neutrals`, review finale opus MERGE 0C/0I, gate 22/22) : la furniture carte gagne le même murmure de teinte maison que la furniture chart (slice-3b). La « variance par-type » redoutée s'est effondrée au grounding en **une seule expression uniforme** — `config.brandHue ?? config.brandPalette?.[0]` (Locator porte `brandPalette`, pas `brandHue` ; les deux tracent `profile.palette[0]`) — car `config` est en scope à CHAQUE render-site ; zéro branchement par-type. `resolveFrameColors(themeBg?, houseHue?)` tinte `muted` via `tintNeutral` (chroma 0.03, L OKLCH préservée → contraste préservé), sur les 2 chemins (clair-défaut + fond dérivé), byte-identique sans houseHue. `MapFrame`+`MapFilterBar`+`legendTheme`+`map-produce-conformance` gagnent `houseHue?` ; **43 render/call-sites** threadés (27 `<MapFrame>` + 6 `<MapFilterBar>` + 10 `legendTheme`) ; **drift-guard source-scan** (`frame-house-hue-parity.test.ts`) verrouille la complétude (review a attrapé un bug de scoping de tag — nested `<MapFilterBar/>` dans `belowTitle` pouvait satisfaire le check de MapFrame → corrigé `openingTag` brace-depth + `stripNestedTags`, mutation-vérifié). Guard de conformance validate le `muted` **teinté réel** (`furnitureColorsFor` helper, plus le gris mort). Render-prouvé (choropleth + symbol brandHue vert : rampe/marks maison + furniture WCAG 0 violation sur PNG composité réel ; no-hue byte-identity sain). Minor (opus, non-bloquant, fixé) : test dark byte-identity tautologique → pinné à un littéral. **S3 résidus tranchés au grounding (2 non-gaps / deferred low-value)** : (1) **grouped-bar accent = NON-GAP** — `GroupedBarChart` utilise `GROUPED_SERIES_COLORS` = Okabe-Ito catégoriel, le choix CVD-correct pour N séries comparées (l'« accent+gris » ne s'applique qu'à un highlight mono-sujet, pas au défaut) ; reclassé comme palette-story. (2) **furniture des charts sans baseColor = DEFERRED low-value** — `mergeProfileDefaults` sème DÉJÀ `baseColor: palette[0]` sur TOUS les specs chart ; les ~24 charts qui ne threadent pas `config.baseColor` à leur `<ChartFrame>` (Pie/Stacked*/Diverging*/Slope/Waterfall/GroupedBar/Dumbbell + les 14 Family-B, tous registrés statique+interactif = ~24-48 sites) auraient un murmure de furniture (chroma 0.03) IMPERCEPTIBLE sur des charts dont l'encre est catégorielle/rôle ; value/effort faible, la covering-array de S4 les exercera de toute façon. Le cohort naturel « a un baseColor » (16 charts) est fait (slice-3b). **T1-slice-1 lib/core golden-hardening FAIT** (branche `feat/t1-lib-core-golden-tests`, mergé main, review finale MERGE 0 finding, gate 22/22) : les 2 pires fichiers de parités tautologiques d'agent 6 (`video-verify.test.ts` 6/6 comparait lib/core à son propre `export *` re-export ; `theme.test.ts` 2 parités contre les re-exports tokens/map-tokens) → réauthorés en assertions **golden/analytiques indépendantes** (meanAbsDiff/lumaVariance/diffRatio dérivés à la main ; tables furniture hex pinnées ; verdicts verifyVideo pinnés), **chaque golden mutation-prouvé** (mutation source → test FAIL → revert ; 6 mutations). **TEST-ONLY** (source lib/core byte-identique, vérifié `git diff main`). Reviewers ont re-dérivé les oracles indépendamment 2×. **T1-slice-2 FAIT** (branche `feat/t1-slice-2-golden`, mergé main, review finale MERGE 0 crit/imp, gate 22/22) : audit des 6 fichiers cross-module restants → **4 tautologiques durcis** (`locale` 17, `text-fit` 21, `house-ramp` shim, `contrast` 4 — tous comparaient lib/core à ses propres `export *` re-exports) réauthorés en golden/analytiques + **mutations prouvées** (8 mutations ; agent locale a même capturé les VRAIS bytes runtime que l'ancien test tautologique masquait) ; **2 LAISSÉS** (`conformance-l0` = parité cross-impl légitime + vrais goldens ; `i18n-furniture` = a déjà un guard d'IDENTITÉ de re-export `toBe core.SOURCE_LABELS` + table golden bytes). TEST-ONLY (4 sources lib/core intactes). **Parallélisé** : 4 implémenteurs worktree-isolés simultanés + cherry-pick (⚠️ le worktree-isolation du harness s'ancre au repo `/splash` sur `feat/splash-apertus-sovereign` `e8173f0` — mauvaise lignée ; 3/4 agents ont self-recover en branchant sur `main`, le 4ᵉ re-dispatché avec instruction de recovery explicite ; commits accessibles car object-store partagé). **T3 FAIT** (repo `../splash-harness`, master `06d8aa1` — NON poussé, push harness = décision Rémy séparée) : le vrai bug `src/sandbox.ts:305` (`l.worktreeDir` inexistant sur `NodeModulesLink` → `linkedTargets` tout-`undefined`) corrigé en `l.link` (= `join(worktreePath, rel, node_modules)`, exactement ce que `realListUnlinkedSkillDirs` teste via `linked.has(nm)`) ; **2ᵉ bug indépendant démasqué** (l'agent scopé src+CI l'a flaggé sans y toucher) : le mock `tests/sandbox.test.ts:553` passait un chemin absolu+suffixé au lieu d'un dir relatif → `join` doublait `node_modules` → corrigé au contrat réel. Suite harness **381/1 → 382/0**. **CI harness créée** (`.github/workflows/ci.yml` : `bun install`+`bun test` sur push/PR) — le test rouge ne peut plus se cacher (l'audit : « un test qui l'attrape mais aucune CI harness »). **T2 FAIT** (branche `feat/t2-render-ci`, mergé main, poussé) : le render n'était JAMAIS en CI (`bun run check` = typecheck+unit seul). Ajout de 2 jobs à `.github/workflows/ci.yml` : **`render-chart`** (toujours, sans clé — chart-native n'a pas de dépendance API/tuiles ; render smoke `produce.mjs bar` → PNG >1KB **re-prouvé local 47991 bytes** + `bun run check:render` dont les moteurs à-clé self-skip vert) · **`render-map`** (gaté `if: secrets.MAPTILER_KEY != ''` → skip vert sans secret ; `VITE_/REMOTION_MAPTILER_KEY` câblés depuis le secret ; tourne quand un repo provisionne la clé). `check` intact, gate 22/22. **T4 FAIT** (reframe cert honnête — repo `../splash-harness` master `0f293b4`+`e2058aa`, NON poussé) : la cert présentait 2 « théâtres » (audit §6) → corrigés. (1) **déterministe vs juge-opinion** : les counts critical/major/minor lumpaient les findings mécaniques (`source` commence par `check:*`, garde-fou fiable) et les findings du juge LLM (`source==="judge"`, faillibles/hedge-ables) ; maintenant split partout — `critical 2 (1 mechanical · 1 judge-opinion)` — via `SourceSplit{mechanical,judgeOpinion}` sur `SeverityCounts.*BySource` + `isDeterministicSource()` partagé (rapport HTML `suite-report.ts` + stdout CLI `run-e2e.mjs`, les 4 sites). (2) **« delivered ≈ ça n'a pas crashé »** : reframé « N/M produced an artifact (delivery = did not crash, NOT a pass verdict) » + disclaimer trust + CSS green retiré (ne se lit plus comme un pass de cert). 6 tests HTML + 1 test `fmtSev` CLI ; suite harness **382→389/0**. **S4 décomposé en 4 sous-systèmes** (2 autonomes, 2 human-gated) au brainstorm — **S4a FAIT**, S4b/c/d à venir. **S4a — rubrique flow-process A1-A8** (repo `../splash-harness` master `e276423`→`3b588ce`, review finale opus MERGE 0 crit/imp, suite 389→397/0, NON poussé) : répond au #1 trou de l'audit « rien testé du flow ». **Grounding = demi-vérité démasquée** : la plupart des garde-fous flow DÉTERMINISTES existaient déjà (`check:gate-discipline`=A2, `check:render-shown-before-validation`=A5, `check:single-proposal`+`secondary-dropped`=A4, `check:real-system`+`stray-tool-call`+`skills-invoked`+`suggester-invoked`=A8) — juste jamais organisés en rubrique ni gaté en CI (T3). S4a = **consolider + combler 2 trous + router le sémantique au juge** : (1) `src/flow-rubric.ts` `FLOW_RUBRIC` data-only mappe A1-A8→check:* + **drift-guard** (un check renommé casse le test) ; (2) `check:takeaway-confirmed` (A7, miroir ordering A5, signal primaire = marqueur `confirmedTakeaway` langue-indép, fallback dialogue FR+EN) ; (3) **A3 = JUDGE-FALLBACK honnête** — `check:over-ask` PAS shippé (il false-positivait sur tout article nommant INSEE/Eurostat = flux Splash courant) → A3 `kind:"judge"` sans check (cohérent invariant T4 : pas de faux-positif déguisé en mécanique) ; (4) section « Flow rubric A1-A8 » dans rapport+suite (badge mécanique✓/juge~ advisory-jamais-pass, hard-gates A5/A8 distincts). A1/A6 = juge (sémantiques). **S4b-1 coverage analyzer FAIT** (repo `../splash-harness` master `8bec831`→`9a64996`, 8 commits, review finale opus MERGE + Important corrigé+re-vérifié, suite 416/0, NON poussé) : la moitié autonome/zéro-spend de S4b. **Répond chiffré à l'audit « matrice re-run vs vrai stress-test »** : un CLI standalone (`bun scripts/coverage.mjs`) extrait/infère 5 axes des 105 cas (family/channel/language/format/theme — sentinelles `unknown`/`unpinned` comptées à part, honnête), calcule la couverture pairwise contrainte par `isFormatAllowed` (table `CHANNEL_FORMAT_ALLOWED` miroir `channel.ts`, lock-testée), et génère un covering-array IPOG **seed-driven** (prouvablement couvre chaque paire valide + fail-loud sur domaine infaisable). **Verdict livré : 34,2% de couverture pairwise de l'espace canonique réel** (91/266 paires ; video/scrolly **jamais testés** → surfacés comme trous ; channel clusterisé article-web:93/social:12 ; format non-pinné 98/105) + **66 cell-specs** pour combler les trous (→ S4b-2). **La boucle review a attrapé 2 bugs réels** dans le covering-array (Critical sous-couverture silencieuse sur axes >2-valeurs → réécrit seed-driven ; Important cellule violant la contrainte sur domaine infaisable → fail-loud) + 1 Important à la review finale (domaines observés-seuls masquaient video/scrolly → domaines canoniques + exclusion sentinelles = le vrai 34,2% honnête vs 49,8% trompeur). Output `coverage/` gitignoré. **S4b-2a materializer FAIT** (repo `../splash-harness` master `0559aee`→`f306a0f`, 7 commits, review finale opus MERGE + Important corrigé+prouvé, suite 434/0, NON poussé — pas de remote, décision Rémy) : la moitié autonome de S4b-2. **RECOMBINE** les fragments des 105 cas → des cas runnables ciblant chaque covering-array cell (`pickSource` family-match+langue · `recombine` : canal/format = *demande* persona+expect, langue = traduction `claude -p` si besoin, thème = `newsroom-profile.md`). **Invariant d'honnêteté : `extractAxes(cas matérialisé) == cell`** — le CLI SELF-VÉRIFIE chaque cas écrit et **démote les dérives** en un-materializable (la review finale a trouvé une fuite thème réelle — `extractAxes` détecte le thème par regex sur le blob JSON persona+expect, certaines sources portent « newsroom » dans un redLine → dérive silencieuse sur les cas `default` ; corrigé par le self-verify, re-run a démoté 3 dérives réelles dont 2 que la review n'avait pas vues). Acceptance prouvée : 3 cas matérialisés end-to-end (1 fr→de traduit), extractAxes 3/3. `cases/gen-*` gitignorés. **PROCHAIN : S4b-2b** (générer les 66 cas `bun scripts/materialize-cells.mjs` puis les FAIRE TOURNER via acteur+persona+juge = **LE spend event, échelle limite-mensuelle** — piloter 1-2 d'abord pour mesurer, décision Rémy) puis **S4c juges-par-dimension+κ / S4d gate humain** (attendent Yvan/Rinny) · follow-ups : provisionner secret `MAPTILER_KEY` (active `render-map` CI) · **pousser splash-harness master** (T3+T4+S4a, décision Rémy) · A7 fallback DE/IT dialogue (marqueur couvre déjà) · S2 follow-up carte · legend-swatch vidéo non-teinté 6 familles. · **S2 follow-up** (override carte route/cartogram/dot-density/hex-grid/locator) · follow-ups : **legend-swatch vidéo non-teinté sur 6 familles carte** (inline, pas de `legendTheme` ; deferred, scope-borné) · contraste fond gris-moyen ~0.25-0.4. Piliers restants du programme audit #2.

> ## ⏸️ REPRISE — 2026-07-19 (LIS D'ABORD ce bloc)
>
> **Où on en est.** `main` (worktree `../splash-merge`) ≈ **91 commits d'avance sur `origin/rd-dev`**, gate **20/20**, tout mergé. NON PUSHÉ (décision Rémy). Le repo `splash` réel est sur `feat/splash-apertus-sovereign` (session Apertus, à part). Harness privé `../splash-harness` sur `fix/improvisation-detection` (+ `SANDBOX_HEAD_REF` test-infra `20fb19b`, à cherry-pick vers `master`).
>
> **★ 2026-07-19 — FRONTIÈRE harness↔outil auditée + fuite principale FERMÉE dans l'outil (détail → CHANGELOG).** Rémy : « le harness ne fait QUE tester, l'outil détecte/orchestre tout ». Le routage suggesteur/menu de candidats était prose-only + harness-seul → **gate de provenance mergé dans `produce-all`** (`candidate-provenance.ts` : refuse avant production toute proposition non-directe dont le producteur n'est pas au menu, ou un run sans `candidates.json` ; producer-level pour ne pas faux-bloquer scrolly ; DIRECT seul exempté) + **warning narratif menu-level** (`report.warnings`, Tom #3). Les 4 checks harness deviennent de la pure vérification. **Prouvé en run réel** (`budget-commune-part` sur la branche via `SANDBOX_HEAD_REF`) : provenance passée légitimement, zéro faux-blocage. **#4 (clé) prouvé côté-outil** (le gate `produce-all` refuse avant prod sous condition clone-sans-clé ; save-key round-trip). **Axe FORMAT investigué → 3 faux-positifs démasqués** (switch format = choix journaliste informé, pas impro ; source waffle EST livrée — vérifié au DOM navigateur) + **1 vrai bug review-infra corrigé** : `snap-proof.mjs` capturait l'interactif en page-screenshot borné 560px → coupait le footer source ; fix element-screenshot `#root > div` pleine hauteur (`bbf7b1e`, render-vérifié + garde). **PROCHAIN : fly #5 (compte jetable, runbook prêt)** ou re-générer les `output-proof/*/interactive.png` tronqués.
>
> **Ce qui a été fait cette session (détail → CHANGELOG, 2026-07-16→18) :** le CHANTIER TOM complet (6 retours), l'audit agentic challengé (avocat du diable), le dégraissage prose validé au comportement, la résolution GÉNÉRALE de 4 bugs, le placement-à-la-livraison, le narratif toute-famille.
>
> **★ AUDIT des 6 retours de Tom (verdict honnête, 2026-07-18) — 4/6 prouvés en run, 2/6 construits mais PAS prouvés en conditions réelles :**
> - **#1 format trop tôt** → ✅ PROUVÉ (flow 12 étapes, canal en Q6, type avant format, cycle-2 re-format).
> - **#2 reco unique → sélection** → ✅ PROUVÉ + **caveat fiabilité FERMÉ (2026-07-19)** : le levier qui FORCE le menu est câblé — `produce-all` exige la provenance de candidats (`candidate-provenance.ts`), refuse avant production un spec dont le producteur n'est pas au menu. Le LLM ne peut plus hand-author en contournant le menu (sauf déclaration DIRECT explicite). Reste l'axe **format** (impro sur `accepted.json.format`), en cours.
> - **#3 texte→scrolly-images** → ✅ PROUVÉ (4ᵉ moteur image-scrolly ; `narrativePotential` détecté à l'ANALYSE ; dead-end fermé, cas Trump/Iran livre).
> - **#4 preflight/clé** → ✅ PROUVÉ CÔTÉ-OUTIL (2026-07-19) : sous la condition exacte de Tom (clone sans clé MapTiler), le gate `produce-all` refuse AVANT production (message langage-journaliste + URL, rien produit) — prouvé au vrai CLI ; round-trip `save-key.mjs` (yellow→green + miroir + chmod 0600). L'outil détecte/gère lui-même. (La *demande* conversationnelle reste prose ; le refus mécanique, lui, est prouvé.)
> - **#5 déploiement/crash** → le CRASH (`Cannot find package 'react'`) ✅ FIXÉ+PROUVÉ (C1, drift-guard) ; le **déploiement fly ⚠️ JAMAIS prouvé** (pas de FLY_API_TOKEN ; tous les runs livrent via embeds Datawrapper hébergés). **Besoin du token de Tom.**
> - **#6 guardrails anti-hallucination** → ✅ PROUVÉ (GUARD 4 étendu cartes + 2 angles morts fermés + never-fabricate + anti-improvisation + `docs/splash/guardrails.md`).
>
> **Décisions qui attendent Rémy :** (a) **push `main`→`origin/rd-dev` + demander à Tom de re-cloner et rejouer son cas** (= l'acceptance test des #4 et #5) ; (b) cherry-pick des commits harness vers `master` ; (c) follow-ups design non-tranchés (waffle « 1 case = N » unit ; ton de la notice IA MIT).
>
> **Prochain travail dispo (par priorité empirique, cf. `../splash-harness/FIX-BACKLOG.md`) :**
> 1. ✅ **FAIT (2026-07-19)** — levier de forçage du menu candidats = gate de provenance dans `produce-all`. **EN COURS : extension à l'axe FORMAT** (impro `accepted.json.format` interactive→static révélée par le run harness — même classe).
> 2. Levier `escalationReason` (escalade chart-native sans demande d'interactivité, 4× observé).
> 3. i18n furniture (menu a/b/c d'export-code codé FR ; CADRAGE ouvre parfois en EN sur article non-EN, 5×).
> 4. approximation-hardening (« meno di 48k » → 48000 exact, 3× Venezia).
> 5. Plan MIT-hardening (`docs/superpowers/plans/2026-07-16-mit-release-hardening.md`) à la release.
>
> **Méthode gravée de la session (à garder) :** rien ne passe sur la parole d'un agent — review adversariale ciblée « sur-correction/faux-positif » + preuve au rendu/transcript réel + doc-parity. Mes propres affirmations d'audit se sont fait corriger 4× par la vérif (« tous forwardent »→6/27, fix resolver incomplet, 2ᵉ instance ratée, « −55 % »→−9 %). **Baseline jugée = runs SÉQUENTIELS** (le parallèle tue les juges + fabrique des phantoms). **Vérifier le LIVRÉ, pas le proof ; le juge peut mentir ; les chiffres d'un audit-agent se challengent, y compris les miens.**

**Ce qui est construit et vert :**
- **Session 2026-07-16/17 — LE CHANTIER TOM (détail complet : CHANGELOG).** Premier test 100 % externe (Tom, clone rd-dev) → 6 retours → tout traité et mergé, gate 20/20 :
  - **Flow canonique 12 étapes** (décision Rémy, verrouillée — remplace le CADRAGE ≤4 questions ET la reco unique du 2026-06-23) : article demandé s'il manque · takeaway (1b) · table 2b (prose-only) + source 2c (TOUJOURS) AVANT tout routage · contraintes · **canal = Q6, dernière question** · **propositions plurielles groupées** (contrat `candidates` 2 stages de suggest-chart, artefact `exports/<slug>/candidates.json` écrit avant présentation, un accept par opportunité) · zéro question format (déduit canal×type, annoncé pour veto) · produce → ship-it → a/b/c → **offre re-format proactive** (étape 12, entrée `<id>-<format>`, exemption jumelle GUARD 3b suffixe==format).
  - **Narratif toujours CONSIDÉRÉ** : candidat narratif (chart-scrolly/map-story/image-scrolly/vidéo) présent quand la forme du récit le porte, sinon `narrativeRuledOut` explicite — absence silencieuse impossible (check harness + rubrique juge). **narratif TOUTE LA FAMILLE déclenché par l'ANALYSE** (`narrativePotential` sur le ProposalSet : temporal→chart-scrolly/vidéo · geographic→map-story/scrolly · visual→image-scrolly — indépendant de la richesse data ; la dispo des images se résout au CHOIX du candidat, jamais en question CADRAGE). Confirmé au rendu (série 5 points → chart-scrolly recommandé + line-reveal).
  - **4ᵉ moteur : image-scrolly** (phase 2 du design 2026-07-10) : prep sharp + `ScrollyImage` crossfade + produce scrolly-v1 + routing spine complet + `suggest-image` (vision = matching/ordre SEULEMENT, alt/crédit fournis jamais générés) ; e2e prouvé au rendu ; review = 2 HIGH path-traversal fermés (slug strict + containment).
  - **Placement à la livraison** : chaque élément livré indique OÙ le placer dans l'article (« À placer autour du §N, près de « quote » »), dérivé de l'anchor de suggest-article threadé sur AcceptedProposal (§5b) → surfacé à l'EXPORT ; multi-éléments = placement par élément. Prouvé au run double-opportunité (prix spot §1 / consommation §2).
  - **Préflight-prérequis** : manifeste par moteur (env+deps), tri-état persisté `.splash-preflight.json`, gate produce-all avant production, **clés manquantes COLLECTÉES dans le flow** via `save-key.mjs` (seul chemin d'écriture .env ; « Never start PRODUCTION on a non-green engine »).
  - **Closure de validation pure** : plus AUCUNE dep sibling requise au load (remotion/react/playwright lazy) + drift-guard auto-actualisant ; **GUARD 5 `skillsInvoked`** (branche guidée sans suggest-chart = FAIL) ; **GUARD 4** étendu map-native (`rows[valueField]`) + exemptions durées/tranches-d'âge fr-en-de-it (2 faux positifs réels qui re-pressaient des takeaways confirmés) ; `docs/splash/guardrails.md` = inventaire vérifié pour Tom.
  - **Pratiques Spotlight adoptées** (`docs/splash/spotlight-learnings.md`) : context recovery (table présence-d'artefact → étape, dans SKILL.md) · retry borné (erreur verbatim, 1×, shape-only) · stall protocol scripté · plan MIT B1-B4 prêt (`2026-07-16-mit-release-hardening.md`).
  - **15 runs de validation** (dont le cas Tom réel reconstitué : texte + 3 stats sondage sans dataset → LIVRE un bar honnête, 3ᵉ chiffre écarté explicitement) ; harness co-évolué (~20 commits : deep-verify hosted, juge 300s, 4 checks neufs, sandbox auto-install deps, driver 12 étapes, baseline jugée = SÉQUENTIEL). Backlog trié → prochain lot : cluster waffle (baseColor+grille+tooltip EN) · treemap baseColor · furniture a/b/c i18n · levier `escalationReason` (escalade chart-native 4× sans demande d'interactivité).
  - Spec-mère : `docs/superpowers/specs/2026-07-16-tom-feedback-flow-redesign-design.md` + 7 plans `docs/superpowers/plans/2026-07-16-*`. ⚠️ Push `main`→`origin/rd-dev` + re-test Tom = décision Rémy ; commits harness à cherry-pick de `feat/apertus-flue-runner` vers master.

- **Chaîne canal→format→taille→sous-format→export COMPLÈTE** (Slice 1 décision + Slice 2 rendu) : social-vertical → vrai 9:16, feed → carré, article-web → paysage/interactif ; hors-embed⇒jamais interactif enforced ; taille rendue == canal (fail-hard). Source unique `skills/splash/src/channel.ts`.
- **chart-native : 26 types natifs atteignables** de bout en bout (article→type→3 formats). **map-native : 7 types**, dark-mode complet sur static/interactif/vidéo/scrolly.
- **Enforcement mécanique orchestrateur slice 1+2** : gate fail-hard `isFormatAllowed`, garde aspect↔type au produce, producer-match, rejet TLD placeholder, ré-application au produce des garde-fous déterministes de suggest-chart (`guardrail-parity.ts`).
- **Filet deep-verify MÉCANIQUE** (`../splash-harness/scripts/deep-verify.mjs`) : ouvre interactif/scrolly et teste ce qu'un juge aveugle-aux-pixels rate (tooltip in-viewport · scrolly intro≠takeaway · fuite langue · hover). Parade systémique aux misses de vérif.
- **Bugs QA corrigés + deep-verifiés** (tooltip hors-fenêtre flip/clamp · labels rotés coupés tronqués · hover masqué small-on-top+nearest · CSV RFC4180 quoted · scrolly intro≠outro+noms FR+ramp subject-fit · dense-symbol snap-a11y prose · popup choroplèthe localisé).
- **Produce channel-gated** : les producteurs ne buildent plus l'interactif (ni ses snaps) quand le canal l'interdit (social → static.png seul ; article-web → interactif inchangé). Fin de l'over-produce.
- **Session 2026-07-10 — 3 cycles QA (waves 1-3, 16 cas) → 9 fixes produit + 3 fixes harness/rubrique, tous adversarial-reviewed SAFE + merge vert :**
  - **export dw-chart interactif** : `export-code.mjs` crashait (`embedSnippet(undefined)`) et livrait un `-export` VIDE pour un interactif Datawrapper (embed hébergé, pas de html local ; PNG nommé `<id>.png` pas `static.png`). Détecte maintenant la forme hébergée via le `report` (`publicUrl` + `outputs`) → `-export` complet (static.html a11y + EMBED.md → URL hébergée). **Chemin courant (article-web + chart standard) qui dégradait silencieusement — gravé.** *(périmé depuis le redesign single-format ci-dessous : plus de `static.html` a11y auto ni d'`EMBED.md`-fourre-tout — le hosted-DW livre l'URL embed via `EMBED_URL.txt`.)*
  - **chart-native** : tous les highlights d'un scatter labellisés (plus seulement le max-y) · value-labels survivent au reveal vidéo sur les petites barres (anti-pattern d'opacité tardive gravé en knob partagé `labelReveal` → **toute la famille barres**) · titre d'axe X ne surimprime plus la source (réserve de bas de cadre partagée `sourceFooterReserve`, symétrique du header).
  - **dw-chart** : annotations scatter résolvent la bonne colonne Y (lisaient le X/PIB → hors-canvas) + tripwire mécanique (throw si y d'annotation hors-domaine).
  - **CADRAGE Gate 1b** : la question takeaway/insight est un gate explicite **non-skippable** (confirm-back les deux branches).
  - **légendes carto** : nombres groupés locale-aware (`17600`→`17 600 €`, map-dw + map-native symbol).
  - **render-review** : une affirmation d'interaction (tooltip in-viewport, hover) exige de **citer le run d'un snap-script d'interaction** (qui tourne déjà fail-hard dans produce-all), jamais déduite d'un PNG statique.
  - **harness** : juge le VRAI `-export` (plus le build-subdir) — a tué une cascade de faux « export skipped » ; rubrique alignée (source name-only légitime · scrolly exempt de static.html · sous-gates 1b/2c/3a réels).
- **Session 2026-07-10 (suite) — EXPORT : choix de forme par le journaliste** (feature, mergé vert, adversarial-review SAFE + **build runnable indépendamment prouvé**) : splash propose 3 formes → le journaliste choisit → livraison façonnée (cf. décision verrouillée 2026-07-10 ci-dessus). Fix mécanique du « Livré. » nu : `export-code.mjs` émet la proposition. **Forme 1 = bundle React runnable** via `skills/chart-native/scripts/export-source.mjs` (nouvelle capacité : `bun install && bun run build` reproduit le visuel — vérifié de zéro). `judge.md` retourné (proposer les formes = flow voulu ; « Livré. » nu = défaut). *(Le « produire tout d'office PUIS proposer » de cette session est lui-même renversé ci-dessous — devenu paresseux.)*
- **Session 2026-07-10 (nuit) — REDESIGN single-format produce→export** (spec `2026-07-10-single-format-produce-export-design.md`, plan 7 tâches, branche `feat/single-format-produce-export`, gate 16/16, review clean par tâche) : **un élément = un format, produit et livré seul** — renverse le sur-produit constaté Wave 5 (`renouvelables` avait aussi buildé `interactive.html`+`static.png` en plus de sa vidéo ; `langages` avait livré le bundle React 146-fichiers entier sans attendre de choix). `spec.format` (un `VisualFormat`) pinné à la PROPOSITION (Gate 2 existant, vetoable) ; `produce.mjs <type> <config> <outDir> <format>` de chart-native/map-native/dw-chart ne build QUE ce format (fini le `static+interactive+video` par défaut) ; `export-code.mjs` pour interactif/scrolly propose a/b/c et **attend le choix** avant de matérialiser quoi que ce soit (bundle React / html / déploiement fly.io construits à la demande, plus d'office) ; `assertDelivered(files, {format, form})` valide la forme livrée par format. **Renverse 2 décisions verrouillées** (détail § Décisions verrouillées ci-dessus) : plus de `static.html` a11y auto-produit — les mentions « static.html a11y » de la session Wave 1-3 ci-dessus sont **périmées** (l'a11y sans-JS = choisir le format `static`) ; l'export ne matérialise plus toutes les formes d'office avant de proposer a/b/c (paresseux désormais).

- **Session 2026-07-11 — Wave 7 « tour d'horizon » (7 cas, matrice de formats) → 2 fixes produit + 1 faux positif démasqué, redesign single-format validé** (branche `fix/wave7-stacked-label-and-format-pin-doc`, chart-native 911/911) : **flow solide** — 5/7 livrés en single-format propre ; les 2 closed-early (interactif/dw) = cutoff harness a/b/c-capture connu, pas une régression. **Fix 1** : chart-native stacked-area label de bande droite tronqué (« Renouvelables 280 »→« 28 ») — gouttière droite dimensionnée sur le label le plus large (`endLabelGutterPx()` dans `core/text.ts`, plancher 116), render-vérifié, couvre static+interactif. **Fix 2** : splash `SKILL.md` contradiction interne — la section PROPOSITION promettait encore le fallback no-JS `static.html` « ALWAYS produced » (périmé depuis le redesign, contredisait §6+garde-fou export) et a causé un miss (dumbbell voulu STATIC pinné interactif) ; corrigé — format pinné = SEUL artefact, signal de format explicite du journaliste GAGNE sur `interactiveDefault`, annonce du format pour veto. **Faux positif démasqué** : `unemployment-mapdw` `numberFormat:"0.0%"` → le juge croyait « 290 % » (d3-format) mais Datawrapper APPEND « % » sans multiplier (`map-spec.ts:235`, render-vérifié « 2,7 % » correct) — corollaire « le juge peut mentir ». **Fix antérieur validé** : `temp-anomaly` end-label vidéo pile au bout de la ligne.
- **Session 2026-07-13 — Option 3 item 3 : bundle source React RUNNABLE pour map-native/scrolly** (spec `docs/superpowers/specs/2026-07-13-map-scrolly-runnable-source-bundle-design.md`, plan `docs/superpowers/plans/2026-07-13-map-scrolly-runnable-source-bundle.md`, 10 tâches, branche `feat/map-scrolly-source-bundle`, gate 20/20, review clean par tâche) : la forme « Code source » de l'EXPORT était chart-native only — map-native/scrolly livraient un dossier de fichiers déjà buildés (pas de source à reconstruire). Fermé : générateur `skills/splash/scripts/bundle-source.mjs` — tracer d'imports statiques CLOSURE-driven (pas l'esbuild du plan initial : les imports Vite `?raw`/`.css` ne s'y résolvent pas sans plugin), copie préservant le layout `skills/<engine>/{src,assets}`, deps DÉRIVÉES de la closure tracée (remotion inclus — sur le chemin interactif carte, jamais halluciné à la main). Les producteurs map-native/scrolly déposent `source-manifest.json`+`config.json` (nouveaux marqueurs) ; `export-code.mjs` route leur forme `code-source` dessus (au lieu du dossier de fichiers) ; `assertDelivered(code-source)` resserré exige `package.json`+`vite.config.ts` à la racine (plus un simple dossier non-vide). **Preuve de bout en bout via le harness opt-in `skills/splash/scripts/verify-source-bundle.mjs` (délibérément PAS dans le gate — réseau + build réels, trop lourd par run)** : 4 types rendus de zéro (choropleth, symbol, route, un map-scrolly = la closure à 3 arbres scrolly+map-native+chart-native) + les 7 types map-native build-vérifiés structurellement de zéro (`bun install && bun run build` propre). `bun run check` reste 20/20 (tests d'assemblage dans les TEST_DIRS existants `skills/splash`/`skills/map-native`/`skills/scrolly`, pas de nouvelle ligne de gate). Détail : CHANGELOG.
- **Session 2026-07-13 — Chantier déféré #1 : hang vidéo seismes ROOT-CAUSÉ + fix universel** (le seul `status=failed` du corpus, éliminé) : 2 causes prouvées — frame-gating non-borné (`map.on("idle")` jamais déclenché sur tuile bloquée → hang) corrigé par `continueWhenMapSettles` (idle OU settle 6s, l'invariant anti-hang) + bounds caméra antiméridien naïfs (survol du globe) corrigés par `shortWayLongitudeExtent` (arc minimal Pacifique-centré). **Propagé aux 20 composants vidéo-carte** (42 sites) + **drift-guard test** → hang structurellement impossible pour les 21 compositions. Render-vérifié : seismes symbole 927/927 frames (était hang indéfini) + choroplèthe 801/801. map-native 646/0. Détail : CHANGELOG.
- **Session 2026-07-14 — La couleur maison sur les CARTES ne marchait PAS en vrai (bug e2e attrapé par le harness, corrigé + prouvé au rendu)** : Rémy a challengé « tu dis avoir testé mais aucun nouveau splash-harness » — juste : le chantier couleur-maison (2026-07-13) était unit-testé + render-main mais jamais passé de bout en bout dans le harness (le `NEWSROOM-PROFILE.md` non-tracké n'existait pas dans le worktree détaché → chemin profil jamais déclenché). **Harness réparé** (repo `splash-harness`, `4e636da`) : `injectNewsroomProfileFixture` copie un `newsroom-profile.md` par-cas dans le worktree sandbox (jamais l'arbre partagé) ; `meta.json` note `newsroomProfileInjected` ; 3 cas ajoutés (choropleth clair, symbol sombre, scrolly). **Bug révélé par le run live** : le suggesteur émet TOUJOURS un `palette` subject-fit pour une carte (`"purples"`) → « explicit palette wins » l'écrasait sur `brandHue`, `houseRamp` ne se déclenchait jamais → carte VIOLETTE sous profil vert (les charts marchaient, pas les cartes). **Corrigé au système** (splash `main`, `f2db360`) : `mergeProfileDefaults` **efface** le palette auto d'une carte (map-native mécanique) ; règle Map-colour de `suggest-chart` = « maison d'abord + bouclier `baseColorExplicit` » (répare map-dw via omission `colorScale`, protège un ramp explicite journaliste) ; **échelle divergente garde sa palette registry** (rampe maison séquentielle ne peut pas encoder un midpoint signé — follow-up). Review adversariale opus : cœur SAIN + 2 findings adressés. **Prouvé au PNG rendu (méthode définitive)** : choroplèthe rampe verte maison (clair) + symbole fill ambre maison (sombre). ⚠️ **Leçon gravée** : grep de hex dans l'`interactive.html` est INVALIDE (bundle JS single-file inline toute la registry de palettes) — vérifier au PNG rendu / cœur géométrique, jamais au grep du bundle (une fausse alerte « toujours violet » a coûté une investigation). Gate 19/20 (seul échec = `docs/installer` gemini, session concurrente). Détail : CHANGELOG.
  - **Trou fermé — `theme: dark` du profil maison** (branche `feat/newsroom-theme-dark`, review opus SOUND) : le run dark a montré que la couleur maison se REND sur fond sombre mais qu'un journaliste ne pouvait pas CHOISIR le fond sombre via le flux (suggesteur n'émet jamais `mapStyle`). Fermé house-default : `NEWSROOM-PROFILE.md` gagne `theme: "dark"|"light"` → `mergeProfileDefaults` pose `mapStyle: dataviz-dark` sur chaque carte map-native/map-scrolly (map-dw exclu = follow-up DW ; par-élément prime). Render-prouvé : symbole sans mapStyle + profil theme:dark → fond sombre + cercles ambre.
- **Session 2026-07-14 (suite 3) — Vérif harness du thème arbitraire sur TOUS les formats + 3 trous corrigés, dont le scaffold scrolly blanc (branche `fix/theme-scrolly-scaffold-and-label-gutters`, gate 20/20)** : Rémy a fait produire scrolly + story via le harness pour prouver le thème, et a repéré que **seul le chart avait un fond coloré, le reste du scrolly restait blanc**. Cause : `ScrollyChart.tsx` codait `background:"#ffffff"` en dur (boîte de centrage) + le scaffold `Scrolly.tsx` (cartes/header/crédit/**fond global**) n'était pas threadé. Corrigé → tout dérive de `deriveFurniture(config.themeBg)`. **Check-up complet demandé** (« évite les trucs hardcodés qui cassent ») = **Workflow 45 agents + verify adversarial** : ce `#ffffff` était le SEUL vrai casse-thème ; les ~40 wrappers `#FFFFFF` des Reveal vidéo sont MORTS (ChartFrame peint son bg dérivé plein-cadre — render-prouvé au chart-vidéo navy), les littéraux carte sont liés-basemap (intentionnels). Lock `scaffold-theme-parity.test.ts`. **+2 trous** : gouttières de labels fixes → mesurées (heatmap « Vendredi » débordait → `leftLabelGutterPx`, étendu à boxplot/diverging-bar/diverging-stacked/lollipop) ; fuite nom-colonne (`seriesLabelFromColumn` : `shops`→`Shops` sur line directLabel + légendes séries). **Prouvé au rendu partout** : chart rose/navy/charbon/vidéo/scrolly, heatmap teal (rampe dérivée baseColor, cases basses lisibles), carte charbon (basemap sombre+teal+furniture), map-story vidéo, chart-scrolly navy plein-cadre. **5 cas harness neufs committés** (`splash-harness`). Résidu mineur : pill furniture carte-scrolly web (aucun casse-thème trouvé). Détail : CHANGELOG.
- **Session 2026-07-14 (suite 2) — Thème à FOND ARBITRAIRE : chaque chart ET carte dérive sa furniture de la couleur maison (branche `feat/chart-dark-theme`, gate 20/20)** : Rémy — « un newsroom pourrait l'avoir gris, rose, ou tout autre couleur… pas que heatmap mais tous les charts et maps » ; puis (challenge maps) « il y a le ground ET les éléments dessus, les deux doivent être adaptés ». Généralisé le thème binaire light/dark → **`themeBg` arbitraire** (#rrggbb quelconque) dont TOUTE la furniture dérive par contraste, zéro couleur en dur. **chart-native** : `config.dark:boolean`→`config.themeBg:string` (33 composants) ; `deriveFurniture` = ink pôle max-contraste (escalade au pôle PUR #000/#FFF sur la bande mid-grise ~#71–#81 où l'adouci tombe à ~4.0:1), muted mixé 30 % (≥4.5:1 marge), **rampe heatmap dérivée du `baseColor`** (plus de Blues en dur ; bas de rampe = mid visible ≥3:1 sur fond sombre, garde neuve). **map-native** (ground+éléments) : basemap snappé light/dark par luminance (tuiles MapTiler = 2 styles, contrainte) · marks = teinte maison (house-ramp) · **furniture pill/légende = `resolveFrameColors(themeBg)`** (pill = fond maison @0.82, ink max-contraste, threadé sur les 7 composants + validate-config). **splash** `brand-profile` : `theme:string` arbitraire → `themeBg` sur specs chart+map, `mapStyle` par luminance. Light default byte-identique partout. **Prouvé au PNG rendu** (charts rose/navy/charbon · heatmap rampe verte du baseColor + fond sombre lisible · carte pill rose basemap clair + carte navy réelle basemap sombre). **Review adversariale opus (5 axes, verify par finding) → 3 findings mineurs corrigés + gravés** (ink escalade pôle pur charts+maps ; garde produce-conformance validait #1A1A1A sur BLANC pour ~19 types → threadée sur le fond réel, un mid-gris illisible FAIL loud désormais ; garde map résolvait `themeBg` de 2 façons → unifiée) + 1 faux positif réfuté (strokes #fff StackedArea = séparateurs). Note : un mid-gris pathologique (#71–#81) FAIL le produce (aucun texte ne clear 4.5:1 dessus = physique WCAG) — les gris utilisés (charbon, gris clair) marchent, seul l'illisible est bloqué loud. Détail : CHANGELOG.
- **Session 2026-07-14 (suite) — Sweep QA rigoureux : harness parallèle + suite 80 cas + 6 fixes produit (gate 20/20)** : harness durci — **résilience suite** (un cas malformé n'abort plus tout le run — la raison probable que Rémy ne voyait jamais d'index de suite) + **parallèle borné `--concurrency N`** (ledger merge-once = pas de course, git-lock testé). **Suite 80 cas ×4 → 69 livrés, 11 timeouts, 173 findings** ; **LEÇON contention : les 11 timeouts + leurs 8 criticals = artefacts (11/11 re-livrés propres en séquentiel)** → un suite propre doit être séquentiel/concurrency≤2. **Triage adversarial (Workflow)** a écarté avec preuve les faux positifs du juge : **format-aspect = INTENTIONNEL** (d3-bars row-driven hauteur libre — failli « corriger » un non-bug), title-takeaway général = sémantique. **6 fixes réels mergés** : (1) tooltip titre chart-native (`<title>` SVG racine ×41 comp. → tooltip curseur redondant, supprimé) · (2) bar-scrolly honore l'ordre des beats (`resolveBarSort`) · (3) slope arrête de **tronquer la DONNÉE** ("Interm.") — gouttière pilotée par label · (4) scatter humanise les en-têtes snake_case · (5) contraste value-label in-fill (`labelInkOnFill` max-contraste, blanc-sur-`#009E73` 3,42:1 corrigé) · (6) claim-grounding (tokens numériques hors domaine data). **B/D source-preservation** = gardes prêtes mais **dormantes** jusqu'au threading `sourceHint` (backlog). Couverture couleur/thème re-vérifiée au rendu (maps statique+interactif+scrolly). Backlog : threading sourceHint, dw-chart value-label (YIQ≠WCAG, cf. Wave 13), subject-fit polish. Détail : CHANGELOG.
- **Session 2026-07-12 (suite 5) — Wave 13 : breadth + 2 gaps de capacité fermés** — 4 cas types/personas sous-testés, 0 critical ; waterfall (palette rôle intacte), bump (tooltip OK), diverging, **adversarial-contradictory géré sans major** (pie→bar, takeaway changé, correction rétractée — robustesse confirmée). 1 major = improvisation qui revient (bump, QA-attrapée, livraison propre). **★ Heatmap câblée end-to-end** (gap Wave 7 fermé : mapper + routing + 1er type continu valeur→couleur ; a débusqué+corrigé un défaut WCAG latent via SC 1.4.3 large-text, garde partagée bornée review-vérifiée) · **value-labels directs dw-chart** (FT #3 ; la garde modélise le YIQ de DW — pas WCAG-luminance — vérif live). Gate 20/20. Détail : CHANGELOG.
- **Session 2026-07-12 (suite 4) — Wave 12 : CONVERGENCE** — 6/6 livrés, **0 critical, 0 major**, toutes les confirmations Wave 11 tiennent au rendu (aging → 0 finding : improvisation surfacée+bascule propre ; scatter dégagé ; reframe mid-flow marche ; capture propre). **Bilan boucle QA Waves 8→12 (~40 cas, personas DE/IT/FR variés) : 0 critical produit sur 5 waves, chaque classe récurrente mécanisée, flake gate le plus fréquent éliminé, gate 20/20.** Résiduel = minors de polish (abréviation grands nombres value-labels · CADRAGE Q3 wording préférence-juge · indépendance Gate-3a) au backlog. Régime « propre ». Détail : CHANGELOG.
- **Session 2026-07-12 (suite 3) — Wave 11 : 3 confirmations OK (turnCap-40 résout · WAIT ne frictionne pas le happy-path · takeaway 2-parties tenu) + classe « improvisation » mécanisée** (5 fixes, gate 20/20 du 1er coup) : **garde anti-improvisation** (splash a fabriqué `verify-aging.mjs` ad-hoc, contourné un produce non-zéro, mv-é un artefact — attrapés par les checks sandbox harness ; Never list élargie + capture Gate-3 absolue) · **intégrité embed/fly** (choix embed calait sur `FLY_API_TOKEN` absent mais marqué delivered → fail-fast + assertDelivered exige URL réelle) · **modèle questions CADRAGE** (Q1 confirmé, comptage réel, anti-double-ask ; UNSAFE renumérotation re-scopée) · **occlusion titre-axe scatter dw** (Copenhague caché → domaine Y numérique étendu, render-vérifié ; fini inline après 2 morts d'agent) · **flake map-native éliminé** (produce MapLibre 86s→240s, la cause de re-run de gate la plus fréquente). Détail : CHANGELOG.
- **Session 2026-07-12 (suite 2) — Wave 10 : confirmation ciblée (italien + startup CONFIRMÉS 0-major) + longue traîne épuisée** : map-dw unité une-source-par-surface (le « %% » = collision unit×token-%, `number-append` réfuté phantom par 6 probes live ; + émission `unit` suggest-chart ; + join France sur `name`) · a/b/c WAIT-means-WAIT (SKILL + bloc émis + check harness ; sweep = 3 instances réelles) · **gate à 20 checks** (dw-chart+map-dw enfin typecheckés) · classe flake sous contention mécanisée (install 60s, map-dw e2e plafonné 2 charts + retry CDN 60s→37s, override `turnCap` par-cas). **Interrompu par la limite de dépense mensuelle** (waves harness + agents = sous-process `claude` bloqués ; `bun test`/`check` = Datawrapper/MapTiler, OK). RESTE À RE-RUNNER quand limite relevée : double-opportunité @ turnCap 40, aging (retries supprimés à la source). Détail : CHANGELOG.
- **Session 2026-07-12 (suite) — Wave 9/9b : fixes Wave 8 validés au rendu (Basel highlighted+Quelle DE · vert subject-fit · beats tenus), 0 critical sur 7/7 livrés, règles deux-opportunités + prose-only + italien validées ; ronde 9b mergée** (Q3 re-précisé 3×-flaggé · caption-de-beat vs ordre réel · tooltip choroplèthe avec unité hover-vérifié live · warning sparse-subset + routing sub-national · gate-render provenance · review comptabilité par-probe · tripwire duplicate-confirmedTakeaway · format-selection.md purgé · migration CSV RFC4180 fuzzée 300k · **gate 20 checks** — dw-chart/map-dw enfin typecheckés). « Vérifier le livré » a re-payé (le « 142 absent » = lag CDN, chart correct). Détail : CHANGELOG.
- **Session 2026-07-12 — Wave 8 QA (9 cas, personas variés : DE, pressé, pointilleux, sceptique, girouette, insistant) → 8/9 livrés, 0 critical produit réel, 5 chantiers de fixes mergés** (dont 3 systémiques classes-répétées) : barColor honore baseColor sur highlight (pixel-vérifié) · dw-chart validation STRICTE (champs inconnus fail-loud) + vrai `highlight` (DW custom-colors ; scanner RFC4180 porté après catch review) · beats narratifs scrolly explicites (auto par défaut byte-identique) · harness registration hosted-embed + driver répond a/b/c (bras structurel langue-indépendant après catch review DE) · `confirmedTakeaway` requis + print Q3 + règle incertitude-source. Trap stories-interactif = refus exemplaire ; snap vidéo validé en production (0.276 > 0.15). Gate 18/18. Détail : CHANGELOG.
- **Session 2026-07-11 (suite 3) — Tranche 3 : P-list mécanique de l'audit FERMÉE** (P3 snap label-fit + P5 gate i18n + densité dw-chart, même dispositif workflow+review-exécutante) : la review label-fit a couru la garde à 360px et découvert que le clip stacked-area **vivait encore au responsive narrow** ; le fixer a invalidé son hypothèse par la mesure (root-cause réel : inset de page 48px sous le plancher minWidth 280) et la recalibration a débusqué 2 clips de plus (FanChart projection, dot-strip) — **4 clips produit réels corrigés au layout, jamais via la tolérance**. i18n SAFE (furniture DOM natifs + invariant métadonnées DW asserté pré-API). Densité SAFE (dw-chart 2400→1200 IHDR, un canal = une taille ×4 producteurs, 2× DW re-prouvé live). chart-native 1034/1034, gate 18/18. Détail : CHANGELOG.
- **Session 2026-07-11 (suite 2) — Tranche 2 : les 2 gardes structurantes mergées** (même dispositif ; les reviews ont EXÉCUTÉ les gardes sur des rendus réels — 2 findings majeurs attrapés puis corrigés) : **P1 snap vidéo + watchdog** (mp4 réel vérifié fail-hard dans les 2 producteurs natifs : conteneur/reveal/progression/still-match + **vrai still final** `--frame=-1` ; watchdog process-group borne le hang seismes ; critical review = seuil mid recalibré 0.15 données réelles — LinePortrait sain 0.383 bloqué par le 1er jet) · **P4 plancher map-dw** (single-format static→PNG seul / interactive→embed seul, reject avant API, IHDR ±2px ; important review = channel absent des specs routées → `withProposalChannel` au dispatch, couvre aussi dw-chart). chart-native 988, map-native 622, map-dw 120, splash 262. Détail : CHANGELOG.
- **Session 2026-07-11 (suite) — Tranche 1 post-audit : 4 fixes qualité mergés** (workflow 4 implémenteurs parallèles worktrees + review adversariale par branche ; 2 UNSAFE corrigés puis re-vérifiés ; 1 agent mort repris) : **channel fail-closed de bout en bout** (garbled→throw ; normalisation unique au gate, dispatch canonique, `SPLASH_CHANNEL` fail-closed producteurs, dw-chart size avant API — la review a attrapé la régression alias→raw-env du 1er jet, reproduite mécaniquement) · **dw-chart « Source : » localisé** (miroir map-dw `annotate.notes`, SAFE, e2e API réelle re-runné par le reviewer) · **altInsight fail-hard + émis partout** (WCAG 1.1.1 : mapper→gate→ChartFrame visually-hidden + bundle React exporté via Provider dans main.tsx généré, prouvé sur build réel) · **discipline de clôture** (SKILL.md 1-message-max + détecteur pure-close conservateur câblé driver harness, 214/0). Détail : CHANGELOG.
**Principe de travail (toujours) :** boucle feedback→système (cf. Conventions) + **toujours vérifier le LIVRÉ, pas le proof** (leçon gravée : ouvrir/hover/lire l'artefact réel ; le proof peut mentir — interactif pré-hover, reveal non-coloré). **Corollaire 2026-07-10 : le JUGE peut mentir aussi** — 2 cascades de faux positifs (export-skipped, scrolly-sans-static.html) démasquées en inspectant le filesystem/`-export` réel. Vérifier le livré ET challenger le finding.

**AUDIT QUALITÉ 2026-07-11** (`docs/splash/audit-2026-07-11.md`) — score global **71/100 (B-)** : FLOW 73, RESULT 69. Fort là où le code garde (channel→format pinning, tripwires correctness, contraste WCAG chart-native, single-format), faible sur les axes sémantiques sans levier (titre↔takeaway, palette subject-fit) + couverture inégale (map-dw le plus faible ; vidéo non-gardée ; i18n jamais gaté). Fresh benchmark : F3 intention-format **réparé** (static demandé→static pinné, render-vérifié) ; R5 meilleur qu'attendu mais non-levier. **Items actionnables priorisés** — ✅ réglés Tranche 1 (2026-07-11) : P2 channel fail-closed (de bout en bout, dispatch canonique + producteurs) · boucle de sign-off (SKILL.md + driver harness) · alt-text chart-native (fail-hard + émis partout, bundle inclus) · dw-chart « Source : » i18n. **★ P-LIST MÉCANIQUE FERMÉE (Tranches 1-3, 2026-07-11)** : P1 snap vidéo + watchdog · P2 channel fail-closed bout-en-bout · P3 snap label-fit (static@900 + interactif@360/1100, clipPath-aware — **a débusqué 4 clips produit réels, tous corrigés au layout** : inset responsive/minWidth, légendes dumbbell + dot-strip, annotation FanChart) · P4 plancher map-dw (+`withProposalChannel` au dispatch) · P5 gate i18n furniture (DOM natifs + assertion métadonnées DW) · alt-text WCAG · sign-off · source-i18n dw · densité dw-chart harmonisée (un canal = une taille livrée ×4 producteurs). **Restants (non-mécaniques / follow-ups)** : palette CVD-adjacence (convention 3-blocs → 2 chaudes adjacentes confusables) · flags humains attestés-LLM (`approvedHash` jamais re-vérifié `gate.ts:4-10`) · chemin vidéo non-gaté i18n (indirect) · `sourceLabel` map-native FR-seul (gap de/it) · zoom DW non-pinné (plancher échoue fort si défaut change) · `output-proof` dw-chart à re-générer · judge.md:161-163 périmé (dw-chart « owned fallback », map-dw symbol) · still final map-native déféré (seismes-prone) + troncature map story post-frame-140 (exporter EXPECTED_FRAMES) · snap-tooltip-viewport pourrait s'aligner sur narrow=360.

**PROCHAIN / backlog :** (déférés — pas des quick-fixes) carte map-native interactive **dégrade en statique** sur données quasi-globales (clamp a11y bounded-nav trop strict — arbitrage capacité/a11y) · **titre qui diverge du takeaway confirmé** (Gate 1b — récurrent, règle non obéie ; pas de levier mécanique propre car divergence sémantique non-vérifiable — piste : champ `confirmedTakeaway` obligatoire) · renderers **Locator** (Reveal/Story/Scrolly) encore en `text-variable-anchor` (modèle de label différent : declutter prioritaire + text-allow-overlap → intégration distincte, pas le swap trivial) · vidéo produite mais run **closed-early** sans registration de livraison (harness) · harness marque « delivered » à la proposition a/b/c **avant le choix** — continuer le run au-delà (= follow-up « harness a/b/c-capture » du redesign single-format, hors-scope assumé) · **légende symbole clippe une unité-mot longue** (« 8 magnitud… » — largeur SVG fixe `max*2+70` ; pré-existant, marginalement pire depuis le fix espace-unité ; drop l'unité des lignes de légende car déjà sur les labels+sous-titre, ou élargir le SVG) · **`map-story.ts` fmt + `legend-format.ts` fmtBinRange même classe rounding+no-space** (chemin choroplèthe/bin — `labelWithUnit`/décimale à appliquer si un choroplèthe ship une unité-mot) · **map-dw (producteur carte Datawrapper) sur-produit encore PNG+embed** quel que soit le format — hors scope du plan à 7 tâches, traitement single-format analogue à dw-chart à donner · **snap WCAG statique ne tourne plus pour `interactive`** (le garde-fou config-level `produce-conformance` tourne toujours ; à trancher si un snap de contraste rendu dédié à l'interactif est nécessaire) · **vidéo map-native mappe toujours sur le style « story »** (« reveal » a perdu son accès CLI dans ce redesign — à faire un knob de config si voulu) · (mineurs) `produce.mjs` écrit `config.json`+`native-source.json` à chaque produce · bundle `README` EN vs relais FR · (existant) capture source (persona/article → prose) · Family B types natifs (14 déférés) · **release MIT** (confirmer REPO_URL public + scrub trailers `<vendor>-Session` — input Rémy + destructif) · titre trop long (110+ car.) sur un chart article-web (borne de longueur) · (harness) sortie du juge parfois non-parseable (JSON strict) — robustesse harness · **ConnectedScatterChart end-label** partage le pattern « gated sur progress maître, pinné au point fixe » (correct aujourd'hui car pas de mode scrolly — ancrer sur `head` si ça change) · **palette sémantique-carburant pour charts de domaine** (Wave 7 : mix électrique en Okabe-Ito catégoriel — charbon=bleu-clair peu intuitif ; convention dataviz énergie = charbon foncé/gris, renouvelables vert ; à réconcilier avec l'invariant CVD-safe global, décision design pas quick-fix) · **discipline d'annonce-de-format article/web doc-enforced seulement** (Wave 7 life-exp : format statique explicite du journaliste pas honoré car l'orchestrateur a défaut-interactif sans annoncer le format ; même classe que titre/takeaway — piste de levier mécanique si récurrent : rubrique harness « format livré ≠ redline format explicite » déjà attrapant) · **map-native produce interactif = test lent/flaky sous contention** (MapLibre, ~86s, timeout gate sous parallélisme + coupure réseau tuiles maptiler ; passe 568/0 en isolation — env, pas régression) · harness QA privé = `../splash-harness`.

**Session 2026-07-14/15 — RENOMMAGE Atelier→Splash + fermeture des résidus thème (gate 20/20).** Renommage complet dans le code (skills/atelier→skills/splash, dossiers repo → `.../splash` + `.../splash-harness`, 1434 occurrences, env vars `ATELIER_*`→`SPLASH_*` **aliasées** rétro-compat, docs+specs+noms de fichiers, mémoire Claude Code balayée ; 0 stray atelier hors alias ; **la seule chose non-changeable = le dossier mémoire Claude Code `-...-atelier` lié à l'ancien chemin**). Résidus thème fermés : **MapTiler mirror** (`.env` une seule clé suffit, Vite↔Remotion) · **map-scrolly hover popup** dérive du fond exact (bordures restent basemap-tied, correct). **Datawrapper thème fond-maison = VÉRIFIÉ IMPOSSIBLE sur ce plan DW** (`POST /v3/themes`→401 ADMIN_ROLE_REQUIRED ; `metadata.publish.background`/`visualize.background-color` acceptés mais **ne se rendent PAS** — PNG render-prouvé blanc ; aucun des 5 thèmes intégrés n'est sombre) → **la teinte maison sur les marks marche déjà** (baseColor/custom-colors) mais le FOND DW est plan-gated, pas un trou de code ; option de fermeture par le code = router les newsrooms à thème non-clair vers le natif au lieu de DW (Rémy a dit « on passe » — non implémenté). **PROCHAIN : sweep harness complet** (valider theme arbitraire + fixes labels/leak + rename sur tous les types) — gros spend, à lancer sur demande.

**Session 2026-07-26 — delivery genre routing : l'hébergement devient une propriété du format (branche `feat/delivery-genre-routing`, spec + plan 10 tâches TDD, worktree `splash-route`).** Fait mesuré déclencheur : le paquet zip d'un `static` tendait quand même un `EMBED.txt`/iframe pour un PNG, et `cloudflare-pages.ts` ne découvrait qu'après un vrai deploy que Pages ne résout `index.html` qu'à la racine de l'alias (un artefact non-HTML atterrissait avec la bonne extension mais une URL qui ne l'adressait pas). Fermé par construction plutôt que par un adressage `${url}/index.png` : `deliveryGenreFor` (`lib/core/publishers.ts`) classe `static`/`video` en genre `file` (jamais hébergé, toujours routé vers le zip portable par défaut, `lib/delivery/routing.ts`) et `interactive`/`scrolly` en genre `embed` ; chaque `Publisher` déclare `serves` (les formats qu'il peut porter — `zip`/`embed-s3` = tout, `embed-cloudflare` = HTML seul) ; `deliver()` refuse une destination illégale AVANT tout I/O, ce qui rend le gap Cloudflare structurellement inatteignable (le commentaire KNOWN GAP est retiré, remplacé par l'explication). `renderSnippet` construit `<img>`/`<video>`/`<iframe>` selon le format (plus un iframe systématique) ; un zip du genre `file` livre fichier + `ALT.txt` (texte alternatif à coller dans le champ CMS) + README réécrit, sans `EMBED.txt` ni iframe ; `PublishOutcome.snippet` devient optionnel ; `requestDelivery` (`lib/loop/request-delivery.ts`) écrit `delivery.requested` selon le genre du format — posé et testé, mais **aucun chemin de production ne l'appelle encore** (le driver ne route vers `deliver()` que si ce slot est déjà rempli, `lib/loop/manifest.ts:270`) ; le câblage est la tranche façade différée (spec §7). **Preuve live** (commit `7a4970c`) : vrai MinIO sous colima, `produce()` réel via `propose()` (canal `social-feed`, format `static`), publié puis re-fetché — `GET` 200, `content-type: image/png`, 29450 octets, magic number PNG (mesuré via un script de sonde non committé). **Revue finale (2026-07-26)** : le test committé n'assertait pas la comparaison de hash affirmée dans une session antérieure — corrigé par une assertion d'égalité d'octets fichier-servi/artefact-produit dans `lib/loop/delivery-genre-e2e.test.ts` (le contrôle à vraie valeur, `deliveredProvenanceHash` étant quasi tautologique côté `deliver()`) ; pas rejouée en live (MinIO démonté). `docs/splash/proposal-brain-followups.md` : le résidu cloudflare-pages est marqué fermé. Détail : CHANGELOG.

**Session 2026-07-28 — la boucle éditoriale assemble les SIX moteurs (branche `feat/engine-assemblers`, plan 14 tâches TDD, worktree `splash-assemblers`).** Avant : `produce()` ne savait composer une spec que pour **un seul** de ses six moteurs de rendu, et `LOOP_BUILDABLE_ENGINES` était une liste écrite à la main que quelqu'un devait penser à tenir vraie. Après : une **table d'assembleurs** (`lib/loop/assemble/index.ts`) porte les six — `chart-native`, `map-native`, `scrolly`, `image-native`, `dw-chart`, `map-dw` — `LOOP_BUILDABLE_ENGINES` en est **dérivée** (les clés de la table), et la constructibilité descend au grain `(type, format)`, plus seulement au moteur. La règle de la table : **une clé n'entre que dans le commit qui apporte sa preuve de rendu** — d'où les quatre preuves neuves au roster de `bun run proofs` : `lib/loop/map-e2e.test.ts` (carte assemblée par la boucle, rendue par le moteur, PNG mesuré), `lib/loop/image-e2e.test.ts` (photographies déclarées + beats rédigés → vrai image-scrolly), `lib/loop/dw-chart-e2e.test.ts` et `lib/loop/map-dw-e2e.test.ts` (assemblés par la boucle, publiés par Datawrapper, re-lus depuis le manifeste persisté). Le scrolly a la sienne — `lib/loop/beats-render-proof.test.ts`, gate `SPLASH_PROVE_BEATS`, elle passe maintenant *par* `produce()` — et elle est **au roster de `scripts/proofs.mjs`** (commit `d704440`), qui en compte donc **11**. Trois chantiers de fond au passage : la boucle sait **enregistrer une livraison hébergée** (l'`ArtifactRecord` devient une union fichier|hébergé, discriminant optionnel côté fichier → aucun manifeste existant à migrer) ; la couche capture sait exprimer « largeur épinglée, hauteur suivant le contenu » (`HeightPolicy`, `lib/verify/types.ts`), ce qui **rend les types Datawrapper row-driven à l'offre** (ils en étaient exclus parce que deux checks — `size-matches-destination` et `fits-viewport` — tombaient sur un artefact pourtant correct) — **6 des 9**, corrigé après la revue finale : `d3-bars-split`, `d3-arrow-plot` et `tables` sont marqués `deferred` dans le manifeste de dw-chart lui-même (« aucune fiche KB ne modélise ce type »), et la table lit désormais ce drapeau au lieu de revendiquer ce que le moteur nie ; **rien ne bouge à l'offre**, `renderableSheets` joignant déjà par le même drapeau ; **A34 fermé** (`Scrolly.tsx` retourne une vraie racine `data-splash-root` : la capture mesurait 454×63 px, la bannière de titre ; elle mesure 1100×4320, la page — positions d'activation des étapes byte-identiques avant/après). **Un vrai bug produit trouvé et corrigé** : le `produce.mjs` de map-native écrivait sa capture d'écran de debug DANS le dossier de livraison, si bien que le premier vrai produce de carte statique était refusé par la garde de forme de livraison. **Clôture mesurée (2026-07-28)** : gate `bun run check` **22/22** (l'unique échec du premier passage était un `skills/dw-chart/node_modules` absent du worktree — playwright non installé, pas un défaut de code) ; `bun run proofs` **11/11** en séquentiel, MinIO monté à la main pour la preuve S3. Deux preuves **rouillées sur `main`, pas sur cette branche**, réparées au passage — c'est exactement la classe d'échec que `scripts/proofs.mjs` existe pour rendre visible : `rendered-title-proof` attendait encore le barreau `svg[role='img'][aria-label]` alors que trois moteurs posent désormais `data-splash-title` (barreau supérieur de l'échelle `TITLE_SOURCES`), et `wiring-proof` attendait un README anglais (`Source: X`) devenu français (`Source : X`) — là, l'assertion positive échouait *fort* mais les **deux assertions négatives étaient devenues vides**, passant sur une chaîne que le README ne pouvait plus contenir. Les étiquettes sont maintenant lues depuis `readmeCopy(lang)`, les valeurs restent écrites en dur.

**Ce qui NE marche toujours pas — à lire avec ce qui précède.** (1) **Deux fonds de carte seulement sont livrés**, `world` et `us-states` (`skills/map-native/src/basemaps.ts`) : un **choroplèthe cantonal suisse reste impossible**, ce qui concerne directement le pilote Heidi.news. (2) Le **dot-density est limité à `world`** — `DotDensityMap.tsx` importe `world.geojson` en dur et ne lit jamais `config.basemap` ; l'assembleur refuse donc loud les autres fonds. L'étendre est du travail de composant, pas d'assembleur. (3) Un **artefact hébergé est enregistré, mais `preview` / `approve` / `deliver` refusent encore d'agir dessus** (chacun par son nom ; `capture` note un trou au lieu de mesurer) : il n'y a ni octets à présenter, ni octets à signer, ni fichier à tendre à un éditeur. **C'est la tranche suivante.** (4) Un plan de beats rédigé à la main sur une piste carte-scrolly est refusé loud (la carte dérive sa propre marche via `deriveMapStory`) — le map-scrolly *à beats rédigés* attend le travail de beats de la seconde moitié de la branche article. **Corrigé après la revue finale (2026-07-28)** : ce n'était pas seulement « pas de beats rédigés » — une carte-scrolly, et une image-scrolly, **ne pouvaient pas être ATTEINTES du tout**. `nextActionsForElement` envoyait toute scrolly sans narratif à `draft-beats`, `suggestBeats` refusait tout sauf line/bar, et `draftBeats`/`applyBeats` sont les seuls écrivains de `el.narrative` : le run répondait la même action impossible indéfiniment, **en silence** (`deadEndReason` n'est consulté que sur `choose-form`). Mesuré sur la vraie KB : 13 des 15 paires scrolly offrables stagnaient. Fermé — le routage est gaté sur `canDraftBeats` (la réponse du drafter lui-même) : une **carte** va droit à `produce` (elle n'a besoin d'aucun plan), une **image** a désormais son propre drafter (un beat par photographie déclarée, chaque claim non écrit — `suggestImageBeats`), et un **scatter**-scrolly est **marqué à l'offre** (le moteur dérive ses légendes, donc elles ne pourraient pas être celles du journaliste). Reste vrai : le map-scrolly *à beats rédigés* attend la seconde moitié de la branche article ; et une légende d'image-scrolly ne peut pas porter un chiffre que le plan ne contient pas (la garde de grounding de `verifyBeats` n'a aucune donnée derrière une photographie — refus loud, ré-essayable). Hors périmètre assumé de la branche : retirer le chemin V1 (`skills/splash/SKILL.md`, `produce-all.mjs`), ajouter des fonds de carte, ajouter des types.

**Session 2026-07-29 — Family C : capability-and-validation, 24 tâches (branche `feat/family-c-capability-and-validation`, worktree `splash-family-c`, base `main@47e83752`).** Détail complet + gate mesuré → CHANGELOG. Résumé en une phrase : le système SAIT et DIT mieux ce qu'il peut faire (le canal `social-vertical` rouvert, une chaîne `feature-reach` qui fait voyager une limite mesurée jusqu'à l'offre, une KB qui ne prétend plus atteindre un type `deferred`) — il ne CONSTRUIT rien de neuf, ça reste le travail de la famille A. **Risque 4, réel et non résolu par ce plan** : `social-vertical` est rouvert mécaniquement (`checkSymbolConformance` enfin branché, tâche 17) mais **aucune passe de rendu n'a encore parcouru un vrai pin carré/portrait de bout en bout sur ce canal**. **Backlog nommé, transcrit sans être traité ici** : (1) **`accent` option (b)** — si un besoin réel apparaît, un champ sur `NativeSpec` + un point d'injection dans `specToNativeConfig` (`:947-988`) suffirait, les six composants qui le lisaient le recevraient enfin ; petit ajout, pas une reprise. (2) **`lateRefusalSentence` → `routed()`** le jour où la famille A livre `lib/core/routed-refusal.ts`. (3) **Le tooltip par type manquant chez dw-chart** — six capacités SONT déjà modélisées par type dans les mêmes fichiers (`chart-spec.ts:102/:113/:143/:165`, `value-label-safety.ts:55`, `export-aspect.ts:87`), le tooltip est la seule qui manque et c'est celle qu'on a promise ; la déclarer dans `feature-reach` demande une mesure LIVE (vraie clé Datawrapper, vrai `d3-bars` publié, vrai survol) — pas inventée ici. (4) **Le calque DOM parallèle aux marques WebGL** (D05) — un chantier, pas un correctif ; tant qu'il n'existe pas, la limite reste déclarée (tâche 20) et visible à l'offre (tâche 21). (5) **Les 3 copies de listes de types en prose** (`skills/suggest-chart/SKILL.md:329-336`/`:494`/`:525`) + `DW_REACHABLE_NATIVE_TYPES` (`skills/splash/src/flow-decisions.ts:22-30`) — rien ne les compare aux catalogues ; un test de parité est faisable, hors périmètre ici. (6) **Re-runner le sweep** — le registre le recommande lui-même (§7, point 1), pas ce plan. (7) **`wrapLabel` ne coupe que sur l'espace** (`lib/core/text-fit.ts:127-135`, un seul mot ⇒ `truncate`) — d'où « Saint-Étienne » raccourci ; couper sur le trait d'union changerait le rendu de tous les charts et demande une politique de césure non arbitrée (trait d'union/tiret long/CJK) ; à rapprocher des deux estimateurs de glyphe divergents du dépôt, `0.6` (`lib/core/text-fit.ts:10-12`) vs `0.62` (`skills/map-native/src/symbol-labels.ts:116`). (8) **map-native n'enregistre AUCUN refus tardif, contrairement à chart-native désormais** — cause réelle : son snap de contraste écrit un PNG de debug (`contrast-static.png`) que `collectOutputs` (`lib/core/verbs/exec.ts`) ramasserait avec `static.png` si `OUTDIR` était threadé, exactement l'incident `assertFileMedia` « deux fichiers image » de la tâche 7 — laissé non-threadé par choix délibéré. Forme de fix réelle : threader `OUTDIR` vers les sites d'appel de `skills/map-native/scripts/snap-contrast.mjs` dans `produce.mjs` ET rediriger son PNG de debug hors du dossier de livraison (il tombe par défaut dans `output-proof/contrast/` quand `OUTDIR` est absent — l'indice de où le rediriger). (9) **Le compte de règles numérotées de `SKILL.md` n'a aucun garde-fou mécanique** — un en-tête « Four rules, all mechanical » a survécu à l'ajout d'une 5ᵉ règle (tâche 21) jusqu'à ce qu'un reviewer humain le lise ; `skills/splash/tests/skill-doc-parity.test.ts` pin des chaînes précises, jamais un COMPTE — `SKILL.md` nomme déjà cette classe (section « survivor rules — no mechanical backstop ») ; ajouter une assertion (le mot-nombre de l'en-tête == la longueur de la liste énumérée) est une tâche future, pas faite ici. (10) **`N1.3` : un 5ᵉ doublon `MAX_RADIUS_PX`** — la tâche 17 a hissé une constante partagée `MAX_RADIUS_PX = 40` sur 4 renderers symbole map-native, mais `skills/scrolly/src/ScrollySymbolMap.tsx:36` garde sa propre copie indépendante (utilisée `:95`) — drift possible si la constante partagée change un jour. (11) **Le cas-limite de la tâche 17 est tendu à 1,25px** — un test de la valeur de repli `675` (viewport supposé) utilise une frontière `0.25 × 675 = 168.75` avec seulement 1,25px de marge ; le test flipperait si `SYMBOL_MAX_VIEWPORT_FRACTION` (0.25 aujourd'hui) ou la constante de viewport supposé changeaient pour une raison sans rapport — mérite un commentaire explicatif dans le fichier de test, pas ajouté ici. (12) **`import.meta.main` pour `produce.mjs`** — `produce.mjs` de chart-native ET de map-native ont des effets de bord au niveau module (lisent `process.argv`, appellent `process.exit()` au top-level), ce qui a forcé plusieurs gardes de ce plan (tâche 17 round 3, tâche 23 round 1) à retomber sur un scan textuel du script plutôt qu'un vrai test comportemental — un motif réel, précédenté dans ce dépôt, mais structurellement plus faible (satisfaisable par un commentaire portant la bonne chaîne). Fix durable nommé, non fait : gater le travail top-level de chaque `produce.mjs` derrière `if (import.meta.main) { ... }`, pour qu'il reste lançable en CLI tel quel MAIS devienne aussi importable et testable comportementalement — fermerait toute cette classe de contournement d'un coup. (13) **Le vrai `mediaSize` est en main au produce et n'est toujours pas donné à `checkMapFraming`** — le follow-up le plus porteur qui reste, nommé par la revue finale. La tâche 17 threade la vraie taille par canal jusqu'à `viewportMinPx` dans `skills/map-native/src/core/map-produce-conformance.ts:373-378`, mais les sous-règles de cadrage (`checkMapFraming`, `conformance.ts:270-273` : largeur de titre, hauteur de légende contre le cadre) restent gatées sur `...(fmt ? { format: fmt } : {})` — `config.format`, un champ que le fichier documente lui-même comme jamais émis par une config réelle. Résultat : ces règles sont aussi mortes que `checkSymbolConformance` l'était avant cette branche, **alors que la valeur qui les réveillerait est dans la même fonction sous un autre nom**. Délibérément NON câblé dans la passe de correctifs de revue finale : ce serait un changement de comportement non mesuré introduit dans la seule fenêtre de correctifs que le process autorise — exactement la faute que le revert de la tâche 15 corrige. Forme du fix : passer `mediaSize` (à défaut `fmt`) dans `format`, **puis mesurer** — s'il faux-refuse une config réelle, c'est un constat, pas une raison de revenir en arrière. Valeur : le risque 4 ci-dessus reste ouvert et la phase 5 rouvre `social-vertical` (1080×1920), l'aspect le plus susceptible de casser le cadrage. (14) Le reste des minors déférés au fil des 24 tâches (typages non-littéraux, doublons de comptage internes, wording de commentaire, etc.) reste dans le ledger `.superpowers/sdd/2026-07-29-family-c-capability-and-validation/progress.md` — non répété ici, aucun n'a été jugé assez porteur pour ce résumé.
