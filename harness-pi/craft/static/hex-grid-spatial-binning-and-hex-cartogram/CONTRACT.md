# Hex grid (hex cartogram) — what you write

One hexagon per named unit (a country, a region), all the same size, laid out roughly like the map;
the colour is the unit's class on a stepped scale. The hexagons, the layout, the classes, the key,
the type, the colours and the layout of the page are already done: they come from the worked
example `proof/static-hex-grid-europe-protection` and the story's PALETTE.md and DIRECTION.md. You
write ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs` (already in the folder) reads
`data.json` itself, by the column names you give, and draws it.

This kit draws the hex CARTOGRAM (one cell per unit). It does not bin scattered points into cells.
There is no basemap: the form gives up position.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

## What data.json must hold

One row per unit, with a column of codes matching the grid (ISO 3166-1 alpha-3 for the built-in
Europe grid: DEU, FRA, POL…) and a numeric value column. For a rate, also a denominator column
(population…) in the same row.

The built-in grid places 32 cells: ISL NOR SWE FIN IRL DNK EST LVA NLD DEU POL LTU UKR BEL LUX CHE
CZE SVK HUN ROU PRT ESP FRA LIE AUT SVN HRV BGR MLT ITA GRC CYP. It has no GBR, no Balkans outside
the EU, no Türkiye: a story about other units passes its own `grid`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `key` | The NAME of the data.json column holding each unit's code (matched against the grid). |
| `value` | The NAME of the column holding the quantity. |
| `per` | Optional: the NAME of a denominator column; the drawn measure is `value / per × perBase`. |
| `perBase` | With `per`: per how many (1000, 100000) — choose the base that gives readable numbers. |
| `where` | Optional: `{ column: value }` — keep only the rows matching every pair. `{}` keeps all. |
| `subject` | The code of the unit the takeaway is about. Its cell is ringed in the accent. |
| `unmeasured` | Codes the grid places that data.json does not report but that belong on the map: kept, with no fill. `[]` if none. |
| `unmeasuredNote` | With `unmeasured`: forms, longest first, of the line saying why those cells have no fill. |
| `drop` | Codes the grid places that are outside the study: removed from the layout. `[]` if none. |
| `grid` | Optional: your own layout, an array of strings, one per row, codes separated by spaces and `.` for an empty place. Odd rows sit half a cell to the right. Leave it out for the Europe grid. |
| `breaks` | Optional: the class breaks in the measure's units, ascending (4 breaks make 5 classes). Leave it out for quintiles. |
| `unit` | What the colour measures, printed beside the key ("Ukrainians under protection per 1,000 inhabitants"). |
| `format(v)` | How a break is printed, in the story's language. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what a cell is, the measure, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the grid. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

You do not filter rows for the cells: name the columns and the render reads them. For the numbers
in your sentences, read data.json by column name:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, COUNT, POP] = [col("code"), col("count"), col("population")];
const units = table.rows.map((r) => ({ code: r[CODE], rate: (Number(r[COUNT]) / Number(r[POP])) * 1000 }));
const ranked = [...units].sort((a, b) => b.rate - a.rate);
```

The render refuses, by name: a column that is not in data.json; two rows for one code; a value that
is not a number; a code data.json reports that the grid has no cell for; a cell the grid places that
data.json does not report and that is listed neither in `unmeasured` nor in `drop`; a subject with
no reading; breaks that do not ascend or that put every unit in one class; and a hexagon too small to
hold its own code.

## Rules

- Draw the measure the takeaway is about. If it speaks per inhabitant, name the denominator column
  in `per` — never the raw count under a per-inhabitant headline.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the
  title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision
  (`Math.round(v * 10) / 10 === 36.1`), never with strict equality on the raw division.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first
  form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
