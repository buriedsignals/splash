#!/usr/bin/env bun
// Does the DELIVERED tree actually produce? Packaging is only correct if a visual comes out of
// .dist/ — on this project only the delivered artifact settles anything.
//
// Not in the gate: it packs, installs and renders for real. Run it by hand when the packer,
// the exclusion list or an engine's dependencies change.
//
//   bun scripts/verify-dist-produce.mjs
//
// Two questions the design left to this run rather than to reasoning (see docs/installer/
// claude-desktop-findings.md for the answers this run recorded):
//   1. does the per-engine package.json left in <dist>/skills/<engine>/ disturb dependency
//      resolution from <dist>/node_modules?
//   2. is map-native/remotion/ enough to render VIDEO from the delivered tree?
import { execFileSync } from "node:child_process";
import { mkdtempSync, existsSync, statSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const repo = process.cwd();
const dist = mkdtempSync(join(tmpdir(), "splash-dist-"));
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: process.env });

// Source the MapTiler keys from the repo-root .env exactly like every engine's own produce.mjs
// does (see skills/map-native/scripts/produce.mjs, and skills/splash/scripts/verify-source-
// bundle.mjs's own copy of this fallback): bun/vite/remotion only auto-load a `.env` from the
// process's cwd, and nothing guarantees this script is invoked from the repo root. Loaded here,
// once, into THIS process's env — inherited by every child below via `env: process.env`. Never
// hardcoded, never logged, and never written into the packed tree (a delivered tree carries no
// secret — the installer writes a fresh .env into an install, this script fakes that one step
// by keeping the key in-process instead).
function loadEnvKey(name) {
  if (process.env[name]) return;
  try {
    const lines = readFileSync(join(repo, ".env"), "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(new RegExp(`^${name}\\s*=\\s*(.+)$`));
      if (m) {
        process.env[name] = m[1].trim();
        break;
      }
    }
  } catch {
    // .env absent/unreadable — the video check below reports this plainly and skips.
  }
}
loadEnvKey("VITE_MAPTILER_KEY");
loadEnvKey("REMOTION_MAPTILER_KEY");
// The two ALWAYS hold the same MapTiler key (Vite only exposes VITE_-prefixed vars to the web
// bundle, Remotion only REMOTION_-prefixed vars to the video composition) — mirrors map-native's
// own produce.mjs fallback so a .env carrying just one of the two still works here.
process.env.REMOTION_MAPTILER_KEY ||= process.env.VITE_MAPTILER_KEY;
process.env.VITE_MAPTILER_KEY ||= process.env.REMOTION_MAPTILER_KEY;

const producedFiles = [];
const recordProduced = (path) => {
  const bytes = statSync(path).size;
  producedFiles.push({ path, bytes });
  console.log(`OK — ${path} (${bytes} bytes) produced from ${dist}`);
};

try {
  console.log("-> packing");
  run("bun", [join(repo, "scripts/pack-skills.mjs"), repo, dist], repo);

  console.log("-> installing the merged dependencies");
  run("bun", ["install"], dist);

  // The cheapest engine that renders a real file: a chart-native static PNG needs no network
  // key. The CLI takes <type> <config> <outDir> <format> — the type comes FIRST
  // (produce.mjs:68-73). Note: the TYPE is "bar" (not "bars" — "bars" is the sample-data
  // filename, bars.json; produce.mjs's own known-type list has no "bars").
  const chartOut = mkdtempSync(join(tmpdir(), "splash-distout-"));
  const chartConfig = join(dist, "skills/chart-native/assets/sample-data/bars.json");
  console.log("-> producing a static chart from the delivered tree");
  run(
    "bun",
    [join(dist, "skills/chart-native/scripts/produce.mjs"), "bar", chartConfig, chartOut, "static"],
    dist,
  );

  const png = join(chartOut, "static.png");
  if (!existsSync(png) || statSync(png).size < 5_000)
    throw new Error(`no usable PNG at ${png} — the delivered tree cannot produce`);
  recordProduced(png);

  // Question 2: is map-native/remotion/ enough to render VIDEO from the delivered tree? Unlike
  // the static chart above, this needs a live MapTiler key + a real headless-Chrome render —
  // skip it plainly (not a silent pass) when the key never made it into process.env, rather
  // than claim a video was proven when it was not attempted.
  if (!process.env.VITE_MAPTILER_KEY || !process.env.REMOTION_MAPTILER_KEY) {
    console.error(
      "SKIPPED video check — VITE_MAPTILER_KEY/REMOTION_MAPTILER_KEY not found (not in env, " +
        "not in repo-root .env). Static produce PASSED; video from the delivered tree is " +
        "UNPROVEN this run, not failed.",
    );
  } else {
    const mapOut = mkdtempSync(join(tmpdir(), "splash-distout-video-"));
    const mapConfig = join(dist, "skills/map-native/assets/sample-data/symbol.json");
    console.log("-> producing a map-native video from the delivered tree (slow: real render)");
    run(
      "bun",
      [join(dist, "skills/map-native/scripts/produce.mjs"), mapConfig, mapOut, "video"],
      dist,
    );

    const mp4 = join(mapOut, "landscape.mp4");
    if (!existsSync(mp4) || statSync(mp4).size < 50_000)
      throw new Error(
        `no usable mp4 at ${mp4} — map-native/remotion cannot render video from the delivered tree`,
      );
    recordProduced(mp4);
  }

  console.log(`\nverify-dist-produce: PASSED (${producedFiles.length} artifact(s) produced).`);
} finally {
  // The packed tree carries a full node_modules install (hundreds of packages) — large, and
  // repeated runs would accumulate them under the OS temp dir. The produced-artifact dirs
  // (chartOut/mapOut) are tiny by comparison and already logged above; remove the whole thing.
  rmSync(dist, { recursive: true, force: true });
}
