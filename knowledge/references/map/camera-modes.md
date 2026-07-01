# Camera modes — taxonomy and decision framework

> Sources: FT Visual Vocabulary · Beat model (`deriveMapStory` / `deriveSymbolStory`) ·
> `src/camera-mode.ts` (dispatch field + type definitions).

The `cameraMode` field on the story config selects how the camera behaves across beats.
Default: `"guided-tour"`.

---

## Modes

### `simple` — no camera movement

The camera locks on the full data extent. Data animates in place. One beat.

**Dispatch value:** `"simple"` (the reveal format; `cameraMode` is absent or `"simple"`).

**Choose when:** the story is "here is the distribution / here is the magnitude" — the whole
map tells the story at a glance, and no individual places need calling out. (FT Visual
Vocabulary — magnitude and distribution encodings are read at-a-glance; a stable single frame
is the right container.)

**Format reference:** `formats/video-reveal.md`.

---

### `guided-tour` — sequential camera beats with callouts

The camera flies between feature-level extents following the `Beat[]` produced by
`deriveMapStory` (choropleth) or `deriveSymbolStory` (proportional symbol). Each beat pauses
on a feature with a name + value + unit callout, then the camera returns to full extent for
the takeaway.

Beat arc: title card → establish → reveal ×N → takeaway.
Camera is frame-deterministic: `buildTimeline` + `cameraForFrame` → `map.jumpTo`. (Tom
Vaillant's Remotion discipline — every camera position is `f(frame)`.)

**Dispatch value:** `"guided-tour"` (default; see `src/camera-mode.ts`).

**Choose when:** the story identifies specific places the reader should be taken to — a
spatial argument with named stops. (FT Visual Vocabulary — hierarchy: the primary point is
established before supporting evidence; a tour structure embeds that hierarchy in motion.)

**Format reference:** `formats/video-storytelling.md`.

---

### `route-reveal` — progressive line draw with territory animation

A line or route draws on from start to finish while territories animate sequentially along
the route. Tom Vaillant's `map-explainer` aesthetic: a river traced from source to sea, a
border drawn segment by segment, a trade route that lights up stop by stop.

**Dispatch value:** `"route-reveal"`.

**Choose when:** the story is inherently linear and geographic — a river, a migration route,
a supply chain, a border. The line itself is the argument; territories matter because they
are encountered in sequence, not because of their individual values. (FT Visual Vocabulary —
for linear geographic stories, the path is the primary encoding; territory fills are
supporting context.)

**Status: ships in SP3. Documented here as the design target; not yet implemented.** The
`"route-reveal"` value is reserved in `src/camera-mode.ts` but the render harness for this
mode does not exist yet. Using it before SP3 will fall back to `"guided-tour"`.

---

## How the AI chooses

The AI reads the article's editorial intent and data shape, then sets `cameraMode`:

| Signal | Mode |
|--------|------|
| Single metric, full country/region distribution | `simple` |
| Named places matter ("in Geneva, in Lagos…") | `guided-tour` |
| A linear geographic feature (river, route, border) | `route-reveal` |
| Uncertain / mixed | `guided-tour` (default) |

Decision criteria, sourced:
- **Distribution / magnitude** → `simple`. (FT Visual Vocabulary — at-a-glance encodings
  need a stable frame, not a tour.)
- **Spatial argument with named stops** → `guided-tour`. (Amini et al. 2015 — the
  establish/progress/resolution beat arc maps naturally to a guided tour with named reveals.)
- **Linear geographic story** → `route-reveal`. (Tom Vaillant's `map-explainer` skill —
  the route-draw is the primary narrative device for linear features.)

When in doubt, `guided-tour` is the safer default: it surfaces the hero feature explicitly
and lets the reader orient before the takeaway.

## Sources (by name)

- **FT Visual Vocabulary** — editorial framing; magnitude/distribution as at-a-glance
  encodings; linear geographic story treatment
- **Amini et al. 2015** — EIPR beat arc; establish/progress/resolution as a guided-tour
  structure
- **Tom Vaillant's `map-explainer` skill** — route-reveal / progressive draw aesthetic;
  frame-determinism discipline
- **`src/camera-mode.ts`** (this toolkit) — `CameraMode` type, `CAMERA_MODES` constant,
  `DEFAULT_CAMERA_MODE = "guided-tour"`; the dispatch field is `cameraMode` on the config
