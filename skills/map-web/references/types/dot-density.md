# Dot density — in web

Worked example: `proof/web-dot-density-europe-stations` (2026-09-15), from `proof/static-dot-density-europe-stations`.
Vocabulary: `skills/map-web/assets/live-dot-density.ts`.
**The gesture**: the reader chooses WHAT ONE DOT IS WORTH, because the dot value is the sentence, not a rendering setting.

- **Make the two resolutions deposit the same ink**: derive the second dot value from the file itself (the mean quantity per row),
  so the same rows paint a comparable number of dots — nothing added, nothing removed, the ink simply put somewhere else. That is
  the argument a still cannot make, and it is what proves the minority fleet was 0,9 % of the ink by count and a third of it by capacity.
- **Use `radius: "ground"`**: a dot stands for a fixed quantity in a fixed piece of GROUND, so its ground area must be constant and
  its screen radius doubles per zoom level — an `["interpolate", ["exponential", 2], ["zoom"], …]` expression, never a number.
  A camera-held radius would make the field thin out as the reader zooms in, which would be a lie about density.
- **Measure the trap in both directions and print the refused half**: a dot value too large empties a real concentration off the map,
  too small closes the field into a blob. Print how many dots the finer value would need, every render, so the refusal is a number.
- **Print what Mercator costs THIS subject**: a dot has no area to inflate, so the cost falls on the ground UNDER the dots — the north
  is drawn larger, the same dots spread over more page, and it reads sparser than it is. Derive the northern page share against the
  northern true share and throw if the sentence would be false; and say that `circle-radius` is a screen length, so one dot's declared
  ground size is true only at the frame's reference latitude.
