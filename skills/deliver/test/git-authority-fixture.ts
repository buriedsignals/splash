import { execFileSync } from "node:child_process";

const GIT_SELECTORS = ["GIT_COMMON_DIR", "GIT_DIR", "GIT_INDEX_FILE", "GIT_WORK_TREE"] as const;

type GitEnvironment = NodeJS.ProcessEnv;
export type GitCommand = (...args: string[]) => string;

export function controlledGitEnvironment(ambient: GitEnvironment = process.env): GitEnvironment {
  const env = { ...ambient };
  for (const selector of GIT_SELECTORS) delete env[selector];
  for (const name of Object.keys(env)) {
    if (name === "GIT_CONFIG_COUNT" || /^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(name)) delete env[name];
  }

  return {
    ...env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_COUNT: "3",
    GIT_CONFIG_KEY_0: "core.excludesFile",
    GIT_CONFIG_VALUE_0: "/dev/null",
    GIT_CONFIG_KEY_1: "commit.gpgSign",
    GIT_CONFIG_VALUE_1: "false",
    GIT_CONFIG_KEY_2: "core.hooksPath",
    GIT_CONFIG_VALUE_2: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
  };
}

export function gitCommand(
  cwd: string,
  ambient: GitEnvironment = process.env,
): GitCommand {
  const env = controlledGitEnvironment(ambient);
  return (...args: string[]) =>
    execFileSync("git", args, { cwd, encoding: "utf8", env });
}

export function hostileExcludeEnvironment(
  systemConfig: string,
  globalConfig: string,
  ambient: GitEnvironment = process.env,
): GitEnvironment {
  const env = { ...ambient };
  delete env.GIT_CONFIG_NOSYSTEM;
  return {
    ...env,
    GIT_CONFIG_SYSTEM: systemConfig,
    GIT_CONFIG_GLOBAL: globalConfig,
  };
}
