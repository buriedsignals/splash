# Video map format

> Sources: Amini et al. 2015 (data video grammar / EIPR) · Disney twelve basic principles of animation ·
> Chang & Ungar 1993 (in-out cubic easing) · FT Visual Vocabulary · Tom Vaillant's `map-explainer` skill.

A video map is a **frame sequence** — an MP4 / WebM export. There is no runtime interaction,
no hover, no tile fetching by the viewer.

## Frame-determinism

**Motion is a pure function of the frame index — no `Date.now()`, no `Math.random()`, no
wall-clock deltas inside the render loop.**

Every camera position, symbol opacity, and colour value is computed as `f(frame)` (Tom
Vaillant's Remotion discipline). A render at frame 42 is identical on every pass.
Non-deterministic renders produce frame-to-frame flicker and make QA impossible.

## Camera legibility

**Do not move too fast. Apply in-out cubic easing on every camera transition.**

In-out cubic ease (Disney / Chang & Ungar) accelerates gently and decelerates symmetrically
into the hold. Practical guard: reach the target extent in no fewer than 30 frames at 30 fps
(≈ 1 s) for a regional move; continental moves need longer.

## Ending hold

**End on a full-extent hold of at least 24 frames (≈ 0.8 s at 30 fps).**

The hold lets the reader read the final state. Source: Amini et al. 2015 — the closing beat
consolidates the story (EIPR: resolution).

## Furniture — baked and ratio-aware

**Title band and source line are composited at render time, scaled to the export ratio
(landscape 16:9 / square 1:1 / portrait 9:16). The framing safe-area applies to video.**

- Safe gutter ≥ 16 px at 1×, scaled by canvas size — nothing flush to the frame border.
- Data layer must never sit under the title band or legend; offset the camera fit to
  keep every symbol visible.
- Title pill `maxWidth` = `width − 2G`; wrapped lines must not reach the frame boundary.

Source: FT Visual Vocabulary (layout hierarchy — furniture rules apply equally to video frames).

## Reveal vs storytelling camera — editorial choice

**The choice between a simple reveal and a storytelling camera tour is editorial.**

- **Simple reveal** — camera flies to the story extent, holds, symbols appear. One beat.
- **Storytelling tour** — sequential beats from `deriveMapStory` / `deriveSymbolStory`; each
  beat highlights a region or symbol group before the full-extent hold. Follows the EIPR
  beat structure (Amini et al. 2015 — event / intent / progress / resolution).

Tom Vaillant's `map-explainer` aesthetic (river/route progressive draws, sequential region
highlights) is a specific storytelling treatment; it belongs in Group B, not as a simple-reveal
fallback.

## Sources (by name)

- **Amini et al. 2015** — data video grammar; EIPR beat taxonomy; closing summary beat
- **Disney twelve basic principles of animation** — ease-in / ease-out principle
- **Chang & Ungar 1993** — in-out cubic easing for animated transitions
- **FT Visual Vocabulary** — furniture hierarchy, safe-area framing
- **Tom Vaillant's `map-explainer` skill** — frame-determinism discipline; river/route and
  region-highlight treatments

## Enforcement

Framing (furniture placement, data not under title/legend): `checkMapFraming`.
Frame-determinism and easing: the render harness — non-deterministic renders fail the
frame-hash comparison; missing ease flags fail the camera-spec assertion.
Storytelling treatments: Group B + `~/Downloads/map-animation/map-explainer`.
