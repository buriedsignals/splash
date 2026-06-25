// Static format proof: render the built page (progress=1) and screenshot to PNG.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chart === "line" ? "dist/static" : `dist/${chart}/static`);
const marker =
  chart === "bar" ? ".bar" : chart === "scatter" ? ".scatter-dot" : chart === "pie" ? ".pie-slice" : chart === "stacked" ? ".stack-seg" : chart === "slope" ? ".slope-line" : ".series-line";
const out = process.argv[2] ?? "/tmp/native-static.png";

// module scripts get crossorigin -> blocked over file://. Serve over http.
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer(async (req, res) => {
  const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const body = await readFile(join(dist, path));
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
const page = await browser.newPage({
  viewport: { width: 900, height: 560 },
  deviceScaleFactor: 2,
});
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector(marker);
await page.locator("#root > div").screenshot({ path: out });
await browser.close();
server.close();
console.log("Wrote", out);
