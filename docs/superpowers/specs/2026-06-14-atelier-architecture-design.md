# Atelier — Architecture (spec-parapluie)

> Document de design global. Décrit la structure d'ensemble et les arbitrages.
> Chaque sous-chantier (KB, suggesteur, website, livraison) aura ensuite son propre spec → plan détaillé.
>
> Date : 2026-06-14 · Statut : design validé en brainstorming, à réviser

## 1. Contexte

Projet financé par la bourse **FJM** (Fonds d'innovation pour le journalisme multimédia), obtenue en juin 2026, sous le nom **« Atelier — storytelling visuel open source pour chaque rédaction »**.

Deux objectifs imbriqués (dossier FJM) :
1. Produire une enquête multimédia de référence pour Heidi.news (pilote : « Annemasse, capitale du n'importe quoi »).
2. Publier Atelier comme **infrastructure ouverte** (MIT) pour le reste de la presse romande.

Équipe : Yvan Pandelé (Heidi.news, lead éditorial), Rinny Gremaud (Heidi.news, lead narratif), Tom Vaillant / Buried Signals (dev — sous-traitant).

**Le problème.** Le storytelling visuel reste un privilège des grandes rédactions équipées d'équipes hybrides. Une petite rédaction locale — sans équipe data/graphique, sans temps, sans compétences techniques — en est exclue. Atelier comble cette lacune : le journaliste fournit son article, et l'outil — guidé par les best-practices et le savoir de la recherche en narrative visualization — propose et conçoit les éléments visuels qui servent le récit.

**Ce qu'Atelier ne fait pas** : il ne génère ni texte ni illustration. Il orchestre la production technique. L'intention éditoriale reste la responsabilité du journaliste.

## 2. Les deux publics

| | **Techs** (rédaction équipée) | **Journalists** (petite rédaction, non-tech) |
|---|---|---|
| Accès | Skills en CLI (Claude Code) | Website unique |
| Compute | Local, leur propre modèle | Backend agnostique (BYO-key ou tier pro) |
| Itérations | Infinies (souverain) | Selon leur abo / tier |
| Souveraineté | Maximale (rien ne quitte la rédaction) | Selon configuration |
| Coût pour nous | ~0 | Website mince à opérer |

**Décision clé : les journalistes passent uniquement par le website.** On abandonne l'idée d'un « pack agnostique installé dans leur app IA » (GPT/Gem/Claude/LM Studio) pour ce public. Raison : maintenir 4 packagings de plateforme dont les formats/APIs dérivent, à 2 personnes, est ingérable. Une seule web app qu'on contrôle est plus maintenable que 4 intégrations.

**Réconciliation avec le dossier FJM** (qui promet « agnostique des plateformes : Claude, ChatGPT, Gemini, LM Studio ») : l'agnosticisme est préservé **au niveau compute, à l'intérieur du website** (le backend appelle le modèle choisi, ou la clé du user), et **au niveau des skills CLI** pour les techs (agnostique natif, local). La promesse tient — elle se déplace de l'*install* vers le *compute*.

## 3. Architecture

```
╔═══════════════ ATELIER ═══════════════╗

 COUCHE COMMUNE (open source, MIT, source unique)
   ① KB best-practices + savoir papiers   (structurée pour RAG / progressive disclosure)
   ② Suggesteur : où / quel visuel / aucun  + guardrails (≤2 couleurs, limiter la custo…)
   ③ Design viz : archétypes (chart / map / vidéo)

 ── ACCÈS ──────────────────────────────
   Techs       → Skills CLI (local, agnostique, gratuit)
   Journalists → Website unique (agnostique en backend)

 ── USAGE ──────────────────────────────
   INSTALL (1×)  →  BOUCLE par article :
                     article → ① KB → ② suggesteur → ③ design → EXPORT
   EXPORT :
     HTML direct (statique, zéro clé)        = BASIC / gratuit
     Embed fly.io (dynamique, clé fly)        = PRO / payant

 ── BUSINESS ───────────────────────────
   Gratuit : skills CLI + visuels BASIC (couvre ~80% des besoins)
   Payant  : features PRO
   Revenu complémentaire : consulting / intégrations / formations
╚════════════════════════════════════════╝
```

### 3.1 Couche commune

Trois étapes, en source unique (markdown/templates), réutilisées par les deux publics.

- **① KB — Knowledge base best-practices.** Consolidation de la recherche (papiers + références) en savoir *récupérable par machine*. Contrainte structurante : ce n'est pas un tas de notes humaines — c'est **rangé pour les moteurs de retrieval** : références courtes et autonomes (chargement progressif côté Claude), sections atomiques chunkables (RAG côté website). Sources d'ingestion : `~/Downloads/viz-research` (PDFs), `~/Downloads/Archive (1)` (références déjà rédigées), + recherche web (firecrawl) pour compléter, + FT chart-doctor `visual-vocabulary`. **Crédits obligatoires** quand on s'appuie sur des sources tierces (data-to-viz.com, etc.).
- **② Suggesteur.** À partir de l'article (+ données), comprend l'intention/objectif, puis — grounded sur ① — décide **où** un visuel sert le récit, **quel** format (ou aucun), et applique des **guardrails** (ex. ≤2 couleurs, limiter la customisation, écarter les graphes trop complexes). C'est le cœur neuf du produit.
- **③ Design viz.** Produit le visuel adapté via les **archétypes** existants (déjà construits dans `vizualisation-skill-v2` + `viznews-lib`).

### 3.2 Usage : install une fois, puis boucle

L'install est un **préalable unique** (onboarding), pas une couche du flux. Ensuite la boucle `article → ① → ② → ③ → export` se répète à chaque reportage. L'install fige *où* tourne le raisonnement ; la boucle est identique quelle que soit la route.

**Flow par article (verrouillé — détail à reprendre dans le spec du sous-chantier Website) :**

```
INPUT       article et/ou données
ANALYSE     lecture silencieuse → data, claims, structure narrative
CADRAGE     questionnaire intentions/objectifs · mode guidé ou direct
PROPOSITION où / quel visuel + guardrails · énoncé d'intention VETOABLE (pas de hard gate)
PRODUCTION  génère direct
              ├─ correction légère (tous, dans les garde-fous)
              └─ override créatif (pro/libre, gros échanges, hors garde-fous)
EXPORT      HTML direct / fly
```

Principe de validation : **confiance par défaut**, pas de gate bloquant sur le plan (le journaliste non-tech ne peut souvent pas juger un plan abstrait, et il vient déléguer cette décision). La validation réelle se fait **sur le visuel produit** (correction/refine par chat), où il peut juger et où vit sa responsabilité éditoriale. Conforme au dossier : « l'outil compose la structure visuelle, qui sera ensuite vérifiée et ajustée par chat ».

**Tier-awareness — le basic/pro traverse toute la boucle, pas seulement l'export.** Le suggesteur ② et la production ③ lisent un paramètre **« features accessibles »** (selon le tier du journaliste). Règle à PROPOSITION quand le visuel idéal est PRO et que l'utilisateur est en gratuit : **montrer le Pro verrouillé + toujours proposer un fallback gratuit correct**. Le suggesteur reste honnête sur ce qui sert le mieux la donnée (sa crédibilité best-practice), signale clairement le Pro (upsell), et garantit qu'un gratuit ne reste jamais bloqué. Condition : le fallback gratuit doit rester un *bon* choix, jamais un mauvais. À la PRODUCTION, on ne génère que ce que le tier autorise.

### 3.3 Export & livraison

| | **HTML direct** | **Embed fly.io** |
|---|---|---|
| Pour | Visuels statiques (charts, graphiques annotés) | Visuels dynamiques (maps, vidéo, data live) |
| Mécanisme | Fichier `.html` autonome (données + JS inlinés) | Déploiement sur l'infra de la rédaction |
| Host | Aucun — déposé dans le CMS comme une image | 1 app fly **par rédaction**, provisionnée à l'onboarding (BYO fly key) |
| Clé | Aucune | Clé fly.io (friction payée 1× à l'onboarding) |
| Tier | BASIC / gratuit | PRO / payant |

**Permanence de l'embed.** Pas de dépendance à *notre* hébergement (un embed qui pointe vers notre serveur « rot » le jour où on arrête → faute éditoriale pour un journal qui archive ses articles). Tout vit sur l'infra de la rédaction (fly chez eux) ou comme fichier qu'ils possèdent. Fidèle au dossier (« héberge sur son propre fournisseur »).

**Granularité fly : un app par rédaction, pas par visuel.** La friction (compte fly + carte bancaire + token) est payée une seule fois à l'onboarding. Chaque visuel suivant = un fichier de plus dans la même app → zéro friction, ~zéro coût. Évite le mur d'activation et la multiplication de machines facturées.

## 4. Modèle économique

- **Gratuit (BASIC)** : skills CLI (techs) + visuels statiques simples à produire — charts simples, charts annotés, Datawrapper, range plots. Couvre l'essentiel des besoins d'une petite rédaction. Aligné au dossier (« gratuit pour les rédactions »).
- **Payant (PRO)** : features complexes — maps (scrolly fly-to, carte explorable filtrée), texte → vidéo, vidéo-map interactive (Remotion × MapTiler), photo narrative crossfade. Le prix suit la complexité de production *et* le coût d'infra réel.
- **BYO-key.** Hébergement = clé fly de la rédaction. Compute = leur abo IA / clé (ou tier pro du website). On n'héberge ~rien de cher → pas de financement récurrent nécessaire.
- **Revenu complémentaire** (dossier) : consulting éditorial, intégrations sur mesure, formations ponctuelles.

## 5. Catalogue des features visuelles

Source : les 10 archétypes de `vizualisation-skill-v2`.

**BASIC (statique, gratuit)**
- `custom-graphic.single` — chart simple (magnitude, distribution, comparaison)
- `custom-graphic.annotated` — chart annoté (tendance, corrélation, avant/après)
- `dw-embed.single` — chart Datawrapper
- `dw-embed.range-plot` — range plot (comparaison d'intervalles)

**PRO (dynamique, payant)**
- `map-scrolly.waypoints` — map scrolly (fly-to)
- `interactive-map.filtered` — carte explorable filtrée
- `image-scrolly.crossfade` — photo narrative
- `chart-video.ranked-bars` / `line-reveal` / `proportional-squares` — vidéos
- (cible Tom) vidéo-map interactive — Remotion × MapTiler

## 6. Sous-chantiers (ordre de construction)

Chaque item aura son propre cycle spec → plan → implémentation.

1. **① KB** — *fondation, à attaquer en premier* (c'est ce que Tom demande « aujourd'hui »). Ingestion recherche → références structurées pour retrieval, avec crédits. Tout le reste en dépend.
2. **② Suggesteur** — le cœur neuf. Dépend de ①.
3. **Website** — front-end mince, agnostique en backend, gère install/onboarding (clés), tiers basic/pro, et la boucle d'usage. Dépend de ① ② ③.
4. **Livraison** — export HTML direct + provisioning fly « un app par rédaction ». Largement appuyé sur `viznews-lib` (embeds existants).
5. **③ Design viz** — déjà largement construit (archétypes v2) ; à câbler, pas à réinventer.

## 7. Calendrier (dossier FJM)

- **Juin 2026** — Cadrage + fondations : consolider playbooks, **figer cette architecture**, KB.
- **Juil–août 2026** — Production sur l'enquête Annemasse ; itérations en conditions réelles.
- **Sept–oct 2026** — Publication enquête + sortie GitHub MIT + extension We.Publish + rapport d'apprentissage.

## 8. À vérifier avant d'engager le code

Claims techniques à reconfirmer (ne pas figer comme acquis) :
- Flux d'install GUI des Claude Skills / Agent Skills (évolue vite). *Note : devient secondaire puisque les journalistes passent par le website ; pertinent surtout pour le tier techs et la distribution We.Publish.*
- fly.io : exige-t-il une carte bancaire à l'inscription, et coût réel d'un app statique always-on vs cold-start.
- Faisabilité du `.html` autonome pour les formats limites (taille, maps, vidéo) — confirme la frontière statique/dynamique.
- Capacités RAG / taille de KB du website backend selon le modèle choisi.

## 9. Hors-scope (ce spec)

- Le détail d'implémentation de chaque sous-chantier (specs dédiés à suivre).
- Le contenu éditorial de l'enquête Annemasse (responsabilité Heidi.news).
- La distribution We.Publish (packaging marketplace) — sera traité au moment de la sortie publique.
