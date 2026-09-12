# a-segment-not-starting-at-zero-carries-its-own-number

- kind: imported
- name: Every segment of a stack prints its own value inside itself
- applies: the beat draws bars of two or more segments
- draws: value
- priority: 9
- evidence: informationisbeautiful-net-visualizations-how-much-do-music-artists-ea
- evidence: 100-datavizproject-com-data-type-viz24
- detect: the delivered plate carries one value run per segment, inside the segment

## The rule

Only the first segment of a stack starts at zero. Every other one has to be measured from wherever
its neighbour left off, and nobody can do that by eye. So each segment prints its own number.

## The evidence, and it names the defect itself

Information is Beautiful: *"each segment carries its own percentage, inside itself. The stacked bar's
known weakness — **a segment that does not start at zero cannot be measured by eye** — is repaired
rather than ignored."*

`100.datavizproject.com` does it on both of its stacks. viz24: *"every segment carries its own share,
inside itself"*, and the plate then needs *"no axis, no gridlines, no percent scale under the bars"*.
viz1: the value sits in white inside the segment, so *"no axis reading is required to know that
Sweden went 13 → 15"*.

## Why it is filed apart from `value-on-the-mark`

On a bar chart, printing the value is a convenience — the bar starts at zero and the axis already
works. On a stack it is **the repair for the one thing the geometry gets wrong**, and that reason
travels: it is what tells a beat that a segment too small to hold its number is a real problem rather
than a cosmetic one, and that the answer is to move the number out on a leader, never to drop it.

## The contrast floor is on the segment, not on the page

A number inside a segment is measured against that segment's own fill, and one stack's fills run from
pale to full. `adjustToContrast(ink, segmentFill, TEXT_CONTRAST_MIN)` per segment — the calendar
heatmap's ramp lesson, met again where the ramp is only two steps long.
