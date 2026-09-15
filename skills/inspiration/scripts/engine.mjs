// The only place the inspiration skill starts Engine's `bsig`. It passes arguments as an argv
// array and data on stdin — never through a shell — and reads Engine's NDJSON control events.

import { isAbsolute } from "node:path";

const MAX_OUTPUT_BYTES = 1 << 20;
const EVENTS = new Set(["progress", "result", "error"]);

async function readBounded(stream) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > MAX_OUTPUT_BYTES) throw new Error("Engine output exceeded its bound");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseEvents(stdout) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) continue;
    const event = JSON.parse(line);
    if (!event || typeof event !== "object" || Array.isArray(event) || !EVENTS.has(event.event)) {
      throw new Error("Engine returned an unsupported control event");
    }
    events.push(event);
  }
  if (events.length === 0) throw new Error("Engine returned no control event");
  return events;
}

/**
 * Runs `bsig --json <args>` with `stdin`, bounded in time and output.
 */
export async function runEngine(bsigPath, args, stdin, { timeoutMs }) {
  if (typeof bsigPath !== "string" || !isAbsolute(bsigPath)) {
    throw new Error("Engine executable path must be absolute");
  }
  const child = Bun.spawn([bsigPath, "--json", ...args], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  child.stdin.write(stdin);
  child.stdin.end();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  try {
    const [stdout, , exitCode] = await Promise.all([
      readBounded(child.stdout),
      readBounded(child.stderr),
      child.exited,
    ]);
    if (timedOut) throw new Error("Engine timed out");
    return { exitCode, events: parseEvents(stdout) };
  } finally {
    clearTimeout(timer);
  }
}
