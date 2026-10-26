# Flow map (origin-destination) — what you write

The basemap plate, the camera fitted to the largest flows, the node, the bands (width = the
quantity, on one scale drawn in the key), the dots for the bands too thin to draw, the names at
each band's end, the type, the colours and the layout are already done: they come from the worked
example `proof/static-flow-map-ukraine-protection` and the story's PALETTE.md and DIRECTION.md. You
write ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs` (already in the folder) reads
`data.json` itself, by the column names you give, and draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

This kit draws ONE origin and MANY destinations — a fan, not an itinerary. It is not a route map:
a single path whose order of crossings is the claim has no kit.

## What data.json must hold

One row per destination country: a column with its ISO 3166 alpha-3 code (`DEU`, `POL`, `FRA`…)
and a column with the quantity (a positive number). The origin is not a row. Several rows per
destination (months, categories) must be narrowed to one with `where`.

**Geographic scope:** the countries come from the worked example's geometry — Europe and its
neighbours (the EU and EFTA, the UK, the Balkans, Ukraine, Belarus, Moldova, Russia, Turkey, the
Caucasus, the Maghreb, Syria, Lebanon, Iraq, Iran, Greenland). Kosovo and Northern Cyprus carry no
code there and cannot be joined. The default camera is Europe (25°W–48°E, 34°N–68°N). A code the
geometry does not hold is refused by name; a destination outside the camera is counted under the
key, not drawn.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `key` | The NAME of the data.json column holding each destination's ISO3 code. |
| `value` | The NAME of the column holding the quantity a band's WIDTH draws. |
| `where` | Optional: `{ column: value }` — keep only the rows matching every pair. `{}` keeps all. |
| `bounds` | Optional: `[[west, south], [east, north]]` in degrees. Leave it out for Europe. |
| `origin` | The ISO3 code every band leaves from (not a row of data.json). |
| `originLabel` | The origin's name, printed inside the node. |
| `subject` | The ISO3 code of the destination the takeaway is about. It must be the LARGEST; it is drawn in the accent. |
| `names` | `{ CODE: "Name" }` for EVERY destination, in the story's language. |
| `unit` | The unit printed in the key ("people", "tonnes"). |
| `format(v)` | How a quantity is printed (key, key note), in the story's language. |
| `bandLabel(name, v)` | Optional: the label at a band's end. Default `Name 959k`. |
| `dottedNote(count, share, long)` | The line under the key for the `count` destinations not drawn (too thin, or outside the frame), holding `share` % of the total; `long` is true at landscape, where a second sentence fits. |
| `keyNote(drawn, share, total)` | The key's count line: how many bands are drawn and the share (%) of the total they carry. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what a band is, scope, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first. It must say the line is not an itinerary. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the fan. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

You do not filter rows for the bands: name the columns and the render reads them. For the numbers
in your sentences, read data.json by column name:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, AMOUNT] = [col("country_code"), col("amount")];
const flows = table.rows.map((r) => ({ code: r[CODE], amount: Number(r[AMOUNT]) }));
const total = flows.reduce((s, f) => s + f.amount, 0);
```

The render refuses, by name: a column that is not in data.json, a quantity that is not a positive
number, two rows for one destination, the origin as a destination row, a destination with no name
in `names`, a code the geometry does not carry, a subject that is not the largest destination, and
an origin or subject outside the camera.

## Rules

- The bands are drawn over the sea as much as over the land, so the story's accent must stand 40°
  of hue away from the water's blue. If the render refuses on that, it is PALETTE.md, not beat.mjs:
  say so instead of changing beat.mjs.
- `check()` tests only what the drawn data can decide (the subject's share, the two largest's share,
  the total). A figure the data cannot confirm stays in the title as the journalist wrote it.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision
  (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first
  form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
