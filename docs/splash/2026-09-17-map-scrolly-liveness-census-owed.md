# The map-scrolly liveness guard still censuses `archive/` only — 2026-09-17

`skills/splash/test/map-scrollys-are-live.test.ts` is green, and it is green over three pages.
Measured from a detached clean checkout of `main` at `09b8b663`: the corpus it is supposed to
speak for is twenty-four.

## What the guard covers today

Its population is discovered — the anti-vacuity case pins `MAP_SCROLLY_PAGES` against the tree, so
emptying the list reddens. But the discovery is rooted at `archive/`:

    /^archive\/map[a-z]*-?scrolly-[a-z0-9-]+\//

That regex matches the pre-reorganisation naming (`mapscrolly-…`, `mapmore-scrolly-…`) at the
location those beats were moved to. The corpus that ships is named the other way round —
`proof/scrolly-<type>-<subject>/renders/{creme,nocturne,rapport}.html` — so no current beat can
match, whatever it contains. Counted on the same checkout:

| set | pages | reach a MapTiler style | 3 core live markers | `warmCameras` | constructs a control |
| --- | --- | --- | --- | --- | --- |
| `archive/map*scrolly-*` (guarded) | 3 | 3 | 3 | 3 | 0 |
| `proof/scrolly-*` (unguarded) | 24 | 24 | 24 | **0** | 0 |

The three core markers are `api.maptiler.com/maps/`, `new win.maplibregl.Map` and the
`__MAPTILER_KEY__` placeholder. So the shipped corpus is in fact live, and this note records a
coverage hole, not a broken beat. The hole is the dangerous half: a scrolly map that quietly went
back to a baked plate would be caught in `archive/` and nowhere else.

## Why the regex was not simply widened here

The guard's fourth live marker is `warmCameras`, and no page under `proof/` has it. The two
implementations are genuinely different — `archive/` runs the legacy duplicated
`live-scroll-map.mjs`, which pre-warms each camera; the current producer
(`skills/scrolly/scripts/live-map-cards-bake.mjs`) does not. Widening the discovery root without
touching the markers turns the guard red on all twenty-four pages. Dropping `warmCameras` from
`LIVE_MARKERS`, or exempting the pages that lack it, weakens the guard for the three pages it does
hold today — which is the one move this audit is not allowed to make.

So the question is editorial, not regex: **does the current scrolly live map need to warm its
cameras, and if not, what is the equivalent call site that proves this implementation's map is
driven rather than decorative?** That is a call for whoever owns the scrolly producer.

## What is owed

1. Decide the marker for the current implementation — either `warmCameras` is restored to
   `live-map-cards-bake.mjs` (and the twenty-four pages re-baked), or a second, equally
   call-site-specific marker is named for it and the reason written into the guard's header.
2. Widen the discovery in `map-scrollys-are-live.test.ts` to both roots, keeping the archive marker
   set for archive pages and the new one for current pages — as two censuses, not one loosened set.
3. Mutate before shipping: baking one page without its live layer must redden, and so must adding
   a new map scrolly that nobody lists.

## Why it is recorded rather than done

Found during the clean-checkout audit of `main`, by asking what each guard's population actually
is rather than whether it passes. Every current page is live, so nothing is broken now; the fix
requires a decision about the producer that is not this audit's to take.
