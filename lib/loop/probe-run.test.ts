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

test("an argv element containing shell metacharacters is never interpreted — spawned as a literal argument, not a shell line", () => {
  // The header comment's guarantee: a probe is an ARGV ARRAY, spawned as-is, never handed to a
  // shell. If runProbes ever regressed to `Bun.spawnSync(spec.command.join(" "), {shell:true})`,
  // `$(whoami)` would be shell-expanded to the current user's name; spawned as argv, `echo`
  // receives it as one opaque string and prints it back literally.
  const [r] = runProbes(
    [
      {
        check: "argv is never shell-interpolated",
        command: ["echo", "$(whoami)"],
      },
    ],
    { cwd: process.cwd() },
  );
  expect(r!.outcome).toBe("pass");
  expect(r!.note).toBe("$(whoami)");
});

test("a probe that outlives its timeout is a concern, not a hang", () => {
  const start = Date.now();
  const [r] = runProbes([{ check: "a hung probe", command: ["sleep", "5"] }], {
    cwd: process.cwd(),
    timeoutMs: 200,
  });
  expect(Date.now() - start).toBeLessThan(4000);
  expect(r!.outcome).toBe("concern");
  expect(r!.exitCode).toBeNull();
  expect(r!.note).toContain("timed out");
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
