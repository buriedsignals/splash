// Generic proof snap for a chart type (CHART env): static PNG (progress=1) +
// interactive PNG (focus the first data element → tooltip). Serves the static
// build over http (module scripts are blocked over file://); loads the
// single-file interactive directly. Writes into output-proof/<chart>/.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { chartDistSub } from "../src/build-paths.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "dot-strip";
// OUTDIR overrides the default proof folder (the produce() path writes elsewhere)
const outDir = process.env.OUTDIR ?? join(root, "output-proof", chart);
// SKIP_INTERACTIVE=1 → no interactive build exists to snap (the channel forbids the
// interactive format, or a single-format "static" produce never built it). SKIP_STATIC=1
// → no static build exists to snap (a single-format "interactive" produce — see
// produce.mjs's `case "interactive"` — never runs the static Vite build at all). At most
// one of the two is set by produce.mjs; both default to unset for the legacy/manual
// (both-builds) call shape this script originally supported.
const skipInteractive = process.env.SKIP_INTERACTIVE === "1";
const skipStatic = process.env.SKIP_STATIC === "1";
await mkdir(outDir, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
// Build-dir path comes from the SHARED helper (build-paths.ts) that vite.config.ts
// also uses — they cannot drift. Using `dist/<chart>/<sub>` unconditionally here (while
// vite special-cases `line` to `dist/<sub>`) served a STALE/missing build for line
// charts, so the injected CONFIG never reached the snap and a default sample rendered.
const distSub = (sub) => join(root, chartDistSub(chart, sub));

const browser = await chromium.launch();

// 1) STATIC — progress=1 page, screenshot the card. Skipped when SKIP_STATIC: the
// static dist doesn't exist (single-format interactive produce), so no server is even
// spun up for it.
if (!skipStatic) {
  const staticDist = distSub("static");
  const server = createServer(async (req, res) => {
    const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    try {
      const body = await readFile(join(staticDist, path));
      const ext = path.slice(path.lastIndexOf("."));
      res.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const sp = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
  await sp.goto(`http://localhost:${port}/`);
  await sp.waitForTimeout(900);
  await sp.locator("#root > div").screenshot({ path: join(outDir, "static.png") });
  console.log("wrote static.png");
  await sp.close();
  server.close();
} else {
  console.log("SKIP_STATIC=1 → skipped static.png (single-format produce is not static)");
}

// 2) INTERACTIVE — focus the first focusable data element → tooltip. Skipped when the
// channel forbids interactive, or the produce isn't building it (SKIP_INTERACTIVE): the
// interactive build doesn't exist.
if (!skipInteractive) {
  const ip = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
  await ip.goto(pathToFileURL(join(distSub("interactive"), "index.html")).href);
  await ip.waitForSelector("[tabindex]");
  await ip.waitForTimeout(1700); // let the reveal settle
  const hits = ip.locator("[tabindex]");
  const n = await hits.count();
  if (n === 0) throw new Error("no focusable data element found");
  await hits.nth(0).focus();
  await ip.waitForSelector(".tooltip", { timeout: 3000 });
  const tip = await ip.locator(".tooltip").textContent();
  console.log("tooltip text:", tip);
  await ip.waitForTimeout(150);
  await ip.screenshot({ path: join(outDir, "interactive.png") });
  console.log("wrote interactive.png");
  await ip.close();
} else {
  console.log("SKIP_INTERACTIVE=1 → skipped interactive.png (channel forbids interactive)");
}

await browser.close();
