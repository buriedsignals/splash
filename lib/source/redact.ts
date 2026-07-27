// Privacy handling: what may leave the newsroom, and the guard that says it did not.
//
// The distinction issue #7 needs and never spells out: the RUN MANIFEST IS PRIVATE. It already
// records local paths and content hashes, it lives in the newsroom's run directory, and it is
// where an internal reference legitimately belongs. What must be clean is everything that goes
// OUT — the rendered visual's furniture, the delivery metadata, the export folder, an embed
// snippet. #7's "public manifests" means those, not run.json.
//
// So there are two mechanisms, and they are not redundant:
//   publicSourceView   — the outward projection, built from an allow-list. A private reference
//                        cannot reach a caller through it, because no line of it carries one.
//   assertNoPrivateLeak — the guard for payloads composed somewhere ELSE (a snippet, a README,
//                        a metadata bag assembled by a delivery adapter that never saw this
//                        module). Belt over braces: construction first, verification second.
import type { PublishedSource } from "./furniture";
import { SOURCE_SLOTS, type SourceLedger, type SourceSlot } from "./kinds";
import { validateSourcePolicy } from "./policy";
import { sourceOk, sourceFail, type SourceResult } from "./result";

export type PublicSourceView = Partial<Record<SourceSlot, PublishedSource>>;

/**
 * The outward view of a run's sources: a published credit per declared slot, nothing else.
 * Refuses (rather than redacting silently) when a declaration is not policy-valid — publishing
 * a half-valid source is the failure mode this whole module exists to remove.
 */
export function publicSourceView(
  ledger: SourceLedger,
  lang?: string,
): SourceResult<PublicSourceView> {
  const view: PublicSourceView = {};
  for (const slot of SOURCE_SLOTS) {
    const decl = ledger[slot];
    if (!decl) continue;
    const verdict = validateSourcePolicy(decl, {
      mode: ledger.mode,
      lang,
      carriesFactualData: decl.kind !== "none",
    });
    if (!verdict.ok)
      return sourceFail(verdict.code, `${slot} source: ${verdict.message}`);
    view[slot] = verdict.value.published;
  }
  return sourceOk(view);
}

/** The minimum length of a path segment worth searching for on its own. Below it, a segment is
 *  a common word ("data", "q1") and matching it would flag payloads that leak nothing. */
const MIN_SEGMENT = 5;

function leakTokens(ledger: SourceLedger, alsoRedact: string[]): string[] {
  const tokens: string[] = [];
  for (const slot of SOURCE_SLOTS) {
    const ref = ledger[slot]?.internalRef?.trim();
    if (!ref) continue;
    tokens.push(ref);
    // An export that copies only the file name leaks exactly as much as one that copies the
    // whole path, so the last segment is searched for too when it is distinctive enough.
    const last = ref.split(/[/\\]/).pop() ?? "";
    if (last.length >= MIN_SEGMENT && last !== ref) tokens.push(last);
  }
  for (const extra of alsoRedact) {
    const t = extra.trim();
    if (t) tokens.push(t);
  }
  return tokens;
}

/**
 * Throws when anything private survives in a payload on its way out. `payload` may be a string
 * or any JSON-serializable object (it is stringified). Matching is case-insensitive, because a
 * path that changed case on the way through a template is the same path.
 *
 * Deliberately narrow: it redacts what was DECLARED private, plus `file://` (always a local
 * address, never a citation), plus whatever the caller names in `alsoRedact`. It does NOT hunt
 * for anything that merely LOOKS private (every absolute path, every non-public host) — that
 * needs a newsroom allow-list to avoid flagging legitimate output, and it is recorded as
 * deferred in the design spec rather than guessed at here.
 */
export function assertNoPrivateLeak(
  payload: unknown,
  ledger: SourceLedger,
  opts: { alsoRedact?: string[] } = {},
): void {
  const text = (
    typeof payload === "string" ? payload : (JSON.stringify(payload) ?? "")
  ).toLowerCase();
  if (text === "") return;

  for (const token of leakTokens(ledger, opts.alsoRedact ?? []))
    if (text.includes(token.toLowerCase()))
      throw new Error(
        `private leak: "${token}" reached something that leaves the newsroom — a private source publishes its display label only`,
      );

  if (text.includes("file://"))
    throw new Error(
      `private leak: a file:// address reached something that leaves the newsroom — a local path is never a citation`,
    );
}
