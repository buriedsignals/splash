# Streamgraph, composed — what you write

The marks, the type, the colours and the layout are already done: the series stacked as a silhouette around a centre line, the largest layers inside; there is NO value axis — a band's thickness is its reading, so quantities are written, never measured off a scale, every series labelled at its end, in
the story's PALETTE.md and DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the order the story
tells it. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS
story's plate says. `render-beat.mjs` (already in the folder) draws it. `beat.example.mjs` is a worked example:
read it first, then write this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `points` | Every reading: `{ series, t, value }` — one per series per time, from `data.json`. `t` is a year (or an ISO date). A value that is missing (`null`) is a GAP: it is drawn as one, never refused. |
| `entity` | The series the takeaway is about, written exactly as `points` names it (e.g. `"India"` when the takeaway says "l’Inde"). Name your series in the takeaway's own words where you can; `entity` says which one it is when the data's names differ. |
| `unit` | What the values are, written once (e.g. "Mt of CO₂ per year"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `gestures` | The staging, in story order (below). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string; shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: unit, scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text: what the plate shows, in one or two sentences. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A mark is ONE reading, written `"<time> · <series>"` (`"2016 · Solar"`); a time alone (`"2016"`) names every
series' reading at that time; a series alone (`"Solar"`) names its whole line. On this type:

- `highlight` a series: it takes the accent; a second highlighted series is ringed, never a second hue.
- `name` / `annotate` ONE reading: ringed and labelled / a note written beside it.
- `compare`: two readings: a copy of the second band's thickness laid beside the first; two whole series (`marks: ["Solar", "Oil"]`): every point where they cross is SOLVED and ringed.
- `filter` a series: the others step back, nothing moves.
- `reference` a value: a rule across the plot, named in its note.
- `trace` a series (or a reading: up to its time), `reveal`, `pull-back`: on this still they are drawn as they end — the whole chart.
- `reference` is refused: a streamgraph has no value axis to rule.
- A note may state a band's rank at its time ("3rd source in 2016") and its share of the stack there; both are checked against the readings at that time.

On this still plate every gesture is drawn at once: one reading carries one note.

```js
gestures: [
  { do: "highlight", mark: "Lisboa" },
  { do: "name", mark: "2019 · Lisboa", note: "peak: 241 million" },
  { do: "compare", marks: ["2024 · Lisboa", "2015 · Lisboa"], note: "12 % above 2015" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one reading, time or series, written as above |
| `marks` | several: for `compare`, the subject first, then what it is compared with (a reading, or a whole series to find crossings); for `bracket`, a run of times |
| `of` | `"whole"` for a bracket: the share of the whole surface |
| `value` | a reference line's level |
| `note` | the words drawn with the gesture, in the story's language |

## Reading the data

Rows are arrays; find columns by name. A long table (one row per series per time):

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("country"), col("year"), col("amount")];
const points = data.rows.map((r) => ({ series: r[NAME], t: Number(r[YEAR]), value: r[VALUE] === null ? null : Number(r[VALUE]) }));
```

A wide table (one column per series): `["Solar", "Wind"].flatMap((k) => data.rows.map((r) => ({ series: k, t: Number(r[col("year")]), value: Number(r[col(k)]) })))`.
Leave out aggregate rows (a "World" or region row is not a series). Large raw values may be rescaled (tonnes →
millions of tonnes) when the unit says so. Never type the readings: `beat.mjs` must read `data.json`.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on the series the takeaway names (or its comparison),
  or it states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the readings (a value, a difference, a ratio, a rank at that time, a sum, a share), at the precision you
  choose. A number the readings do not give is refused. "twice", "highest", "third"… are checked against the readings.
- Write every `note` in the storyboard's `language`, the same language as the title.
- Two notes on one reading, a gesture that changes nothing, are refused.
- `check()` tests only what the data can decide, comparing a computed value with the takeaway's figure at the
  takeaway's precision, never with strict equality on a raw division.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. A refusal on `gestures[i]`
  names the key to change and a value that works. If the picture is wrong, fix `beat.mjs` with a small `edit_file`.
