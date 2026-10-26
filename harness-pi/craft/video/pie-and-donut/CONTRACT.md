# Pie and donut (video) — what you write

The video is already designed: it comes from the worked example `proof/video-donut-world-co2-share`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the WHOLE at
the first state is one ring at the centre of the frame, its circumference its total, the rings' arcs
traced end to end clockwise from twelve o'clock, the two `named` members beside their arcs with their
shares, the whole's total in the hole; a copy of the ring grows out of it to the second state's total,
every arc's length its value on one scale, and the two names come back beside the grown arcs; then the
whole splits into one ring per member, each pair of arcs (first state inside, second outside) flying
to its own ring and keeping its angle — one turn is the whole on every ring — the second-state share in
each hole, the name and both values under each ring; the subject's number is ringed and the credit
comes in on one line. There is no standfirst and no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes every
ring's shares, lays the frames out, renders ten stills, prints `look at: <png>`, then renders the mp4
(about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rings` | One `{ key, name, before, after }` per entity, 2 to 8 (6 fill a landscape row): the ABSOLUTE values (tonnes, euros, people) at the two states, zero or more, from `data.json`. render-beat computes the shares and draws the rings largest second-state value first. |
| `wholeBefore` / `wholeAfter` | The whole each share is of, at each state, COMPUTED as the total of every part (every row of the partition, not only the rings drawn). The rings must be parts of it, so their values cannot add up to more. |
| `subject` | The `key` of the ring the takeaway is about; its number is ringed at the end. |
| `named` | The TWO `key`s named beside their arcs on the whole's ring: the subject and the member the takeaway compares it with. |
| `from` / `to` | The two states ("2000", "2023"), printed beside the whole's totals and each ring's values. |
| `formatShare(v)` | How a share in per cent is printed ("32,9 %"). Enough decimals that the shares differ. Returns a string. |
| `formatAbsolute(v)` | How an absolute value is printed, unit included ("12,2 Gt"). Returns a string. |
| `fewerNote(n)` | Optional: the sentence the credit leads with when a narrow frame can only draw the first `n` rings ("The 4 largest emitters of 2023"). Needed only when the render says so. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `evidenceLevels` | Optional, 4. |
| `check({ rings, wholeGrowth })` | Throws if the data no longer supports the title. Each ring carries `code` (its key), `shareBefore`, `shareAfter` (per cent), `gtBefore`, `gtAfter` (the absolute values); `wholeGrowth` is the whole's change in per cent. |

The render refuses, saying what to change, when:
- the rings add up to more than a whole (the wholes are not the total of every part);
- `named` is not two keys including the subject;
- the whole fell between the two states (this video grows the second ring out of the first; offer the
  static format);
- `formatShare`, `formatAbsolute` or `fewerNote` throws or does not return a string;
- a share is so small its arc is under three pixels, a name or a value runs wider than its ring's slot,
  or a number does not fit its ring's hole (shorten the words, or draw fewer rings);
- the frame holds fewer rings than given and `fewerNote` is missing.

## Reading the data

Rows are arrays; find columns by name (neutral names here):

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const all = data.rows.map((r) => ({ key: r[col("code")], name: r[col("place")], before: Number(r[col("amount_start")]), after: Number(r[col("amount_end")]) }));
const wholeBefore = all.reduce((s, c) => s + c.before, 0);
const wholeAfter = all.reduce((s, c) => s + c.after, 0);
const rings = [...all].sort((a, b) => b.after - a.after).slice(0, 6);
```

Leave out aggregate rows (a "World" or "Total" row is a whole, not a part) — or use it as the whole.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision ("a quarter": `Math.round(100 / share) === 4`), never with strict equality on the raw division.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the rings side by side, the subject's number ringed). If the render refuses, read its
  message and fix `beat.mjs`. If the picture is wrong (the wrong ring ringed, a wrong share, a word
  cut), fix `beat.mjs` with a small `edit_file`, render and look again.
