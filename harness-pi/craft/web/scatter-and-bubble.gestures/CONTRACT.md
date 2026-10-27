# Scatter and bubble, composed — what you write (web)

The marks, the axes, the colours and the layout are already done: one point per row: `x` on the horizontal axis, `value` on the vertical axis, both fitted to the data (never pulled to zero). Give every row a `size` and the points become bubbles whose AREA is the size (the plate keys it; a point too small to draw is hollow, and the key says under what size), in the story's PALETTE.md and
DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the order the story tells it. Nothing is staged
that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports
what THIS story says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, x, value, size? }` per point, from `data.json`. `name` is the row's label (a country). Leave out aggregates ("World"). Rows missing a number are left out and stated. |
| `gestures` | The staging, in story order (below). |
| `xName`, `yName` | Each axis's name, with its unit. Optional `xQualifier`, `yQualifier`: a caveat set beside it in a lighter weight ("(log scale)"). |
| `xLog` | Optional, `true` for a logarithmic x axis (a range across orders of magnitude). A row with x <= 0 turns it back to linear. |
| `format(v)` | How a y value is printed. |
| `xFormat(v)` | How an x value is printed in words. Optional `xTick(v)`: a shorter form for the axis ticks ("$30k"). |
| `sizeName`, `sizeFormat(v)` | Bubbles only: the size's name and how it is printed, for the key. |
| `restLabel` | The words of the pill that shows the page as it lands, e.g. "The whole cloud". Every control starts on it. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst, in forms, longest first: scope, units, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(marks)` | The alt text (a string, or a function of the drawn marks). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

The resting gestures (`highlight`, `name`, `annotate`, `reference`, `reveal`, `pull-back`) are drawn on the page the reader lands on; their notes are written above the plot. Each further gesture (`compare`, `filter`, `zoom`, `trace`) is ONE reader control: the resting page plus that gesture. A web page needs at least one control. Every point answers a pointer with its two values.

```js
gestures: [
  { do: "reference", axis: "x", value: 30000, note: "$30,000: 41 years of spread below, 14 above" },
  { do: "filter", axis: "x", value: 30000, side: "above", note: "41 countries above $30,000" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` / `marks` | `mark` / `marks` name points by their `name`. For `compare`: exactly two, the subject first (no sum, no whole: positions do not add up). |
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
- After `write_file`, call `render_beat` with format `web`, then `look` at the screenshot. If the render refuses, read its message: a refusal on `gestures[i]` names the
  key to change and a value that works. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and
  look again.
