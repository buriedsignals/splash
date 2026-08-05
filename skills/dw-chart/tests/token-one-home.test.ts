// ONE KEY, ONE HOME (registry E17).
//
// The defect, measured 2026-08-04: the preflight reads DATAWRAPPER_API_TOKEN from the INSTALL's
// own `.env`, by path. The producer read it from `process.env` — which Bun fills only by
// auto-loading the `.env` of the CURRENT DIRECTORY, and it does not walk up. The two agree while
// the journalist works from ~/Splash and diverge in silence the moment they open their own
// article folder instead: **preflight green, production dead.**
//
// That is the worst shape a readiness answer can take. It is not a missing key — the key is
// there, in the file the launcher sources; it is two components disagreeing about where "the
// environment" is, with the check on the reassuring side.
//
// The house already owns the answer: `decorEnv(root)` (lib/newsroom/decor.ts) is the install's own
// `.env` with `process.env` winning, and its header states this exact trap. The fix is to make the
// producer read what the preflight judged, so a green preflight means the production call will
// find the same key.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dir, "..", "..", "..");

/** Runs a snippet the way a journalist's session runs a producer: from THEIR directory, with no
 *  token in the ambient environment, and the install addressable. */
async function fromElsewhere(
  snippet: string,
  installEnvContents: string | null,
): Promise<string> {
  const install = mkdtempSync(join(tmpdir(), "splash-install-"));
  if (installEnvContents !== null)
    writeFileSync(join(install, ".env"), installEnvContents);
  const elsewhere = mkdtempSync(join(tmpdir(), "journalist-folder-"));
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    SPLASH_INSTALL_ROOT: install,
  };
  delete env.DATAWRAPPER_API_TOKEN;
  const p = Bun.spawn(["bun", "-e", snippet], {
    cwd: elsewhere,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  await p.exited;
  return (out + err).trim();
}

const READ_TOKEN = `
import { datawrapperToken } from "${REPO}/skills/dw-chart/src/datawrapper.ts";
try { console.log("TOKEN:" + datawrapperToken()); }
catch (e) { console.log("THREW:" + e.message.slice(0, 60)); }
`;

describe("the producer reads the key from the same home the preflight judged", () => {
  it("should find the token in the INSTALL's .env when the journalist works from their own folder", async () => {
    const out = await fromElsewhere(
      READ_TOKEN,
      "DATAWRAPPER_API_TOKEN=tok-from-install\n",
    );
    expect(out).toContain("TOKEN:tok-from-install");
  });

  // The ambient environment must still WIN — a token exported for one run is a legitimate
  // override, and decorEnv is built that way round on purpose.
  it("should let an ambient token override the install's", async () => {
    const install = mkdtempSync(join(tmpdir(), "splash-install-"));
    writeFileSync(
      join(install, ".env"),
      "DATAWRAPPER_API_TOKEN=from-install\n",
    );
    const elsewhere = mkdtempSync(join(tmpdir(), "journalist-folder-"));
    const p = Bun.spawn(["bun", "-e", READ_TOKEN], {
      cwd: elsewhere,
      env: {
        ...(process.env as Record<string, string>),
        SPLASH_INSTALL_ROOT: install,
        DATAWRAPPER_API_TOKEN: "from-ambient",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(p.stdout).text();
    await p.exited;
    expect(out).toContain("TOKEN:from-ambient");
  });

  // And a genuinely missing key must still refuse — the point is to stop LYING about where the
  // key is, not to stop reporting that there is none.
  it("should still refuse, with its actionable message, when no home carries the key", async () => {
    const out = await fromElsewhere(READ_TOKEN, "");
    expect(out).toContain("THREW:");
    expect(out).toContain("DATAWRAPPER_API_TOKEN");
  });
});
