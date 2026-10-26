# Treemap (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-treemap-europe-capacity` and the story's PALETTE.md and DIRECTION.md. Cells, colours,
type, layout and the CHOREOGRAPHY are done. A treemap is a whole divided: the scroll divides the
same whole twice — by CATEGORY, then by MEMBER — so the reader sees what the accent means before it
lands on members. The graphic stays fixed while six cards of prose travel up over it, and the
reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the whole as one rectangle whose area is its total | `cards.block`, `notes.block` |
| 2 | the block divides into one cell per category; the `thread` categories in the accent | `cards.split`, `notes.split` |
| 3 | the category cells give way to one cell per member (the largest `drawCount`, the rest in two remainders) | `cards.byMember`, `notes.byMember` |
| 4 | the TIPPED members — where the thread categories are over `tipAt` of the member's total — take the accent | `cards.tipped`, `notes.tipped` |
| 5 | the largest member's cell grows to the stage and divides into its own categories | `cards.open`, `notes.open` |
| 6 | the member treemap stands | `limits`, `notes.reading` |

Every cell carries its value, its name and its basis (count of records, or share) while they fit,
and gives them up basis first. The accent follows a THREAD, not a maximum: the largest member must
not be tipped. With JavaScript off the page shows card 6's picture and every card's words. You do
not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
items and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) aggregates the
items, computes every figure, checks your words against them, draws the page, checks it in a real
browser and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `items`. Shares are percentages
(0–100). A member in `r` is `{ name, value, records, share, threadShare, tipped, categories }`:
`share` = its percent of the whole; `threadShare` = the percent of its own total in the thread
categories; `categories` = `{ categoryKey: percent of its own total }`.

| Field | What it is |
|---|---|
| `r.total`, `r.records` | the whole (every item's value added) and how many records (items, or their `records`) |
| `r.count`, `r.drawCount` | how many members, and how many are drawn as their own cells |
| `r.categories` | the named categories, `[{ key, label, value, records, share }]` |
| `r.categoryShare` | `{ categoryKey: percent of the whole }`, every category |
| `r.otherShare` | the percent in categories not named in `categories` |
| `r.topTwo`, `r.topTwoShare` | the keys of the two largest categories, and their percent together |
| `r.threadShare` | the thread categories' percent of the whole (card 2's accent) |
| `r.members`, `r.largest` | every member largest first, and the largest (card 5 opens it) |
| `r.tippedCount`, `r.tipped`, `r.tippedShare` | how many members are tipped, which, and their percent of the whole (card 4) |
| `r.restCount`, `r.tippedRestCount` | how many undrawn members are folded into each remainder |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `items` | One `{ member, category, value, records? }` per record of `data.json` (e.g. one per site), or per member and category with `records` = how many records it sums. `member` is the printed name, in the story's language; `category` a key of `categories` (or any other value, folded into `otherCategory`). Values zero or more, in the unit the cards speak (convert first: MW → GW). |
| `categories` | `{ key: label }` — the categories named as their own cells, in the order listed. |
| `otherCategory` | The label of the cell that folds every other category ("Biomass, geothermal, tidal"). |
| `thread` | The category keys drawn in the accent. |
| `tipAt` | Optional: the share of the thread categories above which a member is tipped (default 0.5, "more than half"). |
| `drawCount` | Optional: how many members get their own cell, the largest first (default 12, between 3 and 20). |
| `wholeName` | The name of card 1's one block ("Europe"). |
| `unit` | The unit line above the treemap ("installed low-carbon capacity"). |
| `format(v)` | How a cell's value is printed, with its unit ("97.2 GW"). |
| `formatShare(v)` | How a percentage is printed in a cell ("43 %"). |
| `recordsText(n)` | How a count of records is printed in a cell ("2,069 plants"). |
| `restName(n)`, `tippedRestName(n)` | The two remainders' names ("25 other countries", "9 tipped countries"). |
| `cards` | `{ block(r), split(r), byMember(r), tipped(r), open(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.total` and `r.records`; card 2 `r.threadShare`; card 3 `r.largest.value`; card 4 `r.tippedCount` and `r.tippedShare`; card 5 `r.largest.threadShare` — each at any precision you write it with. |
| `notes` | `{ block(r), split(r), byMember(r), tipped(r), open(r), reading(r) }` — the short accent note in the header while each card is read. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read a treemap (area is the quantity, so each cell carries its figure; the colour follows a thread) and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the cells (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: an item has no member or category, or a negative
value; `thread` names no category; the largest member is tipped (the accent would mark the maximum);
no drawn member is tipped; there are not more members than `drawCount`; a card does not state its
figure; or a card, a note or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [PLACE, KIND, AMOUNT] = [col("place"), col("kind"), col("amount")];
const items = data.rows.map((r) => ({ member: r[PLACE], category: r[KIND], value: Number(r[AMOUNT]) / 1000 }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(r.topTwoShare) === 77`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r`, never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — member and category names included. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong cells in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
