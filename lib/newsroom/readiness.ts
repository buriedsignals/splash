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
import {
  type BrowserProbeResult,
  defaultResolveDep,
  isSet,
  probeRemotionBrowser,
} from "./probe";
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
  /** Is a fully extracted Remotion headless-shell browser present for that skill dir? Runs
   *  only when a capability's criticalDeps carry "remotion" (see capabilityReadiness).
   *  Defaults to a real filesystem stat; injected by tests. */
  probeBrowser?: (fromDir: string) => BrowserProbeResult;
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

  // The provider identifiers that do NOT belong in .env — an S3 endpoint, a bucket, the
  // We.Publish address. They live in newsroom.json, which is exactly the bag `deliver()` hands
  // the adapter (lib/loop/deliver.ts), so this judges the same thing the adapter will.
  //
  // Asked AFTER the credentials on purpose: a newsroom reads one instruction at a time, and the
  // key (where the provider account is) comes before the bucket (where the files go).
  const settings = state.capabilities[cap.id]?.settings ?? {};
  const missingSettings = (cap.settingsFields ?? []).filter(
    (f) => f.required && !f.secret && !(settings[f.name] ?? "").trim(),
  );
  if (missingSettings.length)
    return {
      ...base,
      status: "missing",
      reason:
        `${cap.label} is not fully configured — it still needs ` +
        `${missingSettings.map((f) => f.name).join(", ")}. ` +
        `They are set in newsroom.json under capabilities["${cap.id}"].settings ` +
        `(the Splash setup page fills them in for you; credentials stay in .env)`,
      help: missingSettings.map((f) => f.label),
    };

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

    // Package resolution alone cannot see this: a stalled fetch can leave a partial download
    // sitting unextracted while `remotion` itself still resolves fine, and every dependent
    // render then dies with an unreadable subprocess dump (the incident this probe exists for).
    if (cap.criticalDeps.packages.includes("remotion")) {
      const probeBrowser = opts.probeBrowser ?? probeRemotionBrowser;
      if (probeBrowser(fromDir).status !== "ready")
        return {
          ...base,
          status: "missing",
          reason:
            `${cap.label}'s video renderer needs its Remotion browser, which looks missing ` +
            `or half-downloaded — run \`bunx remotion browser ensure\` in ` +
            `skills/${cap.criticalDeps.fromSkillDir}, then retry`,
        };
    }
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
