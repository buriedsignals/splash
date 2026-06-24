# ② Suggester — Runtime + Eval Harness (first cut)

> Sous-chantier ② de la spec-parapluie. Le cœur neuf d'Atelier (le risque-produit). Premier cut :
> `données + intention → 1 ChartSpec validé → dw-chart produit`. ② = l'agent-hôte (modèle Mycroft),
> pas un programme séparé. La valeur d'ingénierie est dans le **harness d'éval** qui rend le jugement
> de ② mesurable et améliorable. No tiers.

## But

Faire de ② une **étape runtime réelle** : à partir de données + une intention éditoriale, l'agent-hôte
(suivant le skill `suggest-chart`) choisit le bon visuel, émet un `ChartSpec` validé, et le produit via
`dw-chart`. Et construire l'**instrument de mesure** (éval) qui dit si ce choix est bon, pour l'améliorer.

## Décisions actées

- **② = l'agent-hôte.** Pas d'appel LLM séparé, pas de backend (cohérent Mycroft/local-first). Le runtime
  du journaliste (Claude/Codex/Gemini) lit le skill + la KB + l'entrée → émet le spec → appelle dw-chart.
- **Périmètre 1er cut :** `données + intention → 1 ChartSpec`. La lecture d'article et le CADRAGE sont différés.
- **Scoring éval :** gate déterministe (valide ∧ garde-fous ∧ famille) + **LLM-juge** (qualité éditoriale).

## A. `suggest-chart` promu en procédure runtime

Le skill passe de doc à **procédure explicite** que l'agent exécute pas à pas. `skills/suggest-chart/SKILL.md`
gagne une section "Runtime procedure" :

1. **Profiler** la donnée : colonnes, types (numérique/catégoriel/temporel), cardinalité, nb de lignes.
2. **Choisir** le type via `knowledge/references/chart-selection.md` (intention → famille → type simple qui sert).
3. **Remplir** le `ChartSpec` en appliquant `design-conformance.md` + les garde-fous (titre = insight ;
   `sort:"desc"` pour un ranking ; `seriesColors` Okabe-Ito si multi-séries ; `transpose` si besoin ;
   une `annotation` pour l'outlier clé ; `numberFormat`).
4. **Self-check** : le spec DOIT passer `validateChartSpec` (les `warnings` sont remontés, pas ignorés).
5. **Produire** : appeler `produceChart(spec, pngPath)` → embed + PNG possédé.
6. **Ou `no-chart`** : si aucun visuel ne sert la donnée/intention, émettre `{ decision:"no-chart", reason }`.

Peu de code neuf : c'est du skill/prompt + rendre l'étape 5 explicite (l'agent invoque le producteur).

## B. Le harness d'éval (l'ingénierie)

```
skills/dw-chart/eval/        (ou skills/suggest-chart/eval/)
  cases/*.json               corpus de cas
  family-types.ts            mapping intention-famille → types DW autorisés (pur, testé)
  score.ts                   scoreSpec() déterministe (pur, testé)
  judge.md                   prompt du LLM-juge + schéma de sortie
  run.md                     procédure du runner (agent-orchestré)
  report-example.md          forme du rapport agrégé
```

### B1. Corpus de cas
`eval/cases/<id>.json` :
```json
{ "id": "unemployment-trend", "data": "year,value\n2018,5.1\n2023,3.7",
  "intent": "How did unemployment change 2018-2023?",
  "expect": { "family": "change-over-time", "maxWarnings": 0 } }
```
Premier corpus : ~8 cas couvrant change-over-time, magnitude, ranking, correlation, distribution,
part-to-whole, multi-séries, et **un cas `no-chart`** (donnée trop pauvre / intention non-viz).

### B2. Mapping famille → types (`family-types.ts`, pur)
```ts
export const FAMILY_TYPES: Record<string, string[]> = {
  'change-over-time': ['d3-lines','d3-area','column-chart','multiple-lines','multiple-columns'],
  'magnitude': ['column-chart','d3-bars','grouped-column-chart','d3-bars-grouped'],
  'ranking': ['d3-bars','column-chart','d3-dot-plot'],
  'correlation': ['d3-scatter-plot'],
  'distribution': ['column-chart','d3-dot-plot','d3-range-plot'],
  'part-to-whole': ['d3-pies','d3-donuts','stacked-column-chart','d3-bars-stacked','election-donut-chart'],
  'deviation': ['d3-bars','column-chart']
};
```

### B3. Scorer déterministe (`score.ts`, pur, testé)
```ts
import { validateChartSpec } from '../src/chart-spec';
import { FAMILY_TYPES } from './family-types';
export interface Score { validates: boolean; familyMatch: boolean; guardrailsOk: boolean; pass: boolean; notes: string[] }
export function scoreSpec(spec: unknown, expect: { family: string; maxWarnings?: number }): Score {
  const notes: string[] = [];
  const v = validateChartSpec(spec);
  const validates = v.ok;
  if (!v.ok) notes.push('invalid: ' + v.errors.join('; '));
  const type = (spec as any)?.type;
  const allowed = FAMILY_TYPES[expect.family] ?? [];
  const familyMatch = allowed.includes(type);
  if (!familyMatch) notes.push(`type ${type} not in family ${expect.family} [${allowed.join(',')}]`);
  const guardrailsOk = v.ok && v.warnings.length <= (expect.maxWarnings ?? 0);
  if (v.ok && !guardrailsOk) notes.push('warnings: ' + v.warnings.join('; '));
  return { validates, familyMatch, guardrailsOk, pass: validates && familyMatch && guardrailsOk, notes };
}
```
Le cas `no-chart` est scoré à part : `pass` si ② a émis `{decision:"no-chart"}` quand `expect.family === "none"`.

### B4. LLM-juge (`judge.md` + schéma)
Donné `(data, intent, emittedSpec)`, le juge note la **qualité éditoriale** :
```json
{ "titleIsInsight": 0.0-1.0, "choiceSound": 0.0-1.0, "rationale": "string" }
```
- `titleIsInsight` : le titre énonce ce que la donnée montre (pas un label / une plage d'années).
- `choiceSound` : le type + les réglages servent vraiment l'intention.

### B5. Runner (agent-orchestré, `run.md`)
Pour chaque cas : l'agent **joue ②** (lit `suggest-chart` + la KB, reçoit `data+intent`, émet le ChartSpec
JSON) → `scoreSpec` (gate déterministe) → l'agent **joue le juge** (`judge.md`, émet le JSON) → collecte.
Agrège : **taux de pass déterministe** (X/N) + **moyennes** `titleIsInsight` / `choiceSound`. Écrit un rapport.
(Implémentable en pratique via dispatch de sous-agents — un ②, un juge — par cas.)

### B6. Boucle d'amélioration
`run baseline → lire le rapport → si ② sous-performe (pass faible ou score éditorial bas) → renforcer
`suggest-chart/SKILL.md` (instructions plus nettes) → re-run`. C'est le mécanisme qui rend ② bon, au lieu d'espérer.

## Flux

```
cas (data+intent) → [agent=② émet ChartSpec | no-chart] → scoreSpec (déterministe)
                                                          → [agent=juge note qualité]
                                                          → résultat/cas → rapport agrégé
```

## Composants & interfaces

- `suggest-chart/SKILL.md` : +section "Runtime procedure" (6 étapes + no-chart).
- `eval/family-types.ts` : `FAMILY_TYPES` (pur).
- `eval/score.ts` : `scoreSpec(spec, expect): Score` (pur).
- `eval/cases/*.json` : `{ id, data, intent, expect:{family, maxWarnings} }`.
- `eval/judge.md` : prompt + schéma `{ titleIsInsight, choiceSound, rationale }`.
- `eval/run.md` : la procédure du runner.

## Tests

- **Purs (unit, `bun:test`) :** `scoreSpec` (valide/famille/garde-fous → pass), `FAMILY_TYPES` (chaque type listé ∈ `CHART_TYPES`).
- **Agentiques :** validés en **lançant l'éval** une fois (baseline) et en lisant le rapport — pas `bun test`. Le 1er run établit le baseline de ②.

## Critères de succès

1. `suggest-chart/SKILL.md` contient la procédure runtime (6 étapes + no-chart), et un agent qui la suit produit, sur un cas, un ChartSpec validé puis le chart via dw-chart.
2. `scoreSpec` + `FAMILY_TYPES` purs et testés ; chaque type des familles ∈ `CHART_TYPES`.
3. ≥8 cas (dont 1 `no-chart`) ; `judge.md` avec schéma.
4. Le runner tourne une fois → rapport agrégé (taux de pass déterministe + scores éditoriaux moyens) = le **baseline de ②**.
5. Une itération documentée : si le baseline est faible, un renforcement du skill + re-run montrant l'amélioration.
6. No tiers ; crédité ; anglais ; pas de mention Claude/Anthropic dans les artefacts.

## Hors-scope

- Lecture d'article + CADRAGE (cuts suivants : `article → où/quel`).
- Maps / vidéo (skills séparés).
- Un suggesteur programmatique (appel API Claude) — écarté (② = l'agent-hôte).
- Le déploiement/installeur.
</content>
