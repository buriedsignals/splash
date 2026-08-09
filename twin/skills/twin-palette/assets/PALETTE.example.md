---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

`ground` is the colour the beat is drawn on, as `#rrggbb`.
`accent` is the one colour that carries the argument — the line, the highlighted bar — as `#rrggbb`.
`origin` records **who chose these**: `newsroom`, `subject`, or `journalist`. Nothing else is valid.

Copy this file to `PALETTE.md` beside the story — or beside a single beat, when that one beat needs
its own — and fill in the answer the journalist gave to `twin-palette`'s proposal. `readPalette`
walks up from the beat's own directory, so one file at the story root serves every beat under it.

There is no default. A beat with no `PALETTE.md` anywhere above it refuses to render, and names
every directory it searched. That is deliberate: a chart that fell back to black-on-white would
publish in a colour nobody chose, and it would look like a decision.

`origin` exists because a render is allowed to say where its colours came from, and because
`journalist` is a real answer. When someone gives two hex codes directly, that is not a failure of
the proposal — it is the proposal working, and the file should say so rather than pretending the
newsroom's own charter produced them.
