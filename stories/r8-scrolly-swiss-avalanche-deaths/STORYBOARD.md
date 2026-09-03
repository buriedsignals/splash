---
takeaway: "In the first twenty winters the SLF recorded, avalanches killed 247 people in Swiss buildings and on Swiss transport routes. In the last twenty they killed 8. The toll itself barely moved — 478 deaths then, 442 now — it moved onto the open slope."
subject: "deaths in CONTROLLED terrain — buildings and transport routes — read against the uncontrolled terrain they moved to"
comparison: "the first twenty hydrological winters on record (1936/37–1955/56) against the last twenty (2004/05–2023/24), with every winter in between drawn so the reader sees the crossover in the 1960s rather than only the two endpoints"
limits: "The frozen file counts DEATHS, never exposure: it holds no number of tourers, no skier-days, no road-traffic volume, so nothing here says whether a given person is more or less likely to die than in 1950 — only where the people who died were. 12 of the 2,146 deaths cannot be put on one side of the split (6 accidents whose activity list spans both terrains, 6 with no activity recorded) and are drawn as neither. A forecast danger level exists for only 323 of the 1,406 accidents, all of them after the national bulletin began issuing one, so the danger-level step is a statement about the bulletin era, not about the record. The publisher's own companion per-year file disagrees with this file in 5 of the 85 winters both cover, by one or two deaths each; this beat counts from the accident file alone and says so. One municipality cell arrives with a leading tab (\"\tPontresina\"), which reads as a second spelling of one place unless trimmed."
placement: "a standalone scroll-driven page, linked from the article — it is the piece's one interactive"
credit: "Fatal avalanche accidents in Switzerland since 1936/37, WSL Institute for Snow and Avalanche Research SLF, doi:10.16904/envidat.412"
effectiveDate: "2026-08-23"
grounding: "unverifiable"
reference: "none — the doctrine reference set carries no row for one argument told across a map, a diagram and a chart in a single scroll; the nearest neighbour in this tree is stress-ac-alcanede-kilns, which assembles a chart, two photographs and a locator for one PLACE, where this beat assembles three media for one COUNTRY"
language: "en"
slots:
  - id: 1
    proves: "That Swiss avalanche deaths did not fall — they relocated. 247 of the first twenty winters' 478 deaths were in buildings or on transport routes; 8 of the last twenty winters' 442 were. The reader meets the 1,406 start zones on a map, then the two terrains the SLF counts in as a drawn diagram, then the two counts crossing over 88 winters, then what the forecast said on the days it was recorded."
    medium: "map"
    format: "scrolly"
    reachable: "yes"
    assembles: ["map", "image", "chart"]
    candidates: ["Scrollytelling (locator map, then a drawn diagram of the two terrains, then the two counts over 88 winters, then the forecast level)", "Stacked area chart, static", "Small multiples, one panel per decade, static"]
    intent: unrecorded
    rankingWalk: unrecorded
    chosen: "Scrollytelling (locator map, then a drawn diagram of the two terrains, then the two counts over 88 winters, then the forecast level)"
---

## Slot 1 — the deaths moved, they did not stop

### What the article claims, read back (movement ①)

The SLF's own long-term statistics page states two things and shows a third. It states that
*"The SLF has been collecting comprehensive data on all the avalanche accidents that have occurred
in Switzerland since the winter of 1936/37"* and that *"The annual average number of fatalities over
the entire period is 24."* Its Figure 1 caption says what the graph is FOR: *"The graph illustrates
the fall in the number of fatalities in buildings and on transportation routes."*

Techel et al. (2016) put a number on the same movement, but ACROSS THE ALPS, not for Switzerland:
*"the proportion of fatalities in uncontrolled terrain increased from 72 to 97 %."* The desk's
question is whether Switzerland's own record says it, and by how much.

### The takeaway and its grounding (movement ②, gate G1)

Recomputed from the frozen file: 1,406 fatal avalanches, 2,146 deaths, 88 hydrological winters
(1936/37 → 2023/24), a mean of 24.4 a winter — which is the publisher's own "24", arrived at
independently. Split on the publisher's own four categories: 514 deaths in controlled terrain
(buildings 210, transport routes 271, both 33) against 1,620 in uncontrolled terrain (tour 1,211,
off-piste 403, both 6), with 12 unattributable.

The confirmed takeaway is the first-twenty against last-twenty reading, because it is the one the
SLF's own figure caption promises and never states as a number.

`groundTakeaway` was run and came back **unverifiable** on all four figures, twice, for two
different reasons — both recorded in `NOTES-FOR-MAINTAINER.md`:

1. against the frozen `source/profile.json`, `"profile has no numeric column with a range to check
   against"` — because intake profiled the publisher's three banner lines as the header and the
   whole 21-column table as one text column;
2. against a correctly parsed profile, `"247 was not placed: this profile carries 8 measures … and
   the claim names none of them"` — which is the honest limit: every figure in this takeaway is a
   SUM OVER A SUBSET of rows, and the profiler holds column ranges, not group sums.

`unverifiable` is recorded as the verdict rather than upgraded. Every figure the beat says out loud
is recomputed from the frozen CSV by the beat's own reading layer, and `test/facts.test.ts` in the
beat directory recomputes them a second time from the same file.

### The hand of the journalist (movement ③)

Asked and answered above, in the front matter. The one worth restating is `limits`: this file counts
the dead, never the living, so it cannot support a sentence about risk. The beat's own prose says
so, in the reader's words, on the step where the temptation is strongest.

### The survey and the medium (movement ④–⑤, gate G2a)

The data supports a map (1,406 points with coordinates), a time series (88 winters × 2 categories),
a distribution (elevation, aspect, inclination) and a categorical breakdown (forecast level). Medium
confirmed as **map** — the medium the reader meets first — with the slot's `assembles` recording the
full order.

### The publication format (movement ⑥, gate G2b)

`formatPublicationFormatGate` was rendered from `proposeFormats({medium: "map"})` and put verbatim:

> Which publication format should Splash make first?
>
> Recommended: **Scrollytelling**, because the takeaway is carried by three different kinds of
> evidence — where the avalanches were, which two terrains the SLF counts in, and how the two counts
> crossed over 88 winters — and no single chart, map or image can hold all three
>
> - **Static / print:** one fixed graphic, suitable for print and non-interactive placement.
> - **Interactive web:** a responsive page with exact values available on hover, tap, and keyboard focus.
> - **Video:** a timed build for broadcast or social video.
> - **Scrollytelling:** a fixed visual whose state changes with the article's scroll sequence.
>
> Which should I produce first?

**Answered: Scrollytelling.** A static graphic can hold the crossover chart and nothing else; the
reader would still not know where in Switzerland any of this happened, nor what the SLF means by
"controlled terrain", and both are load-bearing for the sentence.

### Size (movement ⑦, gate G2c)

Not asked. `SIZED_FORMATS` is `["static", "video"]`; a scrolly carries no `size` and the slot
records none.

### The reference loop (movement ⑧)

`references/reference-set.md` was read. No row covers a single argument assembled from three media
behind one scroll. Recorded as `none` with the nearest neighbour named, rather than a row bent to
fit.

### The palette (movement ⑨)

Run and recorded in `PALETTE.md`: `#D4A853` on `#16191B` at 8.01:1, `#5B8A8A` as the second series
ink at 4.58:1, `origin: journalist`. The accent draws CONTROLLED terrain, the series the takeaway is
about. `TYPEFACE.md` records `Helvetica, Arial, sans-serif` with `origin: default`, because
`NEWSROOM.md`'s Space Grotesk is not installed on this machine and was measured, not assumed.

### Candidates considered (movement ⑩)

1. **Scrollytelling (locator map → drawn diagram → the two counts over 88 winters → the forecast
   level)** — chosen. The only candidate that can say WHERE, WHAT THE CATEGORIES MEAN and WHAT
   CHANGED without asking the reader to hold two of the three in their head.
2. **Stacked area chart, static.** Says the crossover precisely, cheaply, and prints. Rejected
   because "controlled terrain" is jargon the reader has to be shown, and because a stacked area of
   two categories invites the reading that the total is the point, when the total is precisely what
   did NOT change.
3. **Small multiples, one panel per decade, static.** Nine panels, each a two-bar comparison. Reads
   the direction well and loses every individual winter, including 1950/51 — 99 deaths, the single
   worst on record and the reason the modern avalanche-protection programme exists.

### The four steps

| Step | Frame | What only this can say |
| --- | --- | --- |
| 1 | **Map** — 1,406 fatal start zones on a baked Swiss plate, one dot each | WHERE. The chart has no geography; a reader outside Switzerland cannot otherwise place any of it, and the dots' own shape IS the Alpine arc. |
| 2 | **Drawn diagram** — one slope: a village and a road at its foot, a tourer and an off-piste skier on it | WHAT THE TWO CATEGORIES ARE. The SLF's split is the beat's whole argument and it is a definition, not a number; no chart can carry a definition. |
| 3 | **Chart** — 88 winters, two counts, the accent on controlled terrain | WHAT CHANGED, and that the total did not. The crossover is a shape, and only a full series shows it is a slide rather than a step. |
| 4 | **Chart** — the forecast danger level on the 323 accidents that carry one | WHAT THE BULLETIN SAID. A different variable and a different population, carrying the publisher's own warning verbatim: *"this graph does not correspond to an individual's risk."* |
