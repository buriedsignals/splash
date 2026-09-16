// twin/shared/editorial/frame.mjs
//
// WHAT THE CHAIN SUPPLIES TO A CHOREOGRAPHY, AND — READ THIS BEFORE EDITING — WHAT IT NEVER WILL.
//
// Ruling R-D (`docs/splash/2026-09-17-editorial-chain-spec.md`): the choreography is AUTHORED, per
// subject. A `deriveChoreography(type, retained)` that computed one would manufacture clones, and
// the 160 catalogue proofs exist precisely because each is its own piece. So this module supplies
// four things and stops:
//
//   the export's required SHAPE      — a frame, a pointer, a clock or a scroll
//   the type's gesture VOCABULARY    — open, see below
//   the type's PROHIBITIONS          — what a choreography of this type must not do
//   what the retained proposal CONSTRAINS — the interaction kind, the size, a card floor
//
// It returns no cards, no shots, no stations and no rows. `the-frame-is-what-the-chain-supplies`
// walks the returned object for a key that would hold one, so this is a guarded property rather
// than a promise in a comment.
//
// THE VOCABULARY IS OPEN, DELIBERATELY. The scrolly census across 240 real cells has a long tail of
// one-offs per type (`morph`, `unfold`, `re-anchor`, `ghost`, `condense`), which is R-D visible in
// the data: the beats extended the vocabulary subject by subject. Refusing the next type's atom
// would be the same defect as refusing the next type. An atom outside the sheet's list is reported
// as an addition the sheet should record — never as a failure of the beat.

/**
 * @typedef {{ id: string|null, says: string }} Prohibition
 *   `id` is the checkable handle a checker refers to; `says` is the sheet's own line, verbatim, so
 *   a violation can be reported in the words the type sheet already uses.
 */

/** Which declared shape each export owes. Four exports, four dimensions, and none is "none". */
const SHAPE_OF_FORMAT = Object.freeze({
  static: "frame",
  web: "pointer",
  video: "time",
  scrolly: "scroll",
});

/** Where an assertion may land, per export — the `because: "format"` half of §1.4. */
const PLACEMENT_OF_FORMAT = Object.freeze({
  static: "asserted-in-the-one-frame",
  web: "asserted-in-the-js-off-floor",
  video: "asserted-per-shot",
  scrolly: "asserted-per-card",
});

/**
 * THE SHAPES GATE 2 ACTUALLY RECORDS, MAPPED ONTO THE FOUR THE SPEC NAMES.
 *
 * `RECORDED_CLAIM_SHAPES` (`storyboard/scripts/gate-contract.mjs`) is
 * `maximum | minimum | comparison | total | none` — the vocabulary a journalist is offered at G1.
 * §1.4 of the spec reasons in `comparison | share | trend | rank`. Only `comparison` is spelled the
 * same in both, so the correspondence is written down here rather than left to whoever reads next:
 *
 *   maximum, minimum → rank    a maximum IS a rank claim — this one is first in this set — and it
 *                              is unreadable without the set it is first in.
 *   total            → share   a total is a claim about a denominator.
 *   comparison       → comparison
 *   none             → nothing; a slot that records no claim requires no claim assertion.
 *
 * `trend` has no recorded counterpart today and is kept because the requirement it carries (both
 * endpoints) is real the moment G1 offers the shape.
 */
const CLAIM_FAMILY = Object.freeze({
  comparison: "comparison",
  maximum: "rank",
  minimum: "rank",
  total: "share",
  none: null,
  share: "share",
  trend: "trend",
  rank: "rank",
});

const CLAIM_REQUIREMENTS = Object.freeze({
  comparison: ["comparison-left", "comparison-right"],
  share: ["share-denominator"],
  trend: ["trend-start", "trend-end"],
  rank: ["rank-position", "rank-set-size"],
});

/** `overridden — "the register is a year behind"` is one verdict, and it is the third one. */
function groundingVerdict(claim) {
  const raw = typeof claim?.grounding === "string" ? claim.grounding.trim() : "";
  if (raw === "supported" || raw === "unverifiable") return raw;
  if (/^overridden\s*[—–-]?/.test(raw)) return "overridden";
  throw new Error(
    `requiredAssertions was given no resolved grounding (${JSON.stringify(claim?.grounding ?? null)}). ` +
      "It refuses to guess one: whether the claim's own datum must be asserted, must NOT be " +
      "asserted, or comes with a mandatory exactness note is exactly what the verdict decides. " +
      "Record it at G1 — supported, unverifiable, or overridden — \"<reason>\".",
  );
}

/**
 * `"compare + pull back"` → `["compare", "pull back"]`; the corpus's own em dash → `[]`.
 *
 * Markdown emphasis is stripped before the split, because a beat that bolds its gesture cell has
 * not changed which gesture it declared — the same reading `read-direction.mjs` had to learn when
 * `**yes**` was being read as "no".
 */
export function parseGesture(cell) {
  const plain = String(cell ?? "")
    .replace(/[*_`]/g, "")
    .trim();
  if (plain === "" || /^[—–-]+$/.test(plain)) return [];
  return plain
    .split("+")
    .map((atom) => atom.trim())
    .filter((atom) => atom !== "");
}

/** The bullets under `## <heading>` in a sheet, each stripped of its marker. */
function bulletsUnder(text, headingTest) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  let inside = false;
  for (const line of lines) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      inside = headingTest(heading[1].trim());
      continue;
    }
    if (!inside) continue;
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) out.push(bullet[1].trim());
  }
  return out;
}

function paragraphUnder(text, headingTest) {
  const lines = String(text).split(/\r?\n/);
  let inside = false;
  for (const line of lines) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      inside = headingTest(heading[1].trim());
      continue;
    }
    if (inside && line.trim() !== "") return line.trim();
  }
  return null;
}

/** A gesture bullet's own name: `**Reveal in order** — every category enters` → `Reveal in order`. */
function gestureName(bullet) {
  const bold = /^\*\*(.+?)\*\*/.exec(bullet);
  if (bold) return bold[1].trim();
  return bullet.split(/\s+[—–]\s+/)[0].replace(/[*_`]/g, "").trim();
}

/**
 * A type sheet's four sections, parsed.
 *
 * The gesture heading differs per family — `## Scroll gestures`, `## Shot gestures`, `## Reader
 * gestures`, `## Reading stations` — so it is matched by its shape rather than by a list of four
 * literals a fifth export would silently fall out of.
 */
export function parseTypeSheet(text) {
  const isGestures = (h) => /\bgestures$/i.test(h) || /^reading stations$/i.test(h);
  return {
    gestures: bulletsUnder(text, isGestures).map(gestureName),
    prohibitions: bulletsUnder(text, (h) => /^a choreography must not$/i.test(h)).map((bullet) => {
      const id = /^`([a-z0-9-]+)`\s*[—–-]\s*(.*)$/.exec(bullet);
      return id ? { id: id[1], says: id[2].trim() } : { id: null, says: bullet };
    }),
    precisionToAssert: bulletsUnder(text, (h) => /^precision to assert$/i.test(h)),
    devices: bulletsUnder(text, (h) => /^devices the worked example implements$/i.test(h)).map(
      gestureName,
    ),
    workedExample: paragraphUnder(text, (h) => /^worked example$/i.test(h)),
  };
}

/**
 * WHAT MUST BE ASSERTED — never which numbers assert it.
 *
 * Four blocks, one per `because`, each returning ids and nothing else. The numbers, their rounding,
 * their unit and the shot or card they land on are the journalist's, read off the subject's own
 * data; `checkPrecision` later asks only whether each id here is covered and whether each declared
 * number still matches the frozen data.
 *
 * @param {object} retained  the retained proposal (`shared/editorial/retained.mjs`)
 * @param {object} typeSheet a parsed type sheet, or anything carrying `precisionToAssert`
 * @returns {Array<{ id: string, because: "grounding"|"claim-shape"|"type-sheet"|"format" }>}
 */
export function requiredAssertions(retained, typeSheet = {}) {
  const out = [];

  // from claim.grounding — the read L1 never had
  const verdict = groundingVerdict(retained?.claim);
  if (verdict === "supported") out.push({ id: "claim-datum", because: "grounding" });
  if (verdict === "unverifiable") out.push({ id: "rounding-widened", because: "grounding" });
  if (verdict === "overridden") {
    out.push({ id: "claim-datum", because: "grounding" });
    out.push({ id: "exactness-note", because: "grounding" });
  }

  // from claim.shape
  const family = CLAIM_FAMILY[String(retained?.claim?.shape ?? "none").trim().toLowerCase()];
  for (const id of CLAIM_REQUIREMENTS[family] ?? []) out.push({ id, because: "claim-shape" });

  // from the type sheet's own `## Precision to assert`
  for (const rule of typeSheet?.precisionToAssert ?? []) out.push({ id: rule, because: "type-sheet" });

  // from format — where the assertion may land
  const placement = PLACEMENT_OF_FORMAT[retained?.format];
  if (!placement)
    throw new Error(
      `requiredAssertions was given format ${JSON.stringify(retained?.format ?? null)}; the four ` +
        `exports are ${Object.keys(PLACEMENT_OF_FORMAT).join(", ")}.`,
    );
  out.push({ id: placement, because: "format" });

  return out;
}

/**
 * The frame a beat's author writes their choreography INTO.
 *
 * IT RETURNS NO ROWS, NO CARDS AND NO SHOTS. Whatever the next reader needs, it is not a
 * choreography from here: the moment this function can produce one, every beat of a type can be
 * scaffolded into the same piece, which is the clone factory R-D forbids and the reason the whole
 * chain was rewritten.
 *
 * @param {object} retained   the retained proposal
 * @param {object} typeSheet  a parsed type sheet (`parseTypeSheet`)
 */
export function choreographyFrame(retained, typeSheet = {}) {
  const shape = SHAPE_OF_FORMAT[retained?.format];
  if (!shape)
    throw new Error(
      `choreographyFrame was given format ${JSON.stringify(retained?.format ?? null)}; the four ` +
        `exports are ${Object.keys(SHAPE_OF_FORMAT).join(", ")}.`,
    );
  return {
    export: retained.format,
    shape,
    vocabulary: [...(typeSheet.gestures ?? [])],
    prohibitions: (typeSheet.prohibitions ?? []).map((p) => ({ id: p.id ?? null, says: p.says })),
    constrains: {
      interactionKind: retained?.interaction?.kind ?? null,
      size: retained?.size ?? null,
      cardsMin: typeSheet.cardsMin ?? null,
    },
    workedExample: typeSheet.workedExample ?? null,
  };
}
