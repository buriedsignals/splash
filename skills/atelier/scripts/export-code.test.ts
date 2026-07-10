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
import { join, resolve } from "node:path";
import { embedSnippet, staticHtml, isEphemeralPath } from "./export-code.mjs";

// Pulls the machine-relayable three-form proposal out of export-code's stdout. The block is
// a single `EXPORT_FORMS_JSON {...}` line so the orchestrator can relay a FIXED message
// instead of re-deriving the delivery rule (kills the "Livré."-with-nothing bug).
function parseFormsProposal(stdout: string) {
  const marker = "EXPORT_FORMS_JSON ";
  const line = stdout.split("\n").find((l) => l.startsWith(marker));
  if (!line)
    throw new Error("no EXPORT_FORMS_JSON block in stdout:\n" + stdout);
  return JSON.parse(line.slice(marker.length));
}

const shippableReport = (id = "p1") => ({
  results: [
    {
      id,
      producer: "chart-native",
      format: "static",
      status: "produced",
      reviewed: true,
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
    // Real producers always leave a static.png byproduct alongside the interactive
    // HTML; export-code inlines it into the mandatory static.html a11y fallback, which
    // the delivery gate (assertDelivered) requires for any non-scrolly interactive.
    writeFileSync(join(outDir, "static.png"), Buffer.from("fake-png-bytes"));
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

  it("packages interactive.html + static.html (no-JS fallback) + EMBED.md — NEVER a standalone static.png", () => {
    // Mirrors what chart-native/map-native's produce.mjs actually leaves in outDir for an
    // interactive delivery: a self-contained interactive.html, PLUS the raw "static.png"
    // byproduct it always builds regardless of the requested format, PLUS a stray
    // "interactive.png" review screenshot (snap-proof.mjs writes both).
    const outDir = mkdtempSync(join(tmpdir(), "atelier-export-code-out-"));
    writeFileSync(join(outDir, "interactive.html"), "<html>interactive</html>");
    writeFileSync(join(outDir, "static.png"), Buffer.from("fake-png-bytes"));
    writeFileSync(
      join(outDir, "interactive.png"),
      Buffer.from("fake-screenshot-bytes"),
    );
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(shippableReport("p1")));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-code-fixture-interactive-"),
    );
    try {
      execFileSync(
        "bun",
        [scriptPath, outDir, exportDir, "--results", resultsPath, "--id", "p1"],
        { encoding: "utf8" },
      );
      // The interactive form ships.
      expect(existsSync(join(exportDir, "interactive.html"))).toBe(true);
      // The a11y fallback ships as self-contained no-JS HTML, not a bare image.
      expect(existsSync(join(exportDir, "static.html"))).toBe(true);
      const staticHtmlContent = readFileSync(
        join(exportDir, "static.html"),
        "utf8",
      );
      expect(staticHtmlContent).toContain("data:image/png;base64");
      expect(staticHtmlContent).not.toContain("<script");
      // Neither raw PNG is ever copied into the delivered folder.
      expect(existsSync(join(exportDir, "static.png"))).toBe(false);
      expect(existsSync(join(exportDir, "interactive.png"))).toBe(false);
      const embedMd = readFileSync(join(exportDir, "EMBED.md"), "utf8");
      expect(embedMd).not.toContain(".png");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("packages a dw-chart INTERACTIVE (hosted DW embed, no local html, <slug>.png static) into a complete -export: static.html a11y fallback + EMBED.md that references the hosted URL", () => {
    // A Datawrapper interactive: the producer emits NO local interactive.html (the
    // interactive form IS the hosted DW embed) and names its static export "<id>.png"
    // (adapters.ts dispatches with `${p.id}.png`), NOT "static.png". This is the exact
    // shape that crashed export-code with embedSnippet(undefined) and left an EMPTY
    // -export folder. The report carries the producer's hosted publicUrl + declared
    // outputs, so export-code can recognise the static image and reference the embed.
    const outDir = mkdtempSync(join(tmpdir(), "atelier-export-code-dw-"));
    const pngName = "wage-price-gap.png";
    writeFileSync(join(outDir, pngName), Buffer.from("fake-dw-png-bytes"));
    const hostedUrl = "https://www.datawrapper.de/_/AbCdE/";
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify({
        results: [
          {
            id: "wage-price-gap",
            producer: "dw-chart",
            format: "interactive",
            status: "produced",
            reviewed: true,
            renderApproved: true,
            publicUrl: hostedUrl,
            outputs: [join(outDir, pngName)],
          },
        ],
      }),
    );
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-code-fixture-dw-"),
    );
    try {
      const out = execFileSync(
        "bun",
        [
          scriptPath,
          outDir,
          exportDir,
          "--results",
          resultsPath,
          "--id",
          "wage-price-gap",
        ],
        { encoding: "utf8" },
      );
      // No crash; assertDelivered passed (export-code prints its result last).
      expect(out).toContain("EXPORT_CODE_RESULT");
      // The owned no-JS a11y fallback ships, with the DW static image inlined.
      expect(existsSync(join(exportDir, "static.html"))).toBe(true);
      const staticHtmlContent = readFileSync(
        join(exportDir, "static.html"),
        "utf8",
      );
      expect(staticHtmlContent).toContain("data:image/png;base64");
      expect(staticHtmlContent).not.toContain("<script");
      // EMBED.md references the LIVE hosted DW embed (there is no local html to self-host).
      const embedMd = readFileSync(join(exportDir, "EMBED.md"), "utf8");
      expect(embedMd).toContain(hostedUrl);
      // The raw <slug>.png is never copied in standalone — only inlined into static.html.
      expect(existsSync(join(exportDir, pngName))).toBe(false);
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("refuses (non-zero exit) an interactive export whose build has no static.png — the a11y fallback would be missing", () => {
    // A produced + render-approved interactive.html but NO static.png byproduct: the no-JS
    // static.html a11y fallback cannot be built, so the delivery gate (assertDelivered)
    // must fail the export loudly rather than ship an inaccessible interactive.
    const outDir = mkdtempSync(join(tmpdir(), "atelier-export-code-out-"));
    writeFileSync(join(outDir, "interactive.html"), "<html>interactive</html>");
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(shippableReport("p1")));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-code-fixture-noa11y-"),
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
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(/static\.html/);
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
            reviewed: true,
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

describe("export-code CLI — three-form delivery proposal (machine-relayable)", () => {
  const scriptPath = join(import.meta.dir, "export-code.mjs");

  it("emits the three forms for a chart-native interactive: A=runnable React source bundle, B=interactive.html (single self-contained file), C=deploy-embed command", () => {
    const outDir = mkdtempSync(join(tmpdir(), "atelier-export-code-forms-"));
    writeFileSync(join(outDir, "interactive.html"), "<html>interactive</html>");
    writeFileSync(join(outDir, "static.png"), Buffer.from("fake-png-bytes"));
    // The producer (chart-native produce.mjs) drops these so EXPORT can assemble form 1's
    // self-contained Vite source bundle: the exact rendered config + the native render-id.
    writeFileSync(
      join(outDir, "config.json"),
      JSON.stringify({ title: "Power mix", rows: [{ x: "A", y: 1 }] }),
    );
    writeFileSync(
      join(outDir, "native-source.json"),
      JSON.stringify({ type: "bar" }),
    );
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(shippableReport("p1")));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-code-fixture-forms-"),
    );
    try {
      const out = execFileSync(
        "bun",
        [scriptPath, outDir, exportDir, "--results", resultsPath, "--id", "p1"],
        { encoding: "utf8" },
      );
      const proposal = parseFormsProposal(out);
      // Form A — code source: the runnable React source bundle at <id>-source, NOT pending.
      expect(proposal.forms.a.kind).toBe("react-source-bundle");
      expect(proposal.forms.a.pending).toBeUndefined();
      expect(proposal.forms.a.path).toBe(join(resolve(exportDir), "p1-source"));
      // The bundle is a real, self-contained Vite project on disk.
      const bundle = proposal.forms.a.path;
      expect(existsSync(join(bundle, "src", "component-registry.tsx"))).toBe(
        true,
      );
      expect(existsSync(join(bundle, "config.json"))).toBe(true);
      expect(existsSync(join(bundle, "package.json"))).toBe(true);
      expect(existsSync(join(bundle, "index.html"))).toBe(true);
      expect(existsSync(join(bundle, "main.tsx"))).toBe(true);
      expect(existsSync(join(bundle, "README.md"))).toBe(true);
      // Form B — HTML autonome: the single self-contained interactive.html (JS inlined),
      // the drop-anywhere file — NOT the no-JS static.html (that stays inside form A).
      expect(proposal.forms.b.path).toBe(
        join(resolve(exportDir), "interactive.html"),
      );
      // Form C — embed hébergé: the exact, runnable deploy-embed command for THIS export.
      const cmd = proposal.forms.c.command;
      expect(cmd).toContain("deploy-embed.mjs");
      expect(cmd).toContain(join(resolve(exportDir), "interactive.html"));
      expect(cmd).toContain(resolve(resultsPath));
      expect(cmd).toContain("--id");
      expect(proposal.forms.c.url).toBeUndefined();
      // The un-skippable relay block the orchestrator prints verbatim.
      expect(out).toContain("EXPORT_FORMS_PROPOSAL");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("emits code source + HTML autonome (scrolly.html) + embed for a scrolly — no no-JS static.html exists at all", () => {
    const outDir = mkdtempSync(join(tmpdir(), "atelier-export-code-scrolly-"));
    writeFileSync(join(outDir, "scrolly.html"), "<html>scrolly</html>");
    const resultsPath = join(outDir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(shippableReport("p1")));
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-code-fixture-scrolly-"),
    );
    try {
      const out = execFileSync(
        "bun",
        [scriptPath, outDir, exportDir, "--results", resultsPath, "--id", "p1"],
        { encoding: "utf8" },
      );
      const proposal = parseFormsProposal(out);
      expect(proposal.scrolly).toBe(true);
      // A scrolly has no chart-native source inputs → form A is the built-files folder.
      expect(proposal.forms.a.kind).toBe("built-files-folder");
      expect(proposal.forms.a.path).toBe(resolve(exportDir));
      expect(proposal.forms.a.pending).toBeUndefined();
      // Form B is the single self-contained scrolly.html (a scrolly IS the HTML autonome).
      expect(proposal.forms.b.path).toBe(
        join(resolve(exportDir), "scrolly.html"),
      );
      // Embed still applies (deploy the scrolly html).
      expect(proposal.forms.c.command).toContain("scrolly.html");
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("emits form C as the LIVE hosted publicUrl (no deploy command) for a hosted DW interactive", () => {
    const outDir = mkdtempSync(join(tmpdir(), "atelier-export-code-dw-forms-"));
    const pngName = "wage-price-gap.png";
    writeFileSync(join(outDir, pngName), Buffer.from("fake-dw-png-bytes"));
    const hostedUrl = "https://www.datawrapper.de/_/AbCdE/";
    const resultsPath = join(outDir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify({
        results: [
          {
            id: "wage-price-gap",
            producer: "dw-chart",
            format: "interactive",
            status: "produced",
            reviewed: true,
            renderApproved: true,
            publicUrl: hostedUrl,
            outputs: [join(outDir, pngName)],
          },
        ],
      }),
    );
    const exportDir = mkdtempSync(
      join(import.meta.dir, "export-code-fixture-dw-forms-"),
    );
    try {
      const out = execFileSync(
        "bun",
        [
          scriptPath,
          outDir,
          exportDir,
          "--results",
          resultsPath,
          "--id",
          "wage-price-gap",
        ],
        { encoding: "utf8" },
      );
      const proposal = parseFormsProposal(out);
      expect(proposal.hosted).toBe(true);
      // Hosted DW has NO React source to rebuild — form A is the built-files folder, and its
      // note is honest about that + points at the live DW link (no fabricated React bundle).
      expect(proposal.forms.a.kind).toBe("built-files-folder");
      expect(proposal.forms.a.path).toBe(resolve(exportDir));
      expect(proposal.forms.a.pending).toBeUndefined();
      expect(proposal.forms.a.note).toContain("Datawrapper");
      expect(proposal.forms.a.note).toContain(hostedUrl);
      // Form B still applies for hosted DW: the standalone static.html (its only self-contained file).
      expect(proposal.forms.b.path).toBe(
        join(resolve(exportDir), "static.html"),
      );
      // Form C is the already-live hosted URL — no deploy step.
      expect(proposal.forms.c.url).toBe(hostedUrl);
      expect(proposal.forms.c.command).toBeUndefined();
    } finally {
      rmSync(exportDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
