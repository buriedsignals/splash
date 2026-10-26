# Diverging stacked bar (video) — what you write

The video is already designed: it comes from the worked example `proof/video-diverging-stacked-electricity`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (19.5 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then every
row's whole 100 % bar grows from one left edge, row after row, its levels side by side; each bar
slides, every length kept, until its CENTRE level sits astride an anchor line — the lean appears —
and each row's left and right totals land at its ends, its centre share inside; the other rows step
back, the subject's bar parts (its centre up, its two sides down) and its left side then its right
side slide end to end from the centre's left edge and stop SHORT of its end, their sum printed
there; then the bar closes, the other rows return, the subject's centre is ringed, the credit on one
line. Rows are ordered by their left side, largest first. There is no standfirst and no sentence on
screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) sums the sides,
orders the rows, re-runs the comparison, lays the frames out, renders eleven stills, prints
`look at: <png>`, then renders the mp4 (one to two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | 2 to 8 rows, each `{ key, label, left, centre, right }`: `left` and `right` are arrays of `{ key, label, value }` ordered OUTWARD from the centre (the last is the deepest shade), `centre` is one `{ key, label, value }`. Every `value` is the level's share of ITS OWN row in percent, so a row adds up to 100. Every row holds the same levels in the same order. |
| `subject` | The `key` of the row the takeaway is about: the row with the LARGEST centre share, whose centre outweighs its two sides together. |
| `leftName`, `centreName`, `rightName` | The three sides' names over the chart ("Fossile", "Nucléaire", "Renouvelable"). |
| `yearLabel` | The label over the row names ("2024"). |
| `unit` | The unit of a share, printed after "100" over the whole bars' common end ("%"). |
| `format(v)` | A share's text, without the unit ("67,7"). Called for every total, centre and the sides' sum. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- the subject is not the row with the largest centre share, or its two sides together are not less
  than its centre (the compare shot would show them stopping short when they do not; another type is needed);
- a row does not add up to 100, holds other levels than the first row, or a value is negative;
- a label, a side name, the title or the credit does not fit the frame (shorten it).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const LEFT = [["low_a", "Low A"], ["low_b", "Low B"]];   // outward from the centre
const RIGHT = [["high_a", "High A"], ["high_b", "High B"]];
const CENTRE = ["middle", "Middle"];
const rows = data.rows.filter((r) => r[at("year")] === 2020).map((r) => {
  const total = [...LEFT, ...RIGHT, CENTRE].reduce((s, [c]) => s + Number(r[at(c)]), 0);
  const level = ([c, label]) => ({ key: c, label, value: (Number(r[at(c)]) / total) * 100 });
  return { key: r[at("region")], label: r[at("region")], left: LEFT.map(level), centre: level(CENTRE), right: RIGHT.map(level) };
});
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says the centre outweighs both sides together, `check()` compares the subject's centre with the sum of its left and right values and throws unless it is larger.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- A word function (a field that is a function) must return a string for every value the render passes it; the render
  calls each one before drawing and names the one that throws.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole diverging chart, the subject's centre ringed). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
