# Audit #2 — orchestration stricte + qualité (narratif · couleur · flow · tests) — 2026-07-21

> Deuxième audit, plus profond, déclenché par une critique fondée de Rémy après une certification faible :
> « les tests n'ont pas testé le bon fonctionnement du flow, rien de neuf (thèmes réutilisés, un type = un
> thème/format), et ma façon de juger n'est pas performante (narratif data-dump, colorimétrie parfois pas top,
> échanges du flow). Audit + benchmark best-practices : outils agentiques, production, qualité visuelle,
> dataviz. Tom : Spotlight a un orchestrateur STRICT (plan conditionnel étape-par-étape, pas d'off-road,
> appelle les tools/skills/templates pré-conçus à chaque étape ; inspiré de superpowers). »
> Méthode : 6 agents de recherche parallèles, sourcés. Contexte déclencheur : la certification (cf.
> `runs/*-2026-07-21T19-58-59-759Z`) a surfacé un **critical improvisation** (l'acteur a hand-authoré un spec
> + contourné le gate) — symptôme de ce que Spotlight empêche.

## 0. La thèse convergente (6 agents indépendants, même conclusion)

Le problème n'est **pas** la topologie (le routing Suggesteur→exécuteur est sain — le 1ᵉʳ audit avait raison).
C'est un problème de **control-flow + capability**, et il se règle en **déplaçant le seam au bon endroit** :

> **FRONT-END éditorial (INPUT→CADRAGE→PROPOSITION) : flexible, model-driven, mais plus RICHE et CONFIRMÉ.**
> Le récit d'un journaliste n'est pas un pipeline figé ; le geler dégraderait la qualité qui distingue Splash.
> **BACK-END production (PRODUCTION→EXPORT) : STRICT par CONSTRUCTION.** Tâche bien-définie, à effets de bord ;
> « pas d'off-road » y est un pur gain, à coût éditorial nul.

Anthropic le dit en toutes lettres : *workflow* (chemins de code prédéfinis) pour le bien-défini, *agent*
(le modèle dirige ses outils) pour l'ouvert. Splash a construit son **back-end comme un agent** (c'est ainsi
que l'acteur a grep `spec-to-config.ts` + hand-run un script) alors que la production **doit être un workflow**.

## 1. Orchestration — strict vs actuel (agent 1)

- **L'improvisation = un bug de forme + de capability, pas de topologie.** Une règle que le modèle est *prié*
  de suivre (SKILL.md « Never hand-author ») **n'est pas une frontière d'exécution** (OWASP). Seul un **chemin
  de code que le modèle ne peut pas contourner** l'est. Splash's gates étaient de la prose pour le back-end.
- **Le changement à plus haut levier (réutilise ce qu'on a bâti) :** pendant la production, **retirer le
  shell brut/scripts bas-niveau de l'acteur** + exposer **le registre/dispatcher** comme **seul** outil de
  production + **export refuse tout artefact sans marqueur de provenance produce-all**. → « l'acteur *devait* »
  devient « l'acteur *ne peut que* ».
- **Options** : A (recommandée) durcir le seam sans réécriture ; B state-machine explicite du back-end seul
  (Spotlight scopé — `PROPOSED→PRODUCING→VERIFYING→AWAITING_FORM→EXPORTING→DELIVERED`, edges en code) si A
  récidive / si on veut la durabilité crash ; C (rejetée) tout-strict front+back — gèlerait l'éditorial.
- **Spotlight reconstruit** = la boucle plan-execution de superpowers (plan validé = control-flow · 1 tool/
  template pré-conçu par étape · review-gate entre étapes · ledger durable · STOP-and-ask) promue de dev-time
  à runtime, appliquée **au back-end**.
- Sources : Anthropic building-effective-agents · LangGraph (edges=code) · 12-factor (own-your-loop) · OWASP
  (allowlist=frontière, pas prompt) · durable-execution (provenance journalisée).

## 2. Production par templates (agent 2)

- La couche exécuteur est **déjà** template-driven (`assets/` battle-tested + `scripts/produce.mjs` +
  `produce-all.mjs` = outil unique). **Le trou est au boundary orchestrateur** : sanctionné par PROHIBITION,
  pas par CONSTRUCTION.
- **Mesuré par superpowers : les prohibitions BACKFIRENT** sous incitation concurrente (l'arm « don't X »
  produit *plus* d'indésirable que l'absence de consigne). Le fix (« Match the Form to the Failure ») : un
  bypass/omission exige une **contrainte STRUCTURELLE**, pas de la prose.
- **Reco (une phrase) :** faire de « sélectionner le composant pré-conçu du type → remplir sa config validée →
  appeler l'outil unique » le **seul chemin atteignable** ; convertir chaque « Never » prose en impossibilité.
- **Déjà fait (audit #1) :** le **registre** retire la raison de grep `src/` (le fix structurel #1) ·
  descriptions trigger-only · deep-verify auto. Customization journaliste = **remplir des slots**, jamais
  réécrire. Résidu éditorial (titre=takeaway, palette-sujet) = **gate humain nommé**, pas templatable.

## 3. Narratif scrolly/story (agent 3, a lu `chart-story.ts`/`map-story.ts`)

- **Diagnostic : les beats viennent de la SAILLANCE DES DONNÉES, pas de l'ARGUMENT.** `lineNotableIndices`
  (premier+dernier+2 plus gros sauts), `barRankedReveals` (top-3+queue). Le `confirmedTakeaway` ne nourrit
  que le beat de clôture. → **arc accidentel, pas de Peak/turn = le data-dump.**
- **Fix (inversion) :** dériver le plan de beats **du takeaway** → **claim-arc** (`establish→build→turn→
  payoff`), **vetoé par le journaliste (élargir Gate 1b de « le takeaway » à « le claim-arc qui le prouve »)**.
  Chaque beat porte `claim`/`anchor`/`role`. **Rétrograder le picker de saillance en fallback flaggé.**
- **Gate story-warrant** : refuser scrolly/vidéo si la donnée ne porte pas d'arc (ranking plat, snapshot,
  scatter non-corrélé → chart annoté simple).
- **Non-mécanisable (gate journaliste) :** quel point est le turn · si un beat avance l'argument · le « so
  what » de l'annotation. Sources : Amini (E/I/P/R) · Segel & Heer (martini-glass) · McKenna · Tse (NYT).

## 4. Colorimétrie (agent 4)

- **WCAG+CVD-safe ≠ beau.** La rampe maison est en **HSL** → bandes/kinks/midpoints boueux (le « pas top »).
- **Fix racine : reconstruire la house-ramp en OKLCH/CAM02-UCS** (perceptuel) — L linéaire, span ≥ 0.60, pas
  d'interpolation boueuse. **Garde la CVD-safety, ajoute l'uniformité perceptuelle.** + **gate d'uniformité de
  rampe** (frère du snap WCAG). + discipline **accent/neutre** (1 accent, reste gris = le plus gros levier
  « pro ») + plafond chroma muté + saturation f(fond) + neutres teintés + **une palette au niveau story**.
- **Presque tout MÉCANISABLE**, se branche sur `deriveFurniture`/conformance-gates existants. Sources :
  Borland-Taylor · matplotlib/viridis · Datawrapper (Muth) · Heer (semantic colors) · CSS Color 4 OKLCH.

## 5. Flow conversationnel + méthodo de certification (agent 5)

- **Rubrique flow (A1-A8)** : bonne-question/bon-moment · une-question/tour · pas-sur-demander · options+reco+
  pourquoi-vetoable · **montrer-avant-valider (A5 gate dur)** · adapter-expertise · confirmer-takeaway ·
  **pas-d'off-road (A8 gate dur)**. Assertables **depuis le transcript** (métriques de process).
- **La cert était faible sur 3 axes → fix :** (1) « rien testé du flow » → **assertions de process** ; (2)
  « thèmes réutilisés, un type=un thème » → **covering array pairwise (NIST/ACTS, contraintes=isFormatAllowed)**
  + **cellules NOUVELLES générées + mutations adversariales** + protocole de fraîcheur ; (3) « juge+0-critical »
  → **juges par-dimension isolés (Cairo 5) · pairwise>absolu · calibration κ≥0.6 juge-vs-humain · gate
  éditorial humain** (Yvan/Rinny). Sources : Anthropic demystifying-evals · Zheng (biais juge) · NIST · Cairo · NYT.

## 6. Audit critique de nos tests + résultats (agent 6, quantifié)

- **~40% des parités `lib/core` sont TAUTOLOGIQUES** (`core.X()` comparé à un re-export de lui-même — ne peut
  pas échouer). ~33/83 `it`. Pires : `theme.test` (0 vraie assertion), `video-verify.test` (0). *(FINDING-A
  chiffré.)* Nuance : la vraie valeur est protégée AILLEURS (`frame-furniture-derive`, `snap-video`) → **bruit
  mort**, pas primitive nue. Plus fins en couverture réelle : luminance-valeur exacte + **`themeBg` arbitraire**.
- **Forts (le modèle) :** import-guard, contract, registry, produce-conformance, brand-profile drop-proof —
  mutation-resistant.
- **Vert-alors-que-cassé :** gate ne lance pas les snaps ; **map render self-skip sans clé → tout le render
  carte non-certifié** ; narratif/couleur/titre-takeaway/lang jamais unit-testés ; deep-verify DOM + e2e réel
  **stubbés**. **Vrai bug** : `sandbox.ts:305` `l.worktreeDir`→`l.link` (test qui l'attrape mais **aucune CI
  harness**).
- **La cert :** pas « 0 critical » — **1** (le hand-authored-spec, **corroboré sur ≥4/10** = régression flow
  systémique sous-pondérée). 79% findings juge-authored (faillibles), 27% avec hedge. **8/10 thème clair, 2 le
  même charbon → `themeBg` arbitraire quasi non-certifié.** = **re-run de matrice, pas stress-test.** Net :
  « delivered ≈ ça n'a pas crashé ». **Bar faible.** Sources : ploeh (tautological) · Google-Testing
  (change-detector) · mutation-testing.

## 7. Recommandations priorisées (croisées, impact/effort)

**Le gros chantier (décision d'archi — brainstorming) :**
- **S1 · Seam PROPOSITION→PRODUCTION.** Back-end strict par construction : registre = seul outil de production,
  **retirer le shell/scripts bas-niveau à l'acteur pendant la production**, **export provenance-gated**. Tue
  l'improvisation *mécaniquement*. (Option A d'abord ; B state-machine si récidive.)
- **S2 · Claim-arc narratif.** Élargir Gate 1b au **claim-arc** ; beats dérivés de l'argument ; picker de
  saillance = fallback ; **gate story-warrant**.
- **S3 · Couleur OKLCH.** House-ramp perceptuelle + gate d'uniformité + accent/neutre + palette-story.
- **S4 · Certification rigoureuse.** Covering-array combinatoire + cellules générées/adversariales + juges
  par-dimension calibrés κ + **gate éditorial humain** + assertions de process (rubrique flow A1-A8).

**Nettoyage de dette (mécanique, faible risque) :**
- **T1 · Tuer les parités tautologiques**, remplacer par golden values ; mutation-run sur `lib/core`.
- **T2 · Lane render en CI** (clé provisionnée ou tuiles mockées) — le render carte est le plus gros trou.
- **T3 · Donner une CI au harness** + fixer `sandbox.ts:305` (vrai bug non-gaté).
- **T4 · Reframe la cert honnêtement** (1 critical, déterministe vs juge-opinion) — pas du théâtre.

**Déjà fait (audit #1, à reconnaître) :** registre (le fix structurel #1 de l'improvisation) · descriptions
trigger-only · deep-verify auto · gate palette-sujet · plancher map-dw · snap contraste carte · reduced-motion.

## 8. La décision centrale (pour le brainstorming)

Le programme se lit en une phrase : **enrichir + confirmer le front-end éditorial (claim-arc, couleur
sémantique, montrer-avant-valider) ; rendre le back-end production strict PAR CONSTRUCTION (registre seul,
contraintes structurelles, OKLCH, provenance) ; certifier RIGOUREUSEMENT (combinatoire + κ + gate humain).**
Une grande part du volet strict réutilise ce qu'on a déjà bâti (le registre surtout). Le fork à trancher :
**jusqu'où pousser la strictness (durcir le seam — option A — vs state-machine explicite — option B), et dans
quel ordre attaquer S1-S4 vs la dette T1-T4.** → superpowers:brainstorming.
