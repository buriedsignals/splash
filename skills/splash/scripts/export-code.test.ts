import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isEphemeralPath } from "./export-code.mjs";
import { canonicalJson } from "../src/canonical-json.ts";
import { generateEditorKeypair, signArtifact } from "./sign-artifact.mjs";
import { recordSignoff } from "./apply-signoff.mjs";
import { sha256Hex } from "../src/editorial-signoff.ts";

const scriptPath = join(import.meta.dir, "export-code.mjs");

// Pulls the machine-relayable delivery-form proposal out of export-code's stdout. The block
// is a single `EXPORT_FORMS_JSON {...}` line so the orchestrator can relay a FIXED message
// instead of re-deriving the delivery rule (kills the "Livré."-with-nothing bug).
function parseFormsProposal(stdout: string) {
  const marker = "EXPORT_FORMS_JSON ";
  const line = stdout.split("\n").find((l) => l.startsWith(marker));
  if (!line)
    throw new Error("no EXPORT_FORMS_JSON block in stdout:\n" + stdout);
  return JSON.parse(line.slice(marker.length));
}

// S1 strict production seam: assertChainProvenance (skills/splash/src/render-provenance.ts)
// resolves accepted.json/candidates.json beside report.json — i.e. in the SAME directory
// report.json lives in (dirname(reportPath), never the exportDir delivery folder). Every
// legitimate `report()` fixture below writes its sanctioned accepted.json + candidates.json into
// that same `dir` so the new export gate does not refuse an otherwise-legitimate chain — this is
// the "behaviour-preserving happy path" requirement, not new test surface for its own sake.
function writeChainFixture(
  dir: string,
  id: string,
  producer: string,
  spec: unknown,
): string {
  writeFileSync(
    join(dir, "accepted.json"),
    JSON.stringify([
      {
        id,
        producer,
        format: "static",
        spec,
        confirmedTakeaway: "Test takeaway for " + id,
      },
    ]),
  );
  writeFileSync(
    join(dir, "candidates.json"),
    JSON.stringify({ candidates: [{ type: "bar", producer }] }),
  );
  return createHash("sha256").update(canonicalJson(spec)).digest("hex");
}

// A produced + render-approved report for one proposal at a pinned VisualFormat — pairs with a
// sanctioned candidates.json/accepted.json chain (written into `dir`, report.json's directory) so
// assertChainProvenance passes for every legitimate fixture in this file. `dir` is always the
// directory the caller writes report.json into (join(dir, "report.json")).
const report = (
  dir: string,
  id: string,
  format: string,
  extra: Record<string, unknown> = {},
) => {
  const producer = (extra.producer as string | undefined) ?? "chart-native";
  const spec = { nativeType: "bar", title: "Test", id };
  const acceptedConfigHash = writeChainFixture(dir, id, producer, spec);
  return {
    results: [
      {
        id,
        producer,
        format,
        status: "produced",
        reviewed: true,
        renderApproved: true,
        acceptedConfigHash,
        ...extra,
      },
    ],
  };
};

function run(
  outDir: string,
  exportDir: string,
  resultsPath: string,
  id: string,
  form?: string,
) {
  const args = [
    scriptPath,
    outDir,
    exportDir,
    "--results",
    resultsPath,
    "--id",
    id,
  ];
  if (form) args.push("--form", form);
  return execFileSync("bun", args, { encoding: "utf8" });
}

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
    expect(isEphemeralPath("/Users/journalist/Splash/exports/co2-share")).toBe(
      false,
    );
  });
});

describe("export-code CLI — --id path-safety (audit gap #1, same class as the spine)", () => {
  // --id becomes a path component: bundleDir = join(exportDir, `${id}-source`). A
  // traversal id would let the code-source form write a bundle OUTSIDE exportDir. Reject
  // an unsafe --id up front, before any find/copy/exec — and prove the sentinel survives.
  for (const badId of ["../../evil", "/etc", "a/b", ".."]) {
    it(`refuses an unsafe --id ${JSON.stringify(badId)} and writes nothing outside exportDir`, () => {
      const root = mkdtempSync(join(import.meta.dir, "export-idsafe-fixture-"));
      const outDir = join(root, "out");
      const exportDir = join(root, "exp");
      mkdirSync(outDir, { recursive: true });
      mkdirSync(exportDir, { recursive: true });
      writeFileSync(join(outDir, "static.png"), Buffer.from("x"));
      const victim = join(exportDir, "..", "evil-source");
      const resultsPath = join(outDir, "report.json");
      writeFileSync(
        resultsPath,
        JSON.stringify(report(outDir, badId, "static")),
      );

      let threw = false;
      try {
        run(outDir, exportDir, resultsPath, badId);
      } catch (e) {
        threw = true;
        expect(String((e as { stderr?: string }).stderr ?? e)).toMatch(
          /not a safe slug/i,
        );
      }
      expect(threw).toBe(true);
      // Nothing was written to a sibling of exportDir via the traversal.
      expect(existsSync(victim)).toBe(false);
      rmSync(root, { recursive: true, force: true });
    });
  }

  it("accepts a normal slug --id", () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-idsafe-ok-"));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-idsafe-ok-fixture-"),
    );
    writeFileSync(join(outDir, "static.png"), Buffer.from("x"));
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify(report(outDir, "co2-2026", "static")),
    );
    expect(() => run(outDir, exportDir, resultsPath, "co2-2026")).not.toThrow();
    rmSync(outDir, { recursive: true, force: true });
    rmSync(exportDir, { recursive: true, force: true });
  });
});

describe("export-code CLI — STATIC delivery (media direct, no folder machinery)", () => {
  it("delivers the lone static image — no static.html, no EMBED.md, no -source folder", () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-static-"));
    writeFileSync(join(outDir, "static.png"), Buffer.from("fake-png-bytes"));
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(report(outDir, "p1", "static")));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-static-fixture-"),
    );
    try {
      const out = run(outDir, exportDir, resultsPath, "p1");
      expect(out).toContain("EXPORT_CODE_RESULT");
      const listing = readdirSync(exportDir);
      // The lone media file IS the delivery — nothing else.
      expect(listing).toEqual(["static.png"]);
      expect(existsSync(join(exportDir, "static.html"))).toBe(false);
      expect(existsSync(join(exportDir, "EMBED.md"))).toBe(false);
      expect(existsSync(join(exportDir, "p1-source"))).toBe(false);
      // No delivery-form menu for a static image.
      expect(out).not.toContain("EXPORT_FORMS_JSON");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("delivers a hosted-DW static named <id>.png (declared in the report outputs)", () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-static-dw-"));
    const pngName = "wage-gap.png";
    writeFileSync(join(outDir, pngName), Buffer.from("fake-dw-png"));
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify(
        report(outDir, "wage-gap", "static", {
          outputs: [join(outDir, pngName)],
        }),
      ),
    );
    const exportDir = mkdtempSync(join(import.meta.dir, "export-static-dw-"));
    try {
      run(outDir, exportDir, resultsPath, "wage-gap");
      expect(readdirSync(exportDir)).toEqual([pngName]);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("refuses a --form on a static delivery (static takes no form)", () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-static-form-"));
    writeFileSync(join(outDir, "static.png"), Buffer.from("x"));
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(report(outDir, "p1", "static")));
    const exportDir = join(import.meta.dir, "export-static-form-fixture");
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
          "--form",
          "html",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(/takes no --form/);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("export-code CLI — VIDEO delivery (mp4 direct)", () => {
  it("delivers the lone mp4 and never the review still", () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-video-"));
    writeFileSync(join(outDir, "landscape.mp4"), Buffer.from("fake-mp4"));
    // produce leaves a Gate-3 review still alongside — it is NOT part of the delivery.
    writeFileSync(
      join(outDir, "video-landscape-still.png"),
      Buffer.from("fake-still"),
    );
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(report(outDir, "p1", "video")));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-video-fixture-"),
    );
    try {
      const out = run(outDir, exportDir, resultsPath, "p1");
      expect(out).toContain("EXPORT_CODE_RESULT");
      expect(readdirSync(exportDir)).toEqual(["landscape.mp4"]);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("export-code CLI — INTERACTIVE phase 1 (proposal, builds nothing)", () => {
  // Mirrors a chart-native single-format interactive produce: interactive.html (deliverable)
  // + interactive.png (ephemeral Gate-3 still) + config.json + native-source.json (the
  // inputs export-source.mjs needs to assemble the React bundle LATER, on demand).
  function setupChartNativeInteractive() {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-interactive-"));
    writeFileSync(join(outDir, "interactive.html"), "<html>interactive</html>");
    writeFileSync(join(outDir, "interactive.png"), Buffer.from("still"));
    writeFileSync(
      join(outDir, "config.json"),
      JSON.stringify({ title: "Power mix", rows: [{ x: "A", y: 1 }] }),
    );
    writeFileSync(
      join(outDir, "native-source.json"),
      JSON.stringify({ type: "bar" }),
    );
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify(report(outDir, "p1", "interactive")),
    );
    return { outDir, resultsPath };
  }

  it("emits the a/b/c proposal WITHOUT building the bundle, deploying, or writing static.html", () => {
    const { outDir, resultsPath } = setupChartNativeInteractive();
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-interactive-p1-"),
    );
    try {
      const out = run(outDir, exportDir, resultsPath, "p1");
      // The proposal is emitted, un-skippable relay block included.
      expect(out).toContain("EXPORT_FORMS_PROPOSAL");
      const proposal = parseFormsProposal(out);
      expect(proposal.format).toBe("interactive");
      // Form A is the LAZY React source bundle: described + pending, NOT built.
      expect(proposal.forms.a.kind).toBe("react-source-bundle");
      expect(proposal.forms.a.pending).toBe(true);
      expect(proposal.forms.a.path).toBe(join(resolve(exportDir), "p1-source"));
      expect(proposal.forms.a.deliver).toContain("--form code-source");
      // Form B is the standalone interactive.html; Form C the embed re-invocation.
      expect(proposal.forms.b.path).toBe(
        join(resolve(exportDir), "interactive.html"),
      );
      expect(proposal.forms.b.deliver).toContain("--form html");
      expect(proposal.forms.c.deliver).toContain("--form embed");
      // NOTHING was built: no bundle, no copied html, no static.html.
      expect(existsSync(join(exportDir, "p1-source"))).toBe(false);
      expect(existsSync(join(exportDir, "interactive.html"))).toBe(false);
      expect(existsSync(join(exportDir, "static.html"))).toBe(false);
      // No delivery happened yet — no EXPORT_CODE_RESULT in phase 1.
      expect(out).not.toContain("EXPORT_CODE_RESULT");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("with --form code-source builds ONLY the <id>-source bundle — no static.html", () => {
    const { outDir, resultsPath } = setupChartNativeInteractive();
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-interactive-code-"),
    );
    try {
      const out = run(outDir, exportDir, resultsPath, "p1", "code-source");
      expect(out).toContain("EXPORT_CODE_RESULT");
      const bundle = join(exportDir, "p1-source");
      // A real, self-contained Vite project on disk.
      expect(existsSync(join(bundle, "package.json"))).toBe(true);
      expect(existsSync(join(bundle, "src", "component-registry.tsx"))).toBe(
        true,
      );
      expect(existsSync(join(bundle, "config.json"))).toBe(true);
      expect(existsSync(join(bundle, "main.tsx"))).toBe(true);
      expect(existsSync(join(bundle, "index.html"))).toBe(true);
      // NO static.html anywhere (dropped fallback), and no html copied at top level.
      expect(existsSync(join(exportDir, "static.html"))).toBe(false);
      expect(existsSync(join(exportDir, "interactive.html"))).toBe(false);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("with --form html delivers ONLY interactive.html — no bundle, no static.html", () => {
    const { outDir, resultsPath } = setupChartNativeInteractive();
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-interactive-html-"),
    );
    try {
      const out = run(outDir, exportDir, resultsPath, "p1", "html");
      expect(out).toContain("EXPORT_CODE_RESULT");
      expect(readdirSync(exportDir)).toEqual(["interactive.html"]);
      expect(existsSync(join(exportDir, "p1-source"))).toBe(false);
      expect(existsSync(join(exportDir, "static.html"))).toBe(false);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("export-code CLI — markerless outDir (no code-source bundle possible)", () => {
  // A markerless interactive / scrolly outDir: only the built html, NO native-source.json and
  // NO source-manifest.json. Unreachable from a real producer (chart-native emits
  // native-source.json, map-native / scrolly emit source-manifest.json, hosted-DW is handled via
  // isHostedEmbed) — only a stale / hand-made outDir lands here. There is no runnable code-source
  // bundle to assemble, and a lone html is NOT a valid code-source delivery, so form a must NOT be
  // advertised and a --form code-source request must fail loudly with an actionable message.
  function setupMarkerless() {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-markerless-"));
    writeFileSync(join(outDir, "scrolly.html"), "<html>scrolly</html>");
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(report(outDir, "p1", "scrolly")));
    return { outDir, resultsPath };
  }

  it("phase 1 OMITS form a (no code-source deliverable) but still offers HTML autonome + embed", () => {
    const { outDir, resultsPath } = setupMarkerless();
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-markerless-p1-"),
    );
    try {
      const out = run(outDir, exportDir, resultsPath, "p1");
      const proposal = parseFormsProposal(out);
      expect(proposal.scrolly).toBe(true);
      // No source marker → NO runnable bundle → form a is absent (never built-files-folder).
      expect(proposal.forms.a).toBeUndefined();
      expect(proposal.forms.b.path).toBe(
        join(resolve(exportDir), "scrolly.html"),
      );
      expect(proposal.forms.b.deliver).toContain("--form html");
      expect(proposal.forms.c.deliver).toContain("--form embed");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("--form code-source fails loudly with an actionable marker message (never a lone-html copy)", () => {
    const { outDir, resultsPath } = setupMarkerless();
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-markerless-code-"),
    );
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
          "--form",
          "code-source",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).not.toBe(0);
      const err = proc.stderr.toString();
      expect(err).toMatch(/no source marker/);
      expect(err).toMatch(/native-source\.json|source-manifest\.json/);
      // It must NOT have copied the lone html as a (gate-rejected) code-source delivery.
      expect(existsSync(join(exportDir, "scrolly.html"))).toBe(false);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("with --form html delivers ONLY scrolly.html", () => {
    const { outDir, resultsPath } = setupMarkerless();
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-markerless-html-"),
    );
    try {
      run(outDir, exportDir, resultsPath, "p1", "html");
      expect(readdirSync(exportDir)).toEqual(["scrolly.html"]);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("export-code CLI — hosted Datawrapper interactive (embed-only)", () => {
  function setupHostedDw() {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-dw-"));
    const pngName = "wage-price-gap.png";
    writeFileSync(join(outDir, pngName), Buffer.from("fake-dw-png"));
    const hostedUrl = "https://www.datawrapper.de/_/AbCdE/";
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify(
        report(outDir, "wage-price-gap", "interactive", {
          producer: "dw-chart",
          publicUrl: hostedUrl,
          outputs: [join(outDir, pngName)],
        }),
      ),
    );
    return { outDir, resultsPath, hostedUrl };
  }

  it("phase 1 offers ONLY the live embed (no React source, no standalone html, no static.html)", () => {
    const { outDir, resultsPath, hostedUrl } = setupHostedDw();
    const exportDir = mkdtempSync(join(import.meta.dir, "export-dw-p1-"));
    try {
      const out = run(outDir, exportDir, resultsPath, "wage-price-gap");
      const proposal = parseFormsProposal(out);
      expect(proposal.hosted).toBe(true);
      expect(proposal.forms.c.url).toBe(hostedUrl);
      expect(proposal.forms.a).toBeUndefined();
      expect(proposal.forms.b).toBeUndefined();
      expect(existsSync(join(exportDir, "static.html"))).toBe(false);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("with --form embed records the already-live publicUrl in EMBED_URL.txt (no deploy)", () => {
    const { outDir, resultsPath, hostedUrl } = setupHostedDw();
    const exportDir = mkdtempSync(join(import.meta.dir, "export-dw-embed-"));
    try {
      const out = run(
        outDir,
        exportDir,
        resultsPath,
        "wage-price-gap",
        "embed",
      );
      expect(out).toContain("EXPORT_CODE_RESULT");
      const urlFile = join(exportDir, "EMBED_URL.txt");
      expect(existsSync(urlFile)).toBe(true);
      expect(readFileSync(urlFile, "utf8")).toContain(hostedUrl);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("export-code CLI — the mechanical shippability gate", () => {
  it("refuses (non-zero) a proposal that is not render-approved, before any write", () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-unshipped-"));
    writeFileSync(join(outDir, "static.png"), Buffer.from("x"));
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify(report(outDir, "p1", "static", { renderApproved: false })),
    );
    const exportDir = join(import.meta.dir, "export-unshipped-fixture");
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

  it("refuses an unknown --form value", () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-export-badform-"));
    writeFileSync(join(outDir, "interactive.html"), "<html></html>");
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify(report(outDir, "p1", "interactive")),
    );
    const exportDir = join(import.meta.dir, "export-badform-fixture");
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
          "--form",
          "pdf",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(/invalid --form/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
      rmSync(exportDir, { recursive: true, force: true });
    }
  });
});

describe("export-code — map-native code-source builds a runnable bundle", () => {
  // A produced interactive map outDir: interactive.html (deliverable) + source-manifest.json +
  // config.json (the inputs bundle-source.mjs needs to closure-copy the entangled map-native src
  // into a runnable bundle LATER, on demand). Mirrors setupChartNativeInteractive above, but with
  // the source-manifest marker instead of native-source.json.
  function setupMapNativeInteractive() {
    const work = mkdtempSync(join(tmpdir(), "export-code-map-"));
    const outDir = join(work, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "interactive.html"), "<html></html>");
    writeFileSync(
      join(outDir, "source-manifest.json"),
      JSON.stringify({ engine: "map-native", type: "choropleth" }),
    );
    // Reuse the committed sample config as this element's config.
    const sample = join(
      import.meta.dir,
      "..",
      "..",
      "map-native",
      "assets",
      "sample-data",
      "choropleth.json",
    );
    execFileSync("cp", [sample, join(outDir, "config.json")]);
    const reportPath = join(work, "report.json");
    writeFileSync(
      reportPath,
      JSON.stringify(report(work, "m1", "interactive")),
    );
    return { work, outDir, resultsPath: reportPath };
  }

  it("assembles <id>-source with a Vite project when a source-manifest is present", () => {
    const { work, outDir, resultsPath } = setupMapNativeInteractive();
    // exportDir must NOT resolve under the OS tmpdir (isEphemeralPath refuses it) — mirror the
    // other tests in this file and place it under this scripts/ directory instead.
    const exportDir = mkdtempSync(join(import.meta.dir, "export-map-source-"));
    try {
      const out = run(outDir, exportDir, resultsPath, "m1", "code-source");
      expect(out).toContain("EXPORT_CODE_RESULT");
      expect(existsSync(join(exportDir, "m1-source", "package.json"))).toBe(
        true,
      );
      expect(existsSync(join(exportDir, "m1-source", "vite.config.ts"))).toBe(
        true,
      );
      expect(
        existsSync(
          join(
            exportDir,
            "m1-source",
            "skills",
            "map-native",
            "src",
            "mount.tsx",
          ),
        ),
      ).toBe(true);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(work, { recursive: true, force: true });
    }
  });

  it("Phase 1 (no --form) advertises form a as the runnable react-source-bundle, not built-files", () => {
    const { work, outDir, resultsPath } = setupMapNativeInteractive();
    const exportDir = mkdtempSync(join(import.meta.dir, "export-map-p1-"));
    try {
      const out = run(outDir, exportDir, resultsPath, "m1");
      expect(out).toContain("EXPORT_FORMS_PROPOSAL");
      const proposal = parseFormsProposal(out);
      expect(proposal.format).toBe("interactive");
      // The relabel: a source-manifest element must advertise the runnable bundle (via
      // bundle-source.mjs), NOT the old built-files folder. Locks emitProposal against a
      // silent regression back to "built-files-folder" for map-native / scrolly.
      expect(proposal.forms.a.kind).toBe("react-source-bundle");
      expect(proposal.forms.a.label).toBe("Code source (bundle React)");
      expect(proposal.forms.a.pending).toBe(true);
      expect(proposal.forms.a.path).toBe(join(resolve(exportDir), "m1-source"));
      expect(proposal.forms.a.deliver).toContain("--form code-source");
      // Phase 1 builds nothing.
      expect(existsSync(join(exportDir, "m1-source"))).toBe(false);
      expect(out).not.toContain("EXPORT_CODE_RESULT");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(work, { recursive: true, force: true });
    }
  });
});

describe("export-code CLI — S4d editorial sign-off gate", () => {
  // A chain-provenance-valid STATIC outDir + report (mirrors report()/writeChainFixture() above)
  // whose approvedHash is the media bytes' sha256 — the exact input assertEditoriallyCleared
  // re-verifies at export. `dir` holds report.json/accepted.json/candidates.json/the profile —
  // `outDir` (a subdir of it) holds the produced static.png.
  function scaffold(withProfileRequiring: boolean) {
    const dir = mkdtempSync(join(tmpdir(), "splash-export-editorial-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    const media = Buffer.from("PNGBYTES-static-artifact");
    writeFileSync(join(outDir, "static.png"), media);
    const H = sha256Hex(media);
    const id = "p1";
    const producer = "chart-native";
    const spec = { nativeType: "bar", title: "Test", id };
    const acceptedConfigHash = writeChainFixture(dir, id, producer, spec);
    const reportObj = {
      results: [
        {
          id,
          producer,
          format: "static",
          status: "produced",
          reviewed: true,
          renderApproved: true,
          acceptedConfigHash,
          approvedHash: H,
        },
      ],
      generatedAt: new Date(0).toISOString(),
    };
    const { privatePem, publicBase64, signersLine } =
      generateEditorKeypair("yvan");
    const profileMd =
      `---\nsigners:\n${signersLine}\n` +
      (withProfileRequiring ? "requiredSigners:\n  - yvan\n" : "") +
      `---\n# N\n`;
    const profilePath = join(dir, "NEWSROOM-PROFILE.md");
    writeFileSync(profilePath, profileMd);
    const reportPath = join(dir, "report.json");
    return {
      dir,
      outDir,
      reportPath,
      profilePath,
      report: reportObj,
      media,
      privatePem,
      publicBase64,
      H,
    };
  }

  it("REFUSES a static export when a requiredSigner has not signed", () => {
    const s = scaffold(true);
    writeFileSync(s.reportPath, JSON.stringify(s.report));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-editorial-refuse-"),
    );
    try {
      expect(() =>
        execFileSync(
          "bun",
          [
            scriptPath,
            s.outDir,
            exportDir,
            "--results",
            s.reportPath,
            "--id",
            "p1",
            "--profile",
            s.profilePath,
          ],
          { stdio: "pipe" },
        ),
      ).toThrow(); // non-zero exit — required editorial sign-off missing
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(s.dir, { recursive: true, force: true });
    }
  });

  it("PROCEEDS and records unsigned when no --profile is given", () => {
    const s = scaffold(false);
    writeFileSync(s.reportPath, JSON.stringify(s.report));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-editorial-unsigned-"),
    );
    try {
      const out = execFileSync(
        "bun",
        [
          scriptPath,
          s.outDir,
          exportDir,
          "--results",
          s.reportPath,
          "--id",
          "p1",
        ],
        { encoding: "utf8" },
      );
      expect(out).toMatch(/EDITORIAL: unsigned/);
      expect(out).toMatch(/EXPORT_CODE_RESULT/);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(s.dir, { recursive: true, force: true });
    }
  });

  it("PROCEEDS when the required sign-off is present (matching keypair)", () => {
    const s = scaffold(true);
    // Sign with scaffold's OWN keypair, and verify against the SAME profile file (s.profilePath)
    // that already registers that exact publicBase64 under "yvan" — the brief's example
    // mismatched keys (registered a freshly-generated, unrelated key instead of scaffold's own),
    // which can never verify. The signature must check out against the key the export-time
    // profile actually carries.
    const { signature } = signArtifact(s.media, "p1", s.privatePem);
    const signed = recordSignoff(
      s.report,
      "p1",
      "yvan",
      signature,
      readFileSync(s.profilePath, "utf8"),
    );
    writeFileSync(s.reportPath, JSON.stringify(signed));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-editorial-signed-"),
    );
    try {
      const out = execFileSync(
        "bun",
        [
          scriptPath,
          s.outDir,
          exportDir,
          "--results",
          s.reportPath,
          "--id",
          "p1",
          "--profile",
          s.profilePath,
        ],
        { encoding: "utf8" },
      );
      expect(out).toMatch(/EDITORIAL: signed by yvan/);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(s.dir, { recursive: true, force: true });
    }
  });
});
