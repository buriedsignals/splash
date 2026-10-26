# Tile cartogram — what you write

One equal tile per country, laid out roughly like the map, each tile tinted by its class. The grid, the
tiles, the class ramp, the key, the type, the colours and the layout are already done: they come from the
worked example `proof/static-cartogram-europe-lowcarbon` and the story's PALETTE.md and DIRECTION.md.
You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS
story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What this kit can draw

The grid is designed by hand and holds exactly these 41 European countries, keyed by ISO 3166-1
alpha-3 code: ISL NOR SWE FIN EST IRL GBR DNK LVA RUS NLD DEU POL LTU BLR BEL LUX CZE SVK UKR PRT ESP
FRA CHE AUT HUN MDA ITA SVN HRV SRB ROU MLT MNE BIH MKD BGR ALB GRC TUR CYP. A story may draw any
subset of them (at least 6). A code outside the grid (KOS, FR, "France"…) is refused, never dropped. A
story about another region cannot use this kit.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `keyColumn` | The name of the data.json column that holds the ISO alpha-3 code of each row. This is the join. |
| `values` | One `{ code, value }` per row of data.json, `code` read from `keyColumn`, `value` the measure the takeaway is about (`null` where the source does not report the country — drawn as a hollow tile). |
| `excluded` | Optional: codes of data.json rows you leave out on purpose. Say why in `limits`. |
| `breaks` | 2 to 6 ascending numbers splitting the values into classes. Use the subject's convention if there is one; otherwise `quantileBreaks(values.map(v => v.value), 5)` from `./tile-grid.mjs`. Every class must hold a country. |
| `format(b)` | How a break is printed in the key ("40 %"). |
| `unit` | What the colour measures, printed beside the key. |
| `missingLabel` | The key's label for a country the source does not report. |
| `labels` | Optional `{ code: shortName }` for the tile labels; default is the ISO code. Short names only: every tile must hold its own name. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: unit, scope, the limits the journalist named. |
| `reading` | One or two forms of a "how to read" line; say the layout is designed, not measured. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(tiles)` | A function returning the alt text for the tiles drawn. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, VALUE] = [at("iso3"), at("share")];
const values = table.rows.map((r) => ({ code: String(r[CODE]), value: r[VALUE] === null || r[VALUE] === "" ? null : Number(r[VALUE]) }));
```

`./tile-grid.mjs` also gives `meansOf(values)` → `{ byCountry, byArea, widest: { code, value, areaShare } }`:
the mean by country (one tile each) against the mean weighted by the territory each country takes on a
choropleth of the same values (frozen Natural Earth shapes, equal-area projection). That is this form's
own argument when the takeaway compares the two; use it rather than computing areas yourself.

## What the render refuses

- `keyColumn` not in data.json; a code in `values` that the column does not hold; a row of the column
  that `values` does not draw (and is not in `excluded`); a code the grid has no tile for.
- A value that is not a number; breaks not ascending, outside the data's range, or leaving a class empty.
- A label too wide for its tile, or a grid too dense for the frame.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
