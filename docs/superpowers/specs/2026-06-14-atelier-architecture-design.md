# Atelier — Architecture (spec-parapluie)

> Document de design global. Décrit la structure d'ensemble et les arbitrages.
> Chaque sous-chantier (KB, suggesteur, livraison, installeur) aura ensuite son propre spec → plan détaillé.
>
> Date : 2026-06-14 · **Révisé 2026-06-23** · Statut : design validé en brainstorming
>
> **Révisions 2026-06-23 :**
> 1. **Tiers supprimés.** Plus de BASIC/PRO — **tout est gratuit**, tous les archétypes accessibles à tous.
> 2. **Distribution façon Mycroft/Spotlight.** Atelier est un **skill open-source installable**, agnostique
>    runtime, local-first — **pas un website hébergé**. Le sous-chantier « Website » et le provisioning
>    fly comme paywall disparaissent.

## 1. Contexte

Projet financé par la bourse **FJM** (Fonds d'innovation pour le journalisme multimédia), obtenue en juin 2026, sous le nom **« Atelier — storytelling visuel open source pour chaque rédaction »**.

Deux objectifs imbriqués (dossier FJM) :
1. Produire une enquête multimédia de référence pour Heidi.news (pilote : « Annemasse, capitale du n'importe quoi »).
2. Publier Atelier comme **infrastructure ouverte** (MIT) pour le reste de la presse romande.

Équipe : Yvan Pandelé (Heidi.news, lead éditorial), Rinny Gremaud (Heidi.news, lead narratif), Tom Vaillant / Buried Signals (dev — sous-traitant).

**Le problème.** Le storytelling visuel reste un privilège des grandes rédactions équipées d'équipes hybrides. Une petite rédaction locale — sans équipe data/graphique, sans temps, sans compétences techniques — en est exclue. Atelier comble cette lacune : le journaliste fournit son article, et l'outil — guidé par les best-practices et le savoir de la recherche en narrative visualization — propose et conçoit les éléments visuels qui servent le récit.

**Ce qu'Atelier ne fait pas** : il ne génère ni texte ni illustration. Il orchestre la production technique. L'intention éditoriale reste la responsabilité du journaliste.

## 2. Distribution — un skill installable, agnostique, local-first

Atelier suit le modèle **Mycroft / Spotlight** (Buried Signals) : un **pack open-source (MIT)** qui transforme
un runtime IA en outil de production visuelle. **Pas de website hébergé, pas de backend à opérer.**

- **Agnostique runtime** : Claude Code, Codex, Gemini, OpenCode, Goose, modèles locaux.
- **Local-first** : tourne chez l'utilisateur, avec son runtime et sa clé. Rien ne quitte la rédaction.
- **Deux portes d'entrée au même produit** (pas deux produits) :

| | **Techs** (rédaction équipée) | **Journalists** (petite rédaction, non-tech) |
|---|---|---|
| Install | Directe (git clone / plugin / CLI) | **Page d'install façon Mycroft** : formulaire → script `.command` généré avec la config dedans → double-clic. *« No terminal-wrangling. »* |
| Compute | Local, leur runtime/clé | Local, leur runtime/clé (la page baked la config) |
| Souveraineté | Maximale | Maximale (local-first identique) |
| Coût pour nous | ~0 | ~0 (zéro backend) |

**Pourquoi ce modèle (et pas un website hébergé).** Le choix initial (14/06) d'un website unique partait de
l'idée qu'un « pack agnostique installé dans 4 apps IA » était ingérable à 2 personnes. Le modèle Mycroft
**dissout cette objection** : l'agnosticisme est porté par **le runtime** (Goose/Claude/…) + **une seule page
d'install maligne**, pas par 4 intégrations. On maintient *un skill + un installeur*, pas quatre apps ni un
backend. C'est moins cher, sans financement récurrent, et plus fidèle au dossier (« agnostique des
plateformes », « héberge sur son propre fournisseur », souveraineté).

## 3. Architecture

```
╔═══════════════ ATELIER (skill open-source MIT) ═══════════════╗

 COUCHE COMMUNE (source unique, MIT)
   ① KB best-practices + savoir papiers   (structurée pour RAG / progressive disclosure)
   ② Suggesteur : où / quel visuel / aucun  + guardrails (≤2 couleurs, limiter la custo…)
   ③ Design viz : archétypes (chart / map / vidéo)

 ── ACCÈS (un seul skill installable, agnostique, local-first) ──
   Techs       → install CLI directe
   Journalists → page d'install façon Mycroft (formulaire → script → double-clic)

 ── USAGE ──────────────────────────────
   INSTALL (1×, l'installeur)  →  BOUCLE par article :
                     article → ① KB → ② suggesteur → ③ design → EXPORT
   EXPORT : tout = fichier que la rédaction possède
     HTML autonome (statique + interactif léger) · mp4 (vidéo) · SVG/PNG (image)
     (optionnel : self-host fly BYO-key pour le dynamique lourd — pas un paywall)

 ── BUSINESS ───────────────────────────
   Tout gratuit. Revenu complémentaire : consulting / intégrations / formations.
╚════════════════════════════════════════╝
```

### 3.1 Couche commune

Trois étapes, en source unique (markdown/templates), réutilisées par les deux portes d'entrée.

- **① KB — Knowledge base best-practices.** Consolidation de la recherche (papiers + références) en savoir *récupérable par machine*. Contrainte structurante : pas un tas de notes humaines — **rangé pour les moteurs de retrieval** : références courtes et autonomes (chargement progressif côté skill), sections atomiques chunkables (RAG). Sources d'ingestion : `~/Downloads/viz-research` (PDFs), `~/Downloads/Archive (1)` (références déjà rédigées), `vizualisation-skill/corpus` (recherche existante, FT vocab + data-to-viz + académique déjà capturés), + recherche web pour compléter, + FT chart-doctor `visual-vocabulary`. **Crédits obligatoires** (data-to-viz.com, etc.).
- **② Suggesteur.** À partir de l'article (+ données), comprend l'intention/objectif, puis — grounded sur ① — décide **où** un visuel sert le récit, **quel** format (ou aucun), et applique des **guardrails** (≤2 couleurs, limiter la customisation, écarter les graphes trop complexes). C'est le cœur neuf du produit. **Plus de paramètre « features accessibles » : il propose simplement le meilleur visuel.**
- **③ Design viz.** Produit le visuel via les **archétypes** existants (déjà construits dans `vizualisation-skill` + `viznews-lib`).

### 3.2 Usage : install une fois, puis boucle

L'install est un **préalable unique** (onboarding via l'installeur), pas une couche du flux. Ensuite la boucle `article → ① → ② → ③ → export` se répète à chaque reportage.

**Flow par article (verrouillé — détail dans le spec du suggesteur) :**

```
INPUT       article et/ou données
ANALYSE     lecture silencieuse → data, claims, structure narrative
CADRAGE     questionnaire intentions/objectifs · mode guidé ou direct
PROPOSITION où / quel visuel + guardrails · énoncé d'intention VETOABLE (pas de hard gate)
PRODUCTION  génère direct (correction légère par chat dans les garde-fous · override créatif libre)
EXPORT      fichier possédé (HTML autonome / mp4 / image) · optionnel self-host
```

Principe de validation : **confiance par défaut**, pas de gate bloquant sur le plan (le journaliste non-tech ne peut souvent pas juger un plan abstrait). La validation réelle se fait **sur le visuel produit** (correction/refine par chat), où il peut juger et où vit sa responsabilité éditoriale.

### 3.3 Export & livraison

**Tout est livré comme un fichier que la rédaction possède** — aucune dépendance à notre hébergement (un embed qui pointe vers notre serveur « rot » le jour où on arrête = faute éditoriale). Fidèle au dossier (« héberge sur son propre fournisseur »).

| Visuel | Livraison | Host |
|---|---|---|
| Chart statique / annoté | SVG/PNG **ou** `.html` autonome | aucun — déposé dans le CMS |
| Chart interactif léger | `.html` autonome (données + JS inlinés) — *prouvé par le pilote `chart-annotated`* | aucun |
| Vidéo (chart/map) | fichier `.mp4` | aucun — uploadé comme une vidéo |
| Carte / interactif lourd, data live | `.html` autonome si possible ; **sinon** self-host (fly BYO-key, infra de la rédaction) | rédaction (optionnel) |

Le self-host n'est plus un paywall : c'est un **chemin technique optionnel** pour les rares visuels qui ne tiennent pas dans un fichier autonome. Par défaut, tout est un fichier possédé.

## 4. Modèle économique

**Tout gratuit.** Skill CLI (techs) + installeur (journalists) + tous les archétypes (charts, maps, vidéo, photo). Aligné au dossier (« gratuit pour les rédactions »). **Revenu complémentaire** (dossier) : consulting éditorial, intégrations sur mesure, formations ponctuelles. Pas de financement récurrent nécessaire (zéro backend cher à opérer).

## 5. Catalogue des features visuelles

Source : les archétypes de `vizualisation-skill` / `viznews-lib`. **Tous accessibles à tous (plus de split BASIC/PRO).** La distinction statique/dynamique ci-dessous est **technique** (mode de livraison), pas tarifaire.

**Statiques (fichier autonome, zéro infra)**
- `custom-graphic.single` — chart simple · `custom-graphic.annotated` — chart annoté
- `dw-embed.single` — chart Datawrapper · `dw-embed.range-plot` — range plot

**Dynamiques (fichier autonome si possible, sinon self-host)**
- `map-scrolly.waypoints` · `interactive-map.filtered` · `image-scrolly.crossfade`
- `chart-video.ranked-bars` / `line-reveal` / `proportional-squares`
- vidéo-map interactive — Remotion × MapTiler (cible Tom)

> Détail fin (type × format × outil) : voir `vizualisation-skill/docs/atelier/visual-element-grid.md`.
> Garde-fou bourse : le livrable = ces ~10 archétypes ; la grille FT à 55 types est la *carte d'ambition*, pas le scope du livrable.

## 6. Sous-chantiers (ordre de construction)

Chaque item aura son propre cycle spec → plan → implémentation.

1. **① KB** — *fondation, à attaquer en premier* (ce que Tom demande). Ingestion recherche → références structurées pour retrieval, avec crédits. Tout le reste en dépend.
2. **② Suggesteur** — le cœur neuf. Dépend de ①.
3. **③ Design viz** — largement construit (archétypes) ; à câbler, pas à réinventer.
4. **Livraison** — export fichiers (HTML autonome / mp4 / image) + self-host fly optionnel. Appuyé sur `viznews-lib`.
5. **Installeur** — page façon Mycroft (formulaire → script `.command` avec config bakée) + packaging agnostique runtime. *Remplace l'ancien sous-chantier « Website ».*

## 7. Calendrier (dossier FJM)

- **Juin 2026** — Cadrage + fondations : consolider playbooks, figer cette architecture, **KB**.
- **Juil–août 2026** — Production sur l'enquête Annemasse ; itérations en conditions réelles.
- **Sept–oct 2026** — Publication enquête + sortie GitHub MIT + extension We.Publish + rapport d'apprentissage.

## 8. À vérifier avant d'engager le code

- **Faisabilité du `.html` autonome** pour les formats limites (taille, maps, vidéo) — c'est désormais le **chemin de livraison principal**, donc critique. Le pilote a prouvé le chart interactif autonome ; reste à confirmer maps/vidéo.
- **L'installeur façon Mycroft** : comment générer un script d'install **agnostique runtime** (un seul `.command` qui marche pour Claude/Codex/Gemini/Goose/local) avec config bakée.
- **Agnosticisme runtime** : le skill doit tourner sur plusieurs runtimes — confirmer la portabilité réelle.
- fly.io (seulement pour le self-host optionnel) : carte bancaire à l'inscription, coût réel.
- Capacités RAG / taille de KB selon le runtime.

## 9. Hors-scope (ce spec)

- Le détail d'implémentation de chaque sous-chantier (specs dédiés à suivre).
- Le contenu éditorial de l'enquête Annemasse (responsabilité Heidi.news).
- La distribution We.Publish (packaging marketplace) — traité à la sortie publique.
</content>
