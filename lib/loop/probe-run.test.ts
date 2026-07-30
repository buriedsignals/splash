import { test, expect } from "bun:test";
import { runProbes } from "./probe-run";

test("a probe that exits zero passes, and the outcome comes from the exit code", () => {
  const [r] = runProbes([{ check: "the file is there", command: ["true"] }], {
    cwd: process.cwd(),
  });
  expect(r!.outcome).toBe("pass");
  expect(r!.exitCode).toBe(0);
  expect(r!.check).toBe("the file is there");
});

test("a probe that exits non-zero is a concern, whatever anyone says about it", () => {
  const [r] = runProbes(
    [{ check: "the dataset answers", command: ["false"] }],
    { cwd: process.cwd() },
  );
  expect(r!.outcome).toBe("concern");
  expect(r!.exitCode).not.toBe(0);
  expect(r!.note).toContain("exited");
});

test("a probe's own output travels as its note — the evidence, not a summary of it", () => {
  const [r] = runProbes(
    [
      {
        check: "the title is painted",
        command: ["sh", "-c", "echo NOPE >&2; exit 3"],
      },
    ],
    { cwd: process.cwd() },
  );
  expect(r!.exitCode).toBe(3);
  expect(r!.note).toContain("NOPE");
});

test("a command that cannot be run at all is a concern, never a pass by omission", () => {
  const [r] = runProbes(
    [
      {
        check: "the renderer answers",
        command: ["definitely-not-a-command-xyz"],
      },
    ],
    { cwd: process.cwd() },
  );
  expect(r!.outcome).toBe("concern");
  expect(r!.note.length).toBeGreaterThan(0);
});

test("a malformed command is refused by SHAPE, before anything is executed", () => {
  const [r] = runProbes([{ check: "x", command: [] as unknown as string[] }], {
    cwd: process.cwd(),
  });
  expect(r!.outcome).toBe("concern");
  expect(r!.note).toContain("argv");
  expect(r!.exitCode).toBeNull();
});

test("every probe runs — one failure does not cut the ledger short", () => {
  const out = runProbes(
    [
      { check: "a", command: ["false"] },
      { check: "b", command: ["true"] },
      { check: "c", command: ["false"] },
    ],
    { cwd: process.cwd() },
  );
  expect(out.map((p) => p.outcome)).toEqual(["concern", "pass", "concern"]);
});
