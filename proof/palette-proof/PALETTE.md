---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer a journalist gave to `palette`'s proposal for this beat: the newsroom's own house
colours, as recorded in `NEWSROOM.example.md`. `origin: newsroom` says who chose them.

`render.mjs` beside this file reads it with `readPalette` and names no hex of its own. Delete this
file and the render refuses, naming every directory it searched.
