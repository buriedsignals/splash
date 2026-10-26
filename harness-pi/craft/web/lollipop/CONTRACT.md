# Lollipop (web) — what you write

The page is already designed: it comes from the worked example `proof/web-lollipop-co2-per-person`
and the story's PALETTE.md and DIRECTION.md. The pairs of stems from zero (the first state a tint,
the second the accent), the value over every head, the change under every name, the two-date key,
the selection rule, the colours, the type and the INTERACTION are done — an "against" control lets
the reader choose one entity and lay its two levels flat across every pair as two dashed references,
with a sentence giving its LEVEL rank at each state, how many times the highest level out-measured
it, and which others now sit between its two levels; every pair answers hover, tap and Tab with what
the stems cannot print. With JavaScript off the page is the complete static plate, and the control
still works. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
pairs and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
reading, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

One pair per entity, 2 to 8, in YOUR order (e.g. the selection rule's order): the first state's stem
in a tint, the second state's in the accent, each a length from zero, its value printed above its
head. The subject's later head is ringed and its name and change are set in the accent.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `pairs` | One `{ key, name, before, after }` per entity, 2 to 8, in the order drawn: `before` is the value at the first state, `after` at the second, `name` the label printed. Values are zero or more, and `before` is not 0. You may add other fields (population, total, a form of the name for sentences) — the word functions receive them back. |
| `subject` | The `key` of the pair the takeaway is about. |
| `from` / `to` | The two states, printed in the key and on the references (`2000`, `2023`). |
| `unit` | The measure and its unit ("tonnes of CO₂ per person"), printed after the source line. |
| `rule` | One sentence printed above the control saying how the pairs were chosen, its numbers computed. |
| `format(v)` | How a value above a head is printed, in the story's language. Enough decimals that close values differ. |
| `formatChange(v)` | Optional: how the change in per cent is printed, sign first (default `+198 %` / `−33 %`). |
| `detail(p)` | The tooltip sentence for one pair. `p` is your pair plus `change` (per cent from `before` to `after`). Start with the name: every pair must answer differently. |
| `levelLabel` | The control's legend ("Against"). |
| `noneLabel` | The untouched option's words ("No reference"). |
| `announce(p)` | What a screen reader hears for one pair's option. Must contain `p.name`. `p` is your pair plus `{ change, beforeRank, afterRank, count, topBefore, topAfter, isTopBoth, timesTopBefore, timesTopAfter, multiple, between }`: `beforeRank` / `afterRank` = its LEVEL rank among the pairs at each state (1 = highest), `count` = number of pairs; `topBefore` / `topAfter` = the pair with the highest level at each state, `isTopBoth` = it is that pair at both; `timesTopBefore` / `timesTopAfter` = the highest level ÷ its own, at each state; `multiple` = after ÷ before; `between` = the other pairs whose `after` lies between its two levels. |
| `note(p)` | The sentence shown when that pair is chosen (same `p`). Must contain `p.name` and state both level ranks. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: which tint is which state, that every stem starts at zero, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: choose an entity in the control; hover, tap or tab a pair. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `{ pairs, subject }` with the readings above). |
| `yTicks` | Optional: the axis ticks, from 0; the last must hold the tallest stem. Default: computed. |
| `evidenceLevels` | Optional, 4. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ pairs, subject })` | Throws if the data no longer supports the title. The render passes the pairs with their computed `change`. |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [KEY, NAME, START, END] = [col("code"), col("place"), col("value_start"), col("value_end")];
const pairs = data.rows.map((r) => ({ key: r[KEY], name: r[NAME], before: Number(r[START]), after: Number(r[END]) }));
```

If the two states are rows rather than columns (one row per place per year), read each place's value
at each year and build one pair per place. If the table holds more than eight entities, keep the
subject and the largest others by a rule you compute, and print that rule in `rule`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 3`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`p`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- The page must fit a phone screen without scrolling: if the browser check reports "no vertical
  scroll inside the visual" or "the source line is on screen", shorten `limits`, `reading` or `rule`.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong pair ringed, a
  sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
