# Beat — India has risen from eighth to third among the world's biggest CO₂ emitters

**Proves:** between 1990 and 2024 India moved from eighth to third in the world ranking of annual
CO₂ emissions from fossil fuels and industry, passing five countries on the way — Germany (1999),
Japan (2006) and Russia (2009), and earlier the United Kingdom (1991) and Ukraine (1992), neither of
which is still in the top ten. Over the same window China took first place from the United States,
in 2006.

**Medium / genre:** chart / video. **Type:** bump (ranking-over-time) — one line per country, its
vertical position its RANK rather than its value, rank 1 at the top. **No genre in this corpus had a
bump chart before this beat**: it is a new row in the type × genre matrix, not a video sibling of an
existing static or web beat.

**Why video, specifically.** A bump chart's finding is a crossing, and a crossing is two lines
swapping places — a thing that happens over time. The type earns a motion build more directly than
any type already in the video genre.

## Data

- Source: Global Carbon Budget (2025) – with major processing by Our World in Data, indicator
  `annual-co2-emissions-per-country`. Citation string taken from the indicator's own metadata
  endpoint, not written from memory.
- Fetched: `https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?csvType=full`,
  then reduced to the window the beat draws with
  `awk -F, 'NR==1 || ($3>=1990 && $3<=2024)' co2-full.csv > data.csv`. The year window is the only
  edit; **every entity is kept**, which is what makes a *world* rank computable from the frozen file
  rather than asserted.
- `data.csv`: 8,617 data rows, 1990–2024, every entity OWID publishes. Rows with an empty `Code` are
  OWID-assembled regions, and a `Code` beginning `OWID_` is an OWID-defined entity; `render.mjs`
  drops both, because a world ranking of countries that included "Asia" would be a ranking of
  nothing. Each of the 35 years carries more than 200 ranked countries — asserted at render time.
- What the figure covers, and does not: fossil fuels and industry. **Land-use change emissions are
  not included** — the indicator's own subtitle, carried into the rendered source line.

## Every rank here is computed, and that is this type's specific trap

`references/types/bump.md`: rank has no magnitude to sanity-check against, so "an invented rank slots
into the visual field exactly as plausibly as a real one." There is **no rank column in the data and
no rank typed anywhere in this workspace.** Each is the position of a country in a sort of every
ISO-coded entity's emissions for that year.

The same applies to everything else the beat asserts:

- **Which six countries are drawn** is computed: the countries that held a place inside the world
  top ten in *every one* of the 35 years. That is China, the United States, India, Russia, Japan and
  Germany. `render.mjs` throws if the answer falls outside 3–8 countries, the range this type can
  carry legibly.
- **Who the subject is** is computed: the largest climb in the drawn set, required to be unique
  (India, +5 places) and at least 2 places.
- **The ordinal words "eighth" and "third"** are indexed out of a word table by the computed ranks.
- **The five countries India overtook, and the year each crossing happened**, are computed as: ranked
  above India in 1990, below it in 2024, and the crossing year is the first year of the unbroken
  lead that runs to 2024.
- **"had already passed"** is computed too — the second sentence's tense is a claim about
  chronology, so it is only used when every undrawn crossing predates every drawn one.

## Exact values — computed from `data.csv` (world rank by annual CO₂ emissions)

| Country | 1990 | 2024 |
| --- | --- | --- |
| China | 3 | **1** |
| United States | **1** | 2 |
| **India** | **8** | **3** |
| Russia | 2 | 4 |
| Japan | 4 | 5 |
| Germany | 5 | 10 |

India's crossings: United Kingdom 1991 · Ukraine 1992 · Germany 1999 · Japan 2006 · Russia 2009.

## The motion problem

A crossing exists only while both lines are being drawn. Building one country's whole line before
starting the next would produce a chart with **no crossings in it at all** — removing the only event
the type exists to show. So `reveal` runs one clock and all six lines advance along it together,
1990 to 2024, in a single neutral.

On a value chart the `reference` event is a level the evidence is measured against. A rank chart has
no level, so the reference here is **where everyone started**: the six dots of the 1990 column, laid
down and left to be read before the clock starts.

The subject is picked out *after* the race, never during — a line already accented while the race
runs hands the reader the answer before the evidence. The crossings are marked last, in
`conclusion`, on India's own line.

## Anti-patterns for this case

- **One accent line, not three.** The sheet allows two or three; the recorded palette carries one
  accent, and a second hue would be a colour nobody chose. Everything else is a single neutral, as
  the sheet requires — "trying to give every competitor its own hue defeats the purpose of having an
  accent at all."
- **End labels are in page ink, never in a line's own hue** — including the accented line's. That is
  this type's named, previously-shipped WCAG failure.
- **The accent line is redrawn on top and heavier**, so a crossing between it and a background line
  reads as the accent line's crossing rather than a tangle.
- **No line is bridged across a missing period.** None needs to be: the drawn set is, by
  construction, the countries present in the band in every year — and the component throws if any
  track's rank count does not match the year count.
- **The empty rank rows are explained, not hidden.** Ranks 6 to 9 in 2024 belong to countries this
  chart does not draw. A rendered caveat line says so: "Only the 6 countries that held a top-10 place
  in every year are drawn. Other countries hold the ranks left empty."
- **Rank is not magnitude, and the beat does not pretend otherwise.** Nothing in the drawing implies
  how far ahead anyone is; the title claims a position, not a size.

## Verification

Rendered still first (`--still-only`), then the mp4; frames 0, 40, 60, 110, 150, 187, 200, 230, 260
and 299 extracted from `bump.mp4` with ffmpeg and looked at. Frame 110 and frame 150 show the race
mid-run with crossings visibly happening — the thing a final-frame still cannot show, because in the
last frame every line is already complete and a build that drew them one at a time would look
identical. Frame 200 shows the subject accented with both ends ringed and no crossing markers yet;
frame 260 shows the markers and the sentence.

Frame 0 carries the title, source and caveat at full opacity — see the sibling beat
`vidz-bar-column-top-emitters/BRIEF.md` for the measurement that motivated it and for the corpus-wide
blank-poster-frame finding.

## Source line

`Source: Global Carbon Budget (2025) – with major processing by Our World in Data · fossil fuels and industry only; land-use change is not included`

## Alt text

Computed by `render.mjs` and written to `ALT.txt` beside the render.
