# Dot density — what you write

The dots, the basemap plate, the camera, the projection, the ring around the subject, the type, the
colours and the layout are already done: they come from the worked example
`proof/static-dot-density-europe-stations` and the story's PALETTE.md and DIRECTION.md. You write
ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS
story's plate says. `render-beat.mjs` (already in the folder) bakes the plate and draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

A dot map draws ONE DOT PER ROW, at that row's own longitude and latitude — a station, an incident, a
school. It never scatters a total inside a country: if `data.json` has no coordinate columns, this is
the wrong kit.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `lon` | The NAME of the data.json column holding each row's longitude (degrees east). |
| `lat` | The NAME of the column holding its latitude (degrees north). |
| `subject` | `{ column: value }` — the one value that marks the points the takeaway is about. They are ringed in the accent; every other point is the field. |
| `where` | Optional `{ column: value }` filter keeping only the rows the plate draws. Leave it out to draw every row. |
| `thing` | Optional: what one dot is, as a singular noun ("station"). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). Shorter forms may follow, and EVERY form must still state the takeaway — the layout may land on the shortest one. |
| `limits` | The standfirst, in forms, longest first: what a dot is, the scope, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first ("each dot is one …, where the source places it; the … are ringed"). The layout may drop it. |
| `dotIs` | The key's first line: what one dot is ("one dot = one station"). |
| `subjectNote` | The key's second line, beside the ring: the subject's COUNT, computed, and its name ("72 nuclear sites"). |
| `limitNote` | One short sentence on what the source misses. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text: what the field shows and how many subject points are ringed. |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`points.mjs` (in the folder) reads the points by column name — use it, the render uses the same
reader, so your counts are the plate's counts:

```js
import { readPoints, readTable } from "./points.mjs";
const SPEC = { lon: "longitude", lat: "latitude", subject: { kind: "A" } };
const points = readPoints(readTable(import.meta.dirname), SPEC);   // [{ lon, lat, subject, row }]
const subject = points.filter((p) => p.subject);                     // the ringed points
const total = points.length;                                         // every dot drawn
// p.row is the row as an object: Number(p.row.size) reads another column of that point.
```

It throws, by name, on a missing column, a coordinate that is not a number or not on Earth (swapped
columns), a subject value no row has (and lists the values that exist), or a subject that is every
point.

## What the render refuses

- A point outside the frozen country shapes (Europe and its neighbours): this kit cannot draw another
  region. Filter those rows out with `where` and say so in the standfirst.
- A title form or `subjectNote` stating a count the plate does not draw.
- An accent the basemap cannot carry under the dots (measured on the baked plate).
- No `MAPTILER_KEY` in the environment: the plate cannot be baked.

The camera is the points' own extent, padded; the plate is baked once and reused until the direction
or the extent changes.

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the points the takeaway is about: if it speaks of one category, that category is `subject`; if it speaks of a subset of the rows, filter with `where`.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(share) === 34`, `Math.round(total / 100) * 100 === 8900`), never with strict equality on a raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- Numbers printed with `toLocaleString` must have their narrow no-break spaces replaced by plain spaces (see the example's `plain`).
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
