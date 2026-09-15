# Locator — in web

Worked example: `proof/web-locator-zaporizhzhia` (2026-09-15), from `proof/static-locator-zaporizhzhia`.
Vocabulary: `skills/map-web/assets/vantage.ts` + `skills/map-web/assets/live-locator.ts`.
**The gesture**: the reader chooses THE REMOVE — how far back the author stood — because on the type with the least to say, the framing is the only decision anybody made, and it decides which neighbour the reader ends up believing matters.

- **Make each remove an answer, not a magnification**: its own window, its own stated drawing rule, its own census of what the frame holds
  and therefore what is not drawn, its own scale bar, its own sentence. `vantage.ts` refuses a ladder that does not climb by at least a
  factor of two per rung. MapTiler's zoom stays on — it is continuous and anonymous, it argues nothing; the remove is the editorial gesture.
- **Use `radius: "fixed"`**: a pin is not a measurement, so every marker holds the same screen size at every zoom, exactly as the plate drew it.
  A camera-held or ground-held radius would make the marker read as a quantity, which on this type there is none of.
- **Photograph the camera**: unlike a fill re-paint, a camera can be frozen — bake one picture per remove from the page's own live map and swap
  them with pure CSS (`:has()` + `:checked`). With no script, no key and no network the reader still gets every remove, legend line, scale bar
  and sentence; what the live layer adds is the travel between them, which is not the gesture.
- **Print what Mercator costs THIS subject, and it is not what it costs a choropleth**: a locator is read by DISTANCE, so the cost lands on the
  SCALE BAR. Ground scale runs as `cos(latitude)`, so a bar true at the frame's centre is wrong at its edges by a factor that grows with the
  remove — derive it for every window on every render and carry the widest in the standfirst.
