# Connected scatter, composed — what you write (video)

The marks, the axes, the colours and the layout are already done: each entity drawn as a path through its steps in key order (a year): a hollow circle at its first step, a filled one at its last, both axes fitted to the data. The path's LAST step carries the entity's own name ("France"); earlier steps are "France 2000". A gesture on "France" acts on the whole path; a key ("2000") names every point at that step, in the story's PALETTE.md and
DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the order the story tells it. Nothing is staged
that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports
what THIS story says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ series, key, x, value }` per entity and step, from `data.json`: `series` the entity (a country), `key` the step (a year). |
| `gestures` | The staging, in story order (below). |
| `xName`, `yName` | Each axis's name, with its unit. Optional `xQualifier`, `yQualifier`: a caveat set beside it in a lighter weight ("(log scale)"). |
| `xLog` | Optional, `true` for a logarithmic x axis (a range across orders of magnitude). A row with x <= 0 turns it back to linear. |
| `format(v)` | How a y value is printed. |
| `xFormat(v)` | How an x value is printed in words. Optional `xTick(v)`: a shorter form for the axis ticks ("$30k"). |
| `sizeName`, `sizeFormat(v)` | Bubbles only: the size's name and how it is printed, for the key. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst, in forms, longest first: scope, units, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(marks)` | The alt text (a string, or a function of the drawn marks). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A video takes EXACTLY THREE gestures: they fill the reveal, the subject and the conclusion, in order, after the title card and the plot arriving. The conclusion shows the whole chart: a `zoom` or `filter` there is refused (make it `pull-back`); what was zoomed or filtered before it returns there. Notes are written on caption lines above the plot as their gesture plays.

```js
gestures: [
  { do: "highlight", mark: "France" },
  { do: "annotate", mark: "France", note: "France: -11.8 points of weight, +4.2 at home" },
  { do: "filter", marks: ["France", "Sweden", "Belgium"], note: "3 of 16 weigh less than in 2000" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` / `marks` | `mark` / `marks` name an entity (its path) or one step ("France 2000"). For `compare`: exactly two, the subject first (no sum, no whole: positions do not add up). |
| `axis`, `value` | A `reference` is a rule at `value` on `axis` (`"x"` or `"y"`, default `"y"`). A `filter` may keep the points on one `side` (`"above"`, default, or `"below"`) of `value` on `axis` instead of naming marks. |
| `note` | The words drawn with the gesture, in the story's language. A `zoom`'s note prints its factor ("×3.2"). |

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a mark the takeaway names (or its comparison), or it
  states one of the takeaway's figures (a rule at the takeaway's threshold does). A gesture about anything else is refused.
- Every number in a `note` is computed from the rows: a point's x or y (or size), a path's move from its first step
  to its last, the gap between two compared points on either axis, a rule's count and spread on each side. A number
  the rows do not give is refused, with the value that works. "twice", "highest", "lowest" are checked against the rows.
- These values do not add up: there is no `bracket` and no `count` here (a sum of positions is no figure).
- One accent: the takeaway's subject (its whole path) carries it; any other highlighted or named point is RINGED.
  With no subject, the rule your takeaway is about takes the accent.
- A position is data: no gesture moves a point. A `zoom` enlarges the plot onto its marks and prints its factor.
- Write every `note` in the storyboard's `language`, whatever language the data's columns are in.
- Never type the rows or their numbers: `beat.mjs` must read `data.json`, or the render refuses it.
- `check()` tests only what the drawn data can decide, at the takeaway's precision (`Math.round(ratio) === 3`).
- After `write_file`, call `render_beat` with format `video`, then `look` at the stills. If the render refuses, read its message: a refusal on `gestures[i]` names the
  key to change and a value that works. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and
  look again.
