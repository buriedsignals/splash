# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

ground-claim.mjs rowValue takes the FIRST row of a year with no entity filter. On this long-form panel (265 entities x 315 years) the two-year comparison shape therefore answers about Afghanistan, the alphabetically first entity, and reports entity: null. "Life expectancy in 2023 was higher than in 1950." came back supported, detail "life_expectancy_0 in 2023 = 66.0346, in 1950 = 28.1563" - both Afghanistan's own figures. resolveGrounding collapses to supported when any claim is supported, so this would have closed G1 on a claim nothing checked.

## Found at storyboard

The same first-row-wins reading reaches the JOURNALIST-FACING detail through the verbatim-row note. "54.5 in Nigeria" came back: within the range of life_expectancy_0 - and the frozen table holds it verbatim for "Switzerland". Switzerland 1920. The threshold 60 was attributed to Ireland and the span 30 to Chile. The sentence names one country and the detail names another, with nothing marking the difference.

## Found at storyboard

On panel data the entity superlative shape cannot decide anything: "Nigeria" matches 74 rows in the frozen table - a claim about one entity cannot be decided from several of its rows. The same sentence also resolved "the shortest" to the first word of the sentence ("In", "Period") as if it were an entity name.

## Found at storyboard

A numeral that is a DIFFERENCE, not a level, is still placed inside the measure column: "spanned more than 30 years" put 30 into life_expectancy_0 [10.99, 86.37]. And a correctly rounded maximum is refused: 86.4, the rounding of the column's own max 86.3724, came back unverifiable, which pushes a journalist toward printing unrounded figures.

## Found at storyboard

producer-gate.mjs offers Datawrapper for map/web choropleth and says nothing about the surface preflight already measured. runPreflight reported capabilities.datawrapper.surface = {ground: #16191B, static: true, web: false} - a published Datawrapper embed follows the reader's colour scheme and cannot honour a dark ground - yet formatProducerGate takes only {treatment, match} and has no seam for capabilities. A journalist answering Datawrapper here gets a live published chart and a refusal at export.

## Found at storyboard

treatmentFormatGap names exactly one unreachable cell (route/web) while the survey lets a journalist choose treatments that have no producer anywhere: Cartogram and Contour/isoline both return null for web, and map-web's own When-to-use lists only symbols, choropleths, dot density, hex grids and locators.

## Found at production

map-web/SKILL.md says a choropleth's web beat is the next one to write and that it would import a copy of map-beat/assets/geo.ts. proof/mapgen-choropleth-web has existed and shipped since before this run; the skill carries no geo.ts, no polygon join and no fill-layer live plan, so the documented path for the cell the journalist asked for points at a file that does not exist while a worked beat sits in proof/.

## Found at production

Nothing in the toolchain acquires country geography. bake-plate.mjs defaults --shapes to /tmp/map-twin/ne50.geojson, a path no script in this tree writes, and every countries.geojson on disk is a hand-curated 8-, 16- or 42-feature European subset. A world map - the most ordinary map a newsroom asks for - starts by downloading Natural Earth by hand.

## Found at production

The bake takes one --size and applies it to both axes (width: size, height: size). A world camera is close to 2:1 in Web Mercator, so a square frame spends half its pixels on empty ocean. minFrameHeightPx is already in the file and computes the right height; nothing calls it for the frame.

## Found at production

verify-interaction.mjs --html <file> is hard-wired to the skill's own thirteen-point sample data. On this beat it reported paris: no button thirteen times AND 13/13 matched the source data for a page with 241 regions and zero points named paris - a vacuous pass, because every point was skipped before the comparison. It then crashed on a null .closest before the KEYBOARD and NO-JS passes ran at all.

## Found at production

verify-live-map.mjs reads map.getSource("mw-marks") - the symbol seed's layer id - and crashes on any choropleth, including the committed proof/mapgen-choropleth-web/render/choropleth.html. Four of the five map types this format claims cannot be driven by their own live probe.

## Found at production

verify-live-map.mjs reads process.env.MAPTILER_KEY / env.MAPTILER_KEY with no alias list, while bake-plate.mjs in the same skill declares MAPTILER_KEY_ALIASES. The root .env holds REMOTION_MAPTILER_KEY and VITE_MAPTILER_KEY, so the probe printed no MAPTILER_KEY - nothing was verified AND EXITED 0. credentialReadsWithoutAlias passes because it is run over the whole skill's combined source, where the other file's alias list satisfies it.

## Found at production

The format's two bake-side guards (plateMatchesGeometry, plateFollowsGround) are walked by a test whose mapWebBeats() enumerates proof/ only, and which reads PALETTE.md from inside the beat directory. A story beat is invisible to both, and the palette phase writes PALETTE.md at the STORY root, so even a story beat placed under proof/ would be skipped. The suite stays green on a >= 4 floor the proof beats already meet.

## Found at production

The copied choropleth beat resolves the root .env as join(HERE, ../../.env) and PALETTE.md with stopAt one level up. Both are correct two levels under the repository root and wrong four levels under it, which is where every story beat lives. splashRoot/splashEnvPath already exist for exactly this.

## Found at production

NO_DATA_FILL (#B9B9B9, luminance 0.485) and WATER_FILL (#AAC9E0, 0.557) are declared fixed, not derived from the ground, so a no-data reading stays recognisable across every newsroom's own ground. On a dark ground the ramp climbs from 0.05 to 0.62, so the no-data grey lands between the fifth and sixth class and the ocean outshines five of six classes. assertRampReads measures the ramp against the ground and never measures these two against the ramp.

## Found at production

At planet extent the live layer paints repeat worlds. Driven with a real key at 1600x900: the live canvas took the whole stage (2.58 aspect against the world's 1.47), the fit was height-bound, and MapLibre filled 800px of margin with a second and a third painted world - three Africas, one set of hit targets. renderWorldCopies: false is not the answer: it clamps the camera, one world fills the width and the view crops at 20.8S, taking Lesotho, one of the six countries the title names, off the screen. The bake refuses this in the plate (assertWorldFillsFrame); the live layer, which fits in the reader's own container, has no equivalent.

## Found at production

In the live layer, elementFromPoint at a region's own hit-target centre returns the MapLibre canvas, not the .pt button - the hover is served by queryRenderedFeatures instead. The invariant verify-interaction.mjs states (every point's own hit target is the topmost thing at its own centre) is therefore false live, and that script only ever drives the fallback, so nothing measures it.

## Found at production

chart-web/scripts/verify-web.mjs --file crashes on a map-web page (m.source.bottom, null) after two real checks. There is no verify-web.mjs under map-web; the format's own equivalent is verify-interaction.mjs.

## Found at production

detect-delivered-text.mjs's creditTracesToRecord and doubleHyphenInDeliveredText both answer applies: false - nothing has been delivered from this beat, because they read export/ only. The phase where a wrong credit line can still be corrected is production, where they do not run.

## Found at production

SMALL_REGION_FRAME_UNITS is 26 ABSOLUTE frame units, tuned against a 496px European plate. At any other frame width or camera it selects a different, unmeasured set of regions for a pointer target; at 1200px it is 7.8 degrees of longitude and selects most of the world.

## Found at production

The hit targets are positioned in raw percentages with no clamp, so a region within half a target of the frame edge hangs outside the viewport. Measured on this beat before it was clamped: 869px of content in an 857px box at 1600x900. The European beat this was copied from has no region near an edge, so nothing ever exercised it.
