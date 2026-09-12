# the-basemap-gives-up-its-contrast

- kind: imported
- name: The basemap sits far below the data in contrast, whichever pole the ground is at
- applies: the beat draws a basemap
- draws: value
- priority: 7
- evidence: lanacion-com-ar-seguridad-mapa-del-delito-te-sentis-inseguro-en-la-ciu
- evidence: projects-propublica-org-louisiana-toxic-air
- detect: the basemap's furniture measures under 1.6:1 against the ground; the data measures over 3:1

## The rule

Everything that carries meaning sits well above the basemap in contrast. The basemap is there to be
looked past.

## The evidence

**La Nación** — the ground measures `#FEFEFE` and the streets are the palest grey. That record's
reason: *"against a dense point field that is the only way the points stay countable."*

**ProPublica, Louisiana** — the ground reads `#FDFDFD`, roads and built-up areas at the faintest
grey, and the record notes the piece does this *"more severely than most"*.

## Why it is phrased as contrast and not as lightness

**The Toxmap is the same rule at the other pole.** It goes to a DARK ground precisely because the
quantity it draws — a soft risk bloom — is faint: *"on a light basemap it would have had to be far
more saturated to read at all. The ground is a decision about how much contrast the data needs, not a
mood."*

So a basemap is not "light grey". It is a fixed, small step off the ground, in whichever direction
the ink pole is not — the same move `deriveFurniture` makes for `grid`, which is why a directed plate
gets this for free by using it.

## The trap

A third-party styled basemap — a tile provider's `dataviz-light`, say — carries **its own palette**,
chosen against nobody's direction. It will not give up its contrast on request, and its greens and
blues sit beside whatever accent the direction set. A directed plate draws its own geography from
frozen shapes for the same reason it names no colour of its own.
