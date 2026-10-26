# Sankey (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-sankey-electricity-sources`
and the story's PALETTE.md and DIRECTION.md. Rails, ribbons, colours, type, layout and the
CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose travel up over it, and the
reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the two rails alone, the same total on both | `cards.rails`, `notes.rails` |
| 2 | the tracked source's ribbons only (the tracked flow in the accent), each one's share of the source written at the target rail | `cards.tracked`, `notes.tracked` |
| 3 | every other ribbon | `cards.web`, `notes.web` |
| 4 | read back from the tracked flow's target: its ribbons alone, each one's share of it written | `cards.first`, `notes.first` |
| 5 | read back from a second target the same way | `cards.second`, `notes.second` |
| 6 | the plate, every node named with its total | `limits` |

Every node's total is COMPUTED from the flows, so the ribbons out of a node always add up to it, on
both rails. The targets are drawn largest first. With JavaScript off the page shows card 6's picture
and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your nodes and flows:

| Field | What it is |
|---|---|
| `r.grand` | the total of every flow (each rail's total) |
| `r.sourceCount`, `r.targetCount`, `r.flowCount` | how many sources, targets and ribbons |
| `r.sources` | `[{ key, label, total }]`, in your order |
| `r.targets` | `[{ key, label, total }]`, largest first |
| `r.ranked` | the sources, largest first |
| `r.tracked` | `{ from, to, sourceLabel, targetLabel, sourceTotal, value, ofSource, ofTarget }` — the tracked flow: its value, its share of its source and of its target, in % |
| `r.recipients` | the targets the tracked source reaches, largest first, `[{ key, label, value, share }]` (`share` = % of the source) |
| `r.others` | the same without the tracked flow's own target |
| `r.first`, `r.second` | the two targets cards 4 and 5 read back from: `{ key, label, total, trackedShare, mix }` — `trackedShare` is the tracked source's % of that target; `mix` is every source into it, largest first, `[{ key, label, value, share }]` (`share` = % of the target) |
| `r.into[targetKey]` | the `mix` of any target |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `sources` | The left rail, top to bottom, 2 to 12: `[{ key, label }]`. Order them by something that means something (a family, a size), not the order of the columns. |
| `targets` | The right rail, 2 to 12: `[{ key, label }]` (drawn largest first). A target's `key` must differ from every source's. |
| `flows` | One `{ from, to, value }` per ribbon: `from` a source key, `to` a target key, `value` ≥ 0. One flow per pair. |
| `tracked` | `{ from, to }` — the ONE flow the takeaway is about (above zero). Drawn in the accent. |
| `second` | The key of the target card 5 reads back from (not `tracked.to`). |
| `unit` | The line above the rails ("electricity generation 2024, in TWh"). |
| `format(v)` | How a node total or a flow is printed ("455,1"). |
| `formatShare(v)` | How a share of a target is printed at the source rail on cards 4–5 ("28,5 %"). Shares under 2 % are not written. |
| `formatWholeShare(v)` | Optional: how a tracked ribbon's share of its source is printed on card 2 (default `` `${Math.round(v)} %` ``). |
| `cards` | `{ rails(r), tracked(r), web(r), first(r), second(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.grand`; card 2 `r.tracked.sourceTotal`, `r.tracked.value` and `r.tracked.ofSource`; card 3 `r.flowCount`; card 4 `r.first.trackedShare`; card 5 `r.second.mix[0].share` (the second target's largest source). |
| `notes` | `{ rails(r), tracked(r), web(r), first(r), second(r) }` — the short accent note in the header while each card is read. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what a ribbon is, the unit and scope, what the figures leave out — the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text: what flows where, and the tracked flow's share (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a rail holds fewer than 2 or more than 12 nodes; a
flow is negative, doubled, or names a key that is not a node; a node has no flow; `tracked` is not a
flow above zero; `second` is not another target; a card does not state its figure; or a card, a note
or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name, never by position. Example with neutral names, one column per
source and one row per target:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const SOURCES = [{ key: "part_a", label: "A" }, { key: "part_b", label: "B" }];
const rows = data.rows.filter((r) => Number(r[col("year")]) === 2024);
const targets = rows.map((r) => ({ key: r[col("place")], label: r[col("place")] }));
const flows = SOURCES.flatMap((s) => rows.map((r) => ({ from: s.key, to: r[col("place")], value: Number(r[col(s.key)]) })));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` / `formatShare()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (the wrong ribbon in the accent, a card cut, a wrong number), fix `beat.mjs`
  with a small `edit_file`, render and look again.
