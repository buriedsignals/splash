---
takeaway: "In 2025 Mississippi's hives made 89 pounds of honey each -- nearly double the 48-pound United States average, and more than any of the other nineteen states USDA reports separately."
grounding: unverifiable
claimShape: "maximum"
claimColumn: "Yield per colony"
claimEntity: "Mississippi"
reference: "Sabrina Weiss and David Bauer -- Republik -- 'Mensch gesund, Klima krank? Die Schattenseite der Pharmaindustrie' (21 March 2025), with SRF Data, offered under the reference set's structure 'a total whose majority escapes the subject named in the title'. Accepted for its honesty move: the share that cannot be attributed is EXCLUDED from the marks and DECLARED in the source note rather than folded in. Applied here to the thirty states and the District of Columbia that USDA pools into one 'Other States' line. The structure this beat actually has -- a rate across regions where most of the geography is unreported -- is NEW to the set; one live search for a newsroom treatment of it returned nothing usable, and that is recorded rather than papered over."
subject: "Mississippi, the highest yield per colony USDA reports for 2025"
comparison: "the United States average of 48.0 pounds per colony, and the other nineteen states USDA reports separately"
limits: "USDA reports yield for twenty states only. The other thirty states and the District of Columbia are pooled into one line, 'Other States' (317,000 colonies, 15,604,000 pounds, 49 pounds per colony), and cannot be placed on a map at all -- so a state drawn without a value may be above Mississippi and this table cannot say. USDA also states that colonies producing honey in more than one State were counted in each State, so yield per colony is understated at the United States level. Alaska and Hawaii are outside the frame and are among the unreported."
placement: "beside the release's own paragraph reporting the 48.0-pound national average; that paragraph already gives the national figure, so the map gives the states"
credit: "USDA National Agricultural Statistics Service, Honey, released 13 March 2026"
effectiveDate: "2026-08-23"
language: "en"
slots:
  - id: 1
    proves: "that Mississippi's reported yield per colony is the highest of the twenty states USDA publishes and roughly double the national average, and that most of the map carries no value at all"
    medium: map
    format: static
    size: landscape
    destination: screen
    reachable: yes
    candidates: ["Choropleth", "Proportional symbol (symbol / bubble map)"]
    chosen: "Choropleth"
    producer: custom
---

## What the visual shows

One landscape still. The lower forty-eight states, drawn over a dark MapTiler plate. The twenty
states USDA reports separately are filled from a single class scale of pounds of honey per colony in
2025; the thirty-one areas it does not report are drawn on the map, visibly without a value, rather
than left off it. Mississippi is outlined and labelled in the house gold, with its 89 pounds stated
beside it. The 48.0-pound United States average is a marked step on the legend, so "above the
average" is something a reader sees rather than something the caption asserts.

## The producer gate, and why custom

`producerGap` fired on this slot -- the catalogue maps map/Choropleth to Datawrapper's
`d3-maps-choropleth`, so the conditional G2-producer gate is live for a MAP slot and not only for a
chart. `formatProducerGate` asked Datawrapper or custom and the answer is **custom**: the argument
this beat makes is as much about the thirty-one areas USDA does not report as about the twenty it
does, which needs a declared no-data category with its own legend entry and a class scale carrying a
marked step at the 48.0-pound national average.

## Why a choropleth and not a proportional symbol

`formatCandidates` printed the symbol map's own sheet back at me and it argues against itself here:
*"Don't reach for a symbol map when the underlying geography is really an area with a per-region
rate."* Yield per colony is a per-region rate. The symbol map's real argument -- that it escapes the
area bias, so Rhode Island and Montana read at the same weight -- is true and is the reason it stays
on the record as the second way of seeing this, but the quantity belongs to the territory and the
choropleth is what says so.

Six of the eight map types this toolchain holds a sheet for are not applicable and were named as
such at the survey: dot density and hex grid need point events, contour needs a continuous field
sampled at points, flow needs origin-and-destination pairs, locator needs places to point at rather
than a distribution, and a cartogram sizes a region by an extensive quantity, which a rate is not.

## The exchange, as it actually ran

- **(1) Restitution.** Five claims read back off the release: production 116 million pounds, down 14
  per cent; 2.41 million colonies, down 7 per cent; yield 48.0 pounds per colony, down 7 per cent;
  price $3.05 per pound, up 27 per cent; and the structural one -- twenty states published, the rest
  pooled.
- **(2) The takeaway, and its grounding at G1.** Confirmed verbatim above. `resolveGrounding` was
  run against the frozen profile and the frozen csv, and its answer is recorded as `unverifiable`
  rather than as the `supported` it returned, because what it returned was FALSE CONFIRMATION: it
  decided the superlative against the frozen profile's column "20", which is the release's table-id
  column and holds the value 20 in every row, so it reported *"Mississippi's own value in "20" (20)
  is the column's maximum (20)"*. Asked the same way, it also confirms that Ohio has the highest
  yield and that Florida has the lowest -- two claims that contradict each other and are both false.
  The takeaway above was therefore checked by hand against the publisher's own table, and the
  numbers in it are the publisher's: Mississippi 89, Montana 85, North Dakota 67, Iowa 62,
  Pennsylvania 57, New York 56, Louisiana 53, Minnesota 50 are the eight above 48.0; the twelve
  others are below. See NOTES-FOR-MAINTAINER.md.
- **(3) The hand.** Five questions, six fields, above. Credit came from `proposeCredit`, which read
  the article's own marked source line back and recommended it; the recorded value is that line with
  its markdown emphasis characters removed, because a credit prints as plain text on a PNG.
- **(4) The survey.** Eight map type sheets read; two survived as genuinely different ways of seeing
  this, and `assertDistinctWays` accepted the pair.
- **(5) Medium -- G2a.** map. `proposeMediums` reported all three mediums reachable and the MapTiler
  probe answered 200.
- **(6) Format -- G2b.** static, from the four `proposeFormats` offered, all four reachable for map.
- **(7) Size -- G2c.** landscape, from `proposeSizes("static")`; `formatPublicationDestinationGate`
  then asked screen or print and the answer is screen.
- **(8) The reference loop.** Recorded above, including what the live search did not find.
- **(9) Palette and typeface.** `PALETTE.md` and `TYPEFACE.md` beside this file.
- **(10) The proposal.** This slot, and `SUBJECTS.md` for the angles that are not being drawn.
