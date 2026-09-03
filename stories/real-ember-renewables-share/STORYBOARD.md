---
takeaway: "In 2023 renewables supplied 30.3% of the world's electricity, but that single figure is nobody's experience: of the 211 countries and territories reporting that year, 8 ran entirely on renewables and 15 used none at all."
claimShape: none
grounding: unverifiable
reference: "The New York Times, The Upshot — 'Extensive Data Shows Punishing Reach of Racism for Black Boys' (19 March 2018), the piece's own social-preview graphic — individual dot-marks, one per case, keep the honest texture of exceptions while the finding is stated outright as a sentence set on the graphic. Applied here: the world's 30.3% is written on the frame as the rule; the 211 country dots are the exceptions, and every one of them stays individually locatable."
subject: "every country that reported a renewable share of electricity for 2023 — one dot each, on one shared 0-100% scale"
comparison: "each country against the world's own 30.3% and against every other country: 8 at 100%, 15 at 0%, and the world's figure sitting ABOVE the median country (26.5%), because the world figure is weighted by how much electricity each country generates and a country dot is not"
limits: "2023, not the file's last year. 2025 is in the file but only 91 of 214 countries report it and 2024 only 196 — a latest-year ranking would silently drop more than half the world. Seven regional aggregates in this file are published by two or three bodies at once and six of them disagree (Oceania is the one that does not, to the last digit): Europe 2023 reads 46.6% (Energy Institute), 40.0% (Our World in Data's own aggregate) and 39.7% (Ember). No regional aggregate is drawn for that reason, and the disagreement is printed on the frame. The share is of electricity only, not of all energy, and it is a share of generation, not of consumption — a country that imports most of its power is measured on what it generates. Countries carrying no 2023 row are absent, not zero."
placement: "under the paragraph that gives the world figure, before the grid-investment section — the reader meets the one number, then finds their own country against it"
credit: "Source: Ember (2026) and other sources, with major processing by Our World in Data"
effectiveDate: "2026-08-22"
language: en
slots:
  - id: 1
    proves: "that the world's single renewable-share figure describes almost nobody, and that where a reader's own country sits is not predictable from it"
    medium: chart
    format: web
    reachable: yes
    candidates: ["Dot strip", "Histogram", "Lollipop"]
    intent: unrecorded
    rankingWalk: unrecorded
    chosen: "Dot strip"
---

## What the visual shows

One horizontal lane holding 211 dots, one per country or territory that reported a renewable share
of electricity in 2023, each placed by its own value on a single 0-100% axis running the full width of
the frame. A vertical rule marks the world's 30.3%. Countries are not labelled on the face — at 211
marks no frame can carry 211 words — so the web format carries what the static frame would have had
to omit: hovering, tapping or tabbing to any dot names that country and prints its exact share, and
a search box moves focus straight to a named country and holds it lit.

The extremes are labelled directly, because they are the argument: the eight countries at exactly
100% and the fifteen at exactly 0% are the visible proof that one world average covers a range with
no middle to speak of.

## Why a dot strip and not a histogram or a ranking

All three were offered.

A **histogram** ranks first in this toolchain's own guide for "show the shape of a continuous
distribution", and it would draw the shape more cleanly than 211 overlapping dots. It was rejected
on the journalist's own requirement: a histogram bins its observations away, so a reader cannot find
their own country in it. The desk asked for something a reader moves through and finds themselves
in; a bin count cannot answer "where is mine".

A **lollipop ranking** of the top and bottom twenty would name countries directly and read
instantly, and it drops 171 of them. The claim this beat makes is about the whole spread, so a form
that draws only its ends would make the claim unreadable from the picture that carries it.

A **beeswarm** was considered and not offered: its own sheet refuses more than roughly 150 marks,
and this is 211.

The dot strip's own sheet warns that a single summary value per category belongs to a bar, not a
dot. That warning is about one dot per lane. Here the lane is the world and the observations are its
211 countries, which is the shape the sheet actually asks for.

## The regional disagreement, and why nothing regional is drawn

The desk asked that this be said on the graphic rather than settled quietly. It is in the file, and
it is larger than the desk expected. Seven subjects are published under more than one reporting body. Six of them disagree; one does
not. All values are 2023; an empty cell means that body publishes no series for that subject.

| subject | Energy Institute | Our World in Data | Ember | widest gap, any year |
| --- | ---: | ---: | ---: | --- |
| Europe | 46.64% | 40.04% | 39.74% | 7.45pp (2024) |
| North America | 26.50% | 27.94% | 28.28% | 1.78pp (2023) |
| Asia | | 25.12% | 26.76% | 1.76pp |
| Africa | 24.94% | 24.51% | 24.51% | 1.24pp (2025) |
| Middle East | 4.63% | | 4.72% | 0.92pp (2002) |
| OECD | 32.80% | | 33.64% | 0.84pp (2023) |
| Oceania | | 41.65% | 41.65% | 0.00pp |

Europe's three numbers differ by more than six percentage points in 2023 and by 7.45 in 2024, which is larger than the whole
2015-2023 rise in the world figure. There is no basis in this file for choosing among them, so the
beat draws no regional aggregate at all and prints the Europe case on its own face. The world line
it does draw is the one aggregate this file publishes only once.

## The years that are in the file and not in the beat

The file runs 1900-2025 and the article repeats that range. Before 1985 it holds exactly two
entities, the United Kingdom and the World, and the United Kingdom's own series starts in 1920, so
1900-1919 is one line: the World. 2025 is present for 91 countries of 214 and 2024 for 196. 2023 is
the last year with near-complete country coverage and is what this beat draws. The world's own
series is also not a rising line over its full length — it read 41.2% in 1900, when almost all
electricity was hydro, fell for most of the twentieth century, and is at 33.8% in 2025, still below
where it started. Nothing in this beat claims a record.
