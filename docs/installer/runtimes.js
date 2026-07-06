// Source of truth for both the form cards and the script generator.
// Adding a verified runtime = fill every field on its entry and flip `verified`.
export const RUNTIMES = {
  claude: {
    label: "Claude Code",
    verified: true,
    installCmd: "curl -fsSL https://claude.ai/install.sh | bash",
    bin: "claude",
    keyLabel: "Anthropic API key",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyEnv: "ANTHROPIC_API_KEY",
    launch: "cd ~/Atelier && claude --plugin-dir .",
  },
  // Not yet verified — see the design's "Verification gates". Cards render disabled
  // ("coming soon") until each is confirmed to load the Atelier plugin/skill.
  codex: { label: "Codex", verified: false },
  gemini: { label: "Gemini CLI", verified: false },
  goose: { label: "Goose", verified: false },
};
