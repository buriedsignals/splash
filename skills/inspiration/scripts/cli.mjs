#!/usr/bin/env bun

// The inspiration skill's one command. It reads the subject (argv or stdin), lets managed.mjs
// choose between the connected Infoviz account under Engine and the anonymous search, and prints
// what the journalist reads — or the structured result with --json.

import { formatInspiration } from "./format.mjs";
import { runEngine } from "./engine.mjs";
import { searchWithAccount } from "./managed.mjs";
import { parseArgs } from "./search.mjs";

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
const result = await searchWithAccount({ query, runEngineFn: runEngine });
console.log(parsed.asJson ? JSON.stringify(result, null, 2) : formatInspiration(result));
if (!result.ok) process.exitCode = 1;
