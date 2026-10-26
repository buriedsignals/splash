# Bump / ranking over time (video) — what you write

The video is already designed: it comes from the worked example `proof/video-bump-emitter-rank` and
the story's PALETTE.md and DIRECTION.md. The shots, their timing (20 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the rank
rows, the years and the first year's names ("8 India"); the camera closes in on the SUBJECT's tip
and tracks it while every line advances from the first year to the last, linear in years — the tip
carrying its rank ("India · 5th"), every line named at its tip, the year in the corner, every member
the subject passes ringed as the clock reaches it; the camera pulls back to the whole chart, every
line but the subject and the members it passed steps back; then the whole chart and the credit.
There is no standfirst and no sentence on screen. You do not change any of that.

The video argues ONE thing: the subject's climb (or fall) through the ranking, pass by pass. The
render ranks the values per year and finds every pass; you give the data and the words.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `values` | One `{ entity, year, value }` per entity per year, from `data.json`: the measure that is ranked, every year from the first to the last (5 to 80 years). Entity names are printed as given — map them into the story's language here. Leave out aggregates. |
| `slots` | How many ranks are drawn (3 to 15; 10 in the worked example). |
| `subject` | The `entity` the takeaway is about. It must be in the top `slots` EVERY year (the camera tracks it). |
| `tip` | A function `(rank) => words` riding the subject's tip (`(rank) => \`India · ${rank}th\``). |
| `end` | Optional: a function `(rank, entity) => words` for the names at both ends. Default `` `${rank} ${entity}` ``. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a year is missing, or an entity has two values in one year;
- a year holds fewer entities than `slots`;
- the subject is outside the top `slots` in some year (raise `slots`, start later, or change subject);
- a member the subject passed ends above it (the last shot would call it passed);
- the title names a year other than the first or the last;
- `tip` or `end` does not return words; a name or the credit does not fit the frame.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("club"), col("season"), col("points")];
const values = data.rows
  .filter((r) => r[NAME] !== "Total")
  .map((r) => ({ entity: r[NAME], year: Number(r[YEAR]), value: Number(r[VALUE]) }));
```

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and rank it — never the raw column beside a per-resident headline.
- When the title says "from Nth to Mth", `check()` ranks the values in the first and the last year and throws unless the subject is Nth and Mth.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole ranking, the subject's line in the accent). If the render refuses, read its
  message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`,
  render and look again.
