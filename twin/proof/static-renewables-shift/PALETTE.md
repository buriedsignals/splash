---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

**A subject convention DOES fire here, and it was not taken.** The subject is renewable
electricity's share of generation, and `matchConvention` returns the `renewables` entry — green,
`#1B7F4B` — alone and unambiguously. `palette` offers a convention as a DEPARTURE from the
house theme, never as an override: the newsroom's identity is the default and a convention is a
reason to leave it for one beat. That reason was not taken on this beat, and this file is where that
shows. Recording it as `newsroom` says who chose, which is the point of the field; a journalist who
wants the green has one value to change and the render follows.

The accent is spent on the one highlighted country's slope line; the other five are drawn in the
furniture's `muted`, derived from the ground, so the highlight stays a highlight. Measured against
this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold (WCAG 2.2 SC 1.4.11).

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
