// A DUPLICATE of splash's own `capabilityGap` (`skills/splash/scripts/preflight.mjs`),
// not an import — a skill directory has to stay copy-pasteable on its own (the same rule
// `format-catalog.mjs`'s own header applies to deliver's `FORMS_BY_FORMAT`, and the rule
// `splash/SKILL.md`'s gotcha documents for `where.mjs` reimplementing `checkStoryboard`'s
// gate: two independent readings of one rule, cross-checked by a test, never unified by an import).
//
// The risk duplication buys: two copies that both claim to implement the same rule can drift apart
// with nothing to notice. `test/capability-gap-parity.test.ts` is this project's own pattern for
// that risk (`skills/splash/test/helper-parity.test.ts` is the original) — it asserts this
// copy and splash's original agree on every capability row and every medium, not merely by
// inspection.
//
// `capabilities` is the same `{map, datawrapper, hostedEmbed}` shape `runPreflight` returns
// (`skills/splash/scripts/preflight.mjs`) — each row `{id, opens, available, reason}`. Returns
// `null` when `medium` is open (or unrecognised — this function is declarative, not a gate on
// mediums it has no opinion about, which is exactly what lets a chart slot's `medium: "chart"` pass
// through untouched: no capability row is tracked for it); otherwise the exact line to surface to
// the journalist, phrased as an unavailable CAPABILITY ("map beats are unavailable: …"), never as
// an environment failure — the distinction the preflight rebuild exists to preserve.
/**
 * THE CAPABILITY SEAM, CARRIED BY THREE SKILLS AND REGISTERED AS ONE DECISION.
 *
 * `capabilities` is the `{map, datawrapper, hostedEmbed}` shape `runPreflight` returns, each row
 * `{id, opens, available, reason}`. Returns `null` when `medium` is open — or unrecognised, because
 * this is declarative and not a gate on mediums it has no opinion about; otherwise the exact line to
 * surface to the journalist, phrased as an unavailable CAPABILITY ("map beats are unavailable: …")
 * and never as an environment failure.
 *
 * `?.` rather than a bare index, and the three copies now agree on it. They did not:
 * `deliver`'s read `capabilities?.[medium]` while `splash`'s and `storyboard`'s read
 * `capabilities[medium]`, so `capabilityGap(undefined, "map")` answered `null` in one skill and
 * THREW in the other two. `storyboard/SKILL.md` had said in so many words that its copy was a
 * carried copy of `splash`'s, and the registry that holds carried copies together did not know.
 *
 * ITS STATED LIMIT, since this is the sentence a later phase acts on: an ABSENT row reads as no gap.
 * That is right when a preflight ran and found the medium fine, and it is an assumption when no
 * preflight ran at all — the two are indistinguishable here, and telling them apart would need the
 * caller to say whether it measured, which no caller does today.
 */
export function capabilityGap(capabilities, medium) {
  const row = capabilities?.[medium];
  if (!row || row.available) return null;
  return `${row.opens} are unavailable: ${row.reason}`;
}
