# Quatre sessions en parallèle — qui possède quoi

Quatre passes qualité tournent en même temps, une par genre, toutes parties de `b49a59b3`.
Chacune a son worktree sous le conteneur `splash/` :

| worktree | branche | genre | territoire |
| --- | --- | --- | --- |
| `sp1/` | `maps/sp1-plan-contract` | **web** (charts + maps) | `skills/chart-web`, `skills/map-web`, `proof/web-*`, `proof/mapgen-*-web` |
| `video/` | `quality/video` | **vidéo** | `skills/chart-video`, les beats vidéo de `proof/` |
| `scrolly/` | `quality/scrolly` | **scrolly** | `skills/scrolly`, `proof/scrolly-*`, `proof/mapscrolly-*`, `proof/mapmore-scrolly-*` |
| `rerender/` | `rerender/static-corpus` | **statique** | re-rendu du corpus + l'interlignage adaptatif dans `shared/design-base` |

Rien n'est fusionné sans l'accord de Rémy. Il valide à l'œil, genre par genre.

## La règle qui évite les collisions

**Ton skill et tes beats sont à toi. Le tronc `shared/` n'est à personne.**

Un changement dans `shared/` doit être **annoncé aux autres sessions avant d'être commencé**, en
nommant les fichiers exacts. Ce protocole tourne déjà et il a marché : la session statique a annoncé
son interlignage, la session web a répondu avec la liste précise de ce qu'elle tenait, et aucune
collision n'a eu lieu.

Le vrai générateur de collisions n'est pas le tronc lui-même : c'est que **`carried-copies.test.ts`
impose l'identité à l'octet** entre chaque module du tronc et ses copies sous `skills/*/scripts/` et
`skills/splash/assets/root-template/`. Donc toucher un module du tronc force une mise à jour dans le
territoire de tout le monde. Règle : qui change un module du tronc met à jour **toutes** ses copies
dans le même commit, et l'annonce avant.

## Ce qui est déjà fait et dont tu hérites

Lire `.superpowers/sdd/2026-09-12-sp1-map-plan-contract/KNOWN-STATE.md` — l'état connu, les 3 échecs
préexistants, et la consigne de coût. **Ne remesure pas la ligne de base, elle est écrite.**

L'essentiel :

- Le design base tire ses fontes des **Google Fonts** (cache gitignoré, hors du repo), et resvg rend
  en `loadSystemFonts: false` : un fichier manquant **échoue** au lieu de retomber en silence sur une
  face système. Échelles : serif → **Merriweather**, sans → **Open Sans**, geometric sans →
  **Montserrat**.
- Une page web embarque désormais en **woff2 sous-ensemblé** les faces que son CSS nomme, et la
  construction échoue s'il manque une face ou un caractère (`de112dff`, `b49a59b3`).
- MapTiler sert 17 de ses 18 familles, toutes des Google Fonts — **aucune cuisson SDF n'est
  nécessaire**. Et une famille NUE demandée à MapTiler revient en **Noto Sans**, sans erreur.
- Le tronc `shared/map-beat/` (7 modules) est relu et figé. Contrat :
  `skills/map-beat/references/map-plan.md`.

## Le défaut que vous avez tous les deux, très probablement

Le correctif typographique web est passé par `render-web.mjs`, donc **chart-web et map-web sont
couverts — scrolly et vidéo ne le sont pas.**

- **Scrolly** émet par `skills/scrolly/scripts/render-scrolly.mjs`, qui porte encore un
  `body { font-family: Helvetica… }` littéral et n'embarque aucune face. Une page scrolly déclare donc
  une famille et ne la charge jamais : le navigateur du lecteur retombe en silence sur autre chose.
  C'est exactement le défaut qu'on vient de fermer côté web.
- **Vidéo** rend dans un Chrome sans tête via Remotion. Le précédent du repo est explicite —
  `film/scripts/fetch-typefaces.mjs` embarque les octets « parce qu'une frame peinte avant l'arrivée
  d'une feuille de style réseau est une frame dans la mauvaise fonte, sans rien pour le dire ».
  Vérifie que les beats vidéo font pareil ; s'ils s'appuient sur une fonte système, chaque frame est
  suspecte.

**Réutilisez la fonction partagée, n'en réécrivez pas une seconde.** Elle vit dans le design base et
elle sait déjà : récupérer, vérifier par magic number avant cache, sous-ensembler aux caractères que
la page peut afficher, et lire la plage réellement livrée dans le `cmap` des octets produits.

Deux pièges déjà mesurés, à ne pas redécouvrir :

1. **Ne sous-ensemble jamais depuis le HTML rendu.** Ces pages sont interactives ; du texte apparaît
   au survol qui n'est pas dans le markup. Un glyphe absent seulement au survol passe toutes les
   captures d'écran.
2. **`document.fonts.check()` ment.** Un caractère hors de toutes les plages déclarées n'a besoin
   d'aucune fonte custom, donc la fonction répond `true` pendant que le glyphe sort du repli. Relire
   `FontFace.unicodeRange`, ou mesurer un différentiel de largeur contre un repli délibéré.

## Méthode

Un type à la fois, montré à Rémy avant de passer au suivant — sauf s'il demande un lot. Et **regarde
le résultat** : une suite verte ne prouve aucun des défauts qui comptent. Pour la vidéo, extraire des
frames du mp4 ; un still de revue ne prouve jamais un mécanisme d'entrée.

## Règles non négociables

- **Bun**, toujours. Jamais npm, jamais node.
- **Aucune mention de Claude ou d'Anthropic** nulle part — commits, code, commentaires, PR.
- Pathspec explicite sur `git add` ET `git commit`. Jamais `-A`, jamais nu.
- Aucune clé dans un fichier commité. Le `.env` est déjà dans ton worktree.
- Ne fusionne rien sans l'accord explicite de Rémy.
- Vérifier par mutation est obligatoire : nommer la mutation qui fait rougir chaque garde, et la
  lancer. C'est la seule discipline qui a attrapé un vrai défaut à chaque tâche de cette branche.
