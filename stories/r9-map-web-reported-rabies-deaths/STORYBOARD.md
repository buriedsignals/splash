---
takeaway: "WHO estimates 59 000 people die of rabies every year. For 2024 the world's health ministries wrote down 3 021 between them — and 94 of the 195 countries in WHO's own file, India among them, filed nothing at all."
claimShape: "none"
subject: "the 94 countries whose 2024 cell reads \"No data\" — the reporting gap itself, not any one country"
comparison: "the 101 countries that did file for 2024: the 57 that reported at least one death and the 44 that reported zero"
limits: "These are REPORTED deaths, not deaths. WHO's own fact sheet says so in one sentence — \"due to underreporting, documented case numbers often differ from the estimate\" — and the arithmetic says how far: 3 021 written down against an estimated 59 000 a year. A blank cell is not a zero: 94 countries filed nothing and are drawn as no-data, never as 0. A reported 0 is a reading and is drawn as one. The counts are RAW counts of people, never a rate: the file carries no population column and dividing an under-report by a population would invent a risk nobody measured. Natural Earth folds some reporting territories into the state that administers them, so a small number of WHO readings land on no shape at all and are named in the caveat."
placement: "Follows the paragraph beginning 'Globally there are an estimated 59 000 deaths from rabies annually; however, due to underreporting, documented case numbers often differ from the estimate.' That paragraph gives the estimate, so the visual must give the other half — what was actually filed, country by country, and which countries filed nothing."
credit: "World Health Organization, Global Health Observatory — indicator NTD_RAB2, \"Reported number of human rabies deaths\" (retrieved 23 August 2026)"
effectiveDate: "2026-08-23"
grounding: "unverifiable"
reference: "a total whose majority escapes the subject named in the title — Weiss & Bauer, Republik, 'Mensch gesund, Klima krank' (21 March 2025). Lifted rule: the part that cannot be placed is EXCLUDED from the marks and DECLARED in the source note, never folded into a residual. Applied twice here — the 94 non-reporting countries get the no-data surface and an explicit caveat line rather than a zero, and the 56 000-death gap between what was filed and what WHO estimates is stated in the caption rather than drawn as a class. Rejected from the same row: performing the argument in the title, which this subject does not take."
language: "en"
slots:
  - id: "1-what-the-world-wrote-down"
    proves: "The map of reported rabies deaths in 2024 is a map of who filed: 3 021 deaths reported by 57 countries, 44 countries reporting zero, and 94 — India, China and Pakistan among them — filing nothing at all."
    medium: "map"
    format: "web"
    reachable: "yes"
    candidates: ["Choropleth", "Proportional symbol (symbol / bubble map)", "Cartogram"]
    chosen: "Choropleth"
    producer: "custom"
---

# What the world wrote down about rabies

## What was asked, and what I answered

**G1 — the takeaway.** *What is the one thing this graphic has to prove?* — That the published
count is a count of REPORTING. WHO's own fact sheet gives the estimate (59 000 a year) and says in
the same sentence that documented numbers differ from it. The file gives the other half: 3 021
deaths written down for 2024, and 94 of 195 countries writing nothing.

**G1, second question — what SHAPE is this claim?** *maximum · minimum · comparison · total · none,
and about which column?* — **none.** The sentence sets a published estimate against a reported sum.
`comparison` in this vocabulary needs two ENTITIES in the table and a direction; the 59 000 is not
an entity, it is not in the table at all, and it is not meant to be. `total` means the parts sum to
100 per cent, which nothing here claims. Recorded as `none`, honestly.

**Grounding: `unverifiable`.** `groundTakeaway` decided 0 of 1 sentences. Three separate reasons,
all measured, all in `NOTES-FOR-MAINTAINER.md` under phase `storyboard`:
the check splits `59 000` into the claims `"59"` and `"000"` and `3 021` into `"3"` and `"021"`, so
the numerals it scored are not numerals anybody wrote; it reports *"this profile carries no period
column"* for `2024` on a file whose `TimeDim` column runs 2010–2024, because intake picked WHO's
record-modification timestamp as the period; and it asks the sentence to name one of four measures
called `Id`, `TimeDim`, `NumericValue` and `TimeDimensionValue`, which no journalist's sentence will
ever do. The same check, given `The file records 33732 reported human rabies deaths between 2010 and
2024`, answers `supported — equals the sum of column "NumericValue"`, so the mechanism works; it
cannot reach this file's per-year facts. Recorded as what it is, not worked around.

**The hand.** Subject: the reporting gap. Comparison: the 101 countries that did file. Limits,
placement, credit, effective date: in the front matter above, each answered once. The limits field
carries the one line this beat must never lose — a blank cell is not a zero.

**G2a — medium.** *Map*, because the claim is about which countries. A ranked bar of the 57
reporters would draw the story backwards: it would show only the countries that filed, and the
countries that did not are the subject.

**G2b — format.** *Interactive web.* All four formats are reachable for `map` on this machine
(`formatGap` returns null for static, web, video and scrolly; `capabilityGap` reports the map
capability open, MapTiler answered 200). Web wins because 195 countries carry a state and a static
frame can label perhaps eight of them; a reader who wants to know what Ghana filed should be able
to ask. Hosted embed is closed here — preflight measured *"Cloudflare answered 403"* — so the
delivery will be a file, not a URL.

**G2c — size.** Not asked. A web beat carries no size.

**G2-producer.** Asked, because Datawrapper does map this treatment (`d3-maps-choropleth`). The
gate answered itself: *"Datawrapper cannot carry a web beat on this newsroom's ground (#16191B) …
a published Datawrapper embed follows the reader's own colour scheme and defaults to light."*
Recorded as `custom`, the only reachable answer.

**⑧ The reference loop.** The set's closest row is *a total whose majority escapes the subject named
in the title*. One live search for newsroom treatments of reported-against-estimated mortality
returned agency dashboards and academic papers (CDC excess deaths, IHME, a Springer article) and no
publishable newsroom graphic, so nothing new was added to the set and the existing row is what this
beat lifts from — specifically its source-note rule.

## The candidates, and why the chosen one won

| Candidate | Why it was on the list | Why it did not win |
|---|---|---|
| **Choropleth** | It is the only one of the three that can draw all THREE states this file holds — a number, a reported zero, and a country that filed nothing. The no-data surface is not a gap in this beat, it is the argument. | *chosen* |
| **Proportional symbol** | Correct for a raw count, and this beat draws raw counts. Circle area carries 641 against 1 honestly, which a class ramp flattens. | A symbol map cannot draw a zero and cannot draw a blank. Both of the states the takeaway is about would simply be absent from the map, and a reader could not tell a country that reported 0 from one that reported nothing from one that is not in the file. That is the exact failure the reference row's rule forbids. |
| **Cartogram** | Would state the concentration of reported deaths in Africa and Asia most forcefully. | Destroys the coastline the reader needs to find India on, and 94 no-data countries would have to be given an area anyway — a cartogram has no way to draw "nothing was filed" except by drawing a shape. |

## The count, and why it is not a rate

`detect-denominator-reading.mjs` asks a beat drawn from a count to say which reading it draws. This
one draws **raw**, and it is the correct answer rather than the lazy one: the number on the map is a
number of forms filed with WHO. Dividing it by population would produce a per-capita rabies death
rate that is wrong by a factor of about twenty and that nobody — not WHO, not the ministries —
has ever claimed. The file carries no population column at all; the profile's own
`denominatorNotInThisTable` note says a panel published one indicator per file keeps its denominator
elsewhere, and this beat does not go and get one.

## The three states, drawn as three things

- **A reported number**, 1 to 641 — the sequential ramp, six classes.
- **A reported zero**, 44 countries — the ramp's own first class. Zero is a reading and is drawn as
  one.
- **No report filed**, 94 countries — the derived no-data surface, and a caveat line naming India,
  China and Pakistan by name so a reader cannot mistake the grey for a zero.
