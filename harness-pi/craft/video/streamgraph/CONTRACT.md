# Streamgraph (video) — what you write

The video is already designed: it comes from the worked example `proof/video-streamgraph-swiss-electricity`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (20.9 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then the
year ticks; the stream is drawn from the first year to the last, the GIANTS named inside their
bands; the giants (the bands that hold every rank above the race, every year) close to nothing and
the small bands gather on the same scale; the small stream is magnified to the frame; the small
bands turn into lines from zero; a cursor travels the years with the TRACKED band's rank riding its
line («Solaire · 7e» … «Solaire · 3e»), and the year it first reaches the rank is marked once the
cursor passes it, the RIVAL it overtook named at the end of its line; then the stream comes back
and the credit comes in. There is no standfirst and no sentence on screen. You do not change any
of that.

The video tells ONE argument: "in year Y the tracked band became the Nth largest, and has stayed
there". The render computes Y, the giants and the rival, and refuses data where the rank is lost
again, where it was already held in the first year, where the giants do not hold ranks 1 to N−1
every year, or where no band is overtaken. Another type or the static format must tell those.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) ranks the bands
every year, finds the year, the giants and the rival, lays the frames out, renders fourteen stills,
prints `look at: <png>`, then renders the mp4 (about two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it, and checks that a year it names is the year the video marks); shorter forms may follow. |
| `keys` | The bands drawn: the `data.json` column names of the quantities stacked (at least three), in the data's column order. |
| `labels` | `{ key: name }` for EVERY key, in the story's language. The giants' names are printed inside their bands, the rival's at the end of its line. |
| `tracked` | The key of the band the takeaway is about. It is drawn in the accent. |
| `rank` | The rank the title says the tracked band reached (3 for "the third source"). |
| `readings` | One `{ year, <key>: value, … }` per year, every year from the first to the last, none skipped; values 0 or more. Leave out an incomplete last year, and say so in `source`. |
| `giants` | Optional: the `rank − 1` keys that hold ranks 1 to `rank − 1` every year. Default: the largest in the first year. |
| `reachedIn` | Optional: the year the rank is first reached, COMPUTED; the render refuses a different one. |
| `rankLabel(n)` | The rank riding the tracked line ("Solar · 3rd"). It is handed every rank the band holds over the years. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. |
| `lang` | Optional: the story's language tag ("fr", "en"). |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a year is missing between the first and the last, or a value is not a number of 0 or more;
- `labels` misses a key, or `tracked` is not in `keys`;
- the tracked band never reaches `rank`, loses it again, or holds it from the first year;
- the giants do not hold the ranks above it every year, or the band takes the rank without passing anyone;
- the title names a year (inside the readings) other than the one the race marks;
- `rankLabel` prints the same text for different ranks;
- a giant's name does not fit inside its band (shorten `labels`).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const keys = ["Alpha", "Beta", "Gamma", "Delta"];
const readings = data.rows
  .filter((r) => Number(r[col("year")]) <= 2024)
  .map((r) => ({ year: Number(r[col("year")]), ...Object.fromEntries(keys.map((k) => [k, Number(r[col(k)])])) }));
const rankOf = (r, key) => keys.map((k) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((o) => o.k === key) + 1;
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values) — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- When the title says "became the Nth in year Y", `check()` finds the first year the rank is reached, throws unless it is Y, and throws if a later year loses it.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole stream, the year marked, the tracked band's rank at its end). If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (a name cut, the wrong
  year), fix `beat.mjs` with a small `edit_file`, render and look again.
