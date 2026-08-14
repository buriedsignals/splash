import { chmod, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { runEngineDoctor } from "../doctor.mjs";

async function fixture(t: { tempDir: string }) {
  const bsig = join(t.tempDir, "bsig-fixture");
  await writeFile(bsig, "fixture\n");
  await chmod(bsig, 0o755);
  return bsig;
}

test("Splash doctor delegates to the canonical Engine product doctor", async () => {
  const root = await mkdtemp(join(tmpdir(), "splash-doctor-"));
  try {
    const bsig = await fixture({ tempDir: root });
    const calls: string[][] = [];
    const exitCode = await runEngineDoctor({
      argv: ["--bsig", bsig, "--json"],
      async runCommand(command) {
        calls.push(command);
        return 7;
      },
    });
    expect(exitCode).toBe(7);
    expect(calls).toEqual([
      [await realpath(bsig), "--json", "doctor", "--product", "splash"],
    ]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("Splash doctor rejects legacy local-doctor flags", async () => {
  await expect(
    runEngineDoctor({ argv: ["--root", "/tmp/splash"] }),
  ).rejects.toThrow("usage:");
});
