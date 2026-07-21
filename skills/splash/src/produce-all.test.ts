import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalJson, produceAll } from "./produce-all.ts";
import type { AcceptedProposal } from "./producer-spec.ts";

// A pass-through validator so this test exercises the provenance-hash bookkeeping in
// isolation, not the full spec validator. The real CLI uses validateAccepted (unchanged).
const passValidate = () => ({ ok: true as const, warnings: [] as string[] });
// preflight OK for any producer (hermetic — no env/deps consulted).
const noPreflight = () => [];

function proposal(spec: unknown): AcceptedProposal {
  return {
    id: "rents-2026",
    producer: "chart-native",
    format: "static",
    spec,
    confirmedTakeaway: "x",
    channel: "article-web",
  };
}

test("acceptedConfigHash on a produced result is the sha256 of the canonicalized accepted spec", async () => {
  const spec = { nativeType: "bar", title: "Rents", source: { name: "INSEE" } };
  const dispatch = async () => ({
    status: "produced" as const,
    outputs: ["x.png"],
  });
  const report = await produceAll(
    [proposal(spec)],
    "/tmp/splash-provenance-hash",
    dispatch,
    passValidate,
    null,
    noPreflight,
  );
  expect(report.results).toHaveLength(1);
  const expected = createHash("sha256")
    .update(canonicalJson(spec))
    .digest("hex");
  expect(report.results[0].acceptedConfigHash).toBe(expected);
});

test("acceptedConfigHash is STABLE under key reordering of an equivalent spec, including nested objects", async () => {
  const specA = {
    nativeType: "bar",
    title: "Rents",
    source: { name: "INSEE", url: "https://insee.fr" },
  };
  const specB = {
    source: { url: "https://insee.fr", name: "INSEE" },
    title: "Rents",
    nativeType: "bar",
  };
  const dispatch = async () => ({
    status: "produced" as const,
    outputs: ["x.png"],
  });
  const reportA = await produceAll(
    [proposal(specA)],
    "/tmp/splash-provenance-hash-a",
    dispatch,
    passValidate,
    null,
    noPreflight,
  );
  const reportB = await produceAll(
    [proposal(specB)],
    "/tmp/splash-provenance-hash-b",
    dispatch,
    passValidate,
    null,
    noPreflight,
  );
  expect(reportA.results[0].acceptedConfigHash).toBe(
    reportB.results[0].acceptedConfigHash as string,
  );
});

test("a failed (non-produced) result does not carry an acceptedConfigHash", async () => {
  const dispatch = async () => ({
    status: "needs-fallback" as const,
    reason: "engine unavailable",
  });
  const report = await produceAll(
    [proposal({ nativeType: "bar" })],
    "/tmp/splash-provenance-hash-failed",
    dispatch,
    passValidate,
    null,
    noPreflight,
  );
  expect(report.results[0].acceptedConfigHash).toBeUndefined();
});
