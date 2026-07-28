// CLI: bun scripts/preflight.mjs [producer…] — PROPOSITION-time engine readiness report.
// Prints JSON; ALWAYS exits 0 on a known-producer run (it informs the ranked-list annotation
// — the blocking gate lives in produce-all). Falls back to the repo-root .env for key lookup
// so a standard install (launcher sources /splash/.env) and a bare dev shell report
// identically.
//
// It REPORTS and records NOTHING (A3). It used to persist the tri-state map to
// <project>/.splash-preflight.json (Spotlight A2) while the decor held the same fact under
// `newsroom.json.capabilities[id].lastVerified` — one record, two homes, and the legacy half
// was a cache no code read (its only consumer was the one-time absorption in
// lib/newsroom/migrate-decor.ts). The env/deps verdict this CLI computes is re-derived on
// every read by lib/newsroom/readiness.ts from the same manifest, so nothing needs to keep
// it; and the durable half — what a provider actually ANSWERED — is a live check this CLI
// never performs, so stamping `lastVerified` from here would have overwritten a real
// "rejected" verdict with a guess. The setup page owns that record.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

// `--project <dir>` is gone with the file it addressed: it only ever chose where the status
// map was written, and there is no longer anything to write.
const producerArgs = process.argv.slice(2);

const env = { ...rootEnv(), ...process.env };
const producers = producerArgs.length
  ? producerArgs
  : Object.keys(ENGINE_REQUIREMENTS);
const engines = {};
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
}

console.log(JSON.stringify({ engines }, null, 2));
