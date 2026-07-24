import { describe, it, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "cli.ts");

async function run(
  args: string[],
  stdin = "",
): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  return { code: await p.exited, out, err };
}

describe("the CLI façade — JSON in, JSON out, stable exit codes", () => {
  it("verbs prints the capability declaration and exits 0", async () => {
    const r = await run(["verbs"]);
    expect(r.code).toBe(0);
    const c = JSON.parse(r.out);
    expect(c.contract).toBe("splash-verbs/1");
    expect(c.verbs.map((v: { name: string }) => v.name)).toContain("render");
  });

  it("an unknown command exits 2 with a JSON error, never a stack trace", async () => {
    const r = await run(["explode"]);
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
    expect(r.err).not.toContain("at ");
  });

  it("state on a directory with no run exits 2 with a typed refusal", async () => {
    const r = await run([
      "state",
      "--run",
      mkdtempSync(join(tmpdir(), "cli-norun-")),
    ]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("no-run");
  });

  it("a verb outside the closed vocabulary exits 1 with invalid-request", async () => {
    const r = await run(["verb", "fetch-data"], JSON.stringify({}));
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
  });

  it("a declared but unimplemented verb exits 1 with not-implemented", async () => {
    const r = await run(["verb", "publish"], JSON.stringify({}));
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out).code).toBe("not-implemented");
  });

  it("unparseable stdin exits 2, and says so as JSON", async () => {
    const r = await run(["verb", "render"], "{ not json");
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
  });

  it("stdout carries ONLY the JSON document — a host parses it whole", async () => {
    const r = await run(["verbs"]);
    expect(() => JSON.parse(r.out)).not.toThrow();
  });
});
