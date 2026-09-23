// The render ladder for a LIVE map video (renderer A, spec §4.3): the plan's layers mounted on a
// real MapLibre map, drawn from real MapTiler tiles reached through a local proxy that never lets
// the key reach the page (`./maptiler-proxy.mjs`). `mode: "still"` renders the LAST frame only
// (`--frame=-1`), the fast rung to look at before spending the mp4's full render time; `mode: "mp4"`
// renders the whole composition.
//
// WHY `Bun.spawn`, NOT `spawnSync`. `render-map.mjs`'s baked-plate renders read a data URI baked
// into the props, so a blocking `spawnSync` costs nothing: no request needs answering while the
// child runs. This renderer is different — the Chrome page Remotion drives fetches tiles from the
// proxy running IN THIS SAME PROCESS, and `spawnSync` blocks this process's entire event loop until
// the child exits, so `Bun.serve` cannot accept a single connection while it waits — the render page
// hangs against a server that is technically up but cannot answer. Measured directly: a `Bun.serve`
// instance given a `spawnSync`'d curl in the same script times out every time; the identical script
// with `Bun.spawn` (async, awaited via `proc.exited`) answers immediately. So this file spawns
// asynchronously and awaits the child, keeping the proxy's server loop live for the whole render.
//
// The key lives only in this process: `mapTilerKey` is handed to `startMapTilerProxy` and never
// appears in a props file, in the spawned command's argv, or in anything this function returns or
// prints — `spawnCounts` is `startMapTilerProxy`'s own `<kind> <status>` tally, no query string.
//
// An EMPTY `--env-file` on the spawn, the same rule `render-map.mjs` and every other render script in
// this tree follow (`splash/test/a-video-render-hides-the-env.test.ts`): Remotion otherwise injects
// the whole repository `.env` — this repo's MapTiler, Datawrapper, Gemini and Cloudflare keys among
// them — into the render page's `process.env`.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertMapTilerKey, startMapTilerProxy } from "./maptiler-proxy.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");

/**
 * Renders one video-map composition through Remotion.
 *
 * `buildProps(proxyOrigin)` is a FUNCTION, not a path: the props the composition needs (`styleUrl`
 * among them) can only be built once the proxy's origin is known, so this starts the proxy first and
 * asks the caller to build the props file only after — the same ordering constraint that shapes the
 * whole function.
 *
 * `frame` (still mode only) picks which frame to render, defaulting to the last one (`-1`) when
 * omitted — a moving camera can be inspected at any frame this way, not just the final one.
 * `cacheDir` is passed straight through to `startMapTilerProxy`.
 *
 * Returns `{ path, seconds, proxyCounts }` — `path` is the rendered still or mp4, `seconds` is how
 * long the `remotion` spawn took, `proxyCounts` is every request the proxy answered during the
 * render, keyed `<kind> <status>` with no query string.
 */
export async function renderVideoMap({
  entry,
  composition,
  buildProps,
  outDir,
  name,
  mapTilerKey,
  mode,
  frame,
  cacheDir,
}) {
  if (mode !== "still" && mode !== "mp4")
    throw new Error(
      `renderVideoMap: mode must be "still" or "mp4", got ${JSON.stringify(mode)}`,
    );

  await mkdir(outDir, { recursive: true });

  // The key is checked once before the first request: a warm cache never reaches MapTiler, so without
  // this a dead key produces a complete, correct render and says nothing.
  await assertMapTilerKey(mapTilerKey, { onNote: (n) => console.log(`  ${n}`) });
  const proxy = startMapTilerProxy({ key: mapTilerKey, cacheDir });
  const envFileDir = await mkdtemp(join(tmpdir(), "video-map-env-"));
  try {
    const envFile = join(envFileDir, "empty.env");
    await writeFile(envFile, "");

    const propsPath = await buildProps(proxy.origin);

    const outputPath =
      mode === "still"
        ? join(outDir, `${name}-final-frame.png`)
        : join(outDir, `${name}.mp4`);
    const args =
      mode === "still"
        ? ["still", entry, composition, outputPath, `--frame=${frame ?? -1}`, `--props=${propsPath}`]
        : ["render", entry, composition, outputPath, `--props=${propsPath}`];

    const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
    const started = Date.now();
    const proc = Bun.spawn(
      [
        binary,
        ...args,
        "--gl=swangle",
        "--concurrency=1",
        "--timeout=180000",
        `--env-file=${envFile}`,
      ],
      { cwd: PACKAGE_ROOT, stdout: "inherit", stderr: "inherit" },
    );
    const status = await proc.exited;
    if (status !== 0)
      throw new Error(`remotion ${args[0]} exited with ${status}`);
    const seconds = Math.round((Date.now() - started) / 1000);

    return { path: outputPath, seconds, proxyCounts: proxy.counts };
  } finally {
    proxy.stop();
    await rm(envFileDir, { recursive: true, force: true });
  }
}
