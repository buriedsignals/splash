# Slope — what you write

The two rails, the lines, the end values, the deltas, the type, the colours and the layout are
already done: they come from the worked example `proof/static-slope-europe-lowcarbon` and the
story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the
folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `lines` | One `{ key, label, from, to, thread }` per line drawn: `from` is the value at the left rail, `to` at the right rail, `label` the name printed. AT MOST SIX lines. |
| `thread` | `true` on the one line, or the one pair, the title is about. Drawn in the accent; every other line is muted. |
| `rails` | `{ left, right }`: what each rail is, e.g. `{ left: "2000", right: "2024" }`. |
| `subject` | The `key` of the line the takeaway is about (one of the thread lines). |
| `format(v)` | How a value is printed, in the story's language. Enough decimals that the thread's values differ. |
| `formatDelta(v)` | How a change is printed, with its sign ("+3,2", "−1,0"). |
| `title` | The headline, in two or three forms, longest first. It says the journalist's takeaway. |
| `limits` | The standfirst, in forms, longest first: what is measured, the unit, the scope, the limits. |
| `reading` | One or two short "how to read" sentences, longest first (no axis: slope = direction, numbers = level). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the lines drawn (a string, or a function of the drawn lines). |
| `evidenceLevels` | 4 (thread, other lines, end values, deltas). |
| `check()` | Throws if the data no longer supports the title. |

## Rules

- Every number in a sentence is computed from `data.json`, never typed.
- The title says the confirmed takeaway; do not invent a different claim. `check()` tests that
  claim against ALL the data, not only the lines drawn.
- If the data has more than six entities, draw the thread plus the largest others, and say in
  `limits` how many of how many are drawn.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses ("end-label stack does not fit", "allowance"), draw fewer lines or shorten the text. If the
  picture is wrong (wrong line in the accent, wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
