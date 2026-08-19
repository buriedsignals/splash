# The guards, and what each creation process carries

**Generated — do not edit by hand.** `bun scripts/guards.mjs --write` rewrites this file;
`bun scripts/guards.mjs --check` fails if it has drifted from the catalogue.

A guard is listed for a skill only where the defect it catches is REACHABLE there. **R** means the
skill's own verification scripts declare it; **·** means the defect can happen there and nothing
checks it; blank means it cannot happen there at all.

| guard | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| duplicated-payload |  | · |  |  |  | · | · | **R** |
| projection-pairing |  |  |  |  | · | · |  | **R** |
| plate-follows-theme |  |  |  |  | · | · |  | **R** |
| screen-space-dash | · | · | **R** |  | · | · |  | **R** |
| reached-mark-declares |  | · | · |  |  | · |  | **R** |
| step-redraws |  |  |  |  |  |  |  | **R** |
| scrub-not-slideshow |  |  |  |  |  |  |  | **R** |
| model-declared |  |  |  |  |  |  |  | **R** |

## What is still owed — 14 cells

- `chart-web` owes **duplicated-payload**
- `map-web` owes **duplicated-payload**
- `image-beat` owes **duplicated-payload**
- `map-beat` owes **projection-pairing**
- `map-web` owes **projection-pairing**
- `map-beat` owes **plate-follows-theme**
- `map-web` owes **plate-follows-theme**
- `chart-beat` owes **screen-space-dash**
- `chart-web` owes **screen-space-dash**
- `map-beat` owes **screen-space-dash**
- `map-web` owes **screen-space-dash**
- `chart-web` owes **reached-mark-declares**
- `chart-video` owes **reached-mark-declares**
- `map-web` owes **reached-mark-declares**

## What each guard refuses, and the defect that earned it

### duplicated-payload — `duplicatedPayload`

**Refuses:** an asset inlined more than once into a self-contained delivered file

**Earned by:** a delivered route scrolly carried the same 340 KiB basemap plate five times — 1.33 MB of a 1.80 MB page, on a beat a newsroom would open on a phone

### projection-pairing — `projectionDisagreements`

**Refuses:** a raster plate and the overlay drawn on it fitting differently: cover pairs with slice, contain with meet, fill with none

**Earned by:** at 375x812 a plate cropped under an overlay that letterboxed drew Lisbon over Switzerland, at a scale that made every stop a 4px smear

### plate-follows-theme — `plateFollowsGround`

**Refuses:** a baked plate on the opposite luminance side from the ground its beat declares

**Earned by:** a beat declared ground #16191B and painted white labels on a dark halo over a dataviz-light plate: furniture correct for its theme, and unreadable

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
