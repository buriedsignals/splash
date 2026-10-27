# Hex cartogram — gesture beat (web)

The map is already done: one equal hexagon per country on a designed grid (32 cells: ISL NOR SWE FIN IRL DNK EST LVA NLD DEU POL LTU UKR BEL LUX CHE CZE SVK HUN ROU PRT ESP FRA LIE AUT SVN HRV BGR MLT ITA GRC CYP), the class scale and its colours, the layout and the type come from the kit,
`PALETTE.md` and `DIRECTION.md`. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it
and exports what THIS story's map says, and the STAGING: an ordered list of `gestures`. `render-beat.mjs` (already in
the folder) checks every gesture against the data and the confirmed takeaway, and draws it.

`beat.example.mjs` is a worked example. Read it first, then write this story's from scratch with `write_file`.
Europe only: a place outside the shapes or the grid cannot be drawn — say so rather than guess.

No MapTiler basemap: the map is drawn from the frozen country shapes (or the designed grid) on the plain ground, so
a render spends no tile and needs no key (orchestrator choice for this phase, pending Rémy's decision).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | THE JOIN. `{ key, name, value }` per cell: `key` the code the grid places, `name` in the story's language, `value` the measure — compute a rate from the columns when the takeaway is per resident. A grid cell the data does not report but that belongs on the map is a row with `value: null`. Optional `grid`: your own layout, one string per row, codes separated by spaces and `.` for an empty place. |
| `breaks` | Optional: 2 to 6 rising class limits in the measure's units. Use the takeaway's own threshold as one ("above 94 %" → `94`); a `reference` and a filter's "above X" both sit on a break. Leave it out for round steps. |
| `missingLabel` | The key's word for a place with no value ("no data"). |
| `gestures` | The staging, in story order (below). |
| `unit` | What the colour (or one dot) is, printed over the key. |
| `format(v)` | How a value and a class limit are printed ("94 %"), in the story's language. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string; shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what the value is, the year, the scope, the limits the journalist named. |
| `reading` | A reading line in forms, longest first. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text: what the map shows, with its computed numbers. |
| `check()` | Throws if the data no longer supports the title. |

## Gestures

Each gesture is `{ do, mark | marks, value, note }`. A `mark` names a place by its `key` (`"ALB"`) or its printed
`name`. Every number in a `note` must be one the gesture draws; the
render refuses one that is not and names a value that works. A map draws value as class colour, never as position:
there is no `reorder`, no `rescale`, and values do not add up (no `bracket`, no `count` — state a membership with a
`filter`'s note: "7 countries at 94 % or more").

| `do` | meaning |
|---|---|
{{GESTURES}}

On a map: `highlight` RINGS a place (the class colour is the encoding; the takeaway's subject always carries the
accent ring); `name` rings it and prints its value; `filter` keeps the places the claim is about in their class
colour and washes the others toward the ground, nothing moves; `reference` is a class floor (its `value` must be one
of the breaks): every place at or above it is outlined; `compare` rings two places, the subject first.
`trace` is for path maps and is refused here.

## Reading the data

Find columns by name, never by position:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
```

## Rules

- Shade by a rate or a share, never by a raw count, unless the takeaway is about counts of dots.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first form.
- The join fails loud: a code that matches no shape or cell refuses the render, by name. Never drop a row silently;
  a place the source does not report is `value: null`, not `0`.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- The gestures that can rest together (highlight, name, annotate, reference, reveal, pull-back) form the page the reader lands on; every `filter`, `compare` or `zoom` becomes one reader control (a radio pair, no script needed). A page needs at least one control.
- `zoom` frames its places and its note prints the factor the camera takes (e.g. "×3"); a wrong factor is refused with the measured one.
- Every place answers hover, tap and keyboard focus with its name and value.
- After `write_file`, call `render_beat` with format `web`, then `look` at the resting screenshot.
