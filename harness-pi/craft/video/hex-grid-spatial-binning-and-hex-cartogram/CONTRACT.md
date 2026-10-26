# Hex grid (video) — what you write

The video is already designed: it comes from the worked example `proof/video-hex-grid-europe-protection`
and the story's PALETTE.md and DIRECTION.md. 21.9 s at 30 fps. It opens on a title card (eyebrow +
title); then the LIVE MapTiler map of Europe, its countries in one neutral; they give way to their own
shapes, which travel onto ONE HEXAGON EACH on a designed grid, and the codes land; the hexagons take
their class BY COUNT and the largest is ringed with its figure; then they RE-CLASS BY RATE — the same
countries, the other measure — and the new leader is ringed while the largest is named again with its
rank by rate; then the credit. The argument is a ranking that turns over. There is no standfirst and
no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's video. `render-beat.mjs` (already in the folder) ranks the rows
both ways, classes every cell twice, measures the live map, places the key and the credit, renders
twelve stills, prints `look at: <png>`, then renders the mp4 (about five minutes; a re-render with the
same data and words reuses the map's measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**The grid holds these 32 countries only** (ISO alpha-3): ISL NOR SWE FIN IRL DNK EST LVA NLD DEU POL
LTU UKR BEL LUX CHE CZE SVK HUN ROU PRT ESP FRA LIE AUT SVN HRV BGR MLT ITA GRC CYP. A row outside them
is refused; grid countries the story does not give are left out (their place stays empty).

**This video tells ONE argument: a ranking that turns over.** The largest by count must not be the
first by rate; when it is, the render refuses — tell that story in the static or web format.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | One `{ iso, name, count, rate }` per country: `iso` the ISO alpha-3 code, `name` its name in the story's language (only the largest and the leader are printed), `count` the raw count, `rate` the same count per resident — COMPUTED from the columns, per 1,000, 10,000 or 100,000 residents. Both above 0. |
| `origin` | Optional: the ISO alpha-3 code of a grid country drawn hollow with a dashed edge, in no class (the country people come from). Not in `rows`. |
| `originLabel` | The key's word for that hollow cell ("origin"); required with `origin`. |
| `countBreaks` | 2 to 5 rising numbers: the count's class limits. |
| `rateBreaks` | As many rising numbers: the rate's class limits (the two measures share one ramp). |
| `countUnit` | The key's line under the count ("Ukrainians hosted"). |
| `rateUnit` | The key's line under the rate ("per 1,000 residents"). |
| `countBorne(b)` / `rateBorne(b)` | How a count / rate limit is printed under the ramp ("30 k", "5.0"). |
| `largestByCount(name, count)` | The largest country's line in the count round ("Germany: 1.25 M, 1st"). Must print `name`. |
| `largestByRate(name, rate, rank)` | The same country's line in the rate round, with its rank by rate ("Germany: 14.8 per 1,000, 11th"). Must print `name` and `rank`. |
| `leaderLine(name, rate)` | The first by rate ("Czechia: 36.1 per 1,000, 1st"). Must print `name`. |
| `source` | The credit in one to three forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap". |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. |
| `check(map)` | Throws if the data no longer supports the title. `map.byCount` / `map.byRate` = `[{ iso, name, count, rate, rank }]` in each order; `map.largest` (first by count), `map.leader` (first by rate); `map.largestRateRank` = where the largest falls by rate. |

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [CODE, COUNT, RESIDENTS] = [col("iso3"), col("count"), col("residents")];
const rows = data.rows.map((r) => ({ iso: r[CODE], name: NAMES[r[CODE]] ?? r[CODE], count: Number(r[COUNT]), rate: (Number(r[COUNT]) / Number(r[RESIDENTS])) * 1000 }));
```

Keep ONE row per country (filter to one month or one series first).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in `rateUnit` — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about: compute the rate from the columns.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(map.leader.rate * 10) / 10 === 36.1`), never with strict equality on the raw division.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the grid classed by rate, the leader ringed). If the render refuses, read its message and
  fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
