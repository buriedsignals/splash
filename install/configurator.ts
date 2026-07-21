// Thin Bun server for the local configurator. Serves the form on 127.0.0.1:<free port>, opens the
// browser, verifies keys live, writes ~/Splash/.env (chmod 600) + the chosen runtime, then exits so
// the bootstrap continues. Run from within ~/Splash: `bun install/configurator.ts`.
import { writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import {
  renderConfiguratorHtml,
  serializeEnv,
  verifyMapTiler,
  verifyDatawrapper,
  verifyAnthropic,
  verifyCloudflare,
  type ConfiguratorConfig,
} from "./configurator-core.ts";

const DEST = process.cwd(); // the bootstrap runs this from ~/Splash
const NO_OPEN = process.env.SPLASH_NO_OPEN === "1"; // testability seam

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

async function verifyAll(c: ConfiguratorConfig) {
  return {
    maptiler: c.maptiler ? await verifyMapTiler(c.maptiler) : null,
    datawrapper: c.datawrapper ? await verifyDatawrapper(c.datawrapper) : null,
    anthropic: c.anthropic ? await verifyAnthropic(c.anthropic) : null,
    cloudflare: c.cloudflareToken
      ? await verifyCloudflare(c.cloudflareToken, c.cloudflareAccount)
      : null,
  };
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/") {
      return new Response(renderConfiguratorHtml(), {
        headers: { "content-type": "text/html" },
      });
    }
    if (req.method === "POST" && url.pathname === "/verify") {
      let cfg: ConfiguratorConfig;
      try {
        cfg = (await req.json()) as ConfiguratorConfig;
      } catch {
        return new Response("invalid request body", { status: 400 });
      }
      // Constructed Response, not the static Response.json(): bun-types 1.3.14 dropped the
      // static from its Response constructor typing, which failed the tsc gate on a fresh
      // install. Runtime-identical.
      return new Response(JSON.stringify(await verifyAll(cfg)), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (req.method === "POST" && url.pathname === "/submit") {
      let cfg: ConfiguratorConfig;
      try {
        cfg = (await req.json()) as ConfiguratorConfig;
      } catch {
        return new Response("invalid request body", { status: 400 });
      }
      const v = await verifyAll(cfg);
      if (Object.values(v).some((ok) => ok === false)) {
        return new Response("verification failed — re-check your keys", {
          status: 400,
        });
      }
      const envPath = join(DEST, ".env");
      try {
        writeFileSync(envPath, serializeEnv(cfg));
        try {
          chmodSync(envPath, 0o600);
        } catch {
          /* NTFS — no-op */
        }
        writeFileSync(
          join(DEST, ".splash-runtime"),
          (cfg.runtime || "claude") + "\n",
        );
      } catch (err) {
        // Read-only ~/Splash or a full disk. Don't leave the write to throw unhandled — that
        // returned Bun's dev 500 overlay AND left this process (and the blocking bootstrap)
        // running forever. Report the real cause and exit non-zero so the bootstrap's
        // "Configuration was not completed — re-run this installer" guidance fires.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\nCould not write ${envPath}: ${msg}`);
        setTimeout(() => {
          server.stop();
          process.exit(1);
        }, 250);
        return new Response(
          `could not write ~/Splash/.env: ${msg} — check folder permissions and free disk space, then re-run the installer`,
          { status: 500 },
        );
      }
      // Give Bun a moment to flush this response to the browser before we exit, so the
      // journalist sees the "Saved ✓" page instead of a dropped connection. The bootstrap
      // then continues (it checks ~/Splash/.env exists). Localhost round-trip is <10ms.
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
console.log(`-> Configure Splash at ${localUrl}`);
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
    "\nTimed out waiting for the configurator. Re-run the installer when you're ready.",
  );
  server.stop();
  process.exit(1);
}, IDLE_TIMEOUT_MS).unref?.();
