// A DUPLICATE of splash-twin's own `capabilityGap` (`skills/splash-twin/scripts/preflight.mjs`),
// not an import — a skill directory has to stay copy-pasteable on its own (the same rule
// `genre-catalog.mjs`'s own header applies to twin-deliver's `FORMS_BY_GENRE`, and the rule
// `splash-twin/SKILL.md`'s gotcha documents for `where.mjs` reimplementing `checkStoryboard`'s
// gate: two independent readings of one rule, cross-checked by a test, never unified by an import).
//
// The risk duplication buys: two copies that both claim to implement the same rule can drift apart
// with nothing to notice. `test/capability-gap-parity.test.ts` is this project's own pattern for
// that risk (`skills/splash-twin/test/helper-parity.test.ts` is the original) — it asserts this
// copy and splash-twin's original agree on every capability row and every medium, not merely by
// inspection.
//
// `capabilities` is the same `{map, datawrapper, hostedEmbed}` shape `runPreflight` returns
// (`skills/splash-twin/scripts/preflight.mjs`) — each row `{id, opens, available, reason}`. Returns
// `null` when `medium` is open (or unrecognised — this function is declarative, not a gate on
// mediums it has no opinion about, which is exactly what lets a chart slot's `medium: "chart"` pass
// through untouched: no capability row is tracked for it); otherwise the exact line to surface to
// the journalist, phrased as an unavailable CAPABILITY ("map beats are unavailable: …"), never as
// an environment failure — the distinction the preflight rebuild exists to preserve.
export function capabilityGap(capabilities, medium) {
  const row = capabilities[medium];
  if (!row || row.available) return null;
  return `${row.opens} are unavailable: ${row.reason}`;
}
