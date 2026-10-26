# Hex grid (hex cartogram, web) — what you write

The page is already designed: it comes from the worked example `proof/web-hex-grid-europe-protection`
and the story's PALETTE.md and DIRECTION.md. One equal hexagon per unit (a country) on a designed
layout, built in Web Mercator metres so every cell stays congruent, drawn as MapLibre layers over a
LIVE MapTiler map the reader can zoom and drag, over a frozen picture of that same map that stands
with JavaScript off. Each cell prints its code and its rate; its fill is its class on the stepped
scale. The INTERACTION is done: ONE control lets the reader hold THE GRAIN — over how many cells a cell
sums its count and its denominator before it divides: the unit alone, the unit with its edge
neighbours, or its named block — because a pooled rate is not the mean of the rates, and a still must
choose one grain in silence. The cells' fills and figures, the grain's sentence and the table follow
the grain; at the block grain a heavy line falls wherever two neighbours sit in different blocks.
Hovering a cell answers its three rates at once and its two ranks. You do not change any of that.

This kit draws the hex CARTOGRAM (one cell per unit), not points binned into cells. The cells sit over
Europe as a SEATING, not a geolocation.

You write ONE file, `beat.mjs`, in the beat folder. It names the columns of `data.json`, the blocks and
the WORDS of this story's page. `render-beat.mjs` (already in the folder) reads the units, computes
every pooled rate, class, seam and what Web Mercator costs this grid, draws the page, checks it in a
real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What data.json must hold

One row per unit: a column of ISO alpha-3 codes matching the grid, a count column, and a denominator
column (population…) in the same row — the map always draws a RATE, `count / denominator × perBase`.

The built-in grid places 32 cells: ISL NOR SWE FIN IRL DNK EST LVA NLD DEU POL LTU UKR BEL LUX CHE CZE
SVK HUN ROU PRT ESP FRA LIE AUT SVN HRV BGR MLT ITA GRC CYP. It has no GBR, no Balkans outside the EU,
no Türkiye: a story about other units passes its own `grid`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `key` | The NAME of the column holding each unit's code (matched against the grid). |
| `value` | The NAME of the column holding the count (the numerator). |
| `per` | The NAME of the denominator column. |
| `perBase` | Per how many (1000, 100000) — the base that gives readable numbers. |
| `where` | Optional `{ column: value }` — keep only the rows matching every pair. |
| `grid` | Optional: your own layout, an array of strings, one per row, codes separated by spaces and `.` for an empty place. Odd rows sit half a cell to the right. Leave it out for the Europe grid. |
| `drop` | Optional: codes the grid places that are outside the study — removed. |
| `unmeasured` | Optional: codes the grid places that data.json does not report but that belong on the map (an origin country): kept, neutral, in no grain. |
| `unmeasuredLabel` / `unmeasuredWord` / `unmeasuredDetail(c)` | With `unmeasured`: the key's swatch label ("Ukraine · origin"), the word printed in the cell ("origin"), and its tooltip (`c` = `{ code, name }`). |
| `names` | `{ CODE: "Name" }` for every cell, in the story's language. |
| `regions` | `{ "Block name": [codes] }` — the third grain's blocks, an EDITORIAL partition (say so); every measured unit in exactly one block. |
| `breaks` | The class breaks in the rate's units, ascending (4 breaks make 5 classes). |
| `format(v)` | How a rate is printed in a cell and the table ("23.9"). Short: it must fit inside a hexagon. |
| `count(n)` | How a count is printed in the table ("1 250 825"). |
| `classLabel(c)` | A key chip; `c` = `{ index, lower, upper }` (`lower` null for the first class, `upper` null for the last). Must print its limits. |
| `poolLabel` | The control's name ("At what scale a cell pools its value"). |
| `unit` | What the rate is ("per 1,000 inhabitants"). |
| `grains` | `{ country, neighbourhood, region }`, each `{ label, announce }`; `announce` must CONTAIN `label`. |
| `neighbourhoodNote(r)` | The sentence shown at the neighbourhood grain. `r` = `{ moved, cells, swing }`: `moved` = cells that change class, `swing` = the unit whose rate moves most `{ name, from, to, denominator, neighbour: { name, denominator } }` (its largest neighbour). Must state `r.moved`. |
| `regionNote(r)` | The sentence shown at the block grain. `r` = `{ moved, cells, blocks, blockNames, widest }`: `widest` = the block whose pooled rate stands furthest from the mean of its members' rates `{ name, pooled, mean, members }`. Must state `r.moved`. |
| `detail(r)` | A cell's tooltip; `r` = `{ code, name, alone, neighbourhood, region, regionName, numerator, denominator, rate, rateRank, countRank }`. Must name `r.name` and print `r.alone`. |
| `tableCaption({ cells })` | The table's caption; a number it prints is `cells`. |
| `columns` | The table's four headings: unit, rate at the chosen grain, count, class. |
| `claimNote(c)` | The sentence under the map; `c` is the claim reading below. Every number from `c`. |
| `mercator(m)` | Appended to `limits`: what the flat map costs this grid. `m` = `{ north: { name, lat }, south: { name, lat }, factor }`: the ground under the top cell is drawn `factor` times larger than under the bottom one. Print `m.factor`. |
| `reading(r)` | The reading line; `r` = `{ cells, measured, moved, wholeRate, meanOfRates }`: `wholeRate` = all units pooled, `meanOfRates` = the mean of their rates. |
| `hint` | One sentence shown once the live map is up: zoom, drag, hover a cell. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: one cell per unit, all the same size, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt(a)` | The alt text; `a` = `{ cells, measured, first, largest, moved, swing, unmeasured }` (`first` / `largest` = the leader by rate / by count, as in `c.byRate`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | 3. |
| `check(c)` | Throws if the data no longer supports the title. |

The claim reading `c` (in `check(c)`, `claimNote(c)`): `{ byRate, byCount, wholeRate, meanOfRates,
grain(key) }` — `byRate` / `byCount` = `[{ code, name, rate, numerator, denominator, rateRank,
countRank }]` highest first, `grain(key)` (`"country"`, `"neighbourhood"`, `"region"`) = `{ moved,
classesUsed, value(code) }`.

The render refuses, by name: a column not in data.json; two rows for one code; a code with no cell; a
cell with no reading that is in neither `unmeasured` nor `drop`; a unit in no block or in two; breaks
that do not rise; a grain that moves fewer than four cells across a class or paints one class; a
hexagon too narrow for its code or its printed rate; a magnitude that prints as "0 million".

## Rules

- Draw the measure the takeaway is about: a rate per inhabitant needs `per` and `perBase`.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`c.byRate[0].rate.toFixed(1) === "36.1"`), never with strict equality on a raw division.
- Every number in a sentence is taken from the reading the render hands you (`c`, `r`, `m`, `a`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. The first
  render photographs the ground and the live map (under a minute; later renders reuse the photograph
  while the map and its words are unchanged). If the render refuses, read its message and fix
  `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
