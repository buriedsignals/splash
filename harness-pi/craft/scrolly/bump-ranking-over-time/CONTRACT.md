# Bump — ranking over time (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-bump-emitter-rank` and
the story's PALETTE.md and DIRECTION.md. The rank rows, the lines, the playhead, the rings, colours,
type, layout and the CHOREOGRAPHY are done. Every year the members are ranked by value (the highest
is 1, at the top) and the top `maxRank` drawn; a line's height is its RANK, not its value, and a line
that leaves the top stops where it left. The graphic stays fixed while six cards of prose travel up
over it, and the reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the first year's ranking alone, each member named at its rank | `cards.start`, `notes.start` |
| 2 | the playhead advances to `stops[0]`; each time the subject passes a member above it, the crossing is ringed and captioned | `cards.first`, `notes.first`, `labels.crossing` |
| 3 | on to `stops[1]`, the next passes ringed | `cards.second`, `notes.second` |
| 4 | on to the last year, every line but the subject's stepping back | `cards.hold`, `notes.hold` |
| 5 | the members the subject passed that have since left the top drawn in ink, where they left written | `cards.exit`, `notes.exit`, `labels.exit` |
| 6 | the static plate, every crossing ringed | `limits`, `notes.reading` |

Only the subject's passes are ringed. With JavaScript off the page shows card 6's picture and every
card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows, the subject, the two stops and the WORDS of this story's cards. `render-beat.mjs` (already in
the folder) computes every rank and pass, checks your words against them, draws the page, checks it
in a real browser and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `rows`. A pass `p` is
`{ name, label, year, from, to }` (the year the subject went above that member, and the subject's
rank before and after); a departed member `d` is `{ name, label, lastYear, maxRank }`. `label` is the
name through `display()`.

| Field | What it is |
|---|---|
| `r.first`, `r.last` | the first and the last year |
| `r.stops` | your two stops |
| `r.maxRank` | how many ranks are drawn |
| `r.members` | how many members ever reach the drawn ranks |
| `r.subject` | `{ name, label, from, to, atStopA, atStopB }`: its rank the first year, the last year, at each stop |
| `r.heldFrom` | the first year from which the subject has held its last rank without a break |
| `r.passes` | every pass, in order |
| `r.passesFirst`, `r.passesSecond`, `r.passesLater` | the passes up to `stops[0]`, up to `stops[1]`, and after |
| `r.departed` | the members the subject passed that have since left the drawn ranks |
| `r.leaderFirst`, `r.leaderLast` | the rank-1 member the first and the last year; `r.leaderLast.since` is the first year it held rank 1 (or `null` if the leader never changed) |
| `r.rankOf(name, year)` | a member's rank that year (0 if outside the drawn ranks) |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, year, value }` per member per year, from `data.json` — EVERY member (leave out aggregates such as "World" or "Europe"), every year. The highest value ranks 1. |
| `subject` | The `name` of the member the takeaway is about. It must be within the drawn ranks every year. Its line is drawn in the accent. |
| `maxRank` | Optional (default 10, between 5 and 12): how many ranks are drawn. |
| `stops` | `[a, b]`: the two years cards 2 and 3 carry the playhead to, between the first and the last year. |
| `display(name)` | Optional: how a member's name is printed (e.g. translated). Default: the name as in the data. |
| `unit` | The unit line above the plot ("world rank, annual CO₂ emissions"). |
| `cards` | `{ start(r), first(r), second(r), hold(r), exit(r) }` — the prose of cards 1 to 5. Card 1 must state `r.subject.from`; card 2 the `label` and `year` of every pass in `r.passesFirst`; card 3 those of `r.passesSecond` and `r.subject.atStopB`; card 4 `r.subject.to`; card 5 the `label` and `lastYear` of every member in `r.departed`. |
| `notes` | `{ start(r), first(r), second(r), hold(r), exit(r), reading(r) }` — the short accent note in the header while each card is read. |
| `labels` | `{ crossing(p), exit(d) }`: the caption at a ringed pass (must state `p.year`: "passes Ukraine · 1992"), and the words where a departed line stops (must state `d.lastYear`: "leaves the top 10 after 1995"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: the height is a RANK, not a value; what is ranked; the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the lines (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title or a card's words (it receives `r`). |

The render refuses, saying what to change, when: a member has two values in one year; a year is
missing; a year ranks fewer members than `maxRank`; the subject leaves the drawn ranks in some year;
`stops` are not two years in order inside the span; the subject passes no one; none of the members it
passed has left the drawn ranks (card 5 has nothing to draw); a card or a label does not state what its
picture shows; or a card, a note, a label or the alt states a number that is no rank, count or year of
this ranking.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("region"), col("year"), col("arrivals")];
const rows = data.rows
  .filter((r) => r[NAME] !== "Total")
  .map((r) => ({ name: r[NAME], year: Number(r[YEAR]), value: Number(r[VALUE]) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every rank, count and year in a card, a note, a label or the alt is taken from `r`, never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a caption over a name, a card cut, a wrong rank), fix `beat.mjs` with a
  small `edit_file`, render and look again.
