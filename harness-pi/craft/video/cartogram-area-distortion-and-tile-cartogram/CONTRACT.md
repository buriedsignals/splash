# Tile cartogram (video) — what you write

The video is already designed: it comes from the worked example `proof/video-cartogram-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. 18.3 s at 30 fps. It opens on a title card (eyebrow +
title); then the LIVE MapTiler map of Europe, each country taking its class one class after another
while the key arrives; at the left, THE BALANCE — a 0–100 % beam on which every country is a column at
its share, its height its territory. Every country but the one taking the most room steps back, that
one is named with its share, and the balance's pivot is set under the mean BY AREA (what a choropleth
shows). Then the map gives way to its own shapes, which travel onto one equal tile each while the
balance's weights become one each and a live pivot slides to the mean BY COUNTRY; the codes land on
the tiles; then the credit. The argument: the same data gives two means depending on what counts as
one. There is no standfirst and no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes every
country's territory (equal-area, from the kit's frozen shapes), both means, the widest country, the
tiles, measures the live map, places the key, the name and the credit, renders twelve stills, prints
`look at: <png>`, then renders the mp4 (about six minutes; a re-render with the same data and words
reuses the map's measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**The grid holds these 41 countries only** (ISO alpha-3): ISL NOR SWE FIN EST IRL GBR DNK LVA RUS NLD
DEU POL LTU BLR BEL LUX CZE SVK UKR PRT ESP FRA CHE AUT HUN MDA ITA SVN HRV SRB ROU MLT MNE BIH MKD BGR
ALB GRC TUR CYP. A row outside them is refused; grid countries the story does not give are left out
(their place stays empty).

**The measure is a share in percent** (0 to 100): the balance is a 0–100 % beam.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | THE JOIN. One `{ iso, name, value }` per country: `iso` the ISO alpha-3 code, `name` its name in the story's language (only the country taking the most room is named on the map), `value` the share in percent or `null` when the source does not report it (a hollow tile with a dashed edge). |
| `breaks` | 2 to 5 rising numbers between 0 and 100: the class limits. |
| `means` | The balance's two pivots: `{ area, country }`, each a short label holding `{n}` where the mean is printed at one decimal ("by area {n} %", "by country {n} %"). |
| `missingLabel` | The key's word for a country with no value ("no data"). |
| `source` | The credit in one or two forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap". |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator of the means. |
| `check(map)` | Throws if the data no longer supports the title. `map` is `{ byCountry, byArea, gap, widest: { iso, name, value, areaShare }, value(iso), ranked, unreported }`: the two means, `byCountry − byArea`, the country taking the most territory (its share of the drawn land in `areaShare`), each country's value, the rows largest first, the names with no value. |

The render refuses, saying what to change, when a row is outside the grid or not a share, the breaks
do not rise, a tile cannot hold its code at the type floor, the widest country's name finds no place
inside it, or the credit finds no free corner (shorten the words).

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, VALUE] = [col("iso3"), col("share")];
const rows = table.rows.map((r) => ({ iso: r[CODE], name: NAMES[r[CODE]] ?? r[CODE], value: r[VALUE] === null || r[VALUE] === "" ? null : Number(r[VALUE]) }));
```

Keep ONE row per country. Country names without codes: `import { iso3Of } from "./countries.mjs"`.

## Rules

- A cartogram's argument is that ink follows territory on a choropleth: draw a rate or a share, never a raw count.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(map.byArea * 10) / 10 === 44.9`), never with strict equality on the raw division.
- When the title states the two means, `check()` holds both to it.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the tiles, the balance struck at both means). If the render refuses, read its message and
  fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
