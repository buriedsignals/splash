---
size: landscape
type: pictogram
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Europe's electricity sits at the two ends

**Type:** pictogram (unit grid). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above, which is the statement that counts.

The first `pictogram` beat in this tree.

## The claim

**One square, one country. Of the forty European countries that report 2024 generation, sixteen are
above 75 % low-carbon and eighteen are below 60 % — six are in between.**

"Polarised" is exactly the kind of word a picture invites and a count settles, so the plate does not
use it: it prints the three counts and lets the reader check them by counting squares. The assertion
is that the middle holds under a quarter of the field; the ends are then whatever is left, and the
script checks the three blocks account for every country.

## Why this form and not a histogram of three bars

ABC's record states the choice and its cost: *"the obvious chart here is eighteen bars. This draws
every player instead, so the reader sees the **population** … rather than eighteen totals."* A
histogram of three bars gives the three counts and nothing else. Forty squares give the counts, the
shape of the distribution inside each block — the ramp runs across the field — and the ability to
check the newsroom's arithmetic by counting.

## The unit has to be a real thing

One square is one country. A square standing for `10.4 TWh` would be a length in disguise, and the
fractional last square would be the tell. That is the test
`a-quantity-is-made-countable-by-drawing-its-units` sets, and it is why this beat counts countries
rather than terawatt-hours.

`a-countable-field-is-paired-with-its-own-figure` — each block prints its own count, **in units**,
beside the field it counts. Ferdio: a delta on a countable rail is stated in units, not percent,
because *"a field of things is counted in things"*.

## The floor

A square a reader is asked to count owes 13px. Under that a unit field is a bar chart made of
squares, and the component refuses rather than shipping one. The row width is a rung of the ladder —
twenty, sixteen, thirteen, ten or eight per row, widest first, because a wider row is fewer rows and
fewer rows is more size per square.

## The absence

Ukraine has a shape in the sibling map beat and no 2024 data here. It is **not drawn** — a unit grid
counts things, and a square for a country with no reading would be counted. The key says one country
is missing rather than letting the field imply forty-one.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data. The 41
European entities' 2024 rows are frozen beside this beat as `data.csv`, duplicated rather than
linked.

## The choreography

Three blocks, and their relative lengths are the whole shape of the claim: a long one, a very
short one, and another long one. The counts are printed in COUNTRIES beside each block, because a
field of things is counted in things — a percentage here would undo the reason for drawing squares
at all. Inside each block the squares carry the class ramp, so the reader sees that the top block
is not uniform and the bottom one runs all the way down to the palest step. The middle block is
six squares long and can be counted by eye, which is exactly what the headline asks a reader to
do. The key says what is missing: one country has no 2024 reading and is not drawn.

**The eye enters at** `the three blocks`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the three blocks` | `the middle block` |
| reference | `the block counts` | `the three blocks` |
| reveal | `the class ramp` | `the three blocks` |
| subject | `the middle block` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the three blocks",
  "stations": [
    {
      "station": "establish",
      "carries": "the three blocks",
      "subordinateTo": "the middle block"
    },
    {
      "station": "reference",
      "carries": "the block counts",
      "subordinateTo": "the three blocks"
    },
    {
      "station": "reveal",
      "carries": "the class ramp",
      "subordinateTo": "the three blocks"
    },
    {
      "station": "subject",
      "carries": "the middle block",
      "subordinateTo": null
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **Six in the middle, countable** — 16, 6 and 18 are counted from the frozen file, and the middle block is drawn at exactly the count it states so a reader can check it square by square.
- **One square is always one country** — the unit never changes across the three blocks; a square is one country whatever class it carries.
- **The three blocks account for all forty** — the blocks are asserted to cover every country in the set, and the one country without a 2024 reading is named in the key rather than absorbed.
- **The row width is a rung, widest first** — the row length is chosen off a ladder, widest first because a wider row is fewer rows and fewer rows is more size per square, and the floor is never lowered.
- **All three counts stand together** — the middle block only means "seulement" against the two beside it, so all three are in the one frame at the same size.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "six-in-the-middle-countable",
    "one-square-is-always-one-country",
    "the-three-blocks-account-for-all",
    "the-row-width-is-a-rung",
    "all-three-counts-stand-together"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "six-in-the-middle-countable",
    "one-icon-always-equals-the-same": "one-square-is-always-one-country",
    "the-blocks-are-asserted-to-account": "the-three-blocks-account-for-all",
    "the-row-width-is-a-rung": "the-row-width-is-a-rung",
    "asserted-in-the-one-frame": "all-three-counts-stand-together"
  }
}
```
