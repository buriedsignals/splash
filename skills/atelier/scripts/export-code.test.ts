import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { embedSnippet, staticHtml, isEphemeralPath } from "./export-code.mjs";

const shippableReport = (id = "p1") => ({
  results: [
    {
      id,
      producer: "chart-native",
      format: "static",
      status: "produced",
      renderApproved: true,
    },
  ],
});

describe("staticHtml", () => {
  it("is a single self-contained document with the image inlined (no external refs)", () => {
    const html = staticHtml("data:image/png;base64,AAAA", "chart");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('alt="chart"');
    // self-contained: no external asset references
    expect(html).not.toMatch(/src="\.?\/?assets/);
    expect(html).not.toContain("<script");
  });
});

describe("embedSnippet", () => {
  it("wraps an .html file in a responsive iframe", () => {
    const s = embedSnippet("chart.html");
    expect(s).toContain("<iframe");
    expect(s).toContain('src="chart.html"');
  });
  it("wraps a .png in an img and an .mp4 in a video", () => {
    expect(embedSnippet("static.png")).toContain("<img");
    expect(embedSnippet("clip.mp4")).toContain("<video");
  });
  it("throws on an unsupported extension", () => {
    expect(() => embedSnippet("data.csv")).toThrow(/unsupported/i);
  });
});

describe("isEphemeralPath", () => {
  it("flags temp / scratchpad destinations the journalist would lose", () => {
    expect(isEphemeralPath("/tmp/co2-export")).toBe(true);
    expect(
      isEphemeralPath("/private/tmp/claude-501/session/scratchpad/x"),
    ).toBe(true);
    expect(isEphemeralPath("/var/folders/ab/xyz/T/out")).toBe(true);
  });
  it("accepts a stable project location", () => {
    expect(isEphemeralPath("exports/co2-share")).toBe(false);
    expect(isEphemeralPath("/Users/journalist/Atelier/exports/co2-share")).toBe(
      false,
    );
  });
});

describe("export-code CLI — export-completeness gate", () => {
  const scriptPath = join(import.meta.dir, "export-code.mjs");

  // outDir (the source artifacts) may sit under the OS tmpdir — only exportDir is checked
  // for ephemerality by the script.
  function setupOutDir() {
    const outDir = mkdtempSync(join(tmpdir(), "atelier-export-code-out-"));
    writeFileSync(join(outDir, "chart.html"), "<html>chart</html>");
    return outDir;
  }

  it("ships a produced + render-approved proposal (happy path)", () => {
    const outDir = setupOutDir();
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(shippableReport("p1")));
    // A non-ephemeral destination: a plain "fixture" dir, NOT rooted under the OS tmpdir.
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-code-fixture-"),
    );
    try {
      const out = execFileSync(
        "bun",
        [scriptPath, outDir, exportDir, "--results", resultsPath, "--id", "p1"],
        { encoding: "utf8" },
      );
      expect(out).toContain("EXPORT_CODE_RESULT");
      expect(existsSync(join(exportDir, "chart.html"))).toBe(true);
      // The generated hosted-embed instructions must include the required
      // --results/--id flags — a journalist copy-pasting the command must not hit
      // deploy-embed's "usage" error (locks the seam from FIX 1).
      const embedMd = readFileSync(join(exportDir, "EMBED.md"), "utf8");
      expect(embedMd).toContain("deploy-embed.mjs");
      expect(embedMd).toContain("--results");
      expect(embedMd).toContain("--id");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("refuses (non-zero exit) to export a proposal that is not produced + render-approved", () => {
    const outDir = setupOutDir();
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify({
        results: [
          {
            id: "p1",
            producer: "chart-native",
            format: "static",
            status: "produced",
            renderApproved: false,
          },
        ],
      }),
    );
    const exportDir = join(import.meta.dir, "export-code-fixture-unshipped");
    try {
      const proc = Bun.spawnSync(
        [
          "bun",
          scriptPath,
          outDir,
          exportDir,
          "--results",
          resultsPath,
          "--id",
          "p1",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(/not render-approved/);
      // The gate ran BEFORE any write: the export dir was never created.
      expect(existsSync(exportDir)).toBe(false);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
      rmSync(exportDir, { recursive: true, force: true });
    }
  });
});
