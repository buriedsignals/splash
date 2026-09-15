# Proportional symbol — in web

Worked example: `proof/web-proportional-symbol-europe-capacity` (2026-09-15), from `proof/static-proportional-symbol-europe-capacity`.
Vocabulary: `skills/map-web/assets/area-scale.ts` + `skills/map-web/assets/live-symbols.ts`.
**The gesture**: the reader picks the EXPONENT of the size scale, because the spread between the circles — the only thing the map is for — is a free parameter the author otherwise sets in silence.

- **Pin the anchor across the laws**: three laws over the same circles at the same places, the biggest circle at the same radius in all
  three, so the only cue that changes is the spread. The ranking is right under every law; that is precisely why the exponent is invisible.
- **Use `radius: "camera"`**: the circle encodes a VALUE, so its size is derived from the camera at the fit and then HELD in screen pixels
  as the reader zooms — the same number must not mean two things at two zooms. Halo, label gutter and hit target are sized from the same
  remembered radius (`data-r`), never from a second number describing the same circle.
- **Keep the size legend true at every zoom**: the key is drawn by the same exponent and the same camera-held radii as the marks, so it
  cannot drift out of agreement with the picture when the reader zooms or switches law.
- **Print what Mercator costs THIS subject, measured again rather than quoted**: the marks are held in screen pixels, so every ratio between
  them is exact at every latitude — the cost falls on the LAND UNDERNEATH, and therefore on the second reading every reader of a symbol map
  takes anyway ("how big is this circle for the size of its country"), which is false in the north by the measured factor.
