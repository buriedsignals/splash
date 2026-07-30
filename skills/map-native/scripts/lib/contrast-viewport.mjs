// The window the map-native furniture-contrast snap (../snap-contrast.mjs) must open for
// the "static" MODE: the SAME channel-exact CSS box snap-static.mjs already renders
// static.png at (MAP_WIDTH/MAP_HEIGHT, threaded by produce.mjs from renderSize(channel) —
// skills/splash/src/channel.ts). Mirrors chart-native's scripts/lib/snap-viewport.mjs.
//
// Unlike chart-native's SVG chart, the map app's CSS fills 100vw/100vh — it is NOT a
// fixed-size card independent of the viewport (skills/map-native/dist/*/index.html always
// lays out `width:100%; height:100vh`). So opening a viewport that doesn't match the
// channel means this guard checks an ENTIRELY DIFFERENT layout than what static.png
// actually shipped — confirmed live: a social-vertical (1080x1920 portrait) symbol produce
// opened at the old hardcoded 1200x700 rendered a landscape choropleth-shaped page instead
// (debug capture output-proof/contrast/contrast-static.png came back 2400x1400 — the fixed
// box @2x, not the delivered portrait shape), and `page.screenshot()` — viewport-clipped,
// no `fullPage` — silently dropped any furniture below y=700. The guard still reported "0
// violations": a FALSE NEGATIVE (it never looked at the real furniture), the mirror image
// of chart-native's `elementsFromPoint`-outside-viewport FALSE POSITIVE (that one reports a
// failure that isn't real; this one stays silently green because it isn't looking).
//
// deviceScaleFactor:1 when channel-sized so the viewport IS the final delivered pixel box
// (matches snap-static.mjs's own reasoning — no 2x-rounding surprise). Manual/no-env runs
// (mapWidth/mapHeight absent — e.g. `bun scripts/snap-contrast.mjs` per SKILL.md, or MODE
// "interactive", which produce.mjs never threads MAP_WIDTH/MAP_HEIGHT for since the
// interactive format has no fixed per-channel box — interactiveAspect is "responsive")
// keep the historical 1200x700 @2x, byte-identical.
export function contrastViewportFor(mapWidth, mapHeight) {
  const hasChannelSize = mapWidth && mapHeight;
  const viewport = hasChannelSize
    ? { width: Number(mapWidth), height: Number(mapHeight) }
    : { width: 1200, height: 700 };
  const deviceScaleFactor = hasChannelSize ? 1 : 2;
  return { viewport, deviceScaleFactor };
}
