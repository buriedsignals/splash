import { afterAll, describe, expect, it } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-proportional-symbol web (12B, 2026-11-14, i13): the page was right — replayed twice it framed Europe —
// but renders/*.png showed the whole world, Europe a third of its width. verify-web photographs
// fit-1920x950 straight after resizing one page from 3440x900, waiting for "load" only; with the 12B
// holding the CPU the live camera had not re-fitted yet. The review picture lied, to the craft and to us.

const HARNESS = resolve(import.meta.dirname, "..");
const KIT = join(
  HARNESS,
  "craft",
  "web",
  "proportional-symbol-symbol-bubble-map",
);
const SHARED = join(HARNESS, "craft", "_shared");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const PAGE = join(
  BENCH,
  "stories",
  "zz-replay-a",
  "beats",
  "1",
  "renders",
  "creme-creme-the-newsroom.html",
);
const ENV = "/Users/rmdms/Sites/Professional/splash/sp1/.env";
const dir = join(BENCH, "stories", `zz-desktop-shot-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function mapTilerKey() {
  if (!existsSync(ENV)) return "";
  const line = readFileSync(ENV, "utf8")
    .split("\n")
    .find((l) => /^(VITE_|REMOTION_)?MAPTILER_KEY=/.test(l));
  return line
    ? line
        .slice(line.indexOf("=") + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    : "";
}

// The page as verify-web can leave it: fitted for another box (a phone's here, so the two fits differ), then resized to 1920x950 while `mw-live` was not yet
// set, so neither its ResizeObserver nor MapLibre's "resize" re-fitted it.
function shoot() {
  const at = join(dir, "beats", "1");
  mkdirSync(at, { recursive: true });
  for (const f of readdirSync(SHARED)) cpSync(join(SHARED, f), join(at, f), { recursive: true });
  for (const f of readdirSync(KIT)) cpSync(join(KIT, f), join(at, f), { recursive: true });
  const keyed = join(at, "page.local.html");
  writeFileSync(keyed, readFileSync(PAGE, "utf8").split("__MAPTILER" + "_KEY__").join(mapTilerKey()));
  const out = join(at, "fit-1920x950.png");
  const script = join(at, "shoot.mjs");
  writeFileSync(
    script,
    `import puppeteer from "puppeteer-core";
import { resolveChrome } from "#shared/design-base/chrome.mjs";
import { shootFitted } from "./map-web.mjs";
const browser = await puppeteer.launch({ headless: "new", executablePath: resolveChrome(), args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
  await page.goto("file://" + ${JSON.stringify(keyed)}, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), { timeout: 120000 });
  await page.evaluate(() => document.documentElement.classList.remove("mw-live"));
  await page.setViewport({ width: 1920, height: 950, deviceScaleFactor: 1 });
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => document.documentElement.classList.add("mw-live"));
  console.log("RESULT " + JSON.stringify(await shootFitted(page, ${JSON.stringify(out)})));
} finally {
  await browser.close();
}
`,
  );
  const run = Bun.spawnSync(["bun", script], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
  const line = `${run.stdout}`.split("\n").find((l) => l.startsWith("RESULT "));
  if (!line) throw new Error(`${run.stdout}${run.stderr}`.slice(-1500));
  return JSON.parse(line.slice(7));
}

describe.skipIf(
  !existsSync(join(BENCH, "package.json")) ||
    !existsSync(PAGE) ||
    !mapTilerKey(),
)("the desktop review picture of a live map", () => {
  it("should photograph the camera fitted for 1920x950 when the page kept a stale fit", () => {
    const r = shoot();
    // Measured on a fresh 1920x950 load of the same page: the camera fitStudy gives that window.
    expect(r.view).toBe("8.5000,54.3562@2.859");
  }, 240_000);

  it("should report the stale camera it found", () => {
    expect(shoot().stale).not.toBeNull();
  }, 240_000);
});
