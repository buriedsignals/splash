# Grouped bar (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-wind-vs-solar` and the
story's PALETTE.md and DIRECTION.md. One group per category, two bars per group (the first series in
the accent, the second in a muted step, named once in a key), every value written above its bar.
Colours, type, layout and the CHOREOGRAPHY are done. The graphic stays fixed while six cards of
prose travel up over it, and the reader's scroll moves the picture continuously from one card's
state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the first series alone, one bar per group | `cards.first`, `notes.first` |
| 2 | the second series grows beside it | `cards.second`, `notes.second` |
| 3 | every pair collapses into its gap (first − second), either side of zero, in the colour of the series that leads | `cards.gap`, `notes.gap` |
| 4 | the groups travel from their own order to the order of their gap, largest first | `cards.sort`, `notes.sort` |
| 5 | the EARLIER gap drawn as a dashed ghost behind each bar, its value written | `cards.earlier`, `notes.earlier` |
| 6 | the pairs stand again, in gap order, every value written | `limits`, `notes.reading` |

The subject's name is set in bold. With JavaScript off the page shows card 6's picture and every
card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
gap and order, checks your words against them, draws the page, checks it in a real browser and
prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `groups`:

| Field | What it is |
|---|---|
| `r.count` | how many groups |
| `r.groups` | every group reading, in your order (below) |
| `r.byGap` | the group readings sorted by gap, largest first (card 4's order) |
| `r.subject` | the reading of your `subject` |
| `r.leader`, `r.trailer` | the group with the largest gap, the smallest (first and last after card 4's sort) |
| `r.topFirst`, `r.topSecond` | the group with the largest first value, the largest second value |
| `r.firstLeading`, `r.secondLeading` | the groups where the first series is larger, where the second is |
| `r.widened` | `r.subject.gap ÷ r.subject.earlierGap` (how many times the gap grew), or `null` |

A group reading is `{ name, index, first, second, gap, earlierFirst, earlierSecond, earlierGap,
firstRank, secondRank, gapRank, widened, isSubject }`: `gap` = `first − second`; `earlierGap` =
`earlierFirst − earlierSecond`; ranks are 1 for the largest.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `groups` | One `{ name, first, second, earlierFirst, earlierSecond }` per category (2 to 12): `name` is printed under the group; `first` and `second` are the two series' values (zero or more); `earlierFirst` / `earlierSecond` the same two at an earlier date (card 5's ghost). |
| `firstName` / `secondName` | The two series' names, printed in the key. The first series is drawn in the accent. |
| `firstLeads` / `secondLeads` | The two sides of zero on card 3, named ("wind leads", "solar leads"). |
| `subject` | The `name` of the group the takeaway is about (e.g. the exception). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `signed(v)` | How a gap is printed, with its sign ("+13.6", "−7.0"). |
| `cards` | `{ first(r), second(r), gap(r), sort(r), earlier(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.subject.first)`; card 2 `format(r.subject.second)`; card 3 the subject's gap; card 4 the leader's gap; card 5 the subject's earlier gap (a gap is looked for without its sign, so `signed()` passes). |
| `notes` | `{ first(r), second(r), gap(r), sort(r), earlier(r), reading(r) }` — the short accent note in the header while each card is read (a few words: "wind's share, 2024, in %"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the values are, the period, how the groups are ordered, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the groups and the exception (a string, or a function of `r`). |
| `declaredSequence` | Optional: leave it out when the categories have no order of their own (countries: cards 1–3 sort them alphabetically); give a name ("year", "age band") when they do, and cards 1–3 keep your order. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a value is negative; two groups share a name; the
subject is not a group; a card does not state its figure; or a card, a note or the alt states a
number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names (one row per category per year):

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, A, B] = [col("region"), col("year"), col("series_a"), col("series_b")];
const row = (name, year) => data.rows.find((r) => r[NAME] === name && r[YEAR] === year);
const names = [...new Set(data.rows.map((r) => r[NAME]))];
const groups = names.map((n) => ({
  name: n,
  first: Number(row(n, 2024)[A]), second: Number(row(n, 2024)[B]),
  earlierFirst: Number(row(n, 2015)[A]), earlierSecond: Number(row(n, 2015)[B]),
}));
```

If the takeaway is about shares, compute them (a column divided by the sum of every part) and draw
the shares, as `beat.example.mjs` does.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` or `signed()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong group in bold, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
