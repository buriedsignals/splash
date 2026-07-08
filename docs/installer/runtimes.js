// Source of truth for the installer FORM (labels, key metadata, which runtimes are
// selectable). Install + launch logic lives in the hosted bootstrap scripts, not here.
// Adding a verified runtime = fill claude-style fields + set verified:true + teach the
// bootstrap to install it.
export const RUNTIMES = {
  claude: {
    label: "Claude Code",
    verified: true,
    keyLabel: "Anthropic API key",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyEnv: "ANTHROPIC_API_KEY",
  },
  codex: { label: "Codex", verified: false },
  gemini: { label: "Gemini CLI", verified: false },
  goose: { label: "Goose", verified: false },
};
