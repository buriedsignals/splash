// A REFUSAL THAT NAMES THE STEP WHICH UNBLOCKS IT.
//
// Decision (a) of the 2026-07-28 spec: a refusal DEVIATES, it does not merely stop. The
// journalist is never left in front of a wall — the refusal names what is missing AND routes to
// the act that resolves it. That routing already exists inside the loop
// (manifest.ts's nextActionsForElement); what did not exist is a way to carry it OUT of a gate
// and into a sentence a host can relay.
//
// In lib/core because all three mechanisms emit this type and half their readers live in
// skills/ (the prose chain's own scripts). lib/core imports nothing, so importing it from a
// skill drags in no loop, no zod, no engine registry.
//
// TWO RENDERINGS, on purpose. skills/splash/SKILL.md forbids emitting an internal name to the
// journalist (a script name, a file name, a gate id) and, three lines later, requires a refusal
// to be surfaced to him verbatim. Both hold here because they are rendered from the same record:
// `journalistSentence` carries what is missing and what has to happen, `refusalSentence` adds the
// command — and the command is for the orchestrator, which is the actor that runs it.

export const REFUSAL_CODES = [
  "no-candidates-menu",
  "production-folder-handed-over",
  "render-not-shown",
  "approval-subject-mismatch",
  "probe-not-run",
  "reviewer-not-attributed",
  "late-render-refusal",
  "placement-undeclared",
  "attestation-uncorroborated",
] as const;

export type RefusalCode = (typeof REFUSAL_CODES)[number];

export type Route = {
  /** What has to happen next, in the journalist's own words. Always present: a route with no
   *  step is not a route, it is a shrug. */
  step: string;
  /** The command that performs it, runnable as written. OPTIONAL because some acts are not a
   *  process — invoking the suggester is a skill call, and pretending otherwise would put a
   *  command in front of a reader that nothing can execute. Which routes have none is tracked
   *  in docs/splash/refusal-routes.md. */
  command?: string;
};

export type RoutedRefusal = {
  code: RefusalCode;
  /** WHAT is missing. Journalist-facing: no gate id, no script name, no internal file name. */
  message: string;
  /** `null` is an ADMISSION, written down rather than left for the reader to discover: this
   *  refusal is a hard stop with no known way out (spec §6). */
  route: Route | null;
};

// THE CATALOGUE. Spec §6: "Dévier demande un catalogue. Chaque refus doit savoir vers quel pas
// router. Un refus sans déviation écrite retombe sur un arrêt — acceptable, mais il faut le dire
// au journaliste plutôt que de le laisser deviner, et suivre lesquels restent sans sortie."
// This table IS that tracking, and routed-refusal.test.ts is what keeps it exhaustive.
export const REFUSAL_ROUTES: Record<RefusalCode, Route | null> = {
  // No command: the act is a skill invocation inside the session, not a process. Recorded as a
  // step-without-command rather than dressed up as one.
  "no-candidates-menu": {
    step: "ask the suggester for the ranked list of visuals and keep the list it returns, then choose from it",
  },
  "production-folder-handed-over": {
    step: "hand over the export, not the folder the build left behind",
    // export-code.mjs's own header (see its usage comment) takes <outDir> <exportDir> as
    // positionals and --results/--id as flags — not <report.json> <id> as positionals.
    command:
      "bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId> [--form <form>]",
  },
  "render-not-shown": {
    step: "show the visual first, then ask what the journalist thinks of it",
    command: "bun lib/host/cli.ts present --path <artifact>",
  },
  "approval-subject-mismatch": {
    step: "show the visual as it is now — it has changed since it was last shown — and ask again",
    command: "bun lib/host/cli.ts present --path <artifact>",
  },
  "probe-not-run": {
    step: "give each mechanical check the command that runs it, and let the result decide",
    // cli.ts's probe command reads its ledger from STDIN (readJsonRequest), not a --spec flag —
    // there is no --spec anywhere in its arg parsing. "probe < probes.json" is the exact usage
    // hint cli.ts gives itself (readJsonRequest's second argument at its probe call site).
    command: "bun lib/host/cli.ts probe < probes.json",
  },
  "reviewer-not-attributed": {
    step: "have the editorial pass done by someone who did not write this visual, and record who did it",
    // No --reviewer-output: review-gate.mjs only ever parses --reviewer <name>@<version> (the
    // reviewer's own findings travel inside --probes as editorial probes, not a separate flag).
    // A command naming a flag that does not exist is a command that fails if run verbatim.
    command:
      "bun skills/splash/scripts/review-gate.mjs <report.json> <id> --probes <probes.json> --reviewer <name@version>",
  },
  // No command: unlike the routes above, this one is never looked up through routed() — a late
  // refusal's real route is the guard-specific step supplied at its call site (see
  // skills/splash/src/late-refusal.ts), measured only at render. This entry exists solely to
  // keep REFUSAL_ROUTES exhaustive over REFUSAL_CODES.
  "late-render-refusal": {
    step: "read the guard's own message for the fix — it is measured per-guard at render, not a single fixed command",
  },
  "placement-undeclared": {
    step:
      "add an anchor (`anchor: { paragraphIndex, quote }`, copied from suggest-article's " +
      "opportunity) or `freeStanding: true` to this entry in accepted.json, then re-run the " +
      "export — never invent a paragraph: if the article bound this element to no passage, " +
      "say so with freeStanding",
    // Same shape as production-folder-handed-over's command, re-verified against
    // export-code.mjs's own usage comment: <outDir> <exportDir> positionals,
    // --results/--id flags. The fix here is an entry-level field on accepted.json (no
    // re-produce, the chain hash is over `spec` alone), so re-running THIS exact command is
    // all it takes.
    command:
      "bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId> [--form <form>]",
  },
  // No command, for the same reason as no-candidates-menu: the act is a SKILL invocation inside
  // the session — and, on a host with no skill-invocation facility, reading that skill's own
  // SKILL.md and following it. Neither is a process this catalogue could name. The artifacts the
  // step leaves behind (and the writers that leave them) are named in the refusal's own message,
  // built from skills/splash/src/attestation-corroboration.ts's evidence table.
  "attestation-uncorroborated": {
    step: "actually invoke the skills this run says it invoked — or drop the claim, and say plainly that the step did not run",
  },
};

/** Build a refusal with the route the catalogue holds for it. The one constructor, so a refusal
 *  can never be minted with a route somebody wrote at the call site. */
export function routed(code: RefusalCode, message: string): RoutedRefusal {
  return { code, message, route: REFUSAL_ROUTES[code] };
}

const NO_WAY_OUT =
  "nothing here unblocks it: stop and say so, rather than working around it";

/** For the ORCHESTRATOR and the ledger — carries the command. */
export function refusalSentence(r: RoutedRefusal): string {
  if (!r.route) return `${r.message} — ${NO_WAY_OUT}`;
  return r.route.command
    ? `${r.message} — ${r.route.step}: ${r.route.command}`
    : `${r.message} — ${r.route.step}`;
}

/** For the JOURNALIST — carries the act, never the command that performs it. */
export function journalistSentence(r: RoutedRefusal): string {
  if (!r.route) return `${r.message} — ${NO_WAY_OUT}`;
  return `${r.message} — ${r.route.step}`;
}
