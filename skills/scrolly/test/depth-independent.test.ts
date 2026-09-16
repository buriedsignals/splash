import { describe, expect, it } from "bun:test";
import {
  defaultLanguage,
  depthIndependentPaths,
  languageAwareNumbers,
  missingAssetsMessage,
  paletteRefusalMessage,
  readNewsroomBasics,
  requiredLocalAssets,
} from "../scripts/depth-independent.mjs";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * THE SCAFFOLD'S OWN COPY IS MADE DEPTH-INDEPENDENT, LANGUAGE-AWARE, AND REFUSES LOUDLY WHEN A PREREQUISITE IS
 * MISSING — pure-function tests for `skills/scrolly/scripts/depth-independent.mjs`, which the two scaffolds
 * (`scaffold-scrolly-beat.mjs`, `scaffold-scrolly-map-beat.mjs`) run over every worked example they adapt. See
 * `.superpowers/sdd/2026-09-16-scrolly-any-subject/cold-run-5-friction.md`.
 */

const RUNNER_HEAD = [
  'import { readdirSync } from "node:fs";',
  'import { dirname, join } from "node:path";',
  'import { fileURLToPath } from "node:url";',
  'import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";',
  'import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";',
  "",
  "const HERE = dirname(fileURLToPath(import.meta.url));",
  'const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");',
].join("\n");

const COMPONENT_HEAD = [
  'import type { CSSProperties } from "react";',
  "import {",
  "  CardImages,",
  "  noScriptCss,",
  '} from "../../skills/scrolly/scripts/live-map-cards.mjs";',
  "",
  "export function Widget() { return null; }",
].join("\n");

describe("depthIndependentPaths — the runner's own DIRECTIONS constant and skills/scrolly imports", () => {
  it("should replace the depth-counted DIRECTIONS constant with a splashRoot()-derived one", () => {
    const out = depthIndependentPaths(RUNNER_HEAD);
    expect(out).toContain(
      'const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");',
    );
    expect(out).not.toContain('join(HERE, "..", "..", "docs"');
  });

  it("should insert exactly one splashRoot() walk-up, anchored right after HERE", () => {
    const out = depthIndependentPaths(RUNNER_HEAD);
    expect(out.match(/function splashRoot\(/g)?.length).toBe(1);
    expect(out).toContain("const ROOT = splashRoot(HERE);");
    expect(out.indexOf("function splashRoot(")).toBeGreaterThan(
      out.indexOf("const HERE ="),
    );
  });

  it("should turn a static ../../skills/scrolly/scripts import into a dynamic one built from ROOT, at any depth", () => {
    const twoLevels = RUNNER_HEAD;
    const fourLevels = RUNNER_HEAD.replace(
      /\.\.\/\.\.\/skills/g,
      "../../../../skills",
    );
    for (const src of [twoLevels, fourLevels]) {
      const out = depthIndependentPaths(src);
      expect(out).not.toMatch(/from "(?:\.\.\/)+skills\/scrolly\/scripts/);
      expect(out).toContain(
        'const { renderScrolly } = await import(join(ROOT, "skills", "scrolly", "scripts", "render-scrolly.mjs"));',
      );
      expect(out).toContain(
        'const { openLiveMapCards, renderWithCardImages } = await import(join(ROOT, "skills", "scrolly", "scripts", "live-map-cards-bake.mjs"));',
      );
    }
  });

  it("should add existsSync/readFileSync to the existing node:fs import rather than a second one", () => {
    const out = depthIndependentPaths(RUNNER_HEAD);
    expect(out.match(/from "node:fs";/g)?.length).toBe(1);
    expect(out).toMatch(
      /import \{ existsSync, readFileSync, readdirSync \} from "node:fs";/,
    );
  });

  it("should build the whole HERE/splashRoot/ROOT harness from scratch for a component with no HERE yet, keeping a multi-line import clause intact", () => {
    const out = depthIndependentPaths(COMPONENT_HEAD);
    expect(out).toContain(
      "const HERE = dirname(fileURLToPath(import.meta.url));",
    );
    expect(out).toContain("const ROOT = splashRoot(HERE);");
    expect(out).toContain(
      'const { CardImages, noScriptCss } = await import(join(ROOT, "skills", "scrolly", "scripts", "live-map-cards.mjs"));',
    );
    expect(out).not.toMatch(/from "(?:\.\.\/)+skills\/scrolly\/scripts/);
  });

  it("should leave content with neither pattern untouched", () => {
    const plain =
      'export function plan() { return { a: 1 }; }\nimport { x } from "./y.mjs";\n';
    expect(depthIndependentPaths(plain)).toBe(plain);
  });
});

describe("languageAwareNumbers — an honestly-named formatter replaces the hardcoded French decimal", () => {
  const FRENCH_TSX =
    'const s = counter.value.toFixed(1).replace(".", ",");\nconst t = (target * clamp(value * 2)).toFixed(1).replace(".", ",");\n';

  it("should replace every X.toFixed(N).replace('.', ',') with a call to the target language's own formatter", () => {
    const out = languageAwareNumbers(FRENCH_TSX, "en", { typed: true });
    expect(out).toContain("en(counter.value, 1)");
    expect(out).toContain("en((target * clamp(value * 2)), 1)");
    expect(out).not.toContain('.replace(".", ",")');
  });

  it("should define the formatter honestly: delegates to Intl.NumberFormat, locale matches the name", () => {
    const out = languageAwareNumbers(FRENCH_TSX, "en", { typed: true });
    expect(out).toMatch(
      /function en\(value: number, decimals = 1\): string \{/,
    );
    expect(out).toContain('new Intl.NumberFormat("en-GB"');
  });

  it("should emit a plain (untyped) signature for a .mjs driver, not a TypeScript one", () => {
    const out = languageAwareNumbers(FRENCH_TSX, "fr", { typed: false });
    expect(out).toContain("function fr(value, decimals = 1) {");
    expect(out).not.toContain(": number");
  });

  it("should align a bare lang literal to the same target language", () => {
    const out = languageAwareNumbers('lang: "fr",', "en");
    expect(out).toContain('lang: "en",');
  });

  it("should leave content with neither pattern untouched", () => {
    const plain = "const x = 1;\n";
    expect(languageAwareNumbers(plain, "en")).toBe(plain);
  });
});

describe("defaultLanguage / readNewsroomBasics — NEWSROOM.md's own declared language, primary first", () => {
  const DIR = mkdtempSync(join(tmpdir(), "depth-independent-newsroom-"));

  it("should read the first of a comma-separated languages field", () => {
    writeFileSync(
      join(DIR, "NEWSROOM.md"),
      '---\nname: "Test"\nlanguages: fr, en\nbrandColor: "#000000"\nground: "#ffffff"\n---\n',
    );
    expect(defaultLanguage(DIR)).toBe("fr");
    expect(readNewsroomBasics(DIR)?.brandColor).toBe("#000000");
  });

  it("should default to en when NEWSROOM.md does not exist yet", () => {
    const empty = mkdtempSync(join(tmpdir(), "depth-independent-empty-"));
    try {
      expect(defaultLanguage(empty)).toBe("en");
      expect(readNewsroomBasics(empty)).toBe(null);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("paletteRefusalMessage — the exact command a scaffold-time refusal gives", () => {
  const DIR = mkdtempSync(join(tmpdir(), "depth-independent-palette-msg-"));
  writeFileSync(
    join(DIR, "NEWSROOM.md"),
    '---\nname: "Test Newsroom"\nlanguages: en\nbrandColor: "#D4A853"\nground: "#16191B"\n---\n',
  );

  it("should carry a bun -e command built from this NEWSROOM.md's own house colours, not a generic example", () => {
    const message = paletteRefusalMessage({
      root: DIR,
      relBeatDir: "stories/x/beats/1",
    });
    expect(message).toContain("bun -e");
    expect(message).toContain('brandColor: "#D4A853"');
    expect(message).toContain('ground: "#16191B"');
    expect(message).toContain("stories/x/beats/1/PALETTE.md");
  });

  it("should say so plainly when NEWSROOM.md has no house colours to build the command from", () => {
    const empty = mkdtempSync(
      join(tmpdir(), "depth-independent-palette-msg-empty-"),
    );
    try {
      const message = paletteRefusalMessage({
        root: empty,
        relBeatDir: "proof/x",
      });
      expect(message).toContain("no brandColor/ground yet");
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("requiredLocalAssets / missingAssetsMessage — the data files a copied reader assumes beside it", () => {
  it("should find a literal readFileSync(join(HERE, \"…\")) filename, excluding the scaffold's own written files and analyst's own", () => {
    const runner =
      'const csv = readFileSync(join(HERE, "data.csv"), "utf8");\nconst geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));\nconst drive = readFile(join(HERE, "cartogram-drive.mjs"), "utf8");\nconst d = readFileSync(join(HERE, "data.json"));\n';
    const found = requiredLocalAssets(
      [runner],
      ["render-directions-scrolly.mjs", "cartogram-drive.mjs"],
    );
    expect(found).toEqual(["data.csv", "shapes.geojson"]);
  });

  it("should report only the assets actually missing on disk, with a geojson hinted reusable when it sits in fromBeat too", () => {
    const sourceDir = mkdtempSync(
      join(tmpdir(), "depth-independent-assets-source-"),
    );
    writeFileSync(join(sourceDir, "shapes.geojson"), "{}");
    try {
      const message = missingAssetsMessage({
        relBeatDir: "stories/x/beats/1",
        fromBeat: "proof/scrolly-cartogram-europe-lowcarbon",
        sourceDir,
        missing: ["data.csv", "shapes.geojson"],
      });
      expect(message).toContain("stories/x/beats/1/data.csv");
      expect(message).toContain("reusable verbatim");
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
    }
  });
});
