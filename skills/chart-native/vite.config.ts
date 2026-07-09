import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";
import { chartDistSub } from "./src/build-paths";
import { renderSize, type Channel } from "../atelier/src/channel";

// INTERACTIVE=1 -> single-file embeddable HTML with hover tooltip.
// otherwise     -> a plain static page (final frame), screenshotted to PNG.
// CHART=line|bar -> which chart mount.tsx renders. line keeps its original dist
// paths (dist/static, dist/interactive); other charts nest under dist/<chart>/.
// CONFIG=path    -> inject an arbitrary config JSON (the produce() path) instead of
//                   the committed sample; baked in as __CONFIG__ (null when unset).
// ATELIER_CHANNEL -> the distribution channel this deliverable targets (default
//                   article-web — back-compat, matches normalizeChannel's default).
//                   Sizes the injected-config STATIC canvas via __MEDIA_W__/
//                   __MEDIA_H__ (read at mount.tsx:~166).
const interactive = process.env.INTERACTIVE === "1";
const chart = process.env.CHART ?? "line";
const sub = interactive ? "interactive" : "static";
const outDir = chartDistSub(chart, sub);
const injectedConfig = process.env.CONFIG
  ? JSON.parse(readFileSync(process.env.CONFIG, "utf8"))
  : null;

const rawChannel = process.env.ATELIER_CHANNEL ?? "article-web";
const channel: Channel =
  rawChannel === "social-vertical" ||
  rawChannel === "social-feed" ||
  rawChannel === "article-web"
    ? rawChannel
    : "article-web";
const media = renderSize(channel);
// scripts/snap-proof.mjs screenshots the static build's rendered element at
// deviceScaleFactor:2 (retina) — whatever CSS canvas size the chart component
// declares comes out DOUBLED in the exported PNG. Halve here so the produced
// static.png lands on renderSize(channel) (== CHANNELS[channel].mediaSize).
// Math.round (not raw division) because article-web's height (675) is odd —
// a fractional CSS px (337.5) would leave the final pixel size at the mercy of
// the browser's own sub-pixel rounding; rounding here keeps it deterministic
// (338 × 2 = 676, exactly 1px off 675 — the nearest reachable even pixel size).
const STATIC_DEVICE_SCALE = 2;

export default defineConfig({
  base: "./",
  plugins: [react(), ...(interactive ? [viteSingleFile()] : [])],
  define: {
    __INTERACTIVE__: JSON.stringify(interactive),
    __CHART__: JSON.stringify(chart),
    __CONFIG__: JSON.stringify(injectedConfig),
    __MEDIA_W__: JSON.stringify(Math.round(media.width / STATIC_DEVICE_SCALE)),
    __MEDIA_H__: JSON.stringify(Math.round(media.height / STATIC_DEVICE_SCALE)),
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: interactive ? 100000000 : 4096,
  },
});
