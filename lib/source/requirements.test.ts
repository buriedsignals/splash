import { test, expect } from "bun:test";
import { SOURCE_KINDS } from "./kinds";
import { SOURCE_REQUIREMENTS, requirementsFor } from "./requirements";

test("should cover every source kind", () => {
  // Drift-guard: a seventh kind added to the vocabulary without a row here — i.e. without
  // anyone deciding its consequences — fails the suite instead of defaulting to something.
  expect(Object.keys(SOURCE_REQUIREMENTS).sort()).toEqual(
    [...SOURCE_KINDS].sort(),
  );
});

test("should require a specific url only for public", () => {
  for (const kind of SOURCE_KINDS) {
    const required = requirementsFor(kind).url === "required";
    expect(required).toBe(kind === "public");
  }
});

test("should forbid an internal ref on public, local and prose", () => {
  for (const kind of ["public", "local", "prose", "none"] as const)
    expect(requirementsFor(kind).internalRef).toBe("forbidden");
  for (const kind of ["private", "synthetic"] as const)
    expect(requirementsFor(kind).internalRef).toBe("optional");
});

test("should forbid a url on private, synthetic and none", () => {
  for (const kind of ["private", "synthetic", "none"] as const)
    expect(requirementsFor(kind).url).toBe("forbidden");
  for (const kind of ["local", "prose"] as const)
    expect(requirementsFor(kind).url).toBe("optional");
});

test("should require a display label on every kind but none", () => {
  for (const kind of SOURCE_KINDS)
    expect(requirementsFor(kind).label).toBe(
      kind === "none" ? "forbidden" : "required",
    );
});

test("should refuse to ship synthetic in a real run", () => {
  for (const kind of SOURCE_KINDS)
    expect(requirementsFor(kind).shippableInRealRun).toBe(kind !== "synthetic");
});

test("should require a visible notice only for synthetic", () => {
  for (const kind of SOURCE_KINDS)
    expect(requirementsFor(kind).requiresNotice).toBe(kind === "synthetic");
});

test("should allow only verbatim figures for prose", () => {
  expect(requirementsFor("prose").figures).toBe("verbatim");
  expect(requirementsFor("none").figures).toBe("none");
  for (const kind of ["public", "local", "private", "synthetic"] as const)
    expect(requirementsFor(kind).figures).toBe("computed");
});

test("should say none carries no facts", () => {
  for (const kind of SOURCE_KINDS)
    expect(requirementsFor(kind).carriesFacts).toBe(kind !== "none");
});
