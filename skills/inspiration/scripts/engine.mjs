// The only place the inspiration skill starts Engine's `bsig`. It passes arguments as an argv
// array and data on stdin — never through a shell — and reads Engine's NDJSON control events.
//
// The deadline races the read, it never waits for it: a child (or a process it orphans, holding
// the same pipe open) can keep stdout/stderr open past its own exit, and a caller must not inherit
// that hang. `SIGKILL` targets the direct child; nothing here assumes it reaps a grandchild too.

import { isAbsolute } from "node:path";

const MAX_OUTPUT_BYTES = 1 << 20;
const EVENTS = new Set(["progress", "result", "error"]);

async function readBounded(reader) {
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_OUTPUT_BYTES) throw new Error("Engine output exceeded its bound");
    chunks.push(value);
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
  const outReader = child.stdout.getReader();
  const errReader = child.stderr.getReader();

  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Engine timed out"));
    }, timeoutMs);
  });
  deadline.catch(() => {});

  const drain = Promise.all([readBounded(outReader), readBounded(errReader), child.exited]);
  drain.catch(() => {});

  try {
    const [stdout, , exitCode] = await Promise.race([drain, deadline]);
    return { exitCode, events: parseEvents(stdout) };
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  } finally {
    clearTimeout(timer);
    outReader.cancel().catch(() => {});
    errReader.cancel().catch(() => {});
  }
}
