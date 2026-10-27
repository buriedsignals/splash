# Bullet (video), composed — what you write

The marks, the type, the colours, the layout and the timing (21 s at 30 fps) are already done, in the story's
PALETTE.md and DIRECTION.md. The video opens on a title card (the eyebrow and the takeaway); then the chart arrives
on its one scale. YOU decide what happens next: an ordered list `gestures` of exactly THREE gestures, in story order —
the first plays as the reveal, the second as the subject, the third as the conclusion. The conclusion shows the whole
chart (whatever was filtered returns, what you marked stays marked) and brings the credit; then the last picture holds.
Every gesture's `note` is written on a line above the chart when its gesture lands.

Per row a full track to the ceiling, the comparative value (`series[0]`, e.g. the earlier year) as a thick pale bar, the measure (`series[1]`) as a thin saturated bar over it; the measure's figure is printed. `ceiling` sets the track's end (default 100 when `unit` has "%"). `series: ["2015", "2024"]`, `rows: [{ name: "Pologne", values: [13.8, 31.1] }]`.

You write ONE file, `beat.mjs`. It reads `data.json` beside it. `render-beat.mjs` checks the gestures, lays out the
frames, renders the look stills, prints `look at: <png>`, then the mp4. Read `beat.example.mjs` first, then write this
story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The journalist's takeaway from STORYBOARD.md, copied word for word as a literal string. |
| `series` | The names of the values each row carries, in order (one name for a diverging bar). |
| `rows` | One `{ name, values: [first, second] }` per row, read from `data.json`. A missing value is `null`: it is drawn as "n/a", never refused. |
| `gestures` | Exactly three gestures, in story order (below). |
| `unit` | The unit, written once above the chart ("t de CO₂ par personne", "%"); `""` for none. |
| `source` | The credit line, in forms, longest first. |
| `scope(shown, all)` | Optional: the sentence printed when the frame holds only some rows. |
| `ceiling` | Bullet only, optional: the track's end. |
| `lang`, `decimals` | Optional: the language tag (decimal separator) and the decimals on every figure (0 to 3). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

{{GESTURES}}

A gesture names a MARK (`"Chine · 2023"`: the row, " · ", the series), a whole ROW (`"Chine"`: both its marks) or a
whole SERIES (`"2023"`, `"Femmes"`: that value in every row). A `compare` names two marks, the subject first
(`marks: ["Chine · 2023", "Chine · 2000"]`); written on a row or a series it is refused with the two marks that work.
`bracket` is refused for this type: its values do not add up (rates, shares or changes) — compare two marks instead. A `filter` or `zoom` cannot be the third gesture: make it `pull-back` or any other.

```js
gestures: [
  { do: "highlight", mark: "Chine" },
  { do: "compare", marks: ["Chine · 2023", "Chine · 2000"], note: "×3,0 depuis 2000" },
  { do: "name", mark: "États-Unis" },
]
```

## Rules

- Exactly three gestures. Every gesture serves the confirmed takeaway: it acts on a row or series the takeaway
  names, or states one of its figures.
- Every number in a `note` is computed from `data.json` (a value, a change, a ratio, a sum, a count of rows) and
  checked; a number the marks do not give is refused with the figure that works. Never write a row's name that holds
  digits ("60-64") inside a note: the note's numbers are read as figures — name the row in `mark` instead.
- Two notes on one row, a gesture that changes nothing, a reorder into the order already drawn are refused.
- Write every word in the storyboard's `language`. Never type the rows or their numbers: read `data.json`.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names. A refusal on
  `gestures[i]` names the key to change and a value that works.
