import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Integration coverage for the Bun configurator server. Network-independent: every case uses
// blank keys (verifyAll short-circuits blanks to null without a fetch) or a malformed body.
const CFG = join(import.meta.dir, "configurator.ts");

async function startServer(
  dest: string,
): Promise<{ port: number; proc: Bun.Subprocess }> {
  const proc = Bun.spawn(["bun", CFG], {
    cwd: dest,
    env: { ...process.env, SPLASH_NO_OPEN: "1" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
  const dec = new TextDecoder();
  let buf = "";
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value);
    const m = buf.match(/127\.0\.0\.1:(\d+)/);
    if (m) {
      reader.releaseLock();
      return { port: Number(m[1]), proc };
    }
  }
  proc.kill();
  throw new Error("configurator never printed a port; stdout was: " + buf);
}

test("POST /verify with a malformed body returns a clean 400, not Bun's 500 overlay", async () => {
  const dest = mkdtempSync(join(tmpdir(), "splash-cfg-"));
  const { port, proc } = await startServer(dest);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/verify`, {
      method: "POST",
      body: "not-json{{{",
    });
    expect(r.status).toBe(400);
    expect(await r.text()).toBe("invalid request body");
  } finally {
    proc.kill();
    rmSync(dest, { recursive: true, force: true });
  }
});

test("POST /submit (all-blank, soft path) writes a double-quoted .env + runtime", async () => {
  const dest = mkdtempSync(join(tmpdir(), "splash-cfg-"));
  const { port, proc } = await startServer(dest);
  try {
    const body = JSON.stringify({
      runtime: "claude",
      maptiler: "",
      datawrapper: "",
      anthropic: "",
      embedProject: "",
      cloudflareToken: "",
      cloudflareAccount: "",
    });
    const r = await fetch(`http://127.0.0.1:${port}/submit`, {
      method: "POST",
      body,
    });
    expect(r.status).toBe(200);
    const env = readFileSync(join(dest, ".env"), "utf8");
    expect(env).toContain('VITE_MAPTILER_KEY=""');
    expect(env).toContain('DATAWRAPPER_API_TOKEN=""');
    expect(env).not.toContain("ANTHROPIC_API_KEY");
    expect(existsSync(join(dest, ".splash-runtime"))).toBe(true);
  } finally {
    proc.kill();
    rmSync(dest, { recursive: true, force: true });
  }
});

test("GET an unknown path returns 404", async () => {
  const dest = mkdtempSync(join(tmpdir(), "splash-cfg-"));
  const { port, proc } = await startServer(dest);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/nope`);
    expect(r.status).toBe(404);
  } finally {
    proc.kill();
    rmSync(dest, { recursive: true, force: true });
  }
});
