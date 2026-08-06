# Le genre narratif est proposé, pas deviné

**Origine** : décision de Rémy, 2026-08-06, après le run glaciers.
**Dépend de** : `2026-08-05-narrative-walk-on-the-journalist-path-design.md` (le garde de marche).

## 1. Ce qui manque

Une vidéo n'est pas une chose. Une carte peut être un **survol guidé**, une suite d'**étapes**, ou
une **révélation** à caméra fixe — trois familles de composants qui existent et qui rendent trois
objets différents. Aujourd'hui le journaliste n'en choisit aucune : `cameraMode` reste au défaut
(`guided-tour`, ou `route-reveal` pour une route) et personne ne lui a demandé.

Conséquence directe, mesurée : le garde de marche exigeait un storyboard pour **toute** vidéo de
carte, y compris une révélation qui n'affiche aucun mot. Corrigé le 2026-08-06 — mais la vraie
cause n'était pas le garde, c'est que **le genre n'est jamais décidé**, donc rien ne peut en
dépendre honnêtement.

## 2. La règle

**Une fois le format vidéo épinglé, le genre narratif est PROPOSÉ.** Pas un défaut silencieux :
une proposition éditoriale, comme le menu des formes — les genres qui serviraient ce récit, ce que
chacun donne, ce qu'il coûte, et une recommandation motivée par la donnée et par l'histoire.

**Le journaliste choisit.** Et sa réponse décide de la suite :

| genre | ce qui porte le récit | storyboard |
|---|---|---|
| `story` | la caméra voyage d'une étape à l'autre | **oui** |
| `stepped` | des étapes discrètes, avancées par le temps | **oui** |
| `reveal` | la donnée s'anime, la caméra tient le cadre | **non** |

> **`reveal` n'affiche aucun mot, et c'est normal** (Rémy, 2026-08-06). Une marche y ordonne
> encore les entrées, mais ses phrases ne seraient pas lues — donc **on n'en demande pas**.
> Exiger un texte que le rendu ne montre pas est la seule chose que ce dispositif ne peut pas
> faire.

## 3. Ce qui est disponible n'est pas le même des deux côtés

**Carte** : les trois genres existent comme familles distinctes (`*Story`, `*Scrolly` déclarée
`stepped`, `*Reveal`), et `cameraMode` les sélectionne déjà.

**Graphique** : **deux genres**, parce qu'un graphique n'a pas de caméra qui voyage — il n'y a pas
de `story`. Et il n'a pas non plus deux composants : les 41 compositions s'appellent `*Reveal`, et
c'est **la présence d'une marche confirmée qui fait le genre**.

> Un graphique en vidéo **sans** marche est un `reveal`. **Avec** une marche, c'est un `stepped` :
> des étapes discrètes, chacune avec sa phrase à l'écran (`RevealStage`, 2026-08-06). Le nom
> `stepped` est celui que Rémy a posé pour les cartes le 2026-08-03 ; il vaut des deux côtés parce
> qu'il décrit la même chose — l'étape porte le récit, le temps la fait avancer.

Le composant qui s'appelle `*Reveal` rend donc les deux genres selon ce qu'on lui donne. **C'est
un nom qui ment à moitié**, et il est conservé plutôt que renommé : le renommer toucherait 41
fichiers et trois registres pour un gain de lisibilité, alors que le mensonge est borné et
maintenant écrit.

## 4. Ce qui est proposable se LIT, jamais ne se récite

La leçon du 2026-08-06 : un orchestrateur a affirmé une incapacité neuf minutes après qu'elle ait
cessé d'exister, avec la prose qui disait le contraire déjà chargée. **Une capacité affirmée de
mémoire est fausse tôt ou tard**, et un refus est crédible — donc il meurt sans bruit.

Les genres offerts pour un (producteur, type) donné sont donc **interrogés**, comme
`can-carry-walk` l'est déjà :

```
bun lib/host/cli.ts narrative-kinds --producer <p> --type <t>
```

Il répond la liste des genres réellement rendus pour ce type, chacun avec ce qu'il porte et s'il
demande un storyboard. La proposition se compose **de cette réponse**.

## 5. Hors périmètre

- **Renommer la famille `*Reveal`** — § 3.
- **Le scrolly** : ce n'est pas un genre de vidéo mais un format, et son storyboard est déjà exigé.
- **Les types qui ne peuvent porter aucune marche** (`route`, `hex-grid`, la ligne, les 31 autres
  graphiques) — ils n'offrent que `reveal`, et c'est la réponse honnête, pas une lacune.

## 6. Les règles non négociables

1. **Aucun défaut silencieux.** Le genre est proposé ; ne pas répondre n'est pas une réponse.
2. **Ce qui est proposé est lu du registre**, jamais récité.
3. **`reveal` ne demande jamais de storyboard**, et le dire fait partie de la proposition — le
   journaliste doit savoir que choisir le plan fixe, c'est renoncer aux mots à l'écran.
4. **Un genre non rendu n'est pas proposé** — et son absence est expliquée, pas tue.
5. **Chaque garde doit être vu rougir**, mutation vérifiée comme atterrie.
