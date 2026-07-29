# Spec — Des refus qui mordent (sous-projet A du registre de sweep)

> **Statut :** conçu, non implémenté.
> **Origine :** `docs/splash/sweep-2026-07-28-triage.md` — famille A du § 8, matière de conception au § 9.
> **Langue :** prose FR, identifiants et code en anglais (standard non négociable).

---

## 1. Le problème n'est pas que les règles manquent

Elles sont écrites, et bien écrites. `skills/splash/SKILL.md:1178` dit qu'une sortie non-zéro de
`produce-all`, ou tout refus de garde, est **un arrêt dur remonté au journaliste tel quel**.

Le sweep du 2026-07-28 a mesuré ce qu'il en advient sur 83 parcours réels :

| | |
|---|---|
| **D01** — l'orchestrateur passe outre les refus | **50 / 83** |
| **D02** — validation demandée sur un rendu jamais montré | **56 / 83** |
| **D15** — le gate de relecture s'auto-atteste | **10 / 83** |
| D11 — « Livré » annoncé sans livrable | 16 prouvés / 36 suspects |
| D04, D20, D19, D07, D14, D06 | ~40 au total |

Décomposition de D01 : 37 specs écrites à la main, 17 `produce` sortis en non-zéro et contournés,
5 violations de conformance ignorées, 3 runs sans `candidates.json`, 1 sans `produce` du tout.
Et dans plusieurs cas, **sans le dire au journaliste**.

**Les gardes fonctionnent.** Ils détectent, ils refusent, ils enregistrent. Ce qui manque, c'est
qu'un refus **arrête** quelque chose. Aujourd'hui il informe un acteur libre de l'ignorer.

Donc ce sous-projet n'écrit aucune règle nouvelle et n'ajoute aucun garde-fou. Il change **ce qui
arrive quand un garde refuse**. Une spec qui ajouterait un contrôle sans répondre à cette
question-là reproduirait exactement le défaut qu'elle prétend corriger.

## 2. Les trois décisions prises

**(a) Un refus DÉVIE vers le pas qui débloque** — il ne se contente pas d'arrêter. Le journaliste
n'est jamais devant un mur : le refus nomme ce qui manque *et* route vers l'action qui le résout.
Conséquence structurante : ce routage existe déjà dans la boucle (`nextActionsForElement`) et
n'existe pas dans la prose.

**(b) Avant toute demande de validation, splash doit avoir PARTAGÉ et OUVERT l'artefact.** Pas
« prouver que le journaliste a regardé » — le journaliste regarde, c'est son travail. Splash ouvre,
c'est le sien. Un média est affiché ou joué ; un HTML est **lancé**. Lire la source d'un HTML ne
montre rien — c'est le piège que la première version de cette règle contenait.

**(c) Les probes décident, un relecteur distinct juge l'éditorial.** Deux natures de vérification :
un fait et une opinion. Les mélanger est précisément ce qui a permis à une opinion de se faire
passer pour un fait — deux cas ont enregistré un `pass` sur un test qui avait planté ou n'avait
jamais tourné.

## 3. Les trois mécanismes

### ① Les faits sur le disque deviennent des pré-conditions dures

Certaines des règles violées sont vérifiables **sans juge, sans modèle, sans heuristique de texte** :

- **`candidates.json` absent ⇒ `suggest-chart` n'a pas tourné.** La production ne démarre pas.
- **`config.json` / `native-source.json` parmi les livrables ⇒ on remet le dossier de production,
  pas un export.** L'export n'est pas déclaré fini.

Le second n'est pas une intuition : le dépouillement a mesuré que **les 16 non-livraisons prouvées
sont toutes à l'intérieur des 36 cas qui ont remis ce dossier, et zéro en dehors**. Un contrôle de
trois lignes remplace là une opinion de juge.

Ces pré-conditions sont des `existsSync`. Elles ne se discutent pas, et elles couvrent la majorité
de D01 et de D11.

### ② Le partage-et-ouverture conditionne la validation

La demande de validation n'est **recevable** que si l'artefact concerné a été partagé et ouvert
dans le tour précédent, et que c'est **le même artefact** qui part ensuite en validation.

Cette seconde moitié est essentielle et déjà construite : l'approbation se lie à l'empreinte de
l'artefact (`approvalSubjectOf`, et pour l'hébergé la liaison URL + pixels posée le 2026-07-28).
« Montré » et « approuvé » doivent désigner les mêmes octets, sinon on montre une image et on en
approuve une autre.

Le contrôle porte donc sur **une action observable** — un partage a-t-il eu lieu, sur quel fichier —
et non sur l'attention d'un humain.

### ③ La revue se scinde

- **Les probes décident du passage.** Leur sortie est LUE par la porte (code de sortie, rapport
  machine), jamais rapportée par l'agent. On ne peut pas déclarer vert un contrôle qu'on n'a pas
  lancé quand la porte lit elle-même son résultat.
- **Un relecteur distinct juge l'éditorial** — le titre porte-t-il le takeaway confirmé (D16, 13
  cas), la couleur sert-elle le sujet — et il n'a pas écrit la spec.

Le coût est un aller-retour par visuel, et il est payé **uniquement sur la moitié qui demande un
jugement**. La moitié mécanique ne coûte rien de plus qu'aujourd'hui.

## 4. Où ça vit — et pourquoi ça referme un morceau du pont

La décision (a) tranche l'implantation. Dévier suppose de savoir vers quoi router ; ce routage
existe dans la boucle et pas dans la prose.

**Les trois mécanismes vivent dans la boucle. La chaîne en prose les APPELLE** au lieu de porter la
règle en texte. La prose garde ce qu'elle fait mieux — lire l'article, mener le dialogue, détecter
la langue — et cesse d'être ce sur quoi repose la garantie.

C'est la première descente concrète du modèle « la peau et le socle » recommandé par
`docs/splash/two-chains-gap-2026-07-28.md`, et elle referme la famille A **et** un morceau du pont
d'un même geste. Aucun pont exécutable n'existe aujourd'hui : zéro import de `lib/loop` depuis
`skills/`. Ce sous-projet en crée le premier segment, celui des garanties.

## 5. Hors périmètre, dit explicitement

- **Les familles B, C et D** du registre (contenu faux qui atteint le lecteur ; capacité et
  validation ; placement à la livraison). Elles ont leurs propres specs, et elles dépendent de
  celle-ci : tant qu'un refus n'arrête rien, tout garde-fou ajouté ailleurs reste consultatif.
- **Le pont dans son ensemble** — seul le segment des garanties est ici.
- **Tout nouveau garde-fou.** On ne corrige pas la détection : elle fonctionne.
- **D02 pour la chaîne V1 en prose seule** : si le partage-et-ouverture ne peut pas être rendu
  observable côté prose, la règle descend dans la boucle ou elle cesse d'être promise — mais elle
  ne reste pas écrite sans être tenue.

## 6. Risques assumés

- **Dévier demande un catalogue.** Chaque refus doit savoir vers quel pas router. Un refus sans
  déviation écrite retombe sur un arrêt — acceptable, mais il faut le dire au journaliste plutôt
  que de le laisser deviner, et suivre lesquels restent sans sortie.
- **Le relecteur éditorial distinct coûte un aller-retour par visuel**, et rien ne garantit qu'il
  juge mieux. Ce qu'il garantit, c'est qu'il ne juge pas son propre travail.
- **Le contrôle de partage peut se contourner** — partager sans que rien ne s'affiche, lancer un
  HTML qui rend blanc. Il rend le mensonge coûteux, pas impossible. La liaison montré↔approuvé est
  ce qui empêche le cas grave (approuver autre chose que ce qui a été vu).
- **Ce sous-projet ne mesure pas la qualité éditoriale.** Il garantit qu'une règle tenue est tenue.
  Un visuel correct mais mal choisi passera toutes ces portes.
