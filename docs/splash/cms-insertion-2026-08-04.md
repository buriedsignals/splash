# Insertion directe dans le CMS — ce qui est construit, et ce que Livingdocs demanderait

> Écrit le 2026-08-04, en fermant **C3**. Deux CMS, deux modèles d'écriture opposés, mesurés
> chacun à sa source. Le premier est livré ; le second attend une décision de Rémy, pas du code.

## 0. Le trou qui a été fermé

`embed-cms` (We.Publish) était **implémenté, mesuré contre une vraie instance, et annoncé à
l'INPUT** (« directement dans We.Publish ») depuis le 2026-07-27. Et **aucun journaliste ne
pouvait le choisir** : le menu de l'EXPORT proposait a) code source · b) HTML autonome ·
c) embed Cloudflare, et rien ne routait vers le CMS. Une capacité qu'on ne peut pas choisir n'est
pas une capacité — c'est exactement la classe de défaut que l'audit d'atteignabilité (C1)
cherchait.

Deux choses manquaient, pas une :

1. **le pont** — la forme (d) dans la proposition émise par `export-code.mjs` ;
2. **le geste lui-même** — ce qui existait écrivait un **article porteur** (`splash-<id>`), c'est-à-dire
   un hébergeur d'embed *dans* le CMS. Utile, mais ce n'est pas « l'intégrer à **leur** article ».

## 1. We.Publish — la contrainte qui décide de tout

Mesuré dans la source amont (`wepublish@main`,
`libs/article/api/src/lib/article.model.ts:203-254`) :

> `CreateArticleInput` — dont `UpdateArticleInput` hérite en n'ajoutant que `id` — déclare
> `shared`, `hidden`, `disableComments`, `blocks`, `tagIds`, `authorIds`,
> `socialMediaAuthorIds`, `properties` **NON_NULL sans valeur par défaut**, et hérite de
> `hideAuthor` / `breaking` de la même façon.

**Il n'existe aucune opération « ajouter un bloc ».** `updateArticle` est **total** : insérer un
visuel, c'est **renvoyer l'article entier**, plus un bloc.

Conséquence, et c'est la raison d'être de tout le dispositif : **tout champ qu'on ne relit pas
fidèlement est un champ RÉINITIALISÉ sur un document éditorial vivant.** Omettre `tagIds` est une
erreur de validation ; envoyer `[]` supprime silencieusement les tags de l'article. Une écriture
partielle est indistinguable d'une modification voulue.

D'où la forme du correctif — `lib/delivery/adapters/wepublish-article.ts` :

- **aller-retour total** : chaque champ que la mutation exige est relu depuis l'article et
  renvoyé tel quel (les drapeaux, `tagIds` depuis l'**article** et non la révision, `authorIds`
  depuis `authors[].id`, les `properties`, les scalaires éditoriaux) ;
- **table de blocs mesurée, pas devinée** : chaque `XBlockInput` est `OmitType(XBlock, ['type'])`
  (`block-content.model.ts` et ses voisins), la relation résolue cédant la place à son id
  (`ImageBlockInput` omet `image`, garde `imageID`). Sept types couverts — Title, RichText, HTML,
  Image, Quote, Break, IFrame ;
- **le refus est le produit** : un article portant un bloc hors de cette table **n'est pas écrit
  du tout**, et le refus nomme le type. Les ~23 autres types ne sont pas « non supportés pour
  toujours » : ce sont des types dont personne n'a mesuré la forme d'entrée, et deviner
  corromprait le bloc ;
- **on ne publie jamais** l'article du journaliste. L'article porteur appartient à Splash, donc le
  publier fait partie de le livrer. Celui-ci appartient à la rédaction : mettre un document
  éditorial en ligne est sa décision, pas un effet de bord de l'ajout d'un graphique. Le visuel
  atterrit dans le **brouillon**, et la livraison le dit (`CMS_DRAFT_ONLY`).

Les deux modes restent **exclusifs** : sans `targetArticleSlug`, le chemin porteur est inchangé,
octet pour octet (ses tests passent tels quels).

## 2. Livingdocs — le modèle inverse, et c'est une bonne nouvelle

Mesuré sur `docs.livingdocs.io` (Document Command API, version d'API `2026-07`) :

```
PATCH /api/2026-07/documents/{documentId}/commands     — scope: public-api:write
```

```json
{
  "operation": "insertComponent",
  "componentId": "doc-custom-123456",
  "componentName": "paragraph",
  "content": { "text": "…" },
  "position": {
    "parentComponentId": "…", "parentContainerName": "children",
    "previousComponentId": "…", "nextComponentId": "…"
  }
}
```

**Livingdocs a l'opération que We.Publish n'a pas.** `insertComponent` insère **un** composant, à
une **position** explicite, sans toucher au reste du document. Et `publish` est une commande
**séparée** (« can only be the last command in a request ») : par défaut une commande ne modifie
que le **brouillon** — exactement la politique que l'adaptateur We.Publish a dû s'imposer à la
main.

Ce que ça change pour nous :

| | We.Publish | Livingdocs |
|---|---|---|
| Granularité d'écriture | **article entier** (`updateArticle` total) | **un composant** (`insertComponent`) |
| Risque de destruction | réel — d'où l'aller-retour total + refus | **structurellement absent** |
| Table de types à mesurer | **~30 types de blocs** | aucune (on n'écrit que le nôtre) |
| Publication | étape explicite, qu'on s'interdit | commande séparée, brouillon par défaut |
| Position dans l'article | fin du brouillon | **`position` native** — l'ancre de `suggest-article` devient utilisable |

**Le point le plus intéressant** : l'ancre calculée par `suggest-article` (paragraphe + citation
verbatim) est aujourd'hui purement consultative — `placement.ts` l'imprime, le journaliste place à
la main. Sur Livingdocs, `position.previousComponentId` en ferait un **placement réel**. C'est le
seul endroit de la chaîne où le placement pourrait cesser d'être un conseil.

## 3. Ce qui reste à décider (Rémy)

Rien ne bloque : We.Publish — le CMS du livrable bourse, celui de Heidi.news — est livré.

1. **Fait-on Livingdocs, et quand ?** Le travail est **plus petit** que celui qu'on vient de
   faire pour We.Publish (pas de table de blocs, pas d'aller-retour total), mais il demande une
   instance et un jeton pour être mesuré au lieu d'être écrit contre la doc. Aucun code ne doit
   être écrit avant ça : la règle du projet sur les API externes est « vraies clés, vrais échecs ».
2. **Étend-on la table de blocs We.Publish ?** Aujourd'hui, un article contenant un sondage, une
   galerie, un teaser ou un embed social **refuse** l'insertion et bascule sur la forme c (un lien
   à coller). Chaque type ajouté élargit la couverture ; chacun exige d'être mesuré contre une
   instance réelle, pas déduit de la source. À arbitrer sur ce que Heidi.news utilise réellement.
3. **Le placement réel** (point ci-dessus) : si Livingdocs se fait, faut-il que l'ancre pilote la
   position, ou le visuel va-t-il en fin de brouillon comme sur We.Publish ? C'est une question
   éditoriale — « Splash place » vs « Splash propose et le journaliste place » — et la réponse
   actuelle du projet, partout ailleurs, est la seconde.
