// server.ts — the local setup page, on 127.0.0.1 and nowhere else.
//
// It replaces the configurator's hand-written form (install/configurator.ts, which now delegates
// here). Four traps are carried over unchanged, because each one was paid for: a free port on the
// loopback interface, a browser open that fails silently on a headless box, an idle timeout that
// never leaves the bootstrap hanging, and a write failure that reports its real cause and exits
// non-zero so the installer's "re-run this installer" guidance fires.
//
// What is new: the page writes the DECOR (newsroom.json) as well as the credentials (.env), it
// merges .env instead of rewriting it, it records what each provider actually answered, and the
// runtime and the verification stamps now have exactly one home — writing newsroom.json retires
// .splash-runtime and .splash-preflight.json.
import {
  chmodSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { loadDecor } from "../../lib/newsroom/decor.ts";
import {
  LEGACY_PREFLIGHT_FILE,
  LEGACY_RUNTIME_FILE,
} from "../../lib/newsroom/migrate-decor.ts";
import { parseEnvFile } from "../../lib/newsroom/probe.ts";
import { writeNewsroomState } from "../../lib/newsroom/state.ts";
import {
  verifyAnthropic,
  verifyCapability,
  type VerifyOutcome,
} from "../../lib/newsroom/verify.ts";
import { MODEL_SCRIPT_ID } from "./copy.ts";
import { preflightModel } from "./model.ts";
import {
  envUpdates,
  mergeEnvFile,
  profileMarkdown,
  submittedState,
  type PreflightSubmission,
} from "./serialize.ts";

const ROOT = process.cwd(); // the bootstrap runs this from ~/Splash
const NO_OPEN = process.env.SPLASH_NO_OPEN === "1"; // testability seam
const PROFILE_FILE = "NEWSROOM-PROFILE.md";
const HERE = import.meta.dir;

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  } catch {
    /* headless — ignore */
  }
}

/**
 * The environment the page judges against: the install's OWN .env, not the process environment.
 * The page exists to fill that file, so "already configured" has to mean "written down", not
 * "exported in the shell that happened to launch the installer" — which would show a key as
 * configured and then not find it on the next run.
 */
function fileEnv(): Record<string, string | undefined> {
  return parseEnvFile(join(ROOT, ".env"));
}

function profileLang(): string | undefined {
  // Read through the decor so the language shown is the one Splash resolves, not a re-parse.
  return loadDecor(ROOT, { env: fileEnv() }).profile.lang;
}

function renderPage(focus: string | null): string {
  const env = fileEnv();
  const decor = loadDecor(ROOT, { env });
  const model = preflightModel({
    state: decor.state,
    env,
    profileExists: existsSync(join(ROOT, PROFILE_FILE)),
    ...(profileLang() ? { profileLang: profileLang()! } : {}),
    ...(focus ? { focus } : {}),
  });
  const html = readFileSync(join(HERE, "page.html"), "utf8");
  // The model is DATA, injected into a JSON script tag: the client never re-derives it, and no
  // value is interpolated into executable markup. `</script>` inside a string would still close
  // the tag, so the one character that can do that is escaped.
  const payload = JSON.stringify(model).replaceAll("<", "\\u003c");
  return html.replace(
    new RegExp(
      `(<script type="application/json" id="${MODEL_SCRIPT_ID}">)[\\s\\S]*?(</script>)`,
    ),
    `$1${payload}$2`,
  );
}

let clientBundle: string | null = null;
/**
 * The client, bundled on first request. Bun does the transpile+bundle in-process — no build step
 * to run before the installer, no toolchain to install, and nothing fetched from a CDN (the page
 * must work on a machine whose network is still being set up).
 */
async function bundleClient(): Promise<string> {
  if (clientBundle) return clientBundle;
  const built = await Bun.build({
    entrypoints: [join(HERE, "client.ts")],
    target: "browser",
    minify: false,
  });
  if (!built.success)
    throw new Error(
      `could not build the setup page's client: ${built.logs.join("\n")}`,
    );
  clientBundle = await built.outputs[0]!.text();
  return clientBundle;
}

async function readSubmission(req: Request): Promise<PreflightSubmission> {
  const body = (await req.json()) as Partial<PreflightSubmission>;
  return {
    runtime: typeof body.runtime === "string" ? body.runtime : "claude",
    uiLang: typeof body.uiLang === "string" ? body.uiLang : "en",
    ...(typeof body.contentLang === "string"
      ? { contentLang: body.contentLang }
      : {}),
    ...(typeof body.anthropic === "string"
      ? { anthropic: body.anthropic }
      : {}),
    credentials:
      body.credentials && typeof body.credentials === "object"
        ? body.credentials
        : {},
    enabled: Array.isArray(body.enabled) ? body.enabled : [],
    ...(typeof body.publisher === "string"
      ? { publisher: body.publisher }
      : {}),
    ...(body.verified && typeof body.verified === "object"
      ? { verified: body.verified }
      : {}),
    ...(body.newsroom && typeof body.newsroom === "object"
      ? { newsroom: body.newsroom }
      : {}),
  };
}

/**
 * Check every capability the newsroom ticked, against the credentials it just typed — falling
 * back to what .env already holds, so re-opening the page on one section does not report the
 * rest as rejected. A capability with no live check is simply absent from the answer.
 */
async function verifyAll(
  sub: PreflightSubmission,
): Promise<Record<string, VerifyOutcome>> {
  const values = { ...fileEnv(), ...envUpdates(sub) };
  const out: Record<string, VerifyOutcome> = {};
  for (const id of sub.enabled) {
    const outcome = await verifyCapability(id, values);
    if (outcome) out[id] = outcome;
  }
  if (sub.anthropic?.trim()) {
    const result = await verifyAnthropic(sub.anthropic);
    out.anthropic =
      result === null ? "unreachable" : result ? "ok" : "rejected";
  }
  return out;
}

function persist(sub: PreflightSubmission): void {
  const envPath = join(ROOT, ".env");
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  writeFileSync(envPath, mergeEnvFile(existing, envUpdates(sub)));
  try {
    chmodSync(envPath, 0o600);
  } catch {
    /* NTFS — no-op */
  }

  const previous = loadDecor(ROOT, { env: fileEnv() }).state;
  writeNewsroomState(ROOT, submittedState(sub, previous));

  // ONE home for the runtime, and one for a capability's last verdict. `loadDecor` above just
  // absorbed both legacy supports into the state that was written, so they are retired here
  // rather than left to rot beside it — their readers (install/read-runtime.ts,
  // lib/newsroom/migrate-decor.ts) still serve an install that has not been through this page.
  for (const name of [LEGACY_RUNTIME_FILE, LEGACY_PREFLIGHT_FILE]) {
    const legacy = join(ROOT, name);
    if (existsSync(legacy)) rmSync(legacy, { force: true });
  }

  // Created ONCE, never round-tripped: after this the file belongs to the newsroom, comments and
  // all (spec 2026-07-24, decision 6).
  const profilePath = join(ROOT, PROFILE_FILE);
  if (sub.newsroom && !existsSync(profilePath))
    writeFileSync(
      profilePath,
      profileMarkdown({ ...sub.newsroom, lang: sub.contentLang ?? "en" }),
    );
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/")
      return new Response(renderPage(url.searchParams.get("section")), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });

    if (req.method === "GET" && url.pathname === "/page.css")
      return new Response(readFileSync(join(HERE, "page.css"), "utf8"), {
        headers: { "content-type": "text/css; charset=utf-8" },
      });

    if (req.method === "GET" && url.pathname === "/client.js")
      return new Response(await bundleClient(), {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });

    if (req.method === "POST" && url.pathname === "/verify") {
      let sub: PreflightSubmission;
      try {
        sub = await readSubmission(req);
      } catch {
        return new Response("invalid request body", { status: 400 });
      }
      // Constructed Response, not the static Response.json(): bun-types 1.3.14 dropped the
      // static from its Response constructor typing, which failed the tsc gate on a fresh
      // install. Runtime-identical.
      return new Response(JSON.stringify(await verifyAll(sub)), {
        headers: { "content-type": "application/json" },
      });
    }

    if (req.method === "POST" && url.pathname === "/submit") {
      let sub: PreflightSubmission;
      try {
        sub = await readSubmission(req);
      } catch {
        return new Response("invalid request body", { status: 400 });
      }
      try {
        persist(sub);
      } catch (err) {
        // A read-only install root or a full disk. Left unhandled, this returned Bun's dev 500
        // overlay AND left this process (and the blocking bootstrap) running forever. Report the
        // real cause and exit non-zero so the installer's guidance fires.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\nCould not write to ${ROOT}: ${msg}`);
        setTimeout(() => {
          server.stop();
          process.exit(1);
        }, 250);
        return new Response(
          `could not write your settings to ${ROOT}: ${msg} — check the folder's permissions and free disk space, then re-run the installer`,
          { status: 500 },
        );
      }
      // Give Bun a moment to flush this response to the browser before exiting, so the
      // journalist sees the confirmation instead of a dropped connection. Localhost is <10ms.
      setTimeout(() => {
        server.stop();
        process.exit(0);
      }, 250);
      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  },
});

const localUrl = `http://127.0.0.1:${server.port}/`;
console.log(`-> Set up Splash at ${localUrl}`);
console.log(
  "   (Waiting for you to finish in the browser… press Ctrl-C here to cancel.)",
);
if (!NO_OPEN) openBrowser(localUrl);

// Safety net: the server otherwise only stops on a successful /submit, so a closed tab or a
// browser that never opened (headless box) would block the bootstrap forever. Exit non-zero
// after a generous idle window so the "re-run this installer" guidance fires. A successful
// submit exits first; unref() keeps this timer from holding the process open on its own.
const IDLE_TIMEOUT_MS = 30 * 60_000;
setTimeout(() => {
  console.error(
    "\nTimed out waiting for the setup page. Re-run the installer when you're ready.",
  );
  server.stop();
  process.exit(1);
}, IDLE_TIMEOUT_MS).unref?.();
