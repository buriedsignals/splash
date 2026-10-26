# Sankey (video) — what you write

The video is already designed: it comes from the worked example `proof/video-sankey-electricity-sources`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (20.5 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then one bar grows
down the left rail, the whole counting beside it (« 1 638 TWh »); gaps cut it into the SOURCES (heights
kept, names and totals arriving) and the ribbons pour to the right rail source after source, each
TARGET's node filling as its ribbons land; every ribbon but the tracked source's steps back, the
TRACKED ribbon fills with the accent, and a copy of the tracked source's whole bar travels to the
tracked target's node and lands beside it — the part that matches level with the tracked band, the
rest overhanging — the share (« 84 % ») beside it; then the copy slides home, the ribbons return, the
share sits on the accent ribbon, and the credit comes in on one line. There is no standfirst and no
sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes every
node's total from its flows, the tracked flow's share of its source, lays the frames out, renders
twelve stills, prints `look at: <png>`, then renders the mp4 (about a minute).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `sources` | The left rail, top to bottom: `{ key, label, total? }` (2 to 12). Order them by something that means something (a family, a size). |
| `targets` | The right rail, top to bottom: `{ key, label, total? }` (2 to 12). The tracked target comes FIRST. A target's `key` must differ from every source's `key`. |
| `flows` | One `{ from, to, value }` per ribbon: `from` a source `key`, `to` a target `key`, `value` ≥ 0. One flow per pair. |
| `tracked` | `{ from, to }` — the keys of the ONE flow the takeaway is about. Its share of its source is what the video measures. |
| `unit` | The unit of the values ("TWh", "people"), printed after the whole's counter. |
| `format(v)` | How a node total is printed, in the story's language. Returns a string. |
| `formatWhole(v)` | Optional: how the whole's counter prints a whole number before the unit (default: thousands grouped). |
| `percent(v)` | Optional: how the share is printed (`(v) => \`${v} %\``); `v` is the whole percent. |
| `narrowRail` / `narrowSource` | Needed only for a square or portrait frame: the sources grouped (`[{ at, keys, label }]`, the tracked source's group FIRST) and the credit forms saying they are grouped. |
| `source` | The credit line in one to three forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a node `total` is not the sum of its own flows (compute it from `flows`, or leave it out);
- a flow is negative, two flows share a pair, a flow names no node, a node has no flow, or `tracked`
  names a pair with no flow;
- the tracked target is not the first of `targets` (its ribbon must be the top of the source's bar);
- the copy of the source's bar would run past the frame's foot (move the tracked source higher);
- the share rounds to 0 %;
- `format`, `formatWhole` or `percent` throws or does not return a string;
- the share finds no place inside the accent ribbon, or a label does not fit (shorten the labels, or
  group the smallest nodes into one, computed).

## Reading the data

Rows are arrays; find columns by name (neutral names here). When each source is a column:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const rows = data.rows.filter((r) => Number(r[col("year")]) === 2024);
const sources = [{ key: "part_a", label: "A" }, { key: "part_b", label: "B" }];
const flows = sources.flatMap((s) => rows.map((r) => ({ from: s.key, to: r[col("place")], value: Number(r[col(s.key)]) })));
const targets = rows.map((r) => ({ key: r[col("place")], label: r[col("place")] }));
```

When the table is long (one row per pair), build one flow per row. Filter to ONE year first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(share * 100) === 84`), never with strict equality on the raw division.
- The share the video prints is the tracked flow over its SOURCE's total; `check()` computes the same ratio.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole sankey, the tracked ribbon in the accent with its share). If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (the wrong ribbon in the
  accent, a wrong share, a word cut), fix `beat.mjs` with a small `edit_file`, render and look again.
