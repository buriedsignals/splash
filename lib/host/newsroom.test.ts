import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
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
      capabilities: { "dw-chart": { enabled: true } },
    }),
  );
  return d;
}

describe("describeNewsroom", () => {
  it("answers with the decor in the shared envelope", () => {
    const r = describeNewsroom(newsroomDir("de"));
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
    // dw-chart is enabled but this temp dir has no token: a blocker, and the only one.
    expect(value.blockers.map((b) => b.id)).toEqual(["dw-chart"]);
  });

  it("never throws on a directory that holds nothing", () => {
    const r = describeNewsroom(mkdtempSync(join(tmpdir(), "host-empty-")));
    expect(r.ok).toBe(true);
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
