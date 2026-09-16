---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md`.

`palette`'s proposal was run for this beat's own subject line — *"four photographs of Grinnell
Glacier from the same viewpoint, 1938 to 2009"* — and returned **one** option, the house theme:
`matchConvention` fires on none of the four grounded conventions. `water` was the near miss and it
does not fire, correctly: its own vocabulary is river, rainfall, flood, drought — a body of water as
a SUBJECT to be encoded, not a lake that happens to appear in a photograph. Reaching for blue here
because there is meltwater in the frame would be a colour chosen for what the picture looks like,
which is the move `palette/references/subject-conventions.md` refuses.

**And on this beat the accent has no job at all, which is worth stating rather than leaving as an
absence.** The photographs are the entire visual; nothing on any frame encodes a value, so there is
no mark for an accent to mark. The only colours the beat draws are furniture derived from the
ground — `ink` for the year, `muted` for the credit line — and `deriveFurniture` computes both. The
accent is still recorded here because a beat with no recorded palette cannot be re-rendered by
anyone else without inventing one, and `readPalette` throws rather than let that happen; the
render's own log prints it as unused so the fact is visible rather than inferred.

Measured against this ground: **5.18:1**. The words on this beat clear 4.5:1 through
`deriveFurniture`, from the same ground — and both of them sit on an opaque chip of that ground, not
over the photograph, so what the reader's eye meets is exactly the pair that was measured. A caption
laid straight over a photograph has no measurable contrast at all: its effective background is
whatever pixels happen to be behind it, which is different on every frame.

`render.mjs` and `ImageFrame.tsx` name no hex of their own.
