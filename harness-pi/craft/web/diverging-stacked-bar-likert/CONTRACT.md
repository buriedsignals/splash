# Diverging stacked bar (web) — what you write

The page is already designed: it comes from the worked example `proof/web-diverging-stacked-electricity`
and the story's PALETTE.md and DIRECTION.md. Each row is a WHOLE (100 %) laid on a FIVE-rung ordered
scale and leaned about a fixed centre line: two rungs drawn in ink tones on one side, one neutral
rung in the middle, two rungs in accent tones on the other side. The colours, the legend, the type,
the two camp totals in the gutters, the net marker above each bar and the INTERACTION are done: the
reader moves the CUT — where the boundary between the two camps falls on the scale. Every rung
keeps its share and changes side; the totals rewrite, each net marker slides, a line names the two
camps, and a sentence says what that cut overturns. Every band answers hover, tap and Tab. With
JavaScript off the page is the complete static plate under the first cut. You do not change any of
that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
shares and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
row's lean under every cut, the totals and each band's camp, draws the page, checks it in a real
browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `levels` | EXACTLY five level labels, ordered from one camp's extreme to the other's (left to right): the first two drawn in ink tones, the third neutral, the last two in accent tones. Group the data's columns into five. |
| `rows` | One `{ name, shares }` per row (2 to 12), in their own natural order (alphabetical, by question) — never sorted by result. `shares` holds five numbers, one per level in the levels' order, each the level's share of the row in percent, adding up to 100. |
| `subject` | The `name` of the row the takeaway is about. Its name is drawn in the accent. |
| `cutLabel` | The control's legend ("The boundary"). |
| `cuts` | 2 to 5 positions of the boundary, the FIRST being the default picture. Each `{ label, left, straddle?, sides: { left, right }, camps, announce(c), note(c) }`: `left` = how many levels fall on the left camp (0–5); `straddle: true` draws the next level across the centre, half on each side; `sides` = the two camps' names; `camps` = ONE SHORT LINE naming the camps ("fossil · nuclear astride · renewable") that must fit one phone line (the render measures it); `announce(c)` = what a screen reader hears, must CONTAIN `label`; `note(c)` = the sentence saying what this cut overturns — every cut but the first has one, the first has none. |
| `format(v)` | How a camp's total is printed, with its unit ("63,2 %"). |
| `detail(b)` | The tooltip sentence for one band under one cut. Within a cut, every band must answer differently (name the row and the level). |
| `netLegend` | The legend's words for the net marker ("each row's net"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the shares are of, the year, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: move the boundary; hover or tab a band. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the list of cut readings `c`). |
| `evidenceLevels` | Optional, 5. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

### What the word functions receive

A cut reading `c` is `{ label, leans, byName, deepestLeft, furthestRight, subject, rows }`: `leans`
holds one `{ name, left, right, net, isSubject }` per row under this cut (`left` / `right` = the two
camps' totals in %, `net` = `right − left`); `byName[name]` is that row's lean; `deepestLeft` /
`furthestRight` = the leans with the smallest / largest `net`; `subject` = the subject's lean;
`rows` = `{ name, shares: { <level label>: share } }` per row.

A band reading `b` is `{ name, level, levelIndex, share, camp, left, right, net, cut, isSubject }`:
`camp` is `"left"`, `"right"` or `"centre"` (the straddled level); `left` / `right` / `net` are the
row's lean under this cut; `cut` is the cut's label.

## Reading the data

Rows are arrays; find columns by name. Turn each row into five shares: add up its columns, then each
level's share is the sum of its columns ÷ the total × 100. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const LEVELS = [["very_low"], ["low"], ["middle"], ["high"], ["very_high", "top"]];
const [NAME, YEAR] = [col("region"), col("year")];
const rows = table.rows.filter((r) => Number(r[YEAR]) === 2024).map((r) => {
  const total = LEVELS.flat().reduce((s, c) => s + Number(r[col(c)]), 0);
  return { name: r[NAME], shares: LEVELS.map((cols) => cols.reduce((s, c) => s + Number(r[col(c)]), 0) / total * 100) };
});
```

Put EVERY column of the mix in one of the five levels — a column left out draws a row that does not
add up to 100, and the render refuses it.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`c`, `b`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Keep the title and the standfirst short: on a phone the whole page must fit the window, and a long
  header makes the browser check fail ("no vertical scroll inside the visual").
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
