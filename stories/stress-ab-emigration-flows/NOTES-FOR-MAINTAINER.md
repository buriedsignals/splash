# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

The treatment survey lifts only the FIRST sentence of a type sheet refusal (scripts/type-survey.mjs, refusalSentence). map-beat/references/types/flow-map.md refuses this beat data outright in its SECOND sentence -- a route map is a single path, not a many-to-many flow, and many origin-destination pairs belong to an OD flow diagram -- and that sentence never reaches the journalist at the gate. Round-four finding 24 fixed the first half of this exact class (the refusal did not travel at all); the second half is still open. Separately, REFUSAL_FLAT_RE uses $ under /m, so the six sheets that state their refusal without a heading are cut at the first LINE break: waterfall ships in type-survey.md truncated mid-sentence at "a set of independent".

## Found at storyboard

checkStoryboard closes Gate 2 on a chosen treatment that exists nowhere in the survey -- verified with chosen: "Spaghetti Cannon", gate errors []. assertDistinctWays accepts the same invented name and returns true, and it accepts a bare string array while its sibling formatCandidates, which renders the same list at the same movement, requires {type, why, format} objects. Two shapes for one movement, and neither validates the name against the catalogue. Also: the flow-map sheet and the sankey sheet each name a type this toolchain holds no sheet for (an OD flow diagram, a chord diagram), so a journalist can be told what to use instead and find nothing there.

## Found at storyboard

groundTakeaway on this frozen table: 18,400 comes back unverifiable because a comma is called ambiguous between thousands grouping and a decimal comma -- in a story whose recorded language is en and whose newsroom declares languages: en, and for a value that is a literal cell in source/data.csv and the maximum of its own column. Written 18400 it comes back consistent (within the range), never supported, so a row-level fact present verbatim in a row cannot be confirmed. The year 2025 is placed inside the range of the column people_2025 -- the column NAME carries the year, which is the round-five COVID-19 defect one level over. Every superlative in a geographic story is ambiguated by the coordinate columns: "Braga has the fewest people of any origin" reports that the claim names three measures, people_2025, origin_lat and origin_lon. And nothing groups: London receives 21,200 across two routes and Paris 23,600 across three, which is this article second story, and the check refuses it because London matches two rows.

## Found at production

map-web, five things a beat cannot get past without reading the skill source. (1) renderMapWeb calls assertDistinctSlugs(groupsOf(points)) unconditionally and groupsOf reads p.group off every row: a beat with no filter dimension throws TypeError: undefined is not an object from inside slugOf, naming nothing, although the skill own document says a beat with one group renders no filter. (2) .mw-viewport takes its HEIGHT from an inline aspectRatio style that lives in MapWebSeed.tsx -- the file a beat is told to replace -- while buildCss computes the same aspect and spends it only on the width. Replacing the seed without reproducing that attribute renders a 451 x 2 pixel map and nothing throws. (3) bake-plate.mjs has no bounds or style flag: the camera and the basemap are consts inside the skill and the tuning table points at them, so every real beat copies the script. (4) renderMapWeb takes no extra-stylesheet argument, so a beat whose legend is not circles has to ship a style element inside its own component markup. (5) a script a beat inlines that way runs BEFORE the shared #tooltip element, which renderMapWeb writes after the page div, so its listeners silently never attach.

## Found at production

map-web live layer, three gaps that all fail silently. (1) livePlan builds exactly one layer and it is a circle layer for a proportional symbol; live-map.mjs documents line and fill layers, so the runtime supports a flow beat and only the plan builder does not. (2) the plan vocabulary has paint and no layout: line-cap passed as paint makes addLayer throw inside the style.load handler, which aborts the whole handler -- the basemap arrives, the map goes live, the fallback is hidden, and not one ribbon is drawn, with nothing logged. The same gap makes a symbol layer undeclarable, so an arrowhead has to be a ground polygon. (3) initLiveMap does getElementById("mw-map") while the class on that element is mw-live-map, and returns null without a word when it is not found: the obvious guess shipped a page with MapLibre parsed, the plan JSON present and the key substituted, making zero network requests. All three were found by driving a keyed copy and counting requests, not by any assertion.

## Found at production

map-web interaction model. The format only hit target is a fixed-size button at a point (.pt plus interaction.mjs), which is right for a disc and wrong for a ribbon: hovering Porto-Paris own midpoint returned Aveiro-Paris reading, at every viewport, because thirteen fixed buttons over eight converging curves overlap. Replaced in this beat by a transparent over-stroke on each ribbon, hit-tested on the stroke, with the buttons kept for the keyboard. Related: reposition follows only .pt and .point-label carrying data-key, so a beat whose furniture is an anchored block or an edge-anchored annotation cannot follow the camera at all and needs two label systems, one per layer. And the format four cargo guards, its language guard and graphicFillsItsFrame are all callable only from the skill own test files over hard-coded pages -- a story beat has no entry point, so this beat wrote two of its own.

## Found at delivery

The delivered export shipped with __MAPTILER_KEY__ unsubstituted and the hand-over told the journalist "No MapTiler key was recorded, so this page does not draw its map live" -- in a session where preflight reported map available, MapTiler answered 200, and the bake had just used the key. substituteKeys and mapKeyState read env.MAPTILER_KEY with no alias list, while map-web bake-plate.mjs declares MAPTILER_KEY_ALIASES (MAPTILER_API_KEY, REMOTION_MAPTILER_KEY, VITE_MAPTILER_KEY) and preflight resolves them too. This root holds the key under two of those aliases. The journalist is told a false thing about their own environment and the delivered page silently degrades to the picture ruling R1 overturned. Worked around here by passing a resolved key on the env option.

## Found at delivery

SUBJECTS.md is required by the closing offer and by nothing before it. otherSubjectsFor throws a very good error naming recordSurveyedSubjects and storyboard movement 10 -- but checkStoryboard and whereIs missingForGate2 neither require nor mention the file, so Gate 2 closes without it and the refusal arrives after the storyboard, the component, the render, the approval and the delivery. This is the same two-gates-one-question class splash SKILL.md documents closing for the takeaway, the hand fields and the bound review. Also small: recordFormatAnswer and recordSubjectAnswer both return undefined, so a caller has nothing to assert on.

## Found at delivery

MATRIX.md walks proof/ only (scripts/matrix.mjs, PROOF). A beat produced under stories/ never fills a cell, so the flow / route map x web cell this beat was commissioned to fill still reads em-dash after the beat exists, is approved and is delivered. Every real journalist beat lives under stories/, so the coverage map cannot see the tree it is a coverage map of.
