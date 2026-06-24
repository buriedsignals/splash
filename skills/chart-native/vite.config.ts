import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// INTERACTIVE=1 -> single-file embeddable HTML with hover tooltip.
// otherwise     -> a plain static page (final frame), screenshotted to PNG.
const interactive = process.env.INTERACTIVE === "1";

export default defineConfig({
  base: "./",
  plugins: [react(), ...(interactive ? [viteSingleFile()] : [])],
  define: { __INTERACTIVE__: JSON.stringify(interactive) },
  build: {
    outDir: interactive ? "dist/interactive" : "dist/static",
    emptyOutDir: true,
    assetsInlineLimit: interactive ? 100000000 : 4096,
  },
});
