# Grouped bar (web) — what you write

The page is already designed: it comes from the worked example `proof/web-grouped-bar-wind-vs-solar`
and the story's PALETTE.md and DIRECTION.md. The pairs of bars from zero, the value on every bar, the
group boundaries, the two-name key, the axis, the colours, the type and the INTERACTION are done — a
"measure against" control lets the reader choose one group and lay its two values flat across every
other group as two dashed rules, one per series, with a sentence giving its rank on each series and
the ratio between them; every group answers hover, tap and Tab with what the bars cannot print. With
JavaScript off the page is the complete static plate, and the control still works. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
reading, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

One group per category, each with exactly TWO bars from a zero baseline: the first series on the
left in a tint of the accent, the second on the right in the accent — put the series the takeaway is
carried by SECOND. Groups are ordered largest pair first (unless `declaredSequence`). The subject's
bars are ringed and its name set in bold.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `groups` | One `{ name, first, second }` per category (at most 12): `name` is printed under the group, `first` and `second` are the two series' values (zero or more). You may add other fields (amounts, totals) — `detail(g)` receives them back. |
| `firstName` / `secondName` | The two series' names, printed in the key and on the rules. The second series is drawn in the accent. |
| `subject` | The `name` of the group the takeaway is about. |
| `unit` | The values' unit ("%", "TWh"). `%` is also printed on the axis ticks; any other unit is said in the standfirst. |
| `format(v)` | How a bar's value is printed (decimals, decimal comma or point for the language). |
| `detail(g)` | The tooltip sentence for one group. `g` is your group plus `{ firstRank, secondRank, ratio, count }`: `firstRank` / `secondRank` = its rank among all groups on each series (1 = largest), `ratio` = `second / first` (null when `first` is 0), `count` = number of groups. Start with the group's name: every group must answer differently. |
| `levelLabel` | The control's legend ("Measure all six against"). |
| `noneLabel` | The untouched option's words ("Each country on its own"). |
| `announce(g)` | What a screen reader hears for one group's option. Must contain `g.name`. Same `g` as `detail`. |
| `note(g)` | The sentence shown under the control when that group is chosen: its two values, its rank on each series, the ratio. Must state both `format(g.first)` and `format(g.second)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the values are, the period, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: choose a group in the control; hover, tap or tab a group. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the groups and the exception (a string, or a function of the groups with their readings). |
| `declaredSequence` | Optional: leave it out when the categories have no order of their own (countries); give a name ("year", "age band") when they do, and the groups keep your order. |
| `yTicks` | Optional: the axis ticks, from 0; the last must hold the tallest bar. Default: round ticks computed. |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find columns by name,
filter the rows to ONE period, and build one group per category with the two columns the takeaway
compares. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const groups = data.rows
  .filter((r) => r[at("period")] === 2024)
  .map((r) => {
    const total = r[at("part_a")] + r[at("part_b")] + r[at("other")];
    return { name: r[at("region")], first: (r[at("part_a")] / total) * 100, second: (r[at("part_b")] / total) * 100, total };
  });
```

If the takeaway speaks of shares and the data holds amounts, compute the share (`part / total * 100`).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 7`, or to one decimal), never with strict equality on the raw division. A count the title states ("5 of these 6") is checked as a count.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`g`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong group ringed,
  the argued series not in the accent, a sentence cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
