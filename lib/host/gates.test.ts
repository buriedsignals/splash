import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describePrecheck, describeProbeRun, presentIn } from "./gates";
import { NO_VIEWER_VAR } from "../loop/preview";

const CLI = resolve(import.meta.dir, "./cli.ts");

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "splash-host-gates-"));
}

test("production stage: a directory with no menu answers a refusal, with its route", () => {
  const dir = tmp();
  try {
    const r = describePrecheck({ stage: "production", dir });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("step-refused");
    expect(r.message).toContain("no ranked list of visuals");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production stage: a directory with the menu answers ok, saying what it checked", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "candidates.json"), "[]");
    const r = describePrecheck({ stage: "production", dir });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ stage: "production", dir, passed: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// CRITICAL 2 regression: produce-all.mjs exempts the direct branch (a proposal the journalist
// NAMED, skillsInvoked: ["splash:cadrage-direct"]) from the ranked-menu precondition — this
// façade must agree, or a legitimate direct-branch run refuses here and nowhere else.
test("production stage: a direct-branch accepted.json passes with NO menu at all — the exemption produce-all.mjs applies", () => {
  const dir = tmp();
  try {
    writeFileSync(
      join(dir, "accepted.json"),
      JSON.stringify([
        {
          id: "p1",
          producer: "chart-native",
          format: "static",
          skillsInvoked: ["splash:cadrage-direct"],
          spec: {},
        },
      ]),
    );
    const r = describePrecheck({ stage: "production", dir });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ stage: "production", dir, passed: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production stage: a NON-direct accepted.json with no menu still refuses, and names the direct-branch escape hatch", () => {
  const dir = tmp();
  try {
    writeFileSync(
      join(dir, "accepted.json"),
      JSON.stringify([
        { id: "p1", producer: "chart-native", format: "static", spec: {} },
      ]),
    );
    const r = describePrecheck({ stage: "production", dir });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("no ranked list of visuals");
    expect(r.message).toContain("splash:cadrage-direct");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production stage: a mixed accepted.json (one direct, one not) with no menu still refuses — the exemption is all-or-nothing per produce-all's own .some()", () => {
  const dir = tmp();
  try {
    writeFileSync(
      join(dir, "accepted.json"),
      JSON.stringify([
        {
          id: "p1",
          producer: "chart-native",
          format: "static",
          skillsInvoked: ["splash:cadrage-direct"],
          spec: {},
        },
        { id: "p2", producer: "chart-native", format: "static", spec: {} },
      ]),
    );
    const r = describePrecheck({ stage: "production", dir });
    expect(r.ok).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export stage: the build folder is refused, and every planted file is named", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "interactive.html"), "<html></html>");
    writeFileSync(join(dir, "config.json"), "{}");
    const r = describePrecheck({
      stage: "export",
      dir,
      format: "interactive",
      form: "html",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("config.json");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export stage needs a format, and says which ones exist rather than guessing one", () => {
  const dir = tmp();
  try {
    const r = describePrecheck({ stage: "export", dir });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("usage");
    expect(r.message).toContain("static");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unreadable directory is an input problem, never a silent pass", () => {
  const r = describePrecheck({
    stage: "export",
    dir: "/nope/nowhere",
    format: "static",
    form: null,
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("usage");
});

test("the CLI carries the refusal to an exit code a shell can read", async () => {
  const dir = tmp();
  try {
    const p = Bun.spawnSync([
      "bun",
      CLI,
      "precheck",
      "--stage",
      "production",
      "--dir",
      dir,
    ]);
    expect(p.exitCode).toBe(1);
    const body = JSON.parse(p.stdout.toString());
    expect(body.ok).toBe(false);
    expect(body.message).toContain("no ranked list of visuals");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("present answers with the receipt — what was opened, and which bytes", () => {
  const dir = tmp();
  try {
    const p = join(dir, "static.png");
    writeFileSync(p, "PNGDATA");
    const r = presentIn(p, { [NO_VIEWER_VAR]: "1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = r.value as { path: string; sha256: string; presentedAs: string };
    expect(v.path).toBe(p);
    expect(v.sha256).toHaveLength(64);
    expect(v.presentedAs).toBe("path-printed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("present refuses a path that is not a file, and writes no receipt for it", () => {
  const r = presentIn("/nope/nowhere.png", { [NO_VIEWER_VAR]: "1" });
  expect(r.ok).toBe(false);
});

test("the CLI opens the artifact and prints the receipt as its whole answer", () => {
  const dir = tmp();
  try {
    const p = join(dir, "static.png");
    writeFileSync(p, "PNGDATA");
    const proc = Bun.spawnSync(["bun", CLI, "present", "--path", p], {
      env: { ...process.env, [NO_VIEWER_VAR]: "1" },
    });
    expect(proc.exitCode).toBe(0);
    const body = JSON.parse(proc.stdout.toString());
    expect(body.ok).toBe(true);
    expect(body.value.sha256).toHaveLength(64);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("probe refuses a ledger whose commands are prose, before running any of it", () => {
  const r = describeProbeRun(
    [{ check: "x", command: "rm -rf /" }],
    process.cwd(),
  );
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("usage");
});
