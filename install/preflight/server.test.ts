import { afterAll, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MODEL_SCRIPT_ID } from "./copy.ts";

const ENTRY = join(import.meta.dir, "..", "configurator.ts");
const roots: string[] = [];

function root(): string {
  const d = mkdtempSync(join(tmpdir(), "splash-preflight-"));
  roots.push(d);
  return d;
}

afterAll(() => {
  for (const d of roots) rmSync(d, { recursive: true, force: true });
});

async function start(
  dest: string,
): Promise<{ port: number; proc: Bun.Subprocess }> {
  const proc = Bun.spawn(["bun", ENTRY], {
    cwd: dest,
    // No provider is reachable from these cases (every credential is blank, which short-circuits
    // before any fetch), and SPLASH_NO_OPEN keeps the browser out of a test run.
    env: { ...process.env, SPLASH_NO_OPEN: "1" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value);
    const m = buffer.match(/127\.0\.0\.1:(\d+)/);
    if (m) {
      reader.releaseLock();
      return { port: Number(m[1]), proc };
    }
  }
  proc.kill();
  throw new Error(
    "the setup page never printed a port; stdout was:\n" + buffer,
  );
}

async function withServer<T>(
  dest: string,
  run: (port: number) => Promise<T>,
): Promise<T> {
  const { port, proc } = await start(dest);
  try {
    return await run(port);
  } finally {
    proc.kill();
  }
}

function submission(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    runtime: "claude",
    uiLang: "en",
    contentLang: "en",
    login: "",
    credentials: {},
    enabled: [],
    publisher: "zip",
    verified: {},
    ...over,
  });
}

describe("the setup page as served", () => {
  it("serves the real page file, with the model embedded for the client", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/`);
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toContain("text/html");
      const html = await r.text();
      expect(html).toContain(`id="${MODEL_SCRIPT_ID}"`);
      const payload = html.slice(
        html.indexOf(`id="${MODEL_SCRIPT_ID}"`),
        html.indexOf("</script>", html.indexOf(`id="${MODEL_SCRIPT_ID}"`)),
      );
      expect(payload).toContain('"runtimes"');
      expect(payload).toContain('"engines"');
    });
  });

  it("serves the stylesheet and a bundled client module", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const css = await fetch(`http://127.0.0.1:${port}/page.css`);
      expect(css.status).toBe(200);
      expect(css.headers.get("content-type")).toContain("text/css");

      const js = await fetch(`http://127.0.0.1:${port}/client.js`);
      expect(js.status).toBe(200);
      expect(js.headers.get("content-type")).toContain("javascript");
      // Bundled, not served raw: the browser must never receive TypeScript.
      const body = await js.text();
      expect(body).not.toContain("import type");
      expect(body.length).toBeGreaterThan(500);
    });
  });

  it("answers a malformed body with a clean 400, never Bun's 500 overlay", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/verify`, {
        method: "POST",
        body: "not-json{{{",
      });
      expect(r.status).toBe(400);
    });
  });

  it("answers an unknown path with 404", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      expect((await fetch(`http://127.0.0.1:${port}/nope`)).status).toBe(404);
    });
  });
});

describe("what a submission writes", () => {
  it("writes .env and newsroom.json — and the runtime only into newsroom.json", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({
          runtime: "goose",
          enabled: ["dw-chart", "zip"],
          credentials: { DATAWRAPPER_API_TOKEN: "dw-token" },
        }),
      });
      expect(r.status).toBe(200);
    });
    const env = readFileSync(join(dest, ".env"), "utf8");
    expect(env).toContain('DATAWRAPPER_API_TOKEN="dw-token"');
    const state = JSON.parse(readFileSync(join(dest, "newsroom.json"), "utf8"));
    expect(state.runtime).toBe("goose");
    expect(state.uiLang).toBe("en");
    expect(state.capabilities["dw-chart"].enabled).toBe(true);
    expect(state.publisher).toBe("zip");
    // The credential has ONE home.
    expect(JSON.stringify(state)).not.toContain("dw-token");
  });

  it("retires the legacy .splash-runtime once the decor owns the runtime", async () => {
    const dest = root();
    writeFileSync(join(dest, ".splash-runtime"), "codex\n");
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({ runtime: "codex" }),
      });
      expect(r.status).toBe(200);
    });
    expect(
      JSON.parse(readFileSync(join(dest, "newsroom.json"), "utf8")).runtime,
    ).toBe("codex");
    expect(existsSync(join(dest, ".splash-runtime"))).toBe(false);
  });

  it("absorbs the legacy .splash-preflight.json stamps, then retires it (A3)", async () => {
    const dest = root();
    writeFileSync(
      join(dest, ".splash-preflight.json"),
      JSON.stringify({
        schemaVersion: "1",
        engines: {
          "dw-chart": {
            status: "green",
            checkedAt: "2026-07-01T00:00:00.000Z",
            reason: "",
          },
        },
      }),
    );
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({ enabled: ["dw-chart"] }),
      });
      expect(r.status).toBe(200);
    });
    const state = JSON.parse(readFileSync(join(dest, "newsroom.json"), "utf8"));
    // Absorbed BEFORE the file goes: the stamp survives in its one home.
    expect(state.capabilities["dw-chart"].lastVerified).toEqual({
      at: "2026-07-01T00:00:00.000Z",
      result: "ok",
    });
    expect(existsSync(join(dest, ".splash-preflight.json"))).toBe(false);
  });

  it("never erases a key the journalist did not retype", async () => {
    const dest = root();
    writeFileSync(
      join(dest, ".env"),
      'VITE_MAPTILER_KEY="kept-key"\nMY_OWN_TOOL="mine"\n',
    );
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({ credentials: { DATAWRAPPER_API_TOKEN: "new" } }),
      });
      expect(r.status).toBe(200);
    });
    const env = readFileSync(join(dest, ".env"), "utf8");
    expect(env).toContain('VITE_MAPTILER_KEY="kept-key"');
    expect(env).toContain('MY_OWN_TOOL="mine"');
    expect(env).toContain('DATAWRAPPER_API_TOKEN="new"');
  });

  it("creates the newsroom profile once, and never rewrites an existing one", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({
          contentLang: "fr",
          newsroom: { name: "Heidi.news", color: "#0a5c36", lang: "fr" },
        }),
      });
    });
    const profile = readFileSync(join(dest, "NEWSROOM-PROFILE.md"), "utf8");
    expect(profile).toContain('name: "Heidi.news"');
    expect(profile).toContain('lang: "fr"');

    writeFileSync(join(dest, "NEWSROOM-PROFILE.md"), "MINE, HAND EDITED\n");
    await withServer(dest, async (port) => {
      await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({
          newsroom: { name: "Someone else", lang: "de" },
        }),
      });
    });
    expect(readFileSync(join(dest, "NEWSROOM-PROFILE.md"), "utf8")).toBe(
      "MINE, HAND EDITED\n",
    );
  });

  it("opens on the section a caller pointed at (?section=)", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const html = await (
        await fetch(`http://127.0.0.1:${port}/?section=embed-cloudflare`)
      ).text();
      expect(html).toContain('"focus":"embed-cloudflare"');
    });
  });
});

// A login typed for a runtime that is NOT Claude must never reach Anthropic's endpoint — the
// registry decides which runtime's login is even Anthropic-shaped, and `verifyAll` is gated on
// it (Finding 3: this gate had no test in either direction). Real requests, not mocks (project
// convention) — the claude case genuinely calls out to api.anthropic.com with a bogus key, which
// this environment reaches in well under a second; the assertion only needs the `anthropic` key
// to be PRESENT, not any particular verdict, so it stays correct whether the key is rejected or
// the provider is unreachable. The gemini case makes NO claim needing network: the gate returns
// before any fetch, so the absence of the key is deterministic offline as well as online.
describe("the login is only ever checked against the runtime that declared it", () => {
  it("does not attempt an Anthropic check for a runtime whose login is not Anthropic's", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/verify`, {
        method: "POST",
        body: submission({ runtime: "gemini", login: "gk-not-a-real-key" }),
      });
      expect(r.status).toBe(200);
      const out = (await r.json()) as Record<string, unknown>;
      expect(out).not.toHaveProperty("anthropic");
    });
  });

  it("does attempt an Anthropic check when Claude is the chosen runtime", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/verify`, {
        method: "POST",
        body: submission({ runtime: "claude", login: "sk-ant-not-a-real-key" }),
      });
      expect(r.status).toBe(200);
      const out = (await r.json()) as Record<string, unknown>;
      expect(out).toHaveProperty("anthropic");
    });
  }, 15000);
});

describe("the setup page probes the delivered skills tree on a packed install", () => {
  it("reads image-native as ready when its dependencies are at .dist/node_modules", async () => {
    const dest = root();
    // Create the packed-install shape: .dist/skills/{engine}/ + .dist/node_modules/{pkg}/
    mkdirSync(join(dest, ".dist", "skills", "image-native"), {
      recursive: true,
    });
    const sharpDir = join(dest, ".dist", "node_modules", "sharp");
    mkdirSync(sharpDir, { recursive: true });
    writeFileSync(
      join(sharpDir, "package.json"),
      JSON.stringify({ name: "sharp", version: "0.0.0", main: "index.js" }),
    );
    writeFileSync(join(sharpDir, "index.js"), "module.exports = {};\n");

    await withServer(dest, async (port) => {
      // Submit state to enable image-native
      const submitRes = await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({ enabled: ["image-native"] }),
      });
      expect(submitRes.status).toBe(200);
    });

    // Request the page again to see the updated model
    await withServer(dest, async (port) => {
      const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
      // Extract the JSON model from the script tag
      const start =
        html.indexOf(`id="${MODEL_SCRIPT_ID}">`) +
        `id="${MODEL_SCRIPT_ID}">`.length;
      const end = html.indexOf("</script>", start);
      const payload = html.slice(start, end);
      const model = JSON.parse(payload);

      // Verify image-native reports as ready when probing .dist/skills
      const imageNative = model.engines.find(
        (e: { id: string; status: string }) => e.id === "image-native",
      );
      expect(imageNative).toBeDefined();
      expect(imageNative!.status).toBe("ready");
    });
  });
});
