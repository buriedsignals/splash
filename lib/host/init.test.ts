import { describe, it, expect } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

describe("init: the façade can begin a run", () => {
  it("creates a run and answers what is valid next", async () => {
    const { dir, csv } = scene();
    const r = await cli(["init", "--run", dir], declaration(csv));
    expect(r.code).toBe(0);
    expect(r.body).toEqual({
      ok: true,
      value: { runId: "premiums", nextActions: ["orient"] },
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

  it("refuses to overwrite a run that already exists", async () => {
    const { dir, csv } = scene();
    expect((await cli(["init", "--run", dir], declaration(csv))).code).toBe(0);
    const second = await cli(["init", "--run", dir], declaration(csv));
    expect(second.code).toBe(1);
    expect(String(second.body.message)).toContain("run.json");
  });
});
