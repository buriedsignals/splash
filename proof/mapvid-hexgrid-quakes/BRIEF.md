# Beat — the Ring of Fire is not one bad day: the densest cell shook on 360 days out of 366

**Type:** hex grid (spatial bins). **Medium/genre:** map / **video** — the third genre for this
type, beside the static beat (`proof/map-quake-density`) and the web one
(`proof/mapgen-hexgrid-web`). `render/hexgrid.mp4`, 1080 × 1080, 30 fps, **380 frames = 12.67 s**,
over a 940 × 540 baked plate frozen in `plate/`.

## Why this type earns a video, in one sentence

**A hexagon holding 1,720 events delivered in a single afternoon and a hexagon holding 1,720 events
delivered across a whole year are the same shade of grey.** The static and web siblings cannot tell
those two worlds apart — no static encoding can, because the quantity they draw has already been
summed over time. Playing the year apart is the measurement, and it is the only measurement this
genre adds. That is the test the scrolly skill states and this beat had to pass: every frame of the
reveal shows a different picture, and the difference between two frames is the argument.

## Claim

Magnitude-4-or-greater earthquakes in 2024 do not arrive in bursts that a year-end map would
flatten. The densest cell on this plate holds **1,720** events, and those events fall on **360 of
the year's 366 days**; its busiest single day carries **18** of them, **1.0%** of its own year. The
shape arrives early and then only thickens: **91 of the 149** non-empty cells (**61%**) have already
appeared within the first 30 days.

Both halves are asserted before a frame is drawn. `render.mjs` throws if the densest cell was active
on fewer than 80% of the year's days, and throws again if any single day carries more than 10% of
its events — the two ways "not one bad day" could be false of a different catalogue.

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024.
- `quakes-density.csv`: **14,175 rows**, the same frozen export the static and web siblings read,
  copied here so this beat's render resolves every input inside its own directory.
- **14,073 of the 14,175 are on-frame**; 102 fall poleward of the plate's own 61°S–78°N.
- The `time` column is used here and nowhere else in this type's other two genres. Every row's date
  is read in **UTC**, because the catalogue is written in UTC and reading it in a local zone would
  move events across midnight — and, once a year, across the year boundary.

## Exact values — printed by `render.mjs` on every run, from the frozen CSV and this plate

- **149 non-empty cells**, hex size **29.80 px** on a 940 × 540 plate.
- Class breaks **13 · 51 · 284 · 661**, five classes. Every class is asserted to hold at least one
  cell, so the legend never prints a shade nothing wears.
- Ranked counts **1,720 · 974 · 836 · 777 · 661**; median non-empty cell **13**.
- Densest cell: **1,720** events, catalogued by USGS as **Fiji 49% / Tonga 36%** — derived from its
  own member events, never typed.
- Its spread: **360 active days of 366**, busiest day **18 events (1.0%)**.
- The other four of the top five are spread too, measured the same way: 327, 329, 321 and 295 active
  days, and no single day above 3.9% of its cell's year.
- 30-day shape: **91 of 149 cells** already present.

## The subject is an artefact of the grid, and this beat's own plate proves it again

The static sibling bins the same 14,175 rows on an 836 × 480 plate and gets **1,724**; the web
sibling, on an 836 × 520 Greenwich-centred plate, gets **1,374** with a rival cell three events
behind. This beat, at 940 × 540, gets **1,720**. The cell's IDENTITY (the Fiji–Tonga trench) survives
all three platings; its COUNT does not, and no sentence anywhere in this beat is true only at one bin
size. The subject is found by reducing this plate's own cells at render time and the script throws if
the outlined hexagon is not the maximum.

## Subject and accent

One sequential ramp derived from `PALETTE.md`'s ground and the ink `deriveFurniture` derives from it,
luminance moving in one direction only, and **one** accent (`#0B7A75`, the house colour, `origin:
newsroom`) on exactly one shape: the outline of the densest cell, plus the one line of type that
names its tally. The accent is not a member of the ramp, so it can never be read as a class.
No hex literal appears anywhere in this beat's own source.

## Reveal order (the edit)

30 fps, 380 frames. `establish` 0–24 (title, source, caveat, the basemap coming up) → `reference`
30–48 (the class scale, laid down before any cell is shaded, so a reader knows what a shade will
mean before one exists) → `reveal` 60–270 (**2024 plays, one day at a time, 7 seconds for a year**)
→ `subject` 270–290 (the densest cell outlined and named) → `conclusion` 290–320 → `hold` 320–380
(2.0 s of stillness). Contract-checked; `hold` ends exactly on frame 380.

## The accessibility trap this type has in the video genre, and how it is closed

"Has not happened yet" must never read as "there is nothing here". A hexagon that has not appeared is
one whose first magnitude-4 event has not been catalogued yet — and three things on the frame say so
at every moment of the reveal: the **date readout** on the map, the **running count** beside it, and
the caveat, in words. This is a different situation from the choropleth sibling's, where every region
has a value from frame one and an unfilled shape would misstate a real number; here the quantity is
genuinely zero until the day it is not, so drawing nothing is the honest state. A cell fades in over
two days rather than blinking, and never stays translucent longer than that — a half-faded hexagon
over a pale basemap reads as a LIGHTER class than it is, which for those frames would state the
wrong number.

## Anti-patterns for this case

- **Count is not energy**, and a clock does not change that. A cell packed with hundreds of M4.2
  events outranks one holding a single M7.5. The legend caption and the caveat both say so.
- **Do not re-scale the ramp as the year plays.** The class breaks come from the year's FINAL counts
  and never move, so a cell only ever darkens. Re-binning each day would make cells change class for
  reasons that have nothing to do with an earthquake, which is a lie told at 30 frames a second.
- **Cumulative, never per-day.** A per-day series drawn on this map is a flickering scatter of that
  day's events — a different picture making a different claim. This beat's argument is about
  accumulation, so the running total is what is drawn.
- Do not draw empty cells: 149 non-empty cells out of a far larger possible grid, because an empty
  hexagon over the mid-Atlantic asserts a measurement that was never taken.
- Do not read cell darkness as a rate. There is no denominator; the frame is held to 61°S–78°N
  because a Mercator cell near 60°N covers far less ground than one at the equator.

## What this beat's own `geo-hex.ts` adds, and what it deliberately did not change

It is a copy of the static sibling's module plus six pure additions — `quakeTimesFromCsv`,
`dayIndexInYear`, `daysInYear`, `cumulativeByDay`, `spreadOverDays`, and the private `keptRows` the
first of them shares with `quakePointsFromCsv`. That sharing is load-bearing rather than tidy: the
bake writes each surviving point's own row index into the plate, and this beat reads that event's
DATE back out of the CSV at the same index, so one filter used twice is the only thing that makes the
index mean the same row in both places. **Verified rather than assumed**: this copy's
`quakePointsFromCsv` output is byte-identical to the untouched sibling's on the same 14,175-row file.

## Verification — frames extracted from the mp4 and looked at

Not the still, and not the props: `ffmpeg -vf select=eq(n,N)` on `render/hexgrid.mp4`, committed
beside it.

- **`render/frame-0.png`** — the poster frame. Title, source and caveat at full opacity; the basemap
  and the scale have not faded in yet. Not blank, which 19 mp4s in this repository once were.
- **`render/frame-110.png`** — 28 March 2024, 3,500 events. The Pacific rim is already the shape of
  the finished map, which is the claim's second half made visible.
- **`render/frame-195.png`** — mid-year, the same shape thicker.
- **`render/frame-275.png`** — the subject landing: the accent outline and "Fiji / Tonga" over the
  densest cell, the pill's reserved third line filled with "1,720 of them in one cell".
- **`render/frame-379.png`** — the last frame, identical to `render/final-frame.png`.
- The subject cell's own fill was **measured in the mp4's frame 379, not judged by eye**: the pixel
  at its centre is `#2e2e2e`, the ramp's darkest class, matching its 1,720 count against the 661
  break. Looking at the frame, the accent ring reads as lightening the interior; the pixel says
  otherwise, and the pixel is right.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024 · basemap © MapTiler, © OpenStreetMap`

## Size — REFUSED, with the numbers, and R6 declined — 2026-08-11

**This beat pins no size, and that is a decision rather than an omission.** The full measurement is
`probe/VERDICT.md`; re-run it with `bun proof/mapvid-hexgrid-quakes/probe/size-budget.mjs`.

The removal ladder gained **R6, a rung for the title**, because the ledger had recorded the title as
the binding constraint on this beat and its two siblings. Applied here, **R6 declines**: a shorter
form was written that keeps the Ring of Fire, the densest cell, and 360 of 2024's 366 days — 80
characters against 85 — and it still wraps to the same number of lines at every candidate frame. A
rung that frees no budget does not fire, so this beat's own sentence stays.

What the frames leave for the plate, with the caveat kept:

- **landscape 1920 × 1080** — 58 px, a 100 × 58 map, **5% of the frame's width**. Spending the
  conclusion line and the caveat's last sentence reaches 173 px, 16%.
- **square 1080 × 1080** — the words alone overrun the band by **776 px**.
- **portrait 1080 × 1920** — by **733 px**.

**The refusal does not rest on the caveat.** With the caveat gone entirely, landscape leaves 300 px
(a 522 × 300 map, 27% of the frame) and square and portrait still have no room at all. So the
honesty line is kept and the beat still refuses — which is the stronger of the two statements.

The delivered mp4 already measures 1080 × 1080, which is the square row's own dimensions. That is
not a pin: at square the row's floor is 36 px against this beat's smallest token of 16, and the type
scale that follows is what puts the words 776 px over the band.

What would close it is named in the verdict and is not a rung: this genre lays its furniture in one
column, and a landscape frame gives 1750 px of width against 910 px of band. A layout that puts the
plate beside its words rather than between them is a redraw, and a person's decision.
