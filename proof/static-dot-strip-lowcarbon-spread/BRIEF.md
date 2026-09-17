---
size: landscape
type: dot-strip
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Le plancher européen est monté de 30 points, le plafond de 2

**Type:** dot strip (chart). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

The first `dot strip` beat in this tree, and **the first beat drawn from a reference harvested for
it**: the catalogue said the form had no evidence, so the evidence was fetched before the plate was
drawn.

## What a strip does that this tree's other paired forms do not

The lollipop draws two levels from zero, the connected scatter draws two variables at once, the slope
draws two rails. None of them lets a reader see a **distribution move**. A strip draws one axis and
puts every unit on it, so what is read is the **shape of the field** — where it starts, where it
ends, where it bunches.

The claim is that shape.

## The claim

**Between 2000 and 2024 the floor of Europe's low-carbon share rose 30 points and the ceiling rose
2.** The most fossil country goes from 1.6 % to 31.1 % — Poland — while the cleanest goes from
96.7 % to 98.8 %. The spread between them closes by 27.4 points, and the median moves from 27.5 % to
70.6 %.

The plate refuses to render if the floor did not rise far while the ceiling barely moved, if the
spread did not close by more than a fifth, or if the subject is not the country that actually was the
floor in 2000.

## What the reference gave

Harvested for this beat: **Ferdio's #85**, read at its own 823 x 823 chart card — the one record in
that archive where the pixel route reached the encoding rather than the site's wordmark.

- **The strip is a ruled axis, not a bare line.** Ticks cut into a light band, numbers under it. A
  position converts to a number without a field of gridlines behind the marks, which is the whole
  reason to spend a strip rather than a scatter.
- **The mark is a pin with its name in a chip on top.** The chip makes a mark findable; the **stem**
  keeps it honest, because a chip is wider than the value it stands for and would otherwise blur the
  reading by its own width. Identity is on the mark and there is no legend.
- **Time reads downward**, and the two date labels are the only thing that says so.
- **The change rides on the leader** — and here the rule meets its limit, below.

`colour-belongs-to-the-entity-not-to-the-state` — nothing about a mark's colour changes between the
two strips. `PALETTE.md` records why the reference's per-entity hues cannot be taken at sixteen
entities and what survives of the rule.

## Where the reference's rule stops, measured

At three entities the reference labels every leader and each number plainly belongs to the one line
under it. **At sixteen the leaders cross, and a number floating in the corridor belongs to whichever
line the reader guesses.** The first render wrote eleven of them and not one could be traced to its
country.

So the rule is kept for the mark it can serve — the subject's, on its own accented leader — and
refused for the other fifteen, where the leaders themselves carry the movement. The ladder prints
that refusal rather than leaving the plate to look under-labelled.

## Two guarantees the reference's own record asked for

Its `What was not verified` ends: *"whether the two strips share one scale … a reader who assumed it
on a plate where it was false would be misled. A beat drawing this form owes the guarantee
explicitly."* **Both strips are built from one scale object, the plate prints that they are, and the
component throws if the furniture of one ever overlaps the other's.**

And **chips stack into rows, never sideways.** A strip's whole promise is that position is value;
where two chips would touch, the later one goes up a row and its stem grows. Nothing ever moves along
the axis.

## Two defects the guards caught on the way

The leaders were begun at the upper rail and ran **straight through its own `20` and `60`** — a
leader crossing the axis it leaves is the plate cutting its own scale. They now start below the
number row. And the three-letter codes were crossed by their stems, which turns a three-letter code
into a two-letter one; each is haloed in its own chip's fill. Both were found by the guard added in
correction 55, on the delivered plate.

## Source

Ember / Energy Institute – Statistical Review of World Energy (2025), via Our World in Data, frozen
beside this beat as `data.csv` — a duplicate of the file
`proof/static-stacked-bar-lowcarbon-growth` carries, copied rather than linked.

## The choreography

Two lanes, the same scale twice, and the reading is the change in SHAPE between them: in 2000 the
pins crowd the left half and thin out towards 100; in 2024 the crowd has moved right and the left
half is empty. The accent is spent once, on Poland, which is the floor in both lanes — its
leader is the only drawn line that carries a number, +30. The ceiling's own move is not labelled:
Sweden's two pins sit two points apart at the right edge, and the second half of the headline is
read off them against the accented leader. That asymmetry is the beat's editorial choice, not an
oversight.

**The eye enters at** `the two lanes`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the two lanes` | `the Poland leader` |
| reference | `the shared scale` | `the two lanes` |
| reveal | `the ceiling pins` | `the Poland leader` |
| subject | `the Poland leader` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the two lanes",
  "stations": [
    {
      "station": "establish",
      "carries": "the two lanes",
      "subordinateTo": "the Poland leader"
    },
    {
      "station": "reference",
      "carries": "the shared scale",
      "subordinateTo": "the two lanes"
    },
    {
      "station": "reveal",
      "carries": "the ceiling pins",
      "subordinateTo": "the Poland leader"
    },
    {
      "station": "subject",
      "carries": "the Poland leader",
      "subordinateTo": null
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **The thirty points are a difference** — Poland's 2000 and 2024 shares are read off the frozen file and the +30 on the leader is their difference, rounded once.
- **One scale, 0 to 100, both lanes** — the two lanes carry the same scale over the same domain, because a distribution that moved is only readable when the ruler did not.
- **The plate refuses a crowded lane** — if the labels in either lane cannot be seated without collision at the chosen size, the beat throws rather than overlap two codes.
- **Floor, ceiling and spread all asserted** — the lowest, the highest and the distance between them are computed per lane, and the 27,4-point closing is their difference.
- **Two lanes, one frame, one instant** — before and after are on the plate at once; a reader compares two shapes rather than remembering one.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-thirty-points-are-a-difference",
    "one-scale-0-to-100-both",
    "the-plate-refuses-a-crowded-lane",
    "floor-ceiling-and-spread-all-asserted",
    "two-lanes-one-frame-one-instant"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-thirty-points-are-a-difference",
    "one-scale-for-both-lanes-over": "one-scale-0-to-100-both",
    "the-plate-refuses-to-render-if": "the-plate-refuses-a-crowded-lane",
    "the-floor-the-ceiling-the-spread": "floor-ceiling-and-spread-all-asserted",
    "asserted-in-the-one-frame": "two-lanes-one-frame-one-instant"
  }
}
```
