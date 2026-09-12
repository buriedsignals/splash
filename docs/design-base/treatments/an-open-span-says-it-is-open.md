# an-open-span-says-it-is-open

- kind: imported
- name: A span still running is notated as open, not drawn to an end it does not have
- applies: the beat draws two or more spans and at least one of them is still running
- draws: annot, axis
- priority: 7
- evidence: threestory-com-scotus
- evidence: abc-net-au-news-2018-08-23-malcolm-turnbull-leadership-spills-chart-10
- detect: every still-running span in the delivered artifact ends at the axis's own present edge, or
  carries a trailing dash in its label, or both

## The rule

Do not draw a span to a closing date it does not have.

## Two publications, two answers

Threestory aligns every open end at the present and lets the shared edge carry the meaning — the
record's own words: *"no arrow, no 'present', no legend entry."* ABC writes the missing end date as a
trailing dash and nothing else: *"a missing end date, written as a trailing dash, is the whole
notation for still running."*

Different mechanisms, one refusal: a bar that stops at an invented end is a claim about something
that has not happened, and on a date axis that is not a rounding.

## What the two answers cost

Threestory's shared edge is free but silent: it works only where the axis visibly ends AT the
present, and a reader who does not notice the alignment reads a coincidence. ABC's dash is explicit
and costs a character. A plate can do both, which is what the beat this was filed from does.
