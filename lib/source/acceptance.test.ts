// The acceptance criteria of issue #7, as tests. One case per source kind, plus the two
// cross-cutting promises: the gates cannot contradict each other, and nothing private leaves.
import { test, expect } from "bun:test";
import {
  SOURCE_KINDS,
  type SourceDeclaration,
  type SourceKind,
  SourceLedgerSchema,
} from "./kinds";
import { requirementsFor } from "./requirements";
import { validateSourcePolicy, type SourcePolicyContext } from "./policy";
import { assertNoPrivateLeak, publicSourceView } from "./redact";

// A valid and an invalid declaration for every kind. The table is indexed by SourceKind, so a
// seventh kind added to the vocabulary fails to typecheck until someone writes its two cases —
// the drift-guard for "tests cover every source kind".
const CASES: Record<
  SourceKind,
  {
    valid: SourceDeclaration;
    invalid: SourceDeclaration;
    code: string;
    ctx?: SourcePolicyContext;
  }
> = {
  public: {
    valid: {
      kind: "public",
      label: "Office fédéral de la statistique",
      url: "https://www.bfs.admin.ch/asset/fr/32229771",
    },
    invalid: { kind: "public", label: "Office fédéral de la statistique" },
    code: "missing-url",
  },
  local: {
    valid: { kind: "local", label: "Relevés communaux 2024" },
    invalid: { kind: "local", label: "Relevés", url: "https://data.geneve.ch" },
    code: "url-not-specific",
  },
  private: {
    valid: {
      kind: "private",
      label: "Données internes de la rédaction",
      internalRef: "/Volumes/nas/salaires-2024.csv",
    },
    invalid: {
      kind: "private",
      label: "Interne",
      url: "https://intranet.newsroom.ch/data/1",
    },
    code: "url-not-allowed",
  },
  synthetic: {
    valid: { kind: "synthetic", label: "Jeu de démonstration" },
    invalid: { kind: "synthetic", label: "Jeu de démonstration" },
    code: "synthetic-in-real-run",
    ctx: { mode: "test" },
  },
  prose: {
    valid: { kind: "prose", label: "Heidi.news" },
    invalid: { kind: "prose", label: "Heidi.news", internalRef: "/nas/notes" },
    code: "internal-ref-not-allowed",
  },
  none: {
    valid: { kind: "none" },
    invalid: { kind: "none" },
    code: "source-required",
    ctx: { carriesFactualData: false },
  },
};

test("should cover every source kind end to end", () => {
  expect(Object.keys(CASES).sort()).toEqual([...SOURCE_KINDS].sort());
  for (const kind of SOURCE_KINDS) {
    const c = CASES[kind];
    const accepted = validateSourcePolicy(c.valid, c.ctx);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error(`${kind}: ${accepted.message}`);
    expect(accepted.value.kind).toBe(kind);

    // The invalid case is judged in the DEFAULT context (real run, factual data) — the two
    // kinds whose validity depends on the context are exactly the two whose refusal codes say
    // so: synthetic-in-real-run and source-required.
    const refused = validateSourcePolicy(c.invalid);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error(`${kind}: expected a refusal`);
    expect(refused.code).toBe(c.code as typeof refused.code);
  }
});

test("should decide the same thing for every gate reading the same declaration", () => {
  // The contradiction issue #7 opens with: Gate 2 accepts a named source with no URL while
  // render review calls the same source incomplete. Both now read one row, so "does this need
  // a URL" has exactly one answer per kind, and the acceptance of a declaration agrees with it.
  for (const kind of SOURCE_KINDS) {
    const rules = requirementsFor(kind);
    const withoutUrl = validateSourcePolicy(
      { kind, ...(rules.label === "required" ? { label: "Un nom" } : {}) },
      CASES[kind].ctx,
    );
    const urlWasTheProblem =
      !withoutUrl.ok && withoutUrl.code === "missing-url";
    expect(urlWasTheProblem).toBe(rules.url === "required");
  }
});

test("should credit every kind that carries facts", () => {
  for (const kind of SOURCE_KINDS) {
    const verdict = validateSourcePolicy(CASES[kind].valid, CASES[kind].ctx);
    if (!verdict.ok) throw new Error(`${kind}: ${verdict.message}`);
    const credited = verdict.value.published.credit.trim() !== "";
    expect(credited).toBe(requirementsFor(kind).carriesFacts);
  }
});

test("should mark synthetic data visibly wherever it is allowed at all", () => {
  const verdict = validateSourcePolicy(CASES.synthetic.valid, { mode: "test" });
  if (!verdict.ok) throw new Error(verdict.message);
  // The notice is in the credit itself, so a renderer that reads only the credit still warns.
  expect(verdict.value.published.credit).toContain("DEMONSTRATION DATA");
  expect(verdict.value.published.notice).toBeTruthy();
});

test("should never leak a private reference through the public view of any kind", () => {
  for (const kind of SOURCE_KINDS) {
    const ledger = SourceLedgerSchema.parse({
      mode: CASES[kind].ctx?.mode ?? "real",
      ...(kind === "none"
        ? { article: CASES[kind].valid }
        : { data: CASES[kind].valid }),
    });
    const view = publicSourceView(ledger, "fr");
    if (!view.ok) throw new Error(`${kind}: ${view.message}`);
    expect(() => assertNoPrivateLeak(view.value, ledger)).not.toThrow();
  }
});
