# Bar and column (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-bar-top-emitters-2024`
and the story's PALETTE.md and DIRECTION.md. Bars, colours, type, layout and the CHOREOGRAPHY are
done. The graphic stays fixed while six cards of prose travel up over it, and the reader's scroll
moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | every member is a thin row, largest first: a few long bars, then a long tail | `cards.tail`, `notes.tail` |
| 2 | the drawn rows grow; every member below them slides end to end into one row | `cards.cut`, `notes.cut` |
| 3 | names and values arrive, from the last drawn row up to the second | `cards.ranks`, `notes.ranks` |
| 4 | the first row turns to the accent, named and written | `cards.subject`, `notes.subject` |
| 5 | the next few rows slide end to end into the second row, under the first's length | `cards.stack`, `notes.stack` |
| 6 | the ranking stands, every value written | `limits`, `notes.reading` |

The run in card 5 is computed: the longest run of rows below the first whose sum stays under it.
With JavaScript off the page shows card 6's picture and every card's words. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `rows`:

| Field | What it is |
|---|---|
| `r.count` | how many members the ranking has (every row) |
| `r.drawCount` | how many rows are drawn |
| `r.top` | the drawn rows, `[{ name, value, rank }]`, largest first |
| `r.subject`, `r.second`, `r.last` | the first, second and last drawn row, each `{ name, value, rank }` |
| `r.othersCount`, `r.othersSum` | how many members are below the drawn rows, and their sum (card 2's row) |
| `r.stackCount`, `r.stackSum` | how many rows card 5 stacks under the first, and their sum |
| `r.stacked` | those rows, `[{ name, value, rank }]` |
| `r.nextAfterStack` | the row right after the run (the one that would tip it over the first), or `null` |
| `r.ratio` | first ÷ second |
| `r.topShare`, `r.subjectShare`, `r.othersShare` | percent of `whole`: the drawn rows together, the first, the others |
| `r.whole` | your `whole` |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | EVERY member of the ranking as `{ name, value }`, from `data.json` — not only the rows drawn: cards 1 and 2 are about the members below them. One row per name, values zero or more. |
| `drawCount` | Optional: how many rows are drawn, from the largest (default 10, between 3 and 16). |
| `subject` | The `name` of the row the takeaway is about. It must be the largest row: this choreography is about the leader. |
| `whole` | The total the rows are parts of (a "World" row, or the sum of every row), COMPUTED. Shares are of this. |
| `unit` | The unit line above the bars ("billion tonnes of CO₂, 2024"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `cards` | `{ tail(r), cut(r), ranks(r), subject(r), stack(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.count`; card 2 `format(r.othersSum)`; card 3 `format(r.last.value)` and `format(r.second.value)`; card 4 `format(r.subject.value)`; card 5 `format(r.stackSum)`. |
| `notes` | `{ tail(r), cut(r), ranks(r), subject(r), stack(r), reading(r) }` — the short accent note in the header while each card is read (a few words: "215 countries", "11.7 against 12.3"). |
| `restName(r)` | The name of card 2's row of others ("205 other countries"). |
| `stackName(r)` | The name of card 5's stacked row ("the next five"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bars (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the subject is not the largest row; fewer than two
rows fit under the first together (card 5 has nothing to stack); the members below the drawn rows
add up to more than the first (raise `drawCount`); a card does not state its figure; or a card, a
note or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("region"), col("amount")];
const members = data.rows.filter((r) => r[NAME] !== "Total");
const rows = members.map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }));
const whole = rows.reduce((s, r) => s + r.value, 0);
```

Leave out aggregate rows (a "Total" or "World" row is `whole`, not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong row in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
