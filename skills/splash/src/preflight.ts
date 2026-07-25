// preflight.ts — mechanical per-engine readiness (C2, Tom feedback #4). One declarative
// manifest, two consumers: the PROPOSITION-time CLI (scripts/preflight.mjs, annotates
// not-ready engines in the ranked list) and produce-all's blocking gate (fail-fast in
// journalist language BEFORE production, replacing the lazy deep throws: dw-chart's
// token() at the first API call, map-native's key throw at component load).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NEWSROOM_CAPABILITIES,
  engineCapabilities,
} from "../../../lib/newsroom/capabilities";
import type { Producer } from "./producer-spec";

const here = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(here, "../..");
const ROOT_ENV_PATH = resolve(SKILLS_ROOT, "../.env");

// Each inner array is an ALTERNATIVES group: at least one member must be set (the MapTiler
// mirror rule — either prefix satisfies both builds, produce.mjs mirrors one onto the other).
export interface EngineRequirements {
  env: string[][];
  envHelp: Record<string, string>; // per-var: where the journalist gets it
  criticalDeps: { fromSkillDir: string; packages: string[] } | null;
}

export interface PreflightFinding {
  kind: "env" | "deps";
  message: string;
}

export interface PreflightOpts {
  env?: Record<string, string | undefined>;
  resolveDep?: (pkg: string, fromDir: string) => boolean;
}

// The engine half of the newsroom capability registry, in this module's original shape. The
// registry is the single declaration (lib/newsroom/capabilities.ts); this is a projection of
// it, so the two cannot drift (skills/splash/tests/capability-parity.test.ts).
export const ENGINE_REQUIREMENTS: Record<Producer, EngineRequirements> =
  Object.fromEntries(
    engineCapabilities().map((cap) => [
      cap.id,
      {
        env: cap.env,
        envHelp: cap.envHelp,
        criticalDeps: cap.criticalDeps,
      },
    ]),
  ) as Record<Producer, EngineRequirements>;

// The embed DELIVERY FORM's requirement (not an engine's): deploy-embed.mjs owns the
// fail-fast; exported here so its message and the parity test share the single list.
const EMBED_CAPABILITY = NEWSROOM_CAPABILITIES["embed-cloudflare"]!;
export const EMBED_DELIVERY_ENV: readonly string[] =
  EMBED_CAPABILITY.env.flat();

// Where the journalist gets each one — the embed form's equivalent of an engine's envHelp, so
// a missing embed credential is COLLECTED in the flow (like MapTiler or Datawrapper) instead of
// silently downgrading the delivery to the standalone-file form.
export const EMBED_DELIVERY_ENV_HELP: Record<string, string> =
  EMBED_CAPABILITY.envHelp;

export interface EmbedDeliveryStatus {
  ready: boolean;
  missing: string[];
  /** Empty when ready; otherwise one actionable sentence per missing credential. */
  reason: string;
}

// The embed DELIVERY FORM's readiness — deliberately NOT an engine: it gates a delivery form,
// not a producer, so it has its own status rather than being folded into ENGINE_REQUIREMENTS.
export function embedDeliveryStatus(
  opts: PreflightOpts = {},
): EmbedDeliveryStatus {
  const env = opts.env ?? defaultEnv();
  const missing = EMBED_DELIVERY_ENV.filter((name) => !isSet(env[name]));
  if (missing.length === 0) return { ready: true, missing: [], reason: "" };
  return {
    ready: false,
    missing: [...missing],
    reason: missing
      .map((name) => `${name} (${EMBED_DELIVERY_ENV_HELP[name]})`)
      .join("; "),
  };
}

function defaultResolveDep(pkg: string, fromDir: string): boolean {
  try {
    Bun.resolveSync(pkg, fromDir);
    return true;
  } catch {
    return false;
  }
}

function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

// Repo-root .env fallback (review F2): Bun auto-loads .env from the CWD only, while the
// standard install keeps keys in /splash/.env and produce-all may run from anywhere (the
// harness sandbox, an exports dir). The native producers self-load this file; the gate's
// DEFAULT env must see the same truth or it false-blocks with a wrong instruction ("add it
// to /splash/.env" when it is already there). process.env always wins over the file. Read
// lazily, once per process; injected opts.env (tests, CLI) bypasses it entirely.
let rootEnvCache: Record<string, string> | null = null;
function defaultEnv(): Record<string, string | undefined> {
  if (rootEnvCache === null) {
    rootEnvCache = {};
    try {
      for (const line of readFileSync(ROOT_ENV_PATH, "utf8").split("\n")) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
        if (m) rootEnvCache[m[1]] = m[2];
      }
    } catch {
      // no root .env — process.env alone decides
    }
  }
  return { ...rootEnvCache, ...process.env };
}

export function preflightFindings(
  producer: Producer,
  opts: PreflightOpts = {},
): PreflightFinding[] {
  const req = ENGINE_REQUIREMENTS[producer];
  // A producer outside the union (untyped JSON at the CLI seam) is not preflight's call:
  // report nothing here and let the validation gate record it failed (drop-proof intact).
  if (!req) return [];
  const env = opts.env ?? defaultEnv();
  const resolveDep = opts.resolveDep ?? defaultResolveDep;
  const findings: PreflightFinding[] = [];

  for (const group of req.env) {
    if (group.some((name) => isSet(env[name]))) continue;
    const helps = group
      .map(
        (name) => `${name} (${req.envHelp[name] ?? "see the install guide"})`,
      )
      .join(" or ");
    findings.push({
      kind: "env",
      message:
        `${producer} needs ${helps} — add it to /splash/.env (the installer's ` +
        `"Configure Splash" page writes it for you), then retry`,
    });
  }

  if (req.criticalDeps) {
    const fromDir = join(SKILLS_ROOT, req.criticalDeps.fromSkillDir);
    const missing = req.criticalDeps.packages.filter(
      (pkg) => !resolveDep(pkg, fromDir),
    );
    if (missing.length) {
      findings.push({
        kind: "deps",
        message:
          `${producer}'s dependencies are not installed (${missing.join(", ")} missing) — ` +
          `run \`bun install\` in skills/${req.criticalDeps.fromSkillDir}, then retry`,
      });
    }
  }

  return findings;
}

// Tri-state status object (Spotlight A2, docs/splash/spotlight-learnings.md): what gets
// PERSISTED per project and read by the PROPOSITION-time CLI. Derivation: green = ready;
// yellow = env-only findings (journalist-fixable via .env — the engine stays proposable,
// annotated); red = any deps finding (install problem — needs `bun install`, not a key).
export interface EngineStatus {
  status: "green" | "yellow" | "red";
  checkedAt: string;
  reason: string;
}

export function enginePreflightStatus(
  producer: Producer,
  opts: PreflightOpts & { now?: string } = {},
): EngineStatus {
  const findings = preflightFindings(producer, opts);
  const checkedAt = opts.now ?? new Date().toISOString();
  if (findings.length === 0) return { status: "green", checkedAt, reason: "" };
  const status = findings.some((f) => f.kind === "deps") ? "red" : "yellow";
  return {
    status,
    checkedAt,
    reason: findings.map((f) => f.message).join("; "),
  };
}
