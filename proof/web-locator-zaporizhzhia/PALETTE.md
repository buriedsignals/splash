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

**One hue, two chromas, and one neutral — because this type is allowed a CATEGORY and nothing
else.** `skills/map-beat/references/types/locator.md` is explicit: "colour is category if the
markers are grouped, a single neutral or house colour if they aren't." There is no magnitude here to
run a ramp on, and a second hue would be a second encoding nobody declared. So the page paints three
treatments:

- **the subject** — the direction's own accent, the only mark the beat is about;
- **the other low-carbon stations** — the SAME hue, walked 45 % toward the basemap's land, so a
  reader sees one family at two weights rather than two families;
- **the settlements** — no hue at all, a step off the land toward the ink. They are furniture: they
  place the subject, they are not part of the argument.

**Every one of them is measured against the LAND THE PLATE IS BAKED IN, never against the paper.**
That is the trap `WEB-TYPE-BRIEF.md` names by hand and the choropleth paid for one beat over: its
lightest class reported 3,02:1 against the direction's ground while the colour a reader actually sees
it on gave 2,58:1, under the non-text floor. What sits behind every mark on this page is
`mix(ground, ink, 0.07)` — the tint `plateTints` bakes the basemap's land in — so that is what the
floor is taken against, and a treatment that cannot clear `NON_TEXT_CONTRAST_MIN` on it is walked
until it does rather than shipped.

**The subject is RINGED, not recoloured, and the ring is searched rather than named.** The accent
already belongs to the station class, so marking the subject with a second colour would spend a hue
the page has not defined. The ring has to stand 2,2:1 off the subject's own fill AND 1,6:1 off the
land it sits on, and the answer is at opposite ends of the scale on a light direction and on a dark
one — so it is walked from the direction's ground toward its ink until both hold, and the render is
REFUSED if neither end answers.

**What a pointed-at mark becomes is searched off its own fill too.** Not a fixed dose: a fixed mix
measured 1,104:1 on nocturne one beat over and the owner refused it. The dose is walked up until the
result stands 1,4:1 from the fill it replaces and still clears the non-text floor against the land.
And it is the MARK that answers, re-coloured in a layer of its own — never a ring or a halo laid over
it. On this type that is doubly binding: a second circle of a different size would break the one
promise a locator makes, which is that every circle is the same size.

**Nothing else on the page is chromatic.** The border between countries, the scale bar, the names
inside the map and every word around it are steps off the direction's own ground, computed by
`deriveFurniture` at render time and never written here as a literal.
