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
- **table de blocs GÉNÉRÉE depuis le schéma publié du CMS** (`apps/api-example/schema-v2.graphql`),
  pas écrite à la main depuis les modèles TypeScript. **Le changement d'instrument n'est pas
  cosmétique** : la première table, lue sur les modèles, omettait `blockStyleName` sur les 20
  types — donc chaque bloc réécrit perdait son style, silencieusement, sur un article vivant.
  C'est exactement la réinitialisation muette que le module existe pour empêcher, et seul le
  schéma — ce contre quoi le serveur valide réellement — pouvait l'énumérer.
  Règle de sélection : un bloc est échoable quand son type d'entrée est **fait de scalaires
  seuls**. **20 types** le sont (les 15 embeds + Title, RichText, HTML, Image, Quote, Break,
  IFrame, Poll, Crowdfunding…). Les **10 autres** (teasers, listicle, galerie, flex, event,
  comment, subscribe) prennent des types d'entrée imbriqués dont la forme diffère
  structurellement de ce que la requête rend : non échoables par copie, donc refusés ;
- **le refus est le produit** : un article portant un bloc hors de cette table **n'est pas écrit
  du tout**, et le refus nomme le type. Les 10 imbriqués ne sont pas « non supportés pour
  toujours » : ce sont ceux dont l'entrée n'est pas une copie de la sortie, et deviner le mappage
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

1. **Livingdocs — décidé « oui », mais BLOQUÉ sur un accès.** Cherché le 2026-08-04 : le
   **serveur Livingdocs n'est pas public**. L'org GitHub `livingdocsIO` publie le moteur
   (`livingdocs-engine`, modèle de document côté client), des exemples et des dockerfiles
   d'infra — **pas le serveur** ; la doc Docker dit de construire ses images soi-même et renvoie à
   `contact@livingdocs.io` ; aucun essai ni sandbox self-serve trouvé. Il faut donc **une instance
   + un jeton `public-api:write`** venant d'un contact commercial (Heidi.news ? Buried Signals ?).
   L'écrire contre la doc seule violerait « vraies clés, vrais échecs » — donc rien n'est écrit.
2. **~~Étend-on la table de blocs ?~~ FAIT (2026-08-04)** — 7 → **20 types**, dérivés du schéma.
   Un sondage ou un embed social ne bloque plus rien. Restent **10 types imbriqués** (teasers,
   listicle, galerie, flex, event, comment, subscribe) : leur entrée n'est pas une copie de la
   sortie, donc chacun demande une vraie mesure. À rouvrir seulement si Heidi.news en utilise.
3. **Le placement réel** (point ci-dessus) : si Livingdocs se fait, faut-il que l'ancre pilote la
   position, ou le visuel va-t-il en fin de brouillon comme sur We.Publish ? C'est une question
   éditoriale — « Splash place » vs « Splash propose et le journaliste place » — et la réponse
   actuelle du projet, partout ailleurs, est la seconde.
