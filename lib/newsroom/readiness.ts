// readiness.ts — is an enabled capability usable RIGHT NOW? Pure by construction: the
// environment and dependency resolution are injected, so a readiness answer never depends on
// the machine that happens to be running the test. That purity is also what keeps the verb
// contract's invariant I5 intact — the contract reads no ambient state, so capability checks
// live here and are performed by CALLERS (the driver, the export script, the host command).
//
// Four statuses, and the two nuances that matter:
//   disabled   — the newsroom did not enable it, or it is only declared. NEVER a failure.
//   unverified — the last live check could not REACH the provider. Not "invalid": a valid key
//                behind a corporate proxy would be condemned for life.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NEWSROOM_CAPABILITIES, type NewsroomCapability } from "./capabilities";
import { defaultResolveDep, isSet } from "./probe";
import type { NewsroomState } from "./state";

export type ReadinessStatus = "ready" | "missing" | "unverified" | "disabled";

export type CapabilityReadiness = {
  id: string;
  label: string;
  status: ReadinessStatus;
  /** Empty when ready or disabled-by-choice; otherwise one actionable sentence. */
  reason: string;
  /** Where the journalist gets what is missing. */
  help: string[];
};

export type ReadinessOpts = {
  env: Record<string, string | undefined>;
  resolveDep?: (pkg: string, fromDir: string) => boolean;
  /** Defaults to this repo's skills/ directory; injected by tests. */
  skillsRoot?: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILLS_ROOT = resolve(here, "../../skills");

export function capabilityReadiness(
  cap: NewsroomCapability,
  state: NewsroomState,
  opts: ReadinessOpts,
): CapabilityReadiness {
  const base = { id: cap.id, label: cap.label, help: [] as string[] };

  if (!cap.implemented)
    return {
      ...base,
      status: "disabled",
      reason: `${cap.label} is not available yet — it arrives with the publisher adapters`,
    };

  if (state.capabilities[cap.id]?.enabled !== true)
    return { ...base, status: "disabled", reason: "" };

  const missingGroups = cap.env.filter(
    (group) => !group.some((name) => isSet(opts.env[name])),
  );
  if (missingGroups.length) {
    const names = missingGroups.map((g) => g.join(" or ")).join(", ");
    return {
      ...base,
      status: "missing",
      reason: `${cap.label} needs ${names} — the Splash setup page collects it for you, then retry`,
      help: missingGroups.flatMap((g) =>
        g.map((n) => cap.envHelp[n]).filter((h): h is string => Boolean(h)),
      ),
    };
  }

  if (cap.criticalDeps) {
    const resolveDep = opts.resolveDep ?? defaultResolveDep;
    const fromDir = join(
      opts.skillsRoot ?? DEFAULT_SKILLS_ROOT,
      cap.criticalDeps.fromSkillDir,
    );
    const missing = cap.criticalDeps.packages.filter(
      (pkg) => !resolveDep(pkg, fromDir),
    );
    if (missing.length)
      return {
        ...base,
        status: "missing",
        reason:
          `${cap.label} is not installed (${missing.join(", ")} missing) — ` +
          `run \`bun install\` in skills/${cap.criticalDeps.fromSkillDir}, then retry`,
      };
  }

  const verified = state.capabilities[cap.id]?.lastVerified;
  if (verified?.result === "rejected")
    return {
      ...base,
      status: "missing",
      reason: `${cap.label}: the provider rejected this credential — re-check it in the Splash setup page`,
      help: Object.values(cap.envHelp),
    };
  if (verified?.result === "unreachable")
    return {
      ...base,
      status: "unverified",
      reason: `${cap.label} could not be reached when it was last checked — it may still work`,
    };

  return { ...base, status: "ready", reason: "" };
}

export function decorReadiness(
  state: NewsroomState,
  opts: ReadinessOpts,
): CapabilityReadiness[] {
  return Object.values(NEWSROOM_CAPABILITIES).map((cap) =>
    capabilityReadiness(cap, state, opts),
  );
}

/** What actually stands in the way. A disabled capability is not a failure, so it is absent. */
export function readinessBlockers(
  list: CapabilityReadiness[],
): CapabilityReadiness[] {
  return list.filter((r) => r.status === "missing");
}
