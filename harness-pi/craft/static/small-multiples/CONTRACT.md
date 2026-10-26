# Small multiples — what you write

The panels, the shared scale, the grid, the type, the colours and the layout are already done: they
come from the worked example `proof/static-small-multiples-lowcarbon` and the story's PALETTE.md and
DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and
exports what THIS story's plate says. `render-beat.mjs` (already in the folder) draws it.

Each panel is one entity (a country, a region, a group) drawn as a pair of columns — its value at two
states (two years, before/after) — on ONE scale shared by every panel, with its name above and its
change beneath. `beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it
first, then write this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `panels` | One `{ name, from, to }` per entity, from `data.json`: `from` is the value at the first state, `to` at the second. Sorted the way the takeaway reads (e.g. by the change, largest first). Values are zero or more. Each name once. |
| `states` | The two states' labels, `{ from: "2000", to: "2024" }`. They print in the key. |
| `ceiling` | The top of the ONE scale every panel shares, COMPUTED: a round number just above the largest value anywhere (e.g. `Math.ceil(max / 25) * 25`). Never a panel's own maximum. |
| `thread` | The panel names drawn in the accent (the ones the takeaway names: the largest and smallest change, the subject). `[]` for none. |
| `format(v)` | How a value is printed, in the story's language. |
| `formatDelta(v)` | How the change (`to − from`) printed under each panel reads, with its sign ("+74", "−3"). |
| `unit` | The key's unit line, stating the shared scale ("share low-carbon, 0–100 %"). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow and are used when the frame is short. |
| `limits` | The standfirst, in forms, longest first: unit, scope, the limits the journalist named. |
| `reading` | A reading note, in forms, longest first ("each panel is one country, on the same 0–100 scale…"). It may be dropped when the frame is short. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the panels. |
| `foldNote(drawn, all)` | Optional: what the key adds if the frame cannot hold every panel ("12 of 16 countries"), in the story's language. |
| `evidenceLevels` | 4 (the default). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads one column for one entity by name — use it
instead of writing filters, then pick the two states:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const names = [...new Set(table.rows.map((r) => r[table.columns.findIndex((c) => c.name === "region")]))];
const panels = names.map((name) => {
  const s = series(table, { x: "year", y: "value", where: { region: name } });
  const at = (y) => s.find((p) => p.year === y)?.value;
  return { name, from: at(2000), to: at(2024) };
});
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a
cell that is not a number. When the measure is computed from several columns (a share of a total),
compute it per row as `beat.example.mjs` does.

## What the render refuses

- fewer than two panels, or two panels with the same name;
- a negative value (columns start at zero — draw a diverging bar instead);
- a `ceiling` below the largest value, or more than three times it;
- a `thread` name that is not a panel name;
- change labels that print different changes as the same text (`formatDelta` needs a decimal);
- too many panels for the frame, a name wider than its panel, or panels so close that a name reads as
  belonging to the panel above (draw fewer panels: keep the ones the takeaway is about, and say how
  many of how many in `foldNote` or the standfirst).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (a panel cut, the wrong panel
  in the accent, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
