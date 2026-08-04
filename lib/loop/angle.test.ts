import { test, expect } from "bun:test";
import { INTENTS } from "../brain/intents";
import { confirmAngle, inheritAngle } from "./angle";
import {
  gateStateOf,
  parseManifest,
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
  intent: "change-over-time" as const,
};

function run(el: RunElement): RunManifest {
  return {
    runId: "angle",
    schemaVersion: 7,
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

test("confirmAngle writes the parts and moves the element to `angled`", () => {
  const result = confirmAngle({ id: "el1" }, PARTS);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  expect(result.value.angle).toEqual({
    confirmedTakeaway: PARTS.takeaway,
    altInsight: PARTS.altInsight,
    unit: PARTS.unit,
    intent: PARTS.intent,
  });
  expect(gateStateOf(run(result.value), result.value)).toBe("angled");
});

// --- the declared intent, in the manifest ----------------------------------------------------
//
// The intent stops being read out of the journalist's prose (lib/brain/rank-intent.ts's keyword
// pass, which silently answered [] on ordinary French phrasings) and becomes a part of the angle
// the journalist DECLARES. So the manifest has to hold it — and hold it as the closed vocabulary,
// because a value outside lib/brain/intents.ts is a fact nothing can rank against.
function manifestWithAngle(angle: unknown): unknown {
  return {
    runId: "angle",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/d.csv", sha256: "a".repeat(64) } },
    elements: [{ id: "el1", angle }],
    events: [],
  };
}

test("the manifest carries a declared intent on the angle", () => {
  const parsed = parseManifest(
    manifestWithAngle({
      confirmedTakeaway: PARTS.takeaway,
      altInsight: PARTS.altInsight,
      unit: PARTS.unit,
      intent: "ranking",
    }),
  );
  expect(parsed.elements[0]!.angle!.intent).toBe("ranking");
});

test("the manifest refuses an intent outside the closed vocabulary", () => {
  expect(() =>
    parseManifest(
      manifestWithAngle({
        confirmedTakeaway: PARTS.takeaway,
        altInsight: PARTS.altInsight,
        unit: PARTS.unit,
        intent: "pie-chart",
      }),
    ),
  ).toThrow();
});

// An angle recorded before this slice existed has no intent, and the run must stay readable:
// refusing it would fail legitimate runs over a field that did not exist when they were written.
// What happens to their ordering is reported rather than repaired (lib/host/state.ts).
test("an angle written before the intent existed still parses", () => {
  const parsed = parseManifest(
    manifestWithAngle({
      confirmedTakeaway: PARTS.takeaway,
      altInsight: PARTS.altInsight,
      unit: PARTS.unit,
    }),
  );
  expect(parsed.elements[0]!.angle!.intent).toBeUndefined();
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

// The fourth refusal. Blank is refused for the same reason the other three are: what is not
// refused at the moment the angle is recorded is discovered much later, or never — and here
// "never" means an offer ordered by fit and readiness alone, which is the defect this slice
// exists to remove.
test("confirmAngle refuses a blank intent", () => {
  const result = confirmAngle({ id: "el1" }, { ...PARTS, intent: "  " });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe("invalid-request");
  expect(result.message).toMatch(/intent/i);
});

test("confirmAngle refuses an intent outside the vocabulary, and names the nine", () => {
  const result = confirmAngle(
    { id: "el1" },
    { ...PARTS, intent: "correlations" },
  );
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe("invalid-request");
  // The whole list, so a host that mistyped can correct without reading our source.
  for (const intent of INTENTS) expect(result.message).toContain(intent);
});

test("confirmAngle records the declared intent, trimmed", () => {
  const result = confirmAngle({ id: "el1" }, { ...PARTS, intent: " ranking " });
  if (!result.ok) throw new Error("unreachable");
  expect(result.value.angle!.intent).toBe("ranking");
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

// --- a sibling deliverable inherits the master's confirmed takeaway --------------------------
//
// The cadrage design states it plainly: "Siblings inherit the confirmed takeaway and nothing
// else: each re-enters the brain at its own channel." lib/loop/deliverables.ts:208 implements
// that copy — and nothing in production calls it, because `init` lets a host declare a sibling
// (`deliverableOf`) directly. Measured on a real run: confirming the master's angle left the
// declared sibling with none, and a second confirm-angle happily gave the SAME story a
// contradictory takeaway ("Genève paie la prime la plus lourde" beside "Fribourg est le moins
// cher"), with nothing refusing it. One story, several outputs, one editorial point — that is
// the whole model, and the discipline "the title IS the confirmed takeaway" exists to hold it.
const parts = {
  takeaway: "Genève paie la prime la plus lourde des cantons romands",
  altInsight:
    "En 2024 la prime adulte atteint 583 francs à Genève, contre 468 à Fribourg.",
  unit: "CHF",
  intent: "ranking" as const,
};
const master: RunElement = { id: "web" };
const sibling: RunElement = {
  id: "social",
  deliverableOf: "web",
  deliverable: { destination: "social" },
};

test("gives a sibling that has no angle of its own the one just confirmed", () => {
  const confirmed = confirmAngle(master, parts);
  expect(confirmed.ok).toBe(true);
  if (!confirmed.ok) throw new Error("unreachable");
  const after = inheritAngle([confirmed.value, sibling], confirmed.value);
  expect(after[1]!.angle?.confirmedTakeaway).toBe(parts.takeaway);
  expect(after[1]!.angle?.altInsight).toBe(parts.altInsight);
  // One story, several outputs, ONE editorial point — so the sibling inherits WHAT THE POINT IS
  // MEANT TO SHOW too. Without it the master's offer would be ordered around the declared intent
  // and the sibling's around a keyword guess of the same sentence, which is the split this slice
  // removes.
  expect(after[1]!.angle?.intent).toBe(parts.intent);
});

test("leaves an element that is not its sibling alone", () => {
  const confirmed = confirmAngle(master, parts);
  if (!confirmed.ok) throw new Error("unreachable");
  const other: RunElement = { id: "autre" };
  const after = inheritAngle([confirmed.value, other], confirmed.value);
  expect(after[1]!.angle).toBeUndefined();
});

test("never overwrites an angle a sibling already confirmed for itself", () => {
  const confirmed = confirmAngle(master, parts);
  if (!confirmed.ok) throw new Error("unreachable");
  const own = {
    confirmedTakeaway: "Fribourg est le canton romand le moins cher",
    altInsight:
      "En 2024 Fribourg affiche 468 francs, la prime la plus basse des six.",
    unit: "CHF",
    intent: "deviation" as const,
  };
  const decided: RunElement = { ...sibling, angle: own };
  const after = inheritAngle([confirmed.value, decided], confirmed.value);
  // Confirming its own angle is a deliberate act — the back-edge, not a mistake. Inheritance
  // fills a blank; it does not overrule a decision the journalist already made.
  expect(after[1]!.angle?.confirmedTakeaway).toBe(own.confirmedTakeaway);
});
