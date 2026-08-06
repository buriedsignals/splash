# La marche narrative sur le chemin du journaliste

**Nature** : spec parapluie. Deux sous-projets, dans un ordre contraint (§ 6).
**Origine** : trois tests manuels de Rémy les 2026-08-05/06, dont deux sur `main`.

## 1. Ce que les tests ont établi

Rémy a lancé `/using-splash` sur trois articles réels. Le storyboard n'est sorti **qu'une fois** —
pour un scrolly. Ni la vidéo de barres de la session 3, ni le passage scrolly → vidéo de la
session 2 ne l'ont proposé.

**La cause n'est pas un format oublié : le chemin du journaliste n'entre jamais dans la boucle.**

Le run de la session 3 (`exports/glaciers-espace-libere/`) contient `accepted.json`,
`candidates.json`, `decisions.jsonl`, `report.json` — et **aucun `run.json`**. Il n'y a pas de
manifeste de run, donc pas de boucle. `/using-splash` parcourt la chaîne **prose**
(`suggest-article` → `suggest-chart` → `produce-all`) et n'appelle `lib/host/cli.ts` que pour trois
utilitaires (`newsroom`, `present`, `precheck`) : **jamais `advance`**.

Or le sous-projet ③ (2026-08-04) a construit l'étape de proposition dans
`nextActionsForElement` → `draft-beats` → `canDraftBeats`, c'est-à-dire **entièrement dans la
boucle**. Une fonction que ce parcours ne franchit pas.

> **L'étape de proposition a été construite sur la mauvaise chaîne.** Elle est correcte, testée,
> gardée par mutation — et inatteignable par le seul chemin qu'un journaliste emprunte.

C'est la reformulation exacte du constat déjà porté par la mémoire de reprise du 2026-07-28
(« DEUX chaînes de production sans pont — la V2 n'est pas le chemin du journaliste »), cette fois
mesurée sur un run réel plutôt que raisonnée.

## 2. Ce qui a quand même atteint le journaliste, et pourquoi ça tranche la conception

Deux moitiés du travail du 2026-08-04 SONT arrivées jusqu'à lui, parce qu'elles vivent sur le bon
chemin :

- **La règle « d'où viennent les mots d'un beat »**, écrite dans `skills/splash/SKILL.md`. C'est de
  la prose, donc elle s'applique — et la session 2 l'a rendue mot pour mot : *« Je ne les écris
  pas : je les ai tirées des passages de ton propre article qui parlent de chaque palier »*, suivi
  d'un tableau palier × phrase proposée × passage source.
- **Les changements moteurs** (ordre d'entrée des barres, reveals qui honorent la marche, `hold`,
  `ScrollyRouteMap`) : ils s'appliquent dès qu'une spec porte des beats.

**Donc la chaîne prose SAIT tenir cette étape.** Elle l'a tenue. Ce qui manque n'est pas un
mécanisme, c'est qu'elle soit **obligatoire** au lieu d'être une bonne pratique que le modèle suit
quand il y pense.

Preuve que ce n'est pas suivi : `skills/splash/SKILL.md` dit **déjà** que « Gate 1b s'élargit au
claim-arc quand le candidat routé est un chart-scrolly **ou un chart-video** ». La session 3 a
produit une vidéo de barres sans jamais passer par ce gate. **Une règle écrite que rien ne fait
respecter** — la maladie que ce dépôt traque sous toutes ses formes.

## 3. La décision : pas de pont, un garde

**On ne relie pas les deux chaînes.** Un pont demanderait soit que la prose appelle la boucle — deux
séquences d'étapes qui se doublonnent, donc deux machines à garder d'accord — soit de porter la
boucle dans la prose. Les deux coûtent plus que ce qu'ils rendent.

**On applique la structure que le dépôt s'est déjà donnée** : la prose dit, et un garde mécanique
refuse. C'est exactement ce que font `gate-render` (le reçu de présentation), `assertDelivered`,
`export-guard`, et le refus non-zéro de `produce-all`.

**Un seul garde, dans `validateAccepted`** (`skills/splash/src/validate-gate.ts`) — le gate de
colonne vertébrale que la chaîne prose appelle déjà avant de produire :

> Un **format narratif** (`scrolly` **ou** `video`) sur un type **capable de porter une marche**
> est refusé s'il n'en porte pas une, confirmée.

Le refus **nomme l'acte qui débloque** (convention du dépôt : un refus routé, jamais « invalide »).

La règle de la boucle n'est pas supprimée : elle reste la même règle sur l'autre chaîne. Elle est
**documentée comme telle** plutôt que reliée — deux chaînes, une règle, écrite deux fois et dite.

## 4. ★ Le préalable non négociable : ne jamais exiger une marche que le rendu jette

Rémy demande que **toutes les vidéos**, de tous types, aient leur storyboard comme les scrollies.
C'est le bon objectif, et il a **un préalable** dont l'oubli refabriquerait exactement le défaut
que ce chantier existe pour fermer.

- Une vidéo de **carte** peut montrer les phrases : la famille `Story` a ses cartons de texte
  (`CaptionCard`, `skills/map-native/src/components/StoryCards.tsx:13`).
- Une vidéo de **graphique** n'a **aucune surface de légende** : les 42 compositions de
  `skills/chart-native/remotion/` sont des enveloppes minces autour du composant graphique, avec
  une seule `progress`. C'est ce que la session 2 a dit au journaliste sans détour : *« tes cinq
  phrases ne suivent pas »*.

**Poser le garde d'abord obligerait un journaliste à écrire cinq phrases pour une vidéo qui n'en
affichera aucune.** Un texte exigé, validé, puis jeté au rendu — la définition même de la maladie.

> **Règle** : le garde n'exige une marche que là où les mots de cette marche **atteignent le
> lecteur**. Tant qu'une famille ne sait pas les afficher, elle n'est pas dans le périmètre — et
> son absence est déclarée, pas silencieuse.

## 5. Le périmètre vient des listes déclarées, jamais d'une supposition

Trois types ne peuvent pas porter une marche proposable, et chacun pour une raison **mesurée**,
déjà écrite et pinnée par un test :

- **`route`** et **`hex-grid`** — leur ancre se calcule au produce (`resolveRouteArc`,
  `resolveHexGridArc`), donc rien ne peut la proposer avant production
  (`PROPOSABLE_MAP_TYPES`, `lib/brain/beats.ts`).
- **La ligne en vidéo** — elle se trace en continu par longueur cumulée ; il n'y a aucune entrée
  par sujet à réordonner (les seuls `stagger` de `LineChart` sont grilles et étiquettes d'axe).

Le garde lit ces listes. Il n'en invente aucune : un type qui rejoint une liste demain est couvert
le jour même, et un garde qui bloquerait du travail légitime serait pire que le défaut réparé.

## 6. Découpage en sous-projets, dans cet ordre

**① La vidéo de graphique apprend à porter des mots.** Une surface de légende pour les familles
vidéo de `chart-native` : la phrase du beat à l'écran, beat par beat, comme la famille `Story` des
cartes. C'est le préalable de § 4, et c'est le gros du travail (42 compositions, plus la question
de la place du texte en 9:16 et en 1:1). **Chaque famille livrée exige une preuve RENDUE et
regardée** — sur ce projet, c'est la seule méthode qui ait jamais attrapé un artefact faux.

**② Le garde.** `validateAccepted` refuse un format narratif sans marche confirmée sur un type
capable. Prose alignée dans `splash-proposition` / `splash-production`. Vérifié par mutation : le
garde doit rougir, et rougir en nommant l'acte qui débloque.

**L'ordre est contraint** : ② avant ① ferait écrire pour rien. C'est la seule séquence honnête.

## 7. Hors périmètre

- **Relier la boucle et la prose.** Décidé contre, § 3. La boucle garde sa règle ; on l'écrit.
- **Le scrolly** — il tient déjà l'étape (session 2 le prouve). ② le rend obligatoire, il ne le
  construit pas.
- **`route`, `hex-grid`, la ligne en vidéo** — § 5.
- **Les légendes d'une vidéo de carte** — elles existent déjà.

## 8. Les règles non négociables

1. **Aucune exigence sans destination.** Un garde n'exige une marche que là où ses mots atteignent
   le lecteur (§ 4).
2. **Le périmètre est lu, jamais retapé** (§ 5).
3. **Sans marche, rien ne change** — une production qui n'en porte pas doit rendre à l'octet ce
   qu'elle rendait avant.
4. **Un refus nomme l'acte qui débloque**, jamais « invalide ».
5. **Chaque garde doit être vu rougir** pour la bonne raison, mutation vérifiée comme atterrie.
6. **Une affirmation visuelle non rendue n'est pas une affirmation.**
