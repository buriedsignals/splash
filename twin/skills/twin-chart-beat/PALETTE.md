---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

**This skill's OWN recorded answer, for its OWN seed.** `scripts/render-preview.mjs` (and this
skill's other runners) read it with `readPalette`, exactly as a beat does — so the static chart seed
demonstrates the mechanism it documents instead of naming two hex literals beside a comment.

Until 2026-08-10 the runners carried `const ground = "#FFFFFF"` and `accent: "#0B7A75"` as
literals. That was the defect the whole palette mechanism exists to remove, sitting inside the file
a new beat is copied from: fix fifty beats and leave the seed, and beat fifty-one arrives with the
hex literal in it. The values here are byte-for-byte the ones the runners used to name, so the
committed preview does not move.

**A journalist's story overrides this and never edits it.** `readPalette` walks UP from the
directory it is given: a real beat lives under a story root that holds its own `PALETTE.md`, and
that answer is found first. This file is only ever reached when the skill's own seed is rendered
from inside the skill directory — which is what makes a copied skill directory self-contained, per
`twin-doctrine`: the copy carries its own answer and renders on its own.

`origin: newsroom` is the honest value, and it was checked rather than assumed. `#0B7A75` /
`#FFFFFF` are the house colours of the demonstration newsroom in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor`, `ground`) — the
same pair, recorded the same way, as `proof/webz-bump-emitter-rank/PALETTE.md`. They are NOT a
subject convention: `twin-palette`'s `SUBJECT_CONVENTIONS` table holds green `#1B7F4B` for
renewables, grey `#3A3A3A` for fossil fuel, blue `#1F6FB2` for water and `#C1440E` for heat,
and none of them is this teal. `parsePalette` accepts only `newsroom`, `subject` or
`journalist`, and of the three this is the one that is true.
