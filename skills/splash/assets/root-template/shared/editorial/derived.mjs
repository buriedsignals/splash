// twin/shared/editorial/derived.mjs
//
// THE VALUE BLOCK — WHAT A GUARD READS OUT OF A BEAT'S `BRIEF.md`, AND WHY IT HOLDS NO SENTENCE.
//
// A beat's `## Precision` and `## The choreography` are the journalist's: their paragraphs, their
// table, their language, reworded at will. Beside that prose each section carries EXACTLY ONE
// fenced JSON block whose info string names it:
//
//   ```json splash:choreography
//   { "kind": "scroll", "cards": [{ "card": 1, "gesture": [], "changes": ["rows"] }] }
//   ```
//
// The block is the PARSE of what the section declares, never a substitute for it.
//
// WHY A FENCE AND NOT NESTED FRONT MATTER. `parseBriefFrontMatter` (`shared/chart-beat/sizes.mjs`)
// is a deliberately flat, scalar-only, hand-rolled YAML subset, carried verbatim into eight skills.
// A declaration is nested and per-shot or per-card; widening that parser to nested YAML would be
// the highest-blast-radius edit available in this tree, to hand-write an implementation of a format
// JSON already holds. A fence needs no grammar: `JSON.parse` to read, `JSON.stringify(v, null, 2)`
// to write — so key order, indentation and line wrapping cannot fail a beat.
//
// WHY NO PROSE, MECHANICALLY. "The guard never compares sentences" has to be a property of the
// format, not a convention. Every string here is an identifier from a type's gesture vocabulary
// (`pull back`, `ask-a-mark`, `establish`) or a datum id (`china-2024`), and `assertNoProse` runs
// BEFORE serialising, so a sentence cannot be written into a block in the first place. The web
// promise is the case that proves the rule: it IS a sentence, it lives in the slot's
// `interaction.promise` and in the delivered artifact, and the block records only
// `promiseSource: "slot"`.

/** The two sections that carry a block. A third name is a typo, and is refused as one. */
export const DERIVED_BLOCKS = ["precision", "choreography"];

/** `fenceOf("precision")` matches every ```json splash:precision block in a section. */
function fenceOf(name) {
  return new RegExp("```json splash:" + name + "\\r?\\n([\\s\\S]*?)\\r?\\n```", "g");
}

function assertKnown(name) {
  if (!DERIVED_BLOCKS.includes(name))
    throw new Error(
      `${JSON.stringify(name)} is not a derived block — the two are ${DERIVED_BLOCKS.join(" and ")}.`,
    );
}

/**
 * A string is prose when it runs past four whitespace-separated words or ends a sentence.
 *
 * Both halves are needed and both are measured on the corpus: the longest real gesture atom is
 * three words (`find-your-own-case` is one, `pull back` two, `open the full table` four as prose
 * but hyphenated as an atom), and the shortest real sentence a BRIEF writes into a table cell —
 * "The ten grow." — is three words. The full stop is what separates them.
 */
function isProse(s) {
  const trimmed = s.trim();
  return trimmed.split(/\s+/).length > 4 || /[.!?]$/.test(trimmed);
}

/**
 * Throws naming the PATH of the offending string, because a block of forty cells that reports only
 * "a value is prose" sends its author reading rather than editing.
 */
export function assertNoProse(value, path = "") {
  if (typeof value === "string" && isProse(value))
    throw new Error(
      `A derived block holds values, never prose: ${path || "<root>"} is a sentence ` +
        `(${JSON.stringify(value)}). Identifiers and datum ids belong here; the sentence belongs ` +
        `in the section's own paragraphs.`,
    );
  if (Array.isArray(value)) value.forEach((v, i) => assertNoProse(v, `${path}[${i}]`));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) assertNoProse(v, path ? `${path}.${k}` : k);
}

/** The fenced block for `name`, refusing to write one that holds a sentence. */
export function renderDerivedBlock(name, value) {
  assertKnown(name);
  assertNoProse(value);
  return "```json splash:" + name + "\n" + JSON.stringify(value, null, 2) + "\n```";
}

/**
 * The parsed value of the one `splash:<name>` block in `text`.
 *
 * Two blocks of one name is refused rather than resolved: a section that declares its choreography
 * twice has two answers, and picking either is the guard choosing on the journalist's behalf.
 */
export function readDerivedBlock(text, name) {
  assertKnown(name);
  const found = [...String(text).matchAll(fenceOf(name))];
  if (found.length > 1)
    throw new Error(
      `two splash:${name} blocks in one section — a section declares its ${name} once, and ` +
        `nothing here may choose between two answers.`,
    );
  if (found.length === 0)
    throw new Error(
      `no splash:${name} block — the section's values are what the guard reads, and this section ` +
        "carries none. Add a ```json splash:" + name + " fence holding the parse of what it declares.",
    );
  let parsed;
  try {
    parsed = JSON.parse(found[0][1]);
  } catch (error) {
    throw new Error(`the splash:${name} block is not JSON: ${error.message}`);
  }
  assertNoProse(parsed);
  return parsed;
}
