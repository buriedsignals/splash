# Flow map (route — and origin-destination) — scrolly

**Argues:** A flow/route map answers "what path did this take, and what did it pass through, in order" — a ship's voyage, a migration corridor, an evacuation route, a supply chain's journey — where the sequence of places crossed is itself part of the claim, not just the endpoints.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Trace** — the route draws itself from origin to destination, in order
- **Name** — a waypoint is named once the trace reaches it
- **Zoom / focus** — the close-up centres the leg the card names, both axes
- **Pull back** — the whole route stands, named waypoints still marked

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together

## Precision to assert
- the route's drawn order matches the data's own sequence, asserted; every country beneath the route is present

## Devices the worked example implements
- **HTML labels driven by the live projection** — host/origin names are NOT MapTiler place labels (wrong language) or MapLibre symbol layers (cannot bold one name per card without a second style layer): `flow-drive.mjs` positions plain HTML labels every frame from the map's own projection. Use whenever a name needs per-card styling MapLibre's own label layers cannot give it.
- **Rank-arrival opacity** — bands/seats arrive largest rank first, each gated by `$state.bands` passing its own index (`arrivedOf`) — the same staggered-reveal shape as the hex-grid's buckets and the proportional-symbol's bands, applied to line/point pairs instead of areas.
- **Paired highlight on state alone** — the top two bands switch to a richer colour once `$state.pair` passes 0.5 (`pairedColour`, a literal `case` MapLibre reads directly — never a per-feature match). Use to call out exactly two co-leading entities together.
- **Long tail as one aggregate dot cluster** — every non-top origin collapses into a single low-opacity `others` layer rather than being drawn (or named) individually, faded in as one mass on `$state.others`.
- **Label collision nudge** — `keepApart` (in `flow-drive.mjs`) steps a later label straight down, a few px at a time, until it clears every earlier label's box by a small pad; use it whenever several driven labels can crowd into the same screen space.

## Worked example
**Data shape:** per-area — one row per named region/month (entity/code), no coordinates.

`proof/scrolly-flow-map-ukraine-protection/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedFlowMapScrolly.tsx` (the key/counter chrome around the live map) and `flow-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type flow-map --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/flow-map.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
