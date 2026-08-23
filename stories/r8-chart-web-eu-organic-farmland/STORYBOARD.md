---
takeaway: "Estonia has the highest organic-farmland share of any country reporting for 2024, 22.58 % of its utilised agricultural area, and no country reporting for that year reaches the 25 % the EU set for 2030."
subject: "organic farmland as a share of utilised agricultural area, by country"
comparison: "each country's most recently published share against the 25 % the EU's Farm to Fork strategy set for 2030"
limits: "the most recent published year is NOT the same for every country — Austria last published for 2020, Greece for 2021, Iceland for 2021, the United Kingdom for 2019 — and the EU's own aggregate in this table stops at 2020, so no European average can be drawn beside the 2024 values. The share counts land fully converted AND land still under conversion, which is Eurostat's own definition, not a choice made here. Eurostat's per-value flags (estimated, provisional, break in series, definition differs) travel with the numbers."
placement: "inline in the article body, directly under the paragraph quoting the Farm to Fork 25 % target"
credit: "Data: Eurostat, Area under organic farming (sdg_02_40), downloaded 23 August 2026"
effectiveDate: "2026-08-23"
grounding: supported
claimShape: "maximum"
claimColumn: "OBS_VALUE"
claimEntity: "Estonia"
reference: "Australian Broadcasting Corporation -- 'How Buddy Franklin scaled footy's Everest' (26 March 2022), reference-set row 'a long, noisy series read against a historical level'. Accepted for slot 1. The transferable move is to refuse to leave the comparison to the reader's eye: the level a series is read against is NAMED AS A NUMBER on the graphic. Applied here as a drawn rule at 25 % carrying its own label, so the target is seen rather than asserted, and every stem's length is read as distance from it. Shown beside it and folded in rather than chosen: Weiss & Bauer, Republik, 'Mensch gesund, Klima krank' (21 March 2025), reference-set row 'a total whose majority escapes the subject named in the title' -- its honesty move is that the part which cannot be placed is EXCLUDED from the marks and DECLARED in the source note instead of being folded in. Applied here to the four countries whose most recent year is not 2024: they keep their mark, but each states its own year on the graphic, and the EU aggregate, which stops at 2020, is excluded from the ranking entirely and declared in the caveat."
language: "en"
slots:
  - id: 1
    proves: "Estonia has the highest organic-farmland share of any country reporting for 2024, 22.58 % of its utilised agricultural area, and no country reporting for that year reaches the 25 % the EU set for 2030."
    medium: chart
    format: web
    reachable: yes
    chosen: Lollipop
    candidates: [Lollipop, "Dumbbell (range plot)", Line]
---

# What this story draws

## The claim, and what grounds it

Eurostat's own article on organic farming stops at 2022 and reports the EU at 10.5 % of its
agricultural land, against a Farm to Fork target of at least 25 % by 2030. The indicator table
behind that article now runs to 2024. This beat asks the only question the newer data can answer:
where does each country actually stand against that line today, and how old is "today" for each
of them.

`resolveGrounding` returned **supported** on the confirmed takeaway: Estonia's own 2024 value in
`OBS_VALUE` (22.58) is the maximum of that year. The 2030 in the sentence came back explicitly
unplaceable and that is the correct answer — 2030 is outside the table's period column and is a
policy date, not a reading.

## What the article says that this table cannot confirm

Two of the article's own sentences cannot be checked against this download, and both are recorded
here rather than repeated on the graphic:

- *"Organic area made up 10.5 % of total EU agricultural land in 2022."* This table's EU aggregate
  has no value after 2020, where it stands at 9.10 %. The article computes its figure from two
  other tables. Nothing here confirms or refutes 10.5 %.
- *"The countries with the highest shares … in 2022 were Austria (27 %), Estonia (23 %) and Sweden
  (20 %)."* Estonia (23.42) and Sweden (19.94) are in this table for 2022. Austria is not: its
  series ends at 2020. The graphic therefore cannot show Austria in a 2024 ranking, and says so.

## The slot

One slot, one claim. Three genuinely different ways to see it were offered:

| candidate | what it would argue |
| --- | --- |
| **Lollipop** (chosen) | one stem per country from zero to its latest published share, ranked, all read against the 25 % rule — the distance to the target is the thing |
| Dumbbell (range plot) | each country as a 2015-to-latest pair, so the argument becomes how far each moved rather than where it stands |
| Line | the EU aggregate's own 2012–2020 series carried toward 2030, so the reader sees the slope the target would need |

The lollipop is chosen because the takeaway is a standing, not a movement: thirty rows against one
announced line. `assertDistinctWays` accepted the three as three ideas rather than one wearing three
labels.

Gate 2b was answered **Interactive web**: twenty-five years of series, thirty-odd countries and a
per-value flag on every reading are more than one static frame can carry, and the reader has to be
able to ask any row which year its number is from. No Datawrapper mapping exists for a lollipop on
the web, so the producer question was not asked and the custom producer stands.
