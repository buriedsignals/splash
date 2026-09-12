# Les cartes passent par MapTiler de bout en bout

**Statut :** conception, à approuver. Non planifiée, non implémentée.
**Décision du propriétaire enregistrée ici :** tout ce qui est *dans* la carte devient une couche
MapLibre ; les légendes et les textes d'explication, qui ne sont pas dans la carte, restent dehors
(§2). Le placement des mots reste au beat (§5).

---

## 1. Le problème, mesuré

Les six cartes statiques de la base posent MapTiler comme **fond cuit** et dessinent tout le reste en
SVG. Une carte ainsi produite n'est pas une carte : c'est une image. Elle ne se rejoue nulle part,
ne se parcourt pas, et ne peut rien porter d'autre que ce que le composant a bien voulu peindre.

Un spike a converti les six types le 12 septembre 2026 — choroplèthe, semis de points, symbole
proportionnel, flux, locator, contour — pour savoir si le dispositif inverse tenait. **Il tient sur
les six.** Chaque beat n'a plus qu'une poignée de couches qui lui sont propres ; géographie, côtes,
mers, lacs viennent de MapTiler.

Le spike a aussi sorti une trentaine de défauts. Les six qui suivent structurent cette spec, parce
qu'aucun n'était devinable sans regarder une image.

### 1.1 La taille de cuisson est une sortie du layout

Le bake d'origine le disait dans son en-tête — *« this bake is only ever called at the exact size
the still draws at »* — et le dispositif actuel le violait déjà sans conséquence visible, parce
qu'un fond flou reste un fond. Dès que les marques passent dans l'image, ça devient faux :

- la plaque cuite à 1 000 px puis dessinée dans 574 rend **toute longueur absolue 1,74 fois trop
  fine** — les traits, les rayons planchers, les épaisseurs de contour. Les rayons exprimés en
  *fraction* de la largeur, eux, restaient exacts, ce qui rendait le défaut invisible sur les gros
  cercles et fatal sur les petits ;
- la carte de flux ne dessine pas la plaque entière mais cadre sur son sujet : le facteur y vaut
  **0,698 à 0,781 selon la direction**. Une constante aurait été différemment fausse sur chaque
  palette.

### 1.2 Le placement des mots ne se délègue pas

Confié au moteur de MapLibre, il perd cinq gardes que le beat applique et que rien d'autre ne
remplace : rester dans le cadre, ne toucher aucune autre étiquette, **ne pas tomber sur une surface
teintée**, nommer dans le pays quand le mot y tient, et trier les angles vers l'extérieur du cadre.
Sans la cinquième, les ex æquo partent tous du même côté : le composant l'avait corrigée pour
`NORVÈGE`, parti en mer de Barents ; le spike l'a reproduite avec `ALBANIE`, parti en Ukraine.

### 1.3 Deux jeux de données ne dessinent pas la même côte

Repeindre une terre Natural Earth par-dessus la géographie OpenMapTiles laisse un halo décalé d'un
cheveu autour de l'Islande et de la Norvège. **Un fond de carte redoublé par un autre fond de carte.**
En retirant le doublon, un second défaut est apparu — la plaque était placée sur la boîte au lieu de
l'échelle des marques, donc comprimée d'un tiers — qui était là depuis toujours et que le doublon
masquait.

### 1.4 MapLibre échoue en silence

Quatre fois, sur six types, sans qu'une seule erreur soit levée :

| ce qui était faux | ce qui se passait |
| --- | --- |
| deux couches portant le même `id` | la seconde refusée — six villes restées anonymes |
| tranche de glyphes non servie | le caractère disparaît du mot — « Mer d'Azov » → « Mer dAzov » |
| `text-offset` en tableau d'expressions | la couche ne dessine **rien** |
| police absente du serveur | substituée, avec un `200` |

Ce dernier point est mesuré : **MapTiler répond `200` à n'importe quel nom de police et sert du Noto
Sans.** `Futura Medium`, `Avenir Next`, `Georgia`, `Superclarendon` et même `Zzz Fictive Regular`
renvoient le même fichier (83 352 o, sha `1a09e06d…`). Seules 18 familles sont réellement servies.

### 1.5 Le plan ne doit inventer aucune valeur

Six fois, une valeur du beat a été remplacée par une valeur de moi, et six fois elle était une
**mesure**, pas un chiffre :

- le seuil de 200 MW du symbole proportionnel est choisi par essais jusqu'à ce que la pire cellule
  de la carte passe sous 40 % d'encre — le recopier en dur aurait fait mentir le standfirst ;
- le rayon du semis vaut `max(1.1, mapW/900)` « pour que la région la plus dense se lise comme une
  texture plutôt que comme de l'encre » — doubler ce rayon referme le champ ;
- l'encre des marques est l'accent **pur**, pas un accent délavé « mesuré contre la terre » ;
- l'eau vient de la convention `water`, pas d'un mélange d'accent — sur un plateau dont les marques
  sont dans l'accent, une mer qui en reprend une part concurrence les marques ;
- les mers sont au registre `axis` en italique, **pas** au registre `annot` : le composant portait la
  correction en commentaire, et le spike a refait sa première version à l'identique ;
- un registre voyage **entier** — famille, corps, graisse, style, casse, interlettrage — ou il ne
  voyage pas : n'en retenir que la famille perd l'italique de `creme` et les capitales des autres.

### 1.6 Un corps n'est pas une taille perçue

Mesuré : à leur corps déclaré, la capitale de Superclarendon fait **9,66 px** quand celle de Futura
en fait **7,54** et celle d'Avenir Next **7,08**. Un tiers d'écart pour la même ligne. Le design base
fait voyager des **corps** entre directions là où il devrait faire voyager des **hauteurs perçues**.

> **Cette question dépasse les cartes.** Elle est posée ici parce que le spike l'a rendue visible,
> mais elle concerne la base entière. Elle est traitée en §8 comme une décision à prendre, pas
> comme un acquis de cette spec.

---

## 2. Ce qui entre dans la carte, ce qui reste dehors

| | où | qui décide | qui dessine |
| --- | --- | --- | --- |
| géographie, côtes, mers, lacs | MapTiler | MapTiler | MapLibre |
| marques du beat | plan | le beat | MapLibre |
| mots **dans** la carte | plan | le beat (§5) | MapLibre |
| titre, standfirst, clé, source, note de lecture | hors carte | le beat | React / SVG |

Le hors-carte garde l'échelle de familles complète. Il n'est pas concerné par §6.

---

## 3. L'objet central : le plan de carte

Un beat produit **un plan**. Quatre rendus le consomment.

```
beat  →  mapPlan
           ├── style    : MapTiler + transformations (couches éteintes, teintes, glyphes)
           ├── camera   : bounds, zoom min/max, TAILLE DE DESSIN (§4)
           └── layers[] : sources GeoJSON + couches fill · line · circle · symbol
                          peinture dérivée de la direction
                          stratégie de rayon : camera | ground | fixed

mapPlan  →  web     : monté en carte vivante
         →  still   : monté puis capturé
         →  vidéo   : monté, capturé image par image
         →  scrolly : monté, caméra animée
```

**La moitié existe déjà.** `skills/map-web/assets/live-map.mjs` lit exactement ce plan, avec ses
trois stratégies de rayon : un cercle qui encode une valeur reste figé en pixels écran, un point qui
vaut une surface au sol double par niveau de zoom, une épingle ne bouge pas. Le travail n'est pas
d'inventer le contrat mais de le faire **descendre du web vers les trois autres formats** et d'y
faire entrer ce qui est resté en SVG.

**Ce que le monteur actuel ne sait pas encore faire :** il ne gère que `paint`, jamais `layout` —
donc aucune couche `symbol`, donc aucun mot. Il éteint d'ailleurs toutes les couches de texte de
MapTiler. Les cartes web vivantes livrées aujourd'hui n'affichent **aucun nom**.

---

## 4. La taille de dessin est publiée par le layout

**Règle :** la carte est cuite à la taille exacte à laquelle elle sera posée. Jamais à une taille
choisie, ensuite réduite.

Le composant expose sa géométrie de carte — position, largeur, hauteur, facteur d'échelle — et le
bake la lit. Deux passes : le layout se résout une fois sans carte, publie sa géométrie, puis la
carte est cuite et le rendu final a lieu.

Conséquence : **toutes les longueurs du beat passent telles quelles.** Aucun facteur de compensation
nulle part, donc aucun risque de le corriger deux fois — ce que le spike a fait sur le flux, où le
nœud est sorti quatre fois trop gros.

Corollaire, vérifié par test : la plaque se place aux **mêmes** coordonnées que les marques. Trois
composants sur six la plaçaient sur la boîte et non sur l'échelle des marques.

---

## 5. Le placement reste au beat, et produit des coordonnées

Le moteur de placement du composant ne se porte pas dans MapLibre et ne se remplace pas par le sien.
Il reste dans le beat, mesure les mots **à leur police réelle**, applique ses cinq gardes (§1.2), et
écrit des **coordonnées** dans le plan. MapLibre dessine, il ne place pas.

Les couches de mots portent donc `text-allow-overlap: true` et `text-ignore-placement: true` : le
placement a déjà été arbitré.

**Deux exceptions, déclarées :**

- **les toponymes ordinaires** — un fond de carte nomme ce qu'il sait, et il le fait bien. Une couche
  native filtrée sur une **liste du beat** (`["in", "iso_a2", …]`) garde ce que MapTiler fait bien —
  placer, éviter les collisions, se replacer au zoom — sans lui laisser choisir *qui* est nommé ;
- **les étiquettes forcées et leur leader** — un pays trop petit pour porter son nom reçoit un mot
  placé par le beat et une ligne qui l'y rattache, avec un `maxzoom` au-delà duquel le toponyme natif
  prend le relais. Une passation, ce sont **deux couches qui se touchent au même seuil**, jamais une
  seule qui s'éteint.

---

## 6. Les mots, les glyphes, le liseré

**Les familles.** MapTiler Cloud sert 18 familles et substitue Noto Sans pour toutes les autres, sans
le dire (§1.4). La liste réelle : Metropolis, Open Sans, Roboto, Inter, Lato, Montserrat, Nunito,
Rubik, Source Sans Pro, PT Sans, Ubuntu, Merriweather, PT Serif, Libre Baskerville, Noto Serif,
Roboto Slab, Roboto Mono, Source Code Pro.

**Servir nos propres glyphes est possible et démontré** : le spike a cuit Avenir Next, Futura et
Superclarendon en SDF depuis Chrome et les a servis via un `glyphs` réécrit — c'est **une ligne du
style**, donc réversible. Mais l'encodeur du spike est quatre-vingts lignes de protobuf écrites à la
main, et sa ligne de base est fausse d'une hauteur de ligne, compensée à la main. **L'implémentation
doit passer par `font-maker` de MapLibre**, pas par cet encodeur.

**La tranche de caractères doit couvrir ce que le beat écrit.** L'apostrophe typographique (U+2019)
est hors du latin de base ; une tranche non servie fait disparaître le caractère sans erreur.

**Le liseré.** Un mot correctement placé peut tomber sur une teinte proche de la sienne — le
placement garantit qu'il n'est pas sur une classe, pas que le fond est loin. Le liseré sépare
toujours, et sa couleur est celle, du fond ou de l'encre, qui contraste le plus **avec le mot**,
jamais le fond de la page. Il suit l'encre expression pour expression : un liseré unique serait juste
pour la majorité et faux pour ceux qui ont changé d'encre — or ce sont ceux qui en ont besoin.

**Le même geste vaut pour les marques.** Un ⊙ de la couleur du champ qui l'entoure ne se détache pas,
quelle que soit son épaisseur : ce qui le détache est une couronne prise sur le fond. Un vide, pas une
couleur de plus — `the-subject-is-ringed-not-recoloured` tient au vide autant qu'au trait.

---

## 7. Ce que « n'importe quel sujet » impose

C'est l'exigence qui sépare six spikes d'une pièce d'outil. Trois règles, chacune vérifiable.

**7.1 Rien de codé en dur qui vienne du sujet.** Bornes de caméra, listes de noms, seuils, sièges,
classes : tout est dérivé des données du beat. Le spike a enfreint cette règle deux fois — le sujet du
flux (`"DEU"`) et l'ancrage de l'étiquette du locator — et les deux sont des décisions du beat, pas
du plan.

**7.2 Ce qui est mesuré reste mesuré.** Le seuil de densité, le rayon de texture, la teinte d'eau, le
corps qui atteint une hauteur de capitale, le choix des familles : le plan **appelle** la mesure, il ne
transporte pas son résultat d'hier. Un sujet nouveau produit d'autres nombres, et c'est le but.

**7.3 Un beat qui ne peut pas satisfaire une règle REFUSE.** C'est déjà la doctrine du tronc — *« un
stack silencieux n'a pas choisi »*. Elle s'étend ici : aucune dose d'eau qui sépare la mer de la
terre, aucun seuil qui laisse un champ lisible, aucune place pour le nom du sujet, une famille qui ne
résout pas → le rendu s'arrête et nomme ce qui manque. Il ne livre pas une carte que personne n'a
choisie.

---

## 8. Les gardes à écrire

MapLibre ne se plaint de rien (§1.4). Le tronc doit donc mesurer lui-même. Chacune de ces gardes
correspond à un défaut réellement rencontré, et doit rougir si on la casse.

| garde | ce qu'elle attrape |
| --- | --- |
| identifiants de couche uniques dans un plan | six villes anonymes |
| toute famille demandée a des glyphes qui ne sont pas le repli | Futura rendu en Noto Sans |
| toute tranche de caractères écrite par le beat est servie | l'apostrophe disparue |
| la plaque est placée aux coordonnées des marques | la carte comprimée d'un tiers |
| la carte est cuite à la taille publiée par le layout | traits 1,74 fois trop fins |
| aucune couche du beat ne redouble la géographie du fond | la côte double |
| eau et terre s'écartent d'un contraste minimal | 1,014 sur `nocturne` — indiscernables |
| toute expression de style est valide au sens de la spec | `text-offset` muet |

**Question ouverte, à trancher hors de cette spec :** §1.6 — le design base fait-il voyager des corps
ou des hauteurs perçues ? La réponse change le tronc, pas seulement les cartes.

---

## 9. Le déterminisme

Aujourd'hui la plaque est gelée à côté du beat, pour la même raison que ses données. Demain on gèle
**une couche plus tard** : le PNG commité contient le fond *et* les marques. Il ne dépend de rien, ne
peut pas blanchir, et couvre davantage qu'avant.

Ce mode de panne n'est pas théorique : **MapTiler invalide toutes les clés d'un compte à 100 % de sa
limite de dépense.** Sans gel, chaque carte publiée devient blanche le même jour.

**Conséquence pour le web :** la page sert aujourd'hui un rendu React sans JS sous la carte vivante.
Le composant perdant sa zone carte, ce repli devient **l'image du statique**, qu'on produit déjà —
zéro code en double, mais un repli raster au lieu d'un vectoriel. L'accessibilité ne s'appuie pas
dessus : elle tient au `alt` et à la table de valeurs repliée que ce format embarque.

**Conséquence pour la vidéo :** Remotion attend `map.on("idle")` à chaque image. Deux régimes —
caméra fixe (la carte est montée une fois, seules les données rejouent : coût quasi nul) et caméra
mobile (un `idle` par image, ~2 min de plus sur 300 images). À mesurer avant de s'y engager.

---

## 10. Découpage

Trop gros pour un seul plan. Trois sous-projets, chacun livrant quelque chose d'utilisable seul.

**SP1 — le contrat et un type pilote.** Le plan, la publication de géométrie par le layout, le
monteur étendu à `layout`, les glyphes par `font-maker`, les gardes de §8. Le choroplèthe sur les
quatre formats. Fin : un type complet, reproductible, avec ses gardes rouges quand on les casse.

**SP2 — les cinq autres types.** Semis, symbole, flux, locator, contour. Chacun apporte une pièce que
le pilote n'a pas : volume, rayon porteur de valeur, largeur porteuse de quantité, trois classes de
lieu, deux caméras.

**SP3 — ce qui sort du composant.** Les six composants perdent leur zone carte (3 862 lignes
aujourd'hui, dont la majorité est de la carte) et gardent le hors-carte. La carte web vivante gagne
ses mots.

---

## 11. Ce que cette spec ne fait pas

- elle ne tranche pas §1.6 — corps ou hauteur perçue — qui appartient au design base ;
- elle ne traite pas le cartogramme ni la grille hexagonale : ces deux formes **jettent la position**,
  et un fond de carte y affirmerait une correspondance que la forme nie. Leur refus est déjà
  enregistré dans leurs BRIEF ;
- elle ne décide pas de l'hébergement des glyphes pour une carte rejouée par un tiers. Pour le
  statique la question ne se pose pas ; pour le web, les fichiers voyagent avec la page, et six faces
  pèsent 590 ko — il faudra ne cuire que les caractères réellement employés.
