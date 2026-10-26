# Stacked bar (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-stacked-bar-lowcarbon-growth` and the story's PALETTE.md and DIRECTION.md. Bars, the
key, colours, type, layout and the CHOREOGRAPHY are done. Each bar stacks two segments: an earlier
LEVEL and the GROWTH added since. The graphic stays fixed while six cards of prose travel up over it,
and the reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the level segments alone, the rows ordered by level | `cards.level`, `notes.level` |
| 2 | the growth segments grow onto the levels, every total written at the end | `cards.grow`, `notes.grow` |
| 3 | the rows travel to the order of their growth, largest first | `cards.sort`, `notes.sort` |
| 4 | the levels leave; the growth segments slide onto one start line, the scale fitted to them | `cards.detach`, `notes.detach` |
| 5 | the pair (your two `highlight` rows) alone, the rest stepping back | `cards.pair`, `notes.pair` |
| 6 | the stack in growth order stands | `limits`, `notes.reading` |

The drawn rows are the `drawCount` members that added the most. The pair is drawn in the accent.
With JavaScript off the page shows card 6's picture and every card's words. You do not change any of
that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `rows`. A row in `r` is
`{ name, level, growth, total, growthRank, levelRank, totalRank }`: `total` = `level + growth`;
`growthRank` / `levelRank` = its place among the drawn rows by growth / by level (1 = largest);
`totalRank` = its place by total among EVERY member.

| Field | What it is |
|---|---|
| `r.count` | how many members `rows` holds |
| `r.drawCount` | how many rows are drawn (the largest growths) |
| `r.rows` | the drawn rows, largest growth first |
| `r.byLevel` | the drawn rows, largest level first (card 1's order) |
| `r.levelLeader`, `r.growthLeader` | the drawn row with the largest level, and with the largest growth |
| `r.largestTotal` | the member with the largest total |
| `r.adder`, `r.incumbent` | the pair: the highlighted row that added more, and the one it out-added |
| `r.headStart` | `incumbent.level ÷ adder.level` — how many times higher the incumbent started |
| `r.ratio` | `adder.growth ÷ incumbent.growth` — how many times more the adder added |
| `r.drawnGrowth` | the drawn rows' growth added together |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | EVERY member as `{ name, level, growth }`, from `data.json`: `level` the earlier value, `growth` COMPUTED (later value minus earlier value), both zero or more. `name` in the story's language, each once. Any order: the render sorts. |
| `drawCount` | Optional: how many rows are drawn, from the largest growth (default 12, between 4 and 16). |
| `highlight` | The two `name`s of the pair the takeaway is about (both must be drawn). |
| `segments` | `{ level, growth }`: the two segment names printed in the key ("produced in 2000", "added since"). |
| `format(v)` | How a value is printed, in the story's language. |
| `cards` | `{ level(r), grow(r), sort(r), detach(r), pair(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.levelLeader.level)`; card 4 `format(r.adder.growth)` and `format(r.incumbent.growth)`; card 5 `format(r.incumbent.total)`. |
| `notes` | `{ level(r), grow(r), sort(r), detach(r), pair(r), reading(r) }` — the short accent note in the header while each card is read (a few words: "in TWh", "ranked by growth"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read the stack (pale = earlier, full = added, the number at the end is the total, the unit) and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bars (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a level or growth is negative; `highlight` does not
name exactly two drawn rows, or they added the same; a card does not state its figure; or a card, a
note or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [PLACE, YEAR, AMOUNT] = [col("place"), col("year"), col("amount")];
const at = (place, year) => Number(data.rows.find((r) => r[PLACE] === place && Number(r[YEAR]) === year)[AMOUNT]);
const places = [...new Set(data.rows.map((r) => r[PLACE]))];
const rows = places.map((p) => ({ name: p, level: at(p, 2000), growth: at(p, 2024) - at(p, 2000) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — row names included. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong rows in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
