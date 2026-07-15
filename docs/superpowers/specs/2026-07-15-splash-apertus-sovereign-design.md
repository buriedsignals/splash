# Splash sur Apertus — le cerveau éditorial 100 % local (souverain-modèle)

> **Design spec** · 2026-07-15 · slice 1
> Spec-parapluie : `docs/superpowers/specs/2026-06-14-splash-architecture-design.md`
> Inspiration prouvée : Spotlight « Going Sovereign » (Buried Signals / Tom Vaillant) —
> https://spotlight.buriedsignals.com/going-sovereign/ · repo https://github.com/buriedsignals/spotlight

## But

Faire tourner **le cerveau éditorial de Splash (l'orchestration ①②③) 100 % en local sur
Apertus**, le modèle ouvert suisse, chez une petite rédaction non-équipée — sans qu'aucun
prompt/jugement ne quitte la machine. C'est l'argument souveraineté maximal du livrable FJM :
un modèle *suisse ouvert* pilote un outil *pour une rédaction suisse*.

**« 100 % local » porte sur le MODÈLE (le cerveau), pas sur toute la stack.** Apertus remplace
le modèle frontière (Claude aujourd'hui) qui pilote les skills Splash. Les **outils de création
restent les outils de la rédaction** : Remotion (déjà local), Datawrapper et MapTiler (SaaS,
clés API) — assumés comme partie de l'outillage. Le degré de souveraineté devient un **curseur**
(du full-souverain via les moteurs natifs `chart-native`/`map-native` jusqu'au SaaS Datawrapper/
MapTiler), pas un absolu — c'est plus honnête et plus vendable.

## Ce que Splash N'A PAS aujourd'hui (le trou à combler)

Splash = un jeu de skills (`chart-native`, `map-native`, `suggest-*`, l'orchestrateur `splash`)
**piloté par le modèle de l'hôte** (Claude Code, Cursor, Codex, Gemini, Goose). Il n'a **aucune
couche modèle / serving / harness à lui**. « Le même tour de génie que Tom » = **construire
cette couche** : ce qui fait qu'un petit modèle local pilote fiablement le pipeline gated.

## Insight structurant — Splash slice 1 est PLUS SIMPLE que Spotlight

Spotlight est une boucle OSINT ouverte (scrape → distille → cherche → fact-check → recommence).
Splash slice 1 est un **pipeline linéaire court et déterministe** :
`article → analyse → cadrage → proposition → produce → export`. Ça élimine la moitié de la
complexité de Tom :

| Brique Tom | Splash slice 1 | Pourquoi |
|---|---|---|
| 2 serveurs (orchestrateur + RLM e4b) | **1 serveur** (orchestrateur seul) | Pas de scraping — l'article est fourni, propre, ~quelques k tokens. Pas de distillation. |
| 3 agents délégués (orch/investigateur/fact-checker) | **1 agent orchestrateur** | Workflow linéaire, ni recherche parallèle ni fact-check indépendant. |
| Compaction tier-aware permanente | **Quasi nulle** | Workflow court, tape rarement le seuil de contexte. |
| Index SQLite 12 500 outils | **Skill-loading seul** (9 skills) | Surface d'outils petite ; découverte nom+description suffit. |
| Unlock #06 (Crawl4AI / SearXNG) | **Sans objet** | Pas de couche d'acquisition web. |

**Meilleur atout : les garde-fous mécaniques existent déjà.** `isFormatAllowed`,
`guardrail-parity`, le channel→format pinning, les tripwires de correctness, `assertDelivered`,
les snaps WCAG… sont **model-agnostiques** et **fail-hard**. Conséquences :

1. **Le modèle faible a moins à réussir** — il ne produit que le *jugement éditorial entre les
   gates* ; toute la *correctness mécanique* est enforced par du code déterministe.
2. **Dégradation sûre par construction** — si Apertus dérape, les validateurs fail-hard : Splash
   ne *livre jamais* un visuel faux ; au pire il boucle/stalle (mesurable au benchmark).

**Donc le « tour de génie » se concentre à ~80 % sur UNE chose : procedure-tuner Apertus pour
qu'il tienne la discipline des gates éditoriaux.** Le reste suit le template Tom quasi
mécaniquement.

## Le VRAI risque — sémantique, pas mécanique

Les garde-fous couvrent la *correctness*. Mais le cœur de valeur de Splash — le *jugement
éditorial* (titre↔takeaway cohérent, palette qui sert le sujet, bon format pour bon récit) —
est précisément ce que l'**audit 2026-07-11 note comme faible « sans levier mécanique »**, *même
piloté par Claude*. Un Apertus 8B, même tuné, sera **plus faible exactement sur ces axes-là**.

**Barre de succès en conséquence :** le benchmark ne mesure pas « est-ce que ça passe » (les
gardes garantissent que oui) — il mesure **« est-ce que le jugement éditorial reste bon », jugé
au rendu**. C'est pour combler ce trou que le procedure-tuning est central, pas optionnel.

## Décisions verrouillées (session brainstorming 2026-07-15)

1. **But** : Splash *model-sovereign* — cerveau local sur Apertus ; Remotion/Datawrapper/MapTiler
   restent les outils de rendu. Souveraineté = curseur, pas absolu.
2. **Harness** : **adopter Flue** (framework agent TS de Tom, sur Pi), reprendre ses patterns, en
   coordination avec Tom. *À vérifier au démarrage : Flue reste MIT + runtime-agnostique* (ne pas
   trahir l'ADN Splash).
3. **Modèle** : **Apertus 8B** cible primaire (tient sur laptop récent — colle à « rédaction
   non-équipée »), multi-tier avec **70B en référence/leash-long**. **Version-agnostique** :
   démarrer contre l'Apertus dispo aujourd'hui (v1.0-Instruct 8B), swapper v1.5 quand elle sort
   sans changer le harness (modèle piloté par env `SPLASH_FLUE_MODEL`). **On n'attend pas v1.5.**
   *Note faisabilité : v1.5 priorise explicitement tool-calling + agentique + reasoning — aligné ;
   mais instruction-following v1.0 faible (IFEval 70B ≈ 44 %) → charge de tuning maximale.*
4. **Slice 1** : un article → **un chart natif simple** (`chart-native`, canal article-web),
   workflow complet, gates enforced, piloté par Apertus. Le rendu natif est déterministe,
   souverain, battle-tested → tout le signal du test porte sur le cerveau, pas sur le renderer.
5. **Teacher du tuning = Claude, capturé depuis le pipeline Claude-Splash existant.** Le teacher
   ne sert qu'une fois, hors-ligne, pour cuisiner les données d'entraînement — **il ne ship
   jamais**. La souveraineté est une propriété du *produit livré* (runtime), pas de la *cuisine*
   de training. SFT-sur-trajectoires est architecture-agnostique (≠ distillation par logits) → le
   teacher n'a pas besoin d'être de la famille Apertus. Contrainte mécanique : reformater les
   trajectoires au chat-template/tool-call format d'Apertus avant l'entraînement.

## Architecture cible (slice 1)

```
Journaliste ──article──▶ [ Apertus 8B sur Flue : agent orchestrateur UNIQUE ]
                              │  (skills Splash découverts par nom, corps chargés on-invoke)
                              ├─ analyse ──▶ cadrage (GATE humain)
                              ├─ proposition : format natif pinné (GATE veto)
                              ├─ dispatch ──bash──▶ chart-native/produce.mjs  [DÉTERMINISTE, hors-modèle]
                              │                     └─ garde-fous fail-hard (déjà construits)
                              └─ export (GATE a/b/c) ──▶ fichier possédé
       1 serveur llama.cpp · Apertus 8B GGUF (Q4_K_M ≈ 5 Go) · KV q8_0 · flash-attn ·
       reasoning-budget borné · 1 slot résident · modèle env-swappable (v1.0→v1.5)
```

## Composants (unités de travail)

Six unités. Les cinq premières suivent le template Tom ; la sixième porte le risque.

### 1. Scaffold Flue pour Splash
`harness/flue/` façon Spotlight mais **un seul agent orchestrateur** (pas d'investigateur/
fact-checker).
- `splash.ts` — def agent + modèle env-swappable `SPLASH_FLUE_MODEL`.
- `db.ts` — sqlite durable (reprise après crash, natif Flue).
- `flue.config.ts` — `target: node`.
- **Dépend de** : rien. **Interface** : `flue run splash`.

### 2. Verb-adapter Splash (`roles.ts`)
Le point le plus malin de Tom, transposé. Les skills Splash appellent des verbes abstraits
(`execute-shell` pour `bun produce.mjs`, `read/write-file`, `invoke-skill`) ; un préambule les
mappe aux tools natifs Flue → **les mêmes skills tournent sans réécriture** (portabilité runtime
préservée).
- **Leçon Tom reprise telle quelle** : `HARNESS_ROOT` absolu injecté → les scripts déterministes
  (`produce.mjs`, `channel.ts`, export) tournent cwd-indépendants (sinon fallback `curl`/chemins
  qui nestent).
- **Dépend de** : 1. **Interface** : préambule préfixé aux instructions de l'agent.

### 3. Skill-loading dynamique
Les 9 skills Splash dans `.agents/skills/splash`, découverts par **nom + description**, corps
chargés **on-invoke** (natif Flue — le D1/D2 de Tom). Pas d'index SQLite d'outils pour le slice 1
(surface trop petite ; backlog si la grille 55-types le justifie).
- **Dépend de** : 1. **Interface** : skills disponibles par nom, zéro token au repos.

### 4. Launcher serving
llama.cpp + **Apertus 8B GGUF** (Q4_K_M ≈ 5 Go), `--cache-type-k/v q8_0 --flash-attn on`,
`--reasoning-budget` borné (empêche le thinking infini→réponse vide), **1 slot résident** (pas de
délégation en slice 1 → pas besoin du `--parallel 2` de Tom). Modèle piloté par env → swap
v1.0→v1.5 sans toucher le reste.
- **Dépend de** : rien. **Interface** : endpoint `local/apertus-8b`.

### 5. Filet garde-fous (réutilisé, zéro dev)
Validateurs existants (`isFormatAllowed`, `guardrail-parity`, `assertDelivered`, snaps WCAG)
tournent **inchangés** — hors-modèle. Unité au sens « on s'appuie dessus ».
- **Interface** : fail-hard entre les étapes du pipeline.

### 6. ⚠️ Pipeline procedure-tuning (l'unité qui porte le risque)
- **Teacher** : Claude, capturé depuis le pipeline Claude-Splash existant (déjà installé).
- **Trajectoires gold** : ~14 runs réels du slice-1 (article→chart natif) *bien menés*, gates
  compris. **Subtilité Splash** : les gates sont *humains* (cadrage, veto, choix a/b/c export) →
  générer une gold = quelqu'un joue le journaliste. **Hybride** : 4-5 authentiques (Rémy joue) +
  le reste teacher-simulé, corrigés à la main.
- **Corrections** : ~12 continuations ciblées sur les ratés observés au benchmark base (format
  improvisé ? gate sauté ? divergence du takeaway ?) — mêmes classes que les fixes « improvisation »
  déjà mécanisés dans Splash.
- **Reformatage** : trajectoires ré-exprimées au chat-template/tool-call format d'Apertus (contenu
  Claude → format Apertus). Le verb-adapter (unité 2) + la loss assistant-masked gèrent ça.
- **Training** : LoRA **assistant-masked** (masque le bruit des sorties d'outils), ~10 $ GPU loué.
  Itérer v1→vN jusqu'à ce que les gates tiennent.
- **Dépend de** : 1-4 (il faut le harness pour capturer des trajectoires réelles).
  **Interface** : adapter LoRA `apertus-8b-splash-orchestrator-vN`.

### Ordre de construction
1→2→3→4 (mécanique — débloque un pipeline *fonctionnel mais bête* piloté par Apertus base) →
mesurer le base au benchmark (Section suivante) → 6 (tuner jusqu'à ce que les gates tiennent + le
jugement éditorial reste bon).

## Preuve / benchmark

**Le rig existe déjà : `../splash-harness`** (spawn `claude` aujourd'hui). On le rend
**model-pluggable** pour qu'il pilote Apertus-sur-Flue à la place. Puis, sur le slice-1 :

| Config | Ce qu'on mesure |
|---|---|
| Apertus 8B **base** | baseline — où ça casse (gate sauté, improvisation, boucle) |
| Apertus 8B **tuné vN** | la cible : gates tenus **+ jugement éditorial préservé** (jugé au rendu) |
| Apertus **70B** | référence leash-long |
| Claude (actuel) | plafond de qualité éditoriale — la barre à approcher |

**Critère de succès du slice** : le 8B tuné livre un chart natif dont le jugement éditorial est
jugé **≥ acceptable au rendu**, gates tenus, **100 % local**. Le benchmark réutilise la rubrique
harness existante (title↔takeaway, format-fit) — celle-là même qui juge Claude aujourd'hui.

## Hors-scope (slice 1)

- RLM de distillation (unlock #02 de Tom) — pas de scraping.
- Sous-agents investigateur/fact-checker, `--parallel 2`, compaction agressive.
- Index SQLite d'outils.
- Swaps souveraineté web (Crawl4AI/SearXNG, unlock #06).
- Souveraineté du rendu (Datawrapper/MapTiler restent SaaS) — les moteurs natifs sont déjà le
  chemin full-souverain optionnel.
- Formats autres que `chart-native` article-web (map, vidéo, scrolly, dw-chart) — slices ultérieurs.

## Dépendances / risques externes à confirmer au démarrage

- **Flue** réellement MIT + runtime-agnostique (couplage Pi acceptable ?).
- **Apertus 1.5** dispo ? → traité comme dépendance externe ; on démarre sur v1.0-Instruct 8B.
- **Apertus GGUF Q4_K_M** dispo (sinon quantiser soi-même) + **tool-parser Apertus** pour
  llama.cpp (une discussion HF communautaire existe).
- **Coordination Tom** : accès à son scaffold Flue + recette de tuning comme point de départ.

## Suites (post-slice-1)

- Slices formats suivants (dw-chart pour tester le seam SaaS sous Apertus, puis map/vidéo/scrolly).
- Ré-introduire l'index SQLite d'outils si la grille 55-types gonfle la surface.
- Multi-tier de serving (8b/70b) façon profils Tom.
- Rapport d'apprentissage FJM : le benchmark chiffré « Splash tourne sur Apertus » est un livrable.
