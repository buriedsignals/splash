# Locator (video) — what you write

The video is already designed: it comes from the worked example `proof/video-locator-zaporizhzhia`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map, 17.6 s at 30 fps. It opens on a
title card (eyebrow + title); then Europe, the subject's country tinted and named and the subject
ringed on the continent; then the camera TRAVELS there — the country's regions drawn as it closes in —
and once it has settled the neighbouring countries' names, the largest settlements (a dot and a name)
and the waters land; the ring closes on the subject, its name lands and its number counts up; then the
credit. It ends on the close-up. There is no standfirst and no sentence on screen. A locator says only
WHERE. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
place and the WORDS of this story's video. `render-beat.mjs` (already in the folder) frames the
close-up (the subject ± 9° of longitude, ± 5.2° of latitude), measures the live map, places every name
inside its own country or on open water, renders eight stills, prints `look at: <png>`, then renders the
mp4 (about five minutes; a re-render with the same words reuses the map's measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The video opens on Europe (25°W–45°E, 34°N–72°N); the subject must be inside it, and
inside the country `country` names (the render checks the point against the map's shapes).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `subject` | The one place the video is about, from its row of data.json: `{ lon, lat, name, label?, priority }`. `label` (default `name`) is the word drawn beside the ring; `priority` is the number its line counts up to (e.g. its capacity). |
| `valueText(v)` | The subject's second line for a number `v` ("6 000 MW installés"). It is called for every step of the count, so it must print `v`. |
| `country` | The ISO alpha-3 code of the country the subject is in (`UKR`, `FRA`…): the map tints it and draws its regions. |
| `areas` | The countries the close-up names: `{ <iso3>: <name in the story's language> }`, the subject's own country included. A country with no ground in the close-up, or with no room inside its own border for its name, is left unnamed (the render says which). |
| `places` | Settlements that help place the subject: `[{ lon, lat, name, label?, priority }]`, `priority` = population. The close-up names the SIX largest in its frame (`label`, default `name`). `[]` names none. |
| `waters` | Optional: `[{ name, lon, lat }]`, the seas, gulfs or rivers the close-up names in italic, each at a point on the water and inside the close-up. |
| `source` | The credit in one to four forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap". The render sets the longest form that finds one line of open sea. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 2. |
| `check(map)` | Throws if the data no longer supports the title. `map.countryOf(lon, lat)` = the ISO alpha-3 code of the country the point falls in (or `null`); `map.km(a, b)` = great-circle km between two `{ lon, lat }`; `map.subject` = your `subject`. |

The render refuses, saying what to change, when:
- the subject's point is not inside `country` (it names the country it is in);
- the subject is outside Europe, or `priority` is not a number above 0;
- `valueText` does not print its number;
- a name, the subject's block or the credit has no clear place on the close-up (shorten it, or add a
  shorter source form).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [KIND, SIZE, LON, LAT, NAME] = [col("type"), col("size"), col("x"), col("y"), col("label")];
const rows = data.rows.map((r) => ({ kind: r[KIND], size: Number(r[SIZE]), lon: Number(r[LON]), lat: Number(r[LAT]), name: r[NAME] }));
const largest = rows.filter((r) => r.kind === "site").reduce((a, b) => (b.size > a.size ? b : a));
```

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about: `priority` is the number the takeaway ranks by.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says where the subject is ("… is in Ukraine"), `check()` asks `map.countryOf` and throws unless it is that country.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the close-up with every name). If the render refuses, read its message and fix `beat.mjs`.
  If the picture is wrong (a name cut, the wrong place, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
