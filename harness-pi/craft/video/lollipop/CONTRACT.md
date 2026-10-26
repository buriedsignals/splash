# Lollipop (video) — what you write

The video is already designed: it comes from the worked example `proof/video-lollipop-co2-per-person`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (17.7 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then every
pair's FIRST-state stem rises from one zero line, counting its value; the other pairs step back while
copies of the SUBJECT's stem fly over one after another and stack end to end beside the OTHER's stem,
cut at its head, the ratio over the stack (« ×7,5 »: the copies that fit); then every stem travels to
the SECOND state, a tint left behind at the first, the copies grow with the subject's stem and fewer
fit (« ×1,7 »); then the copies go, the whole chart comes back, the subject's later head ringed, and
the credit on one line. The unit is said once at the top left, the two dates once under the first
pair. There is no standfirst and no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes the
ratio and the copies, lays the frames out, renders nine stills, prints `look at: <png>`, then renders
the mp4 (about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `pairs` | One `{ key, name, before, after }` per entity, 2 to 8, in the order drawn: `before` is the value at the first state, `after` at the second, `name` the label printed. Values are zero or more. |
| `subject` | The `key` of the pair the takeaway is about. Copies of ITS stem measure the other; its later head is ringed. Both its values must be above 0. |
| `other` | The `key` of the pair the subject is measured against — the one the takeaway compares it with. It must be the TALLER of the two at the first state. Put `subject` and `other` next to each other at the start of `pairs` (a narrow frame wraps the pairs into rows, and the two must share a zero line). |
| `from` / `to` | The two states, printed under the first pair's stems (`2000`, `2023`). |
| `unit` | The measure and its unit, printed once above the stems ("tonnes of CO₂ per person"). |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on every value (0 to 3). Default: one while the largest value is under 100, none past it. The ratio always has one. |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- `other` is not taller than `subject` at the first state (the stack would be a fraction of one copy:
  the argument does not hold for this data);
- the ratio needs more than 15 copies, or a copy is too short to read as a block (compare the subject
  with a pair nearer its level);
- a pair or a stem is not a number, a value is negative, or two pairs share a key;
- a name, the unit, the title or the credit does not fit the frame (shorten it, or draw fewer pairs).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [KEY, NAME, START, END] = [col("id"), col("place"), col("value_start"), col("value_end")];
const pairs = data.rows.map((r) => ({ key: r[KEY], name: r[NAME], before: Number(r[START]), after: Number(r[END]) }));
const ratioStart = pairs.find((p) => p.key === "B").before / pairs.find((p) => p.key === "A").before;
```

If the two states are rows rather than columns (one row per place per year), read each place's value
at each year and build one pair per place. If the table holds more than eight entities, keep the
subject, the other and the largest others by a rule you compute.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 3`, or to one decimal), never with strict equality on the raw division.
- When the title states the ratio between two pairs ("from 7.5 to 1.7"), `check()` computes `other / subject` at each state and compares it at one decimal.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole chart). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, the wrong pair ringed, a wrong ratio), fix `beat.mjs` with a small
  `edit_file`, render and look again.
