# Population pyramid (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-swiss-age-pyramid` and
the story's PALETTE.md and DIRECTION.md. Bars, colours, type, layout and the CHOREOGRAPHY are done.
The graphic stays fixed while six cards of prose travel up over it, and the reader's scroll moves the
picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the left half (in the accent), band by band, from the youngest up | `cards.left`, `notes.left` |
| 2 | the right half mirrored: the pyramid | `cards.right`, `notes.right` |
| 3 | every band turned into its difference (right minus left), on a scale fitted to it | `cards.diff`, `notes.diff`, `surplus` |
| 4 | the tipping band marked with a rule and `crossingLabel`, its difference written | `cards.crossing`, `notes.crossing` |
| 5 | the oldest bands as a ratio of right to left (`× 4,1`), every other band stepping back | `cards.oldest`, `notes.oldest` |
| 6 | the plain pyramid | `limits` |

The tipping band is COMPUTED: the first band from which the right half outnumbers the left in every
older band, with the left at least as many in every younger one. Both halves share one scale from
zero; the ticks are computed. With JavaScript off the page shows card 6's picture and every card's
words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `bands`:

| Field | What it is |
|---|---|
| `r.count` | how many bands |
| `r.bands` | every band `{ band, left, right }`, youngest first |
| `r.totalLeft`, `r.totalRight` | each half's total |
| `r.crossing` | the tipping band `{ band, left, right, diff, index }` (`diff` = right − left) |
| `r.below` | the band just under it `{ band, left, right }` |
| `r.oldest` | the `oldestCount` oldest bands, `[{ band, left, right, ratio }]`, youngest of them first (`ratio` = right ÷ left) |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `bands` | One `{ band, left, right }` per age band (5 to 30), from `data.json`, YOUNGEST FIRST (the foot of the pyramid). `left` and `right` are the two groups' counts, never negative. `band` is plain text ("60-64", "100+"). |
| `leftName` / `rightName` | The names over each half ("Men", "Women"). The left half is drawn in the accent. |
| `surplus` | `{ left, right }` — the names over each half once every band is its difference ("more men", "more women"). |
| `unit` | The line above the pyramid ("resident population, 2023"). |
| `format(v)` | How a count is printed — ticks, the crossing's difference ("292 211"). |
| `formatRatio(v)` | How a ratio is printed ("4,1"). |
| `oldestCount` | Optional: how many oldest bands card 5 measures (2 to 4, default 3). |
| `crossingLabel(r)` | The words drawn at the tipping band ("women ahead from 60-64"). |
| `cards` | `{ left(r), right(r), diff(r), crossing(r), oldest(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.totalLeft`; card 2 `r.totalRight`; card 4 name `r.crossing.band` and state `r.crossing.right` and `r.crossing.left`; card 5 state every ratio of `r.oldest`. |
| `notes` | `{ left(r), right(r), diff(r), crossing(r), oldest(r) }` — the short accent note in the header while each card is read. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how the plate reads and what the figures leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the pyramid (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there is no tipping band (the right half never
outnumbers the left from one band upward); fewer bands lie above it than card 5 measures; a card does
not state its figure or name the band; or a card, a note, the label or the alt states a number no
figure of `r` rounds to (the numbers inside a band's name count as known).

## Reading the data

Rows are arrays; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const bands = data.rows
  .filter((r) => Number(r[col("year")]) === 2023)
  .map((r) => ({ band: String(r[col("band")]), left: Number(r[col("group_a")]), right: Number(r[col("group_b")]) }));
```

Keep the bands youngest first, as the file gives them (check it: the foot of the pyramid is the first band).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, the label or the alt is taken from `r` (through `format()` / `formatRatio()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (the halves swapped, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
