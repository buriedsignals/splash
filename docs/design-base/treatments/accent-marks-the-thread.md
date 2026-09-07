# accent-marks-the-thread

- name: The accent marks the argument's thread, never the largest value
- applies: always, wherever an accent is assigned
- draws: value, annot
- priority: 9
- evidence: informationisbeautiful-net-visualizations-billions-2
- evidence: 100-datavizproject-com-data-type-viz57
- detect: the accented marks are the ones the beat's own subject names; an accent sitting on the
  series maximum when the named subject is something else is a failure

## The rule

The one saturated colour on the canvas goes to what the story is about. Not to the biggest bar, not
to the most recent value, not to the outlier — to the subject the journalist named.

## Why it is more than a nicety

This is `visual-system.md`'s own rule, and this repository has shipped its violation before: a chart
that colour-highlighted its statistical maximum instead of the subject. The failure is invisible
when the two coincide and silently misdirects the reader when they do not, which is exactly when the
story is most interesting.

## Where it was seen

*$$$Billions* (Information is Beautiful) leaves its largest cells — Africa's foreign debt at $708bn,
Amazon revenue at $717bn — in the field blue, and spends its orange on the Iran War at $129bn and on
the fossil-fuel revenue that war produced. The accent follows the **argument**, and the reader
follows the accent to find it. `viz57` (Ferdio) assigns by role rather than magnitude in a different
way: grey for the past, hue for the present, regardless of which is larger.

## What limits it

Nothing limits it; it is a floor rather than an option. It is filed as a treatment because it needs
a `detect` that reads the delivered artifact against the beat's own named subject, which no existing
guard does.
