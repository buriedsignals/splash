# Small multiples (video) — what you write

The video is already designed: it comes from the worked example `proof/video-small-multiples-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18.4 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then every
panel's FIRST-state bar grows side by side in one row on one baseline, the shared scale and the
two-swatch key above; the row is cut, each bar travelling to its own panel in ALPHABETICAL order
(which hides the pattern), its name arriving; panel after panel a copy of the first bar slides out
and rises to the second state, its gain counting («+74»); every part added since the first state
drops to the baseline; the panels re-sort by their first value; the added parts climb back, the
largest and the smallest gain are ringed, and the credit comes in. There is no standfirst and no
sentence on screen. You do not change any of that.

The video tells ONE argument: "every panel rose, and the lower it started, the more it gained". The
render computes the correlation between the first value and the gain and refuses one at or above
−0.5; it refuses a panel that did not rise. Another type or the static format must tell those.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes the
gains, the correlation, both orders and the two ringed panels, lays the frames out (drawing fewer
panels on a square or portrait frame and saying so with `foldNote`), renders thirteen stills, prints
`look at: <png>`, then renders the mp4 (about two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `panels` | One `{ name, from, to }` per entity, from `data.json`: `from` the value at the first state, `to` at the second. Values 0 or more, every `to` above its `from`. Each name once. Any order (the video sorts). |
| `states` | The two states' labels, `{ from: "2000", to: "2024" }`. They print in the key. |
| `ceiling` | The top of the ONE scale every panel shares, COMPUTED: a round number at or just above the largest value anywhere (`Math.ceil(max / 25) * 25`). Never a panel's own maximum. |
| `unit` | The scale's line, stating the shared scale, in one to three forms, longest first ("share low-carbon, 0–100 %", "0–100 %"). Build it from `ceiling`. |
| `foldNote(drawn, all)` | Optional: what the credit adds when the frame draws fewer panels than there are ("12 of 16 countries"), in one to three forms, longest first. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. |
| `lang` | Optional: the story's language tag ("fr", "en"); it sets the alphabetical order. |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

Each panel's gain is printed as a whole number with its sign («+74»): values whose gains are under
one unit (a share 0.2 → 0.9) must be rescaled (as a percentage), or the render refuses.

The render refuses, saying what to change, when:
- a panel did not rise, a value is below 0, or a name is used twice;
- `ceiling` is under the largest value or more than twice it;
- the correlation between the first value and the gain is −0.5 or more (the argument does not hold);
- the gains print alike (rescale);
- the panels do not fit the frame (shorten the names, the unit forms or the source forms).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("place"), col("year"), col("share")];
const valueOf = (name, year) => Number(data.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)[VALUE]);
const panels = [...new Set(data.rows.map((r) => r[NAME]))].map((name) => ({ name, from: valueOf(name, 2000), to: valueOf(name, 2024) }));
const ceiling = Math.ceil(Math.max(...panels.flatMap((p) => [p.from, p.to])) / 25) * 25;
```

For "the lowest starters gained the most", `check()` computes the Pearson correlation between
`from` and `to − from` over every panel and throws unless it is under −0.5.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the grid sorted by the first value, two panels ringed). If the render refuses, read
  its message and fix `beat.mjs`. If the picture is wrong (a name cut, a wrong gain), fix `beat.mjs`
  with a small `edit_file`, render and look again.
