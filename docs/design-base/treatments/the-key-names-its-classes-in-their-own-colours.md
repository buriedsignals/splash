# the-key-names-its-classes-in-their-own-colours

- kind: imported
- name: Each class of the key is named in that class's own colour, so the caption IS the swatch
- applies: the beat draws twenty or more cells and declares three or more classes
- draws: axis, annot
- priority: 6
- evidence: projects-propublica-org-graphics-workers-comp-reform-by-state
- evidence: informationisbeautiful-net-visualizations-tooth-law-whats-halal-whats-
- detect: every class label on the delivered plate is set in the fill of the class it names

## The rule

Do not make the reader pair a swatch with a caption on a separate line. Set the name in the colour.

## The evidence, two publications reaching it from opposite ends

ProPublica starts from a ramp and names its poles: `Cut Benefits` set in the dark red at the top,
`Raised Benefits` in the green at the bottom, measured `Helvetica Neue | 10 | 400 | normal | 0`,
carrying `rgb(128, 28, 25)` and `rgb(39, 135, 118)`. That record's words: *"the reader never has to
pair a swatch with a caption on a separate line: the caption **is** the swatch."*

Information is Beautiful starts from categories and ends up with no key at all — `KOSHER` set in the
orange-red of its band (`#B83E17`), `both` in the dark red-brown (`#613116`), `HALAL` in the pale
blue (`#728E86`), `NEITHER` in the tan (`#D8B28E`): *"the reader learns the code from the heading
they were going to read anyway."*

## The corollary, from a third record

Where the quantity has no unit, **name the ends in words** rather than invent a number. The pin-code
poster's key reads `most common` at one end and `least` at the other, with no tick values at all,
because the quantity is a rank and a frequency count would tell the reader nothing they could use.
Naming the ends is the honest alternative to a unit the scale does not have.

## The contrast floor still applies

A class label set in its own pale class colour can fall below the text floor. The label takes
`adjustToContrast(classFill, ground, TEXT_CONTRAST_MIN)` — the same hue, walked until it is legible —
not a substituted one. The swatch beside it keeps the true fill.
