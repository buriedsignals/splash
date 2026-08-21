# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

FORMAT_CATALOG is keyed on a single medium/format pair and carries no `mixed` medium, so a slot cannot record that one scrolly assembles a chart, two photographs and a map. This beat records `medium: chart` as a compromise. MATRIX.md already lists `mixed scrolly` and `photograph sequence` as types with a proof beat each, and neither appears in storyboard/references/type-survey.md (40 sheets, 32 chart + 8 map), so the survey at movement 4 can never offer the form this article asks for.

## Found at storyboard

ground-claim.mjs places a four-digit numeral on the period column whenever one exists, even when the sentence names its own measure: the guard `chosen.named` is only consulted in the else-branch where there is no period column, so the documented exception ("unless the sentence explicitly names a measure, in which case a four-digit figure really can be that measure own value") is unreachable. "Alcanede had 1860 workers in 1980" reports 1860 unplaced against year [1980, 2026] although workers max is exactly 1860.

## Found at storyboard

PAIR_EN_RE requires the direction word BEFORE `in <year>`, so the ordinary English order "kilns in 2026 was higher than in 1980" — which the storyboard SKILL.md documents as the recognised shape, in that word order — matches nothing and returns `unverifiable`. `unverifiable` closes G1, so a claim the frozen data flatly refutes passes the gate.

## Found at storyboard

A thousands separator makes a claim unverifiable: "1,860 workers" is refused as ambiguous between grouping and a decimal comma, while "1860 workers" is decided. The takeaway a journalist would write is the one the grounder cannot read.

## Found at storyboard

The article own shape claim ("steady until 2010 and then steepened") is false on the absolute reading — kilns lost per year runs 1.1, 1.2, 1.0, 0.6, 0.33 — and groundTakeaway recognises no shape for it at all. It was caught by computing the rates by hand.

## Found at delivery

SUBJECTS.md is required by the delivery closing offer and by nothing else: neither checkStoryboard nor whereIs missingForGate2 reads it, and it is named in storyboard/references/exchange.md only — not in storyboard/SKILL.md architecture table, not in the splash phase table row for the storyboard gate. Both gates reported Gate 2 closed and the phase as production with `missing: []` on a story that had no SUBJECTS.md, and the file was discovered missing at G4, after the storyboard, the render and the approval.

## Found at production

The plate probe in verify-scrolly.mjs takes the first `img[src^=data:]` inside .scrolly-graphic as "the plate". In a mixed beat that is the first PHOTOGRAPH, not the baked basemap. Measured here: it reported plate luminance 0.125, which is this story 1980 photograph; the real plate measured 0.797. With the light plate the guard passed while plateFollowsGround would have failed against a ground of 0.009.

## Found at production

scrolly bake-plate.mjs hard-codes `dataviz-light` with no flag, so a newsroom with a dark recorded ground gets a plate its own verifier is written to refuse. It also reads its camera centre through readStation, which requires a USGS site file with `drain_area_va`, and writes `potomac-plate.jpg` whatever --out it is given — so any beat that is not a river gauge has to carry its own copy of the bake.

## Found at production

The scrolly seed centres the map camera on the subject so the marker lands on the plate own centre; the prose card is centred over the graphic and is dead centre at data-progress = i. Driven with the centred camera, the only two marks of this locator were under the card on 52 of 240 frames at 1600x900. safeBand guaranteed-visible width for a 1000x640 plate is 268px, x in [378, 622] — all but exactly the card stripe at 1600px — so no horizontal placement escapes it. This beat pans the camera vertically instead.

## Found at production

Of the 13 guards verify-scrolly.mjs declares in its own GUARDS array, 5 have no call site outside their own test file: plateMatchesGeometry, csvSplitByHand, pageLanguageMatchesStory, credentialReadsWithoutAlias, compositionFillsTheFrame. Unchanged since the previous round. A further 9 guard kinds are declared in this skill detect-*.mjs scripts and none of them is called from any script either; two of those nine have no test at all.

## Found at production

detect-fills-its-frame.mjs is now present in all eight producing skills and is called by none of them: graphicFillsItsFrame has zero callers under any skill scripts/ directory. The check that the graphic fills its frame therefore still never runs against anything a producer ships, and this beat was never measured by it. Its sibling test walks a hard-coded list of four proof beats plus one hard-coded story beat, so no beat produced from here on is in that population.
