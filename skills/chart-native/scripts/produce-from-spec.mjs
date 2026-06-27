// The flow's native entry point: take a NativeSpec (what suggest-chart emits when
// it routes to chart-native), map it to a concrete {type, config}, and run
// produce(). Falls back loudly (non-zero exit + reason) when the native type isn't
// mapped, so the orchestrator can route to dw-chart instead.
//
//   bun scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> [all|static]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { specToNativeConfig, UnsupportedNativeType } from "../src/spec-to-config.ts";

const here = dirname(fileURLToPath(import.meta.url));
const specPath = process.argv[2];
const outDir = process.argv[3];
const formats = process.argv[4] ?? "all";
if (!specPath || !outDir) {
  console.error("usage: produce-from-spec.mjs <nativeSpec.json> <outDir> [all|static]");
  process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, "utf8"));

let mapped;
try {
  mapped = specToNativeConfig(spec);
} catch (e) {
  if (e instanceof UnsupportedNativeType) {
    console.error(`FALLBACK_TO_DW: ${e.message}`);
    process.exit(2); // distinct code → orchestrator routes to dw-chart
  }
  throw e;
}

mkdirSync(outDir, { recursive: true });
const configPath = join(mkdtempSync(join(tmpdir(), "native-config-")), "config.json");
writeFileSync(configPath, JSON.stringify(mapped.config, null, 2));

execFileSync("bun", [join(here, "produce.mjs"), mapped.type, configPath, outDir, formats], {
  stdio: "inherit",
  cwd: join(here, ".."),
});
