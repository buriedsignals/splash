import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";

// INTERACTIVE=1 → single-file embeddable HTML with hover popup.
// CONFIG=path   → inject an arbitrary config JSON baked as __CONFIG__.
const interactive = process.env.INTERACTIVE === "1";
const outDir =
  process.env.BUILD_OUT ?? (interactive ? "dist/interactive" : "dist/static");
const injectedConfig = process.env.CONFIG
  ? JSON.parse(readFileSync(process.env.CONFIG, "utf8"))
  : null;

export default defineConfig({
  base: "./",
  plugins: [react(), ...(interactive ? [viteSingleFile()] : [])],
  define: {
    __INTERACTIVE__: JSON.stringify(interactive),
    __CONFIG__: JSON.stringify(injectedConfig),
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: interactive ? 100_000_000 : 4096,
    rollupOptions: {
      input: "index.html",
    },
  },
});
