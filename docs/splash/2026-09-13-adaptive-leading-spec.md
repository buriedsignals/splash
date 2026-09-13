# L'interligne suit la police et la taille dessinées

**Statut :** conception approuvée en séance le 2026-09-13, spec à relire. Non planifiée, non implémentée.
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
  24 fois, `annot.fontSize * 1.2` 17 fois. Les écarts entre blocs pareil : `eyebrowReg.fontSize * 0.9`
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

`gap(n) = n × lead`, sur le registre qui porte déjà l'écart aujourd'hui. Les `n` sont des
constantes du tronc, pas des colonnes de direction : les écarts actuels sont identiques dans les
trois directions, et §4 montre qu'ils restent indépendants de la direction une fois calibrés.

## 3. L'architecture

### 3.1 `shared/design-base/vertical-metrics.mjs` (nouveau)

`naturalLineHeightOf(family, weight, { italic })` → nombre en em.

- Lit le fichier que rend `typefaceFile(family, weight, { italic })`.
- Parse `head` (`unitsPerEm`), `hhea` et `OS/2` ; applique §2.1.
- Mis en cache par `family|weight|italic`.
- Pur : aucun import de resvg. Ses tests tournent dans la voie rapide.
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

### 3.4 `shared/design-base/register.mjs` (nouveau)

`registerOf(direction, name)` et `capRatioOf(family, weight)` quittent `DirectedChoroplethMap.tsx`.

Retour : tout ce que `registerOf` rend aujourd'hui (`fontSize` résolu par la capitale, `filedSize`,
`referenceFamily`, `letterSpacing`, `fill`), plus :

- `naturalLineHeight` — celle de la face dessinée, pour qu'un rapport puisse la citer ;
- `lead` — §2.1 ;
- `gap(n)` — §2.3.

Les constantes `n` des écarts sont exportées par ce module, nommées par ce qu'elles séparent
(`EYEBROW_TO_DISPLAY`, `DISPLAY_TO_BODY`…) ; la liste exacte sort de la classification de §6.

### 3.5 Les copies portées

Les deux nouveaux modules, `read-direction.mjs` et `registers.mjs` sont portés dans
`skills/splash/assets/root-template/shared/…`, et partout où `carried-copies.test.ts` trouve déjà
une copie d'un fichier modifié. L'identité à l'octet reste la règle.

## 4. Le calibrage

**But : aucun changement visuel sur les faces de tête.** Pour chaque direction et chaque registre :

`leading = multiplicateurHérité ÷ hauteurNaturelle(tête du rôle)`, arrondi au millième.

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
direction : `body 0.6` → `0.414`, `eyebrow 0.9` → `0.75`.

**Écart connu.** `annot` porte aujourd'hui deux interlignes (`1.4` ×24, `1.2` ×17). Un seul
coefficient par registre ne peut pas reproduire les deux. Si la classification de §6 confirme que
les `1.2` sont des interlignes et non des écarts, les composants concernés prennent `1.4` et
changent visiblement ; chacun est regardé (§5).

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
- **`register.test.ts`** — `lead = hauteurNaturelle × leading × fontSize` ; un `fontSize` à 90 %
  donne un `lead` à 90 % ; sur chaque face de tête, `lead` reproduit le multiplicateur hérité à
  0,05 px près ; un registre dérivé hérite du `leading` de sa source.
- **Garde dérivée** — aucun `proof/*/Directed*.tsx` ne déclare un interligne ou un écart entre
  blocs en `…fontSize * <littéral>`. Elle parcourt l'arbre ; pas de liste d'exemptions.

### 5.3 La preuve visuelle

Re-rendre les 40 beats et comparer pixel à pixel aux rendus présents sur la branche avant la
migration. Attendu : identiques, sauf le choroplèthe (interligne sur taille dessinée) et les
composants de l'écart connu (§4). Tout rendu qui diffère est regardé, et listé dans le rapport de
fin.

Puis : suites `fast` et `heavy`, `carried-copies` vert.

## 6. La migration des 40 composants

Chaque `…fontSize * k` d'un `Directed*.tsx` est classé :

1. **interligne** d'un bloc de plusieurs lignes → `r.lead` ;
2. **écart entre blocs** → `r.gap(n)` avec une constante du tronc ;
3. **décalage local** (marge sous l'axe, décalage d'une étiquette sur sa marque) → reste tel quel.

Le choroplèthe importe `registerOf` du tronc et perd sa copie locale. Les composants qui
n'utilisent pas encore `registerOf` y passent, et héritent du même coup de la résolution par
capitale.

## 7. Hors périmètre

- **Genres web, vidéo, scrolly.** Ils héritent du champ `leading` de `resolveRegister`, sans
  l'utiliser. Leur migration revient à la session qui les porte.
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
