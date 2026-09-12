# name-each-half-in-words

- kind: imported
- name: Each half of a mirrored beat is named in words, on its own half, never by a swatch key
- applies: the beat draws two mirrored halves over two or more bands
- draws: annot
- priority: 5
- evidence: populationpyramid-net-world-2023
- evidence: ourworldindata-org-global-population-pyramid
- evidence: ons-gov-uk-visualisations-dvc550-pyramids-pyramids-index-html
- detect: a text run naming each half lies inside or immediately at the head or foot of its own
  half's plot area, and no swatch-and-label key appears anywhere on the plate

## The rule

Name the two halves in words, on their own halves. Do not key them with swatches.

## The evidence

- **PopulationPyramid.net** — `Male` / `Female`, `sans-serif | 16 | 400`, twice, at the head of each
  half.
- **Our World in Data** — `Men` / `Women` at display size at the foot of each half, across nine
  series, **with no legend anywhere on the plate**.
- **ONS** — `Male` / `Female`, `Open Sans | 15 | 600`, twice per panel on `dvc550-pyramids`; and on `dvc775-fig13`,
  `Males` / `Females` at `Open Sans | 12 | 500`, set small and grey *inside* the plate beside the
  gutter. One publication, two treatments of the same decision.

**Three publications, not four.** The harvest that proposed this counted four RECORDS; two of them
are ONS. Independence is read off the host, and the floor counts publications
(`METHOD.md`, correction 4). Three still clears it.

**Against: one.** PopulationPyramids.org uses a swatch legend above the plate — and is the one
record in the family whose halves have no other identification at all, which is the argument rather
than a counter-example to it.

## Why it is more than a preference

Colour distinguishes the halves; it does not have to **identify** them, because the mirrored
position already does. A swatch spends a mark saying what the word beside it already says, and it
spends it in the header band, where a beat has least room.

## What limits it

**It says nothing about which words.** `Male`/`Female`, `Men`/`Women`, `Males`/`Females` are all in
the corpus; the beat's own copy decides, and this treatment only decides where they go.

**And a beat with more than two halves is not this.** Our World in Data draws nine series and still
names two halves, because the mirror has two sides however many series ride on it. A beat that
mirrors three things is a different form and this rule does not reach it.
