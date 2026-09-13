# L'interligne suit la police et la taille dessinées

**Statut :** implémentée sur `rerender/static-corpus` (plan `docs/superpowers/plans/2026-09-13-adaptive-leading.md`). Non fusionnée.
**Branche :** `rerender/static-corpus`.
**Décisions du propriétaire enregistrées ici :** l'invariant est la hauteur naturelle de la police
(§2.1) ; le coefficient vit dans chaque direction (§2.2) ; il est calibré sur l'existant (§4) ; les
écarts entre blocs suivent le même mécanisme (§2.3) ; le périmètre est le tronc et les 40 beats
statiques (§7).

---

## 1. Le problème, mesuré

La taille d'un registre est adaptative en deux étages. Une taille déposée est lue comme une hauteur
de capitale sur la tête de ladder de son rôle, puis résolue pour la face réellement dessinée
(`capRatioOf`, `registerOf`, dans `DirectedChoroplethMap.tsx` seulement). Et l'échelle d'un titre
peut échanger de la taille contre de la forme, jusqu'à un plancher.

L'interligne, lui, ne suit rien :

- **Coefficients figés, recopiés.** Il est tapé dans chaque composant, en multiple de la taille :
  `display.fontSize * 1.22` et `body.fontSize * 1.45` 38 fois chacun, `annot.fontSize * 1.4`
  20 fois. Les écarts entre blocs pareil : `eyebrowReg.fontSize * 0.9`
  38 fois, `body.fontSize * 0.6` 17 fois.
- **Aucune direction ne le dépose.** `docs/design-base/directions/*.md` porte taille, graisse,
  italique, approche, casse et encre, pas d'interligne.
- **Le choroplèthe va à contre-sens.** Il cale l'interligne sur la taille *déposée*
  (`DirectedChoroplethMap.tsx:311-318`), si bien qu'un titre rétréci garde l'interligne de sa taille
  d'origine.

Mesurée dans les fichiers, la hauteur naturelle d'une ligne va de **1.149 em (Ubuntu) à 1.424 em
(Source Sans 3)** sur les ladders. Sur les trois têtes de rôle :

| face | hauteur naturelle | hauteur d'x | capitale |
| --- | ---: | ---: | ---: |
| Merriweather | 1.257 | 0.555 | 0.743 |
| Open Sans | 1.362 | 0.535 | 0.714 |
| Montserrat | 1.219 | 0.525 | 0.700 |

Un titre Merriweather à `1.22` est donc plus serré que la ligne naturelle de sa face ; un titre
Montserrat en capitales à `1.22` est pile sur la sienne. Rien ne se touche aujourd'hui, par
coïncidence de coefficient.

## 2. Les décisions

### 2.1 L'invariant : la hauteur naturelle de la face dessinée

`lead = hauteurNaturelle(face) × leading × tailleDessinée`

La hauteur naturelle est lue dans le `.ttf` que rend `typefaceFile()`, selon **la règle des
navigateurs** : `OS/2 sTypoAscender − sTypoDescender + sTypoLineGap` si le bit 7 de `fsSelection`
(`USE_TYPO_METRICS`) est posé, `hhea ascender − descender + lineGap` sinon. C'est ce que produit
`line-height: normal` en CSS, donc le genre web s'alignera sans conversion le jour où il adopte ce
mécanisme.

Mesuré sur les 17 familles du cache : partout où le bit est posé, typo et hhea sont égaux ; `win`
diverge souvent (Merriweather 1.257 contre 1.732) et n'est jamais lu. Là où le bit n'est pas posé,
typo et hhea divergent : Roboto 1.050 contre 1.172, Ubuntu 1.017 contre 1.149. **C'est hhea qui fait
foi**, et c'est ce que le test garde.

La taille est la taille **dessinée** : un titre que l'échelle rétrécit de 10 % resserre son
interligne de 10 %.

### 2.2 Le coefficient vit dans la direction

La table des registres gagne une neuvième colonne, `leading`, sans unité : le multiple de la
hauteur naturelle. Chaque direction garde ainsi son rythme propre, comme elle garde son approche.

### 2.3 Les écarts entre blocs sont des multiples d'interligne

`gapOf(r, n) = n × leadOf(r)`, sur le registre qui porte déjà l'écart aujourd'hui. Aucun `n` n'est
une colonne de direction : les écarts actuels sont identiques dans les trois directions, et §4 montre
qu'ils restent indépendants de la direction une fois calibrés.

Un `n` est une **constante du tronc** quand l'écart est uniforme dans tout le corpus — relevé le
2026-09-13 : eyebrow → titre (`eyebrowReg.fontSize * 0.9`, 38 composants sur 38) et lecture → source
(`annot.fontSize * 0.6`, 9 sur 9). Ailleurs, les écarts varient d'un composant à l'autre parce qu'ils
portent la place que *ce* graphique réserve à ses étiquettes (titre → chapô à 0.6, 0.7 ou 0.8 ;
chapô → tracé de 1.1 à 3.0). Ceux-là gardent un `n` **propre au composant**, mais exprimé en
interlignes : ils deviennent adaptatifs sans que rien ne bouge. Les unifier est une décision de
composition, pas d'interligne, et reste hors de ce chantier.

## 3. L'architecture

### 3.1 `shared/design-base/vertical-metrics.mjs` (nouveau)

`naturalLineHeightOf(family, weight, { italic })` → nombre en em.

- Lit le fichier que rend `typefaceFile(family, weight, { italic })`.
- Parse `head` (`unitsPerEm`), `hhea` et `OS/2` ; applique §2.1.
- Mis en cache par `family|weight|italic`.
- Aucun import de resvg : c'est une lecture de tables. Il importe `typefaces.mjs`, qui peut lancer
  `curl` sur un cache froid, donc `scripts/test-lanes.mjs` range ses tests dans la voie lourde.
- Nouveau fichier plutôt qu'ajout à `typefaces.mjs`, que l'autre session vient de modifier
  (`de112dff`).

### 3.2 `shared/design-base/read-direction.mjs`

La ligne de registre passe de 8 à 9 cellules : `… | case | ink | leading |`. La valeur va dans
`registers[name].leading`. Un nouveau champ `leadingSource` dit si les valeurs sont `chosen` ou
`measured`.

### 3.3 `shared/chart-beat/registers.mjs`

`resolveRegister` renvoie en plus `leading`. Un registre d'appareil dérivé (`axis` depuis `body`)
hérite du `leading` de sa source, comme il hérite de sa famille. L'ajout d'un champ ne change rien
pour les consommateurs existants, web compris.

**`leading: null` reste légal ici**, pour une direction construite en code sans passer par le parser
— même forme que `derivedFrom: null`. `resolveRegister` a 52 appelants, dont la plupart ne lisent
jamais d'interligne ; refuser à cet endroit les ferait tous échouer pour une valeur qu'ils ignorent.
Le refus vit chez **le consommateur qui calcule** : `registerOf` lève, en nommant la direction et le
registre. Règle : un code qui fait de l'arithmétique avec un interligne passe par
`registerOf` / `leadOf`, ou refuse `null` au point d'usage. Une garde le tient (§5.2).

### 3.4 `shared/design-base/register.mjs` (nouveau)

`registerOf(direction, name)` et `capRatioOf(family, weight)` quittent `DirectedChoroplethMap.tsx`.

Retour : tout ce que `registerOf` rend aujourd'hui (`fontSize` résolu par la capitale, `filedSize`,
`referenceFamily`, `letterSpacing`, `fill`), plus :

- `naturalLineHeight` — celle de la face dessinée, pour qu'un rapport puisse la citer ;
- `lineHeight` — `naturalLineHeight × leading`, en em.

Et deux fonctions, pas des méthodes :

- `leadOf(r) = r.lineHeight × r.fontSize` — §2.1 ;
- `gapOf(r, n) = n × leadOf(r)` — §2.3.

**Des fonctions, parce qu'un registre se recopie.** Le choroplèthe essaie son titre à plusieurs
tailles en écrivant `{ ...display, fontSize }`. Une méthode `lead` calculée à la résolution
garderait l'ancienne taille dans la copie ; une fonction lit la taille de l'objet qu'on lui tend.

Constantes exportées : `EYEBROW_TO_DISPLAY` (0.75 interligne d'eyebrow) et `READING_TO_SOURCE`
(0.4286 interligne d'annotation) — les deux écarts uniformes de §2.3.

`registerOf` n'est **pas** réexporté par `index.mjs` : il importe resvg, et `index.mjs` est lu par
des tests de la voie rapide.

**Quatre consommateurs.** Le propriétaire a décidé (2026-09-13) que web, vidéo et scrolly adoptent
aussi l'interligne adaptatif. `lineHeight` est un multiplicateur SANS UNITÉ : exactement la valeur
d'un `line-height` CSS sans unité (le navigateur le multiplie par la taille de l'élément, il s'hérite
comme un ratio) ; `naturalLineHeight` est lu par la règle des navigateurs, donc égal à
`line-height: normal` pour le même fichier ; `leadOf` est la commodité en px pour un layout qui pose
ses lignes lui-même (resvg, Remotion à la main). `registerOf` mesure la capitale par resvg : l'appeler
en node au moment d'émettre, jamais dans la page.

### 3.5 Les copies portées

Les deux nouveaux modules, `read-direction.mjs` et `registers.mjs` sont portés dans
`skills/splash/assets/root-template/shared/…`, et partout où `carried-copies.test.ts` trouve déjà
une copie d'un fichier modifié. L'identité à l'octet reste la règle.

## 4. Le calibrage

**But : aucun changement visuel sur les faces de tête.** Pour chaque direction et chaque registre :

`leading = multiplicateurHérité ÷ hauteurNaturelle(tête du rôle)`, arrondi au dix-millième.

Multiplicateurs hérités : `display 1.22`, `body 1.45`, `annot 1.4`. `eyebrow`, `axis` et `value`
n'ont pas d'interligne multi-ligne commun dans le corpus ; ils prennent `1.2`, pour que les écarts
mesurés sur eux restent exprimables.

| registre | creme | rapport | nocturne |
| --- | --- | --- | --- |
| display | serif → 1.22 ÷ 1.257 = 0.971 | serif → 0.971 | geometric → 1.22 ÷ 1.219 = 1.001 |
| eyebrow | sans → 1.2 ÷ 1.362 = 0.881 | sans → 0.881 | geometric → 1.2 ÷ 1.219 = 0.984 |
| body | sans → 1.45 ÷ 1.362 = 1.065 | serif → 1.45 ÷ 1.257 = 1.154 | sans → 1.065 |
| axis | sans → 0.881 | sans → 0.881 | geometric → 0.984 |
| annot | serif → 1.4 ÷ 1.257 = 1.114 | sans → 1.4 ÷ 1.362 = 1.028 | geometric → 1.4 ÷ 1.219 = 1.148 |
| value | sans → 0.881 | sans → 0.881 | geometric → 0.984 |

Les valeurs finales sont recalculées sur les fichiers au moment de l'implémentation, pas recopiées
d'ici.

Puisque `lead ÷ taille` vaut le multiplicateur hérité sur la face de tête **dans toutes les
directions**, un écart hérité `k × taille` devient `n = k ÷ multiplicateur` indépendant de la
direction : `body 0.6` → `0.4138`, `eyebrow 0.9` → `0.75`, `annot 0.6` → `0.4286`.

**Écart connu : quatre interlignes atypiques.** Un seul coefficient par registre ne peut pas
reproduire un interligne qu'un composant a tapé à part. Relevé le 2026-09-13 :

| composant | aujourd'hui | devient |
| --- | --- | --- |
| `co2-suisse` | `lead = display.fontSize * 1.25` | `leadOf(display)` (1.22) |
| `co2-suisse` | `bodyLead = body.fontSize * 1.5` | `leadOf(body)` (1.45) |
| `more-boxplot-france-co2-decades` | `nameLead = annot.fontSize * 1.5` | `leadOf(annot)` (1.4) |
| `static-bar-top-emitters-2024` | `nameLead = annot.fontSize * 1.2` | `leadOf(annot)` (1.4) |

Ces trois beats bougent visiblement ; chacun est regardé (§5.3).

**Pas migrés : les interlignes mesurés à l'encre.** Sept composants posent déjà un interligne sur la
bande d'encre de la face dessinée (`axisBand.ascent + axisBand.descent + 2`, pour des listes serrées
de légende). Ils sont déjà adaptatifs et ne portent aucun coefficient littéral ; les passer sur la
hauteur naturelle desserrerait ces listes. Ils restent tels quels.

## 5. Les erreurs et les tests

### 5.1 Refuser plutôt que retomber en silence

| cas | réponse |
| --- | --- |
| ligne de registre sans `leading` | lève, en nommant la direction et le registre |
| `leading` hors de `[0.7, 2.0]` | lève — attrape `145` pour `1.45` |
| `.ttf` absent, tables manquantes, `unitsPerEm` ou hauteur ≤ 0 | lève, en nommant la famille, la graisse et le style |
| registre sans tête de ladder (face concrète passée par un test) | la face est sa propre référence, comme pour la capitale |

### 5.2 Tests écrits avant le code

- **`vertical-metrics.test.ts`** — Merriweather 400 → 1.257 (branche typo) ; Roboto 400 → 1.172
  (hhea, pas typo 1.050) ; une famille absente lève.
- **`read-direction`** — une ligne à 8 cellules lève ; les trois directions déposées portent
  `leading` sur chaque registre.
- **Garde du consommateur** — un parcours de tout le code source du dépôt (hors `node_modules`,
  `.git`, `.superpowers`, et hors tests) ne trouve aucune lecture de `.leading` en dehors de
  `register.mjs`, `read-direction.mjs`, `registers.mjs` et de leurs copies portées. La population est
  dérivée du parcours, sans liste de sites connus et sans racines codées en dur.
- **`register.test.ts`** — `leadOf(r) = hauteurNaturelle × leading × fontSize` ; une copie à 90 %
  de la taille donne un interligne à 90 % ; sur chaque face de tête, `leadOf` reproduit le
  multiplicateur hérité à 0,01 px près ; un registre dérivé hérite du `leading` de sa source.
- **Garde dérivée** — dans les `Directed*.tsx` des beats qui ont un `render-directions.mjs`, aucun
  `…Lead = <registre>.(fontSize|filedSize) * <littéral>`, aucun `eyebrowReg.(fontSize|filedSize) *`,
  et aucun `(display|body|annot).(fontSize|filedSize) * <littéral>` qui suit directement un bloc de
  texte — `…Lines.length * …Lead ±`, `readingTop −`, `sourceTop −`, `annotBand.ascent −`, lus sur la
  source aux blancs normalisés. Elle parcourt l'arbre ; pas de liste d'exemptions.

### 5.3 La preuve visuelle

Re-rendre les 40 beats et comparer la **géométrie des SVG** à celle des rendus commités avant la
migration : mêmes éléments, mêmes nombres à 0,25 px près dans l’espace 960 × 540 — un demi-pixel du fichier livré, sous le seuil du visible, au-dessus du cumul des arrondis d’une colonne de blocs. Attendu :
identiques, sauf le choroplèthe (interligne sur taille dessinée) et les trois beats de l'écart connu
(§4). Tout rendu qui diffère est regardé, et listé dans le rapport de fin.

Puis : suites `fast` et `heavy`, `carried-copies` vert.

### 5.4 Statique et navigateur, mesurés plutôt que supposés

Mesuré le 2026-09-13 : un paragraphe réel de 7 lignes, les mêmes octets `.ttf` chargés par `@font-face`,
rendu par resvg (lignes de base posées à `y0 + i × leadOf`) et par Chrome 151 headless sur macOS
(`line-height: <lineHeight>` sans unité), sur les trois têtes de ladder.

1. **Distance entre lignes de base — elles concordent.** Chrome espace les lignes de
   `lineHeight × fontSize` arrondi par défaut au 1/64 px, première et dernière comprises : Open Sans
   13 px 18,844 contre 18,851 ; Merriweather italique 13 px 18,844 contre 18,849 ; Montserrat 10 px
   14,000 contre 14,000. Dérive ≤ 0,04 px à la septième ligne. resvg pose les lignes au centième.
2. **Première ligne de base depuis le haut de la boîte CSS — la formule naïve du demi-interligne est
   fausse de 0,5 à 1 px.** Chrome arrondit l'ascendante A et la descendante D au pixel avant de
   partager : décalage = `A + floor(trunc64((floor64(lh × fs) − A − D) / 2))` ; 9 cas sur 9
   (Open Sans 14,000 contre 14,469 naïf ; Merriweather 13,000 contre 14,046 ; Montserrat 10,000 contre
   10,585). **C'est une mesure sur un moteur, pas une règle à compiler** : non vérifiée sous Linux,
   sur un vrai écran Retina, dans Firefox ni Safari. Elle ne concerne **pas** le web, dont le texte est
   un flux CSS sans ligne de base imposée. Elle ne compte que là où un bloc CSS doit aligner sa première
   ligne de base sur une coordonnée explicite — un layout Remotion posé à la main, par exemple — et un
   tel genre mesure alors un repère de ligne de base sur le moteur qu'il livre.
3. **Peinture.** Chrome peint les glyphes à la ligne de base arrondie au pixel CSS (DPR 1, 2 et 8), là
   où resvg antialiase au centième : ±0,5 px d'encre par ligne, sous tout seuil de ce projet. Consigné,
   sans action.

## 6. La migration des 40 composants

Chaque `…fontSize * k` d'un `Directed*.tsx` est classé :

1. **interligne** d'un bloc de plusieurs lignes → `leadOf(r)` ;
2. **écart entre blocs de texte ou entre un bloc et le tracé**, sur `display`, `body` ou `annot` →
   `gapOf(r, CONSTANTE)` si l'écart est uniforme (§2.3), sinon `gapOf(r, k ÷ multiplicateur)` ;
3. **décalage local** → reste tel quel. C'est tout ce qui est sur `axis` ou `value` (place des
   étiquettes d'axe, cadre de l'arbitre), et tout ce qui positionne une étiquette isolée par rapport
   à une marque, une graduation ou un bord du tracé (`y=`, `y1=`, `at:`, `frame:`).

La garde de §5.2 et la preuve visuelle de §5.3 sont ce qui attrape une erreur de classement : un
élément qui bouge sans figurer dans l'écart connu est un classement faux.

Le choroplèthe importe `registerOf` du tronc et perd sa copie locale. Les composants qui
n'utilisent pas encore `registerOf` y passent, et héritent du même coup de la résolution par
capitale.

## 7. Hors périmètre

- **Genres web, vidéo, scrolly.** Ils héritent du champ `leading` de `resolveRegister`, sans
  l'utiliser. Leur migration revient à la session qui les porte.
- **Écart connu, côté web.** `shared/design-base/web.mjs` (`webRegister`, `measurable`) transforme
  `resolveRegister` en style CSS et ne pose aucun `line-height` : après ce chantier, le tronc porte un
  interligne que toute page web ignore, et les rythmes verticaux statique et web divergent sans que
  rien ne rougisse. Refermé par la passe web quand elle atteint le rythme vertical — pas ici, parce
  qu'il faut régénérer les beats web un par un.
- **Mesure de l'interligne sur les références.** Le harvester ne relève pas le `line-height` ; il
  faudrait aussi les métriques des faces de référence (Tiempos, Graphik…). Chantier à part ; en
  attendant, les valeurs sont `chosen`.
- **Espaces insécables** entre un nombre et son unité : défaut distinct, relevé au re-rendu du
  corpus.

## 8. Risques

- **La hauteur naturelle est déclarée, pas optique.** Source Sans 3 (1.424) et Lato (1.200) ont des
  gris proches mais 19 % d'écart d'interligne à coefficient égal. Sans effet sur les faces
  actuelles ; à revoir si une direction tombe sur une face aux métriques extrêmes.
- **Tronc partagé.** L'autre session touche `shared/`. Elle est prévenue avant le premier commit :
  deux fichiers ajoutés, `read-direction.mjs` et `registers.mjs` modifiés.
- **Une face plus haute que la tête de ladder peut déborder la marge de la source (choroplèthe).**
  Le ladder décide sur le rythme déposé de la face de référence (Ruling 10) ; le dessin suit la face
  dessinée. Mesuré : Noto Serif, PT Serif, Roboto Slab, Nunito débordent de 0,2 à 5,9 px ; aucune
  direction livrée n'y résout. Correctif possible (retomber sur le rythme dessiné quand le choix
  déposé déborde) = décision de composition, laissée au propriétaire.
