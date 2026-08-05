#!/usr/bin/env bun
// THE MIGRATION PROOF FOR THE PHASE SPLIT — built BEFORE the move, deliberately.
//
//   bun scripts/verify-phase-split.mjs <SKILL.md before the move> <root SKILL.md> <phase skill…>
//
// The spec (docs/superpowers/specs/2026-07-30-skill-phase-split-design.md §4) states the rule the
// whole lot rests on: **pure move, zero rewriting — every line of the old SKILL.md lands in
// exactly one file, unchanged.** That is a mechanical claim, so it gets a mechanical check rather
// than a careful reading; a 1500-line move reviewed by eye is a move nobody can vouch for.
//
// WHY IT EXISTS BEFORE THE MOVE, and not after: an instrument written afterwards is written by
// someone who already believes the move is right, and it tends to assert what the move happens to
// have done. Written first, it states the contract the move must satisfy.
//
// WHAT IT PROVES
//   · every non-trivial line of the source appears somewhere in the destinations (nothing LOST);
//   · no such line appears in two destinations (nothing DUPLICATED — the failure mode that makes
//     two files disagree later, which is the very defect this project keeps finding);
//   · the destinations introduce no non-trivial line the source did not have (nothing INVENTED —
//     "improved while I was in there" is exactly what §4 forbids).
//
// WHAT IT DOES NOT PROVE, said plainly: that the split is a GOOD one. Landing every line in one
// file says nothing about whether the line landed in the phase where it applies. That judgement
// stays human, and this check exists so the human spends their attention on it instead of on
// diffing 1500 lines.
//
// NORMALISATION: leading/trailing whitespace only. Blank lines, and lines that are pure markdown
// scaffolding (```), are ignored — they legitimately repeat everywhere and carry no rule.
import { readFileSync } from "node:fs";

/** A line that carries a rule. Blank and fence-only lines repeat by nature. */
function meaningful(line) {
  const t = line.trim();
  if (t === "") return false;
  if (/^`{3,}/.test(t)) return false;
  if (/^[-=|_*\s]+$/.test(t)) return false; // rules, table separators, dividers
  return true;
}

// HTML comments are stripped everywhere, source and destinations alike: they carry no rule, and
// the additions manifest needs a header explaining itself without that header counting as prose
// the split added. Same reason blank lines and fences are ignored.
function linesOf(path) {
  return readFileSync(path, "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(meaningful);
}

/** Multiset: a line repeated in the source may legitimately appear that many times overall. */
function counts(lines) {
  const m = new Map();
  for (const l of lines) m.set(l, (m.get(l) ?? 0) + 1);
  return m;
}

// `--additions <file>` names the prose the split legitimately ADDS — the spec's six invocation
// blocks (§3) are new lines by construction, and a check that refused them would refuse the
// design. Enumerating them in one reviewable file is the point: everything NOT listed there must
// still be a pure move, so the additions stay small, visible, and argued for.
const argv = process.argv.slice(2);
let additionsPath = null;
const ix = argv.indexOf("--additions");
if (ix !== -1) {
  additionsPath = argv[ix + 1];
  argv.splice(ix, 2);
}
const [source, ...destinations] = argv;
if (!source || destinations.length === 0) {
  console.error(
    "usage: verify-phase-split.mjs [--additions <file>] <source SKILL.md> <destination…>\n" +
      "  Proves the split moved every rule exactly once.",
  );
  process.exit(2);
}

const src = counts(linesOf(source));
const dst = counts(destinations.flatMap(linesOf));

const lost = [];
const duplicated = [];
for (const [line, n] of src) {
  const got = dst.get(line) ?? 0;
  if (got === 0) lost.push(line);
  else if (got > n) duplicated.push({ line, was: n, now: got });
}
const allowed = additionsPath ? counts(linesOf(additionsPath)) : new Map();
const invented = [];
for (const [line, n] of dst)
  if (!src.has(line) && !allowed.has(line)) invented.push({ line, n });
// An addition DECLARED but never used is dead prose in the manifest — reported, because a list
// nobody prunes stops describing anything.
const unusedAdditions = [...allowed.keys()].filter((l) => !dst.has(l));

const show = (label, rows, fmt) => {
  if (rows.length === 0) return;
  console.error(`\n${label} (${rows.length})`);
  for (const r of rows.slice(0, 25)) console.error("  " + fmt(r));
  if (rows.length > 25) console.error(`  … and ${rows.length - 25} more`);
};

show("LOST — in the source, in no destination", lost, (l) => l.slice(0, 110));
show(
  "DUPLICATED — in more destinations than the source had it",
  duplicated,
  (r) => `${r.was}→${r.now}  ${r.line.slice(0, 100)}`,
);
show(
  "INVENTED — in a destination, never in the source",
  invented,
  (r) => `${r.line.slice(0, 110)}`,
);

show(
  "DECLARED AS ADDED but present nowhere",
  unusedAdditions.map((l) => ({ line: l })),
  (r) => r.line.slice(0, 110),
);

const failures =
  lost.length + duplicated.length + invented.length + unusedAdditions.length;
if (failures === 0) {
  console.log(
    `✓ pure move: ${src.size} distinct rule-bearing lines, each landing exactly as often as before` +
      (allowed.size ? `, plus ${allowed.size} declared addition(s).` : "."),
  );
  console.log(
    "  This does NOT prove each line landed in the phase where it applies — that judgement is yours.",
  );
  process.exit(0);
}
console.error(
  `\n✗ not a pure move: ${lost.length} lost, ${duplicated.length} duplicated, ${invented.length} invented.`,
);
process.exit(1);
