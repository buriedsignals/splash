// Pure, testable core for the local configurator. No server, no fs, no network.
//
// The four verify* functions MOVED to lib/newsroom/verify.ts, whose `verifyCapability` the setup
// page calls at the grain of a capability (spec 2026-07-26 §2.3). They are re-exported here for
// the duration of the changeover, so an installer script pinned to this module keeps resolving.
export {
  verifyAnthropic,
  verifyCloudflare,
  verifyDatawrapper,
  verifyMapTiler,
} from "../lib/newsroom/verify";

export const RUNTIMES: Record<string, { label: string; verified: boolean }> = {
  claude: { label: "Claude Code", verified: true },
  codex: { label: "Codex", verified: true },
  // Enabled by decision (2026-07-13). Layer A (skill discovery) is proven; Layer B
  // (nested-invocation orchestration) is NOT yet proven — the free Gemini tier's quota
  // blocked it, so it needs a paid tier to confirm. See docs/installer/gemini-proof.md.
  gemini: { label: "Gemini CLI", verified: true },
  // Enabled by decision (2026-07-14). Layer A (skill discovery) proven live, and Goose activated the
  // splash skill + drove the flow — but Layer B was cut off by the free Gemini quota before the
  // nested invocation completed, so the full end-to-end is not proven. See docs/installer/goose-proof.md.
  goose: { label: "Goose", verified: true },
};
