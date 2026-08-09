# Information architecture

Where `editorial-standard.md` says what a layer is *for* and `visual-system.md` says what it is
allowed to *look like*, this file says how the layers of a single graphic are *arranged* — the
spatial and sequential structure a reader moves through before they ever reach the data itself.
This governs the static work happening in this sub-project directly: `chart-beat`'s static genre
has no scroll, no reveal, no narrator — a reader gets one frame, and the frame's own structure is
the only guide they get.

## A graphic has a reading order, whether or not anyone designed one

A reader does not scan a static graphic like a table of contents — they land somewhere, and where
they land first is not the title by default. Absent a deliberate structure, the largest or
highest-contrast element wins the first glance, whatever it happens to be. Information
architecture is the discipline of making sure the element that wins that first glance is the one
that should: the headline number, the subject's accent colour, the one line the confirmed takeaway
promised. A graphic with no designed reading order does not become neutral — it becomes whichever
element is loudest by accident.

## The stack, top to bottom

A static graphic in this system is built as a fixed vertical stack, each zone doing one job, in
one order:

1. **Title.** States the finding, not the topic — "Renewables overtook coal in 2019," not "Energy
   sources 2015–2023." A reader who reads only the title should already have the confirmed
   takeaway, not a promise that one is coming.
2. **Subtitle (optional).** Carries the one piece of framing the title had no room for — a unit, a
   scope, a comparison basis, **or the limit the framing exchange already extracted** (
   `twin-storyboard`'s "what does this data NOT let you conclude" question — see
   `anti-patterns.md`'s "a title that claims more than the source supports"). That answer is
   captured whether or not a graphic ends up using it; when the confirmed takeaway makes a claim
   the raw data cannot support without its caveat stated, the subtitle is where that caveat is read
   before the reader forms the claim on their own, not an aside for after. A subtitle spent on the
   source credit instead, with the limit dropped, has answered a question the reader was not
   asking and left unanswered the one the title's own claim requires — the source has its own zone
   (item 5) and does not need the subtitle's as well. It exists only when the title cannot carry
   its framing or its limit alone; an empty subtitle zone is not held open out of habit.
3. **Plot area.** The marks themselves, laid out per `visual-system.md`'s colour and label rules.
   This zone gets the largest share of the frame, because it is the only zone doing job (1) from
   `editorial-standard.md` — encoding data — and every other zone exists to support it.
4. **Direct annotation and labels**, layered on or immediately beside the marks they describe —
   never detached into their own zone unless `visual-system.md`'s legend-as-fallback condition is
   met.
5. **Source line.** Small, but never so small it fails the "support verification" job — see
   `anti-patterns.md`'s "tiny footer sources" entry. This file's *default* position is fixed at
   the bottom, in the same position across every graphic a newsroom ships, so a reader who has
   learned where to look once never has to search for it again — but see "When a genre-scoped
   file disagrees with this stack" below: a specific engine and format is allowed to place it
   elsewhere, and where one does, that placement wins over this default.

This is not an aesthetic preference for a particular stacking order — it is the same order a
reader's eye actually travels in a script that reads top-to-bottom, and a graphic that fights that
order is spending part of its reader's attention on navigation instead of on the evidence.

## When a genre-scoped file disagrees with this stack

This file states the *general* stack: the default zones and their default order, for a reader who
has not yet learned any engine's specific habits. A **genre-scoped discipline file** — one written
for a single engine and a single format, such as `twin-chart-beat/references/static-discipline.md`
for the static chart genre — is allowed to override a zone's default position when its own render
actually places it differently, because it sits closer to the real pixels than this file does.

**Where the two disagree, the genre-scoped file wins.**

**The worked example this section used to carry no longer exists, and that is worth recording
rather than quietly replacing.** Until 2026-08-10 the live example was the source line: this file's
default (item 5 above) fixes it at the bottom, and `static-discipline.md` placed it directly
beneath the title for a static chart beat. The owner's feedback reversed the genre-scoped file
(*"put the credits at the bottom of the visual"*), so `static-discipline.md` now says
`height - PAD` too — and **the default is what won.** Not because the override mechanism failed:
because the genre-scoped file had been describing what its component happened to draw rather than
what the format needed, which is the one way an override can be wrong.

**As of 2026-08-10 no genre-scoped file overrides any zone in this stack.** The mechanism below
stands unexercised, and it is still correct and still needed — a file that sits closer to the real
pixels than this one does should be able to say so. A beat author who stops at this file's default
without checking their engine's genre-scoped file still has not read the authoritative answer for
their own format; today the two simply agree.

If a genre-scoped file is silent on a zone — true for most zones, most of the time — this file's
default stands unchallenged. The override is narrow: it reaches only the zone the genre-scoped
file actually speaks to, not licence to reorder the rest of the stack.

## Proximity encodes relatedness

Two elements placed close together read as related; two elements placed far apart read as
unrelated, regardless of whether that is true. This is the single most common wordless mistake in
a hand-built layout: an annotation drawn nearer to the wrong series, a legend swatch separated
from its line by enough whitespace that the reader has to hunt for the pairing. Every element that
depends on another element for its meaning — a label and its mark, a footnote and the number it
qualifies — is placed touching or immediately adjacent to it. If two elements must be far apart for
layout reasons, an explicit connector (a leader line, a matched colour) does the pairing job that
proximity would otherwise have done for free.

## Alignment is the grid the reader never sees

Every zone in the stack shares the same left edge, the same right edge, and the plot area's own
internal grid (gridlines, tick marks, axis) is the one visible ruler everything else is silently
measured against. A title that starts three pixels left of the axis it sits above, a source line
centred while everything above it is left-aligned — these register as "slightly wrong" even to a
reader who could not say why, because alignment is read peripherally, not consciously. A shared
grid is what makes a graphic look authored rather than assembled.

## One graphic, one idea, one density

A static frame has no scroll and no interaction to spread its content over time — everything a
reader will ever see of it, they see in the first second. That means density is not "how much
data can fit," it is "how much of the confirmed takeaway survives a single glance." A chart
carrying every dimension the underlying dataset offers, because all of it was available, is
answering a question the journalist did not ask. The information-architecture question for every
candidate element is the same one `editorial-standard.md` asks of every visual layer: does this
serve the one idea the takeaway named, or is it here because the data had it. A static graphic
that tries to be two charts' worth of argument in one frame usually manages neither.

## How this is used

A production skill drafting a static beat reads this file alongside `editorial-standard.md` and
`visual-system.md` before laying out a single component — the stack order, the alignment grid and
the proximity rules are decided before the first mark is placed, not adjusted afterward once
something looks crowded. `anti-patterns.md`'s "detached legends," "repeated years or values" and
"tiny footer sources" entries are, from this file's point of view, information-architecture
failures specifically: proximity, density and the fixed source position, each broken.
