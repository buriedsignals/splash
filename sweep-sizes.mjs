import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const ROOT = process.cwd();
const size = process.argv[2];
const beats = readdirSync(join(ROOT, "proof")).filter((d) =>
  existsSync(join(ROOT, "proof", d, "render-directions.mjs")) && !d.startsWith("video-"));
const rows = [];
for (const b of beats) {
  const r = spawnSync("bun", [join("proof", b, "render-directions.mjs"), "--filed", "--size", size],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, SPLASH_MEASURE_SIZE: "1" }, timeout: 300000 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const why = /error:\s*([^\n]{0,130})/.exec(out)?.[1] ?? (r.status === 0 ? "" : `exit ${r.status}`);
  rows.push({ b, ok: r.status === 0, why });
  console.log(`${r.status === 0 ? "OK   " : "REFUS"} ${b.padEnd(46)} ${why.slice(0, 92)}`);
}
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} rendent en ${size}`);
