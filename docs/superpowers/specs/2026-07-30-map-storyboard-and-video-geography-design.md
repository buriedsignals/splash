# Spec — Le storyboard sur toutes les cartes, et la vidéo hors du monde

> **Statut :** conçu, non implémenté.
> **Origine :** test manuel de Rémy (article Albanie), transcript
> `~/.claude/projects/-Users-rmdms-Sites-Professional-splash-test-article/3af34e6b-*.jsonl`.
> **Branche :** `feat/map-storyboard-and-video-geography` (worktree `splash-storyboard`), off `main` @ `fba11075`.
> **Langue :** prose FR, identifiants et code en anglais (standard non négociable).

---

## 1. Ce qui s'est passé, et ce qui est vrai

Un journaliste demande une vidéo de carte à marqueurs. L'orchestrateur lui répond — en précisant
qu'il vient de vérifier plutôt que de répondre de mémoire — qu'il n'existe **ni caméra par point,
ni texte par point, ni plan d'étapes rédigé** sur ce type de carte, et que le refus est mécanique.
Le journaliste renonce à la vidéo.

**Les trois affirmations sont fausses**, et le code le dit :

- `skills/map-native/src/components/LocatorStory.tsx:1-3` — *« beat-driven guided camera tour for
  the locator / markers map … beats from `beatsForMode(deriveLocatorStory(config.markers, meta),
  mode)` — **per-place** »*. Le survol guidé point par point existe, et `produce.mjs:437` en fait
  le **défaut** pour tout ce qui n'est pas une route.
- Le même composant gère *« the caption reveal ramp for the active beat, plus the central
  category/place label »* — une légende par étape et un label de lieu à son étape.
- `LocatorConfigShape.revealMode` est documenté *« Reveal camera choreography (context |
  sequential) »*. L'orchestrateur a dit que `revealMode` n'agissait que sur le remplissage des
  choroplèthes.

**Ce qui est vrai, en revanche**, c'est que le plan d'étapes rédigé n'existe que pour deux types.
`skills/splash/SKILL.md:279-291` le documente déjà, y compris son trou : le plan d'une carte est un
`arcBeats` **ancré sur des régions**, le journaliste le **confirme, ajuste ou oppose son veto**, il
est épinglé **verbatim** une fois confirmé — et `cartogram`, `dot-density`, `hex-grid`, `locator`,
`route` *« do NOT accept a confirmed arc yet »*. Un `arcBeats` soumis sur l'un d'eux est refusé par
son nom (`unsupportedArcBeatsErrors`, `skills/map-native/src/map-arc.ts`).

Ce lot ne renverse donc aucune règle et n'invente aucune capacité : **il ferme un trou que la
documentation du produit nomme déjà**, et il en profite pour dire vrai sur ce que le moteur sait
faire.

### Une précision qui a coûté deux erreurs d'analyse, écrite ici pour la prochaine fois

Il existe **deux mécanismes de plan narratif**, et les confondre mène à des conclusions fausses :

- **`narrative.beats`** — le seam de la boucle V2 (`lib/loop/beats.ts`, `lib/brain/beats.ts`). Deux
  pistes, graphique et image ; le journaliste écrit `text`, laissé **vide** à dessein, à côté d'un
  `draftText` que la machine propose et qui ne peut jamais passer pour de l'écrit. **Le parcours du
  journaliste ne l'emprunte pas** : dans le transcript du test manuel, `draft-beats`, `author-beats`
  et `draftText` apparaissent **zéro fois**, quand `produce-all` en compte 101.
- **`arcBeats`** — le plan de carte de la chaîne prose, celle que le journaliste emprunte
  réellement. C'est **celui-ci** que ce lot étend.

## 2. Décisions

**D1 — Un ancrage par type, et il doit être vérifiable.** Une étape désigne quelque chose qui existe
réellement dans les données, et le moteur doit pouvoir le prouver avant production. C'est ce qui
sépare un storyboard d'un vœu — et c'est ce qui permet un refus nommé plutôt qu'une carte muette.

| type | ancrage | nature du travail |
|---|---|---|
| `choropleth`, `symbol` | région | **existe** |
| `cartogram` | son `id` de région (`values[].id`) | débloquer le validateur |
| `dot-density` | son `regionKey` + `rows` | débloquer le validateur |
| `locator` | **un marqueur nommé** (`markers[]`) | ancrage neuf, simple |
| `route` | **un territoire traversé** — `computeRoute` les déduit déjà de la géométrie | ancrage neuf |
| `hex-grid` | **un lieu ; la maille qui le contient est déduite** puis vérifiée non vide | ancrage neuf |

`cartogram` et `dot-density` portent déjà des identifiants de région — leur exclusion est un
validateur qui ne regarde pas le champ, exactement la classe du cartogram qui ne validait pas son
fond de carte (réparation du 2026-07-30). C'est la moitié la moins chère du lot.

Le `hex-grid` est le seul type dont les unités n'existent qu'après calcul. Il s'ancre donc sur une
**géographie** et non sur une donnée, et le moteur vérifie après binning que la maille contenant ce
lieu existe et porte des données. Sans cette vérification, l'ancrage serait un vœu.

La `route` s'ancre sur un **territoire traversé** plutôt que sur un index du tracé : c'est nommé,
vérifiable, et c'est la langue du récit (« à l'entrée en Serbie ») plutôt que celle de la polyligne.

**D2 — L'échange éditorial ne change pas.** Splash propose ou recommande ; le journaliste répond,
confirme, ajuste ou oppose son veto ; le plan confirmé est épinglé **verbatim**. L'outil ne rédige
pas le journalisme. C'est le dispositif actuel du choroplèthe et du symbole, étendu tel quel.

**D3 — La vidéo lit la géométrie injectée.** Les compositions vidéo vont chercher
`staticFile("geo/world.geojson")` et joignent sur un `iso_a3` codé en dur — treize sites recensés
(`ChoroplethStory.tsx:215,238,279,313,362,494`, `ChoroplethReveal.tsx:119`, `CartogramStory.tsx:163`,
`CartogramReveal.tsx:114`, `DotDensityStory.tsx:184`, `DotDensityReveal.tsx:119`,
`RouteReveal.tsx:22`, `RouteScrolly.tsx:22`). Elles doivent lire `config.geometry` et la clé de
jointure du descripteur, comme `ChoroplethMap.tsx` le fait depuis la réparation du 2026-07-30 — le
motif est éprouvé, pas à inventer.

**D4 — Le refus temporaire tombe en DERNIER.** `lib/geo/resolve-for-produce.ts` refuse aujourd'hui
une géographie non-monde en vidéo. Ce refus protège d'un mp4 montrant une carte du monde vide sous
un crédit qui en nomme une autre. **Il ne se retire qu'une fois D3 prouvé au rendu**, jamais avant :
le retirer plus tôt réinstalle exactement le défaut qu'il a été écrit pour fermer.

**D5 — Le choix du style de caméra se branche.** `cameraMode` est lu par `produce.mjs` et accepté
par `validate-config.ts` ; **aucun code ne l'écrit jamais**. Douze vidéos sont construites (deux
styles × six types), six sont inatteignables. On thread le choix depuis le journaliste.

**Et on ferme dans le même lot le piège que ce branchement ouvrirait** : dans la branche
`guided-tour` de `storyComps()` (`produce.mjs:259-271`), `route` n'a **pas de cas** et retombe sur
`ChoroplethStory`. Inatteignable aujourd'hui (une route prend `route-reveal` par défaut et rien
n'écrit le champ) ; atteignable à la seconde où le knob existe. Exposer la capacité sans fermer ce
fallthrough, c'est livrer un défaut avec la fonctionnalité.

**D6 — Le `SKILL.md` cesse de mentir sur trois points** (§1). Ce sont ces phrases qui ont fait
renoncer un journaliste à une capacité existante ; les corriger fait partie du livrable, pas des
finitions.

## 3. Vérification

**Une vraie vidéo rendue, ouverte et regardée, par type.** Sept types, sept vidéos : la caméra doit
se rendre là où les étapes l'annoncent, et le texte confirmé doit s'afficher à son étape.

Ce n'est pas une formalité et le prix est assumé. Sur la réparation du 2026-07-30, deux défauts sur
neuf n'ont été trouvés qu'en regardant une image — dont un choroplèthe suisse qui coloriait le Jura
**français**, invisible à tous les tests parce que les post-conditions demandaient si chaque région
réclamée était revenue, jamais s'il en était revenu **plus** que demandé.

Au-delà du rendu, chaque type ajouté livre :

- une preuve d'ancrage : l'étape résout vers une entité réelle, et une étape qui ne résout pas est
  **refusée par son nom** avant production ;
- une **vérification par mutation** : casser le correctif, voir le levier rougir, rétablir. Un levier
  qui ne rougit pas n'est pas un levier — cette leçon a été payée sept fois le 2026-07-30, dont deux
  fois par des assertions vertes structurellement incapables de rougir.

Pour D3, la preuve est une vidéo d'une géographie **non-mondiale** (cantons suisses) où l'on vérifie
à l'œil que les territoires dessinés sont les bons — c'est-à-dire exactement ce que le refus D4
empêche aujourd'hui de produire par erreur.

## 4. Hors périmètre, nommé

- **La jointure ADM1 normalisée-contre-brute.** `geo-match.ts:83-88` matche sur une clé normalisée
  (`Geneve` → `GENEVE`) et `subset.ts` sous-ensemble sur la valeur brute contre le `name` réel
  (`Genève`). Un CSV annonce 26/26 reconnus au cadrage puis échoue au produce en accusant les
  données du journaliste. Chantier voisin, réel, et distinct : le mélanger ferait grossir celui-ci
  sans le servir.
- Le seam `narrative.beats` de la boucle V2 (§1) — ce lot travaille dans la chaîne que le
  journaliste emprunte.
- Le bug `waitForFunction` à deux arguments dans `snap-proof.mjs`, `snap-a11y.mjs`, `snap-theme.mjs`.

## 5. Risques

- **Sept vidéos rendues coûtent cher en temps machine**, et un rendu sous contention fabrique de
  faux échecs (mesuré le 2026-07-30 : une suite de 25 s contre un timeout de 30 s). Les rendus de
  preuve se font machine calme, un à la fois.
- **D3 touche treize sites de composition.** C'est le gros du lot, et c'est là qu'un défaut
  d'intégration peut naître entre deux tâches — la classe qui a produit quatre Criticals lors de la
  réparation. Une revue finale de branche est obligatoire, pas optionnelle.
- **Le hex-grid peut se révéler plus dur que prévu** : si la maille contenant le lieu demandé est
  vide de données, l'étape doit être refusée par son nom, et il faudra décider si le journaliste
  peut viser une maille voisine ou doit changer de lieu. À instruire au moment du plan.
