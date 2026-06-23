# Tranche verticale n°1 — Datawrapper chart (end-to-end)

> Première tranche de validation. But : faire tourner **toute la boucle Atelier** sur le cas le moins cher
> et le plus représentatif, pour de-risquer ② avant de scaler la KB. Base : la demo « Datawrapper chart »
> du site Atelier. Aligné sur la spec-parapluie (sans tiers, fichier possédé).

## But

À partir de **données + une intention éditoriale**, produire un **bon chart Datawrapper** — type adapté à
l'intention, design conforme aux best-practices — publié (embed) **et** exporté en **fichier statique
possédé** (fallback anti-dépendance). Valide la chaîne `KB → ② → skill → export` sur un cas réel.

## La boucle, sur ce cas

```
données + intention
   → ② (mini) : choisit le type de chart (grounded sur la KB) + émet une "chart spec"
   → skill dw-chart : pilote l'API Datawrapper (créer · data · config · publier)
                      + applique la conformance via les réglages DW
                      + EXPORTE TOUJOURS un statique possédé (SVG/PNG)
   → export : fichier possédé + snippet embed
```

## Composants (le minimum qui valide)

### 1. KB minimale — 2 références (les 2 premières des 8 cibles)
Rangées pour le retrieval, dans `knowledge/references/` :
- **`chart-selection.md`** — intention → type de chart. Dérivé des **9 intentions FT** (Deviation, Correlation,
  Change-over-time, Ranking, Distribution, Part-to-whole, Magnitude, Spatial, Flow) + caveats data-to-viz par
  type. Court, créditée (FT bible, data-to-viz).
- **`design-conformance.md`** — checklist pass/fail : palette Okabe-Ito, **≤2 couleurs** (guardrail), labels
  directs > légende, format des nombres (12.8k), titre = l'insight (sentence case), contraste WCAG ≥4.5:1.
  Dérivée du corpus `design-principles`.

### 2. ② minimal — l'étape de décision
Un skill/prompt qui, recevant un **profil de données** (colonnes, types, cardinalité) + une **intention**
(ex. « montrer l'évolution du chômage 2018-2023 »), grounded sur les 2 références ci-dessus :
- choisit **le type de chart** (ex. line) + justifie (intention = change-over-time),
- émet une **`chart spec`** : `{ type, data, title (insight), xField, yField, colors (Okabe-Ito), annotations? }`,
- route vers `dw-chart`.
Pas de tier, pas de garde « features accessibles ». Juste : le meilleur chart pour la donnée.

### 3. `dw-chart` — le skill (format Tom)
Structure : `SKILL.md` (8 sections) + `references/api-flow.md` + `scripts/` + `assets/sample-data/` + `output-proof`.
- **Input** : une `chart spec` + `DATAWRAPPER_API_TOKEN` (env).
- **Flow API** : `POST créer chart` → `PUT data (CSV)` → `PATCH metadata` (type + visualisation : couleurs,
  labels directs, tooltips, titre) → `POST publish` → récupérer l'embed → **`GET export PNG/SVG`** (fallback possédé).
- **Le savoir s'applique via les réglages DW** (c'est le point « rendu délégué, savoir complet ») : la
  conformance de `design-conformance.md` se traduit en champs `metadata.visualize` (couleurs, `directLabeling`,
  formats de nombres…).
- **Output** : `{ chartId, embedCode, staticFile (SVG/PNG possédé), chartUrl }`.
- `output_mode` : interactif (embed DW) **+ toujours** un statique possédé.

### 4. Export
Le fichier statique possédé (SVG/PNG) + le snippet embed. Rien hébergé chez nous.

## Critères de succès
1. Donné un vrai CSV + une intention d'une ligne, la boucle produit un chart DW **publié** dont le **type
   correspond à l'intention** et dont le design **passe la checklist** `design-conformance`.
2. Un **fichier statique possédé** (SVG ou PNG) est produit à chaque fois — la dépendance DW ne « rot » pas l'archive.
3. Validé avec un **vrai token Datawrapper** (vraies clés, vrais échecs), pas un mock.
4. Les 2 références KB sont autonomes (<500 lignes) et créditées.

## Dépendances & risques (à lever avant la validation end-to-end)
- **Token Datawrapper requis.** Sans clé, pas de validation réelle. → Rémy fournit/crée un token (compte gratuit).
- **Tier d'export.** L'export SVG/PDF (voire PNG) via API peut exiger un **plan payant** DW. À confirmer avec le
  vrai token. Si l'export statique gratuit n'est pas dispo → plan B pour le fallback possédé : screenshot
  headless du chart publié (Playwright), déjà dans la boîte à outils.
- **Rate limits** DW inconnus — à observer en réel.

## Hors-scope
- Les 7 autres demos (vidéo, maps, image-scrolly, range-plot…).
- La KB complète (13 synthèses, 8 références) — on n'écrit que les 2 références nécessaires.
- L'installeur, le ② comme produit complet, le website.

## Où ça vit
`/atelier` : `knowledge/references/{chart-selection,design-conformance}.md` + `skills/dw-chart/`.
Sources KB : corpus `vizualisation-skill` (FT vocab, data-to-viz, design-principles) — créditées.
</content>
