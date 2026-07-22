# Spec — S2-slice-2 : parité claim-arc pour map-native (workhorse-first)

> **Statut :** design validé (brainstorming superpowers, 2026-07-21). Prêt → writing-plans.
> **Origine :** suite de S2-slice-1 (`docs/superpowers/specs/2026-07-21-claim-arc-narrative-design.md` §3.5) —
> le claim-arc existe pour chart-native ; map-native n'a AUCUN override journaliste. Cette slice l'ajoute.

## 1. Problème

Le claim-arc (S2-slice-1) donne au journaliste le contrôle de l'ARGUMENT d'un scrolly chart-native
(`spec.beats` avec `role`). Côté carte, **rien** : les 6 dériveurs de story map (`deriveMapStory` choroplèthe,
`deriveSymbolStory`, `deriveRouteStory`, `deriveCartogramStory`, `deriveDotDensityStory`,
`deriveHexGridStory`, `deriveLocatorStory`) dérivent leurs beats **par saillance seule**, et
`validate-gate.ts:124` **REJETTE** explicitement `spec.beats` sur la piste carte. Une map-story reste le
data-dump que S2 corrige ailleurs. La sprawl (6 dériveurs, signatures/ancres différentes) est réelle → on
livre en **workhorse-first**.

## 2. Décisions verrouillées (brainstorming)

- **Workhorse-first** (choix Rémy) : l'override journaliste `arcBeats` est câblé sur les **2 dériveurs les
  plus utilisés — choroplèthe (`deriveMapStory`) + symbole (`deriveSymbolStory`)** — via **un helper
  partagé** `applyMapArc`. Les **4 autres** (route, cartogramme, dot-density, hex-grid, locator) reçoivent
  le **modèle de rôle sur le `Beat`** (cohérence) mais leur override est un **follow-up assumé**. SKILL.md
  dit EXACTEMENT quels types carte acceptent un arc confirmé (jamais promettre l'inexistant — leçon
  S2-slice-1).
- **`arcErrors` factorisé en `lib/core/claim-arc.ts`** (engine-agnostic, opère sur `{role?, text?}[]`).
  chart-native l'importe de `lib/core` + **re-exporte** (ses tests inchangés) ; map-native l'importe aussi.
  Respecte l'import-guard (engines n'importent QUE `lib/core`, jamais le `src/` d'un autre engine).
- **Champ d'override = `arcBeats`, PAS `storyBeats`** — `conformance.ts:148` utilise déjà `storyBeats` pour
  un **compte** de beats ; collision évitée. `MapArcBeat = { region: string; role?: ArcRole; text?: string }`
  (`region` = valeur de clé-de-jointure = l'analogue carte du `x` chart).
- **Story-warrant : réutilisé tel quel** (S2-slice-1, `assessStoryArc`) — pas de nouvelle heuristique carte
  dans cette slice ; le magnitude/temporel d'une carte relève des mêmes formes (dispersion / séquence).
- **Grounding : rien de neuf** — même taxonomie E/I/P/R (Cohn/Amini) que S2-slice-1.

**Non-objectif :** les 4 dériveurs long-tail (override) ; une nouvelle heuristique warrant carte ; toucher
au rendu des beats (les composants walkent déjà `Beat[]`).

## 3. Architecture

### 3.1 Fondation partagée (tous les types carte en profitent)
- `lib/core/claim-arc.ts` : `ARC_ROLES`, `ArcRole`, `arcErrors(beats)` (déplacés verbatim depuis
  chart-native `chart-story.ts` ; chart-native re-exporte pour ses tests). Barrel `lib/core/index.ts` :
  `export * from "./claim-arc"`.
- `Beat.role?: ArcRole` ajouté au `Beat` de map-native (`map-story.ts`). Aucun rendu ne change ; le rôle
  QUALIFIE le beat (la caption affirme l'argument par rôle) au lieu d'un simple libellé de point.

### 3.2 L'override journaliste (choroplèthe + symbole)
- Le spec/config carte gagne `arcBeats?: MapArcBeat[]`. Validation par-type (choroplèthe + symbole) :
  chaque `region` existe dans la jointure/les données + `arcErrors` (arc bien-formé) — **fail-loud
  pré-produce**, miroir de la garde chart.
- **Helper partagé `applyMapArc(revealCandidates, arcBeats, ctx)`** : transforme un plan d'arc confirmé
  (validé) en `Beat[]` de reveal ordonnés, portant `role` + la claim `text`. Réutilisé par `deriveMapStory`
  et `deriveSymbolStory`. **Absent ⇒ la dérivation par saillance existante, byte-identique.**
- **Un-reject de la piste carte** (`validate-gate.ts:121-128`) : remplacer le rejet « beats non supporté
  sur la piste carte » par la validation de `arcBeats` (appel de la validation carte). **Garder le rejet du
  champ chart-only `beats` sur une carte** (mauvais champ = fail-loud) — `arcBeats` est le champ carte.

### 3.3 Fallback flaggé (carte)
- Équivalent carte de `narrativeFallbackWarning` : une map-story (choroplèthe/symbole) **sans `arcBeats`
  confirmés** émet un warning non-bloquant à Gate 3a (via `ProposalResult.warnings`) — narratif auto-pické
  par saillance ≠ argument confirmé. Rendu VISIBLE, jamais bloqué.

### 3.4 Front (prose)
- SKILL.md : le claim-arc carte accepte un arc confirmé **UNIQUEMENT pour choroplèthe + symbole** (via
  `arcBeats` région-ancré) ; les autres types carte dérivent leurs beats (follow-up). Gate 1b : même flux
  qu'un chart-scrolly (proposer l'arc, journaliste confirme/veto), pinné en `arcBeats`. Jamais promettre un
  override sur un type carte qui ne l'a pas encore.

## 4. Plan de migration (incrémental, gate vert à chaque pas)
1. Extraire `arcErrors`/`ARC_ROLES`/`ArcRole` → `lib/core/claim-arc.ts` ; chart-native import+re-export ;
   barrel export ; chart-native tests toujours verts.
2. `Beat.role` + `MapArcBeat` + `arcBeats?` sur le spec carte ; validation par-type (choroplèthe+symbole) :
   region existe + arcErrors, fail-loud. Test : arc valide passe ; region inexistante / arc mal-formé →
   erreur nommée.
3. `applyMapArc` (helper partagé) + câblage `deriveMapStory` (choroplèthe) + `deriveSymbolStory` : absent ⇒
   byte-identique ; présent ⇒ reveals ordonnés portant role+claim. Test des deux dériveurs.
4. Un-reject `validate-gate.ts` (accepte+valide `arcBeats` ; garde le rejet du champ chart `beats` sur
   carte) + fallback flaggé carte. Test : arcBeats valide passe le gate ; carte sans arcBeats → warning ;
   `beats` chart sur carte → toujours rejeté.
5. SKILL.md prose (§3.4) — quels types carte acceptent l'arc, honnêtement.

## 5. Tests
- **Non-régression :** `bun run check` vert à chaque pas ; une map-story sans `arcBeats` REND byte-identique.
- **Arc bien-formé carte :** region inexistante / establish-absent / payoff-absent / 0 build / turn dupliqué
  / claim vide → fail-loud ; arc canonique passe (réutilise `arcErrors`, région-ancré).
- **Les deux dériveurs :** choroplèthe + symbole avec `arcBeats` confirmés → reveals ordonnés role+claim ;
  sans → saillance inchangée.
- **Gate :** `arcBeats` valide passe ; `beats` chart sur carte toujours rejeté ; carte sans arcBeats → warning.
- **Rendu (opt-in, hors gate) :** une map-scrolly choroplèthe avec arc confirmé REND des captions qui
  affirment l'argument par rôle — vérifié au rendu.

## 6. Risques & mitigations
| Risque | Mitigation |
|---|---|
| `applyMapArc` ne se factorise pas proprement sur 2 dériveurs à ancres différentes | Le helper opère sur des `revealCandidates` normalisés (region→beat) ; si les 2 dériveurs divergent trop, le plan bascule sur 2 câblages fins partageant la seule VALIDATION — décidé au plan, testé des deux côtés. |
| Extraction `lib/core` casse un importeur de `arcErrors` | chart-native re-exporte `arcErrors` depuis `chart-story.ts` ; test chart-native re-run après extraction (Task 1). |
| Promettre un override sur un type carte non-câblé | SKILL.md liste EXACTEMENT choroplèthe+symbole (leçon S2-slice-1) ; les 4 autres = `Beat.role` only, override en follow-up documenté. |
| Collision `storyBeats` | Champ nommé `arcBeats` (distinct du compte `storyBeats` de conformance.ts). |
| map-native produce interactif/vidéo flake sous contention (connu) | env, pas régression ; vérifié en isolation (cf. CLAUDE.md). |

## 7. Hors périmètre (S2-slice-2)
- Override sur route / cartogramme / dot-density / hex-grid / locator (follow-up ; ils gagnent `Beat.role`).
- S3 couleur · S4 cert (piliers séparés).

## 8. Références
`skills/map-native/src/{map-story.ts (deriveMapStory, Beat), symbol-story.ts (deriveSymbolStory),
validate-config.ts (validate*Config), conformance.ts (storyBeats count)}` · `skills/splash/src/validate-gate.ts`
(:121-128 rejet piste carte) · `skills/chart-native/src/chart-story.ts` (arcErrors à extraire) ·
`lib/core/{index.ts, claim-arc.ts (nouveau)}` · SKILL.md (Gate 1b carte). Spec parente :
`2026-07-21-claim-arc-narrative-design.md`.
