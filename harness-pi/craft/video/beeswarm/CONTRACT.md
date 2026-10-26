# Beeswarm (video) — what you write

The video is already designed: it comes from the worked example `proof/video-beeswarm-co2-per-person`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (20 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the value
axis, the SIZE-WEIGHTED MEAN as a rule with its label, and ONE disc — every mark's size together —
sitting on it; the disc bursts into its marks, largest first, each flying to its own value and
keeping its area, the count climbing at the top right, the callouts named inside their circles; the
marks above the threshold are ringed and bracketed; the whole disc comes back as an outline in the
empty top right and a copy of each tail member flies into it and merges — the tail's share of the
whole printed under it; the copies fly back, the share travels under the bracket, and the credit.
There is no standfirst and no sentence on screen. You do not change any of that.

The video argues ONE thing: the few marks beyond a threshold are a sliver of the whole. The
render computes the mean, the tail and its share (one decimal, with `%`); you give the data and the
words.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `marks` | One `{ name, value, size }` per unit, from `data.json`: `value` places it on the axis (zero or more), `size` is its circle's area (more than zero). 10 to 400 marks; one per unit. |
| `threshold` | The value beyond which the tail is ringed (the takeaway's figure, e.g. 20). It must be above the weighted mean; 1 to 15 marks above it. |
| `wholeName` | The name inside the first disc ("World", "Monde", "All lines"). |
| `markerLabel` | A function `(v) => words` for the mean's rule, `v` being the mean already printed (`(v) => \`average ${v} t\``). |
| `unit` | A function `(t) => words` for the first tick, `t` being that tick printed (`(t) => \`${t} t of CO₂ per person\``), or up to three, longest first. |
| `counted` | A function `(n) => words` for the count while the marks land (`(n) => \`${n} countries\``). |
| `tailLabel` | A function `(n) => words` for the tail's name under its bracket (`(n) => \`${n} countries\``). |
| `callouts` | Up to three marks named inside their circles: `[{ name, label }]` — `name` is a mark's `name`, `label` how it is printed. Name the biggest circles. `[]` for none. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `ticks` | Optional: the axis ticks from 0, e.g. `[0, 10, 20, 30, 40]`. Left out, round steps up to the largest value. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- two marks share a name, a size is not above zero, or a value is below zero;
- no mark, or more than 15 marks, are above `threshold`, or `threshold` is not above the weighted mean;
- a callout names no mark;
- a word function does not return words;
- a name, a label or the credit does not fit the frame (shorten it, add a shorter `unit` form).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE, SIZE] = [col("unit"), col("rate"), col("population")];
const marks = data.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));
```

Leave out aggregate rows (a "Total" or "World" row is the whole, not a mark).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v * 10) / 10 === 0.6`), never with strict equality on the raw division.
- When the title says "the N above X hold Y % of the whole", `check()` counts the marks above X and their share of the total size, and throws unless they are N and Y at the title's precision.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole swarm, the tail ringed and bracketed with its share). If the render refuses,
  read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
