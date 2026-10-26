# Marimekko (mosaic plot) (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-marimekko-electricity-mix`
and the story's PALETTE.md and DIRECTION.md. One column per entity, as wide as its total; inside it
the bands stacked bottom to top in `bandOrder`, each as tall as its share, in one ramp of the accent
(darkest at the bottom); the bands named once at the right. Colours, type, layout and the
CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose travel up over it, and the
reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | equal columns, each 100 % | `cards.mix` |
| 2 | each column takes the width of its total (written under it): an area becomes a quantity | `cards.width`, `notes.grand` |
| 3 | the `tracked` band alone, every other band stepping back | `cards.tracked`, `notes.tracked` |
| 4 | the tracked bands leave their columns for one column of their own, area kept | `cards.stack`, `notes.stack`, `stackLabel` |
| 5 | back in their columns, every band named | `cards.bands` |
| 6 | the shares written inside the bands that hold them | `limits`, `notes.grand` |

The columns are drawn widest first. With JavaScript off the page shows card 6's picture and every
card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
columns and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) adds the bands
into totals, computes the tracked band's total, share and holders, checks your words against them,
draws the page, checks it in a real browser and prints `look at: <png>` (card 1), with one PNG per
card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `columns`:

| Field | What it is |
|---|---|
| `r.count` | how many columns |
| `r.columns` | every column reading, widest first: `{ key, label, index, total, values, trackedValue, trackedShare }` (`trackedShare` = the tracked band's share of that column, in %) |
| `r.grand` | the whole: every column's total added |
| `r.largest`, `r.smallest` | the widest and the narrowest column |
| `r.trackedTotal` | the tracked band added over every column |
| `r.trackedShare`, `r.trackedPercent` | `r.trackedTotal ÷ r.grand`, as a fraction and in % |
| `r.holders` | the columns by how much of the tracked band they hold, largest first: `[{ key, label, value, share }]` (`share` = of the tracked total, in %) |
| `r.topTwoShare` | the share of the tracked total the first two holders hold, in % (card 4) |
| `r.bands`, `r.trackedBand` | `[{ key, label }]` in `bandOrder` (bottom first); the tracked band |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `columns` | One `{ key, label, values }` per column (2 to 8): `label` is the name printed above it, `values` an object giving EVERY band's value by band key (`0` where there is none), from `data.json`. Do not give totals: the render adds the bands. No column may be under 3 % of the whole. |
| `bandOrder` | The bands bottom to top, 2 to 10: `[{ key, label }]`. `label` is printed in the gutter. |
| `tracked` | The `key` of the band the takeaway is about (put it at the bottom of `bandOrder`). |
| `unit` | Optional: the unit of the values ("TWh"), written after a holder's value in the gathered column. |
| `heightName` | The words above the plot naming what a height is ("share of the country's generation"). |
| `widthName` | The words under the totals naming what a width is ("width: total generation, in TWh"). |
| `format(v)` | How a column total is printed under it, in the story's language. |
| `percent(share)` | Optional: how a band's share (0–1) is printed inside it; return `""` for a share too small to print (default: whole per cent from 9.5 %, one decimal from 0.5 %). |
| `cards` | `{ mix(r), width(r), tracked(r), stack(r), bands(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must name the bottom and the top band (`r.bands[0].label`, `r.bands.at(-1).label`); card 2 the widest and the narrowest column with `format()` of their totals; card 3 the tracked band and its share of the whole, `Math.round(r.trackedPercent)`; card 4 the names of the first two holders. |
| `notes` | `{ grand(r), tracked(r), stack(r) }` — the short accent note in the header: `grand` on cards 2 and 6 (the whole), `tracked` on card 3, `stack` on card 4. |
| `stackLabel(r)` | The words over the gathered column on card 4; must name the tracked band ("coal 12 %"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: that the WIDTH is the total and the height the mix, and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there are fewer than 2 or more than 10 bands, or
fewer than 2 or more than 8 columns; two bands or two columns share a key; the tracked key is not a
band; a column lacks a band's value; a value is negative; a column totals 0 or is under 3 % of the
whole; the tracked band is 0 everywhere; a card or the stack label does not state what it owes; or a
card, a note, the stack label or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names (one row per entity, one column
per band):

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const BANDS = [{ key: "part_a", label: "A" }, { key: "part_b", label: "B" }, { key: "part_c", label: "C" }];
const [NAME] = [col("region")];
const columns = data.rows.map((r) => ({
  key: r[NAME],
  label: r[NAME],
  values: Object.fromEntries(BANDS.map((b) => [b.key, Number(r[col(b.key)])])),
}));
```

Every band column of the data must be in `bandOrder`, or the whole is wrong.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a label or the alt is taken from `r`, never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine; "100 %" is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a card cut, a wrong number, a band in the wrong place), fix `beat.mjs` with
  a small `edit_file`, render and look again.
