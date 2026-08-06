# Plan — sous-projet ① : la vidéo de graphique porte les mots de la marche

Spec : `docs/superpowers/specs/2026-08-05-narrative-walk-on-the-journalist-path-design.md` § 6.
Branche : `feat/chart-video-captions`.

## Ce que la mesure a changé au périmètre annoncé

La spec disait « 42 compositions ». **Faux, et dans le bon sens.** Les enveloppes vidéo de
`chart-native` sont parfaitement régulières — un `<div>` de fond, puis le composant graphique avec
sa `progress` — et surtout : **une légende n'a de sens que pour un type qui peut porter une
marche**. Aujourd'hui c'est `bar`, et lui seul (`canDraftBeats`, `AUTHORABLE_SCROLLY_TYPES`).

Donc on ne touche pas 42 fichiers. On écrit **une scène partagée** et on la branche là où une
marche existe. Les autres restent inchangés, et un test dit **qui l'utilise et pourquoi les autres
non** — le même dispositif que `reveal-walk-coverage.test.ts` côté cartes.

## Contraintes globales

- **Sans marche, rien ne change** — une vidéo dont la spec ne porte pas de `beats` doit rendre à
  l'octet ce qu'elle rendait avant. C'est l'invariant qui rend ce lot sûr.
- **La légende et l'entrée lisent le MÊME calendrier.** Le beat affiché doit être celui qui entre à
  l'écran. Deux horloges, c'est une phrase posée sur la mauvaise barre — le défaut exact que
  `route-story.ts` documente et que ce dépôt a déjà payé.
- **Jamais de texte inventé.** La légende affiche `beat.text`, la phrase que le journaliste a
  écrite. Rien d'autre.
- **Chaque garde doit être vu rougir**, mutation vérifiée comme atterrie.
- **Une affirmation visuelle non rendue n'est pas une affirmation** — ce lot finit sur des images.

## Tâche 1 — quel beat est à l'écran, et depuis le calendrier du graphique

`skills/chart-native/src/core/walk.ts`. Une fonction pure : à `progress` p, avec n sujets et
l'ordre d'entrée que `walkPositions` a déjà résolu, **quel beat est actif** et à quelle opacité sa
phrase se lit.

Elle lit les **mêmes paramètres de `stagger`** que `BarChart` utilise pour faire entrer ses barres
(`0.18`, `0.5 / n`, `0.35`) plutôt que d'en redéfinir un jeu à elle. Un jeu parallèle serait deux
horloges, et la contrainte globale l'interdit.

RED : à un progress où la barre du beat 2 entre, la fonction répond 2. Mutation : décaler la
fenêtre → un test rougit.

## Tâche 2 — la scène vidéo partagée

`skills/chart-native/remotion/src/RevealStage.tsx`. Elle rend ce que le `<div>` de fond rendait,
plus la phrase du beat actif quand la config en porte une.

Trois décisions à prendre **et à écrire** :

- **Où le texte se pose** selon le format de l'image (9:16, 1:1, 16:9). Un 9:16 a de la place sous
  le graphique ; un 16:9 n'en a pas — la légende y passe en surimpression basse, sur un fond dérivé
  du thème comme `deriveFurniture` le fait déjà partout ailleurs.
- **Ce qui se passe quand une phrase est longue.** Bornée et mesurée, jamais tronquée en silence :
  le dépôt a déjà payé une troncature de donnée (`slope`, « Interm. »).
- **Le contraste**, dérivé du fond du thème (`themeBg`), jamais une couleur en dur — la garde
  produce-conformance juge sur le vrai fond depuis 2026-07-14.

RED : une config avec marche rend la phrase du beat actif ; sans marche, la scène rend un DOM
identique à l'ancien `<div>`.

## Tâche 3 — brancher, et dire qui n'est pas branché

`BarReveal.tsx` passe par `RevealStage`. Les autres enveloppes restent telles quelles.

Un test de couverture (`chart-video-caption-coverage.test.ts`, sur le modèle de
`reveal-walk-coverage.test.ts`) pin **qui porte des mots et pourquoi les autres non** : `bar` parce
qu'il peut porter une marche ; `line` **en attente**, parce que sa vidéo est fermée à la marche
pour une raison mesurée (tracé continu, aucune entrée par sujet) et qu'ouvrir la légende sans
l'ordre n'aurait rien à afficher ; les 40 autres parce que rien ne peut leur drafter une marche.

Le test doit **couvrir la liste entière**, pour qu'un 43ᵉ type ne puisse pas être ajouté sans que
quelqu'un se prononce.

## Tâche 4 — la preuve au rendu

Deux rendus réels du même échantillon de barres, marche identique, **frames extraites du mp4 aux
frontières de beats** — pas le still de revue, qui tombe après la fenêtre d'échelonnement (leçon
payée trois fois le 2026-08-04).

Ce qu'il faut voir : **la phrase du beat 1 pendant que sa barre entre**, puis celle du beat 2. Et
la version sans marche identique à l'octet à ce qu'elle rendait avant le lot.

## Tâche 5 — gate et revue

`bun run check` machine calme, les rouges connus nommés d'avance. Revue finale ciblée sur la
couture avec ② : la scène est-elle ce dont le garde du sous-projet ② aura besoin pour dire « cette
vidéo peut porter des mots » ?
