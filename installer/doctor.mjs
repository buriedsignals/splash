#!/usr/bin/env bun
// Splash has no second health-check implementation. Development installs are adopted by Engine,
// so this compatibility entrypoint delegates to the same manifest-derived doctor used by the
// Engine UI and the other managed products.

import { stat, realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const USAGE =
  "usage: bun installer/doctor.mjs [--bsig <absolute path>] [--json]";

function parseArgs(argv) {
  let bsig = Bun.which("bsig") ?? "";
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--bsig") {
      bsig = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    throw new Error(USAGE);
  }
  return { bsig, json };
}

async function defaultRun(command) {
  const child = Bun.spawn(command, {
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });
  return child.exited;
}

export async function runEngineDoctor({
  argv = [],
  runCommand = defaultRun,
} = {}) {
  const { bsig, json } = parseArgs(argv);
  if (!bsig) {
    throw new Error(
      "Engine is required. Install bsig, then rerun this same doctor command.",
    );
  }
  if (!isAbsolute(bsig))
    throw new Error("--bsig must be an absolute executable path");
  const executable = await realpath(bsig);
  const info = await stat(executable);
  if (!info.isFile() || (info.mode & 0o111) === 0) {
    throw new Error("--bsig must resolve to an executable file");
  }
  const command = [executable];
  if (json) command.push("--json");
  command.push("doctor", "--product", "splash");
  return runCommand(command);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runEngineDoctor({ argv: process.argv.slice(2) })
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        error instanceof Error ? error.message : "Splash doctor failed",
      );
      process.exit(1);
    });
}
