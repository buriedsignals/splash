# Parallel coordinates (video) — what you write

The video is already designed: it comes from the worked example
`proof/video-parallel-coordinates-electricity-mix` and the story's PALETTE.md and DIRECTION.md. The
shots, their timing (21.5 s at 30 fps), the type, the colours and the layout are done. The video opens
on a title card (eyebrow + title); then ONE line's whole grows along the foot as one bar (« 100 % »),
gaps cut it into its parts, each part stands up on its rail keeping its length (every rail carries the
same scale), and the line joins the tops; the other lines are drawn across the rails one after
another, the largest on the first claim axis first, each named once at its highest vertex; then the
gap between the two claim rails opens across the frame, a floor rises on the first rail and every line
it passes steps back while the count between the rails falls (« 16 pays » → « 5 pays »), a floor rises
on the second rail and the count falls again (→ « 2 pays »); the lines left take the accent; the rails
close back, every line returns, the two floors stay marked, and the credit comes in on one line. There
is no standfirst and no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes the groups
each floor leaves and the correlation between the two claim axes, seats every name, lays the frames
out, renders thirteen stills, prints `look at: <png>`, then renders the mp4 (about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `axes` | The axes left to right, 3 to 9: `[{ key, name }]`. `name` is printed at the head of the rail. The two claim axes come FIRST. |
| `lines` | One `{ key, name, values }` per entity (3 to 30): `values` gives EVERY axis's value by axis key. Each value is a SHARE in % of the entity's own whole (the parts on no axis included), so a line's values add up to 100 at most — the video stands one line's whole on the rails. One line per entity: filter to one year first. |
| `claimAxes` | The two axis keys the takeaway relates, e.g. `["share_a", "share_b"]` — the first two of `axes`, in that order. |
| `floors` | The two thresholds the takeaway names, one per claim axis, whole percents: `[25, 20]`. |
| `thread` | The `key`s of the lines at or above BOTH floors — the lines the sweep leaves, drawn in the accent. Compute it. |
| `shown` | Optional: the `key` of the line whose whole stands up first; one of `thread` (default its first). |
| `short` | Optional: `{ key: short name }` for long names, used only where a full name finds no seat on any rail. |
| `percent(v)` | How a floor's value (and the « 100 % » of the bar) is printed: `(v) => \`${v} %\``. Returns a string. |
| `count(n)` | How the count between the close rails is printed: `(n) => \`${n} places\``. Returns a string. |
| `source` | The credit line in one to three forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `evidenceLevels` | Optional, 4. |
| `check({ lines, r, both })` | Throws if the data no longer supports the title. render-beat passes the lines, `r` (the correlation between the two claim axes across all lines) and `both` (the keys of the lines at or above both floors). |

The render refuses, saying what to change, when:
- the two claim axes are not the first two of `axes`, or `floors` is not two whole percents;
- a line's values add up to more than 100 (they are not shares of its own whole);
- `thread` is not exactly the lines at or above both floors, or no line clears both (the argument does
  not hold for this data), or `shown` is not one of them;
- `percent` or `count` throws or does not return a string;
- a name finds no seat on any rail, or the close-up names do not fit (give long names a `short` form,
  shorten the axis names, or draw fewer lines).

## Reading the data

Rows are arrays; find columns by name (neutral names here):

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const parts = ["part_a", "part_b", "part_c", "part_other"]; // every part of the whole
const lines = data.rows
  .filter((r) => Number(r[col("year")]) === 2024)
  .map((r) => {
    const total = parts.reduce((s, k) => s + Number(r[col(k)]), 0);
    return { key: r[col("code")], name: r[col("place")], values: Object.fromEntries(axes.map((a) => [a.key, (Number(r[col(a.key)]) / total) * 100])) };
  });
```

Compute each share from the row's total — every part, including the ones not drawn as axes — and draw
the share, not the raw value.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision, never with strict equality on the raw division.
- When the title says "N of M clear both", `check()` compares `both.length` with N and `lines.length` with M.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole chart, the thread in the accent). If the render refuses, read its message and
  fix `beat.mjs`. If the picture is wrong (a name cut, the wrong lines in the accent, a wrong count),
  fix `beat.mjs` with a small `edit_file`, render and look again.
