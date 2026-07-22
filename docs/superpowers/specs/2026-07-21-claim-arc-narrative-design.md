# Spec — S2 : claim-arc narratif (l'argument pilote les beats, pas la saillance)

> **Statut :** design validé (brainstorming superpowers, 2026-07-21, grounding sources fait). Prêt → writing-plans.
> **Origine :** audit #2 `docs/splash/audit-2026-07-21-orchestration-and-quality.md` §3, pilier **S2**.
> **Déclencheur (retour Rémy) :** « le narratif du scrolly ou story n'est pas très bien adapté hormis
> sortir les données les unes à la suite » — le **data-dump**. La séquence de beats est un **arc accidentel**.

## 1. Problème

Les beats d'un scrolly/vidéo viennent de la **saillance des données**, pas de l'**argument** :
- `lineNotableIndices` = premier + dernier + les 2 plus gros sauts (chart-native `chart-story.ts:34`).
- `barRankedReveals` = top-3 + queue (`chart-story.ts:58`). `scatterNotableIndices` = extrêmes (`:78`).
- map-native `map-story.ts` (`deriveMapStory`) : même logique (rangs/années saillants).
- Le `confirmedTakeaway` ne nourrit **que le beat de clôture** (`kind:"takeaway"`), jamais la séquence.

Résultat : la structure est `title → establish → reveal* → takeaway`, mais les `reveal` sont un tri de points
saillants — **pas de Peak/turn construit**, pas d'argument qui progresse. C'est le data-dump.

Il existe DÉJÀ un chemin d'override confirmé — `spec.beats` (`NarrativeBeat[]`, `spec-to-config.ts:23`),
validé fail-loud (`narrativeBeatErrors`, ancre inexistante = throw). Mais le **défaut** (beats absents) est
le picker de saillance, et un `NarrativeBeat` ne porte que `{x?, xEnd?, category?, text?}` — **pas de rôle
narratif**. S2 s'appuie sur ce seam d'override : il en fait le chemin normal (arc confirmé), pas l'exception.

## 2. Décisions verrouillées (brainstorming)

- **Le seam S1 s'applique au narratif.** Le **jugement éditorial reste model-driven + vetoable** (quel point
  est le *turn*, si un beat fait avancer l'argument, le « so what » d'une annotation = **non-mécanisable**,
  gate journaliste — audit §3). Le **code enforce la STRUCTURE** (rôles bien formés, ancres réelles, warrant,
  flag du fallback). Front flexible, back strict — comme S1.
- **Story-warrant = PROPOSITION, journaliste vetoable** (choix Rémy Q1). Donnée sans arc (ranking plat,
  snapshot, scatter non-corrélé) → `suggest-chart` **propose** un chart statique annoté au lieu du
  scrolly/vidéo, en disant pourquoi ; le journaliste peut **override** vers le scrolly. **Pas de refus dur en
  production.** (Écarté : hard-refuse ; écarté : flag interne seulement — garde le data-dump.)
- **Taxonomie GROUNDÉE** (recherche sources, 2026-07-21) : `establish → build → turn → payoff` ≙ la grammaire
  narrative de **Cohn — Establisher / Initial / Peak / Release (E/I/P/R)** — *Cohn, N. (2013), « Visual
  Narrative Structure », Cognitive Science 37(3):413-452* — **adaptée à la data-video par Amini** — *Amini, F.
  et al. (2015), « Understanding Data Videos », CHI '15:1459-1468*, motif dominant réel **`E+I+PR+`*. On garde
  les labels en clair (établir/construire/bascule/résolution) côté journaliste ; on **cite les termes
  canoniques** dans le code/docs pour la traçabilité. `build` (= Initial + Prolongation de Cohn) **peut se
  répéter** — l'arc n'est PAS 4 beats rigides ; le motif canonique est `E, I+, P, R` (Peak obligatoire).
- **★ Honnêteté grounding (feedback→système) :** l'heuristique story-warrant — « certaines formes de données
  ne méritent pas un arc » — **n'est PAS groundée** dans la littérature (recherche : aucune source citable ne
  l'affirme ; Segel & Heer axe auteur↔lecteur + McKenna « role of visualization » + Kosara présentation-vs-
  analyse en sont des appuis *adjacents*, pas la règle). Elle est inscrite comme **HEURISTIQUE DESIGN maison
  explicite**, jamais présentée comme best-practice créditée — le commentaire de garde et le spec le disent.
- **Modèle d'interaction ≠ arc.** Le martini-glass de Segel & Heer (auteur-driven → lecteur-driven) est
  **orthogonal** à la séquence de rôles — hors périmètre S2 (on ne le conflate pas avec le claim-arc).

**Non-objectif :** ré-écrire les renderers (ils walkent déjà les beats) ; toucher au front éditorial au-delà
de l'élargissement de Gate 1b (prose) ; S3 couleur ; S4 cert.

## 3. Architecture

### 3.1 FRONT (model-driven, prose — `skills/splash/SKILL.md` + `suggest-chart`)
- **Gate 1b élargi** : de « confirmer *le takeaway* » à « confirmer *le claim-arc qui le prouve* ». À partir du
  `confirmedTakeaway` + la donnée, l'orchestrateur **PROPOSE** un plan de beats `establish → build+ → [turn] →
  payoff` — chaque beat = un **rôle** + la **claim** qu'il affirme (le « so what ») + son **ancre** (point de
  donnée) — le journaliste **confirme / ajuste / veto**. Le plan confirmé est épinglé dans `spec.beats`.
- **`suggest-chart` émet un échafaudage** : pour chaque rôle, des **ancres candidates** dérivées de la donnée
  (establish = point de départ ; build = la montée ; turn = le plus gros retournement/inflexion ; payoff = le
  point qui porte le takeaway) — pour que l'orchestrateur PROPOSE, sans inventer, et que le journaliste
  n'écrive pas 4 beats à la main. L'échafaudage est une **suggestion**, pas une décision : le rôle *turn* qu'un
  humain retiendrait peut différer du plus gros saut mécanique — d'où le veto.
- C'est là que vit le jugement non-mécanisable. Le back n'en enforce que la forme.

### 3.2 Le modèle de beat DEVIENT un claim-arc (mécanique)
- Étendre `NarrativeBeat` (chart-native `spec-to-config.ts`) et le beat map (map-native) d'un champ
  **`role: "establish" | "build" | "turn" | "payoff"`**. Le `text` existant EST la **claim** du beat (validé
  non-vide) — pas de champ `claim` redondant (leaner ; `anchor` = les `x`/`category` existants).
- **Validation** (étend `narrativeBeatErrors`, fail-loud pré-produce, miroir map-native) :
  - ancres existent dans la donnée (déjà) ;
  - **arc bien formé** : commence par `establish`, finit par `payoff`, **≥ 1 `build`**, `turn` **optionnel**
    (max 1), `establish`/`payoff` uniques ; `build` peut se répéter (Prolongation) ; longueur bornée ;
  - **chaque beat porte une claim** (`text` non-vide).
- Le renderer walke déjà les beats (`kind`) — ajouter `role` ne change pas le rendu, il **qualifie** le beat
  pour que la caption affirme l'argument (rôle connu) au lieu d'un simple libellé de point. (Le mapping
  `role → kind` : establish→establish, build/turn→reveal, payoff→takeaway — le `kind` de rendu existant est
  conservé, `role` est la couche argument au-dessus.)

### 3.3 Analyseur de story-warrant (mécanique, alimente le FRONT — heuristique maison)
- Fonction **pure** `(data, type) → { hasArc: boolean, reason: string }` (`skills/splash/src/story-warrant.ts`
  ou un module partagé lib/core si les deux engines la consomment).
- Heuristiques (bornées, tunables, **étiquetées heuristique-maison** dans le code) :
  - **line / temporel** : un arc = tendance directionnelle nette OU un turn clair (inflexion) ; plat/bruité
    sans direction = pas d'arc.
  - **bar / magnitude** : un arc = vraie dispersion / skew (un leader détaché, une queue) ; ranking quasi-plat
    = pas d'arc.
  - **scatter** : un arc = corrélation au-dessus d'un seuil ; nuage non-corrélé = pas d'arc.
- `suggest-chart` consomme `hasArc` pour **proposer** statique-annoté vs scrolly/vidéo (§2, vetoable). **Aucun
  refus de production.** Le `reason` est surfacé au journaliste dans la proposition (pourquoi le statique sert
  mieux) — et est révisable par veto.

### 3.4 Rétrograder le picker de saillance en fallback FLAGGÉ (mécanique)
- Quand `spec.beats` absent, l'auto-pick (`lineNotableIndices` / `barRankedReveals` / `deriveMapStory`) tourne
  **toujours** (byte-identique) — MAIS émet un **flag mécanique** `beatsAutoPicked: true` (dans le
  `ProduceReport` du proposal, à côté des champs existants) → **surfacé à la render-review (Gate 3a)** comme
  « narratif auto-généré par saillance, non confirmé comme argument ». Un scrolly non-authoré ne peut plus
  **shipper silencieusement comme s'il portait un argument confirmé**. (Ce n'est PAS un blocage — le fallback
  reste livrable ; il est rendu VISIBLE, pas caché.)

### 3.5 Les deux engines
- **chart-native** (`chart-story.ts`) d'abord — le seam d'override le plus mûr — puis **map-native**
  (`map-story.ts`) : même modèle de rôle, même validation, même flag. Le story-warrant couvre les deux.

## 4. Plan de migration (incrémental, gate vert à chaque pas)
1. `role` sur `NarrativeBeat` (chart-native) + validation d'arc bien-formé (étend `narrativeBeatErrors`),
   fail-loud. Test : arc valide passe ; establish manquant / payoff absent / 0 build / turn dupliqué / claim
   vide → erreur nommée.
2. Fallback flaggé : `beatsAutoPicked` émis quand beats absents, surfacé à la review. Test : produce sans
   beats → flag présent + review le montre ; produce avec beats confirmés → pas de flag.
3. Story-warrant analyzer (pure fn) + intégration `suggest-chart` (propose statique quand `!hasArc`,
   vetoable). Test : données arc → scrolly proposable ; ranking plat / snapshot / scatter non-corrélé →
   statique proposé + `reason`, override scrolly possible.
4. map-native : `role` + validation + flag + warrant (miroir chart-native). Test : idem sur map-story.
5. FRONT prose : SKILL.md Gate 1b élargi (claim-arc confirmé, échafaudage suggest-chart, veto) — guidance,
   pas de nouvelle frontière mécanique (le mécanique est §3.2-3.4).

## 5. Tests
- **Non-régression :** `bun run check` vert à chaque pas ; happy-path avec beats confirmés = byte-identique.
- **Arc bien-formé :** les cas d'échec de §4.1 fail-loud ; un arc canonique `E, I+, P, R` passe.
- **Fallback flaggé :** absence de beats → `beatsAutoPicked` + surfacé review ; jamais silencieux.
- **Story-warrant :** matrice (line trend / line plat / bar skew / bar plat / scatter corrélé / scatter nuage)
  → `hasArc` correct ; proposition statique-vs-scrolly correcte ; **override journaliste honoré**.
- **Rendu (opt-in, hors gate) :** un scrolly avec claim-arc confirmé REND des captions qui affirment
  l'argument par rôle (establish/build/turn/payoff), pas une liste de points — vérifié au rendu, pas au proof.

## 6. Risques & mitigations
| Risque | Mitigation |
|---|---|
| Sur-rigidité de l'arc (4 beats forcés) bloque un récit légitime | `build` répétable, `turn` optionnel, longueur bornée mais > 4 permise (motif Cohn `E+I+PR+`). |
| Story-warrant heuristique fait un mauvais appel | C'est une PROPOSITION vetoable, jamais un refus ; le journaliste override ; seuils tunables + étiquetés heuristique-maison (pas de fausse autorité). |
| Le flag `beatsAutoPicked` sur-alerte le happy-path confirmé | Le flag n'est émis QUE si `spec.beats` absent ; un arc confirmé ne le porte jamais. |
| Inscrire une règle non-groundée comme best-practice | Interdit (déc. §2) : story-warrant = heuristique maison explicite ; seuls E/I/P/R + Segel&Heer + McKenna sont crédités (sources réelles vérifiées). |
| Divergence chart-native / map-native | Modèle de rôle + validation factorisés (partagés si propre, sinon miroir testé des deux côtés — décision au plan). |

## 7. Hors périmètre (S2)
- **S3** couleur OKLCH · **S4** cert rigoureuse → specs séparées.
- Modèle d'interaction martini-glass (Segel & Heer) — orthogonal, non traité.
- Génération LLM du texte de claim (le « so what » rédigé) — reste au front éditorial (suggest-article/le
  journaliste), pas un générateur mécanique ; le back valide qu'une claim EXISTE, pas sa qualité rédactionnelle.

## 8. Crédits à inscrire (sources réelles vérifiées 2026-07-21)
```
Rôles narratifs (Establisher/Initial/Peak/Release) — Cohn, N. (2013), « Visual Narrative Structure »,
  Cognitive Science 37(3):413-452 ; adaptés à la data-video — Amini, F. et al. (2015), « Understanding Data
  Videos », CHI '15:1459-1468 (motif dominant E+I+PR+).
Appuis (heuristique de format, NON créditée comme règle) — Segel & Heer (2010), « Narrative Visualization »,
  IEEE TVCG 16(6):1139-1148 (axe auteur↔lecteur) ; McKenna et al. (2017), « Visual Narrative Flow », CGF
  36(3):377-387 ; Kosara & Mackinlay (2013), « Storytelling: The Next Step for Visualization », IEEE
  Computer 46(5):44-50.
```

## 9. Références (audit → file:line)
`skills/chart-native/src/chart-story.ts` (`lineNotableIndices`/`barRankedReveals`/`scatterNotableIndices`/
`ChartBeat`/`narrativeBeatErrors`) · `skills/chart-native/src/spec-to-config.ts` (`NarrativeBeat`/`NativeSpec`) ·
`skills/map-native/src/map-story.ts` (`deriveMapStory`/`Beat`) · `skills/splash/src/validate-gate.ts` (surface
les erreurs de beat pré-produce) · `skills/splash/SKILL.md` (Gate 1b) · suggest-chart (proposition/échafaudage).
Audit : `docs/splash/audit-2026-07-21-orchestration-and-quality.md` §3.
