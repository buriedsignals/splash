// preflight.ts — mechanical per-engine readiness (C2, Tom feedback #4). One declarative
// manifest, two consumers: the PROPOSITION-time CLI (scripts/preflight.mjs, annotates
// not-ready engines in the ranked list) and produce-all's blocking gate (fail-fast in
// journalist language BEFORE production, replacing the lazy deep throws: dw-chart's
// token() at the first API call, map-native's key throw at component load).
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Producer } from "./producer-spec";

const here = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(here, "../..");

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

const DW_HELP =
  "create a token at https://app.datawrapper.de/account/api-tokens (free account works)";
const MT_HELP = "create a free key at https://cloud.maptiler.com/account/keys/";

export const ENGINE_REQUIREMENTS: Record<Producer, EngineRequirements> = {
  "dw-chart": {
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    criticalDeps: null, // cloud producer: fetch only, no heavy local deps
  },
  "map-dw": {
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    criticalDeps: null,
  },
  "chart-native": {
    env: [],
    envHelp: {},
    criticalDeps: { fromSkillDir: "chart-native", packages: ["react", "vite"] },
  },
  "map-native": {
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: {
      VITE_MAPTILER_KEY: MT_HELP,
      REMOTION_MAPTILER_KEY: MT_HELP,
    },
    criticalDeps: {
      fromSkillDir: "map-native",
      packages: ["react", "remotion", "maplibre-gl"],
    },
  },
  scrolly: {
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: {
      VITE_MAPTILER_KEY: MT_HELP,
      REMOTION_MAPTILER_KEY: MT_HELP,
    },
    criticalDeps: { fromSkillDir: "scrolly", packages: ["react", "vite"] },
  },
};

// The embed DELIVERY FORM's requirement (not an engine's): deploy-embed.mjs owns the
// fail-fast; exported here so its message and the parity test share the single list.
export const EMBED_DELIVERY_ENV = [
  "FLY_API_TOKEN",
  "SPLASH_EMBED_APP",
] as const;

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

export function preflightFindings(
  producer: Producer,
  opts: PreflightOpts = {},
): PreflightFinding[] {
  const req = ENGINE_REQUIREMENTS[producer];
  // A producer outside the union (untyped JSON at the CLI seam) is not preflight's call:
  // report nothing here and let the validation gate record it failed (drop-proof intact).
  if (!req) return [];
  const env = opts.env ?? process.env;
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
