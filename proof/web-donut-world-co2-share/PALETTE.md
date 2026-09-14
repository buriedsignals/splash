---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

**One hue, four tones, and the count is a measurement rather than a preference.** This beat does not
partition one quantity into two states of itself, so
`two-states-of-one-measure-are-one-hue-at-two-chromas` does not govern here: a donut of world shares
is a **partition into named parts**, and the sheet for the form
(`chart-beat/references/types/pie-and-donut.md`) says colour is that partition's ONLY differentiator
— *"there is no position or length fallback the way there is on every axis-based chart in this set."*

So the number of tones is not a taste, it is what the ground allows. Every tone has to clear the
non-text floor of 3:1 against the direction's own ground, and the loudest tone cannot be louder than
the accent itself, so the whole ramp lives inside a range of `contrast(accent, ground) / 3`:

| direction | ground | accent | range | 7 tones | 4 tones |
| --- | --- | --- | --- | --- | --- |
| creme | `#FFFCEE` | `#1757B6` | 2,21 | 1,14:1 | **1,30:1** |
| rapport | `#FFFFFF` | `#1F5C8B` | 2,36 | 1,16:1 | **1,33:1** |
| nocturne | `#111044` | `#4FE0C0` | 3,60 | 1,25:1 | **1,53:1** |

The build this beat replaced asked for **seven** tones and got worse than the table's 1,14 — mixing
toward the ground and then floor-correcting clamped its bottom four steps onto the same 3:1 line, so
Russie, Japon, Iran and *tous les autres* came out at **1,007 · 1,044 · 1,007** against each other on
creme, and at 1,049 · 1,040 · 1,001 on rapport. Four wedges in one colour, on a plate where colour
was the only thing telling wedges apart.

The ramp is therefore built **in contrast space and not in mix space**: four targets spaced
geometrically from the accent's own contrast down to the 3:1 floor, each reached by mixing the accent
toward the ground until the target is met. `assertRampIsSeparable` re-measures the result and refuses
the render if any adjacent pair falls under **1,25:1** — the same shape of refusal the palette skill
makes against the ground, one step sideways, between two marks a reader has to tell apart.

Four tones, and the grouping is the claim the page makes: **Chine · États-Unis · les quatre suivants
(Inde, Russie, Japon, Iran) · tous les autres.** The ramp runs strongest-first, so the accent sits on
the subject and the faintest step on the remainder that names nobody — an ordering the first build of
this beat had the other way round.

Nothing else on the page is chromatic. The hairlines that separate the wedges are the direction's own
ground; the ring a chosen country takes, the ghost arc laid at the other year's share, the two totals
in the hole and the legend's own words are steps off the direction's ink, computed by
`deriveFurniture` at render time and never written here as a literal.
