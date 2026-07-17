// produce.mjs — image-native's single-format entry, the same CLI contract as the other
// engines (splash adapters SCRIPT table: <config> <outDir> <format>).
//
//   bun scripts/produce.mjs <image-story.json> <outDir> scrolly
//     1. checkImageConformance(story, { format }) — fail-hard, violations on stderr
//     2. prep-images.mjs → <outDir>/frames/<id>.jpg + prep-report.json (deterministic)
//     3. skills/scrolly/scripts/produce.mjs with the assembled visual:"image" config
//        (the scrolly build inlines the frames as data URIs → ONE self-contained html)
//     4. asserts <outDir>/scrolly.html exists non-empty
//
// v1 builds "scrolly" ONLY (2026-07-16 decision — narrower than the spec's
// static+video+scrolly grid): any other format exits 1 with the v1 message. The
// conformance format floors for static/video already exist in image-story.ts and stay.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkImageConformance } from "../src/image-story.ts";

const here = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = join(here, "..");
const SCROLLY_DIR = resolve(SKILL_ROOT, "../scrolly");

const storyPath = process.argv[2];
const outDir = process.argv[3];
const format = process.argv[4];
if (!storyPath || !outDir || !format) {
  console.error("usage: produce.mjs <image-story.json> <outDir> <format>");
  process.exit(1);
}
if (format !== "scrolly") {
  console.error(
    'image-native builds "scrolly" only in v1 — static/video are follow-ups',
  );
  process.exit(1);
}

const story = JSON.parse(readFileSync(storyPath, "utf8"));

// 1. Conformance — fail-hard BEFORE any work (spec §6; the scrolly floor is 3–6 frames).
const violations = checkImageConformance(story, { format: "scrolly" });
if (violations.length) {
  console.error("image story failed conformance:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// 2. Deterministic prep — frames normalized to ONE box in <outDir>/frames.
execFileSync("bun", [join(here, "prep-images.mjs"), storyPath, outDir], {
  stdio: ["ignore", "inherit", "inherit"],
  cwd: SKILL_ROOT,
});

// 3. The scrolly build. The config mirrors the other tracks' furniture seams
// (source/lang/themeBg at top level) and points at the prepped frames; the scrolly
// produce step inlines them into the single-file html.
const scrollyConfig = {
  visual: "image",
  story,
  framesDir: resolve(outDir, "frames"),
  title: story.title,
  description: story.description,
  source: story.source,
  ...(story.lang ? { lang: story.lang } : {}),
  ...(story.themeBg ? { themeBg: story.themeBg } : {}),
};
const tmp = mkdtempSync(join(tmpdir(), "image-native-scrolly-"));
const configPath = join(tmp, "config.json");
writeFileSync(configPath, JSON.stringify(scrollyConfig, null, 2));

execFileSync("bun", [join(SCROLLY_DIR, "scripts", "produce.mjs"), configPath, outDir], {
  stdio: ["ignore", "inherit", "inherit"],
  cwd: SCROLLY_DIR,
});

// 4. The delivered artifact must actually exist, non-empty — never a silent no-op.
const html = join(outDir, "scrolly.html");
if (!existsSync(html) || statSync(html).size === 0) {
  console.error(`scrolly build reported success but ${html} is missing or empty`);
  process.exit(1);
}
console.log("PRODUCE_RESULT " + JSON.stringify({ scrolly: html }));
