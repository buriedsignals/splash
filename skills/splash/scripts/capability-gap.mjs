// twin/skills/storyboard/scripts/capability-gap.mjs
// ONE definition, carried verbatim into `splash/scripts/capability-gap.mjs` (line 1 names this
// canonical; `splash/test/carried-copies.test.ts` holds the copies byte for byte). A skill directory
// stays copy-pasteable on its own, so the copy is physical — but it is a copy, not a second reading.
//
// `capabilities` is the same `{map, datawrapper, hostedEmbed}` shape `runPreflight` returns
// (`skills/splash/scripts/preflight.mjs`) — each row `{id, opens, available, reason}`. Returns
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
