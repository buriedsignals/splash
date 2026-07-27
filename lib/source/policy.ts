// validateSourcePolicy — the single entry point issue #7 asks for: "one shared source model and
// policy used by proposal validation, production, render review, and delivery. It should decide
// required fields, display furniture, privacy handling, and whether the source is shippable for
// the run mode."
//
// One call answers all four, and it answers them by READING THE TABLE (lib/source/
// requirements.ts) rather than by holding a second opinion. That is the whole cure for the
// contradiction #7 opens with: Gate 2 and render review can only disagree while each owns its
// own version of "is this source complete".
//
// It never infers. An absent declaration is `source-undeclared`, not "public by default" and not
// "unknown, decide later" — inferring is exactly what makes "no URL exists" indistinguishable
// from "the URL was not collected".
import {
  SOURCE_KINDS,
  SOURCE_SLOTS,
  type SourceDeclaration,
  type SourceKind,
  type SourceLedger,
  type RunMode,
} from "./kinds";
import { publishedSourceFor, type PublishedSource } from "./furniture";
import { requirementsFor, type SourceRequirements } from "./requirements";
import { sourceFail, sourceOk, type SourceResult } from "./result";
import { sourceUrlVerdict } from "./url";

export interface SourcePolicyContext {
  /** Reporting or rehearsal. Defaults to `real` — the safe direction for synthetic data. */
  mode?: RunMode;
  /** The deliverable's language, for the credit furniture. */
  lang?: string;
  /**
   * Does the visual this source stands behind assert facts? Defaults to TRUE, so `none` has to
   * be argued for rather than assumed — the abuse this guards is a data chart marked `none` to
   * escape attribution.
   */
  carriesFactualData?: boolean;
}

export interface SourceVerdict {
  kind: SourceKind;
  requirements: SourceRequirements;
  published: PublishedSource;
}

export function validateSourcePolicy(
  decl: SourceDeclaration | undefined,
  ctx: SourcePolicyContext = {},
): SourceResult<SourceVerdict> {
  if (!decl)
    return sourceFail(
      "source-undeclared",
      "no source was declared for this input — the class of a source is declared, never guessed",
    );

  const rules = requirementsFor(decl.kind);
  const mode = ctx.mode ?? "real";
  const carriesFactualData = ctx.carriesFactualData ?? true;

  // Refusal order is fixed and shallow-to-deep: what the declaration itself gets wrong comes
  // before what the run's mode makes impossible. A `synthetic` declaration with no label is
  // reported as a missing label, because that is the thing the journalist can fix on the spot.
  const label = decl.label?.trim() ?? "";
  if (rules.label === "required" && label === "")
    return sourceFail(
      "missing-label",
      `a ${decl.kind} source needs a display label — what the reader is shown as the source`,
    );
  if (rules.label === "forbidden" && label !== "")
    return sourceFail(
      "label-not-allowed",
      `a ${decl.kind} source publishes no label ("${label}") — if there is a source to name, it is not "none"`,
    );

  const url = decl.url?.trim() ?? "";
  if (rules.url === "required" && url === "")
    return sourceFail(
      "missing-url",
      `a public source needs the specific dataset or page URL — if no public URL exists, the source is local, private or prose, not public`,
    );
  if (rules.url === "forbidden" && url !== "")
    return sourceFail(
      "url-not-allowed",
      `a ${decl.kind} source publishes no URL ("${url}") — an internal address belongs in internalRef, which is never published`,
    );
  if (url !== "" && sourceUrlVerdict(url) !== "specific")
    return sourceFail(
      "url-not-specific",
      `"${url}" does not point at a dataset or a page — cite the exact document, or omit the URL`,
    );

  const internalRef = decl.internalRef?.trim() ?? "";
  if (rules.internalRef === "forbidden" && internalRef !== "")
    return sourceFail(
      "internal-ref-not-allowed",
      `a ${decl.kind} source keeps no internal reference — a brought file's provenance is the run's own frozen input`,
    );

  if (!rules.carriesFacts && carriesFactualData)
    return sourceFail(
      "source-required",
      `this visual carries factual data, so it needs a source — "none" is only for a visual that asserts no facts`,
    );

  if (!rules.shippableInRealRun && mode !== "test")
    return sourceFail(
      "synthetic-in-real-run",
      `${decl.kind} data cannot ship in a run that calls itself reporting — set the run mode to "test", or bring real data`,
    );

  return sourceOk({
    kind: decl.kind,
    requirements: rules,
    published: publishedSourceFor(decl, ctx.lang),
  });
}

/**
 * The ONE targeted question the preflight/CADRAGE flow should ask when the class or a required
 * field cannot be determined from what was supplied (issue #7). One question, never a form: the
 * kind first, then the first required field still missing. `null` means nothing is missing —
 * which is also the signal not to ask anything at all.
 */
export function sourceQuestion(
  decl: Partial<SourceDeclaration> | undefined,
): string | null {
  // A kind outside the vocabulary lands here from a half-parsed answer — TypeScript does not
  // guard a value that arrived as JSON. Asking the kind question again is the honest move;
  // reading a requirements row that does not exist would crash on the next line.
  if (!decl?.kind || !SOURCE_KINDS.includes(decl.kind as SourceKind))
    return "Where does this data come from? A published dataset (public), a file you were given or built (local), an internal newsroom dataset (private), figures quoted in your article (prose), or demo data (synthetic)?";
  const rules = requirementsFor(decl.kind as SourceKind);
  if (rules.label === "required" && !decl.label?.trim())
    return `How should this ${decl.kind} source be credited to the reader?`;
  if (rules.url === "required" && !decl.url?.trim())
    return "What is the exact page or dataset URL for this source? (the document itself, not the site's home page)";
  if (
    rules.url !== "forbidden" &&
    decl.url?.trim() &&
    sourceUrlVerdict(decl.url) !== "specific"
  )
    return `"${decl.url.trim()}" points at a site, not a document — what is the exact page for this source, or should the link be dropped?`;
  return null;
}

/**
 * The manifest-level invariant: every declared slot is policy-valid at the ledger's own mode.
 *
 * Takes the frozen-input FLAGS, not the RunManifest — lib/loop/manifest.ts imports this module,
 * so importing its types back would close a cycle for nothing. Two slot-level rules live here
 * rather than in validateSourcePolicy because only the ledger knows them:
 *   - a frozen DATA input is factual data by definition, so `none` is a contradiction on it;
 *   - `local` means "the provenance is the frozen input", so that input has to exist.
 *
 * Throws, like assertInvariants around it: this is an invariant, not a request being validated.
 */
export function assertSourceLedger(
  ledger: SourceLedger,
  frozen: { data: boolean; article: boolean },
): void {
  for (const slot of SOURCE_SLOTS) {
    const decl = ledger[slot];
    if (!decl) continue;
    if (slot === "data" && decl.kind === "none")
      throw new Error(
        `invariant: the data input is declared "none", but a frozen data input is factual data`,
      );
    if (decl.kind === "local" && !frozen[slot])
      throw new Error(
        `invariant: the ${slot} source is declared "local", but no ${slot} input is frozen in this run — a local source's provenance IS the frozen input`,
      );
    const verdict = validateSourcePolicy(decl, {
      mode: ledger.mode,
      // Ledger level: a declared input is data the run brought in. `none` on the article slot
      // is the only "no facts" case here, and it is legal — an article is not a dataset.
      carriesFactualData: decl.kind !== "none",
    });
    if (!verdict.ok)
      throw new Error(
        `invariant: the ${slot} source is invalid (${verdict.code}): ${verdict.message}`,
      );
  }
}
