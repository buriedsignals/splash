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

  // The three things this branch changed, read from what the server actually serves — not from
  // the functions that feed it (Task 2's model tests only exercise a pass-through of an
  // already-built PreflightProfile; a typo in server.ts's own read-and-map path, e.g.
  // `parsed.source?.nam`, would return undefined there and `bun test install` would stay green).
  it("serves the profile, the upfront keys and the six runtimes", async () => {
    const dest = root();
    writeFileSync(
      join(dest, "NEWSROOM-PROFILE.md"),
      [
        "---",
        "palette:",
        '  - "#0A5C36"   # your house colour',
        '  - "#F2C14E"',
        "source:",
        '  name: "Heidi.news"',
        '  url: "https://heidi.news"',
        'lang: "fr"',
        'theme: "dark"',
        "---",
        "",
        "# Newsroom profile",
        "",
      ].join("\n"),
    );
    await withServer(dest, async (port) => {
      const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
      const start =
        html.indexOf(`id="${MODEL_SCRIPT_ID}">`) +
        `id="${MODEL_SCRIPT_ID}">`.length;
      const end = html.indexOf("</script>", start);
      const model = JSON.parse(html.slice(start, end));

      expect(model.profile?.palette?.[0]).toBe("#0A5C36");
      expect(model.profile?.name).toBe("Heidi.news");
      expect(model.profile?.lang).toBe("fr");
      expect(model.profile?.theme).toBe("dark");

      expect(
        model.runtimes.filter((r: { verified: boolean }) => r.verified),
      ).toHaveLength(6);

      const upfront = model.fields
        .filter((f: { upfront: boolean }) => f.upfront)
        .map((f: { name: string }) => f.name);
      expect(upfront).toContain("DATAWRAPPER_API_TOKEN");
      expect(upfront).toContain("VITE_MAPTILER_KEY");
      // A publication-only field (Cloudflare's account id serves no engine, only the
      // Cloudflare-Pages delivery capability) must stay ungated.
      const cloudflareAccountId = model.fields.find(
        (f: { name: string }) => f.name === "CLOUDFLARE_ACCOUNT_ID",
      );
      expect(cloudflareAccountId?.upfront).toBe(false);
    });
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

// I2: production keys are asked outright, above every want group (Task 4 of this branch) — but
// `verifyAll` only iterated `sub.enabled`, so a key typed in "Your accounts" for a capability the
// journalist never ticked was written to .env yet never checked, silently, while the page's own
// lede promises every key IS checked. A real network call (project convention: no mock), not just
// a shape assertion — the point is that the capability appears in the verdict at all.
describe("an upfront production key is verified even when its capability is unticked (I2)", () => {
  it("checks a typed Datawrapper token for BOTH capabilities it serves, neither ticked", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/verify`, {
        method: "POST",
        body: submission({
          credentials: { DATAWRAPPER_API_TOKEN: "not-a-real-token" },
          enabled: [], // neither "dw-chart" nor "map-dw" is ticked
        }),
      });
      expect(r.status).toBe(200);
      const out = (await r.json()) as Record<string, unknown>;
      expect(out).toHaveProperty("dw-chart");
      expect(out).toHaveProperty("map-dw");
    });
  }, 15000);

  it("says nothing about a capability nobody typed a key for, ticked or not", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/verify`, {
        method: "POST",
        body: submission({ credentials: {}, enabled: [] }),
      });
      expect(r.status).toBe(200);
      const out = (await r.json()) as Record<string, unknown>;
      expect(out).not.toHaveProperty("dw-chart");
      expect(out).not.toHaveProperty("map-dw");
    });
  });

  it("still verifies a TICKED capability that carries no upfront key value (unchanged behaviour)", async () => {
    const dest = root();
    await withServer(dest, async (port) => {
      const r = await fetch(`http://127.0.0.1:${port}/verify`, {
        method: "POST",
        body: submission({
          credentials: {},
          enabled: ["dw-chart"],
        }),
      });
      expect(r.status).toBe(200);
      const out = (await r.json()) as Record<string, unknown>;
      // Blank credential: the shared verifier short-circuits before any fetch and reports
      // "rejected" (verify.ts's documented behaviour for an empty key) — still present, which is
      // the point: ticking alone is still enough to be checked, as before.
      expect(out).toHaveProperty("dw-chart");
    });
  });
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

  // The case above is a happy path only: with the wiring at server.ts's
  // `skillsRoot: resolveSkillsRoot(ROOT)` reverted (falling back to DEFAULT_SKILLS_ROOT, the
  // REPO'S OWN skills/), it still reads "ready" — this worktree's real
  // skills/image-native/node_modules/sharp resolves regardless of what the fixture contains, so a
  // fixture that only ever asks for "ready" can never catch that revert. This case is what makes
  // the fixture DISCRIMINATING: a packed tree whose engine directory exists but whose dependency
  // never landed at .dist/node_modules must read "missing" — a status the repo's own skills/
  // fallback cannot produce, because the repo tree really does have sharp installed. Only the
  // correct wiring (probing THIS install's own .dist/skills) can answer "missing" here; reverting
  // the line flips it to "ready" and this test goes red.
  it("reads image-native as missing when .dist/skills exists but .dist/node_modules never got sharp", async () => {
    const dest = root();
    // The packed engine directory exists (a real pack ran), but the dependency install into
    // .dist/node_modules never completed — exactly the shape a stalled `bun install` at .dist
    // leaves behind. No node_modules directory at all under .dist.
    mkdirSync(join(dest, ".dist", "skills", "image-native"), {
      recursive: true,
    });
    // Bun's OWN "bun <script>" execution — unlike bun:test's in-process resolver — silently
    // falls back to installing an unresolved package from its per-USER global cache
    // (~/.bun/install/cache) when it is nowhere in the local node_modules chain. On any machine
    // that has ever `bun install`ed sharp for ANY project, that fallback resolves "sharp" from
    // this fixture regardless of what .dist/node_modules holds — silently defeating the very
    // absence this fixture exists to create. Disabling auto-install for this install root is
    // what a REAL delivered tree wants anyway: readiness must read the tree on disk, never
    // silently pull a dependency the pack step did not put there.
    writeFileSync(join(dest, "bunfig.toml"), '[install]\nauto = "disable"\n');

    await withServer(dest, async (port) => {
      const submitRes = await fetch(`http://127.0.0.1:${port}/submit`, {
        method: "POST",
        body: submission({ enabled: ["image-native"] }),
      });
      expect(submitRes.status).toBe(200);
    });

    await withServer(dest, async (port) => {
      const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
      const start =
        html.indexOf(`id="${MODEL_SCRIPT_ID}">`) +
        `id="${MODEL_SCRIPT_ID}">`.length;
      const end = html.indexOf("</script>", start);
      const model = JSON.parse(html.slice(start, end));

      const imageNative = model.engines.find(
        (e: { id: string; status: string }) => e.id === "image-native",
      );
      expect(imageNative).toBeDefined();
      expect(imageNative!.status).toBe("missing");
    });
  });
});
