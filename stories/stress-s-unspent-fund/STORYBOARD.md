---
takeaway: "Of the €4.1 billion allocated to the regional resilience fund, €0 had been disbursed by the end of June 2026."
grounding: supported
reference: "none — the reference loop was not reached; no candidate survived movement ④, so there was no treatment to look up an analogy for"
subject: "the fund — specifically, the disbursement figure, not the allocation"
comparison: "the €4.1bn allocated against the €0 actually disbursed"
limits: "the €0 figure is the fund's own quarterly return as of end of June 2026; it says nothing about disbursements after that date"
placement: "top of the piece, per the journalist's own instruction — before the first paragraph, which already states both numbers in prose"
credit: "Source: fund's quarterly return, confirmed by its director"
effectiveDate: "2026-08-20"
slots: []
---

## Why this storyboard closes with zero slots

Movement ① (restitution) and ② (the confirmed takeaway) went through as usual: the one sentence
worth keeping is that €4.1bn was allocated and €0 disbursed. `resolveGrounding` against
`source/profile.json` returns `supported` — but only because the takeaway's incidental year (2026)
falls inside the `year` column's range. Both of the numbers that actually carry the story, 4.1 and
0, come back `unverifiable`: `source/data.csv` never held them. They live only in the article's own
prose. This is the correct, documented behaviour of `groundTakeaway` (an unplaceable number is
`unverifiable`, never `contradicted`) — not a defect, and not a reason to stop on its own.

Movement ④ (the survey) is where this storyboard stops. `source/profile.json` describes exactly two
columns: `year` (one distinct value, 2026) and `fund` (one distinct value, 1 — an identifier, not a
measure; nothing in the profile marks it as a currency or an amount). One row. No second measure,
no category, no distribution, nothing to compare the fund against inside the data itself. Every
intent in `chart-choice.md` — rank-or-compare, compare-several-series, gap-between-two-values,
trend-over-time, before/after, two-measures-together — presumes at least two comparable values or
an ordered series longer than one point. This profile supplies neither. The real comparison (€4.1bn
vs €0) is real, but it is not *in the frozen data* the survey is required to read — it is text the
journalist wrote, which this phase does not have a mechanism to draw a chart from without inventing
numbers the profile does not contain.

No type in the 41-row visual catalogue (`references/visual-catalog.json`) is "state one confirmed
figure" — the closest structural fit, a bullet chart (`chart.bullet`, "actual performance judged
against a real target"), still requires an actual value and a target value as data, and this
profile has neither. Nothing else in this toolchain (chart, map, or image) has a producer for a
plain big-number card either — see the report for the full list of what was checked.

So: no candidate survives movement ④, `slots: []`, and Gate 2 does not close
(`checkStoryboard` returns `"no slot: nothing would be produced"`, matched at
`stories/stress-s-unspent-fund/STORYBOARD.md`, and independently confirmed by
`skills/splash/scripts/where.mjs`'s `whereIs`, which will keep reporting phase `storyboard` with
that same missing reason). This is deliberate, not a stall: the honest answer for this story is a
big, direct restatement of the number in text at the top of the piece — a job for the article's own
layout, not for this toolchain's chart/map/image producers, none of which has a cell for a single
confirmed figure with no second value to compare it to. Per the brief for this run, nothing was
produced rather than invent a chart to have something to show.
