# Sous-projet ③ — l'étape de proposition

**Parapluie** : `2026-08-03-editorial-storyboard-design.md` § 7. Dépend de ① (vocabulaire des
gestes, fusionné) et ② (modèle de beat unifié, fusionné le 2026-08-04).

## 1. Ce qui manque, exactement

L'étape « proposer → valider → produire » **existe** — `draft-beats` (déterministe, exécuté par le
driver) puis `author-beats` (le gate) — mais elle est enfermée dans un couloir :

- `manifest.ts:862` ne route que `chosen.format === "scrolly"` ;
- `canDraftBeats` (`lib/brain/beats.ts:120`) n'accepte que les types du track chart plus l'image ;
- une carte **n'y est jamais routée** : elle va droit au produce, et son `arcBeats` est décrit
  comme « jamais rédigé par la machine » — donc le journaliste écrit depuis rien.

C'est la cause racine nommée par ② : le storyboard de carte a été construit comme un **champ de
configuration** parce que son modèle de beat n'avait pas de quoi être autre chose. ② lui a donné
le modèle. ③ lui donne l'étape.

## 2. Le périmètre, borné par ce que les renderers honorent RÉELLEMENT

Règle héritée de ① : **on ne propose que ce qu'un composant honore prouvablement.** Une proposition
que le renderer jette est pire que pas de proposition — elle fait écrire le journaliste pour rien et
bloque sa production sur un texte sans effet.

| track / format | honore une marche aujourd'hui | dans ③ |
|---|---|---|
| chart · `scrolly` | oui (`ScrollyChart`) | déjà là, inchangé |
| image · `scrolly` | oui | déjà là, inchangé |
| **carte · `scrolly`** | **oui** (`ScrollyMap.tsx:73,223` lit `arcBeats`) | **ouvert** |
| **carte · `video`** | **oui** pour le genre `story` (inventaire ① §1) | **ouvert** |
| chart · `video` | **non** — les 7 `*Reveal` ignorent les beats (inventaire ① §4) | fermé → ④ |
| carte · `static`/`interactive` | non — pas de notion de récit (`narrativeKindFor` → `undefined`) | fermé |

**`route` et `hex-grid` sont exclus** de la proposition : leur ancre se **calcule au produce**
(`resolveRouteArc`, `resolveHexGridArc`) et n'existe donc pas quand le brouillon devrait être
assemblé — établi par la correction du § 4.3 de la spec de ②. Ils gardent leur `arcBeats` écrit à
la main. Cinq types s'ouvrent : `choropleth`, `symbol`, `locator`, `cartogram`, `dot-density`.

## 3. Ce que la machine propose — et ce qu'elle n'écrit jamais

Transposition littérale du principe déjà validé de `suggest-image` : **la machine apparie et
ordonne, elle ne rédige pas.**

- **La structure** — quelles régions, dans quel ordre, quel rôle dans l'arc (`establish` →
  `build` → `payoff`), dérivée de la saillance de la donnée exactement comme `barAnchorIndices`.
- **Un `draftText` factuel** — `« Genève — 1780 CHF »`, une étiquette et une valeur, jamais une
  interprétation. Il vit dans `draftText`, **jamais dans `text`**, donc le verrou
  `unauthoredBeats` continue de bloquer la production tant que le journaliste n'a pas écrit.
- **`beatSource`** — `sharedFacts(nativeType, values)` prend déjà un simple `number[]` et
  `map-story.ts:265` construit déjà `valueByKey`. C'est un appel à brancher, pas une capacité à
  inventer.

**L'appariement au passage d'article reste éditorial**, porté par la prose du skill comme pour
`suggest-image` : la vision/le modèle sert au **rapprochement et à l'ordre**, les mots viennent du
passage rapproché. ③ livre la mécanique (structure, verrou, faisabilité) ; il ne fabrique pas de
prose.

## 4. La faisabilité, mécanique — la 3e fonction du storyboard

Un beat proposé porte `movement` / `animation` / `durationMs` (champs livrés par ②). La proposition
ne les compose que dans le vocabulaire que le moteur cible **déclare** (①), et
`beatMotionErrors(beat, {engine, nativeType, format})` revalide avant le produce. Un geste inconnu
**refuse bruyamment, en nommant l'alternative** — le refus est la porte de sortie du journaliste,
précédent établi par l'ancre inconnue.

C'est le premier appelant de `lib/core/beat-motion.ts`, que ② a livré sans consommateur.

## 5. Ce que ③ ne fait PAS

- **Il ne câble aucun renderer.** Les 7 `*Reveal` continuent d'ignorer les beats après ce lot ;
  c'est ④. Sans cette borne, ③ dérive vers ④.
- **Il n'ouvre pas la vidéo du track chart** — pour la même raison, et le refus doit le dire.
- **Il ne touche pas `route`/`hex-grid`** (§ 2).
- **Il ne rédige pas** : aucune phrase publiable n'est produite par la machine.

## 6. Les règles non négociables

1. **Aucun champ neuf requis.** Les trois champs de mouvement restent optionnels ; un run d'hier
   doit reprendre. (Le raté du bump 5→6 : optionnel dans le schéma, obligatoire dans le garde.)
2. **`draftText` n'est jamais promu en `text`.** Un beat suggéré non confirmé bloque la production
   — vérifié par mutation, pas par lecture.
3. **Le routage ne crée jamais d'impasse.** `canDraftBeats` reste **la seule réponse** lue par le
   routeur ET par le drafter — un type que le drafter refuse ne doit pas y être routé, sinon le run
   répond éternellement une action impossible (le défaut exact que la carte et l'image ont déjà
   payé, `beats.ts:95-107`). Les types hors périmètre (`route`, `hex-grid`, chart · `video`)
   produisent exactement comme aujourd'hui, sans détour.
4. **Chaque garde doit être vu rougir** pour la bonne raison, mutation appliquée vérifiée avant
   d'être crue.
