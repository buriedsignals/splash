# Diverging bar (web) — what you write

The page is already designed: it comes from the worked example `proof/web-diverging-bar-eu-per-capita`
and the story's PALETTE.md and DIRECTION.md. One horizontal bar per row grows left or right of a
zero rule; the rows are ordered by their LATER level, largest first. The colours, the type, the
names, the figures at the bar tips, the note beside the subject and the INTERACTION are done: the
ZERO is what the reader operates. A control ("measure each row from") moves the reference every bar
is measured from — each row's own earlier level (the default: its change), the median of the
earlier levels, the median of the later levels. The rows and the axis never move; every bar re-aims,
and a sentence under the control says what that zero makes true. Every row answers hover, tap and
Tab with its two levels and its distance from all three references. With JavaScript off the page is
the complete static plate measured from each row's own earlier level. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the two
medians, every bar's value under each reference, the counts above and below, draws the page, checks
it in a real browser and prints `look at: <png>`.

The note beside the subject hangs into the rows below it, so every row below the subject in the
order (by later level) must be below zero under all three references. The render refuses otherwise:
this page fits a subject whose later level is among the lowest.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, from, to }` per row, from `data.json`: its EARLIER level and its LATER level (4 to 40 rows, one per name). |
| `subject` | The `name` of the row the takeaway is about. Its name is drawn in the accent. |
| `subjectNote` | The short note set beside the subject's row ("Croatia: the only one above its 1990 level"). |
| `format(v)` | How a bar's value is printed, WITH its sign ("+0,03", "−20,5"), in the story's language. |
| `datumLabel` | The control's legend ("Measure each row from"). |
| `sideLabels` | `{ left, right }`: the words for below and above the reference. |
| `references` | `{ own, fromMedian, toMedian }`, each `{ label, announce(o), note(o) }`: `label` is the pill ("its 1990 level", "the 1990 median", "today's median"); `announce(o)` is what a screen reader hears and must CONTAIN `label` word for word; `note(o)` is the sentence shown under the control for that reference. `own` is the default. |
| `detail(r)` | The tooltip sentence for one row, true under every reference. Every row must answer differently (start with its name). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: the unit, which side is which, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: change the reference; hover or tab a row. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the summary `s` = `{ own, fromMedian, toMedian }`, each an `o` below). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

### What the word functions receive

A row reading `r` is `{ name, from, to, change, vsFromMedian, vsToMedian, rank, isSubject }`:
`change` = `to − from`; `vsFromMedian` = `to −` the median of every `from`; `vsToMedian` = `to −`
the median of every `to`; `rank` = its place in the order (1 = largest later level).

A reference reading `o` is `{ reference, count, above, on, below, top, bottom, meanBelow, spread,
subject }`: `reference` = the median the zero stands at (null for `own`); `above` / `on` / `below` =
the rows whose value under this reference is > 0 / = 0 / < 0 (each a row reading plus `value`, its
value under this reference); `top` / `bottom` = the rows with the largest / smallest value;
`meanBelow` = the mean value of the rows below; `spread` = the largest later level minus the
smallest; `subject` = the subject's row with its `value`.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("region"), col("year"), col("amount")];
const valueAt = (name, year) => Number(table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)?.[VALUE]);
const names = [...new Set(table.rows.map((r) => r[NAME]))];
const rows = names.map((name) => ({ name, from: valueAt(name, 1990), to: valueAt(name, 2024) }))
  .filter((r) => Number.isFinite(r.from) && Number.isFinite(r.to));
```

Leave out aggregate rows (a "Total" or "World" row is not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `o`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong row in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
