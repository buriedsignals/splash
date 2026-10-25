# Line — what you write

The curve, the reference line, the peak label, the bands, the type, the colours and the layout are
already done: they come from the worked example `proof/co2-suisse` and the story's PALETTE.md and
DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and
exports what THIS story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `entity` | The name of the series drawn (one series). |
| `data` | One `{ year, value }` per year, from `data.json`, in year order. |
| `unit` | The unit printed beside values ("deaths", "Mt", "%"). |
| `format(v, decimals)` | How a value is printed, in the story's language. |
| `reference` | The level the reader compares the curve to, COMPUTED from the data (e.g. an earlier year's value). |
| `referenceLabel` | What that level is ("2015 level"). |
| `peakLabel` | The label on the series' highest point. |
| `eras` | Optional dated periods: `[{ from, to, label }]`; leave `[]` if none. |
| `title` | The headline. It says the journalist's takeaway. |
| `limits` | The standfirst: unit, scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the curve. |
| `evidenceLevels` | How many levels of evidence the plate ranks (3 or 4). |
| `check()` | Throws if the data no longer supports the title. |

## Rules

- Every number in a sentence is computed from `data.json`, never typed.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
