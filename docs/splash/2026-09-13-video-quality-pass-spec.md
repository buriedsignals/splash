# La vidéo au niveau du statique : chaque type du catalogue, dirigé, sur n'importe quel sujet

**Statut :** design approuvé en conversation le 2026-09-13. Ni planifié ni implémenté.
**Branche :** `quality/video` (worktree `video/`), partie de `b49a59b3`.
**Décisions du propriétaire enregistrées ici :** le livrable est le skill, pas une collection de
beats (§2) ; trois mp4 par type, un par direction (§4.4) ; tous les types du catalogue, sans refus
(§2) ; même identité et même précision que le statique, mais tailles, texte et composition refaits
sous contraintes vidéo (§3) ; pilote choroplèthe (§6) ; on attend la fusion de
`rerender/static-corpus` avant de produire (§8) ; validation un type à la fois, en ouvrant seulement
les mp4 (§5).

---

## 1. Le problème, mesuré

Le 2026-09-13, sur `b49a59b3` :

- **Aucun beat vidéo n'est dirigé.** `docs/design-base/CATALOGUE.md` : « No directed beat in any
  other export yet ». Aucun `proof/vid*`, `video-*`, `mapvid-*` ne porte de `render-directions*`,
  n'importe une direction, un registre, un traitement ou le composer.
- **Le catalogue compte 32 charts et 8 cartes.** La vidéo en couvre 23 (17 charts, 6 cartes), avec
  des beats antérieurs au design base, et **17 types n'ont aucune vidéo** : beeswarm, bullet,
  calendar heatmap, cartogramme, connected scatter, contours, diverging stacked bar, donut, dot
  strip, gantt, marimekko, coordonnées parallèles, pictogramme, radar, sankey, streamgraph, treemap.
  (`MATRIX.md` annonce 19 types de charts, dont deux sont propres au scrolly.)
- **La typographie des vidéos existantes est machine-dépendante.** Chrome dessinait chaque frame en
  Helvetica système alors que le seed nomme Open Sans — corrigé pour le mécanisme par `ec9946b1`,
  mais 25 compositions portent encore `FONT_FAMILY = "Helvetica, Arial, sans-serif"`, des jetons
  tapés (`TITLE { fontSize: 38, fontWeight: 700, lead: 48 }`), et le choroplèthe une hauteur de
  capitale lue dans l'AFM d'Helvetica (`proof/mapgen-choropleth-video/ChoroplethVideo.tsx:63`).
- **Les cartes vidéo ignorent le tronc `shared/map-beat/`.** Eau peinte à la main (`#aac9e0`,
  mesurée 1,730:1, au-dessus de `BASEMAP_MAX`), plaques à taille fixe 496/620, marques en SVG
  par-dessus la plaque au lieu de couches cuites à la taille dessinée, aucun plan validé.
- **Les gardes de format ont des trous.** Six cartes et `vidz-diverging-bar` n'épinglent aucune
  taille (trois rendent hors du tableau : 1080×1350, 1080×1440) ; `assertTypeFloor` manque dans
  les cartes et quatre charts ; `assertWithinStage` n'est appelé par aucun beat ; `MATRIX.md` a
  dérivé (`matrix:check` échoue).

Ce que la passe statique a apporté est **déjà dans la base** de cette branche — fontes en fichiers
et couverture par cmap (`7340e91e`, `45e31334`), mesure italique (`5b2e6ae3`), plan de carte et
taille dessinée (`9d3e0c8f`, `ff74ba93`), teintes mesurées (`be1d2597`), marques cuites
(`fcfe0535`), taille déposée lue comme hauteur de capitale et étiquette près de son objet
(`8fef04b6`) — **sauf l'interligne réglé sur la police**, qui vit sur `rerender/static-corpus`
(`vertical-metrics.mjs`, `register.mjs` : `registerOf`, `leadOf`, `gapOf`, colonne `leading`
obligatoire des directions).

## 2. Le but

**À la fin, `chart-video` et le format vidéo de `map-beat` produisent n'importe quel type du
catalogue, sur n'importe quel sujet, au niveau de qualité du statique.** Le critère n'est pas
qu'une preuve existe par type : c'est qu'un agent qui suit le skill, sur un sujet qu'il n'a jamais
vu, produise une vidéo dirigée qui tient dans les trois directions.

Les preuves `proof/video-<type>/` servent à ça : chacune est produite **en suivant le skill**, et
chaque défaut trouvé à la validation remonte **dans le skill** (doctrine, fiche de type, seed,
garde), jamais seulement dans la preuve.

Tous les types du catalogue passent en vidéo : si un sujet peut être produit en statique, il peut
l'être en vidéo.

## 3. Ce que la vidéo reprend du statique, et ce qu'elle refait

**Repris, identique** — ce qui fait qu'un même sujet se reconnaît d'un export à l'autre :

- la direction : ground, accent, jeu de traits, familles par rôle et leurs ladders, graisses,
  italique, approche, casse, rôle d'encre ;
- la précision : taille déposée lue en hauteur de capitale (`registerOf`), interligne en
  coefficient de la hauteur naturelle de la police (`leadOf`, `gapOf`), couverture de glyphes,
  planchers de contraste (`adjustToContrast` à 4,5:1 texte, 3:1 non-texte) ;
- les traitements que l'arbitre déclare applicables au beat (`beatFacts`, `applicableTreatments`) ;
- les données gelées et le message confirmé.

**Refait pour la vidéo** — le même sujet, pas le même rendu :

- **Les tailles** partent du tableau vidéo (`shared/chart-video/sizes.mjs`), pas du cadre 960×540
  lu dans une colonne d'article : plancher 30 px en paysage, 36 px en carré et portrait, bande sûre
  en portrait. Règle initiale : taille dessinée = taille résolue par `registerOf` × `typeScale` de la
  ligne ; `assertTypeFloor` mesure le rendu et refuse sous le plancher. Cette règle est vérifiée sur
  le pilote et corrigée là si elle ne tient pas.
- **Le texte** est réécrit pour être lu dans le temps : titre court, pas de paragraphe de limites,
  source courte ; le volume est borné par le temps de lecture de la tenue. Chaque direction garde sa
  hiérarchie de registres (eyebrow, display, body, axis, annot, value).
- **La composition** est recomposée pour le cadre vidéo, zones sûres comprises. Ce n'est pas le
  layout statique animé.
- **La narration** est l'ordre du contrat de timing — `establish`, `reference`, `reveal`, `subject`,
  `conclusion`, `hold` — écrit à partir du message confirmé, sous `motion-grammar.md`. La doctrine
  n'est pas modifiée par avance ; si une validation montre qu'elle bride un type, l'amendement est
  décidé avec le propriétaire et écrit dans la doctrine avant d'être appliqué.

## 4. Architecture

### 4.1 La frontière Bun / Chrome

Le statique mesure dans Bun (resvg, `registerOf`, `measureTextBand`), et ces modules ne
s'embarquent pas dans un bundle Remotion. Donc :

**Dans Bun, le script de rendu du beat**, une fois par direction :

1. `readDirection` → `resolveDirectionFamilies(direction, textPerRegister)` sur le texte que la
   vidéo affichera ;
2. `composeDirections` + `report`, imprimé comme en statique ;
3. `beatFacts` → `applicableTreatments` ;
4. les six registres résolus par `registerOf` / `leadOf` / `gapOf`, mis à l'échelle de la taille
   vidéo (§3) et réduits en objets de dessin par la couture (§4.2) ;
5. les couleurs dérivées de la direction (`deriveFurniture`, `adjustToContrast`) ;
6. les faces de **toutes** les familles × graisses des registres, embarquées en octets
   (`videoFaces`, étendu d'une pile unique à une liste de familles, toujours par
   `embeddedWebFaces`) ;
7. `writeRenderProps` : les octets dans un fichier temporaire, le fichier de props commité sans
   base64.

**Dans Chrome, la composition** écrite pour ce beat :

- elle ne dessine rien avant ses faces (`useEmbeddedFaces`) et relit chaque frame contre elles ;
- elle mesure ses retours à la ligne et ses gouttières avec `measureText` dans ces faces (mêmes
  octets, donc même chasse que ce qui est peint) ;
- elle ne tape **aucune** taille, graisse, interligne, écart de bloc ni couleur : tout vient des
  registres et de la direction reçus en props ;
- ses fenêtres d'animation dérivent de son contrat de timing (`progressOf`, `checkTiming`).

### 4.2 La couture registre → dessin

`skills/chart-video/scripts/video-registers.mjs` (portée dans `map-beat` par copie `// twin/`) :
un registre résolu devient `{ fontFamily, fontSize, fontWeight, fontStyle, letterSpacing,
textTransform, lineHeight, fill }`. **`lineHeight` est porté** : c'est le défaut silencieux que la
couture web `shared/design-base/web.mjs` a encore (le `leading` y est jeté). La couture passe par
`registerOf` et ne lit jamais `.leading` directement — la garde de la session statique fait échouer
toute source qui le fait hors des trois modules autorisés.

Elle vit dans le skill, pas dans `shared/` : rien à annoncer aux autres sessions.

### 4.3 Les cartes

Le format vidéo de `map-beat` passe par le tronc `shared/map-beat/`, relu et figé : plan validé
(`plan.mjs`), teintes mesurées (`plateTints`), style transformé et appliqué (`style.mjs`), marques
cuites en couches à la taille dessinée, noms de faces MapTiler par suffixe (`maptilerFace`, jamais
une famille nue, qui revient en Noto Sans). Une caméra qui bouge n'est admise que sur une plaque
cuite unique (`geo-discipline.md`). Si un besoin du format vidéo exige de toucher au tronc, il est
annoncé aux autres sessions avant d'être commencé, avec les fichiers exacts, et toutes les copies
portées sont mises à jour dans le même commit.

### 4.4 La preuve par type

```
proof/video-<type>/
  BRIEF.md                 type, sujet, message confirmé, format video, size landscape
  PALETTE.md
  data.csv                 les données du beat statique dirigé du même type
  Directed<Type>Video.tsx  la composition
  Root.tsx, index.ts       l'enregistrement Remotion
  timing-contract.ts       + timing.test.ts
  render-directions-video.mjs
  renders/creme.mp4  renders/nocturne.mp4  renders/rapport.mp4
  renders/<direction>-props.json
```

Même sujet et mêmes données que `proof/static-<type>/`, pour que les exports se comparent. Taille
livrée : paysage 1920×1080 ; le carré et le portrait restent rendables par `--size` et entrent dans
le périmètre quand un type est validé en paysage.

Quand un type est validé, son ancienne vidéo est retirée de `proof/` et la colonne vidéo de
`CATALOGUE.md` et de `MATRIX.md` est mise à jour.

### 4.5 Ce que gagne le skill

- **`chart-video/SKILL.md`** : une section « design base » au niveau de `chart-beat` (rendre dans
  chaque direction, toute couleur dérivée de la direction, tout chiffre reproductible des données),
  la frontière Bun / Chrome, la couture, les contraintes vidéo, le cycle de validation. Les passages
  périmés sont corrigés (Remotion est dans le root template ; le seed a sa taille en dur).
- **`chart-video/references/types/<type>.md`** : une fiche vidéo par type, propre au skill (un skill
  ne lit pas les fichiers d'un autre) — ce que le type garde, retire ou transforme en vidéo, l'ordre
  de sa narration, ce qui a cassé à la validation.
- **`map-beat/references/types/<type>.md`** : une section vidéo dans chaque fiche de carte existante.
- **Le seed** devient dirigé : il montre le câblage complet (directions, couture, faces, contrat).

## 5. Le cycle de validation, par type

1. Lire le beat statique dirigé du type, sa fiche, et la fiche vidéo si elle existe.
2. Produire `proof/video-<type>/` en suivant le skill.
3. Rendre la dernière frame de chaque direction, la regarder ; puis les trois mp4.
4. Extraire au moins quatre frames par mp4 (pendant la base, pendant la révélation, à l'arrivée du
   sujet, la tenue) et les regarder : fonte, planchers, rien de rogné, l'accent jamais avant sa
   preuve, la tenue lisible.
5. Ouvrir **seulement** les trois mp4 pour le propriétaire.
6. Il valide, ou le défaut est corrigé **dans le skill** puis le type est re-rendu.
7. Commit à pathspec explicite ; catalogue et matrice à jour ; ancienne vidéo retirée.

Un type à la fois. On n'accélère que quand le propriétaire le dit.

## 6. L'ordre

1. **Pilote : choroplèthe.** Il construit tout : section design base, couture, faces multi-familles,
   rendu par direction, tronc carte, fiche vidéo.
2. **Les sept autres cartes** : cartogramme, contours, densité de points, flux, hexagones,
   localisateur, symboles proportionnels.
3. **Les 32 charts, par famille de mouvement :**
   - le temps : line, area, streamgraph, slope, bump, connected scatter, calendar heatmap, gantt ;
   - les grandeurs : bar and column, grouped bar, lollipop, bullet, diverging bar, waterfall,
     population pyramid, dumbbell ;
   - les distributions : histogram, box plot, beeswarm, dot strip, scatter ;
   - les parts : stacked bar, diverging stacked bar, pie and donut, treemap, marimekko, pictogram,
     sankey ;
   - le reste : heatmap, radar, parallel coordinates, small multiples.

## 7. Gardes et vérification

- Chaque garde nouvelle est vérifiée par mutation : la mutation qui la fait rougir est nommée et
  lancée.
- Gardes existantes à faire tenir sur chaque preuve : `assertDeliveredSize` (mp4 par ffprobe),
  `assertTypeFloor`, `assertTypeMayEnter`, `assertWithinStage` en portrait, `checkTiming`,
  `video-first-frame-not-empty`, `video-handover-is-a-cut`, `video-helper-parity`,
  `carried-copies`, `no-cross-skill-imports`.
- Garde nouvelle attendue : une composition dirigée ne tape ni taille, ni graisse, ni interligne, ni
  couleur (le pendant vidéo de `a-directed-layout-types-no-leading`).
- Tests ciblés uniquement ; jamais `bun run test` complet sauf demande (consigne de coût de
  `KNOWN-STATE.md`).
- **Une suite verte ne valide rien** : la validation est le regard sur les frames puis celui du
  propriétaire sur les mp4.

## 8. Dépendances et coordination

- **Fusion de `rerender/static-corpus` dans `main`**, puis rebase de `quality/video`, avant de
  produire le pilote. Rien n'est construit contre `registerOf` avant qu'il ait atterri.
- **`shared/` n'est à personne** : tout changement du tronc est annoncé avant d'être commencé, avec
  les fichiers exacts, et ses copies portées sont mises à jour dans le même commit.
- Territoire de cette session : `skills/chart-video`, le format vidéo de `map-beat` (assets vidéo,
  sections vidéo des fiches, scripts vidéo), `proof/video-*` et les anciennes vidéos qu'ils
  remplacent.

## 9. Déjà sur la branche

- `ec9946b1` — `video-faces.mjs`, `embedded-faces.ts`, `face-coverage.ts` : les octets de la face
  entrent dans Chrome, et une frame dont un caractère, une graisse ou une famille n'est pas couvert
  annule le rendu. Réutilisé tel quel, étendu aux familles multiples.
- `bd9168aa` — `writeRenderProps` : props commitées sans octets.
- `808d0293` — le bloc Latin-1 imprimable est toujours embarqué : une composition tape des mots que
  les props ne contiennent pas.
- Les deux anciennes vidéos migrées dans ces commits (`vidx-line-life-expectancy`,
  `life-expectancy`) seront retirées quand leur type sera validé en version dirigée.

## 10. Hors périmètre, nommé

- Une vidéo regardée verticale dans un fil (plancher à 64 px) : jamais regardée, pas supposée.
- `wrap` coupe avant un tiret cadratin (27 copies tenues à l'identité) : chantier séparé.
- Son, voix off, sous-titres : aucun skill ne les porte ; hors de cette passe.
- Le scrolly et le web : leurs sessions.
