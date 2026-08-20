# The guards, and what each creation process carries

**Generated — do not edit by hand.** `bun scripts/guards.mjs --write` rewrites this file;
`bun scripts/guards.mjs --check` fails if it has drifted from the catalogue.

A guard is listed for a skill only where the defect it catches is REACHABLE there. **R** means the
skill's own verification scripts declare it; **·** means the defect can happen there and nothing
checks it; blank means it cannot happen there at all — and where that blankness was argued rather
than obvious, the argument is written out below the table.

| guard | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| duplicated-payload |  | **R** |  |  |  | **R** | **R** | **R** |
| projection-pairing |  |  |  |  |  |  |  | **R** |
| plate-geometry-pairing |  |  |  |  | **R** | **R** |  |  |
| plate-follows-theme |  |  |  | **R** | **R** | **R** |  | **R** |
| screen-space-dash | **R** | **R** | **R** |  | **R** | **R** |  | **R** |
| reached-mark-declares |  |  |  |  |  |  |  | **R** |
| step-redraws |  |  |  |  |  |  |  | **R** |
| scrub-not-slideshow |  |  |  |  |  |  |  | **R** |
| model-declared |  |  |  |  |  |  |  | **R** |
| reveal-completes |  |  | **R** |  |  |  |  |  |

## What is still owed — 0 cells

Nothing. Every format carries every guard it can reach.

## Why a cell is blank, where the blankness was argued — 13 of them

Only the cells a reader would otherwise re-open: one retired after being measured absent, or one
belonging to a format that works differently end to end.

- `dw-beat` cannot reach **duplicated-payload** — the delivered web artefact is a page whose body is a single iframe to the hosted chart: it inlines no asset at all, so none can be inlined twice
- `map-beat` cannot reach **projection-pairing** — retired after measurement, not left owed: object-fit appears in exactly two files in this tree, both scrolly IMAGE beats, and in no cartographic component. A map beat composites its plate as an <image> INSIDE the marks' own SVG, in their coordinate system, so there are not two projections that could disagree. The same defect is reachable here by the format's other mechanism, which is what plate-geometry-pairing was written for
- `map-web` cannot reach **projection-pairing** — retired on the same measurement one task later: object-fit appears in none of the 23 web artifacts. This format composites its plate the way map-beat does, and pairs its ratio against the projected frame instead
- `dw-beat` cannot reach **projection-pairing** — there is no raster plate and no overlay drawn on it: the artefact is one exported image, or an iframe to a hosted chart
- `dw-beat` cannot reach **plate-geometry-pairing** — nothing is baked here. There is no plate.png and no geometry.json recording the frame marks were projected into, because this format projects nothing
- `dw-beat` cannot reach **screen-space-dash** — this producer authors no marks. A dashed rule is a Datawrapper enum (a range annotation's strokeType) drawn by Datawrapper's own renderer, and the vector-effect that makes the defect possible is not ours to write
- `chart-web` cannot reach **reached-mark-declares** — retired after measurement: this guard's precondition is a reveal that ENDS, and nothing in this format reveals. Across its 15 delivered pages there is not one requestAnimationFrame and not one @keyframes; the only animations are 120ms hover transitions on a colour. A web chart is a finished picture with detail on demand, so no mark can be pending when a reveal ends
- `map-web` cannot reach **reached-mark-declares** — retired on the same measurement: the four animations each of its pages carries are inside maplibre-gl itself — the loading spinner and the user-location pulse — not in the beat. The beat's own picture is finished when the page loads
- `chart-video` cannot reach **reached-mark-declares** — the defect IS reachable here, and the DECLARATION is not the reading. A video signals arrival with opacity driven by a progress and declares no data-state anywhere; the owner's decision (plan, Task 7, 2026-08-20) was to read the last frame instead, which for this format is arithmetic. See reveal-completes
- `dw-beat` cannot reach **step-redraws** — there are no steps: nothing here is driven by a reader's gesture or by a frame number
- `dw-beat` cannot reach **scrub-not-slideshow** — there is nothing to scrub: a delegated chart has one state
- `dw-beat` cannot reach **model-declared** — it reads which of the two scroll models a beat is built on, off the markup. A delegated chart is built on neither
- `scrolly` cannot reach **reveal-completes** — a reader drives the reveal here, so there is no last frame to end on: the same defect is caught by reached-mark-declares, which this format has the vocabulary for

## What each guard refuses, and the defect that earned it

### duplicated-payload — `duplicatedPayload`

**Refuses:** an asset inlined more than once into a self-contained delivered file

**Earned by:** a delivered route scrolly carried the same 340 KiB basemap plate five times — 1.33 MB of a 1.80 MB page, on a beat a newsroom would open on a phone

### projection-pairing — `projectionDisagreements`

**Refuses:** a raster plate and the overlay drawn on it fitting differently: cover pairs with slice, contain with meet, fill with none

**Earned by:** at 375x812 a plate cropped under an overlay that letterboxed drew Lisbon over Switzerland, at a scale that made every stop a 4px smear

### plate-geometry-pairing — `plateMatchesGeometry`

**Refuses:** a baked plate whose aspect ratio is not the frame its own marks were projected into, so the default xMidYMid meet letterboxes it under them

**Earned by:** the same defect projection-pairing names, reached by this format's other mechanism: a map beat composites its plate as an <image> inside the marks' own SVG, where there is no object-fit to disagree with a preserveAspectRatio and the disagreement is between the plate's own ratio and its box

### plate-follows-theme — `plateFollowsGround`

**Refuses:** a baked plate on the opposite luminance side from the ground its beat declares

**Earned by:** a beat declared ground #16191B and painted white labels on a dark halo over a dataviz-light plate: furniture correct for its theme, and unreadable

**Also reached by:** dw-beat, where the surface is not a baked plate but the PNG a delegated renderer hands back. This producer's spec requires an accent and has no field for a ground, so Datawrapper paints on whatever surface its own theme chooses and a story that declared a dark ground can be delivered a white rectangle. Same decision, same tuning constants, different measurement.

### screen-space-dash — `revealDashInScreenSpace`

**Refuses:** a dash that measures its own path while vector-effect: non-scaling-stroke computes it in screen space, where that length does not live

**Earned by:** a river drawn as head, hole and tail because a pattern one route long was measured against a line the camera had scaled up 1.68x; six hours and five wrong diagnoses

### reached-mark-declares — `neverReached`

**Refuses:** a mark still data-state=pending when the reveal has ended

**Earned by:** stop badges kept the fill they were SSR'd with while the line arrived at each of them: the narrative got there and the picture never said so

### step-redraws — `stillSteps`

**Refuses:** two consecutive steps painting the same picture

**Earned by:** a five-stop scrolly repainted 4.4 / 0.0 / 0.0 / 0.0 % of its marks across four transitions: one identical picture, five times

### scrub-not-slideshow — `stalledSteps`

**Refuses:** a step whose picture never moves anywhere inside itself, on a beat built to scrub

**Earned by:** five finished SSR'd pictures passed every other guard and still jumped at each boundary: the line never drew under the reader's gesture

### model-declared — `requiresScrub`

**Refuses:** nothing on its own: it reads which of the two models a beat is built on, off the markup

**Earned by:** an assembly and a scrub owe different things, and guessing which is which misfires on both — the seed's four media have nothing to scrub between

### reveal-completes — `neverArrives`

**Refuses:** a ramp whose input range outruns the progress driving it, so the mark it reveals is still arriving when the composition ends

**Earned by:** the same defect reached-mark-declares names, reached by this format's own mechanism: a scrolly says a mark arrived by flipping data-state, and a video says it by an opacity ramp. checkTiming already guarantees every NAMED event ends with the composition, so the offender can only be one level down — a ramp over an already-clamped progress whose range ends above 1 never reaches its own end, and the mark it fades in is still fading when the reader's video stops
