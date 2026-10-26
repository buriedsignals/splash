# Pie and donut (web) — what you write

The page is already designed: it comes from the worked example `proof/web-donut-world-co2-share`
and the story's PALETTE.md and DIRECTION.md. It draws ONE WHOLE AT TWO STATES as two concentric
rings — the first state inside, the second outside — sharing a centre and an angular scale, each
ring closed by a remainder wedge ("everyone else"), the two wholes written in the hole. The named
parts are the largest at the second state. The claim's two parts (`subject`, `counterpart`) get
their own tones; the other named parts share one, and the remainder gets its own when the ground
leaves room for four separable tones (otherwise it shares the others' and the legend row says so).
Every wedge answers hover, tap and Tab with its share, its absolute value and the other ring's. A
"follow a part" control rings the chosen part on BOTH rings and lays, from its own wedge start, a
band sweeping the share it held on the OTHER ring, with a sentence under the control. With
JavaScript off the page is the complete static plate and the control still works (CSS only). You do
not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
parts and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the
wedges, the remainder, the ranks, the bands and the tones, draws the page, checks it in a real
browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `parts` | EVERY member of the whole as `{ key, name, before, after }`: ABSOLUTE values (tonnes, euros, people) at the two states, ≥ 0, from `data.json` — not only the parts named: the remainder is computed from the rest. One row per key. |
| `drawCount` | How many parts are named, the largest at the second state (default 6, between 2 and 6). |
| `wholeBefore` / `wholeAfter` | The whole at each state, COMPUTED (the sum of every member, or the table's total row). The parts cannot add up to more. |
| `subject` | The `key` of the part the takeaway is about (drawn in the accent). Must be among the named parts. |
| `counterpart` | The `key` of the other part the takeaway compares it with (its own tone). Must be among the named parts. |
| `from` / `to` | The two states ("2000", "2023"), printed on each ring. |
| `restName` | The remainder's name in the legend and the tooltips ("everyone else"). |
| `restOption` | Optional: the remainder's name on the control (default `restName`). |
| `unit` | Optional: what a share is of ("% of world CO₂"). |
| `formatShare(v)` | How a share in per cent is printed ("32,9 %"), in the story's language. |
| `centreNote` | 1 to 3 short lines (≤ 24 characters each) printed in the hole: the two wholes and their change, computed ("2000: 24.7 Gt", "2023: 37.0 Gt", "+50 %"). |
| `detail(w)` | The tooltip of one wedge. `w` is `{ name, isRest, label, share, value, whole, rank, otherLabel, otherShare, otherValue, otherWhole }`: `label` = its ring's state, `share` = % of that ring's whole, `value` = its absolute value, `rank` = its place by size among the ring's wedges, `other…` = the same part on the other ring. Start with the name and the ring's state. |
| `levelLabel` | The control's legend ("Follow a country"). |
| `noneLabel` | The untouched option's words ("Both rings"). |
| `announce(o)` | What a screen reader hears for one option. Must contain `o.name`. |
| `note(o)` | The sentence shown under the control when that option is chosen. Must state both shares exactly as `formatShare` prints them. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the two rings are, that a turn is 100 % of each ring's own whole, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: choose a part to follow; hover, tap or tab a wedge. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the same object `check()` receives). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ parts, rest, wholeGrowth })` | Throws if the data no longer supports the title. `parts` = the named parts' readings in order (each with its `key`), `rest` = the remainder's, `wholeGrowth` = the whole's change in %. |

A part's reading `o` (given to `announce`, `note`, and in `check()`) is
`{ name, isRest, from, to, shareBefore, shareAfter, valueBefore, valueAfter, wholeBefore, wholeAfter, factor, crossed, rankBefore, rankAfter, of, restCount, biggestRest }`:
shares in %; `factor` = `shareAfter / shareBefore`; `crossed` = true when its share fell while its
value rose (the whole grew — say so, a share chart can be read backwards); `rankBefore` / `rankAfter`
= its place among the `of` wedges of each ring; `restCount` = how many members the remainder holds;
`biggestRest` = `{ name, shareAfter }`, the largest member inside the remainder.

The sentence under the control reserves the height of the LONGEST note on every screen: keep each
`note()` to about two lines on a laptop (under ~300 characters), or the page overflows a phone.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const parts = data.rows.map((r) => ({ key: r[col("code")], name: r[col("place")], before: Number(r[col("value_start")]), after: Number(r[col("value_end")]) }));
const wholeBefore = parts.reduce((s, p) => s + p.before, 0);
```

Leave aggregate rows (a "World" or regional total) out of `parts` before adding them up, or the
whole counts them twice.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v * 10) / 10 === 24.4`), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`w`, `o`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong part in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
