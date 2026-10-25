# Diverging bar — what you write

The bars growing left and right from the zero rule, the values on their tips, the names, the
packing into columns, the type, the colours and the layout are already done: they come from the
worked example `proof/static-diverging-bar-eu-per-capita` and the story's PALETTE.md and
DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and
exports what THIS story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

A diverging bar shows one signed value per row (a change, a gap to a reference), some above zero
and some below. One row — the subject — is drawn in the accent; every other row is muted.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, change }` per row, from `data.json`; `change` is signed and COMPUTED. Rows on both sides of zero. |
| `subject` | The `name` of the row the takeaway is about. Drawn in the accent. |
| `subjectNote` | A short note set beside the subject's row ("the only rise since 1990"). |
| `note` | The counter line over the plot, with a computed number ("Average of the 26 falls: −4.93"). |
| `format(v)` | How a change is printed, WITH its sign ("+0,03", "−20,48"), in the story's language. |
| `unitMark` | The unit's short mark ("t", "%", "pts"). |
| `title` | The headline, in two or three forms, longest first. It says the journalist's takeaway. |
| `limits` | The standfirst: ONE string of sentences separated by ". ", the most important first (a tight frame keeps only the first). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(drawn)` | A function returning the alt text for the rows actually drawn. |
| `scope(drawn, all)` | A function returning the sentence printed when a tight frame draws fewer rows: "13 of 27: the subject and the 12 largest moves." |
| `evidenceLevels` | 2 (the subject and the field). |
| `check()` | Throws if the data no longer supports the title. |

## Rules

- Every number in a sentence is computed from `data.json`, never typed.
- The title says the confirmed takeaway; do not invent a different claim. A claim like "the only"
  is checked over ALL the rows in `check()`.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs` (shorter title forms or standfirst). If the picture
  is wrong (wrong row in the accent, wrong number), fix `beat.mjs` with a small `edit_file`, render
  and look again.
