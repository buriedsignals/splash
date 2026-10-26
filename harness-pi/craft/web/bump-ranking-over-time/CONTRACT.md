# Bump (web) — what you write

The page is already designed: it comes from the worked example `proof/web-bump-emitter-rank` and the
story's PALETTE.md and DIRECTION.md. Rank lines for the members that lead at the first or the last
step (plus the subject), rank 1 at the top, the subject's line in the accent with a caption at every
drawn member it passed, the end labels, the colours, the type and the INTERACTION are done — one
mark per step answers hover, tap and Tab with the subject's rank, value and neighbours, and a
"follow a line" control brings one other line forward, rings every step where it crossed somebody,
and one sentence gives its rank run by run and every member it passed or was passed by — including
members that have no line on the chart. With JavaScript off the page is the complete static plate.
You do not change any of that.

The RANKING is computed by the render over EVERY member in `rows` at every step, so give it the
whole ranking, not only the lines you expect to see.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the
ranks, the walks and the crossings, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, year, value }` per member per year, from `data.json` — EVERY member (leave out aggregates such as "World" or "Europe"). The highest value ranks 1. |
| `subject` | The `name` of the member the takeaway is about. Its line is drawn in the accent. |
| `topCount` | Optional (default 5): lines are drawn for the top `topCount` at the first year and at the last year, plus the subject. |
| `maxRank` | Optional (default 10): how many rank rows the frame draws. Every drawn line must stay within it at every year. |
| `display(name)` | Optional: how a member's name is printed (e.g. translated). Default: the name as in the data. Every name the functions below receive has been through it. |
| `rankLabel(r)` | The label at each end of a line; `r` is `{ name, rank, year }` ("3rd India"). |
| `detail(m)` | The tooltip for one year of the subject. Must contain `m.year`. `m` is `{ name, year, rank, value, above, below }`: `above` / `below` = the members just above / below it that year (null at the ends). |
| `passedLabel(c)` | The caption on the subject's line where it passed a drawn member. Must contain `c.year`. `c` is `{ name, year, rank }`. |
| `followLabel` | The control's legend ("Follow a line"). |
| `noneLabel` | The untouched option's words; a string, or a function of `{ count }` (the number of lines) ("All 6 lines"). |
| `optionLabel(l)` | One option's pill; `l` is `{ name }`. Keep it short: every pill must fit a phone's width in one row. |
| `announce(w)` | What a screen reader hears for one option. Must contain that option's label. |
| `note(w)` | The sentence shown when a line is followed. Must name every member in `w.passed` and `w.overtakenBy`. `w` is `{ name, first, last, runs, net, passed, overtakenBy, undrawn }`: `runs` = `[{ position, from, to }]`, its rank run by run (`from`/`to` are years, as strings); `net` = ranks gained from the first to the last year (negative = lost); `passed` / `overtakenBy` = `[{ name, year }]`; `undrawn` = how many of those members have no line. |
| `crossingText(c)` | The words for one ringed crossing; `c` is `{ line, name, year, direction }` with `direction` `"passed"` or `"overtaken"`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: the vertical position is a RANK, not a value; which members are drawn; the limits the journalist named. |
| `reading` | One or two sentences: hover, tap or tab a year; follow a line. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the lines. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

If the render refuses with phone failures about the follow pills ("a real click at the … pill lands
on the pill — nothing at that pixel"), the row of pills is wider than a phone: shorten `optionLabel`
and `noneLabel`, or lower `topCount` so fewer lines are drawn.

## Reading the data

Rows are arrays in `columns` order; find columns by name. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("member"), col("year"), col("amount")];
const rows = table.rows
  .filter((r) => r[NAME] !== "Total")
  .map((r) => ({ name: r[NAME], year: Number(r[YEAR]), value: Number(r[VALUE]) }));
```

For `check()`, a member's rank in one year is its place among that year's rows sorted by value,
highest first: `rows.filter((r) => r.year === y).sort((a, b) => b.value - a.value).findIndex((r) => r.name === n) + 1`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `m`, `c`, `w`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
