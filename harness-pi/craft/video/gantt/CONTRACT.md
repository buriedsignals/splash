# Gantt (video) — what you write

The video is already designed: it comes from the worked example `proof/video-gantt-top-ten-tenure`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (17.7 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then the
rows and their names, ordered by first year then by tenure, the rows present in the first year in
ink and the later entrants muted; a year cursor sweeps the window from `first` to `last`, each row's
bar growing behind it while the row holds its place and stopping where it leaves, the rows seated
that year marked on the cursor; the count over the rows — how many of the first year's rows have
never left — falls the moment one leaves, muting its name; then the rows held EVERY year are
picked out in the accent while the others step back; the others return, the whole chart, the
credit on one line. There is no standfirst and no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) orders the rows,
finds the rows held every year, counts who never left year by year, lays the frames out, renders
nine stills, prints `look at: <png>`, then renders the mp4 (one to two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | 2 to 24 rows, each `{ key, label, runs }`: `label` is printed; `runs` are the row's stretches of consecutive years, `[{ from, to }]`, whole years inside the window, not touching each other. One row per key. |
| `subjects` | The `key`s of EXACTLY the rows held every year from `first` to `last`. They take the accent. |
| `first`, `last` | The window's first and last year (whole numbers). |
| `count(n)` | The count over the rows: `n` of the first year's rows have never left ("6 pays jamais sortis"). Called for every value the count takes. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- `subjects` is not exactly the rows held every year, or no row was held every year (the last shot
  would pick out nothing; another type is needed);
- a run leaves the window, is not whole years, or touches the next run (merge them);
- a label, the count, the title or the credit does not fit the frame (shorten it, or draw fewer rows).

## Reading the data

Rows are arrays; find columns by name. Build each row's runs from the years it holds. Example with
neutral names (members of a yearly top five):

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const held = new Map();
for (let year = 2000; year <= 2020; year++)
  for (const r of data.rows.filter((r) => r[at("year")] === year).sort((a, b) => b[at("amount")] - a[at("amount")]).slice(0, 5))
    held.set(r[at("region")], [...(held.get(r[at("region")]) ?? []), year]);
const rows = [...held].map(([key, years]) => {
  const runs = [];
  for (const y of years) runs.at(-1)?.to === y - 1 ? (runs.at(-1).to = y) : runs.push({ from: y, to: y });
  return { key, label: key, runs };
});
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says how many rows never left, `check()` counts the rows whose runs cover every year of the window and throws unless it is that number.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- A word function (a field that is a function) must return a string for every value the render passes it; the render
  calls each one before drawing and names the one that throws.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole chart, the rows that never left in the accent). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
