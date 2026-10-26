# Pie and donut (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-donut-world-co2-share`
and the story's PALETTE.md and DIRECTION.md. Rings, colours, type, layout and the CHOREOGRAPHY are
done. The graphic stays fixed while six cards of prose travel up over it, and the reader's scroll moves
the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the first state: one ring for the whole, an arc per drawn part | `cards.whole` |
| 2 | the two parts the takeaway names kept (the subject in the accent), the others stepping back | `cards.pair` |
| 3 | the arcs turn to the second state's shares | `cards.turn` |
| 4 | the ring's area follows the whole's growth, the first state's ring left as a dashed outline | `cards.grow`, `notes.grow` |
| 5 | the one part whose share FELL while its amount ROSE, alone, its first-state arc beside it | `cards.trap`, `notes.trap` |
| 6 | the ring breaks into one ring per part: outer arc the first state, inner arc the second | `limits`, `notes.split` |

One full turn is 100 % of the whole on every ring. The page itself prints every share as `32,9 %`,
every amount as `12,2 Gt` and the trap's label as `1,5 puis 1,7 Gt`: **this kit draws French stories
whose amounts are in gigatonnes**, and refuses any other. With JavaScript off the page shows card 6's
picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `rings` and wholes:

| Field | What it is |
|---|---|
| `r.from`, `r.to` | the two states, as you gave them |
| `r.count` | how many rings are drawn |
| `r.wholeBefore`, `r.wholeAfter` | your wholes |
| `r.growth` | the whole's change, in percent (51 means +51 %) |
| `r.rings` | every ring `{ key, name, before, after, shareBefore, shareAfter }` — shares in percent of the whole |
| `r.subject`, `r.counterpart` | the two rings card 2 keeps, same shape |
| `r.trap` | the ring card 5 is about (share fell, amount rose), same shape |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rings` | One `{ key, name, before, after }` per drawn part, 3 to 8: the ABSOLUTE amounts in gigatonnes at the two states, zero or more, from `data.json`. The render computes the shares. |
| `wholeBefore` / `wholeAfter` | The whole each share is of, at each state, COMPUTED as the total of every part (every row of the partition, not only the rings drawn). It must have grown. |
| `subject` | The `key` of the ring the takeaway is about (in the accent). |
| `counterpart` | The `key` of the other ring the takeaway names. |
| `trap` | Optional: the `key` of the ring card 5 is about — one whose share fell while its amount rose, not the subject or the counterpart. Needed only when several rings qualify. |
| `from` / `to` | The two states ("2000", "2023"). |
| `amountUnit` | `"Gt"` — the unit the page prints after every amount. |
| `unit` | The line above the ring, with `{year}` where the state goes ("part du CO₂ mondial en {year}, un tour complet = 100 %"). |
| `cards` | `{ whole(r), pair(r), turn(r), grow(r), trap(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.wholeBefore`; card 2 `r.subject.shareBefore` and `r.counterpart.shareBefore`; card 3 `r.subject.shareAfter` and `r.counterpart.shareAfter`; card 4 `r.wholeAfter` and `r.growth`; card 5 `r.trap.shareBefore`, `r.trap.shareAfter`, `r.trap.before` and `r.trap.after`. One decimal with a comma (`32,9 %`, `24,7 Gt`); the growth may be rounded (`+51 %`). |
| `notes` | `{ grow(r), trap(r), split(r) }` — the header note while the ring grows, while the trap is alone, and on the last card ("extérieur 2000 · intérieur 2023"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how the six rings read and what the figures leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the plate (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 4. |
| `lang` | Optional: `"fr"`. Default: STORYBOARD.md's `language` (it must be French). |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the story is not French or the amounts are not in
`Gt`; the rings add up to more than a whole; the whole did not grow; no ring (or, without `trap`,
more than one) has a share that fell while its amount rose; a card does not state its figures; or a
card, a note or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const all = data.rows.map((r) => ({ key: r[col("code")], name: r[col("place")], before: Number(r[col("amount_a")]) / 1e9, after: Number(r[col("amount_b")]) / 1e9 }));
const wholeBefore = all.reduce((s, p) => s + p.before, 0);
const wholeAfter = all.reduce((s, p) => s + p.after, 0);
const rings = [...all].sort((a, b) => b.after - a.after).slice(0, 6);
```

Leave out aggregate rows (a "World" row is the whole, not a part).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r`, never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong ring in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
