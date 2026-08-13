# The motion grammar

Where `visual-system.md` says what a layer is allowed to look like, this file says what it is
allowed to **do over time**. It governs the video format only — a beat whose output is frames, not
a single still. Everything in `editorial-standard.md`, `information-architecture.md` and
`visual-system.md` still applies to every frame; a rule broken at frame 143 is broken.

Motion adds exactly one thing to a chart: an **order**. A still hands the reader every layer at
once and lets them choose a reading order. A video chooses the order for them. That is the whole
power and the whole danger, and every rule below is a consequence of it.

## Data arriving is the motion event

The only thing that earns an animation is **evidence appearing**. The line drawing itself, a point
landing, a reference level being laid down — those are the events. The ground does not move, the
title does not slide, the axis does not fly in from the left, the frame does not zoom. If a layer
moves and no new evidence arrived with it, that motion is `anti-patterns.md`'s "decoration that
encodes nothing" with a time axis.

Corollary: **do not animate every layer at once.** A build in which the axis fades, the line draws,
the label rises and the annotation scales in the same window is not a build — it is one event
wearing four costumes. At any moment, one thing should be arriving.

## The order is chronological, or it is argumentative

A reveal follows either the data's own order (a time series draws oldest to newest) or the
argument's order (baseline, then evidence, then subject). It never follows an arbitrary order
chosen for visual interest — bars bouncing in by index, categories popping in at random, a line
drawing backwards because the end is prettier.

**When the x axis is time, the reveal is linear.** Easing the draw of a time axis makes 1994 and
1995 occupy different amounts of screen time, which is a lie about the pace of the data. Easing is
for things that arrive (a dot, a label, an opacity), never for the traversal of a measured axis.

Use `interpolate` with both extrapolations **clamped**, so nothing keeps moving outside its window.
Use `spring` sparingly and **restrained** — high damping, no visible overshoot. A dot that bounces
past its own coordinate is, for the frames it is wrong, showing a value that is not in the data.

## Pause so the baseline can be read

Whatever the argument is measured *against* — a reference level, a target, a prior year, the
comparison the journalist named in the exchange — arrives **before** the evidence and is then left
alone for long enough to be read. Half a second is the floor; a labelled reference needs more.

A reveal that starts the instant the baseline finishes drawing produces a video in which the reader
is still reading the rule when the line has already crossed it. They will not go back.

## The subject arrives as a distinct event

The mark the confirmed takeaway is actually about — `visual-system.md`'s one semantic accent — must
land as **its own event**, separated in time from whatever preceded it. Not as the last few frames
of a uniform cascade, not as the tail of the line reveal that is already running.

The separation is what makes it the subject. If every mark arrives on the same schedule, the reader
has been given a build, not an argument.

## The conclusion appears only after its evidence is visible

**This rule governs assertions, not the title.** An assertion is an on-canvas element that *claims a
finding*: a callout, an annotation stating what happened, the value that closes the argument, a
highlight that says "here". None of them may appear before the marks that support them are on
screen. A callout reading "back under the 1967 level" over a chart that has not yet drawn 1967 asks
the reader to accept a claim from an empty frame; the accent pointing at a mark that does not exist
yet is the same failure with no words on it.

**A title is furniture, and so are the source line, the axis and the scale.** The title establishes
what the reader is looking at — that is the definition of furniture, and the furniture rule below
applies to it unchanged: up from the start, together with the axis, then still. This is not a
departure from `information-architecture.md`; the reading order for stills holds here too.

This distinction was learned the hard way and is written down so nobody re-learns it. The first
build of `chart-video` read "the conclusion appears only after its evidence" as applying to the
takeaway, put the title in the conclusion event, and produced eight seconds of which nearly seven
played under a deserted band of empty frame — no poster frame, no thumbnail, and a reader given
nothing to orient by while the chart built. The rule was obeyed faithfully and the video was worse
for it, because the rule was never about the title.

When the title is furniture, the **conclusion event still has work**: it is whatever genuinely
concludes the argument — most often the subject's value, stated once the subject has landed. It is
never a second copy of the title's sentence (see "repeated years or values" in `anti-patterns.md`).

## Hold the finished frame

The last event is stillness. When the build is complete, **stop**, and hold the completed chart
long enough to be read: half a second to a second at minimum, and if the conclusion event put a
sentence on screen, long enough to read that sentence.

The held frame is the one a reader actually reads, the one that gets screenshotted, and the one a
still export is taken from. A video that ends on its own last transition has no such frame.

## Furniture's density is a format decision, and this format asks for less of it

A static frame earns dense, conventional axis ticks precisely because a reader can stop and
scrutinise it at their own pace — that rule, and the render that forced it, belong to the static
format's own discipline file, not this one. A moving frame earns the opposite: a viewer watching a
line draw reads its position and its change, not a printed axis, and a tick grid dense enough to be
useful in a still is, in a build, one more layer competing with the reveal for attention it was not
established to compete for. This format's own line reveal draws with **no tick axis at all** — the
sparsest version of the static rule, not a compromise of it.

Carrying the static rule's density into this format produces a specific, recognisable defect: a grid
busy enough to read on its own terms, undermining the very draw it was meant to support. Carrying
this format's sparseness the other way — into a static frame — produces the mirror defect: an axis so
sparse a reader cannot locate the year the chart's own argument is about. Neither rule is correct in
the other's format; each is correct only in its own, and a beat author who reaches for "the axis rule"
without first checking which format they are drafting for is reaching for the wrong half of it.

## A label's reveal gates on its own mark, never on a master clock

The mark a subject's label refers to is not always where the master progress signal says it is. A
line reveal windows and eases its own draw separately from the composition's overall frame count; a
scroll-driven build drives that same chart's progress from the reader's scroll position, not from
time. A label gated on the master signal and positioned at the mark's fixed, final coordinate —
instead of gated on the mark's own local reveal fraction and positioned at wherever that reveal
currently is — reads correct only once the reveal happens to finish, and wrong at every frame before
that: gated on the master signal, it can appear from the very first frame of a scroll-driven build,
before any of the line it names has actually drawn; gated on the same signal in a timed build, it can
fade in ahead of the draw itself, naming a point the line has not yet reached. Both shipped,
independently, from the same underlying mistake.

The fix runs the other way on both counts: gate the label's opacity on the *mark's own reveal
progress*, never on a signal that only describes the composition as a whole; position the label at
the mark's *current* location as that reveal proceeds, never at its eventual one. The two
prescriptions converge exactly once the reveal completes, which is precisely why this defect is
invisible in a finished still and shows up only mid-build — the one place a still-only review will
never catch it.

## Furniture establishes, then stops

Source line, axis, ticks, gridlines — the layers that support verification and give the marks a
frame — come up first, together, and then never move again. They may fade in; they may not slide,
scale, stagger or re-animate. Once established, furniture is scenery, and scenery that moves during
the argument is competing with it.

## The timing contract

Every window in the drawing derives from **one typed object** that names its events editorially —
`establish`, `reference`, `reveal`, `subject`, `conclusion`, `hold` — each with a `start` and a
`duration` in frames. No frame literal appears in the drawing code.

This is not a code-tidiness rule, it is the editorial affordance: a journalist who finds the pause
too short retimes the piece by editing one object, in words they recognise, without reading a line
of JSX. A build with `interpolate(frame, [72, 150], ...)` scattered through it can be re-rendered
but it cannot be re-edited.

The gaps between events are legal and load-bearing — the pause after `reference` *is* the gap
before `reveal`. Name events, not gaps; a gap is what is left when nothing is arriving.

The contract is checkable, and should be checked: events in editorial order, no event beginning
before the evidence it depends on has finished, `hold` ending exactly at the composition's last
frame. That check is a test, not a review comment.

## Anti-patterns of this file

- **Motion added for energy.** Any build whose justification is that the piece "felt static". A
  chart is allowed to be static; that is a whole format.
- **Ornament that encodes nothing, moving.** Particles, sweeps, glows, a shimmer travelling along
  the line, a gradient that animates. The parent anti-pattern with a clock attached.
- **The accent before the thing it accents.** A highlight colour, an annotation, or a callout
  appearing before the mark it refers to exists on screen — the reader is pointed at nothing.
- **The uniform cascade.** Every element on the same stagger, so the build has no hierarchy and the
  subject is whichever item happened to be indexed last.
- **The bouncing value.** A spring with visible overshoot on a mark whose position encodes a
  number: for a few frames the chart displays a value the data does not contain.
- **Ending on the last transition.** No hold, so the only complete frame is the one nobody sees.
