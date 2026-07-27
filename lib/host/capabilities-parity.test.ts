import { describe, expect, it } from "bun:test";
import { VERBS } from "../core/vocabulary";
import { runVerb } from "../core/verbs";
import { capabilities } from "./capabilities";

// Two places state whether a verb is callable: this facade's `IMPLEMENTED` list, which a host
// reads through `splash verbs`, and `runVerb`'s dispatch, which decides what actually happens.
// Nothing tied them together, and they drifted the moment `capture`/`review` gained bodies —
// the facade kept announcing them as not-implemented. The same drift class was already closed
// once on the publisher side; this closes it here, and it asks the DISPATCHER rather than a
// second list, so it cannot become a third source of the same fact.
describe("facade capabilities vs the real dispatcher", () => {
  it("announces a verb as implemented exactly when runVerb has a body for it", async () => {
    const declared = new Map(
      capabilities().verbs.map((v) => [v.name, v.implemented]),
    );
    for (const verb of VERBS) {
      // A deliberately malformed payload separates the two cases without doing any work:
      // a verb with a body rejects the payload (`invalid-request`); a verb without one
      // never looks at the payload and answers `not-implemented`.
      const result = await runVerb(verb, {});
      const hasBody = !(!result.ok && result.code === "not-implemented");
      expect(declared.get(verb)).toBe(hasBody);
    }
  });
});
