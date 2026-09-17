---
size: landscape
type: slope
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — All sixteen rose, and one country overtook France

**Type:** slope chart (two dated rails). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above, which is the statement that counts.

The first `slope` beat in this tree. The `paired` family holds nineteen references and only the
dumbbell had a directed component; four of the nineteen draw a slope.

## The claim

**All sixteen countries gained low-carbon electricity between 2000 and 2024 — and exactly one
overtook France.** Finland was 25.2 points below France in 2000 and is above it in 2024. Denmark made
the largest gain of the group, 15.5 % to 89.2 %.

All three are asserted, and the crossing especially: a crossing is the one thing a slope chart exists
to show, so it is the one thing that must not be believed on sight. It is derived — a pair crosses
when the sign of their gap flips between the rails — and the sharper half of the sentence, that
Finland is the *only* country to pass France, is derived the same way.

## Why this form

A dumbbell of the same data would show sixteen gaps and no crossings; the gap is the same quantity
whichever way the pair sits. **A slope draws the order as well as the levels**, so a swap is visible
as a swap — which is what `100.datavizproject.com`'s viz17 says outright when it compares its own
rank slope to its own value slope: *"choosing rank over value is choosing which change the picture is
about."*

## What the corpus decided

`the-slope-carries-direction-and-the-number-carries-magnitude` — no value axis and no ticks. That is
not a saving; ABC's record states the price in the same breath, and this plate pays it: **without an
axis the plate owes the reader every end value it draws.** So the end labels are load-bearing, and
the placer that opens them to a legible pitch may push a label but may never drop one. It reports the
largest push it made, because a label a long way from its own line has stopped pointing at it, and
that is a judgement for a person.

`each-rail-is-headed-by-what-it-is` — `2000` and `2024` are chips on the rails, not axis ticks.

`the-delta-is-its-own-register-beside-the-values` — the change is a third fact at a third weight: the
levels in the value register, the delta in the annot register.

`colour-belongs-to-the-entity-not-to-the-state` — one colour end to end. The two states are told
apart by position, which leaves the hue free for `accent-marks-the-thread`: the accent goes to the
two lines that cross, and to nothing else.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh. The 2000 and 2024 rows for the sixteen countries are frozen
beside this beat as `data.csv`, duplicated rather than linked, so the beat renders and audits alone.

## The choreography

Six lines, all tilting the same way, and that single direction is the first half of the headline
read at a glance. The second half is one pair of lines meeting just short of the right rail:
Finland, 25,1 points under France in 2000, ends above it. There is no value axis in this form, so
the end labels are load-bearing rather than decorative — every line owes both of its numbers, and
the change is written a third time, at a third weight, in its own column outside the rails. The
rail heads are chips, not ticks.

**The eye enters at** `the field of tilts`. **The claim lands at** `reveal`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the field of tilts` | `the crossing pair` |
| reference | `the end labels` | `the field of tilts` |
| reveal | `the crossing pair` | — |
| conclusion | `the change column` | `the crossing pair` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the field of tilts",
  "stations": [
    {
      "station": "establish",
      "carries": "the field of tilts",
      "subordinateTo": "the crossing pair"
    },
    {
      "station": "reference",
      "carries": "the end labels",
      "subordinateTo": "the field of tilts"
    },
    {
      "station": "reveal",
      "carries": "the crossing pair",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the change column",
      "subordinateTo": "the crossing pair"
    }
  ],
  "claimLands": "reveal"
}
```

## Precision

- **All sixteen rose, and one overtook** — that every one of the sixteen studied countries gained, and that exactly one of the six drawn crossed France, are two searches over the frozen file.
- **Both rails keep the same shared scale** — 2000 and 2024 are placed on one scale across both columns, or a tilt would be an artefact of two rulers.
- **Every line prints both its numbers** — with no value axis the plate owes the reader every end value it draws, so all twelve are printed at their own rails.
- **The de-collision runs once, down the ranking** — `decollide` is called once on the ranking to be read down the page, so each end label takes its own row's placement and a moved label owes a leader.
- **Both levels and the change, per line** — start, end and gain are on the plate at rest for every drawn line, because the crossing only means something against the levels it crossed at.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "all-sixteen-rose-and-one-overtook",
    "both-rails-keep-the-same-shared",
    "every-line-prints-both-its-numbers",
    "the-de-collision-runs-once-down",
    "both-levels-and-the-change-per"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "all-sixteen-rose-and-one-overtook",
    "both-end-columns-keep-the-same": "both-rails-keep-the-same-shared",
    "every-drawn-line-carries-both-its": "every-line-prints-both-its-numbers",
    "the-de-collision-is-decollide-from": "the-de-collision-runs-once-down",
    "asserted-in-the-one-frame": "both-levels-and-the-change-per"
  }
}
```
