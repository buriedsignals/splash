# Streamgraph (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-streamgraph-swiss-electricity` and the story's PALETTE.md and DIRECTION.md. Bands,
colours, type, layout and the CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose
travel up over it, and the reader's scroll moves the picture continuously from one card's state to
the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | a playhead draws the stream up to the middle year, the year counting in the header | `cards.stream`, `notes.stream` |
| 2 | the stream reaches the last year, the bands named | `cards.giants`, `notes.giants` |
| 3 | the two largest bands (the giants) thin to nothing; the scale fits the bands left | `cards.retreat`, `notes.retreat` |
| 4 | a rule at the year the tracked band reached its `rank`, passing one band (the rival); both values written | `cards.cross`, `notes.cross`, `marks.cross` |
| 5 | a rule at the last year, the tracked band against the rival | `cards.end`, `notes.end`, `marks.end` |
| 6 | the giants return: the whole stream | `limits`, `notes.reading` |

A band's thickness is its quantity; its position means nothing (the largest sit in the middle), so
there is no vertical axis and quantities are written. The tracked band is drawn in the accent, the
others in one ramp by size. The giants, the crossing year and the rival are COMPUTED. With
JavaScript off the page shows card 6's picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
readings and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `readings`. Values are keyed by
your `keys` (`r.lastValues[key]`).

| Field | What it is |
|---|---|
| `r.first`, `r.last` | the first and last year drawn |
| `r.keys`, `r.labels` | the keys drawn (those above zero in some year), and your `labels` |
| `r.giants` | the keys of the two largest bands (card 3 withdraws them) |
| `r.rank` | your `rank` |
| `r.crossYear` | the first year the tracked band reached `rank` (it keeps it from then on) |
| `r.rival` | the key of the one band it passed that year |
| `r.firstValues`, `r.crossValues`, `r.lastValues` | every key's value in the first year, the crossing year and the last year |
| `r.firstTotal`, `r.lastTotal` | every band added together, first and last year |
| `r.multiple` | the tracked band ÷ the rival, in the last year |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `keys` | The layers stacked: the `data.json` column names of the quantities (at least four). |
| `labels` | `{ key: name }` for EVERY key — the name printed inside its band, in the story's language. |
| `tracked` | The key of the band the takeaway is about (not one of the two largest). Drawn in the accent. |
| `readings` | One `{ year, <key>: value, … }` per year, every year from the first to the last, none skipped, values zero or more. Leave out an incomplete last year. |
| `rank` | The place the tracked band reaches (3 = third largest). The render finds the year it is first reached and refuses if it is lost in a later year or was already held in the first. |
| `excluded` | Optional: years the data holds but the page leaves out, `[{ year, why }]`; each must be said in `source` or `limits`. |
| `lastYearComplete` | Optional: `true` only if the source confirms a last year whose total falls by more than a sixth is complete. |
| `unit` | The unit line above the stream ("electricity generation, TWh"). |
| `format(v)` | How a value is printed, in the story's language. |
| `formatCross(v)` | Optional: how the two values at the crossing are printed, when `format` would print them alike (more decimals). Default `format`. |
| `cards` | `{ stream(r), giants(r), retreat(r), cross(r), end(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 2 must state `format()` of each giant's last value and of `r.lastTotal`; card 4 `formatCross()` of the tracked band's and the rival's value in `r.crossYear`; card 5 `format(r.lastValues[tracked])`. |
| `notes` | `{ stream(r), giants(r), retreat(r), cross(r), end(r), reading(r) }` — the short accent note in the header while each card is read. `notes.stream` must contain the token `{year}`: it counts the playhead's year (e.g. `"{year}"`). |
| `marks` | `{ cross(r), end(r) }` — the words beside the two rules: each states both bands' values that year (`formatCross` at the crossing, `format` at the end). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read the stream (thickness = quantity, position means nothing, no vertical axis), the years left out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bands (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a year is skipped or a value is negative; the last
year looks partial; the tracked band is a giant; it never reaches `rank`, already holds it, or loses
it; it passes no band or several in the crossing year, or passes a giant; `formatCross` prints the two
crossing values alike; a card or a mark does not state its figures; or a card, a note, a mark or the
alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const keys = ["source_a", "source_b", "source_c", "source_d", "source_e"];
const readings = data.rows
  .filter((r) => Number(r[col("year")]) <= 2024)
  .map((r) => ({ year: Number(r[col("year")]), ...Object.fromEntries(keys.map((k) => [k, Number(r[col(k)])])) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a mark or the alt is taken from `r` (through `format()` / `formatCross()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — band labels included. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a band unnamed, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
