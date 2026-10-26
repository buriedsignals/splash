# Stacked bar (video) — what you write

The video is already designed: it comes from the worked example `proof/video-stacked-bar-lowcarbon-growth`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18.6 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then every
row's LEVEL (the earlier state) grows from zero, rows in the order of their level, each number past
its end; row after row the part ADDED by the later state stacks on the level, its gain counting
(«+119»); copies of the ADDER's level lift off its bar and lay end to end along the INCUMBENT's
level, «×5» counting — the incumbent's head start measured in the adder's own unit; every added
part slides off its level to zero and the levels step back; the rows re-sort by gain; the added
parts slide back onto their levels, the adder and the incumbent are ringed, the credit comes in.
There is no standfirst and no sentence on screen. You do not change any of that.

The video tells ONE argument: "the adder, which started several times lower, added more than the
incumbent". The render refuses data where the adder did not add more, or where the incumbent's
level is not close to a whole number (2 to 12) of the adder's: «×N» must be a picture, not a
rounding — the copies' end must stand within 5 % of the incumbent's level (the worked example's
stands within 1 %). Another type or the static format must tell those stories.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) sorts the rows,
counts the copies, lays the frames out, renders thirteen stills, prints `look at: <png>`, then
renders the mp4 (about two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | One `{ name, level, growth }` per bar, from `data.json`: `level` the earlier value (above 0), `growth` COMPUTED (later minus earlier, above 0). Any order: the video draws the `drawCount` largest growths. |
| `drawCount` | Optional: how many rows are drawn, largest growth first (3 to 12; default all, up to 12). |
| `adder` | The `name` of the row whose growth the takeaway is about. It must have added more than `incumbent`. |
| `incumbent` | The `name` of the row it is compared with — the one that started several times higher. |
| `unit` | The scale's line ("low-carbon electricity, in TWh"). |
| `segments` | `{ level, growth }`: the two key words ("2000", "added by 2024"). |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. |
| `lang` | Optional: the story's language tag ("fr", "en"). |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

Levels and gains print as whole numbers («412», «+119»): values under one unit must be rescaled.

The render refuses, saying what to change, when:
- a level is 0 or less, or a growth is 0 or less (a shrinking row is a waterfall or a diverging bar);
- `adder` or `incumbent` is no row's name, or is not among the `drawCount` largest growths (raise `drawCount`);
- the adder did not add more than the incumbent;
- the incumbent's level is under 2 or over 12 of the adder's levels, or the copies' end misses it by more than 5 %;
- a name or count does not fit the frame (shorten the names, the unit, the segments, or lower `drawCount`).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("place"), col("year"), col("amount")];
const valueOf = (name, year) => Number(data.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)[VALUE]);
const rows = [...new Set(data.rows.map((r) => r[NAME]))].map((name) => {
  const level = valueOf(name, 2000);
  return { name, level, growth: valueOf(name, 2024) - level };
});
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the rows sorted by gain, the adder and the incumbent ringed). If the render refuses,
  read its message and fix `beat.mjs`. If the picture is wrong (a name cut, a wrong gain), fix
  `beat.mjs` with a small `edit_file`, render and look again.
