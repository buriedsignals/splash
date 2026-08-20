---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

No NEWSROOM.md exists for this stress story, so the newsroom pair recorded by
`skills/splash/assets/root-template/NEWSROOM.example.md` is used as the house default: white
ground, teal accent. This beat is a photo essay and never draws the accent — only `ground` reaches
`deriveFurniture` in `image-beat`'s `render-still.mjs` — but `parsePalette` requires both fields to
be present regardless of whether a given beat uses the accent, so it is recorded anyway.
