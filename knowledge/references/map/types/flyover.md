---
id: flyover
engines:
  cesium-flyover: flyover
intent: [spatial]
shape: narrative
limits: {}
formats: [video]
bestFor:
  - "a story whose subject IS the ground — the valley a road is cut into, the gorge a dam will drown, the slope a landslide came down"
  - "scale and relief a flat map cannot carry: how deep, how steep, how far, in a reader's body rather than in a legend"
notFor:
  - "anything a value encodes — a rate, a share, a count by region; the flyover shows terrain, and terrain carries no number"
  - "a place the reader should explore for themselves (pan, zoom, hover) — that is an interactive map"
  - "anything that must exist as a still: one frame of a flyover is a satellite photograph"
---

# 3D terrain flyover — per-type best practice

> Sources: the engine's own SKILL (`skills/cesium-flyover/SKILL.md`), ported from the `3d-flyover`
> reference skill (Buried Signals) · Chang & Ungar, "Animation: from cartoons to the user
> interface" (motion that reads as physical, not as a jump cut) · MapTiler terrain + satellite
> documentation · Google Map Tiles policy (for the city mode's licensing ceiling).

A flyover is not a map with a camera bolted on. It is **camera movement through real elevation**:
CesiumJS drapes satellite imagery over a terrain mesh, and the camera walks a prepared path by arc
length while banking into its turns. What the reader receives is scale and relief — the one thing a
2D map flattens away.

## When to use

- **Use** when the ground itself is the story, and the reader needs to feel a distance or a drop
  that no legend can give them: a corridor a road threads, a valley about to be flooded, the
  mountain face a village sits under.
- **Use** when a route or a place needs 20-30 seconds of screen time and the newsroom wants a
  motion piece that is **code-rendered and reproducible**, not a screen recording.
- **Not** for anything data-encoded — values by region go to a choropleth, quantities at places go
  to a proportional symbol map.
- **Not** for exploration; **not** for a still.

## It is never proposed from data — it is asked for

Every other form on this shelf is suggested by what the numbers are. A flyover encodes no numbers,
so nothing in a profile can suggest one: it enters the run only when the **journalist asks for it in
their own words** ("a flyover of the gorge", "a drone shot down the valley"). `lib/brain/eligibility.ts`
holds that mechanically — the form is excluded unless the run declares the request.

## What to say before shipping one

1. **Video only.** The producer refuses `static`, `interactive` and `scrolly` by name.
2. **It cannot render offline.** Cesium, the terrain mesh and the imagery all arrive over the
   network at render time. The mp4 is a fully owned local file; producing it is not local-first.
   The MapTiler key must be **unrestricted** — a domain-locked one 403s from headless Chrome.
3. **The frame carries a "CESIUM ion" credit mark** even though no ion token is used, alongside the
   MapTiler attribution. Whether a newsroom publishes with that mark in frame is an editorial call
   to make before the render, not after.
4. **City mode is a licensing question, not a rendering one.** Google's Map Tiles policy permits
   promotional video about the application only, capped at 30 s and marked as such. The landscape
   mode is the editorially safe path today.

## Reading the result

- A **slow camera renders fast and reads better**: ~0.5 km/s (13 km over 24 s) keeps tiles cached and
  gives the reader time to place themselves. 8 seconds of the same distance feels frantic.
- Fly **inside** the corridor walls, not over them — absolute altitudes just below the ridge line are
  what make the relief legible.
- Known artefacts to accept rather than fix in post: satellite imagery smears on near-vertical faces
  the camera passes close to, and the horizon is always the coarsest thing in frame.
