# raw-under-smoothed

- kind: derived
- name: Faint per-reading dots under a bold centred mean
- applies: the series is long and its year-to-year variation is large enough to obscure its shape
- draws: value
- priority: 4
- detect: the delivered artifact carries one small mark per reading at reduced opacity AND a path
  with fewer points than the reading count, both in the accent
- provenBy: proof/co2-suisse/renders/*.png

## The rule

Plot every reading as a faint dot and draw a centred moving mean over them, both in the accent —
the raw at a tint, the mean at full weight.

## Why it needs no published precedent

The smoothed series is computed from the beat's own readings. Nothing is imported; what is added is
a second resolution of the same measurement.

## What it does

**The noise stays honest and the shape still reads.** Smoothing alone hides how variable the years
are; the raw series alone leaves the multi-decade movement to the reader's eye. Both together give
each its own job.

**Raw and smoothed are one accent at two weights**, never two hues: they are the same measurement at
two resolutions, and a second accent would say they were different things.

## Seen in the wild, though not required

ABC's *How Buddy Franklin scaled footy's Everest* draws exactly this — faint annual dots under a
bold five-year mean, the raw as a tint of the one accent. It is a first publication and the record
is filed; a second has not been found. Under the recadrage this treatment does not need one, and the
ABC reference stands as corroboration rather than as licence.

## What limits it

The window is a choice the beat must state, and a mean is undefined at both ends: the smoothed path
must stop where its window stops rather than being extended to the data's edge.
