/**
 * THE FALSE GREEN THIS PINS, measured on this machine rather than inherited from a report.
 *
 * `checkDependencies` used to ask `Bun.resolveSync(name, root)`. That implements Node's resolution
 * algorithm faithfully — and Node's algorithm WALKS UP the directory chain. Measured on Bun 1.3.5:
 * a root whose `node_modules/` was completely empty reported all nine declared dependencies
 * resolved, every hit coming from a `node_modules` in an ANCESTOR directory. `runPreflight` then
 * reported `ready: true` for a root where nothing at all was installed.
 *
 * (The ORIGINAL Splash hit the same class through a different door — Bun's global install cache —
 * and its fix carries the same instruction. Worth knowing that the two mechanisms differ: an empty
 * root under `/tmp` does NOT false-green on Bun 1.3.5, which is why the original's exact
 * reproduction no longer reproduces and this test builds its own.)
 *
 * WHY THIS TEST SPAWNS ITS OWN PROCESS — stated precisely, because the received reason turned out
 * to be wrong for this mechanism and it would have been easy to repeat it.
 *
 * The received reason, from the original's own record, is that in-process the false green does not
 * manifest, so the test passes against uncorrected code and proves nothing. That is true of the
 * mechanism the original hit — Bun's GLOBAL INSTALL CACHE, which is warm per-process state. It is
 * NOT true of the mechanism measured here: the ancestor walk was probed in-process against this
 * exact fixture and reproduced exactly the same way, both packages resolving out of `outer/`. So an
 * in-process assertion would redden under this mutation too, and claiming otherwise would be
 * inheriting a conclusion instead of measuring one.
 *
 * The spawn earns its place for a different, still-real reason: it exercises `runPreflight` the way
 * a session actually reaches it — a fresh `bun`, its own working directory, nothing already loaded —
 * so what is asserted is the whole invocation path rather than one function's return value. That is
 * also what keeps the guard honest if the mechanism ever changes back to a per-process cache, which
 * an in-process test provably cannot see.
 *
 * THE FIXTURE reproduces the ancestor walk in miniature, inside the OS temp directory, so it
 * touches nothing in this repository and depends on nothing about where the repository sits:
 *
 *     <lab>/outer/node_modules/<pkg>/…      ← stub packages, the "ancestor" tree
 *     <lab>/outer/root/node_modules/        ← EMPTY: this is the newsroom root under test
 *     <lab>/outer/root/package.json
 *
 * `Bun.resolveSync` finds the stubs from `root` and answers "installed". `resolveDepInTree` looks in
 * `root/node_modules` and answers the truth.
 *
 * MUTATION THAT REDDENS IT: in `scripts/preflight.mjs`, replace the body of `resolveDepInTree` with
 * `try { Bun.resolveSync(name, root); return true; } catch { return false; }`. Verified in a copy of
 * the tree outside it: the first case below flips to `pass` / `ready: true` and this file goes red.
 */
import { describe, it, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PREFLIGHT = join(import.meta.dirname, "..", "scripts", "preflight.mjs");
const TEMPLATE_PKG = join(
  import.meta.dirname,
  "..",
  "assets",
  "root-template",
  "package.json",
);

/**
 * Runs `runPreflight` in a FRESH `bun` process whose working directory is the root under test, the
 * way a journalist's session reaches it, and returns the parsed report. `fetchFn` is stubbed to a
 * rejected probe so no network is touched: this test is about `checks.dependencies`, and
 * capabilities never affect it.
 */
async function preflightOutOfProcess(root: string) {
  const program = `
    const { runPreflight } = await import(${JSON.stringify(PREFLIGHT)});
    const report = await runPreflight({
      root: ${JSON.stringify(root)},
      env: {},
      fetchFn: async () => ({ ok: false, status: 0 }),
    });
    console.log(JSON.stringify(report));
  `;
  const proc = Bun.spawn(["bun", "-e", program], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (!out.trim())
    throw new Error(`preflight produced no report. stderr:\n${err}`);
  return JSON.parse(out.trim());
}

async function buildLab() {
  const lab = await mkdtemp(join(tmpdir(), "splash-preflight-"));
  const outer = join(lab, "outer");
  const root = join(outer, "root");

  const declared = Object.keys(
    JSON.parse(await Bun.file(TEMPLATE_PKG).text()).dependencies ?? {},
  );

  // The ANCESTOR tree — real enough for Node's resolver to accept, which is the whole point.
  for (const name of declared) {
    const dir = join(outer, "node_modules", name);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name, version: "0.0.0", main: "index.js" }),
    );
    await writeFile(join(dir, "index.js"), "export default {};\n");
  }

  // The root under test: its own manifest, and an EMPTY node_modules.
  await mkdir(join(root, "node_modules"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    await Bun.file(TEMPLATE_PKG).text(),
  );

  return { lab, outer, root, declared };
}

describe("preflight resolves dependencies in the root's OWN tree", () => {
  it("should report `fail` for a root whose node_modules is empty, even when an ancestor has every package", async () => {
    const { lab, root, declared } = await buildLab();
    try {
      // The premise, asserted rather than assumed: the naive resolver really does answer "installed"
      // here. If Bun ever stops walking up, this line fails and the test below becomes vacuous —
      // better to be told than to keep a guard that guards nothing.
      const naiveResolved = declared.filter((name) => {
        try {
          Bun.resolveSync(name, root);
          return true;
        } catch {
          return false;
        }
      });
      expect(naiveResolved).toEqual(declared);

      const report = await preflightOutOfProcess(root);
      const dependencies = report.checks.find(
        (c: any) => c.id === "dependencies",
      );
      expect(dependencies.status).toBe("fail");
      for (const name of declared) expect(dependencies.detail).toContain(name);
      expect(report.ready).toBe(false);
    } finally {
      await rm(lab, { recursive: true, force: true });
    }
  }, 30_000);

  it("should report `pass` once the packages are in the root's own node_modules", async () => {
    const { lab, root, declared } = await buildLab();
    try {
      for (const name of declared) {
        const dir = join(root, "node_modules", name);
        await mkdir(dir, { recursive: true });
        await writeFile(
          join(dir, "package.json"),
          JSON.stringify({ name, version: "0.0.0", main: "index.js" }),
        );
        await writeFile(join(dir, "index.js"), "export default {};\n");
      }
      // The template also vendors `shared/`; a root without it fails for that reason instead, which
      // would make this case pass for the wrong reason. Copy it in, the way the install does.
      const templateShared = join(
        import.meta.dirname,
        "..",
        "assets",
        "root-template",
        "shared",
      );
      await Bun.spawn(["cp", "-R", templateShared, join(root, "shared")])
        .exited;

      const report = await preflightOutOfProcess(root);
      const dependencies = report.checks.find(
        (c: any) => c.id === "dependencies",
      );
      expect(dependencies.status).toBe("pass");
    } finally {
      await rm(lab, { recursive: true, force: true });
    }
  }, 30_000);
});
