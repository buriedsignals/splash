# Bar and column — what you write

The marks, the type, the colours and the layout are already done: they come from the worked
example `proof/static-bar-top-emitters-2024` and the story's PALETTE.md and DIRECTION.md. You write
ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS
story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, value }` per bar, from `data.json`, sorted from the largest. |
| `subject` | The `name` of the bar the takeaway is about. It is drawn in the accent. |
| `comparison` | The `name`s of the bars the subject is compared to. |
| `comparisonSum` | Their values added up, COMPUTED. |
| `comparisonNote` | The annotation drawn beside them, with the computed number. |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `title` | The headline, in two or three forms, longest first. It says the journalist's takeaway. |
| `limits` | The standfirst, in forms, longest first: unit, scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(drawn)` | A function returning the alt text for the bars actually drawn. |
| `evidenceLevels` | 2 (subject and comparison set). |
| `check()` | Throws if the data no longer supports the title. |

## Rules

- Every number in a sentence is computed from `data.json`, never typed.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong bar in
  the accent, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
