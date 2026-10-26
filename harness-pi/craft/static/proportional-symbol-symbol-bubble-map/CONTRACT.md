# Proportional symbol — what you write

The basemap plate, the camera, the circles (hollow, AREA proportional to the value), the key, the
threshold that keeps the field legible, the type, the colours and the layout are already done: they
come from the worked example `proof/static-proportional-symbol-europe-capacity` and the story's
PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs`
(already in the folder) reads `data.json` itself, by the column names you give, and draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

## What data.json must hold

One row per place, with a longitude column, a latitude column (decimal degrees) and a numeric value
column (zero or more). A column that marks the subject rows (a category, a flag, a name).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `lon` | The NAME of the data.json column holding each place's longitude. |
| `lat` | The NAME of the column holding its latitude. |
| `value` | The NAME of the column holding the quantity the circle's AREA draws. |
| `subject` | `{ column, equals }`: the rows the takeaway is about (`String(row[column]) === String(equals)`). They are drawn in the accent. |
| `name` | Optional: the column naming each place (used in refusals). |
| `where` | Optional: `{ column: value }` — keep only the rows matching every pair. `{}` keeps all. |
| `bounds` | Optional: `[[west, south], [east, north]]`. Leave it out: the camera is computed from the points. |
| `atSea` | Optional: `true` only when the places really are at sea (shipwrecks, offshore quakes). |
| `unit` | The unit of the value ("MW", "people"). |
| `format(v)` | How a value is printed (the key's circles, the threshold), in the story's language. |
| `dotIs` | The key's line: the unit and what one circle is ("MW · one circle = one station"). |
| `subjectNote(cut)` | The line in the accent under the key, e.g. how many subject circles the plate draws: `${cut.drawnSubject} nuclear sites`. |
| `limitNote(cut)` | Forms, longest first, saying what is NOT drawn. When `cut.threshold > 0`, EVERY form must print `format(cut.threshold)` (the render checks it). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what a circle is, scope, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first ("Reading: the circle's area is the value"). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text — a string, or `(cut) => string` to say how many circles are drawn. |
| `check()` | Throws if the data no longer supports the title. |

`cut` is what the render decided to draw so the busiest part of the map stays legible:
`{ threshold, drawn, total, drawnSubject, totalSubject, drawnShare, drawnValueShare }` — the
threshold (0 when every place is drawn), how many circles are drawn of how many rows, how many of
them are subject rows, and the drawn share of the rows and of the total value, in %.

## Reading the data

You do not filter rows for the circles: name the columns and the render reads them. For the
numbers in your sentences, read data.json by column name:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [KIND, AMOUNT] = [col("kind"), col("amount")];
const rows = table.rows.map((r) => ({ kind: r[KIND], amount: Number(r[AMOUNT]) }));
```

The render refuses, by name: a column that is not in data.json, a value or coordinate that is not a
number, a negative value, a latitude past ±85°, a subject that matches no row, points spanning more
than 180° of longitude, and points of which most sit on water (lon and lat swapped).

## Rules

- `value` is the quantity the takeaway is about. A circle's area cannot be negative, and a rate per
  resident is not a symbol map's quantity (that is a choropleth): draw counts or amounts.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the
  title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision
  (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first
  form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
