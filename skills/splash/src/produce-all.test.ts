import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalJson, produceAll } from "./produce-all.ts";
import type { AcceptedProposal } from "./producer-spec.ts";
import type { BrandProfile } from "./brand-profile.ts";

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

test("acceptedConfigHash is taken from the PRE-MERGE accepted spec, not the profile-merged batch spec", async () => {
  // No baseColor / baseColorExplicit on the accepted spec, so mergeProfileDefaults (a
  // colour-consuming producer, chart-native) WILL rewrite it: it stamps the house
  // baseColor + brandExplicit:true (skills/splash/src/brand-profile.ts mergeProfileDefaults,
  // the "Auto subject-fit colour (or none)" branch). accepted.json on disk holds this
  // ORIGINAL pre-merge spec — the export-stage chain-verification (Task 2) re-hashes THAT
  // file, so acceptedConfigHash must match it, not the merged batch spec dispatch renders.
  const originalSpec = {
    nativeType: "bar",
    title: "Rents",
    source: { name: "INSEE" },
  };
  const profile: BrandProfile = { palette: ["#112233"] };
  const dispatch = async (p: AcceptedProposal) => ({
    status: "produced" as const,
    outputs: ["x.png"],
    // Prove the producer really did receive the profile-merged spec (brand applied) —
    // otherwise this test wouldn't exercise the divergence at all.
    reason: JSON.stringify(p.spec),
  });
  const report = await produceAll(
    [proposal(originalSpec)],
    "/tmp/splash-provenance-hash-premerge",
    dispatch,
    passValidate,
    profile,
    noPreflight,
  );
  expect(report.results).toHaveLength(1);
  const mergedSpecSeenByDispatch = JSON.parse(
    report.results[0].reason as string,
  );
  // Sanity: the profile really did mutate the spec dispatch saw, so pre-merge and merged
  // hashes are provably different — otherwise this test would be vacuous.
  expect(mergedSpecSeenByDispatch).not.toEqual(originalSpec);
  const preMergeHash = createHash("sha256")
    .update(canonicalJson(originalSpec))
    .digest("hex");
  const mergedHash = createHash("sha256")
    .update(canonicalJson(mergedSpecSeenByDispatch))
    .digest("hex");
  expect(preMergeHash).not.toBe(mergedHash);
  expect(report.results[0].acceptedConfigHash).toBe(preMergeHash);
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
