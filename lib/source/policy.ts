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
import type { SourceDeclaration, SourceKind, RunMode } from "./kinds";
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
