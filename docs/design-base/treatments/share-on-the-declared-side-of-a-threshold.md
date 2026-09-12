# share-on-the-declared-side-of-a-threshold

- kind: derived
- name: The share of the readings on the side of the threshold the beat is about is drawn and stated
- applies: the beat declares a threshold over a set of readings it carries
- draws: annot, value
- priority: 8
- detect: the delivered artifact carries a mark at the threshold's coordinate and a text run within
  one line-height of it stating the count or share of readings on the declared side
- provenBy: proof/static-carbon-footprint-spread/renders/*.png

## The rule

Where a beat's copy rests on a share, draw the line that share is measured from and state it.

## Why it needs no published precedent

The third treatment found this way, and the pattern is now hard to miss: render a beat through the
design base and look at what the plate does not say.

This beat's title asserts **six in ten countries emit under 4 tonnes**. Its `BRIEF.md` states the
number behind it — *127 of 213 countries (60%)* — and its plate drew a median at 3.1 tonnes and
neither the four-tonne line nor the sixty per cent. The reader is told a proportion in words and
shown a distribution that does not mark where the proportion is cut.

Both halves are in the beat's own numbers. There is nothing here for a second publication to
corroborate.

## What the beat supplies and what the treatment derives

**The threshold is declared, exactly as `crossing-marked`'s reference level is.** A distribution has
no natural cut; four tonnes is an editorial judgement about what counts as low, and a renderer that
picked its own would be asserting one. The beat states it and the treatment draws it.

**The share is arithmetic.** Count the readings below the declared level, divide by the readings the
beat carries. On this beat that is 127 of 213, and it is computed from the same array the bins were
counted from, so the number in the annotation and the heights of the bars cannot disagree.

## What limits it

**It states one side, because the beat is about one side.** A beat whose story is the tail rather
than the body declares the same threshold and wants the complement; the copy decides which, and this
treatment draws whichever the beat names.

**And a threshold that falls inside a bin is a threshold the bars cannot show.** Here it sits exactly
on a bin edge, so the rule lands on a boundary. Where it does not, the rule is still true and the
bars still cannot be read against it — that is a fact about binning, and the annotation is then the
only place the share exists.
