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
// happened to import the registrations itself.
import "../loop/engines";
import { runVerb } from "../core/verbs";
import { capabilities } from "./capabilities";
import { describeNext, describeState, type HostResponse } from "./state";

function emit(body: unknown, code: number): never {
  console.log(JSON.stringify(body, null, 2));
  process.exit(code);
}

function usage(message: string): never {
  emit({ ok: false, code: "usage", message }, 2);
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function readStdin(): Promise<string> {
  return await new Response(Bun.stdin.stream()).text();
}

async function main(): Promise<never> {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "verbs") emit(capabilities(), 0);

  if (command === "state" || command === "next") {
    const runDir = flag(rest, "--run");
    if (!runDir) usage(`${command} needs --run <dir>`);
    const r: HostResponse =
      command === "state" ? describeState(runDir) : describeNext(runDir);
    // An unreadable run is an input problem, not a refused verb: exit 2.
    emit(r, r.ok ? 0 : 2);
  }

  if (command === "verb") {
    const name = rest[0];
    if (!name) usage("verb needs a name: verb <name> < request.json");
    const raw = await readStdin();
    if (!raw.trim())
      usage("verb reads its request as JSON on stdin, and stdin was empty");
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      usage(`stdin is not valid JSON: ${(e as Error).message}`);
    }
    const result = await runVerb(name, payload);
    // A refusal is a well-formed answer, not a usage error — exit 1, print the result.
    emit(result, result.ok ? 0 : 1);
  }

  usage(
    `unknown command ${JSON.stringify(command ?? "")} — expected verbs, state, next or verb`,
  );
}

if (import.meta.main) await main();
