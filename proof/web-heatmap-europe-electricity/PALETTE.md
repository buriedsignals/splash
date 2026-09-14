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

**On a heatmap the colour IS the quantitative channel, so this file is about a ramp, not about two
marks.** Every other type in this corpus spends colour on identity — which series, which side of a
midpoint, which subject — and can afford to name two hues because the magnitude is carried by a
length, a position or an angle. Here there is no length and no position: the only thing a cell has is
its fill, and a reader who cannot order two fills cannot read the chart at all. That makes the
palette decision one decision, made seven times: **one hue, seven strengths, monotonic in
brightness.**

**One hue.** Nine sources are nine columns, not nine colours. A qualitative palette across the
columns would say the sources differ *in kind* along the very axis that is supposed to carry
magnitude — the catalogue's one named failure for this type (`chart-beat/references/types/heatmap.md`).
The ramp is the direction's own accent mixed into the direction's own ground, `mix(ground, accent,
0,10 + i/6 × 0,90)`, and nothing on the page imports a second hue.

**Monotonic, and measured rather than assumed.** Relative luminance moves in one direction only,
start to finish, in all three directions — falling on the two light grounds, rising on the dark one —
because each sRGB channel moves monotonically along a mix and luminance is monotone in each channel.
That is what keeps the grid readable in greyscale and to a colour-vision-deficient reader, both of
whom are reading luminance and not hue. Adjacent stops measure **1,278–1,384:1** (creme),
**1,344–1,518:1** (nocturne), **1,280–1,419:1** (rapport): every neighbouring pair clears the 1,25:1
floor the donut pass set after meeting a seven-tone ramp that stepped 1,007:1. The whole ramp spans
5,721:1 / 9,003:1 / 6,113:1 — it runs from the ground to the accent rather than inside
`contrast(accent, ground)/3`, which is the reason seven levels fit here and seven did not there.

**The palest bin is deliberately under the non-text floor, and that is a refusal, not an oversight.**
It reads 1,160:1 (creme), 1,160:1 (rapport) and 1,199:1 (nocturne) against its own ground — see `BRIEF.md`, "The ramp, measured against
what the page ships", which carries every number and the argument. Lifting it would run
`adjustToContrast` toward the ground's opposite pole and turn the two lightest bins grey while the
rest stayed blue: a sequential scale that changes hue halfway is no longer sequential, which costs
more than the floor buys. What the low end owes the reader instead is a printed key, a drawn cell
edge, and — on this page and not on the still — a control that takes the unreadable end out of the
picture altogether.

**Text on a cell is measured against the cell.** A printed share sits on its own fill, never on the
plate's ground, so `inkOnFill` chooses it per bin; the lowest reading across all seven bins in all
three directions is 4,551:1, above the 4,5:1 text floor.

Nothing else on the page is chromatic. The axis labels, the cell edge, the filter chips and the
source line are steps off the direction's own ground, computed by `deriveFurniture` at render time
and never written here as a literal.
