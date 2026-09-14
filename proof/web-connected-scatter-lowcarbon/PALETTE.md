---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one. Every number below is measured on what the three
pages **actually paint**, by the same arithmetic the component refuses on — not on this pair.

## One hue, two chromas, and sixteen entities that do not get a colour each

This page draws sixteen countries. The reference this form came from gives each of its three
entities a hue, and the static sibling's own `PALETTE.md` refuses to follow it at sixteen: that would
be a palette this base does not own, and correction 28 requires every colour on a directed plate to
derive from the direction's own three. So identity is carried by **position and by the label**, which
is where it belongs on a scatter, and colour carries only what the headline argues about — the
subject at full accent, the other fifteen in one tint of it. That is
`context-in-neutral-at-the-subject-scale` and `accent-marks-the-thread`, and it is the static plate's
floor kept unchanged.

The subject's ink is the direction's accent taken to the **text** floor and not only to the mark
floor, because the accent sets type on this page as well as marks it: the eyebrow, the word *France*
at the subject's own ring, and the figure each state prints. A direction clearing 3:1 does not
automatically clear 4,5:1, and the two are measured separately.

| direction | ground | subject | vs ground | context tint | vs ground |
| --- | --- | --- | ---: | --- | ---: |
| creme | `#FFFCEE` | `#1755b2` | 6,85:1 | `#7892b5` | 3,10:1 |
| nocturne | `#111044` | `#53e1c1` | 10,93:1 | `#307882` | 3,50:1 |
| rapport | `#FFFFFF` | `#1e5a88` | 7,31:1 | `#7b96a9` | 3,10:1 |

## What this page did NOT spend a colour on, and the reason is the control

The claim has two halves and the second one names **five** countries: the ones that weigh less in
Europe's low-carbon total than they did. A second accent for those five was designed and then
refused, because the control makes it unnecessary: under « En Europe » those five ARE the five
arrows pointing down, and under « Total figé » they are the five that stop pointing down. Direction
carries the set, at no cost in hue, in the two states where the set is the question. Naming them —
they are the five the plate labels — carries it in the other two.

## The two inks are 2,21:1 apart, and that is stated rather than hidden

Measured between the subject's ink and the context tint: **2,21:1 on creme, 2,36:1 on rapport,
3,12:1 on nocturne**. Two of the three are under the non-text floor, which is the honest consequence
of one hue at two chromas on a light ground: both have to clear 3:1 against the SAME ground, and
there is only so much room between them. So colour is **not** asked to be the channel that separates
France from the other fifteen. Three others are:

- the **label** — *France* is written at its own ring, in the accent, at the text floor;
- the **stroke weight** — the subject is drawn at the direction's own `stroke.series` (2,5 on creme,
  1,8 on nocturne) against 1,5 for the context, and its ring is r=4,2 against r=3,2;
- the **length** — in every one of the four states the subject's arrow is either the longest on the
  plate or the one the printed figure is attached to.

This is the same reasoning the static sibling records, and it is why sixteen hues were never the
alternative: on this form identity was already positional.

## The dose a mark takes under the pointer is SOUGHT, and a fixed one would have been wrong

The owner refused a fixed hover dose on an earlier beat at 1,104:1 — a mark answering a pointer with
a change nobody can see. This page walks the dose in twentieths from the mark's **own** ink toward
the direction's ink, keeping the result above the non-text floor against the ground, and retries
toward the ground if the first pole runs out of room. What the walk finds, per direction:

| direction | mark | dose found | lands on | step off its own ink | vs ground |
| --- | --- | ---: | --- | ---: | ---: |
| creme | subject | 0,20 | `#12448e` | 1,328:1 | 9,10:1 |
| creme | context | 0,15 | `#667c9a` | 1,338:1 | 4,15:1 |
| nocturne | subject | **0,55** | `#b2f2e3` | 1,294:1 | 14,14:1 |
| nocturne | context | 0,15 | `#4f8c95` | 1,335:1 | 4,67:1 |
| rapport | subject | 0,20 | `#18486d` | 1,314:1 | 9,60:1 |
| rapport | context | 0,15 | `#698090` | 1,331:1 | 4,12:1 |

**The dose ranges from 0,15 to 0,55 for the same 1,28:1 floor.** Nocturne's accent is a bright mint
on a midnight ground, already 10,93:1 above it, so a fifth of the way toward white buys almost
nothing and it takes more than half. Any single typed fraction is therefore either invisible on one
direction or a repaint on another, which is exactly the defect the arbitration names. The step is
the measured thing; the dose is whatever it took.

## The ring stays hollow, and it is pinned in the stylesheet rather than hoped for

The format's shared sheet paints a pointed mark with `fill: var(--mark-active)`. A hollow ring is
what says *this is the earlier state*, so a pointer filling it in would silently turn the convention
inside out. The beat's own rule pins `[data-aim-ring] { fill: var(--ground) }` at (0,2,0), above the
shared rule's (0,1,0), and gives the ring its answer on the **stroke** instead. The shaft takes the
same value on its stroke for the same reason: a stroked segment has no fill for the shared rule to
paint.

## Nothing else on the page is chromatic

The axis labels, the gridlines, both axis titles and the pill row are steps off the direction's own
ground, computed by `deriveFurniture` at render time and never written here as a literal.
