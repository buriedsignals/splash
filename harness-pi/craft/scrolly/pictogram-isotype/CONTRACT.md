# Pictogram (isotype, scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-pictogram-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. Squares, colours, type, layout and the CHOREOGRAPHY are
done. The graphic stays fixed while six cards of prose travel up over it, and the reader's scroll moves
the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | one square per thing, set down at its own value on a 0–100 % axis (crowds stack into towers), the two ends named | `cards.axis`, `notes.axis`, `ends` |
| 2 | the two floors drawn across the axis | `cards.floors`, `notes.floors` |
| 3 | the squares leave the axis and are counted in three blocks: at or above the high floor · between · under the low floor | `cards.count`, `notes.count`, `blockNames` |
| 4 | the middle block alone, its members named under it | `cards.middle`, `notes.middle`, `middleNames` |
| 5 | the two ends alone, each square in the fill of its class, the key | `cards.ends`, `notes.ends` |
| 6 | the plate and its key | `limits` |

One square is one thing (a country, a city), never a quantity. The axis runs 0–100 %: each thing's
value is a SHARE in percent. With JavaScript off the page shows card 6's picture and every card's
words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `units` and `floors`:

| Field | What it is |
|---|---|
| `r.count` | how many squares are drawn |
| `r.floors` | `{ low, high }`, your floors |
| `r.top`, `r.middle`, `r.bottom` | each block: `{ count, units }` — `units` are `[{ key, label, value }]`, largest value first. `top`: value ≥ high; `middle`: low ≤ value < high; `bottom`: value < low |
| `r.endsCount` | `r.top.count + r.bottom.count` |
| `r.lowest` | the thing with the lowest value, `{ key, label, value }` |
| `r.highest` | the thing(s) with the highest value (several when tied), `[{ key, label, value }]` |
| `r.breaks` | your `breaks` |
| `r.absentCount` | how many things are not drawn |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `units` | One `{ key, label, value }` per thing (10 to 120), `value` a share from 0 to 100, from `data.json`. Leave out things with no reading (list them in `absent`). |
| `floors` | The takeaway's two thresholds, `[low, high]`, between 0 and 100 (e.g. `[60, 75]`). Each block must hold at least one thing. |
| `breaks` | 1 to 6 increasing numbers: the edges of the shade classes inside the squares. |
| `formatBreak(b)` | How a break, a floor or an axis tick (0, 50, 100) is printed ("75 %"). |
| `format(v)` | How a thing's value is printed ("74 %"). |
| `unitIs` | The line above the squares saying what one square is ("one square = one country"). |
| `absent` | The labels of the things with no reading, `[]` if none. |
| `absentNote` | The key's line about them, with their count or their names ("Ukraine, with no 2024 data, is not drawn."); `""` when `absent` is empty. |
| `blockNames` | `{ top(r), middle(r), bottom(r) }` — the name printed after each block's count ("countries above 75 % low-carbon electricity", "between 60 and 75 %", "below 60 %"). |
| `ends` | `{ low(r), high(r) }` — the two ends of the axis named on card 1 ("Moldova 11 %", "Albania and Iceland 100 %"). |
| `middleNames(r)` | The line under the middle block on card 4, naming every member with its value ("Hungary 74 % · Latvia 73 % · …"). |
| `cards` | `{ axis(r), floors(r), count(r), middle(r), ends(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.count`; card 2 `r.floors.low` and `r.floors.high`; card 3 `r.top.count`, `r.middle.count` and `r.bottom.count`; card 4 name every member of `r.middle.units`; card 5 state `r.endsCount`. |
| `notes` | `{ axis(r), floors(r), count(r), middle(r), ends(r) }` — the short accent note in the header while each card is read ("16 · 6 · 18"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how the plate reads and what the figures leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the plate (a string, or a function of `r`). |
| `evidenceLevels` | Optional: the number of shade classes (`breaks.length + 1`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a value falls outside 0–100; more than twelve
things crowd one 2.5-point column of the axis; a block is empty; a card does not state its figure or
name the middle block; `absentNote` does not account for `absent`; or a card, a note, a name or the
alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const measured = data.rows
  .filter((r) => Number(r[col("year")]) === 2024)
  .map((r) => {
    const part = Number(r[col("part_a")] || 0);
    const total = part + Number(r[col("part_b")] || 0);
    return { key: r[col("code")], label: r[col("place")], value: total > 0 ? (part / total) * 100 : null };
  });
const units = measured.filter((m) => m.value !== null);
const absent = measured.filter((m) => m.value === null).map((m) => m.label);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a name or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a block miscounted, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
