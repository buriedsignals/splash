# Datawrapper API flow + field mapping

Auth: `Authorization: Bearer $DATAWRAPPER_API_TOKEN`. Base: `https://api.datawrapper.de/v3`.

## Chain
1. `POST /charts` `{title, type}` → `{id}`
2. `PUT /charts/{id}/data` (Content-Type text/csv) ← CSV body → 201
3. `PATCH /charts/{id}` `{type, metadata}` → 200
4. `POST /charts/{id}/publish` → 200, `data.publicUrl`
5. `GET /charts/{id}/export/png?unit=px&mode=rgb&width=600&plain=false` → 200 PNG (free)
   - `svg` / `pdf` → 401 (paid). Use PNG for the owned fallback.

## ChartSpec → metadata
| Conformance rule | DW field |
| --- | --- |
| Insight title | `title` (top level) |
| Insight subtitle | `metadata.describe.intro` |
| Alt = insight (WCAG 1.1.1) | `metadata.describe.aria-description` |
| Source citation | `metadata.describe.source-name` / `source-url` |
| Number format | `metadata.describe.number-format` |
| Single colour (Okabe-Ito) | `metadata.visualize.base-color` |
| Column value labels (outside, dark ink, visible on the PNG) | `metadata.visualize.valueLabels` `{enabled, placement:"outside", show:"always", format}` |
| Horizontal-bar value labels (inside labels are white/unsafe → use the axis) | `metadata.visualize.show-value-labels:false` + `force-grid:true` |

## Value-label contrast (WCAG AA)

Datawrapper renders bar/column value labels via two engines, each with a trap:

- **Vertical columns** default to `valueLabels.show:"hover"` → nothing prints on the static PNG. Set `placement:"outside", show:"always"` → dark ink above the column (≥4.5:1, visible on the PNG).
- **Horizontal `d3-bars`** draw the value INSIDE the bar with an un-overridable white/black auto-pick. White fails AA on darker subject hues (white on `#009E73` = 3.42:1, on `#D55E00` = 3.87:1). No colour field or outside placement exists (verified against the live API + Academy docs), so the mapper turns inside labels off and shows the numeric value axis (black ink, 17.8:1).

Enforced by `checkValueLabelContrast` (`src/value-label-safety.ts`), which `produceChart` runs before publishing and throws on a white-inside-coloured-mark below 4.5:1.
