import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describePrecheck } from "./gates";

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
