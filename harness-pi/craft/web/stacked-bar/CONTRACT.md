# Stacked bar (web) — what you write

The page is already designed: it comes from the worked example `proof/web-stacked-bar-lowcarbon-growth`
and the story's PALETTE.md and DIRECTION.md. One horizontal bar per member, stacked by band in ONE
order (the first band on the baseline), ranked by total, with a tick at each bar's EARLIER total so
the distance from the tick to the bar's end is what was added; the colours (one hue, shaded per
band), the type and the INTERACTION are done — every segment answers hover, tap and Tab with its
band, its value, its rank among the members on that band, its share of the bar and its earlier
value, and a "rebase" control lets the reader put one band on a common zero baseline: a rail grows
under every bar to that band's value, so the band the stack misranks can be compared. With
JavaScript off the page is the complete static stack and the control still works. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
bars and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the
stack, the ranks and the misranked pairs, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `bands` | The stacked parts, bottom first: `{ key, name, label }` — `key` names the band in `rows`, `name` is the legend's words ("solar"), `label` the control pill's words (optional, default `name`). 2 to 5 bands — fewer if the story's accent cannot shade more (the render says how many). |
| `rows` | One `{ name, values, earlier }` per bar, from `data.json`: `values` = `{ <band key>: number }` now, `earlier` = the same at the earlier date (the tick is their sum). Every band key in both, zero or more. 2 to 20 rows, one per name. |
| `highlight` | The `name`(s) of the one bar or pair the takeaway is about; their names and totals are drawn in the accent. |
| `unit` | The unit ("TWh"), used in your sentences and the page's metadata. |
| `format(v)` | How a value is printed on a segment and in the total (the worked example: no decimals). |
| `totalLabel(r)` | Printed at the end of each bar. `r` is `{ name, total, before, added }` (`added` = `total − before`). Must state `format(r.total)`. |
| `detail(s)` | The tooltip sentence for one segment. `s` is `{ name, band, value, rank, count, share, earlier, change, existed }`: `rank` = its place among the `count` members on that band; `share` = percent of its own bar; `earlier` = the band's earlier value, `change` = `value − earlier`, `existed` = `earlier > 0`. Start with the name. |
| `beforeLabel` | The legend's words for the tick ("total 2000"). |
| `rebaseLabel` | The control's legend ("Measure one source from zero"). |
| `noneLabel` | The untouched option's words ("the stack alone"). |
| `noneAnnounce` | What a screen reader hears for it. Must contain `noneLabel`. |
| `announce(o)` | What a screen reader hears for one band's option. Must contain `o.label`. |
| `note(o)` | The sentence shown under the control when that band is chosen. Must state `o.inverted`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: unit, scope, the limits the journalist named; if bars were left out, say how many. |
| `reading` | One sentence telling the reader how to read a stack and what they can do (choose a band, hover a segment). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bars. |
| `evidenceLevels` | Optional, 6. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

`o` (one band's option) is `{ band, label, inverted, pairs, longer, righter }`: `pairs` = how many
pairs of bars there are; `inverted` = how many of them the stack ranks backwards on that band (the
longer band ends further left); `longer` and `righter` = the pair it misreads by the widest margin,
each `{ name, value, end }` — `longer` has the larger value, `righter` ends further right on the axis
(`end` = where its segment ends).

A band is offered in the control only when the stack misranks at least one pair on it and it is drawn
on every bar (the band on the baseline is never offered: its end IS its length). The render refuses
when no band qualifies.

## Reading the data

Rows of `data.json` are arrays; find a column's index by name. Example with neutral names:

```js
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR] = [col("region"), col("year")];
const BANDS = [{ key: "a", cols: ["part_a"], name: "part A" }, { key: "b", cols: ["part_b", "part_c"], name: "B and C" }];
const at = (name, year) => table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year);
const values = (r) => Object.fromEntries(BANDS.map((b) => [b.key, b.cols.reduce((s, c) => s + Number(r[col(c)]), 0)]));
const rows = names.map((n) => ({ name: n, values: values(at(n, 2024)), earlier: values(at(n, 2000)) }));
```

A band may sum several columns (group the smallest into one "other" band).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `s`, `o`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- If the render says the accent can shade only N bands, merge the smallest bands into one until
  `bands` holds N, and name the merged band for what it holds.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong bar in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
