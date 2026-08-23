---
takeaway: "EU antibiotic consumption reached 20.3 DDD per 1 000 inhabitants per day in 2024, 4.4 above the 2030 target of 15.9."
grounding: unverifiable
claimShape: comparison
claimColumn: "2024"
claimEntity: "A,P_THAB,EU27_2020"
claimVersus: "the 2030 target of 15.9"
claimDirection: greater
reference: "Australian Broadcasting Corporation -- 'How Buddy Franklin scaled footy's Everest' (26 March 2022), reference-set row 'a long, noisy series read against a historical level'. The transferable move: do not leave the trend to the reader's eye -- name the level the series is being read against as a NUMBER on the graphic. Applied here as a drawn rule at 15.9 carrying its own label, so the 2030 target is seen rather than asserted."
subject: "the EU population-weighted mean consumption of antibacterials for systemic use (ATC J01), 2013-2024"
comparison: "the 2024 level against the 2030 target of 15.9 DDD per 1 000 inhabitants per day, with the 2019 baseline of 19.9 in the same frame"
limits: "The 2020-2021 fall is the COVID-19 pandemic, not policy. ECDC imputes missing country-years into the EU mean, so the aggregate is not a simple average of what countries reported: in this table alone 32 cells carry Eurostat's ':' for data not available. Six values in the country rows carry a break-in-series flag. The target is the Council's 20 per cent cut on the 2019 baseline; the baseline itself is a reported figure, not a fixed one."
placement: "mid-article, immediately after the paragraph quoting the ECDC report"
credit: "Eurostat (sdg_03_70), compiled by ECDC through ESAC-Net"
effectiveDate: "2026-03-05"
language: "en"
slots:
  - id: 1
    proves: "that the EU mean is above its 2019 baseline and 4.4 above the 2030 target, and that the only years it came near the target were the two pandemic years"
    medium: chart
    format: static
    size: landscape
    destination: screen
    reachable: yes
    candidates: ["Line", "Bar and column", "Dumbbell (range plot)"]
    chosen: "Line"
    producer: datawrapper
    datawrapperType: d3-lines
---

## What the visual shows

One line, twelve points, the EU population-weighted mean consumption of antibacterials for
systemic use (ATC J01) from 2013 to 2024, in defined daily doses per 1 000 inhabitants per day.
Drawn across it at 15.9 is a horizontal rule: the level the 2023 Council Recommendation commits
the EU to reach by 2030, which is 20 per cent below the 2019 baseline of 19.9.

The rule is the argument. The line dips under it only once — the two pandemic years, 2020 and
2021, at 16.4 — and that dip is not policy. By 2024 the curve is back at 20.3, above where it
started and 4.4 above the rule it is supposed to be reaching down to.

## Why a line and not three bars

The alternative offered was a column chart of three numbers: 2019 baseline, 2024, 2030 target.
It states the gap and hides the shape — the reader would not see that the only time Europe was
near its target was a period of closed surgeries and cancelled appointments, nor that consumption
has risen every year since. The line carries eleven years of context for the same one claim.
The other candidate, a dumbbell of 2019 against 2024 for each member state, is a different and
also true story — who moved and who did not — and it is recorded in SUBJECTS.md rather than drawn.

## What the grounding check could and could not say

`grounding: unverifiable`. The frozen table is Eurostat's own download, and every one of its
twelve year columns is typed `text` by the profiler because Eurostat writes its missing values as
`:` and its break-in-series flags inside the cell (`19 b`, `28.5 b`). With no numeric column,
nothing in the takeaway could be placed — not even 20.3, which is a cell of the frozen table.
The recorded claim shape says so by name rather than in silence. The numbers in the takeaway are
ECDC's own, published on 18 November 2025, and were checked by hand against the EU27_2020 row.
