# Approved — beat 1, where the routes lead

Gate G3, closed 2026-08-21.

The artifact surfaced for the decision was the delivered page itself, opened in a real browser at
1600x900, 1280x800, 768x1024 and 375x812:

    open stories/stress-ab-emigration-flows/beats/1-where-the-routes-lead/renders/where-the-routes-lead.html

The question put was approve-or-correct on: does the picture prove the two things the storyboard's
`proves` names — the widest single ribbon, and Paris ahead of London once its three routes are
added — and does it survive being used (pointer, keyboard, script off, phone).

**Answer: approve.** What it was approved against:

- Both halves of the takeaway are readable with nothing hovered, focused or opened, at all four
  viewports (`verify-interaction.mjs`, section 3).
- Every ribbon and every destination answers for itself under a real pointer somewhere along its own
  length, and whatever answers answers truthfully for what the pointer is actually over — nine points
  per ribbon, thirteen surfaces, four viewports (section 1). This was NOT true of the first two
  builds and the driver is what found it.
- Every one of the thirteen takes keyboard focus and shows the same reading from focus alone
  (section 2).
- With JavaScript off: eight ribbons, eight arrowheads, twelve labels, thirteen native titles, the
  legend, the five-row arrivals table and the eight-row route table all still render (section 4).
- `graphicFillsItsFrame` 23.2% / 22.3% / 38.6% against this format's own 17.9% floor.
- `duplicatedPayload` none · `revealDashInScreenSpace` none · `plateMatchesGeometry` ok, drift 0.000
  at 2.00x · `plateFollowsGround` ground 0.009 / plate 0.018, same side · `pageLanguageMatchesStory`
  true.

**Re-approved 2026-08-21 against a second render** (`review-...-2`, replacing `-1`). The first
render declared its live-map container as `id="mw-live-map"`, matching the CLASS the format's CSS
uses; `live-map.mjs` looks for `id="mw-map"` and returns `null` without a word. That build shipped
with MapLibre parsed, the plan JSON present and the key substituted, and made ZERO network requests:
the reader would have got the baked plate forever, which is exactly the state ruling R1 overturned.
Found by counting the delivered page's own requests in a real browser. The live layer is now driven
and looked at: 13 requests to `api.maptiler.com`, a canvas, the fallback hidden, eight ribbons and
eight arrowheads painted, every label following the camera, MapTiler's own zoom control present.

**What was accepted as a known cost**, rather than fixed:

- The page is set in Helvetica/Arial, not one of the two faces `NEWSROOM.md` records. This format
  cannot reach a recorded typeface at all (`map-web/SKILL.md`, "The typeface"). Carried into the
  hand-over.
- The whole page is 44 CSS pixels taller than a 900px window, so the collapsed route table sits just
  below the fold. That offset is the format's own — its committed seed page measures the same 944px
  at the same viewport — and no arrangement of this beat's content changes it.
- The live ribbons have butt caps where the fallback's have round ones, because `line-cap` is a
  MapLibre LAYOUT property and this format's live-plan vocabulary carries `paint` only.
- At 375px the map is 180px across and the six origin names sit beside the cluster rather than on
  their own dots. The exact place of every origin is in that route's own reading and in the route
  table.
