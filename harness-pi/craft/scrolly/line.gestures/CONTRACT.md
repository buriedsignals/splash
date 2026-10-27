# Line (scrolly), composed — what you write

The page is already designed: one line per series over time, its value axis fitted to the readings (a line carries a rate, not a length from zero), in the story's PALETTE.md and DIRECTION.md, every series labelled at its
end. The graphic stays fixed while cards of prose travel up over it, and the reader's scroll moves the picture
continuously from one card's state to the next — time is always traversed linearly. YOU decide the staging: an
ordered list `gestures`, one card each, in story order. After your last gesture the page adds a closing card: the
whole time span returns (a zoom opens back, every series is drawn to its end, what was stepped back returns), what
your gestures marked stays marked, and the card reads your `limits`. With JavaScript off the page shows that closing
picture and every note.

You write ONE file, `beat.mjs`, beside `data.json`. `render-beat.mjs` checks the gestures and every card's words
against the readings, draws the page, verifies it in a browser and prints `look at: <png>`. Read `beat.example.mjs`
first, then write this story's from scratch.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `points` | EVERY reading as `{ series, t, value }`, read from `data.json`: one per series per time (`t` a year or an ISO date). A missing value is a gap and is drawn as one; never invent it. |
| `gestures` | The staging: one gesture per card, each with its `card` (below). |
| `unit` | The unit line above the plot. |
| `format(v)` | How a reading is printed (decimals, decimal comma or point for the language). |
| `title` | The journalist's takeaway from STORYBOARD.md, copied word for word as a literal string; may be an array (shorter forms after). |
| `limits` | The closing card: what the readings count and leave out, the limits the journalist named. |
| `source` | The credit line. |
| `alt` | The alt text (a string). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A gesture names readings by their mark: `"<t> · <series>"` (e.g. "2024 · Suisse"), a time (`"2016"`: every series at it) or
a series (`"Lisboa"`: its whole line).

- `trace` (mark: a reading or a series): the series draws itself, linear in time, up to that reading.
- `reveal`: every series draws itself from the first time to the last.
- `name` / `annotate` (mark: ONE reading): a ring (name) or a dot, the note in the header.
- `compare` with `marks: [reading, reading]`: the second reading's level rewound to the first (a stack: its thickness
  copied beside the first); with `marks: [series, series]`: every point where they cross, solved, ringed.
- `bracket` (area and streamgraph only; `marks`: a run of times, `of: "whole"` for a share): the run takes full ink,
  its sum or share in the note. A line's or a rank's readings do not add up.
- `reference` (`value`): a rule at that level (not on a streamgraph). `zoom` (marks): the time window narrows onto
  those readings; its note prints the factor ("×3"). `filter` (a series): the others step back. `highlight` (a
  series): it takes the accent.

```js
gestures: [
  { do: "trace", mark: "1973", card: "Up to 1973 the line climbs to 46.2 Mt." },
  { do: "compare", marks: ["2024", "1967"], note: "2024: 32.1 Mt, under 1967's 32.5", card: "In 2024, 32.1 Mt: under 1967's 32.5 Mt." },
]
```

## Rules

- Every gesture serves the takeaway: it acts on the takeaway's series, or states one of its figures.
- Every number in a `note` or a `card` is computed from `data.json`; a number the readings do not give is refused. A
  card whose picture shows a figure (a named reading, a compare's two readings, a bracket's sum or share, a rule, a
  zoom's factor) must state it.
- Words in the storyboard's `language`. Never type the readings: `beat.mjs` must read `data.json`.
- After writing, call `render_beat` with format `scrolly`, then `look`. A refusal on `gestures[i]` names the key to
  change and a value that works.
