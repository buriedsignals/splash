# Map type sheets

Eight sheets, one per map type, each a page you read before writing that type's beat by hand — not
a config, not a component to import. Each sheet answers five questions: what the type is for,
when NOT to reach for it (and what to use instead), the one thing that makes it lie or become
unreadable, what the drawing actually needs (position, size, colour, class, shared scale, and
what a join needs to succeed), and the accessibility trap specific to that type, where one
exists.

This knowledge was harvested from a sibling parameterised engine (`map-native`, 7 built types,
`/Users/rmdms/Sites/Professional/splash/skills/map-native/`) that has been built, rendered, and
QA'd against real newsroom stories for months — the numeric thresholds and named defects in these
sheets are real, not invented for this toolchain: a data join failing silently on a mismatched
country code, a symbol label clipped at the map's own edge, a choropleth ramp that stopped being
CVD-safe. What changed is the form: there, the knowledge lives in a conformance checker's source
code and a best-practices file; here, it is a paragraph a person reads before writing a bespoke
component, because this toolchain's whole premise is that nobody imports a map-type component —
they write one, once, for the story in front of them, on top of `twin-map-beat`'s one shared
bake (`scripts/bake-plate.mjs`: one camera, one basemap plate, one file of projected geometry).

## How to use a sheet

Read the sheet for the type you are about to write, before you write a line of the component. It
will not tell you how to lay out THIS story's map — that is the beat's own judgement, made against
`twin-doctrine/references/geo-discipline.md` and `twin-map-beat/SKILL.md`'s own gotchas (the loud
join, the bounded settle, the accent reserved for the subject). It will tell you the trap this
type specifically falls into — most often a join, a scale choice, or a count-vs-rate confusion —
so you do not rediscover it by rendering a bad still first. If a sheet's "what goes wrong" section
does not match what you are looking at, trust the render, not the sheet.

## What is here

choropleth · proportional-symbol · locator · flow-map · dot-density · hex-grid · cartogram ·
contour-isoline.

Note on **contour-isoline**: the source engine designed this type and never built it (no
component, no discriminator entry) — that sheet is written from established cartographic
practice, not harvested from a rendered, QA'd component, and says so plainly at its own top. Every
other sheet in this set, including cartogram, is grounded in a real shipped, tested component.

## What is not here

**3D terrain flyover** (a wholly separate engine — Cesium, not MapTiler — with its own camera and
timing model, out of scope for a 2D map-beat sheet set). Do not treat this set as complete. If
your story genuinely needs it, the same harvesting method applies: read the source engine's
conformance rules and component for that type, and write the sheet before you write the beat.
