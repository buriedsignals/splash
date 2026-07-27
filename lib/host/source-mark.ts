// What the façade says about an artifact rendered OUTSIDE a run.
//
// `lib/core/verbs/render.ts` does not validate `spec.source`, so a host calling `verb render`
// directly supplies whatever credit it likes. That hole is MARKED, not closed, and the reasoning
// is recorded at the exact spot in render.ts where the guard would go: an artifact rendered
// outside a run carries no provenance hash, so `deliver()` cannot publish it and `verb publish`
// is already refused at this façade — the mis-credited file stays local and cannot leave through
// Splash. Closing it would cost nine load-bearing tests (the destructive-outDir guard at the
// process boundary, the never-throw boundary, and a real engine being reachable from a process
// that imports only the CLI) for a risk that never reaches publication.
//
// So the answer SAYS SO. What the mark buys is narrow and worth stating exactly: the artifact can
// no longer PASS FOR one the source policy checked.
//
// ONE constant, two readers — `capabilities()` declares it and `cli.ts` emits it — because a host
// reads this surface's rules from the declaration instead of our source (the same discipline
// `hostCommand` and `errorCodes` follow), and two hand-written copies would eventually describe
// two different worlds.
export type SourcePolicyMark = {
  /** Always false. A `checked: true` would need a run to have been checked against. */
  checked: false;
  why: string;
};

export const RENDER_SOURCE_POLICY_MARK: SourcePolicyMark = {
  checked: false,
  why:
    "this artifact was rendered outside a run: spec.source is whatever this request supplied, " +
    "and no source policy (lib/source) validated it. A run's produce takes the credit from its " +
    "DECLARED source ledger and refuses a run that declared none. This artifact also carries no " +
    "provenance, so Splash cannot publish it — verb publish is refused at this façade, and " +
    "deliver only publishes an artifact a run produced. To render under the source policy, " +
    "create a run (init --run <dir>) and drive it with advance.",
};
