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

/** The assistant's own sign-in. Not a capability: it buys no format, it starts the runtime. */
export type RuntimeLogin = {
  /** The env var the runtime reads. Written to .env by the setup page. */
  name: string;
  /** Product name, shown as the field label. Not translated — it is a product. */
  label: string;
  /** Where the journalist gets it, with the link. */
  help: string;
  /** true = a subscription or an interactive sign-in also works, so blank is legitimate. */
  optional: boolean;
};

export const RUNTIMES: Record<
  string,
  { label: string; verified: boolean; login?: RuntimeLogin }
> = {
  claude: {
    label: "Claude Code",
    verified: true,
    login: {
      name: "ANTHROPIC_API_KEY",
      label: "Anthropic API key",
      help: "create one at https://console.anthropic.com/settings/keys",
      optional: true,
    },
  },
  codex: {
    label: "Codex",
    verified: true,
    login: {
      name: "OPENAI_API_KEY",
      label: "OpenAI API key",
      help: "create one at https://platform.openai.com/api-keys",
      optional: true,
    },
  },
  // Enabled by decision (2026-07-13). Layer A (skill discovery) is proven; Layer B
  // (nested-invocation orchestration) is NOT yet proven — the free Gemini tier's quota
  // blocked it, so it needs a paid tier to confirm. See docs/installer/gemini-proof.md.
  gemini: {
    label: "Gemini CLI",
    verified: true,
    login: {
      name: "GEMINI_API_KEY",
      label: "Google AI Studio key",
      help: "create one at https://aistudio.google.com/apikey",
      optional: true,
    },
  },
  // Enabled by decision (2026-07-14). Layer A (skill discovery) proven live, and Goose activated the
  // splash skill + drove the flow — but Layer B was cut off by the free Gemini quota before the
  // nested invocation completed, so the full end-to-end is not proven. See docs/installer/goose-proof.md.
  // No login: Goose carries its own provider configuration, outside this page's reach.
  goose: { label: "Goose", verified: true },
  // The newsroom-facing runtime: installed once, launched from the Dock, no terminal after install.
  // NOT verified: the gate proved the app discovers our skills, follows the symlinks, executes a
  // command, and can reach `bun` (docs/installer/goose-desktop-findings.md) — but nobody has seen a
  // visual come OUT of it. That is Layer B, and it is what flips this flag.
  // No login: the app owns the account it signs into.
  "goose-desktop": { label: "Goose Desktop", verified: false },
  // The second desktop runtime. Layer A is measured in the shipped bundle — the app auto-loads
  // ~/.claude/skills and mounts it into its sandbox — but no visual has come out of the app, so it
  // gets the same flag as its sibling. See docs/installer/claude-desktop-findings.md.
  // No login: the app owns the account it signs into.
  "claude-desktop": { label: "Claude Desktop", verified: false },
};
