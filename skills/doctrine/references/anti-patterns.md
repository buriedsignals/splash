# Anti-patterns

Each entry here is a recurring failure, named by its usual shape, with the rule it violates and
why the violation costs the reader something real. This is not a style blacklist to be scanned
for banned words — it is the standing's negative space: what `editorial-standard.md`,
`information-architecture.md` and `visual-system.md` rule out, catalogued so a production skill
(or the model writing one) can recognise the shape of the mistake before it is halfway built.
"Detached legends," "tiny footer sources" and "repeated years or values" below are, specifically,
information-architecture failures — proximity, fixed positioning and density broken, in that
order — even though every entry here is filed together rather than split by which document it
answers to.

## Decoration that encodes nothing

Any mark, fill, icon or flourish present on the canvas that does not carry data, context,
hierarchy, verification or attention — see the five jobs in `editorial-standard.md`. This is the
parent category every other entry below is an instance of. The test is always the same: remove
it, and see whether comprehension survives. If it does, it was decoration.

## Fake texture, glassmorphism, dashboard chrome

Frosted-glass panels, drop shadows on flat cards, beveled buttons, skeuomorphic borders, a
background noise texture "for depth." These borrow the visual vocabulary of software UI —
where chrome signals "this is a control you can interact with" — and apply it to an editorial
graphic, where there is nothing to control and the chrome signals nothing but production
expense. It also actively costs contrast budget: a translucent panel over a busy background is
one more layer the reader's eye has to cut through before reaching the actual evidence.

## Gradients without quantitative meaning

A gradient used to make a bar, a card or a background feel less flat, where the gradient itself
does not encode a value. The single legitimate use of a gradient in this system is a colour ramp
that stands for a quantity (a choropleth scale, a heatmap). Everywhere else, a gradient is a flat
fill wearing a costume — visually busier, and lying about there being a second dimension of data
that is not actually there.

## Repeated years or values

The same number or date appearing more than once where a single, well-placed instance would do —
a year printed in the title, again on the x-axis, and again in a subtitle; a value stated in an
annotation that the axis already makes readable at a glance. Repetition like this is not
reinforcement, it is redundant decoding work: the reader re-verifies information they have
already registered, instead of receiving the one new fact the second mention could have carried.
The fix is not "delete the repeat" in isolation — it is to ask what the paragraph next to the
chart already says, and let the chart supply what the prose has not, per the "journalist's hand"
exchange in `storyboard`.

## Detached legends where a direct label would do

A colour key sitting apart from the marks it explains, forcing a look-away, hold, look-back cycle
that a label touching the line collapses to one glance. See `visual-system.md`'s "labels are
direct" rule — a legend is the fallback for genuine crowding, not the default layout choice.

## A fixed gutter where a measurement belongs

Reserved space for text — a label gutter, a legend box, an annotation margin — sized as a constant
picked to fit whatever sample string happened to be on hand while building the component, instead of
measured against the actual string about to be drawn. The failure is silent until a longer string
arrives: a gutter sized for "Renewables" clips "Renewables 280" down to "28"; a gutter sized for a
short weekday clips "Vendredi" and "Dimanche"; a category-label gutter sized for a typical short name
truncates a longer one into an abbreviation nobody chose. This is not a one-off bug, it is a class —
it has independently clipped a stacked-area band label, two legends, an annotation, a heatmap row
label, and category labels on four more chart types, each one found by a person looking at the
rendered image, none by a test, because every test that existed was written against the same
constant the render was.

The fix is never a bigger constant — a bigger constant just moves the same defect to a longer string.
It is to measure the actual string, in the actual font the component draws with, every time a beat
renders, not once at design time against a sample dataset. And "measured" is itself a claim worth
checking, not just asserting: a measurement built from a character-count formula (`text.length *
fontSize * a-fudge-factor`) is an estimate wearing the shape of a measurement, and it drifts exactly
where a fixed constant does — on wide characters, accents, mixed scripts. This project's own text
measurer was found to disagree with itself by 3.3× between two superficially similar call shapes (a
bare font-size number versus the options object the function actually expects), with no error at the
call site — proof that even a function whose entire purpose is "stop guessing" can still silently
guess, and the fix was to make the wrong call shape throw instead of returning a plausible small
number. A gutter is only as honest as the measurement underneath it.

## Tiny footer sources

A source line set so small, so low-contrast, or so far from the graphic it credits that a reader
would need to search for it to find out where the numbers came from. This is a verification
failure disguised as a layout choice: the source exists on the page in a technical sense, but not
in the sense that a skeptical reader can actually use it. If a source line is not legible at the
same casual glance the headline gets, it does not satisfy the "support verification" job.

## Missing scale, unit, source or honest baseline

A bar chart with no axis values, a map with no legend for what the colour means, a number with no
unit attached, or — most consequentially — a truncated y-axis that makes a small difference look
like a large one. Each of these is a context failure: the marks are on the page, but the
information required to read them correctly is not, and the graphic is asking to be trusted
rather than showing its work. A truncated baseline in particular is not a "stylistic" shortcut —
it changes what the graphic claims, and is why an honest baseline is not negotiable per element.

**Zero is a rule about marks read by LENGTH — bars, columns, areas.** Halve a bar and you halve
what it claims, so its axis starts at zero, always. A line is a different instrument: it encodes
change by SLOPE, and anchoring a line at zero when its values sit far above zero flattens the very
change the graphic is about. Rainfall running 604–912 mm drawn on a 0–1000 scale is a gentle sag
under a headline that says it fell by a third — the graphic contradicting its own claim while
looking scrupulous, which is worse than a truncation a reader can see. For a line the honest scale
is one **fitted to the readings with every tick labelled**, so the span is stated and cannot be
misread; a positive series never dips below zero, and a series that crosses zero always draws the
zero line, because the sign change is the story. Applying the bar rule to a line is itself an
anti-pattern, and it is a tempting one because it feels like the cautious choice.

## Accent colour on every mark

Reserving the one semantic accent for the subject only works if it is actually reserved. A chart
where every bar, every line, every region carries the bright colour has no accent at all — it has
lost the one signal that told the reader where to look first, which is the entire point of having
an accent in the first place. If everything is highlighted, nothing is.

## A title that claims more than the source supports

A headline that states causation where the data shows correlation, a superlative ("the worst,"
"the fastest") the underlying series does not actually establish, or a claim that quietly drops
the caveat the journalist stated in the framing exchange (`storyboard`'s "what does this data
NOT let you conclude" question). This is the anti-overclaim check made concrete: a title's job is
to state what the evidence proves, not what it would be more dramatic to imply.

## Copying a reference's styling instead of its information logic

The single most common misreading of the reference loop (`reference-set.md`, and
`storyboard`'s movement ⑧). A journalist or a model shown "the FT treats this argument
structure by establishing the distribution first, then adding the conclusion" can extract one of
two things: the *information logic* (distribution before conclusion — a transferable sequencing
rule, applicable to any dataset with that shape), or the *surface* (the FT's specific typeface, a
particular shade of red, a rounded-corner card). Copying the surface produces a graphic that looks
like the reference and argues nothing like it. Copying the logic produces a graphic that may not
resemble the reference at all and still does the same editorial job. The reference set exists
for the second kind of extraction; the transferable-lesson column in `reference-set.md` is written
the way it is — an information-design rule, never a styling description — specifically to make the
first kind of extraction harder to default into.
