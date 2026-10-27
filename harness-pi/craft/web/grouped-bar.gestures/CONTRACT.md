# Grouped bar, composed — what you write (web)

The marks, the colours and the layout are done: two bars per row, each from zero: `series[0]` in full, `series[1]` lighter. One value scale from zero for every state. YOU decide the
staging: an ordered list `gestures`. The page the reader lands on draws every resting gesture (highlight, name,
annotate, reference, reveal, pull-back); every other gesture (compare, filter, reorder) becomes one reader control.
A page needs at least one control. You write ONE file, `beat.mjs`; `render-beat.mjs` draws it. Read
`beat.example.mjs` first, then write this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `series` | The names of the values each row carries, in order, e.g. `["Éolien", "Solaire"]`. |
| `rows` | One per row, read from `data.json`, e.g. `{ name: "Suisse", values: [0.2, 7.2] }`. A value data.json does not give is `null` (drawn as "n/a"). |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `unit` | The unit, printed over the plot. |
| `restLabel` | The words of the option that shows the page as it lands, e.g. "Les deux années". |
| `title` | The headline: its first form is the journalist's takeaway from STORYBOARD.md, copied word for word. |
| `limits` | The standfirst: unit, scope, the limits the journalist named. |
| `source` | The credit line. |
| `alt` | The alt text (a string, or a function of the rows). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

```js
gestures: [
  { do: "highlight", mark: "Alpha" },
  { do: "annotate", mark: "Alpha", note: "a few words" },
  { do: "compare", marks: ["Alpha · B", "Alpha · A"], note: "the gap or the ratio" },
]
```

| key | meaning |
|---|---|
| `mark` / `marks` | A ROW by its name ("Alpha": every value of that row), a SERIES by its name (every row's value of it), or ONE mark as `"<row> · <series>"`. |
| `of` | What a compare measures against: `"whole"` or a list of marks. |
| `value` | A reference rule's level, or `"descending"` / `"ascending"` for reorder (by the second series). |
| `note` | The words drawn with the gesture, in the story's language. |

## Rules

- Every gesture serves the confirmed takeaway: it acts on a row or series the takeaway names, or states one of its figures.
- Every number in a `note` is computed from the rows: a value, a row's change (second − first) or ratio, a gap or a ratio between two compared marks. A number the rows do not give is refused; "twice", "highest" are checked.
- A `compare` names TWO marks, the subject first (`["Alpha · B", "Alpha · A"]`): a row or a series name lays several marks and is refused with the two that work.
- `bracket` is refused: these values (rates, shares, changes) do not add up to a sum.
- Two notes on one row, a gesture that changes nothing, a filter keeping every row, a reorder into the order drawn: refused.
- Never type the rows or their numbers: read `data.json`. Write every note in the storyboard's `language`.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG. A refusal on `gestures[i]` names the key to change and a value that works.
