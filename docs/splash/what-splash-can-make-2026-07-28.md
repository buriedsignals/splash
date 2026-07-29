# Ce que Splash sait faire, ce qu'il fait mal, ce qu'il ne sait pas faire

**28 juillet 2026** — mesuré sur `main` @ `8776266e`, dépôt `splash-merge`.
Document de décision. Il remplace, pour la lecture rédaction, `docs/splash/capability-matrix-2026-07-28.md`
(mesuré le matin même sur `d7044400`), dont il reprend les chiffres, les remesure, et **corrige la forme**.

---

## Pourquoi ce document existe, et pourquoi la matrice ne suffisait pas

La matrice d'ingénierie répond à une question : *« la machine sait-elle fabriquer ceci ? »*.
Elle a donc **deux états** — ça se construit, ça ne se construit pas.

Le balayage QA du 28 juillet (163 cas) a prouvé qu'il en existe un **troisième**, et que c'est le
dangereux :

> **le visuel sort, il a l'air fini, le journaliste le publierait — et il est faux, incomplet, ou
> dans la mauvaise langue.**

La matrice comptait cet état-là dans la colonne « ça marche ». C'est ce que ce document répare.

**Trois états, et un seul critère pour chacun :**

| | nom | critère |
|---|---|---|
| **1** | **Ça marche** | ça se produit, et rien de connu ne rend le résultat faux |
| **2** | **Ça sort défectueux** | l'artefact apparaît, le journaliste le publierait, et il est faux / incomplet / en anglais |
| **3** | **Ça ne sort pas** | avec **la raison** — et les raisons ne sont pas interchangeables |

Les cinq raisons de l'état 3, qui ne se remplacent pas l'une l'autre :
**le moteur n'a pas ce type** · **la KB ne modélise aucune fiche** · **la boucle ne sait pas
l'assembler** · **la géographie n'est pas livrée** · **la capacité n'existe pas du tout**.

---

## Le vocabulaire de ce document

- **Une forme** = un type de visuel × un format. « Un classement en barres, en image fixe » et
  « le même classement, en vidéo » sont **deux formes**. C'est l'unité de tous les comptes ci-dessous.
- **Les quatre formats** : **image fixe** (un fichier image, lisible sans JavaScript) ·
  **interactif** (une page web où le lecteur survole, zoome) · **vidéo** (un mp4) ·
  **scrolly** (le lecteur fait défiler, le visuel avance avec lui).
- **Les quatre canaux** : article web · fil social (carré) · social vertical (9:16) · papier.
  Le canal décide quels formats sont même possibles — pas d'interactif sur du papier.
- **Le takeaway confirmé** : la phrase que le journaliste valide au cadrage, celle que le visuel
  doit porter. **L'arc** : le plan en plusieurs temps (« d'abord ceci, puis cela, donc… ») que le
  journaliste confirme pour un scrolly ou une vidéo.

---

## Les trois comptes

**L'unité comptée.** Une **ligne** = une fiche × un moteur × un format, sur le canal le plus large
(article web). Le moteur reste dans l'unité **exprès** : le même graphique en interactif peut être
propre par un moteur et défectueux par l'autre, et effacer le moteur effacerait précisément la
distinction que ce document existe pour montrer.

Sur **193 lignes** que la base de connaissance et les moteurs nomment ensemble — **134 offertes** au
journaliste, **59 que rien n'offre** :

| état | lignes | part |
|---|---|---|
| **1 — ça marche** | **107** | 55 % |
| **2 — ça sort défectueux** | **23** | 12 % |
| **3 — ça ne sort pas** | **63** | 33 % |

*(63 = 4 lignes offertes mais marquées mortes + 59 hors offre. 107 + 23 + 4 = 134 lignes offertes.)*

**Quatre avertissements, à lire avant les tableaux — ils comptent plus que les chiffres.**

1. **Ces 107 supposent une rédaction qui travaille en anglais.** Le défaut de langue (état 2, D4
   ci-dessous) touche **toutes les lignes sans exception**. Pour Heidi.news, qui travaille en
   français, **les 130 lignes propres sont en état 2** tant qu'il n'est pas réparé. C'est le défaut
   le plus large du système et il n'a **aucune branche de correction en cours**.
2. **Ces 107 supposent une géographie que Splash livre.** Deux fonds de carte existent — le monde
   par pays, et les États américains. Les **29 lignes de carte propres** sont conditionnées à ce que
   la donnée s'y raccroche. Annemasse — le pilote — n'entre dans aucun des deux.
3. **Les 23 de l'état 2 sont conditionnelles pour 13 d'entre elles.** D1 et D2 ne se déclenchent
   **que si le journaliste rédige son propre plan** sur une carte. Sans plan, ces 13 lignes
   produisent le parcours dérivé de la donnée — pas faux, simplement pas le sien. **Avec plan,
   elles mentent.** Comme un scrolly et une vidéo appellent précisément ce geste, je les compte en
   état 2 ; la condition est dite à chaque fois.
4. **« Ça marche » ne veut pas dire « c'est joli ».** Il veut dire : *rien de connu, au 28 juillet,
   ne rend ce résultat faux*. Le balayage tournait encore quand ce document a été écrit.

Trois défauts supplémentaires ne se comptent pas en lignes parce qu'ils touchent le **processus**,
pas un type de visuel : la livraison en embed qui plante, la validation qui s'efface, et la couleur
maison qui casse un moteur. Ils sont en §3.

*(Vue « fiche », si l'on efface le moteur : **112 formes distinctes** (type de visuel × format) sont
offrables, dont **110 sans marque** — image fixe 34 · interactif 34 · vidéo 34 · scrolly 10. C'est
ce qu'un journaliste voit dans un menu ; ce n'est pas ce sur quoi les états se comptent, parce qu'une
même case y confond une route propre et une route défectueuse.)*

---

# 1. État 1 — ce que Splash sait faire

107 lignes. En langage de rédaction :

### Les graphiques — 27 familles, en image fixe, en interactif et en vidéo

Splash sait produire, pour chacune de ces 27 familles, **une image fixe pour l'article ou le
papier, une version interactive pour le web, et une vidéo pour les réseaux** — recadrée
automatiquement au canal (paysage pour l'article, carré pour le fil, 9:16 pour le vertical) :

- **comparer** : barres · barres groupées · barres empilées · sucettes (lollipop) · haltères
  (dumbbell) · bande de points · barres divergentes · empilé divergent · jauge (bullet) · barres radiales
- **suivre dans le temps** : courbe · aires empilées · pente (slope) · nuage connecté · éventail
  (projection) · classement mouvant (bump)
- **une part d'un tout** : camembert · gaufre (waffle) · treemap
- **une distribution** : histogramme · boîte à moustaches · violon · essaim (beeswarm) · nuage de points
- **une composition** : cascade (waterfall) · pyramide des âges · matrice de chaleur (heatmap)

Neuf de ces familles peuvent aussi passer par **Datawrapper** en image fixe (barres, courbe,
camembert, nuage, empilé, groupé, haltère, sucette, jauge) — voir l'état 2 pour l'interactif
Datawrapper, qui n'est **pas** dans cette liste.

### Les cartes — 7 familles, en image fixe, en interactif et en vidéo

Choroplèthe (aplats colorés) · symboles proportionnels · quadrillage hexagonal · densité de points ·
cartogramme · repère (locator) · tracé (route).

Six des sept savent aussi faire une **vidéo qui raconte** — une caméra qui vole d'un lieu à l'autre,
un temps de récit par lieu. `route` fait une vidéo, mais un simple dévoilement, sans récit.

**Condition, et elle est stricte :** ces vidéos et ces scrollys ne sont en état 1 que **tant que le
journaliste ne rédige pas son propre plan**. Le parcours dérivé de la donnée n'est pas faux — il
n'est simplement pas le sien. **Dès qu'il en écrit un, les 7 vidéos et les 6 scrollys de carte
passent en état 2** (D1 et D2). C'est la condition la plus lourde de tout ce chapitre, et c'est
précisément le geste qu'un scrolly ou une vidéo appelle.

### Le scrolly — 8 lignes propres sur 10 offertes

Le lecteur fait défiler, le visuel avance. Disponible pour **la courbe et les barres** (côté
graphique) et pour **les six familles de carte** citées ci-dessus.

**Mais une distinction que la rédaction doit connaître :** parmi ces 8, seules **deux** — la courbe
et les barres — acceptent un **plan écrit par le journaliste**, temps par temps. Les six scrollys de
carte **fabriquent leur propre parcours à partir de la donnée** : Splash choisit les régions et
l'ordre. *Mesuré : 8 lignes propres à l'offre, 2 dont la marche est rédigeable*
(`lib/brain/beats.ts`, `AUTHORABLE_SCROLLY_TYPES`).

**À lire avec D1 et D2 : sur ces 8, seules les 2 scrollys de graphique (courbe, barres) sont en
état 1.** Les **6 scrollys de carte sont en état 2** — non pas parce qu'ils dérivent leur parcours
(ce serait un choix assumé), mais parce que, quand le journaliste **écrit quand même** un plan, le
système l'**accepte puis le jette** (D2), ou l'honore à moitié en réécrivant ses phrases avec un
classement inventé (D1). *Chacune des six familles a bien son propre composant de rendu dédié
(`Scrolly.tsx:675-704`) — il n'y a pas de carte rendue à la place d'une autre.*

### Ce qui marche autour du visuel

- **La chaîne complète** : article → analyse → cadrage → proposition (avec droit de veto) →
  production → export, avec des arrêts explicites où le journaliste tranche.
- **Un élément = un format.** Splash ne fabrique plus « tout ce qui est possible » : il fabrique
  la forme définie, et elle seule.
- **La couleur et le fond de la maison** se propagent au visuel (`baseColor`, fond arbitraire clair
  ou sombre) — sauf le champ `accent`, voir §3.
- **La livraison** : un fichier que la rédaction possède, ou un embed hébergé. La chaîne
  capture → aperçu → validation → livraison agit désormais aussi sur un **embed Datawrapper**
  hébergé (fermé le 28 juillet) — un chart Datawrapper interactif ne s'arrête plus après la
  publication.

---

# 2. État 2 — ce qui sort, et qui est défectueux

**C'est la catégorie que l'ancienne matrice comptait comme un succès.** 23 lignes, plus trois
défauts transversaux (§3). Chacun a été vérifié dans le code, pas déduit.

**Les quatre à retenir, dans cet ordre :** **D4** (la langue — il touche tout, et personne ne le
répare) · **D1** (l'arc de carte jeté, et un classement faux inventé à la place) · **D3** (la
livraison en embed qui plante en laissant une page publique introuvable) · **D5** (l'unité qui
n'atteint jamais le lecteur sur un interactif Datawrapper).

---

### D1 · L'arc confirmé par le journaliste est jeté sur les cartes — et remplacé par un classement inventé

**Ce que le journaliste vit.** Il écrit un plan en quatre temps pour un scrolly de carte : « on part
de Genève, on descend sur Annemasse, puis on regarde la vallée ». Splash valide le plan. La page
sortie **ne suit pas ce plan** : elle survole les régions que la donnée juge saillantes, dans l'ordre
que la donnée impose, avec des légendes que la machine a rédigées — **sous la signature du
journaliste**.

**Et pire.** Le composeur de légendes lisait le classement (« le plus élevé », « le plus bas »)
**dans la position du temps** dans la liste. Sous un arc, la position n'est pas un rang, c'est
l'ordre de l'argument. Résultat mesuré : une région simplement **dernière dans une marche
géographique** a été légendée **« le plus bas »** alors qu'une autre région détenait le minimum.
**Une affirmation chiffrée fausse, écrite par la machine, publiée sous une signature.**

**Ce qui se passe dans le code.** Les huit appelants de `deriveMapStory` / `deriveSymbolStory` ne
transmettaient pas `config.arcBeats` — ni la piste des légendes, ni **la piste caméra** (donc les bons
mots au-dessus de la mauvaise région), ni les composants vidéo et scrolly de `map-native` eux-mêmes.
Et `mapStoryToChapters` (`skills/scrolly/src/chapters.ts`) reconstruisait chaque légende en
`« <nom> — <valeur>, <descripteur> »`, **en jetant la phrase du journaliste même quand le plan était
honoré**.

**Lignes touchées : 4** — choroplèthe et symboles proportionnels (moteur `map-native`), en scrolly
et en vidéo. **Aucun autre moteur ne fait ces formes** : il n'y a pas de voie de secours.

**Condition de déclenchement :** le défaut ne se manifeste **que si le journaliste confirme un arc**.
Sans arc, la marche par saillance s'applique et le descripteur de rang est exact (dans cette
marche-là, la position **est** le rang). Ce n'est donc pas un défaut permanent — c'est un défaut qui
frappe **exactement quand le journaliste exerce son métier**.

**Correction : elle existe, sur la branche `fix/scrolly-map-arc-beats` (`6475a930`), NON FUSIONNÉE.**
Elle fait passer l'arc dans les six composants, ajoute un drapeau `authored` que seul un arc confirmé
porte, fait expédier la phrase du journaliste telle qu'écrite, et **interdit tout descripteur de rang
sous un arc** (rien n'a calculé de rang). Elle ajoute une preuve au rendu (`SPLASH_PROVE_MAP_ARC`)
qui relit les temps sur la page construite.

---

### D2 · Sur cinq des sept familles de carte, le plan est validé puis silencieusement ignoré

**Ce que le journaliste vit.** Même geste, autre famille de carte (cartogramme, densité de points,
quadrillage hexagonal, repère, tracé). Il écrit son arc. **La validation dit oui.** Le rendu l'ignore
entièrement — ces cinq familles n'ont aucune couture pour un arc, elles dérivent leur parcours de la
donnée, sans condition.

**Un feu vert sur un plan que le moteur avait déjà décidé d'ignorer.** C'est exactement le mode de
défaillance que la maison interdit ailleurs : un plan de type *graphique* posé sur une carte est
**refusé par son nom** depuis longtemps (`MAP_TRACK_BEATS_REFUSAL`). Le champ `arcBeats`, lui,
passait.

**Lignes touchées : 9** — les quatre familles à récit (cartogramme, densité, hexagones, repère) en
vidéo et en scrolly, plus `route` en vidéo. Là encore, pas de voie de secours, et **même condition
de déclenchement que D1** : le défaut n'existe que si un plan est soumis.

*(Vérifié au passage : chacune de ces familles a bien son propre composant de scrolly dédié
— `Scrolly.tsx:675-704`. Aucune n'est rendue à la place d'une autre.)*

**Correction : même branche non fusionnée.** `unsupportedArcBeatsErrors` refuse le champ **par son
nom** sur ces cinq familles, et nomme les deux qui savent le porter — donc la sortie réelle. Une fois
fusionnée, ces 9 formes passent de **l'état 2 à l'état 3** : elles ne mentent plus, elles refusent.

---

### D3 · La livraison en embed plante après un déploiement réussi

**Ce que le journaliste vit.** Il choisit « embed ». Le déploiement **réussit** — la page est en
ligne, publique. Puis le script plante en écrivant l'adresse sur disque. **Aucun livrable**, et un
**déploiement public vivant que personne ne peut retrouver.**

**Ce qui se passe dans le code.** `export-code.mjs` : la branche embed écrit `EMBED_URL.txt` dans
`exportDir` **sans créer le dossier d'abord**. Les quatre autres formes de livraison font le
`mkdirSync` juste avant leur écriture (lignes 258, 272, 335, 358) ; la branche embed, non (ligne 475).
Le défaut ne se voit qu'au **premier** export vers un chemin neuf — tous les tests existants
pré-créaient le dossier, ce qui le masquait.

**Correction : `fix/embed-export-directory` (`25b94d98`), NON FUSIONNÉE.** Elle crée le dossier, et
— parce que le `mkdir` supprime la cause commune sans supprimer la classe — **attrape** toute
défaillance d'écriture restante pour la reporter **avec l'URL vivante en clair**, plutôt que de la
perdre dans une pile d'exception.

---

### D4 · Tout ce que le lecteur lit part en anglais

**Le défaut le plus large du système. Aucune correction en cours.**

**Ce que le journaliste vit.** Article en italien. Dialogue en anglais. Et sur le visuel livré :
titre, texte alternatif, unité, **et le mot « Source: »** — en anglais. Sur un artefact destiné à un
lectorat italien.

**Ce qui se passe dans le code — vérifié, et le diagnostic est net.**

*Il n'y a aucune détection de la langue de l'article, nulle part dans le code.* La seule instruction
est en prose (`commands/splash.md:13`, `skills/splash/SKILL.md:12`) et porte sur **le premier message
du journaliste**, pas sur l'article — rien de mécanique ne la fait respecter.

Un axe de langue **existe** pourtant (`lib/newsroom/language.ts`, résolu depuis `NEWSROOM-PROFILE.md`),
et sa documentation dit exactement ce qu'il devrait gouverner : *« titres, mobilier du graphique,
`Source:` — la langue du livrable »*. **Il ne va que jusqu'à l'emballage de livraison** — le README du
ZIP et l'attribut `lang` du snippet. **Il n'entre jamais dans la production.**

Le fil casse à un endroit précis et unique : **`ProductionBrief`** (`lib/core/production-brief.ts:52-68`),
le contrat que reçoit *chaque* assembleur, **n'a pas de champ `lang`**. Un assembleur ne peut donc
physiquement pas transmettre une langue qu'on ne lui a pas donnée. La rupture est **assumée en
commentaire** dans le code (`lib/loop/produce.ts:211-213`).

Tout ce qui est **en aval** est déjà câblé et attend : `spec-to-config.ts:958` transmet `spec.lang`
s'il existe, `ChartFrame.tsx:149` compose `sourceLabel(lang)`, `lib/core/locale.ts:139` contient la
table « Source : / Fonte: / Quelle: ». Le garde-fou i18n hérité (`lib/core/i18n-furniture.ts`) existe
toujours, connaît `it: "Fonte:"` — et **retourne zéro violation immédiatement** parce que `spec.lang`
est indéfini. *Un garde-fou qui affiche vert parce qu'il est affamé.*

**Deux natures de défaut, à ne pas confondre :**
- **« Source: » est un défaut de code pur** — trois caractères de câblage.
- **Titre, texte alternatif, unité** sont de la prose écrite par le dialogue : ils sont en anglais
  parce que **le dialogue** a dérivé vers l'anglais, et **rien ne détecte ni ne valide** cela.

**Lignes touchées : toutes les 130 lignes propres**, tous moteurs, tous formats, tous canaux. Et
`skills/splash/SKILL.md:1155` affirme encore le contraire mot pour mot — c'est pourquoi la
régression est invisible depuis la documentation.

*(Pour ne pas doubler le décompte, ce défaut n'est pas ajouté aux 23 : il est énoncé comme la
condition transversale de l'avertissement n°1. Une rédaction non anglophone doit lire les 130 lignes
propres comme étant en état 2.)*

---

### D5 · Un graphique Datawrapper interactif ne montre jamais son unité au lecteur

**Ce que le journaliste vit.** Il déclare l'unité (« % », « €/m² »). Elle atteint les métadonnées du
graphique. **Elle n'atteint jamais le lecteur.** Sondé sur un embed réellement publié : les seuls
éléments dont le texte contient `%` sont deux blocs `<script>` en `display:none` portant les
propriétés sérialisées.

**Lignes touchées : 9** — les neuf familles Datawrapper en interactif (barres, courbe, camembert,
nuage, empilé, groupé, haltère, sucette, jauge).

**Voie de secours : oui, et elle est importante.** Ces neuf mêmes familles sont **propres en
interactif via `chart-native`**. Ce n'est pas le graphique qui est cassé, c'est **la route
Datawrapper**. Un journaliste qui a besoin de son unité doit prendre le moteur natif.

**Ce qui protège aujourd'hui.** Depuis que la capture mesure l'embed **vivant**, c'est un constat
**bloquant** : la forme ne peut être livrée qu'après une dérogation écrite explicite. Les preuves de
bout en bout l'affirment comme identifiant littéral (`lib/loop/dw-chart-e2e.test.ts:349`) — donc il
se déclenche à **chaque** exécution. **Pas de correction :** elle change ce que tout graphique
Datawrapper commande, hébergé ou statique (hors périmètre, consigné dans `.sdd/hosted-chain-report.md` §5).

---

### D6 · Une carte Datawrapper interactive déborde de la boîte de l'article

**Ce que le journaliste vit.** La carte se publie et **dépasse** — elle rend ~628 px de haut contre
les 560 px auxquels le canal article-web publie ; le mobilier passe sous la ligne de flottaison.
**À chaque exécution.**

**Lignes touchées : 1** — le choroplèthe Datawrapper en interactif. Même protection que D5 (constat
bloquant, dérogation écrite obligatoire, `lib/loop/map-dw-e2e.test.ts:319-320`). **Voie de secours :**
le choroplèthe interactif est propre via `map-native`. **Pas de correction :** il faut trancher une
politique de hauteur pour les embeds hébergés responsives — une vraie décision de design, pas un
correctif.

---

# 3. Trois défauts qui ne se comptent pas en lignes

### D7 · La couleur d'accent de la maison casse le moteur graphique par défaut

**Ce que le journaliste vit.** La rédaction déclare sa couleur d'accent — via le parcours
d'installation lui-même, qui la propose (`lib/newsroom/charter.ts:947`). **Dès lors, aucun graphique
Datawrapper ne se produit plus.** Échec net, code de sortie 1.

**Ce qui se passe.** `mergeProfileDefaults` (`skills/splash/src/brand-profile.ts:497-498`) injecte
`accent` sur **tout** spec de la famille « chart » — et cette famille inclut `dw-chart`
(`CHART_COLOUR_PRODUCERS`, ligne 400). Or le validateur de `dw-chart` est **strict** : il refuse tout
champ inconnu (`skills/dw-chart/src/chart-spec.ts:421-432`), et `accent` n'est dans aucune de ses deux
listes. *Vérifié en exécutant le validateur :*
`unknown field "accent" (valid fields: type, title, intro, data, baseColor, …)`.
L'échec survient **au portail de validation, avant tout envoi** (`produce-all.ts:203-211`).

**L'auteur avait pourtant exclu `themeBg` de `dw-chart` explicitement, quelques lignes plus bas — et
n'a pas appliqué la même exclusion à `accent`.** Aucun test ne croise `accent` et `dw-chart` : c'est
pourquoi ça passe au vert.

**Conséquence, dite franchement : pour une rédaction qui déclare un accent maison, les 18 lignes
Datawrapper (9 fiches × image fixe/interactif) passent en état 3.** Le champ **qui marche** est
`baseColor` — lui est bien dans la liste autorisée. `map-native` / `map-dw` / `image-native` ne sont
pas touchés, et `chart-native` consomme réellement `accent`.

**Nuance mesurée, contre le cadrage initial :** ce défaut échoue **fort**. Le journaliste n'expédie
pas un artefact faux — il n'obtient rien. C'est donc un état 3 conditionnel, pas un état 2.

---

### D8 · Produire un second format efface la validation du premier

**Ce que le journaliste vit.** Il valide et livre un scrolly. Il demande ensuite une vidéo du même
sujet. Le nouveau rapport affiche **`renderApproved: false` sur le scrolly** — la validation qu'il
venait de donner a disparu.

**Ce qui se passe.** Sur la chaîne `skills/splash` — **celle qu'un journaliste emprunte aujourd'hui**
— la validation vit dans un rapport global reconstruit **intégralement** à chaque production
(`produce-all.ts:99-104`, plus une remise à zéro inconditionnelle ligne 227-232), et le fichier
précédent est écrasé par redirection (`SKILL.md:760-762`). Il n'existe **aucune branche qui préserve
une validation antérieure**. `gate.ts:4-10` le dit dans ses propres mots.

**C'est un garde-fou volontaire** (une re-production **re-rend** réellement le visuel, donc l'ancien
visa couvrait d'autres octets) — **mais il est grossier** : la remise à zéro est inconditionnelle et
aveugle aux octets, donc elle se déclenche même quand rien du scrolly n'a bougé et qu'on a seulement
ajouté un format sans rapport. Le remède que le code désigne lui-même (lier les octets expédiés à
`approvedHash`) n'est pas implémenté.

**Réfuté sur l'autre chaîne.** Dans `lib/loop`, la validation est **par élément** et **liée au
contenu** (`manifest.ts:304-320`, `504-547`) : produire un second format laisse la validation du
premier intacte. Le défaut est **confiné à la chaîne `skills/splash`**.

---

### D9 · La cible qui n'apparaît dans aucun compte : la géographie

**Deux fonds de carte sont livrés. Deux.** Le monde par pays (codes ISO à 3 lettres) et les États
américains (codes postaux à 2 lettres) — `skills/map-native/src/basemaps.ts`, deux entrées ;
`lib/loop/assemble/map-dw.ts`, deux entrées.

Cela ne retire **aucune ligne** des tableaux — cela rend **les 29 lignes de carte propres
conditionnelles** à ce que la donnée se raccroche à l'un des deux (27 `map-native` : 7 familles ×
image fixe/interactif/vidéo + 6 scrollys ; 2 `map-dw` : le choroplèthe × image fixe/interactif).
**Un choroplèthe cantonal suisse — le sujet du pilote Annemasse — n'existe dans aucun compte de ce
document, et cette limite est la raison.**

Une limite dans la limite : `dot-density` est **borné au monde** par un refus explicite
(`lib/loop/assemble/map-native.ts:200`) parce que son composant importe `world.geojson` en dur — le
seul endroit du code qui préfère un refus bruyant à un rendu plausible et faux.

C'est l'écart le plus large entre « le tableau dit oui » et « la rédaction obtient une image », et il
est **invisible dans chaque chiffre ci-dessus**, parce que la géographie est un fait de la donnée, pas
une coordonnée de la grille.

*(Une recherche datée du même jour — `docs/splash/geography-anywhere-research-2026-07-28.md` — pose la
forme d'une solution. Elle le dit elle-même : **« Untracked, not committed. No product code was
written. »** Rien n'a changé dans le produit.)*

---

# 4. État 3 — ce qui ne sort pas, et pourquoi

63 lignes — **4 offertes mais marquées mortes, 59 que rien n'offre.**
**La raison compte autant que le chiffre.**

| combien | quoi | **raison** | rattrapable ? |
|---|---|---|---|
| **33** | 11 familles de graphique que la KB décrit très bien : sankey, radar, chord, sunburst, calendrier, gantt, marimekko, streamgraph, coordonnées parallèles, courbe de Lorenz, chandeliers | **le moteur n'a pas ce type.** Déclaré et marqué « différé », avec **une raison écrite par type** (« famille B : demande des nœuds+liens », « rare dans une petite rédaction »…) | Oui — ce sont des graphiques D3 ordinaires. Écarté par décision de périmètre, parce que les CSV qu'un article produit y correspondent rarement. **La KB est en avance sur les moteurs.** |
| **20** | 10 types Datawrapper : tableau de données, aire simple, donuts, donut électoral, petits multiples (colonnes / courbes / camemberts / donuts), barres scindées, graphique en flèches | **la KB ne modélise aucune fiche.** Datawrapper les rend tous ; c'est le seul manque purement KB, et le manifeste du moteur l'écrit lui-même, type par type | Oui — il manque une fiche |
| **6** | Les **variantes verticales** de trois familles offertes à l'horizontale : colonnes, colonnes groupées, colonnes empilées | **la boucle ne sait pas l'assembler.** La fiche nomme deux clés ; `renderableSheets()` prend `keys.find(...)` — **la première gagne, la sœur n'est jamais offerte.** L'orientation n'a aucune représentation dans l'offre | Oui — un choix d'orientation à exposer |
| **1** | Le **scrolly de nuage de points** | **la boucle refuse de l'assembler, et le dit** : *« un scrolly de nuage se légenderait tout seul […] les légendes seraient celles de la machine, sous votre signature »* | Refus assumé, correct |
| **1** | Le **scrolly de photographies** (`image-scrolly`) — **le seul format du moteur `image-native`, donc le moteur entier** | **l'entrée n'est pas visible depuis la couche qui décide.** `eligible()` ne voit pas `run.input.images`, donc offrir la forme proprement échouerait une exécution sans photos. Le code écrit lui-même ce que cela coûte : la marque est **inconditionnelle**, et avec l'offre plafonnée à trois lignes, **« marqué » veut dire « éteint », pas « signalé »** | Oui — le jour où `eligible()` reçoit les entrées déclarées |
| — | **Une vidéo qui raconte, pour un graphique** | **la capacité n'existe pas du tout.** `chart-native` enregistre **123 compositions vidéo — zéro narrative** : exactement 41 types × 3 cadrages (`Reveal` paysage / `Square` carré / `Portrait` 9:16). Pour des barres : `BarReveal`, `BarSquare`, `BarPortrait`, et rien d'autre | **Non — rien n'est en chantier.** Un journaliste qui construit un argument en cinq temps dans un scrolly et demande « le même en vidéo » **perd l'argument**, et ne l'apprend qu'après. *(Les cartes, elles, ont bien des compositions `Story` : 6 des 7 familles.)* |
| — | **Un arc confirmé sur cartogramme / densité / hexagones / repère / tracé** | **la capacité n'existe pas** — ces familles n'ont aucune couture pour un plan. Deux des sept l'ont (choroplèthe, symboles) | Aujourd'hui c'est **l'état 2** (D2 : accepté puis jeté). La branche non fusionnée en fait un **refus nommé** — donc un vrai état 3 |
| — | **Un scrolly de tracé (`route`)** | **la boucle ne sait pas l'assembler** — la fiche ne déclare pas ce format et le dispatch n'a pas de branche. Vérifié : `isLoopBuildable("scrolly","route","scrolly")` → **false** (l'ancien sur-comptage de 37 lignes est **fermé**) | Correct |
| **2** | **Un repère (locator) Datawrapper**, en image fixe et en interactif | **la boucle ne sait pas l'assembler** — elle ne compose que le choroplèthe de ce moteur. Le refus le dit et **donne la sortie** : *« construisez le repère avec map-native, qui place les marqueurs depuis les colonnes lat/lon »* | Pas une perte nette — `map-native` le fait |
| — | **Toute carte hors monde-par-pays et États-US** | **la géographie n'est pas livrée** — voir D9 | Chantier ouvert, non commencé |

**Le compte : 33 + 20 + 6 = 59 hors offre, plus 1 + 1 + 2 = 4 offertes mais mortes = 63.**

**Note d'unité, pour l'honnêteté du total.** Les 33 se comptent en (fiche × format) — la fiche
existe, le moteur manque. Les 20 et les 6 se comptent en (type de moteur × format) — le moteur
existe, la fiche ou l'aiguillage manque. Ce n'est pas rigoureusement la même unité que les 134
lignes offertes (fiche × moteur × format), et je ne prétends pas le contraire : additionner les
manques suppose qu'une fiche non rendue par un moteur aurait donné une ligne, ce qui est vrai ici
parce qu'aucune de ces 11 fiches n'a de second moteur.

---

# 5. Ce que je n'ai pas pu mesurer

**Un manque nommé vaut mieux qu'un chiffre deviné.** Voici les miens.

1. **Je n'ai rien rendu.** Aucun `produce`, aucun appel Datawrapper, aucun navigateur, aucune suite
   de tests (un balayage QA de 163 cas tournait sur 4 voies). Tout ci-dessus est **une mesure de
   capacité statique** — registre, table d'assemblage, jointure KB, `eligible()` — plus la lecture du
   code, plus les constats que le balayage m'a transmis. « Ça marche » signifie *rien de connu ne le
   rend faux*, jamais *les pixels sont bons*.

2. **Il existe deux chaînes de production, et mes comptes mesurent celle qui n'est pas encore la
   voie du journaliste.** Les 193 lignes viennent de `lib/brain` + `lib/loop` — la coquille
   d'orchestration V2, celle que la matrice mesurait aussi. **Or `/splash` conduit aujourd'hui vers
   `skills/splash/SKILL.md`**, qui appelle les compétences `suggest-article` / `suggest-chart` (des
   compétences **en prose, jouées par le modèle**) puis `produce-all.mjs`. Les deux chaînes partagent
   **les mêmes moteurs** et **la même base de connaissance** (`knowledge/references/**/types/*.md`,
   46 fiches) — mais l'étape de proposition diffère : mécanique d'un côté, jugement du modèle de
   l'autre. **Mes chiffres décrivent donc le plafond mécanique de l'offre, pas une garantie sur ce
   qu'une session réelle propose.** Je n'ai pas mesuré ce que `suggest-chart` offre en séance. C'est
   le plus gros angle mort de ce document, et il expliquerait pourquoi D7 et D8 (chaîne
   `skills/splash`) ne se reproduisent pas dans `lib/loop`.

3. **Je n'ai pas vérifié D5 et D6 en direct** (pas de réseau). Je les tiens des preuves de bout en
   bout de la branche, qui les affirment comme identifiants littéraux, et de `.sdd/hosted-chain-report.md`.

4. **Les défauts D1, D2, D3, D8 me viennent du balayage** — je les ai **confirmés dans le code** et,
   pour D1/D2/D3, **dans le diff de leur branche de correction**, mais je n'ai pas rejoué les cas.

5. **Que les cinq familles de carte sans couture d'arc n'aient effectivement aucune couture, je le
   déduis** du périmètre de la branche de correction (elle ne touche que choroplèthe et symboles) et
   du commentaire de `map-arc.ts`. Je n'ai pas lu les six composants `*Story` un par un.

6. **Le canal papier n'a que 34 formes offrables** et je n'ai pas parcouru ce chemin. Datawrapper en
   est exclu par nature (pas d'export à densité d'impression).

7. **Les 107 de l'état 1 sont une borne haute.** Le balayage tournait encore. Une ligne n'est en état
   1 que parce que **rien n'a encore prouvé** qu'elle est fausse — et le balayage du 28 juillet a fait
   passer 23 lignes de l'état 1 à l'état 2 en une journée. Je ne sais pas combien des 107 restantes
   tomberont demain, et personne ne le sait aujourd'hui.

8. **Le champ `sourceHint`** et plusieurs garde-fous « prêts mais dormants » signalés au CLAUDE.md
   n'ont pas été revérifiés ici.

---

# Annexe — les mesures, et par quoi elles ont été produites

Toute valeur ci-dessous a été obtenue **en appelant le code**, jamais en lisant une liste :
`skills/splash/src/register-producers.ts` → `lib/core/registry.ts` (`allProducers`,
`producerForFormat`) · `lib/loop/buildable.ts` (`isLoopBuildable`, `unbuildableEngineReason`) ·
`lib/brain/typology.ts` (`loadTypology`, `renderableSheets`) · `lib/brain/eligibility.ts`
(`eligible`) · `lib/brain/beats.ts` (`canDraftBeats`) · `skills/scrolly/src/scrolly-types.ts`.

## A1 — Le catalogue des moteurs

| moteur | formats déclarés | types | dont `deferred` |
|---|---|---|---|
| chart-native | image fixe, interactif, vidéo | 41 | 14 |
| map-native | image fixe, interactif, vidéo | 7 | 0 |
| dw-chart | image fixe, interactif | 22 | 10 |
| map-dw | image fixe, interactif | 3 | 1 |
| image-native | scrolly | 1 | 0 |
| scrolly | scrolly | 0 (héberge la piste d'un autre) | — |

```
195  triplets (moteur, type, format) déclarés
-64  marqués `deferred` par le moteur lui-même
 -2  refusés par la table d'assemblage (map-dw locator × image fixe/interactif)
----
129  triplets constructibles, déclarés par un moteur
+10  superposition scrolly (11 types hébergés par le dispatch, dont `scatter` refusé par son nom)
----
139  triplets constructibles
```

**Deux sur-comptages de la matrice sont fermés sur `main`** — vérifié par sonde :
`isLoopBuildable("scrolly","route","scrolly")` → **false** ;
`isLoopBuildable("scrolly","d3-scatter-plot","scrolly")` → **false** ;
`isLoopBuildable("chart-native","sankey","static")` → **false**.
(La matrice mesurait respectivement `true` — un sur-comptage de 37 lignes, et l'admission des 14
types de famille B.)

## A2 — La base de connaissance

- **46 fiches** sur disque (`knowledge/references/{chart,map,image}/types/*.md`).
- `renderableSheets()` → **46 paires (fiche, moteur)** sur **35 identifiants de fiche distincts**.
- **11 fiches n'entrent jamais dans l'ensemble candidat** — toutes pour la même raison :
  `chart-native` déclare le type et le marque `deferred`.

## A3 — Ce qu'un journaliste peut se voir proposer

Faits synthétisés **depuis les limites déclarées par chaque fiche**, pour qu'aucune ligne ne soit
perdue pour une raison de données.

| canal | lignes offrables | non marquées | fiches distinctes |
|---|---|---|---|
| social vertical | 79 | 78 | 34 |
| fil social | 79 | 78 | 34 |
| **article web** | **134** | **130** | **35** |
| papier | 34 | 34 | 34 |

Article web, par moteur × format (propres) : chart-native 27/27/27 (fixe/interactif/vidéo) + 2 scrolly ·
map-native 7/7/7 + 6 scrolly · dw-chart 9/9 · map-dw 1/1.

**Lignes marquées sur article web — les quatre, mot pour mot :**
`scatter/chart-native/scrolly` · `locator/map-dw/static` · `locator/map-dw/interactive` ·
`image-scrolly/image-native/scrolly`.

**Formes distinctes (fiche × format), tous canaux confondus : 112**, dont **110 non marquées** —
image fixe 34 · interactif 34 · vidéo 34 · scrolly 10 (dont 8 propres).

**Écart avec la matrice du matin, et pourquoi.** La matrice mesurait 139 lignes offrables sur
article web (122 propres) ; je mesure 134 (130 propres). Les deux sont cohérentes : les **5 lignes
scrolly à clé Datawrapper** ont disparu de l'offre (`producerForFormat` ne redirige plus un moteur
Datawrapper vers l'hôte scrolly), et les **8 lignes scrolly restantes sont devenues propres** (la
marque « branche article » a été retirée). 139 − 5 = 134 ; 122 + 8 = 130. ✅
La matrice annonçait « 6 des 8 lignes scrolly propres » ; la mesure sur `main` donne
**8 propres sur 10**.

## A4 — Les compositions vidéo

- `chart-native` : **123 compositions, 0 narrative.** Décomposition exacte :
  41 `*Reveal` + 41 `*Square` + 41 `*Portrait` — des **cadrages**, pas des modes de récit.
  Aucune ne contient `Story`, `Scrolly`, `Narrative`, `Beat` ni `Chapter`.
- `map-native` : `*Reveal` **et** `*Story` (paysage/carré/portrait) pour cartogramme, choroplèthe,
  densité, hexagones, repère, symboles — **6 des 7**. `route` n'a que `RouteReveal`.
- Sélection au moment de produire : `skills/map-native/scripts/produce.mjs:227-239` route la vidéo
  de carte vers `*Story` (et `route` vers `RouteReveal`) ; `skills/chart-native/scripts/produce.mjs:310-312`
  route la vidéo de graphique vers `${X}Reveal|Square|Portrait`.

## A5 — Les branches de correction en attente

| branche | commit | ferme |
|---|---|---|
| `fix/scrolly-map-arc-beats` | `6475a930` | D1 + D2 (17 fichiers ; 3 suites de tests neuves + une preuve au rendu) |
| `fix/embed-export-directory` | `25b94d98` | D3 (`mkdir` + capture de l'échec avec l'URL vivante) |

Aucune n'est fusionnée. Les deux sont à un commit de `main`.

## A6 — Ce qui a changé depuis la matrice, vérifié point par point

| affirmation à vérifier | verdict |
|---|---|
| Le scrolly n'est plus « la branche article entière » ; combien de lignes propres ? | **Confirmé — 8 propres sur 10** (la matrice disait 6 sur 8). Les 2 marquées le méritent : `scatter` (légendes machine) et `image-scrolly` (photos non déclarées) |
| La boucle enregistre une livraison hébergée, et capture/aperçu/validation/livraison agissent dessus | **Confirmé** — matrice §L3 « fermé », plus `.sdd/hosted-chain-report.md`. Mais « fermé » veut dire *la chaîne tourne*, pas *chaque ligne est propre* : elle a rendu visibles D5 et D6 |
| Les 9 types Datawrapper pilotés par lignes sont revenus dans l'offre | **Confirmé — 9 fiches × 2 formats = 18 lignes propres** sur article web. `skills/dw-chart` est d'ailleurs **inchangé** depuis `d7044400` |
| `image-native` garde une marque, et la raison est que `eligible()` ne voit pas `run.input.images` | **Confirmé**, et le code va plus loin que l'affirmation : la marque étant inconditionnelle et l'offre plafonnée à 3, la forme est **inatteignable**, pas seulement signalée |
