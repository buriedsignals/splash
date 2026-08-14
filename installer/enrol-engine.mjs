#!/usr/bin/env bun

import { lstat, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";

const MAX_OUTPUT_BYTES = 1 << 20;

function parseEvents(stdout, label) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error(`${label} returned non-JSON output`);
    }
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new Error(`${label} returned an invalid event`);
    }
    events.push(event);
  }
  const result = events.findLast((event) => event.event === "result");
  if (!result) throw new Error(`${label} returned no result event`);
  return result;
}

function engineDiagnostic({ stdout = "", stderr = "" } = {}) {
  if (stderr.trim()) return stderr.trim();
  let message = "";
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event?.event === "error" && typeof event.message === "string") {
        message = event.message;
      }
    } catch {
      // Engine's successful contract is strict JSON, but failure reporting must not reflect an
      // untrusted raw line into a terminal or setup page.
    }
  }
  return message || "no diagnostic";
}

function safeChildEnv(source = process.env) {
  const blocked = new Set([
    "BASH_ENV",
    "ENV",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "DYLD_INSERT_LIBRARIES",
    "DYLD_LIBRARY_PATH",
    "NODE_OPTIONS",
    "NODE_PATH",
    "BUN_INSTALL_CACHE_DIR",
    "BUN_OPTIONS",
  ]);
  const env = {};
  for (const [name, value] of Object.entries(source)) {
    if (
      value == null ||
      blocked.has(name.toUpperCase()) ||
      name.toUpperCase().startsWith("BUN_INSPECT")
    )
      continue;
    if (
      /(?:_API_KEY|_ACCESS_KEY|_KEY|_TOKEN|_SECRET|_PASSWORD|_CREDENTIALS?)$/i.test(
        name,
      )
    )
      continue;
    env[name] = value;
  }
  return env;
}

async function readBounded(stream, processHandle, label) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > MAX_OUTPUT_BYTES) {
      processHandle.kill();
      throw new Error(`${label} exceeded ${MAX_OUTPUT_BYTES} bytes`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function runBounded(
  command,
  { cwd, stdin = "", timeoutMs = 45 * 60_000 } = {},
) {
  const child = Bun.spawn(command, {
    cwd,
    env: safeChildEnv(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  child.stdin.write(stdin);
  child.stdin.end();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  let stdout, stderr, exitCode;
  try {
    [stdout, stderr, exitCode] = await Promise.all([
      readBounded(child.stdout, child, "Engine stdout"),
      readBounded(child.stderr, child, "Engine stderr"),
      child.exited,
    ]);
  } finally {
    clearTimeout(timer);
  }
  if (timedOut) throw new Error(`Engine command exceeded ${timeoutMs}ms`);
  return { stdout, stderr, exitCode };
}

async function realDirectory(path, label) {
  if (!isAbsolute(path) || resolve(path) !== path)
    throw new Error(`${label} must be a clean absolute path`);
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error(`${label} must be a real directory`);
  const canonical = await realpath(path);
  if (canonical !== path) throw new Error(`${label} contains a symlink`);
  return canonical;
}

async function plannedDirectory(path, label) {
  if (!isAbsolute(path) || resolve(path) !== path)
    throw new Error(`${label} must be a clean absolute path`);
  try {
    return await realDirectory(path, label);
  } catch (error) {
    if (error?.code === "ENOENT") return path;
    throw error;
  }
}

export async function enrolEngine({
  root,
  storiesRoot = join(homedir(), ".local", "share", "splash-stories"),
  newsroomPath = join(homedir(), ".config", "splash", "NEWSROOM.md"),
  skillNamespace = "",
  bsig = Bun.which("bsig") ?? "",
  runCommand = runBounded,
} = {}) {
  const canonicalRoot = await realDirectory(root, "Splash root");
  const canonicalStoriesRoot = await plannedDirectory(
    storiesRoot,
    "Splash stories root",
  );
  if (
    !isAbsolute(newsroomPath) ||
    resolve(newsroomPath) !== newsroomPath ||
    basename(newsroomPath) !== "NEWSROOM.md"
  ) {
    throw new Error(
      "Splash newsroom path must be a clean absolute NEWSROOM.md path",
    );
  }
  if (skillNamespace && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(skillNamespace)) {
    throw new Error("Splash skill namespace is invalid");
  }
  if (!bsig) {
    throw new Error(
      "Engine is required for Splash development setup. Install bsig, then rerun this same command.",
    );
  }
  if (!isAbsolute(bsig))
    throw new Error("bsig must be an absolute executable path");
  const executable = await realpath(bsig);
  const executableInfo = await lstat(executable);
  if (!executableInfo.isFile() || executableInfo.isSymbolicLink())
    throw new Error("bsig is not a real executable file");
  if (process.platform !== "win32" && (executableInfo.mode & 0o111) === 0) {
    throw new Error("bsig is not executable");
  }

  const adoptCommand = [
      executable,
      "--json",
      "adopt",
      "splash",
      "--approve",
      "--install-path",
      canonicalRoot,
      "--stories-root",
      canonicalStoriesRoot,
      "--newsroom-path",
      newsroomPath,
    ];
  if (skillNamespace) adoptCommand.push("--skill-namespace", skillNamespace);
  const adopt = await runCommand(
    adoptCommand,
    { cwd: canonicalRoot },
  );
  if (adopt.exitCode !== 0)
    throw new Error(
      `Engine refused Splash adoption: ${engineDiagnostic(adopt)}`,
    );
  const adopted = parseEvents(adopt.stdout, "Engine adoption");
  const planPath = adopted?.data?.plan_path;
  if (
    !isAbsolute(planPath ?? "") ||
    adopted?.data?.product !== "splash" ||
    adopted?.data?.verb !== "adopt"
  ) {
    throw new Error("Engine adoption returned an invalid plan identity");
  }

  const apply = await runCommand([executable, "--json", "apply", planPath], {
    cwd: canonicalRoot,
  });
  if (apply.exitCode !== 0)
    throw new Error(
      `Engine failed to apply Splash adoption: ${engineDiagnostic(apply)}`,
    );
  const applied = parseEvents(apply.stdout, "Engine apply");
  if (applied?.data?.product !== "splash")
    throw new Error("Engine apply returned the wrong product identity");

  const steps = applied?.data?.steps;
  const smokeStep = Array.isArray(steps)
    ? steps.find((step) => step?.id === "smoke-splash-no-value-operation")
    : null;
  if (smokeStep?.outcome !== "executed") {
    throw new Error(
      "Engine apply did not execute the pre-activation no-value smoke operation",
    );
  }
  const projectionStep = Array.isArray(steps)
    ? steps.find((step) => step?.id === "project-splash-skills")
    : null;
  if (!new Set(["executed", "skipped"]).has(projectionStep?.outcome)) {
    throw new Error(
      "Engine apply did not reconcile the transactional Splash skill projections",
    );
  }
  return {
    root: canonicalRoot,
    storiesRoot: canonicalStoriesRoot,
    newsroomPath,
    planPath,
    executable,
    adopted: true,
    smoke: "chart-map-video-preflight",
    sourceMode: "development",
    skillNamespace,
  };
}

function option(argv, name) {
  const at = argv.indexOf(name);
  if (at < 0 || at + 1 >= argv.length) throw new Error(`${name} is required`);
  return argv[at + 1];
}

function optionalOption(argv, name) {
  const at = argv.indexOf(name);
  return at >= 0 && at + 1 < argv.length ? argv[at + 1] : undefined;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf("--bsig");
  const bsig = at >= 0 && at + 1 < argv.length ? argv[at + 1] : undefined;
  enrolEngine({
    root: option(argv, "--root"),
    storiesRoot: optionalOption(argv, "--stories-root"),
    newsroomPath: optionalOption(argv, "--newsroom-path"),
    skillNamespace: optionalOption(argv, "--skill-namespace"),
    ...(bsig ? { bsig } : {}),
  })
    .then((result) =>
      console.log(
        `Engine adopted ${result.root} and passed the no-value ${result.smoke} smoke operation.`,
      ),
    )
    .catch((error) => {
      console.error(
        error instanceof Error ? error.message : "Engine enrollment failed",
      );
      process.exitCode = 1;
    });
}
