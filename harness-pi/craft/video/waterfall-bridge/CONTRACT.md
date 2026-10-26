# Waterfall / bridge (video) — what you write

The video is already designed: it comes from the worked example `proof/video-waterfall-germany-electricity-bridge`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18.5 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then the
ticks; the OPENING total grows from zero and a copy of it slides across to the CLOSING slot; seams
cut both into their three MEMBERS, the names beside the opening total; the copy's members go to
their closing lengths, its total counting to the tenth; the names ride to their slots and, in the
order the bridge walks them, each gained or lost part lights up and slides onto the running total —
the steps of the waterfall, each with its signed value; the seams close, the net change is
bracketed between the two totals with its unit, and the credit comes in. There is no standfirst and
no sentence on screen. You do not change any of that.

The bridge has five slots — the opening total, one step for each member, the closing total — so it
takes EXACTLY three members: group the data's columns into three. Every value is printed to the
tenth, and the printed steps must walk the printed opening to the printed closing.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes the
changes, the running total, the net change and every counter text, lays the frames out, renders
twelve stills, prints `look at: <png>`, then renders the mp4 (about a minute).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `members` | Exactly three `{ name, from, to }`, in the order the bridge walks them (never sorted by size): `from` the member's value in the opening state, `to` in the closing one, both 0 or more, each a SUM of the columns the member groups. The totals are the sums of the three, computed by the render. |
| `states` | The two totals' labels, `{ from: "2015", to: "2024" }`. They print under the opening and closing slots. |
| `unit` | The unit the net change states ("TWh", "M€"); `""` for none. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. |
| `lang` | Optional: the story's language tag ("fr", "en"). It sets the decimal separator (`decimal` overrides it). |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- there are not exactly three members, a name is used twice, or a value is below 0;
- a member did not change to the tenth (a step of zero is no step);
- the printed steps do not walk the opening to the closing at one decimal (round `from` and `to` to one decimal);
- the totals are so far apart in this unit that the counter would pass more than 20,000 texts (draw in a larger unit);
- a name does not fit beside its member in the opening total or under its slot (shorten it).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names, one row per year:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const rowOf = (year) => data.rows.find((r) => Number(r[col("year")]) === year);
const sum = (row, columns) => columns.reduce((t, c) => t + Number(row[col(c)]), 0);
const GROUPS = [
  { name: "Group A", columns: ["a1", "a2"] },
  { name: "Group B", columns: ["b1"] },
  { name: "Group C", columns: ["c1", "c2", "c3"] },
];
const members = GROUPS.map((g) => ({ name: g.name, from: sum(rowOf(2015), g.columns), to: sum(rowOf(2024), g.columns) }));
const net = members.reduce((t, m) => t + m.to - m.from, 0);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(-net) === 143`, or to one decimal), never with strict equality on the raw sum.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole bridge with the net change bracketed). If the render refuses, read its
  message and fix `beat.mjs`. If the picture is wrong (a name cut, a wrong step), fix `beat.mjs`
  with a small `edit_file`, render and look again.
