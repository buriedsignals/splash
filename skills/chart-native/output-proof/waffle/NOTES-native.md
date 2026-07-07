# Render-verify — waffle (Task 2, Native Batch 3)

## Spec

`spec-native.json` — `source,share` CSV, 6 rows (Coal 38, Gas 27, Hydro 16, Wind 11, Solar 6,
Nuclear 2), summing to 100. 6 categories = the check's exact `>6` boundary, exercising the cap the
guard enforces without tripping it.

## Produce

```
bun scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/waffle/spec-native.json \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/waffle static
```

```
[produce waffle] conformance: OK (0 violations).
```

The mapper picked `source` as the category column (first column) and `share` as the value column
(sole numeric column), building `config.items = [{label:"Coal",value:38}, …]` from the CSV rows —
NOT the `rows`/`fields` shape the other single-shape mappers pass through.

## Visual observations (Read of `static.png`)

- **A 10×10 grid of 100 square cells**, filled bottom→top in category order (Coal at the bottom,
  Nuclear at the top), matching the "container fills" motion grammar described in `waffle.md`.
- **6 distinct Okabe-Ito hues**, one per category, in the exact `WAFFLE_CATEGORY_COLORS` order:
  Coal = blue (`#0072B2`), Gas = orange/gold (`#E69F00`), Hydro = green (`#009E73`), Wind =
  purple/magenta (`#CC79A7`), Solar = vermillion (`#D55E00`), Nuclear = sky blue (`#56B4E9`). Cell
  counts visually match the data: 38 blue, 27 gold, 16 green, 11 magenta, 6 burnt-orange, 2 sky-blue.
- **Legend in ink**: 6 swatch+label pairs ("Coal 38", "Gas 27", "Hydro 16", "Wind 11", "Solar 6",
  "Nuclear 2") in one row below the grid, all label text in `COLORS.ink` (black), not the category
  colour — confirms the "every waffle TEXT label is ink" comment in `WaffleChart.tsx`/`tokens.ts`.
- **Unit subtitle present**: "share of electricity generation (each square = 1%)" renders directly
  under the title, muted grey — states what one square represents, satisfying the guard's
  `missing unit` rule.
- **Title unclipped**: "Coal and gas still supply most of Riverton's power" renders on one full line,
  no truncation or overflow.
- **Source line**: "Source: Riverton Energy Authority 2025" at the bottom-left.

No visual defects found — grid, palette, legend, unit, title, and source all render as the KB and
guard describe.

## Concern

None found specific to waffle. (General caveat carried over from the project's known backlog: the
suggester eval remains self-referential; unrelated to this task.)
