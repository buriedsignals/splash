# Heatmap (matrix) (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-heatmap-coal-share-europe`
and the story's PALETTE.md and DIRECTION.md. One row per entity, one column per YEAR, each cell
coloured by its class (one hue, lighter to darker, the classes cut at your `breaks`); the value of
the year being read written in a column at the right. Colours, type, layout and the CHOREOGRAPHY are
done. The graphic stays fixed while six cards of prose travel up over it, and the reader's scroll
moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the first year alone; the rows from the highest first-year value down | `cards.start`, `notes.start` |
| 2 | the years fill one column at a time up to `countYear`; the header counts the rows under the first break | `cards.years`, `notes.years` |
| 3 | `crisisYear`: its column outlined, the rows that rose more than `jump` from the year before (or went back over the first break) marked | `cards.crisis`, `notes.crisis` |
| 4 | the last year: the rows under the first break and the rows at or above `half` kept, the rest stepping back | `cards.end`, `notes.end` |
| 5 | the rows re-sorted by relative fall (1 − last ÷ first), the fall written in the value column | `cards.sort`, `notes.sort` |
| 6 | the first year's values set beside the last year's | `limits`, `notes.reading` |

With JavaScript off the page shows card 6's picture and every card's words. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
grid and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
order, count, jump and fall, checks your words against them, draws the page, checks it in a real
browser and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `rows`:

| Field | What it is |
|---|---|
| `r.years`, `r.first`, `r.last` | the columns; the first and the last year |
| `r.count` | how many rows |
| `r.rows` | every row reading, in your order (below) |
| `r.byStart` | the row readings from the highest first-year value down (cards 1–4's order) |
| `r.byFall` | the row readings by relative fall, steepest first (card 5's order) |
| `r.leader` | the row with the highest first-year value (card 1's darkest cell) |
| `r.steepest` | the row with the steepest relative fall (first after card 5's sort) |
| `r.countYear`, `r.countUnder` | card 2's year; the rows under `breaks[0]` that year |
| `r.crisis` | `{ year, jumped, backOver, marked }`: card 3's year; the rows that rose more than `jump` from the year before (steepest rise first); the rows that went from under `breaks[0]` to at or above it; both together (the rows card 3 marks) |
| `r.underEnd`, `r.highEnd` | the rows under `breaks[0]` in the last year; the rows at or above `half` (card 4 keeps both) |
| `r.fallen`, `r.notFallen` | the rows whose last value is below their first; the others |
| `r.breaks`, `r.jump`, `r.half` | your thresholds |

A row reading is `{ label, index, cells, at(year), first, last, fall, fallPercent, rise }`: `at(year)`
= its value that year; `first` / `last` = its first- and last-year values; `fall` = `1 − last ÷ first`
and `fallPercent` = the same × 100 (positive when it fell); `rise` = its change from the year before
`crisisYear` to `crisisYear`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `years` | The columns: at least four consecutive whole years, in order. |
| `rows` | One `{ label, cells }` per row (2 to 20). `cells` holds one number per year, in the years' order; the first-year value must be above zero (card 5 divides by it). Any order: the render sorts. |
| `breaks` | The class edges of the ramp, in the cells' unit, strictly rising, 2 to 7 of them (e.g. `[10, 25, 50, 75]` for shares in %): `n` breaks make `n + 1` classes. `breaks[0]` is the threshold cards 2–4 count against. |
| `breakLabel(b)` | How a break is printed in the key ("10 %"). |
| `format(v)` | How a value is printed in a sentence (decimals, decimal comma or point for the language). |
| `cellFormat(v)` | Optional: how a value is printed in the narrow value column (default `format`). |
| `fallLabel(row)` | The fall written in the value column on card 5, from `row.fallPercent` ("−83 %"). |
| `countYear` | The year card 2's fill stops on. |
| `crisisYear` | The year card 3 outlines. `first < countYear < crisisYear <= last`. |
| `jump` | The rise from the year before `crisisYear` that card 3 marks, in the cells' unit (3 points). |
| `half` | Optional: the last-year value card 4 keeps rows at or above (default 50, half of a share in %). |
| `labelledYears` | Optional: the years printed over the columns (default the first, the last, and the multiples of 5 between). |
| `unit` | The line above the grid ("coal's share of electricity generation"). |
| `legend` | The words beside the colour key ("share of the country's generation"). |
| `fallHead` | The value column's head on card 5 ("fall"). |
| `cards` | `{ start(r), years(r), crisis(r), end(r), sort(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must name `r.leader` and state `format(r.leader.first)`; card 2 `r.countYear` and the name of every row in `r.countUnder`; card 3 `r.crisis.year` and the name of every row in `r.crisis.marked`; card 4 `r.last` and, for every row in `r.highEnd`, its name and `format(row.last)`; card 5 the name of `r.steepest` and its fall, `Math.round(r.steepest.fallPercent)`. |
| `notes` | `{ start(r), years(r), crisis(r), end(r), sort(r), reading(r) }` — the short accent note in the header while each card is read. `notes.years` follows the fill and must contain `{year}` and `{n}` (the year it stands on, how many rows are under `breaks[0]` then): `"{year}: {n} countries under 10 %"`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what a cell is, the period, the rule that selected the rows, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the grid and its pattern (a string, or a function of `r`). |
| `evidenceLevels` | Optional: the number of classes (default `breaks.length + 1`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the years are not consecutive; a row lacks a cell;
a first-year value is zero; every cell falls in one class; the years are out of order
(`first < countYear < crisisYear <= last`); card 3 would mark no row (no rise above `jump`, none back
over `breaks[0]`); card 4 would keep no row; a card does not state what it owes; `fallLabel` does not
print the fall; or a card, a note or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names (one row per entity per year):

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("region"), col("year"), col("share")];
const years = [...new Set(data.rows.map((r) => Number(r[YEAR])))].sort((a, b) => a - b);
const names = [...new Set(data.rows.map((r) => r[NAME]))];
const rows = names.map((n) => ({
  label: n,
  cells: years.map((y) => Number(data.rows.find((r) => r[NAME] === n && Number(r[YEAR]) === y)[VALUE])),
}));
```

Leave out aggregate rows (a "World" or "Total" row is not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine; your own thresholds (`breaks`, `jump`, `half`) are fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong rows kept, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
