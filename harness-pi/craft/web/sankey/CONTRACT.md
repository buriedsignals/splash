# Sankey (web) — what you write

The page is already designed: it comes from the worked example
`proof/web-sankey-electricity-sources` and the story's PALETTE.md and DIRECTION.md. Sources on the
left, targets on the right, both rails ordered by size, every node printing its OWN total
(conservation is the form's promise), ribbons as wide as their flow, the colours, the type and the
INTERACTION are done. A "follow a source" control lights one source's whole downstream in the accent
while the rest of the network recedes, hollows the targets it never reaches, prints under each
target reached the share of ITS total that source supplies, and writes the path's arithmetic under
the control — including the flows too thin to draw (under half a pixel). The first option — your
`subject` — is the state the page ships in. A source the plate draws no ribbon of is not offered.
Every ribbon answers hover, tap and Tab with its two ends and its two shares. With JavaScript off the
page is the complete static plate and the control still works (CSS only). You do not change any of
that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rails, the flows and the WORDS. `render-beat.mjs` (already in the folder) computes every total from
the flows, lays out the nodes and ribbons, works out what each path draws and what it cannot, draws
the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `sources` | The left rail: `[{ key, label }]`, 2 to 12. Totals are computed from `flows`. |
| `targets` | The right rail: `[{ key, label }]`, 2 to 12. A target's `key` must differ from every source's `key`. |
| `flows` | One `{ from, to, value }` per pair: `from` a source key, `to` a target key, `value` ≥ 0. One flow per pair; every node needs at least one flow above 0. |
| `subject` | The source `key` the takeaway is about: the path the page opens on. |
| `unit` | Optional: the unit of the values ("TWh"). |
| `nodeLabel(n)` | A node's label, printed on the plot with its total ("nuclear · 455 TWh"). `n` is `{ key, label, total, share, rank, side }`, `side` = "source" or "target". |
| `detail(r)` | The tooltip of one ribbon. `r` is `{ from, to, value, shareOfSource, shareOfTarget, sourceTotal, targetTotal }` (shares in %). Name both ends. |
| `traceTitle` | The control's legend ("Follow a source"). |
| `traceLabel(s)` | The pill of one source ("nuclear", with its article where the language needs one). `s` is a source reading like `n`. |
| `announce(o)` | What a screen reader hears for one option. Must contain `o.label` (the pill). |
| `stated(o)` | The short line printed beside the traced source's node ("455.1 TWh · 3 countries · all drawn"). |
| `atDestination(seg)` | The line printed under each target the path reaches ("67.7 % of its electricity"). `seg` is `{ label, value, shareOfSource, shareOfTarget }`. |
| `undrawnLabel(o)` | Called only when part of the path is too thin to draw: says how much and to whom. |
| `note(o)` | The sentence under the control: the path's arithmetic — what leaves, what arrives where, what is not drawn, and that they add up to the node's total. |
| `remainder(r)` | Called only when some flows are too thin to draw: the line under the plot. `r` is `{ hidden, hiddenTotal, hiddenShare, refused }` — how many flows, what they weigh, their % of the whole, and the sources not offered (`[{ label, total }]`). Must state `hidden`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: the whole, the year, the scope, the limits the journalist named. Keep it short — the page must fit a phone. |
| `reading` | One sentence telling the reader what they can do: choose a source to follow; hover, tap or tab a ribbon. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the same object `check()` receives, plus `offered` = how many sources the control offers). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ sources, targets, flows, grand })` | Throws if the data no longer supports the title. `sources` / `targets` = the rails' readings, largest first, each `{ key, label, total, share, rank }`; `flows` = every pair `{ fromKey, toKey, from, to, value, shareOfSource, shareOfTarget, … }`; `grand` = the whole. |

A path reading `o` (given to `announce`, `stated`, `undrawnLabel`, `note`) is
`{ label, name, total, drawnTotal, undrawnTotal, segments, absent, missed }`: `label` = the pill,
`name` = the source's label, `total` = its node's total, `drawnTotal` + `undrawnTotal` = `total`,
`segments` = the drawn ribbons `[{ label, value, shareOfSource, shareOfTarget }]`, `absent` = the
targets that receive nothing at all from it, `missed` = the targets it reaches with a flow too thin
to draw `[{ label, value }]`.

The sentence under the control reserves the height of the LONGEST note on every screen, and the whole
page must fit a 375 × 812 phone: keep `limits`, `reading` and each `note()` short.

## Reading the data

A wide table (one row per target, one column per source) becomes flows with one `flatMap`. Example
with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const rows = data.rows.filter((r) => r[col("year")] === 2024);
const SOURCES = ["alpha", "beta", "gamma"];
const flows = SOURCES.flatMap((s) => rows.map((r) => ({ from: s, to: r[col("code")], value: Number(r[col(s)]) })));
```

A long table (`from`, `to`, `value` columns) maps row by row. Filter to ONE year first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(share) === 84`), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`n`, `r`, `o`, `seg`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs` (a phone failure — "the source line is on
  screen" — means shorten `limits`, `reading` or the notes; a typeface that does not "really DRAW"
  means the letters set in it happen to measure like the fallback: reword the line it names). If the
  picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
