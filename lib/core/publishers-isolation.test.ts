// The registry is GLOBAL to the module and `bun test` shares one process across files, so a
// test file that stubs publishers owes the next file the registry it found. This proof is the
// mechanical form of that debt: it runs the real publishers.test.ts in a child `bun test`,
// sandwiched between a file that loads the composition root and a file that inspects what is
// left, and fails if anything but the real adapters survives.
//
// Why a child process rather than an assertion in publishers.test.ts itself: the damage is
// only observable AFTER that file's last hook, which no test inside it can reach.
//
// Measured before the fix (docs/splash/residuals.md A5): the third file saw `["zip",
// "embed-fly"]` — two stubs, and the four real adapters gone. Worse than "an empty registry":
// registerAllPublishers() is first-registration-wins, so the four later suites that already
// call it defensively could NOT displace the leaked `zip` stub. They were green by file
// ordering alone.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");
const PUBLISHERS = join(REPO, "lib", "core", "publishers.ts");
const ROOT_MODULE = join(REPO, "lib", "delivery", "index.ts");
const ZIP_ADAPTER = join(REPO, "lib", "delivery", "adapters", "zip.ts");

const LOADS_ROOT = `
import { it, expect } from "bun:test";
import { lookupPublisher } from ${JSON.stringify(PUBLISHERS)};
import ${JSON.stringify(ROOT_MODULE)};

it("loads the composition root first, as a real run does", () => {
  expect(lookupPublisher("zip")).toBeDefined();
});
`;

// Calls registerAllPublishers() on purpose: that is the documented recovery, and the point of
// the proof is that recovery is NOT enough once an id has been claimed by a stub.
const INSPECTS_AFTER = `
import { it, expect } from "bun:test";
import { lookupPublisher, allPublishers } from ${JSON.stringify(PUBLISHERS)};
import { registerAllPublishers } from ${JSON.stringify(ROOT_MODULE)};
import { zipPublisher } from ${JSON.stringify(ZIP_ADAPTER)};

it("finds the real adapters, not a stub left behind by the previous file", () => {
  registerAllPublishers();
  expect(lookupPublisher("zip")).toBe(zipPublisher);
  expect(allPublishers().map((p) => p.id).sort()).toEqual([
    "embed-cloudflare",
    "embed-cms",
    "embed-s3",
    "zip",
  ]);
});
`;

describe("publishers.test.ts leaves the registry as it found it", () => {
  it("should let a later file in the same process see the real adapters", async () => {
    const dir = mkdtempSync(join(tmpdir(), "publishers-isolation-"));
    const loads = join(dir, "a-loads-root.test.ts");
    const inspects = join(dir, "z-inspects-after.test.ts");
    writeFileSync(loads, LOADS_ROOT);
    writeFileSync(inspects, INSPECTS_AFTER);

    const child = Bun.spawn(
      ["bun", "test", loads, PUBLISHERS.replace(/\.ts$/, ".test.ts"), inspects],
      {
        cwd: REPO,
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [code, stderr] = await Promise.all([
      child.exited,
      new Response(child.stderr).text(),
    ]);
    expect(stderr).not.toContain("(fail)");
    expect(code).toBe(0);
  }, 60_000);
});
