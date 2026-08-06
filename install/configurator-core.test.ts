import { describe, expect, it, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RUNTIMES } from "./configurator-core.ts";

test("the four CLI runtimes are verified (codex proven; gemini + goose enabled by decision)", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(true); // proven end-to-end 2026-07-13 (discovery + nested skill invocation)
  expect(RUNTIMES.gemini.verified).toBe(true); // enabled by decision; Layer A proven, Layer B pending a paid tier
  expect(RUNTIMES.goose.verified).toBe(true); // enabled by decision; Layer A proven + drove the flow, Layer B cut by Gemini quota
});

// The two runtimes a journalist can use WITHOUT a terminal — installed once, launched from the
// Dock. Enabled by decision, exactly as gemini and goose were: Layer A (the app discovers the
// skills) is measured on the shipped bundle, Layer B (a visual comes OUT of the app) is not.
test("the two desktop runtimes are selectable", () => {
  expect(RUNTIMES["goose-desktop"]!.verified).toBe(true);
  expect(RUNTIMES["claude-desktop"]!.verified).toBe(true);
});

// A flag is allowed to be raised on a decision rather than a proof — that is this project's
// convention — but never in silence. The motive lives beside the flag, and this reads the source
// as text to keep it there: the same method docs/installer/bootstrap-sh.test.ts uses on the
// install scripts.
//
// The lookback is scoped to the ENTRY's own comment block, not a fixed number of lines — a fixed
// window can reach into a dense neighbour's motive and let a silent entry hide behind it. This
// file's actual shape makes the entry's boundary reliable: every top-level RUNTIMES property sits
// at 2-space indent (`key: {` or `"key-with-dash": { ... }`), and its motive, if any, is the
// contiguous run of `//` comment lines directly above that property line — no blank line and no
// code line ever separates one entry's comment from another's in this file.
//
// I3 fix, two lines: (1) `['"]` instead of `"` alone, so a single-quoted key is recognised too;
// (2) the walk-up's result is ASSERTED to actually match ENTRY_OPEN before use — an earlier
// version had no failure branch, so an unrecognised entry shape (a key/brace split across two
// lines, or a quote style the pattern does not know) walked all the way to line 0 and silently
// treated "the whole file" as this entry's own block, letting a neighbour's "decision" or
// "proven" satisfy a check that should have found nothing. See resolveOwnBlock's own throw below,
// and the mutation-proof describe block that reproduces both shapes against synthetic fixtures.
const ENTRY_OPEN = /^ {2}(?:['"][^'"]+['"]|[A-Za-z_]\w*):\s*\{/;

function resolveOwnBlock(lines: string[], i: number): string {
  // Walk up to this entry's own top-level opening line — it IS this line for a single-line entry
  // (e.g. `goose: { ..., verified: true },`), or an ancestor for a multi-line one.
  let openIdx = i;
  while (openIdx > 0 && !ENTRY_OPEN.test(lines[openIdx]!)) openIdx--;
  if (!ENTRY_OPEN.test(lines[openIdx]!))
    throw new Error(
      `line ${i + 1}: walked up to line 1 without finding this entry's own opening line — an ` +
        `unrecognised entry shape must fail loud, not silently widen the lookback to the whole file`,
    );
  // Walk up from there through this entry's own contiguous comment block only.
  let start = openIdx;
  while (start > 0 && /^\s*\/\//.test(lines[start - 1]!)) start--;
  return lines.slice(start, i + 1).join("\n");
}

test("every raised flag says why, right where it is raised", () => {
  const src = readFileSync(
    join(import.meta.dir, "configurator-core.ts"),
    "utf8",
  );
  const lines = src.split("\n");
  for (const [i, line] of lines.entries()) {
    if (!/verified:\s*true/.test(line)) continue;
    const ownBlock = resolveOwnBlock(lines, i);
    expect(
      /proven|decision/i.test(ownBlock),
      `verified: true at line ${i + 1} carries no stated motive of its own`,
    ).toBe(true);
  }
});

// Mutation proof (I3): two formatting shapes that made the OLD `ENTRY_OPEN` (double-quote only,
// no assertion on the walk-up's result) silently widen its lookback to the whole file, instead of
// failing loud. Reproduced against synthetic fixtures — independent of configurator-core.ts's own
// current shape, so this proof does not go stale if that file's formatting ever changes.
describe("the motive guard's block resolution does not silently widen (I3 mutation proof)", () => {
  const OLD_ENTRY_OPEN = /^ {2}(?:"[^"]+"|[A-Za-z_]\w*):\s*\{/;

  // The pre-fix algorithm, reproduced verbatim (OLD pattern, no throw) — the baseline every case
  // below is diffed against.
  function oldResolveOwnBlock(lines: string[], i: number): string {
    let openIdx = i;
    while (openIdx > 0 && !OLD_ENTRY_OPEN.test(lines[openIdx]!)) openIdx--;
    let start = openIdx;
    while (start > 0 && /^\s*\/\//.test(lines[start - 1]!)) start--;
    return lines.slice(start, i + 1).join("\n");
  }

  it("a single-quoted key: the OLD pattern reached into the neighbour's own motive", () => {
    const lines = [
      "export const RUNTIMES = {",
      "  // decision: this is the NEIGHBOUR's motive — must never leak into 'lonely' below",
      "  neighbour: { label: 'x', verified: true },",
      "  'lonely': { label: 'y', verified: true },",
      "};",
    ];
    const i = 3; // the "'lonely': { ..." line — a single-quoted key, its own opening line

    // Reproduce the bug: the OLD pattern never matches a single-quoted key, so the walk-up skips
    // straight past `lonely`'s own line to the nearest line that DOES match — the neighbour's —
    // and the comment-walk from there picks up the NEIGHBOUR's "decision", which is not
    // `lonely`'s own motive at all.
    const oldBlock = oldResolveOwnBlock(lines, i);
    expect(oldBlock).toContain("decision"); // the bug: silently borrows a neighbour's motive

    // The fix: resolveOwnBlock recognises the single-quoted line as `lonely`'s own opening line,
    // so its own block is just its own (motive-less) line — correctly failing the real guard
    // instead of passing on borrowed prose.
    const fixedBlock = resolveOwnBlock(lines, i);
    expect(fixedBlock).not.toContain("decision");
    expect(/proven|decision/i.test(fixedBlock)).toBe(false);
  });

  it("a key/brace split across two lines: fails LOUD instead of widening the window", () => {
    const lines = [
      "export const RUNTIMES = {",
      "  // decision: belongs to an entry nowhere near this one — must never leak downward",
      "  someLegacyNote: 1,", // no trailing `{` — not an entry-open line either
      '  "split-entry":',
      "  { label: 'y', verified: true },",
      "};",
    ];
    const i = 4; // "{ label: 'y', verified: true }," — the key and its opening brace are split

    // Nothing between the split entry and the top of the object matches ENTRY_OPEN (old or new):
    // the walk-up runs all the way to line 0. The OLD code had no failure branch for that, so it
    // silently treated "the whole file down to here" as this entry's own block — which is exactly
    // how an unrelated "decision" comment several lines above ends up satisfying a check that
    // should have found nothing for `split-entry`.
    const oldBlock = oldResolveOwnBlock(lines, i);
    expect(oldBlock).toContain("decision"); // the bug: whole-file window, wrong motive borrowed

    // The fix: resolveOwnBlock asserts the walk-up actually landed on a real entry-open line, and
    // throws instead — an unrecognised shape must fail the test loudly, not widen the window.
    expect(() => resolveOwnBlock(lines, i)).toThrow();
  });
});

// An Anthropic key is written to .env for whoever picked Goose, and Codex and Gemini have no
// path for their own. The login belongs to the runtime that uses it — including the runtimes
// that need none, which own their account (the two desktop apps) or their own config (Goose).
test("each runtime declares its own login, or none", () => {
  expect(RUNTIMES.claude!.login?.name).toBe("ANTHROPIC_API_KEY");
  expect(RUNTIMES.codex!.login?.name).toBe("OPENAI_API_KEY");
  expect(RUNTIMES.gemini!.login?.name).toBe("GEMINI_API_KEY");
  for (const id of ["goose", "goose-desktop", "claude-desktop"])
    expect(RUNTIMES[id]!.login).toBeUndefined();
  // Every declared login is optional today: all three runtimes also accept a subscription or an
  // interactive sign-in at first launch.
  for (const rt of Object.values(RUNTIMES))
    if (rt.login) expect(rt.login.optional).toBe(true);
});

// The setup page dispatches on the key: bootstrap.sh sources install/runtimes/<key>.sh. A key with
// no module behind it selects an install that dies at the dispatch, and nothing else would catch it.
test("every registered runtime key has a module file of the same name", () => {
  for (const key of Object.keys(RUNTIMES)) {
    expect({
      key,
      module: existsSync(join(import.meta.dir, "runtimes", `${key}.sh`)),
    }).toEqual({ key, module: true });
  }
});
