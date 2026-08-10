---
ground: "#FFFFFF"
accent: "#0B7A75"
accents: "#C1440E, #1F6FB2"
origin: newsroom
---

`ground` is the colour the beat is drawn on, as `#rrggbb`.
`accent` is the one colour that carries the argument — the line, the highlighted bar — as `#rrggbb`.
`accents` is **optional** and lists the FURTHER house colours, comma-separated, in the order the
newsroom would use them. A newsroom's identity is rarely one colour, `NEWSROOM.md` has recorded
`accents` all along, and `palette` scores every one of them; this is where that survives into
the render. A beat drawing several series takes them in order (`seriesInks`), and derives further
ones from them — shades of a recorded accent — rather than falling back to the furniture grey.
Leave it out when the newsroom has one accent: one accent still carries three series.
`origin` records **who chose these**: `newsroom`, `subject`, or `journalist`. Nothing else is valid.

Every accent — the primary and every entry in `accents` — is measured against the `ground` when
this file is read, and one that falls under **3:1** (WCAG 2.2 SC 1.4.11 Non-text Contrast, the
floor for a mark a reader identifies data by) is REFUSED, with the ratio, the floor and the nearest
colour that clears it. `#FFFF00` on `#FFFFFF` measures 1.07:1 and used to render a clean PNG with a
whole headline number set in yellow on white; it now refuses instead. Text is a different floor —
4.5:1, SC 1.4.3, relaxed to 3:1 at 24px or 18.66px bold — and it is met a different way: every word
in a beat is drawn in `ink` or `muted`, derived from the `ground` and escalated until they clear it.

Copy this file to `PALETTE.md` beside the story — or beside a single beat, when that one beat needs
its own — and fill in the answer the journalist gave to `palette`'s proposal. `readPalette`
walks up from the beat's own directory, so one file at the story root serves every beat under it.

There is no default. A beat with no `PALETTE.md` anywhere above it refuses to render, and names
every directory it searched. That is deliberate: a chart that fell back to black-on-white would
publish in a colour nobody chose, and it would look like a decision.

`origin` exists because a render is allowed to say where its colours came from, and because
`journalist` is a real answer. When someone gives two hex codes directly, that is not a failure of
the proposal — it is the proposal working, and the file should say so rather than pretending the
newsroom's own charter produced them.
