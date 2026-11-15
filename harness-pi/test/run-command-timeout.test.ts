// A web render whose tick label called itself spun until the 12-minute kill; the driver read exit 137 as a refusal,
// opened a second craft session on the same hung kit, and the cell took 45 minutes. A killed render says it hung,
// and a hang ends the run with its reason instead of another craft.
import { describe, expect, it } from "bun:test";
import { hungRender, runCommand } from "../src/tools/run.ts";

const bases = { root: import.meta.dir, storyDir: import.meta.dir } as any;

describe("runCommand", () => {
  it("should report a child killed by its time limit as timed out", async () => {
    const r = await runCommand(["bun", "-e", "for(;;){}"], bases, {}, 500);
    expect(r.timedOut).toBe(true);
  });
  it("should not report a child that exits as timed out", async () => {
    const r = await runCommand(["bun", "-e", "process.exit(3)"], bases, {}, 5_000);
    expect(r.timedOut).toBeFalsy();
  });
});

describe("hungRender", () => {
  it("should name the hang when the final render timed out", () => {
    expect(hungRender({ exitCode: 137, stdout: "", stderr: "", timedOut: true }, "1", 6)).toContain("never finished");
  });
  it("should stay silent when the render refused", () => {
    expect(hungRender({ exitCode: 1, stdout: "REFUSED — x", stderr: "" }, "1", 6)).toBeNull();
  });
});
