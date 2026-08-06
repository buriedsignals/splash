# Toute vidéo de graphique porte les mots de sa marche

**Origine** : Rémy, 2026-08-06 — « résous le trou qui reste ».
**Ferme** : le lot déféré nommé au § 6 bis de
`2026-08-05-narrative-walk-on-the-journalist-path-design.md`.
**Dépend de** : `2026-08-06-the-narrative-kind-is-proposed-design.md` (le genre est proposé).

## 1. Le trou, mesuré

Sur les 41 types de graphiques, **un seul — `bar` — peut porter une marche**
(`WALK_CAPABLE_CHART_TYPES`). Conséquence en chaîne, et c'est elle qui compte :

- `narrativeKindsFor("chart-native", <autre type>)` ne rend qu'une offre (`reveal`) ;
- une offre unique n'est pas une question, donc **le genre n'est jamais demandé** ;
- donc **aucun storyboard n'est proposé**, et le journaliste ne se voit même pas refuser quelque
  chose : l'étape n'existe pas pour lui.

40 types sur 41 sont dans ce cas. C'est exactement la forme du défaut que ce chantier a fermé
ailleurs — une capacité absente qui ne se signale pas.

## 2. La cause : deux choses ont été confondues

Un `bar` sait faire **deux** choses que les autres ne savent pas, et elles ont été traitées comme
une seule :

1. **AFFICHER** la phrase du beat au bon moment (`RevealStage` — branché sur `BarReveal` seul).
2. **RÉORDONNER** l'entrée de ses sujets selon la marche (`walkPositions` dans `BarChart`).

**Seule la première est nécessaire pour que les mots atteignent le lecteur** — le critère unique du
garde de marche. La seconde est un bonus que tous les types ne peuvent pas rendre.

En les liant, on a fermé 40 types pour une capacité qu'aucun d'eux n'avait besoin d'avoir.

## 3. La règle : deux grains de marche, tous les deux honnêtes, tous les deux dits

| grain | ce que le lecteur voit | ce qu'il faut du composant |
|---|---|---|
| **ancré** | la phrase apparaît **quand son sujet entre** | une entrée par sujet (`stagger`) **et** un champ d'ancre nommable |
| **séquencé** | les phrases se suivent **dans l'ordre écrit**, sur l'animation telle qu'elle est | rien |

Le **séquencé** couvre tout le reste : un camembert balaie ses parts, un sankey trace ses liens, et
les phrases du journaliste passent dessus dans son ordre. C'est un *stepped* honnête — l'étape
porte le récit, l'horloge la fait avancer — et c'est ce que la spec précédente appelait le
« révélateur segmenté », ramené à sa plus petite forme utile : **segmenter le TEXTE, pas
l'animation**.

> **Le grain est DIT au journaliste**, dans le `why` de l'offre. « Chaque sujet entre au moment de
> sa phrase » et « tes phrases se suivent sur l'animation » ne sont pas la même promesse, et lui
> laisser croire la première quand il aura la seconde est la seule façon dont ce lot peut mentir.

**Le réordonnancement reste à `bar`, et son absence ailleurs est déclarée, pas tue.** Ouvrir un
type au grain ancré = déclarer son ancre + son calendrier d'entrée ; le rendre réordonnant = un
lot par famille, avec sa preuve rendue.

## 4. L'ancre n'est pas toujours nommable, et le beat doit le refléter

Un beat ancré nomme son sujet (`category`, `x`). Un beat séquencé n'a **que sa phrase et son
rang** — il n'y a rien à nommer, parce qu'un sankey n'a pas de sujet adressable dans le
vocabulaire des beats.

Deux conséquences non négociables :

1. Un beat **avec** une ancre sur un type séquencé est **refusé fort**, jamais accepté puis ignoré :
   accepter une ancre qu'on ne peut pas honorer, c'est promettre un alignement qui n'arrivera pas.
2. Un beat **sans** ancre sur un type ancré reste refusé comme aujourd'hui (règle inchangée).

C'est la même distinction que le garde vient de trancher côté carte : **narrer et être proposable
sont deux questions**. Un type séquencé narre ; ses phrases ne peuvent pas être *rédigées* depuis
la donnée, elles viennent des passages de l'article — ce qui est de toute façon la règle.

## 5. Ce qui est lu, jamais retapé

Le calendrier d'entrée d'un type (`stagger(p, i, n, start, step, span)`) vit dans son composant.
Un registre qui le **recopie** dérive le jour où quelqu'un ajuste un composant — et une phrase
calée sur un calendrier périmé est une phrase sur le mauvais sujet, le défaut exact que
`core/walk.ts` documente en tête de fichier.

Donc : le registre déclare, et **un test lit la source du composant** et refuse le désaccord. Le
même dispositif que `scaffold-theme-parity` et le drift-guard des composants vidéo-carte.

Le registre **couvre les 41 types**, chacun avec son grain et sa raison — pour qu'un 42ᵉ ne puisse
pas être ajouté sans que quelqu'un se prononce.

## 6. Hors périmètre

- **Réordonner l'entrée** des types autres que `bar` (§ 3).
- **La ligne en scrolly** — déjà authorable, inchangée.
- **Renommer la famille `*Reveal`** — décidé contre le 2026-08-06.
- **Le grain ancré pour un type sans `stagger`** — les 14 types à scalaire continu sont séquencés,
  et c'est la réponse honnête, pas une lacune.

## 7. Les règles non négociables

1. **Sans marche, rien ne change** — une vidéo dont la spec ne porte pas de `beats` rend à l'octet
   ce qu'elle rendait. C'est l'invariant qui rend ce lot sûr sur 41 fichiers.
2. **Le grain est dit avant le choix**, dans le `why` de l'offre.
3. **Une ancre qu'on ne peut pas honorer est refusée fort**, jamais ignorée.
4. **Le calendrier est lu du composant**, jamais recopié sans garde.
5. **Le registre couvre la liste entière** — un type de plus force une décision.
6. **Une affirmation visuelle non rendue n'est pas une affirmation** : le lot finit sur des frames
   extraites d'un vrai mp4, aux frontières de beats — jamais le still de revue.
