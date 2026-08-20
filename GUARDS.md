# The guards, and what each creation process carries

**Generated — do not edit by hand.** `bun scripts/guards.mjs --write` rewrites this file;
`bun scripts/guards.mjs --check` fails if it has drifted from the catalogue.

A rule is listed for a skill only where what it names is REACHABLE there — computed from the
traits the skill declares. **R** means the skill's own verification scripts declare it; **·**
means it can happen there and nothing checks it yet; blank means it cannot happen there at all
— and where that blankness is a genuine exception rather than a missing trait, the argument is
written out below the tables.

## guard

| guard | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| duplicated-payload |  | **R** |  |  | **R** | **R** | **R** | **R** |
| projection-pairing |  |  |  |  |  |  |  | **R** |
| plate-geometry-pairing |  |  |  |  | **R** | **R** |  | **R** |
| plate-follows-theme |  |  |  | **R** | **R** | **R** |  | **R** |
| screen-space-dash | **R** | **R** | **R** |  | **R** | **R** |  | **R** |
| reached-mark-declares |  |  |  |  |  |  |  | **R** |
| step-redraws |  |  |  |  |  |  |  | **R** |
| scrub-not-slideshow |  |  |  |  |  |  |  | **R** |
| model-declared |  |  |  |  |  |  |  | **R** |
| reveal-completes |  |  | **R** |  | **R** |  |  |  |

## capability

| capability | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| same-facts-without-the-picture |  | **R** |  |  |  | **R** |  |  |
| reachable-by-keyboard |  | **R** |  |  |  | **R** |  |  |
| honours-reduced-motion |  | **R** |  |  |  |  |  |  |
| degrades-without-javascript |  | **R** |  |  |  | **R** |  |  |
| weight-has-a-ceiling |  | **R** |  |  | **R** | **R** | **R** | **R** |
| every-photo-says-what-it-shows |  |  |  |  |  |  | **R** |  |

## discipline

| discipline | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cartographic-rules |  |  |  |  | **R** | **R** |  | **R** |
| motion-grammar |  |  | **R** |  | **R** |  |  |  |
| static-discipline | **R** | **R** | **R** |  | **R** | **R** | **R** | **R** |

Disciplines are checked for PRESENCE where an author reads them, and are not mechanically verified.

## What is still owed — 0 cells

Nothing. Every format carries every rule it can reach.

## Why a cell is blank, where the blankness was argued — 10 of them

Only the cells a reader would otherwise re-open: a skill within the reachable set that is still
excepted for a documented reason. A skill outside the reachable set needs no entry — the absent
trait already proves it.

- `image-beat` cannot reach **screen-space-dash** — measured 2026-08-20: the seed's rendered artifact (skills/image-beat/assets/ImageBeatSeed.tsx) is exactly three element kinds — rect, image, text — and none carries a stroke; 0 of 1 components this format has ever drawn (no proof/ beat exists outside the two image/scrolly beats, which draw with the vehicle's own component, never this seed) carry any dash-capable mark. Structural, not incidental: references/image-discipline.md draws the boundary itself — "a photograph is not a chart: nothing here is computed from the data, because there is no data" — so this format's vocabulary never grows a stroked path the way a chart's or a map's marks can. Unlike map-web (screen-space-dash, carried at zero dashed marks as a ratchet over a population that legitimately could grow), there is no population here to ratchet over.
- `dw-beat` cannot reach **same-facts-without-the-picture** — measured 2026-08-20: the delivered artifact (iframePage in scripts/produce.mjs) is an <iframe> pointing at a Datawrapper-hosted embed, drawing zero marks of its own — zero data-detail anywhere in the wrapper HTML this skill writes. tableCarriesTheMarks passes vacuously (marks: 0, missing: []) on every one of them, which confirms nothing: whatever accessible fallback the hosted embed itself offers lives behind a cross-origin boundary this skill does not own, cannot inline a table into, and cannot even inspect from its own delivered file
- `scrolly` cannot reach **same-facts-without-the-picture** — measured 2026-08-20 across every delivered scrolly beat (8 proof/ directories, including the two whose CHART track draws real data: scrolly-chart-eu-carbon, scrolly-one-chart-swiss-life-expectancy): zero marks, on any of the four tracks, carry data-detail anywhere. ChartFrame in assets/ScrollySeed.tsx draws one continuous line plus two annotated points, never chart-web's per-reading interactive marks, and none of the image/diagram/map tracks use the convention either. tableCarriesTheMarks passes vacuously (marks: 0) on every delivered page: there is no population of per-reading facts here for a table to gather
- `scrolly` cannot reach **reachable-by-keyboard** — measured 2026-08-20 across every delivered scrolly beat (the same 8 proof/ directories same-facts-without-the-picture's own scrolly exception measured): zero marks, on any of the four tracks, carry data-detail anywhere, so keyboardReachesEveryMark reports {marks: 0} vacuously on every one of them — there is no per-reading fact here for a Tab sequence to reach in the first place
- `dw-beat` cannot reach **reachable-by-keyboard** — measured 2026-08-20: the delivered artifact (iframePage in scripts/produce.mjs) is an <iframe> pointing at a Datawrapper-hosted embed, drawing zero marks of its own — zero data-detail anywhere in the wrapper HTML this skill writes. Whatever a keyboard reaches inside the hosted embed lives behind a cross-origin boundary this skill does not own and cannot drive a Tab sequence into from its own delivered file
- `map-web` cannot reach **honours-reduced-motion** — measured 2026-08-20: neither MapWebSeed.tsx nor render-web.mjs declares any entrance/build motion of its own — no data-entrance-motion, no @keyframes this skill wrote. The only `prefers-reduced-motion` reference in a delivered page belongs to the bundled MapLibre GL JS vendor library (a `prefersReducedMotion` getter, plus unconditional vendor CSS like `.maplibregl-marker{transition:opacity .2s}`) which this skill did not write and does not gate. motionUnderReduce reports {movedFrames: 0} under both conditions on all 4 delivered beats — vacuous, and confirms nothing about a mechanism this skill does not have
- `scrolly` cannot reach **honours-reduced-motion** — measured 2026-08-20: this format's own reveal IS gated correctly (render-scrolly.mjs: `.step-frame{transition:opacity .3s ease}` inside `@media (prefers-reduced-motion: no-preference)`, proven by this format's own dedicated instrument, verify-scrolly.mjs's verifyStates) but it is driven by the reader's OWN scroll over `.scrolly-steps`, an internal element this format owns rather than the page itself — assertion A of verify-scrolly.mjs states THE PAGE DOES NOT SCROLL by design. motionUnderReduce drives page-level scroll (document.scrollingElement) precisely so no format-specific container name has to live inside a function the shared-copy contract requires byte-identical everywhere it is carried; against a page that structurally never scrolls at the document level, it reports {movedFrames: 0} under both conditions on every delivered scrolly beat — vacuous on THIS detector, not evidence of a defect, and not a claim this skill's own verifyStates does not already make correctly by its own, different mechanism
- `dw-beat` cannot reach **honours-reduced-motion** — measured 2026-08-20: the delivered artifact (iframePage in scripts/produce.mjs) is an <iframe> pointing at a Datawrapper-hosted embed, drawing zero marks and authoring zero motion of its own. motionUnderReduce reports {movedFrames: 0} under both conditions vacuously — whatever the hosted embed itself does lives behind a cross-origin boundary this skill does not own and cannot drive a media-feature emulation into from its own delivered file
- `scrolly` cannot reach **degrades-without-javascript** — measured 2026-08-20 across every delivered scrolly beat (the same 8 proof/ directories same-facts-without-the-picture's own scrolly exception measured): zero marks, on any of the four tracks, carry data-detail anywhere, so staticFrameSurvives reports {marksWithJs: 0, marksWithout: 0} vacuously on every one of them — there is no per-reading fact here for either count to be about
- `dw-beat` cannot reach **degrades-without-javascript** — measured 2026-08-20: the delivered artifact (iframePage in scripts/produce.mjs) is an <iframe> pointing at a Datawrapper-hosted embed, drawing zero marks of its own — zero data-detail anywhere in the wrapper HTML this skill writes, with or without scripting. Whatever the hosted embed itself does when its own script fails to run lives behind a cross-origin boundary this skill does not own and cannot measure from its own delivered file

## What each skill is

WHY a rule reaches a skill, not restated from the matrices above: the traits
`skills/doctrine/test/traits.test.ts` proves against each skill's own files. A rule REQUIRES
some of these; a skill that carries all of them is reachable, computed, never typed.

| skill | draws-own-geometry | bakes-a-plate | delegates-rendering | owns-a-surface-it-did-not-choose | timed-build-that-ends | reader-driven-reveal | ships-standalone-html | inlines-its-assets | embeds-reader-photos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chart-beat | ✓ |  |  |  |  |  |  |  |  |
| chart-web | ✓ |  |  |  |  |  | ✓ | ✓ |  |
| chart-video | ✓ |  |  |  | ✓ |  |  |  |  |
| dw-beat |  |  | ✓ | ✓ |  |  | ✓ |  |  |
| map-beat | ✓ | ✓ |  | ✓ | ✓ |  |  | ✓ |  |
| map-web | ✓ | ✓ |  | ✓ |  |  | ✓ | ✓ |  |
| image-beat | ✓ |  |  |  |  |  |  | ✓ | ✓ |
| scrolly | ✓ | ✓ |  | ✓ |  | ✓ | ✓ | ✓ |  |

## What each rule refuses, and the defect that earned it

### duplicated-payload — `duplicatedPayload`

**Refuses:** an asset inlined more than once into a self-contained delivered file

**Earned by:** a delivered route scrolly carried the same 340 KiB basemap plate five times — 1.33 MB of a 1.80 MB page, on a beat a newsroom would open on a phone

### projection-pairing — `projectionDisagreements`

**Refuses:** a raster plate and the overlay drawn on it fitting differently: cover pairs with slice, contain with meet, fill with none

**Earned by:** at 375x812 a plate cropped under an overlay that letterboxed drew Lisbon over Switzerland, at a scale that made every stop a 4px smear. `map-beat` and `map-web` do not reach this rule — neither ships an <img> with object-fit at all, so there is no second projection to disagree with the first: a map beat composites its plate as an <image> inside its own marks' SVG, in their coordinate system, and pairs its ratio against the projected frame instead. That is the same defect reached by this format's other mechanism, which is what plate-geometry-pairing was written for

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

### same-facts-without-the-picture — `tableCarriesTheMarks`

**Offers:** a reader who cannot see the graphic gets the same values, in a table carrying the marks' own numbers

**Earned by:** map-web shipped an opt-in accessible table from its first version while chart-web shipped none, on the same trait: a chart is exactly as unreadable to a screen reader as a map, and nothing said so

### reachable-by-keyboard — `keyboardReachesEveryMark`

**Offers:** a reader with no pointer gets to every mark by Tab, in order, and hears or reads its own reading — never merely a `tabIndex` that gets there with nothing to say

**Earned by:** same-facts-without-the-picture proved a screen reader could get the numbers through a table; nothing yet proved a reader who cannot USE a pointer at all — the keyboard-only case a mouse-and-touch verification never drives — could get to a single mark on the picture itself

### honours-reduced-motion — `motionUnderReduce`

**Offers:** a reader who told their OS they want less motion gets a page that never interpolates an opacity or a scale — the finished graphic, immediately, with no build to sit through and no ramp to be caught mid-flight by

**Earned by:** chart-web's own entrance (render-web.mjs's entranceCss()) was written CORRECTLY from the start — every keyframe lives inside `@media (prefers-reduced-motion: no-preference)` rather than a `reduce` reset — but nothing had ever driven a real page under `reduce` and measured that the claim holds; this is that measurement, generalised to a detector any format ships

### degrades-without-javascript — `staticFrameSurvives`

**Offers:** a reader whose script never ran — blocked, failed to load, an embed's host CSP, a crawler — still gets every mark's own reading, not a mount point that only fills in once a script runs

**Earned by:** same-facts-without-the-picture and reachable-by-keyboard both proved something about the marks a script WIRES for interaction; neither asked whether the marks are there AT ALL once the wiring script is gone — a page could pass both by hydrating an empty mount point and still show nothing to the reader this capability is for

### weight-has-a-ceiling — `weightAgainstCeiling`

**Offers:** a reader on a slow connection or a metered one never downloads more than this format's own beats have ever actually weighed — the delivered file's own size, measured against a ceiling earned from today's population rather than assumed ahead of it

**Earned by:** image-beat's own checkWeight (scripts/render-still.mjs) already refuses a beat about to embed more than 20 MB of raw photograph bytes — a limit on what goes IN. Nothing had ever measured what comes OUT: the delivered file itself, once every plate, photograph or font it inlines is already inside it, against what this format's own beats weigh today rather than a number invented ahead of any of them

### every-photo-says-what-it-shows — `photosDeclareAltAndCredit`

**Offers:** a reader who cannot see a photograph, or whose image failed to load, still gets what it shows and whose it is — an alt and a credit read mechanically off the delivered file, not merely assumed because a write-time refusal exists

**Earned by:** this format's own discipline (references/image-discipline.md, "Alt text and credit") already requires both, and imageBeatLayout already refuses to render a photo missing either one — a write-time guarantee this makes mechanical by reading it back off the delivered markup itself, the same "a decision nothing calls is a decision that does not run" standard duplicatedPayload is already held to

### cartographic-rules — `doctrine/references/geo-discipline.md`

**Refuses:** a map beat's own furniture written as if baking a plate were generic instead of governed by twelve named rules — an ungated capture that can hang forever, a moving camera captured live instead of translated inside one fixed plate, tile fragments drawn as a line before they are baked into ordered GeoJSON

**Earned by:** map-beat's own CO₂ choropleth paid for seven of the twelve rules one at a time, each one bought by a defect that reached a render before it was written down — an ungated capture that hung forever the first time a tile never resolved, a shimmering moving camera, a fill that would not close because its fragments were never ordered — so the next format that bakes a plate reads the twelve rather than re-earning them

### motion-grammar — `doctrine/references/motion-grammar.md`

**Refuses:** a timed build that reinvents its own reveal order and furniture from nothing — dense ticks on a frame the reader cannot pause on, an end-label pinned to its final position before the mark carrying it has arrived, the conclusion treated as furniture instead of the one event a video's own stack has to end on

**Earned by:** the same end-label mistake — gated on a signal describing the whole composition and pinned to a mark's eventual position, instead of gated on that mark's own local progress — shipped independently in both a scroll-driven build and a timed one before the grammar named which two rules are format-scoped and why applying either outside its own format produces exactly that defect

### static-discipline — `chart-beat/references/static-discipline.md`

**Refuses:** a beat's own component reinventing composition from nothing — an accent carrying more than one meaning, furniture that does not derive from the ground, a scale that hides zero on a bar, a gap in the data quietly bridged into a claim of continuity the data does not support

**Earned by:** written against the first static beat and re-earned by every format that draws its own marks since, on the same rule for the same reason: a beat is not finished because its tests are green — its pixels still have to be looked at, whether they sit still, animate to a last frame, scroll under a reader's own gesture, or bake behind a live map
