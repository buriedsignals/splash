import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  formatFlag,
  channelEnvFor,
  freshOutDir,
  realDispatch,
} from "../src/adapters";
import type { AcceptedProposal, VisualFormat } from "../src/producer-spec";

// Single-format-produce-export (Tasks 2-3): chart-native's produce-from-spec.mjs/
// produce.mjs and map-native's produce.mjs now read the SAME static|interactive|
// video|scrolly vocabulary directly off argv — no more "all"/style translation
// (the old chart-native video→"all", map-native interactive→"static" mapping is gone).
// scrolly's own produce.mjs ignores the argv entirely, but formatFlag still passes the
// value straight through for it too (a harmless no-op) rather than special-casing.
describe("formatFlag — VisualFormat passes straight through to every file-based producer", () => {
  const FORMATS = ["static", "interactive", "video", "scrolly"] as const;
  const PRODUCERS = ["chart-native", "map-native", "scrolly"] as const;

  for (const producer of PRODUCERS) {
    for (const format of FORMATS) {
      it(`${producer} + "${format}" → "${format}" (no "all"/style translation)`, () => {
        expect(formatFlag(producer, format)).toBe(format);
      });
    }
  }
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

// map-dw floor: the dispatch used to IGNORE p.format entirely for map-dw and always
// build PNG+embed (the last un-single-formatted producer). It now mirrors dw-chart's
// gate — a format outside {static, interactive} fails hard BEFORE produceMap (and thus
// before any Datawrapper API call): the outcome must be a clean "failed" result naming
// the correct producer (map-native owns animated maps), never a thrown invalid-spec
// error from a produceMap that should not have run at all.
describe("realDispatch — map-dw single-format gate (video/scrolly fail hard before any API call)", () => {
  const BAD_FORMATS: VisualFormat[] = ["video", "scrolly"];

  for (const format of BAD_FORMATS) {
    it(`fails a map-dw proposal pinned to "${format}" with the map-dw message`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "atelier-mapdw-gate-"));
      const p: AcceptedProposal = {
        id: "gate-check",
        producer: "map-dw",
        format,
        confirmedTakeaway: "The confirmed takeaway for this fixture",
        // Deliberately NOT a valid MapSpec: if the gate were missing, produceMap would
        // reject this spec ("invalid map spec") and the dispatch would throw instead of
        // returning the failed outcome asserted here.
        spec: { not: "a real map spec" },
      };
      const r = await realDispatch(p, join(dir, "out"));
      expect(r.status).toBe("failed");
      expect(r.error).toContain(`map-dw cannot build format "${format}"`);
      expect(r.error).toContain("map-native");
    });
  }
});

// Fallback-cleanup regression (delivery-hygiene bug): a re-produce that switches
// producer/format for the SAME proposal id (the sanctioned native→dw fallback, a source
// fix, a retry) dispatches into the exact same `<outDir>/<id>` directory as the
// superseded attempt (produce-all.ts computes it purely from `p.id`, unaware of prior
// runs). None of the 5 producers ever read pre-existing outDir contents before writing
// (verified: no incremental/cached build reads an old file first) — so wiping the
// directory immediately before a dispatch writes into it is always safe, and is the one
// hook common to every producer (both dispatchFileBased and realDispatch's cloud
// branch call it). This is what SKILL.md's "every re-produce writes a WHOLLY FRESH ..."
// invariant (5c) should have meant for the artifact directory too, not just report.json.
describe("freshOutDir — wipes a re-produce's outDir clean before the next dispatch writes into it", () => {
  it("removes a superseded attempt's stray artifacts, leaving only what the next dispatch writes", () => {
    // Reproduces the verified bug: a failed interactive map-native attempt left these
    // artifacts behind (interactive.html, its ephemeral review still, and the
    // interaction guard snapshots) in `exports/<slug>/<id>/` before the journalist fell
    // back to a static map-dw delivery for the same id.
    const dir = mkdtempSync(join(tmpdir(), "atelier-freshoutdir-"));
    writeFileSync(
      join(dir, "interactive.html"),
      "<html>stale interactive</html>",
    );
    writeFileSync(join(dir, "interactive.png"), "stale ephemeral review still");
    writeFileSync(join(dir, "a11y.png"), "stale a11y guard snapshot");
    writeFileSync(
      join(dir, "responsive-360.png"),
      "stale responsive guard snapshot",
    );
    writeFileSync(
      join(dir, "responsive-1600.png"),
      "stale responsive guard snapshot",
    );

    freshOutDir(dir);
    expect(readdirSync(dir)).toEqual([]);

    // The fallback dispatch (map-dw, format "static") then writes its own delivery —
    // exactly what dispatchFileBased/realDispatch do right after calling freshOutDir.
    writeFileSync(
      join(dir, "parite-parlement.png"),
      "the delivered static image",
    );

    expect(readdirSync(dir)).toEqual(["parite-parlement.png"]);
  });

  it("does not disturb a same-format re-produce's own outputs (no unrelated stray files survive it either)", () => {
    // A retry with the SAME producer/format (e.g. a source-fix re-run) also gets a
    // clean slate — proving this isn't special-cased to producer/format switches only.
    const dir = mkdtempSync(join(tmpdir(), "atelier-freshoutdir-retry-"));
    writeFileSync(
      join(dir, "static.png"),
      "the OLD render, about to be superseded",
    );

    freshOutDir(dir);
    expect(readdirSync(dir)).toEqual([]);

    writeFileSync(join(dir, "static.png"), "the NEW, corrected render");
    expect(readdirSync(dir)).toEqual(["static.png"]);
  });

  it("is safe on a directory that doesn't exist yet (first-ever produce for this id)", () => {
    const parent = mkdtempSync(join(tmpdir(), "atelier-freshoutdir-first-"));
    const dir = join(parent, "never-created-yet");
    const abs = freshOutDir(dir);
    expect(existsSync(abs)).toBe(true);
    expect(readdirSync(abs)).toEqual([]);
  });
});
