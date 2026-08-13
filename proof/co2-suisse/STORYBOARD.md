---
takeaway: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967."
subject: "Le point de 2024 — le point d'arrivée de la courbe, pas le pic."
comparison: "Le niveau de 1967 (32,5 Mt), posé comme trait horizontal sous lequel la courbe repasse."
limits: "Émissions territoriales uniquement — n'inclut ni les biens importés ni l'aviation internationale. Interdit d'écrire que la Suisse « a réduit son empreinte »."
placement: "Suit le §2, celui du pic de 1973. Le texte y donne déjà 46,2 Mt et 1973 — ne pas les répéter en gros."
credit: "Source : Global Carbon Budget 2025, via Our World in Data"
effectiveDate: "données 2024, extraites le 6 août 2026"
slots:
  - id: 1
    proves: "que la courbe est repassée sous son niveau de 1967"
    medium: chart
    format: static
    candidates: ["ligne 1950–2024 avec trait de repère à 1967", "colonnes par décennie", "ligne 1950–2024 avec le pic de 1973 en accent"]
    chosen: "ligne 1950–2024 avec trait de repère à 1967"
---

## ① Restitution

Ce que j'ai lu dans le papier, du plus fort au plus faible :

1. **En 2024 la Suisse est à 32,1 Mt, sous son niveau de 1967 (32,5 Mt).** C'est la phrase qui
   porte le papier.
2. **Le pic est ancien : 1973, 46,2 Mt**, juste avant le choc pétrolier — puis un plateau de
   trente ans.
3. Le chiffre est territorial : il ne dit rien des émissions importées.

**Correction du journaliste :** « Le point 3 n'est pas une affirmation, c'est une limite — ne la
traite pas comme un troisième candidat au visuel. Et le pic, de mémoire, c'est 2005, pas 1973. »

**Vérifié dans les données gelées** (recalculé sur les 167 lignes de `data.csv`, 1858–2024, valeurs
converties en Mt) **:** 1973 = **46,20 Mt** ; 2005 = **45,78 Mt**, et 2005 n'est que le **4ᵉ** plus
haut de la série. 1973 est bien le maximum — mais son avance se joue sur **1991 (46,13 Mt)**, à
**0,07 Mt** près, pas sur 2005, dont il est à 0,43 Mt. Le journaliste accepte et garde 1973 dans le
texte.

> **Correction, 2026-08-09.** Cette ligne — la seule du document présentée comme *vérifiée* — était
> la seule à n'avoir pas été calculée. Elle donnait « 2005 = 45,83 Mt » (la valeur est 45,78) et une
> avance de « 0,37 Mt » (l'écart 1973–2005 est 0,43), et elle laissait entendre que 2005 était le
> second de la série, alors que 1991 le devance : la vraie marge du pic est cinq fois plus étroite
> que celle annoncée. Les valeurs ci-dessus sont recalculées ; aucune n'est saisie à la main. Le
> visuel rendu, lui, n'a jamais porté ces chiffres et reste juste.

## ② Le takeaway — G1

*Si le lecteur ne retient qu'une phrase de ce visuel, laquelle ?*

> « En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967. »

Confirmé verbatim, écrit tel quel dans `takeaway:`.

## ③ La main du journaliste — cinq questions, une à la fois

1. *Dans ces données, qui est le sujet de votre papier ?* — « Le point de 2024. Pas le pic : le pic
   est le décor, l'arrivée est le sujet. »
2. *À quoi le lecteur le compare — l'an dernier, la moyenne, l'objectif annoncé ?* — « À 1967. Ni la
   moyenne ni l'objectif de la loi CO₂. Je veux voir la courbe repasser sous un trait horizontal. »
3. *Qu'est-ce que ces données ne permettent PAS de conclure ?* — « Territorial seulement. Rien sur
   les émissions importées, rien sur l'aviation internationale. Ne pas écrire « empreinte ». »
4. *Quel paragraphe le visuel suit-il, et que dit déjà le texte à côté ?* — « Le §2, celui du pic.
   Il donne déjà 46,2 Mt et 1973 : ne les répète pas en gros, mets-les en discret. »
5. *Comment le créditez-vous, et à quelle date ?* — « `Source : Global Carbon Budget 2025, via Our
   World in Data`, données 2024, extraites le 6 août 2026. »

## ④ La boucle de références

Le jeu de références livré (`doctrine/references/reference-set.md`) **ne contient aucune ligne
sur cette structure d'argument** — une série temporelle longue relue contre un niveau historique.
Ses quatre lignes portent sur des marques individuelles (NYT Upshot), des simulations répétées
(Washington Post), un modèle 3D fixe (NYT Visual Investigations) et une carte synchronisée à un
récit (Vox). Deux ont quand même été montrées, en le disant :

- **NYT Upshot** — l'annotation énonce la conclusion en toutes lettres *sur* le graphique, pendant
  que les marques gardent la texture des exceptions. → Transférable : le trait de 1967 doit être
  **légendé par sa phrase**, pas seulement tracé.
- **Vox / Cachemire** — la géographie arrive au moment précis du récit qui l'a produite. →
  Transférable : le repère de 1967 n'a de sens que collé à la valeur de 2024 qui le franchit.

**Choix du journaliste :** « Je prends la première. Le trait doit porter le texte, sinon c'est de la
décoration. La deuxième ne me sert pas ici, c'est une règle de montage vidéo. »

**Gap enregistré :** la recherche vive prévue par `exchange.md` quand la structure d'argument est
neuve n'a pas été menée — la vérifier au standard de `reference-set.md` (regarder les pixels ET lire
la légende) ne tient pas dans le budget de ce beat.

## ⑤ La proposition — G2

Un seul emplacement, parce que le papier ne porte qu'une affirmation chiffrée.

**Emplacement 1 — prouver que la courbe est repassée sous son niveau de 1967.** Trois traitements :

- une **ligne 1950–2024 avec un trait de repère horizontal à 1967**, la valeur de 2024 nommée au
  bout : le franchissement est lisible d'un coup d'œil ;
- des **colonnes par décennie** : plus sobre, mais le franchissement disparaît dans les moyennes ;
- la même ligne mais **le pic de 1973 en accent** : joli, sauf que le pic n'est pas le sujet — c'est
  exactement l'erreur « l'accent sur le maximum » que la doctrine interdit.

Recommandation : la première. **Retenu :** la première.
