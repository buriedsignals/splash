// twin/shared/map-beat/inline.mjs
//
// ONE SCRIPT FOR A SELF-CONTAINED PAGE. The runtime and the trunk modules it calls are read as text,
// their `import` lines dropped and their `export` keywords stripped, and concatenated in dependency
// order — the same inlining `renderScrolly` does for a beat's driver, applied to the map trunk.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORDER = ["scrolly.mjs", "mount.mjs", "style.mjs", "scrolly-live.mjs"];

export async function scrollyMapScript() {
  const parts = [];
  for (const file of ORDER) {
    const text = await readFile(join(HERE, file), "utf8");
    parts.push(
      `// ── ${file} ──\n` +
        text
          .split("\n")
          .filter((line) => !/^\s*import\s/.test(line))
          .join("\n")
          .replace(/^export\s+/gm, ""),
    );
  }
  const script = parts.join("\n");
  if (/<\/script/i.test(script)) throw new Error("the map runtime contains a closing script tag and cannot be inlined");
  return script;
}
