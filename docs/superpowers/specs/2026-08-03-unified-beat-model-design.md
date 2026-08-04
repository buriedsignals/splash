# Le modèle de beat unifié — sous-projet ②

**Date** : 2026-08-03 · **Statut** : conçu, à valider par Rémy, non implémenté
**Parent** : `docs/superpowers/specs/2026-08-03-editorial-storyboard-design.md` § 7 ②
**Dépend de** : ① (le vocabulaire des gestes), fusionné le 2026-08-03.

## 1. Ce que le sous-projet devait être, et ce qu'il est vraiment

La spec parapluie annonçait : « les quatre propriétés + la durée, `suggéré`/`confirmé` séparés,
`unauthoredBeats` re-fondé sur la confirmation ».

**La moitié existe déjà, et mieux faite que la spec ne l'imaginait.** Mesuré le 2026-08-03 :

- Le beat de la boucle porte **`text` ET `draftText`** séparément (`lib/loop/manifest.ts:191-198`),
  plus un `beatSource`. La machine écrit `draftText` (`lib/brain/beats.ts:270`), le journaliste écrit
  `text`.
- **Le verrou fonctionne et bloque réellement la production** : `unauthoredBeats`
  (`manifest.ts:662-666`) liste les beats dont `text` est vide ; `produce.ts:173` le consulte avant de
  produire et `manifest.ts:784` route l'élément vers `author-beats` tant qu'il en reste. Trois lecteurs,
  un mécanisme, avec un commentaire disant qu'ils ne peuvent pas diverger.
- Finesse que la spec n'avait pas : pour un scrolly d'images, `draftText` est **délibérément vide**
  (`beats.ts:320`) — « la valeur honnête plutôt qu'une valeur manquante », parce que Splash ne légende
  pas les photos de quelqu'un d'autre.

**Donc ce sous-projet n'a pas à construire la séparation suggéré/confirmé. Il a à faire deux autres
choses**, et la seconde est la cause racine de toute la session du 2026-08-02/03.

## 2. Le vrai défaut : deux modèles de beat qui ne se parlent pas

| | beat de la BOUCLE | beat des CARTES |
|---|---|---|
| déclaré | `lib/loop/manifest.ts:191-198` (zod, persisté) | `skills/map-native/src/map-arc.ts:29-35` |
| identité | `id` | **aucune** |
| ancre | `{kind: "x" \| "category", value}` | `region` (+ `lon`/`lat` optionnels) |
| texte | `text` **requis** | `text?` **optionnel** |
| brouillon | `draftText` | **aucun** |
| provenance | `beatSource` | **aucune** |
| porté par la boucle | oui | **NON** — zéro occurrence de `arcBeats` dans `lib/loop` |

**Le beat des cartes n'a rien de ce qui rend une étape éditoriale possible** : pas de brouillon donc
rien à proposer, pas de texte obligatoire donc rien à verrouiller, pas de provenance donc aucune trace
de qui a écrit quoi.

> **C'est la cause racine.** Le storyboard de carte a été construit comme un **champ de configuration**
> parce que son modèle de beat n'avait pas de quoi être autre chose. Toutes les conséquences trouvées le
> 2026-08-02/03 en découlent : `cameraMode: "simple"` qui jette le storyboard des sept types, les huit
> composants d'un genre entier orphelins, l'arc de route qui n'atteint aucun livrable.

## 3. Le deuxième manque : le beat ne dit pas ce qui bouge

La grille validée par Rémy donne quatre propriétés par beat, plus une pour la vidéo :

| propriété | état |
|---|---|
| **ancre** | existe, mais dans deux vocabulaires incompatibles (§ 2) |
| **texte** | existe, avec brouillon et verrou (§ 1) |
| **déplacement** | **manque** |
| **animation** | **manque** |
| **durée** (vidéo) | **manque** |

Le sous-projet ① a livré le vocabulaire dans lequel ces trois-là doivent s'exprimer : dix gestes
fermés, quatre genres narratifs, et une déclaration par moteur de ce qu'il sait faire bouger
(`lib/core/gestures.ts`, `EngineType.gestures`).

## 4. La conception

### 4.1 Une ancre qui couvre les deux mondes

```ts
anchor: {
  kind: "x" | "category" | "region" | "place";
  value: string;          // la valeur telle que le journaliste la nomme
  lon?: number;           // `place` uniquement — une grille hexagonale n'a pas de noms
  lat?: number;
}
```

`x` et `category` sont les ancres existantes des graphiques ; `region` remplace le `region: string` des
cartes ; `place` porte le cas hex-grid, seul type dont les unités n'existent pas avant le binning.
**Aucune valeur existante ne change de sens** — c'est un élargissement, pas une réattribution (la leçon
de la migration `scrolly`→`stepped` : deux valeurs valides, une migration à moitié faite ment en
silence).

### 4.2 Le mouvement et l'animation, tirés du vocabulaire déclaré

```ts
movement?: Gesture;       // comment on arrive à ce beat depuis le précédent
animation?: Gesture;      // ce qui bouge une fois le cadre tenu
durationMs?: number;      // vidéo uniquement — le scroll du lecteur remplace ça
```

**Optionnels, et validés contre la déclaration du moteur cible**, pas contre le vocabulaire entier :
un `fly` sur un graphique doit être refusé au moment où le beat est composé, pas au produce. C'est la
fonction n°3 du storyboard selon Rémy — « s'assurer que ça rentre dans ce qu'on sait produire ».

`durationMs` n'a de sens que pour un genre avancé par le temps (`story`, `stepped`, `reveal`) ; un
`scrolly` est avancé par le lecteur. Le validateur doit le refuser sur un `scrolly` plutôt que de
l'ignorer.

### 4.3 Ce que les cartes gagnent

L'intention : le beat de carte cesse d'être une structure à part et devient le beat de la boucle — il
gagne `id`, `draftText`, `beatSource`, un `text` requis, donc il devient **proposable, verrouillable et
traçable**.

> **★ CORRECTION (2026-08-04, revue de fin de branche) — la version précédente de cette section
> affirmait qu'un beat de carte ne pouvait fournir NI `id`, NI `draftText`, NI `beatSource`. **Les trois
> affirmations sont fausses** — le chemin chart-native les contredit chacune, et la vraie raison de
> s'arrêter est ailleurs. `MapArcBeat` reste inchangé, délibérément — mais pas pour ces motifs-là.
>
> - **`id`** — `lib/brain/beats.ts:278` assigne déjà un id **positionnel** (`beat-${i + 1}`), exactement
>   le même schéma que ce qu'un beat de carte recevrait — l'id encode l'ordre, pas une identité propre
>   à la donnée (`:66-67`, le commentaire de `SuggestedBeat.id` le dit explicitement). Même chose pour
>   les beats d'image (`:328`). Rien n'empêche un beat de carte d'en recevoir un identique.
> - **`draftText`** — `lib/brain/beats.ts:331` émet déjà `draftText: ""` pour les beats d'image, et le
>   commentaire à `:300-302` l'assume explicitement : *"the honest value rather than a missing one"*
>   (un beat qui n'est **jamais** rédigé par la machine — cas déjà réel pour l'image, et vrai aussi pour
>   la carte — a une valeur honnête à donner : la chaîne vide, pas une absence de champ).
> - **`beatSource`** — le dériveur existe déjà et n'est pas spécifique au chart : `sharedFacts(nativeType,
>   values: number[])` (`:343-371`) ne prend **ni colonnes ni axe**, seulement un `number[]` brut. Et
>   `skills/map-native/src/map-story.ts:265` construit déjà `valueByKey` (région → valeur) — exactement
>   la série numérique dont `sharedFacts` a besoin. Câbler `beatSource` pour une carte n'est donc pas une
>   capacité à inventer, c'est un appel à brancher, pour les types dont l'ancre est déjà une clé connue
>   d'avance (choropleth, symbol, locator, cartogram, dot-density). **Réellement dur seulement pour
>   `route` et `hex-grid`**, dont l'ancre se calcule au moment du produce (`resolveRouteArc`,
>   `resolveHexGridArc`) et n'existe donc pas encore quand `beatSource` devrait être assemblé.
>
> **Et l'omission décisive, qui rend ces trois questions non pertinentes pour CE lot** :
> `beatsFor` (`lib/loop/assemble/brief.ts:6-14`) réduit déjà le beat UNIFIÉ à
> `BriefBeat = {x?, category?, role, text}` avant qu'aucun moteur ne le voie — **chart-native lui-même ne
> reçoit jamais `id`, `draftText` ni `beatSource` non plus.** Le flux va toujours unifié→moteur, jamais
> moteur→unifié : aucun site qui construit un `MapArcBeat` n'est donc jamais sollicité pour *fournir* ces
> trois champs — ils sont produits en amont (par le cerveau ou le journaliste), jamais dérivés À PARTIR
> d'un beat de carte. La version précédente posait la question à l'envers.
>
> **Correction annexe** : « les 67 sites non-test sont tous du pass-through » est également faux pour une
> petite poignée (~5) de fichiers non-test qui **lisent** des champs du beat, plutôt que de le
> traverser sans le regarder : `map-story.ts:101-119` (`applyMapArc` lit `.region`/`.text`/`.role`),
> `map-arc.ts:63-65` (`mapArcErrors` lit `.region`), `route-story.ts:63-66` (`resolveRouteArc` lit
> `.region`/`.text`), `hex-grid-story.ts:97-120` (`resolveHexGridArc` lit `.lon`/`.lat`/`.region`/
> `.text`/`.role`), `validate-config.ts:906-925` (lit `.region`/`.lon`/`.lat`). Ça ne change pas le
> verdict : ces lecteurs consomment des champs que `MapArcBeat` a déjà (`region`/`text`/`role`/`lon`/
> `lat`) — aucun n'a besoin d'`id`, `draftText` ou `beatSource`.
>
> **Le vrai blocage, qui tient toujours** : rendre `role` et `text` obligatoires (ce que le schéma
> unifié fait déjà — `NarrativeBeatSchema`, aucun des deux n'est `.optional()`) **rejetterait des plans
> légitimes d'aujourd'hui** — les plans « ancre seule, aucun arc revendiqué »
> (`lib/core/claim-arc.ts:16`, `MapArcBeat.role`/`.text` sont `?` sur l'interface actuelle,
> `map-arc.ts:29-34`). C'est un changement de comportement, pas un renommage.
>
> **La décision de s'arrêter reste la bonne** — mais pour la vraie raison : **l'adaptateur n'a pas
> d'appelant.** La projection descendante (beat unifié → `MapArcBeat`) serait triviale et sans perte,
> mais rien n'appelle dans ce sens aujourd'hui ; l'écrire maintenant serait du code mort spéculatif sur
> une frontière que ce lot s'interdit de câbler. Un adaptateur sans appelant est une dette qui a l'air
> d'un progrès — le plan permet explicitement de s'arrêter là (§5).
>
> **Ce que ③ hérite réellement** : très majoritairement du **réemploi** — `sharedFacts` et le schéma
> d'id positionnel s'appliquent tels quels à choropleth/symbol/locator/cartogram/dot-density, la même
> route déjà prouvée côté chart. Le seul travail neuf et réellement dur est pour **`route` et
> `hex-grid`**, dont l'ancre n'existe qu'au produce — c'est là, et seulement là, que ③ doit construire
> quelque chose de nouveau avant de pouvoir proposer un storyboard pour ces deux types.

## 5. Ce que ce sous-projet NE fait pas

- **Il ne construit pas l'étape de proposition** — c'est ③. Ici on rend le modèle capable de la porter.
- **Il ne câble aucun composant** — c'est ④. Les sept `*Reveal` continuent d'ignorer les beats après ce
  lot ; ce qui change, c'est qu'ils auront enfin quelque chose de complet à lire.
- **Il n'ajoute aucun geste** au vocabulaire de ①.

## 6. Le risque principal, et comment il se traite

**Le schéma du manifeste est persisté et versionné.** Élargir l'ancre et ajouter trois champs impose un
bump `6 → 7` et une migration. Le bump `5 → 6` du 2026-08-03 a montré le coût d'un raté : un manifeste
d'hier levait sans être rattrapé, crash du producteur, parce que le champ neuf était `.optional()` mais
que le garde, lui, était obligatoire.

**Donc, non négociable pour ce lot :**

1. Les trois champs neufs sont **optionnels** — un manifeste v6 reste lisible.
2. `migrateV6toV7` est **total** : testé sur un manifeste sans `narrative`, un run graphique, un run
   carte, un run image, et un manifeste v6 portant déjà des beats.
3. **Aucun garde n'exige un champ neuf** tant que ③ ne le produit pas. Un lot qui rend obligatoire ce
   que rien n'écrit encore casse tous les runs existants.
4. Le chaînage v4→v5→v6→v7 est vérifié, pas supposé.

## 7. Preuve

- **Par mutation, obligatoire** : un beat dont `text` est vide doit **bloquer la production** (le verrou
  existe — le pinner contre la régression, puisque ce lot touche son voisinage) · un `movement` absent
  de la déclaration du moteur cible doit être **refusé à la composition** · un `durationMs` sur un
  `scrolly` doit être **refusé**.
- **Par migration** : un manifeste v6 réel migre et produit encore ; un manifeste sans `narrative`
  traverse sans être altéré.
- **Aucune preuve rendue n'est requise** : ce lot ne change aucun pixel. Si un rendu change, c'est un
  défaut.
