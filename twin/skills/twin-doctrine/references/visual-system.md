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

## What this buys

A reader who has seen one graphic from this system has effectively been taught to read all of
them: neutral means "for comparison," the one bright colour means "the subject," a label that
touches a line means "read this directly," and the ground colour on the frame is a fact about the
newsroom, not a fact about this particular story. Consistency here is not house style for its own
sake — it is the reader's decoding cost, paid once, amortised across every subsequent graphic the
newsroom ever ships.
