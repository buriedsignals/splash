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
| duplicated-payload |  |  |  |  | **R** | **R** | **R** | **R** |
| projection-pairing |  |  |  |  |  |  |  | **R** |
| plate-geometry-pairing |  |  |  |  | **R** | **R** |  | **R** |
| plate-follows-theme |  |  |  | **R** | **R** | **R** |  | **R** |
| screen-space-dash | **R** | **R** | **R** |  | **R** | **R** |  | **R** |
| reached-mark-declares |  |  |  |  |  |  |  | **R** |
| step-redraws |  |  |  |  |  |  |  | **R** |
| scrub-not-slideshow |  |  |  |  |  |  |  | **R** |
| model-declared |  |  |  |  |  |  |  | **R** |
| reveal-completes |  |  | **R** |  | **R** |  |  |  |
| csv-split-by-hand |  |  | **R** | **R** | **R** | **R** |  | **R** |
| unmatched-value-hides |  |  |  |  | **R** | **R** |  |  |
| sub-pixel-marks-keep-a-channel |  |  |  |  |  | **R** |  |  |
| value-labels-collide-or-clip |  |  |  |  | **R** | **R** |  |  |
| page-declares-story-language |  | **R** |  | **R** |  | **R** |  | **R** |
| credential-alias-reconciled |  |  |  | **R** | **R** | **R** |  | **R** |
| reveal-fills-the-frame |  |  |  |  |  |  |  | **R** |
| label-fits-inside-the-plate |  |  |  |  | **R** | **R** |  | **R** |
| reveal-order-is-earned |  |  | **R** |  | **R** |  |  |  |
| guard-wired-to-run | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| labels-name-their-own-row | **R** | **R** | **R** |  | **R** | **R** | **R** | **R** |
| rtl-runs-carry-their-direction | **R** | **R** | **R** |  | **R** | **R** | **R** | **R** |
| accent-survives-delegation |  |  |  | **R** |  |  |  |  |

## capability

| capability | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| same-facts-without-the-picture |  | **R** |  |  |  | **R** |  |  |
| reachable-by-keyboard |  | **R** |  |  |  | **R** |  |  |
| honours-reduced-motion |  | **R** |  |  |  |  |  |  |
| degrades-without-javascript |  | **R** |  |  |  | **R** |  |  |
| weight-has-a-ceiling |  |  |  |  | **R** | **R** | **R** | **R** |
| every-photo-says-what-it-shows |  |  |  |  |  |  | **R** |  |
| framing-is-measured | **R** | **R** | **R** |  |  |  |  |  |
| fills-its-frame | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| storyboard-gate-is-visible | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| example-runners-are-called | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| runner-answer-can-be-believed | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| denominator-reading-is-stated | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| credit-traces-to-the-record | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| double-hyphen-reaches-a-reader | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |

## discipline

| discipline | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cartographic-rules |  |  |  |  | **R** | **R** |  | **R** |
| motion-grammar |  |  | **R** |  | **R** |  |  |  |
| static-discipline | **R** | **R** | **R** |  | **R** | **R** | **R** | **R** |
| palette-names-its-source | **R** | **R** | **R** |  | **R** | **R** | **R** | **R** |
| framing-serves-the-point | **R** | **R** | **R** |  |  |  |  |  |
| typeface-is-recorded |  |  |  |  |  | **R** | **R** | **R** |

Disciplines are checked for PRESENCE where an author reads them, and are not mechanically verified.

## What is still owed — 0 cells

Nothing. Every format carries every rule it can reach.

## Why a cell is blank, where the blankness was argued — 22 of them

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
- `image-beat` cannot reach **framing-serves-the-point** — a photograph is not a chart: nothing here is computed from the data, because there is no data (references/image-discipline.md) — there is no plotted extent and no group of marks for either number to describe, the same reasoning screen-space-dash was already excepted on here
- `map-beat` cannot reach **framing-serves-the-point** — measured 2026-08-20: this format already carries its own, more exact mechanism for the same family of defect — binsCrossedByProjection/assertAreaEncodingIsHonest (assets/geo.ts) measures how many of a choropleth's OWN class breaks a projection's area bias alone can move a cell across (map-quake-density: up to 2 bins at a measured x24.0 bias) and refuses an undisclosed one. A choropleth has no shared zero-based axis for spreadAgainstExtent to read and no single group of comparable marks the way a bar chart's bars are; the analogous skew is already caught, more precisely, by this skill's own class-scale discipline
- `map-web` cannot reach **framing-serves-the-point** — same reasoning as map-beat: map-web shares assets/geo.ts's join and class-scale mechanism wholesale (COPIES, `splash/test/guard-copies-parity.test.ts`), including binsCrossedByProjection/assertAreaEncodingIsHonest. No shared zero-based axis, no single group of comparable marks for either number to describe
- `scrolly` cannot reach **framing-serves-the-point** — this skill's own doctrine says so directly — "it does not invent a second drawing engine" (SKILL.md) — its CHART track draws under chart-beat's or chart-web's own conventions rather than deciding a plot extent of its own, and its MAP and IMAGE tracks are covered by the same reasoning already argued for map-beat and image-beat above
- `image-beat` cannot reach **framing-is-measured** — a photograph is not a chart: nothing here is computed from the data, because there is no data (references/image-discipline.md) — there is no plotted extent and no group of marks for either number to describe, the same reasoning screen-space-dash was already excepted on here
- `map-beat` cannot reach **framing-is-measured** — measured 2026-08-20: this format already carries its own, more exact mechanism for the same family of defect — binsCrossedByProjection/assertAreaEncodingIsHonest (assets/geo.ts) measures how many of a choropleth's OWN class breaks a projection's area bias alone can move a cell across (map-quake-density: up to 2 bins at a measured x24.0 bias) and refuses an undisclosed one. A choropleth has no shared zero-based axis for spreadAgainstExtent to read and no single group of comparable marks the way a bar chart's bars are; the analogous skew is already caught, more precisely, by this skill's own class-scale discipline
- `map-web` cannot reach **framing-is-measured** — same reasoning as map-beat: map-web shares assets/geo.ts's join and class-scale mechanism wholesale (COPIES, `splash/test/guard-copies-parity.test.ts`), including binsCrossedByProjection/assertAreaEncodingIsHonest. No shared zero-based axis, no single group of comparable marks for either number to describe
- `scrolly` cannot reach **framing-is-measured** — this skill's own doctrine says so directly — "it does not invent a second drawing engine" (SKILL.md) — its CHART track draws under chart-beat's or chart-web's own conventions rather than deciding a plot extent of its own, and its MAP and IMAGE tracks are covered by the same reasoning already argued for map-beat and image-beat above
- `chart-beat` cannot reach **typeface-is-recorded** — measured 2026-08-21: this format already carries the more exact mechanism for the same defect, in code rather than prose — its own scripts/render-still.mjs holds FONT_FAMILY as a `let` that useTypeface reassigns from a recorded TYPEFACE.md (readTypeface walks up from the beat's own directory and throws naming every directory searched), refuses a family that does not resolve on this machine instead of substituting one, and refuses any element drawn in a family other than the one in force (assertDrawnInActiveTypeface). What it lacked was a writer, which palette now carries; the discipline is prose for the three formats whose render-still.mjs holds `export const FONT_FAMILY` as a const no recorded answer can reach. Same reasoning framing-serves-the-point is excepted on for map-beat
- `chart-web` cannot reach **typeface-is-recorded** — measured 2026-08-22, REWRITTEN: the 2026-08-21 reason cited this format's vendored scripts/render-still.mjs and was true of a path the format does not deliver. That file is the STATIC PREVIEW; the artefact chart-web hands a reader is the HTML page, and round six measured `grep -c readTypeface scripts/render-web.mjs` -> 0 against render-web.mjs:524's literal `font-family: Helvetica, Arial, sans-serif`, while NEWSROOM.md records `Space Grotesk, Courier New`. An exception argued on a path the format does not deliver is not an exception. Both paths now carry the mechanism: scripts/render-web.mjs reads the recorded answer at module load (readTypeface walking up to this format's own TYPEFACE.md, or props.typeface from the story's), puts it in force with useTypeface before measureText sizes a single gutter — so the delivered stylesheet and the y-axis column can never name different faces — writes it into the page's own font-family rule and into the figure's markup from that one record, and calls assertDrawnInActiveTypeface on the SSR'd markup so a component that snapshotted a face of its own is refused rather than shipped. Demonstrated: a record of Courier New (the newsroom's own second face, and the one that resolves on this machine — Space Grotesk does not, which is why all twelve TYPEFACE.md files in the tree record the fallback) reaches the delivered page in both places. What it does NOT settle, named rather than implied: whether the READER's machine has the face. A self-contained page that guarantees that must embed a subsetted face (survey/typeface-feasibility.md §3), which is a separate step; a page that names the recorded family with the substrate stack behind it has stopped being a beat set in a face nobody chose. doctrine/test/exception-covers-the-delivered-path.test.ts is what keeps this claim from drifting back onto the preview: it reads this rule's own exceptions and reddens on any materialising entrypoint that names a font stack and reaches no recorded answer
- `chart-video` cannot reach **typeface-is-recorded** — measured 2026-08-21: same mechanism, and the format with the least slack for prose — a build rasterises every frame in the face in force, so a silent fallback is baked three hundred times over with no reader-side reflow to reveal it. Its own scripts/render-still.mjs carries readTypeface/useTypeface/assertDrawnInActiveTypeface
- `map-beat` cannot reach **typeface-is-recorded** — measured 2026-08-21: same mechanism, reached from three of its own scripts rather than one — render-map.mjs, render-still.mjs and render-preview.mjs each call readTypeface and useTypeface, so a map beat's labels and legend are set in the recorded face or the run refuses

## What each skill is

WHY a rule reaches a skill, not restated from the matrices above: the traits
`skills/doctrine/test/traits.test.ts` proves against each skill's own files. A rule REQUIRES
some of these; a skill that carries all of them is reachable, computed, never typed.

| skill | draws-own-geometry | bakes-a-plate | delegates-rendering | owns-a-surface-it-did-not-choose | timed-build-that-ends | reader-driven-reveal | ships-standalone-html | inlines-its-assets | embeds-reader-photos | reads-a-journalists-csv | joins-values-to-shapes | reads-a-palette | reads-a-provider-credential | materialises-a-beat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chart-beat | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  | ✓ |
| chart-web | ✓ |  |  |  |  |  | ✓ |  |  |  |  | ✓ |  | ✓ |
| chart-video | ✓ |  |  |  | ✓ |  |  |  |  | ✓ |  | ✓ |  | ✓ |
| dw-beat |  |  | ✓ | ✓ |  |  | ✓ |  |  | ✓ |  |  | ✓ | ✓ |
| map-beat | ✓ | ✓ |  | ✓ | ✓ |  |  | ✓ |  | ✓ | ✓ | ✓ | ✓ | ✓ |
| map-web | ✓ | ✓ |  | ✓ |  |  | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ | ✓ |
| image-beat | ✓ |  |  |  |  |  |  | ✓ | ✓ |  |  | ✓ |  | ✓ |
| scrolly | ✓ | ✓ |  | ✓ |  | ✓ | ✓ | ✓ |  | ✓ |  | ✓ | ✓ | ✓ |

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

**Earned by:** a beat declared ground #16191B and painted white labels on a dark halo over a dataviz-light plate: furniture correct for its theme, and unreadable. ROUND-FIVE FINDING Y2 changed WHEN dw-beat asks, not what it decides: the delegated run that earned it created the chart, uploaded 186 rows, PUBLISHED it, exported the PNG and only then refused it (ground #16191B luminance 0.009 against export luminance 0.991), while preflight reported the capability available, the producer gate never mentioned a surface, and palette offered that newsroom only dark grounds — so no recordable answer would have been honoured and a live chart existed for a delivery nobody was told could not be made. `planExportSurface` now runs before `createChart` and either names the surface the export must be requested on, returns null for a ground in the mid-grey band this decision itself has no opinion about, or throws with nothing yet created. The delegate's two surfaces were measured live on chart cc6eK: a plain export at mean luminance 0.991, the same export with dark=true at 0.018; a published EMBED follows the READER's colour scheme and defaults to light, which is why the web branch is the one that can be refused early and never steered. Proved end to end on chart NJPlK: a story declaring ground #16191B was delivered a PNG at mean luminance 0.022 and this decision passed rather than refused. `splash/scripts/preflight.mjs` carries the fifth byte-identical copy of plateFollowsGround/surfaceLuminance for the same reason — phase 0 already reads NEWSROOM.md, and a preflight that answered "which side is this ground on" differently from the producer would have relocated the surprise rather than removed it

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

**Offers:** a reader on a slow connection or a metered one never downloads more than the delivered file's own size, measured against a ceiling grounded in this format's own numbers rather than a round one invented ahead of them. NOT UNIFORMLY "earned from today's population": map-beat, map-web and scrolly take their ceiling from today's HEAVIEST DELIVERED file plus a margin measured from the biggest jump already on disk between two of them; image-beat has no delivered artefact yet to measure and takes its ceiling instead from its own EXISTING weight discipline (checkWeight's 20 MB raw-photograph limit, inflated by the base64 ratio image-discipline.md already documents) — a real number, but an assumed one, not a measured one.

**Earned by:** image-beat's own checkWeight (scripts/render-still.mjs) already refuses a beat about to embed more than 20 MB of raw photograph bytes — a limit on what goes IN. Nothing had ever measured what comes OUT: the delivered file itself, once every plate, photograph or font it inlines is already inside it, against what this format's own beats weigh today rather than a number invented ahead of any of them. That measurement wants a DELIVERED population to weigh, and image-beat had none yet — so its own cell is the one exception: `checkWeight`'s own limit, not a delivered ceiling, until a real beat exists to measure instead

### every-photo-says-what-it-shows — `photosDeclareAltAndCredit`

**Offers:** a reader who cannot see a photograph, or whose image failed to load, still gets what it shows and whose it is — an alt and a credit read mechanically off the delivered file, not merely assumed because a write-time refusal exists

**Earned by:** this format's own discipline (references/image-discipline.md, "Alt text and credit") already requires both, and imageBeatLayout already refuses to render a photo missing either one — a write-time guarantee this makes mechanical by reading it back off the delivered markup itself, the same "a decision nothing calls is a decision that does not run" standard duplicatedPayload is already held to. ROUND-FIVE FINDING W1, two of this tree's own fixes colliding: round two taught the detector that a bracket-wrapped field is an absence rather than an answer, and round four then gave `credit` an honest UNBRACKETED value for a journalist who genuinely cannot attribute a picture — `unattributed` recorded, `Source: not stated` printed — and told nobody here. The delivered `stress-w-quay-photographs` beat prints that exact sentence under two of its three photographs and this capability answered {"photos":3,"missingAlt":0,"missingCredit":0}, verified by the controller against the delivered SVG. The producing agent's own passes are the whole mechanism: PASS 2, the two gaps written [...], measured missingCredit 2; PASS 3, the same two gaps written as the round-four sentence, measured missingCredit 0 — between them nothing changed about the beat but the WORDING of the absence. The detector now reads both forms of the recorded absence (the printed line AND the raw sentinel, since finding Y1 of the same round measured a producer interpolating the recorded scalar straight into a published artefact), matched at the head on a word boundary the way storyboard's own isUnattributedCredit matches, so "Source: unattributed figures released by the ministry" is still a real credit. It returns a FOURTH count, creditRecordedAbsent, the subset of missingCredit that says so out loud: a newsroom that cannot attribute a picture is neither stopped nor hidden, and a reader of the measurement can tell "nobody was ever asked" from "we asked and the answer was nobody", which is exactly what the single missingCredit 0 destroyed. Measured after the fix: stress-w {"photos":3,"missingAlt":0,"missingCredit":2,"creditRecordedAbsent":2} and stress-h {"photos":3,"missingAlt":1,"missingCredit":1,"creditRecordedAbsent":0}, the two image beats this tree holds

### cartographic-rules — `doctrine/references/geo-discipline.md`

**Refuses:** a map beat's own furniture written as if baking a plate were generic instead of governed by twelve named rules — an ungated capture that can hang forever, a moving camera captured live instead of translated inside one fixed plate, tile fragments drawn as a line before they are baked into ordered GeoJSON

**Earned by:** map-beat's own CO₂ choropleth paid for seven of the twelve rules one at a time, each one bought by a defect that reached a render before it was written down — an ungated capture that hung forever the first time a tile never resolved, a shimmering moving camera, a fill that would not close because its fragments were never ordered — so the next format that bakes a plate reads the twelve rather than re-earning them

### motion-grammar — `doctrine/references/motion-grammar.md`

**Refuses:** a timed build that reinvents its own reveal order and furniture from nothing — dense ticks on a frame the reader cannot pause on, an end-label pinned to its final position before the mark carrying it has arrived, the conclusion treated as furniture instead of the one event a video's own stack has to end on

**Earned by:** the same end-label mistake — gated on a signal describing the whole composition and pinned to a mark's eventual position, instead of gated on that mark's own local progress — shipped independently in both a scroll-driven build and a timed one before the grammar named which two rules are format-scoped and why applying either outside its own format produces exactly that defect

### static-discipline — `chart-beat/references/static-discipline.md`

**Refuses:** a beat's own component reinventing composition from nothing — an accent carrying more than one meaning, furniture that does not derive from the ground, a scale that hides zero on a bar, a gap in the data quietly bridged into a claim of continuity the data does not support

**Earned by:** written against the first static beat and re-earned by every format that draws its own marks since, on the same rule for the same reason: a beat is not finished because its tests are green — its pixels still have to be looked at, whether they sit still, animate to a last frame, scroll under a reader's own gesture, or bake behind a live map

### csv-split-by-hand — `csvSplitByHand`

**Refuses:** a beat's own reader cutting a csv row on every literal comma instead of a parser that understands a quoted field

**Earned by:** proof/more-line-swiss-life-expectancy/render.mjs — the worked example every craft skill points authors at — cut its rows with row.split(","); against the stress data it would have silently corrupted "1,234.5" into two fields and torn "Netherlands, the" in half. Measured 2026-08-20: 84 files across proof/, stories/ and this project's own skill scripts/assets did the same (several, like map-beat/assets/geo.ts, take already-read csv text and never name the .csv extension at all), while skills/intake/scripts/csv.mjs already shipped a real RFC 4180 reader that none of them used

### unmatched-value-hides — `unmatchedValues`

**Refuses:** a source's own value with no shape to receive it, unless the beat declared its source out of scope

**Earned by:** joinValues (map-beat/assets/geo.ts) already refused a shape with no value, naming it — the mirror case rendered nothing at all instead: the stress csv carried a reading for "Atlantis", a country that does not exist, and the join said nothing. The doctrine's own argument for the loud join calls a bad join that renders as no-data and looks legitimate the worse defect; a value with no shape is worse still, because there is no mark anywhere to be wrong

### sub-pixel-marks-keep-a-channel — `marksStrandedWithNoChannel`

**Refuses:** a mark the beat's own camera draws smaller than a pixel — so no pointer, tap or hover reaches it and no hit target can be built that does — shipped without a row in the accessible table or without a keyboard target of its own, which is a fact drawn on the page that no reader can reach by any means

**Earned by:** a ruling asked map-web to replace its colliding-target invariant with a live one about queryRenderedFeatures, and the live measurement refuted it and found something larger. Driven with a real MapTiler key against the committed 241-region world beat (stories/real-owid-life-expectancy), queryRenderedFeatures at each mark's own centre answered own 140, a neighbour 15, NOTHING 86; widened to the fairest reading — any pixel anywhere the map attributes to that mark, on a 23x23 grid — 63 marks have no pixel at all at 1600x900 and 82 at 375x667. At that camera the map draws 896px for 360 degrees of longitude, so one pixel is about 26 km and Monaco is about a thirteenth of one, and of the 105 marks a neighbour's button covers, 46 are not served by the live pointer either. So the collision was never the problem: a mark smaller than a pixel has NO pointer path and no target engineering creates one. The pointer is therefore not a channel every mark has, and the two this format calls channels a reader PICKS BETWEEN are, for those marks, the only path there is — which turns the table's opt-out and the per-mark keyboard target from preferences into a refusal

### value-labels-collide-or-clip — `labelPlacementIssues`

**Refuses:** a choropleth's own value label overlapping another label, or spilling outside the shape it names

**Earned by:** stress-l-mixed-unit-clinics's own ClinicsMapStill.tsx hand-nudged three of its eight labels in the BEAT's own component — Belgium and the Netherlands collided at this plate's own scale, and Germany's own centroid clipped against its accent outline — because the mechanism to place them without a person nudging by eye did not exist. Measured across every delivered choropleth (every proof/ and stories/ file drawing with pathFromRings, 2026-08-21): forest-loss's own still/video draw a ranked list beside the map rather than a label per shape, both ChoroplethWeb beats (mapgen-choropleth-web, stress-f-housing-pressure) read every value from HTML on hover, and mapscrolly-one-map-europe-carbon drives its labels through a leader-line system — mixed-unit-clinics is the only delivered choropleth that bakes a static value label per shape at once, and the only one that collided. One beat today, not the placement's population — but the fix lives in the placement (assets/geo.ts's labelPlacementIssues/placeValueLabels) precisely so the next multi-label beat inherits it instead of re-earning it by hand

### palette-names-its-source — `palette/SKILL.md`

**Refuses:** a craft skill whose own render reads a palette and never says, where an author reads it, where PALETTE.md comes from or what to do when readPalette refuses it — the proposal's own dead end, not the refusal itself

**Earned by:** a stress test hit readPalette's throw with no PALETTE.md anywhere above the beat and no route back to palette's own proposal. The refusal was correct — a render that defaulted to a colour nobody chose would publish a newsroom's identity by accident — and the dead end was not: no craft skill's own SKILL.md said where the file it reads comes from, and palette's own documentation assumes a journalist is sitting there to answer, with nothing named for when nobody is

### framing-serves-the-point — `chart-beat/references/static-discipline.md`

**Refuses:** a beat drawn without asking whether its own framing shows what its own takeaway asserts — a real change compressed to a sliver against a zero baseline, or one value dwarfing the group it is compared inside, shipped because nothing stopped to look before the geometry was chosen

**Earned by:** both stress beats were true and neither fought for its own point: stress-c-vacant-homes put a real 14% fall on a zero baseline where it reads as four nearly level columns, and stress-a-energy-bills let a 44x outlier compress six countries' reported prices to slivers a reader cannot compare. Re-measured across every chart-type beat this toolchain has delivered (57 directories under proof/, 143 numeric series excluding identifier-shaped columns): the outlier shape is common and often legitimate (41 series across 24 beats over 10x the median, several genuine — CO2 per capita 0.69 to 22.2, a 32x spread on a shipped grouped bar, correctly kept), which is exactly why this is a discipline reconsidered before drawing rather than a guard that would redden roughly a third of the corpus for shipping real data; the invisible-spread shape is rare and, in this corpus, never real (3 series flagged, all 3 false positives from the heuristic applied outside its own domain — a lollipop's own year-like column, and a waterfall's per-step component read as if it were a zero-baseline series)

### framing-is-measured — `framingMeasurement`

**Offers:** an author reads, at the terminal, the same two numbers framing-serves-the-point asks them to reconsider a treatment from — the values' own spread against the plot's zero-based extent, and the largest mark against the group's median — without computing either by hand or asking

**Earned by:** the discipline says WHEN to reconsider a treatment; nothing printed the two numbers an author would reconsider it FROM. render.mjs already prints diagnostic reads for a dozen other decisions in these two stress beats alone (the palette chosen, the duplicate row dropped, the period formats seen) — this is the same convention, applied to the one decision the stress test found nothing supporting. A reading, never a refusal: framingMeasurement never throws and never picks a treatment

### page-declares-story-language — `pageLanguageMatchesStory`

**Refuses:** a delivered page's <html lang> disagreeing with the language recorded for its story

**Earned by:** renderWeb's own HTML shell hard-coded <html lang="fr">, baked in for its first caller, a French CO₂ beat; every English beat rendered through it misdeclared its language to a screen reader and to a translation engine, and a stress beat had to patch the shipped file in its own runner rather than have the skill fix it — the same shape, uncaught, in every proof/web* fixture that carries the identical patch

### credential-alias-reconciled — `credentialReadsWithoutAlias`

**Refuses:** a provider credential read by its canonical env name with no declared alias list for the names the root's own .env holds it under

**Earned by:** root .env names the Datawrapper credential DATAWRAPPER_API_TOKEN and MapTiler's key MAPTILER_API_KEY/REMOTION_MAPTILER_KEY/VITE_MAPTILER_KEY — the engine's own names — while dw-beat's CLI entry and sealed-produce.mjs read a bare process.env.DATAWRAPPER_TOKEN and splash/scripts/run-operation.mjs read a bare process.env.MAPTILER_KEY, so preflight reported the capability open on a real, present token and production refused "no token" one phase later; map-beat/map-web/scrolly's own bake-plate.mjs had already reconciled the MapTiler side with a declared alias list before this was named

### fills-its-frame — `graphicFillsItsFrame`

**Offers:** the graphic occupies a real, measured share of the frame it is given — the reader's own window where the container varies, the delivered frame itself where it is fixed. What each format measures is its own: a fluid frame is read as an AREA against the window, a baked plate as the fraction of the axis it is BOUND ON, because a plate keeps its own true aspect and a portrait camera in a landscape window is smaller in area by design while filling every pixel of the axis that binds it. WHAT THIS DOES NOT DETECT, measured 2026-08-23 rather than assumed: a box STRANDED at one edge with its leftover room all on the other side. Moving a box from 622.6px to 16.0px from the left moved both readings by 0.00 points, on two pages at two widths — both are about size, and stranding is about position. This rule earns its place on the box that never grew into the room it was given, and says so rather than claiming the rest

**Earned by:** stress-f-housing-pressure's choropleth drew in the left half of a 1440x900 window with the right half plain empty ground — map-web promises a page that fits the reader's window and chart-web promises a graphic that fills its container edge to edge, and nothing had ever measured either claim against a real delivered page at a real width. ROUND FIVE, FINDING T2: it was declared against `ships-standalone-html`, the trait describing its FIRST INSTANCE (a standalone page), so the question was asked of the four formats whose container varies and never of the four whose frame is fixed and known at render time. Re-declared against `materialises-a-beat`, the trait describing the PROPERTY — a beat with a delivered frame — which is every producing skill. The four fixed-frame formats measure the drawing's own box out of the delivered PNG's own pixels (`frameFillFraction`) rather than through a browser, against a floor measured from the population `exampleRunnersFor` derives; the four page formats keep the browser walk they already had. The re-declaration paid for itself at once: the lowest reading in the whole fixed-frame population is stress-t's own portrait map video at 43.15% of its frame, which is round five's finding T1 (portrait's real cost) measured for the first time instead of noticed by a reviewer

### reveal-fills-the-frame — `compositionFillsTheFrame`

**Refuses:** a drawn composition covering a floor-breaking sliver of the fixed graphic it was given, the container filling its frame while the picture inside it does not

**Earned by:** skills/scrolly's own description promises a FIXED graphic that fills the frame; stress-g-eight-checkpoints delivered a graphic covering roughly 15% of a 1440x900 frame and verify-scrolly.mjs passed it, because every existing assertion measured the VEHICLE (the handover, the card, the frame that never moves) and none of them measured the DRAWING inside it. Measured against every delivered scrolly under proof/: stress-g was not the outlier — the seed's own ChartFrame and this format's other chart-track beats read even thinner (2.2%-7.1% ink coverage) than stress-g's own worst step (3.6%-3.7%); an image or map track routinely clears 20%+. The floor is set from that measured population, never from an invented ideal

### label-fits-inside-the-plate — `labelsClippedByPlate`

**Refuses:** a label whose measured box falls outside the plate's own clip rectangle — a run the clip path cuts silently, in a delivered frame where a reader sees a truncated word and no error was ever raised

**Earned by:** stress-t-europe-recycling's first render put Macedonia's label south-east of it, over the Aegean; at that plate's scale the run passed the plate's right edge and the delivered frame read "Mac…" and "18.4". A clip is silent by construction — nothing throws, nothing renders red — so the beat's author found it by LOOKING at the frame, wrote the check by hand inside their own component, and named the absence in NOTES-FOR-MAINTAINER.md as "a map label clipped by the plate is silent". The decision measures BOXES in the frame's own pixels against the plate's own rectangle: the caller measures its own text, because only the component knows the family and size it is about to draw in, and the refusal names which edge and by how much, because a caller deciding whether to re-bake an anchor needs the number rather than a boolean. Every clipped label is reported, not the first, since anchors move together in a re-bake. CLIP_TOLERANCE_PX is half a pixel for the reason decollide's own MOVED_AT is: a run half a pixel past the clip is not a truncated word, and a caller with no canvas measures text by an approximation good to rather worse than that. Measured on stress-t's own committed anchors: they clear the shipped 560px plate and start clipping at 389px, which says the headroom is real and not large

### reveal-order-is-earned — `staggerLacksAnOrder`

**Refuses:** a reveal that hands its marks different start times when the marks carry no order to follow — a snapshot's categories staggered for visual interest, and the placeholder mark ('pending' dots, a ghosted shape) a stagger has to invent to hold the marks still waiting their turn

**Earned by:** the owner ruled on stress-t-europe-recycling's map video, which stippled every reporting country with 'pending' dots and filled them one at a time: the dots existed only to hold the shapes waiting their turn, and eleven countries measured in March 2025 carry no chronology between them and no argument that ranks them, so the order was invented. It was never one beat's mistake — geo-discipline.md rule 10 MANDATED it ('regions arrive in the order of the value being encoded, lightest to darkest'), map-beat's own Co2MapVideo seed taught it, and proof/mapgen-choropleth-video and stress-m-forest-loss inherited it. WHAT THE DECISION MEASURES, stated so a legitimate stagger survives it: the marks the reveal covers, handed in the order the build gives them their windows, each carrying the frame its own arrival begins and the position its reading holds on the axis the reveal traverses (a year, a date, a distance; null when the reading holds none). The build is staggered when those starts are not all one number. A stagger is EARNED when every mark carries a position, no two share one, and the positions ascend in arrival order — chart-video's own line reveal over proof/co2-suisse's frozen series is 75 marks at 75 distinct years and passes. It is ARBITRARY when a mark carries no position, when marks share one (a snapshot: every reading from one moment, so the order across them is the producer's), or when arrival runs against position (a line drawing backwards); the same call on stress-t's eleven readings reads '11 marks hold 1 position(s) between them'. Marks arriving TOGETHER always pass, and that is the build this rule points at

### storyboard-gate-is-visible — `storyboardGateStatus`

**Offers:** a beat's own render/produce script can read whether a closed STORYBOARD.md stands above it — found at all, and whether its own front matter carries a confirmed takeaway — without the check ever refusing the render, so the gate the orchestrator already refuses to jump is at least visible to the one place that could otherwise jump it silently

**Earned by:** the orchestrator (skills/splash) refuses a phase jump and says so in its own SKILL.md; no craft skill's own render/produce entrypoint could even ASK whether one stood above it — renderStill and readPinnedSize never looked. A hard refusal was considered and rejected: the stress-testing methodology that found this very finding depends on rendering a beat directly with no STORYBOARD.md at all (fifteen beats, three rounds), and a refusal with no unattended-satisfiable path would repeat the exact mistake this project's own PALETTE.md history already had to fix. storyboardGateStatus reports instead — found/closed/reason, never a throw — on the one trait every producing skill actually shares (materialises-a-beat), rather than an invented population

### guard-wired-to-run — `declarationsWithoutACaller`

**Refuses:** a guard's own decision function declared in a skill's `GUARDS` array and reachable only from its own `*.test.ts` — never called from any other file that skill ships, so nothing a journalist runs ever asks it. An import that names the function and never calls it, a `export { … } from` shim that only re-declares it, and a comment that mentions it are each refused too: all three are what an author writes INSTEAD of wiring the guard. A recorded name carries WHY it is not called, and the two reasons that are not debt are read rather than believed: `beat-substrate` (only a beat can call it, because the decision needs material a skill's own seed does not have and must not invent) names a committed beat whose runner really calls it, `driven-by-its-own-suite` names a test in that format's own suite that really calls it, and a claim whose named caller only imports the decision, only mentions it in a comment or only names it in a string is refused too — an excuse nobody checks is a permission slip

**Earned by:** ROUND THREE surfaced it: `pageLanguageMatchesStory` was declared and unit-tested in chart-web, map-web and scrolly and called from none of their render scripts, so the white-on-dark mismatch stress-i refused shipped silently on stress-n regardless. Measured then across all eight producing skills: 40 guard-kind declarations, 14 called from a producer/render script or a real Puppeteer driver, 26 reachable only from their own test file — too large a population (65%) to close in one wave without risking the very producers the rules protect, so it was written down as a DISCIPLINE where every author of a new guard reads it, rather than mechanically enforced. ROUND SIX proved that was not enough, on a fix four hours old: `fills-its-frame` was re-declared from `ships-standalone-html` to `materialises-a-beat`, its detector was distributed to all eight skills, and the controller measured `graphicFillsItsFrame` at ZERO callers in all eight — the rule reached them in the catalogue and not in the code, and the behaviour of all eight was unchanged. It is not an inert rule: `stress-ab-emigration-flows` measured 16.6% and 14.8% against its 17.9% floor and caught a real defect on a real page, but only because that beat's author wrote a runner BY HAND against a decision the skill would never have run for them. A discipline that cannot observe its own violation is theatre, so the observation is a decision function now: `declarationsWithoutACaller` (each skill's own `scripts/detect-guard-wiring.mjs`), run from each skill's own `scripts/check-guard-wiring.mjs` and ratcheted by `doctrine/test/guard-wiring.test.ts`. The debt it inherits is 105 unwired declarations of 124 across the eight, recorded BY NAME in each copy's own `RECORDED_UNWIRED` — a name may leave that list and a name that turns up unrecorded is a red, which is the property the discipline never had. 2026-08-23, THE RULING: that one list was telling three facts in one voice. Reading `map-web`'s own copy separated them — `credentialReadsWithoutAlias`, `pageLanguageMatchesStory` and `weightAgainstCeiling` are debt somebody could pay; `unmatchedValues` is not, it needs a declared study set joined against a frozen source and giving a seed one means inventing the fixture this rule exists to refuse; `deadExampleRunners` and `swallowedExampleRunners` are a third case, their subject being the skill's OWN committed example runners, so the format's own test drives them and the alternative was an `import.meta.main` no `SKILL.md` mentions, buying eight cleared entries with a command nobody runs. So the list is three arrays: `RECORDED_UNWIRED_DEBT` may only ever shrink, and `RECORDED_BEAT_SUBSTRATE` and `RECORDED_DRIVEN_BY_ITS_OWN_SUITE` may grow but cost their author a real caller that `beatSubstrateWithoutACaller` and `ownSuiteWithoutACaller` go and read. Checking the excuses found one: `labelPlacementIssues` had been recorded beside `unmatchedValues` as beat-substrate in both map skills and has NO caller anywhere in the tree — `placeLabels` beside it REPAIRS a label stack against the same two conditions without ever asking the decision — so it stayed under the ratchet as debt rather than being reclassified to make the numbers work. Counts after: 8/0/2 chart-beat, 10/0/2 chart-video, 1/0/2 chart-web, 6/0/2 dw-beat, 6/0/2 image-beat, 9/1/2 map-beat, 15/1/2 map-web, 9/0/2 scrolly

### example-runners-are-called — `deadExampleRunners`

**Offers:** every runner committed beside a beat that calls this format's own machinery is SPAWNED by the suite, not read by it, so a change to that machinery's signature reddens on the day it lands rather than leaving the format's own worked examples dead behind a suite that only ever exercises the seed

**Earned by:** finding 16 of stress round four: `renderWeb` grew one required argument (props.language, round two's own finding 1) and not one of the eighteen example runners committed beside a chart-web beat was migrated — runs=5 fails=18, the five that ran belonging to map-web. chart-web/SKILL.md:29 already warned about the SAME failure from a previous occurrence (a dropped `layouts` argument, fifteen beats dead, 'for an hour and a half, with a green suite'), so twice is a mechanism, not an accident: nothing in this tree ever CALLED a committed runner, and a check that READ one would have gone green the day somebody wrote the argument into a comment. Measured for contrast at the same moment, render-still.mjs and render-map.mjs were 14 of 14 green — the rot was one format's, and the sweep that would have caught it existed for none of them. Also measured, and not in the finding: scrolly's own ten runners, eight of them dead on the identical refusal, which nobody had noticed either. Two tuning decisions in the sweep are measurements rather than choices — every one of the 27 dead runners in the tree died within 250ms while a real render takes 6s to minutes, so a runner still alive at its deadline is an ANSWER (it reached its format's entrypoint and went past it) and never a failure; and a runner with no outDir to aim at a scratch directory is excluded and NAMED rather than allowed to rewrite a committed artefact on every run (one such in the tree: proof/palette-proof/render.mjs). dw-beat carries the sweep over an empty population today — it delegates rendering to a remote API and has no committed runner at all — which is exactly why the population is derived from a trait rather than typed: the day it has one, it is already swept

### runner-answer-can-be-believed — `swallowedExampleRunners`

**Offers:** a runner's ANSWER is read from what it PRINTED as well as from the status it returned, so a committed example runner that threw, printed the throw and still exited 0 is NAMED by the sweep rather than counted alive — the reading that makes example-runners-are-called worth having, since a sweep that believes an exit code believes a runner that never checked its own

**Earned by:** the sweep this project wrote to catch a runner a format change left behind reads the exit code, and a runner can fail without one. Measured 2026-08-22: stories/heat-pump-adoption-across-europe/beats/1-the-gap-that-persists/render-web.mjs ended `main().catch(console.error)`, so when `renderWeb` grew its required `language` argument that runner threw, PRINTED the throw and exited 0 — deadExampleRunners called it alive for as long as the runner had existed, and the page it delivered shipped `<html lang="fr">` against a storyboard recording `en`, with no accessible table at all on a format whose declared capability is same-facts-without-the-picture: 10 marks, 10 missing. A mechanism that cannot observe its own failure was this round's most repeated finding, and here it was inside the mechanism written to observe other people's. PROVED BY PUTTING THE DEFECT BACK rather than by argument: with the `language` argument removed from that runner and `main().catch(console.error)` restored, the sweep at HEAD answered [] and swallowedExampleRunners named it — and with spawnRunner summarising stderr down to its one `error:` line the way it used to, the new decision went blind too, which is why the raw TAIL of the stream is now what is kept (a stack is printed last, so a cap that kept the head kept the chatter and dropped the evidence). TWO MEASUREMENTS SHAPE IT: it reads the SHAPE of a printed throw — an indented stack frame whose location carries a path separator and ends the line at :line:col — and never the words "error" or "catch", which are legitimate output all over this tree; and over the whole population the same day (126 distinct runners, 67 answered, 59 still working at their deadline, none exited non-zero, and not one printed a single byte on stderr) it fires on 0 of 126, so every format's own sweep test walks the shape on results built by hand as well, because a decision whose only evidence is a clean population is a decision nobody has seen work. WHAT IT CANNOT SEE, recorded rather than hidden: a runner that catches its own failure and prints only error.message leaves no frame and stays invisible — as it is to a grep for `.catch(console.error)`, one spelling of one idiom, refused as the primary reading for exactly that reason

### labels-name-their-own-row — `mislabelledRows`

**Refuses:** a de-collided label stack that reorders the values it names, or a row whose label and whose value are drawn on one line while the marks they name are joined to something else

**Earned by:** a thirteen-region slope de-collided its left labels in 2020 rank order and its right values independently against their own 2026 positions; both stacks overflowed the plot band, both fell back to an equal gap over it, and the one corrupted cell borrowed its 2020 y and sorted a row too high. The delivered graphic states in print that the Peloponnese has no 2026 figure and that Eastern Macedonia and Thrace has 392 schools — and, unreported until this guard read the file, that Epirus went 244 to 238 and the South Aegean 241 to 219, when the frozen source says 244 to 219 and 241 to 238. Four false rows of thirteen, through approval, through inspectSvg at 31 of 31 contrast entries, through assertDeliveredSize and assertTypeFloor, and out to a reader. The same beat's first version failed the other half of the same invariant, drawing a 1104-school region above an 1802-school one; only the pixels caught it

### rtl-runs-carry-their-direction — `rtlRunsAreIsolated`

**Refuses:** a right-to-left run drawn with no explicit Unicode direction, which this rasteriser lays out as a left-to-right paragraph so its sentence-final punctuation lands at the wrong end of the line

**Earned by:** round five, finding X3, on stress-x-tunisian-water. Measured 2026-08-21: resvg runs Arabic joining and the bidi algorithm INSIDE a run on its own — a frozen Arabic string comes out joined and in reading order with no help — but it resolves the PARAGRAPH level as left-to-right and IGNORES SVG's `direction` and `unicode-bidi` entirely: three renders of one string, with direction="rtl", with unicode-bidi: bidi-override, and with neither, produced identical ink. The consequence a reader sees is `.الجدول` — an ASCII full stop drawn at the visual right of the line, at the START of the sentence — and that beat's own frozen article records that a previous attempt was rejected by the desk for exactly that class of defect. What resvg DOES honour is the Unicode formatting CHARACTERS, because they are characters and not attributes: U+2067/U+2069 (RLI/PDI), U+202B/U+202C (RLE/PDF) and a TRAILING U+200F all place the stop correctly; the bare string and a LEADING U+200F do not. Before this rule, grepping skills and shared for rtl, unicode-bidi, right-to-left or bidi returned two hits, both inside a bundled third-party map library — no direction switch, no anchor flip, no axis-side rule anywhere — so every beat in every right-to-left story had to rediscover this by rendering, zooming in and reading the punctuation, which is what that beat's component did in a local helper whose own header says it has nowhere to live. A RASTERISER LIMITATION WITH A KNOWN REMEDY, and the point of the rule is that the toolchain SAYS SO rather than shipping silently-wrong punctuation. It deliberately does not ask for direction="rtl": that attribute is precisely what is ignored, so requiring it would certify the defect. Population, measured the day it landed: 105 distinct committed beats across the seven skills that draw their own geometry, ONE of which draws a right-to-left letter at all (stress-x-tunisian-water, 15 such runs, every one isolated) — a ratchet over a population that legitimately grows the next time a newsroom files in Arabic or Hebrew

### denominator-reading-is-stated — `denominatorReadingStated`

**Offers:** a beat drawn from a table that puts a denominator beside a count states, in its own BRIEF.md, WHICH of the two readings it draws — `reading: raw` or `reading: per <column>` — so the choice is a decision on the record rather than something the next reader has to re-derive from the geometry

**Earned by:** finding 5 of stress round four: `grep -rn "per capita|perCapita|denominator"` across skills/ and scripts/ returned nothing that reasons about a count against its denominator. stress-q-safety-incidents ranks five districts by `incidents` with `residents` in the very next column — Centro leads on the raw count (412) and Sul leads per resident (233 per 100,000 against Centro's 205), so the article's headline is true one way and false the other; stress-p-transport-ridership inverts at the very top, Porto carrying 416 trips per resident against Lisboa's 393. Four of the twenty-one frozen stories carry an explicit denominator, and of the four producers that met one, two found it unprompted and built the honest chart while the other two were never in a position to. `intake` now NAMES the candidate column and `storyboard`'s grounding REFUSES to confirm a raw-count superlative while one exists; this is the producing half of the same doctrine — report and ask, never repair. Measured on the day it landed: exactly six beats in the tree meet a denominator (stress-q x1, stress-p x3, stress-a x1, stress-r x1) and every one of them was SILENT about which reading it drew, including the two that got the reading right on purpose. THE CONSTRAINT THAT SHAPES THE RULE: stress-a-energy-bills carries `households` beside `price_eur` and draws `price_eur` RAW, correctly, because a household energy bill is already a per-household figure — so `reading: raw` is a complete answer and not a lesser one, the detector never divides, never re-ranks, and never has an opinion about which reading is right. DECLARED, NEVER INFERRED: the reading is read off a `reading:` line the BRIEF actually carries, never sniffed out of prose — a detector that looked for the word "per" would go green on stress-p beat 1's own "Per-capita framing smuggled in here", in a beat that draws the raw count. Six of the eight formats sweep an empty population today, which is exactly why the population is derived from `materialises-a-beat` rather than typed: the day one of them meets a denominator, it is already swept

### typeface-is-recorded — `palette/references/typeface.md`

**Refuses:** a beat set in a face nobody chose: a renderer holding FONT_FAMILY as a literal no recorded answer can reach, with nothing said where an author reads it about the story's own TYPEFACE.md, who writes one, or what a format that cannot read one owes instead

**Earned by:** round four measured that five render paths REFUSE without TYPEFACE.md while `grep -rn "TYPEFACE.md" skills/ shared/ | grep -i write` returned nothing at all: no writer, no movement in the exchange, no owning skill. Each skill ships its own copy in its own directory, so a seed resolves by walking up and nobody noticed that a STORY has none — twenty of this tree's twenty-one hold none, and the one that does had it written by hand at the end of its run. A real beat says so in its own voice: stories/stress-l-mixed-unit-clinics/beats/mixed-unit-clinics/render-still.mjs documents in a comment that it deliberately skipped readTypeface/useTypeface because no story in the tree had the file and calling for it would have invented a requirement nothing could answer. A mechanism nothing can answer gets designed around, quietly, by the people it was built for

### accent-survives-delegation — `accentPaintsTheMarks`

**Refuses:** a payload that names the journalist's recorded accent in a metadata field the provider stores, echoes back on a GET, and never paints marks from — so the round trip verifies clean and the delivered artefact is in the provider's own default colour

**Earned by:** the same defect, found twice, on two mark families, each time only by counting pixels in an artefact that had already been delivered. ROUND THREE, live against published chart 1u88u: `custom-colors` keyed by the resolved series label was sent and STORED — `GET /v3/charts/1u88u` echoed it back verbatim — and the bars still rendered in Datawrapper's own #18a1cd. It fixed d3-bars and column-chart by setting `base-color` behind an `isBarEncoded` branch, and left every other family on the key it had just proved inert. ROUND FIVE, finding Y3, off the DELIVERED stress-y-rural-broadband scatter: 2014 pixels of #18a1cd against 1811 of the house #5B8A8A, and every one of those 1811 was rule or label — not one of the 186 marks was the newsroom's colour. Isolated live the same way round three isolated the bar case, on chart cc6eK (d3-scatter-plot, 40 rows, published, PNG exported at 600px zoom 1, pixels counted): `custom-colors` alone gave 475 px of #18a1cd and 0 of the accent; `base-color` gave 475 px of the accent and 0 of the blue. So `base-color` is sent unconditionally now, and this rule is the tripwire that keeps it there — every other producing skill draws its own marks, so its accent reaches them by BEING the fill it writes; the one skill that delegates names a field and hopes, and when it names the wrong one nothing anywhere says so. Reachability is the trait, not the skill name: `delegates-rendering` is what makes this defect possible at all, and a second delegating producer would inherit the rule the day it declared the trait. WIRED, not merely exported — `produce.mjs` calls it on the payload it is about to send, before `createChart`, because finding 20 of the same round counted five of this skill's declared guards with no caller outside their own file, and a live chart that someone later has to count pixels in is exactly what a decision nobody calls buys you

### credit-traces-to-the-record — `creditTracesToRecord`

**Offers:** the credit a DELIVERED artefact prints names only organisations the story's own frozen source/ actually mentions — and `credit` has an honest value, `unattributed`, for a journalist who named none, which the artefact carries visibly as `Source: not stated` rather than filling the gap with something plausible

**Earned by:** finding 11 of stress round four: all three of stress-p-transport-ridership's delivered beats print "Source: city network figures for 2025, compiled by Buried Signals". The frozen article names no source whatever — `grep -in "source\|according\|compiled\|buried" stories/stress-p-transport-ridership/source/article.md` returns nothing — and `Buried Signals` is this tree's own NEWSROOM.md `name`: the newsroom that would PUBLISH the graphic, promoted on three delivered artefacts to the organisation that COMPILED the data. `credit` was a REQUIRED hand scalar with no honest empty value, so an unattended run filled it with the nearest plausible string in reach; round two's finding 9 recurring, with a real named third party carrying the consequence. THE RECORD IT TRACES TO IS `source/`, NOT `STORYBOARD.md`, and that is the whole design: the invention was IN the storyboard, `credit:` held it, the render read it and the hand-over printed it, and every hop was faithful — a rule that traced to the recorded scalar would have gone green on the exact defect that earned it. The only record a credit can honestly trace to is the material nothing in this toolchain may write. TWO NARROWINGS, both measured rather than chosen: an attribution is a run of two or more consecutive capitalised words, because a lone capital after a colon is sentence case and the `August` in every credit's own `· as of 21 August 2026` would otherwise be a false positive on every delivery in the tree; and a name is unattested only when NOT ONE of its words appears in the frozen source, because the strict every-word form — written first, and measured to agree with this one on all eight committed deliveries — parts company with it only on inflection, refusing "Greek Ministry of Education" for an article that says "in Greece". A credit that names nobody at all ("municipal safety incident report and district population estimates") passes, correctly: this rule has no opinion about a missing name, only about an invented one. The honest empty answer is `storyboard`'s own — UNATTRIBUTED_CREDIT/creditLine, copied byte for byte into deliver's format-handover.mjs and walked by splash/test/guard-copies-parity.test.ts, on the model palette/scripts/typeface.mjs used this same round for the same class of defect: propose, record who chose, say so out loud, never substitute silently. ROUND-FIVE FINDING Y1: that honest empty answer had reached the phase that RECORDS it and the phase that HANDS IT OVER and neither of the two places that draw pixels. Measured by the controller: buildChartPayload({... credit: "unattributed" ...}).metadata.describe["source-name"] came back "unattributed, 2025-06-30" — the maintainer's own token, under a published newsroom chart, in the place a source goes — while `dw-beat/scripts/detect-delivered-text.mjs` was already telling authors the opposite in its own refusal text. `grep -rl "creditLine|UNATTRIBUTED_CREDIT" skills/ | grep -v test` returned storyboard, deliver/format-handover, deliver/SKILL.md and this catalogue, and NO producer. `dw-beat` is the only producer that composes its credit line MECHANICALLY — every other format's credit reaches a reader through a component an agent writes by hand from the recorded scalar — so it is the only producer this decision could be copied INTO, and it now is: `dw-beat/scripts/metadata-spec.mjs` holds the third byte-identical copy of isUnattributedCredit/creditLine, walked by `splash/test/guard-copies-parity.test.ts`, and `buildChartPayload` calls `creditLine` instead of interpolating `spec.credit`. The proof it was needed is in the tree: `stories/stress-y-rural-broadband/STORYBOARD.md` records `credit: "unattributed"` and that beat's own `build-spec.mjs` lines 69-73 hand-patch it to the literal "not stated", naming this exact gap as the reason

### double-hyphen-reaches-a-reader — `doubleHyphenInDeliveredText`

**Offers:** the reader-visible text of a DELIVERED artefact — the words drawn in the picture, the <desc> a screen reader speaks, and the alt text and credit line a newsroom pastes out of HANDOVER.md by hand — carries no dash typed as two hyphen-minus characters

**Earned by:** finding 15 of stress round four: stress-q-safety-incidents' render.mjs:68 wrote `--` where an em dash belongs, and it reached three reader surfaces at once — the visible footnote ("Centro recorded the most incidents in raw terms (412) -- but not the highest rate."), the <desc> a screen reader speaks, and the alt text in the delivered HANDOVER.md that a newsroom pastes into its CMS. Found again, unreported until this rule read the files, on stress-r-greek-schools' delivered SVG and hand-over. Measured across the tree on the day this landed: 22 files contain " -- " and 21 of them only inside code comments, which is why the decision reads READER-VISIBLE text — HTML comments, <script> and <style> stripped first, markdown fences and inline code spans dropped — rather than running a grep over files, and why the CSS comments in stress-p's own delivered page are correctly silent. DELIBERATELY NOT A PROSE STYLE CHECKER: it knows one thing, that a dash typed as two hyphen-minus characters is a dash that did not survive being typed, and it has no opinion about sentence length, quotation marks, spacing, or which dash a clause wanted. A leading `--flag` is not matched, because a delivered page may legitimately show one. A rule that started having opinions about prose is a rule a journalist argues with, and then deletes
