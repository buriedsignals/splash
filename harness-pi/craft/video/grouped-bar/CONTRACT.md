# Grouped bar (video) — what you write

The video is already designed: it comes from the worked example `proof/video-grouped-bar-wind-vs-solar`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18.2 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then each
group's WHOLE rises as one column, part on part, to 100 %, the two series on top; every other part
fades; the column parts into the two series side by side, which slide down to the baseline keeping
their heights; the scale closes onto them and their shares land over the bars; group after group
the first series' level is carried across over the second as a dashed line while a count names
how many groups the first leads; every group but the ONE exception steps back; then the whole
chart returns, the exception ringed, the credit on one line. Groups are ordered by the gap between
the two series, the first series' lead first. There is no standfirst and no sentence on screen.
You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) builds each
group's whole, orders the groups, counts the lead, lays the frames out (in one row or in tiers),
renders twelve stills, prints `look at: <png>`, then renders the mp4 (one to two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `groups` | 3 to 8 groups, each `{ name, first, second, others? }`: `first` and `second` are the two series as SHARES of the group's whole, in percent; `others` (optional) is an array of the whole's other parts, also in percent, stacked from the bottom. Without `others` the rest of the whole is one part. A group adds up to 100. |
| `firstName`, `secondName` | The two series' names, beside their swatches ("Éolien", "Solaire"). The first is drawn in the accent. |
| `subject` | The `name` of the ONE group where the second series leads. |
| `unit` | Said once, after the two series' names: what the shares are of ("· en % de l’électricité"). |
| `count(k, n)` | The lead count: the first series leads in `k` of the `n` groups ("éolien devant : 5 sur 6"). Called for every `k` from 0 to `n`. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on every share, 0 or 1. Default 1. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- the second series leads in more than one group or in none, or two series are equal in a group
  (the video counts the lead and picks out ONE exception; another type is needed);
- `subject` is not the one group where the second series leads;
- a group does not add up to 100 (first and second must be shares of the group's whole);
- a name, the count, the unit, the title or the credit does not fit the frame (shorten it, or draw fewer groups).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const PARTS = ["part_a", "part_b", "part_c"];
const groups = data.rows.filter((r) => r[at("year")] === 2020).map((r) => {
  const total = [...PARTS, "series_one", "series_two"].reduce((s, c) => s + Number(r[at(c)]), 0);
  const share = (c) => (Number(r[at(c)]) / total) * 100;
  return { name: r[at("region")], first: share("series_one"), second: share("series_two"), others: PARTS.map(share) };
});
const reversals = groups.filter((g) => g.second > g.first);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says the first series leads in N groups with one exception, `check()` counts the groups where `first` is above `second` and throws unless it is N and the one other group is the exception named.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- A word function (a field that is a function) must return a string for every value the render passes it; the render
  calls each one before drawing and names the one that throws.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole grouped chart, the exception ringed). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
