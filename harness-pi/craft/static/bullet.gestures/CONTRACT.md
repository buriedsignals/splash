# Bullet, composed — what you write

The marks, the type, the colours and the layout are already done: a neutral track to the ceiling (`ceiling`, 100 for a %), the first value (the comparative state, e.g. the earlier year) thick and pale, the second (the measure) thin and full over it; "a → b" printed at the track's end. Everything sits on ONE value scale
from zero, in the story's PALETTE.md and DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the
order the story tells it. You write ONE file, `beat.mjs`, in the beat folder; it reads `data.json` beside it.
`render-beat.mjs` (already in the folder) draws it. Read `beat.example.mjs` first, then write this story's from
scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `series` | The names of the values each row carries, in order: `series: ["2015", "2024"]`. |
| `rows` | One per row, from `data.json`: `{ name: "Pologne", values: [13.8, 31.1] }`. A value the data lacks is `null` (drawn "n/a", never refused). |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `unit` | Optional. The unit words ("%", "t de CO₂ par personne"). |
| `title` | The headline in forms, longest first: the FIRST form is the takeaway from STORYBOARD.md, copied word for word. |
| `limits` | The standfirst in forms, longest first: unit, scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(drawn)` | A function returning the alt text for the rows actually drawn (`drawn` = those rows). |
| `scope(shown, all)` | Optional. The sentence printed when the frame holds only some rows (the gestures' rows are always kept). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

On this still plate every gesture is drawn at once; `reveal` and `pull-back` are drawn as they end (the whole chart).
bracket is refused (shares on a bounded track do not add up); a reference past the ceiling is refused.

A gesture names what it acts on by `mark` / `marks`:
- a MARK is one value: `"<row> · <series>"`, e.g. `"Chine · 2023"` (diverging-bar: the row's name alone);
- a ROW name means both of its marks (`"Chine"`); a SERIES name means that value in every row (`"2023"`).

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` / `marks` | marks, rows or a series. `compare`: exactly two MARKS, the subject first (`["Chine · 2023", "Chine · 2000"]`) |
| `of` | what a bracket or compare measures against: `"whole"` or a list of marks |
| `value` | a reference rule's level, or `"descending"` / `"ascending"` for reorder (by the last series) |
| `note` | the words drawn with the gesture, in the story's language |

## Rules

- Every gesture serves the confirmed takeaway: it acts on a row or series the takeaway names, or states one of its figures.
- Every number in a `note` is computed from the rows: a value, a row's change (second − first), a ratio, a gap. A
  number the rows do not give is refused; "twice", "triple", "half", "highest" are checked against the rows.
- One note per row on the still: a second note on the same row is refused. Two notes on two rows are fine.
- Do not write a number that is part of a row's name (an age band "60-64") in a note: it is read as a figure.
- Never type the rows or their numbers: `beat.mjs` reads `data.json`. Leave out aggregate rows ("World", "EU").
- `check()` tests only what the drawn data can decide, at the takeaway's precision.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. A refusal on `gestures[i]`
  names the key to change and a value that works.
