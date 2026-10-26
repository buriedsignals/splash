# Heatmap matrix (video) — what you write

The video is already designed: it comes from the worked example `proof/video-heatmap-europe-electricity`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (20.7 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then, row
after row, each row's whole grows as ONE bar of 100 % across the grid over a dashed `floor` line,
the cells of the measured families in the accent and the others in a neutral, while a count names
the rows past the floor; every bar splits, each segment sliding into its column's cell and taking
its class's colour, and the heads, family names, the measure column (`valueHead`), the bracket and
the key come in; the rows below the floor step back, the rows past it reorder by ROUTE and part
into blocks, one named bracket a route, the `ring` column of those rows outlined; then everything
returns to rank order, the rows past the floor bracketed with the count, the credit on one line.
Rows are ranked by the measure. There is no standfirst and no sentence on screen. You do not
change any of that. The kit renders at landscape only.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes each
row's measure, ranks the rows, counts the rows past the floor, checks the routes, lays the frames
out, renders ten stills, prints `look at: <png>`, then renders the mp4 (about a minute).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to four forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `heads` | 3 to 10 columns in the order drawn, each `{ key, label, family }`; a family's columns side by side. The family name is printed over its columns. |
| `measured` | The family names whose cells add up to the measure the floor is about (`["renouvelables", "nucléaire"]`). At least one family must stay outside it. |
| `rows` | 3 to 14 rows, each `{ key, label, cells }`: `cells` holds one SHARE of the row's own whole per head, in the heads' order, in percent — a row adds up to 100. |
| `floor` | The share the dashed line marks (94). The rows whose measure is above it are counted and split into routes. |
| `routes` | 2 or 3 routes, each `{ name, keys }`: the `key`s of EXACTLY the rows past the floor, every one in one route, ordered so the `ring` column rises from route to route. |
| `ring` | The `key` of the head the routes differ by; its column is outlined over the rows past the floor. |
| `valueHead` | The head of the measure column at the right ("bas-carbone"). |
| `count(n)` | The count: `n` rows past the floor ("7 pays"). Called for every `n` from 0. |
| `breaks` | Optional: the colour classes' edges, rising shares (default `[2, 5, 10, 20, 40]`). |
| `source` | The credit line in one to four forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- fewer than two rows, or every row, are past the floor;
- `routes` do not split exactly the rows past the floor, a route is empty, there are more than 3,
  or the `ring` column does not rise from one route to the next;
- a row does not add up to 100 or has a cell per head missing;
- a family's columns are not side by side, or `measured` names no family of `heads`;
- a label, head, family, route name, the title or the credit does not fit the frame (shorten it);
- the run asks a size other than landscape.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const heads = [
  { key: "part_a", label: "A", family: "clean" }, { key: "part_b", label: "B", family: "clean" },
  { key: "part_c", label: "C", family: "dirty" },
];
const rows = data.rows.map((r) => {
  const parts = heads.map((h) => Number(r[at(h.key)] ?? 0));
  const total = parts.reduce((a, b) => a + b, 0);
  return { key: r[at("region")], label: r[at("region")], cells: parts.map((v) => (v / total) * 100) };
});
```

Leave out rows whose whole is 0 (nothing reported).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says how many rows pass the floor, `check()` counts the rows whose measured cells add up to more than the floor and throws unless it is that number; when it says "by N routes", it checks each route is non-empty.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- A word function (a field that is a function) must return a string for every value the render passes it; the render
  calls each one before drawing and names the one that throws.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole matrix in rank order, the rows past the floor bracketed). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
