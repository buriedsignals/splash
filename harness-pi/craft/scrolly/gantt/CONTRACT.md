# Gantt (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-gantt-top-ten-tenure`
and the story's PALETTE.md and DIRECTION.md. One row per entity on an axis of WHOLE YEARS from
`first` to `last`, one bar per run of consecutive years, the years a row did not hold as a faint
track. Colours, type, layout and the CHOREOGRAPHY are done. The graphic stays fixed while six cards
of prose travel up over it, and the reader's scroll moves a PLAYHEAD across the years:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the playhead at `first`: the rows present that year begun, the others faint | `cards.start`, `notes.year` |
| 2 | the playhead sweeps to the end of `midway`, spans growing behind it, a row's name waking when it enters | `cards.early`, `notes.year` |
| 3 | on to `last` | `cards.late`, `notes.year` |
| 4 | the `subjects` kept in the accent, the other rows stepping back | `cards.subjects`, `notes.subjects` |
| 5 | the rows with a hole and the single-year rows kept, each hole outlined | `cards.gaps`, `notes.gaps` |
| 6 | both years of every run written in its row label | `limits` |

With JavaScript off the page shows card 6's picture and every card's words. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
runs and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
event, gap and count, checks your words against them, draws the page, checks it in a real browser
and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `rows`:

| Field | What it is |
|---|---|
| `r.first`, `r.last`, `r.midway` | the axis's first and last year; the year card 2's sweep stops on |
| `r.extent` | how many years the axis holds (`last − first + 1`) |
| `r.count` | how many rows |
| `r.atFirst`, `r.atLast` | how many rows hold the first year, the last year |
| `r.slots` | the most rows holding any one year (10 for a "top 10") |
| `r.rows` | every row reading, in your order (below) |
| `r.subjects` | the readings of your `subjects` (card 4) |
| `r.whole` | the readings of the rows that hold every year of the axis |
| `r.interrupted` | the readings of the rows with a hole (card 5) |
| `r.singles` | the readings of the rows that hold a single year (card 5) |
| `r.early` | the events card 2's sweep crosses, `[{ key, label, kind, year }]` in year order: `kind` is `"entry"` (a run starts in `year`, after `first`) or `"exit"` (a run ends after `year`, before `last`); every event with `year ≤ midway` |
| `r.late` | the same for card 3: every event with `year > midway` |

A row reading is `{ key, label, index, runs, gaps, years, entry, exit, open, whole, single,
isSubject }`: `runs` = `[{ from, to, open }]`; `gaps` = `[{ from, to }]`, the missing years between two
runs; `years` = the years held; `entry` / `exit` = its first / last year; `open` = its last run is
still running at `last`; `whole` = it holds every year; `single` = it holds one year only.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, runs }` per entity (2 to 30), in the order they are drawn top to bottom (e.g. by first year, then by tenure). `key` is the data's own name, `label` is printed. `runs` is `[{ from, to }]`: whole years, in order, with a gap of at least one year between two runs of the same row. A run reaching `last` is drawn open (still running) unless it says `open: false`. |
| `subjects` | The `key`s of the rows the takeaway is about. Drawn in the accent; card 4 keeps them while the others step back. Not every row. |
| `first` / `last` | The axis's first and last year (integers). Every run falls inside them. |
| `midway` | Optional: the year card 2's sweep stops on (default: the middle year). Choose it so that cards 2 and 3 each have entries or exits to tell. |
| `tickEvery` | Optional: the step between graduations in years (default: about seven graduations). |
| `spanLabel(row)` | The years printed after the row's name on card 6, from `row.runs`: `"1990–2016"`, `"1990, 1992–2005"`, `"2006–"` for an open run. |
| `unit` | The line above the rows ("presence among the 10 largest CO₂ emitters"). |
| `cards` | `{ start(r), early(r), late(r), subjects(r), gaps(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.first`; card 2 `r.midway` and at least one event of `r.early` with its year; card 3 at least one event of `r.late` with its year; card 4 the label of every subject; card 5 the label of every row in `r.interrupted` and `r.singles`. |
| `notes` | `{ year(r), subjects(r), gaps(r) }` — the short accent note in the header: `year` follows the playhead on cards 1–3 and must contain `{y}` (replaced by the playhead's year: `"{y}: 10 countries"`); `subjects` is shown on card 4, `gaps` on card 5. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read the plate and what it counts, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a run is outside `first`–`last`, out of order or
touching the next; no row enters or leaves on one side of `midway` (card 2 or 3 has nothing to
tell); no row has a hole or a single year (card 5 has nothing to keep); every row is a subject; a
card does not state what it owes; a year in a card is not an event (entry, exit, gap, single year)
of a row that card names; or a card, a note or the alt states a count no figure of `r` equals.

## Reading the data

Rows are arrays; find columns by name.

- If the data has a start and an end column per row, each data row is a run: group them by entity.
- If the data is a yearly table (one row per entity per year, or a ranking), collect each entity's
  years, then cut them into runs of consecutive years, as `beat.example.mjs` does. Example with
  neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR] = [col("member"), col("year")];
const heldIn = new Map();
for (const r of data.rows) {
  if (!heldIn.has(r[NAME])) heldIn.set(r[NAME], []);
  heldIn.get(r[NAME]).push(Number(r[YEAR]));
}
const runsOf = (years) => {
  const out = [];
  for (const y of [...years].sort((a, b) => a - b)) {
    const open = out.at(-1);
    if (open && open.to === y - 1) open.to = y; else out.push({ from: y, to: y });
  }
  return out;
};
const rows = [...heldIn].map(([name, years]) => ({ key: name, label: name, runs: runsOf(years) }));
```

Leave out aggregate rows (a "World" or "Total" row is not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number and every year in a card, a note or the alt is taken from `r` (an event's `year`, a gap's `from`/`to`, a count), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong rows in the accent, a card cut, a wrong year), fix `beat.mjs` with a
  small `edit_file`, render and look again.
