# Bullet (video) — what you write

The video is already designed: it comes from the worked example `proof/video-bullet-low-carbon-share`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the axis
name, a key of three swatches (earlier state, later state, the rest) and the rows in their EARLIER
order, each one bar for a WHOLE to 100 %: the earlier share in the pale tint, the rest in a neutral;
row after row the frontier moves to the later share, the part gained filling in the saturated hue,
each gain counting at the right ("+17,3 pts"); the rows re-sort by gain, one row climbing at a time;
the threshold line (50 by default) drops through the chart and the row that gained most is ringed as
the ONLY one still under it; then the credit. There is no standfirst and no sentence on screen. You do
not change any of that.

The video argues ONE thing: the row that moved furthest is still the only one short of the line.
The render computes the gains, the order and the row that gained most; you give the data and the
words.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | One `{ name, label, marker, measure }` per row, from `data.json`, 3 to 10 rows: `name` identifies it, `label` is how it is printed (optional), `marker` the earlier share, `measure` the later — both in percent, between 0 and 100, the later not below the earlier. |
| `threshold` | Optional: the line the last shot drops (default 50). |
| `subject` | Optional: the `name` of the row the takeaway is about; it must be the row that gained most. |
| `markerName` | The earlier state in the key ("2015"). |
| `measureName` | The later state in the key ("2024"). |
| `restName` | What the rest of each whole is ("fossil"). |
| `axisName` | What a bar measures, printed over the rows ("low-carbon share of electricity"). |
| `gainUnit` | The word after every gain ("pts"); `""` for none. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a share is outside 0–100, two rows share a name, or a row's later share is below its earlier one
  (the frontier only moves forward);
- the row that gained most is not the ONLY row under `threshold` at the later state (the last shot
  would ring a falsehood) — this data then needs another format;
- `subject` is not the row that gained most;
- the title names a year that is neither `markerName` nor `measureName`;
- the header, a label or the credit does not fit the frame (shorten it).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, PART, WHOLE] = [col("region"), col("year"), col("renewable"), col("total")];
const shareOf = (region, year) => {
  const r = data.rows.find((row) => row[NAME] === region && Number(row[YEAR]) === year);
  return (Number(r[PART]) / Number(r[WHOLE])) * 100;
};
const regions = [...new Set(data.rows.map((r) => r[NAME]))];
const rows = regions.map((name) => ({ name, marker: shareOf(name, 2015), measure: shareOf(name, 2024) }));
```

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about: a share is computed from its part and its whole, in percent.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(gain * 10) / 10 === 17.3`), never with strict equality on the raw division.
- When the title says one row gained most, `check()` sorts the rows by `measure - marker` and throws unless that row is first.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the rows by gain, the line dropped, the furthest mover ringed). If the render refuses,
  read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
