# La visite guidée affiche les phrases qu'elle a exigées

Frames extraites d'un vrai mp4 — le cas réel de Rémy (`exports/glaciers-marges-postglaciaires`),
re-rendu en `cameraMode: "guided-tour"`, les neuf beats qu'il avait validés.

**Avant** : la caméra faisait le tour dans son ordre, chaque lieu écrivait son NOM sur la carte, et
ses neuf phrases n'apparaissaient nulle part. Il avait écrit un storyboard qu'on lui avait exigé,
et le rendu le jetait.

| frame | ce qu'on voit |
|---|---|
| `step-rhone.png` | « En seize jours, le glacier du Rhône a perdu 1,60 mètre de glace. » |
| `step-bourg-saint-maurice.png` | « La protection votée a été mise sur pause après les élections de mars 2026. » |

La carte apparaît quelques dizaines de frames après l'arrivée de la caméra sur l'étape — d'où un
premier échantillonnage (frame 1098) qui ne la montrait pas encore, et qu'il a fallu re-sonder pour
ne pas conclure trop vite.

## Un seul objet de texte par étape

Premier jet : le nom du lieu ressortait **en grand au centre** ET la phrase en bas, dans un autre
traitement typographique — deux objets pour une seule chose, en deux styles (Rémy : « il faut
homogénéiser »). Le nom (et sa valeur, quand le type en a une) est maintenant un **surtitre** sur
la même carte, et le libellé central n'est plus dessiné pour une étape écrite. Les récits DÉRIVÉS,
qui n'ont pas de phrase, gardent le libellé central inchangé.

Cause : les six composants `*Story` masquaient la carte de légende sur tout beat `reveal`. Juste
pour un reveal DÉRIVÉ (son texte répète le nom et la valeur que la carte écrit déjà), faux pour un
reveal ÉCRIT. Le drapeau qui distingue les deux (`authored`) existait depuis toujours et aucun
composant ne le lisait.
