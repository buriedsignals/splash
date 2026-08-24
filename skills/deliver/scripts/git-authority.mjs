import { execFile } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GIT_SELECTORS = [
  "GIT_CEILING_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_DIR",
  "GIT_DISCOVERY_ACROSS_FILESYSTEM",
  "GIT_INDEX_FILE",
  "GIT_WORK_TREE",
];

function controlledGitEnvironment(ambient) {
  const env = { ...ambient };
  for (const selector of GIT_SELECTORS) delete env[selector];
  delete env.GIT_CONFIG_PARAMETERS;
  delete env.GIT_CONFIG_SYSTEM;
  for (const name of Object.keys(env)) {
    if (name === "GIT_CONFIG_COUNT" || /^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(name)) delete env[name];
  }

  return {
    ...env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.excludesFile",
    GIT_CONFIG_VALUE_0: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    LC_ALL: "C",
  };
}

async function nearestExistingAncestor(destination) {
  let candidate = destination;
  while (true) {
    try {
      await lstat(candidate);
      return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error(`no existing ancestor for ${destination}`);
    candidate = parent;
  }
}

function isWithin(root, candidate) {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === "" ||
    (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot))
  );
}

function isNotRepository(error) {
  return error?.code === 128 && String(error.stderr).includes("not a git repository");
}

/**
 * Resolve the worktree and index that own a destination, then keep every query bound to them.
 * Git itself interprets normal repositories, nested repositories and linked-worktree `.git` files.
 */
export async function gitAuthorityFor(destination, ambient = process.env) {
  const discoveryRoot = await nearestExistingAncestor(destination);
  const env = controlledGitEnvironment(ambient);
  let stdout;
  try {
    ({ stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd: discoveryRoot,
      encoding: "utf8",
      env,
    }));
  } catch (error) {
    if (isNotRepository(error)) return null;
    throw new Error(`cannot resolve the Git owner for ${destination}`, { cause: error });
  }

  const worktreeRoot = await realpath(stdout.trim());
  if (!isWithin(worktreeRoot, destination)) {
    throw new Error(`Git owner ${worktreeRoot} does not contain ${destination}`);
  }

  return Object.freeze({
    worktreeRoot,
    async trackedPathsUnder(candidate) {
      if (!isWithin(worktreeRoot, candidate)) {
        throw new Error(`Git owner ${worktreeRoot} does not contain ${candidate}`);
      }
      const pathspec = relative(worktreeRoot, candidate);
      const result = await execFileAsync(
        "git",
        ["--literal-pathspecs", "ls-files", "--full-name", "-z", "--", pathspec],
        { cwd: worktreeRoot, encoding: "utf8", env },
      );
      return result.stdout.split("\0").filter(Boolean);
    },
  });
}
