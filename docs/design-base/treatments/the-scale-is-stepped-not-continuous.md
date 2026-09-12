# the-scale-is-stepped-not-continuous

- kind: imported
- name: A grid's scale is a set of classes with edges, not a gradient
- applies: the beat draws twenty or more cells and declares three or more classes
- draws: value, axis
- priority: 7
- evidence: informationisbeautiful-net-visualizations-most-common-pin-codes
- evidence: projects-propublica-org-graphics-workers-comp-reform-by-state
- detect: the delivered key is drawn as separate swatches with visible edges

## The rule

Bin the ramp. A reader can name a class; nobody can name a point on a gradient.

## The evidence

ProPublica paints **seventeen distinct fills** rather than a gradient — eleven on the red side, one
pale-yellow midpoint at `rgb(255, 255, 224)`, five on the green — and that record states the
argument: *"a stepped scale gives the reader classes to name; a continuous ramp gives them only
'more' and 'less'."*

Information is Beautiful's pin-code key is *"drawn as separate swatches with visible edges"*. (The
number of steps was not counted in that record and is not asserted here.)

## Why it is filed separately from the key rule

`the-key-prints-its-breaks-in-the-data-s-units` prints the break values. This one is the step before
it: **there are no breaks to print until the scale has some.** A beat that bins and then prints its
edges satisfies both; a beat that draws a gradient bar cannot satisfy either.
