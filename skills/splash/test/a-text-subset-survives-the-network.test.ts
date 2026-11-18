import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// gx-beeswarm web (Gemma 12B, mvg88, 2026-11-18): a title carrying "CO₂" needs a `text=` stylesheet for U+2082, and
// that stylesheet was the one request the cache never kept. The network reset once, the page was refused, and the
// model rewrote its title as "CO2". A stylesheet fetched once must serve the same request again without the network.
const TWIN = join(import.meta.dir, "..", "..", "..");

function noNetworkBin() {
  const dir = mkdtempSync(join(tmpdir(), "no-network-"));
  writeFileSync(join(dir, "curl"), "#!/bin/sh\necho 'curl: (7) could not connect' 1>&2\nexit 7\n");
  chmodSync(join(dir, "curl"), 0o755);
  return dir;
}

function facesOutOfProcess(cacheDir: string, network: boolean) {
  const program =
    `import { fetchWebFaces } from ${JSON.stringify(join(TWIN, "shared/design-base/typefaces.mjs"))};\n` +
    `const faces = fetchWebFaces("Merriweather", { spec: "ital,wght@0,700", text: "Émissions de CO₂" });\n` +
    `process.stdout.write(String(faces.length));\n`;
  const scriptDir = mkdtempSync(join(tmpdir(), "text-subset-probe-"));
  writeFileSync(join(scriptDir, "probe.mjs"), program);
  const blocked = network ? null : noNetworkBin();
  try {
    return spawnSync(process.execPath, [join(scriptDir, "probe.mjs")], {
      encoding: "utf8",
      env: {
        SPLASH_TYPEFACE_CACHE: cacheDir,
        HOME: process.env.HOME ?? "",
        PATH: blocked ? `${blocked}:${process.env.PATH ?? ""}` : (process.env.PATH ?? ""),
      },
    });
  } finally {
    rmSync(scriptDir, { recursive: true, force: true });
    if (blocked) rmSync(blocked, { recursive: true, force: true });
  }
}

describe("a text= stylesheet", () => {
  it("should serve the same request again when the network is gone", () => {
    const cache = mkdtempSync(join(tmpdir(), "typefaces-text-"));
    try {
      const online = facesOutOfProcess(cache, true);
      const offline = facesOutOfProcess(cache, false);
      expect([offline.status, offline.stdout]).toEqual([0, online.stdout]);
    } finally {
      rmSync(cache, { recursive: true, force: true });
    }
  }, 60_000);
});
