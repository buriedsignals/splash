import { describe, it, expect } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDecor, installRoot } from "../newsroom/decor";
import { DEFAULT_UI_LANG } from "../newsroom/language";

// Spawned, never called in process: `init` exists so that a host outside JavaScript can start a
// run, and a test that imported initRun would prove nothing about that host.
const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin = "",
): Promise<{ code: number; body: Record<string, unknown> }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  return { code, body: JSON.parse(out) };
}

function scene(): { dir: string; csv: string } {
  const dir = mkdtempSync(join(tmpdir(), "host-init-"));
  const csv = join(dir, "premiums.csv");
  writeFileSync(csv, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  return { dir, csv };
}

function declaration(csv: string): string {
  return JSON.stringify({
    runId: "premiums",
    input: { data: csv },
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
  });
}

// HERMETIC (registry E14). The house language is read from the INSTALL, and the install's
// `NEWSROOM-PROFILE.md` is untracked — present in one worktree, absent in the next. Pinning "en"
// pinned an accident of the checkout: it reddened for whoever had a profile installed, which is
// exactly the person most likely to be working on the house charter, and it accused their work.
//
// Derived from the same source the façade reads (drive.ts:207 `tryLoadDecor().language.content`),
// so the assertion is now the real contract — "the confirm-back reports the house content
// language" — and it BITES HARDER than the pin: a façade that hardcoded a language would differ
// from the install's and redden, which the old "en" could never catch on an English install.
function houseContentLang(): string {
  try {
    return loadDecor(installRoot()).language.content;
  } catch {
    return DEFAULT_UI_LANG;
  }
}

describe("init: the façade can begin a run", () => {
  it("creates a run and answers what is valid next", async () => {
    const { dir, csv } = scene();
    const r = await cli(["init", "--run", dir], declaration(csv));
    expect(r.code).toBe(0);
    expect(r.body).toEqual({
      ok: true,
      // No article language declared, so the confirm-back reports the INSTALL's house content
      // language — derived, never pinned (see houseContentLang above).
      value: {
        runId: "premiums",
        nextActions: ["orient"],
        lang: houseContentLang(),
      },
    });
    expect(existsSync(join(dir, "run.json"))).toBe(true);
  });

  it("hands over to state, in a separate process", async () => {
    const { dir, csv } = scene();
    expect((await cli(["init", "--run", dir], declaration(csv))).code).toBe(0);
    const state = await cli(["state", "--run", dir]);
    expect(state.code).toBe(0);
    const report = state.body.value as {
      runId: string;
      inputValidation: { ref: string; status: string }[];
      elements: { gateState: string }[];
    };
    expect(report.runId).toBe("premiums");
    expect(report.inputValidation).toEqual([{ ref: "data", status: "ok" }]);
    expect(report.elements[0]!.gateState).toBe("empty");
  });

  it("refuses an empty stdin as a usage problem", async () => {
    const { dir } = scene();
    const r = await cli(["init", "--run", dir], "");
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
  });

  it("refuses unparseable stdin as a usage problem", async () => {
    const { dir } = scene();
    const r = await cli(["init", "--run", dir], "{not json");
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
  });

  it("refuses a missing --run", async () => {
    const { csv } = scene();
    const r = await cli(["init"], declaration(csv));
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
  });

  it("refuses an unknown flag", async () => {
    const { dir, csv } = scene();
    const r = await cli(
      ["init", "--run", dir, "--bogus", "x"],
      declaration(csv),
    );
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
  });

  // The two failure families the façade already draws, applied here: a malformed COMMAND is a
  // usage problem (2), a well-formed declaration the loop DECLINED is a refusal (1).
  it("refuses a declaration the loop declines as a refusal, not a usage error", async () => {
    const { dir, csv } = scene();
    const r = await cli(
      ["init", "--run", dir],
      JSON.stringify({ runId: "x", input: { data: csv }, angle: "sneaky" }),
    );
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
    expect(String(r.body.message)).toContain("angle");
    expect(existsSync(join(dir, "run.json"))).toBe(false);
  });

  // The run's source ledger is written once, at init, and no later step can add it — so a
  // declaration that names data without saying what it is would create a run that can never
  // produce. The refusal is the question itself, put before the run exists.
  it("asks where the data comes from rather than starting a run that could never produce", async () => {
    const { dir, csv } = scene();
    const r = await cli(
      ["init", "--run", dir],
      JSON.stringify({ runId: "premiums", input: { data: csv } }),
    );
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
    expect(String(r.body.message)).toContain("Where does this data come from");
    expect(existsSync(join(dir, "run.json"))).toBe(false);
  });

  it("refuses to overwrite a run that already exists", async () => {
    const { dir, csv } = scene();
    expect((await cli(["init", "--run", dir], declaration(csv))).code).toBe(0);
    const second = await cli(["init", "--run", dir], declaration(csv));
    expect(second.code).toBe(1);
    expect(String(second.body.message)).toContain("run.json");
  });
});
