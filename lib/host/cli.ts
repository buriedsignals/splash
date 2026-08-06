// The host façade: JSON in, JSON out, stable exit codes. This is the surface a host that
// is not JavaScript drives — a shell recipe, an agent CLI, a script around a local model.
// It holds no state: the run lives in its directory, so every invocation is independent
// and the host has nothing to keep.
//
// Exit codes are part of the contract:
//   0  success
//   1  refused — a well-formed request the contract or the loop declined (a verb, a loop step,
//      or a decision)
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
import { capabilities, HOST_ONLY_VERBS } from "./capabilities";
import {
  advanceRun,
  approveIn,
  authorBeatsIn,
  chooseFormIn,
  confirmAngleIn,
  initRunIn,
  phraseOfferIn,
  requestDeliveryIn,
} from "./drive";
import { describePrecheck, describeProbeRun, presentIn } from "./gates";
import { describeNewsroom } from "./newsroom";
import { walkCapability } from "../../skills/splash/src/narrative-walk-gate";
import { narrativeKindsFor } from "../../skills/splash/src/narrative-kinds";
import { outDirRefusal } from "./path-safety";
import { describeIntentQuestion } from "./suggest-intent";
import { RENDER_SOURCE_POLICY_MARK } from "./source-mark";
import { describeNext, describeState, type HostResponse } from "./state";
import type { VerbErrorCode } from "../core/verbs/types";
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

// The JSON-document-on-stdin idiom, shared by every command whose argument is a DOCUMENT rather
// than a handful of scalars (`verb`, `init`, `phrase`). Flags carry scalars; a run declaration
// and a phrasing are structured, and squeezing them into ten near-homonymous flags is the shape
// in which a host silently fills the wrong slot. One reader, so the three commands cannot
// disagree about what an empty or unparseable stdin means.
async function readJsonRequest(what: string, how: string): Promise<unknown> {
  const stdin = await readStdin();
  if (!stdin.ok) usage(stdin.message);
  if (!stdin.text.trim())
    usage(
      `${what} reads its request as JSON on stdin, and stdin was empty (${how})`,
    );
  try {
    return JSON.parse(stdin.text);
  } catch (e) {
    return usage(`stdin is not valid JSON: ${(e as Error).message}`);
  }
}

// The same reader, for a document a command can legitimately be given none of. An empty stdin
// is `undefined` rather than a usage refusal; malformed JSON is still a usage refusal, because
// a host that MEANT to send a ceremony and mistyped it must not be told its approval went
// through with none.
async function readOptionalJsonRequest(
  what: string,
  how: string,
): Promise<unknown> {
  const stdin = await readStdin();
  if (!stdin.ok) usage(stdin.message);
  if (!stdin.text.trim()) return undefined;
  try {
    return JSON.parse(stdin.text);
  } catch (e) {
    return usage(
      `${what}: stdin is not valid JSON: ${(e as Error).message} (${how})`,
    );
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

  // The ACTING commands. `state`/`next` report what is valid; these do it. They are the only
  // commands besides `verb` that write, and they write exactly one file — the run.json of the
  // run they were pointed at — plus whatever the loop's own step produces beneath it.
  if (command === "init") {
    const parsed = parseFlags(rest, ["--run"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("init needs --run <dir>");
    const declaration = await readJsonRequest(
      "init",
      "init --run <dir> < declaration.json",
    );
    const r = initRunIn(runDir, declaration);
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "advance") {
    const parsed = parseFlags(rest, ["--run"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("advance needs --run <dir>");
    const r = await advanceRun(runDir);
    // Two failure families, two exit codes: an unreadable run is an input problem (2), a step
    // the loop declined is a refusal (1) — the same split `verb` already draws.
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "confirm-angle") {
    // FLAGS, deliberately — the opposite choice from `init` and `phrase`, which read documents.
    // The angle is free editorial text, and the reason a command may write it is that the host
    // never names a KEY: it answers one of four known questions. A JSON body would invite "here
    // is an object"; flags enumerate. lib/loop/angle.ts holds the refusals.
    const parsed = parseFlags(rest, [
      "--run",
      "--takeaway",
      "--alt-insight",
      "--unit",
      "--intent",
      "--emphasis",
      "--element",
    ]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("confirm-angle needs --run <dir>");
    const takeaway = parsed.flags["--takeaway"];
    if (!takeaway)
      usage(
        "confirm-angle needs --takeaway <s> — the claim the journalist confirmed, which becomes the visual's title",
      );
    const altInsight = parsed.flags["--alt-insight"];
    if (!altInsight)
      usage(
        "confirm-angle needs --alt-insight <s> — the accessibility description (WCAG 1.1.1), which states the insight rather than the chart's structure",
      );
    const unit = parsed.flags["--unit"];
    if (!unit)
      usage(
        "confirm-angle needs --unit <s> — what the numbers are measured in; for a count, the thing counted",
      );
    // The intent is asked in the SAME command as the other parts, and refused absent, because
    // it is one of the angle's known parts — what the journalist wants the figure to show. It
    // used to be guessed from `--takeaway` by a keyword pass that answered nothing on ordinary
    // French phrasings; the offer was then ordered by fit and readiness alone, silently.
    //
    // The usage names `suggest-intent` rather than reciting the nine machine ids here: a
    // journalist must never be asked "is your intent part-to-whole?", and that command is what
    // serves the question editorially, in the newsroom's own language.
    const intent = parsed.flags["--intent"];
    if (!intent)
      usage(
        "confirm-angle needs --intent <id> — what the journalist wants the figure to SHOW, which " +
          "is what orders the offer. Read the choices phrased for a journalist, in your own " +
          'language, with "suggest-intent --takeaway <s>", and never present the raw id',
      );
    const r = confirmAngleIn(
      runDir,
      {
        takeaway,
        altInsight,
        unit,
        intent,
        ...(parsed.flags["--emphasis"]
          ? { emphasis: parsed.flags["--emphasis"] }
          : {}),
      },
      parsed.flags["--element"],
    );
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "phrase") {
    // A DOCUMENT on stdin, like `init` and unlike `confirm-angle`: the phrasing is a list whose
    // length and order are fixed by the offer, one sentence per form. No set of flags expresses
    // "one value per option, in the offer's order" — and that order is exactly what the guard
    // beneath verifies.
    const parsed = parseFlags(rest, ["--run", "--element"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("phrase needs --run <dir>");
    const phrased = await readJsonRequest(
      "phrase",
      "phrase --run <dir> < phrasing.json",
    );
    const r = phraseOfferIn(runDir, phrased, parsed.flags["--element"]);
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "author-beats") {
    // A DOCUMENT on stdin, exactly like `phrase` and for the same reason: the list's length and
    // order are fixed by the drafted plan, one claim per beat, and that order is what the guard
    // beneath verifies. Flags cannot express "one value per beat, in the plan's order".
    const parsed = parseFlags(rest, ["--run", "--element"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("author-beats needs --run <dir>");
    const authored = await readJsonRequest(
      "author-beats",
      "author-beats --run <dir> < walk.json",
    );
    const r = authorBeatsIn(runDir, authored, parsed.flags["--element"]);
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "choose-form") {
    // --element is OPTIONAL and its absence is meaningful: without it the decision lands on the
    // element `next` is talking about (lib/host/drive.ts's selectElement), which is the loop's
    // own answer and never a positional guess. A host addresses a sibling deliverable — or
    // re-opens the finished master — by naming it.
    const parsed = parseFlags(rest, ["--run", "--option", "--element"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("choose-form needs --run <dir>");
    const option = parsed.flags["--option"];
    if (!option)
      usage("choose-form needs --option <id> — the id of a form in the offer");
    const r = chooseFormIn(runDir, option, parsed.flags["--element"]);
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "approve") {
    // A DOCUMENT on stdin, like `phrase` — a list of overrides, each with its own reason, has
    // no shape in flags — and OPTIONAL, unlike every other document on this surface: approving
    // a visual with nothing open to acknowledge must not require a ceremony, so an empty stdin
    // means "nothing to declare" rather than a usage error.
    const parsed = parseFlags(rest, ["--run", "--element"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("approve needs --run <dir>");
    const ceremony = await readOptionalJsonRequest(
      "approve",
      "approve --run <dir> < ceremony.json",
    );
    const r = approveIn(runDir, ceremony, parsed.flags["--element"]);
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "request-delivery") {
    const parsed = parseFlags(rest, ["--run", "--to", "--element"]);
    if (!parsed.ok) usage(parsed.message);
    const runDir = parsed.flags["--run"];
    if (!runDir) usage("request-delivery needs --run <dir>");
    const to = parsed.flags["--to"];
    // A comma list, validated rather than cleaned: "zip," silently becoming ["zip"] would let a
    // typo decide where a newsroom's work is published. Absent --to is different from an empty
    // one — it means "derive the destination from the format's genre".
    let destinations: string[] | undefined;
    if (to !== undefined) {
      destinations = to.split(",");
      if (destinations.some((d) => d.trim() === ""))
        usage(
          `--to lists destinations separated by commas, and ${JSON.stringify(to)} holds an empty one`,
        );
      destinations = destinations.map((d) => d.trim());
    }
    const r = requestDeliveryIn(
      runDir,
      destinations,
      parsed.flags["--element"],
    );
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "suggest-intent") {
    // READ-ONLY, and deliberately without --run: the question comes before the angle exists, so
    // requiring a run would make it unaskable at the only moment it is useful. It answers with
    // the nine choices phrased for a journalist plus what the draft wording reads like — the
    // keyword pass that used to decide the ranking on its own, now offering instead.
    const parsed = parseFlags(rest, ["--takeaway", "--language"]);
    if (!parsed.ok) usage(parsed.message);
    const takeaway = parsed.flags["--takeaway"];
    if (!takeaway)
      usage(
        "suggest-intent needs --takeaway <s> — the claim the journalist is making, which the " +
          "suggestion is read from",
      );
    const r = describeIntentQuestion(takeaway, parsed.flags["--language"]);
    emit(r, r.ok ? 0 : 2);
  }

  if (command === "newsroom") {
    const parsed = parseFlags(rest, ["--dir"]);
    if (!parsed.ok) usage(parsed.message);
    // --dir is optional: without it the decor resolves from the install root.
    const r = describeNewsroom(parsed.flags["--dir"]);
    emit(r, r.ok ? 0 : 2);
  }

  // ★ CAN THIS FORM CARRY A WALK — asked, not recalled. Read-only, no --run, for the same reason
  // precheck below has none: the chain that runs has no run.json, and the question is useful
  // exactly one turn before a journalist is told a form is impossible.
  //
  // It exists because of a measured failure. On 2026-08-06 a journalist was told his bar video
  // could not carry his sentences — nine minutes after the merge that made it carry them, with
  // the prose that says so already loaded. Prose was not enough; an orchestrator asserted an
  // incapacity it never checked. A guard cannot catch that (it refuses what is attempted, and
  // nothing was attempted), so the fix is to make the question answerable.
  // WHICH NARRATIVE KINDS this type can be — the question that must be ASKED before a video is
  // proposed. A video is not one thing: a map can be a guided tour, a run of steps, or a
  // fixed-camera reveal, and a chart has two of those. Nobody ever asked the journalist, so
  // `cameraMode` sat at its default and nothing could honestly depend on it.
  //
  // Sibling of can-carry-walk below, same posture: read-only, no --run, answerable at the turn
  // the proposal is composed. Its answer is the registry's, so a proposal is composed FROM it
  // rather than from what an orchestrator remembers.
  if (command === "narrative-kinds") {
    const parsed = parseFlags(rest, ["--producer", "--type"]);
    if (!parsed.ok) usage(parsed.message);
    const producer = parsed.flags["--producer"];
    if (!producer) usage("narrative-kinds needs --producer <p>");
    emit(
      {
        ok: true,
        value: { kinds: narrativeKindsFor(producer, parsed.flags["--type"] ?? "") },
      },
      0,
    );
  }

  if (command === "can-carry-walk") {
    const parsed = parseFlags(rest, [
      "--producer",
      "--type",
      "--format",
      "--camera-mode",
    ]);
    if (!parsed.ok) usage(parsed.message);
    const producer = parsed.flags["--producer"];
    const format = parsed.flags["--format"];
    if (!producer || !format)
      usage("can-carry-walk needs --producer <p> and --format <f>");
    const answer = walkCapability(
      producer,
      parsed.flags["--type"] ?? "",
      format,
      parsed.flags["--camera-mode"],
    );
    emit({ ok: true, value: answer }, 0);
  }

  if (command === "precheck") {
    // READ-ONLY, and deliberately without --run: the chain that runs today has no run.json
    // (two-chains-gap-2026-07-28.md §1.1), and requiring one would make the check unaskable at
    // the only moment it is useful — the turn before a folder is named to a journalist.
    const parsed = parseFlags(rest, ["--stage", "--dir", "--format", "--form"]);
    if (!parsed.ok) usage(parsed.message);
    const stage = parsed.flags["--stage"];
    if (stage !== "production" && stage !== "export")
      usage("precheck needs --stage <production|export>");
    const dir = parsed.flags["--dir"];
    if (!dir) usage("precheck needs --dir <dir>");
    const r = describePrecheck({
      stage,
      dir,
      ...(parsed.flags["--format"] ? { format: parsed.flags["--format"] } : {}),
      ...(parsed.flags["--form"] ? { form: parsed.flags["--form"] } : {}),
    });
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "present") {
    // The one command on this surface whose POINT is a side effect outside the run directory: it
    // launches a viewer. It writes exactly one file — the receipt, beside the artifact it opened.
    const parsed = parseFlags(rest, ["--path"]);
    if (!parsed.ok) usage(parsed.message);
    const path = parsed.flags["--path"];
    if (!path)
      usage(
        "present needs --path <file> — the artifact to open. A described render is not a shown one",
      );
    const r = presentIn(path);
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "probe") {
    // A DOCUMENT on stdin, like `phrase` and `author-beats`: a list whose length is the review's,
    // one command per check. And a document rather than flags for a second reason here — an argv
    // array has no shape in a flag, and flattening it into one would be exactly the string a
    // shell then re-splits.
    const parsed = parseFlags(rest, ["--cwd"]);
    if (!parsed.ok) usage(parsed.message);
    const specs = await readJsonRequest("probe", "probe < probes.json");
    const r = describeProbeRun(specs, parsed.flags["--cwd"] ?? process.cwd());
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }

  if (command === "verb") {
    const name = rest[0];
    if (!name || name.startsWith("--"))
      usage("verb needs a name: verb <name> < request.json");
    // A verb whose gates live in the LOOP is not callable here — refused before stdin is even
    // read, so nothing can be published on the way to the refusal. `publish` is the case:
    // everything lib/loop/deliver.ts applies before it (the editorial sign-off, the provenance
    // freshness check, the metadata derived from the newsroom's profile, the capability
    // readiness, the genre's `serves` legality) is a fact about a RUN, and this payload has no
    // way to name one. Carrying those gates into the verb instead would mean handing the neutral
    // contract a manifest, a decor and a run directory — the coupling `verb`'s "no --run" rule
    // exists to prevent. So the detour is the answer, and `verbs` declares it (hostCommand).
    const detour = HOST_ONLY_VERBS[name];
    if (detour)
      usage(
        `verb ${name} is not callable through the façade — ${detour.why}. ` +
          `Use ${detour.commands.join(", then ")} instead`,
      );
    // `verb` deliberately takes no flags — the contract's payload is self-sufficient and
    // carries its own outDir. A flag here means the host is following a sketch the façade
    // does not implement, and silence would hide that.
    const parsed = parseFlags(rest.slice(1), []);
    if (!parsed.ok) usage(`verb ${name}: ${parsed.message}`);

    const payload = await readJsonRequest("verb", "verb <name> < request.json");
    // Path-safety at the untrusted boundary, BEFORE the contract can resolve or delete
    // anything (lib/host/path-safety.ts). A refusal is a well-formed answer in the verb's
    // own shape — invalid-request, exit 1 — so the host needs no second parser.
    const result = outDirRefusal(payload) ?? (await runVerb(name, payload));
    // A bare `render` produced a real artifact under a credit NOTHING validated (the contract
    // holds `spec` opaque, so the source inside it is the host's own). Saying so beside the
    // artifact is what stops it passing for one the source policy checked; `verbs` declares the
    // same object, from the same constant. Only on SUCCESS — a refusal rendered nothing — and
    // only for `render`, which is the one verb reachable here that writes an artifact.
    if (result.ok && name === "render")
      emit(
        {
          ...result,
          value: {
            ...(result.value as Record<string, unknown>),
            sourcePolicy: RENDER_SOURCE_POLICY_MARK,
          },
        },
        0,
      );
    emit(result, result.ok ? 0 : 1);
  }

  usage(
    `unknown command ${JSON.stringify(command ?? "")} — expected verbs, state, next, init, ` +
      `advance, suggest-intent, confirm-angle, phrase, choose-form, author-beats, approve, ` +
      `request-delivery, verb, newsroom, precheck, present or probe`,
  );
}

// Which exit code a non-ok answer from an acting command carries. The run being unreadable is an
// INPUT problem (2) — the same answer `state` gives for it — while a refused step or decision is
// a well-formed request the loop declined (1). Driven by the code rather than by the call site so
// the two families cannot drift apart per command.
function refusalExit(code: HostErrorCode | VerbErrorCode): number {
  return code === "no-run" ||
    code === "invalid-run" ||
    code === "stale-schema" ||
    code === "usage"
    ? 2
    : 1;
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
