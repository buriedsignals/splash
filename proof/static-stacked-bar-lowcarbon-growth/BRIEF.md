---
size: landscape
type: stacked-bar
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Spain added more low-carbon electricity than France

**Type:** stacked bar. **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above, which is the statement that counts.

The first `stacked bar` beat in this tree.

## The claim

**Spain added more low-carbon electricity between 2000 and 2024 than France did — 119 TWh against
50 — having started five times lower. France is still, by a distance, the largest producer of it.**

All four parts are asserted: that Spain is the largest adder, that it added more than France, that
France's 2000 level was several times Spain's, and that France still holds the largest 2024 total.
The last is what makes the sentence interesting rather than merely arithmetic.

## What this beat stacks, and why not the obvious thing

`100.datavizproject.com`'s viz23 gives the rule: stack **`[level, growth]`**, not
`[earlier level, later level]`, *"so no segment's number has to be subtracted from another either."*
The reader gets the 2000 level, the increase since, and the 2024 total, and does no arithmetic at
all — which is the whole repair a stack owes.

That choice also decides what the beat cannot draw: a country whose low-carbon generation FELL has a
negative segment, and a stack cannot draw one. The script asserts none did, and says in its own error
message that a negative belongs to a different form — a waterfall, or a diverging bar.

## What the corpus decided

`a-segment-not-starting-at-zero-carries-its-own-number` — Information is Beautiful names the defect:
*a segment that does not start at zero cannot be measured by eye.* So every segment prints its own
number, and a segment too narrow to hold one is a placement problem, never a licence to drop it.
Ireland's 2000 level is 1 TWh against a 583 TWh scale — under a pixel — so such a row prints both its
figures past the bar's end as one run, `7 + 59`, which keeps each segment's number and shows the
addition the stack is asking for. **Twenty-four numbers, none silent.**

`the-stack-gives-back-the-total-it-hides` — the 2024 total is printed past the bar in the value
register, while the segments carry theirs in the annot register. Three facts, three places.

`two-states-of-one-measure-are-one-hue-at-two-chromas` — the two segments are one measure at two
moments, so one hue at two strengths. The key sits over the segments it names, each word in its own
segment's fill, and there is no swatch block.

## The cut

Twelve bars, not sixteen: a bar that must hold its own number is at least the annot register's band
thick, and sixteen missed by half a pixel in two directions of three. The rule is printed on the
plate — the twelve that added most, of sixteen studied, all of which rose.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data. The 2000
and 2024 rows for the sixteen countries are frozen beside this beat as `data.csv`, duplicated rather
than linked, so the beat renders and audits alone.

## The choreography

Bar length is the total, and that is the only free comparison a stack gives, so the eye takes the
lengths first — and immediately meets the thing the headline has to work against: France's bar is
more than twice as long as Spain's. The stack is ordered `[level, growth]` rather than
`[earlier, later]`, so the second segment IS the addition and no number has to be subtracted from
another. The claim is then a comparison between two of those second segments, 119 against 50, and
both are printed. Where a segment is too short to hold its figure the pair is written outside the
bar instead — none is left silent.

**The eye enters at** `the bar lengths`. **The claim lands at** `reveal`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the bar lengths` | `the Spain row` |
| reference | `the France row` | `the Spain row` |
| reveal | `the growth segments` | `the bar lengths` |
| subject | `the Spain row` | — |
| conclusion | `the segment numbers` | `the Spain row` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the bar lengths",
  "stations": [
    {
      "station": "establish",
      "carries": "the bar lengths",
      "subordinateTo": "the Spain row"
    },
    {
      "station": "reference",
      "carries": "the France row",
      "subordinateTo": "the Spain row"
    },
    {
      "station": "reveal",
      "carries": "the growth segments",
      "subordinateTo": "the bar lengths"
    },
    {
      "station": "subject",
      "carries": "the Spain row",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the segment numbers",
      "subordinateTo": "the Spain row"
    }
  ],
  "claimLands": "reveal"
}
```

## Precision

- **119 against 50 is the comparison** — both additions are differences between 2000 and 2024 low-carbon production in the frozen file, and the headline is their order.
- **One zero-based scale for every bar** — all twelve bars start at zero on the same scale, which is what makes the totals comparable at all.
- **Every segment prints its own number** — the two segments sum to the printed total on every row, and a segment that does not start at zero cannot be measured by eye, so none is left unlabelled.
- **All four parts of the claim are asserted** — the largest adder, that it added more than the leader, that the leader started several times higher, and that the leader still holds the largest total.
- **Twelve totals and twenty-four segments** — every figure is at rest in the one frame, because the claim is a comparison of two segments inside two different bars.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "119-against-50-is-the-comparison",
    "one-zero-based-scale-for-every",
    "every-segment-prints-its-own-number",
    "all-four-parts-of-the-claim",
    "twelve-totals-and-twenty-four-segments"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "119-against-50-is-the-comparison",
    "one-zero-based-scale-for-every": "one-zero-based-scale-for-every",
    "shares-sum-to-the-same-asserted": "every-segment-prints-its-own-number",
    "all-four-parts-of-the-claim": "all-four-parts-of-the-claim",
    "asserted-in-the-one-frame": "twelve-totals-and-twenty-four-segments"
  }
}
```
