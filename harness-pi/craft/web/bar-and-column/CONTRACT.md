# Bar and column (web) — what you write

The page is already designed: it comes from the worked example `proof/web-bar-top-emitters-2024`
and the story's PALETTE.md and DIRECTION.md. Columns, colours, type, layout and the INTERACTION are
done — every column answers hover, tap and Tab with its share of the whole and how many members
below it in the full ranking must be added to match it, and a "stack against" control lets the
reader pick a column and watch the columns below it stack beside it until they reach it. With
JavaScript off the page is the complete static ranking. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
reading, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | EVERY member of the ranking as `{ name, value }`, from `data.json` — not only the columns drawn: "how many below it" is counted over the whole list. One row per name. |
| `drawCount` | How many columns are drawn, from the largest (default 10, between 3 and 16). |
| `subject` | The `name` of the column the takeaway is about. It is drawn in the accent. |
| `whole` | The total the rows are parts of (a "World" row, or the sum of every row), COMPUTED. Shares are of this. |
| `unit` | The unit printed beside values in the tooltip ("Gt CO₂", "beds", "%"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `detail(c)` | The tooltip sentence for one column. `c` is `{ name, value, rank, share, followers, followersSum, under, underSum }`: `share` = percent of `whole`; `followers` = the fewest members below it whose sum reaches it, `followersSum` their sum — or `followers` = `null` when even every member below it together stays under it, and then `followersSum` is that total; `under` = the most members below it whose sum stays under it, `underSum` their sum. The page already prints the name and value before it — say what they do not. |
| `stackLabel` | The control's legend ("Stack against"). |
| `noneLabel` | The untouched option's words ("The ranking alone"). |
| `announce(o)` | What a screen reader hears for one option. Must contain `o.name`. `o` is `{ name, value, followers, followersSum }`; `followers` is `null` when every member below together stays under `value` (the tower then stacks all of them and falls short). |
| `note(o)` | The sentence shown under the control when that option is chosen. Must state `format(o.followersSum)`. |
| `total(o)` | What is printed on top of the stacked tower ("= 12.44"). Must state `format(o.followersSum)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: unit, scope, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: hover, tap or tab a column; choose a country in the control. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the columns (a string, or a function of the drawn columns). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

The render offers a column in the control only when its whole run of followers is drawn; it refuses
when fewer than two columns qualify (raise `drawCount`).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("region"), col("amount")];
const rows = data.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }));
const whole = rows.reduce((s, r) => s + r.value, 0);
```

Leave out aggregate rows (a "Total" or "World" row is `whole`, not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`c`, `o`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong column in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
