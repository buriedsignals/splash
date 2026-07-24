// Path-safety for LLM-supplied identifiers (audit gap #1, same class as image-native's
// C5 frame-id guard in skills/image-native/src/image-story.ts).
//
// AcceptedProposal.id is composed by the orchestrator LLM and reaches the filesystem as
// a directory/filename component: produce-all keys each proposal's outDir on it
// (`${outDir}/${p.id}`) and the map-dw dispatch names its PNG `${p.id}.png`. That outDir
// is then `resolve`d and `rmSync(recursive, force)`d by freshOutDir. An id of `../../x`
// resolves OUTSIDE outDir and recursively deletes an arbitrary directory — in a
// local-first tool running in the journalist's own repo, a real data-loss primitive.
//
// The general principle: NO LLM-supplied identifier reaches a path resolution/delete
// without passing this slug guard. An id must be a plain slug — letters, digits, `-`, `_`
// only — which cannot contain a path separator, a `..`, an absolute-path root, or a
// leading dot, so it can only ever name a child inside outDir.

// Longest an id may be. Ids become filenames; keep well under the typical 255-byte
// filename limit while leaving room for suffixes like `.png` / `-source`.
const MAX_ID_LENGTH = 128;

// A safe slug: one or more of letters, digits, hyphen, underscore — nothing else. This
// alone forbids `/`, `\`, `.` (so `..`, `./`, `x/../y` all fail), `:` (Windows drives),
// whitespace, and the empty string. Mirrors image-story.ts's frame-id pattern.
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export function isSafeId(id: unknown): id is string {
  return (
    typeof id === "string" && id.length <= MAX_ID_LENGTH && SAFE_ID.test(id)
  );
}

// The single refusal message, exported because the contract needs it in TWO shapes: the
// legacy spine THROWS it (assertSafeId), the verb RETURNS it in a VerbResult (invariant
// I1 — a non-JS host has no catch). Same words either way.
export function unsafeIdMessage(id: unknown): string {
  const shown =
    typeof id === "string" ? id : id === undefined ? "(missing)" : String(id);
  return (
    `element id "${shown}" is not a safe slug (letters, digits, - and _ only, ` +
    `1-${MAX_ID_LENGTH} chars) — ids become directory and file names, so an id with ` +
    `a path separator, "..", or an absolute path could read or delete files outside ` +
    `the output folder`
  );
}

export function assertSafeId(id: unknown): void {
  if (!isSafeId(id)) throw new Error(unsafeIdMessage(id));
}
