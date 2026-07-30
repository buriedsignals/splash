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

(more cases below as runs complete — map-native, dw-chart, scrolly)

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
against a fixed box, or only the two contrast snaps eb81c1ee touched. See below.

## Could not run

(filled in as runs complete)
