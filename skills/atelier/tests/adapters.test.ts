import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatFlag, channelEnvFor } from "../src/adapters";

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

// Slice 2 (channel-driven producer rendering): the proposal's confirmed channel is
// threaded to the NATIVE producers only (chart-native, map-native) as ATELIER_CHANNEL
// — never as a positional argv (see adapters.ts's header comment for why). scrolly
// and any absent channel are covered here too (the exact bug this slice fixes: a
// dropped channel silently defaulting the WRONG way, or leaking to a producer that
// never asked for one).
describe("channelEnvFor — the argv/env builder for channel threading", () => {
  it("threads ATELIER_CHANNEL for chart-native with an explicit channel", () => {
    expect(channelEnvFor("chart-native", "social-vertical")).toEqual({
      ATELIER_CHANNEL: "social-vertical",
    });
  });

  it("threads ATELIER_CHANNEL for map-native with an explicit channel", () => {
    expect(channelEnvFor("map-native", "social-feed")).toEqual({
      ATELIER_CHANNEL: "social-feed",
    });
  });

  it("defaults an absent channel to article-web for both native producers", () => {
    expect(channelEnvFor("chart-native", undefined)).toEqual({
      ATELIER_CHANNEL: "article-web",
    });
    expect(channelEnvFor("map-native", undefined)).toEqual({
      ATELIER_CHANNEL: "article-web",
    });
  });

  it("never threads a channel to scrolly, even when one is provided", () => {
    expect(channelEnvFor("scrolly", "social-vertical")).toEqual({});
    expect(channelEnvFor("scrolly", undefined)).toEqual({});
  });
});

// Proves the wiring one level down: runProducerScript's new `env` param actually
// reaches the spawned process (not just the pure builder above) — a real child
// process reading process.env.ATELIER_CHANNEL, mirroring how chart-native/map-native's
// produce.mjs will read it (Task 2/3).
describe("runProducerScript — forwards the env param to the spawned process", () => {
  function setupEnvHarness() {
    const dir = mkdtempSync(join(tmpdir(), "atelier-adapters-env-harness-"));
    const fakeProducer = join(dir, "fake-producer-env.mjs");
    writeFileSync(
      fakeProducer,
      [
        'console.log("channel seen: " + (process.env.ATELIER_CHANNEL ?? "none"));',
      ].join("\n"),
    );
    const harness = join(dir, "harness-env.mjs");
    writeFileSync(
      harness,
      [
        'import { pathToFileURL } from "node:url";',
        "const [adaptersPath, cmd, argsJson, cwd, envJson] = process.argv.slice(2);",
        "const { runProducerScript } = await import(pathToFileURL(adaptersPath).href);",
        "const outcome = runProducerScript(cmd, JSON.parse(argsJson), cwd, JSON.parse(envJson));",
        "process.stdout.write(JSON.stringify({ outcome }));",
      ].join("\n"),
    );
    return { dir, fakeProducer, harness };
  }

  const adaptersPath = join(import.meta.dir, "..", "src", "adapters.ts");

  it("a producer script observes the passed ATELIER_CHANNEL", () => {
    const { fakeProducer, harness, dir } = setupEnvHarness();
    // fake-producer-env.mjs writes to stdout, which runProducerScript captures (not
    // inherited) — so we assert via the fallback path instead: make it "fail" so the
    // captured stdout is surfaced in the outcome for inspection.
    writeFileSync(
      fakeProducer,
      [
        'console.log("channel seen: " + (process.env.ATELIER_CHANNEL ?? "none"));',
        'console.error("boom");',
        "process.exit(1);",
      ].join("\n"),
    );
    const out = execFileSync(
      "bun",
      [
        harness,
        adaptersPath,
        "bun",
        JSON.stringify([fakeProducer]),
        dir,
        JSON.stringify({ ATELIER_CHANNEL: "social-vertical" }),
      ],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(out);
    expect(parsed.outcome.status).toBe("failed");
    expect(parsed.outcome.error).toContain("channel seen: social-vertical");
  });

  it("an empty env is a no-op — the spawned process sees no ATELIER_CHANNEL", () => {
    const { fakeProducer, harness, dir } = setupEnvHarness();
    writeFileSync(
      fakeProducer,
      [
        'console.log("channel seen: " + (process.env.ATELIER_CHANNEL ?? "none"));',
        'console.error("boom");',
        "process.exit(1);",
      ].join("\n"),
    );
    const out = execFileSync(
      "bun",
      [
        harness,
        adaptersPath,
        "bun",
        JSON.stringify([fakeProducer]),
        dir,
        JSON.stringify({}),
      ],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(out);
    expect(parsed.outcome.status).toBe("failed");
    expect(parsed.outcome.error).toContain("channel seen: none");
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
