# Dumbbell (video) — what you write

The video is already designed: it comes from the worked example `proof/video-dumbbell-life-expectancy-gains`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (19 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then the
rows ranked by their FIRST reading, every first dot on one value scale (not from zero), the two
readings named once by their dots; row by row each dot travels to the second reading, the gain
drawn behind it, while a counter counts the rises; the rows glide into the order of their GAINS;
one after another a copy of each gain slides onto one start line (the subject's first reading),
keeping its length, its gain written at the right as it lands; the subject's row — the largest
gain — is ringed; the copies slide back, the whole dumbbell chart ranked by gain, the largest and
the smallest gain in the accent, the credit on one line. There is no standfirst and no sentence
on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes every
gain, both orders and the largest and smallest gain, lays the frames out, renders eleven stills,
prints `look at: <png>`, then renders the mp4 (one to two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | 3 to 14 rows, each `{ key, label, from, to }`: `label` is printed, `from` and `to` are the two readings. One row per key. Every row must rise (`to` above `from`). |
| `subject` | The `key` of the row with the LARGEST gain. It is ringed. |
| `fromName`, `toName` | The two readings' names, by their dots ("2000", "2023"). |
| `unit` | The unit printed on the axis's last tick ("ans"). |
| `gainLabel(row)` | A row's gain as written at the right of its row, with its sign ("+5,0"); `row.gain` is `to − from`. |
| `count(n)` | The counter while the dots travel: `n` rows have landed, every one a rise ("10 en hausse"). Called for every `n` from 0. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the axis's decimal separator. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a row did not rise (the counter counts every landing dot as a rise; another type is needed);
- `subject` is not the row with the largest gain, or two rows tie for it;
- fewer than 3 or more than 14 rows are given;
- a label, the counter, the title or the credit does not fit the frame (shorten it, or draw fewer rows).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const valueAt = (key, year) => Number(data.rows.find((r) => r[at("region")] === key && Number(r[at("year")]) === year)?.[at("amount")]);
const keys = [...new Set(data.rows.map((r) => r[at("region")]))];
const rows = keys.map((key) => ({ key, label: key, from: valueAt(key, 2000), to: valueAt(key, 2020) }));
const ranked = rows.map((r) => ({ ...r, gain: r.to - r.from })).sort((a, b) => b.gain - a.gain);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title names the largest and the smallest gain, `check()` ranks the rows by `to − from` and throws unless the first and the last are the ones named, at the precision the title prints.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- A word function (a field that is a function) must return a string for every value the render passes it; the render
  calls each one before drawing and names the one that throws.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the dumbbells ranked by gain, the subject ringed). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
