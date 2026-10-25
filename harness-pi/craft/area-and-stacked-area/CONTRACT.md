# Area — what you write

The filled surface, the zero baseline, the cut rule, the two tints, the end label, the axes, the
type, the colours and the layout are already done: they come from the worked example
`proof/static-area-swiss-co2` and the story's PALETTE.md and DIRECTION.md. You write ONE file,
`beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's plate
says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

This adapter draws ONE series as a filled area from zero. The area is the STOCK (the total
accumulated), the height is the yearly flow. The surface is cut at one year into two tints, and each
part is labelled with its share of the total — the renderer computes those shares.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `entity` | The name of the series drawn. |
| `data` | One `{ year, value }` per year, from `data.json`, in year order, consecutive years, no value below zero. |
| `cut` | The year the surface is cut at, COMPUTED (e.g. the year the running total passes half) or the year the takeaway names. Strictly between the first and last year. |
| `unit` | The axis noun written once above the plot ("millions de tonnes de CO₂ par an"). |
| `valueUnit` | The short unit after the last reading ("Mt", "GWh", "%"). |
| `format(v, decimals)` | How a value is printed, in the story's language. |
| `title` | The headline, in two or three forms, longest first. It says the journalist's takeaway. |
| `limits` | The standfirst, in forms, longest first: what the area measures, the unit, the scope, the limits. |
| `reading` | One or two short "how to read" sentences, longest first (height = one year, area = the total). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the surface. |
| `evidenceLevels` | 4. |
| `check()` | Throws if the data no longer supports the title. |
| `tickStep`, `yearStep` | Optional: the value-axis and year-axis steps. Leave them out; they are derived. |

## Rules

- Every number in a sentence is computed from `data.json`, never typed.
- The title says the confirmed takeaway; do not invent a different claim.
- A series with a missing year, or a value below zero, is refused: an area cannot be drawn over it.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
