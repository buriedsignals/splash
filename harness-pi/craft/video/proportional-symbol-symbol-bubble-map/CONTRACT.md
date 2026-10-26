# Proportional symbol (video) — what you write

The video is already designed: it comes from the worked example `proof/video-proportional-symbol-europe-capacity`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map of Europe, 19.6 s at 30 fps. It
opens on a title card (eyebrow + title); then the map and the key's two named circles; then the
LARGEST sites arrive one by one, largest first — each a hollow circle whose AREA is its value — while
a count climbs: how many have arrived and what share of the whole they carry; then every other site
appears at once as a faint point, with its own count and share; then the credit. The argument is
concentration: a few sites carry a large share. There is no standfirst and no sentence on screen. You
do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
sites and the WORDS of this story's video. `render-beat.mjs` (already in the folder) ranks the sites,
computes every share the count climbs through, sizes every circle, measures the live map, seats the key
and the credit on open sea, renders seven stills, prints `look at: <png>`, then renders the mp4 (about
three minutes; a re-render with the same data and words reuses the map's measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The camera fits every site; the sites must stand in Europe (32°W–60°E, 27°N–82°N).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `symbols` | EVERY site, `{ lon, lat, value }`, from `data.json`: `value` is the positive number a circle's area is drawn by (e.g. capacity). |
| `drawCount` | How many of the largest are drawn as circles, one by one (default 100, between 10 and 150). The others are points. They must be at least as many again. |
| `count(k, share, last)` | The climbing count's words after `k` circles: `share` is the percent of the whole those `k` carry, already rounded (a whole number while it climbs, one decimal at the end); `last` is `true` on the final step. Must print `k` ("100 sites: 43.0 %"). |
| `rest(n, share)` | The others' words: `n` sites carrying `share` percent (one decimal) ("8,800 others: 57.0 %"). |
| `figure(v)` | A value printed short, for the key's two named circles ("4,000 MW"). |
| `keyValues` | Optional: the key's two values, larger first. Default: the largest round value under ¾ of the largest site, and a tenth of it. |
| `source` | The credit in one to four forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap". The render sets the longest form that finds one line of open sea. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 2. |
| `check(map)` | Throws if the data no longer supports the title. `map.ranked` = `[{ lon, lat, value }]` largest first; `map.total` = how many sites; `map.sum` = their total value; `map.drawCount`; `map.shareTop` = the percent the `drawCount` largest carry; `map.shareOf(k)` = the percent the `k` largest carry. |

The render refuses, saying what to change, when `drawCount` is out of range or the others do not
outnumber the circles, a value is not above 0, a site stands outside Europe, `count` does not print
`k`, or the key or the credit finds no place clear of every site (shorten the words).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [SIZE, LON, LAT] = [col("size"), col("x"), col("y")];
const symbols = data.rows.map((r) => ({ lon: Number(r[LON]), lat: Number(r[LAT]), value: Number(r[SIZE]) })).filter((s) => s.value > 0);
```

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about: `value` is the quantity whose concentration the title states.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says "N sites carry X", `check()` computes `map.shareOf(N)` and throws unless it holds.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: every circle and point, both counts). If the render refuses, read its message and fix
  `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
