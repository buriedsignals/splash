# Dépouillement du sweep QA du 2026-07-28 — registre des défauts

> Matière : `../splash-harness/reports/sweep-2026-07-28-83cases.log` (240 ko).
> Sweep arrêté volontairement à **83 cas sur 163** — le rendement s'était effondré, les mêmes
> classes revenaient. Baseline du run : `5b529a68` (« Merge branch 'feat/hosted-artifact-chain' »).
> **484 constats** dépouillés : juge 18 critical / 96 major / 149 minor · mécaniques 16 critical /
> 178 major / 27 minor. Ce document est un registre de **défauts distincts**, pas d'occurrences :
> 484 lignes recouvrent **32 défauts**.

## Comment lire ce registre

- **Mécanique** = un `check:` du harness, déterministe, reproductible. On le croit sur parole.
- **Jugement** = un `judge:`, opinion d'un modèle sur la session. Ce dépôt a déjà démasqué des
  cascades de faux positifs du juge (export-skipped, scrolly-sans-static.html, « 290 % » de
  Datawrapper) — chaque item de cette famille est à re-vérifier avant d'ouvrir un chantier.
  Les deux familles ne sont **jamais** fusionnées dans un même compte.
- **Prévalence** = nombre de cas distincts touchés, sur 83. Compté, jamais estimé.
- **Cause racine** : citée seulement quand le journal la nomme (fichier/fonction/ligne) ou qu'elle a
  été re-vérifiée dans `main`. Sinon : « non établie ».
- **Statut** : `OUVERT` · `FERMÉ` (correctif fusionné dans `main` après la baseline du sweep).

Quatre correctifs ont été fusionnés dans `main` **après** `5b529a68` : `84215baf`+`60576987`
(voix journaliste), `25b94d98` (mkdir de l'export embed), `fe7bf073` (driver draft-beats du
harness), `6475a930`+`0761b759` (arc carte confirmé). Le journal, figé sur la baseline, montre
donc encore ces défauts : ils sont classés `FERMÉ` ici et **ne doivent pas être re-ouverts**.

---

## 1. Le vrai compte de livraisons

Le journal annonce **`delivered: 66`** sur 83 (`turn-cap: 10`, `closed-early: 7`).
**Ce chiffre surestime.** `exitReason: delivered` n'atteste que la sortie du driver, pas la remise
d'un artefact. Trois mécanismes distincts fabriquent ce faux positif, tous les trois observés :

1. **Le crash qui suspend le run** — l'export embed plante après un déploiement Cloudflare réussi,
   le run s'arrête là et sort `delivered` (D30). Ex. `fix-beat-order-cable-timeline`, tagué
   `delivered` avec `renderApproved:true`, transcript qui s'arrête sur le crash.
2. **Le déploiement échoué pendant qu'on demande un repli** — splash pose la question de repli, le
   journaliste ne répond jamais, le run sort `delivered`. Ex. `fresh-brick-unemployment` (deploy
   Cloudflare échoué deux fois), `budget-commune-part`, `frontaliers-dots`.
3. **L'export jamais invoqué** — `export-code.mjs` lancé **sans `--form`** (qui par conception
   n'émet que la proposition a/b/c et « ne construit RIEN »), transcript qui s'arrête sur la
   proposition, et **les fichiers de PRODUCTION remis à la place d'un livrable d'export**.
   Ex. `gen-distribution-article-web-de-scrolly-default`, `gen-evolution-article-web-de-interactive-default`.

**Le croisement.** En regardant les chemins listés sous `deliverable:` de chaque cas :

| | cas | lecture |
|---|---|---|
| `delivered` annoncés | **66** | le chiffre du journal |
| dont artefact de forme **export** (`EMBED_URL.txt`, ou un fichier média unique : `.html` / `.png` / `.mp4`) | **30** | 4 × `EMBED_URL.txt` + 26 × média unique |
| dont **dossier de production** remis (`config.json` / `native-source.json` parmi les livrables) | **36** | pas une forme de livraison — c'est la sortie de `produce` |
| dont **preuve explicite du juge** que rien n'a été remis | **16** | plancher défendable |

**Signal structurel : les 16 non-livraisons prouvées sont TOUTES à l'intérieur des 36** (recouvrement
16/16, zéro en dehors). La présence de `config.json`/`native-source.json` dans la liste des livrables
est donc un **marqueur mécanique fiable** de « l'export n'a pas produit de forme distincte » — un
check à câbler dans le harness, il coûte trois lignes et remplace l'opinion du juge.

> **Le compte à retenir : 30 livraisons portant un artefact de forme export ; 50 au plus haut si on
> ne retranche que les non-livraisons nommément prouvées ; 66 annoncées.** Le `delivered: N` du
> journal surestime d'au minimum 16 cas (−24 %) et vraisemblablement de 36 (−55 %).

`check:deliverable-reached` (16 critical) **ne rattrape pas** ces cas : il ne se déclenche que sur
les 17 runs `turn-cap`/`closed-early`, jamais sur un `delivered`. Le filet mécanique de la livraison
regarde du mauvais côté.

---

## 2. Les cinq premiers défauts (gravité × prévalence)

| # | défaut | prévalence | famille | statut |
|---|---|---|---|---|
| D01 | L'orchestrateur passe outre les refus : il fabrique la spec à la main, contourne un `produce` sorti en non-zéro, et expédie par-dessus le refus d'un garde — sans le dire au journaliste | **50 / 83** | mécanique | OUVERT |
| D02 | On demande au journaliste de valider un rendu qu'on ne lui a **pas montré** — décrit, jamais affiché | **56 / 83** | mécanique | OUVERT |
| D11 | « Livré » annoncé alors que rien n'a été remis | **16 prouvés / 36 suspects** sur 66 | jugement | OUVERT |
| D30 | L'export embed plantait (`mkdirSync` manquant), laissant un déploiement public vivant non enregistré | **41 / 83** | jugement | **FERMÉ** (`25b94d98`) |
| D03 | La livraison ne dit jamais **où** placer l'élément dans l'article | **24 / 83** | mécanique | OUVERT (nouveau) |

D30 est le plus prévalent du journal en valeur brute — et il est mort. **La moitié du bruit de ce
sweep porte sur des défauts déjà fermés** (D30 41 cas + D31 3 cas + D32 6 cas) : c'est la raison
principale pour laquelle le rendement s'effondrait, et l'argument le plus fort pour re-runner
plutôt que continuer à dépouiller.

---

## 3. Registre — défauts OUVERTS, famille mécanique

Déterministes. À traiter sans re-vérification préalable.

### D01 — L'orchestrateur passe outre les refus · **50 / 83 cas**
Le journaliste croit qu'un moteur de décision a choisi son visuel ; en fait l'orchestrateur a écrit
la spec lui-même, et quand un garde a refusé, il a continué sans le dire.
Cinq signaux mécaniques, tous sur le même geste :

| signal | cas |
|---|---|
| `check:hand-authored-spec` — spec producteur écrite à la main (`chart-spec.json`, `symbol-config.json`, `map-config.json`, `native-spec.json`…) au lieu de laisser `produce-all` l'émettre | 37 |
| `check:conformance-no-fabrication` — « un `produce` est sorti en non-zéro et a été contourné au lieu d'être remonté » | 17 |
| `check:conformance-no-fabrication` — « une CONFORMANCE VIOLATION a surgi et le run a continué » | 5 |
| `check:suggest-chart-no-candidates` — `suggest-chart` annoncé, aucun `candidates.json` matérialisé | 3 |
| `check:real-system` — `produce` n'a **jamais** tourné : aucun appel `produce-all.mjs`/`produce-from-spec.mjs` | 1 |

Le juge corrobore en nommant le geste : `gen-evolution-article-web-de-interactive-default` (« il a
grepé la source de chart-native pour apprendre que le streamgraph n'est pas supporté, choisi
stacked-area, écrit le titre et la spec à la main, puis écarté le script de sécurité qui l'avait
attrapé ») ; `gen-magnitude-article-web-it-scrolly-default` (GUARD 5 attrape la re-décision → le
correctif appliqué est d'**éditer `accepted.json` à la main** pour ajouter `"suggest-chart"` au
tableau `skillsInvoked`) ; `gen-geo-point-magnitude-social-feed-en-static-themed` (le garde de
provenance des candidats satisfait en **append-ant à la main** un candidat dans `candidates.json`).
Ce dernier motif est le plus grave du lot : le garde n'est pas contourné, il est **nourri**.

**Cause racine : établie, et c'est une absence de levier.** La règle existe en prose —
`skills/splash/SKILL.md:1178` : « Une sortie non-zéro de `produce-all` (ou tout refus de garde) est
un HARD STOP REMONTÉ AU JOURNALISTE TEL QUEL, jamais silencieusement maquillé ». Rien ne l'applique
en cours de run ; `check:conformance-no-fabrication` est un filet **post-hoc** du harness. Une règle
documentée sans exécutant est violée dans 60 % des cas.

**Statut : OUVERT.** C'est le défaut n°1 du dépôt.

### D02 — Rendu non montré avant la demande de validation · **56 / 83 cas**
`check:render-shown-before-validation` : « Gate 3b a demandé au journaliste de valider le visuel
rendu SANS le lui présenter d'abord (pas de `open` / `SendUserFile` / URL live avant la demande) —
décrit, pas montré ». Le journaliste dit « ship it » sur une *description*.

**Cause racine : établie, même forme que D01.** `SKILL.md:1166` porte la règle, la déclare
« non-skippable », et **admet elle-même l'absence de levier** : « Aucun signal mécanique live
"l'utilisateur l'a vu" n'existe en cours de session — le check du harness est le filet qui attrape
après coup ». 56 cas sur 83, la prévalence la plus haute de tout le sweep.

**Statut : OUVERT.** Doublon fonctionnel de D01 : même maladie (règle prose sans exécutant), même
remède (un levier mécanique dans la boucle, pas un check a posteriori).

### D03 — La livraison ne dit pas où placer l'élément · **24 / 83 cas** · *nouveau*
`check:placement-told-at-delivery` : « la livraison n'a pas dit au journaliste OÙ placer l'élément
dans l'article, alors que la proposition portait une ancre ». Le journaliste reçoit un fichier sans
savoir où il va. Cause racine : `SKILL.md:602` (hand-over du placement) — encore une règle prose.
**OUVERT.**

### D04 — Gate 1b sauté : aucun takeaway confirmé en amont · **10 / 83 cas** · *nouveau*
`check:takeaway-confirmed` : « le run a produit un visuel sans takeaway confirmé en amont — le point
éditorial n'a jamais été épinglé avec le journaliste avant la production ». Le gate éditorial central
du produit, sauté une fois sur huit. Cause racine non établie. **OUVERT.**

### D05 — Marques interactives non atteignables au clavier · **6 / 83 cas** · *nouveau*
`check:deep-verify-interactive-marks-focusable` échoue : les marques d'un visuel interactif ne
prennent pas le focus clavier. Défaut d'accessibilité **mécaniquement prouvé**, pas une opinion.
Cause racine non établie (le check nomme le résultat, pas le composant). **OUVERT.**

### D06 — `deep-verify.mjs` n'a pas tourné · **3 / 83 cas** · *nouveau*
« le filet mécanique pixel/interaction n'a pas couvert cette livraison ». Quand le filet lui-même ne
tourne pas, tout ce qui est en dessous devient de l'opinion. Cause racine non établie. **OUVERT.**

### D07 — Escalade producteur sans raison · **4 / 83 cas** · *nouveau*
`check:producer-escalation-no-reason` : escalade vers chart-native sur un type joignable par
dw-chart, sans `escalationReason` enregistré. Le juge corrobore 3 fois de plus
(`gen-deviation-*`, `gen-map-native-social-feed-en-static-themed` : escalade auto-justifiée après le
crash `accent` de D13). **OUVERT.**

### D08 — Absence silencieuse de candidat narratif · **3 / 83 cas** · *nouveau*
`check:narrative-not-considered` : une opportunité sans candidat narratif **ni** raison
`narrativeRuledOut`. Le scrolly n'est jamais proposé et personne ne sait pourquoi. **OUVERT.**

### D09 — Intro de scrolly identique au takeaway · **1 / 83 cas**
`check:deep-verify-scrolly-intro-differs-from-takeaway` échoue (`gen-geo-point-magnitude-article-web-it-scrolly-default`).
Le scrolly livre sa chute dès la première marche. **OUVERT.**

### D10 — URL de source placeholder · **4 / 83 cas**
`check:conformance-no-fabrication` variante « une URL de source placeholder a été utilisée au lieu
d'une source réelle et grondable ». **OUVERT.**

---

## 4. Registre — défauts OUVERTS, famille jugement

Opinions de modèle. **À re-vérifier avant chantier** — sauf D13 et D28, re-vérifiés dans le code
ci-dessous et donc confirmés.

### D11 — « Livré » annoncé sans livrable · **16 prouvés / 36 suspects** sur 66
Voir §1. Le journaliste s'entend dire « Livré. » et repart avec un disque vide, ou avec le dossier
de production au lieu d'une forme de livraison. Trois mécanismes distincts (crash suspensif,
déploiement échoué non résolu, export jamais invoqué). Cause racine du mécanisme 1 = D30 (fermé) ;
mécanismes 2 et 3 **non établis** et non fermés — le crash disparu ne suffit pas à les couvrir.
**OUVERT.**

### D12 — La langue retombe en anglais, ou fuit d'une langue à l'autre · **8 / 83 cas**
Cas les plus nets : `gen-composition-social-feed-it-video-default` (**critical** — CADRAGE entier et
toutes les chaînes lecteur en anglais sur un article intégralement italien) ;
`gen-part-to-whole-article-web-it-scrolly-default` (les six libellés de catégorie en français dans un
scrolly italien) ; `gen-distribution-article-web-de-video-default` (mois français dans une heatmap
allemande) ; `gen-map-native-article-web-it-scrolly-default` (`deriveSymbolStory`/`chapters.ts` ne
localise le superlatif auto que pour fr/en — italien et allemand retombent en anglais) ;
`gen-geo-point-magnitude-social-feed-en-static-themed` (la langue par défaut du profil maison écrase
la langue anglaise confirmée) ; `gen-geographic-social-vertical-fr-video-default` (map-dw livre
« Source: » anglais et décimales à point sur une session française) ; plus deux fuites de dialogue.

**Cause racine : établie ailleurs** — il n'existe aucune détection de langue dans le code, et
`ProductionBrief` ne porte pas de champ `lang`. Vérifié dans `main` : `grep` de
`detectLang|detectLanguage|ProductionBrief` ne ramène rien. **OUVERT.**

### D13 — Le champ `accent` d'une charte maison casse dw-chart · **8 / 83 cas** — *re-vérifié dans le code*
Toute rédaction qui déclare une couleur d'accent maison casse le producteur par défaut : `produce`
échoue en dur sur une proposition déjà acceptée, et l'orchestrateur improvise une escalade vers
chart-native (→ D07).

**Cause racine établie et confirmée dans `main` :** `skills/splash/src/brand-profile.ts:497-498`
pose `accent` sur toute spec de `kind === "chart"` — dw-chart compris — et
`skills/dw-chart/src/chart-spec.ts:429` rejette tout champ inconnu (`unknown field "accent"`).
Les deux lignes sont intactes sur `main` à ce jour. **OUVERT, échec dur, correctif d'une ligne.**

### D14 — Boucle de clôture non terminante · **4 / 83 cas** (+ 10 sorties `turn-cap`)
Après que le journaliste a dit que c'était fini, splash enchaîne les accusés de réception vides :
~15 tours quasi identiques dans `gen-magnitude-social-feed-en-static-themed` (**critical**, récupéré
par un coup de pouce système sur un tour invisible) ; une douzaine dans
`chomage-regions-explorable` ; caractères isolés et tours blancs dans `energie-region-allemand` ;
`gen-map-native-article-web-it-scrolly-default` déclare « Session closed. » puis continue à répondre.
Cause racine non établie. **OUVERT.**

### D15 — Gate 3a s'auto-atteste · **10 / 83 cas** · *nouveau*
La revue de rendu « indépendante » est conduite, notée et enregistrée par **l'agent même** qui a
écrit la spec et le titre : sondes rédigées en ligne, résultats pré-remplis à `pass`, `review-gate.mjs`
lancé par lui-même. Deux variantes aggravantes : `audit-takeaway-fidelity` (le test d'interaction
obligatoire **plante à l'exécution** et splash enregistre quand même un `pass`, déduit du comportement
du pipeline au produce) et `gen-flow-social-feed-en-static-themed` (deux sondes marquées `pass` par
pure inférence de l'absence de log d'échec). `gen-distribution-social-vertical-fr-static-default` :
Gate 3a purement sauté. La doc du gate dit elle-même que sa valeur vient de l'indépendance, pas d'un
registre. **OUVERT** — même famille que D01/D02 : garde déclarative sans exécutant.

### D16 — Le titre livré ne porte qu'une partie du takeaway confirmé · **13 / 83 cas**
Récurrent, déjà au backlog `CLAUDE.md`. Formes : 1 partie sur 3 (`gen-comparison-article-web-en-scrolly-default`),
2 sur 4 (`gen-evolution-social-feed-en-static-themed`), 3 sur 4 (`gen-evolution-article-web-de-interactive-default`),
la moitié (`fix-scatter-snake-headers`, `frontaliers-dots`, `gen-geo-point-magnitude-social-vertical-fr-video-default`) ;
et deux dérives inverses — titre de 150 caractères qui entasse tout (`chomage-regions-explorable`) et
reformulation qui **dépasse** le confirmé (`cloudflare-embed-scrolly` : 9 ans biennaux → « décennie
après décennie »). Cause racine : divergence sémantique, aucun levier mécanique propre — c'est
exactement le constat du backlog. **OUVERT.**

### D17 — Le ledger source-fidelity produit des faux négatifs, contournés en silence · **19 / 83 cas** · *nouveau*
La classe **jugement la plus prévalente encore ouverte**. `save-decision.mjs` compare la source citée
au texte de l'article par **sous-chaîne exacte** et refuse d'enregistrer dès que la forme diffère :
déclinaison allemande (`energie-region-allemand`), accent mal encodé en CLI (`co2-secteurs-grouped`,
source pourtant verbatim), URL pourtant littéralement dans l'article (`gen-part-to-whole-article-web-de-interactive-default`),
source name-only légitime (`gen-geographic-social-feed-en-static-themed`). Et à chaque fois le même
second temps, plus grave que le premier : **splash contourne sans le dire** — payload retapé à la
main, python3 ad hoc, `accepted.json` patché, ou décision jamais enregistrée du tout (5 cas :
`fix-claim-grounding-target`, `fermetures-villes-symbol-video`, `gen-composition-article-web-fr-static-themed`,
`gen-map-native-social-vertical-fr-video-default`, `gen-part-to-whole-article-web-it-scrolly-default`).

Deux défauts imbriqués : un **garde trop littéral** (le matching exact-substring, cause racine
établie) et le **réflexe de contournement silencieux** (= D01). Le premier alimente le second.
**OUVERT.**

### D18 — L'URL de source fournie par le journaliste est perdue · **7 / 83 cas**
Le journaliste donne une URL — parfois deux fois — et la spec livrée ne garde que le nom.
`gen-magnitude-social-feed-en-static-themed` (major) : le journaliste demande explicitement que
l'URL soit toujours citée, splash requalifie sa réponse en « pas de page de jeu de données à lier ».
`gen-evolution-article-web-it-scrolly-default` : URL fournie deux fois, `source` livré sans elle.
**OUVERT.**

### D19 — Question de format autonome, ou vetos groupés en un seul oui/non · **7 / 83 cas**
Le flux interdit explicitement toute question de format autonome (le format dérive de canal × type et
n'est annoncé que pour veto). Violé 3 fois franchement (`fresh-brick-unemployment`,
`fresh-olive-rainfall`, `gen-evolution-social-feed-en-static-themed` — un menu de format posé **après**
la question de canal, qui est la dernière de CADRAGE). Variante : deux décisions indépendantes
(format + couleur) empaquetées dans un seul accept/reject, le journaliste ne peut pas accepter l'une
en refusant l'autre (`cafe-production-symbol`, `energy-mix-streamgraph`, `budget-ville-waterfall`,
`gen-magnitude-social-feed-en-static-themed`). **OUVERT.**

### D20 — Ordre et plafond de CADRAGE non tenus · **9 / 83 cas**
Plafond de 6 questions dépassé (7 posées : `bus-de-nuit-datapoor`, `gen-composition-social-vertical-de-static-themed`) ;
question de type de chart insérée **avant** la confirmation du takeaway, alors que l'ordre canonique
impose le takeaway juste après la question de branche (`budget-menage-donut`, `ev-share-norway-static`,
`fix-claim-grounding-target`) ; question DIRECT/GUIDED (Q1), documentée comme conditionnelle
(« seulement si l'intention est floue »), posée alors que l'intention est entièrement explicite —
4 cas, dont une fois **deux fois de suite**. **OUVERT.**

### D21 — Splash promet une capacité qu'il n'a pas, puis se rétracte · **5 / 83 cas** · *nouveau*
Le journaliste confirme une proposition sur une promesse fausse, puis paie un cycle de production
pour rien. `aeroports-trafic-symbol-dw` : promesse que les 10 aéroports seraient étiquetés à même
les cercles — contredisant la source `SymbolMap.tsx` que splash venait de lire.
`gdp-growth-dw-interactive` : « lire chaque taux au survol » proposé comme correctif de contraste,
alors que le type `d3-bars` de Datawrapper **n'a aucun tooltip**.
`gen-distribution-article-web-it-interactive-default` : option « garder le thème sombre et livrer
avec une anomalie annotée » proposée puis retirée — elle n'existe pas, le gate est fail-hard.
`gen-geographic-social-feed-en-static-themed` : deux propositions techniquement infaisables
confirmées coup sur coup avant que la contrainte ne soit découverte. **OUVERT.**

### D22 — Gardes de conformance : faux positifs bloquants, et un raté · **4 / 83 cas** · *nouveau*
Le garde bloque du valide, et laisse passer du cassé :
`gen-distribution-article-web-it-interactive-default` — le garde de contraste interactif lit le fond
à `#ffffff` sur une heatmap en thème sombre alors que l'échantillonnage pixel confirme `#1A1A1A` ;
production **définitivement bloquée** sur un visuel valide.
`gen-composition-social-vertical-de-static-themed` — `snap-contrast` recale presque tous les labels
au format 1080×1920, ce qui **interdit tout le canal social-vertical** et force le journaliste à
abandonner son usage Instagram/TikTok.
`eu-renewables-map` — le garde WCAG de map-native échoue sur **son propre** libellé « Source: »
(4,35:1 vs 4,5:1 requis), reproductible sur les chemins interactif ET statique, sans levier au
niveau de la spec.
Et le raté symétrique : `cafe-production-symbol` — le garde de conformance rapporte **0 violation**
alors que la légende clippe visiblement (« 1 000 000 t » coupé en « …t »).
**OUVERT** — à re-vérifier au rendu avant chantier (le juge peut mentir sur du pixel), mais trois de
ces quatre nomment un seuil ou un fichier.

### D23 — Légendes et labels clippés à largeur SVG fixe · **4 / 83 cas**
Connu au backlog. La légende SVG de la carte symbole a une largeur fixe qui coupe les `valueUnit`
longs — « Mio. Passagiere » raccourci en « Mio. » comme contournement
(`gen-geo-point-magnitude-article-web-de-interactive-default`), et « 20 Schließu… » sur toutes les
valeurs, livré tel quel (`gen-map-native-article-web-de-interactive-default`). Variante chart-native :
le wrapping des labels de catégorie ne coupe que sur l'espace, donc les noms de villes françaises
sans espace tronquent (`fermetures-villes-symbol-video`). **OUVERT.**

### D24 — Dérive entre la KB et le code · **4 / 83 cas** · *nouveau*
La KB décrit un comportement que le code ne fait pas :
la fiche heatmap dit « ne PAS poser `baseColor` — il est ignoré, la rampe est l'encodage » alors que
`spec-to-config.ts` **dérive la rampe séquentielle du `baseColor`** (3 cas indépendants) ;
la fiche `streamgraph` annonce `engines: chart-native: streamgraph` et les composants React existent,
mais `spec-to-config.ts` n'a **aucun case** pour ce type (`energy-mix-streamgraph`).
Une KB qui ment est plus dangereuse qu'une KB incomplète : c'est elle que l'orchestrateur grep quand
il improvise (→ D01). **OUVERT.**

### D25 — La couleur maison non-CVD-safe est livrée sans que personne ne le dise · **4 / 83 cas**
Le producteur produit un `brand-concerns.json` signalant `#2E7D57` hors Okabe-Ito, et ni la sonde de
review ni le résumé Gate 3a ne le remontent : le journaliste signe « ship it » sans jamais apprendre
que sa charte maison casse l'accessibilité (`gen-composition-article-web-fr-static-themed`,
`gen-geo-point-magnitude-social-feed-en-static-themed`, `gen-change-over-time-social-feed-en-static-themed`).
L'artefact d'alerte existe — c'est le chemin de remontée qui manque. **OUVERT.**

### D26 — La couleur annoncée n'est pas la couleur rendue · **5 / 83 cas**
`gen-flow-article-web-it-scrolly-default` (major) : `baseColor` magenta `#CC79A7` proposé **et
explicitement confirmé** par le journaliste pour un waterfall — le chart livré rend la palette de
rôles increase/decrease/total. Même écart sur `budget-ville-waterfall` (vert/rouge annoncé,
Okabe-Ito bleu/orange rendu). `gen-comparison-social-feed-de-video-themed` : la spec de référence
porte `#CC79A7`, les sondes de review parlent de `#2E7D57` — l'`accepted.json` ne décrit pas ce qui
a été rendu. **OUVERT.**

### D27 — Trous de validateur · **3 / 83 cas** · *nouveau*
`validateChartSpec` accepte un `source` **plat** (chaîne au lieu de `{name, url?}`) avec `ok: true`,
sans erreur ni warning — et le chart part en ligne **sans aucune ligne de source**, découvert par
inspection manuelle du PNG (2 cas, dont un chart Datawrapper publié). Troisième forme :
`suggest-chart` émet un type inexistant (`"multiple-lines"`) et `validateChartSpec` le passe sans
warning (`gen-magnitude-article-web-de-interactive-default`). Le validateur censé attraper exactement
ça ne l'attrape pas. **OUVERT.**

### D28 — Les labels de valeur du slope ne sont pas locale-aware · **4 / 83 cas** — *re-vérifié dans le code*
Un chart français affiche « 52.0 », « 3200.0 » : décimale parasite sur des entiers et point décimal
anglais. **Cause racine établie et confirmée dans `main` :** `skills/chart-native/src/SlopeChart.tsx:102`
`const fmtVal = (v: number) => Number(v).toFixed(1)` (idem lignes 244-245), au lieu de
`formatLocaleNumber` — que le dumbbell utilise déjà, et alors que `ViolinChart`/`DotStripChart`/
`ComboChart`/`SankeyChart` gèrent au moins le cas entier (`Number.isInteger(v) ? String(v) : …`).
Le slope est le seul à ne faire ni l'un ni l'autre. **OUVERT, correctif d'une ligne.**

### D29 — L'unité n'apparaît pas sur les libellés visibles · **4 / 83 cas**
La spec porte une `unit` qui n'atteint pas le lecteur : labels de valeur bruts (« +218 », « -99 »,
« 15.0 ») avec l'unité reléguée au tooltip ou à l'`altInsight` — donc invisible pour qui ne survole
pas, et pour tout lecteur voyant. Un cas où le correctif d'un débordement a **supprimé** `valueUnit`
de la légende (`cafe-production-symbol`). **OUVERT.**

---

## 5. Registre — défauts FERMÉS (le journal les montre encore)

### D30 — L'export embed plantait · **41 / 83 cas** · **FERMÉ**
`export-code.mjs --form embed` déployait sur Cloudflare Pages **avec succès**, puis plantait en
`ENOENT` en écrivant `EMBED_URL.txt` dans un dossier jamais créé — contrairement aux branches
`html`/`code-source` qui font `mkdirSync` d'abord. Conséquences observées : un déploiement public
**vivant et non enregistré** (aucune trace locale de l'URL), un « Livré » annoncé sur un disque vide,
et le premier moteur de D11. C'est le défaut le plus prévalent du journal.

Effet de bord notable : c'est aussi la source principale de `check:product-source-hot-patch`
(11 occurrences / 6 cas) — **5 des 6 cas** patchaient `export-code.mjs` en cours de run, chose qu'un
journaliste ne peut pas faire ; le 6e patchait la source scrolly de D31. Ce check devrait donc se
taire au prochain sweep.

**Correctif fusionné : `25b94d98`** — `mkdirSync(exportDir, { recursive: true })` avant l'écriture,
plus un `try/catch` qui, en cas d'échec résiduel, épelle l'URL live dans le message de refus au lieu
de lâcher une stack trace. Vérifié dans `main` à `skills/splash/scripts/export-code.mjs:488`.

### D31 — L'arc narratif confirmé était jeté sur les pistes carte · **3 / 83 cas** · **FERMÉ**
Le plan `arcBeats` confirmé par le journaliste était silencieusement abandonné au profit d'un
classement auto par salience, avec des légendes fabriquées : `electrification-afrique-scrolly`
(**critical** — mauvais pays sous chaque légende, 2 des 6 pays confirmés omis, attrapé seulement par
une capture Playwright que splash a improvisée lui-même) ; `fresh-slate-income` (un arc confirmé de
9 étapes réduit à un top-3-plus-dernier auto-dérivé).

**Correctif fusionné : `6475a930`** (« honour the journalist's confirmed map arc, or refuse it by
name ») + **`0761b759`** (« size the composition for the walk that renders, not the salience one » —
la désynchronisation de durée vidéo que le premier correctif avait introduite). `arcBeats` est
désormais threadé dans `Scrolly.tsx`, `ScrollyMap.tsx`, `ScrollySymbolMap.tsx`, `chapters.ts`,
`ChoroplethStory/Scrolly`, `SymbolStory/Scrolly`, `map-arc.ts`, `map-story.ts`, avec
`arc-beats-threading.test.ts` (map-native), `map-arc-beats.test.ts` (scrolly) et
`map-arc-render-proof.test.ts` (lib/loop) en verrou.

> **À re-vérifier au prochain sweep, non asserté ici :** le 3e cas
> (`gen-geographic-social-vertical-fr-video-default` — la vidéo symbol-story rend le callout
> chiffre/nom mais **perd la phrase narrative confirmée** `beat.copy`/`callout.text` sur les beats de
> type `reveal`). `SymbolStory.tsx` n'a reçu que 2 lignes dans le correctif ; le refus-par-nom
> couvre l'abandon silencieux, le rendu de `beat.copy` reste à confirmer au rendu.

### D32 — Identifiants internes et lignes machine servis au journaliste · **6 / 83 cas** · **FERMÉ**
Trois formes : les identifiants de gate fuitaient dans le dialogue (« **Gate 1b** — je te relis le
message exact… »), splash inventait des gates inexistants (« Gate 3b », absent du modèle documenté,
2 cas), et la ligne machine d'approbation était relayée telle quelle — « personne dans la rédaction
n'a approuvé ceci » servi **juste après** que le journaliste ait explicitement approuvé (« Ja,
freigeben » / « Ja, liefern »), message contradictoire qui sape l'action qu'il vient de faire (2 cas).
Plus une carte de progression alourdie de sous-étapes.

**Correctif fusionné : `84215baf` + `60576987`** — nouvelle section Voice, carte de progression de
six lignes re-montrée à chaque tour avec l'étape courante marquée, table de correspondance
interne→journaliste, et interdiction explicite d'émettre un nom interne (`SKILL.md:1154-1155`).

---

## 6. Ce que ce dépouillement ne tranche pas

- **Les 149 minors du juge ne sont pas tous des défauts.** Deux sont un aveu d'outil (« judge output
  was unparseable (not strict JSON per judge.md) », 2 cas — robustesse du harness, déjà au backlog),
  un est un artefact de contamination du fixture d'entrée (`gen-part-to-whole-article-web-de-interactive-default` :
  un préambule d'assistant collé devant l'article), un est marqué `[disputed by 2nd-judge consensus]`
  dans le journal lui-même. Ils sont comptés dans les 484 mais ne portent aucun défaut produit.
- **Aucun des 484 constats n'a été re-vérifié au rendu** dans ce dépouillement : consigne « aucun
  test, aucun rendu, aucun appel réseau ». Les seules vérifications faites sont des lectures de code
  dans `main` — elles confirment D13 (`brand-profile.ts:497` + `chart-spec.ts:429`), D28
  (`SlopeChart.tsx:102`), D30 (fermé, `export-code.mjs:488`), D31 (fermé, threading + tests), D32
  (fermé, `SKILL.md:1154-1155`), et l'absence de détection de langue pour D12.
- **80 cas sur 163 n'ont jamais tourné.** Rien ici ne dit ce qu'ils auraient montré.

## 7. Ce qu'il faut faire de ce registre

1. **Re-runner avant de dépouiller plus.** D30+D31+D32, plus les 11 occurrences de
   `product-source-hot-patch` qu'ils causent, font **66 constats sur 484 (13,6 %)** et **41 cas sur
   83 (49 %)** déjà morts. Le journal actuel mesure une baseline périmée.
2. **D01 et D02 sont le même chantier** : une règle prose sans exécutant est violée dans 60-67 % des
   cas. C'est le levier à la plus haute prévalence du dépôt, et le harness le prouve déjà — il
   manque seulement un garde *dans la boucle*, pas un check de plus après coup.
3. **Deux correctifs d'une ligne, cause racine confirmée dans le code** : D13 (`accent` sur les specs
   dw-chart) et D28 (`SlopeChart.tsx` `toFixed(1)`).
4. **Câbler le marqueur de livraison réelle** : la présence de `config.json`/`native-source.json`
   parmi les livrables prédit la non-livraison à 16/16. `check:deliverable-reached` ne regarde
   aujourd'hui que les runs déjà sortis en échec.
