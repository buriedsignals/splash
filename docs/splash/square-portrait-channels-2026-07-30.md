# Square (social-feed) and portrait (social-vertical) channels — first end-to-end measurement pass

Measurement pass, 2026-07-30. Family C reopened `social-vertical` (the conformance guard
`checkSymbolConformance` is now wired) but flagged, in its own closing summary: "the canal is
reopened mechanically, but no render pass has walked a real square/portrait pin end to end."
This is that pass. `article-web` (landscape) has been exercised extensively; `social-vertical`
(1080x1920 portrait) and `social-feed` (1080x1080 square) had never been driven end to end
before this document.

Declared pins (`lib/core/channel-policy.ts`):
- `social-vertical`: 1080x1920, formats allowed = static, video only (no interactive, no scrolly)
- `social-feed`: 1080x1080, formats allowed = static, video only (no interactive, no scrolly)
- `article-web` (reference): 1200x675, formats allowed = static, interactive, video, scrolly

Method: real producer CLIs (`bun scripts/produce.mjs ...`) with `SPLASH_CHANNEL` set, exactly as
`produce-all` invokes them. Every dimension below is read from the delivered file (PNG IHDR
bytes, or `ffprobe`/frame extraction for video) — never from a log line.

## Cases

| # | Engine | Type | Format | Channel | Requested | Measured | Verdict |
|---|--------|------|--------|---------|-----------|----------|---------|
| 1 | chart-native | bar | static | social-vertical | 1080x1920 | 1080x1920 (PNG IHDR) | match |
| 2 | chart-native | bar | static | social-feed | 1080x1080 | 1080x1080 (PNG IHDR) | match |
| 3 | chart-native | heatmap | static | social-vertical | 1080x1920 | 1080x1920 (PNG IHDR) | match — tall fixture (58 text labels), snap-contrast passed 0 violations, no false positive |
| 4 | chart-native | bar | video | social-vertical | 1080x1920 | 1080x1920 (`ffprobe`) | match |
| 5 | chart-native | line | video | social-feed | 1080x1080 | 1080x1080 (`ffprobe`) | match |
| 6 | chart-native | bar | interactive | social-vertical | n/a (must be refused) | refused: `format "interactive" is not allowed for channel "social-vertical"` | correct fail-closed behavior |
| 7 | map-native | symbol | static | social-vertical | 1080x1920 | 1080x1920 (PNG IHDR) — the delivered `static.png` was always correct | match, BUT see defect below: the guard that is supposed to verify this rendered the wrong geometry |

| 8 | map-native | choropleth | static | social-feed | 1080x1080 | 1080x1080 (PNG IHDR) | match; snap-contrast (post-fix) 10 labels, 0 violations |
| 9 | map-native | choropleth | video | social-vertical | 1080x1920 | 1080x1920 (`ffprobe`) | match |
| 10 | map-native | symbol | video | social-feed | 1080x1080 | 1080x1080 (`ffprobe`) | match |
| 11 | map-native | symbol | scrolly | social-vertical | n/a (must be refused) | refused: `format "scrolly" is not built by map-native — dispatch to the "scrolly" producer` | correct — routes to skills/scrolly instead |
| 12 | map-native | symbol | interactive | social-feed | n/a (must be refused) | refused: `format "interactive" is not allowed for channel "social-feed"` | correct fail-closed behavior |

(more cases below as runs complete — dw-chart, scrolly)

## Defects found

### Known false positive — status: NOT reproduced, already fixed on this branch's ancestry

The `elementsFromPoint`-outside-viewport contrast false positive described in the task
(`snap-*-contrast` reading "white background" below y=560 on tall/portrait renders) is described,
in the past tense, by `skills/chart-native/scripts/lib/snap-viewport.mjs`'s own header comment as
an already-fixed bug: commit `eb81c1ee` ("fix(chart-native): contrast snaps open the channel's
window instead of a constant 900x560", 2026-07-29) added `snapViewportFor(channel)` and wired it
into both `snap-contrast.mjs` (static) and `snap-interactive-contrast.mjs`. That commit is an
ancestor of this branch's base (`dd388574` on `main`) — it landed before this measurement pass
started, not during it.

Case 3 above is the reproduction the task asked for (a genuinely tall portrait render, 1080x1920,
with 58 on-page text labels, several below the historical 560px cutoff) and it comes back clean:
`snap-contrast` correctly samples the real background at every label and reports 0 violations, 0
false positives. So for **chart-native static**, the bug is confirmed fixed, not confirmed present.

Open question carried to Phase 3: whether the fix reaches every snap that samples pixels/DOM
against a fixed box, or only the two contrast snaps eb81c1ee touched. Answer: no — see below,
map-native's own furniture-contrast guard had the SAME class of bug, unfixed, and worse in kind.

### Real defect, FIXED in this pass — map-native's static contrast guard checked the wrong geometry entirely

`skills/map-native/scripts/snap-contrast.mjs` always opened a **fixed 1200x700 viewport**
(landscape) and took a `page.screenshot()` (viewport-clipped, no `fullPage`), completely
ignoring `SPLASH_CHANNEL`/`MAP_WIDTH`/`MAP_HEIGHT` — unlike its sibling `snap-static.mjs`,
which already threads the channel's exact box (that's how `static.png` itself came out
correctly-sized in case 7). Unlike chart-native's chart, the map app's CSS lays out
`width:100%; height:100vh` — it is **not** a fixed-size card independent of the viewport — so
opening the guard at 1200x700 doesn't just crop a tall page, it renders a **different layout
altogether**.

Evidence (case 7, symbol map, social-vertical, before the fix): the guard's own debug capture
(`skills/map-native/output-proof/contrast/contrast-static.png`, not committed) came back
**2400x1400** (the fixed 1200x700 box at its hardcoded deviceScaleFactor 2) — a landscape
choropleth-shaped page — while the channel's real delivered `static.png` was 1080x1920 portrait
with circle symbols. The guard reported "7 furniture labels checked, 0 violations" — checked
against furniture that was never actually delivered.

This is the mirror image of the chart-native bug the task named, and worse in kind: chart-native's
`elementsFromPoint` bug produced a **false positive** — a loud failure on a real deliverable,
impossible to miss. This one is a **false negative** — a guard that stays green because it never
looked at the real render at all. Confirmed live, not inferred from a comment.

**Fixed** (`c8d10540`): extracted `contrastViewportFor(mapWidth, mapHeight)` into
`skills/map-native/scripts/lib/contrast-viewport.mjs` (mirrors chart-native's
`snap-viewport.mjs`) and threaded `MAP_WIDTH`/`MAP_HEIGHT` into the static-case
`snap-contrast.mjs` call in `produce.mjs`, exactly as `snap-static.mjs` already receives them.
Re-running case 7 after the fix: the debug capture now comes back **1080x1920** — the real
delivered geometry — and the guard still reports 0 violations (the map's real furniture is
legible; this was never a live contrast defect, only an unverified one). `MODE=interactive` is
untouched (no fixed per-channel box exists for it — `interactiveAspect` is `"responsive"`, and
`produce.mjs` never threads `MAP_WIDTH`/`MAP_HEIGHT` for that call), so manual/no-env runs and
the interactive guard keep the historical 1200x700 @2x byte-identical.

Mutation proof: `skills/map-native/tests/contrast-viewport.test.ts`, 4 tests. Reverting
`contrastViewportFor` to always return the fixed 1200x700 box reddens 1/4 (the test asserting the
channel-sized box for a 1080x1920/1080x1080 input); restoring the fix returns 4/4 green. Full
`skills/map-native` suite after the fix: 901 pass / 0 fail / 6 skip (skips are a pre-existing,
unrelated `VITE_MAPTILER_KEY not set` guard in one live-e2e test file when `bun test` is run
without the root `.env` loaded — environmental, not caused by this change).

## Could not run

(filled in as runs complete)
