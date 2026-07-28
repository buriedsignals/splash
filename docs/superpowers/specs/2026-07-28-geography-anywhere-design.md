# Spec — Geography anywhere : dessiner n'importe quelle zone de la terre

> **Statut :** design, 2026-07-28. Prêt pour → writing-plans. Aucun code produit écrit ici.
> **Origine :** la demande du propriétaire — « il faut pouvoir faire des maps de n'importe où sur
> terre — le monde entier, la Suisse, la Thaïlande, l'Argentine — **et pas que les cantons ou
> provinces : être capable de couvrir toutes zones dont on pourrait avoir besoin, à tous les
> niveaux** ».
> **Recherche amont :** `docs/splash/geography-anywhere-research-2026-07-28.md` (1 487 lignes,
> licences lues sur leur page, tailles mesurées sur cette machine). **Toute mesure citée ici
> renvoie à une section de ce document (§N) ou à un fichier:ligne lu dans ce dépôt.**
> **Deux décisions y sont déjà prises par le propriétaire** (§ « Décisions de Rémy ») : elles ne
> sont pas rouvertes ici, elles sont câblées.
> **Langue :** prose FR, identifiants/types/messages en anglais (standard non-négociable).

---

## 1. Le problème, mesuré

### 1.1 Le registre entier tient en deux lignes

`skills/map-native/src/basemaps.ts:15-21` :

```ts
export const BASEMAPS: Record<string, BasemapMeta> = {
  world: { joinKey: "iso_a3", label: "World countries (ISO-A3 codes)" },
  "us-states": { joinKey: "postal", label: "US states (2-letter postal codes)" },
};
```

Deux fonds. `assets/geo/world.geojson` = 4 045 883 B, 241 features, Natural Earth admin-0 1:50m,
dont **6 portent `iso_a3 = "-99"`** — injoignables par la clé du registre lui-même (recherche §1).
`assets/geo/us-states.geojson` = 89 112 B, 52 features, 2 propriétés. Toute la chaîne est écrite
contre cette liste fermée : `BASEMAP_NAMES` est lu par `skills/map-native/src/validate-config.ts`
(4 sites via `validateBasemap`) et par `lib/loop/assemble/map-native.ts:13`, dont le refus
`geoRefusal` (`:116-128`) nomme littéralement « the shipped basemaps are world and us-states ».

Conséquence déjà écrite dans `docs/splash/capability-matrix-2026-07-28.md` §L1 : une choroplèthe
cantonale suisse — **le sujet du pilote** — n'est pas dans la matrice.

### 1.2 Et l'artefact embarque la planète pour dessiner n'importe quoi

`ChoroplethMap.tsx:10-22` importe les deux geojson en `?raw` **statiquement**, donc
`vite-plugin-singlefile` les inline **en entier, dans chaque artefact, quoi qu'il dessine**.
Mesuré sur 40+ artefacts construits (recherche §1) : **~5 950 000 B** par interactif, dont
**~4 135 000 B (69 %) de géodonnées**. Un artefact contient `iso_a3` 248 fois — les 241 pays sont
là même quand la carte en colorie 26.

Le motif n'est pas isolé : **9 imports `?raw` de geojson dans 8 fichiers** (vérifié par grep,
2026-07-28) — `ChoroplethMap` (les deux), `CartogramMap`, `DotDensityMap`, `RouteMap`, et
**quatre dans `skills/scrolly/`** qui traversent la frontière de skill vers
`../../map-native/assets/geo/world.geojson?raw`.

### 1.3 La demande, lue littéralement, ne peut pas être satisfaite en livrant un jeu de données

Cinq rangs sont visés (ADM0 → ADM3-5) **plus** ce qui n'est pas administratif : circonscriptions
électorales, zones postales, secteurs scolaires, régions hospitalières, le découpage maison d'une
rédaction pour une enquête. La recherche §6.0 a cherché et le constat est net :

- **polygones de codes postaux** : GeoNames = points seuls ; OSM quasi-complet dans **quatre pays**
  (Geofabrik, verbatim : *« Deutschland, Österreich (einzelne Lücken), Belgien (nur Flandern),
  Ungarn »*) ; UK Code-Point Open = centroïdes ; France, verbatim : *« Les contours géographiques
  des codes postaux ne sont pas fournis en open data »* ; Eurostat = non-commercial. Le **ZCTA
  américain est l'exception, pas la règle** ;
- **circonscriptions électorales** : un seul jeu multi-pays trouvé (CLEA GRED, 167 cartes,
  74 pays), **figé en 2019, licence non résolue** ;
- **secteurs, précincts, découpage maison** : aucun identifiant, aucun standard, aucune source.

Et là où un jeu global existe, la licence l'interdit ou l'encombre : GADM et Eurostat GISCO/NUTS
sont **non-commerciaux donc disqualifiés** pour un projet MIT (recherche §2.3, §2.4b) ;
geoBoundaries re-licencie en CC BY 4.0 mais **270 de ses 715 fichiers pays×niveau dérivent d'une
source ODbL ou CC-BY-SA** — les cantons suisses sont sous licence swisstopo, **les provinces
thaïlandaises sont ODbL**, les communes françaises aussi (§2.2, compté deux fois sur
`geoBoundariesOpen-meta.csv`, 486 138 B, 715 lignes).

**Donc la question cesse d'être « quel jeu de données livre-t-on » et devient « comment la
géographie ENTRE-t-elle dans un run ».**

---

## 2. Ce qui est déjà tranché, et qu'on ne rouvre pas

**La forme recommandée est B + D ensemble** (recherche §6) :

- **B — une source globale sur disque, sous-ensemblée au produce.** Natural Earth admin-0/admin-1,
  **domaine public sans obligation** (§2.1, texte lu : *« No permission is needed to use Natural
  Earth. Crediting the authors is unnecessary. »*), ~6,7 MB TopoJSON en source (§4.3), jamais
  inlinée telle quelle. C'est la couche piles-incluses, et c'est **la seule option qui allège
  l'artefact au lieu de l'alourdir** : cantons suisses **39 086 B en TopoJSON** contre 4,1 MB de
  géodonnées aujourd'hui (§4.1).
- **D — le run DÉCLARE son fichier de contours**, avec sa licence et son crédit. C'est la seule
  option qui répond à « toutes zones, tous niveaux », parce que pour tout ce qui n'est pas
  administratif — et pour les communes françaises, les districts thaïlandais, toute carte postale
  hors États-Unis — **c'est le seul mécanisme qui puisse exister** (§6.0).

**Décision 1 du propriétaire (2026-07-28).** Un fichier d'origine OSM apporté par le journaliste
**alimente TOUS les formats, interactif compris**, avec le **crédit OSM complet incrusté dans
l'artefact**. La réserve est consignée telle qu'elle a été posée : personne n'a tranché si un HTML
auto-contenu portant des coordonnées inline est une « œuvre produite » ou une « base de données
dérivée » (recherche §2.4, §7.2 — aucune ligne de l'OSMF ne parle d'un artefact web interactif).
Rémy traite l'artefact comme une **œuvre produite**. Contrepartie à tenir : le crédit n'est pas
décoratif, il doit être **dans le fichier livré, pas dans un README** — §3.7 dit où, et §3.8 nomme
**la ligne unique** qu'un avis écrit de l'OSMF renverserait.

**Décision 2 du propriétaire (2026-07-28).** Sous l'ADM1, quand une jointure est ambiguë ou
partielle, Splash **mesure, montre, et fait trancher le journaliste — puis mémorise la
correspondance dans le run**. Motivée par la mesure : **11,5 % des communes françaises** et
**52,3 % des comtés américains** n'ont pas de nom unique dans leur propre pays, et « nom + parent »
ne sauve pas (**293 Gemeinden** se percutent dans un même Land ; **1 423 communes** françaises se
percutent encore si la colonne parente est la *région*) — §3.2. Exiger une colonne de codes aurait
supprimé l'ambiguïté en rejetant la donnée la plus courante. **Le tour de dialogue supplémentaire
est le prix assumé.** §3.6 dit où la mémoire vit et comment elle survit à un re-run.

---

## 3. Décisions de design

### D1 — La géographie entre par une **entrée déclarée**, jamais devinée

Le manifeste gagne `input.geography`, à côté de `data`, `article` et `images`
(`lib/loop/manifest.ts:331-335`). Le précédent est exact et il a quelques jours : les
photographies du journaliste (`ImageFrameSchema`/`ImageInputSchema`, `manifest.ts:119-131`) sont
**déclarées avec le run**, et leurs deux faits éditoriaux — `alt` et `credit` — sont `.min(1)`,
donc **impossibles à omettre et interdits d'invention**. `lib/core/production-brief.ts:42-49`
porte le même commentaire : *« Splash never generates an image, and never writes an alt or a
credit — both are asked for and carried here verbatim. »*

```ts
export const GeographyCreditSchema = z.strictObject({
  name: z.string().min(1),
  url: z.string().optional(),
});

export const GeographyInputSchema = z.strictObject({
  path: z.string().min(1),
  encoding: z.enum(["geojson", "topojson"]),
  crs: z.enum(["EPSG:4326", "EPSG:4258", "EPSG:4269"]),
  /** What this file DESCRIBES, in the journalist's own words ("cantons", "communes de
   *  Haute-Savoie", "secteurs scolaires 2025"). Free text on purpose — see D2. */
  level: z.string().min(1),
  licence: z.string().min(1),
  /** The edition or vintage the licence asks to be cited. Not derivable — see D2. */
  edition: z.string().min(1),
  credit: GeographyCreditSchema,
  /** The feature property the data joins against, when the journalist knows it. Absent ⇒
   *  Splash MEASURES the candidates and asks (D6). Never guessed silently. */
  joinKey: z.string().min(1).optional(),
});
```

`z.strictObject` pour la raison que `SourceLedgerSchema` a déjà écrite dans ce dépôt : un objet
permissif laisserait passer une déclaration qui ne déclare rien. Et **schéma partagé verbatim**
entre `RunDeclarationSchema` (`lib/loop/init.ts:51-69`) et le manifeste, comme `ImageInputSchema`
l'est déjà — deux copies, ce serait deux vérités sur la même forme.

### D1b — Le fichier de contours est **gelé**, contrairement aux photographies

C'est **la divergence** avec le précédent, et elle est motivée par ce qui a motivé l'exception des
images. Le commentaire de `ImageInputSchema` la nomme lui-même : *« freezeInput copies a single
file it can hash on the spot, while an image folder stays where the journalist keeps it »*. Un
fichier de contours **est** un fichier unique hashable sur place. Il passe donc par `freezeInput`
comme `data` et `article`, et le manifeste ne porte qu'un `HashRef` (path + sha256).

Trois raisons, chacune payante :

1. **Local-first au sens fort.** La carte se rebâtit dans cinq ans, quand le journaliste aura
   réorganisé son disque. C'est la même promesse que pour la donnée.
2. **La mémoire de jointure a une identité stable à laquelle s'accrocher** (D6) : le sha256 dit
   sans ambiguïté si le fichier a changé sous les décisions déjà prises.
3. **La géométrie devient déterminante pour l'artefact gratuitement** (D9) : le hash entre dans
   `provenanceHash`.

Coût assumé, mesuré : Haute-Savoie (281 communes) = **347 472 B** ; geoBoundaries CHE ADM3
(2 286 communes) = **3,68 MB** simplifié ; FRA ADM5 simplifié = **58,89 MB** (§4.4). Le run
recopie ces octets. C'est le prix de l'archive auto-contenue, et §6 rappelle que le cas
« pays entier à l'ADM3 » est de toute façon hors du plafond honnête d'un artefact.

### D2 — Licence, crédit et **millésime** sont demandés, jamais inventés

Cinq sources réelles ont été lues (recherche §6.0) et le motif est décisif :

| source | ce qu'elle exige |
|---|---|
| **IGN ADMIN EXPRESS** (Licence Ouverte 2.0) | *« mentionner la paternité de l'"Information" : sa source (a minima le nom du "Concédant") et **la date de la dernière mise à jour** »* — pas de chaîne figée, une **forme** imposée |
| **swisstopo swissBOUNDARIES3D** | une **liste fermée de six** chaînes acceptées, dont `©swisstopo`. Le seul cas où une chaîne en dur est légitime |
| **ONS / Ordnance Survey** (OGL v3.0) | l'OGL **délègue** la formulation ; l'ONS impose *« … © Crown copyright and database right **[year]** »* — le crochet est tout le sujet |
| **US Census TIGER/Line** | *« We would ask, however, that you cite the Census Bureau as the source »* — **demandé, pas exigé** : le seul cas où l'omission n'est pas une infraction |
| **OpenStreetMap** (ODbL) | `© OpenStreetMap contributors`, plus le partage à l'identique de §2.4 |

**Trois des cinq exigent une année ou une édition qui n'apparaît nulle part dans le fichier**, et
la mtime ne peut pas la fournir — un re-téléchargement en 2026 de l'édition 2021 a une mtime 2026.
D'où `edition: z.string().min(1)` : **c'est le champ que Splash refuse le plus fermement de
deviner**, exactement comme il refuse d'écrire l'`alt` d'une photo.

`licence` reste du **texte libre requis**, pas un enum. Un enum imposerait une taxonomie que les
25 chaînes distinctes de `boundaryLicense` (§2.2, dont, mesuré, `"Pixabay License for Content"`
pour un fichier de frontières nationales) démentent. Ce que Splash garantit, c'est que la chaîne
existe et voyage jusqu'au pixel (§3.7) — pas qu'il l'a comprise.

`level` est du texte libre pour une raison mesurée : **« ADM1 » est une convention de jeu de
données, pas une convention journalistique**. Natural Earth compte 101 features pour la France
(les départements, **pas les 18 régions**) et 110 pour l'Italie (§2.1). Un enum `ADM0..ADM5`
mentirait au journaliste français qui demande une carte des régions.

### D3 — Formats acceptés : **GeoJSON et TopoJSON**, rien d'autre, et on le dit fort

RFC 7946 §4 est sans échappatoire (*« The coordinate reference system for all GeoJSON coordinates
is … WGS 84 »*, et §B : *« Specification of coordinate reference systems has been removed »*).
GeoJSON est donc la cible d'ingestion saine.

TopoJSON est accepté **bien qu'il soit strictement moins sûr** (§6.0 : sa spec §2.1.1 *permet
explicitement* des coordonnées projetées, sans moyen de déclarer lesquelles), pour deux raisons
qui lui sont propres : c'est **l'encodage de stockage de Splash lui-même** (arcs partagés −41 %,
quantification ~45 % de plus, décodage 63 ms) et un journaliste qui exporte depuis un outil
moderne en produit. La contrepartie est que **la garde CRS de D4 est obligatoire pour lui aussi**,
et qu'il doit être décodé avant tout : **MapLibre ne consomme pas de TopoJSON** (ses types de
source sont `vector, raster, raster-dem, geojson, image, video`).

Shapefile, GeoPackage et KML/KMZ sont **différés avec leur raison**, pas oubliés (§7) :
- **Shapefile** est ce que les journalistes envoient réellement, mais l'encodage DBF n'a pas de
  défaut fiable — les trois grandes bibliothèques JS en supposent **trois différents**, et
  `Genève` lu en cp1252 comme de l'UTF-8 devient `Gen<?>ve`, **irréversiblement** ;
- **GeoPackage** est **le seul format où la détection du CRS est déterministe** (`gpkg_spatial_ref_sys`
  est obligatoire) — c'est le meilleur candidat pour la suite —, mais **rien n'a été exécuté sous
  Bun** dans la recherche, et `better-sqlite3` a des frictions ABI documentées ;
- **KML** *impose* le WGS84 (OGC KML 2.3 §6.2) — le problème de reprojection y disparaît — mais
  `@tmcw/togeojson` **ne gère pas le KMZ** et `<Data><value>` est toujours une chaîne brute.

### D4 — Le piège CRS : attrapé **à la déclaration**, et on dit ce qu'on n'attrape pas

Ce que fait réellement une coordonnée projetée, mesuré contre geojson-vt — la projection que
MapLibre exécute sur une source GeoJSON inline (§6.0) :

| entrée | → x monde (valide 0–1) | → y monde |
|---|---|---|
| Berne WGS84 `7.4474, 46.9481` | 0,5207 | 0,3519 |
| Berne LV95 `2600000, 1200000` | **7 222,7** | **0,2904** |
| Paris L93 `652000, 6862000` | **1 811,6** | 0,3786 |
| Londres BNG `530000, 180000` | **1 472,7** | 0,5000 |

**Rien ne jette.** Les trois ont été acceptées et ont émis de la géométrie de tuile, console vide.
Et la moitié latitude est la pire : `1200000` **ne se clampe pas**, il **alias** par périodicité du
sinus (1 200 000 mod 360 = 120°) vers **une latitude plausible autour de 57°N**. La donnée ne
disparaît pas — elle atterrit ailleurs, dans un endroit qui existe.

**La garde est un contrôle de plage, et elle est quantifiée.** Balayage des **6 188 CRS projetés**
d'`epsg-index` ayant une définition analysable, 9 points chacun dans leur propre zone d'usage
déclarée : **exactement 2 passent `|x| ≤ 180, |y| ≤ 90`** — un artefact de données
(`EPSG:900913`, bbox `[0,0,0,0]`) et un grille atmosphérique ESRI en unités de 150 km. C'est aussi
ce que fait mapshaper, dont la fonction s'appelle honnêtement `probablyDecimalDegreeBounds()`.

Le contrôle porte sur **chaque coordonnée**, jamais sur la bbox : RFC 7946 §5.2 dit qu'une bbox
qui franchit l'antiméridien a **`bbox[0] > bbox[2]`** — **légal, pas corrompu**. Une assertion
`minX < maxX` rejetterait des données valides des Fidji et de Tchoukotka.

**Ce que la plage n'attrape PAS, nommé** (§6.0, chaque cas mesuré) :

1. **Mauvais datum, bonnes unités.** 539 CRS géographiques sont en degrés. ED50 ≈ **147–150 m**
   d'écart, OSGB36 géographique ≈ **125–160 m**. Aucun contrôle de plage n'y touche.
2. **Méridien d'origine non-Greenwich.** NTF (Paris) `EPSG:4807`, courant dans les vieux exports
   IGN : Paris sort à lon `0,0150`, Brest à `−6,8272` — plausible, décalé de **~171 km à l'ouest**.
3. **Axes inversés.** Détectable seulement quand `|y| > 90` — donc invisible pour toute l'Europe,
   l'Afrique et l'Amérique à l'est de 90°O. Berne `[7,44 · 46,95]` inversée atterrit en Somalie.

C'est **pour ces trois-là** que `crs` est un champ **déclaré** et pas une inférence : le contrôle
de plage attrape le métrique (~zéro faux négatif sur 6 188), la déclaration attrape le reste en le
mettant sous la responsabilité de celui qui a exporté le fichier. Les trois valeurs acceptées sont
`EPSG:4326`, `EPSG:4258` (ETRS89/RGF93) et `EPSG:4269` (NAD83) parce que la recherche a mesuré que
**proj4 les modélise `+towgs84=0,0,0`, identiques au WGS84** — ce sont des **vrais positifs qui ne
doivent pas être rejetés**. Réserve portée telle quelle : la recherche n'a mesuré **aucun chiffre**
d'écart résiduel réel ETRS89↔WGS84 ; ce qui est mesuré, c'est que proj4 ne les distingue pas, donc
Splash non plus (R4).

**⚠️ Aucune garde sur le sens d'enroulement des anneaux, et c'est une correction de la recherche à
ne pas ré-introduire.** Mesuré (§6.0) : geojson-vt (`convert.js`) calcule l'aire signée puis fait
`out.size = Math.abs(size)` — **il jette le signe** — et earcut classe par **ordre du tableau**
(premier = extérieur). Résultat identique aux deux enroulements, tuile identique. Le sens
d'enroulement est porteur **un cran plus bas**, dans la spec Mapbox Vector Tile — donc le jour où
Splash émettra des tuiles vectorielles, pas avant. Et RFC 7946 §3.1.6 est explicite :
*« parsers SHOULD NOT reject Polygons that do not follow the right-hand rule »* — **on ne rejette
jamais là-dessus**.

Le refus, quand il tombe, est un refus de `initRun` (`VerbResult`, jamais un throw : la discipline
de `lib/loop/init.ts:101`), **avant qu'un seul octet soit gelé** — même ordre d'opérations que le
ledger de sources (`init.ts:169-178`, dont le commentaire dit pourquoi : sinon on laisse un
`input/data-<hash>.csv` orphelin dans un dossier sans `run.json`). Et il porte la réparation :
« ré-exportez en EPSG:4326 », pas « invalid geometry ».

### D5 — Le subset au produce : **un descripteur assemblé, des octets résolus**

Le seam se coupe en deux, et la coupure est imposée par ce que chaque couche sait :

- **L'assembleur** (`lib/loop/assemble/map-native.ts`) émet un **descripteur** : quelle source,
  quel scope, quel niveau, quelle clé de jointure, **et quels feature ids sont réellement
  dessinés**. Il ne connaît pas la largeur de rendu — `ProductionBrief`
  (`lib/core/production-brief.ts:51-68`) porte `format`, pas `channel`.
- **Le producteur** (`skills/map-native/scripts/produce.mjs`) résout ce descripteur en octets,
  parce que c'est lui qui connaît le canal : `produce.mjs:122-132` lit `SPLASH_CHANNEL`, refuse
  fail-closed une valeur inconnue, et appelle `renderSize(channel)` → `{ width, height }`
  (`lib/core/channel-policy.ts:47-48` : article-web = **1200×675**). C'est aussi le point unique
  qui construit **les trois formats**, ce qui est exactement ce que la Décision 1 exige (le crédit
  doit voyager dans le static, la vidéo et l'interactif).

**L'étape elle-même est `filter → prune properties → simplify → encode`**, et chaque cran est
motivé par une mesure (§4.1, cantons suisses, 4 947 sommets) :

| variante | octets | gzip | déviation max | en pixels @1200 |
|---|---|---|---|---|
| 121 propriétés, précision pleine | 253 393 | 81 363 | 0 | — |
| 12 propriétés utiles, précision pleine | 198 201 | 68 491 | 0 | — |
| 12 props + arrondi 0,0001° | **92 759** | 25 291 | **6 m** | 0,02 px |
| 12 props + Visvalingam 100 m + 0,0001° | 86 394 | 23 316 | 387 m | **1,3 px** |
| **TopoJSON, 100 m, quantize 1e5** | **39 086** | 14 234 | 387 m | 1,3 px |

**L'élagage des propriétés est le gain le plus gros et le moins cher, pas la simplification** :
253 kB → 93 kB **sans aucun changement visible** (6 m d'erreur, 1/50 de pixel).

**Règle de simplification, et c'est une interdiction autant qu'une règle : tolérance métrique
dérivée de la largeur de rendu, JAMAIS un pourcentage.** Mesuré (§4.1) :

| `-simplify` | sommets gardés | déviation max | en pixels |
|---|---|---|---|
| 20 % | 723 / 4 947 | 14 029 m | **49 px** |
| 5 % | 298 | 18 532 m | **64 px** |
| 1 % | 227 | 29 192 m | 101 px |

Un `-simplify 5 %` — un nombre qui *sonne* prudent — **déplace la frontière suisse de 64 pixels**.
La règle retenue est celle que la recherche établit : `tolérance ≈ (étendue de la carte en mètres)
/ (largeur de rendu en px) × 1`, soit **un pixel**, en Visvalingam. À 1200 px la Suisse fait
≈ 288 m/px, ce qui donne les 100 m du tableau ci-dessus, mesurés à 1,3 px.

**Ce que l'artefact porte, au bout :** la géométrie **des seules features dessinées**, élaguée,
simplifiée à la tolérance du canal, injectée par le seam qui existe déjà —
`skills/map-native/vite.config.ts:11-21` définit `__CONFIG__` depuis `process.env.CONFIG`, et
`src/mount.tsx` le lit. La géométrie voyage sur ce chemin ; **`GEOJSON_BY_BASEMAP`
(`ChoroplethMap.tsx:19-22`) disparaît**, et avec lui les 9 imports `?raw` de §1.2. Deux
conséquences à traiter dans le même mouvement : les **quatre** imports de `skills/scrolly/`
traversent la frontière de skill, donc les deux skills bougent ensemble ; et
`skills/splash/scripts/bundle-source.mjs` traite aujourd'hui `.geojson` en **feuille d'import**
(`:30` `RESOLVE_EXTS`, `:87` `if (/\.(json|geojson|css)$/i.test(f)) continue`) — il doit apprendre
que la géométrie n'est plus un import statique, sinon **le bundle « code source » exporté
construira sans sa carte**.

Ordre de grandeur de ce que ça donne : la pire sous-région ADM1 mesurée est la Russie
(86 features, **1 907 105 B**) — **moins de la moitié** de ce que chaque artefact inline
aujourd'hui (§4.2). Et le `world.geojson` actuel, ré-encodé à 2 km de tolérance, tombe à
**677 115 B en TopoJSON** pour 0,5 px de déviation à l'échelle du monde (§4.3) : **une baisse de
63–83 % sur chaque carte livrée aujourd'hui, à capacité inchangée**.

### D6 — La jointure, à deux profondeurs

**Au-dessus et à l'ADM1 — un index construit une fois, jamais inliné.** Mesuré (§3.4) : en
indexant, pour chaque feature de NE 10m admin_1, `iso_3166_2 | code_hasc | postal | fips |
wikidataid` + 12 champs de noms + chaque alias de `name_alt`, normalisés (NFD, majuscules,
tiret/apostrophe → espace) :

| | |
|---|---|
| clés distinctes | **47 231** |
| clés menant à plus d'une feature | **1 651 = 3,5 %** |
| index en JSON | **1 369 563 B** (374 421 gzip) |

**Une table de correspondance planétaire à l'ADM1 pèse 1,4 MB et est non ambiguë à 96,5 %.** Elle
est **licence-propre par construction** : Natural Earth (domaine public) + CLDR
(`SPDX-License-Identifier: Unicode-3.0`, codes + noms en 119 langues) + Wikidata (**CC0**) +
GeoNames (**CC BY 4.0**, `admin1CodesASCII.txt` 151 572 B / 3 865 lignes / 228 pays ;
`admin2Codes.txt` 2 370 419 B / 47 549 lignes / 189 pays) — les quatre lues sur leur page.
**⚠️ Ce n'est PAS « la liste ISO 3166-2 »** : la phrase de gratuité d'ISO couvre
*« country, currency and language codes »* et **omet les subdivisions** (§3.1) ; CLDR et Wikidata
sont les substituts livrables.

L'exemple du propriétaire se résout tel quel, depuis le fichier : `Genève`, `CH-GE`, `Geneva`,
`Genf`, `Ginevra` → tous `CHE-159` ; `Haute-Savoie` → `FRA-5302` ; `Chiang Mai` → `THA-390`.

Trois règles tombent des **échecs** mesurés du même index, et elles sont non négociables :

1. **Un scope pays est obligatoire.** `GE` seul résout **8 features** (Barbade, Bhoutan, Suisse,
   Italie, Maroc, Pays-Bas, Somalie, Saint-Vincent). C'est le mis-join silencieux le plus probable
   à l'ADM1 ; un run sans scope **demande** au lieu de choisir.
2. **L'homonymie existe aussi dans un pays.** `Buenos Aires` = 2 features argentines (la province
   et la ville autonome). Le nom n'est jamais sûr, seulement *plus* sûr en haut.
3. **Le rapport d'orphelins doit nommer le NIVEAU regardé.** `Suisse` ne trouve rien dans un index
   ADM1 — c'est un nom ADM0. L'invariant existant de `geo-match.ts` (*« it always names the
   orphans »*, `:51-67`) est exactement le bon et **se renforce** ici d'une étiquette de niveau.

**Sous l'ADM1 — il n'y a aucune clé globale livrable, et c'est la Décision 2 qui répond.** Mesuré
(§3.2) : geoBoundaries porte cinq champs à tous les niveaux et son `shapeISO` est **une chaîne
vide dans 100 % des features à l'ADM2 et en dessous** (12 combinaisons pays/niveau vérifiées) ;
son `shapeID` est opaque et identifie **le jeu de contours, pas le polygone parent** ; GADM, le
seul schéma qui résoudrait la profondeur (`GID_5` + ascendance complète), est **disqualifié par
sa licence** — c'est le arbitrage le plus tranchant de tout le dossier.

Donc, mécaniquement :

```ts
export type GeoJoinDecision = {
  value: string;      // the raw value in the journalist's column
  featureId: string;  // the polygon it was bound to
  basis: "unambiguous" | "journalist";
};
export type GeoJoinLedger = {
  column: string;
  geographySha256: string;   // WHICH file these decisions were taken against (D1b)
  decisions: GeoJoinDecision[];
};
```

Le registre vit sur `run.orient` (`manifest.ts:344-350`), à côté du `geo` qu'il complète — c'est
le niveau run, comme la géographie elle-même. **Il survit à un re-run parce que `run.json` EST le
registre** : `orient` est ré-exécutable, et une décision déjà prise est **rejouée**, pas
re-demandée, tant que `geographySha256` correspond. Si le fichier change, les décisions prises
contre l'ancien **ne sont pas silencieusement rejouées** — elles sont montrées comme périmées et
re-posées ; c'est le seul comportement compatible avec la mesure de §3.6 (`PH-13` a été réattribué
à une autre région : rejouer une correspondance sur un fichier différent, c'est *exactement* le
mécanisme d'une carte fausse sans erreur).

**Le blocage est mécanique, pas documentaire.** Le dépôt a déjà ce motif exact :
`unauthoredBeats(el)` (`manifest.ts:536`) liste les beats vides et `produce()` refuse d'en
construire un. Miroir : `unresolvedGeoJoins(run)` liste les valeurs ambiguës, un `NextAction`
`resolve-geo-join` les pose une fois, et **`produce()` refuse tant qu'il en reste**. Une carte ne
part pas avec une ambiguïté ouverte.

**Et le seuil « la moitié des lignes » doit changer de nature.**
`lib/loop/assemble/map-native.ts:122` refuse sous 50 % de correspondance. Ce seuil est sain à
l'ADM0/ADM1 et **dangereux en profondeur** : §3.2 mesure que ~11 % des lignes françaises peuvent
correspondre au **mauvais** polygone avec 100 % de confiance. **Un compte ne voit pas un
mis-join.** En profondeur, la garde devient « joint sur une clé non ambiguë » — le comptage reste,
mais il cesse d'être la seule question.

### D7 — Le crédit voyage **dans le pixel**, pas dans un README

`skills/map-native/src/core/MapFrame.tsx` porte déjà la bande qu'il faut, et son propre en-tête le
dit (`:3`) : *« cited source (bottom band, **ALWAYS rendered — incl. video**) over the full-bleed
map »*, rendue en `:171-202` sous `data-testid="map-source"`. C'est **le seul endroit que les
trois formats traversent**. Le crédit de géographie s'y ajoute, à côté du crédit de donnée :

```ts
// MapFrame props, beside the existing `source: { name: string; url?: string }`
geoCredit?: { name: string; url?: string };
```

Et il est **mécanique, pas facultatif** — la discipline que la spec source-policy a déjà écrite
(« l'obligation est dans la valeur de retour ») : quand la géométrie d'une configuration provient
d'un fichier **déclaré**, un `geoCredit` vide **fait échouer le produce**, comme les autres gardes
de produce échouent fort (`assertRenderedSize`, `skills/splash/src/channel.ts:62-78`). Une
rédaction ne peut pas livrer un artefact OSM sans `© OpenStreetMap contributors` par oubli : il
n'y a pas de chemin de code qui le permette.

La chaîne rendue est **celle qui a été déclarée**, jamais recomposée : §3.6 montre que trois des
cinq licences lues imposent une *forme* (avec une année) et non une chaîne, et que swisstopo
publie **une liste fermée de six** libellés acceptés. Splash n'a rien à ajouter à ça — il porte.

### D8 — La ligne unique qu'un avis de l'OSMF renverserait

La Décision 1 est un choix, donc elle doit être **localisée**, pas diffuse. Elle vit dans un
prédicat, et un seul :

```ts
// lib/geo/policy.ts
export function geometryMayBeInlined(
  geography: GeographyInput,
  format: VisualFormat,
): boolean;
```

Aujourd'hui il retourne **`true` pour tous les formats** — c'est la Décision 1 écrite en code,
avec sa raison en commentaire et le lien vers la réserve. Le jour où l'OSMF répond par écrit que
le HTML auto-contenu convoie une **base de données dérivée**, **c'est cette fonction qui change**,
et rien d'autre : elle retourne `false` pour `interactive`/`scrolly` quand la licence déclarée est
ODbL, et le refus nomme les chemins qui restent ouverts (`static`, `video` — dont §2.4 dit que le
cas est *clair et non contesté*, ODbL §4.5.b). Aucun appelant n'a besoin de bouger.

**Un second point est à traiter dans le même geste, et il est plus discret.**
`computeChoropleth` (`skills/map-native/src/choropleth-geo.ts:110-114`) construit un
`FeatureCollection` en **fusionnant les valeurs du journaliste dans les `properties` des
features**. Sous une géométrie du domaine public c'est sans conséquence. Sous une géométrie ODbL,
la ligne directrice « Collective Database » de l'OSMF dit que le partage à l'identique ne touche
**que** les parties issues d'OSM **tant que les deux jeux restent structurellement séparés** — et
fusionner **déclenche** l'extension (§2.4). Décision : **la jointure ne fusionne plus les valeurs
dans les properties de la géométrie ; elle reste une table à côté** (`{key → value}`), ce que le
`ChoroplethLayout.joined` produit déjà pour l'essentiel. Ça ne coûte rien aujourd'hui et ça évite
que la Décision 1 soit un jour renversée par une ligne écrite dans un tout autre but.

### D9 — La géographie devient **déterminante pour l'artefact**

`provenanceHash` (`manifest.ts:488-531`) hache aujourd'hui `inputData`, `inputArticle`, `cadrage`,
`angle`, `chosenId`, `channel`, `sources`, `format`, `narrative`. Le raisonnement écrit pour
`sources` (`:509-518`) s'applique **mot pour mot** à la géographie, deux fois :

- le crédit et le millésime déclarés sont **rendus dans l'artefact** (D7) — sans hachage, corriger
  un crédit laisserait une carte périmée se déclarer `fresh`, `stalenessOf` répondrait `false` et
  la rédaction publierait l'attribution qu'elle vient de réparer ;
- **les décisions de jointure décident quel polygone reçoit quelle valeur** — c'est le fait le
  plus déterminant de toute la carte.

Donc deux lignes s'ajoutent : `geography: run.input.geography ?? null` (le `HashRef` **et** les
faits éditoriaux) et `geoJoin: run.orient?.geoJoin ?? null`. Les deux valent `null` pour tout run
existant, donc **le hachage reste stable** et la migration de D10 ne renvoie aucun artefact déjà
produit au produce — la propriété que `migrate.ts` protège explicitement (`manifest.ts:501-507`).

### D10 — Ce que devient `BASEMAPS`, et ce qu'il advient de `world` / `us-states`

`BASEMAPS` cesse d'être un **enum fermé nom → fichier + clé** et devient un **résolveur sur une
géographie décrite** :

```ts
export type GeographyRef = {
  origin: "shipped" | "declared";
  set: string;        // "natural-earth-admin-0" | "natural-earth-admin-1" | "us-states" | "declared"
  scope?: string;     // ISO-A3 country scope for an admin-1 subset; absent = global
  level: string;
  joinKey: string;       // the property the join actually landed on
  joinKeyFamily: string; // WHICH identifier family won — reported to the journalist
};
```

Deux changements de fond, chacun mesuré :

1. **La clé de jointure cesse d'être une chaîne par fond et devient une famille de candidats.**
   Une seule feature ADM1 de Natural Earth porte **9 identifiants joignables** et
   **26 champs de langues** remplis à ~100 % (§3.3). Et il faut **dire laquelle a gagné** : c'est
   ce dont le produce a besoin pour sous-ensembler, et c'est ce qu'un journaliste doit lire
   (« joint sur ISO 3166-2 » n'a pas la même valeur probante que « joint sur le nom français »).
2. **`matchGeography` doit s'inverser.** Aujourd'hui (`geo-match.ts:68-92`) elle boucle
   *chaque colonne × chaque fond livré* et relit le geojson entier par fond (`keysOf`, `:19-49`).
   Avec ~199 jeux ADM1 la boucle ne tient pas : elle doit **indexer les identifiants une fois**
   (D6) puis **chercher les valeurs de la donnée dedans**. Ses **deux invariants survivent
   intacts** et sont reportés verbatim : **elle ne jette jamais** (I1 — `lib/loop/orient.ts:43`
   l'appelle sans `try`) et **elle nomme toujours les orphelins**.

**`world` et `us-states` survivent — comme noms, pas comme fichiers figés.** Ce sont des
`GeographyRef` par défaut, résolus par le résolveur, ce qui garde lisible tout manifeste déjà
écrit (`basemap: "world"`). Mais leurs octets divergent, et pour une raison mesurée :

- **`world` est ré-encodé** : 4 045 883 B → **677 115 B** en TopoJSON à 2 km de tolérance, soit
  0,5 px à l'échelle mondiale (§4.3, validé sur 10 pays compacts) ;
- **`us-states` reste tel quel.** Le régénérer depuis NE admin_1 serait une régression mesurable :
  le subset USA (51 features, 12 props, 250 m) pèse **918 166 B** (§4.2) contre **89 112 B** au
  fichier livré aujourd'hui, qui ne porte que 2 propriétés (§1). On ne remplace pas un fichier de
  89 kB par un de 918 kB au nom de l'uniformité.

Le troisième jeu livré est neuf : **`natural-earth-admin-1`**, ~**6 745 276 B** en TopoJSON à
500 m (§4.3) — **source sur disque, jamais inlinée**. C'est exactement la forme que l'hypothèse
prédit : *la source vit dans le skill, le sous-ensemble vit dans l'artefact.*

Enfin, **le refus `dot-density` est re-dérivé, jamais supprimé.**
`lib/loop/assemble/map-native.ts:192-207` refuse tout fond ≠ `world` parce que `DotDensityMap.tsx`
importe `world.geojson` en dur et code `iso_a3` en dur. Ce refus est **correct aujourd'hui** et
devient **mort ou faux** dès que la géométrie arrive par la configuration : il doit être re-écrit
contre la nouvelle réalité (le composant lit la géométrie injectée), pas effacé au passage.

---

## 4. Architecture — `lib/geo/`

Paquet neuf, sur le modèle de `lib/source/` : un vocabulaire, une table de conséquences, des
assertions qui jettent pour ce que personne n'est censé vouloir contourner.

| Fichier | Responsabilité |
|---|---|
| `lib/geo/declaration.ts` | `GeographyInputSchema`, `GeographyCreditSchema` (D1) — `z.strictObject`, partagé verbatim avec `RunDeclarationSchema`. |
| `lib/geo/crs.ts` | `coordinateRangeVerdict(geometry)` (D4) : contrôle par coordonnée, antiméridien-safe, **aucune garde d'enroulement**. Rend un verdict nommé, jamais un booléen nu. |
| `lib/geo/ref.ts` | `GeographyRef`, le résolveur (D10), et le shim de compatibilité qui résout `"world"` / `"us-states"`. |
| `lib/geo/join.ts` | `GeoJoinLedger`, `unresolvedGeoJoins(run)`, le rejeu par `geographySha256` (D6). |
| `lib/geo/policy.ts` | `geometryMayBeInlined(geography, format)` — **la ligne unique de D8** — et l'obligation de crédit de D7. |
| `lib/geo/subset.ts` | `filter → prune → simplify(tolerance) → encode` (D5). Tolérance **métrique** dérivée de `renderSize(channel).width`, jamais un pourcentage. |
| `lib/geo/index-build.ts` | Construction hors-ligne de l'index ADM1 (D6), **artefact de build committé**, jamais inliné. |

`skills/map-native/src/basemaps.ts` devient un **ré-export mince** de `lib/geo/ref.ts` — le motif
que ce dépôt applique déjà à `skills/map-native/src/theme/house-ramp.ts` — *« a thin re-export
shim »* de `lib/core/house-ramp.ts` selon les termes de `lib/core/house-ramp.test.ts:3`. Ça garde les 4 sites de
`validate-config.ts` et `lib/loop/assemble/map-native.ts:13` sur un import qui compile pendant la
transition.

**Migration du manifeste — schemaVersion 4 → 5.** `GeoMatchSchema` (`manifest.ts:190-196`) porte
`basemap: z.string()` ; il devient `geography: GeographyRef`. `lib/loop/migrate.ts` a le précédent
exact et son en-tête (`:13-16`) décrit la chaîne : `migrateV4toV5` traduit `"world"` →
`{origin:"shipped", set:"natural-earth-admin-0", level:"country", joinKey:"iso_a3"}` et
`"us-states"` → `{…, set:"us-states", joinKey:"postal"}`. `orient` **n'entre pas** dans
`provenanceHash`, donc cette traduction est **neutre pour le hachage** — la propriété que la
migration précédente a protégée explicitement.

---

## 5. Ce que ça ne résout pas — dit avant que quelqu'un l'espère

- **Natural Earth s'arrête à l'ADM1, et il est gelé.** Global à l'ADM0 et à l'ADM1 seulement :
  `ne_10m_admin_2_counties` est, verbatim sur la page de téléchargement, *« limited to the United
  States »*, et il n'y a **aucun ADM3**. Dernière release **v5.1.2 du 2022-05-13**, dernier commit
  master 2022-06-02, chaque artefact CDN portant `Last-Modified: Fri, 13 May 2022`, 445 issues
  ouvertes, dépôt ni archivé ni marqué déprécié (§2.1). **Splash livrerait un monde de 2022** — les
  réorganisations récentes (réforme des fylker norvégiens, renommages turcs et kazakhs) y seront
  fausses. **Sous l'ADM1, tout dépend d'un fichier que quelqu'un apporte.** C'est la limite
  structurelle de ce design, pas un manque de ce chantier.
- **Aucun jeu de données ne se rejoint sur le nom en profondeur.** 4 055 communes françaises
  (11,5 %) et 1 684 comtés américains (52,3 %) sont en collision de nom dans leur propre pays, et
  la normalisation des accents **aggrave** le cas français (11,8 %). Splash mesure et fait
  trancher ; il ne devine pas.
- **Une clé sans millésime n'est pas une clé.** Quatre jeux, quatre Norvège (GADM 19 comtés
  pré-2020, geoBoundaries 11, ISO 13, la réalité 15 depuis 2024) ; le code `PH-13` a été
  **réattribué à une autre région** ; l'Indonésie a créé `ID-PE/PS/PT/PD` en amputant `ID-PA` et
  `ID-PB` **qui ont gardé code et nom** (§3.6). Ni une jointure par nom ni une jointure par code ne
  détecte ça. Le millésime déclaré (D2) le **documente** ; il ne le corrige pas.
- **Aucun nom de fichier de géométrie n'est dans une langue connue.** geoBoundaries donne le
  français pour Genève et l'allemand pour Berne ; les Grisons ont **quatre** noms officiels dans
  leur propre pays ; geoBoundaries et GADM romanisent le thaï différemment
  (`Chaloem Phra Kiat` / `Chalermphrakiet`). Joindre sur `name`, c'est joindre contre un choix de
  langue fait par quelqu'un d'autre, par pays.
- **Le plafond « 1–2 MB inline » est une inférence, pas un benchmark publié.** Le seul travail
  relu par les pairs localisé (MDPI IJGI 14(9):336) a renvoyé HTTP 403 et n'a pas pu être lu
  (§4.5, §8). Ce qui **est** mesuré : 35 228 polygones à 45,3 MB atteignent le premier `idle` en
  **2 799 ms** — donc le rendu n'est pas la contrainte ; la contrainte est le **poids de page**, et
  la page mobile médiane du Web Almanac 2025 est de **2 362 kB**. D'où un **avertissement chiffré**
  au produce, pas un refus dur : on n'écrit pas un seuil de refus à partir d'une inférence.
- **La posture sur les territoires disputés reste implicite.** Natural Earth livre 41 champs
  `FCLASS_*` de points de vue et affiche du *de facto* par défaut ; les composites CGAZ de
  geoBoundaries appliquent, verbatim, les *« US Department of State definitions »*. Splash fait ce
  choix en silence aujourd'hui **et continuera après ce chantier** — le nommer ici est tout ce que
  ce design fait pour l'instant.

---

## 6. Hors périmètre — nommé pour ne pas y glisser

- **La reprojection.** Refuser tout ce qui n'est pas WGS84 (aux trois codes de D4 près) est une
  frontière légitime, et elle évite une dépendance : **le jeu EPSG n'est pas ouvert** —
  epsg.org/terms-of-use, verbatim : *« Distribution for profit is forbidden »*, *« Ownership of the
  EPSG Dataset by IOGP must be acknowledged »*. Redistribuer un sous-ensemble `{code → proj4}`
  (1,5 MB / 199 kB gzip) est permis mais exigerait **un fichier de termes et une mention IOGP dans
  un dépôt MIT** (§6.0). On ne prend pas cette dépendance pour une v1. Note pour le jour où :
  `proj4.defs` ne contient que **130 définitions** et **pas** `2056`, `2154`, `27700`, `4258` — les
  quatre dont un journaliste européen a besoin — et un appel sur une définition absente **jette une
  chaîne nue, pas une `Error`**.
- **Shapefile, GeoPackage, KML/KMZ** (D3), avec leurs raisons chiffrées. GeoPackage est le premier
  sur la liste du jour où.
- **Les types non-choroplèthes.** `symbol`, `hex-grid`, `locator`, `route` partent déjà de lat/lon
  et sont bornés à la surface du globe (`lib/loop/assemble/map-native.ts:54-77`,
  `assemblePointFamily` `:241-356`). Ils ne joignent aucun polygone, ils ne sont pas concernés — à
  ceci près que leur `basemap = "world"` en dur (`:265`) bénéficiera du ré-encodage de D10 sans
  rien changer d'autre.
- **Aller chercher la géométrie au produce** (Option C de la recherche) : ça échange le socle
  local-first contre une couverture qui **s'arrête quand même à l'ADM2 en Thaïlande et en
  Argentine**, avec une roulette de licences par fichier et un `current` qui bouge sous les pieds.
- **Tuiles vectorielles / PMTiles**, et donc le cas « pays entier à l'ADM3 » (35 228 communes =
  8,8 MB TopoJSON). Une décision produit ouverte, pas un inconnu technique (§7.7).
- **geoBoundaries, GADM, Eurostat GISCO comme sources livrées** — licences, §2.
- **Le choix de point de vue sur les frontières disputées** (§5).
- **Le fine-tuning du KB et les autres moteurs** : rien ici ne touche `chart-native`, `dw-chart`
  ni `map-dw`. `map-dw` sur-produit encore, c'est un résidu à lui.

---

## 7. Risques assumés

> Registre consolidé : `docs/splash/residuals.md`.

**R1 — La Décision 1 repose sur une lecture, pas sur une décision de l'OSMF.**
Aucune ligne directrice endossée ne parle d'un artefact web interactif ; le texte opératoire est
*« If the published result of your project is intended for the extraction of the original data,
then it is a database and not a Produced Work »*, et l'appliquer à un HTML auto-contenu portant du
GeoJSON inline est une interprétation. **Arbitrage :** c'est un choix du propriétaire, pris en
connaissance de la réserve, et sa contrepartie est câblée (D7 : le crédit ne peut pas manquer).
Le risque est localisé à **une fonction** (D8). Un avis écrit de l'OSMF le confirme ou change cette
fonction, rien d'autre.

**R2 — Le journaliste doit fournir un millésime, et beaucoup ne l'auront pas sous la main.**
`edition` est requis alors qu'il n'est **dans aucun fichier** et que la mtime ne le donne pas. Un
journaliste pressé écrira « 2026 » parce que c'est l'année où il a téléchargé. **Arbitrage :** un
champ faux et visible vaut mieux qu'un champ absent et invisible — c'est le même arbitrage que
`alt` sur une photographie, où rien n'empêche non plus d'écrire une bêtise. Ce que la garde
garantit, c'est qu'**une personne a répondu**, pas que la réponse est juste.

**R3 — Rien n'a mesuré à quelle fréquence la clé de jointure d'un fichier apporté est trouvable
sans demander.** §3.2 établit que ce qui marche en profondeur est le **code statistique national**
que la donnée du journaliste porte déjà (INSEE, BFS, ISTAT, AGS, INE, IBGE, FIPS/GEOID) ; ce que
personne n'a mesuré, c'est combien de fichiers réels exposent ce code sous un nom de propriété
reconnaissable. **Arbitrage :** `joinKey` est **optionnel** et Splash mesure le taux de
correspondance de chaque propriété candidate avant de demander — le pire cas est donc une question
de plus, jamais une mauvaise jointure. Le piège à écrire dans le validateur est déjà connu et
mesuré : `ref:ine` en minuscules **existe** (83 006 objets OSM) mais porte des codes de section de
recensement à 11 chiffres, **pas** des codes de commune. **Joindre dessus produit du silence
faux.**

**R4 — Accepter `EPSG:4258` et `EPSG:4269` est un acte de confiance, pas une mesure.**
Ce qui est mesuré, c'est que proj4 les modélise `+towgs84=0,0,0` — donc que **Splash ne peut pas
les distinguer du WGS84**. Aucune divergence réelle n'a été chiffrée par la recherche.
**Arbitrage :** les rejeter aurait refusé des exports européens et nord-américains parfaitement
utilisables, et la déclaration met la responsabilité là où elle est vérifiable.

**R5 — La chaîne d'outillage du sous-ensemblage n'a pas été qualifiée juridiquement.**
Toutes les mesures de §4 ont été faites avec **mapshaper 0.7.49** via `bunx`, et **sa licence n'a
pas été lue** dans la recherche. Splash livre MIT. **Arbitrage :** non résolu ici, délibérément —
c'est une vérification d'une minute que le plan doit faire **avant** que la dépendance n'entre, et
l'affirmer maintenant serait exactement le genre de raccourci que le dossier de licences ci-dessus
refuse partout ailleurs.

**R6 — L'index ADM1 est un artefact de build de 1,4 MB committé, sans cadence de rafraîchissement.**
Il est reconstructible (`lib/geo/index-build.ts`) mais rien ne le reconstruit automatiquement.
**Arbitrage :** sa source est **gelée depuis 2022** (§5), donc une cadence serait du théâtre. Le
jour où Natural Earth bouge — ou où quelqu'un répond sur son maintien en 2026 (§7.4 de la
recherche : NACIS) — la question se rouvre avec une raison.

**R7 — Le gel du fichier de contours (D1b) recopie des octets qui peuvent être gros.**
58,89 MB dans le pire cas mesuré (FRA ADM5). **Arbitrage :** l'auto-suffisance du run est le socle,
et ce pire cas est déjà hors du plafond honnête d'un artefact (§5) — il sera refusé plus haut pour
une autre raison bien avant d'être un problème de disque.

**R8 — Le plafond de poids est un avertissement, pas un refus.**
Faute de benchmark publié (§5), l'artefact trop lourd est **signalé et livré**. Un journaliste peut
donc publier une page de 5 MB en connaissance de cause. **Arbitrage :** un seuil de refus tiré
d'une inférence se ferait desserrer par la première personne qu'il gêne, et un garde qui crie au
loup se désarme tout seul — c'est le raisonnement que `docs/splash/residuals.md` §0 a déjà écrit.

**R9 — `us-states` reste un fichier à part, donc le registre n'est pas homogène.**
Deux jeux livrés viennent de Natural Earth, un troisième n'en vient pas. **Arbitrage :** l'homogénéité
coûterait **918 kB contre 89 kB** (§D10, mesuré) sur un des deux fonds les plus utilisés. On garde
l'irrégularité et on écrit pourquoi, plutôt que d'acheter une symétrie à 10× le prix.
