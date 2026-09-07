# ABC News — "The mullet is alive and well in AFL"

- url: https://www.abc.net.au/news/2024-05-23/afl-mullet-count-data-analysis/103850072
- archive: url-list
- type: unit chart, small multiples
- export: web
- readAs: the live page's own canvas graphic, photographed as the element, plus the article hero
  and its opening paragraphs read on the page

## What it is

An ABC News data piece counting every mullet in the 2024 AFL season. The graphic under measurement
is a **unit chart drawn as small multiples**: eighteen panels, one per club, each a loose grid of
individual mullet silhouettes — 788 marks, one per player — with the club's crest and name set
beneath its own panel. Read at rest, after the page had settled.

## What it does with information

**One mark per individual, panelled by group.** The obvious chart here is eighteen bars. This
draws every player instead, so the reader sees the *population* — how many players a club carries,
how the mullets sit inside that, and the texture of exceptions — rather than eighteen totals. The
comparison between clubs still reads, because the panels share a grid.

**The mark is the thing being counted.** The unit is a drawn mullet, not a dot or a square. That is
what lets the panel be read without a legend: the reader knows what is being counted by looking at
one mark.

**The claim is carried in a plain sentence set in the graphic's own space** — "Across all 18 teams
and 788 players …" — inside a bordered box below the panels, not in a caption elsewhere.

## What it does with style

Ground `#FFFCEE`, measured at **93.0 % coverage** by the pixel route: a warm paper, not white, and
the single most consequential style decision on the page. The palette reads **sequential** — one
hue cluster at 216°, `#1757B6` with its own lighter tints, and nothing else. One accent, on tinted
paper, and the whole piece is built from that pair.

The type carries the rest. Three families in play (`abcserif` for display, `abcsans` for furniture
and body), and the three axes this repository has never used once across 122 components:
**11 italic runs, 77 letter-spaced runs, 57 case-transformed runs**. The hero pairs a heavy slab
serif headline with a sans standfirst, and the opening paragraph takes a drop cap.

## What is transferable

- **A unit chart panelled by group, where the mark depicts the subject**, whenever the count per
  group is small enough that individuals can be drawn — the population's texture survives, and the
  between-group comparison still reads off a shared grid.
- **A tinted paper with one accent.** The ground is a direction decision taken deliberately;
  `deriveFurniture` already derives legible ink from any ground, so this costs nothing structurally.
- **A serif display against a sans furniture**, and letter-spaced capitals as a register of their
  own for labels and categories.
- **The summary sentence set inside the graphic's own frame**, in a bordered box, rather than in a
  caption the reader has to look away to find.

## What is this piece's own

The mullet silhouette, the club crests, and ABC's own typefaces. None of those transfers; the
mechanisms above do.

## What was not verified

- Whether the graphic animates, reveals on scroll, or responds to a pointer. The state read is the
  one at rest, after any such motion had already resolved, and nothing above depends on motion.
- The rest of the article. This piece carries several graphics; one was photographed and read.
- The narrow-window layout. Measured at 1440×900 only.
