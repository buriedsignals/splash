# Slope (video) — what you write

The video is already designed: it comes from the worked example `proof/video-slope-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (19.2 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then two
rails, the left values with their names; every line travels to the right rail one after another,
the largest rise first, while a count climbs («16 en hausse»); the HELD line takes the accent — the
line to pass; every line that started under it is tested in turn, the lowest finish first: each
lights up, and steps back if it ends under the held line; the one that ends above it — the SUBJECT
— takes the accent and its crossing is ringed, the second count reading 1; then the whole chart
comes back with the pair in the accent and the credit on one line. There is no standfirst, no value
axis and no sentence on screen: names and values only. You do not change any of that.

The video tells ONE argument: "every line rose, and exactly one passed the held line". A line that
fell, or two lines that passed, are refused: another type or the static format must tell that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) works out which
lines started under the held one, which passed it and where the pair crosses, lays the frames out,
renders ten stills, prints `look at: <png>`, then renders the mp4 (about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `lines` | One `{ key, label, from, to }` per line drawn: `from` the value at the left rail, `to` at the right rail, `label` the name printed. Every line must rise (`to` above `from`). All of them fit when the frame holds their labels (16 do at landscape). |
| `rails` | `{ left, right }`: what each rail is, e.g. `{ left: "2000", right: "2024" }`. |
| `held` | The `key` of the line the others are tested against (the one that is passed). |
| `subject` | The `key` of the line that passes it: under it at the left rail, above it at the right — and the only one. |
| `format(v)` | How a value is printed, in the story's language. Enough decimals that close values differ. |
| `riseLabel(n)` | The first count, as the lines land ("16 en hausse"). It is handed every count from 0 to the number of lines. |
| `passLabel(n)` | The second count, as the test runs ("1 dépasse la France"). It is handed 0, then 1. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a line did not rise, or a key is used twice;
- `held` or `subject` is no line's key, or `subject` did not pass `held`;
- more than one line passed `held` (the argument does not hold for this data);
- the labels do not fit on a rail (draw fewer lines, shorten `label` or `format()`);
- `riseLabel` or `passLabel` ignores the number it is handed.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("place"), col("year"), col("share")];
const valueOf = (name, year) => Number(data.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)[VALUE]);
const lines = [...new Set(data.rows.map((r) => r[NAME]))].map((name) => ({ key: name, label: name, from: valueOf(name, 2000), to: valueOf(name, 2024) }));
const held = lines.find((d) => d.key === "A");
const passers = lines.filter((d) => d !== held && d.from < held.from && d.to > held.to);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the eyebrow or the labels — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says "all rose" and "only one passed", `check()` tests both on every line (`to > from`, and the passers of `held`).

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole chart with the pair in the accent). If the render refuses, read its message
  and fix `beat.mjs`. If the picture is wrong (a label cut, the wrong pair, a wrong value), fix
  `beat.mjs` with a small `edit_file`, render and look again.
