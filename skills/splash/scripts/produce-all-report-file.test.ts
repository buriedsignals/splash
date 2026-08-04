import { describe, it, expect } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// WHY THIS EXISTS — a gate whose input the model has to remember to create is not a gate.
//
// produce-all PRINTS its report; SKILL.md tells the orchestrator to redirect it into
// exports/<slug>/report.json, and every downstream step takes that file as an ARGUMENT:
// gate-render.mjs <report.json>, apply-signoff.mjs <report.json>, deploy-embed.mjs --results
// <report.json>. Measured on a real Goose run (docs/installer/goose-desktop-proof.md): the model
// produced a correct chart and forgot the `>`. The render gate and the sign-off were not skipped by
// a decision — they became UNREACHABLE, and nothing said so.
//
// So the spine writes the file itself. The redirect stays legal, and the empty-batch path is used
// here because it exercises the write without dispatching to any producer (no network, no build).
describe("produce-all.mjs — the report is a FILE, not something the caller must remember", () => {
  const scriptPath = join(import.meta.dir, "produce-all.mjs");

  function setup() {
    const dir = mkdtempSync(join(tmpdir(), "splash-report-file-"));
    const acceptedPath = join(dir, "accepted.json");
    writeFileSync(acceptedPath, "[]");
    return { dir, acceptedPath };
  }

  it("writes report.json beside accepted.json, with the same report it prints", () => {
    const { dir, acceptedPath } = setup();
    try {
      const proc = Bun.spawnSync(
        ["bun", scriptPath, acceptedPath, join(dir, "out")],
        {
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      expect(proc.exitCode).toBe(0);

      const reportPath = join(dir, "report.json");
      expect(existsSync(reportPath)).toBe(true);

      const onDisk = JSON.parse(readFileSync(reportPath, "utf8"));
      const onStdout = JSON.parse(proc.stdout.toString());
      // Same report, not merely a file with something in it.
      expect(onDisk).toEqual(onStdout);
      expect(Array.isArray(onDisk.results)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stays valid JSON when the caller ALSO redirects stdout to that same path", () => {
    // The documented invocation redirects into exactly the file the spine now writes. Two writers
    // on one path is how a JSON file ends up with its content twice; the spine must notice it is
    // being redirected into and leave the byte stream alone.
    const { dir, acceptedPath } = setup();
    try {
      const reportPath = join(dir, "report.json");
      const proc = Bun.spawnSync(
        [
          "bash",
          "-c",
          `bun ${JSON.stringify(scriptPath)} ${JSON.stringify(acceptedPath)} ${JSON.stringify(join(dir, "out"))} > ${JSON.stringify(reportPath)}`,
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).toBe(0);

      const raw = readFileSync(reportPath, "utf8");
      const parsed = JSON.parse(raw); // throws if the report was written twice
      expect(Array.isArray(parsed.results)).toBe(true);
      // One report, not two concatenated.
      expect(raw.split('"generatedAt"').length - 1).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
