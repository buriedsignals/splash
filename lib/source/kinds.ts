// The source vocabulary and the shape it is RECORDED in — the model issue #7 asks for, in one
// place, so that proposal validation, production, render review and delivery can stop each
// holding their own idea of what a cited source is.
//
// Six kinds, and no seventh: a class that is not one of these is a class nobody decided the
// consequences of (lib/source/requirements.ts holds them, one row per kind, exhaustively). The
// six words themselves are in lib/source/vocabulary.ts and re-exported from here unchanged.
//
// The schemas are STRICT on purpose. Issue #7's acceptance list says "existing source fields
// migrate without silently widening what is considered valid": a permissive object would let a
// `name: "OFS"` (the shape lib/core/conformance-l0.ts uses) parse as a declaration carrying no
// label at all, and the policy would then refuse it for a missing field the caller thinks it
// supplied. Failing at the parse, naming the unknown field, is the honest version.
import { z } from "zod";
// The words live in vocabulary.ts — zero imports, so an ENGINE can name a source class in its
// own types without the zod dependency riding along into the runnable source bundle. Re-exported
// here so every importer of "./kinds" keeps its path.
import { SOURCE_KINDS, RUN_MODES } from "./vocabulary";
export * from "./vocabulary";

export const SourceDeclarationSchema = z.strictObject({
  kind: z.enum(SOURCE_KINDS),
  /** What the reader is shown. Required by every kind but `none`. */
  label: z.string().optional(),
  /** The traceable public address. Required by `public`, optional-but-specific elsewhere. */
  url: z.string().optional(),
  /** Newsroom-internal reference (a shelf path, a ticket, a dataset id). NEVER published. */
  internalRef: z.string().optional(),
});

// Mirrors RunManifest.input (`data` / `article`) exactly: it is the INPUT that carries a source
// class, and inputs are run-level. A per-element override is a later slice (spec §6).
export const SourceLedgerSchema = z.strictObject({
  mode: z.enum(RUN_MODES).default("real"),
  data: SourceDeclarationSchema.optional(),
  article: SourceDeclarationSchema.optional(),
});

export type SourceDeclaration = z.infer<typeof SourceDeclarationSchema>;
export type SourceLedger = z.infer<typeof SourceLedgerSchema>;
/** The ledger slots, in the order the manifest freezes them. */
export const SOURCE_SLOTS = ["data", "article"] as const;
export type SourceSlot = (typeof SOURCE_SLOTS)[number];
