# Area and stacked area, composed, on the web — what you write

The marks, the type, the colours and the layout are done: a filled area from ZERO (the surface is the stock: give each time its own reading, as data.json holds it — never a running total you added up, the surface already adds them); several series stack, the first at the bottom, in the story's PALETTE.md and DIRECTION.md, as a
page that fills its container. YOU decide the staging: an ordered list `gestures`, in the order the story tells it.
The page the reader lands on draws every resting gesture at once; every further gesture becomes ONE reader control
(two options: the page as it lands, and the page with that gesture). You write ONE file, `beat.mjs`, beside
`data.json`. `beat.example.mjs` is a worked example: read it first, then write this story's from scratch.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `points` | One `{ series, t, value }` per series per time, read from `data.json`. `t` is a year (or an ISO date). A missing value (`null`) is a gap: it is drawn as a gap, never filled. |
| `unit` | The unit, written once above the plot. |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `title` | The journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (shorter forms may follow in an array). |
| `limits` | The standfirst: unit, scope, the limits the journalist named. |
| `source` | The credit line. |
| `alt` | The page's description. |
| `restLabel` | The words of the option that shows the page as it lands, e.g. "The whole series". |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A mark is ONE reading, named `"<time> · <series>"` (e.g. `"2016 · Solaire"`); a time alone (`"2016"`) names every
series at it; a series alone (`"Solaire"`) names its whole line. `highlight`, `name`, `annotate`, `reference`,
`reveal` and `pull-back` rest on the page; `compare`, `filter`, `zoom`, `trace` and `bracket` each become a control
(the page needs at least one). "bracket" over a run of years (marks: the years) tints that run and prints its sum — with of: "whole", its share of every reading added up; "compare" of two readings of one series rewinds a level, in a stack it lays a copy of the earlier band's thickness beside the later one. `zoom` enlarges the time axis onto its marks' years and its note must print
the factor; `trace` on one reading draws its series up to that time, the rest stepping back; `filter` keeps its
series and the others leave.

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` / `marks` | readings, times or series, as above. `compare`: the subject first |
| `value` | a `reference` rule's level |
| `note` | the words drawn with the gesture, in the story's language; every number is checked against the readings |
| `label` | a control's legend, a few words in the story's language (optional) |

## Reading the data

Rows are arrays; find columns by name:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const points = data.rows.map((r) => ({ series: r[col("Entity")], t: Number(r[col("Year")]), value: Number(r[col("Value")]) }));
```

Leave out aggregate rows (a "World" or region row is not a series). Large raw values may be rescaled (tonnes →
millions of tonnes) when the unit says so. Never type the readings: `beat.mjs` must read `data.json`.

## Rules

- Every gesture serves the confirmed takeaway: it acts on the series the takeaway names (or its comparison), or it
  states one of its figures.
- Every number in a `note` is computed from the readings; "highest", "third", "twice" are checked.
- Write every `note` and `label` in the storyboard's `language`.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG. A refusal on `gestures[i]` names
  the key to change and a value that works.
