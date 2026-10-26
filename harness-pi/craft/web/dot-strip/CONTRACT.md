# Dot strip (web) — what you write

The page is already designed: it comes from the worked example `proof/web-dot-strip-lowcarbon-spread`
and the story's PALETTE.md and DIRECTION.md. Every unit is a translucent dot on two ruled rails —
one per state (two years) — sharing one 0 to 100 scale, with a deterministic jitter across each rail.
Each rail is headed by its statistics row and carries three ticks (floor, middle, ceiling) and a
span bar. The colours, the type, the layout and the INTERACTION are done: a LADDER ("the axis
measures") lets the reader choose what the axis counts. Each rung takes a part AWAY from the
numerator over the SAME whole, so a dot can only move left; the dots take the positions their new
values put them at, the statistics rewrite, the span bars slide, and a sentence says what that rung
shows. Every dot answers hover, tap and Tab. With JavaScript off the page is the complete static
plate under the first rung. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
share, the rails' statistics, the ranks and the falls, draws the page, checks it in a real browser
and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `units` | One `{ name, code }` per unit (4 to 40), every one read at both states. `code` (optional) only seeds the dot's jitter. |
| `from` / `to` | The two states ("2000", "2024"), printed at the head of each rail. |
| `whole(name, state)` | The total each share is OF, for one unit at one state — the same under every rung. |
| `rungs` | 2 to 5 rungs, the FIRST being the takeaway's own measure. Each `{ label, stripped?, part(name, state), announce(o), note(o) }`: `part` = the amount this rung counts (each rung's part is the previous rung's minus something, never more); `label` = the pill ("low-carbon", "without nuclear"); `stripped` = what this rung has taken away, in words, for the tooltip ("nuclear and hydro"); `announce(o)` = what a screen reader hears, must CONTAIN `label`; `note(o)` = the sentence saying what this rung shows — every rung but the first has one, the first has none. |
| `subject` | The `name` of the unit the takeaway is about. Drawn in the accent. |
| `alsoLit` | Optional: up to two more `name`s drawn in the accent (a second case the notes name). |
| `ladderLabel` | The control's legend ("The axis measures"). |
| `stats(s)` | The statistics row heading one rail under one rung. Keep it short (two lines at most on a phone). |
| `detail(m)` | The tooltip sentence for one dot on one rail under one rung. On one rail every dot must answer differently (start with the name). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a dot's position is, the two states, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: change the measure; hover or tab a dot. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the list of rung readings `o`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

### What the word functions receive

A rung reading `o` is `{ label, stripped, from, to, falls, value(name, state), base }`: `from` / `to`
are the two rails, each `{ state, values, floor, ceiling, median, span }` (`values` sorted from the
smallest, each `{ name, value }`; `floor` / `ceiling` the smallest / largest `{ name, value }`;
`span` = ceiling − floor); `falls` = per unit, how many points it loses at `to` against the first
rung, largest first (`{ name, fall }`); `value(name, state)` = a unit's share under this rung;
`base` = the first rung's two rails.

A statistics reading `s` is `{ state, floor, ceiling, median, span, rungLabel }`.

A dot reading `m` is `{ name, state, value, otherState, otherValue, rank, otherRank, count,
baseValue, lessThanBase, rungIndex, rungLabel, stripped, isSubject }`: `rank` = its place on this
rail from the smallest (1); `baseValue` = its share under the first rung; `lessThanBase` =
`baseValue − value`; `rungIndex` = 0 for the first rung.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR] = [col("region"), col("year")];
const rowOf = (name, state) => table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === Number(state));
const sum = (name, state, cols) => cols.reduce((s, c) => s + Number(rowOf(name, state)[col(c)]), 0);
const ALL = ["part_a", "part_b", "part_c", "rest"];
const units = [...new Set(table.rows.map((r) => r[NAME]))].map((name) => ({ name }));
// whole: (n, s) => sum(n, s, ALL); rungs: part (n, s) => sum(n, s, ["part_a", "part_b", "part_c"]), then ["part_b", "part_c"], …
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`o`, `s`, `m`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
