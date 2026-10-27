# Bump (ranking over time) (video), composed — what you write

The marks, the colours, the layout and the timing (21 s at 30 fps) are already done: one line per series on its RANK at each time (1 at the top), the top `slots` drawn; the kit computes every rank from your readings, in the story's
PALETTE.md and DIRECTION.md. The video opens on a title card (the eyebrow and the takeaway); then the axes arrive
and the series with them. YOU decide what happens next: an ordered list `gestures` of exactly THREE gestures, in
story order — the reveal, the subject, the conclusion. A `reveal` or a `trace` makes the series arrive empty and
draws them LINEARLY in time, the year written at the tip as it goes. The conclusion shows the whole chart: a zoom
or a filter returns, every series is drawn to its end, what you marked stays marked, the credit comes up.

You write ONE file, `beat.mjs`, beside `data.json`. `render-beat.mjs` checks the gestures, lays out the frames,
renders eight stills, prints `look at: <png>`, then the mp4. Read `beat.example.mjs` first.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The journalist's takeaway from STORYBOARD.md, copied word for word as a literal string. |
| `points` | Every reading as `{ series, t, value }`, read from `data.json`: one per series per time. `t` is a year (or an ISO date). A reading with no value (`null`) is a GAP: it is drawn as a gap, never invented. |
| `slots` | Optional, 10: how many ranks are drawn. |
| `gestures` | Exactly three gestures, in story order (below). |
| `unit` | The unit, written above the value axis ("Mt de CO₂ par an"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `source` | The credit line, exactly as the storyboard records it. |
| `check()` | Throws if the data no longer supports the title. |

## Marks

A reading is named `"<t> · <series>"`, e.g. "2024 · India". A gesture's `mark` may name one reading, a time (`"2016"`:
every series at it) or a series (`"Solaire"`: its whole line).

## The gestures you may use

| `do` | what the viewer sees |
|---|---|
{{GESTURES}}

- `trace`: `mark` a series (drawn to its end) or one reading (drawn up to that time).
- `compare`: `marks` two readings (the subject first): the second's level is laid back to the first (a band's
  thickness is copied beside it on a stack), the note states the gap; or two whole series: where they cross is
  SOLVED from the readings and ringed.
- `name` / `annotate`: ONE reading. `zoom`: the readings whose time span the window opens onto; its note prints
  the factor ("×4"), checked. `reference`: `value` on the value axis (a rank on a bump; none on a streamgraph).
- `bracket` (area and streamgraph only): `marks` a run of times (`["1987", …, "2024"]`), optionally `of: "whole"`;
  its sum or share is printed. A line's or a rank's readings do not add up: a bracket there is refused.
- A `zoom` or a `filter` cannot be the third gesture.

## Rules

- Exactly three gestures. Every gesture serves the takeaway (its series, its comparison, or one of its figures).
- Every number in a `note` is computed from the readings, checked against what the gesture draws; rank words
  ("third", "highest") are checked against the ranking at that time.
- Never type the readings: `beat.mjs` reads `data.json`, or the render refuses it. Leave aggregates out.
- Write every `note` in the storyboard's language.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG. A refusal on `gestures[i]`
  names the key to change and a value that works.
