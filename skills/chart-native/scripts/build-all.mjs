// Build the two web outputs (interactive single-file + static page).
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const opts = { stdio: "inherit", cwd: root };
execSync("INTERACTIVE=1 bunx vite build", opts);
execSync("bunx vite build", opts);
console.log("Built dist/interactive/index.html + dist/static/index.html");
