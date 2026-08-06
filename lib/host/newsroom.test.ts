import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describeNewsroom } from "./newsroom";

const CLI = resolve(import.meta.dir, "./cli.ts");

function newsroomDir(uiLang: string): string {
  const d = mkdtempSync(join(tmpdir(), "host-newsroom-"));
  writeFileSync(
    join(d, "newsroom.json"),
    JSON.stringify({
      schemaVersion: 1,
      runtime: "goose",
      uiLang,
      // "embed-s3" is a DELIVERY capability (chosen, not merely available) — the one kind of
      // capability README.md's `blockers` actually describes. "dw-chart" (an engine) used to sit
      // here instead, back when engines were gated on the same tick delivery still is; Task 5
      // (2026-08-06) removed that tick for engines, so an engine fixture no longer demonstrates
      // a blocker at all — it demonstrates the bug this file's `DELIVERY_IDS` filter now guards
      // against (every unconfigured engine reading as a blocker, README or not).
      capabilities: { "embed-s3": { enabled: true } },
    }),
  );
  return d;
}

// The readiness environment is INJECTED: install/runtimes/*.sh source the install's .env
// before launching the agent, so ambient process.env is not neutral — a shell that did would
// otherwise turn "dw-chart is a blocker" green and this assertion red on a real machine.
const NO_ENV = { env: {} };

describe("describeNewsroom", () => {
  it("answers with the decor in the shared envelope", () => {
    const r = describeNewsroom(newsroomDir("de"), NO_ENV);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const value = r.value as {
      runtime: string;
      language: { ui: string };
      capabilities: { id: string; status: string }[];
      blockers: { id: string }[];
    };
    expect(value.runtime).toBe("goose");
    expect(value.language.ui).toBe("de");
    expect(value.capabilities.length).toBeGreaterThan(0);
    // `capabilities` still carries every registered capability, engines included (this dir's
    // engines are all keyless-missing) — but `blockers` is DELIVERY-only, matching README.md's
    // "the subset of those that are enabled but not currently usable": embed-s3 is enabled but
    // has neither key, so it is the only blocker, whatever the unconfigured engines report.
    expect(value.blockers.map((b) => b.id)).toEqual(["embed-s3"]);
  });

  it("never throws on a directory that holds nothing", () => {
    const r = describeNewsroom(
      mkdtempSync(join(tmpdir(), "host-empty-")),
      NO_ENV,
    );
    expect(r.ok).toBe(true);
  });

  // `--dir` is host input, and host input is untrusted here exactly as `verb`'s outDir is.
  // It used to mkdirSync and write newsroom.json into whatever path it was handed, while the
  // README called this command read-only.
  it("writes nothing into the directory it is handed, and does not create it", () => {
    const d = mkdtempSync(join(tmpdir(), "host-readonly-"));
    writeFileSync(join(d, ".splash-runtime"), "goose\n");
    const r = describeNewsroom(d, NO_ENV);
    expect(r.ok).toBe(true);
    expect(readdirSync(d)).toEqual([".splash-runtime"]);

    const absent = join(d, "nope", "not-here");
    expect(describeNewsroom(absent, NO_ENV).ok).toBe(true);
    expect(existsSync(absent)).toBe(false);
  });
});

describe("the newsroom command, in a process that imports only the façade", () => {
  it("prints the decor as JSON and exits 0", () => {
    const r = spawnSync("bun", [CLI, "newsroom", "--dir", newsroomDir("fr")], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout) as {
      ok: boolean;
      value: { language: { ui: string } };
    };
    expect(body.ok).toBe(true);
    expect(body.value.language.ui).toBe("fr");
  });

  it("refuses an unknown flag as a usage error, exit 2", () => {
    const r = spawnSync("bun", [CLI, "newsroom", "--bogus", "x"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
    const body = JSON.parse(r.stdout) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
  });

  it("names newsroom among the commands it expects", () => {
    const r = spawnSync("bun", [CLI, "nonsense"], { encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("newsroom");
  });
});
