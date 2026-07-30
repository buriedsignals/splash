import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REFUSAL_CODES,
  REFUSAL_ROUTES,
  journalistSentence,
  refusalSentence,
  routed,
  type RoutedRefusal,
} from "./routed-refusal";

test("every declared code has an entry in the catalogue, and the catalogue holds nothing else", () => {
  expect(Object.keys(REFUSAL_ROUTES).sort()).toEqual([...REFUSAL_CODES].sort());
});

test("a routed refusal names what is missing AND the act that resolves it", () => {
  const r = routed("render-not-shown", "nobody has been shown this visual yet");
  expect(r.code).toBe("render-not-shown");
  expect(r.route).not.toBeNull();
  const sentence = refusalSentence(r);
  expect(sentence).toContain("nobody has been shown this visual yet");
  expect(sentence).toContain("bun lib/host/cli.ts present");
});

test("the journalist's rendering carries the act but never the command", () => {
  const r = routed("render-not-shown", "nobody has been shown this visual yet");
  const said = journalistSentence(r);
  expect(said).toContain("nobody has been shown this visual yet");
  expect(said).toContain(REFUSAL_ROUTES["render-not-shown"]!.step);
  expect(said).not.toContain("bun ");
  expect(said).not.toContain("cli.ts");
});

test("a refusal with no way out SAYS it has none, instead of trailing off", () => {
  const dead: RoutedRefusal = {
    code: "no-candidates-menu",
    message: "x",
    route: null,
  };
  expect(refusalSentence(dead)).toContain("nothing here unblocks it");
  expect(journalistSentence(dead)).toContain("nothing here unblocks it");
});

test("a route with a step and no command renders the step alone, never a dangling colon", () => {
  const r = routed("no-candidates-menu", "no ranked menu was written down");
  expect(REFUSAL_ROUTES["no-candidates-menu"]!.command).toBeUndefined();
  expect(refusalSentence(r)).not.toContain(": undefined");
  expect(
    refusalSentence(r).endsWith(REFUSAL_ROUTES["no-candidates-menu"]!.step),
  ).toBe(true);
});

test("late-render-refusal has a step and no command — its real route is guard-specific, supplied at the call site, not this catalogue entry", () => {
  expect(REFUSAL_ROUTES["late-render-refusal"]).not.toBeNull();
  expect(REFUSAL_ROUTES["late-render-refusal"]!.step.length).toBeGreaterThan(0);
  expect(REFUSAL_ROUTES["late-render-refusal"]!.command).toBeUndefined();
});

test("no route's command chains a second command — a route is one call, not interpolated", () => {
  // `&&`/`|` are the actual risk this test guards: a chained/piped command smuggles a SECOND,
  // unaudited operation past whoever reads route.command as "the thing that resolves this
  // refusal." A shell REDIRECT (a bare `<` with whitespace either side, as opposed to a
  // `<placeholder>` argument like `<outDir>`) is different in kind — `probe-not-run`'s command
  // reads its ledger from stdin on purpose (cli.ts's probe command has no --spec flag), and
  // `< probes.json` is a single static redirect into a fixed, literal filename baked into this
  // table, not a shell operator an untrusted value could ride in on. It stays allowed; `&&`/`|`
  // (and a real `<` outside this one route) do not.
  for (const route of Object.values(REFUSAL_ROUTES)) {
    if (!route?.command) continue;
    expect(route.command.startsWith("bun ")).toBe(true);
    expect(route.command).not.toContain("&&");
    expect(route.command).not.toContain("|");
    if (/\s<\s/.test(route.command))
      expect(route.command).toBe("bun lib/host/cli.ts probe < probes.json");
  }
});

// reviewer-not-attributed's command used to name a --reviewer-output flag review-gate.mjs never
// implemented (only --reviewer <name>@<version> exists) — a command that does not work if a
// reader ran it verbatim. Locked so the registry never re-enshrines a phantom flag.
test("reviewer-not-attributed's command matches what review-gate.mjs actually implements", () => {
  const command = REFUSAL_ROUTES["reviewer-not-attributed"]!.command!;
  expect(command).toContain("--reviewer <name@version>");
  expect(command).not.toContain("--reviewer-output");
});

// production-folder-handed-over's command used to read <report.json> <id> as positionals with
// no --form-only trailing shape — export-code.mjs's own header takes <outDir> <exportDir> as
// positionals and --results/--id as flags. Locked against the wrong two-positional shape.
test("production-folder-handed-over's command matches what export-code.mjs actually implements", () => {
  const command = REFUSAL_ROUTES["production-folder-handed-over"]!.command!;
  expect(command).toContain("--results <report.json>");
  expect(command).toContain("--id <proposalId>");
  expect(command).not.toContain("export-code.mjs <report.json> <id>");
});

// probe-not-run's command used to name a --spec flag cli.ts's probe command never implements —
// it reads its ledger from stdin (readJsonRequest), taking only an optional --cwd flag. Locked
// against the phantom flag and for the real stdin-redirect form.
test("probe-not-run's command matches what lib/host/cli.ts actually implements", () => {
  const command = REFUSAL_ROUTES["probe-not-run"]!.command!;
  expect(command).toContain("probe < probes.json");
  expect(command).not.toContain("--spec");
});

test("the register lists every refusal the code can emit — a route nobody wrote down is a route nobody maintains", () => {
  const register = readFileSync(
    join(import.meta.dir, "../../docs/splash/refusal-routes.md"),
    "utf8",
  );
  for (const code of REFUSAL_CODES) expect(register).toContain(code);
});

test("the register names, out loud, the routes that have no command", () => {
  const register = readFileSync(
    join(import.meta.dir, "../../docs/splash/refusal-routes.md"),
    "utf8",
  );
  for (const [code, route] of Object.entries(REFUSAL_ROUTES)) {
    if (route?.command) continue;
    expect(register).toMatch(new RegExp(`${code}[^\\n]*\\|[^\\n]*no command`));
  }
});
