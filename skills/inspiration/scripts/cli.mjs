#!/usr/bin/env bun

// The inspiration skill's command for hosts without the Splash MCP tool: it reads the subject (argv or
// stdin), searches the gallery anonymously once, and prints what the journalist reads — or the
// structured result with --json. Under Indicator Labs the agent uses the `search_inspiration` tool
// instead, which can use the journalist's Infoviz account.

import { formatInspiration } from "./format.mjs";
import { parseArgs, searchInspiration } from "./search.mjs";

const STDIN_LIMIT_BYTES = 64 * 1024;

async function readStdinSubject(stream) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    chunks.push(chunk);
    if (total >= STDIN_LIMIT_BYTES) break;
  }
  return Buffer.concat(chunks).subarray(0, STDIN_LIMIT_BYTES).toString("utf8").trim();
}

const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  console.error(`Usage: cli.mjs [--json] [--stdin] <subject>\n${parsed.error}`);
  process.exit(2);
}
const query = parsed.readStdin ? await readStdinSubject(process.stdin) : parsed.query;
const result = await searchInspiration({ query });
console.log(parsed.asJson ? JSON.stringify(result, null, 2) : formatInspiration(result));
if (!result.ok) process.exitCode = 1;
