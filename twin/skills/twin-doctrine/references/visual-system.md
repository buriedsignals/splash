# The visual system

Where `editorial-standard.md` says what a layer is allowed to be *for* and
`information-architecture.md` says where it sits relative to the others, this file says what it is
allowed to look like — the concrete rules a production skill applies once it has decided an
element earns its place on the canvas.

## The field is flat

The base of every graphic is a flat, unadorned field — no texture, no vignette, no gradient wash
behind the marks. A flat field is not a stylistic default so much as a precondition: any gradient
or texture on the ground competes with the marks for the reader's contrast budget before a single
data point has been drawn. If the ground needs to communicate something (a region, a time band),
it does so as a flat fill with its own legible label, not as a decorative wash.

## Colour has a grammar, not a palette

Colour in this system is not "pick something that looks nice together." It is assigned by role:

- **Neutral colours carry history and comparison.** Every series that exists to give the subject
  something to be compared against — prior years, other countries, the rest of the distribution —
  is drawn in a muted, neutral tone. Neutral is the default state of a mark; colour is the
  exception, not the palette.
- **One semantic accent is reserved for the subject.** The single series, bar, region or point
  that the confirmed takeaway is actually about gets the one saturated colour on the canvas. If
  two things are accented, the reader cannot tell which one the story is about — a repeated
  predecessor failure was a chart that colour-highlighted its statistical maximum instead of the
  subject the journalist had actually named. The accent is assigned by the journalist's answer to
  "who is the subject," never by which value happens to be largest.
- **Flat fills; gradients only when they encode quantity.** A gradient fill on a mark is legitimate
  exactly when the gradient itself is carrying a value — a choropleth's colour ramp, a heatmap
  cell. A gradient used to make a single bar look more three-dimensional encodes nothing and is
  banned by the same test as any other ornament.

## Labels are direct; legends are a fallback

An endpoint label on the line it belongs to, or a direct annotation pointing at the mark it
describes, is preferred over a detached legend in every case where it is spatially possible. A
legend forces the reader to look away from the evidence, hold a colour in memory, then look back —
three steps a direct label collapses into one glance. A legend is acceptable only when direct
labelling would collide (too many series in too little space) — and even then, it is a last
resort documented as one, not the default starting point.

## Furniture derives from the newsroom ground; nothing is hard-coded

Every visible non-data layer — title, subtitle, source line, background, card, pill, axis ink —
is computed from the newsroom's own ground colour (`themeBg`), never written as a literal hex
value in a component. A newsroom's ground can be white, charcoal, navy, or any arbitrary colour a
site audit or a brand charter names; a component that hard-codes `#FFFFFF` for its background or
`#1A1A1A` for its ink will render correctly for exactly one newsroom and silently break for every
other one, in a way that is invisible until someone actually renders it on a dark ground. The
rule is structural, not aesthetic: **derive, never hard-code.**

## Contrast is measured on the real background, with one required escalation

Every ink-on-ground pairing is checked against WCAG contrast on the *actual* rendered background
colour — not against an assumed white or an assumed black. A mid-grey ground (roughly the band
between `#71` and `#81` in each channel) is the one region where a softened, "almost black" or
"almost white" ink cannot clear a legible contrast ratio against either a light or a dark
variant of itself — the physics of the grey band leaves no headroom. The system's answer is a
required escalation: when the measured contrast on a softened ink pole fails against the real
background, the ink escalates to the pure pole (`#000000` or `#FFFFFF`) rather than staying
softened and illegible. This is not a cosmetic choice to be second-guessed per element — it is
the one case where "soft is nicer" is not a valid objection, because soft-on-mid-grey is a
correctness failure, not a taste question.

## A mark's colour is measured again when it becomes a label

The escalation above governs furniture ink against the page ground. The same measurement is owed a
second time whenever a mark's own colour is reused to draw the text that names it — a value label
set in its bar's fill, an end-label set in its line's stroke, a connector label set in its segment's
hue. A colour can be a legitimate, CVD-safe choice as a MARK and still fail WCAG text contrast the
instant the identical hue is asked to read as a LABEL, because the two questions are not the same
question: a mark is checked for confusability with its neighbours, a label is checked for contrast
against the specific background it sits on — and a hue can pass the first and fail the second on the
very same canvas.

This is the single most independently-rediscovered defect in this system's history: a stacked-area
end-label in its own pale ramp blue (roughly 1.9:1 on white — the accompanying orange ~2.1:1, both
far under the 4.5:1 floor), a histogram reference-line label and a lollipop stem label both in the
Okabe-Ito "vermillion" mark colour (a legitimate fill, ~3.87:1 as text), and the same shape fixed
again by name on slope, dumbbell and waterfall's own value labels. Six chart types, six separate
fixes, before the rule was finally extracted into one shared guard — resolving to whichever ink pole
reads highest against the fill the label sits on — that six more chart types now import instead of
re-deriving. A map carries the identical trap under a different name: a single house hue painted as
a symbol, route or dot-density fill is exactly the case this rule governs, and a dedicated
conformance check exists for it precisely because it kept recurring there too.

**The rule: a label's ink is never inherited from the mark it names.** It is computed the same way
furniture ink is computed above — escalate to whichever pole measures higher against the real
background the label sits on — every time, even when that background is a data mark instead of the
page. A production skill drafting a new type that colours its value labels the same as its marks,
without a second, separate contrast check for the label specifically, will reproduce a defect that
has already shipped and been fixed six times over.

**And the rule reaches the ANNOTATION layer, not only the value label.** The paragraph above was
written for text, and for seven sessions nothing in this tree applied it to anything else: a dashed
median rule, a leader, a bracket and a hatch are not text, so no check reached them. Measured across
the 48 committed statics on 2026-08-10: **21 of the 32 dashed rules that cross a mark at all were
under their floor**, the worst at 1.20:1 — an accent rule spending 97 % of its length inside a bar
it cannot be seen against. Two floors, and they are not the same one: a rule or any other non-text
mark is **SC 1.4.11, 3:1**; text is **SC 1.4.3, 4.5:1**, relaxed to 3:1 only at 24 px, or 18.66 px
bold. Collapsing them into one number fails a legitimate rule or passes an illegible label. The
mechanism is `twin-chart-beat/scripts/annotation-ink.mjs` — `marksUnder` finds what the annotation
lies over, `inkThatReadsOver` returns the pole that reads against all of it, and
`assertAnnotationReadsOverMarks` throws when a beat has decided on a colour that does not. Its
honest consequence, which looks like a regression and is not: an accent rule crossing a mid-grey bar
comes back near-black. **A teal rule a reader cannot see was not carrying the accent either.**

There is a third outcome, and it is the useful one: when NEITHER pole clears the floor, the
annotation is in the wrong PLACE, not the wrong colour. A callout lying half on white paper and half
on a mid-blue bar has no ink at all — 4.05:1 one side, 1.00:1 the other — and the fix is to move it
onto one background or the other, which is what `static-swiss-age-pyramid` did.

The check that reads the delivered artifact rather than the arithmetic is
`splash-twin/test/annotation-reads-over-what-it-crosses.test.ts`. Its one measurement decision is
worth carrying to any sibling written later: **what is underneath is decided by sampling at pixel
centres strictly inside the annotation, never at its endpoints.** A waterfall's connector runs from
one bar's right edge to the next bar's left edge, so it meets both at a point of zero width;
sampling the endpoints reports four crossings at 1.00–1.60:1 in a beat that is correct, and a guard
that accuses correct work is a guard someone switches off.

## An open gap: adjacency inside an already-safe palette

A CVD-safe palette (Okabe-Ito or equivalent) guarantees its members are distinguishable from each
other in the general case — it does not guarantee that any two of them, placed *next to each other*,
stay distinguishable for every colour-vision deficiency. Two warm members of the same safe set — an
orange and a vermillion — can still sit close enough, adjacent, to blur for some viewers, and this is
not hypothetical: a convention in this system's own colour tokens assigns exactly that pair to
adjacent roles in a two-stop scale. The set each colour was drawn from is CVD-safe; the specific
pairing was never separately checked for adjacency, and it has not been fixed. A production skill
assigning colour to adjacent marks — grouped bars in one cluster, two stacked segments that touch —
should not assume membership in a safe set is sufficient on its own; this is a known, standing gap,
not a closed rule, until adjacency itself is checked.

## What this buys

A reader who has seen one graphic from this system has effectively been taught to read all of
them: neutral means "for comparison," the one bright colour means "the subject," a label that
touches a line means "read this directly," and the ground colour on the frame is a fact about the
newsroom, not a fact about this particular story. Consistency here is not house style for its own
sake — it is the reader's decoding cost, paid once, amortised across every subsequent graphic the
newsroom ever ships.
