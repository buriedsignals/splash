# Lollipop (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-lollipop-co2-per-person`
and the story's PALETTE.md and DIRECTION.md. One slot per entity, two stems from zero in each (the
earlier state a lighter tint, the later state in the accent), every value written above its head;
the subject's later head is ringed and its name set in the accent. Colours, type, layout and the
CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose travel up over it, and the
reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the earlier stems grow from zero, one per pair | `cards.before` |
| 2 | the later stems grow beside them | `cards.after` |
| 3 | the subject and the `other` pair slide to the centre, the rest leave | `cards.pair` |
| 4 | the two ratios measured between them, `other ÷ subject`, earlier then later | `cards.ratio`, `notes.ratio`, `beforeRatio`, `afterRatio` |
| 5 | every pair back, each with a triangle and its change in per cent | `cards.change`, `notes.change` |
| 6 | the plate stands | `limits`, `notes.share` |

The `rule` (how the pairs were chosen) is printed under the plate. With JavaScript off the page shows
card 6's picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
pairs and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
change and both ratios, checks your words against them, draws the page, checks it in a real browser
and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `pairs`:

| Field | What it is |
|---|---|
| `r.count` | how many pairs |
| `r.pairs` | every pair reading, in your order: `{ key, name, index, before, after, change, isSubject }` (`change` = the change in per cent, `(after − before) ÷ before × 100`) |
| `r.subject`, `r.other` | the readings of your `subject` and `other` |
| `r.ratioBefore`, `r.ratioAfter` | `other ÷ subject`, at the earlier and the later state (card 4) |
| `r.grew` | `subject.after ÷ subject.before` (how many times the subject's value multiplied) |
| `r.rose`, `r.fell` | the pairs whose value rose, fell |
| `r.share` | your `share`, or `null` |
| `r.max` | the top of the value scale |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `pairs` | One `{ key, name, before, after }` per entity, 2 to 8: `before` is the value at the first state, `after` at the second, `name` the label printed. Values are zero or more, and `before` is not 0 (the change in per cent is computed from it). In the order drawn. |
| `subject` | The `key` of the pair the takeaway is about. |
| `other` | The `key` of the pair the subject is compared with on cards 3 and 4. |
| `from` / `to` | The two states, printed under each pair's stems (`2000`, `2023`). |
| `share` | Optional: a number COMPUTED from `data.json` that a note or the limits states (e.g. the pairs' share of the world total, in %). |
| `unit` | The measure and its unit, printed above the plot ("tonnes of CO₂ per person"). |
| `rule` | One sentence (a string, or a function of `r`) printed under the plate saying how the pairs were chosen, with the count computed. |
| `format(v)` | How a value and a ratio are printed, in the story's language. Enough decimals that close values differ. |
| `formatChange(v)` | Optional: how the change in per cent is printed, sign first (default `+198 %` / `−33 %`). |
| `cards` | `{ before(r), after(r), pair(r), ratio(r), change(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.subject.before)` and `format(r.other.before)`; card 2 `format(r.subject.after)` and `format(r.other.after)`; card 3 the names of the subject and the other pair; card 4 `format(r.ratioBefore)` and `format(r.ratioAfter)`; card 5 the name of every pair in `r.rose` and `r.fell`. |
| `notes` | `{ ratio(r), change(r), share(r) }` — the short accent note in the header on cards 4, 5 and 6. |
| `beforeRatio(r)` / `afterRatio(r)` | The ratio labels drawn on card 4 ("× 7.5"); each must state its ratio through `format()`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read the stems, the unit, the scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 4. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there are fewer than 2 or more than 8 pairs; two
pairs share a key; the subject or the other pair is not a pair (or they are the same); a value is
negative; a `before` is 0; a card or a ratio label does not state its figure; or a card, a note, the
rule or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names (one row per entity, a column per
state):

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [KEY, NAME, A, B] = [col("id"), col("region"), col("value_start"), col("value_end")];
const pairs = data.rows
  .map((r) => ({ key: r[KEY], name: r[NAME], before: Number(r[A]), after: Number(r[B]) }))
  .sort((a, b) => b.after - a.after)
  .slice(0, 6);
```

If you choose the pairs by a rule (the largest totals, say), compute it from the columns and say it
in `rule`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a label, the rule or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong pair ringed, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
