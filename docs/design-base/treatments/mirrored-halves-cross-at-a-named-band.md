# mirrored-halves-cross-at-a-named-band

- kind: derived
- name: The band where a mirrored beat's two halves change places is drawn and named
- applies: the beat's two mirrored halves change which of them is larger, somewhere up the scale
- draws: annot
- priority: 8
- detect: the delivered artifact carries a mark at the crossing band's own row and a text run within
  one line-height of it naming that band
- provenBy: proof/static-swiss-age-pyramid/renders/*.png

## The rule

Where the two halves change places, draw the band and name it.

## Why it needs no published precedent

The same reason `crossing-marked` and `net-change-between-declared-levels` need none, and it was
found the same way: by rendering the beat through the design base and looking at what the plate did
not say.

A population pyramid's whole shape is two halves trading places somewhere up the age scale. Measured
on this beat: men outnumber women in every band up to `55-59`, women in every band from `60-64`
upward — nine consecutive bands, no oscillation. The plate shows it, in the sense that the silhouette
visibly changes hand around the middle. It does not say it. The reader is asked to find the exact
band by eye, across a centre gutter, on two bars that differ by **841 people out of 585 263** at the
crossing — about a third of a pixel at this frame.

No reference in the family names it. PopulationPyramid.net, Our World in Data, ONS, Statistics Canada
and PopulationPyramids.org all draw the crossing and none of them marks it, so there is nothing to
import. This is not a practice observed elsewhere; it is a fact the beat contains and does not show.

## What limits it

**A shape that oscillates has no crossing.** The predicate takes the FIRST band whose larger half is
not the one that was larger at the foot, which is the reading a demographic pyramid supports because
mortality is monotone in age. A beat whose halves trade places repeatedly has several crossings and
this treatment would name only the first — for that shape it should not fire, and the `applies`
predicate should be tightened before it is used there.

**And it says nothing about why.** The band is where the two halves cross; the reason is
differential mortality, which is the beat's copy to write, not this treatment's to assert.
