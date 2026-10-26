# Bar and column (video) — what you write

The video is already designed: it comes from the worked example `proof/video-bar-top-emitters-2024`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (22 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then the
WHOLE the ranking is cut from grows as one bar, the drawn members marked inside it; they fall out
into their own rows, keeping their lengths, and the scale closes onto the leader; the members after
the leader line up end to end under it, their sum counting, and stop short of its end (a dashed
line); the last row drawn slides into the gap that is left, and fits; then every bar returns to its
row — the whole ranking — with the piled members bracketed with their sum, and the credit on one
line. There is no standfirst and no sentence on screen: names and counts only. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) runs the search
behind the headline (how many members after the leader stay under it, added up), lays the frames
out, renders twelve stills, prints `look at: <png>`, then renders the mp4 (about a minute).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | Every member of the ranking as `{ name, value }`, from `data.json`. One row per name; values above 0. |
| `drawCount` | How many rows are drawn, from the largest (default 10, between 4 and 12). |
| `subject` | The `name` of the LEADER — the largest row. The video argues it against the members below it. |
| `whole` | The total the ranking is cut from (a "World" / "Total" row, or the sum of every row), COMPUTED. The video opens on it. It must be at least the drawn rows' sum. |
| `wholeName` | The name printed beside that first bar ("World", "Monde", "All lines"). |
| `unit` | The unit every count carries, short ("Gt", "km", "riders"); `""` for none. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on every count (0 to 3). Default: one from 1 and two under 1 while the largest value is under 100, none past it. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- the members after the leader that stay under it leave no row outside the pile (raise `drawCount`);
- the last row drawn does not fit the gap between the pile and the leader's end (it names the
  `drawCount` whose last row fits, or says the argument does not hold for this data);
- a name, the title or the credit does not fit the frame (shorten it, or lower `drawCount`).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("region"), col("amount")];
const rows = data.rows
  .filter((r) => r[NAME] !== "Total")
  .map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }))
  .sort((a, b) => b.value - a.value);
const whole = rows.reduce((s, r) => s + r.value, 0);
```

Leave out aggregate rows (a "Total" or "World" row is `whole`, not a member). Large raw values may
be rescaled (tonnes → billions of tonnes) when the unit says so.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says "more than the next N together", `check()` runs that search on the rows (add the next members while the sum stays under the leader) and throws unless it stops at N.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole ranking). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, the wrong leader, a wrong count), fix `beat.mjs` with a small
  `edit_file`, render and look again.
