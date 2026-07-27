import { test, expect } from "bun:test";
import { confirmAngle } from "./angle";
import {
  gateStateOf,
  provenanceHash,
  stalenessOf,
  type RunElement,
  type RunManifest,
} from "./manifest";

const PARTS = {
  takeaway: "Les primes ont augmenté dans les six cantons",
  altInsight:
    "La prime adulte moyenne passe de 449 à 583 francs entre 2015 et 2024.",
  unit: "CHF",
};

function run(el: RunElement): RunManifest {
  return {
    runId: "angle",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/d.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: { columns: ["canton"], numericColumns: [], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [el],
    events: [],
  };
}

test("confirmAngle writes the four parts and moves the element to `angled`", () => {
  const result = confirmAngle({ id: "el1" }, PARTS);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  expect(result.value.angle).toEqual({
    confirmedTakeaway: PARTS.takeaway,
    altInsight: PARTS.altInsight,
    unit: PARTS.unit,
  });
  expect(gateStateOf(run(result.value), result.value)).toBe("angled");
});

test("confirmAngle carries an emphasis when one is given", () => {
  const result = confirmAngle({ id: "el1" }, { ...PARTS, emphasis: "Genève" });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  expect(result.value.angle!.emphasis).toBe("Genève");
});

// Never `emphasis: undefined` riding along — the discipline the rest of this module follows
// (driver.ts's `refusal`: "never introduce a present-but-empty marker where absent says the
// same thing").
test("confirmAngle omits emphasis entirely when none is given", () => {
  const result = confirmAngle({ id: "el1" }, PARTS);
  if (!result.ok) throw new Error("unreachable");
  expect("emphasis" in result.value.angle!).toBe(false);
});

// The two refusals lib/delivery/metadata.ts already makes at PACKAGING time, moved to the
// moment the angle is RECORDED: the run can no longer carry the blank at all.
test("confirmAngle refuses a blank takeaway", () => {
  const result = confirmAngle({ id: "el1" }, { ...PARTS, takeaway: "   " });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe("invalid-request");
  expect(result.message).toMatch(/takeaway/i);
});

test("confirmAngle refuses a blank alt text, citing the accessibility rule", () => {
  const result = confirmAngle({ id: "el1" }, { ...PARTS, altInsight: "" });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("1.1.1");
});

test("confirmAngle refuses a blank unit", () => {
  const result = confirmAngle({ id: "el1" }, { ...PARTS, unit: "  " });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toMatch(/unit/i);
});

test("confirmAngle trims what it records — a stray newline is not editorial content", () => {
  const result = confirmAngle(
    { id: "el1" },
    { ...PARTS, takeaway: ` ${PARTS.takeaway}\n` },
  );
  if (!result.ok) throw new Error("unreachable");
  expect(result.value.angle!.confirmedTakeaway).toBe(PARTS.takeaway);
});

// The back-edge lib/loop/revise.ts models: changing the angle moves provenanceHash, so a
// produced artifact goes stale and the loop routes back to produce on its own.
test("re-confirming an angle stales a produced artifact", () => {
  const first = confirmAngle({ id: "el1" }, PARTS);
  if (!first.ok) throw new Error("unreachable");
  const produced: RunElement = {
    ...first.value,
    proposal: {
      options: [{ id: "bar", nativeType: "bar", why: "…" }],
      excluded: [],
      chosenId: "bar",
    },
  };
  const before = run(produced);
  const withArtifact: RunElement = {
    ...produced,
    artifact: {
      path: "elements/el1/static.png",
      sha256: "b".repeat(64),
      provenanceHash: provenanceHash(before, produced),
      producedAt: "2026-07-27T00:00:00.000Z",
    },
  };
  expect(stalenessOf(run(withArtifact), withArtifact)).toBe(false);

  const second = confirmAngle(withArtifact, {
    ...PARTS,
    takeaway: "Genève est le canton le plus cher",
  });
  if (!second.ok) throw new Error("unreachable");
  expect(stalenessOf(run(second.value), second.value)).toBe(true);
});
