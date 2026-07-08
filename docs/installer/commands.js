// Pure, KEY-FREE command generators for the public installer page. The command is identical
// for every user (no per-user baking) — keys are collected later by the local configurator.
const REPO_URL = "https://github.com/buriedsignals/atelier"; // confirm before public release
const REF = "main"; // pin to a release tag before public release
const REPO_PATH = new URL(REPO_URL).pathname.replace(/^\//, "");

export function bootstrapUrl(os) {
  const file = os === "windows" ? "bootstrap.ps1" : "bootstrap.sh";
  return `https://raw.githubusercontent.com/${REPO_PATH}/${REF}/install/${file}`;
}

export function installCommand(os) {
  const url = bootstrapUrl(os);
  return os === "windows" ? `irm ${url} | iex` : `curl -fsSL ${url} | bash`;
}

export function launcherFilename(os) {
  return os === "windows" ? "atelier-setup.cmd" : "atelier-setup.command";
}

export function launcherContents(os) {
  const url = bootstrapUrl(os);
  if (os === "windows") {
    return (
      "@echo off\r\n" +
      "rem atelier-setup.cmd — installs Atelier. No keys inside; you enter them in the configurator.\r\n" +
      `powershell -ExecutionPolicy Bypass -Command "irm ${url} | iex"\r\n` +
      "pause\r\n"
    );
  }
  return (
    "#!/usr/bin/env bash\n" +
    "# atelier-setup.command — installs Atelier. No keys inside; you enter them in the configurator.\n" +
    'chmod +x "$0" 2>/dev/null; xattr -d com.apple.quarantine "$0" 2>/dev/null || true\n' +
    `curl -fsSL ${url} | bash\n`
  );
}
