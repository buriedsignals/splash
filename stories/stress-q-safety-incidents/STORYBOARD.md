---
takeaway: "Sul has the worst safety record per resident, not Centro: 233 incidents per 100,000 residents against Centro's 205, even though Centro's raw count of 412 is the highest in the city."
grounding: supported
reference: "ABC News (Australia), 'Conquering Mount Everest: High hopes and broken dreams' -- a profile whose two dimensions disagree: the raw count read first, then the rate that reverses it, both stated with the exact comparison figures"
subject: "the incident rate per resident, not the raw count"
comparison: "Sul's 233 incidents per 100,000 residents against Centro's 205 per 100,000 -- despite Centro's higher raw count (412 against Sul's 205)"
limits: "residents is a single population figure per district, not adjusted to the same year the incidents were logged"
placement: "replaces the headline's claim, before the raw counts are cited"
credit: "Source: municipal safety incident report and district population estimates"
effectiveDate: "2026-08-21"
language: en
slots:
  - id: 1
    proves: "that the rate, not the raw count, decides which district has the worst safety record"
    medium: chart
    format: static
    size: landscape
    reachable: yes
    candidates: ["Bar and column", "Dot plot"]
    intent: unrecorded
    rankingWalk: unrecorded
    chosen: "Bar and column"
    producer: custom
---

## What the visual shows

One bar per district, sorted by incidents per 100,000 residents. Sul, not Centro, is the longest
bar. Centro's raw count (412, the highest in the city) is named directly in the annotation beside
its own bar, so a reader can see why the headline got this wrong without the chart itself repeating
the false claim.
