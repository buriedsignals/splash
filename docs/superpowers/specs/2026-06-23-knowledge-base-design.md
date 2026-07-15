# ① Knowledge Base — Design (sous-chantier n°1)

> Sous-chantier ① de la spec-parapluie (`2026-06-14-splash-architecture-design.md`). Fondation : ② suggesteur
> et ③ skills en dépendent. Sans tiers (tout gratuit). Source de vérité du *savoir* d'Splash.

## But

Un dossier `knowledge/` qui consolide les 4 corps de sources en un savoir **récupérable par la machine** :
le suggesteur ② et les skills ③ y piochent la bonne best-practice au bon moment, créditée et traçable.

## Principe structurant — rangé pour le retrieval, pas pour la lecture

La KB n'est **pas** un tas de notes humaines à lire en entier. Elle est rangée pour qu'un agent **charge juste
le morceau utile** :

- **Références courtes et autonomes** (<500 lignes) — une par sujet, chargée à la demande (progressive
  disclosure côté skill). Le suggesteur charge « chart-selection » sans charger « data-video ».
- **Sections atomiques, chunkables** — chaque section se suffit à elle-même (titre explicite, pas de « comme
  vu plus haut »), pour qu'un futur RAG puisse l'indexer telle quelle.
- **Un fait = un endroit.** Pas de duplication entre fichiers ; les liens entre notes sont des renvois, pas des copies.

## Les 4 sources (entrées, toutes créditées)

| Corps | Apporte | Emplacement |
|---|---|---|
| **PDFs Tom** (26 académiques) | le backing académique nommé (narration, scrolly, vidéo) | `~/Downloads/viz-research` |
| **Notes Tom** (16, graphe Obsidian) | la voix éditoriale + l'axe expliquer↔explorer + frameworks | `~/Downloads/Archive (1)` |
| **Corpus existant** (déjà synthétisé + crédité) | le craft/chart : **FT vocab**, **data-to-viz**, académique, design (40 sources) | `vizualisation-skill/corpus` |
| **Web** | combler les trous de Tom + la **bible FT** | WebSearch/WebFetch (firecrawl absent) |

Tom est **riche** en éditorial/narratif/trust, **mince** en craft-chart (sélection, couleur, WCAG). Le corpus +
le web bouchent exactement ces trous. **Crédits obligatoires** : data-to-viz.com sur chaque usage, FT Visual
Vocabulary = canon, chaque PDF/note/URL tracé dans `CREDITS.md`.

## Architecture — 3 tiers + crédits

```
knowledge/
  sources/        matière brute, provenance préservée
    tom-notes/    les 16 notes, verbatim
    tom-pdfs/     les 26 PDFs + un .txt (pdftotext) à côté de chacun
    corpus/       MANIFEST.md (quels fichiers corpus → quel thème ; les fichiers restent dans vizualisation-skill)
    web/          captures web (1 .md par URL, en-tête provenance + date)
    INDEX.md      chaque source → thème(s)
  synthesis/      une note curée par thème — la couche autoritaire, miroir du graphe de Tom
  references/     refs courtes opérationnelles, chargées par ② et ③ (le retrieval tape ici)
  CREDITS.md      ledger d'attribution (seedé depuis corpus/sources.md)
  README.md       le modèle 3 tiers + comment consommer + comment ajouter une source
```

Flux **uni-directionnel** : `sources → synthesis → references`. ② et ③ ne lisent **que** `references/`.

## La synthèse miroir le graphe de Tom (6 clusters + épine)

`narrative-structures` = le **hub** ; **explanatory↔exploratory** = l'**épine**. Frameworks nommés **verbatim**
(c'est la voix de Tom *et* le vocabulaire du suggesteur).

| Cluster | `synthesis/…` | Tiré de |
|---|---|---|
| **A. Perception & Encoding** | `visual-encoding`, `chart-selection` | Tom visual-encoding/best-practices (Cleveland-McGill, Maeda, Kennedy Elliot) ; corpus **FT vocab (bible)** + data-to-viz + académique ; web |
| **B. Design Craft** | `color`, `typography-layout`, `accessibility` | corpus `design-principles` (40 sources : ColorBrewer, Okabe-Ito, WCAG, ONS, Tufte, gestalt) ; Tom best-practices ; web |
| **C. Narrative Architecture** | `narrative-structures` (hub), `explanatory-vs-exploratory` (épine), `cinematic-and-motion`, `interactivity`, `xr` | Tom narrative-visualisation (8 principes, structures Inverted-Pyramid/Hourglass/Martini-Glass, Suggested Framework), cinematic, interactive (Constrained Exploration), xr ; PDFs (Segel & Heer, Hullman rhétorique, Amini EIPR, McKenna 7 flow-factors, Zhi linking/layout, Chang & Ungar motion) ; corpus scrolly + Distill |
| **D. Trust & Editorial Quality** | `visual-trust`, `publishing-checklist` | Tom visual-trust (Three Schools), publishing-checklist (Creative×9 + Technical×9) |
| **E. Platform & Distribution** | `platform-strategy` | Tom narrative-platform-strategy |
| **F. Data Pipeline** | `data-preparation` | Tom cleaning-data + data-sources ; corpus dataviz-caveats |
| **— Bibliographie** | `bibliography` | Tom reading-list + research-list ↔ les 26 PDFs ; corpus académique |

Chaque note de synthèse ouvre sur un bloc `Sources:` résolvable, garde les frameworks verbatim, et préserve
les wikilinks de Tom en liens relatifs.

## Les références — 2 familles pour 2 consommateurs

Distillées depuis `synthesis/`. **C'est le grain « global » de la grille** (le par-type vit dans les fiches des skills).

**Éditoriales (pour ② — raisonner sur l'intention) :**
- `references/explanatory-vs-exploratory.md` — l'épine + le Suggested Framework de Tom (Hook → auteur → sandbox lecteur).
- `references/narrative-structures.md` — structures de récit + 5 data-story types + quand chacun.
- `references/chart-selection.md` — chemin FT : intention → famille → archétype (la colonne vertébrale du routage de ②).

**Craft / conformance (pour ③ — la checklist que chaque visuel respecte) :**
- `references/design-conformance.md` — couleur + typo + layout + accessibilité + format des nombres + lisibilité responsive, en checklist pass/fail. **C'est la source du fix du pilote `chart-annotated`.**
- `references/scrollytelling-patterns.md` — mécaniques scrolly + transitions.
- `references/data-video.md` — conventions cinématiques/motion (grammaire EIPR, motion Disney) — nourrit les skills Remotion.
- `references/data-preparation.md` — nettoyage + vetting des sources.
- `references/publishing-checklist.md` — gate avant publication.

Chaque référence cite la/les note(s) de synthèse qu'elle distille.

## Lien avec la grille (le savoir nourrit les skills)

- `references/` = le grain **global** (transversal). Chargé par tout skill, quel que soit le type.
- Les **fiches par-type** (le grain fin : pie, treemap, choropleth…) vivent **dans les skills** (la grille), pas dans la KB — mais elles **citent** les références KB. La KB porte le global ; la grille porte le précis.

## Pipeline de construction (phases)

1. **Scaffold** — créer `knowledge/`, `README.md`, `CREDITS.md` **seedé depuis `corpus/sources.md`** (data-to-viz + FT + académique + design déjà attribués).
2. **Ingest** — copier les 16 notes → `sources/tom-notes/` ; les 26 PDFs → `sources/tom-pdfs/` + `.txt` ; écrire `sources/corpus/MANIFEST.md` (corpus → thèmes, sans copier les fichiers) ; capturer la bible FT + data-to-viz frais seulement si la capture corpus est périmée. Tracer dans `CREDITS.md`.
3. **Classify** — `sources/INDEX.md` : chaque source (PDF, note, fichier corpus) → thème(s).
4. **Synthesize (parallèle, 1 sous-agent par thème)** — chaque agent lit *uniquement* ses sources mappées, écrit `synthesis/<thème>.md` (bloc Sources, frameworks verbatim), comble les trous nommés via web (capturé + crédité).
5. **Distill references** — écrire les 8 références opérationnelles (3 éditoriales + 5 craft).
6. **Verify** — chaque synthèse a un bloc `Sources:` résolvable ; chaque framework externe crédité ; chaque ligne `CREDITS.md` résout ; l'épine + le hub présents et cross-linkés ; aucune référence > 500 lignes.

## Hors-scope

- Le ② suggesteur (spec dédié ; il *consomme* cette KB).
- Les fiches **par-type** (vivent dans les skills/la grille ; la KB porte le global).
- Le fix du pilote `chart-annotated` (séparé ; tire sa checklist de `references/design-conformance.md`).

## Critères de succès

1. `knowledge/` existe : `sources/` `synthesis/` `references/` `CREDITS.md` `README.md`.
2. Sources présentes : 16 notes, 26 PDFs (+ `.txt`), `MANIFEST.md` corpus, captures web.
3. 13 notes `synthesis/` miroir des 6 clusters + bibliographie, chacune avec `Sources:` résolvable, frameworks verbatim, épine + hub cross-linkés.
4. 8 `references/` (3 éditoriales + 5 craft), chacune citant sa synthèse, chacune <500 lignes.
5. `CREDITS.md` seedé depuis `corpus/sources.md`, étendu (PDFs + notes + web) ; data-to-viz + FT présents.
6. Aucune trace de tier (BASIC/PRO) dans la KB.
</content>
