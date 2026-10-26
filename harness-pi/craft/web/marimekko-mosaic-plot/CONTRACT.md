# Marimekko (web) — what you write

The page is already designed: it comes from the worked example `proof/web-marimekko-electricity-mix`
and the story's PALETTE.md and DIRECTION.md. The mosaic — each column's WIDTH is its total, each
band's HEIGHT its share of the column, so a tile's AREA is a real quantity — the single-hue ramp and
its key, the names printed in the tiles that fit them, the colours, the type and the INTERACTION are
done — a "hold still" control lets the reader freeze one factor of that product: "the widths" (every
column the same width, height says only the share) or "the scale" (every column the same width,
height = the column's total from a common floor); the columns slide into place, the compared tile
carries a figure, and a sentence gives both ends. Every tile answers hover, tap and Tab with its
share, its amount and its part of the whole. With JavaScript off the page is the complete static
mosaic, and the control still works. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
columns, the bands and the WORDS of this story's page. `render-beat.mjs` (already in the folder) adds
the bands, lays out the mosaic and both held states, computes the comparison, draws the page, checks
it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

Columns ordered widest first (the largest total on the left). Bands stacked in `bandOrder`, the
tracked band at the bottom in the darkest tone, the last band at the top in the lightest. The two
held states compare the tracked band's tiles in two columns (`compare`, default: the two columns
holding the most of it).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `columns` | One `{ key, label, values }` per column (2 to 8): `label` is printed under it, `values` an object giving EVERY band's value by band key (`0` where there is none), from `data.json`. Do not give totals: render-beat adds the bands. No column may be under 3 % of the whole. You may add other fields — `detail(t)` receives the column back. |
| `bandOrder` | The bands bottom to top, 2 to 10: `[{ key, label }]`. The tracked band FIRST. `label` is printed in the key and in the tiles. |
| `tracked` | The `key` of the band the takeaway is about (the first of `bandOrder`). |
| `compare` | Optional: the two column keys whose tracked tiles the held states compare, `[a, b]`. Default: the two holding the most of the tracked band, the larger first. |
| `unit` | The unit of the values ("TWh"). |
| `widthName` | One short sentence printed above the control naming what a width and a height are ("Width: total generation in 2024, in TWh; height: each source's share"). |
| `claimNote` | A few words printed after it: the tracked band's whole ("Coal: 201 TWh."), its number computed. A string, or a function of the counted figures (see `check`). |
| `format(v)` | How a column's total is printed under its name ("562"). |
| `percent(share)` | How a tile's share (0–1) is printed after its band's name inside the tile ("21 %"); return `""` to print the name alone. |
| `detail(t)` | The tooltip sentence for one tile. `t` is `{ columnLabel, bandLabel, share, value, grandShare, grand, column, band }`: `share` = percent of its column, `value` = its amount, `grandShare` = percent of the whole, `grand` = the whole, `column` / `band` = your own objects. Name the column and the band: every tile must answer differently. |
| `hold` | The control's words: `{ label, noneLabel, parts: { label, announce, note, figure }, scale: { label, announce, note, figure } }`. `label` is the legend ("Hold still"), `noneLabel` the untouched option ("The mosaic"); `parts` is the equal-widths state, `scale` the common-floor state. `announce(r)` (must contain that option's `label`), `note(r)` (the sentence shown when chosen — must name both compared columns) and `figure(r)` (the few words printed on the compared tile) are functions of `r` = `{ a, b, valueRatio, shareRatio, totalRatio, areaGapPct, grand, trackedTotal, trackedShare }`: `a` / `b` = the two compared columns' `{ key, label, total, value, share }` (`value` = its tracked amount, `share` = percent of its column); `valueRatio` = a.value ÷ b.value (also the ratio of the two tiles' areas), `shareRatio` = b.share ÷ a.share, `totalRatio` = a.total ÷ b.total, `areaGapPct` = how much larger a's tile is than b's, in per cent. The `parts` figure sits on b's tile, the `scale` figure on a's. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: say that the WIDTH is the total and the height the mix — the one thing a reader of this form must be told — and the limits the journalist named. |
| `reading` | One short sentence telling the reader what they can do: hold a dimension still; hover, tap or tab a tile. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the counted figures plus `compared` = `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ columns, grand, trackedTotal, trackedShare, holders })` | Throws if the data no longer supports the title. render-beat passes the columns with their `total`, the whole (`grand`), the tracked band's total and share of the whole (in per cent), and `holders`: `[{ key, label, value }]` of the tracked band per column, largest first. |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const bandOrder = [{ key: "part_c", label: "C" }, { key: "part_b", label: "B" }, { key: "part_a", label: "A" }];
const columns = data.rows
  .filter((r) => r[at("period")] === 2024)
  .map((r) => ({ key: r[at("code")], label: r[at("region")], values: Object.fromEntries(bandOrder.map((b) => [b.key, Number(r[at(b.key)])])) }));
```

If the bands are rows rather than columns (one row per place per band), read each place's value for
each band and build one column per place.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (to one decimal, as the title prints it), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`t`, `r`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Keep `widthName`, `claimNote` and `reading` short: on a phone every extra line is taken off the
  mosaic, and the browser check refuses a page where no tile has room left for its name.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (the tracked band not
  at the bottom, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and
  look again.
