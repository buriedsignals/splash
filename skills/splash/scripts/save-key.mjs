// CLI: bun scripts/save-key.mjs <ENV_NAME> <value> — the ONLY sanctioned way splash writes a
// journalist-supplied API key into the repo-root .env (key-prerequisite flow, 2026-07-17).
// Mechanical on purpose: the orchestrator LLM never hand-edits an env file or echoes a secret
// back. Guardrails: the name must be one the preflight manifest (or the embed delivery) knows;
// the value is stripped of quotes/newlines (the installer's own escaping rule — a FlyV1 token
// carries a space, so values are double-quoted); the file is chmod 0600. Prints a JSON
// confirmation WITHOUT the value, then the refreshed tri-state statuses of the engines that
// key unlocks.
import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMBED_DELIVERY_ENV,
  ENGINE_REQUIREMENTS,
  enginePreflightStatus,
} from "../src/preflight.ts";

const here = dirname(fileURLToPath(import.meta.url));
// --env <path> override (tests + non-standard layouts); default = the repo-root .env.
const argv = process.argv.slice(2);
let envPathArg = null;
const envFlag = argv.indexOf("--env");
if (envFlag >= 0) envPathArg = argv.splice(envFlag, 2)[1];
const ENV_PATH = envPathArg ? resolve(envPathArg) : resolve(here, "../../../.env");

const name = argv[0];
const value = (argv[1] ?? "").trim().replace(/[\r\n"]/g, "");

const allowed = new Set(EMBED_DELIVERY_ENV);
for (const req of Object.values(ENGINE_REQUIREMENTS))
  for (const group of req.env) for (const n of group) allowed.add(n);

if (!name || !allowed.has(name)) {
  console.error(
    `unknown key name "${name ?? ""}" — allowed: ${[...allowed].sort().join(", ")}`,
  );
  process.exit(1);
}
if (!value) {
  console.error(`empty value for ${name} — nothing saved`);
  process.exit(1);
}

const line = `${name}="${value}"`;
let lines = [];
if (existsSync(ENV_PATH))
  lines = readFileSync(ENV_PATH, "utf8").split("\n").filter((l) => l !== "");
const idx = lines.findIndex((l) => l.startsWith(`${name}=`));
if (idx >= 0) lines[idx] = line;
else lines.push(line);
// The MapTiler mirror rule: either prefix must satisfy both builds — keep them in sync so a
// journalist who pastes one key never hits the "other prefix missing" class.
const MIRROR = { VITE_MAPTILER_KEY: "REMOTION_MAPTILER_KEY", REMOTION_MAPTILER_KEY: "VITE_MAPTILER_KEY" };
if (MIRROR[name]) {
  const twin = `${MIRROR[name]}="${value}"`;
  const tIdx = lines.findIndex((l) => l.startsWith(`${MIRROR[name]}=`));
  if (tIdx >= 0) lines[tIdx] = twin;
  else lines.push(twin);
}
writeFileSync(ENV_PATH, lines.join("\n") + "\n");
chmodSync(ENV_PATH, 0o600);

const unlocked = Object.entries(ENGINE_REQUIREMENTS)
  .filter(([, req]) => req.env.some((g) => g.includes(name)))
  .map(([producer]) => producer);
const statuses = {};
for (const p of unlocked) statuses[p] = enginePreflightStatus(p);
console.log(
  JSON.stringify({ saved: name, envPath: ENV_PATH, engines: statuses }, null, 2),
);
