// THE placeholder list. One, shared, and the strictest of the two it replaces.
//
// There were two, both terminal, each letting through what the other rejected:
//   V1 skills/splash/src/source-guard.ts — RFC-2606 TLDs (example/test/invalid/localhost) plus
//      the three example.com/.org/.net registrable domains. Positional: the TLD only.
//   V2 lib/core/contract.ts — a label-bounded alternation (localhost|example|invalid|
//      placeholder|todo), any label of the host.
// So `https://data.test/x` passed V2 and failed V1; `https://todo.com/x` did the opposite.
//
// The union, label-bounded (V2's shape, extended with V1's `test`). An unfair block on a rare
// legitimate URL is visible friction a journalist can report and we can reverse; a placeholder
// that reaches the reader is a published lie. That asymmetry is the whole arbitration.
//
// NOT substring matching: source-guard.ts documents myexample.com, example-data.fr and
// testing.gov.uk as deliberate NON-hits, and they stay non-hits here.

export const PLACEHOLDER_LABELS: readonly string[] = [
  "localhost",
  "example",
  "invalid",
  "placeholder",
  "todo",
  "test",
];

export const PLACEHOLDER_LABEL_RE = new RegExp(
  `(^|\\.)(${PLACEHOLDER_LABELS.join("|")})(\\.|$)`,
  "i",
);

export function isPlaceholderHost(host: string): boolean {
  return PLACEHOLDER_LABEL_RE.test(host);
}

/** One sentence, or null. Journalist-facing: it names the label that fired and why the address
 *  is not citable, never an internal rule id. */
export function placeholderHostReason(host: string): string | null {
  const m = PLACEHOLDER_LABEL_RE.exec(host);
  if (!m) return null;
  return (
    `source URL host "${host}" uses the reserved placeholder label "${m[2]}" ` +
    `(RFC 2606/6761) — not a real, citable dataset URL`
  );
}
