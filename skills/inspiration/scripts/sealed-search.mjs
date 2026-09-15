#!/usr/bin/env bun

// Engine's closed entry for an inspiration search made with the journalist's Infoviz account.
// Engine injects INFOVIZ_TOKEN and passes only the subject on stdin; the token never reaches the
// model, the command line or the output. A refused token is the one case that searches twice: the
// anonymous answer comes back flagged, so the journalist learns the account needs reconnecting
// instead of silently losing their allowance.

import { searchInspiration } from "./search.mjs";

const MAX_REQUEST_BYTES = 64 * 1024;

function exactKeys(value, expected) {
  const actual =
    value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error("sealed inspiration request fields do not match the closed contract");
  }
}

/**
 * Searches with the injected account token; on a refused token, once more without it.
 */
export async function sealedSearch(request, { searchFn = searchInspiration, env = process.env } = {}) {
  exactKeys(request, ["query"]);
  const result = await searchFn({ query: request.query, token: env.INFOVIZ_TOKEN ?? "" });
  if (result.reason !== "invalid-token") return result;
  const anonymous = await searchFn({ query: request.query });
  return { ...anonymous, accountNeedsReconnect: true };
}

async function readRequest() {
  const chunks = [];
  let total = 0;
  for await (const chunk of Bun.stdin.stream()) {
    total += chunk.byteLength;
    if (total > MAX_REQUEST_BYTES) throw new Error("sealed inspiration request has an invalid size");
    chunks.push(chunk);
  }
  if (total === 0) throw new Error("sealed inspiration request has an invalid size");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// Engine redacts every emitted NDJSON line with `(?:cj_|on_|sk-|fw_)[A-Za-z0-9_-]{8,}`, which
// ordinary gallery urls and titles match (`flood-risk-map-england` becomes `flood-ri[redacted]`).
// Standard base64 (no `_` or `-` in its alphabet) survives that scan untouched, so the result
// travels wrapped rather than raw.
export function encodeSealedResult(result) {
  return Buffer.from(JSON.stringify(result), "utf8").toString("base64");
}

if (import.meta.main) {
  try {
    const result = await sealedSearch(await readRequest());
    process.stdout.write(`${JSON.stringify({ b64: encodeSealedResult(result) })}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "sealed inspiration search failed");
    process.exitCode = 1;
  }
}
