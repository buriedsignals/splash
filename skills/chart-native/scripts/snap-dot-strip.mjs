// One-off proof snap for the dot strip: static PNG (progress=1) + interactive
// PNG (focus a strip → tooltip). Serves the static build over http (module
// scripts are blocked over file://); loads the single-file interactive directly.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "output-proof", "dot-strip");
await mkdir(outDir, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const staticDist = join(root, "dist/dot-strip/static");
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

const browser = await chromium.launch();

// 1) STATIC — progress=1 page, screenshot the card
const sp = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
await sp.goto(`http://localhost:${port}/`);
await sp.waitForTimeout(800);
await sp.locator("#root > div").screenshot({ path: join(outDir, "static.png") });
console.log("wrote static.png");
await sp.close();

// 2) INTERACTIVE — focus a strip's hit group → tooltip, screenshot full page
const ip = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
await ip.goto(pathToFileURL(join(root, "dist/dot-strip/interactive/index.html")).href);
await ip.waitForSelector("[tabindex]");
await ip.waitForTimeout(1700); // let the reveal settle
const hits = ip.locator("g[tabindex]");
const n = await hits.count();
if (n === 0) throw new Error("no focusable strip groups found");
await hits.nth(0).focus();
await ip.waitForSelector(".tooltip", { timeout: 3000 });
const tip = await ip.locator(".tooltip").textContent();
console.log("tooltip text:", tip);
await ip.waitForTimeout(150);
await ip.screenshot({ path: join(outDir, "interactive.png") });
console.log("wrote interactive.png");
await ip.close();

await browser.close();
server.close();
