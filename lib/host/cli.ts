// The host façade: JSON in, JSON out, stable exit codes. This is the surface a host that
// is not JavaScript drives — a shell recipe, an agent CLI, a script around a local model.
// It holds no state: the run lives in its directory, so every invocation is independent
// and the host has nothing to keep.
//
// Exit codes are part of the contract:
//   0  success
//   1  the verb was refused (a well-formed request the contract declined)
//   2  usage error, unparseable input, or an unreadable run
//
// stdout carries ONLY the JSON document, so a host can parse it whole. Anything humans
// need to read goes to stderr.
//
// The engine registrations come in through the loop's composition root: the verb contract
// dispatches from a registry that engines self-register into, and a registry nobody
// populated answers `unknown-engine` for every engine that exists. This import is the
// difference between a façade that works and one that only works inside a test file that
// happened to import the registrations itself. The VALUE is bound below, not just imported
// for its side effect — a lone side-effect import is exactly the line a future "unused
// import" cleanup deletes, and the failure that causes is a runtime `unknown-engine`, not
// a compile error.
import { ENGINES_REGISTERED } from "../loop/engines";
import { runVerb } from "../core/verbs";
import { capabilities } from "./capabilities";
import { outDirRefusal } from "./path-safety";
import { describeNext, describeState, type HostResponse } from "./state";
import type { HostErrorCode } from "./errors";

function emit(body: unknown, code: number): never {
  console.log(JSON.stringify(body, null, 2));
  process.exit(code);
}

// Every refusal the façade itself issues, in the shared envelope, with a code drawn from the
// one declared list `verbs` publishes (lib/host/errors.ts) — so the codes a host meets and
// the codes we advertise cannot drift apart.
function hostFail(code: HostErrorCode, message: string): never {
  emit({ ok: false, code, message }, 2);
}

function usage(message: string): never {
  hostFail("usage", message);
}

// Flag parsing for a surface whose exit codes are a contract: an unrecognised or malformed
// flag is a `usage` refusal, never silently ignored. The previous positional `indexOf`
// answered "state needs --run <dir>" for `state --run=/tmp` (the flag WAS given), and
// dropped `--bogus` and a misplaced `--run` on the floor.
type ParsedFlags =
  { ok: true; flags: Record<string, string> } | { ok: false; message: string };

function parseFlags(argv: string[], allowed: readonly string[]): ParsedFlags {
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (!token.startsWith("--"))
      return {
        ok: false,
        message:
          `unexpected argument ${JSON.stringify(token)} — ` +
          (allowed.length
            ? `this command takes flags only (${allowed.map((f) => `${f} <value>`).join(", ")})`
            : "this command takes no arguments"),
      };
    const eq = token.indexOf("=");
    const name = eq >= 0 ? token.slice(0, eq) : token;
    if (!allowed.includes(name))
      return {
        ok: false,
        message:
          `unknown flag ${JSON.stringify(name)} — ` +
          (allowed.length
            ? `this command accepts ${allowed.join(", ")}`
            : "this command accepts no flags"),
      };
    if (name in flags)
      return { ok: false, message: `flag ${name} was given more than once` };
    if (eq >= 0) {
      const value = token.slice(eq + 1);
      if (!value)
        return { ok: false, message: `flag ${name}= was given an empty value` };
      flags[name] = value;
      continue;
    }
    const value = argv[++i];
    if (value === undefined || value.startsWith("--"))
      return {
        ok: false,
        message: `flag ${name} needs a value: ${name} <value>`,
      };
    flags[name] = value;
  }
  return { ok: true, flags };
}

// Reading stdin can fail on the host's side of the pipe — the one-character mistake of
// redirecting from `$DIR` instead of `$DIR/request.json` raises EISDIR. That is an input
// problem, so it becomes a `usage` refusal (exit 2) rather than a stack trace on stderr and
// exit 1, which is the code that means "the verb was refused, body has ok:false".
type StdinRead = { ok: true; text: string } | { ok: false; message: string };

async function readStdin(): Promise<StdinRead> {
  try {
    return { ok: true, text: await new Response(Bun.stdin.stream()).text() };
  } catch (e) {
    return {
      ok: false,
      message:
        `stdin could not be read: ${(e as Error)?.message ?? String(e)} — ` +
        `verb reads its request as JSON on stdin (verb <name> < request.json)`,
    };
  }
}

async function main(): Promise<never> {
  // Binding the composition root's value keeps the registration import load-bearing.
  if (!ENGINES_REGISTERED)
    hostFail(
      "internal",
      "engine registrations did not load — the registry is empty",
    );

  const [command, ...rest] = process.argv.slice(2);

  if (command === "verbs") {
    const parsed = parseFlags(rest, []);
    if (!parsed.ok) usage(parsed.message);
    // One envelope for every command, so a host parses one shape: `ok` first, then either
    // `value` or `code`+`message`.
    emit({ ok: true, value: capabilities() }, 0);
  }

  if (command === "state" || command === "next") {
    const parsed = parseFlags(rest, ["--run"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage(`${command} needs --run <dir>`);
    const r: HostResponse =
      command === "state" ? describeState(runDir) : describeNext(runDir);
    // An unreadable run is an input problem, not a refused verb: exit 2.
    emit(r, r.ok ? 0 : 2);
  }

  if (command === "verb") {
    const name = rest[0];
    if (!name || name.startsWith("--"))
      usage("verb needs a name: verb <name> < request.json");
    // `verb` deliberately takes no flags — the contract's payload is self-sufficient and
    // carries its own outDir. A flag here means the host is following a sketch the façade
    // does not implement, and silence would hide that.
    const parsed = parseFlags(rest.slice(1), []);
    if (!parsed.ok) usage(`verb ${name}: ${parsed.message}`);

    const stdin = await readStdin();
    if (!stdin.ok) usage(stdin.message);
    if (!stdin.text.trim())
      usage("verb reads its request as JSON on stdin, and stdin was empty");
    let payload: unknown;
    try {
      payload = JSON.parse(stdin.text);
    } catch (e) {
      usage(`stdin is not valid JSON: ${(e as Error).message}`);
    }
    // Path-safety at the untrusted boundary, BEFORE the contract can resolve or delete
    // anything (lib/host/path-safety.ts). A refusal is a well-formed answer in the verb's
    // own shape — invalid-request, exit 1 — so the host needs no second parser.
    const result = outDirRefusal(payload) ?? (await runVerb(name, payload));
    emit(result, result.ok ? 0 : 1);
  }

  usage(
    `unknown command ${JSON.stringify(command ?? "")} — expected verbs, state, next or verb`,
  );
}

// The never-throw invariant, made STRUCTURAL at the process boundary. Every path above
// already answers with a value, but this is the outermost edge of the façade and a host
// outside JavaScript has no `catch`: a residual throw anywhere below (a broken registered
// manifest, a future command) must still leave stdout carrying a JSON document and the exit
// code one of the three documented ones. §4.4 of the spec records the predecessor branch
// learning that this invariant does not hold by re-reading code — only by anchoring it here.
function reportUnexpected(e: unknown): never {
  try {
    hostFail(
      "internal",
      `the host façade failed unexpectedly: ${(e as Error)?.message ?? String(e)}`,
    );
  } catch {
    // Even the report can fail (a closed stdout raises EPIPE). The exit code is the last
    // thing the contract can still honour, so honour it rather than recurse into the
    // handler that just threw.
    process.exit(2);
  }
}

if (import.meta.main) {
  process.on("uncaughtException", reportUnexpected);
  process.on("unhandledRejection", reportUnexpected);
  main().catch(reportUnexpected);
}
