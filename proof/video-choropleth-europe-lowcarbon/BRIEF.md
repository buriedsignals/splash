---
format: video
type: choropleth
size: landscape
---

# Beat — Le bas-carbone européen est au nord-ouest, et en Albanie (video)

**Type:** choropleth (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080),
pinned in the front matter above — watched on a phone turned sideways, so the type floor is 30 px
and the frame carries less furniture than the still.

The same subject, data and claim as `proof/static-choropleth-europe-lowcarbon`, told with the video's
own gestures (`skills/chart-video/references/directed-type-choreography.md`). The still is the floor,
not the script.

## The claim

**Seven European countries drew more than 94 % of their 2024 electricity from low-carbon sources.
Six of them are north or west of the seventh — and the seventh is Albania, whose every measured
neighbour is under 60 %.**

## Data and shapes: read, not copied

Nothing is frozen here. The runner calls `loadSubject({ dir: "../static-choropleth-europe-lowcarbon" })`
(`proof/static-choropleth-europe-lowcarbon/beat.mjs`), which reads that beat's `data.csv` and
`shapes.geojson` and throws when the claim stops holding: seven above `FLOOR` 94, `ODD_ONE` Albania
among them, its data-carrying neighbours all under `NEIGHBOUR_CEILING` 60, the other six north or
west of it. The video adds its own derived values (below) and asserts them in its runner the same way.
Source and provenance are the static beat's `BRIEF.md`. `PALETTE.md` is a copy of the static beat's.

## The copy (French, as the still)

| slot | text | from |
| --- | --- | --- |
| eyebrow | Énergie · Europe | `copyOf().eyebrow` |
| title | Le bas-carbone européen est au nord-ouest — et en Albanie | `copyOf().title[1]`; steps down to `title[2]`, « Le bas-carbone européen, et son exception », when the layout cannot hold it |
| key label | part bas-carbone de la production, 2024 | the still's key label, the year added because the limits paragraph is gone |
| key | 40 % · 55 % · 70 % · 85 % · 94 % · donnée non rapportée | `BREAKS` |
| reference mark | plus de 94 % | `FLOOR` |
| map names (reveal) | Islande · Norvège · Suède · Finlande · Suisse · France | `above` minus `ODD_ONE`, French names from the data |
| map names (subject) | Albanie 100 % · Monténégro 59 % · Macédoine du Nord 39 % · Grèce 49 % · Kosovo, hors données | `value`, `format()`; Kosovo from the rings (see below) |
| conclusion | Sept pays dépassent 94 %. Les 3 voisins mesurés de l’Albanie sont tous sous 60 %. | `above.length`, `FLOOR`, `neighbours.length`, `NEIGHBOUR_CEILING` |
| source | Source : Ember, Energy Institute (2025), via Our World in Data · fond MapTiler | shortened from `copyOf().source` |

No limits paragraph, no reading line.

## The choreography

| event | what the shot says | gesture | what moves | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | Europe in 2024, and the scale it will be read on | — (furniture) | eyebrow, title, key with its bornes, source fade in once and never move again; the map is up from frame 0 at the overview camera, every study country in the neutral land step | reported countries `value.size` = 40; unreported = 1 (Ukraine); key bornes = `BREAKS` [40, 55, 70, 85, 94] |
| `reference` | the level the title counts from: 94 % | — (reference level) | on the key, the top class and its 94 % borne take the accent, « plus de 94 % » set beside it; nothing else moves | `FLOOR` = 94 = `BREAKS.at(-1)`; no reported value equals 94 exactly (so the top class `v >= 94` is the claim's `v > 94`) |
| `reveal` | Europe by share, lowest first: the ink gathers in the north-west | **Reveal in order** (+ **Name**) | the six classes take their fill one after another, < 40 % first, ≥ 94 % last; Ukraine takes the « non rapportée » fill as the reveal opens; as the top class lands, six of its seven are named, each name gated on its class's own fill; the seventh, in the Balkans, stays unnamed | class counts low → high = 8 · 6 · 6 · 8 · 5 · 7, summing to `value.size` 40; top-class count = `above.length` = 7; named now = 6 (`above` minus `ALB`) |
| `subject` | the one outside the north-west: Albania, at 100 %, among its neighbours | **Zoom / focus** + **Name** | the camera closes on the Balkans (map box fixed, `jumpTo` interpolated); once it settles, Albania is ringed and named « Albanie 100 % », and each neighbour prints its value in its own shape; Kosovo is named as outside the data | `ODD_ONE` = ALB ∈ `above`, `format` = 100 %; ring-neighbours from the rings = 4 (MNE, MKD, GRC with data; Kosovo `-99`, no row); zoom window = union of the five largest rings, 18.4–26.6° E × 36.4–43.5° N; Albania's drawn width at the overview < its « 100 % » label's measured width, and ≥ it at the zoom |
| `conclusion` | seven above the floor, six in the north-west, and Albania alone among neighbours under 60 % | **Zoom / focus** (pull back) + **Filter** | the camera returns to the overview; the 33 countries under 94 % step back to the land step while the seven keep their ink, names and ring; neighbour values leave with the zoom; once the camera settles the conclusion sentence arrives in the panel | stepped back = `value.size − above.length` = 33; `notNorthWest` = 0 (six of six north or west of Albania's anchor); `neighbours.length` = 3; max among them = Monténégro 59.5 % < `NEIGHBOUR_CEILING` 60; conclusion camera = establish camera |
| `hold` | the claim, readable | — (stillness) | nothing — the filtered map, seven names, the ring, the sentence, held long enough to read the sentence | hold state = conclusion state; `hold.duration` ≥ 60 frames, long enough for the sentence |

Four gestures from the repertoire: reveal in order, name, zoom/focus (in and back), filter.

## Why these gestures

The **reveal in order** is argumentative, not decorative: classes arrive by value, so the north-west
darkens last and the picture *becomes* the title rather than showing it. **Naming six and leaving the
seventh unnamed** turns the still's exception into a question the viewer asks before the video answers
it. The **zoom** is evidence arriving: at the overview Albania is narrower than its own value label,
so « 100 % » against « 59 % · 39 % · 49 % » cannot be printed without it — the runner asserts exactly
that. The **pull back with the filter** restates the count on the whole map, which the still cannot
do: at the overview the 85–94 % class (Luxembourg 90.7 %, Denmark, Austria, Slovakia, Portugal) sits
one step from the seven, and only stepping the 33 back makes « sept » countable on a phone. The hold
lands on that frame, not on the still's.

## Two things for the owner to rule on

- **Kosovo is Albania's fourth neighbour.** `neighboursOf("ALB")` finds MNE, MKD, GRC and Kosovo
  (Natural Earth `-99`, no row in the frozen data); `loadSubject` filters it out with `value.has`, so
  the still's callout says « Ses 3 voisins ». On a zoom onto the Balkans the viewer sees it unfilled
  beside Albania. The copy above says « voisins mesurés » and names Kosovo « hors données » in the
  zoom, and the runner asserts every ring-neighbour without a value is named there.
- **The hold and `assertEventStates`.** The doctrine says the hold plays no gesture; the guard refuses
  an event whose state equals the one before. Proposed: `statesFor` closes the five gesture events and
  the runner asserts the hold's state equals the conclusion's.
