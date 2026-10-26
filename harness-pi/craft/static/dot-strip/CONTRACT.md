# Dot strip — what you write

The two strips, the chips, the leaders joining each unit to itself, the one change written on the
subject's leader, the type, the colours and the layout are already done: they come from the worked
example `proof/static-dot-strip-lowcarbon-spread` and the story's PALETTE.md and DIRECTION.md. You
write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS
story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

Every unit (a country, a city, a school) pinned as a chip on ONE axis, twice: on the upper strip at a
first state (`from`, e.g. a year) and on the lower strip at a second state (`to`). Both strips share
one scale, 0 to 100 — so the measure is a share in percent or a score out of 100. What a reader sees
is the SHAPE OF THE FIELD: where it starts, where it ends, where it bunches. Only the subject's
change is written (on its accented leader).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `marks` | One `{ code, name, before, after }` per unit. `code` is printed on the chip: 1 to 4 characters (an ISO code like `"POL"`, an abbreviation). `name` is the full name. `before` and `after` are the unit's values at `from` and `to`, between 0 and 100. Every unit must be read at both states. |
| `subject` | The `code` of the unit the takeaway is about. It is drawn in the accent, with its change written. |
| `from` / `to` | The two states, as strings (`"2000"`, `"2024"`), printed at the left of each strip. |
| `unit` | What the axis measures, printed under the lower strip ("share of low-carbon electricity, %"). |
| `scaleNote` | One sentence saying both strips share the same 0 to 100 scale. |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what the measure is, the two states, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first ("follow the shape of the field, not one unit"); the layout drops it first if room runs out. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the two strips and how the field moved. |
| `evidenceLevels` | 4. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find a column's index by
name (`data.columns.findIndex((c) => c.name === "…")`). Group the rows by unit, read each unit's
value at the two states, and build one mark per unit. If the takeaway speaks of a share and the data
holds amounts, compute the share (`part / total * 100`). Drop a unit the data does not read at both
states, and say so in the standfirst.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039. On this plate the value must also fall between 0 and 100; if it cannot, this is not the right type.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 30`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong chip in the
  accent, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
