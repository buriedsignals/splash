# Radar (spider, scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-radar-electricity-mix`
and the story's PALETTE.md and DIRECTION.md. The wheel, polygons, colours, type, layout and the
CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose travel up over it, and the
reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the two items' totals as bars; the wheel waits | `cards.totals`, `notes.totals` |
| 2 | the subject's polygon (in the accent) traced spoke by spoke, clockwise from twelve o'clock | `cards.subject`, `notes.subject` |
| 3 | the other item's polygon over it | `cards.other`, `notes.other` |
| 4 | every spoke travels to its family's angle, its share to the family's sum | `cards.families`, `notes.families` |
| 5 | the ring tightens to `tightCeiling`; a share past it rests on the ring, marked open | `cards.scale`, `notes.scale` |
| 6 | the two polygons on the full ceiling, every spoke labelled with both shares | `limits`, `notes.reading` |

Each spoke is one part's SHARE of the item's own total (every item's spokes add up to 100 %). The
outer ring is the largest share rounded up to ten. With JavaScript off the page shows card 6's
picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render. Index `0` is the subject, `1` the other item.

| Field | What it is |
|---|---|
| `r.items`, `r.totals` | your items and totals |
| `r.ratio` | the larger total ÷ the smaller |
| `r.spokeCount` | how many spokes |
| `r.spokes` | `[{ key, label, family, shares: [subject, other] }]`, clockwise |
| `r.shares[key]` | a spoke's two shares by its key: `r.shares.part_a[0]` |
| `r.families` | `[{ label, shares: [subject, other], longestFor }]` — each family's summed share; `longestFor` lists the items (0, 1) whose largest family it is |
| `r.subjectTop`, `r.otherTop` | each item's largest spoke `{ key, label, share }` |
| `r.ceiling` | the outer ring, in % |
| `r.tight` | your `tightCeiling` |
| `r.overTight` | the shares past the tight ring, `[{ key, label, item, share }]` |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `items` | The two item names as printed, the SUBJECT FIRST (`["Item A", "Item B"]`), in the order of every spoke's `shares` and of `totals`. |
| `subject` | The item the takeaway is about, spelled exactly as `items[0]`. It is drawn in the accent. |
| `totals` | Each item's total (the whole its shares are of), in the order of `items`, from `data.json`. |
| `spokes` | One `{ key, label, family, shares }` per spoke (5 to 12), clockwise from twelve o'clock. `shares` = one % per item, COMPUTED as value / (sum of that item's spoke values) × 100. Spokes of one family sit side by side. |
| `families` | The names of the 2 to 4 groups, in order (`["renewables", "nuclear", "fossil"]`); each spoke's `family` is an index into it. |
| `tightCeiling` | The ring card 5 tightens to, in % — below the outer ring, above most shares (e.g. 30). |
| `format(v)` | How a share is printed beside a spoke, without `%` ("67,7"). |
| `formatTotal(v)` | How a total is printed by its bar, with its unit ("561,8 TWh"). |
| `formatCeiling(v)` | How a ring's value is printed ("70 %"). |
| `cards` | `{ totals(r), subject(r), other(r), families(r), scale(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state both totals; card 2 `r.subjectTop.share`; card 3 `r.otherTop.share`; card 4 both items' share of the family that is the other item's largest; card 5 `r.tight`. |
| `notes` | `{ totals(r), subject(r), other(r), families(r), scale(r), reading(r) }` — the short accent note in the header while each card is read ("outer ring: 30 %"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what one spoke is a share of, the spoke order, what the figures leave out — the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the two shapes (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the subject is not `items[0]`; an item's shares do
not add up to 100; a family's spokes are not side by side; no share passes `tightCeiling` or too few
fit inside it; a card does not state its figure; or a card, a note or the alt states a number no
figure of `r` rounds to (a share, a sum of two spokes of one family, a family's share, a total, a ring).

## Reading the data

Rows are arrays; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const PARTS = [{ column: "part_a", label: "A", family: 0 }, { column: "part_b", label: "B", family: 0 }, { column: "part_c", label: "C", family: 1 }];
const rows = ["Place 1", "Place 2"].map((place) => {
  const row = data.rows.find((r) => r[col("place")] === place && Number(r[col("year")]) === 2024);
  const total = PARTS.reduce((s, p) => s + Number(row[col(p.column)]), 0);
  return { total, shares: PARTS.map((p) => (Number(row[col(p.column)]) / total) * 100) };
});
const spokes = PARTS.map((p, i) => ({ key: p.column, label: p.label, family: p.family, shares: rows.map((r) => r.shares[i]) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` for shares), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (the items swapped, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
