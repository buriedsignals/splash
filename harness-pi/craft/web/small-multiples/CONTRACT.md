# Small multiples (web) — what you write

The page is already designed: it comes from the worked example `proof/web-small-multiples-solar-eu-six`
and the story's PALETTE.md and DIRECTION.md. One panel per member, ONE shared scale, the panels
ordered by their last value, the names and end values, the colours, the type and the INTERACTION are
done — every panel answers hover, tap and Tab with its own reading, and a "carry" control lets the
reader stamp one member's own curve, as a silhouette, into every panel at once: the crossings two
curves in two boxes can never show (who was above whom, for how long, the year the order changed)
become visible, and each panel prints one short verdict against the carried member. With JavaScript
off the page is the complete static grid and the control still works. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
panels and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
crossing, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `panels` | One `{ name, series: [{ year, value }] }` per member, from `data.json`. Every panel holds the SAME years. Values are zero or more. Each name once, 2 to 12 panels. |
| `ceiling` | The top of the ONE scale every panel shares, COMPUTED: just above the largest value anywhere (e.g. `Math.ceil(max)`). Never a panel's own maximum. |
| `thread` | The panel names drawn in the accent (the one or two the takeaway names). `[]` for none. |
| `format(v)` | How a panel's last value is printed beside its name ("20,7 %"). |
| `detail(p)` | The tooltip sentence for one panel. `p` is `{ name, from, to, firstYear, lastYear, factor, rank, count, series }`: `from`/`to` = first and last value; `factor` = `to / from` (null when `from` is 0); `rank` = its place by last value among `count`. Start with the name. |
| `carryLabel` | The control's legend ("Carry a country into every panel"). |
| `noneLabel` | The untouched option's words ("the grid alone"). |
| `noneAnnounce` | What a screen reader hears for the untouched option. Must contain `noneLabel`. |
| `optionLabel(name)` | Optional: how a member is named on its option pill (the worked example adds the French article). Default: the name. |
| `announce(g)` | What a screen reader hears for one carried member. Must contain its pill label. |
| `note(g)` | The sentence shown under the control when that member is carried. Must state `g.crossers.length`. |
| `verdict(v)` | The short line printed under each panel while a member is carried (under ~30 characters). |
| `sharedNote` | One line said once for the whole grid: the shared scale and years ("Shared: 0 to 21 %, 2010-2024."). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: unit, scope, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: carry a member, hover or tab a panel. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the grid. |
| `columns` | Optional: panels per row (default 2 for up to four panels, else 3). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

What the word functions receive:

- `g` (one carried member): `{ name, value, rank, count, others, firstYear, lastYear, crossers, always,
  never, longest }` — `value` = its last value; `others` = `count − 1`; `crossers` = the names of the
  members whose curve crosses it at least once; `always` = the names always above it; `never` = the
  names never above it; `longest` = `{ name, length, from, to }`, the crosser that stayed above it
  longest without a break, for `length` years from `from` to `to`.
- `v` (one panel against the carried member): `{ host, guest, self, turns, aboveFirst, aboveLast,
  years, firstYear, lastYear }` — `self` is true on the carried member's own panel; `turns` = the
  years the host changes side (the first year it is on the new side); `aboveFirst`/`aboveLast` =
  whether the host is above the guest in the first / last year; `years` = how many years are drawn.

A member no other curve ever crosses is not offered in the control (the end values already rank it);
the render refuses when no member is crossed at all — that data needs no carry.

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads one column for one member by name — use it
instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const at = table.columns.findIndex((c) => c.name === "region");
const names = [...new Set(table.rows.map((r) => r[at]))];
const panels = names.map((name) => ({ name, series: series(table, { x: "year", y: "value", where: { region: name } }) }));
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a
cell that is not a number. Hyphens and empty cells are skipped — then the panel misses a year and the
render refuses: keep only the years every member has.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`p`, `g`, `v`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Keep `verdict()` short: it sits under a panel, and the browser check refuses a word printed over another.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong panel in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
