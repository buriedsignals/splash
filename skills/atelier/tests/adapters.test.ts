import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatFlag } from "../src/adapters";

describe("formatFlag — VisualFormat → producer flag", () => {
  it("maps chart-native video → all, static → static", () => {
    expect(formatFlag("chart-native", "video")).toBe("all");
    expect(formatFlag("chart-native", "static")).toBe("static");
  });
  it("maps map-native interactive → static (web build), video → all", () => {
    expect(formatFlag("map-native", "interactive")).toBe("static");
    expect(formatFlag("map-native", "video")).toBe("all");
  });
});

// Regression for Fix B: a real file-based producer (chart-native/map-native/scrolly)
// writes its own build/render logs to stdout. produce-all.mjs's ONLY stdout write is
// its final JSON.stringify(report) line — any noise a dispatched producer puts on the
// REAL process stdout (not just on a JS-level stream we could monkeypatch) would
// interleave with that line and break a caller's JSON.parse(stdout). A JS-level spy on
// process.stdout.write cannot catch this: `stdio:"inherit"` dup's the child directly
// onto the parent's OS file descriptor, bypassing the JS stream entirely. So this test
// drives runProducerScript from a genuinely separate child process (a harness script,
// itself invoked via execFileSync) and asserts what lands on ITS real stdout — the same
// mechanism produce-all.mjs's own CLI test (produce-all-cli.test.ts) already exercises.
describe("runProducerScript — never lets a producer's stdout reach the parent's real stdout", () => {
  const adaptersPath = join(import.meta.dir, "..", "src", "adapters.ts");

  function setupHarness() {
    const dir = mkdtempSync(join(tmpdir(), "atelier-adapters-harness-"));
    // A throwaway "producer" — noisy stdout in every mode, like a real Vite/Remotion
    // build's progress log, plus a FALLBACK_TO_DW line on stderr + exit 2 for the
    // fallback mode chart-native uses.
    const fakeProducer = join(dir, "fake-producer.mjs");
    writeFileSync(
      fakeProducer,
      [
        "const mode = process.argv[2];",
        'console.log("STDOUT_LEAK line 1 from fake producer");',
        'console.log("STDOUT_LEAK line 2 from fake producer");',
        'if (mode === "fallback") {',
        '  console.error("FALLBACK_TO_DW: unsupported-type-xyz");',
        "  process.exit(2);",
        '} else if (mode === "fail") {',
        '  console.error("boom: something broke");',
        "  process.exit(1);",
        "}",
      ].join("\n"),
    );
    // Imports runProducerScript from the REAL adapters.ts (by absolute file:// URL, so
    // it resolves correctly regardless of this harness file's own temp-dir location)
    // and prints ONLY a single JSON line with the outcome — mirroring produce-all.mjs's
    // own "one clean JSON line on stdout" contract.
    const harness = join(dir, "harness.mjs");
    writeFileSync(
      harness,
      [
        'import { pathToFileURL } from "node:url";',
        "const [adaptersPath, cmd, argsJson, cwd] = process.argv.slice(2);",
        "const { runProducerScript } = await import(pathToFileURL(adaptersPath).href);",
        "const outcome = runProducerScript(cmd, JSON.parse(argsJson), cwd);",
        "process.stdout.write(JSON.stringify({ outcome }));",
      ].join("\n"),
    );
    return { dir, fakeProducer, harness };
  }

  it("discards a successful producer's stdout — the harness's stdout is pure JSON", () => {
    const { fakeProducer, harness, dir } = setupHarness();
    const out = execFileSync(
      "bun",
      [
        harness,
        adaptersPath,
        "bun",
        JSON.stringify([fakeProducer, "success"]),
        dir,
      ],
      { encoding: "utf8" },
    );
    expect(out).not.toContain("STDOUT_LEAK");
    const parsed = JSON.parse(out); // throws if any producer noise leaked onto stdout
    expect(parsed.outcome.status).toBe("produced");
  });

  it("still detects the FALLBACK_TO_DW reason via captured stderr, with clean stdout", () => {
    const { fakeProducer, harness, dir } = setupHarness();
    const out = execFileSync(
      "bun",
      [
        harness,
        adaptersPath,
        "bun",
        JSON.stringify([fakeProducer, "fallback"]),
        dir,
      ],
      { encoding: "utf8" },
    );
    expect(out).not.toContain("STDOUT_LEAK");
    const parsed = JSON.parse(out);
    expect(parsed.outcome.status).toBe("needs-fallback");
    expect(parsed.outcome.reason).toContain(
      "FALLBACK_TO_DW: unsupported-type-xyz",
    );
  });

  it("reports a real failure's captured output without polluting stdout", () => {
    const { fakeProducer, harness, dir } = setupHarness();
    const out = execFileSync(
      "bun",
      [
        harness,
        adaptersPath,
        "bun",
        JSON.stringify([fakeProducer, "fail"]),
        dir,
      ],
      { encoding: "utf8" },
    );
    // The failure text is allowed to appear — but only INSIDE the one JSON value below,
    // never as stray bytes the parse would choke on.
    const parsed = JSON.parse(out);
    expect(parsed.outcome.status).toBe("failed");
    expect(parsed.outcome.error).toContain("boom: something broke");
  });
});
