import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";

// INTERACTIVE=1 -> single-file embeddable HTML with hover tooltip.
// otherwise     -> a plain static page (final frame), screenshotted to PNG.
// CHART=line|bar -> which chart mount.tsx renders. line keeps its original dist
// paths (dist/static, dist/interactive); other charts nest under dist/<chart>/.
// CONFIG=path    -> inject an arbitrary config JSON (the produce() path) instead of
//                   the committed sample; baked in as __CONFIG__ (null when unset).
const interactive = process.env.INTERACTIVE === "1";
const chart = process.env.CHART ?? "line";
const sub = interactive ? "interactive" : "static";
const outDir = chart === "line" ? `dist/${sub}` : `dist/${chart}/${sub}`;
const injectedConfig = process.env.CONFIG
  ? JSON.parse(readFileSync(process.env.CONFIG, "utf8"))
  : null;

export default defineConfig({
  base: "./",
  plugins: [react(), ...(interactive ? [viteSingleFile()] : [])],
  define: {
    __INTERACTIVE__: JSON.stringify(interactive),
    __CHART__: JSON.stringify(chart),
    __CONFIG__: JSON.stringify(injectedConfig),
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: interactive ? 100000000 : 4096,
  },
});
