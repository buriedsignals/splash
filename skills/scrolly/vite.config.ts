import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

const injectedConfig = process.env.CONFIG
  ? JSON.parse(readFileSync(process.env.CONFIG, "utf8"))
  : null;

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  define: { __CONFIG__: JSON.stringify(injectedConfig) },
  resolve: {
    // Force a single copy of React across all workspace sub-packages (e.g.
    // chart-native) that share the Vite build — prevents dual-React hook errors.
    dedupe: ["react", "react-dom"],
    alias: {
      react: resolve(here, "node_modules/react"),
      "react-dom": resolve(here, "node_modules/react-dom"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: "index.html" },
  },
});
