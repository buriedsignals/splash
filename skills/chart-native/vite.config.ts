import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// INTERACTIVE=1 -> single-file embeddable HTML with hover tooltip.
// otherwise     -> a plain static page (final frame), screenshotted to PNG.
// CHART=line|bar -> which chart mount.tsx renders. line keeps its original dist
// paths (dist/static, dist/interactive); other charts nest under dist/<chart>/.
const interactive = process.env.INTERACTIVE === "1";
const chart = process.env.CHART ?? "line";
const sub = interactive ? "interactive" : "static";
const outDir = chart === "line" ? `dist/${sub}` : `dist/${chart}/${sub}`;

export default defineConfig({
  base: "./",
  plugins: [react(), ...(interactive ? [viteSingleFile()] : [])],
  define: {
    __INTERACTIVE__: JSON.stringify(interactive),
    __CHART__: JSON.stringify(chart),
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: interactive ? 100000000 : 4096,
  },
});
