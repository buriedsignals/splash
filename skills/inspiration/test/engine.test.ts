import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runEngine } from "../scripts/engine.mjs";

let dir = "";
let fake = "";
let slow = "";
let flood = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "inspiration-engine-"));
  fake = join(dir, "bsig");
  writeFileSync(
    fake,
    [
      "#!/bin/sh",
      'input="$(cat)"',
      'printf \'{"event":"progress"}\\n\'',
      'printf \'{"event":"result","data":{"args":"%s","stdin":"%s"}}\\n\' "$*" "$input"',
    ].join("\n"),
  );
  chmodSync(fake, 0o755);
  slow = join(dir, "slow");
  writeFileSync(slow, "#!/bin/sh\nsleep 5\n");
  chmodSync(slow, 0o755);
  flood = join(dir, "flood");
  writeFileSync(
    flood,
    "#!/bin/sh\nhead -c 2000000 /dev/zero | tr '\\0' a\nsleep 5\n",
  );
  chmodSync(flood, 0o755);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("runEngine", () => {
  it("should pass --json, the arguments and stdin, and parse the events", async () => {
    const outcome = await runEngine(
      fake,
      ["keys", "status", "INFOVIZ_TOKEN"],
      "hello",
      { timeoutMs: 5000 },
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.events[0]).toEqual({ event: "progress" });
    expect(outcome.events[1].data).toEqual({
      args: "--json keys status INFOVIZ_TOKEN",
      stdin: "hello",
    });
  });

  it("should refuse a relative executable path", async () => {
    await expect(
      runEngine("bsig", ["keys"], "", { timeoutMs: 1000 }),
    ).rejects.toThrow(/absolute/);
  });

  it("should stop a process that outlives its deadline", async () => {
    const started = Date.now();
    await expect(runEngine(slow, [], "", { timeoutMs: 200 })).rejects.toThrow(
      /timed out/,
    );
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("should reject output that exceeds its bound without waiting for the child to finish", async () => {
    const started = Date.now();
    await expect(runEngine(flood, [], "", { timeoutMs: 5000 })).rejects.toThrow(
      /exceeded its bound/,
    );
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
