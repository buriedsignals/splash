# Treemap (web) — what you write

The page is already designed: it comes from the worked example `proof/web-treemap-europe-capacity`
and the story's PALETTE.md and DIRECTION.md. The root view is one squarified cell per member, its
AREA its total, the thread cells in the accent, every cell named and valued where it has room; the
colours, the type and the INTERACTION are done — every cell answers hover, tap and Tab with its
share, its rank and what it is made of, and a "descend" control lets the reader step into one group:
the whole frame is laid out AGAIN over that group alone, so members too small to name at the root
get the room to be read, with a way back out. With JavaScript off the page is the complete static
root and the control still works. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
cells and the WORDS of this story's page. `render-beat.mjs` (already in the folder) lays out every
view, computes every share and rank, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `groups` | The groups a reader can descend into: `{ key, label }` — `key` names the group in `cells[].parts`, `label` is the pill's words. 2 to 6 groups. |
| `cells` | One `{ name, parts, counts, thread }` per member: `parts` = `{ <group key>: value }` in the unit the cells PRINT (e.g. GW, not MW) — a cell's area is the sum of its parts; `counts` = optional `{ <group key>: n }`, a second number per group (e.g. how many sites); `thread: true` on the cells the takeaway is about (drawn in the accent). When data.json has several rows per member, ADD THEM UP into one cell per member. |
| `format(v)` | The figure printed in a cell, with its unit ("34,6 GW"). |
| `detail(c)` | The tooltip sentence for a cell at the root. `c` is `{ name, value, share, rank, count, sites, thread, parts }`: `share` = percent of the whole; `rank` among `count` members; `sites` = the sum of its counts (null without counts); `parts` = `[{ group, value, share }]` (group = its label, share = percent of this cell). Start with the name. |
| `branchDetail(c)` | The tooltip sentence for a cell inside a group. `c` is `{ name, group, value, rank, count, share, ownShare, sites }`: `rank` among the `count` members of that group; `share` = percent of the group; `ownShare` = percent of the member's own total; `sites` = its count in that group. |
| `threadNote` | The line under the title saying what the coloured cells are, their count and weight computed. |
| `descendLabel` | The control's legend ("Descend into one source"). |
| `rootLabel` | The way back out's words ("All of Europe"). |
| `rootAnnounce` | What a screen reader hears for it. Must contain `rootLabel`. |
| `announce(o)` | What a screen reader hears for one group. Must contain `o.group`. |
| `note(o)` | The sentence shown under the control inside a group, at least six words. Must state `format(o.value)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what an area is, the scope, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: ask a cell, descend into a group. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the cells. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

`o` (one group) is `{ group, value, count, share, sites, sitesShare, leader, threadShare, threadCount }`:
`value` = the group's total; `count` = how many members hold some of it; `share` = percent of the
whole; `sites` / `sitesShare` = its counts and their percent of all counts (null without counts);
`leader` = `{ name, share }`, the group's largest member and its percent of the group; `threadShare`
= the percent of the group the thread cells hold; `threadCount` = how many thread cells there are.

A group that holds (nearly) all of the whole is refused: descending into it would show the root again.

## Reading the data

Rows of `data.json` are arrays; find columns by name and add the rows up per member and group.
Example with neutral names:

```js
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ITEM, GROUP, VALUE] = [col("item"), col("kind"), col("amount")];
const by = new Map();
for (const r of table.rows) {
  if (!by.has(r[ITEM])) by.set(r[ITEM], { name: r[ITEM], parts: {}, counts: {} });
  const c = by.get(r[ITEM]);
  c.parts[r[GROUP]] = (c.parts[r[GROUP]] ?? 0) + Number(r[VALUE]);
  c.counts[r[GROUP]] = (c.counts[r[GROUP]] ?? 0) + 1;
}
const cells = [...by.values()].map((c) => ({ ...c, thread: /* the takeaway's rule */ false }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`c`, `o`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Rows the takeaway's scope excludes (another region, an aggregate) are dropped BEFORE anything is summed, and the standfirst says what the set is.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong cells in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
