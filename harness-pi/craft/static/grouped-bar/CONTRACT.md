# Grouped bar — what you write

The pairs of bars, the value on every bar, the group boundaries, the two-name key, the callout over
the subject's pair, the type, the colours and the layout are already done: they come from the worked
example `proof/static-wind-vs-solar` and the story's PALETTE.md and DIRECTION.md. You write ONE file,
`beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's plate
says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

One group per category, each with exactly TWO bars from a zero baseline: the first series in the
accent, the second in a muted ink. Every bar carries its value, so there is no axis. When the
categories carry no order of their own, the groups are ordered by the gap between the two series
(first minus second), so the exception lands at the end. The subject group's name is set in bold and
the `callout` is written over its pair.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `groups` | One `{ name, first, second }` per category: `name` is printed under the group, `first` and `second` are the two series' values (zero or more). |
| `firstName` / `secondName` | The two series' names, printed in the key above the bars. The first series is drawn in the accent. |
| `subject` | The `name` of the group the takeaway is about (e.g. the exception). |
| `callout` | The short annotation written over the subject's pair ("Solar ahead of wind"), in the story's language. |
| `format(v)` | How a bar's value is printed (decimals, decimal comma or point for the language). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as ONE literal string (the render checks it). |
| `limits` | The standfirst, ONE string: what the values are, the period, how the groups are ordered, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the groups and the exception. |
| `declaredSequence` | Optional: leave it out when the categories have no order of their own (countries); give a name ("year", "age band") when they do, and the groups keep your order. |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find a column's index by
name (`data.columns.findIndex((c) => c.name === "…")`), filter the rows to ONE period, and build one
group per category with the two columns the takeaway compares. If the takeaway speaks of shares and
the data holds amounts, compute the share (`part / total * 100`).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 7`, or to one decimal), never with strict equality on the raw division. A count the title states ("5 of these 6") is checked as a count.

- Every number in a sentence is computed from `data.json`, never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong group
  called out, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
