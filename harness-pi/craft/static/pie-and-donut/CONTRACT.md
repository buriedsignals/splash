# Pie and donut — what you write

The rings, the two concentric arcs, the share in each ring's centre, the absolute values under each
ring, the type, the colours and the layout are already done: they come from the worked example
`proof/static-donut-world-co2-share` and the story's PALETTE.md and DIRECTION.md. You write ONE file,
`beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's plate
says. `render-beat.mjs` (already in the folder) computes the shares and draws them.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

WHAT THIS KIT DRAWS — read it before choosing it. This is the worked example's form, not a single
pie sliced into parts: ONE RING PER ENTITY (2 to 8, side by side), where one full turn is 100 % of
ONE common whole on every ring. Each ring carries two concentric arcs — the entity's share at a first
state (outer, muted) and at a second state (inner, accent) — its later share in the centre, and its
absolute value at both states underneath (because a share that shrinks can be a number that grows
when the whole grows). The subject's centre number is ringed. A one-state "breakdown of a whole into
parts" is not what this kit draws; for that, a bar chart is the honest choice anyway.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rings` | One `{ key, name, before, after }` per entity, 2 to 8: the ABSOLUTE values (tonnes, euros, people) at the two states, zero or more, from `data.json`. render-beat computes the shares. |
| `wholeBefore` / `wholeAfter` | The whole each share is of, at each state, COMPUTED as the total of every part (every row of the partition, not only the rings drawn). The rings must be parts of it, so their values cannot add up to more. |
| `subject` | The `key` of the ring the takeaway is about. |
| `from` / `to` | The two states ("2000", "2023"), printed under each ring beside its absolute values. |
| `formatShare(v)` | How a share in per cent is printed in a ring's centre ("32,9 %"). Enough decimals that the shares differ. |
| `formatAbsolute(v)` | How an absolute value is printed under a ring, unit included ("12,2 Gt"). |
| `unit` | The line above the rings: what a turn is ("share of world CO₂ — one full turn = 100 %"). |
| `wholeNote` | The line under the rings giving the whole at both states, computed ("World: 24.7 Gt in 2000, 37.0 Gt in 2023."). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what a ring and each arc are, that a turn is 100 % of the same whole on every ring, how the whole changed, the limits the journalist named. |
| `reading` | One or two "how to read" sentences, longest first (the gap between the arcs is the change of share, not of the absolute value). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `{ rings, wholeGrowth }`). |
| `evidenceLevels` | 4. |
| `check({ rings, wholeGrowth })` | Throws if the data no longer supports the title. Each ring carries `code` (its key), `shareBefore`, `shareAfter` (per cent), `gtBefore`, `gtAfter` (the absolute values); `wholeGrowth` is the whole's change in per cent. |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const all = data.rows.map((r) => ({ key: r[col("code")], name: r[col("place")], before: Number(r[col("value_start")]), after: Number(r[col("value_end")]) }));
const wholeBefore = all.reduce((s, c) => s + c.before, 0);
```

Leave aggregate rows (a "World" or regional total) out of `all` before adding it up, or the whole
counts them twice. If the table holds the whole as its own row, you may read it from there instead.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(100 / shareBefore) === 4` for "a quarter", or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses ("the smallest arc … is under three pixels", "the hole cannot hold its own number"), draw
  fewer rings or add shorter title / standfirst forms. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
