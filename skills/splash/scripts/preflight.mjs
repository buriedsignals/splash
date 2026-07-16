// CLI: bun scripts/preflight.mjs [producer…] [--project <dir>] — PROPOSITION-time engine
// readiness report. Prints JSON; ALWAYS exits 0 on a known-producer run (it informs the
// ranked-list annotation — the blocking gate lives in produce-all). Falls back to the
// repo-root .env for key lookup so a standard install (launcher sources /splash/.env) and
// a bare dev shell report identically. Persistence (Spotlight A2): also writes the
// tri-state map to <project>/.splash-preflight.json (default project = cwd) so later
// turns/resumes read the persisted statuses instead of re-probing every run; a re-run
// refreshes the file (statuses carry checkedAt).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENGINE_REQUIREMENTS,
  enginePreflightStatus,
  preflightFindings,
} from "../src/preflight.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT_ENV = resolve(here, "../../../.env");

function rootEnv() {
  const out = {};
  try {
    for (const line of readFileSync(ROOT_ENV, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {
    // no root .env — process.env alone decides
  }
  return out;
}

const args = process.argv.slice(2);
let project = process.cwd();
const producerArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--project") {
    project = args[++i];
    if (!project) {
      console.error("--project requires a directory argument");
      process.exit(1);
    }
  } else {
    producerArgs.push(args[i]);
  }
}

const env = { ...rootEnv(), ...process.env };
const producers = producerArgs.length
  ? producerArgs
  : Object.keys(ENGINE_REQUIREMENTS);
const engines = {};
const persisted = {};
for (const producer of producers) {
  if (!ENGINE_REQUIREMENTS[producer]) {
    console.error(
      `unknown producer "${producer}" — known: ${Object.keys(ENGINE_REQUIREMENTS).join(", ")}`,
    );
    process.exit(1);
  }
  const findings = preflightFindings(producer, { env });
  const status = enginePreflightStatus(producer, { env });
  engines[producer] = { ready: findings.length === 0, status, findings };
  persisted[producer] = status;
}

writeFileSync(
  join(project, ".splash-preflight.json"),
  JSON.stringify({ schemaVersion: "1", engines: persisted }, null, 2) + "\n",
);

console.log(JSON.stringify({ engines }, null, 2));
