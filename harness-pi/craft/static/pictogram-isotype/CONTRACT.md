# Pictogram (isotype) — what you write

The squares, the blocks, each block's count beside its field, the shade classes and their key, the
type, the colours and the layout are already done: they come from the worked example
`proof/static-pictogram-europe-lowcarbon` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) puts each square in its block, counts the
blocks and draws them.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

ONE SQUARE IS ONE REAL THING — a country, a school, a hospital — never a slice of a quantity (a
square standing for "10 TWh" is a bar in disguise). The squares are grouped in blocks by value
range; each block prints its own count. Each square's shade is its class on one ramp of the accent.
Things with no reading are not drawn, and the key says how many.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `units` | One `{ key, label, value }` per thing (10 to 200), from `data.json`. Leave out things with no reading (list them in `absent`). |
| `unitThing` | What one square is, in one word ("countries"). |
| `blocks` | 1 to 5 groups, top to bottom: `[{ key, name, min, max, thread }]`. A unit goes in the block where `min <= value < max` (leave `min` or `max` out for an open end). The ranges must cover every value and not overlap. `name` is printed after the count ("16 countries above 75 %"). `thread: true` on the block(s) the takeaway is about — their count and name are set in the accent. |
| `breaks` | 1 to 6 increasing numbers: the edges of the shade classes inside the squares. |
| `formatBreak(b)` | How a break is printed in the key ("75 %"). |
| `format(n)` | Optional: how a block's count is printed (default: the bare number). |
| `unitIs` | The key's line saying what one square is ("one square = one country"). |
| `absent` | The labels of the things with no reading, `[]` if none. |
| `absentNote` | The key's line about them, stating their count as a number ("1 country with no 2024 data is not drawn"); `""` when `absent` is empty. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what one square is, what the value measures, the year, the counts per block, the limits the journalist named. |
| `reading` | One or two "how to read" sentences, longest first. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `{ blocks, counts, total }`). |
| `evidenceLevels` | The number of shade classes (`breaks.length + 1`). |
| `check({ blocks, counts, total })` | Throws if the data no longer supports the title. `counts` gives each block's count by its `key`; `total` is the number of squares. |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const units = data.rows
  .filter((r) => r[col("value")] !== null && r[col("value")] !== "")
  .map((r) => ({ key: r[col("code")], label: r[col("place")], value: Number(r[col("value")]) }));
```

Filter to ONE year (or survey) first, so each thing is one square.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`counts.middle === 6`), never a count you typed elsewhere.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses ("squares do not fit"), add shorter title / standfirst forms or draw fewer things. If the
  picture is wrong (wrong block in the accent, wrong count), fix `beat.mjs` with a small
  `edit_file`, render and look again.
