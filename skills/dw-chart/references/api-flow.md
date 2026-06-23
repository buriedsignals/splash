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
| Direct labels | `metadata.visualize.value-labels.show` |
