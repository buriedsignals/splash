# Calendar heatmap, composed (scrolly) — what you write

The grid, the stepped colour ramp, the key with its printed breaks, the type, the colours and the layout are already
done, from the story's PALETTE.md and DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in story order.
You write ONE file, `beat.mjs`, which reads `data.json` beside it. `beat.example.mjs` is a worked example: read it
first, then write this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words. |
| `days` | One `{ date: "YYYY-MM-DD", value }` per day of ONE year, from data.json. A missing day is left out: it is drawn as missing. |
| `months` / `monthsShort` | The twelve month names in the story's language (all different). A month's name is the name a gesture uses for its days. |
| `keyLabel` / `missingLabel` | The key's caption; the caption of the pale swatch (a date with no reading or that does not exist). |
| `breaks` | Optional: class edges; default six classes of equal count (`breakDecimals` rounds them). |
| `gestures` | The staging, in story order (below). |
| (each gesture) `card` | The prose the reader reads while that gesture plays, in the story's language; every number in it is checked; a `trace` card states its run length, a `compare` card one of its two values. |
| `unit` | What a cell is ("part de la production du pays", "°C"). |
| `format(v)` | How a value and a break are printed. |
| `title` | The headline in forms, longest first: the FIRST is the takeaway from STORYBOARD.md, copied word for word. |
| `limits` | The standfirst in forms, longest first, carrying the limits the journalist named. |
| `reading` | Optional: the reading line, in forms. |
| `source` | The credit line, as the storyboard records it. |
| `alt` | The alt text. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; find a column with
`data.columns.findIndex((c) => c.name === "…")`. Compute shares, runs and means from it — never type a number.

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

On a cell grid the hue IS the scale: no gesture recolours a cell. `highlight` outlines in the accent, `name` rings in
ink and labels the value (a row: its measure; a month: its mean), `trace` outlines the longest run of cells at or above
`value` (days in date order; rows in drawn order by their measure; or the cells `along` one row, column or month) and
its note states the run's length, `reference` marks the cutoff `value` on the key and on every cell past it, `compare`
joins exactly TWO cells, `filter` steps every other cell back, `reorder` moves the named rows to the top (heatmap only;
every other row keeps its order). No `bracket`, `count`, `zoom` or `rescale`: these values do not add up and the colour
scale never moves. One card per gesture, then a closing card carrying `limits`. A filter is released on the closing card.

A gesture names a day by its date (`"2024-08-11"`), a whole month by its name (`"Août"`), or several of those as a list.

```js
gestures: [
  { do: "trace", value: 20, note: "31 jours d’affilée au-dessus de 20 °C" },
  { do: "highlight", mark: "Août" },
  { do: "compare", marks: ["France · Nucléaire", "Albanie · Hydraulique"], note: "67,7 % contre 95,9 %" },
]
```

## Rules

- Every gesture serves the takeaway: it acts on a row, column or month the storyboard names, or states one of its figures.
- Every number in a `note` is computed from the data (a cell, a row's measure, a group's mean, a run's length or its
  first and last day, a count of cells past a cutoff). A number the grid does not give is refused, with a value that works.
- Write every note in the storyboard's `language`. Two notes on one group are refused.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the card PNGs. A refusal names the `gestures[i]` field to change and a value that works.
