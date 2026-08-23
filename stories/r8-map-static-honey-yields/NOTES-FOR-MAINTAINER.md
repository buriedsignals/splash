# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at intake

FROZEN SOURCE IS NOT THE PUBLISHER'S BYTES, AND SIX OF NINE COLUMNS VANISH.
Ran: freezeSource({articlePath, dataPath: USDA NASS hony0326.zip -> hony_p03_t020.csv}), the publisher's own release CSV, unmodified.
Expected: a frozen record identical to what was downloaded, and a profile that either describes the table or says it cannot.
Got, measured:
  1. 2481 bytes in -> 2483 bytes out. The one latin-1 0x97 em dash in the release title became a 3-byte U+FFFD. md5 bcc32519f3fe5d5ab9b959b147f935de -> 41769828860857e9135d3ac6a96bcc74. The freeze reads utf-8 and writes utf-8 with no declared encoding and no report of a replacement character. A record that claims to be frozen changed its own bytes.
  2. parseCsv row field-count histogram over the frozen file: {"3": 11, "9": 31}. profileTable took row 0 (a TITLE row, 3 fields) as the header, so the profile has three columns named "20", "t" and the entire release title sentence, and SIX columns - colonies, yield, production, stocks, price, value, i.e. every number the story is about - are dropped with no ragged-row report of any kind.
  3. The table-id column "20" was typed number and given sum: 820. That is an arithmetic total over a table identifier.
  4. panel: null. The release is a state x year panel and the profiler says nothing about it.
Cost: the profile is unusable downstream; the beat has to read source/data.csv with its own tokeniser and the grounding gate at G1 has nothing real to check a takeaway against.

## Found at framing

G1 CONFIRMS A SUPERLATIVE AGAINST A ZERO-VARIANCE COLUMN — A FALSE CONFIRMATION, NOT A GAP.
Ran: resolveGrounding(takeaway, profile, { csv }) on the frozen USDA release, then groundingScalar.
Expected: unverifiable. The frozen profile carries no yield column, so nothing can decide a claim about yields.
Got: verdict "supported", on the detail: 'Mississippi's own value in "20" (20) is the column's maximum (20)'.
Column "20" is the release's TABLE-ID column: min 20, max 20, distinct 1. Every row is simultaneously that column's maximum and its minimum, so EVERY superlative about EVERY entity comes back confirmed.
MUTATION, run in the same session, on the same profile and csv:
  "Ohio hives yielded the highest honey per colony of any state in 2025."   -> supported
  "Florida hives yielded the lowest honey per colony of any state in 2025." -> supported
Two mutually exclusive claims, both false (Ohio is 45, eleventh of twenty; Florida is 32, and the lowest is Oregon at 27), both green. Then groundingScalar collapses "one confirmed, none refuted" into a "supported" gate 2 will close on.
The fix has to be in the deciding step, not in the collapse: a column whose min equals its max cannot decide a maximum or a minimum, and should come back unverifiable naming the reason.
Cost: G1 is the one gate whose whole purpose is to catch a takeaway that is false about its own numbers, and on this story it would have waved through either of the two sentences above. The takeaway that shipped was checked BY HAND against the publisher's table and then re-checked in the producer with claimViolations; grounding: is recorded as "unverifiable" rather than as the "supported" the gate offered.

## Found at framing

THE DOCUMENTED WAY TO RECORD A CLAIM'S SHAPE IS A SILENT NO-OP THAT THEN MISQUOTES THE JOURNALIST.
exchange.md, movement 2, documents the front-matter keys claimShape / claimColumn / claimEntity / claimVersus / claimDirection and then says: "pass it to the grounding call: resolveGrounding(takeaway, profile, { csv, recorded }) at G1". It never says the `recorded` OBJECT takes different key names.
Ran: resolveGrounding(t, profile, { csv, recorded: { claimShape: "maximum", claimColumn: "Yield per colony", claimEntity: "Mississippi" } }).
Expected: either the recorded shape is used, or a refusal naming the keys it wanted.
Got: '"undefined" is not one of the shapes this question offers (maximum, minimum, comparison, total, none), so the recorded answer decides nothing and the parser's own reading stands' AND, in the same detail string, 'The journalist recorded this claim's shape as ""'. The check states, to the journalist, that the journalist recorded an empty answer. They recorded "maximum".
Worse than a no-op: with `recorded` present the parser's own "more than any" claim disappeared from the verdict entirely, so supplying the documented answer made the check see LESS than supplying nothing.
The code wants { shape, column, entity, versus, direction } — recordedClaimOf() maps the front matter onto them, and it is only reachable from a STORYBOARD.md that does not exist yet at G1. Either exchange.md should show the mapping, or resolveGrounding should accept the front-matter names it documents.

## Found at production

THE BAKE CAN ONLY MAKE A SQUARE PLATE, AND geo-discipline RULE 12 SAYS IT TAKES THREE INPUTS.
skills/map-beat/scripts/bake-plate.mjs reads one --size and uses it for the viewport's width AND height, the screenshot clip, and geometry.frame. Rule 12's second clause: "the camera takes THREE inputs: the geography, the study set, and the target aspect."
Measured on this story's geography: the continental United States projects to 1.81:1 (58.6 degrees of longitude against 25.4 of latitude at this centre). Baked square, 45 per cent of the plate's own pixels are north and south of the study set — Hudson Bay and the deep Gulf — and the beat has to crop by hand what the camera should never have taken. Cost: this beat's copy of the bake takes --height, defaulting to --size so the seed's own invocation is unchanged. Ten lines, and none of them touch a function bake-parity.test.ts compares.

## Found at production

THE BAKE HARD-CODES THE SHAPE KEY ADM0_A3, SO IT CANNOT BAKE A SUBNATIONAL GEOGRAPHY.
Ran: the seed's bake against ne_50m_admin_1_states_provinces.geojson with a study set of United States postal codes.
Got: "49 declared countries have no shape: AL, AR, AZ, CA, ..." — every declared shape, and a message that names the wrong thing twice (they are states, not countries, and what is missing is not a shape but a KEY).
Cause: `byKey.set(feature.properties.ADM0_A3, feature)`, a literal. geo-discipline rule 5 is right that ADM0_A3 and not ISO_A3 is the admin-0 key, and it is silent about the fact that an admin-1 feature has no ADM0_A3 at all — Natural Earth keys a US state by `postal`.
Cost: this beat's copy takes --key, defaulting to "ADM0_A3", and its refusal prints the file's own first-feature property names so the next person sees the answer in the error. Nothing else in the toolchain acquires or keys geography, so this is the only place it can be fixed.

## Found at production

THE SEED'S BAKE IS THE ONE COPY OF THREE THAT DOES NOT CARRY RULE 7's WATER OVERRIDE.
grep over the tree: skills/map-web/scripts/bake-plate.mjs sets ["Water", "Water shadow"] to #aac9e0 before capture; skills/scrolly/scripts/bake-plate.mjs sets ["Water", "Water shadow", "River", "River labels"]; skills/map-beat/scripts/bake-plate.mjs sets nothing. map-beat is the skill whose SKILL.md says it holds "the bake", and geo-discipline.md — which map-beat owns — states rule 7 as an absolute: "Water is a blue tint, never grey ... because grey water is visually indistinguishable from a no-data region."
Measured on the plate this camera captured with MapTiler dataviz-dark, sampling four ocean points and three inland points out of the PNG: water #141414, land #292929. Both PURE NEUTRAL GREYS, 10.27 dE76 apart, against the 23.77 the same rule's own light-plate pair (#F7F7F7 / #aac9e0) reaches. The coast was not findable on the first bake; the picture is committed nowhere but was looked at.
Cost: this beat derives its own tint (waterTintFor in geo-honey.ts) and checks it after the capture by decoding the finished PNG and sampling two projected probes, so a style revision reddens rather than quietly going back to grey.

## Found at production

RULE 7's TWO FIXED HEXES ARE LIGHT-GROUND CONSTANTS STATED AS ABSOLUTES, AND ONE OF THEM INVERTS THE SCALE ON A DARK GROUND.
geo-discipline.md rule 7: "No-data is a distinct mid-grey ... this project's own choropleth fixes it at #b9b9b9 against a water tint of #aac9e0."
Measured against this story's recorded ground (#16191B, from NEWSROOM.md through PALETTE.md): #b9b9b9 has relative luminance 0.486. Every class of the ramp this beat draws is darker — the top class is 0.208 — so the flat grey the rule prescribes would paint the twenty-nine states nobody measured as the BRIGHTEST thing on the map, above the highest value on the scale. dE76 from #b9b9b9 to the top class is 23.89 and to the bottom class 57.75: it is not near the ramp, it is past the end of it.
Same rule, second half: "A textured fill (hatching) looks like the theoretically safer no-data treatment on paper ... but it reads illegibly ... a flat, distinct grey is the third COLOUR, not a third TEXTURE, and it is what this project's own maps use."
That last clause is a factual claim about this tree and it is false. Counted over every map component carrying a no-data treatment: FIVE hatch (map-beat/assets/Co2MapStill.tsx, Co2MapVideo.tsx, proof/mapgen-choropleth-video/ChoroplethStill.tsx + ChoroplethVideo.tsx, stories/stress-t-europe-recycling/.../RecyclingMapVideo.tsx) against THREE flat. The seed the doctrine was written against hatches.
Cost: this beat hatches, like the seed, with both halves of the pattern derived from the recorded ground. A producer reading rule 7 and following it literally on a dark ground would have shipped a map whose no-data reads as the maximum.

## Found at production

RULE 7a's "ONE OR THE OTHER, NEVER NEITHER" HAS NO REACHABLE BRANCH ON A DARK GROUND AT SIX CLASSES.
Rule 7a: a fill over the land must end up at least as far from the water tint as the bare land already was (23.77 dE76), OR the coastline must be a stroke measuring 3:1 or better against BOTH the fill and the water.
Branch 1, measured over the whole knob range with the water tint derived to sit exactly 24.28 dE76 from the land: the MINIMUM distance from a ramp class to the water is 15.57 at FROM 0.10, 14.74 at 0.20, 15.35 at 0.28, 15.13 at 0.35. It never approaches 23.77 and it is not monotone in the knob, because the water tint necessarily sits inside the lightness span a ground-to-accent ramp has to cover. Branch 1 is unreachable here at any (FROM, TO).
Branch 2, measured at the seed's own ramp end (TO 0.78): white measures 2.44:1 against the top class; the ground colour measures 1.21:1 against the land; the furniture grey 1.02:1. NO single stroke colour clears 3:1 against all six classes and the water. So at the seed's own settings BOTH branches fail and the rule says that is not allowed.
What makes it reachable: shortening the ramp. TO 0.68 is the largest value at which white clears 3:1 everywhere (worst 3.04:1, on the top class) while assertRampReads still passes (minimum luminance step 0.0302 against its 0.02 floor, top class 5.81:1 against the ground). TO 0.70 gives 2.90:1 and fails.
Cost: this beat asserts branch 2 at render time (assertCoastlineIsDrawn) rather than claiming it in prose, and its ramp ends at 0.68 rather than the seed's 0.78 because of it. Worth stating in the rule itself: on a dark ground the ramp's top is bounded by the coastline stroke, not by the accent.

## Found at production

THE SEED'S VERTICAL LEGEND DOES NOT SURVIVE THE SIZE GATE 2c PINNED.
skills/map-beat/assets/Co2MapStill.tsx draws a 200px vertical class bar with 12px tick labels at a 900x560 frame. This beat pins landscape, and #shared/map-beat/sizes.mjs holds a landscape frame to a 30px type floor (assertTypeFloor). Measured: six class labels on a 186px vertical bar are 31px apart and the type is 30px tall — the labels touch, and the legend reads as one block rather than as six classes. There is no bar height that fixes it inside the column this frame leaves (the fit guard refuses anything taller).
Laid along the column's own 594px instead, the same six labels are 99px apart. Cost: this beat's legend is horizontal, which also happens to suit a takeaway that says "above the average" rather than the seed's "below" — but the reason it changed is arithmetic, not taste.
Second, smaller thing in the same legend: the seed labels the first class `0` ([0, ...breaks]). On an open-bottom class that is a claim the data does not make — this beat's own minimum is 27 pounds and nothing is near zero. It takes the observed minimum instead.

## Found at delivery

THE HAND-OVER TELLS A MAP BEAT ITS SVG "STAYS SHARP AT ANY SIZE". IT DOES NOT.
Ran: materialise({ form: "owned-file", format: "static", ... }).
Got, in export/1-honey-yield-2025/HANDOVER.md: "**honey-yield-2025-still.svg** — the vector file — this is the one to give the CMS, and it stays sharp at any size".
This beat's SVG carries the baked basemap plate as an embedded raster data: URI, 2200x1214 pixels — map-beat/SKILL.md calls it "the heaviest single asset this format produces". The geography in that file is a bitmap and it does not stay sharp at any size; enlarged, the basemap blurs while the state outlines stay crisp, which is worse than either alone. The copy is written for a chart, where the claim is true, and delivered unchanged on a map beat, where it is not. A newsroom told to give the CMS the vector file will scale it.

## Found at delivery

"TAKEN" AND "DECLINED" ARE THE SAME FACT TO THE STATE MACHINE, AND THE OFFER'S OWN TEXT SAYS THEY ARE NOT.
formatSubjectOffer's closing sentence: "Taking one starts a new visual in this story, from the beginning — you frame it, you see it, you approve it, and it is delivered on its own, beside the one you already have."
Ran: recordSubjectAnswer({ exportDir, answer: "taken", subject: "where-the-tonnage-is" }), then whereIs(storyDir).
Expected: some state a later session can act on — a phase, a missing entry, anything naming the subject that was asked for.
Got: {"phase":"done","missing":[]}.
deliveryClosed reads .other-subjects as closed for any value that is not the `pending` sentinel, so a journalist who asked for a second graphic and a journalist who said no leave the story in exactly the same state. The request is on disk (`taken where-the-tonnage-is`) and no gate, phase or offer ever reads the subject out of it again. This is the same shape as the SUBJECTS.md defect five formats reported across two rounds — a record produced and read by nothing — one step further down the journey.

## Found at delivery

SMALLER THINGS, EACH WITH WHAT IT COST.
1. assertDeliveredSize (#shared/map-beat/sizes.mjs) handed a Buffer instead of a {width,height} reports "measures undefinedxundefined, but the pinned size \"landscape\" is 1920x1080" -- a size MISMATCH for a measurement that never happened. It cannot observe that its own input is not something it can measure, and the file's own header says this assertion is the one the whole size decision rests on. One line: refuse a value with no numeric width/height, naming readPngSize.
2. proposeCredit recommended, and printed as its own `prints` value, "Source: USDA NASS, *Honey* (ISSN 1949-1492), released 13 March 2026" -- the article's own marked source line, carried verbatim, asterisks included. It is read out of a MARKDOWN file and printed onto a PNG, where * is a character. The recommendation is right; the value needs its emphasis markers stripped, or the journalist has to notice.
3. recordSurveyedSubjects is named by BOTH gate-2 refusals (splash/scripts/where.mjs and storyboard/scripts/storyboard.mjs carry the sentence byte-identically) and lives in skills/deliver/scripts/other-subjects.mjs. storyboard/SKILL.md does not mention it anywhere -- not in its Architecture table, not in its Files list. Since CONSTRAINTS forbids cross-skill runtime imports, the skill whose gate demands the file cannot be the skill that writes it; that is a real architectural fact rather than a naming slip, and it needs saying where the producer reads.
4. The seed's own render-map.mjs still calls renderStill at 900x560 with the default scale 2 and passes no pinned size, so the seed itself would fail assertDeliveredSize. Known debt with a ratchet (splash/test/delivered-size-matches-the-pin.test.ts) -- and the ratchet walks proof/ only, so a beat under stories/ is outside it.
5. deliver/scripts/deliver.mjs's resolveRecordedAlt says out loud that "no producing skill writes ALT.md yet". This beat's producer writes it, from the same variable the component puts in its <desc>, so the two cannot disagree. Two lines. Worth doing in the seed.
6. Two tests are red in this tree from OTHER agents' round-eight beats, not from this one: bake-parity on stories/r8-scrolly-swiss-avalanche-deaths/beats/1-the-deaths-moved/bake-plate.mjs, and csv-hand-split on that beat's avalanche-data.ts and on stories/r8-map-web-japan-bear-casualties/beats/1-bear-casualties-by-prefecture/prepare-inputs.mjs. Reported, not touched.
