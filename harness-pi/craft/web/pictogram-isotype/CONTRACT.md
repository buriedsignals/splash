# Pictogram (isotype, web) — what you write

The page is already designed: it comes from the worked example `proof/web-pictogram-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. The grid of squares, the 2 or 3 blocks with their names
and figures in the left gutter, the tones, the type and the INTERACTION are done. By default one
square is one real thing (a country, a school) — the static plate. A "one square is worth" control
lets the reader re-count the SAME field in a quantity instead (one square = 100 TWh, = 1,000 beds):
the ink runs in or drains out, no square moves, each block's last square fills to its own remainder,
and each block's figure changes in place. Every square answers hover, tap and Tab: under the default
with its own thing; under a quantity with the things that fill it and the fraction each puts in. With
JavaScript off the page is the complete static field, and the control still works (CSS only). You do
not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
things, the blocks, the quantities and the WORDS. `render-beat.mjs` (already in the folder) puts
each thing in its block, cuts every quantity into squares, works out which things fill each square,
draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `units` | One object per thing (10 to 200), from `data.json`: `{ key, label, value, …any quantity fields }`. `value` is what the blocks are cut on. Leave out things with no reading (list them in `absent`). |
| `absent` | Optional: the labels of the things with no reading, `[]` if none. |
| `absentNote` | When `absent` is not empty: the sentence saying they are not drawn, stating their count or every name. It is printed after the source. |
| `blocks` | 2 or 3 groups, top to bottom: `[{ key, name, min, max }]`. A thing goes in the block where `min <= value < max` (leave `min` or `max` out for an open end); ranges must cover every value and not overlap. The FIRST block is drawn in the accent: put the takeaway's block first. `name` is a short range, at most 14 characters ("75 % et plus"). |
| `format(v)` | Optional: how a `value` is printed. |
| `controlLabel` | The control's legend ("One square is worth"). |
| `countLabel` | The default option: what one square is ("one country"). |
| `countAnnounce` | What a screen reader hears for it; must contain `countLabel` word for word. |
| `measures` | 1 to 3 quantities the reader can count instead, each `{ key, label, perValue, amount(u), announce, note(m) }`: `label` says what one square is worth, number included ("100 TWh of electricity"); `perValue` is that number, and must be 1, 2 or 5 times a power of ten; `amount(u)` returns a thing's quantity (≥ 0) from its object in `units`; `announce` must contain `label` word for word; `note(m)` is the sentence shown under the control when chosen (see below). Each quantity must draw 5 to 200 squares in all. |
| `figure(n, isCount)` | The figure printed beside each block: `n` squares, a whole number under the count, a decimal under a quantity ("16 squares", "28.9 squares"). At most 13 characters. |
| `detailThing(t)` | The tooltip of one square under the default. `t` is `{ key, label, value, rank, of, block, amounts, unit }`: `rank` = its place by `value` among `of` things, `block` = its block's name, `amounts` = its quantity per measure `key`, `unit` = its object from `units`. Start with its label. |
| `detailSquare(s)` | The tooltip of one square under a quantity. `s` is `{ measure: { key, label, perValue }, block, index, squares, whole, fillPct, amount, parts, solo }`: `index` = its place in its block (1 = first), `squares` = the block's squares under that quantity, `whole` = false for the last, partial square, `fillPct` = how full it is in %, `amount` = what it holds, `parts` = `[{ label, amount, pct }]` the things that fill it, in order, with the % of the square each fills, `solo` = `{ label, squares }` when one thing fills it alone (how many squares that thing fills in all), else null. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what one square is by default, what `value` measures, the year, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do (change what a square is worth; hover, tap or tab a square) — a string, or a function of the same object `check()` receives. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the same object `check()` receives). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ blocks, counts, total, measures })` | Throws if the data no longer supports the title. `counts` gives each block's count of things by its `key`; `total` = things drawn. |

`note(m)`, `check()`, `alt()` and `reading()` receive per-quantity readings `m`:
`{ key, label, perValue, sum, squares, blocks: [{ key, name, count, countShare, amount, share, squares, largest: { label, amount, squares } }] }`
— `sum` = the quantity over every thing, `squares` = `sum / perValue`; per block: `count` = its things,
`countShare` = its % of the things, `amount` = its quantity, `share` = its % of `sum`, `squares` = its
squares, `largest` = the thing with the most of that quantity in the block. `measures` (in `check()`
etc.) is the list of them, in the order of `beat.measures`; `blocks` (in `check()`) is the same reading
for the default count.

The render refuses when no quantity moves any block's share by more than 5 points against the count:
then counting a quantity shows the same picture, and the control would be a re-skin.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const units = data.rows
  .filter((r) => r[col("share")] !== null)
  .map((r) => ({ key: r[col("code")], label: r[col("place")], value: Number(r[col("share")]), size: Number(r[col("amount")]) }));
```

Filter to ONE year (or survey) first, so each thing is one square.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`counts.top === 16`), never a count you typed elsewhere.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`t`, `s`, `m`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong block in the
  accent, a wrong figure), fix `beat.mjs` with a small `edit_file`, render and look again.
