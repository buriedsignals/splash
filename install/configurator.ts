// Thin Bun server for the local configurator. Serves the form on 127.0.0.1:<free port>, opens the
// browser, verifies keys live, writes ~/Atelier/.env (chmod 600) + the chosen runtime, then exits so
// the bootstrap continues. Run from within ~/Atelier: `bun install/configurator.ts`.
import { writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import {
  renderConfiguratorHtml,
  serializeEnv,
  verifyMapTiler,
  verifyDatawrapper,
  verifyAnthropic,
  type ConfiguratorConfig,
} from "./configurator-core.ts";

const DEST = process.cwd(); // the bootstrap runs this from ~/Atelier
const NO_OPEN = process.env.ATELIER_NO_OPEN === "1"; // testability seam

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
      const cfg = (await req.json()) as ConfiguratorConfig;
      return Response.json(await verifyAll(cfg));
    }
    if (req.method === "POST" && url.pathname === "/submit") {
      const cfg = (await req.json()) as ConfiguratorConfig;
      const v = await verifyAll(cfg);
      if (Object.values(v).some((ok) => ok === false)) {
        return new Response("verification failed — re-check your keys", {
          status: 400,
        });
      }
      const envPath = join(DEST, ".env");
      writeFileSync(envPath, serializeEnv(cfg));
      try {
        chmodSync(envPath, 0o600);
      } catch {
        /* NTFS — no-op */
      }
      writeFileSync(
        join(DEST, ".atelier-runtime"),
        (cfg.runtime || "claude") + "\n",
      );
      // Give Bun a moment to flush this response to the browser before we exit, so the
      // journalist sees the "Saved ✓" page instead of a dropped connection. The bootstrap
      // then continues (it checks ~/Atelier/.env exists). Localhost round-trip is <10ms.
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
console.log(`-> Configure Atelier at ${localUrl}`);
if (!NO_OPEN) openBrowser(localUrl);
